/**
 * Post-acquire intake hooks: conflict re-screen, Send retainer task, optional
 * firm auto-send of retainer via Dropbox Sign / configured e-sign provider.
 */
import fs from 'fs'
import { prisma } from './prisma'
import { logger } from './logger'
import { runAndPersistConflictCheck, completeConflictRelatedTasks } from './conflict-check'
import {
  createEnvelopeForLead,
  createRetainerAgreementEnvelope,
} from './esign/esign-service'
import { createCaseOpeningTasks } from './case-opening'
import { notifyAttorneyInApp } from './case-notifications'
import { ATTORNEY_EVENTS } from './notification-events'
import { syncWorkflowItemFromTask } from './workflow-step-tasks'

/** True when a firm template name looks like a retainer / fee agreement. */
export function isRetainerTemplateName(name: string): boolean {
  return /retainer|contingency\s*fee|fee\s*agreement|representation\s*agreement/i.test(String(name || ''))
}

export const SEND_RETAINER_TASK_TITLE = 'Send retainer to client'
export const FIRM_SETTING_AUTO_SEND_RETAINER = 'autoSendRetainerOnAcquire'

const RETAINER_DONE_TITLE_MATCHERS = [
  /^send retainer to client$/i,
  /send retainer for signature/i,
  /confirm signed retainer/i,
  /confirm signed representation agreement/i,
]

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export async function getFirmSettingBool(lawFirmId: string | null | undefined, key: string): Promise<boolean> {
  if (!lawFirmId) return false
  const row = await (prisma as any).firmSetting
    .findUnique({ where: { lawFirmId_key: { lawFirmId, key } } })
    .catch(() => null)
  if (!row?.value) return false
  try {
    const parsed = JSON.parse(row.value)
    return parsed === true || parsed === 'true' || parsed === 1
  } catch {
    return String(row.value).toLowerCase() === 'true'
  }
}

export async function setFirmSetting(lawFirmId: string, key: string, value: unknown) {
  const encoded = typeof value === 'string' ? value : JSON.stringify(value)
  return (prisma as any).firmSetting.upsert({
    where: { lawFirmId_key: { lawFirmId, key } },
    update: { value: encoded },
    create: { lawFirmId, key, value: encoded },
  })
}

/** Mark the Send-retainer task done after an envelope is successfully sent. */
export async function markSendRetainerTaskDone(
  assessmentId: string,
  note?: string,
): Promise<boolean> {
  if (!assessmentId) return false
  const sendTask = await prisma.caseTask.findFirst({
    where: {
      assessmentId,
      mergedIntoId: null,
      title: { equals: SEND_RETAINER_TASK_TITLE, mode: 'insensitive' },
      status: { in: ['open', 'in_progress'] },
    },
  })
  if (!sendTask) return false
  const updated = await prisma.caseTask.update({
    where: { id: sendTask.id },
    data: {
      status: 'done',
      completedAt: new Date(),
      notes: note ? `${sendTask.notes || ''}\n${note}`.trim() : sendTask.notes,
    },
  })
  await syncWorkflowItemFromTask(updated).catch(() => undefined)
  return true
}

/**
 * Ensure the "confirm signed" milestone exists so it can auto-clear on webhook.
 * Uses the opening-checklist title (matcher-compatible with the workflow step).
 */
export async function ensureConfirmSignedRetainerTask(assessmentId: string, opts?: {
  createdById?: string | null
  createdByName?: string | null
}): Promise<'created' | 'exists' | 'noop'> {
  if (!assessmentId) return 'noop'
  const titles = [
    'Confirm signed retainer agreement',
    'Confirm signed representation agreement',
  ]
  const existing = await prisma.caseTask.findFirst({
    where: {
      assessmentId,
      mergedIntoId: null,
      OR: titles.map((title) => ({ title: { equals: title, mode: 'insensitive' as const } })),
    },
    select: { id: true },
  })
  if (existing) return 'exists'

  // Keep person fields empty so the open-task screen defaults to Auto.
  const dueDate = addDays(new Date(), 2)
  await prisma.caseTask.create({
    data: {
      assessmentId,
      title: 'Confirm signed representation agreement',
      taskType: 'milestone',
      milestoneType: 'case_opening',
      dueDate,
      reminderAt: dueDate,
      priority: 'high',
      escalationLevel: 'warning',
      status: 'open',
      assignedRole: 'attorney',
      assignedTo: null,
      assignedUserId: null,
      notes:
        'Auto-completes when the client signs the retainer via e-sign. Complete manually only if the retainer was signed outside ClearCaseIQ.',
      createdById: opts?.createdById || null,
      createdByName: opts?.createdByName || 'ClearCaseIQ',
    },
  })
  return 'created'
}

export async function ensureSendRetainerTask(assessmentId: string, opts?: {
  createdById?: string | null
  createdByName?: string | null
}): Promise<'created' | 'exists' | 'noop'> {
  if (!assessmentId) return 'noop'
  const existing = await prisma.caseTask.findFirst({
    where: {
      assessmentId,
      mergedIntoId: null,
      title: { equals: SEND_RETAINER_TASK_TITLE, mode: 'insensitive' },
    },
    select: { id: true },
  })
  if (existing) return 'exists'

  // Keep person fields empty so the open-task screen defaults to Auto.
  const dueDate = addDays(new Date(), 1)
  await prisma.caseTask.create({
    data: {
      assessmentId,
      title: SEND_RETAINER_TASK_TITLE,
      taskType: 'milestone',
      milestoneType: 'case_opening',
      dueDate,
      reminderAt: dueDate,
      priority: 'high',
      escalationLevel: 'warning',
      status: 'open',
      assignedRole: 'attorney',
      assignedTo: null,
      assignedUserId: null,
      notes:
        'Send the contingency-fee retainer to the client for e-signature (Signatures tab). You can use the firm template or upload your own retainer PDF.',
      createdById: opts?.createdById || null,
      createdByName: opts?.createdByName || 'ClearCaseIQ',
    },
  })
  return 'created'
}

async function tryAutoSendRetainer(params: {
  leadId: string
  attorneyId: string
  assessmentId: string
}): Promise<boolean> {
  try {
    const attorney = await prisma.attorney.findUnique({
      where: { id: params.attorneyId },
      include: { lawFirm: true },
    })
    if (!attorney) return false

    const lead = await prisma.leadSubmission.findUnique({
      where: { id: params.leadId },
      include: {
        assessment: {
          select: {
            id: true,
            caseName: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    })
    const user = lead?.assessment?.user
    const signerEmail = String(user?.email || '').trim()
    const signerName =
      [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Client'
    if (!signerEmail) {
      logger.warn('Auto-send retainer skipped: client email missing', { leadId: params.leadId })
      return false
    }

    // Prefer the firm's uploaded retainer template PDF when available.
    let usedFirmTemplate = false
    if (attorney.lawFirmId) {
      const templates = await (prisma as any).firmTemplate.findMany({
        where: { lawFirmId: attorney.lawFirmId, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      })
      const firmRetainer = templates.find(
        (t: any) =>
          isRetainerTemplateName(t.name) &&
          t.fileMime === 'application/pdf' &&
          t.filePath &&
          fs.existsSync(t.filePath),
      )
      if (firmRetainer) {
        await createEnvelopeForLead({
          leadId: params.leadId,
          attorneyId: params.attorneyId,
          documentType: 'retainer',
          title: firmRetainer.name || 'Retainer agreement',
          signerName,
          signerEmail,
          filePath: firmRetainer.filePath,
        })
        usedFirmTemplate = true
      }
    }

    if (!usedFirmTemplate) {
      await createRetainerAgreementEnvelope({
        leadId: params.leadId,
        attorneyId: params.attorneyId,
        signerName,
        signerEmail,
        attorneyName: attorney.name || undefined,
        firmName: attorney.lawFirm?.name || attorney.name || undefined,
        caseRef: lead?.assessment?.caseName || params.assessmentId.slice(0, 8),
      })
    }

    // Mark send task done (signature still pending — confirm-signed completes later).
    await markSendRetainerTaskDone(
      params.assessmentId,
      `Auto-sent via firm setting ${FIRM_SETTING_AUTO_SEND_RETAINER}${usedFirmTemplate ? ' (firm template PDF)' : ''}.`,
    )

    logger.info('Auto-sent retainer on acquire', {
      leadId: params.leadId,
      attorneyId: params.attorneyId,
      usedFirmTemplate,
    })
    return true
  } catch (error: any) {
    logger.warn('Auto-send retainer on acquire failed', {
      leadId: params.leadId,
      error: error?.message || String(error),
    })
    return false
  }
}

/**
 * Run after a successful accept/acquire: post-acquire conflict screen, ensure
 * Send retainer task, optionally auto-send retainer.
 */
export async function runPostAcquireIntakeHooks(params: {
  leadId: string
  attorneyId: string
  assessmentId: string
  lawFirmId?: string | null
  actorUserId?: string | null
  actorName?: string | null
}): Promise<void> {
  try {
    await runAndPersistConflictCheck({
      attorneyId: params.attorneyId,
      leadId: params.leadId,
      phase: 'post_acquire',
    })
    // Always clear conflict tasks after post-acquire screen (firm still reviews flagged hits).
    await completeConflictRelatedTasks(params.assessmentId)
  } catch (error: any) {
    logger.warn('Post-acquire conflict check failed', { leadId: params.leadId, error: error?.message })
  }

  try {
    await ensureSendRetainerTask(params.assessmentId, {
      createdById: params.actorUserId,
      createdByName: params.actorName || 'ClearCaseIQ',
    })
    await ensureConfirmSignedRetainerTask(params.assessmentId, {
      createdById: params.actorUserId,
      createdByName: params.actorName || 'ClearCaseIQ',
    })
  } catch (error: any) {
    logger.warn('Ensure retainer tasks failed', { assessmentId: params.assessmentId, error: error?.message })
  }

  const autoSend = await getFirmSettingBool(params.lawFirmId, FIRM_SETTING_AUTO_SEND_RETAINER)
  if (autoSend) {
    await tryAutoSendRetainer({
      leadId: params.leadId,
      attorneyId: params.attorneyId,
      assessmentId: params.assessmentId,
    })
  }
}

export async function completeRetainerRelatedTasks(assessmentId: string): Promise<number> {
  if (!assessmentId) return 0
  const open = await prisma.caseTask.findMany({
    where: {
      assessmentId,
      mergedIntoId: null,
      status: { in: ['open', 'in_progress'] },
    },
  })
  let completed = 0
  for (const task of open) {
    const title = String(task.title || '')
    if (!RETAINER_DONE_TITLE_MATCHERS.some((re) => re.test(title))) continue
    const updated = await prisma.caseTask.update({
      where: { id: task.id },
      data: { status: 'done', completedAt: new Date() },
    })
    await syncWorkflowItemFromTask(updated).catch(() => undefined)
    completed += 1
  }
  if (completed) logger.info('Completed retainer-related tasks', { assessmentId, completed })
  return completed
}

const WELCOME_PACKET_TITLE_MATCHERS = [
  /send client welcome packet/i,
  /welcome packet/i,
  /welcome letter/i,
  /engagement\s*\/\s*welcome/i,
]

/** True when a firm template is a welcome / engagement packet. */
export function isWelcomeTemplateName(name: string): boolean {
  return /welcome|engagement\s*\/\s*welcome|engagement letter|new-?client intake package/i.test(
    String(name || ''),
  )
}

/** Mark welcome-packet CaseTasks / workflow steps done after send (or leave manual Done). */
export async function completeWelcomePacketRelatedTasks(
  assessmentId: string,
  note?: string,
): Promise<number> {
  if (!assessmentId) return 0
  const open = await prisma.caseTask.findMany({
    where: {
      assessmentId,
      mergedIntoId: null,
      status: { in: ['open', 'in_progress'] },
    },
  })
  let completed = 0
  for (const task of open) {
    const title = String(task.title || '')
    if (!WELCOME_PACKET_TITLE_MATCHERS.some((re) => re.test(title))) continue
    const updated = await prisma.caseTask.update({
      where: { id: task.id },
      data: {
        status: 'done',
        completedAt: new Date(),
        notes: note ? `${task.notes || ''}\n${note}`.trim() : task.notes,
      },
    })
    await syncWorkflowItemFromTask(updated).catch(() => undefined)
    completed += 1
  }
  if (completed) logger.info('Completed welcome-packet tasks', { assessmentId, completed })
  return completed
}

export async function completeWelcomePacketForLead(leadId: string, note?: string): Promise<number> {
  const lead = await prisma.leadSubmission.findUnique({
    where: { id: leadId },
    select: { assessmentId: true },
  })
  if (!lead?.assessmentId) return 0
  return completeWelcomePacketRelatedTasks(lead.assessmentId, note)
}

async function countOpenRetainerTasks(assessmentId: string): Promise<number> {
  const open = await prisma.caseTask.findMany({
    where: {
      assessmentId,
      mergedIntoId: null,
      status: { in: ['open', 'in_progress'] },
    },
    select: { title: true },
  })
  return open.filter((t) =>
    RETAINER_DONE_TITLE_MATCHERS.some((re) => re.test(String(t.title || ''))),
  ).length
}

/**
 * Attorney "Check" on Confirm signed representation agreement:
 * poll Dropbox Sign for open retainers, then complete the confirm task if a
 * retainer/fee agreement is already signed (webhook-less safety net).
 */
export async function checkConfirmRetainerSigned(leadId: string): Promise<{
  signed: boolean
  completedTasks: number
  alreadyDone: boolean
  envelopeId: string | null
  title: string | null
  signedAt: Date | null
  signerEmail: string | null
}> {
  const { refreshLeadEnvelopes } = await import('./esign/esign-service')
  await refreshLeadEnvelopes(leadId)

  const signed = await prisma.documentEnvelope.findFirst({
    where: {
      leadId,
      status: 'signed',
      documentType: { in: ['retainer', 'fee_agreement'] },
    },
    orderBy: [{ signedAt: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      title: true,
      signedAt: true,
      signerEmail: true,
      documentType: true,
    },
  })

  if (!signed) {
    return {
      signed: false,
      completedTasks: 0,
      alreadyDone: false,
      envelopeId: null,
      title: null,
      signedAt: null,
      signerEmail: null,
    }
  }

  const lead = await prisma.leadSubmission.findUnique({
    where: { id: leadId },
    select: { assessmentId: true },
  })
  const openBefore = lead?.assessmentId ? await countOpenRetainerTasks(lead.assessmentId) : 0

  // Ensures tasks + retained status even when the webhook/poll path already
  // flipped the envelope but missed intake completion.
  await onRetainerSigned({
    leadId,
    envelopeId: signed.id,
    documentType: signed.documentType,
  })

  const openAfter = lead?.assessmentId ? await countOpenRetainerTasks(lead.assessmentId) : 0
  const completedTasks = Math.max(0, openBefore - openAfter)

  return {
    signed: true,
    completedTasks,
    alreadyDone: openBefore === 0,
    envelopeId: signed.id,
    title: signed.title,
    signedAt: signed.signedAt,
    signerEmail: signed.signerEmail,
  }
}

/**
 * When a retainer/fee agreement is signed: file already handled by e-sign service;
 * complete tasks, retain the lead if needed, notify attorney.
 */
export async function onRetainerSigned(params: {
  leadId: string
  envelopeId: string
  documentType: string
}): Promise<void> {
  const lead = await prisma.leadSubmission.findUnique({
    where: { id: params.leadId },
    select: {
      id: true,
      status: true,
      lifecycleState: true,
      assessmentId: true,
      assignedAttorneyId: true,
    },
  })
  if (!lead?.assessmentId) return

  // Mark retained first so a task-completion failure cannot leave the case
  // stuck on consultation_scheduled after a signed retainer (plaintiff Case Status).
  const alreadyRetained = String(lead.status || '').toLowerCase() === 'retained'
  if (!alreadyRetained) {
    await prisma.leadSubmission.update({
      where: { id: lead.id },
      data: {
        status: 'retained',
        convertedAt: new Date(),
        lifecycleState: 'engaged',
        routingLocked: true,
      },
    })
    logger.info('Lead marked retained after retainer signed', {
      leadId: lead.id,
      assessmentId: lead.assessmentId,
      envelopeId: params.envelopeId,
      previousStatus: lead.status,
      previousLifecycle: lead.lifecycleState,
    })
  } else if (String(lead.lifecycleState || '') !== 'engaged') {
    await prisma.leadSubmission.update({
      where: { id: lead.id },
      data: { lifecycleState: 'engaged', routingLocked: true },
    })
  }

  await completeRetainerRelatedTasks(lead.assessmentId).catch((e: any) =>
    logger.warn('Complete retainer tasks failed after signed retainer', {
      assessmentId: lead.assessmentId,
      error: e?.message,
    }),
  )

  if (!alreadyRetained) {
    await createCaseOpeningTasks(lead.assessmentId, { createdByName: 'ClearCaseIQ' }).catch((e: any) =>
      logger.warn('Opening tasks after retainer signed failed', { error: e?.message }),
    )
    // Re-complete retainer tasks that opening checklist may have recreated as "Confirm signed…"
    await completeRetainerRelatedTasks(lead.assessmentId).catch((e: any) =>
      logger.warn('Re-complete retainer tasks failed', { assessmentId: lead.assessmentId, error: e?.message }),
    )
    try {
      const { syncCaseStage } = await import('./case-stage')
      await syncCaseStage(lead.assessmentId, { source: 'system' })
    } catch (e: any) {
      logger.warn('syncCaseStage after retainer signed failed', { error: e?.message })
    }
  }

  if (lead.assignedAttorneyId) {
    await notifyAttorneyInApp({
      attorneyId: lead.assignedAttorneyId,
      assessmentId: lead.assessmentId,
      leadId: lead.id,
      eventType: ATTORNEY_EVENTS.doc_uploaded,
      subject: 'Retainer signed',
      body: 'The client signed the retainer agreement. Related opening tasks were completed and the case is marked retained.',
      link: `/attorney-dashboard/cases/${lead.id}/signatures`,
      payload: { envelopeId: params.envelopeId, documentType: params.documentType },
    }).catch((e: any) => logger.warn('Retainer-signed attorney notify failed', { error: e?.message }))
  }
}

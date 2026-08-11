/**
 * Collect Police/incident report task helpers: check evidence on file, client
 * authorization status, and complete matching open tasks when the report lands.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { syncWorkflowItemFromTask } from './workflow-step-tasks'

const POLICE_TASK_TITLE_MATCHERS = [
  /collect police\/?incident report/i,
  /collect police.?incident report/i,
  /request police\s*\/\s*incident report/i,
  /secure police\s*\/\s*incident report/i,
  /police\s*\/\s*incident report/i,
]

const POLICE_EVIDENCE_CATEGORIES = ['police_report', 'police', 'incident_report']

export function isPoliceCollectTaskTitle(title: string): boolean {
  return POLICE_TASK_TITLE_MATCHERS.some((re) => re.test(String(title || '')))
}

async function completePoliceCollectTasks(assessmentId: string, note?: string): Promise<number> {
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
    if (!isPoliceCollectTaskTitle(String(task.title || ''))) continue
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
  if (completed) logger.info('Completed police-report collect tasks', { assessmentId, completed })
  return completed
}

/** Attorney "Check" / Auth status for Collect Police/incident report. */
export async function checkCollectPoliceReport(leadId: string): Promise<{
  reportOnFile: boolean
  authSigned: boolean
  authSent: boolean
  completedTasks: number
  evidenceFileId: string | null
  authEnvelopeId: string | null
  authTitle: string | null
}> {
  const lead = await prisma.leadSubmission.findUnique({
    where: { id: leadId },
    select: { assessmentId: true },
  })
  if (!lead?.assessmentId) {
    return {
      reportOnFile: false,
      authSigned: false,
      authSent: false,
      completedTasks: 0,
      evidenceFileId: null,
      authEnvelopeId: null,
      authTitle: null,
    }
  }

  const evidence = await prisma.evidenceFile.findFirst({
    where: {
      assessmentId: lead.assessmentId,
      OR: POLICE_EVIDENCE_CATEGORIES.map((category) => ({
        category: { equals: category, mode: 'insensitive' as const },
      })),
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  const authSigned = await prisma.documentEnvelope.findFirst({
    where: {
      leadId,
      documentType: 'police_report_authorization',
      status: 'signed',
    },
    orderBy: [{ signedAt: 'desc' }, { updatedAt: 'desc' }],
    select: { id: true, title: true },
  })

  const authOpen = await prisma.documentEnvelope.findFirst({
    where: {
      leadId,
      documentType: 'police_report_authorization',
      status: { in: ['draft', 'sent', 'viewed'] },
    },
    select: { id: true },
  })

  let completedTasks = 0
  if (evidence) {
    completedTasks = await completePoliceCollectTasks(
      lead.assessmentId,
      'Completed — police/incident report on file.',
    )
  }

  return {
    reportOnFile: Boolean(evidence),
    authSigned: Boolean(authSigned),
    authSent: Boolean(authOpen || authSigned),
    completedTasks,
    evidenceFileId: evidence?.id || null,
    authEnvelopeId: authSigned?.id || null,
    authTitle: authSigned?.title || null,
  }
}

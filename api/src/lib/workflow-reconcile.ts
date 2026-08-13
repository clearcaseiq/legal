/**
 * Keep the Workflow tab honest without attorneys working on it.
 *
 * Two reconcile paths:
 *  1. Tasks → Workflow: a step may map to many Tasks-tab rows (workflow
 *     materialization, Case Coach, Day-1 opening). When every related task is
 *     done, the Workflow step is done; if any related task reopens, it reopens.
 *  2. Case data → Workflow: evidence / envelopes / claim # prove the step even
 *     when no open task remains (same spirit as Missing Information cross-off).
 *
 * AI milestones stay signal-derived in serializeCaseWorkflow.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import {
  parseWorkflowItemIdFromTaskKey,
  workflowItemTaskKey,
} from './workflow-step-tasks'
import { assessmentHasHipaaOnFile } from './case-opening'
import { normalizeTaskTitle, resolveTaskWorkKey } from './task-identity'

type ReconcileCtx = {
  assessmentId: string
  evidenceCategories: Set<string>
  signedRetainer: boolean
  sentRetainer: boolean
  claimOpened: boolean
  hasPhotos: boolean
  hasMedicalRecords: boolean
  hasMedicalBills: boolean
  hasPoliceReport: boolean
  medicalSpecialsOnFile: boolean
  conflictCleared: boolean
  welcomeSent: boolean
  hasHipaa: boolean
}

function hasCat(set: Set<string>, needles: string[]): boolean {
  for (const n of needles) {
    const low = n.toLowerCase()
    for (const v of set) if (v.includes(low)) return true
  }
  return false
}

async function loadReconcileCtx(assessmentId: string): Promise<ReconcileCtx | null> {
  const assessment = await prisma.assessment
    .findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        facts: true,
        leadSubmission: { select: { id: true } },
        evidenceFiles: { select: { category: true, aiClassification: true } },
        insuranceDetails: {
          select: { claimNumber: true, claimStatus: true },
        },
      },
    })
    .catch(() => null)
  if (!assessment) return null

  let facts: Record<string, any> = {}
  try {
    facts = assessment.facts ? JSON.parse(assessment.facts) : {}
  } catch {
    facts = {}
  }

  const evidenceCategories = new Set<string>()
  for (const f of assessment.evidenceFiles || []) {
    if (f.category) evidenceCategories.add(String(f.category).toLowerCase())
    if (f.aiClassification) evidenceCategories.add(String(f.aiClassification).toLowerCase())
  }
  for (const item of Array.isArray(facts.evidence) ? facts.evidence : []) {
    if (item) evidenceCategories.add(String(item).toLowerCase())
  }

  const leadId = assessment.leadSubmission?.id || null
  const envelopes = leadId
    ? await prisma.documentEnvelope
        .findMany({
          where: { leadId },
          select: { documentType: true, status: true, title: true },
        })
        .catch(() => [] as Array<{ documentType: string | null; status: string; title: string | null }>)
    : []

  const retainerEnvelopes = envelopes.filter((e) => {
    const t = `${e.documentType || ''} ${e.title || ''}`.toLowerCase()
    return t.includes('retainer') || t.includes('representation') || t.includes('fee agreement')
  })
  const signedRetainer = retainerEnvelopes.some((e) => String(e.status).toLowerCase() === 'signed')
  const sentRetainer = retainerEnvelopes.some((e) =>
    ['sent', 'delivered', 'viewed', 'signed'].includes(String(e.status).toLowerCase()),
  )
  const welcomeSent = envelopes.some((e) => {
    const t = `${e.documentType || ''} ${e.title || ''}`.toLowerCase()
    return /welcome|engagement/.test(t) && ['sent', 'delivered', 'viewed', 'signed'].includes(String(e.status).toLowerCase())
  })

  const claimNumberOnFacts = Boolean(
    String(facts?.insurance?.claim_number || facts?.insurance?.claimNumber || '').trim(),
  )
  const claimOpened =
    claimNumberOnFacts ||
    (assessment.insuranceDetails || []).some(
      (d) =>
        (typeof d.claimNumber === 'string' && d.claimNumber.trim()) ||
        (d.claimStatus && d.claimStatus !== 'not_opened'),
    )

  const medicalSpecialsOnFile =
    Number(facts?.damages?.med_charges || facts?.damages?.medical_bills || 0) > 0 ||
    Number(facts?.medicalTimeline?.billedTotal || 0) > 0

  // Conflict is "cleared" once a check exists and is resolved / low / none.
  let conflictCleared = false
  if (leadId) {
    const check = await prisma.conflictCheck
      .findFirst({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        select: { riskLevel: true, conflictType: true, isResolved: true, acknowledgedAt: true },
      })
      .catch(() => null)
    if (check) {
      const risk = String(check.riskLevel || 'low').toLowerCase()
      const type = String(check.conflictType || 'none').toLowerCase()
      conflictCleared =
        Boolean(check.isResolved) ||
        Boolean(check.acknowledgedAt) ||
        type === 'none' ||
        risk === 'low'
    }
  }

  const hasHipaa = await assessmentHasHipaaOnFile(assessmentId).catch(() => false)

  return {
    assessmentId,
    evidenceCategories,
    signedRetainer,
    sentRetainer,
    claimOpened,
    hasPhotos: hasCat(evidenceCategories, ['photos', 'photo', 'image', 'injury_photos']),
    hasMedicalRecords: hasCat(evidenceCategories, ['medical_records', 'medical']),
    hasMedicalBills: hasCat(evidenceCategories, ['bills', 'medical_bills']),
    hasPoliceReport: hasCat(evidenceCategories, ['police_report', 'police', 'incident_report']),
    medicalSpecialsOnFile,
    conflictCleared,
    welcomeSent,
    hasHipaa,
  }
}

type Rule = {
  id: string
  match: (title: string) => boolean
  satisfied: (ctx: ReconcileCtx) => boolean
  reason: string
}

/** @internal exported for unit tests */
export const WORKFLOW_RECONCILE_RULES: Rule[] = [
  {
    id: 'conflict_check',
    match: (t) => /conflict check/i.test(t) || /open matter.*conflict/i.test(t),
    satisfied: (ctx) => ctx.conflictCleared,
    reason: 'Conflict screen already on file.',
  },
  {
    id: 'send_retainer',
    match: (t) => /^send retainer to client$/i.test(t) || /send retainer for signature/i.test(t),
    satisfied: (ctx) => ctx.sentRetainer || ctx.signedRetainer,
    reason: 'Retainer envelope already sent / signed.',
  },
  {
    id: 'confirm_retainer',
    match: (t) => /confirm signed (retainer|representation)/i.test(t),
    satisfied: (ctx) => ctx.signedRetainer,
    reason: 'Signed retainer already on file.',
  },
  {
    id: 'welcome_packet',
    match: (t) => /welcome packet/i.test(t) || /welcome letter/i.test(t),
    satisfied: (ctx) => ctx.welcomeSent,
    reason: 'Welcome / engagement packet already sent.',
  },
  {
    id: 'police_report',
    match: (t) => /police\s*\/\s*incident report/i.test(t) || /police.?incident report/i.test(t),
    satisfied: (ctx) => ctx.hasPoliceReport,
    reason: 'Police / incident report already on file.',
  },
  {
    id: 'open_insurance_claim',
    match: (t) => /open insurance claim/i.test(t) || /open (the )?claim/i.test(t),
    satisfied: (ctx) => ctx.claimOpened,
    reason: 'Insurance claim number / opened claim already on file.',
  },
  {
    id: 'hipaa',
    match: (t) => /hipaa/i.test(t),
    satisfied: (ctx) => ctx.hasHipaa,
    reason: 'HIPAA authorization already on file.',
  },
  {
    id: 'photos',
    match: (t) => /gather photos/i.test(t) || /photos?, witness/i.test(t),
    satisfied: (ctx) => ctx.hasPhotos,
    reason: 'Photos already on file.',
  },
  {
    id: 'medical_records',
    match: (t) =>
      /(?:collect|request|secure|obtain)\s+medical records?/i.test(t) ||
      (/medical records?/i.test(t) && !/bills/i.test(t)),
    satisfied: (ctx) => ctx.hasMedicalRecords,
    reason: 'Medical records already on file.',
  },
  {
    id: 'medical_bills',
    match: (t) =>
      /(?:collect|request|secure|obtain)\s+medical bills?/i.test(t) ||
      (/medical bills?/i.test(t) && !/records?/i.test(t)) ||
      (/collect (medical )?bills\b/i.test(t) && !/records?/i.test(t)),
    satisfied: (ctx) => ctx.hasMedicalBills,
    reason: 'Medical bills already on file.',
  },
  {
    id: 'medical_records_bills',
    match: (t) => /medical records?\s*(&|and)\s*bills/i.test(t) || /all medical records(?:\s*&?\s*bills)?/i.test(t),
    satisfied: (ctx) => ctx.hasMedicalRecords && ctx.hasMedicalBills,
    reason: 'Medical records and bills already on file.',
  },
  {
    id: 'special_damages',
    match: (t) => /special damages/i.test(t) || /itemize.*damages/i.test(t) || /compile.*damages/i.test(t),
    satisfied: (ctx) => ctx.medicalSpecialsOnFile,
    reason: 'Medical specials already captured on the file.',
  },
]

type TaskRow = {
  id: string
  title: string
  status: string
  notes?: string | null
  sourceTemplateStepId?: string | null
  completedAt?: Date | null
}

const OPEN_TASK_STATUSES = new Set(['open', 'in_progress'])
const DONE_TASK_STATUSES = new Set(['done', 'skipped', 'cancelled'])

/** True when a Tasks-tab row is about the same work as a Workflow step. */
export function taskBelongsToWorkflowItem(
  item: { id: string; title: string },
  task: TaskRow,
): boolean {
  const linkedId = parseWorkflowItemIdFromTaskKey(task.sourceTemplateStepId)
  if (linkedId && linkedId === item.id) return true
  if (task.sourceTemplateStepId === workflowItemTaskKey(item.id)) return true

  const itemTitle = normalizeTaskTitle(item.title)
  const taskTitle = normalizeTaskTitle(task.title)
  if (itemTitle && taskTitle) {
    if (itemTitle === taskTitle) return true
    if (
      (itemTitle.length >= 12 || taskTitle.length >= 12) &&
      (itemTitle.includes(taskTitle) || taskTitle.includes(itemTitle))
    ) {
      return true
    }
  }

  const itemWork = resolveTaskWorkKey({ title: item.title })
  const taskWork = resolveTaskWorkKey({ title: task.title, notes: task.notes })
  if (itemWork && taskWork && itemWork === taskWork) return true

  const itemRule = WORKFLOW_RECONCILE_RULES.find((r) => r.match(item.title))
  if (itemRule && itemRule.match(String(task.title || ''))) return true

  return false
}

export function tasksRelatedToWorkflowItem(item: { id: string; title: string }, tasks: TaskRow[]): TaskRow[] {
  return tasks.filter((t) => taskBelongsToWorkflowItem(item, t))
}

async function setWorkflowItemStatus(
  itemId: string,
  status: 'done' | 'pending',
  completedAt: Date | null,
): Promise<void> {
  await (prisma as any).caseWorkflowItem.update({
    where: { id: itemId },
    data: {
      status,
      completedAt,
      ...(status === 'pending' ? { completedById: null } : {}),
    },
  })
}

/**
 * Close every related open CaseTask when a Workflow step is done/skipped
 * (inverse of Tasks → Workflow “all related must be done”).
 */
export async function closeRelatedOpenTasksForWorkflowItem(
  assessmentId: string,
  item: { id: string; title: string },
  reason: string,
): Promise<number> {
  const noteLine = reason.startsWith('Auto-completed')
    ? reason
    : `Closed with workflow step — ${reason}`
  const tasks = await prisma.caseTask.findMany({
    where: { assessmentId, mergedIntoId: null, status: { in: ['open', 'in_progress'] } },
    select: {
      id: true,
      title: true,
      status: true,
      notes: true,
      sourceTemplateStepId: true,
      completedAt: true,
    },
  })
  const related = tasksRelatedToWorkflowItem(item, tasks)
  for (const task of related) {
    await prisma.caseTask.update({
      where: { id: task.id },
      data: {
        status: 'done',
        completedAt: new Date(),
        notes: `${task.notes || ''}\n${noteLine}`.trim(),
        // Ensure the task stays linked for future syncs.
        sourceTemplateStepId: task.sourceTemplateStepId || workflowItemTaskKey(item.id),
      },
    })
  }
  return related.length
}

/**
 * When a Workflow step is reopened, reopen CaseTasks linked via wfitem:<id>.
 * Title-matched peers that were completed independently are left alone.
 */
export async function reopenLinkedTasksForWorkflowItem(
  assessmentId: string,
  itemId: string,
): Promise<number> {
  const key = workflowItemTaskKey(itemId)
  const tasks = await prisma.caseTask.findMany({
    where: {
      assessmentId,
      mergedIntoId: null,
      sourceTemplateStepId: key,
      status: { in: ['done', 'skipped'] },
    },
    select: { id: true },
  })
  for (const task of tasks) {
    await prisma.caseTask.update({
      where: { id: task.id },
      data: { status: 'open', completedAt: null },
    })
  }
  return tasks.length
}

/**
 * Mirror Tasks-tab completion onto Workflow steps.
 * One Workflow step can own many tasks; it completes only when every related
 * task is done (and at least one related task exists).
 */
export async function reconcileWorkflowItemsFromTasks(
  assessmentId: string,
): Promise<{ completed: number; reopened: number }> {
  if (!assessmentId) return { completed: 0, reopened: 0 }

  const cw = await (prisma as any).caseWorkflow
    .findUnique({
      where: { assessmentId },
      include: {
        items: {
          where: { stepType: { not: 'ai_milestone' } },
        },
      },
    })
    .catch(() => null)
  if (!cw?.items?.length) return { completed: 0, reopened: 0 }

  const tasks = await prisma.caseTask.findMany({
    where: { assessmentId, mergedIntoId: null },
    select: {
      id: true,
      title: true,
      status: true,
      notes: true,
      sourceTemplateStepId: true,
      completedAt: true,
    },
  })

  let completed = 0
  let reopened = 0

  for (const item of cw.items) {
    const related = tasksRelatedToWorkflowItem(item, tasks)
    if (related.length === 0) continue

    const openRelated = related.filter((t) => OPEN_TASK_STATUSES.has(String(t.status)))
    const doneRelated = related.filter((t) => DONE_TASK_STATUSES.has(String(t.status)))

    // Link any related tasks that aren't tied to a workflow item yet.
    for (const t of related) {
      const linked = parseWorkflowItemIdFromTaskKey(t.sourceTemplateStepId)
      if (linked) continue
      if (t.sourceTemplateStepId && t.sourceTemplateStepId !== workflowItemTaskKey(item.id)) continue
      await prisma.caseTask
        .update({
          where: { id: t.id },
          data: { sourceTemplateStepId: workflowItemTaskKey(item.id) },
        })
        .catch(() => undefined)
      t.sourceTemplateStepId = workflowItemTaskKey(item.id)
    }

    if (openRelated.length === 0 && doneRelated.length > 0) {
      if (item.status !== 'done') {
        const latestDone = doneRelated
          .map((t) => (t.completedAt ? new Date(t.completedAt).getTime() : 0))
          .reduce((a, b) => Math.max(a, b), 0)
        await setWorkflowItemStatus(item.id, 'done', latestDone ? new Date(latestDone) : new Date())
        completed += 1
      }
    } else if (openRelated.length > 0 && (item.status === 'done' || item.status === 'skipped')) {
      await setWorkflowItemStatus(item.id, 'pending', null)
      reopened += 1
    }
  }

  if (completed || reopened) {
    logger.info('Reconciled workflow items from tasks', { assessmentId, completed, reopened })
  }
  return { completed, reopened }
}

/**
 * Auto-complete Workflow steps that case data already proves (no open task required).
 * Also closes any still-open related Tasks-tab rows for those steps.
 */
export async function reconcileWorkflowItemsFromCaseData(
  assessmentId: string,
): Promise<{ completed: number; keys: string[] }> {
  if (!assessmentId) return { completed: 0, keys: [] }

  const ctx = await loadReconcileCtx(assessmentId)
  if (!ctx) return { completed: 0, keys: [] }

  const cw = await (prisma as any).caseWorkflow
    .findUnique({
      where: { assessmentId },
      include: {
        items: {
          where: { status: { in: ['pending', 'skipped'] }, stepType: { not: 'ai_milestone' } },
        },
      },
    })
    .catch(() => null)

  if (!cw?.items?.length) return { completed: 0, keys: [] }

  const keys: string[] = []
  for (const item of cw.items) {
    const title = String(item.title || '')
    const rule = WORKFLOW_RECONCILE_RULES.find((r) => r.match(title))
    if (!rule) continue
    if (!rule.satisfied(ctx)) continue
    await setWorkflowItemStatus(item.id, 'done', new Date())
    await closeRelatedOpenTasksForWorkflowItem(
      assessmentId,
      item,
      `Auto-completed from case data — ${rule.reason}`,
    )
    keys.push(rule.id)
  }

  if (keys.length) {
    logger.info('Reconciled workflow items from case data', {
      assessmentId,
      completed: keys.length,
      keys,
    })
  }
  return { completed: keys.length, keys }
}

/**
 * Full Workflow sync: Tasks-tab state first, then case-data proof.
 * Call on Workflow GET, Tasks GET, and after any task status change.
 */
export async function reconcileWorkflowProgress(assessmentId: string): Promise<{
  fromTasks: { completed: number; reopened: number }
  fromCaseData: { completed: number; keys: string[] }
}> {
  const fromTasks = await reconcileWorkflowItemsFromTasks(assessmentId)
  const fromCaseData = await reconcileWorkflowItemsFromCaseData(assessmentId)
  return { fromTasks, fromCaseData }
}

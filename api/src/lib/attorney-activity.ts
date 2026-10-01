/**
 * Attorney activity log — training data for task recommendation.
 *
 * Every write here is fire-and-forget and swallows its own errors: losing an
 * event is acceptable, failing an attorney's request because of one is not.
 *
 * The labels that matter most are what people do with AI-proposed tasks
 * (accepted, edited, dismissed and why, or left alone) and the tasks they add
 * by hand that the AI never proposed. Each event carries a snapshot of the case
 * at that moment so a model can learn from what was known when the decision
 * was made, not from facts that arrived afterwards.
 */
import { prisma } from './prisma'
import { logger } from './logger'

export const AI_TASK_TYPES = ['coach', 'proposed'] as const

export const DISMISS_REASONS = [
  'not_relevant',
  'already_done',
  'wrong_timing',
  'wrong_assignee',
  'duplicate',
  'other',
] as const
export type DismissReason = (typeof DISMISS_REASONS)[number]

export function normalizeDismissReason(value: unknown): DismissReason | null {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return (DISMISS_REASONS as readonly string[]).includes(v) ? (v as DismissReason) : null
}

export type TaskOrigin = 'ai' | 'template' | 'manual' | 'system'

export type TaskOriginSource = {
  taskType?: string | null
  reviewStatus?: string | null
  createdById?: string | null
  sourceTemplateId?: string | null
  sourceTemplateStepId?: string | null
}

export function taskOrigin(task: TaskOriginSource): TaskOrigin {
  if ((AI_TASK_TYPES as readonly string[]).includes(String(task.taskType || ''))) return 'ai'
  // Only AI-generated tasks pass through the review gate.
  if (task.reviewStatus) return 'ai'
  if (task.sourceTemplateId || task.sourceTemplateStepId) return 'template'
  if (task.createdById) return 'manual'
  return 'system'
}

export type AttorneyActivityInput = {
  action: string
  entityType?: string
  entityId?: string | null
  assessmentId?: string | null
  leadId?: string | null
  lawFirmId?: string | null
  actor?: { id?: string | null; role?: string | null } | null
  task?: TaskOriginSource | null
  properties?: Record<string, unknown>
}

function loggingEnabled(): boolean {
  const flag = String(process.env.ATTORNEY_ACTIVITY_LOGGING || '').toLowerCase()
  if (flag === 'off') return false
  // Route tests share one mocked Prisma; a background write would consume
  // their queued mock results.
  if (process.env.VITEST && flag !== 'on') return false
  return true
}

const CONTEXT_TTL_MS = 60_000
const contextCache = new Map<string, { at: number; value: Record<string, unknown> | null }>()

function daysBetween(from: Date | string | null | undefined, to: Date): number | null {
  if (!from) return null
  const t = new Date(from).getTime()
  if (!Number.isFinite(t)) return null
  return Math.floor((to.getTime() - t) / 86_400_000)
}

export async function buildCaseContext(
  assessmentId: string,
  leadId?: string | null,
): Promise<Record<string, unknown> | null> {
  const cached = contextCache.get(assessmentId)
  if (cached && Date.now() - cached.at < CONTEXT_TTL_MS) return cached.value

  const now = new Date()
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      claimType: true,
      venueState: true,
      caseStage: true,
      caseStageAt: true,
      litigationStatus: true,
      createdAt: true,
      facts: true,
    },
  })
  if (!assessment) return null

  let incidentDate: string | null = null
  try {
    incidentDate = JSON.parse(assessment.facts || '{}')?.incident?.date || null
  } catch {
    incidentDate = null
  }

  const [taskCounts, openDocRequests, evidenceCount] = await Promise.all([
    prisma.caseTask
      .groupBy({ by: ['status'], where: { assessmentId, mergedIntoId: null }, _count: { _all: true } })
      .catch(() => [] as Array<{ status: string; _count: { _all: number } }>),
    leadId
      ? prisma.documentRequest
          .count({ where: { leadId, status: { not: 'completed' } } })
          .catch(() => null)
      : Promise.resolve(null),
    prisma.evidenceFile.count({ where: { assessmentId } }).catch(() => null),
  ])
  const tasksByStatus: Record<string, number> = {}
  for (const row of taskCounts) tasksByStatus[row.status] = row._count._all

  const value: Record<string, unknown> = {
    claimType: assessment.claimType,
    venueState: assessment.venueState,
    caseStage: assessment.caseStage,
    daysInStage: daysBetween(assessment.caseStageAt, now),
    litigationStatus: assessment.litigationStatus,
    daysSinceIntake: daysBetween(assessment.createdAt, now),
    daysSinceIncident: daysBetween(incidentDate, now),
    tasksByStatus,
    openDocRequests,
    evidenceCount,
  }
  contextCache.set(assessmentId, { at: Date.now(), value })
  return value
}

async function writeActivity(input: AttorneyActivityInput): Promise<void> {
  try {
    const context = input.assessmentId
      ? await buildCaseContext(input.assessmentId, input.leadId).catch(() => null)
      : null
    await prisma.attorneyActivityEvent.create({
      data: {
        lawFirmId: input.lawFirmId ?? null,
        actorUserId: input.actor?.id ?? null,
        actorRole: input.actor?.role ?? null,
        assessmentId: input.assessmentId ?? null,
        leadId: input.leadId ?? null,
        entityType: input.entityType || 'task',
        entityId: input.entityId ?? null,
        action: input.action,
        taskOrigin: input.task ? taskOrigin(input.task) : null,
        properties: input.properties ? JSON.stringify(input.properties) : null,
        context: context ? JSON.stringify(context) : null,
      },
    })
  } catch (error: any) {
    logger.warn('Attorney activity write failed', { action: input.action, error: error?.message })
  }
}

export function recordAttorneyActivity(input: AttorneyActivityInput): void {
  if (!loggingEnabled()) return
  void writeActivity(input)
}

type TaskSnapshot = {
  title?: string | null
  dueDate?: Date | string | null
  priority?: string | null
  assignedRole?: string | null
  assignedUserId?: string | null
  status?: string | null
  createdAt?: Date | string | null
}

function dayKey(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null
}

/** Field-level before/after for the edits a recommender should learn from. */
export function diffTaskEdits(before: TaskSnapshot, after: TaskSnapshot): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {}
  if ((before.title || '') !== (after.title || '')) changes.title = { from: before.title, to: after.title }
  if (dayKey(before.dueDate) !== dayKey(after.dueDate)) {
    changes.dueDate = { from: dayKey(before.dueDate), to: dayKey(after.dueDate) }
  }
  if ((before.priority || null) !== (after.priority || null)) {
    changes.priority = { from: before.priority, to: after.priority }
  }
  if ((before.assignedRole || null) !== (after.assignedRole || null)) {
    changes.assignedRole = { from: before.assignedRole, to: after.assignedRole }
  }
  if ((before.assignedUserId || null) !== (after.assignedUserId || null)) {
    changes.assignedUserId = { from: before.assignedUserId || null, to: after.assignedUserId || null }
  }
  return changes
}

/** How long a task lived and how it landed against its due date. */
export function taskTiming(task: TaskSnapshot, now = new Date()): Record<string, number | null> {
  const created = task.createdAt ? new Date(task.createdAt).getTime() : NaN
  const due = task.dueDate ? new Date(task.dueDate).getTime() : NaN
  return {
    ageHours: Number.isFinite(created) ? Math.round((now.getTime() - created) / 3_600_000) : null,
    daysVsDue: Number.isFinite(due) ? Math.round((now.getTime() - due) / 86_400_000) : null,
  }
}

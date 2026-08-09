/**
 * Litigation sub-track.
 *
 * Most PI matters resolve pre-suit, but some must be filed. Litigation runs
 * PARALLEL to the settlement lifecycle (`Assessment.caseStage`) rather than
 * replacing it — a case can be "in negotiation" and "in discovery" at the same
 * time — so it lives in its own `Assessment.litigationStatus` field instead of
 * as a case stage.
 *
 * Entering an active litigation status materializes the litigation checklist
 * (milestoneType 'litigation'), idempotently.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { recordCaseChange } from './data-authority'

export const LITIGATION_MILESTONE = 'litigation'

export const LITIGATION_STATUSES = [
  'none',
  'pre_suit',
  'filed',
  'discovery',
  'mediation',
  'trial',
  'resolved',
] as const

export type LitigationStatus = (typeof LITIGATION_STATUSES)[number]

export const LITIGATION_LABELS: Record<LitigationStatus, string> = {
  none: 'Pre-litigation',
  pre_suit: 'Preparing suit',
  filed: 'Suit filed',
  discovery: 'Discovery',
  mediation: 'Mediation / MSC',
  trial: 'Trial',
  resolved: 'Litigation resolved',
}

export function isLitigationStatus(value: unknown): value is LitigationStatus {
  return typeof value === 'string' && (LITIGATION_STATUSES as readonly string[]).includes(value)
}

/** Statuses that mean the case is actively in suit (checklist worth creating). */
const ACTIVE_LITIGATION = new Set<LitigationStatus>(['pre_suit', 'filed', 'discovery', 'mediation', 'trial'])

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

type Priority = 'low' | 'medium' | 'high'
interface LitTaskDef {
  title: string
  role: 'attorney' | 'paralegal'
  dueInDays: number
  priority: Priority
  notes?: string
}

const LITIGATION_CHECKLIST: LitTaskDef[] = [
  { title: 'Draft and file the complaint', role: 'attorney', dueInDays: 7, priority: 'high' },
  { title: 'Serve the defendant(s) and file proof of service', role: 'paralegal', dueInDays: 21, priority: 'high' },
  { title: 'Calendar responsive-pleading and discovery deadlines', role: 'paralegal', dueInDays: 3, priority: 'high' },
  { title: 'Propound written discovery (interrogatories, RFPs, RFAs)', role: 'attorney', dueInDays: 30, priority: 'medium' },
  { title: 'Schedule party and treating-provider depositions', role: 'attorney', dueInDays: 60, priority: 'medium' },
  { title: 'Disclose experts and exchange reports', role: 'attorney', dueInDays: 90, priority: 'medium' },
  { title: 'Prepare for mediation / mandatory settlement conference', role: 'attorney', dueInDays: 90, priority: 'medium' },
]

/**
 * Schedule a delivered reminder for a litigation deadline. Mirrors the
 * attorney-dashboard createCaseReminder idempotency (no second identical
 * still-pending row) and uses the "Litigation deadline:" prefix so the reminder
 * sweep classifies it as a high-priority litigation alert. Best-effort.
 */
async function scheduleLitigationReminder(assessmentId: string, title: string, dueDate: Date, reminderAt: Date) {
  if (reminderAt.getTime() < Date.now()) return
  const message = `Litigation deadline: ${title} due ${dueDate.toDateString()}.`
  try {
    const existing = await prisma.caseReminder.findFirst({
      where: { assessmentId, channel: 'email', message, status: 'scheduled' },
    })
    if (existing) return
    await prisma.caseReminder.create({
      data: { assessmentId, channel: 'email', message, dueAt: reminderAt, status: 'scheduled', deliveryStatus: 'pending' },
    })
  } catch (e: any) {
    logger.warn('Litigation reminder schedule failed', { assessmentId, title, error: e?.message })
  }
}

async function createLitigationTasks(
  assessmentId: string,
  opts?: { createdById?: string | null; createdByName?: string | null },
): Promise<number> {
  const existing = await prisma.caseTask
    .findMany({ where: { assessmentId }, select: { title: true } })
    .catch(() => [] as Array<{ title: string }>)
  const existingTitles = new Set(existing.map((t) => String(t.title || '').trim().toLowerCase()))

  const createdByName = opts?.createdByName ?? 'ClearCaseIQ'
  const now = new Date()
  let created = 0

  for (const def of LITIGATION_CHECKLIST) {
    const normalized = def.title.trim().toLowerCase()
    if (existingTitles.has(normalized)) continue
    const dueDate = addDays(now, def.dueInDays)
    const reminderAt = addDays(dueDate, -3)
    await prisma.caseTask
      .create({
        data: {
          assessmentId,
          title: def.title,
          taskType: 'milestone',
          milestoneType: LITIGATION_MILESTONE,
          dueDate,
          reminderAt,
          priority: def.priority,
          escalationLevel: def.priority === 'high' ? 'warning' : 'none',
          status: 'open',
          assignedRole: def.role,
          notes: def.notes || 'Auto-created litigation checklist item.',
          createdById: opts?.createdById || null,
          createdByName,
        },
      })
      .then(async () => {
        created += 1
        existingTitles.add(normalized)
        await scheduleLitigationReminder(assessmentId, def.title, dueDate, reminderAt)
      })
      .catch((e: any) => logger.warn('Litigation task create failed', { assessmentId, title: def.title, error: e?.message }))
  }

  if (created > 0) {
    logger.info('Created litigation tasks', { assessmentId, created })
    void recordCaseChange({
      assessmentId,
      source: 'system',
      action: 'litigation_tasks_created',
      entityType: 'task',
      summary: `Created ${created} litigation checklist item${created === 1 ? '' : 's'}`,
      actor: { type: 'system', label: 'ClearCaseIQ' },
    })
  }

  return created
}

/**
 * Set the litigation status for a case. On the first move into an active
 * litigation status, stamps `litigationFiledAt` (when 'filed') and materializes
 * the litigation checklist. Records a change-feed event. Never throws.
 */
export async function setLitigationStatus(
  assessmentId: string,
  status: LitigationStatus,
  opts?: { source?: 'attorney' | 'rose_ai' | 'system'; actorId?: string | null; actorName?: string | null },
): Promise<{ status: LitigationStatus; filedAt: Date | null; tasksCreated: number }> {
  const current = await prisma.assessment
    .findUnique({ where: { id: assessmentId }, select: { litigationStatus: true, litigationFiledAt: true } })
    .catch(() => null)

  const wasActive = ACTIVE_LITIGATION.has((current?.litigationStatus as LitigationStatus) || 'none')
  const nowActive = ACTIVE_LITIGATION.has(status)
  const filedAt =
    status === 'filed' && !current?.litigationFiledAt ? new Date() : (current?.litigationFiledAt ?? null)

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      litigationStatus: status,
      ...(status === 'filed' && !current?.litigationFiledAt ? { litigationFiledAt: filedAt } : {}),
    },
  })

  void recordCaseChange({
    assessmentId,
    source: opts?.source ?? 'attorney',
    action: 'litigation_status_changed',
    entityType: 'litigation',
    summary: `Litigation: ${LITIGATION_LABELS[status]}`,
    actor: { type: opts?.source === 'rose_ai' ? 'ai' : 'user', id: opts?.actorId ?? null, label: opts?.actorName ?? null },
  })

  // Materialize the litigation checklist the first time the case goes into suit.
  let tasksCreated = 0
  if (nowActive && !wasActive) {
    tasksCreated = await createLitigationTasks(assessmentId, {
      createdById: opts?.actorId ?? null,
      createdByName: opts?.actorName ?? 'ClearCaseIQ',
    }).catch(() => 0)
  }

  return { status, filedAt, tasksCreated }
}

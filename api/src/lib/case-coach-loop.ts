/**
 * AI Case Coach — the self-driving loop.
 *
 * `syncCaseCoachTasks` re-runs the deterministic Case Coach for one case and
 * auto-assigns its top next-best actions as tasks. It is safe to call
 * fire-and-forget on ANY "new info" event (document upload, answer saved, task
 * completed) so the loop advances without a human opening the Coach panel.
 *
 * Guarantees:
 *  - Idempotent + dismissal-safe: dedupes against ALL tasks (any status) by
 *    title, so a task the attorney completed or deleted is never recreated.
 *  - Retention-gated: no-ops for pre-retention (intake-only) cases so it never
 *    creates premature tasks on a lead no attorney is working.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { buildCaseCoach, type CaseCoachResult, type CoachPriority } from './case-coach'
import type { GapAction } from './case-intelligence'
import { deliverDirectNotification } from './platform-notifications'

const COACH_AUTO_TASK_LIMIT = 3
const COACH_AUTO_TASK_PRIORITIES: CoachPriority[] = ['critical', 'high']
// An attorney is actively working the case once they ACCEPT the introduction
// (Introduction.status is stored uppercase; accept lowercase defensively too).
const RETAINED_INTRO_STATUSES = ['ACCEPTED', 'accepted']
// Preference order when routing a task to a real person for each coach role.
const PARALEGAL_ROLE_PREFERENCE = ['paralegal', 'legal_assistant', 'case_manager', 'demand_writer']
const ATTORNEY_ROLE_PREFERENCE = ['attorney', 'firm_admin']

export interface CoachActor {
  id?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

/** Resolved people a coach task can be routed to for this specific case. */
export interface CaseAssignees {
  lawFirmId: string | null
  attorneyId: string | null
  attorneyName: string | null
  attorneyEmail: string | null
  attorneyUserId: string | null
  paralegalUserId: string | null
  paralegalName: string | null
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function coachActionRole(action?: GapAction): 'paralegal' | 'attorney' {
  const paralegalActions: GapAction[] = ['assign_paralegal', 'generate_doc_request']
  return action && paralegalActions.includes(action) ? 'paralegal' : 'attorney'
}

function coachTaskPriority(priority: CoachPriority): 'high' | 'medium' | 'low' {
  return priority === 'critical' || priority === 'high' ? 'high' : priority === 'low' ? 'low' : 'medium'
}

function coachTaskDueDate(priority: CoachPriority): Date {
  const days = priority === 'critical' ? 3 : priority === 'high' ? 7 : 14
  return addDays(new Date(), days)
}

async function writeCoachAudit(args: {
  userId?: string | null
  attorneyId?: string | null
  entityId: string
  metadata: Record<string, unknown>
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: args.userId || null,
        attorneyId: args.attorneyId || null,
        action: 'task_created',
        entityType: 'case_task',
        entityId: args.entityId,
        metadata: JSON.stringify(args.metadata),
      },
    })
  } catch (error: any) {
    logger.warn('Coach auto-task audit write failed', { entityId: args.entityId, error: error?.message })
  }
}

/** Whether an attorney is actively working this case (vs an intake-only lead). */
export async function isCaseRetained(assessmentId: string): Promise<boolean> {
  const intro = await prisma.introduction
    .findFirst({
      where: { assessmentId, status: { in: RETAINED_INTRO_STATUSES } },
      select: { id: true },
    })
    .catch(() => null)
  return !!intro
}

/**
 * Resolve real people to route coach tasks to: the accepting attorney and a
 * paralegal-type teammate from the same firm. Returns nulls when no person can
 * be resolved (caller falls back to role-only assignment).
 */
export async function resolveCaseAssignees(assessmentId: string): Promise<CaseAssignees> {
  const empty: CaseAssignees = {
    lawFirmId: null,
    attorneyId: null,
    attorneyName: null,
    attorneyEmail: null,
    attorneyUserId: null,
    paralegalUserId: null,
    paralegalName: null,
  }
  const intro = await prisma.introduction
    .findFirst({
      where: { assessmentId, status: { in: RETAINED_INTRO_STATUSES } },
      orderBy: { respondedAt: 'desc' },
      include: {
        attorney: { select: { id: true, name: true, email: true, lawFirmId: true, claimedByUserId: true } },
      },
    })
    .catch(() => null)

  const attorney = intro?.attorney
  if (!attorney) return empty

  let members: Array<{ userId: string | null; role: string; name: string }> = []
  if (attorney.lawFirmId) {
    const dir = await (prisma as any).firmMember
      .findMany({
        where: { lawFirmId: attorney.lawFirmId, status: { in: ['active', 'invited'] } },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      })
      .catch(() => [])
    members = (dir as any[]).map((m) => ({
      userId: m.userId as string | null,
      role: String(m.role || ''),
      name: [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ').trim() || m.user?.email || 'Member',
    }))
  }

  const pick = (roles: string[]) => {
    for (const r of roles) {
      const m = members.find((mm) => mm.role === r && mm.userId)
      if (m) return m
    }
    return null
  }
  const paralegal = pick(PARALEGAL_ROLE_PREFERENCE)
  const attorneyMember = pick(ATTORNEY_ROLE_PREFERENCE)

  return {
    lawFirmId: attorney.lawFirmId || null,
    attorneyId: attorney.id,
    attorneyName: attorney.name || attorneyMember?.name || null,
    attorneyEmail: attorney.email || null,
    attorneyUserId: attorney.claimedByUserId || attorneyMember?.userId || null,
    paralegalUserId: paralegal?.userId || null,
    paralegalName: paralegal?.name || null,
  }
}

/**
 * Auto-generate CaseTasks for the coach's top next-best actions. Mutates the
 * passed coach insights to flag which ones now have a task. Returns the count
 * of newly-created tasks.
 */
async function generateCoachTasks(params: {
  assessmentId: string
  coach: CaseCoachResult
  attorneyId?: string | null
  actor?: CoachActor | null
  trigger?: string
  assignees?: CaseAssignees | null
}): Promise<number> {
  const { assessmentId, coach, attorneyId, actor, trigger, assignees } = params
  const candidates = coach.insights
    .filter((i) => COACH_AUTO_TASK_PRIORITIES.includes(i.priority))
    .slice(0, COACH_AUTO_TASK_LIMIT)
  if (candidates.length === 0) return 0

  const existing = await prisma.caseTask
    .findMany({ where: { assessmentId }, select: { title: true } })
    .catch(() => [] as Array<{ title: string }>)
  const existingTitles = new Set(existing.map((t) => String(t.title || '').trim().toLowerCase()))

  const createdByName = actor
    ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email || null
    : null

  let created = 0
  for (const insight of candidates) {
    const title = insight.title.trim()
    if (!title) continue
    const normalized = title.toLowerCase()
    if (existingTitles.has(normalized)) {
      insight.autoTaskCreated = true
      continue
    }
    // Route to a real person when we can resolve one; fall back to role-only.
    const role = coachActionRole(insight.actions[0])
    const person =
      role === 'paralegal'
        ? { userId: assignees?.paralegalUserId || null, name: assignees?.paralegalName || null }
        : { userId: assignees?.attorneyUserId || null, name: assignees?.attorneyName || null }
    const record = await prisma.caseTask
      .create({
        data: {
          assessmentId,
          title,
          priority: coachTaskPriority(insight.priority),
          status: 'open',
          taskType: 'coach',
          assignedRole: role,
          assignedUserId: person.userId,
          assignedTo: person.name,
          dueDate: coachTaskDueDate(insight.priority),
          notes: `Auto-generated by AI Case Coach. ${insight.why}`,
          createdById: actor?.id || null,
          createdByName,
          escalationLevel: 'none',
        },
        select: { id: true },
      })
      .catch((e: any) => {
        logger.warn('Coach auto-task create failed', { assessmentId, title, error: e?.message })
        return null
      })
    if (!record) continue
    created += 1
    existingTitles.add(normalized)
    insight.autoTaskId = record.id
    insight.autoTaskCreated = true
    await writeCoachAudit({
      userId: actor?.id,
      attorneyId,
      entityId: record.id,
      metadata: {
        title,
        source: 'case_coach_auto',
        coachKey: insight.key,
        trigger: trigger || 'coach',
        assignedUserId: person.userId,
      },
    })
  }

  if (created > 0) {
    logger.info('Case coach auto-generated tasks', { assessmentId, created, trigger: trigger || 'coach' })
  }
  return created
}

/**
 * Auto-advance: when the coach reports the file is demand-ready (strong docs, no
 * critical gaps) fire a one-time notification to the attorney that the case can
 * move to the demand/settlement stage, and record a durable marker. It is
 * intentionally NON-destructive — it does not mutate Assessment.status (which
 * drives routing/analytics); it signals + notifies exactly once.
 */
async function announceDemandReadyOnce(
  assessmentId: string,
  coach: CaseCoachResult,
  assignees: CaseAssignees,
): Promise<boolean> {
  const isReady = coach.insights.some((i) => i.key === 'demand_ready')
  if (!isReady) return false

  const already = await prisma.auditLog
    .findFirst({ where: { entityType: 'assessment', entityId: assessmentId, action: 'case_demand_ready' } })
    .catch(() => null)
  if (already) return false

  if (assignees.attorneyEmail) {
    await deliverDirectNotification({
      type: 'email',
      recipient: assignees.attorneyEmail,
      subject: 'Case ready to move to demand',
      message:
        'This case now has strong documentation and no critical gaps remaining — it is ready to move to the demand/settlement stage. The demand-package task has been added to the board.',
      role: 'attorney',
      attorneyId: assignees.attorneyId || undefined,
      userId: assignees.attorneyUserId || undefined,
      assessmentId,
      metadata: { eventType: 'case.demand_ready' },
    }).catch((e: any) => logger.warn('Demand-ready notify failed', { assessmentId, error: e?.message }))
  }

  await prisma.auditLog
    .create({
      data: {
        attorneyId: assignees.attorneyId || null,
        action: 'case_demand_ready',
        entityType: 'assessment',
        entityId: assessmentId,
        metadata: JSON.stringify({ source: 'case_coach', headline: coach.headline }),
      },
    })
    .catch(() => undefined)

  logger.info('Case flagged demand-ready', { assessmentId })
  return true
}

/**
 * One loop iteration: rebuild the coach and auto-assign the next tasks. Returns
 * the (task-flagged) coach so callers can also render it. No-ops task creation
 * for non-retained cases unless `requireRetained: false` is passed.
 */
export async function syncCaseCoachTasks(
  assessmentId: string,
  opts?: {
    attorneyId?: string | null
    actor?: CoachActor | null
    trigger?: string
    requireRetained?: boolean
  }
): Promise<CaseCoachResult | null> {
  const coach = await buildCaseCoach(assessmentId)
  if (!coach) return null

  const requireRetained = opts?.requireRetained !== false
  const assignees = await resolveCaseAssignees(assessmentId)
  if (requireRetained && !assignees.attorneyId) {
    // Not retained yet (no accepting attorney) — never create premature tasks.
    return coach
  }

  await generateCoachTasks({
    assessmentId,
    coach,
    attorneyId: opts?.attorneyId || assignees.attorneyId,
    actor: opts?.actor,
    trigger: opts?.trigger,
    assignees,
  }).catch((e: any) => logger.warn('Coach task sync failed', { assessmentId, error: e?.message }))

  await announceDemandReadyOnce(assessmentId, coach, assignees).catch((e: any) =>
    logger.warn('Demand-ready announce failed', { assessmentId, error: e?.message }),
  )

  return coach
}

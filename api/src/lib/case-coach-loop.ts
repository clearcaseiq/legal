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
import { recordCaseChange } from './data-authority'
import { buildCaseCoach, type CaseCoachResult, type CoachPriority } from './case-coach'
import type { GapAction } from './case-intelligence'
import { deliverDirectNotification } from './platform-notifications'
import { isReviewGateEnabled, notifyDemandDraftReviewers, notifyTaskReviewers } from './task-review'
import { AI_AUTHOR_NAME } from './ai-author'
import { resolveTaskWorkKey, taskWorkAlreadyCovered, type TaskIdentitySource } from './task-identity'

const COACH_AUTO_TASK_LIMIT = 3
const COACH_AUTO_TASK_PRIORITIES: CoachPriority[] = ['critical', 'high']
// An attorney is actively working the case once they ACCEPT the introduction
// (Introduction.status is stored uppercase; accept lowercase defensively too).
const RETAINED_INTRO_STATUSES = ['ACCEPTED', 'accepted']
// Lead conversion states that mean an attorney is actively working the case —
// covers shared/marketplace ("acquired") leads that never get a formal
// assignment or ACCEPTED intro but are advanced past intake.
const ACTIVE_LEAD_STATUSES = ['contacted', 'consulted', 'retained']
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

/**
 * Whether an attorney is actively working this case (vs intake / marketplace review).
 *
 * Important: marketplace routing sets `LeadSubmission.assignedAttorneyId` when the
 * case is *offered* to an attorney — that alone is NOT retention. Treating it as
 * retained caused evidence uploads to advance `caseStage` to TREATMENT before any
 * attorney accepted (plaintiff status jumped Submitted → Treatment).
 *
 * Retained means: accepted introduction, OR lead status past intake
 * (contacted / consulted / retained).
 */
export async function isCaseRetained(assessmentId: string): Promise<boolean> {
  const intro = await prisma.introduction
    .findFirst({
      where: { assessmentId, status: { in: RETAINED_INTRO_STATUSES } },
      select: { id: true },
    })
    .catch(() => null)
  if (intro) return true
  // Acquired / shared leads the attorney has actually taken past marketplace review.
  const activeLead = await prisma.leadSubmission
    .findFirst({
      where: {
        assessmentId,
        status: { in: ACTIVE_LEAD_STATUSES },
      },
      select: { id: true },
    })
    .catch(() => null)
  return !!activeLead
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
  const attorneySelect = { id: true, name: true, email: true, lawFirmId: true, claimedByUserId: true } as const

  const intro = await prisma.introduction
    .findFirst({
      where: { assessmentId, status: { in: RETAINED_INTRO_STATUSES } },
      orderBy: { respondedAt: 'desc' },
      include: { attorney: { select: attorneySelect } },
    })
    .catch(() => null)

  // Fall back to the acquired/assigned attorney when there's no ACCEPTED intro.
  let attorney = intro?.attorney ?? null
  if (!attorney) {
    const submission = await prisma.leadSubmission
      .findFirst({
        where: { assessmentId, assignedAttorneyId: { not: null } },
        include: { assignedAttorney: { select: attorneySelect } },
      })
      .catch(() => null)
    attorney = submission?.assignedAttorney ?? null
  }
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
}): Promise<{ created: number; pending: string[] }> {
  const { assessmentId, coach, attorneyId, actor, trigger, assignees } = params
  const candidates = coach.insights
    .filter((i) => COACH_AUTO_TASK_PRIORITIES.includes(i.priority))
    .slice(0, COACH_AUTO_TASK_LIMIT)
  if (candidates.length === 0) return { created: 0, pending: [] }

  const existing = await prisma.caseTask
    .findMany({ where: { assessmentId }, select: { title: true, checkpointType: true, notes: true, taskType: true } })
    .catch(() => [] as Array<{ title: string; checkpointType: string | null; notes: string | null; taskType: string | null }>)
  const existingRows: TaskIdentitySource[] = existing.map((t) => ({
    title: t.title,
    checkpointType: t.checkpointType,
    notes: t.notes,
  }))

  const createdByName = actor
    ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email || null
    : null

  // Human-in-the-loop gate: while enabled, AI tasks are held unassigned as
  // 'pending' review until a case manager approves them.
  const gate = isReviewGateEnabled()
  const pending: string[] = []

  let created = 0
  for (const insight of candidates) {
    const title = insight.title.trim()
    if (!title) continue
    const workKey = resolveTaskWorkKey({ title, coachKey: insight.key })
    const candidate: TaskIdentitySource = { title, coachKey: insight.key, checkpointType: workKey }
    if (taskWorkAlreadyCovered(existingRows, candidate)) {
      insight.autoTaskCreated = true
      continue
    }
    // Route to a real person when we can resolve one; for shared/acquired leads
    // with no firm assignee, fall back to the acting attorney; else role-only.
    const role = coachActionRole(insight.actions[0])
    const person =
      role === 'paralegal'
        ? { userId: assignees?.paralegalUserId || null, name: assignees?.paralegalName || null }
        : { userId: assignees?.attorneyUserId || null, name: assignees?.attorneyName || null }
    if (!person.userId && actor?.id) {
      person.userId = actor.id
      person.name = createdByName
    }
    const record = await prisma.caseTask
      .create({
        data: {
          assessmentId,
          title,
          priority: coachTaskPriority(insight.priority),
          status: 'open',
          reviewStatus: gate ? 'pending' : null,
          taskType: 'coach',
          checkpointType: workKey,
          assignedRole: role,
          // Hold assignment until a reviewer approves; keep the intended person
          // (and creator) so the approve step can route it correctly.
          assignedUserId: gate ? null : person.userId,
          assignedTo: gate ? null : person.name,
          dueDate: coachTaskDueDate(insight.priority),
          notes: insight.why
            ? `Case Coach: ${insight.why}`
            : 'Case Coach suggestion.',
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
    existingRows.push(candidate)
    if (gate) pending.push(title)
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
        workKey,
        trigger: trigger || 'coach',
        assignedUserId: person.userId,
      },
    })
  }

  if (created > 0) {
    logger.info('Case coach auto-generated tasks', { assessmentId, created, trigger: trigger || 'coach' })
  }
  return { created, pending }
}

async function caseLabelFor(assessmentId: string): Promise<string | null> {
  const a = await prisma.assessment
    .findUnique({
      where: { id: assessmentId },
      select: { claimType: true, user: { select: { firstName: true, lastName: true } } },
    })
    .catch(() => null)
  if (!a) return null
  const name = [a.user?.firstName, a.user?.lastName].filter(Boolean).join(' ').trim()
  return name || a.claimType || null
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
        'This case now has strong documentation and no critical gaps remaining. It is ready to move to the demand/settlement stage. The demand-package task has been added to the board.',
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

/** Default ON. Set AI_DEMAND_AUTODRAFT to off/false/0 to stop drafting demands. */
export function isDemandAutodraftEnabled(): boolean {
  const v = String(process.env.AI_DEMAND_AUTODRAFT ?? '').trim().toLowerCase()
  return !(v === 'off' || v === 'false' || v === '0' || v === 'no')
}

/**
 * When a case reaches demand-ready, have Rose write the first draft so the
 * attorney opens a letter instead of a blank page.
 *
 * Drafts once and only once. The cheap `count` below just avoids a pointless
 * LLM call; the guarantee comes from the unique `autoDraftKey`, because this
 * function runs concurrently (per evidence upload, on case open, and on the
 * sweep) with an LLM round-trip in the middle, so a read-then-write check would
 * let several runs all see zero letters and all insert one. A losing race is a
 * no-op: no second letter, and no second review notification.
 *
 * It also never touches a case that already has a letter, so human work is
 * never overwritten and a deleted draft is never resurrected.
 *
 * The draft is held as `reviewStatus: pending` under the same gate as AI tasks,
 * so nothing Rose wrote can be finalized until a person has read it.
 */
async function autoDraftDemandOnce(
  assessmentId: string,
  coach: CaseCoachResult,
  assignees: CaseAssignees,
  actor?: CoachActor | null,
): Promise<boolean> {
  if (!isDemandAutodraftEnabled()) return false
  if (!coach.insights.some((i) => i.key === 'demand_ready')) return false

  const existing = await prisma.demandLetter.count({ where: { assessmentId } }).catch(() => 1)
  if (existing > 0) return false

  const { draftDemandForAssessment } = await import('./demand-drafting')
  const drafted = await draftDemandForAssessment({ assessmentId, useAi: true })
  if (!drafted) return false

  const gate = isReviewGateEnabled()
  try {
    await prisma.demandLetter.create({
      data: {
        assessmentId,
        autoDraftKey: assessmentId,
        targetAmount: drafted.targetAmount,
        recipient: JSON.stringify(drafted.recipient),
        content: drafted.content,
        status: 'DRAFT',
        origin: 'ai',
        contentSource: drafted.source,
        reviewStatus: gate ? 'pending' : null,
        createdByName: AI_AUTHOR_NAME,
        updatedByName: AI_AUTHOR_NAME,
        versions: {
          create: { version: 1, content: drafted.content, source: drafted.source, authorName: AI_AUTHOR_NAME },
        },
      },
    })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      logger.info('Demand auto-draft already claimed by a concurrent run', { assessmentId })
      return false
    }
    throw error
  }

  if (gate) {
    const caseLabel = await caseLabelFor(assessmentId)
    await notifyDemandDraftReviewers({
      assessmentId,
      lawFirmId: assignees.lawFirmId,
      caseLabel,
      actor,
    }).catch((e: any) => logger.warn('Demand draft reviewer notify failed', { assessmentId, error: e?.message }))
  }

  logger.info('Auto-drafted demand letter', { assessmentId, source: drafted.source, held: gate })

  void recordCaseChange({
    assessmentId,
    source: 'rose_ai',
    action: 'demand_generated',
    entityType: 'demand',
    summary: gate
      ? 'Rose auto-drafted a demand letter (held for review)'
      : 'Rose auto-drafted a demand letter',
    actor: { type: 'ai', label: AI_AUTHOR_NAME },
  })

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
  if (requireRetained && !(await isCaseRetained(assessmentId))) {
    // Not being worked yet (intake-only) — never create premature tasks.
    return coach
  }
  const assignees = await resolveCaseAssignees(assessmentId)
  const pendingTitles: string[] = []

  const coachTasks = await generateCoachTasks({
    assessmentId,
    coach,
    attorneyId: opts?.attorneyId || assignees.attorneyId,
    actor: opts?.actor,
    trigger: opts?.trigger,
    assignees,
  }).catch((e: any) => {
    logger.warn('Coach task sync failed', { assessmentId, error: e?.message })
    return { created: 0, pending: [] as string[] }
  })
  pendingTitles.push(...coachTasks.pending)

  await announceDemandReadyOnce(assessmentId, coach, assignees).catch((e: any) =>
    logger.warn('Demand-ready announce failed', { assessmentId, error: e?.message }),
  )

  await autoDraftDemandOnce(assessmentId, coach, assignees, opts?.actor).catch((e: any) =>
    logger.warn('Demand auto-draft failed', { assessmentId, error: e?.message }),
  )

  // Also (re)materialize baseline Intelligent Questions as tasks so they appear
  // in the Tasks queue proactively — no need to open the questions panel first.
  // Dynamic import avoids a static import cycle with question-tasks. Defer the
  // reviewer notification so coach + question tasks are announced together.
  try {
    const { syncBaselineQuestionTasks } = await import('./question-tasks')
    const qPending = await syncBaselineQuestionTasks(assessmentId, {
      actor: opts?.actor,
      requireRetained: false,
      deferNotify: true,
    })
    pendingTitles.push(...(qPending || []))
  } catch (e: any) {
    logger.warn('Question-task sync failed', { assessmentId, error: e?.message })
  }

  // One consolidated review notification per event when the gate is on and new
  // pending tasks were actually created (idempotent — re-runs create nothing).
  if (isReviewGateEnabled() && pendingTitles.length > 0) {
    const caseLabel = await caseLabelFor(assessmentId)
    await notifyTaskReviewers({
      assessmentId,
      lawFirmId: assignees.lawFirmId,
      taskTitles: pendingTitles,
      caseLabel,
      actor: opts?.actor,
    }).catch((e: any) => logger.warn('Reviewer notify failed', { assessmentId, error: e?.message }))
  }

  // Advance the case lifecycle stage from the new signals (monotonic,
  // retained-only). Dynamic import avoids a static cycle with case-stage.
  try {
    const { syncCaseStage } = await import('./case-stage')
    await syncCaseStage(assessmentId, { source: 'system' })
  } catch (e: any) {
    logger.warn('Case stage sync failed', { assessmentId, error: e?.message })
  }

  // Richer workflow patches when open gaps drift (debounced). Fail-safe.
  try {
    const { maybeReadaptWorkflowOnGapChange } = await import('./workflow-adapt')
    await maybeReadaptWorkflowOnGapChange({
      assessmentId,
      trigger: opts?.trigger || 'coach_sync',
    })
  } catch (e: any) {
    logger.warn('Workflow gap-change adapt failed', { assessmentId, error: e?.message })
  }

  return coach
}

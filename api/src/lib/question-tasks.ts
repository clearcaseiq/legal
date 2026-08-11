/**
 * Materialize Intelligent Questions into a trackable CaseTask so they show up in
 * the cross-case Tasks queue as work assigned to a real teammate.
 *
 * Shape: all of a case's questions live on ONE task ("Questions for the
 * plaintiff") as a subtask checklist, rather than a task per question. A dozen
 * near-identical "Answer: …" rows buried every other task in the queue, and the
 * questions are one conversation with the plaintiff, not a dozen errands.
 *
 * Scope: baseline (`base:<id>`) and AI (`ai:<hash>`) questions are both
 * materialized onto the grouped task. AI keys are a hash of normalized text, so
 * the same wording maps to the same checklist id across regenerations.
 *
 * Linking: there is no dedicated column, so the group task is found by a
 * sentinel in `sourceTemplateStepId` (question tasks never originate from a
 * workflow template, so there is no collision), and each checklist item carries
 * its question's stable key as the subtask id. That keeps the sync idempotent
 * and lets a saved answer tick off exactly one item.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { isCaseRetained, resolveCaseAssignees } from './case-coach-loop'
import { buildCaseIntelligence } from './case-intelligence'
import { buildBaselineQuestions } from './intake-questions'
import { isReviewGateEnabled, notifyTaskReviewers } from './task-review'

export const QUESTION_TASK_TYPE = 'question'
/** Sentinel in `sourceTemplateStepId` identifying the one grouped question task. */
export const QUESTION_GROUP_KEY = 'base:__plaintiff_questions__'
/** Defensive bound so the serialized checklist can't grow without limit. */
const MAX_QUESTION_SUBTASKS = 25

const QUESTION_TASK_NOTES =
  'Work through these with the plaintiff and record a response for each question in this task. Items tick off as answers are saved.'

export interface QuestionForTask {
  questionKey: string
  text: string
  section?: string | null
  source?: 'ai' | 'baseline' | string | null
  answer?: string | null
}

interface QuestionSubtask {
  id: string
  title: string
  done: boolean
}

/**
 * The count rides in the title because the cross-case queue and the mobile task
 * list render titles only — without it a grouped task gives no sense of how much
 * is left.
 */
function questionGroupTitle(answered: number, total: number): string {
  return `Questions for the plaintiff (${answered} of ${total} answered)`
}

/**
 * Baseline (`base:…`) and AI (`ai:<hash>`) questions both use stable keys, so
 * both are safe to materialize. AI keys are a hash of normalized text and do
 * not churn across regenerations of the same wording.
 */
function isMaterializable(q: QuestionForTask): boolean {
  if (!q.questionKey) return false
  if (q.source === 'baseline' && q.questionKey.startsWith('base:')) return true
  if (q.source === 'ai' && q.questionKey.startsWith('ai:')) return true
  // Accept either prefix when source is missing (legacy callers).
  return q.questionKey.startsWith('base:') || q.questionKey.startsWith('ai:')
}

/** Read the JSON-stored checklist column; mirrors `parseSubtasks` in the routes. */
function parseSubtasks(value: unknown): QuestionSubtask[] {
  if (typeof value !== 'string' || !value) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((s: any) => s && typeof s.id === 'string' && s.id && typeof s.title === 'string')
      .map((s: any) => ({ id: s.id as string, title: String(s.title), done: Boolean(s.done) }))
  } catch {
    return []
  }
}

/**
 * Retire the previous one-task-per-question rows now that the questions live on
 * a single grouped task. The rows carry nothing of their own — answers live in
 * CaseQuestionAnswer — but `caseTaskId` on time entries and comment threads is a
 * bare string with no cascade, so anything already referenced is completed
 * rather than deleted, to avoid stranding that work against a missing task.
 */
async function retireLegacyQuestionTasks(
  assessmentId: string,
  legacy: Array<{ id: string; status: string }>,
): Promise<void> {
  if (legacy.length === 0) return
  const ids = legacy.map((t) => t.id)

  const [timed, threaded] = await Promise.all([
    prisma.timeEntry
      .findMany({ where: { caseTaskId: { in: ids } } as any, select: { caseTaskId: true } as any })
      .catch(() => [] as Array<{ caseTaskId: string | null }>),
    prisma.caseCommentThread
      .findMany({ where: { caseTaskId: { in: ids } }, select: { caseTaskId: true } })
      .catch(() => [] as Array<{ caseTaskId: string | null }>),
  ])
  const referenced = new Set(
    [...(timed as Array<{ caseTaskId: string | null }>), ...threaded]
      .map((r) => r.caseTaskId)
      .filter((id): id is string => !!id),
  )

  const removable = ids.filter((id) => !referenced.has(id))
  if (removable.length > 0) {
    await prisma.caseTask
      .deleteMany({ where: { id: { in: removable } } })
      .catch((e: any) => logger.warn('Legacy question task delete failed', { assessmentId, error: e?.message }))
  }

  const keep = legacy.filter((t) => referenced.has(t.id) && t.status !== 'done' && t.status !== 'completed')
  if (keep.length > 0) {
    await prisma.caseTask
      .updateMany({
        where: { id: { in: keep.map((t) => t.id) } },
        data: { status: 'done', completedAt: new Date() },
      })
      .catch((e: any) => logger.warn('Legacy question task close failed', { assessmentId, error: e?.message }))
  }

  logger.info('Retired legacy per-question tasks', {
    assessmentId,
    deleted: removable.length,
    closed: keep.length,
  })
}

/**
 * Sync the grouped question task for one case: keep a single "Questions for the
 * plaintiff" task whose checklist mirrors the current baseline questions, ticked
 * off as answers land. Rebuilding the checklist every run is also what retires
 * questions that no longer apply — a gap closing used to strand its task open
 * forever, because nothing ever revisited rows the question set had dropped.
 *
 * Idempotent + retention-gated (no tasks before an attorney accepts).
 */
export async function syncQuestionTasks(
  assessmentId: string,
  questions: QuestionForTask[],
  opts?: {
    actor?: { id?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null } | null
    requireRetained?: boolean
    /** When true, don't send the reviewer notification here (caller aggregates). */
    deferNotify?: boolean
  },
): Promise<string[]> {
  const materializable = (questions || []).filter(isMaterializable).slice(0, MAX_QUESTION_SUBTASKS)
  if (materializable.length === 0) return []

  const requireRetained = opts?.requireRetained !== false
  if (requireRetained && !(await isCaseRetained(assessmentId))) return []

  const existing = await prisma.caseTask
    .findMany({
      where: { assessmentId, taskType: QUESTION_TASK_TYPE },
      select: { id: true, sourceTemplateStepId: true, status: true, subtasks: true },
    })
    .catch(() => [] as Array<{ id: string; sourceTemplateStepId: string | null; status: string; subtasks: string | null }>)

  const group = existing.find((t) => t.sourceTemplateStepId === QUESTION_GROUP_KEY) || null
  await retireLegacyQuestionTasks(
    assessmentId,
    existing.filter((t) => t.id !== group?.id),
  )

  // A ticked item stays ticked. Saving an answer ticks it, and so does someone
  // checking it off by hand after asking the plaintiff directly; only an
  // explicitly cleared answer un-ticks it, via syncSingleQuestionTask.
  const prior = parseSubtasks(group?.subtasks)
  const alreadyDone = new Set(prior.filter((s) => s.done).map((s) => s.id))

  const subtasks: QuestionSubtask[] = materializable.map((q) => ({
    id: q.questionKey,
    title: String(q.text || '').trim(),
    done: !!(q.answer && String(q.answer).trim()) || alreadyDone.has(q.questionKey),
  }))
  // Preserve checklist items the incoming set omitted:
  // - answered orphans (gap closed / prune) so recorded responses stay visible
  // - AI items when a baseline-only sync (coach loop) would otherwise wipe them
  const liveIds = new Set(subtasks.map((s) => s.id))
  for (const s of prior) {
    if (liveIds.has(s.id)) continue
    if (s.done || s.id.startsWith('ai:')) {
      subtasks.push(s)
      liveIds.add(s.id)
    }
  }
  if (subtasks.length > MAX_QUESTION_SUBTASKS) subtasks.length = MAX_QUESTION_SUBTASKS
  const total = subtasks.length
  const answered = subtasks.filter((s) => s.done).length
  const allAnswered = answered === total && total > 0
  const title = questionGroupTitle(answered, total)

  if (group) {
    const isDone = group.status === 'done' || group.status === 'completed'
    const nextSubtasks = JSON.stringify(subtasks)
    const statusChange =
      allAnswered && !isDone
        ? { status: 'done', completedAt: new Date() }
        : !allAnswered && isDone
          ? { status: 'open', completedAt: null }
          : null

    // The coach loop re-runs this on every document upload, answer and case
    // view, so skip the write (and the log line) when nothing actually moved.
    if (!statusChange && nextSubtasks === (group.subtasks ?? null)) return []

    await prisma.caseTask
      .update({
        where: { id: group.id },
        data: { title, notes: QUESTION_TASK_NOTES, subtasks: nextSubtasks, ...(statusChange || {}) },
      })
      .catch((e: any) => logger.warn('Question task update failed', { assessmentId, error: e?.message }))
    logger.info('Synced Intelligent Question task', { assessmentId, total, answered })
    // An existing task was already announced when it was created; questions
    // added to its checklist later are deterministic baseline ones, so they do
    // not send the case manager back through review a second time.
    return []
  }

  const assignees = await resolveCaseAssignees(assessmentId).catch(() => null)
  const createdByName = opts?.actor
    ? `${opts.actor.firstName || ''} ${opts.actor.lastName || ''}`.trim() || opts.actor.email || null
    : null

  // Prefer a firm paralegal, then the case attorney; for shared/acquired leads
  // with no firm assignee, fall back to the acting attorney.
  let assignedUserId = assignees?.paralegalUserId || assignees?.attorneyUserId || null
  let assignedTo = assignees?.paralegalName || assignees?.attorneyName || null
  const assignedRole = assignees?.paralegalUserId ? 'paralegal' : 'attorney'
  if (!assignedUserId && opts?.actor?.id) {
    assignedUserId = opts.actor.id
    assignedTo = createdByName
  }

  // Human-in-the-loop gate: hold the new question task unassigned as 'pending'
  // review until a case manager approves it.
  const gate = isReviewGateEnabled()

  const createdTask = await prisma.caseTask
    .create({
      data: {
        assessmentId,
        title,
        taskType: QUESTION_TASK_TYPE,
        status: allAnswered ? 'done' : 'open',
        completedAt: allAnswered ? new Date() : null,
        reviewStatus: gate ? 'pending' : null,
        priority: 'medium',
        assignedRole,
        assignedUserId: gate ? null : assignedUserId,
        assignedTo: gate ? null : assignedTo,
        sourceTemplateStepId: QUESTION_GROUP_KEY,
        subtasks: JSON.stringify(subtasks),
        notes: QUESTION_TASK_NOTES,
        createdById: opts?.actor?.id || null,
        createdByName,
        escalationLevel: 'none',
      },
    })
    .catch((e: any) => {
      logger.warn('Question task create failed', { assessmentId, error: e?.message })
      return null
    })
  if (!createdTask) return []

  logger.info('Created Intelligent Question task', { assessmentId, total, answered })

  const pending = gate && !allAnswered ? [title] : []

  // Announce to reviewers unless the caller is aggregating (coach loop).
  if (pending.length > 0 && !opts?.deferNotify) {
    const label = await caseLabelFor(assessmentId)
    await notifyTaskReviewers({
      assessmentId,
      lawFirmId: assignees?.lawFirmId ?? null,
      taskTitles: pending,
      caseLabel: label,
      actor: opts?.actor,
    }).catch((e: any) => logger.warn('Reviewer notify failed', { assessmentId, error: e?.message }))
  }

  return pending
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
 * Proactively materialize baseline question tasks for a case WITHOUT needing the
 * Intelligent Questions panel to be opened. Rebuilds the deterministic baseline
 * from case intelligence, merges in any saved answers, then syncs. Safe to call
 * fire-and-forget from the event loop (doc upload, answer saved, task done).
 */
export async function syncBaselineQuestionTasks(
  assessmentId: string,
  opts?: {
    actor?: { id?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null } | null
    requireRetained?: boolean
    deferNotify?: boolean
  },
): Promise<string[]> {
  const intel = await buildCaseIntelligence(assessmentId).catch(() => null)
  if (!intel) return []
  const baseline = buildBaselineQuestions(intel)
  if (baseline.length === 0) return []

  const saved = await prisma.caseQuestionAnswer
    .findMany({ where: { assessmentId }, select: { questionKey: true, answer: true } })
    .catch(() => [] as Array<{ questionKey: string; answer: string | null }>)
  const answerByKey = new Map(saved.map((a) => [a.questionKey, a.answer]))

  const questions: QuestionForTask[] = baseline.map((q) => {
    // Mirror intelligentQuestionKey() for baseline questions exactly so the task
    // created here is the same one the questions panel completes on answer.
    const questionKey = `base:${q.id}`
    return { questionKey, text: q.text, section: q.section, source: 'baseline', answer: answerByKey.get(questionKey) ?? null }
  })

  return syncQuestionTasks(assessmentId, questions, opts)
}

/**
 * Tick (or un-tick) one checklist item on the grouped task in response to a
 * single answer being saved or cleared, without rebuilding case intelligence.
 * The task itself closes only once every question is answered.
 */
export async function syncSingleQuestionTask(
  assessmentId: string,
  questionKey: string,
  answered: boolean,
): Promise<void> {
  if (!questionKey.startsWith('base:') && !questionKey.startsWith('ai:')) return
  const task = await prisma.caseTask
    .findFirst({
      where: { assessmentId, taskType: QUESTION_TASK_TYPE, sourceTemplateStepId: QUESTION_GROUP_KEY },
      select: { id: true, status: true, subtasks: true },
    })
    .catch(() => null)
  if (!task) return

  const subtasks = parseSubtasks(task.subtasks)
  const item = subtasks.find((s) => s.id === questionKey)
  if (!item || item.done === answered) return
  item.done = answered

  const total = subtasks.length
  const doneCount = subtasks.filter((s) => s.done).length
  const allAnswered = total > 0 && doneCount === total
  const isDone = task.status === 'done' || task.status === 'completed'

  await prisma.caseTask
    .update({
      where: { id: task.id },
      data: {
        subtasks: JSON.stringify(subtasks),
        title: questionGroupTitle(doneCount, total),
        ...(allAnswered && !isDone ? { status: 'done', completedAt: new Date() } : {}),
        ...(!allAnswered && isDone ? { status: 'open', completedAt: null } : {}),
      },
    })
    .catch((e: any) => logger.warn('Question subtask sync failed', { assessmentId, questionKey, error: e?.message }))
}

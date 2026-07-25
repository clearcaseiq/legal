/**
 * Materialize Intelligent Questions into trackable CaseTasks so they show up in
 * the cross-case Tasks queue as work assigned to a real teammate.
 *
 * Scope: only the DETERMINISTIC baseline questions (stable `base:<id>` keys) are
 * materialized. The AI-personalized questions are re-generated live on every
 * panel view (no cache, temperature > 0) so their keys churn — materializing
 * them would spawn duplicate tasks on each view. They stay in the panel only.
 *
 * Linking: there is no dedicated column, so the stable questionKey is stored in
 * `sourceTemplateStepId` (question tasks never originate from a workflow
 * template, so there is no collision). This makes create/complete idempotent.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { isCaseRetained, resolveCaseAssignees } from './case-coach-loop'
import { buildCaseIntelligence } from './case-intelligence'
import { buildBaselineQuestions } from './intake-questions'
import { isReviewGateEnabled, notifyTaskReviewers } from './task-review'

export const QUESTION_TASK_TYPE = 'question'
const MAX_QUESTION_TASKS = 12

export interface QuestionForTask {
  questionKey: string
  text: string
  section?: string | null
  source?: 'ai' | 'baseline' | string | null
  answer?: string | null
}

function questionTaskTitle(text: string): string {
  const t = String(text || '').trim()
  const short = t.length > 90 ? `${t.slice(0, 87)}…` : t
  return `Answer: ${short}`
}

/** Only baseline questions have stable keys safe to materialize as tasks. */
function isMaterializable(q: QuestionForTask): boolean {
  return q.source === 'baseline' && !!q.questionKey && q.questionKey.startsWith('base:')
}

/**
 * Sync question-backed tasks for one case: create an open task for each
 * unanswered baseline question and mark the task done once the question is
 * answered. Idempotent + retention-gated (no tasks before an attorney accepts).
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
  const materializable = (questions || []).filter(isMaterializable).slice(0, MAX_QUESTION_TASKS)
  if (materializable.length === 0) return []

  const requireRetained = opts?.requireRetained !== false
  if (requireRetained && !(await isCaseRetained(assessmentId))) return []

  const existing = await prisma.caseTask
    .findMany({
      where: { assessmentId, taskType: QUESTION_TASK_TYPE },
      select: { id: true, sourceTemplateStepId: true, status: true },
    })
    .catch(() => [] as Array<{ id: string; sourceTemplateStepId: string | null; status: string }>)
  const byKey = new Map(existing.filter((e) => e.sourceTemplateStepId).map((e) => [e.sourceTemplateStepId as string, e]))

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

  // Human-in-the-loop gate: hold new question tasks unassigned as 'pending'
  // review until a case manager approves them.
  const gate = isReviewGateEnabled()
  const pending: string[] = []

  let created = 0
  let completed = 0
  for (const q of materializable) {
    const key = q.questionKey
    const answered = !!(q.answer && String(q.answer).trim())
    const task = byKey.get(key)

    if (answered) {
      if (task && task.status !== 'done' && task.status !== 'completed') {
        await prisma.caseTask
          .update({ where: { id: task.id }, data: { status: 'done', completedAt: new Date() } })
          .catch(() => undefined)
        completed += 1
      }
      continue
    }

    // Unanswered: reopen a previously-completed task, else create one.
    if (task) {
      if (task.status === 'done' || task.status === 'completed') {
        await prisma.caseTask
          .update({ where: { id: task.id }, data: { status: 'open', completedAt: null } })
          .catch(() => undefined)
      }
      continue
    }

    const qTitle = questionTaskTitle(q.text)
    await prisma.caseTask
      .create({
        data: {
          assessmentId,
          title: qTitle,
          taskType: QUESTION_TASK_TYPE,
          status: 'open',
          reviewStatus: gate ? 'pending' : null,
          priority: 'medium',
          assignedRole,
          assignedUserId: gate ? null : assignedUserId,
          assignedTo: gate ? null : assignedTo,
          sourceTemplateStepId: key,
          notes: `Intelligent Question${q.section ? ` (${q.section})` : ''}. Capture the answer in the case's Intelligent Questions panel.`,
          createdById: opts?.actor?.id || null,
          createdByName,
          escalationLevel: 'none',
        },
      })
      .catch((e: any) => logger.warn('Question task create failed', { assessmentId, key, error: e?.message }))
    created += 1
    if (gate) pending.push(qTitle)
  }

  if (created > 0 || completed > 0) {
    logger.info('Synced Intelligent Question tasks', { assessmentId, created, completed })
  }

  // Announce to reviewers unless the caller is aggregating (coach loop).
  if (gate && pending.length > 0 && !opts?.deferNotify) {
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

/** Complete/reopen the single question-task behind a stable questionKey. */
export async function syncSingleQuestionTask(
  assessmentId: string,
  questionKey: string,
  answered: boolean,
): Promise<void> {
  if (!questionKey.startsWith('base:')) return
  const task = await prisma.caseTask
    .findFirst({
      where: { assessmentId, taskType: QUESTION_TASK_TYPE, sourceTemplateStepId: questionKey },
      select: { id: true, status: true },
    })
    .catch(() => null)
  if (!task) return
  const isDone = task.status === 'done' || task.status === 'completed'
  if (answered && !isDone) {
    await prisma.caseTask.update({ where: { id: task.id }, data: { status: 'done', completedAt: new Date() } }).catch(() => undefined)
  } else if (!answered && isDone) {
    await prisma.caseTask.update({ where: { id: task.id }, data: { status: 'open', completedAt: null } }).catch(() => undefined)
  }
}

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
  opts?: { actor?: { id?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null } | null; requireRetained?: boolean },
): Promise<void> {
  const materializable = (questions || []).filter(isMaterializable).slice(0, MAX_QUESTION_TASKS)
  if (materializable.length === 0) return

  const requireRetained = opts?.requireRetained !== false
  if (requireRetained && !(await isCaseRetained(assessmentId))) return

  const existing = await prisma.caseTask
    .findMany({
      where: { assessmentId, taskType: QUESTION_TASK_TYPE },
      select: { id: true, sourceTemplateStepId: true, status: true },
    })
    .catch(() => [] as Array<{ id: string; sourceTemplateStepId: string | null; status: string }>)
  const byKey = new Map(existing.filter((e) => e.sourceTemplateStepId).map((e) => [e.sourceTemplateStepId as string, e]))

  const assignees = await resolveCaseAssignees(assessmentId).catch(() => null)
  const assignedUserId = assignees?.paralegalUserId || assignees?.attorneyUserId || null
  const assignedTo = assignees?.paralegalName || assignees?.attorneyName || null
  const assignedRole = assignees?.paralegalUserId ? 'paralegal' : 'attorney'

  const createdByName = opts?.actor
    ? `${opts.actor.firstName || ''} ${opts.actor.lastName || ''}`.trim() || opts.actor.email || null
    : null

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

    await prisma.caseTask
      .create({
        data: {
          assessmentId,
          title: questionTaskTitle(q.text),
          taskType: QUESTION_TASK_TYPE,
          status: 'open',
          priority: 'medium',
          assignedRole,
          assignedUserId,
          assignedTo,
          sourceTemplateStepId: key,
          notes: `Intelligent Question${q.section ? ` (${q.section})` : ''}. Capture the answer in the case's Intelligent Questions panel.`,
          createdById: opts?.actor?.id || null,
          createdByName,
          escalationLevel: 'none',
        },
      })
      .catch((e: any) => logger.warn('Question task create failed', { assessmentId, key, error: e?.message }))
    created += 1
  }

  if (created > 0 || completed > 0) {
    logger.info('Synced Intelligent Question tasks', { assessmentId, created, completed })
  }
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

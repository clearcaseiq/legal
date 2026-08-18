import type { CaseTaskRow, TaskStageUnlock, TaskSubtask, TaskSummaryItem } from './api'

/** Statuses the tasks list treats as closed; mirrors the server's summary query. */
const CLOSED_STATUSES = new Set(['completed', 'done'])

export function isTaskDone(status?: string | null): boolean {
  return CLOSED_STATUSES.has(String(status || '').toLowerCase())
}

export function subtaskProgress(subtasks?: TaskSubtask[] | null) {
  const list = subtasks ?? []
  const done = list.filter((s) => s.done).length
  return { done, total: list.length, remaining: list.length - done }
}

/**
 * Flip one checklist item. Returns a new array so the caller can send the whole
 * list back — the server replaces `subtasks` wholesale rather than patching a
 * single entry.
 */
export function toggleSubtaskDone(subtasks: TaskSubtask[] | undefined, subtaskId: string): TaskSubtask[] {
  return (subtasks ?? []).map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s))
}

/**
 * Message for the case where ticking off a task opened the next workflow stage
 * and wrote new tasks. Without this the list silently grows and looks like a bug.
 */
export function describeStageUnlock(unlock?: TaskStageUnlock | null): string | null {
  if (!unlock || unlock.newTasks <= 0) return null
  return unlock.newTasks === 1
    ? 'That finished the stage. 1 new task was added.'
    : `That finished the stage. ${unlock.newTasks} new tasks were added.`
}

/**
 * Task types only the autonomous AI loop writes. Everything a person creates —
 * including the one-click "act on this suggestion" buttons on web — is written
 * as 'general', so these two are a reliable "Rose raised this herself" signal.
 */
export function isAiTask(taskType?: string | null): boolean {
  return taskType === 'coach' || taskType === 'question'
}

/**
 * Time entries are logged against a case as tasks but are not work items, so
 * they stay out of the tasks list exactly as the summary endpoint excludes them.
 */
export function isOpenCaseTask(task: Pick<CaseTaskRow, 'status' | 'taskType'>): boolean {
  if (String(task.taskType || '') === 'time_entry') return false
  return !isTaskDone(task.status)
}

export type TaskBuckets = {
  overdue: TaskSummaryItem[]
  today: TaskSummaryItem[]
  upcoming: TaskSummaryItem[]
  noDueDate: TaskSummaryItem[]
}

/**
 * Split one case's tasks into the same buckets the cross-case summary endpoint
 * returns, so a case-scoped list reads identically to the global one. Day
 * boundaries follow the local calendar day, matching how the server buckets.
 */
export function bucketCaseTasks(
  rows: CaseTaskRow[],
  leadId: string,
  now: Date = new Date()
): TaskBuckets {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const todayEnd = todayStart + 24 * 60 * 60 * 1000

  const buckets: TaskBuckets = { overdue: [], today: [], upcoming: [], noDueDate: [] }

  for (const row of rows) {
    if (!isOpenCaseTask(row)) continue

    const item: TaskSummaryItem = {
      id: row.id,
      title: row.title,
      dueDate: row.dueDate ?? null,
      status: row.status,
      priority: row.priority,
      taskType: row.taskType,
      assessmentId: row.assessmentId,
      leadId,
      subtasks: row.subtasks,
    }

    const due = row.dueDate ? new Date(row.dueDate).getTime() : NaN
    if (!Number.isFinite(due)) {
      buckets.noDueDate.push(item)
    } else if (due < todayStart) {
      buckets.overdue.push(item)
    } else if (due < todayEnd) {
      buckets.today.push(item)
    } else {
      buckets.upcoming.push(item)
    }
  }

  return buckets
}

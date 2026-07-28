import type { CaseTaskRow, TaskSummaryItem } from './api'

/** Statuses the tasks list treats as closed; mirrors the server's summary query. */
const CLOSED_STATUSES = new Set(['completed', 'done'])

/**
 * Time entries are logged against a case as tasks but are not work items, so
 * they stay out of the tasks list exactly as the summary endpoint excludes them.
 */
export function isOpenCaseTask(task: Pick<CaseTaskRow, 'status' | 'taskType'>): boolean {
  if (String(task.taskType || '') === 'time_entry') return false
  return !CLOSED_STATUSES.has(String(task.status || '').toLowerCase())
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

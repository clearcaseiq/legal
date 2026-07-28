/**
 * Folding several overlapping case tasks into one.
 *
 * Duplicates accumulate for ordinary reasons: Rose raises "Obtain the police
 * report" while a paralegal has already written "Get police report by hand", a
 * workflow template is applied twice, or two people add the same follow-up. This
 * merges them into one surviving task without losing the work hanging off the
 * others.
 *
 * Three constraints shape the design, and all three are non-obvious:
 *
 *   1. Absorbed tasks are CLOSED, never deleted. The AI loops dedupe on
 *      lowercased title across every status, so a deleted coach task reappears on
 *      the next sweep and quietly undoes the merge.
 *   2. The survivor keeps its title. Renaming it frees up its own title for the
 *      coach to recreate, which is the same trap by another route.
 *   3. Nothing references CaseTask by foreign key, so logged time and comment
 *      threads have to be repointed by hand or they are stranded against a task
 *      that no longer appears anywhere.
 *
 * This module holds the pure decisions — what may merge, and what the survivor
 * should look like afterwards — so they can be tested without a database. The
 * route performs the writes.
 */

/** Rank for picking the survivor's priority; lower is more urgent. */
const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

function priorityRank(priority?: string | null): number {
  const rank = PRIORITY_RANK[String(priority || '').toLowerCase()]
  return rank === undefined ? PRIORITY_RANK.medium! : rank
}

export interface MergeableTask {
  id: string
  assessmentId: string
  title: string
  taskType: string
  status: string
  priority: string
  dueDate: Date | null
  notes: string | null
  estimateMinutes: number | null
  subtasks: Array<{ id: string; title: string; done: boolean }>
  mergedIntoId?: string | null
}

export type MergeRefusal = { code: string; message: string }

/**
 * Why a task cannot take part in a merge, or null if it can.
 *
 * The question task is excluded outright rather than merely protected as a
 * survivor: `syncQuestionTasks` rewrites its title, notes and subtasks on every
 * run and flips it back to open whenever a question is unanswered, so anything
 * merged into it is overwritten and anything merged out of it comes back.
 */
export function taskMergeRefusal(task: MergeableTask): MergeRefusal | null {
  if (task.taskType === 'question') {
    return {
      code: 'question_task',
      message: 'The plaintiff questions task is maintained automatically and cannot be merged.',
    }
  }
  if (task.mergedIntoId) {
    return { code: 'already_merged', message: 'That task has already been merged into another task.' }
  }
  return null
}

/** Whether a task is finished, tolerating both spellings used in the data. */
export function isClosed(status: string): boolean {
  return status === 'done' || status === 'completed'
}

/**
 * Validate a merge request. Returns the refusal to send back, or null to proceed.
 *
 * `absorbed` is every task being folded in; `survivor` is the one that remains.
 */
export function validateMerge(survivor: MergeableTask, absorbed: MergeableTask[]): MergeRefusal | null {
  if (absorbed.length === 0) {
    return { code: 'nothing_to_merge', message: 'Select at least one other task to merge in.' }
  }
  if (absorbed.some((t) => t.id === survivor.id)) {
    return { code: 'survivor_in_absorbed', message: 'A task cannot be merged into itself.' }
  }
  // Merging open work into a finished task would hide it: the survivor stays in
  // the completed list and nobody sees what was folded in.
  if (isClosed(survivor.status)) {
    return { code: 'survivor_closed', message: 'Pick a task that is still open to merge the others into.' }
  }
  // Cross-case merges are blocked here as well as in the route, because the
  // cross-case queue interleaves clients and an accidental selection is easy.
  if (absorbed.some((t) => t.assessmentId !== survivor.assessmentId)) {
    return { code: 'cross_case', message: 'Tasks from different cases cannot be merged.' }
  }
  for (const task of [survivor, ...absorbed]) {
    const refusal = taskMergeRefusal(task)
    if (refusal) return refusal
  }
  return null
}

/**
 * Combine checklists, keeping the survivor's items first and in order.
 *
 * Deduplicated on both id and normalized title. Ids matter because question
 * subtask ids are semantic (they are the question's key) and template-derived
 * tasks can share generated ids; titles matter because the same checklist item
 * typed into two tasks is the very duplication being cleaned up. A ticked item
 * wins over an unticked one so completed work is never resurrected.
 */
export function mergeSubtasks(
  survivor: MergeableTask,
  absorbed: MergeableTask[],
): Array<{ id: string; title: string; done: boolean }> {
  const byKey = new Map<string, { id: string; title: string; done: boolean }>()
  const order: string[] = []

  for (const task of [survivor, ...absorbed]) {
    for (const item of task.subtasks) {
      const key = item.title.trim().toLowerCase()
      if (!key) continue
      const existing = byKey.get(key)
      if (existing) {
        if (item.done) existing.done = true
        continue
      }
      byKey.set(key, { ...item })
      order.push(key)
    }
  }

  const seenIds = new Set<string>()
  return order.map((key) => {
    const item = byKey.get(key)!
    // Two tasks can carry the same subtask id with different titles; keep the
    // title (the thing a human reads) and let the duplicate id go.
    if (seenIds.has(item.id)) return { ...item, id: '' }
    seenIds.add(item.id)
    return item
  })
}

/**
 * Notes for the survivor: its own, then each absorbed task's title and notes.
 *
 * The titles are recorded deliberately. Absorbed rows are hidden from task
 * lists, so without this the only trace of what was folded in would be the audit
 * log.
 */
export function mergeNotes(survivor: MergeableTask, absorbed: MergeableTask[]): string | null {
  const sections: string[] = []
  const own = (survivor.notes || '').trim()
  if (own) sections.push(own)

  const folded = absorbed.map((task) => {
    const notes = (task.notes || '').trim()
    return notes ? `• ${task.title}\n  ${notes.replace(/\n/g, '\n  ')}` : `• ${task.title}`
  })
  if (folded.length > 0) sections.push(`Merged in:\n${folded.join('\n')}`)

  const combined = sections.join('\n\n').trim()
  return combined || null
}

export interface MergedSurvivor {
  dueDate: Date | null
  priority: string
  estimateMinutes: number | null
  notes: string | null
  subtasks: Array<{ id: string; title: string; done: boolean }>
}

/**
 * What the survivor looks like after absorbing the others.
 *
 * Takes the earliest due date and the highest priority, on the reasoning that a
 * merge must never make work look less urgent than one of its parts. Estimates
 * are summed, since the effort really is combined. The title is deliberately
 * absent — see the note at the top of this file.
 */
export function buildMergedSurvivor(survivor: MergeableTask, absorbed: MergeableTask[]): MergedSurvivor {
  const all = [survivor, ...absorbed]

  const dueDates = all.map((t) => t.dueDate).filter((d): d is Date => !!d)
  const dueDate = dueDates.length > 0 ? new Date(Math.min(...dueDates.map((d) => d.getTime()))) : null

  const priority = all.reduce(
    (best, t) => (priorityRank(t.priority) < priorityRank(best) ? t.priority : best),
    survivor.priority,
  )

  const estimates = all.map((t) => t.estimateMinutes).filter((m): m is number => typeof m === 'number')
  const estimateMinutes = estimates.length > 0 ? estimates.reduce((sum, m) => sum + m, 0) : null

  return {
    dueDate,
    priority,
    estimateMinutes,
    notes: mergeNotes(survivor, absorbed),
    subtasks: mergeSubtasks(survivor, absorbed),
  }
}

/**
 * The exact reminder messages a task would have scheduled.
 *
 * Reminders carry no task id — they are matched by message text alone — so the
 * only way to stop an absorbed task's reminders firing is to rebuild the strings
 * it would have produced. Kept character-identical to `scheduleTaskReminder` and
 * `scheduleEscalationAlert`; if those change, this has to change with them.
 */
export function reminderMessagesFor(task: { title: string; dueDate: Date | null; escalationLevel?: string | null }): string[] {
  const messages = [`Task reminder: ${task.title} due ${task.dueDate ? task.dueDate.toDateString() : 'soon'}.`]
  if (task.dueDate && task.escalationLevel && task.escalationLevel !== 'none') {
    messages.push(`Escalation: ${task.title} is due ${task.dueDate.toDateString()}.`)
    messages.push(`Escalation: Task overdue — ${task.title} was due ${task.dueDate.toDateString()}.`)
  }
  return messages
}

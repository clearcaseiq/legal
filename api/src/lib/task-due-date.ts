/**
 * Validation for a case task's due date.
 *
 * Deliberately narrow in scope. Several code paths legitimately write a task
 * whose due date has already passed — the statute-of-limitations task uses the
 * computed SOL expiry, which is in the past precisely when it matters most;
 * imported cases carry historical deadlines; and merging tasks keeps the
 * earliest due date of the set. So this belongs at the handlers a person types
 * into, not on the model or on every `caseTask.create`.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export type TaskDueDateResult =
  | { ok: true; dueDate: Date | null }
  | { ok: false; error: string }

/**
 * Parse and range-check a user-supplied due date.
 *
 * On the timezone allowance: the web sends a bare `YYYY-MM-DD`, which `Date`
 * reads as UTC midnight, but "is this in the past" is a question about the
 * user's local calendar and the request does not tell us their offset.
 * Comparing against UTC start-of-today would reject *today* for everyone west
 * of Greenwich for part of each day. Since UTC offsets run from -12 to +14, we
 * accept anything from the start of UTC yesterday onward: that can never reject
 * a date the user considers today or later, while still catching the genuinely
 * past dates this guard exists for (CP-479).
 *
 * An absent or empty value is valid and means "no due date" — plenty of tasks
 * have none, and intelligent-question tasks are created without one.
 */
export function parseTaskDueDate(input: unknown, now: Date = new Date()): TaskDueDateResult {
  if (input === null || input === undefined || input === '') return { ok: true, dueDate: null }

  if (typeof input !== 'string' && !(input instanceof Date)) {
    return { ok: false, error: 'Due date is not a valid date.' }
  }

  const parsed = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: 'Due date is not a valid date.' }
  }

  const earliestAllowed = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - DAY_MS
  if (parsed.getTime() < earliestAllowed) {
    return { ok: false, error: 'Due date cannot be in the past.' }
  }

  return { ok: true, dueDate: parsed }
}

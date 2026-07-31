/**
 * The earliest due date a person is allowed to pick for a task.
 *
 * Set as the `min` of every task date input so the calendar greys out days that
 * have already passed, rather than letting an attorney fill in the whole form
 * and only then be told no by the server (CP-479). The server enforces the same
 * rule — this is the courtesy, not the guarantee.
 *
 * Uses the local calendar day, which is the one the user sees in the picker.
 */
export function todayDateKey(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA')
}

/** True when a `YYYY-MM-DD` value is earlier than today on the user's calendar. */
export function isPastDateKey(value: string | null | undefined, now: Date = new Date()): boolean {
  if (!value) return false
  return value < todayDateKey(now)
}

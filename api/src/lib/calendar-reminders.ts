/**
 * Rich calendar-event reminders (MyCase-style). Each reminder targets a
 * recipient group and a delivery channel at an offset before the event.
 *
 * Storage is backward compatible: older events persisted a plain number[] of
 * minutes-before offsets. Those are normalized to
 * { offsetMinutes, recipient: 'all', channel: 'email' }.
 */

export type ReminderRecipient = 'attorneys' | 'contacts' | 'all'
export type ReminderChannel = 'email' | 'popup'

export interface EventReminder {
  offsetMinutes: number
  recipient: ReminderRecipient
  channel: ReminderChannel
}

const RECIPIENTS: ReminderRecipient[] = ['attorneys', 'contacts', 'all']
const CHANNELS: ReminderChannel[] = ['email', 'popup']
const MAX_OFFSET = 43200 // ~30 days in minutes

function clampOffset(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(Math.max(Math.round(n), 0), MAX_OFFSET)
}

/** Coerce an arbitrary stored/incoming value into a valid EventReminder. */
function coerce(raw: unknown): EventReminder | null {
  if (typeof raw === 'number') {
    return { offsetMinutes: clampOffset(raw), recipient: 'all', channel: 'email' }
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const offset =
      typeof o.offsetMinutes === 'number'
        ? o.offsetMinutes
        : typeof o.minutes === 'number'
          ? o.minutes
          : null
    if (offset === null) return null
    const recipient = RECIPIENTS.includes(o.recipient as ReminderRecipient)
      ? (o.recipient as ReminderRecipient)
      : 'all'
    const channel = CHANNELS.includes(o.channel as ReminderChannel)
      ? (o.channel as ReminderChannel)
      : 'email'
    return { offsetMinutes: clampOffset(offset), recipient, channel }
  }
  return null
}

/** Parse the stored JSON column into normalized rich reminders. */
export function parseEventReminders(raw: string | null | undefined): EventReminder[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.map(coerce).filter((r): r is EventReminder => r !== null).slice(0, 6)
  } catch {
    return []
  }
}

/** Normalize incoming API input (numbers or objects) into rich reminders. */
export function normalizeEventReminders(input: unknown): EventReminder[] {
  if (!Array.isArray(input)) return []
  return input.map(coerce).filter((r): r is EventReminder => r !== null).slice(0, 6)
}

/** Serialize rich reminders to the JSON column value (null when empty). */
export function serializeEventReminders(reminders: EventReminder[]): string | null {
  return reminders.length ? JSON.stringify(reminders) : null
}

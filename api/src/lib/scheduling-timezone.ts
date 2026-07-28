/**
 * Single source of truth for the timezone an attorney's schedule is expressed in.
 *
 * `Attorney.schedulingTimezone` is nullable, and every caller used to pick its own
 * fallback: the public booking page and availability editor assumed
 * America/Los_Angeles, the dashboard calendar and consult writer assumed
 * America/New_York, and the reminder sweep assumed the API server's local zone.
 * A plaintiff therefore booked a 2:00 PM slot off a Los Angeles grid and received a
 * confirmation email rendered in New York, three hours out (CP-307).
 *
 * Resolve the zone through this module so a null column means the same thing in
 * every code path.
 */

/**
 * Fallback for attorneys who have never set a scheduling timezone. Pacific,
 * because the practice is California-based and the availability editor and public
 * booking page have always presented unset schedules in Pacific.
 */
export const DEFAULT_SCHEDULING_TIMEZONE = 'America/Los_Angeles'

/**
 * True when the runtime's Intl database recognises `timeZone`. Guards against a
 * stale or hand-edited column value taking down every downstream `toLocaleString`,
 * which throws a RangeError on an unknown zone.
 */
export function isValidTimezone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

/**
 * The IANA zone to render and interpret an attorney's schedule in. Blank,
 * missing and unrecognised values all collapse to the shared default.
 */
export function resolveSchedulingTimezone(timeZone?: string | null): string {
  const trimmed = (timeZone || '').trim()
  if (!trimmed || !isValidTimezone(trimmed)) return DEFAULT_SCHEDULING_TIMEZONE
  return trimmed
}

/**
 * Format an instant as wall-clock text in the attorney's schedule zone, with the
 * zone abbreviation appended so the reader can tell "2:00 PM PDT" from "2:00 PM
 * EDT". Used for the times quoted in confirmation and reminder emails.
 *
 * Note the explicit date/time components rather than `dateStyle`/`timeStyle`:
 * Intl rejects those shorthands alongside `timeZoneName` with "Can't set option
 * timeZoneName when dateStyle is used". That combination threw on every call,
 * and because the notification send is fire-and-forget the TypeError surfaced
 * only as a swallowed warning — the confirmation email silently never sent
 * (CP-307).
 */
const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}

export function formatInSchedulingTimezone(
  instant: Date | string,
  timeZone?: string | null,
  options: Intl.DateTimeFormatOptions = DEFAULT_FORMAT
): string {
  const date = instant instanceof Date ? instant : new Date(instant)
  if (Number.isNaN(date.getTime())) return ''

  const usesStyleShorthand = options.dateStyle != null || options.timeStyle != null
  return date.toLocaleString('en-US', {
    ...options,
    timeZone: resolveSchedulingTimezone(timeZone),
    ...(usesStyleShorthand ? {} : { timeZoneName: options.timeZoneName ?? 'short' }),
  })
}

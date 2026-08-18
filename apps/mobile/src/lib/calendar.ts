/**
 * Group attorney appointment events by calendar day for SectionList.
 *
 * Everything here renders in the attorney's *scheduling* timezone rather than the
 * device's. A consult booked for 2:00 PM in the attorney's practice zone is one
 * fixed instant; showing it as 11:30 PM because the phone is set to IST made the
 * mobile calendar disagree with the web calendar (CP-425) and pushed late-evening
 * consults onto the wrong day. The appointments endpoint returns that zone as
 * `timezone`; pass it through to every helper below.
 *
 * When the zone is missing (older API build, offline cache) these fall back to
 * device-local, which is the previous behaviour.
 */

export type AttorneyCalendarEvent = {
  id: string
  leadId?: string
  scheduledAt: string
  type?: string
  duration?: number
  status?: string
  assessmentId?: string | null
  notes?: string | null
  meetingUrl?: string | null
  location?: string | null
  phoneNumber?: string | null
  plaintiffName?: string
  claimType?: string
}

export type DaySection = { title: string; dayKey: string; data: AttorneyCalendarEvent[] }

/**
 * A Date whose *local* getters (getFullYear/getHours/…) report the wall-clock
 * time of `instant` in `timeZone`. Lets the day-bucketing and label code below
 * keep using plain local getters while actually reading the attorney's zone.
 * Mirrors `zonedWallClock` in the web app's calendarUtils.
 */
export function zonedWallClock(instant: string | Date, timeZone?: string | null): Date {
  const utc = instant instanceof Date ? instant : new Date(instant)
  if (!timeZone || Number.isNaN(utc.getTime())) return utc
  try {
    const wall = new Date(utc.toLocaleString('en-US', { timeZone }))
    return Number.isNaN(wall.getTime()) ? utc : wall
  } catch {
    return utc
  }
}

function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatSectionTitle(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function groupEventsByDay(
  events: AttorneyCalendarEvent[],
  timeZone?: string | null
): DaySection[] {
  const map = new Map<string, AttorneyCalendarEvent[]>()
  for (const ev of events) {
    const t = zonedWallClock(ev.scheduledAt, timeZone)
    if (Number.isNaN(t.getTime())) continue
    const key = localDayKey(t)
    const list = map.get(key) || []
    list.push(ev)
    map.set(key, list)
  }
  const keys = [...map.keys()].sort()
  return keys.map((dayKey) => {
    const [y, m, d] = dayKey.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const data = (map.get(dayKey) || []).sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )
    return { title: formatSectionTitle(date), dayKey, data }
  })
}

/**
 * UTC bounds to request a month of consults.
 *
 * Deliberately padded by a day on each side. The month the attorney is looking at
 * is a set of *calendar days in their zone*, but the request is an absolute
 * instant range, and the device may be up to ~13h off that zone. Without the pad,
 * a consult late on the last day of the month fell outside the window and simply
 * never appeared in the list (CP-427). Events outside the visible month are
 * grouped under their own day heading, so over-fetching is harmless.
 */
export function monthBounds(year: number, monthIndex: number): { from: Date; to: Date } {
  const from = new Date(year, monthIndex, 1)
  from.setDate(from.getDate() - 1)
  const to = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
  to.setDate(to.getDate() + 1)
  return { from, to }
}

export function formatMeetingType(type?: string): string {
  const t = (type || '').toLowerCase()
  if (t === 'phone') return 'Phone'
  // `video` bookings are Zoom consultations (a link is generated on the server);
  // label them "Zoom" to match the web scheduler and the picker above (CP-478).
  if (t === 'video') return 'Zoom'
  if (t === 'in_person') return 'In person'
  return type || 'Meeting'
}

export function formatTime(iso: string, timeZone?: string | null): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  try {
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      ...(timeZone ? { timeZone } : {}),
    })
  } catch {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
}

/**
 * Short zone label ("PDT") for the "Times shown in …" hint, so an attorney
 * travelling — or a tester on another continent — can see which zone the
 * calendar is in rather than assuming it is their own.
 */
export function tzAbbreviation(timeZone?: string | null, at: Date = new Date()): string {
  if (!timeZone) return ''
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(at)
    return parts.find((p) => p.type === 'timeZoneName')?.value || ''
  } catch {
    return ''
  }
}

/** Wall-clock `YYYY-MM-DD` for an instant in `timeZone`. */
export function zonedDateKey(instant: string | Date, timeZone?: string | null): string {
  const d = zonedWallClock(instant, timeZone)
  if (Number.isNaN(d.getTime())) return ''
  return localDayKey(d)
}

/** Wall-clock 12-hour label ("2:00 PM") for an instant in `timeZone`. */
export function zonedTimeLabel(instant: string | Date, timeZone?: string | null): string {
  const d = instant instanceof Date ? instant : new Date(instant)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      ...(timeZone ? { timeZone } : {}),
    })
  } catch {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
}

import { hasAppointmentConflict } from './availability-slots'

/**
 * Timezone-aware slot generation for the public ("Calendly-style") booking page.
 *
 * An attorney's weekly availability windows (e.g. Mon 09:00–17:00) are expressed
 * in the attorney's own timezone. We translate those wall-clock windows into
 * absolute UTC instants, then subtract existing appointments + external-calendar
 * busy blocks, honor a minimum-notice lead time, and pad each candidate with the
 * event type's before/after buffers so bookings never overlap.
 *
 * Returned slots are UTC ISO strings; the browser renders them in the visitor's
 * local timezone.
 */

type AvailabilityWindow = {
  dayOfWeek: number
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
  isAvailable: boolean
}

type BusyLike = { scheduledAt: Date | string; duration: number }

/**
 * Minutes to add to a UTC instant to get the wall-clock time in `tz`.
 * (local = utc + offset). Computed via Intl so we don't need a tz database dep.
 */
function tzOffsetMinutes(tz: string, atUtc: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    const parts = dtf.formatToParts(atUtc)
    const map: Record<string, string> = {}
    for (const p of parts) map[p.type] = p.value
    let hour = Number(map.hour)
    if (hour === 24) hour = 0 // some environments emit "24" for midnight
    const asUtc = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      hour,
      Number(map.minute),
      Number(map.second),
    )
    return Math.round((asUtc - atUtc.getTime()) / 60000)
  } catch {
    return 0
  }
}

/** Convert a wall-clock time in `tz` (on calendar date y/m/d) to a UTC Date. */
function zonedWallClockToUtc(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
  tz: string,
): Date {
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0, 0)
  const offset = tzOffsetMinutes(tz, new Date(guess))
  return new Date(guess - offset * 60000)
}

function parseHm(value: string): { h: number; m: number } {
  const [h, m] = value.split(':').map((n) => parseInt(n, 10))
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 }
}

/** Enumerate calendar dates (YYYY-MM-DD) inclusive from `from` to `to`. */
function eachDate(from: string, to: string): Array<{ y: number; m: number; d: number }> {
  const out: Array<{ y: number; m: number; d: number }> = []
  const start = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  const cur = new Date(start)
  let guard = 0
  while (cur.getTime() <= end.getTime() && guard < 400) {
    out.push({ y: cur.getUTCFullYear(), m: cur.getUTCMonth() + 1, d: cur.getUTCDate() })
    cur.setUTCDate(cur.getUTCDate() + 1)
    guard += 1
  }
  return out
}

export function computeBookableSlots(params: {
  timezone: string
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
  durationMinutes: number
  bufferBeforeMinutes?: number
  bufferAfterMinutes?: number
  minNoticeMinutes?: number
  granularityMinutes?: number
  availability: AvailabilityWindow[]
  busy: BusyLike[]
  now?: Date
}): string[] {
  const {
    timezone,
    from,
    to,
    durationMinutes,
    bufferBeforeMinutes = 0,
    bufferAfterMinutes = 0,
    minNoticeMinutes = 0,
    busy,
    availability,
  } = params

  const now = params.now ?? new Date()
  const earliest = new Date(now.getTime() + minNoticeMinutes * 60000)
  const granularity = params.granularityMinutes ?? (durationMinutes >= 30 ? 30 : 15)

  // Group ALL windows per weekday — an attorney can now have multiple availability
  // windows on the same day (e.g. 09:00–12:00 and 13:00–17:00).
  const byDow = new Map<number, AvailabilityWindow[]>()
  for (const a of availability) {
    const list = byDow.get(a.dayOfWeek)
    if (list) list.push(a)
    else byDow.set(a.dayOfWeek, [a])
  }

  const slots: string[] = []

  const emitWindow = (
    y: number,
    m: number,
    d: number,
    startHm: { h: number; m: number },
    endHm: { h: number; m: number },
  ) => {
    const windowStart = zonedWallClockToUtc(y, m, d, startHm.h, startHm.m, timezone)
    const windowEnd = zonedWallClockToUtc(y, m, d, endHm.h, endHm.m, timezone)

    const cur = new Date(windowStart)
    let guard = 0
    while (cur.getTime() < windowEnd.getTime() && guard < 500) {
      const slotStart = new Date(cur)
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000)

      const withinWindow = slotEnd.getTime() <= windowEnd.getTime()
      const notTooSoon = slotStart.getTime() >= earliest.getTime()

      if (withinWindow && notTooSoon) {
        // Pad by buffers so back-to-back bookings keep breathing room.
        const paddedStart = new Date(slotStart.getTime() - bufferBeforeMinutes * 60000)
        const paddedDuration = bufferBeforeMinutes + durationMinutes + bufferAfterMinutes
        if (!hasAppointmentConflict(paddedStart, paddedDuration, busy)) {
          const iso = slotStart.toISOString()
          if (!slots.includes(iso)) slots.push(iso)
        }
      }

      cur.setMinutes(cur.getMinutes() + granularity)
      guard += 1
    }
  }

  for (const { y, m, d } of eachDate(from, to)) {
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
    const wins = byDow.get(dow)

    if (wins && wins.length) {
      // Honor an explicit schedule. A day is "open" only for its available
      // windows; if every window is marked unavailable the day is closed.
      const open = wins.filter((w) => w.isAvailable && w.startTime < w.endTime)
      for (const w of open) {
        emitWindow(y, m, d, parseHm(w.startTime), parseHm(w.endTime))
      }
    } else {
      // No schedule at all → fall back to weekday business hours so a brand-new
      // attorney still has bookable slots.
      if (dow === 0 || dow === 6) continue
      emitWindow(y, m, d, { h: 9, m: 0 }, { h: 17, m: 0 })
    }
  }

  // Slots can be produced out of order when multiple windows exist; sort so the
  // day/time picker renders them chronologically.
  slots.sort()

  return slots
}

/** Slugify a human name into a URL-safe booking slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

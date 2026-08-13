import { zonedWallClockToUtc } from './booking-slots'

type AppointmentLike = {
  scheduledAt: Date | string
  duration: number
}

function parseDateParts(dateStr: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim())
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

function nextCalendarDay(y: number, m: number, d: number): { y: number; m: number; d: number } {
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  return { y: next.getUTCFullYear(), m: next.getUTCMonth() + 1, d: next.getUTCDate() }
}

/**
 * Wall-clock HH:MM on a calendar date in `timezone` → UTC instant.
 * Availability windows (e.g. 09:00–17:00) are attorney-local, not UTC.
 */
function wallTimeOnDate(dateStr: string, time: string, timezone: string): Date {
  const parts = parseDateParts(dateStr)
  if (!parts) return new Date(NaN)
  const [hour, minute] = time.split(':').map(Number)
  return zonedWallClockToUtc(parts.y, parts.m, parts.d, hour || 0, minute || 0, timezone)
}

/**
 * UTC day bounds for a Date (legacy). Prefer getDayBoundsInTimezone for schedules
 * expressed in an attorney's local zone.
 */
export function getDayBounds(targetDate: Date) {
  const startOfDay = new Date(Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate(),
    0,
    0,
    0,
    0
  ))

  const endOfDay = new Date(Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate(),
    23,
    59,
    59,
    999
  ))

  return { startOfDay, endOfDay }
}

/** Inclusive start / exclusive-ish end of a civil day in `timezone`. */
export function getDayBoundsInTimezone(dateStr: string, timezone: string) {
  const parts = parseDateParts(dateStr)
  if (!parts) {
    const fallback = new Date(`${dateStr}T00:00:00Z`)
    return getDayBounds(fallback)
  }
  const startOfDay = zonedWallClockToUtc(parts.y, parts.m, parts.d, 0, 0, timezone)
  const next = nextCalendarDay(parts.y, parts.m, parts.d)
  const endOfDay = new Date(
    zonedWallClockToUtc(next.y, next.m, next.d, 0, 0, timezone).getTime() - 1,
  )
  return { startOfDay, endOfDay }
}

export function hasAppointmentConflict(
  requestedStart: Date,
  durationMinutes: number,
  existingAppointments: AppointmentLike[]
) {
  const requestedEnd = new Date(requestedStart.getTime() + durationMinutes * 60000)

  return existingAppointments.some((appointment) => {
    const appointmentStart = new Date(appointment.scheduledAt)
    const appointmentEnd = new Date(appointmentStart.getTime() + appointment.duration * 60000)
    return requestedStart < appointmentEnd && requestedEnd > appointmentStart
  })
}

export function generateAvailableTimeSlots(params: {
  /** Civil date the availability window applies to (YYYY-MM-DD). */
  dateStr: string
  /** IANA zone the start/end times are expressed in (attorney scheduling TZ). */
  timezone: string
  startTime: string
  endTime: string
  duration: number
  existingAppointments: AppointmentLike[]
  /**
   * @deprecated Prefer dateStr + timezone. Kept so older callers that only have a
   * Date can still build a YYYY-MM-DD key from its UTC calendar day.
   */
  targetDate?: Date
}) {
  const dateStr =
    params.dateStr ||
    (params.targetDate
      ? `${params.targetDate.getUTCFullYear()}-${String(params.targetDate.getUTCMonth() + 1).padStart(2, '0')}-${String(params.targetDate.getUTCDate()).padStart(2, '0')}`
      : '')
  const timezone = params.timezone || 'UTC'

  const slots: Array<{ start: string; end: string; available: true }> = []
  const windowStart = wallTimeOnDate(dateStr, params.startTime, timezone)
  const windowEnd = wallTimeOnDate(dateStr, params.endTime, timezone)
  if (Number.isNaN(windowStart.getTime()) || Number.isNaN(windowEnd.getTime())) {
    return slots
  }

  const current = new Date(windowStart)

  while (current.getTime() < windowEnd.getTime()) {
    const slotEnd = new Date(current.getTime() + params.duration * 60000)
    if (
      slotEnd.getTime() <= windowEnd.getTime() &&
      !hasAppointmentConflict(current, params.duration, params.existingAppointments)
    ) {
      slots.push({
        start: current.toISOString(),
        end: slotEnd.toISOString(),
        available: true
      })
    }
    current.setUTCMinutes(current.getUTCMinutes() + 30)
  }

  return slots
}

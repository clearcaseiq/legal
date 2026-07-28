import { describe, expect, it } from 'vitest'
import {
  formatTime,
  groupEventsByDay,
  monthBounds,
  tzAbbreviation,
  zonedDateKey,
  zonedTimeLabel,
  zonedWallClock,
  type AttorneyCalendarEvent,
} from './calendar'

/** 2026-07-28T18:00:00Z — 2:00 PM in New York, 11:00 AM in Los Angeles. */
const CONSULT_2PM_ET = '2026-07-28T18:00:00.000Z'

function event(id: string, scheduledAt: string): AttorneyCalendarEvent {
  return { id, scheduledAt }
}

describe('zonedWallClock', () => {
  it('rebases local getters onto the target zone', () => {
    const d = zonedWallClock(CONSULT_2PM_ET, 'America/New_York')
    expect(d.getHours()).toBe(14)
    expect(d.getDate()).toBe(28)
  })

  it('returns the raw instant when no zone is supplied', () => {
    const d = zonedWallClock(CONSULT_2PM_ET, null)
    expect(d.getTime()).toBe(new Date(CONSULT_2PM_ET).getTime())
  })

  it('falls back to the raw instant for an unknown zone', () => {
    const d = zonedWallClock(CONSULT_2PM_ET, 'Nowhere/Special')
    expect(d.getTime()).toBe(new Date(CONSULT_2PM_ET).getTime())
  })

  it('does not throw on an unparseable date', () => {
    expect(Number.isNaN(zonedWallClock('nonsense', 'UTC').getTime())).toBe(true)
  })
})

describe('formatTime', () => {
  /**
   * CP-425: the web calendar showed 2:00 PM and mobile showed 11:30 PM for the
   * same consult, because mobile rendered in the device zone (IST) instead of the
   * attorney's.
   */
  it('renders the attorney zone rather than the device zone', () => {
    expect(formatTime(CONSULT_2PM_ET, 'America/New_York')).toBe('2:00 PM')
    expect(formatTime(CONSULT_2PM_ET, 'Asia/Kolkata')).toBe('11:30 PM')
  })

  it('degrades gracefully', () => {
    expect(formatTime('nope', 'UTC')).toBe('—')
    expect(() => formatTime(CONSULT_2PM_ET, 'Bad/Zone')).not.toThrow()
  })
})

describe('groupEventsByDay', () => {
  it('buckets by the attorney calendar day, not the device day', () => {
    // 8:00 PM in New York on 28 July is already 29 July in India.
    const lateConsult = '2026-07-29T00:00:00.000Z'
    const [section] = groupEventsByDay([event('a', lateConsult)], 'America/New_York')
    expect(section.dayKey).toBe('2026-07-28')

    const [istSection] = groupEventsByDay([event('a', lateConsult)], 'Asia/Kolkata')
    expect(istSection.dayKey).toBe('2026-07-29')
  })

  it('sorts days ascending and events within a day', () => {
    const sections = groupEventsByDay(
      [
        event('late', '2026-07-29T20:00:00.000Z'),
        event('early', '2026-07-29T14:00:00.000Z'),
        event('yesterday', '2026-07-28T14:00:00.000Z'),
      ],
      'America/New_York'
    )
    expect(sections.map((s) => s.dayKey)).toEqual(['2026-07-28', '2026-07-29'])
    expect(sections[1].data.map((e) => e.id)).toEqual(['early', 'late'])
  })

  it('skips unparseable events instead of crashing', () => {
    const sections = groupEventsByDay([event('bad', 'nonsense'), event('ok', CONSULT_2PM_ET)], 'UTC')
    expect(sections).toHaveLength(1)
    expect(sections[0].data.map((e) => e.id)).toEqual(['ok'])
  })
})

describe('monthBounds', () => {
  /**
   * CP-427: the window was exactly the device's local month, so a consult late on
   * the last day of the month fell outside it and never appeared.
   */
  it('pads a day either side of the local month', () => {
    const { from, to } = monthBounds(2026, 6) // July 2026
    expect(from.getMonth()).toBe(5) // June
    expect(from.getDate()).toBe(30)
    expect(to.getMonth()).toBe(7) // August
    expect(to.getDate()).toBe(1)
  })

  it('covers every consult in the month regardless of a large device offset', () => {
    const { from, to } = monthBounds(2026, 6)
    // Last day of July, 11:00 PM in New York.
    const lastMoment = new Date('2026-08-01T03:00:00.000Z')
    // First day of July, 12:01 AM in New York.
    const firstMoment = new Date('2026-07-01T04:01:00.000Z')
    expect(firstMoment.getTime()).toBeGreaterThanOrEqual(from.getTime())
    expect(lastMoment.getTime()).toBeLessThanOrEqual(to.getTime())
  })

  it('rolls across year boundaries', () => {
    const { from, to } = monthBounds(2026, 0) // January 2026
    expect(from.getFullYear()).toBe(2025)
    expect(from.getMonth()).toBe(11)
    expect(to.getMonth()).toBe(1) // February
  })
})

describe('zonedDateKey / zonedTimeLabel', () => {
  it('produce the wall-clock date and time of the attorney zone', () => {
    expect(zonedDateKey(CONSULT_2PM_ET, 'America/New_York')).toBe('2026-07-28')
    expect(zonedTimeLabel(CONSULT_2PM_ET, 'America/New_York')).toBe('2:00 PM')
  })

  /**
   * CP-413: the reschedule form prefilled its date from the UTC day and its time
   * from the device clock, so the two could describe different days. They must be
   * derived from one zone.
   */
  it('stay on the same day as each other for a late-evening consult', () => {
    const lateEt = '2026-07-29T03:30:00.000Z' // 11:30 PM ET on 28 July
    expect(zonedDateKey(lateEt, 'America/New_York')).toBe('2026-07-28')
    expect(zonedTimeLabel(lateEt, 'America/New_York')).toBe('11:30 PM')
  })

  it('return empty strings for unparseable input', () => {
    expect(zonedDateKey('nope', 'UTC')).toBe('')
    expect(zonedTimeLabel('nope', 'UTC')).toBe('')
  })
})

describe('tzAbbreviation', () => {
  it('gives a short label for the hint text', () => {
    expect(tzAbbreviation('America/Los_Angeles', new Date(CONSULT_2PM_ET))).toBe('PDT')
    expect(tzAbbreviation('America/New_York', new Date(CONSULT_2PM_ET))).toBe('EDT')
  })

  it('is empty when there is no zone and never throws', () => {
    expect(tzAbbreviation(null)).toBe('')
    expect(tzAbbreviation('Bad/Zone')).toBe('')
  })
})

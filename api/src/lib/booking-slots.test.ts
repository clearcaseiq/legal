import { describe, expect, it } from 'vitest'
import { wallClockToUtc, zonedWallClockToUtc } from './booking-slots'

describe('wallClockToUtc', () => {
  it('interprets a 12-hour label in the given zone', () => {
    // 2:00 PM PDT on 28 Jul 2026 is 21:00 UTC.
    expect(wallClockToUtc('2026-07-28', '2:00 PM', 'America/Los_Angeles')?.toISOString())
      .toBe('2026-07-28T21:00:00.000Z')
    // The same wall clock in New York is three hours earlier in absolute terms.
    expect(wallClockToUtc('2026-07-28', '2:00 PM', 'America/New_York')?.toISOString())
      .toBe('2026-07-28T18:00:00.000Z')
  })

  it('handles noon and midnight boundaries', () => {
    expect(wallClockToUtc('2026-07-28', '12:00 AM', 'UTC')?.toISOString())
      .toBe('2026-07-28T00:00:00.000Z')
    expect(wallClockToUtc('2026-07-28', '12:00 PM', 'UTC')?.toISOString())
      .toBe('2026-07-28T12:00:00.000Z')
    expect(wallClockToUtc('2026-07-28', '12:30 AM', 'UTC')?.toISOString())
      .toBe('2026-07-28T00:30:00.000Z')
  })

  it('accepts lowercase, spaced and dotted meridiems, and 24-hour input', () => {
    const expected = '2026-07-28T15:30:00.000Z'
    expect(wallClockToUtc('2026-07-28', '3:30 pm', 'UTC')?.toISOString()).toBe(expected)
    expect(wallClockToUtc('2026-07-28', '3:30PM', 'UTC')?.toISOString()).toBe(expected)
    expect(wallClockToUtc('2026-07-28', '3:30 p.m.', 'UTC')?.toISOString()).toBe(expected)
    expect(wallClockToUtc('2026-07-28', '15:30', 'UTC')?.toISOString()).toBe(expected)
    expect(wallClockToUtc('2026-07-28', '  2:00 PM  ', 'UTC')?.toISOString())
      .toBe('2026-07-28T14:00:00.000Z')
  })

  it('honours daylight saving on either side of a transition', () => {
    // PST (UTC-8) in January, PDT (UTC-7) in July.
    expect(wallClockToUtc('2026-01-15', '9:00 AM', 'America/Los_Angeles')?.toISOString())
      .toBe('2026-01-15T17:00:00.000Z')
    expect(wallClockToUtc('2026-07-15', '9:00 AM', 'America/Los_Angeles')?.toISOString())
      .toBe('2026-07-15T16:00:00.000Z')
  })

  it('returns null instead of an Invalid Date for malformed input', () => {
    expect(wallClockToUtc('28-07-2026', '2:00 PM', 'UTC')).toBeNull()
    expect(wallClockToUtc('2026-07-28', 'lunchtime', 'UTC')).toBeNull()
    expect(wallClockToUtc('', '2:00 PM', 'UTC')).toBeNull()
    expect(wallClockToUtc('2026-07-28', '', 'UTC')).toBeNull()
    expect(wallClockToUtc('2026-07-28', '25:00', 'UTC')).toBeNull()
    expect(wallClockToUtc('2026-07-28', '10:75', 'UTC')).toBeNull()
  })

  /**
   * CP-413: creating and rescheduling the same consult must land on the same
   * instant. The create path builds it with zonedWallClockToUtc, so the parser
   * used by reschedule has to agree exactly.
   */
  it('agrees with the create path for the same wall clock', () => {
    const tz = 'America/Los_Angeles'
    const created = zonedWallClockToUtc(2026, 7, 28, 14, 0, tz)
    const rescheduled = wallClockToUtc('2026-07-28', '2:00 PM', tz)
    expect(rescheduled?.toISOString()).toBe(created.toISOString())
  })
})

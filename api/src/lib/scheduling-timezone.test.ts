import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SCHEDULING_TIMEZONE,
  formatInSchedulingTimezone,
  isValidTimezone,
  resolveSchedulingTimezone,
} from './scheduling-timezone'

describe('resolveSchedulingTimezone', () => {
  it('keeps a valid zone as-is', () => {
    expect(resolveSchedulingTimezone('America/New_York')).toBe('America/New_York')
    expect(resolveSchedulingTimezone('Europe/London')).toBe('Europe/London')
  })

  it('falls back for null, undefined and blank columns', () => {
    expect(resolveSchedulingTimezone(null)).toBe(DEFAULT_SCHEDULING_TIMEZONE)
    expect(resolveSchedulingTimezone(undefined)).toBe(DEFAULT_SCHEDULING_TIMEZONE)
    expect(resolveSchedulingTimezone('')).toBe(DEFAULT_SCHEDULING_TIMEZONE)
    expect(resolveSchedulingTimezone('   ')).toBe(DEFAULT_SCHEDULING_TIMEZONE)
  })

  it('trims surrounding whitespace', () => {
    expect(resolveSchedulingTimezone('  America/Denver  ')).toBe('America/Denver')
  })

  it('falls back rather than throwing on an unrecognised zone', () => {
    expect(resolveSchedulingTimezone('Mars/Olympus_Mons')).toBe(DEFAULT_SCHEDULING_TIMEZONE)
    expect(resolveSchedulingTimezone('EST5EDT4')).toBe(DEFAULT_SCHEDULING_TIMEZONE)
  })

  /**
   * The bug behind CP-307: the booking page offered slots in Los Angeles while the
   * confirmation email rendered them in New York, so a 2:00 PM booking was
   * confirmed as 5:00 PM. Both paths must agree on what a null column means.
   */
  it('resolves an unset zone identically for every caller', () => {
    const fromBookingPage = resolveSchedulingTimezone(null)
    const fromEmail = resolveSchedulingTimezone(undefined)
    const fromCalendarFeed = resolveSchedulingTimezone('')
    expect(fromBookingPage).toBe(fromEmail)
    expect(fromEmail).toBe(fromCalendarFeed)
  })
})

describe('isValidTimezone', () => {
  it('accepts IANA zones and rejects nonsense', () => {
    expect(isValidTimezone('America/Los_Angeles')).toBe(true)
    expect(isValidTimezone('UTC')).toBe(true)
    expect(isValidTimezone('Not/AZone')).toBe(false)
  })
})

describe('formatInSchedulingTimezone', () => {
  // 2026-07-28T21:00:00Z is 2:00 PM PDT and 5:00 PM EDT.
  const instant = new Date('2026-07-28T21:00:00.000Z')

  it('renders the wall clock of the given zone with an abbreviation', () => {
    const pacific = formatInSchedulingTimezone(instant, 'America/Los_Angeles')
    expect(pacific).toContain('2:00 PM')
    expect(pacific).toContain('PDT')

    const eastern = formatInSchedulingTimezone(instant, 'America/New_York')
    expect(eastern).toContain('5:00 PM')
    expect(eastern).toContain('EDT')
  })

  it('uses the shared default when the attorney has no zone set', () => {
    expect(formatInSchedulingTimezone(instant, null)).toBe(
      formatInSchedulingTimezone(instant, DEFAULT_SCHEDULING_TIMEZONE)
    )
  })

  it('accepts an ISO string as well as a Date', () => {
    expect(formatInSchedulingTimezone(instant.toISOString(), 'America/Los_Angeles')).toBe(
      formatInSchedulingTimezone(instant, 'America/Los_Angeles')
    )
  })

  it('returns an empty string for an unparseable instant', () => {
    expect(formatInSchedulingTimezone('not-a-date', 'UTC')).toBe('')
  })

  /**
   * Intl throws "Can't set option timeZoneName when dateStyle is used". The
   * previous inline formatter combined the two, so every appointment
   * notification threw before it could send (CP-307).
   */
  it('does not throw when a caller passes the dateStyle/timeStyle shorthand', () => {
    expect(() =>
      formatInSchedulingTimezone(instant, 'America/Los_Angeles', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    ).not.toThrow()
  })

  it('never throws for any supported option shape', () => {
    for (const options of [
      undefined,
      { dateStyle: 'full' as const },
      { timeStyle: 'short' as const },
      { hour: 'numeric' as const, minute: '2-digit' as const },
    ]) {
      expect(() => formatInSchedulingTimezone(instant, null, options)).not.toThrow()
    }
  })
})

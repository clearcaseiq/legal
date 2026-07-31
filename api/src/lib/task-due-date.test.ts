import { describe, it, expect } from 'vitest'
import { parseTaskDueDate } from './task-due-date'

// Fixed "now" so the timezone-allowance cases are deterministic.
const NOW = new Date('2026-07-30T18:00:00.000Z')

describe('parseTaskDueDate', () => {
  it('treats an absent due date as valid and unset', () => {
    expect(parseTaskDueDate(undefined, NOW)).toEqual({ ok: true, dueDate: null })
    expect(parseTaskDueDate(null, NOW)).toEqual({ ok: true, dueDate: null })
    expect(parseTaskDueDate('', NOW)).toEqual({ ok: true, dueDate: null })
  })

  it('accepts a future date', () => {
    const result = parseTaskDueDate('2026-08-15', NOW)
    expect(result.ok).toBe(true)
    expect(result.ok && result.dueDate?.toISOString()).toBe('2026-08-15T00:00:00.000Z')
  })

  it("accepts today's date as the web sends it", () => {
    expect(parseTaskDueDate('2026-07-30', NOW).ok).toBe(true)
  })

  it('accepts UTC yesterday, because a user behind UTC may still be on that calendar day', () => {
    expect(parseTaskDueDate('2026-07-29', NOW).ok).toBe(true)
  })

  it('rejects a date that is past for every timezone', () => {
    const result = parseTaskDueDate('2026-07-28', NOW)
    expect(result).toEqual({ ok: false, error: 'Due date cannot be in the past.' })
  })

  it('rejects a date well in the past, which is the reported bug', () => {
    expect(parseTaskDueDate('2025-01-01', NOW).ok).toBe(false)
  })

  it('rejects an unparseable value rather than storing an Invalid Date', () => {
    expect(parseTaskDueDate('not-a-date', NOW)).toEqual({
      ok: false,
      error: 'Due date is not a valid date.',
    })
    expect(parseTaskDueDate(12345, NOW).ok).toBe(false)
    expect(parseTaskDueDate({}, NOW).ok).toBe(false)
  })

  it('accepts a Date instance as well as a string', () => {
    const due = new Date('2026-09-01T12:00:00.000Z')
    expect(parseTaskDueDate(due, NOW)).toEqual({ ok: true, dueDate: due })
  })

  it('compares against the calendar day, not the current instant, so earlier today is fine', () => {
    // 18:00 UTC "now", due date parsed at 00:00 UTC the same day.
    expect(parseTaskDueDate('2026-07-30T09:00:00.000Z', NOW).ok).toBe(true)
  })
})

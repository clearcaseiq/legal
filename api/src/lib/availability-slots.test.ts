import { describe, expect, it } from 'vitest'
import { generateAvailableTimeSlots, getDayBoundsInTimezone } from './availability-slots'

describe('generateAvailableTimeSlots', () => {
  it('interprets HH:MM windows in the attorney timezone (not UTC)', () => {
    // 09:00 Pacific on 2026-08-13 is 16:00 UTC during PDT.
    const slots = generateAvailableTimeSlots({
      dateStr: '2026-08-13',
      timezone: 'America/Los_Angeles',
      startTime: '09:00',
      endTime: '10:00',
      duration: 30,
      existingAppointments: [],
    })

    expect(slots.map((s) => s.start)).toEqual([
      '2026-08-13T16:00:00.000Z',
      '2026-08-13T16:30:00.000Z',
    ])
  })

  it('does not emit 2:00 AM local when the window is 09:00 business hours', () => {
    const slots = generateAvailableTimeSlots({
      dateStr: '2026-08-13',
      timezone: 'America/Los_Angeles',
      startTime: '09:00',
      endTime: '17:00',
      duration: 30,
      existingAppointments: [],
    })

    const firstLocal = new Date(slots[0].start).toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    expect(firstLocal).toBe('9:00 AM')
  })
})

describe('getDayBoundsInTimezone', () => {
  it('covers the full Pacific civil day in UTC', () => {
    const { startOfDay, endOfDay } = getDayBoundsInTimezone('2026-08-13', 'America/Los_Angeles')
    expect(startOfDay.toISOString()).toBe('2026-08-13T07:00:00.000Z')
    expect(endOfDay.toISOString()).toBe('2026-08-14T06:59:59.999Z')
  })
})

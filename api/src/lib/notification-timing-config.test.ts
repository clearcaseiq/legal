/**
 * These values decide when people get emailed and texted, and they arrive from
 * an admin form, so the cases below are mostly about what happens when the
 * stored config is wrong rather than when it is right. Every accessor has to
 * degrade to shipping behavior instead of producing a schedule that sends
 * nothing, sends twice, or sends immediately.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import {
  DEFAULT_NOTIFICATION_TIMING,
  getAppointmentReminderOffsetsMinutes,
  getIntakeAbandonmentWindowHours,
  getNotificationTiming,
  getOfferExpiryWarningMinutes,
  getReportReadyDelayMs,
  saveNotificationTiming,
  type NotificationTimingConfig,
} from './notification-timing-config'

/** A stored config with one field replaced, including with nonsense. */
const stored = (overrides: Record<string, unknown>): NotificationTimingConfig =>
  ({ ...DEFAULT_NOTIFICATION_TIMING, ...overrides }) as NotificationTimingConfig

describe('getNotificationTiming', () => {
  beforeEach(() => resetUniversalPrismaMock())

  it('falls back to defaults when nothing is stored', async () => {
    await expect(getNotificationTiming()).resolves.toEqual(DEFAULT_NOTIFICATION_TIMING)
  })

  it('falls back to defaults when the stored row will not parse', async () => {
    vi.mocked(prisma.routingConfig.findUnique).mockResolvedValue({ value: '{not json' } as never)

    await expect(getNotificationTiming()).resolves.toEqual(DEFAULT_NOTIFICATION_TIMING)
  })

  it('falls back to defaults when the config table is missing entirely', async () => {
    vi.mocked(prisma.routingConfig.findUnique).mockRejectedValue(
      new Error('relation "routing_config" does not exist') as never
    )

    await expect(getNotificationTiming()).resolves.toEqual(DEFAULT_NOTIFICATION_TIMING)
  })

  it('fills in fields a config written before they existed does not carry', async () => {
    vi.mocked(prisma.routingConfig.findUnique).mockResolvedValue(
      { value: JSON.stringify({ reportReadyDelayMinutes: 30 }) } as never
    )

    const config = await getNotificationTiming()

    expect(config.reportReadyDelayMinutes).toBe(30)
    expect(config.intakeAbandonmentAfterMinutes).toBe(
      DEFAULT_NOTIFICATION_TIMING.intakeAbandonmentAfterMinutes
    )
  })
})

describe('getReportReadyDelayMs', () => {
  it('honors a configured delay', () => {
    expect(getReportReadyDelayMs(stored({ reportReadyDelayMinutes: 25 }))).toBe(25 * 60_000)
  })

  it('allows an immediate send, which is a real choice rather than a bad value', () => {
    expect(getReportReadyDelayMs(stored({ reportReadyDelayMinutes: 0 }))).toBe(0)
  })

  it('refuses a negative delay, which would send into the past', () => {
    expect(getReportReadyDelayMs(stored({ reportReadyDelayMinutes: -5 }))).toBe(0)
  })

  it('ignores a value that is not a number at all', () => {
    expect(getReportReadyDelayMs(stored({ reportReadyDelayMinutes: 'soon' }))).toBe(10 * 60_000)
  })
})

describe('getAppointmentReminderOffsetsMinutes', () => {
  it('sorts configured offsets furthest-out first', () => {
    expect(
      getAppointmentReminderOffsetsMinutes(stored({ appointmentReminderOffsetsMinutes: [60, 2880, 120] }))
    ).toEqual([2880, 120, 60])
  })

  it('drops an offset too close to the one before it to be a separate message', () => {
    // 60 and 50 both match the same pass with a 15-minute catch window, so the
    // claimant would get two near-identical reminders minutes apart.
    expect(
      getAppointmentReminderOffsetsMinutes(stored({ appointmentReminderOffsetsMinutes: [60, 50] }))
    ).toEqual([60])
  })

  it('discards zero and negative offsets rather than reminding after the fact', () => {
    expect(
      getAppointmentReminderOffsetsMinutes(stored({ appointmentReminderOffsetsMinutes: [1440, 0, -60] }))
    ).toEqual([1440])
  })

  it('restores the defaults rather than leaving an appointment with no reminder', () => {
    expect(
      getAppointmentReminderOffsetsMinutes(stored({ appointmentReminderOffsetsMinutes: [] }))
    ).toEqual(DEFAULT_NOTIFICATION_TIMING.appointmentReminderOffsetsMinutes)
  })

  it('survives a stored value that is not an array', () => {
    expect(
      getAppointmentReminderOffsetsMinutes(stored({ appointmentReminderOffsetsMinutes: null }))
    ).toEqual(DEFAULT_NOTIFICATION_TIMING.appointmentReminderOffsetsMinutes)
  })
})

describe('getIntakeAbandonmentWindowHours', () => {
  it('honors a configured window', () => {
    expect(getIntakeAbandonmentWindowHours(stored({ intakeAbandonmentWindowHours: 24 }))).toBe(24)
  })

  it('widens a window that would exclude every lead the idle threshold admits', () => {
    // Idle for 4h but only look back 1h, and the two ranges never overlap: the
    // sweep would scan forever and contact nobody.
    const config = stored({ intakeAbandonmentAfterMinutes: 240, intakeAbandonmentWindowHours: 1 })

    expect(getIntakeAbandonmentWindowHours(config)).toBeGreaterThan(4)
  })
})

describe('getOfferExpiryWarningMinutes', () => {
  it('warns at the configured fraction of the response window', () => {
    expect(getOfferExpiryWarningMinutes(stored({ offerExpiryWarningFraction: 0.25 }), 1440)).toBe(360)
  })

  it('applies the floor when the fraction would give almost no notice', () => {
    expect(
      getOfferExpiryWarningMinutes(
        stored({ offerExpiryWarningFraction: 0.01, offerExpiryWarningFloorMinutes: 15 }),
        60
      )
    ).toBe(15)
  })

  it('never warns for the whole window, which would fire the moment a case routes', () => {
    const warning = getOfferExpiryWarningMinutes(
      stored({ offerExpiryWarningFloorMinutes: 600 }),
      60
    )

    expect(warning).toBeLessThan(60)
  })
})

describe('saveNotificationTiming', () => {
  beforeEach(() => resetUniversalPrismaMock())

  it('stores the clamped values, so the screen shows what the sweeps will do', async () => {
    const saved = await saveNotificationTiming({ reportReadyDelayMinutes: -5 })

    expect(saved.reportReadyDelayMinutes).toBe(0)
    const written = vi.mocked(prisma.routingConfig.upsert).mock.calls[0][0]
    expect(JSON.parse(written.update.value).reportReadyDelayMinutes).toBe(0)
  })

  it('leaves untouched fields at their current values', async () => {
    vi.mocked(prisma.routingConfig.findUnique).mockResolvedValue(
      { value: JSON.stringify({ intakeAbandonmentAfterMinutes: 90 }) } as never
    )

    const saved = await saveNotificationTiming({ reportReadyDelayMinutes: 20 })

    expect(saved.intakeAbandonmentAfterMinutes).toBe(90)
    expect(saved.reportReadyDelayMinutes).toBe(20)
  })

  it('explains itself when the config table has not been migrated', async () => {
    vi.mocked(prisma.routingConfig.upsert).mockRejectedValue(new Error('no such table') as never)

    await expect(saveNotificationTiming({ reportReadyDelayMinutes: 20 })).rejects.toThrow(
      /routing_config/
    )
  })
})

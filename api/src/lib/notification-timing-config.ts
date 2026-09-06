/**
 * Admin-editable timing for outbound claimant and attorney messages.
 *
 * Every one of these values used to be a module-level constant inside the sweep
 * that owned it, so changing when a reminder went out meant a code change and a
 * deploy. They are collected here because they are product decisions, not
 * implementation details: how long to wait before the report email, how far
 * ahead of a consultation to remind someone, how close to a deadline an attorney
 * gets a warning.
 *
 * Stored in `routing_config` under one key, the same shape `matching_rules` and
 * `heuristics` use — a JSON blob merged over the defaults below, so a missing
 * table, an unparseable row, or a config written before a field existed all fall
 * back to shipping behavior rather than failing.
 *
 * Read through the accessors at the bottom rather than off the object. A stored
 * config is operator input and can hold anything the admin form let through
 * (or anything a later edit to that form lets through), and these values decide
 * when strangers get texted. Each accessor clamps to a range that keeps the
 * sweep sane, so a zero, a negative, or a string can only ever degrade to the
 * default.
 *
 * What is deliberately NOT here: whether a notification is sent at all, and to
 * which channel. Those are gated elsewhere (`SmsOptOut`, the various
 * `*_ENABLED` env switches) and folding them in would put an admin form in
 * front of a consent decision.
 */

import { prisma } from './prisma'

const CONFIG_KEY = 'notification_timing'

export interface NotificationTimingConfig {
  /** How long a finished assessment waits before its report email goes out. */
  reportReadyDelayMinutes: number

  /**
   * How far ahead of a consultation to send each reminder, largest first.
   * One reminder is sent per entry.
   */
  appointmentReminderOffsetsMinutes: number[]

  /**
   * How wide the window is for catching an offset the sweep stepped over.
   *
   * The sweep runs on an interval and compares "minutes until the appointment"
   * against each offset, so it almost never lands exactly on one. This is the
   * tolerance below the offset that still counts as a hit; it has to exceed the
   * sweep interval or reminders would be skipped outright.
   */
  appointmentReminderCatchWindowMinutes: number

  /** How long an intake can sit idle before it counts as abandoned. */
  intakeAbandonmentAfterMinutes: number

  /** How stale an abandoned intake can be and still be worth contacting. */
  intakeAbandonmentWindowHours: number

  /**
   * How much of the attorney response window is left when the "expiring soon"
   * warning fires, as a fraction of the whole window.
   */
  offerExpiryWarningFraction: number

  /** Floor for the warning above, so a short deadline still gives usable notice. */
  offerExpiryWarningFloorMinutes: number
}

export const DEFAULT_NOTIFICATION_TIMING: NotificationTimingConfig = {
  reportReadyDelayMinutes: 10,
  appointmentReminderOffsetsMinutes: [24 * 60, 60],
  appointmentReminderCatchWindowMinutes: 15,
  intakeAbandonmentAfterMinutes: 45,
  intakeAbandonmentWindowHours: 72,
  offerExpiryWarningFraction: 0.2,
  offerExpiryWarningFloorMinutes: 15,
}

export async function getNotificationTiming(): Promise<NotificationTimingConfig> {
  try {
    const row = await prisma.routingConfig.findUnique({ where: { key: CONFIG_KEY } })
    if (!row?.value) return DEFAULT_NOTIFICATION_TIMING
    try {
      const parsed = JSON.parse(row.value) as Partial<NotificationTimingConfig>
      return { ...DEFAULT_NOTIFICATION_TIMING, ...parsed }
    } catch {
      return DEFAULT_NOTIFICATION_TIMING
    }
  } catch {
    // Table may not exist yet on a deployment that has not migrated.
    return DEFAULT_NOTIFICATION_TIMING
  }
}

export async function saveNotificationTiming(
  config: Partial<NotificationTimingConfig>
): Promise<NotificationTimingConfig> {
  const current = await getNotificationTiming()
  // Normalized on the way in as well as on the way out, so the admin screen
  // reflects back the values the sweeps will actually use rather than the raw
  // input. A form that accepts 0 and then silently behaves like 10 is worse
  // than one that shows 10.
  const merged = normalizeNotificationTiming({ ...current, ...config })
  try {
    await prisma.routingConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: JSON.stringify(merged) },
      update: { value: JSON.stringify(merged) },
    })
    return merged
  } catch {
    throw new Error(
      'Failed to save notification timing. Ensure the routing_config table exists (run: npx prisma migrate deploy)'
    )
  }
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

function clampMinutes(value: unknown, min: number, max: number, fallback: number): number {
  return Math.round(clamp(value, min, max, fallback))
}

// --- Accessors ------------------------------------------------------------
// Bounds are chosen to keep each sweep coherent, not to express a preference.

export function getReportReadyDelayMs(config: NotificationTimingConfig): number {
  // Up to a day. Longer and the link arrives after the person has forgotten
  // they asked for it.
  return clampMinutes(config.reportReadyDelayMinutes, 0, 24 * 60, DEFAULT_NOTIFICATION_TIMING.reportReadyDelayMinutes) * 60_000
}

export function getAppointmentReminderCatchWindowMinutes(config: NotificationTimingConfig): number {
  // Floor of 5 matches the sweep interval; below it the sweep steps over its
  // own offsets and sends nothing at all.
  return clampMinutes(
    config.appointmentReminderCatchWindowMinutes,
    5,
    120,
    DEFAULT_NOTIFICATION_TIMING.appointmentReminderCatchWindowMinutes
  )
}

/**
 * The configured reminder offsets, largest first.
 *
 * Offsets closer together than the catch window would both match the same sweep
 * pass and fire as two messages minutes apart, so the tighter one is dropped.
 * Falls back to the defaults if nothing usable survives, because an appointment
 * with no reminder at all is the worst outcome here.
 */
export function getAppointmentReminderOffsetsMinutes(config: NotificationTimingConfig): number[] {
  const raw = Array.isArray(config.appointmentReminderOffsetsMinutes)
    ? config.appointmentReminderOffsetsMinutes
    : DEFAULT_NOTIFICATION_TIMING.appointmentReminderOffsetsMinutes

  const catchWindow = getAppointmentReminderCatchWindowMinutes(config)
  const sorted = raw
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.round(Math.min(value, 30 * 24 * 60)))
    .sort((a, b) => b - a)

  const spaced: number[] = []
  for (const offset of sorted) {
    const last = spaced[spaced.length - 1]
    if (last !== undefined && last - offset < catchWindow) continue
    spaced.push(offset)
  }

  return spaced.length ? spaced : [...DEFAULT_NOTIFICATION_TIMING.appointmentReminderOffsetsMinutes]
}

export function getIntakeAbandonmentAfterMinutes(config: NotificationTimingConfig): number {
  // Floor of 5 keeps this from firing while someone is still filling the form.
  return clampMinutes(
    config.intakeAbandonmentAfterMinutes,
    5,
    7 * 24 * 60,
    DEFAULT_NOTIFICATION_TIMING.intakeAbandonmentAfterMinutes
  )
}

export function getIntakeAbandonmentWindowHours(config: NotificationTimingConfig): number {
  const idleHours = getIntakeAbandonmentAfterMinutes(config) / 60
  const windowHours = clamp(
    config.intakeAbandonmentWindowHours,
    1,
    30 * 24,
    DEFAULT_NOTIFICATION_TIMING.intakeAbandonmentWindowHours
  )
  // The window has to outlast the idle threshold or it excludes every lead the
  // threshold just made eligible, and the sweep quietly contacts nobody.
  return Math.max(windowHours, idleHours * 2)
}

export function getOfferExpiryWarningMinutes(
  config: NotificationTimingConfig,
  deadlineMinutes: number
): number {
  const fraction = clamp(
    config.offerExpiryWarningFraction,
    0.01,
    0.9,
    DEFAULT_NOTIFICATION_TIMING.offerExpiryWarningFraction
  )
  const floor = clampMinutes(
    config.offerExpiryWarningFloorMinutes,
    1,
    24 * 60,
    DEFAULT_NOTIFICATION_TIMING.offerExpiryWarningFloorMinutes
  )
  // Never the whole window: warning at the moment of routing is not a warning.
  const cap = Math.max(1, Math.floor(deadlineMinutes * 0.9))
  return Math.min(cap, Math.max(floor, Math.round(deadlineMinutes * fraction)))
}

/** Every value passed through its accessor, for storing and for display. */
export function normalizeNotificationTiming(
  config: NotificationTimingConfig
): NotificationTimingConfig {
  return {
    reportReadyDelayMinutes: getReportReadyDelayMs(config) / 60_000,
    appointmentReminderOffsetsMinutes: getAppointmentReminderOffsetsMinutes(config),
    appointmentReminderCatchWindowMinutes: getAppointmentReminderCatchWindowMinutes(config),
    intakeAbandonmentAfterMinutes: getIntakeAbandonmentAfterMinutes(config),
    intakeAbandonmentWindowHours: getIntakeAbandonmentWindowHours(config),
    offerExpiryWarningFraction: clamp(
      config.offerExpiryWarningFraction,
      0.01,
      0.9,
      DEFAULT_NOTIFICATION_TIMING.offerExpiryWarningFraction
    ),
    offerExpiryWarningFloorMinutes: clampMinutes(
      config.offerExpiryWarningFloorMinutes,
      1,
      24 * 60,
      DEFAULT_NOTIFICATION_TIMING.offerExpiryWarningFloorMinutes
    ),
  }
}

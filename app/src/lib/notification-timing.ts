/**
 * Client mirror of the server's notification timing configuration.
 *
 * Defaults are duplicated here so the admin form renders real numbers on first
 * paint instead of empty inputs. They are a starting state, never the source of
 * truth — the server clamps whatever it is sent and returns the values it
 * actually applied, so the save handler replaces form state with the response.
 *
 * Kept in step with `api/src/lib/notification-timing-config.ts`.
 */

export interface NotificationTimingConfig {
  reportReadyDelayMinutes: number
  appointmentReminderOffsetsMinutes: number[]
  appointmentReminderCatchWindowMinutes: number
  intakeAbandonmentAfterMinutes: number
  intakeAbandonmentWindowHours: number
  offerExpiryWarningFraction: number
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

/** "90 minutes" as "1 hour 30 minutes", so an offset in minutes stays readable. */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'immediately'
  const days = Math.floor(minutes / (24 * 60))
  const hours = Math.floor((minutes % (24 * 60)) / 60)
  const mins = Math.round(minutes % 60)
  const parts = [
    days > 0 ? `${days} day${days === 1 ? '' : 's'}` : '',
    hours > 0 ? `${hours} hour${hours === 1 ? '' : 's'}` : '',
    mins > 0 ? `${mins} minute${mins === 1 ? '' : 's'}` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

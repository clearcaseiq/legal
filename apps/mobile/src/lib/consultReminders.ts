import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { AttorneyCalendarEvent } from './calendar'
import { formatMeetingType, formatTime } from './calendar'

const PREFIX = 'consult-reminder-'

/**
 * Schedule local notifications 1 hour before upcoming consultations (next ~7 days).
 */
export async function scheduleConsultReminders(events: AttorneyCalendarEvent[]) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    for (const n of scheduled) {
      if (n.identifier.startsWith(PREFIX)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier)
      }
    }
  } catch {
    /* no-op */
  }

  const now = Date.now()
  const horizon = now + 7 * 24 * 60 * 60 * 1000

  for (const ev of events) {
    const start = new Date(ev.scheduledAt).getTime()
    const remindAt = start - 60 * 60 * 1000
    if (remindAt <= now || remindAt > horizon) continue
    const seconds = Math.max(60, Math.floor((remindAt - now) / 1000))
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${ev.id}`,
        content: {
          title: 'Consultation soon',
          body: `${formatMeetingType(ev.type)} with ${ev.plaintiffName || 'client'} at ${formatTime(ev.scheduledAt)}`,
          ...(Platform.OS === 'android' ? { channelId: 'consult' } : {}),
          data: {
            type: 'consult_reminder',
            leadId: ev.leadId || '',
            appointmentId: ev.id,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        },
      })
    } catch {
      /* no-op */
    }
  }
}

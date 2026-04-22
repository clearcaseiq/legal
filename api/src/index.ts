import { buildApp } from './build-app'
import { ENV } from './env'
import { logger } from './lib/logger'
import { renewCalendarWebhookSubscriptions } from './lib/calendar-sync'
import { runAppointmentEngagementSweep } from './lib/appointment-engagement'
import { retryPendingPlatformNotifications } from './lib/platform-notifications'

const app = buildApp()

let calendarWebhookRenewalTimer: NodeJS.Timeout | null = null
let appointmentEngagementTimer: NodeJS.Timeout | null = null
let notificationRetryTimer: NodeJS.Timeout | null = null

async function runCalendarWebhookRenewalSweep(trigger: 'startup' | 'interval') {
  try {
    const result = await renewCalendarWebhookSubscriptions()
    if (result.processedCount > 0 || trigger === 'startup') {
      logger.info('Calendar webhook renewal sweep completed', {
        trigger,
        ...result,
      })
    }
  } catch (error) {
    logger.error('Calendar webhook renewal sweep failed', { error, trigger })
  }
}

function startCalendarWebhookRenewalLoop() {
  if (!ENV.CALENDAR_WEBHOOK_RENEWAL_ENABLED) {
    logger.info('Calendar webhook renewal loop disabled')
    return
  }

  const intervalMs = Math.max(60_000, ENV.CALENDAR_WEBHOOK_RENEWAL_INTERVAL_MS)
  void runCalendarWebhookRenewalSweep('startup')
  calendarWebhookRenewalTimer = setInterval(() => {
    void runCalendarWebhookRenewalSweep('interval')
  }, intervalMs)
}

async function runAppointmentEngagementLoop(trigger: 'startup' | 'interval') {
  try {
    const result = await runAppointmentEngagementSweep()
    if (result.sentCount > 0 || trigger === 'startup') {
      logger.info('Appointment engagement sweep completed', {
        trigger,
        ...result,
      })
    }
  } catch (error) {
    logger.error('Appointment engagement sweep failed', { error, trigger })
  }
}

function startAppointmentEngagementLoop() {
  const intervalMs = 5 * 60 * 1000
  void runAppointmentEngagementLoop('startup')
  appointmentEngagementTimer = setInterval(() => {
    void runAppointmentEngagementLoop('interval')
  }, intervalMs)
}

async function runNotificationRetryLoop(trigger: 'startup' | 'interval') {
  try {
    const result = await retryPendingPlatformNotifications()
    if (result.attemptedCount > 0 || trigger === 'startup') {
      logger.info('Notification retry sweep completed', {
        trigger,
        ...result,
      })
    }
  } catch (error) {
    logger.error('Notification retry sweep failed', { error, trigger })
  }
}

function startNotificationRetryLoop() {
  const intervalMs = 60 * 1000
  void runNotificationRetryLoop('startup')
  notificationRetryTimer = setInterval(() => {
    void runNotificationRetryLoop('interval')
  }, intervalMs)
}

const server = app.listen(ENV.PORT, ENV.HOST, () => {
  logger.info(`API server listening on http://${ENV.HOST}:${ENV.PORT}`)
  startCalendarWebhookRenewalLoop()
  startAppointmentEngagementLoop()
  startNotificationRetryLoop()
})

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  if (calendarWebhookRenewalTimer) clearInterval(calendarWebhookRenewalTimer)
  if (appointmentEngagementTimer) clearInterval(appointmentEngagementTimer)
  if (notificationRetryTimer) clearInterval(notificationRetryTimer)
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  if (calendarWebhookRenewalTimer) clearInterval(calendarWebhookRenewalTimer)
  if (appointmentEngagementTimer) clearInterval(appointmentEngagementTimer)
  if (notificationRetryTimer) clearInterval(notificationRetryTimer)
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

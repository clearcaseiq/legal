import './lib/node-dom-polyfills'
import './load-env'
import { buildApp } from './build-app'
import { ENV } from './env'
import { logger } from './lib/logger'
import { prisma } from './lib/prisma'
import { renewCalendarWebhookSubscriptions } from './lib/calendar-sync'
import { runAppointmentEngagementSweep } from './lib/appointment-engagement'
import { retryPendingPlatformNotifications } from './lib/platform-notifications'
import { runIntakeAbandonmentSweep } from './lib/intake-abandonment'
import { runRoutingEscalationSweep } from './lib/routing-escalation-sweep'
import { runOfferExpirySweep } from './lib/offer-expiry-sweep'
import { runCaseReminderSweep } from './lib/case-reminder-sweep'
import { reconcileAllAttorneyRatingAggregates } from './lib/attorney-rating-aggregates'

const app = buildApp()

let calendarWebhookRenewalTimer: NodeJS.Timeout | null = null
let appointmentEngagementTimer: NodeJS.Timeout | null = null
let notificationRetryTimer: NodeJS.Timeout | null = null
let intakeAbandonmentTimer: NodeJS.Timeout | null = null
let routingEscalationTimer: NodeJS.Timeout | null = null
let offerExpiryTimer: NodeJS.Timeout | null = null
let caseReminderTimer: NodeJS.Timeout | null = null

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

async function runIntakeAbandonmentLoop(trigger: 'startup' | 'interval') {
  try {
    const result = await runIntakeAbandonmentSweep()
    if (result.sent > 0 || trigger === 'startup') {
      logger.info('Intake abandonment sweep completed', {
        trigger,
        ...result,
      })
    }
  } catch (error) {
    logger.error('Intake abandonment sweep failed', { error, trigger })
  }
}

function startIntakeAbandonmentLoop() {
  const intervalMs = 10 * 60 * 1000
  void runIntakeAbandonmentLoop('startup')
  intakeAbandonmentTimer = setInterval(() => {
    void runIntakeAbandonmentLoop('interval')
  }, intervalMs)
}

async function runRoutingEscalationLoop(trigger: 'startup' | 'interval') {
  try {
    const result = await runRoutingEscalationSweep()
    if (result.processed > 0 || trigger === 'startup') {
      logger.info('Routing escalation sweep completed', {
        trigger,
        ...result,
      })
    }
  } catch (error) {
    logger.error('Routing escalation sweep failed', { error, trigger })
  }
}

function startRoutingEscalationLoop() {
  const intervalMs = 10 * 60 * 1000
  void runRoutingEscalationLoop('startup')
  routingEscalationTimer = setInterval(() => {
    void runRoutingEscalationLoop('interval')
  }, intervalMs)
}

async function runOfferExpiryLoop(trigger: 'startup' | 'interval') {
  try {
    const result = await runOfferExpirySweep()
    if (result.expired > 0 || trigger === 'startup') {
      logger.info('Offer expiry sweep completed', {
        trigger,
        ...result,
      })
    }
  } catch (error) {
    logger.error('Offer expiry sweep failed', { error, trigger })
  }
}

function startOfferExpiryLoop() {
  // Attorney response windows are short (minutes), so sweep frequently.
  const intervalMs = 60 * 1000
  void runOfferExpiryLoop('startup')
  offerExpiryTimer = setInterval(() => {
    void runOfferExpiryLoop('interval')
  }, intervalMs)
}

async function runCaseReminderLoop(trigger: 'startup' | 'interval') {
  try {
    const result = await runCaseReminderSweep()
    if (result.sent > 0 || result.failed > 0 || trigger === 'startup') {
      logger.info('Case reminder sweep completed', {
        trigger,
        ...result,
      })
    }
  } catch (error) {
    logger.error('Case reminder sweep failed', { error, trigger })
  }
}

function startCaseReminderLoop() {
  const intervalMs = 5 * 60 * 1000
  void runCaseReminderLoop('startup')
  caseReminderTimer = setInterval(() => {
    void runCaseReminderLoop('interval')
  }, intervalMs)
}

const server = app.listen(ENV.PORT, ENV.HOST, () => {
  logger.info(`API server listening on http://${ENV.HOST}:${ENV.PORT}`)
  // Heal any stale attorney rating aggregates left by reviews created before
  // the on-write sync existed, so ratings render everywhere (CP-308/321/326).
  void reconcileAllAttorneyRatingAggregates()
  startCalendarWebhookRenewalLoop()
  startAppointmentEngagementLoop()
  startNotificationRetryLoop()
  startIntakeAbandonmentLoop()
  startRoutingEscalationLoop()
  startOfferExpiryLoop()
  startCaseReminderLoop()
})

function stopBackgroundLoops() {
  if (calendarWebhookRenewalTimer) clearInterval(calendarWebhookRenewalTimer)
  if (appointmentEngagementTimer) clearInterval(appointmentEngagementTimer)
  if (notificationRetryTimer) clearInterval(notificationRetryTimer)
  if (intakeAbandonmentTimer) clearInterval(intakeAbandonmentTimer)
  if (routingEscalationTimer) clearInterval(routingEscalationTimer)
  if (offerExpiryTimer) clearInterval(offerExpiryTimer)
  if (caseReminderTimer) clearInterval(caseReminderTimer)
  calendarWebhookRenewalTimer = null
  appointmentEngagementTimer = null
  notificationRetryTimer = null
  intakeAbandonmentTimer = null
  routingEscalationTimer = null
  offerExpiryTimer = null
  caseReminderTimer = null
}

function closeHttpServer() {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

async function shutdown(signal: 'SIGTERM' | 'SIGINT') {
  logger.info(`${signal} received, shutting down gracefully`)
  stopBackgroundLoops()
  try {
    await closeHttpServer()
    await prisma.$disconnect()
    logger.info('Server closed')
    process.exit(0)
  } catch (error) {
    logger.error('Graceful shutdown failed', { error })
    process.exit(1)
  }
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

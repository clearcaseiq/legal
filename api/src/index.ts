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
import { runReportReadySweep } from './lib/report-ready'
import { runRoutingEscalationSweep } from './lib/routing-escalation-sweep'
import { runOfferExpirySweep } from './lib/offer-expiry-sweep'
import { runRoutingStallSweep } from './lib/routing-stall-sweep'
import { runCaseReminderSweep } from './lib/case-reminder-sweep'
import { runSolExpirySweep } from './lib/sol-expiry-sweep'
import { runEsignEnvelopeSweep } from './lib/esign-envelope-sweep'
import { runAiCaseManagerSweep, isAiCaseManagerEnabled } from './lib/ai-case-manager-sweep'
import { runActivityCanarySweep, isActivityCanaryEnabled } from './lib/activity-canary-sweep'
import { runErrorRateSweep, isErrorRateMonitorEnabled } from './lib/error-rate-monitor'
import { reconcileAllAttorneyRatingAggregates } from './lib/attorney-rating-aggregates'
import { beginSweep, registerSweep } from './lib/ops-status'
import { startSchedulerLeadership, stopSchedulerLeadership } from './lib/scheduler-leader'

const app = buildApp()

let calendarWebhookRenewalTimer: NodeJS.Timeout | null = null
let appointmentEngagementTimer: NodeJS.Timeout | null = null
let notificationRetryTimer: NodeJS.Timeout | null = null
let intakeAbandonmentTimer: NodeJS.Timeout | null = null
let reportReadyTimer: NodeJS.Timeout | null = null
let routingEscalationTimer: NodeJS.Timeout | null = null
let offerExpiryTimer: NodeJS.Timeout | null = null
let routingStallTimer: NodeJS.Timeout | null = null
let caseReminderTimer: NodeJS.Timeout | null = null
let solExpiryTimer: NodeJS.Timeout | null = null
let esignEnvelopeTimer: NodeJS.Timeout | null = null
let aiCaseManagerTimer: NodeJS.Timeout | null = null
let activityCanaryTimer: NodeJS.Timeout | null = null
let errorRateTimer: NodeJS.Timeout | null = null

async function runCalendarWebhookRenewalSweep(trigger: 'startup' | 'interval') {
  const sweep = beginSweep('calendar-webhook-renewal')
  try {
    const result = await renewCalendarWebhookSubscriptions()
    sweep.succeed()
    if (result.processedCount > 0 || trigger === 'startup') {
      logger.info('Calendar webhook renewal sweep completed', {
        trigger,
        ...result,
      })
    }
  } catch (error) {
    sweep.fail(error)
    logger.error('Calendar webhook renewal sweep failed', { error, trigger })
  }
}

function startCalendarWebhookRenewalLoop() {
  if (!ENV.CALENDAR_WEBHOOK_RENEWAL_ENABLED) {
    registerSweep('calendar-webhook-renewal', { label: 'Calendar webhook renewal', enabled: false })
    logger.info('Calendar webhook renewal loop disabled')
    return
  }

  const intervalMs = Math.max(60_000, ENV.CALENDAR_WEBHOOK_RENEWAL_INTERVAL_MS)
  registerSweep('calendar-webhook-renewal', {
    label: 'Calendar webhook renewal',
    enabled: true,
    intervalMs,
  })
  void runCalendarWebhookRenewalSweep('startup')
  calendarWebhookRenewalTimer = setInterval(() => {
    void runCalendarWebhookRenewalSweep('interval')
  }, intervalMs)
}

async function runAppointmentEngagementLoop(trigger: 'startup' | 'interval') {
  const sweep = beginSweep('appointment-engagement')
  try {
    const result = await runAppointmentEngagementSweep()
    sweep.succeed()
    if (result.sentCount > 0 || trigger === 'startup') {
      logger.info('Appointment engagement sweep completed', {
        trigger,
        ...result,
      })
    }
  } catch (error) {
    sweep.fail(error)
    logger.error('Appointment engagement sweep failed', { error, trigger })
  }
}

function startAppointmentEngagementLoop() {
  const intervalMs = 5 * 60 * 1000
  registerSweep('appointment-engagement', {
    label: 'Appointment engagement',
    enabled: true,
    intervalMs,
  })
  void runAppointmentEngagementLoop('startup')
  appointmentEngagementTimer = setInterval(() => {
    void runAppointmentEngagementLoop('interval')
  }, intervalMs)
}

async function runNotificationRetryLoop(trigger: 'startup' | 'interval') {
  const sweep = beginSweep('notification-retry')
  try {
    const result = await retryPendingPlatformNotifications()
    sweep.succeed()
    if (result.attemptedCount > 0 || trigger === 'startup') {
      logger.info('Notification retry sweep completed', {
        trigger,
        ...result,
      })
    }
  } catch (error) {
    sweep.fail(error)
    logger.error('Notification retry sweep failed', { error, trigger })
  }
}

function startNotificationRetryLoop() {
  const intervalMs = 60 * 1000
  registerSweep('notification-retry', {
    label: 'Notification retry',
    enabled: true,
    intervalMs,
  })
  void runNotificationRetryLoop('startup')
  notificationRetryTimer = setInterval(() => {
    void runNotificationRetryLoop('interval')
  }, intervalMs)
}

async function runIntakeAbandonmentLoop(trigger: 'startup' | 'interval') {
  const sweep = beginSweep('intake-abandonment')
  try {
    const result = await runIntakeAbandonmentSweep()
    sweep.succeed()
    if (result.sent > 0 || trigger === 'startup') {
      logger.info('Intake abandonment sweep completed', {
        trigger,
        ...result,
      })
    }
  } catch (error) {
    sweep.fail(error)
    logger.error('Intake abandonment sweep failed', { error, trigger })
  }
}

function startIntakeAbandonmentLoop() {
  const intervalMs = 10 * 60 * 1000
  // Off by default: the copy is now SB 37 clean, but the message still cannot
  // carry the responsible-party disclosure § 6157.2(b) requires until this
  // platform's status under § 6155 is settled. See intake-abandonment.ts. The
  // sweep still registers so the admin ops view shows it disabled, not missing.
  if (process.env.INTAKE_ABANDONMENT_OUTREACH_ENABLED !== 'true') {
    registerSweep('intake-abandonment', { label: 'Intake abandonment', enabled: false })
    logger.warn('Intake abandonment outreach is disabled', {
      reason: 'SB 37 § 6157.2(b) disclosure pending — set INTAKE_ABANDONMENT_OUTREACH_ENABLED=true to re-enable',
    })
    return
  }
  registerSweep('intake-abandonment', {
    label: 'Intake abandonment',
    enabled: true,
    intervalMs,
  })
  void runIntakeAbandonmentLoop('startup')
  intakeAbandonmentTimer = setInterval(() => {
    void runIntakeAbandonmentLoop('interval')
  }, intervalMs)
}

async function runReportReadyLoop(trigger: 'startup' | 'interval') {
  const sweep = beginSweep('report-ready')
  try {
    const result = await runReportReadySweep()
    sweep.succeed()
    if (result.sent > 0 || result.superseded > 0 || trigger === 'startup') {
      logger.info('Report-ready sweep completed', { trigger, ...result })
    }
  } catch (error) {
    sweep.fail(error)
    logger.error('Report-ready sweep failed', { error, trigger })
  }
}

function startReportReadyLoop() {
  // A fraction of the deferral window, so the email lands close to when it came
  // due rather than up to a full interval late.
  const intervalMs = 3 * 60 * 1000
  registerSweep('report-ready', { label: 'Case report ready email', enabled: true, intervalMs })
  void runReportReadyLoop('startup')
  reportReadyTimer = setInterval(() => {
    void runReportReadyLoop('interval')
  }, intervalMs)
}

async function runRoutingEscalationLoop(trigger: 'startup' | 'interval') {
  const sweep = beginSweep('routing-escalation')
  try {
    const result = await runRoutingEscalationSweep()
    sweep.succeed()
    if (result.processed > 0 || trigger === 'startup') {
      logger.info('Routing escalation sweep completed', {
        trigger,
        ...result,
      })
    }
  } catch (error) {
    sweep.fail(error)
    logger.error('Routing escalation sweep failed', { error, trigger })
  }
}

function startRoutingEscalationLoop() {
  const intervalMs = 10 * 60 * 1000
  registerSweep('routing-escalation', {
    label: 'Routing escalation',
    enabled: true,
    intervalMs,
  })
  void runRoutingEscalationLoop('startup')
  routingEscalationTimer = setInterval(() => {
    void runRoutingEscalationLoop('interval')
  }, intervalMs)
}

async function runOfferExpiryLoop(trigger: 'startup' | 'interval') {
  const sweep = beginSweep('offer-expiry')
  try {
    const result = await runOfferExpirySweep()
    sweep.succeed()
    if (result.expired > 0 || trigger === 'startup') {
      logger.info('Offer expiry sweep completed', {
        trigger,
        ...result,
      })
    }
  } catch (error) {
    sweep.fail(error)
    logger.error('Offer expiry sweep failed', { error, trigger })
  }
}

function startOfferExpiryLoop() {
  // Attorney response windows are short (minutes). Sweep every 15s so a lapsed
  // offer is re-routed to the next attorney quickly (CP-606) without hammering
  // the DB — the sweep is idempotent and usually finds nothing to expire.
  const intervalMs = 15 * 1000
  registerSweep('offer-expiry', { label: 'Offer expiry', enabled: true, intervalMs })
  void runOfferExpiryLoop('startup')
  offerExpiryTimer = setInterval(() => {
    void runOfferExpiryLoop('interval')
  }, intervalMs)
}

async function runRoutingStallLoop(trigger: 'startup' | 'interval') {
  const sweep = beginSweep('routing-stall')
  try {
    const result = await runRoutingStallSweep()
    sweep.succeed()
    if (result.stalled > 0 || trigger === 'startup') {
      logger.info('Routing stall sweep completed', { trigger, ...result })
    }
  } catch (error) {
    sweep.fail(error)
    logger.error('Routing stall sweep failed', { error, trigger })
  }
}

function startRoutingStallLoop() {
  // A stalled case is already stuck, so finding it a few minutes sooner changes
  // nothing; the scan is the expensive part and hourly keeps it cheap.
  const intervalMs = 60 * 60 * 1000
  registerSweep('routing-stall', { label: 'Stalled routing reconciliation', enabled: true, intervalMs })
  void runRoutingStallLoop('startup')
  routingStallTimer = setInterval(() => {
    void runRoutingStallLoop('interval')
  }, intervalMs)
}

async function runSolExpiryLoop(trigger: 'startup' | 'interval') {
  const sweep = beginSweep('sol-expiry')
  try {
    const result = await runSolExpirySweep()
    sweep.succeed()
    if (result.held > 0 || result.notified > 0 || trigger === 'startup') {
      logger.info('SOL expiry sweep completed', { trigger, ...result })
    }
  } catch (error) {
    sweep.fail(error)
    logger.error('SOL expiry sweep failed', { error, trigger })
  }
}

function startSolExpiryLoop() {
  // The SOL moves a day at a time, so hourly is ample and keeps the scan cheap.
  const intervalMs = 60 * 60 * 1000
  registerSweep('sol-expiry', { label: 'Statute of limitations expiry', enabled: true, intervalMs })
  void runSolExpiryLoop('startup')
  solExpiryTimer = setInterval(() => {
    void runSolExpiryLoop('interval')
  }, intervalMs)
}

async function runEsignEnvelopeLoop(trigger: 'startup' | 'interval') {
  const sweep = beginSweep('esign-envelope')
  try {
    const result = await runEsignEnvelopeSweep()
    sweep.succeed()
    if (result.advanced > 0 || trigger === 'startup') {
      logger.info('E-sign envelope sweep completed', { trigger, ...result })
    }
  } catch (error) {
    sweep.fail(error)
    logger.error('E-sign envelope sweep failed', {
      trigger,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

function startEsignEnvelopeLoop() {
  // A signature the webhook missed holds up the whole case spine, so this is
  // the reconciliation worth running often. Ten minutes keeps the provider's
  // rate limit comfortable while bounding how long a signed retainer can sit
  // unnoticed.
  const intervalMs = 10 * 60 * 1000
  registerSweep('esign-envelope', { label: 'E-signature envelope reconciliation', enabled: true, intervalMs })
  void runEsignEnvelopeLoop('startup')
  esignEnvelopeTimer = setInterval(() => {
    void runEsignEnvelopeLoop('interval')
  }, intervalMs)
}

async function runCaseReminderLoop(trigger: 'startup' | 'interval') {
  const sweep = beginSweep('case-reminder')
  try {
    const result = await runCaseReminderSweep()
    sweep.succeed()
    if (result.sent > 0 || result.failed > 0 || trigger === 'startup') {
      logger.info('Case reminder sweep completed', {
        trigger,
        ...result,
      })
    }
  } catch (error) {
    sweep.fail(error)
    logger.error('Case reminder sweep failed', { error, trigger })
  }
}

function startCaseReminderLoop() {
  const intervalMs = 5 * 60 * 1000
  registerSweep('case-reminder', { label: 'Case reminders', enabled: true, intervalMs })
  void runCaseReminderLoop('startup')
  caseReminderTimer = setInterval(() => {
    void runCaseReminderLoop('interval')
  }, intervalMs)
}

async function runAiCaseManagerLoop(trigger: 'startup' | 'interval') {
  const sweep = beginSweep('ai-case-manager')
  try {
    const result = await runAiCaseManagerSweep()
    sweep.succeed()
    if (result.processed > 0 || trigger === 'startup') {
      logger.info('AI Case Manager sweep completed', { trigger, ...result })
    }
  } catch (error) {
    sweep.fail(error)
    logger.error('AI Case Manager sweep failed', { error, trigger })
  }
}

function startAiCaseManagerLoop() {
  if (!isAiCaseManagerEnabled()) {
    registerSweep('ai-case-manager', { label: 'AI Case Manager (Rose)', enabled: false })
    logger.info('AI Case Manager loop disabled')
    return
  }
  // Proactive re-run cadence for the whole caseload. Event triggers still handle
  // immediate reactions; this catches cases with no recent activity.
  const raw = Number(process.env.AI_CASE_MANAGER_SWEEP_INTERVAL_MS)
  const intervalMs = Number.isFinite(raw) && raw >= 60_000 ? raw : 30 * 60 * 1000
  registerSweep('ai-case-manager', {
    label: 'AI Case Manager (Rose)',
    enabled: true,
    intervalMs,
  })
  void runAiCaseManagerLoop('startup')
  aiCaseManagerTimer = setInterval(() => {
    void runAiCaseManagerLoop('interval')
  }, intervalMs)
}

async function runActivityCanaryLoop(trigger: 'startup' | 'interval') {
  const sweep = beginSweep('activity-canary')
  try {
    const result = await runActivityCanarySweep()
    sweep.succeed()
    if (result.alerted || trigger === 'startup') {
      logger.info('Activity canary sweep completed', { trigger, ...result })
    }
  } catch (error) {
    sweep.fail(error)
    logger.error('Activity canary sweep failed', { error, trigger })
  }
}

function startActivityCanaryLoop() {
  if (!isActivityCanaryEnabled()) {
    registerSweep('activity-canary', { label: 'Activity canary', enabled: false })
    logger.info('Activity canary loop disabled')
    return
  }
  // The canary detects hours-long silence, so sweeping more often than this
  // buys nothing but repeated counts.
  const intervalMs = 30 * 60 * 1000
  registerSweep('activity-canary', { label: 'Activity canary', enabled: true, intervalMs })
  void runActivityCanaryLoop('startup')
  activityCanaryTimer = setInterval(() => {
    void runActivityCanaryLoop('interval')
  }, intervalMs)
}

async function runErrorRateLoop(trigger: 'startup' | 'interval') {
  const sweep = beginSweep('error-rate')
  try {
    const result = await runErrorRateSweep()
    sweep.succeed()
    if (result.alerted) {
      logger.info('Error rate sweep alerted', { trigger, ...result })
    }
  } catch (error) {
    sweep.fail(error)
    logger.error('Error rate sweep failed', { error, trigger })
  }
}

function startErrorRateLoop() {
  if (!isErrorRateMonitorEnabled()) {
    registerSweep('error-rate', { label: 'Error rate monitor', enabled: false })
    logger.info('Error rate monitor disabled')
    return
  }
  // Runs on a fraction of the alert window so a spike is caught partway through
  // it rather than up to a full window late.
  const intervalMs = 5 * 60 * 1000
  registerSweep('error-rate', { label: 'Error rate monitor', enabled: true, intervalMs })
  errorRateTimer = setInterval(() => {
    void runErrorRateLoop('interval')
  }, intervalMs)
}

function startBackgroundLoops() {
  startCalendarWebhookRenewalLoop()
  startAppointmentEngagementLoop()
  startNotificationRetryLoop()
  startIntakeAbandonmentLoop()
  startReportReadyLoop()
  startRoutingEscalationLoop()
  startOfferExpiryLoop()
  startRoutingStallLoop()
  startSolExpiryLoop()
  startEsignEnvelopeLoop()
  startCaseReminderLoop()
  startAiCaseManagerLoop()
  startActivityCanaryLoop()
  startErrorRateLoop()
}

const leadershipHandlers = {
  onAcquire: startBackgroundLoops,
  onRelease: stopBackgroundLoops,
}

const server = app.listen(ENV.PORT, ENV.HOST, () => {
  logger.info(`API server listening on http://${ENV.HOST}:${ENV.PORT}`)
  // Heal any stale attorney rating aggregates left by reviews created before
  // the on-write sync existed, so ratings render everywhere (CP-308/321/326).
  void reconcileAllAttorneyRatingAggregates()

  // The sweeps start only on the instance that wins the lease, not on every
  // instance that boots. They mail claimants, escalate offers to attorneys and
  // generate AI tasks, so a second instance running them in parallel does not
  // share the work — it does all of it twice, silently, with both instances
  // reporting healthy.
  //
  // On a single-instance deployment this is very nearly a no-op: the one
  // process wins immediately and starts everything, one database round trip
  // later than before.
  startSchedulerLeadership(leadershipHandlers)
})

function stopBackgroundLoops() {
  if (calendarWebhookRenewalTimer) clearInterval(calendarWebhookRenewalTimer)
  if (appointmentEngagementTimer) clearInterval(appointmentEngagementTimer)
  if (notificationRetryTimer) clearInterval(notificationRetryTimer)
  if (intakeAbandonmentTimer) clearInterval(intakeAbandonmentTimer)
  if (reportReadyTimer) clearInterval(reportReadyTimer)
  if (routingEscalationTimer) clearInterval(routingEscalationTimer)
  if (offerExpiryTimer) clearInterval(offerExpiryTimer)
  if (routingStallTimer) clearInterval(routingStallTimer)
  if (solExpiryTimer) clearInterval(solExpiryTimer)
  if (esignEnvelopeTimer) clearInterval(esignEnvelopeTimer)
  if (caseReminderTimer) clearInterval(caseReminderTimer)
  if (aiCaseManagerTimer) clearInterval(aiCaseManagerTimer)
  if (activityCanaryTimer) clearInterval(activityCanaryTimer)
  if (errorRateTimer) clearInterval(errorRateTimer)
  calendarWebhookRenewalTimer = null
  appointmentEngagementTimer = null
  notificationRetryTimer = null
  intakeAbandonmentTimer = null
  reportReadyTimer = null
  routingEscalationTimer = null
  offerExpiryTimer = null
  routingStallTimer = null
  solExpiryTimer = null
  esignEnvelopeTimer = null
  caseReminderTimer = null
  aiCaseManagerTimer = null
  activityCanaryTimer = null
  errorRateTimer = null
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
  // Stops the sweeps and expires our lease while the database is still
  // reachable, so the other instance takes over in seconds rather than waiting
  // out the full TTL. This has to happen before $disconnect below.
  await stopSchedulerLeadership(leadershipHandlers)
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

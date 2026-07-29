/**
 * Activity canary.
 *
 * "Up" and "working" are different questions, and production only ever answered
 * the first one. It served traffic for three days while every case-touching
 * query threw, and nothing noticed: /health did not touch the database, no
 * container carried a healthcheck, and an empty audit_logs table looks exactly
 * like a quiet week.
 *
 * The readiness probe and container healthchecks cover a broken API. This covers
 * the remaining case — an API that answers correctly but that nobody can
 * actually use — by treating silence itself as the signal.
 *
 * Tuned to stay quiet unless something is genuinely wrong:
 *   - Never fires without a recent baseline, so a fresh or idle deployment has
 *     nothing to be silent about.
 *   - Alerts at most once per cooldown, so an ongoing outage does not mail the
 *     ops list on every sweep.
 *   - Resets as soon as activity resumes, so recovery re-arms it automatically.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import { notifyAdmins } from './platform-notifications'

const HOUR_MS = 60 * 60 * 1000

/** How far back to look for proof this deployment is used at all. */
const BASELINE_DAYS = 7

export interface ActivityCanaryResult {
  windowHours: number
  eventsInWindow: number
  alerted: boolean
  skipped?: boolean
  reason?: string
}

/** Set once per process; a restart re-arms the alert, which is the safe direction. */
let lastAlertAt: number | null = null

function hoursFromEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name])
  return Number.isFinite(raw) && raw >= 1 ? raw : fallback
}

export function isActivityCanaryEnabled(): boolean {
  return process.env.ACTIVITY_CANARY_ENABLED !== 'false'
}

export async function runActivityCanarySweep(): Promise<ActivityCanaryResult> {
  const windowHours = hoursFromEnv('ACTIVITY_CANARY_WINDOW_HOURS', 6)
  const cooldownHours = hoursFromEnv('ACTIVITY_CANARY_COOLDOWN_HOURS', 12)
  const now = Date.now()

  const eventsInWindow = await prisma.auditLog.count({
    where: { createdAt: { gte: new Date(now - windowHours * HOUR_MS) } },
  })

  if (eventsInWindow > 0) {
    lastAlertAt = null
    return { windowHours, eventsInWindow, alerted: false }
  }

  const baseline = await prisma.auditLog.count({
    where: { createdAt: { gte: new Date(now - BASELINE_DAYS * 24 * HOUR_MS) } },
  })
  if (baseline === 0) {
    return {
      windowHours,
      eventsInWindow,
      alerted: false,
      skipped: true,
      reason: 'No activity baseline to go quiet against',
    }
  }

  if (lastAlertAt !== null && now - lastAlertAt < cooldownHours * HOUR_MS) {
    return { windowHours, eventsInWindow, alerted: false, skipped: true, reason: 'Within alert cooldown' }
  }

  const lastEvent = await prisma.auditLog.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  logger.error('Activity canary: no recorded activity', {
    windowHours,
    baselineEvents: baseline,
    lastEventAt: lastEvent?.createdAt?.toISOString() || null,
  })

  await notifyAdmins({
    subject: `ClearCaseIQ: no recorded activity for ${windowHours}h`,
    message: [
      `No audit-log entries have been recorded in the last ${windowHours} hours.`,
      lastEvent?.createdAt
        ? `Last recorded activity: ${lastEvent.createdAt.toISOString()}.`
        : 'There is no activity on record at all.',
      '',
      'The API can answer requests while every database-backed route fails, so this may be an outage rather than a quiet period.',
      'Check https://api.clearcaseiq.com/health/ready first, then the API container logs.',
    ].join('\n'),
    metadata: {
      eventType: 'ops.activity_canary',
      windowHours,
      lastEventAt: lastEvent?.createdAt?.toISOString() || null,
    },
  })

  lastAlertAt = now
  return { windowHours, eventsInWindow, alerted: true }
}

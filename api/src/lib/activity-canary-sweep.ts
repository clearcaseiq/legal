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
 * That last part only works if silence is unambiguous, and at first it was not.
 * The audit log records `/v1` writes and errors, so an empty window also
 * described an ordinary quiet night. The alert fired on most of them, which is
 * the failure mode that matters most for an alarm: one that cries wolf nightly
 * teaches everyone to swipe past the night it is right.
 *
 * So the sweep writes a heartbeat of its own on every run. A window with no
 * entries can no longer mean "nobody used the product" — the heartbeats would be
 * there — and now means the database stopped accepting writes, which is the
 * condition this was built for. Counted before the heartbeat is written, or the
 * sweep would always find its own evidence and never alert.
 *
 * Tuned to stay quiet unless something is genuinely wrong:
 *   - Never fires without a recent baseline, so a fresh deployment has nothing
 *     to be silent about.
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

/**
 * Marks the sweep's own audit rows.
 *
 * Distinct so the admin activity charts can leave them out: they answer "is
 * anyone using the product", which a row written by a timer does not.
 */
export const ACTIVITY_HEARTBEAT_ACTION = 'SYSTEM activity-canary heartbeat'

export interface ActivityCanaryResult {
  windowHours: number
  eventsInWindow: number
  alerted: boolean
  skipped?: boolean
  reason?: string
  /** False when the heartbeat write failed, which is itself the thing it watches for. */
  heartbeatWritten?: boolean
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

/**
 * Prove the database is still accepting writes.
 *
 * Never throws: a failed heartbeat is the symptom, not an error to abort on, and
 * the alert for it belongs to the next sweep that finds the window empty.
 */
async function writeHeartbeat(): Promise<boolean> {
  try {
    await prisma.auditLog.create({
      // No userId, so this cannot inflate the active-user counts.
      data: { action: ACTIVITY_HEARTBEAT_ACTION, entityType: 'system', statusCode: 200 },
    })
    return true
  } catch (error) {
    logger.error('Activity canary heartbeat write failed', { error })
    return false
  }
}

export async function runActivityCanarySweep(): Promise<ActivityCanaryResult> {
  const result = await evaluateActivity()
  // After the count, always. Writing first would let the sweep satisfy its own
  // check and guarantee it never alerts.
  return { ...result, heartbeatWritten: await writeHeartbeat() }
}

async function evaluateActivity(): Promise<ActivityCanaryResult> {
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
    subject: `ClearCaseIQ: no database writes for ${windowHours}h`,
    message: [
      `No audit-log entries have been written in the last ${windowHours} hours.`,
      lastEvent?.createdAt
        ? `Last entry: ${lastEvent.createdAt.toISOString()}.`
        : 'There is no activity on record at all.',
      '',
      'This is not a quiet period. The scheduler writes a heartbeat entry every time it runs, so an empty window means those writes are failing too — the API can answer requests while every database-backed route throws.',
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

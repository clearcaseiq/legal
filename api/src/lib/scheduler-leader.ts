/**
 * Elects one API instance to run the background sweeps.
 *
 * The sweeps mail claimants, escalate routing offers to attorneys and generate
 * AI tasks. Every instance used to start all of them on boot, which is right on
 * one box and harmful on two: the second does not share the work, it does the
 * same work again, at the same time. It would not have errored. Both instances
 * would have reported healthy while claimants received duplicate statute-of-
 * limitations warnings and offers escalated twice.
 *
 * Implemented as a lease in Postgres rather than session-level advisory locks.
 * `pg_try_advisory_lock` is held by a connection, and Prisma hands out pooled
 * connections, so the lock and its release can land on different ones — it
 * looks correct and silently is not. The transaction-scoped variant avoids that
 * only by holding a transaction open for the whole sweep, which for work that
 * sends email over the network is worse than the problem.
 *
 * A lease also degrades the way we want. If the holder is stopped, killed, or
 * partitioned, its lease expires and the survivor picks the work up on its next
 * tick. Compare a config flag naming one instance the runner: simpler, but the
 * sweeps stop entirely when that instance dies, which forfeits half the point
 * of running two.
 */

import os from 'os'
import { prisma } from './prisma'
import { logger } from './logger'

/** Single row: all sweeps are scheduled together, so they elect together. */
const LEASE_NAME = 'background-sweeps'

/**
 * How long a lease survives without renewal. Must comfortably exceed
 * RENEW_INTERVAL_MS, or an ordinary slow query hands leadership to the other
 * instance while this one still believes it leads.
 */
const LEASE_TTL_SECONDS = 90

/** Renewal cadence. Three attempts fit inside one TTL, so a single failure is survivable. */
const RENEW_INTERVAL_MS = 30_000

/** Identifies the holder in logs and in the ops view. Not used for correctness. */
const HOLDER = `${os.hostname()}:${process.pid}`

/**
 * Consecutive failures after which a lease that cannot be evaluated is treated
 * as a fault rather than a blip. Three ticks is a minute and a half.
 */
const FAILURE_ALERT_THRESHOLD = 3

let renewTimer: NodeJS.Timeout | null = null
let isLeader = false
let everAcquired = false
let consecutiveFailures = 0
let lastError: string | null = null
let lastCheckedAt: number | null = null

export function isSchedulerLeader(): boolean {
  return isLeader
}

export function schedulerHolderId(): string {
  return HOLDER
}

export interface SchedulerLeaseState {
  holder: string
  isLeader: boolean
  /** False on a process that has never won the lease — a standby, or a fault. */
  everAcquired: boolean
  consecutiveFailures: number
  lastError: string | null
  lastCheckedAt: string | null
  leaseTtlSeconds: number
}

/**
 * Reported on the ops status page. Without it, an instance that cannot evaluate
 * the lease looks identical to a healthy standby: no sweeps registered, nothing
 * failing, nothing overdue — because the loops were never started, so there is
 * nothing to be overdue. That is the one way this mechanism could take down all
 * background work quietly, so it is stated explicitly instead of inferred.
 */
export function getSchedulerLeaseState(): SchedulerLeaseState {
  return {
    holder: HOLDER,
    isLeader,
    everAcquired,
    consecutiveFailures,
    lastError,
    lastCheckedAt: lastCheckedAt ? new Date(lastCheckedAt).toISOString() : null,
    leaseTtlSeconds: LEASE_TTL_SECONDS,
  }
}

/**
 * Claims the lease, or renews it if we already hold it.
 *
 * One statement, so the check and the write cannot interleave with another
 * instance doing the same thing. The WHERE on DO UPDATE is what makes it safe:
 * an existing row is only overwritten when it is ours already or has expired,
 * so a live lease held elsewhere leaves zero rows affected and we learn we are
 * not the leader.
 *
 * Every timestamp comes from now() inside the database. Using the application
 * clock would let two instances with a few seconds of skew disagree about
 * whether a lease had expired, and both could conclude they hold it.
 */
async function acquireOrRenew(): Promise<boolean> {
  const affected = await prisma.$executeRaw`
    INSERT INTO scheduler_leases ("name", "holder", "expiresAt", "createdAt", "updatedAt")
    VALUES (
      ${LEASE_NAME},
      ${HOLDER},
      -- Cast explicitly: make_interval takes secs as double precision, and the
      -- driver is free to send a JS number as an integer type, for which the
      -- named-argument call would not resolve.
      now() + make_interval(secs => ${LEASE_TTL_SECONDS}::double precision),
      now(),
      now()
    )
    ON CONFLICT ("name") DO UPDATE
    SET "holder"    = EXCLUDED."holder",
        "expiresAt" = EXCLUDED."expiresAt",
        "updatedAt" = now()
    WHERE scheduler_leases."holder" = EXCLUDED."holder"
       OR scheduler_leases."expiresAt" < now()
  `
  return affected > 0
}

/**
 * Expires our own lease on the way out, so a rolling deploy hands over in
 * seconds instead of leaving the sweeps unowned for the remainder of the TTL.
 * Guarded by holder so a instance that already lost the lease cannot release
 * one now belonging to somebody else.
 */
async function release(): Promise<void> {
  await prisma.$executeRaw`
    UPDATE scheduler_leases
    SET "expiresAt" = now(), "updatedAt" = now()
    WHERE "name" = ${LEASE_NAME} AND "holder" = ${HOLDER}
  `
}

export interface LeadershipHandlers {
  /** Start the sweeps. Called on the tick where leadership is gained. */
  onAcquire: () => void
  /** Stop the sweeps. Called when leadership is lost, and on shutdown. */
  onRelease: () => void
}

/**
 * Begins competing for leadership and keeps competing for the process lifetime.
 *
 * A follower is not idle — it retries on every tick, which is what makes it the
 * standby. Losing the lease mid-run stops the sweeps here rather than letting
 * two instances run them, which is the specific outcome this exists to prevent.
 */
export function startSchedulerLeadership(handlers: LeadershipHandlers): void {
  const tick = async () => {
    let held: boolean
    lastCheckedAt = Date.now()
    try {
      held = await acquireOrRenew()
      consecutiveFailures = 0
      lastError = null
    } catch (error) {
      // Treat an unreachable database as lost leadership. The sweeps all need
      // the database anyway, so continuing to believe we lead would only mean
      // running work that cannot succeed — and risks overlapping with an
      // instance that can still reach it.
      held = false
      consecutiveFailures += 1
      lastError = error instanceof Error ? error.message : String(error)

      // Escalate a persistent failure, and say what it costs. A process that
      // has never once held the lease is not a standby waiting its turn; it is
      // a deployment where nothing runs the sweeps at all, and the symptom —
      // no reminders, no escalations, no AI tasks — otherwise shows up days
      // later as "the emails stopped" with nothing obviously broken.
      if (consecutiveFailures >= FAILURE_ALERT_THRESHOLD && !everAcquired) {
        logger.error('Scheduler lease unavailable since boot; NO background sweeps are running', {
          error,
          holder: HOLDER,
          consecutiveFailures,
        })
      } else {
        logger.error('Scheduler lease check failed; standing down', {
          error,
          holder: HOLDER,
          consecutiveFailures,
        })
      }
    }

    if (held && !isLeader) {
      isLeader = true
      everAcquired = true
      logger.info('Acquired scheduler leadership; starting background sweeps', {
        holder: HOLDER,
        leaseTtlSeconds: LEASE_TTL_SECONDS,
      })
      handlers.onAcquire()
      return
    }

    if (!held && isLeader) {
      isLeader = false
      logger.warn('Lost scheduler leadership; stopping background sweeps', { holder: HOLDER })
      handlers.onRelease()
    }
  }

  void tick()
  renewTimer = setInterval(() => {
    void tick()
  }, RENEW_INTERVAL_MS)
  // Do not hold the event loop open for the sake of the renewal timer.
  renewTimer.unref?.()
}

export async function stopSchedulerLeadership(handlers: LeadershipHandlers): Promise<void> {
  if (renewTimer) clearInterval(renewTimer)
  renewTimer = null

  if (!isLeader) return
  isLeader = false
  handlers.onRelease()

  try {
    await release()
    logger.info('Released scheduler leadership', { holder: HOLDER })
  } catch (error) {
    // Not fatal: the lease expires on its own within the TTL. Worth recording,
    // because it explains a gap in sweep activity right after a deploy.
    logger.warn('Could not release scheduler lease; it will expire instead', {
      error,
      holder: HOLDER,
      expiresInSeconds: LEASE_TTL_SECONDS,
    })
  }
}

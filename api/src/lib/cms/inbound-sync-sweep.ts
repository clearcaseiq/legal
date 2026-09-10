/**
 * Keeps opted-in CMS connections pulling on their own.
 *
 * `syncConnectionInbound` is the one-connection operation; this decides which
 * connections are due and runs them one at a time. Sequential on purpose:
 * concurrent runs would hammer several firms' CMS quotas at once for no gain,
 * and the whole point of an incremental pull is that each pass is small.
 *
 * Only connections that have been explicitly opted in are touched. Having
 * working credentials is not consent to pull a firm's entire caseload into a
 * marketplace product — see the header of inbound-sync.ts.
 */
import { prisma } from '../prisma'
import { logger } from '../logger'
import { getConnector } from './registry'
import { supportsInboundSync } from './types'
import {
  inboundSyncEnabled,
  syncConnectionInbound,
  InboundSyncDisabledError,
  InboundSyncUnsupportedError,
} from './inbound-sync'

/**
 * How stale a connection has to be before it is swept again.
 *
 * Six hours rather than minutes because nothing downstream is waiting on this.
 * A matter that appears in the firm's CMS at 9am is no less useful at 3pm, and
 * every pass spends someone else's API quota.
 */
export const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000

/**
 * Connections per pass. Bounds one sweep so a deployment with many connected
 * firms cannot occupy the background loop indefinitely; the rest are picked up
 * on the next pass, oldest first.
 */
const MAX_CONNECTIONS_PER_RUN = 10

/**
 * Pages per connection per pass, well under the 20 a manual run allows. A firm
 * with a large back catalogue is imported over several passes rather than in
 * one long run, and `nextCursor` is deliberately not carried between passes —
 * an unfinished run leaves `lastSyncedAt` alone, so the next pass re-reads from
 * the same watermark and dedupe skips what already landed.
 */
const MAX_PAGES_PER_CONNECTION = 5

export interface InboundSyncSweepResult {
  /** Connections that were due and attempted. */
  attempted: number
  /** Connections that completed without throwing. */
  succeeded: number
  failed: number
  /** Cases created across every connection in this pass. */
  imported: number
  /** Matters looked at but not created, for any reason. */
  skipped: number
}

const EMPTY: InboundSyncSweepResult = {
  attempted: 0,
  succeeded: 0,
  failed: 0,
  imported: 0,
  skipped: 0,
}

/**
 * Connections opted in, healthy enough to try, and not synced recently.
 *
 * `inboundSyncEnabled` lives inside the config JSON, which cannot be queried
 * relationally, so the filtering that can be pushed into the database is and
 * the opt-in check is applied here.
 */
async function dueConnections(now: number) {
  const candidates = await prisma.cmsConnection.findMany({
    where: {
      status: { not: 'revoked' },
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: new Date(now - SYNC_INTERVAL_MS) } }],
    },
    // Never-synced first, then longest-waiting. A firm that has just connected
    // sees their caseload arrive rather than waiting behind everyone else.
    orderBy: [{ lastSyncedAt: { sort: 'asc', nulls: 'first' } }],
    select: { id: true, provider: true, config: true, lawFirmId: true },
    take: MAX_CONNECTIONS_PER_RUN * 4,
  })

  return candidates
    .filter((connection) => inboundSyncEnabled(safeJson(connection.config)))
    .filter((connection) => supportsInboundSync(getConnector(connection.provider)))
    .slice(0, MAX_CONNECTIONS_PER_RUN)
}

/**
 * Pull from every connection that is due. Never throws.
 *
 * One firm's expired token or unreachable CMS must not stop the others, and
 * must not take down the background loop that also runs sweeps people depend
 * on. `syncConnectionInbound` already records the failure against the
 * connection, so a firm can see it in their integrations screen.
 */
export async function runInboundSyncSweep(): Promise<InboundSyncSweepResult> {
  const connections = await dueConnections(Date.now())
  if (!connections.length) return { ...EMPTY }

  const result: InboundSyncSweepResult = { ...EMPTY }

  for (const connection of connections) {
    result.attempted += 1
    try {
      const run = await syncConnectionInbound({
        connectionId: connection.id,
        maxPages: MAX_PAGES_PER_CONNECTION,
      })
      result.succeeded += 1
      result.imported += run.imported
      result.skipped += run.skipped.length

      if (run.imported > 0 || !run.reachedEnd) {
        logger.info('Inbound CMS sync pass completed', {
          connectionId: connection.id,
          provider: connection.provider,
          imported: run.imported,
          skipped: run.skipped.length,
          reachedEnd: run.reachedEnd,
        })
      }
    } catch (error) {
      result.failed += 1
      // Someone turning the opt-in off, or a provider losing its pull support,
      // between the filter above and the call. Expected, not a fault.
      if (error instanceof InboundSyncDisabledError || error instanceof InboundSyncUnsupportedError) {
        logger.debug('Skipped a connection that is no longer syncable', {
          connectionId: connection.id,
          reason: error.message,
        })
        continue
      }
      logger.error('Inbound CMS sync pass failed', {
        connectionId: connection.id,
        provider: connection.provider,
        error,
      })
    }
  }

  return result
}

function safeJson(text: string | null | undefined): Record<string, unknown> | null {
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

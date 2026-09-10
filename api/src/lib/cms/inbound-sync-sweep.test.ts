/**
 * The scheduled half of pull sync: which connections get swept, and what one
 * broken firm does to everyone else's.
 *
 * The refusals matter more than the successes, same as inbound-sync itself.
 * This runs unattended against connections nobody is watching, so the tests are
 * weighted towards it not touching a firm that never opted in, not re-reading a
 * connection that was swept an hour ago, and not letting one expired token stop
 * the rest of the pass.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../prisma', () => import('../../test/universalPrismaMock'))
vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const syncConnectionInbound = vi.fn()

vi.mock('./registry', () => ({
  getConnector: (provider: string) =>
    // Zapier is push-only, which is the real asymmetry the sweep has to respect.
    provider === 'zapier' ? { id: 'zapier' } : { id: provider, listMatters: vi.fn() },
}))

vi.mock('./inbound-sync', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./inbound-sync')>()),
  syncConnectionInbound: (...args: unknown[]) => syncConnectionInbound(...args),
}))

import { prisma } from '../prisma'
import { resetUniversalPrismaMock } from '../../test/universalPrismaMock'
import { InboundSyncDisabledError } from './inbound-sync'
import { runInboundSyncSweep, SYNC_INTERVAL_MS } from './inbound-sync-sweep'

function connection(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conn-1',
    provider: 'clio',
    lawFirmId: 'firm-1',
    config: JSON.stringify({ inboundSyncEnabled: true }),
    ...overrides,
  }
}

/** What syncConnectionInbound reports for a pass that created `imported` cases. */
function run(overrides: Record<string, unknown> = {}) {
  return {
    imported: 0,
    skipped: [],
    reachedEnd: true,
    assessmentIds: [],
    ...overrides,
  }
}

const given = (rows: ReturnType<typeof connection>[]) =>
  vi.mocked(prisma.cmsConnection.findMany).mockResolvedValue(rows as never)

const syncedIds = () => syncConnectionInbound.mock.calls.map((call) => call[0].connectionId)

beforeEach(() => {
  resetUniversalPrismaMock()
  syncConnectionInbound.mockReset().mockResolvedValue(run())
})

describe('which connections get swept', () => {
  it('syncs a connection that has opted in', async () => {
    given([connection()])

    const result = await runInboundSyncSweep()

    expect(syncedIds()).toEqual(['conn-1'])
    expect(result).toMatchObject({ attempted: 1, succeeded: 1, failed: 0 })
  })

  /**
   * The load-bearing refusal. Having working credentials is not consent to pull
   * a firm's entire caseload into a marketplace product; the opt-in is.
   */
  it('leaves a connection that never opted in alone', async () => {
    given([connection({ config: JSON.stringify({ region: 'us' }) })])

    const result = await runInboundSyncSweep()

    expect(syncConnectionInbound).not.toHaveBeenCalled()
    expect(result.attempted).toBe(0)
  })

  it('leaves a connection with no config alone', async () => {
    given([connection({ config: null })])

    await runInboundSyncSweep()

    expect(syncConnectionInbound).not.toHaveBeenCalled()
  })

  it('leaves a connection with unparseable config alone', async () => {
    given([connection({ config: '{not json' })])

    await runInboundSyncSweep()

    expect(syncConnectionInbound).not.toHaveBeenCalled()
  })

  /** A firm can push to Zapier, but there is nothing there to read back. */
  it('skips a provider that cannot be read from', async () => {
    given([connection({ id: 'conn-zap', provider: 'zapier' })])

    await runInboundSyncSweep()

    expect(syncConnectionInbound).not.toHaveBeenCalled()
  })

  it('does not call out at all when nothing is due', async () => {
    given([])

    const result = await runInboundSyncSweep()

    expect(result).toMatchObject({ attempted: 0, imported: 0 })
    expect(syncConnectionInbound).not.toHaveBeenCalled()
  })
})

describe('how often a connection is read', () => {
  /**
   * The database does the date filtering, so what is asserted is the window it
   * is asked for. Reading a firm's CMS every pass would spend their quota for
   * nothing — a matter that appeared this morning is no less useful this
   * afternoon.
   */
  it('asks only for connections outside the sync interval', async () => {
    given([])
    const before = Date.now()

    await runInboundSyncSweep()

    const where = vi.mocked(prisma.cmsConnection.findMany).mock.calls[0][0]?.where as any
    const cutoff = where.OR[1].lastSyncedAt.lt as Date
    expect(cutoff.getTime()).toBeLessThanOrEqual(before - SYNC_INTERVAL_MS + 1000)
    expect(cutoff.getTime()).toBeGreaterThan(before - SYNC_INTERVAL_MS - 60_000)
  })

  /** A firm that just connected should see their caseload, not wait in line. */
  it('takes never-synced connections first', async () => {
    given([])

    await runInboundSyncSweep()

    const args = vi.mocked(prisma.cmsConnection.findMany).mock.calls[0][0] as any
    expect(args.orderBy).toEqual([{ lastSyncedAt: { sort: 'asc', nulls: 'first' } }])
  })

  it('never sweeps a revoked connection', async () => {
    given([])

    await runInboundSyncSweep()

    const where = vi.mocked(prisma.cmsConnection.findMany).mock.calls[0][0]?.where as any
    expect(where.status).toEqual({ not: 'revoked' })
  })

  /**
   * A back catalogue is imported over several passes. Each pass takes fewer
   * pages than a manual run, and an unfinished run leaves the watermark alone
   * so the next one picks up the tail rather than skipping it.
   */
  it('bounds the pages one connection takes in a pass', async () => {
    given([connection()])

    await runInboundSyncSweep()

    expect(syncConnectionInbound.mock.calls[0][0].maxPages).toBeLessThan(20)
  })
})

describe('when one firm fails', () => {
  it('carries on with the rest of the pass', async () => {
    given([connection({ id: 'conn-1' }), connection({ id: 'conn-2' }), connection({ id: 'conn-3' })])
    syncConnectionInbound
      .mockResolvedValueOnce(run({ imported: 2 }))
      .mockRejectedValueOnce(new Error('Token has been expired or revoked.'))
      .mockResolvedValueOnce(run({ imported: 1 }))

    const result = await runInboundSyncSweep()

    expect(syncedIds()).toEqual(['conn-1', 'conn-2', 'conn-3'])
    expect(result).toMatchObject({ attempted: 3, succeeded: 2, failed: 1, imported: 3 })
  })

  /** The sweep runs inside a loop that also drives things people depend on. */
  it('never throws', async () => {
    given([connection()])
    syncConnectionInbound.mockRejectedValue(new Error('CMS is down'))

    await expect(runInboundSyncSweep()).resolves.toMatchObject({ failed: 1 })
  })

  /** Someone turning the opt-in off mid-pass is expected, not a fault. */
  it('treats a connection disabled mid-pass as unremarkable', async () => {
    given([connection()])
    syncConnectionInbound.mockRejectedValue(new InboundSyncDisabledError())

    const result = await runInboundSyncSweep()

    expect(result).toMatchObject({ attempted: 1, succeeded: 0, failed: 1, imported: 0 })
  })
})

describe('what the pass reports', () => {
  it('totals imports and skips across connections', async () => {
    given([connection({ id: 'conn-1' }), connection({ id: 'conn-2' })])
    syncConnectionInbound
      .mockResolvedValueOnce(run({ imported: 3, skipped: [{ reason: 'duplicate' }, { reason: 'duplicate' }] }))
      .mockResolvedValueOnce(run({ imported: 1, skipped: [{ reason: 'missing_incident_date' }] }))

    const result = await runInboundSyncSweep()

    expect(result).toMatchObject({ imported: 4, skipped: 3, succeeded: 2 })
  })
})

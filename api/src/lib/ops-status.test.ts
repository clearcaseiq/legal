import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import {
  beginSweep,
  checkSchemaDrift,
  getSweepStates,
  registerSweep,
  runReadinessProbes,
} from './ops-status'

describe('runReadinessProbes', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('reports a failing probe by name without throwing', async () => {
    vi.mocked(prisma.assessment.findFirst).mockRejectedValue(
      new Error('The column `assessments.caseName` does not exist in the current database.')
    )

    const result = await runReadinessProbes()

    expect(result.ok).toBe(false)
    expect(result.failed).toEqual(['assessment'])
    expect(result.probes.find((p) => p.name === 'assessment')?.error).toContain('caseName')
    // A failure must not stop the remaining probes; partial information is what
    // makes the difference between "the database is gone" and "one table drifted".
    expect(result.probes).toHaveLength(5)
    expect(result.probes.filter((p) => p.ok)).toHaveLength(4)
  })

  it('passes when every model is queryable', async () => {
    const result = await runReadinessProbes()
    expect(result.ok).toBe(true)
    expect(result.failed).toEqual([])
  })
})

describe('checkSchemaDrift', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('names the exact column the database is missing', async () => {
    // Report every column the client expects except assessments.caseName — the
    // real drift that took production down for three days.
    const { Prisma } = await import('@prisma/client')
    const rows = Prisma.dmmf.datamodel.models.flatMap((model) => {
      const table = model.dbName || model.name
      return model.fields
        .filter((field) => field.kind !== 'object')
        .map((field) => ({ table_name: table, column_name: field.dbName || field.name }))
        .filter((row) => !(row.table_name === 'assessments' && row.column_name === 'caseName'))
    })
    vi.mocked(prisma.$queryRaw).mockResolvedValue(rows as any)

    const result = await checkSchemaDrift()

    expect(result.ok).toBe(false)
    expect(result.missingTables).toEqual([])
    expect(result.missingColumns).toEqual([{ table: 'assessments', column: 'caseName' }])
  })

  it('is clean when the database matches the client, and ignores unmanaged tables', async () => {
    const { Prisma } = await import('@prisma/client')
    const rows = Prisma.dmmf.datamodel.models.flatMap((model) =>
      model.fields
        .filter((field) => field.kind !== 'object')
        .map((field) => ({
          table_name: model.dbName || model.name,
          column_name: field.dbName || field.name,
        }))
    )
    rows.push({ table_name: 'user_sessions', column_name: 'sid' })
    rows.push({ table_name: 'legal_document_chunks', column_name: 'id' })
    vi.mocked(prisma.$queryRaw).mockResolvedValue(rows as any)

    const result = await checkSchemaDrift()

    expect(result.ok).toBe(true)
    expect(result.checkedTables).toBeGreaterThan(0)
    // Owned by no model, but harmless — reported separately, not as drift.
    expect(result.unexpectedTables).toEqual(['legal_document_chunks'])
  })

  it('degrades to an error instead of throwing when the database is unreachable', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('connection refused'))

    const result = await checkSchemaDrift()

    expect(result.ok).toBe(false)
    expect(result.error).toContain('connection refused')
  })
})

describe('sweep tracking', () => {
  it('records success, failure, and the resulting state', async () => {
    registerSweep('test-sweep', { label: 'Test sweep', enabled: true, intervalMs: 60_000 })

    beginSweep('test-sweep').succeed()
    let state = (await getSweepStates()).find((s) => s.name === 'test-sweep')!
    expect(state.status).toBe('ok')
    expect(state.runs).toBe(1)
    expect(state.failures).toBe(0)
    expect(state.lastError).toBeNull()

    beginSweep('test-sweep').fail(new Error('boom'))
    state = (await getSweepStates()).find((s) => s.name === 'test-sweep')!
    expect(state.status).toBe('failed')
    expect(state.runs).toBe(2)
    expect(state.failures).toBe(1)
    expect(state.lastError).toBe('boom')

    // Recovery clears the error rather than leaving a stale one on screen.
    beginSweep('test-sweep').succeed()
    state = (await getSweepStates()).find((s) => s.name === 'test-sweep')!
    expect(state.status).toBe('ok')
    expect(state.lastError).toBeNull()
  })

  it('flags a sweep as overdue once it misses two intervals', async () => {
    vi.useFakeTimers()
    try {
      registerSweep('slow-sweep', { label: 'Slow sweep', enabled: true, intervalMs: 60_000 })
      beginSweep('slow-sweep').succeed()

      vi.advanceTimersByTime(90_000)
      expect((await getSweepStates()).find((s) => s.name === 'slow-sweep')!.stale).toBe(false)

      vi.advanceTimersByTime(60_000)
      expect((await getSweepStates()).find((s) => s.name === 'slow-sweep')!.stale).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports a disabled loop as disabled rather than as never having run', async () => {
    registerSweep('off-sweep', { label: 'Off sweep', enabled: false })
    const state = (await getSweepStates()).find((s) => s.name === 'off-sweep')!
    expect(state.status).toBe('disabled')
    expect(state.stale).toBe(false)
  })

  it('reports jobs running on another instance', async () => {
    // A standby: it has registered nothing and run nothing, because the loops
    // only start on whichever instance holds the scheduler lease. Before these
    // rows were persisted it returned an empty list, and the status page —
    // finding nothing failing and nothing overdue — called the environment
    // healthy while showing no jobs at all.
    vi.mocked(prisma.sweepRun.findMany).mockResolvedValueOnce([
      {
        name: 'sol-expiry',
        label: 'SOL expiry warnings',
        enabled: true,
        intervalMs: 3_600_000,
        holder: 'other-host:1:9f2c1a4b',
        lastStartedAt: new Date('2026-08-26T01:00:00Z'),
        lastFinishedAt: new Date('2026-08-26T01:00:04Z'),
        lastDurationMs: 4_000,
        ok: true,
        lastError: null,
        runs: 12,
        failures: 0,
        createdAt: new Date('2026-08-25T00:00:00Z'),
        updatedAt: new Date('2026-08-26T01:00:04Z'),
      },
    ] as any)

    const states = await getSweepStates()
    const sol = states.find((s) => s.name === 'sol-expiry')!

    expect(sol.label).toBe('SOL expiry warnings')
    expect(sol.status).toBe('ok')
    expect(sol.runs).toBe(12)
  })

  it('falls back to this process when the sweep table cannot be read', async () => {
    registerSweep('local-only', { label: 'Local only', enabled: true, intervalMs: 60_000 })
    beginSweep('local-only').succeed()

    vi.mocked(prisma.sweepRun.findMany).mockRejectedValueOnce(new Error('connection refused'))

    const state = (await getSweepStates()).find((s) => s.name === 'local-only')!
    expect(state.status).toBe('ok')
  })
})

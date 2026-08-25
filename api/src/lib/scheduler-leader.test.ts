import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

/**
 * Leadership is module-level state, so every test gets a fresh copy of the
 * module — and a fresh prisma mock with it, since resetting the registry
 * re-evaluates both.
 */
async function load() {
  vi.resetModules()
  const { prisma } = await import('./prisma')
  const leader = await import('./scheduler-leader')
  return { prisma: prisma as any, ...leader }
}

/** Runs the initial tick, which is dispatched without being awaited. */
async function flush() {
  await vi.advanceTimersByTimeAsync(0)
}

/** Mirrors FAILURE_ALERT_THRESHOLD in the module under test. */
const FAILURES_BEFORE_ALERT = 3

/** Concatenated SQL text of a tagged-template call, for asserting intent. */
function sqlOf(call: unknown[]): string {
  return (call[0] as string[]).join(' ? ')
}

describe('scheduler leadership', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts the sweeps on the instance that wins the lease', async () => {
    const { prisma, startSchedulerLeadership } = await load()
    prisma.$executeRaw.mockResolvedValue(1)
    const onAcquire = vi.fn()
    const onRelease = vi.fn()

    startSchedulerLeadership({ onAcquire, onRelease })
    await flush()

    expect(onAcquire).toHaveBeenCalledTimes(1)
    expect(onRelease).not.toHaveBeenCalled()
  })

  it('leaves the sweeps stopped on an instance that does not hold the lease', async () => {
    const { prisma, startSchedulerLeadership, isSchedulerLeader } = await load()
    // Zero rows affected: the conflicting row is a live lease held elsewhere.
    prisma.$executeRaw.mockResolvedValue(0)
    const onAcquire = vi.fn()
    const onRelease = vi.fn()

    startSchedulerLeadership({ onAcquire, onRelease })
    await flush()

    expect(onAcquire).not.toHaveBeenCalled()
    expect(isSchedulerLeader()).toBe(false)
  })

  it('does not restart the sweeps on every renewal', async () => {
    const { prisma, startSchedulerLeadership } = await load()
    prisma.$executeRaw.mockResolvedValue(1)
    const onAcquire = vi.fn()

    startSchedulerLeadership({ onAcquire, onRelease: vi.fn() })
    await flush()
    await vi.advanceTimersByTimeAsync(30_000 * 4)

    // Renewing is not re-acquiring; starting the loops again would leave the
    // previous set of intervals running and duplicate the work on one box.
    expect(onAcquire).toHaveBeenCalledTimes(1)
  })

  it('stops the sweeps as soon as the lease is lost', async () => {
    const { prisma, startSchedulerLeadership, isSchedulerLeader } = await load()
    prisma.$executeRaw.mockResolvedValue(1)
    const onAcquire = vi.fn()
    const onRelease = vi.fn()

    startSchedulerLeadership({ onAcquire, onRelease })
    await flush()
    expect(isSchedulerLeader()).toBe(true)

    // Another instance took the lease over after this one stalled past the TTL.
    prisma.$executeRaw.mockResolvedValue(0)
    await vi.advanceTimersByTimeAsync(30_000)

    // This is the whole point of the mechanism: the moment the other instance
    // owns the sweeps, this one must not still be running them.
    expect(onRelease).toHaveBeenCalledTimes(1)
    expect(isSchedulerLeader()).toBe(false)
  })

  it('stands down when the database cannot be reached', async () => {
    const { prisma, startSchedulerLeadership, isSchedulerLeader } = await load()
    prisma.$executeRaw.mockResolvedValue(1)
    const onRelease = vi.fn()

    startSchedulerLeadership({ onAcquire: vi.fn(), onRelease })
    await flush()

    prisma.$executeRaw.mockRejectedValue(new Error('connection terminated'))
    await vi.advanceTimersByTimeAsync(30_000)

    // An unreachable database means the lease cannot be renewed, so it will
    // expire and someone else will take it. Continuing to run here would be the
    // overlap this exists to prevent.
    expect(onRelease).toHaveBeenCalledTimes(1)
    expect(isSchedulerLeader()).toBe(false)
  })

  it('recovers leadership after a transient failure', async () => {
    const { prisma, startSchedulerLeadership, isSchedulerLeader } = await load()
    prisma.$executeRaw.mockRejectedValue(new Error('connection terminated'))

    startSchedulerLeadership({ onAcquire: vi.fn(), onRelease: vi.fn() })
    await flush()
    expect(isSchedulerLeader()).toBe(false)

    prisma.$executeRaw.mockResolvedValue(1)
    await vi.advanceTimersByTimeAsync(30_000)

    // A follower keeps competing; that is what makes it the standby rather
    // than a process that has simply given up.
    expect(isSchedulerLeader()).toBe(true)
  })

  it('expires only its own lease on shutdown', async () => {
    const { prisma, startSchedulerLeadership, stopSchedulerLeadership, schedulerHolderId } = await load()
    prisma.$executeRaw.mockResolvedValue(1)
    const onRelease = vi.fn()

    startSchedulerLeadership({ onAcquire: vi.fn(), onRelease })
    await flush()

    prisma.$executeRaw.mockClear()
    await stopSchedulerLeadership({ onAcquire: vi.fn(), onRelease })

    expect(onRelease).toHaveBeenCalledTimes(1)
    const call = prisma.$executeRaw.mock.calls.at(-1)!
    expect(sqlOf(call)).toContain('UPDATE scheduler_leases')
    // Scoped by holder, so an instance that already lost the lease cannot
    // release one that now belongs to another.
    expect(call).toContain(schedulerHolderId())
  })

  it('does not touch the lease on shutdown if it never held one', async () => {
    const { prisma, startSchedulerLeadership, stopSchedulerLeadership } = await load()
    prisma.$executeRaw.mockResolvedValue(0)
    const onRelease = vi.fn()

    startSchedulerLeadership({ onAcquire: vi.fn(), onRelease })
    await flush()

    prisma.$executeRaw.mockClear()
    await stopSchedulerLeadership({ onAcquire: vi.fn(), onRelease })

    expect(prisma.$executeRaw).not.toHaveBeenCalled()
    expect(onRelease).not.toHaveBeenCalled()
  })

  it('survives a release that fails, since the lease expires on its own', async () => {
    const { prisma, startSchedulerLeadership, stopSchedulerLeadership } = await load()
    prisma.$executeRaw.mockResolvedValue(1)

    startSchedulerLeadership({ onAcquire: vi.fn(), onRelease: vi.fn() })
    await flush()

    prisma.$executeRaw.mockRejectedValue(new Error('connection terminated'))
    await expect(stopSchedulerLeadership({ onAcquire: vi.fn(), onRelease: vi.fn() })).resolves.toBeUndefined()
  })

  it('distinguishes a healthy standby from an instance that has never held the lease', async () => {
    const { prisma, startSchedulerLeadership, getSchedulerLeaseState } = await load()
    prisma.$executeRaw.mockResolvedValue(0)

    startSchedulerLeadership({ onAcquire: vi.fn(), onRelease: vi.fn() })
    await flush()

    // Standby: someone else holds it, nothing is wrong.
    expect(getSchedulerLeaseState()).toMatchObject({
      isLeader: false,
      everAcquired: false,
      consecutiveFailures: 0,
      lastError: null,
    })

    prisma.$executeRaw.mockRejectedValue(new Error('relation "scheduler_leases" does not exist'))
    await vi.advanceTimersByTimeAsync(30_000 * 3)

    // Fault: indistinguishable from the standby above by looking at the sweeps,
    // because neither has any. The lease state is what tells them apart.
    const state = getSchedulerLeaseState()
    expect(state.everAcquired).toBe(false)
    expect(state.consecutiveFailures).toBeGreaterThanOrEqual(FAILURES_BEFORE_ALERT)
    expect(state.lastError).toContain('scheduler_leases')
  })

  it('clears the failure count once the lease can be read again', async () => {
    const { prisma, startSchedulerLeadership, getSchedulerLeaseState } = await load()
    prisma.$executeRaw.mockRejectedValue(new Error('connection terminated'))

    startSchedulerLeadership({ onAcquire: vi.fn(), onRelease: vi.fn() })
    await flush()
    expect(getSchedulerLeaseState().consecutiveFailures).toBe(1)

    prisma.$executeRaw.mockResolvedValue(1)
    await vi.advanceTimersByTimeAsync(30_000)

    expect(getSchedulerLeaseState()).toMatchObject({
      isLeader: true,
      everAcquired: true,
      consecutiveFailures: 0,
      lastError: null,
    })
  })

  it('claims the lease only when it is unheld, expired, or already ours', async () => {
    const { prisma, startSchedulerLeadership } = await load()
    prisma.$executeRaw.mockResolvedValue(1)

    startSchedulerLeadership({ onAcquire: vi.fn(), onRelease: vi.fn() })
    await flush()

    const sql = sqlOf(prisma.$executeRaw.mock.calls[0])
    expect(sql).toContain('ON CONFLICT')
    expect(sql).toContain('scheduler_leases."expiresAt" < now()')
    // Expiry is judged by the database clock. Comparing against a timestamp
    // computed in Node would let two instances whose clocks differ both decide
    // the lease had expired.
    expect(sql).not.toMatch(/expiresAt"\s*<\s*\?/)
  })
})

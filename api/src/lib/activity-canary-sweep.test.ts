/**
 * The canary alerts on silence, so everything here turns on what silence is
 * allowed to mean.
 *
 * Before the heartbeat, an empty window also described an ordinary quiet night,
 * and the alert fired on most of them. The heartbeat removes that reading — but
 * only while it is written after the window is counted. Write it first and the
 * sweep finds its own row every time, the count is never zero, and the alarm is
 * silently dead with nothing to show for it. That ordering is the case below
 * worth keeping.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./platform-notifications', () => ({ notifyAdmins: vi.fn().mockResolvedValue(1) }))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { notifyAdmins } from './platform-notifications'

/** Fresh module per test, because the alert cooldown is process-lifetime state. */
async function loadSweep() {
  vi.resetModules()
  return import('./activity-canary-sweep')
}

/** `count` is called for the window first, then the 7-day baseline. */
function givenCounts({ window: inWindow, baseline }: { window: number; baseline: number }) {
  vi.mocked(prisma.auditLog.count)
    .mockResolvedValueOnce(inWindow as never)
    .mockResolvedValueOnce(baseline as never)
}

describe('runActivityCanarySweep', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(notifyAdmins).mockClear()
  })

  it('counts the window before writing its own heartbeat', async () => {
    const { runActivityCanarySweep } = await loadSweep()
    const order: string[] = []
    vi.mocked(prisma.auditLog.count).mockImplementation(() => {
      order.push('count')
      return Promise.resolve(0)
    })
    vi.mocked(prisma.auditLog.create).mockImplementation(() => {
      order.push('create')
      return Promise.resolve({} as never)
    })

    await runActivityCanarySweep()

    expect(order.indexOf('create')).toBeGreaterThan(-1)
    expect(order.indexOf('count')).toBeLessThan(order.indexOf('create'))
  })

  it('alerts when the window is empty despite a baseline', async () => {
    const { runActivityCanarySweep } = await loadSweep()
    givenCounts({ window: 0, baseline: 400 })

    const result = await runActivityCanarySweep()

    expect(result.alerted).toBe(true)
    expect(notifyAdmins).toHaveBeenCalledTimes(1)
    // Names the real condition, so nobody reads it as a quiet period.
    expect(vi.mocked(notifyAdmins).mock.calls[0][0].subject).toMatch(/no database writes/i)
  })

  it('stays quiet while anything is still being written', async () => {
    const { runActivityCanarySweep } = await loadSweep()
    givenCounts({ window: 1, baseline: 400 })

    const result = await runActivityCanarySweep()

    expect(result.alerted).toBe(false)
    expect(notifyAdmins).not.toHaveBeenCalled()
  })

  it('still records a heartbeat on the healthy path', async () => {
    const { runActivityCanarySweep, ACTIVITY_HEARTBEAT_ACTION } = await loadSweep()
    givenCounts({ window: 12, baseline: 400 })

    const result = await runActivityCanarySweep()

    expect(result.heartbeatWritten).toBe(true)
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: { action: ACTIVITY_HEARTBEAT_ACTION, entityType: 'system', statusCode: 200 },
    })
  })

  it('holds the alert for the cooldown rather than mailing on every sweep', async () => {
    const { runActivityCanarySweep } = await loadSweep()
    // Both sweeps see the same thing: an empty window over a live baseline.
    givenCounts({ window: 0, baseline: 400 })
    givenCounts({ window: 0, baseline: 400 })

    await runActivityCanarySweep()
    const second = await runActivityCanarySweep()

    expect(second.alerted).toBe(false)
    expect(second.reason).toMatch(/cooldown/i)
    expect(notifyAdmins).toHaveBeenCalledTimes(1)
  })

  it('reports a failed heartbeat instead of aborting the sweep', async () => {
    const { runActivityCanarySweep } = await loadSweep()
    givenCounts({ window: 5, baseline: 400 })
    vi.mocked(prisma.auditLog.create).mockRejectedValue(new Error('read-only transaction') as never)

    const result = await runActivityCanarySweep()

    expect(result.heartbeatWritten).toBe(false)
    expect(result.eventsInWindow).toBe(5)
  })

  it('says nothing on a fresh deployment with no baseline to go quiet against', async () => {
    const { runActivityCanarySweep } = await loadSweep()
    givenCounts({ window: 0, baseline: 0 })

    const result = await runActivityCanarySweep()

    expect(result.alerted).toBe(false)
    expect(result.skipped).toBe(true)
    expect(notifyAdmins).not.toHaveBeenCalled()
  })
})

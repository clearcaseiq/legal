import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./case-notifications', () => ({
  notifyAttorneyInApp: vi.fn().mockResolvedValue(true),
}))
vi.mock('./routing-lifecycle', () => ({
  recordRoutingEvent: vi.fn().mockResolvedValue(undefined),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { notifyAttorneyInApp } from './case-notifications'
import { recordRoutingEvent } from './routing-lifecycle'
import { runSolExpirySweep } from './sol-expiry-sweep'

const notifyMock = vi.mocked(notifyAttorneyInApp)
const routingEventMock = vi.mocked(recordRoutingEvent)

const DAY_MS = 24 * 3600 * 1000

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString().split('T')[0]
}

function lead(overrides: Partial<any> = {}, factsOverrides: Record<string, unknown> = {}) {
  const { assessment: assessmentOverrides, ...leadOverrides } = overrides as any
  return {
    id: 'lead-1',
    assessmentId: 'assess-1',
    status: 'submitted',
    routingLocked: false,
    assignedAttorneyId: 'att-1',
    assessment: {
      id: 'assess-1',
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      // California auto claims run two years, so 900 days is comfortably out.
      facts: JSON.stringify({ incident: { date: daysAgo(900) }, ...factsOverrides }),
      ...(assessmentOverrides || {}),
    },
    ...leadOverrides,
  }
}

describe('runSolExpirySweep', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    notifyMock.mockReset()
    notifyMock.mockResolvedValue(true)
    routingEventMock.mockReset()
    routingEventMock.mockResolvedValue(undefined)
  })

  it('withdraws a pending offer whose statute of limitations has run', async () => {
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([lead()] as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      { id: 'intro-1', attorneyId: 'att-1' },
    ] as any)

    const result = await runSolExpirySweep()

    expect(result).toMatchObject({ scanned: 1, held: 1, offersWithdrawn: 1, notified: 0 })
    expect(vi.mocked(prisma.introduction.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'intro-1' },
        data: expect.objectContaining({ status: 'EXPIRED' }),
      }),
    )
    expect(vi.mocked(prisma.leadSubmission.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lead-1' },
        data: expect.objectContaining({ lifecycleState: 'not_routable_yet' }),
      }),
    )
  })

  it('does not escalate a time-barred case to the next attorney', async () => {
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([lead()] as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      { id: 'intro-1', attorneyId: 'att-1' },
    ] as any)

    await runSolExpirySweep()

    const eventTypes = routingEventMock.mock.calls.map((call) => call[3])
    expect(eventTypes).toContain('not_routable_yet')
    expect(eventTypes).not.toContain('escalated')
  })

  it('leaves a case the attorney already owns in place and notifies them once', async () => {
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      lead({ status: 'retained', routingLocked: true }),
    ] as any)
    vi.mocked(prisma.notification.findFirst).mockResolvedValue(null as any)

    const result = await runSolExpirySweep()

    expect(result).toMatchObject({ scanned: 1, held: 0, notified: 1 })
    expect(vi.mocked(prisma.leadSubmission.update)).not.toHaveBeenCalled()
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({ attorneyId: 'att-1', eventType: 'attorney.sol_expired' }),
    )
  })

  it('does not re-notify an owned case that was already flagged', async () => {
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      lead({ status: 'retained', routingLocked: true }),
    ] as any)
    vi.mocked(prisma.notification.findFirst).mockResolvedValue({ id: 'notif-1' } as any)

    const result = await runSolExpirySweep()

    expect(result.notified).toBe(0)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('leaves a case that is still inside the limitation period alone', async () => {
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      lead({}, { incident: { date: daysAgo(120) } }),
    ] as any)

    const result = await runSolExpirySweep()

    expect(result).toMatchObject({ scanned: 1, held: 0, notified: 0 })
    expect(vi.mocked(prisma.leadSubmission.update)).not.toHaveBeenCalled()
  })

  it('leaves a case alone when the incident date is missing', async () => {
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      lead({ assessment: { facts: JSON.stringify({}) } }),
    ] as any)

    const result = await runSolExpirySweep()

    expect(result).toMatchObject({ scanned: 1, held: 0, notified: 0 })
  })

  it('honours the discovery date when the claim type allows it', async () => {
    // Medical malpractice runs one year from discovery; an old injury discovered
    // last month is live, not time-barred.
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      lead(
        { assessment: { claimType: 'medmal' } },
        { incident: { date: daysAgo(900), discoveryDate: daysAgo(30) } },
      ),
    ] as any)

    const result = await runSolExpirySweep()

    expect(result).toMatchObject({ held: 0, notified: 0 })
  })
})

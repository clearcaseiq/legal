/**
 * A lapsed offer must stop reading as "reviewing": the sweep expires it even
 * when the case has moved on, and only re-routes cases that are still open.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./matching-rules-config', () => ({
  getMatchingRules: vi.fn(async () => ({ routingEnabled: true })),
  getAttorneyResponseDeadlineMinutes: () => 60,
}))
const { runEscalationWave } = vi.hoisted(() => ({ runEscalationWave: vi.fn() }))
vi.mock('./routing-lifecycle', () => ({ runEscalationWave, recordRoutingEvent: vi.fn() }))
vi.mock('./case-notifications', () => ({
  notifyAttorneyInApp: vi.fn(async () => {}),
  sendOfferExpiringToAttorney: vi.fn(async () => {}),
}))
vi.mock('./notification-timing-config', () => ({
  getNotificationTiming: vi.fn(async () => ({})),
  getOfferExpiryWarningMinutes: () => 10,
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { runOfferExpirySweep } from './offer-expiry-sweep'
import { isLapsedOffer } from './plaintiff-attorney-choices'

const lapsedIntro = (id: string, assessmentId: string, attorneyId: string) => ({ id, assessmentId, attorneyId })

describe('runOfferExpirySweep', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    runEscalationWave.mockReset().mockResolvedValue({ escalated: true })
  })

  it('expires lapsed offers on open and closed cases, but re-routes only the open one', async () => {
    vi.mocked(prisma.introduction.findMany)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([
        lapsedIntro('intro-open', 'asm-open', 'att-1'),
        lapsedIntro('intro-taken', 'asm-taken', 'att-2'),
      ] as any)
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      { id: 'lead-open', assessmentId: 'asm-open', status: 'submitted', routingLocked: false, assignedAttorneyId: null },
      { id: 'lead-taken', assessmentId: 'asm-taken', status: 'contacted', routingLocked: true, assignedAttorneyId: 'att-9' },
    ] as any)

    const result = await runOfferExpirySweep()

    expect(result).toEqual({ expired: 2, escalated: 1 })
    expect(prisma.introduction.updateMany).toHaveBeenCalledWith({
      where: { id: 'intro-taken', status: 'PENDING' },
      data: { status: 'EXPIRED', respondedAt: expect.any(Date) },
    })
    expect(runEscalationWave).toHaveBeenCalledTimes(1)
    expect(runEscalationWave).toHaveBeenCalledWith('asm-open')
  })

  it('leaves the offer of the attorney who holds the case alone', async () => {
    vi.mocked(prisma.introduction.findMany)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([lapsedIntro('intro-holder', 'asm-1', 'att-1')] as any)
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      { id: 'lead-1', assessmentId: 'asm-1', status: 'retained', routingLocked: true, assignedAttorneyId: 'att-1' },
    ] as any)

    expect(await runOfferExpirySweep()).toEqual({ expired: 0, escalated: 0 })
    expect(prisma.introduction.updateMany).not.toHaveBeenCalled()
  })
})

describe('isLapsedOffer', () => {
  const now = Date.parse('2026-11-23T12:00:00Z')

  it('treats a PENDING offer past its window as lapsed', () => {
    expect(isLapsedOffer({ status: 'PENDING', requestedAt: '2026-11-23T10:59:00Z' }, 60, now)).toBe(true)
    expect(isLapsedOffer({ status: 'PENDING', requestedAt: '2026-11-23T11:30:00Z' }, 60, now)).toBe(false)
  })

  it('never relabels an offer the attorney answered', () => {
    expect(isLapsedOffer({ status: 'ACCEPTED', requestedAt: '2026-11-01T00:00:00Z' }, 60, now)).toBe(false)
  })
})

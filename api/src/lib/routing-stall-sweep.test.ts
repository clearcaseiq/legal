/**
 * A case that matched zero attorneys had no wave and no offer, and every
 * background driver keys off one or the other — so nothing would ever look at it
 * again. These cases pin the rule that decides a case is stuck: no open offer
 * and no scheduled wave means no mechanism exists that could move it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./routing-lifecycle', () => ({
  placeAssessmentInManualReview: vi.fn().mockResolvedValue(undefined),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { placeAssessmentInManualReview } from './routing-lifecycle'
import { runRoutingStallSweep } from './routing-stall-sweep'

function givenCandidates(assessmentIds: string[]) {
  vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue(
    assessmentIds.map((assessmentId, index) => ({ id: `lead-${index}`, assessmentId })) as any
  )
}

const parked = () => vi.mocked(placeAssessmentInManualReview).mock.calls.map((call) => call[0])

describe('runRoutingStallSweep', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(placeAssessmentInManualReview).mockClear()
  })

  it('parks a case with no offer and no scheduled wave', async () => {
    givenCandidates(['asm-stranded'])

    const result = await runRoutingStallSweep()

    expect(result.stalled).toBe(1)
    expect(result.parked).toBe(1)
    expect(parked()).toEqual(['asm-stranded'])
    expect(placeAssessmentInManualReview).toHaveBeenCalledWith(
      'asm-stranded',
      'routing_stalled',
      expect.stringMatching(/no open attorney offer/i)
    )
  })

  it('leaves a case alone while an attorney still holds an offer', async () => {
    givenCandidates(['asm-live'])
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([{ assessmentId: 'asm-live' }] as any)

    const result = await runRoutingStallSweep()

    expect(result.stalled).toBe(0)
    expect(placeAssessmentInManualReview).not.toHaveBeenCalled()
  })

  it('leaves a case alone while a wave is still due to escalate', async () => {
    givenCandidates(['asm-waiting'])
    vi.mocked(prisma.routingWave.findMany).mockResolvedValue([{ assessmentId: 'asm-waiting' }] as any)

    const result = await runRoutingStallSweep()

    expect(result.stalled).toBe(0)
    expect(placeAssessmentInManualReview).not.toHaveBeenCalled()
  })

  it('does not re-hold a case a human is already reviewing', async () => {
    givenCandidates(['asm-in-review'])
    vi.mocked(prisma.assessment.findMany).mockResolvedValue([{ id: 'asm-in-review' }] as any)

    const result = await runRoutingStallSweep()

    expect(result.stalled).toBe(0)
    expect(placeAssessmentInManualReview).not.toHaveBeenCalled()
  })

  it('separates the stuck cases from the live ones in a mixed batch', async () => {
    givenCandidates(['asm-stuck', 'asm-has-offer', 'asm-has-wave'])
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([{ assessmentId: 'asm-has-offer' }] as any)
    vi.mocked(prisma.routingWave.findMany).mockResolvedValue([{ assessmentId: 'asm-has-wave' }] as any)

    const result = await runRoutingStallSweep()

    expect(parked()).toEqual(['asm-stuck'])
    expect(result.stalled).toBe(1)
  })

  it('only considers a wave open when it is both unstamped and scheduled', async () => {
    givenCandidates(['asm-any'])

    await runRoutingStallSweep()

    const waveQuery = vi.mocked(prisma.routingWave.findMany).mock.calls[0][0] as any
    expect(waveQuery.where).toMatchObject({
      escalatedAt: null,
      nextEscalationAt: { not: null },
    })
  })

  it('reports deliberate holds without acting on them', async () => {
    // needs_more_info is waiting on the claimant and not_routable_yet on an
    // admin, so parking them would misrepresent why they are stopped.
    givenCandidates([])
    vi.mocked(prisma.leadSubmission.count)
      .mockResolvedValueOnce(4 as any)
      .mockResolvedValueOnce(2 as any)

    const result = await runRoutingStallSweep()

    expect(result).toMatchObject({ heldNeedsMoreInfo: 4, heldNotRoutableYet: 2, parked: 0 })
  })

  it('keeps going when one case cannot be parked', async () => {
    givenCandidates(['asm-bad', 'asm-good'])
    vi.mocked(placeAssessmentInManualReview)
      .mockRejectedValueOnce(new Error('write failed'))
      .mockResolvedValueOnce(undefined)

    const result = await runRoutingStallSweep()

    expect(result.failures).toBe(1)
    expect(result.parked).toBe(1)
  })

  it('gives a freshly routed case time before calling it stuck', async () => {
    givenCandidates([])

    await runRoutingStallSweep()

    const query = vi.mocked(prisma.leadSubmission.findMany).mock.calls[0][0] as any
    expect(query.where.updatedAt.lt.getTime()).toBeLessThan(Date.now())
    expect(query.where).toMatchObject({ lifecycleState: 'routing_active', routingLocked: false })
  })
})

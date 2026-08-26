import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./case-notifications', () => ({
  sendPlaintiffAttorneyAccepted: vi.fn().mockResolvedValue(undefined),
  sendPlaintiffManualReviewNeeded: vi.fn().mockResolvedValue(undefined),
  sendPlaintiffNoAttorneyResponse: vi.fn().mockResolvedValue(true),
  sendPlaintiffBatchApprovalRequest: vi.fn().mockResolvedValue(true),
}))

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

vi.mock('./routing-engine', () => ({
  runRoutingEngine: vi.fn().mockResolvedValue({
    success: true,
    routedTo: ['att-new-1', 'att-new-2'],
  }),
}))

vi.mock('./share-authorization', () => ({
  assertShareAuthorization: vi.fn(),
  recordShareAuthorization: vi.fn().mockResolvedValue({ recorded: true, consentId: 'consent-1' }),
}))

import {
  attorneyAcceptCase,
  recordRoutingEvent,
  attorneyDeclineCase,
  isRoutingLocked,
  runEscalationWave,
  calculateAttorneyReputationScore,
  approvePendingRankedBatch,
  declinePendingRankedBatch,
  getPendingRankedBatch,
  placeAssessmentInManualReview,
  routeReleasedCaseRespectingConsumerSlate,
} from './routing-lifecycle'
import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { runRoutingEngine } from './routing-engine'
import { assertShareAuthorization, recordShareAuthorization } from './share-authorization'
import {
  sendPlaintiffAttorneyAccepted,
  sendPlaintiffManualReviewNeeded,
  sendPlaintiffNoAttorneyResponse,
  sendPlaintiffBatchApprovalRequest
} from './case-notifications'

/**
 * Every contact path now re-reads the plaintiff's authorization before an
 * attorney is introduced, so a suite that does not grant one is testing the
 * hold rather than the routing.
 */
function authorizeShare(attorneyIds: string[] = []) {
  vi.mocked(assertShareAuthorization).mockResolvedValue({
    ok: true,
    authorization: {
      authorized: true,
      reason: 'authorized',
      basis: 'consent_record',
      authorizedAttorneyIds: attorneyIds,
      authorizedAt: new Date(),
      withdrawnAt: null,
    },
  })
}

function withholdShare(reason: string, withdrawnAt: Date | null = null) {
  vi.mocked(assertShareAuthorization).mockResolvedValue({
    ok: false,
    reason,
    authorization: {
      authorized: false,
      reason,
      basis: withdrawnAt ? 'consent_record' : 'none',
      authorizedAttorneyIds: [],
      authorizedAt: null,
      withdrawnAt,
    },
  })
}

function pendingIntro(attorneyId: string, withLead: boolean) {
  return {
    id: 'intro-1',
    attorneyId,
    assessmentId: 'asm-1',
    status: 'PENDING' as const,
    requestedAt: new Date(Date.now() - 60 * 60 * 1000),
    assessment: {
      id: 'asm-1',
      leadSubmission: withLead
        ? {
            assessmentId: 'asm-1',
            assignedAttorneyId: null,
            routingLocked: false,
          }
        : null,
      user: { id: 'u-pl', email: 'p@test.com' },
    },
    attorney: {
      id: attorneyId,
      name: 'Jane Lawyer',
      lawFirm: { name: 'Firm LLC' },
      attorneyProfile: { yearsExperience: 12 },
    },
  }
}

describe('attorneyAcceptCase', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    // Default the atomic PENDING->terminal claim to "won" (count 1); tests that
    // exercise the lost-race path override this explicitly.
    vi.mocked(prisma.introduction.updateMany).mockResolvedValue({ count: 1 } as any)
    // Likewise for the case-level claim: the case is unclaimed by default.
    vi.mocked(prisma.leadSubmission.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(sendPlaintiffAttorneyAccepted).mockClear()
    vi.mocked(sendPlaintiffManualReviewNeeded).mockClear()
    vi.mocked(sendPlaintiffNoAttorneyResponse).mockClear()
  })

  it('accepts pending intro, updates lead, records event, notifies plaintiff', async () => {
    const aid = 'att-99'
    const intro = pendingIntro(aid, true)
    vi.mocked(prisma.introduction.findUnique).mockResolvedValue(intro as any)
    // The PENDING->ACCEPTED transition is an atomic conditional updateMany; a
    // matched row (count 1) means this writer won the claim.
    vi.mocked(prisma.introduction.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma))
    vi.mocked(prisma.routingAnalytics.create).mockResolvedValue({} as any)

    const r = await attorneyAcceptCase('intro-1', aid)
    expect(r.success).toBe(true)
    expect(prisma.introduction.updateMany).toHaveBeenCalled()
    expect(prisma.leadSubmission.updateMany).toHaveBeenCalled()
    expect(sendPlaintiffAttorneyAccepted).toHaveBeenCalledWith(
      'asm-1',
      aid,
      'Jane Lawyer',
      'Firm LLC',
      12
    )
  })

  it('locks the case only while it is still unclaimed', async () => {
    const aid = 'att-99'
    vi.mocked(prisma.introduction.findUnique).mockResolvedValue(pendingIntro(aid, true) as any)
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma))

    await attorneyAcceptCase('intro-1', aid)

    // A wave hands the same case to several attorneys, each with their own
    // PENDING row, so the offer claim alone cannot keep them apart. Before this
    // predicate the lead write was unconditional and the last accept simply
    // overwrote the first attorney's assignment.
    const claim = vi.mocked(prisma.leadSubmission.updateMany).mock.calls[0][0] as any
    expect(claim.where).toMatchObject({ assessmentId: 'asm-1', routingLocked: false })
    expect(claim.data).toMatchObject({ routingLocked: true, assignedAttorneyId: aid })
  })

  it('refuses the accept that loses the race for the case', async () => {
    const aid = 'att-99'
    vi.mocked(prisma.introduction.findUnique).mockResolvedValue(pendingIntro(aid, true) as any)
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma))
    vi.mocked(prisma.leadSubmission.updateMany).mockResolvedValue({ count: 0 } as any)

    const r = await attorneyAcceptCase('intro-1', aid)

    expect(r.success).toBe(false)
    expect(r.error).toMatch(/already been assigned/i)
    // The claimant must not be told a second firm took the case.
    expect(sendPlaintiffAttorneyAccepted).not.toHaveBeenCalled()
  })

  it('retires the other offers on the case once it is won', async () => {
    const aid = 'att-99'
    vi.mocked(prisma.introduction.findUnique).mockResolvedValue(pendingIntro(aid, true) as any)
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma))

    await attorneyAcceptCase('intro-1', aid)

    // The expiry sweep skips locked cases, so nothing else retires these. Left
    // PENDING they stay acceptable indefinitely — the route by which a second
    // attorney could claim a case that was already assigned.
    const retire = vi
      .mocked(prisma.introduction.updateMany)
      .mock.calls.find((call: any) => call[0]?.where?.id?.not)
    expect(retire?.[0]).toMatchObject({
      where: { assessmentId: 'asm-1', status: 'PENDING', id: { not: 'intro-1' } },
      data: expect.objectContaining({ status: 'EXPIRED' }),
    })
  })

  it('fails when introduction not found', async () => {
    vi.mocked(prisma.introduction.findUnique).mockResolvedValue(null)
    const r = await attorneyAcceptCase('intro-x', 'att-1')
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/not found|unauthorized/i)
  })

  it('fails when attorney mismatch', async () => {
    vi.mocked(prisma.introduction.findUnique).mockResolvedValue(pendingIntro('other-att', true) as any)
    const r = await attorneyAcceptCase('intro-1', 'att-1')
    expect(r.success).toBe(false)
  })

  it('fails when already not PENDING', async () => {
    const intro = { ...pendingIntro('att-1', true), status: 'ACCEPTED' }
    vi.mocked(prisma.introduction.findUnique).mockResolvedValue(intro as any)
    const r = await attorneyAcceptCase('intro-1', 'att-1')
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/already/)
  })
})

describe('attorneyDeclineCase', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    // Default the atomic PENDING->DECLINED claim to "won" (count 1).
    vi.mocked(prisma.introduction.updateMany).mockResolvedValue({ count: 1 } as any)
    authorizeShare()
  })

  it('declines pending intro with reason', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      id: 'intro-1',
      attorneyId: 'att-1',
      assessmentId: 'asm-1',
      status: 'PENDING',
    } as any)
    vi.mocked(prisma.introduction.updateMany).mockResolvedValue({ count: 1 } as any)

    const r = await attorneyDeclineCase('intro-1', 'att-1', 'Conflict')
    expect(r.success).toBe(true)
    expect(prisma.introduction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'intro-1', status: 'PENDING' }),
        data: expect.objectContaining({ status: 'DECLINED', declineReason: 'Conflict' }),
      })
    )
  })

  it('advances to the next ranked attorney before manual review', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      id: 'intro-1',
      attorneyId: 'att-1',
      assessmentId: 'asm-1',
      status: 'PENDING',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      routingLocked: false,
      sourceDetails: JSON.stringify({
        plaintiffAttorneyPreferences: {
          rankedAttorneyIds: ['att-1', 'att-2', 'att-3'],
        },
      }),
    } as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      { attorneyId: 'att-1' },
    ] as any)
    vi.mocked(prisma.routingWave.findFirst).mockResolvedValue({
      waveNumber: 1,
    } as any)
    vi.mocked(runRoutingEngine).mockResolvedValue({
      success: true,
      routedTo: ['att-2'],
      introductionIds: ['intro-2'],
    } as any)

    const r = await attorneyDeclineCase('intro-1', 'att-1', 'Capacity')

    expect(r.success).toBe(true)
    expect(runRoutingEngine).toHaveBeenCalledWith('asm-1', expect.objectContaining({
      maxAttorneysPerWave: 1,
      preferredAttorneyIds: ['att-2'],
      waveNumber: 2,
    }))
    expect(prisma.leadSubmission.upsert).not.toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ lifecycleState: 'manual_review_needed' }),
    }))
  })

  it('fails when not pending', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      id: 'intro-1',
      attorneyId: 'att-1',
      assessmentId: 'asm-1',
      status: 'DECLINED',
    } as any)
    const r = await attorneyDeclineCase('intro-1', 'att-1')
    expect(r.success).toBe(false)
  })
})

describe('routeReleasedCaseRespectingConsumerSlate', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    authorizeShare()
    vi.mocked(sendPlaintiffBatchApprovalRequest).mockClear()
  })

  it('routes normally when the consumer made no selection', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({ sourceDetails: null } as any)
    const r = await routeReleasedCaseRespectingConsumerSlate('asm-1')
    expect(r.mode).toBe('no_consumer_slate')
  })

  it('proposes a fresh batch for approval (excluding removed) when the consumer removed everyone', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      sourceDetails: JSON.stringify({
        plaintiffAttorneyPreferences: { dismissedAttorneyIds: ['att-1', 'att-2'], rankedAttorneyIds: [] },
      }),
    } as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([] as any)
    vi.mocked(runRoutingEngine).mockResolvedValue({ success: true, routedTo: ['att-3'] } as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([{ id: 'att-3', name: 'A Three' }] as any)

    const r = await routeReleasedCaseRespectingConsumerSlate('asm-1')

    expect(r.mode).toBe('awaiting_approval')
    expect(r.proposedAttorneyIds).toContain('att-3')
    // The dry run that builds the batch must exclude the attorneys the consumer removed.
    expect(runRoutingEngine).toHaveBeenCalledWith(
      'asm-1',
      expect.objectContaining({ excludeAttorneyIds: expect.arrayContaining(['att-1', 'att-2']) })
    )
    expect(sendPlaintiffBatchApprovalRequest).toHaveBeenCalled()
  })

  it('advances the consumer-approved ranked queue before proposing anything new', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      sourceDetails: JSON.stringify({
        plaintiffAttorneyPreferences: { rankedAttorneyIds: ['att-1', 'att-2'] },
      }),
    } as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.routingWave.findFirst).mockResolvedValue(null as any)
    vi.mocked(runRoutingEngine).mockResolvedValue({
      success: true,
      routedTo: ['att-1'],
      introductionIds: ['intro-1'],
    } as any)

    const r = await routeReleasedCaseRespectingConsumerSlate('asm-1')

    expect(r.mode).toBe('ranked_routed')
    expect(r.attorneyId).toBe('att-1')
    expect(sendPlaintiffBatchApprovalRequest).not.toHaveBeenCalled()
  })
})

describe('recordRoutingEvent', () => {
  beforeEach(() => resetUniversalPrismaMock())

  it('persists analytics row', async () => {
    await recordRoutingEvent('asm-1', 'intro-1', 'att-1', 'viewed', { x: 1 })
    expect(prisma.routingAnalytics.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assessmentId: 'asm-1',
          eventType: 'viewed',
        }),
      })
    )
  })
})

describe('isRoutingLocked', () => {
  beforeEach(() => resetUniversalPrismaMock())

  it('true when leadSubmission.routingLocked', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({ routingLocked: true } as any)
    expect(await isRoutingLocked('asm-1')).toBe(true)
  })

  it('false when no lead or unlocked', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue(null as any)
    expect(await isRoutingLocked('asm-1')).toBe(false)
  })
})

describe('runEscalationWave', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
    authorizeShare()
  })

  it('returns error when no lead', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue(null as any)
    const r = await runEscalationWave('asm-1')
    expect(r.escalated).toBe(false)
    expect(r.error).toMatch(/not in routing|matched/i)
  })

  it('returns error when routing already locked', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({ routingLocked: true } as any)
    const r = await runEscalationWave('asm-1')
    expect(r.escalated).toBe(false)
  })

  it('flags manual review after wave 3', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({ routingLocked: false } as any)
    vi.mocked(prisma.routingWave.findFirst).mockResolvedValue({ waveNumber: 3 } as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([] as any)

    const r = await runEscalationWave('asm-1')
    expect(r.escalated).toBe(false)
    expect(r.waveNumber).toBe(3)
    expect(prisma.leadSubmission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ lifecycleState: 'manual_review_needed' }),
      })
    )
    expect(prisma.assessment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ manualReviewStatus: 'pending' }),
      })
    )
    // A timed-out wave means attorneys were approached and nobody responded, so
    // the plaintiff gets that specific message rather than the generic
    // "something is being reviewed" one.
    expect(sendPlaintiffNoAttorneyResponse).toHaveBeenCalledWith('asm-1', 'routing_timeout')
    expect(sendPlaintiffManualReviewNeeded).not.toHaveBeenCalled()
  })

  it('escalates to wave 1 when no prior wave and engine routes attorneys', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({ routingLocked: false } as any)
    vi.mocked(prisma.routingWave.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.routingWave.upsert).mockResolvedValue({} as any)
    vi.mocked(prisma.routingAnalytics.create).mockResolvedValue({} as any)

    const r = await runEscalationWave('asm-1')
    expect(r.escalated).toBe(true)
    expect(r.waveNumber).toBe(1)
    expect(prisma.routingWave.upsert).toHaveBeenCalled()
  })

  it('uses the next ranked attorney on timeout before broad escalation', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      routingLocked: false,
      sourceDetails: JSON.stringify({
        plaintiffAttorneyPreferences: {
          rankedAttorneyIds: ['att-1', 'att-2', 'att-3'],
        },
      }),
    } as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      { attorneyId: 'att-1' },
    ] as any)
    vi.mocked(prisma.routingWave.findFirst).mockResolvedValue({
      waveNumber: 1,
    } as any)
    vi.mocked(runRoutingEngine).mockResolvedValue({
      success: true,
      routedTo: ['att-2'],
      introductionIds: ['intro-2'],
    } as any)

    const r = await runEscalationWave('asm-1')

    expect(r.escalated).toBe(true)
    expect(r.waveNumber).toBe(2)
    expect(runRoutingEngine).toHaveBeenCalledWith('asm-1', expect.objectContaining({
      preferredAttorneyIds: ['att-2'],
      maxAttorneysPerWave: 1,
      waveNumber: 2,
    }))
  })

  // The sweep selects waves whose nextEscalationAt has passed and whose
  // escalatedAt is still null. The ranked path never stamped the wave it had just
  // acted on, so every pass re-selected the same overdue wave and advanced one
  // more attorney: a claimant's whole ranked list was consumed in about half an
  // hour, each pass sending another "your case has been sent to..." email and
  // burning a real attorney's response window.
  it('retires the timed-out wave after advancing the ranked queue', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      routingLocked: false,
      sourceDetails: JSON.stringify({
        plaintiffAttorneyPreferences: { rankedAttorneyIds: ['att-1', 'att-2', 'att-3'] },
      }),
    } as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([{ attorneyId: 'att-1' }] as any)
    vi.mocked(prisma.routingWave.findFirst).mockResolvedValue({ waveNumber: 1 } as any)
    vi.mocked(runRoutingEngine).mockResolvedValue({
      success: true,
      routedTo: ['att-2'],
      introductionIds: ['intro-2'],
    } as any)

    await runEscalationWave('asm-1')

    // Wave 1, not the wave the advance just created — that window has not opened.
    expect(prisma.routingWave.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { assessmentId_waveNumber: { assessmentId: 'asm-1', waveNumber: 1 } },
        data: expect.objectContaining({ escalatedAt: expect.any(Date) }),
      })
    )
  })

  it('parks the wave when the ranked queue runs out', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      routingLocked: false,
      sourceDetails: JSON.stringify({
        plaintiffAttorneyPreferences: { rankedAttorneyIds: ['att-1'] },
      }),
    } as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([{ attorneyId: 'att-1' }] as any)
    vi.mocked(prisma.routingWave.findFirst).mockResolvedValue({ waveNumber: 2 } as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([] as any)

    await runEscalationWave('asm-1')

    // Nothing further is scheduled once the case is with a human, so the due
    // timestamp is cleared rather than left in the past for the sweep to find.
    expect(prisma.routingWave.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { assessmentId_waveNumber: { assessmentId: 'asm-1', waveNumber: 2 } },
        data: expect.objectContaining({ escalatedAt: expect.any(Date), nextEscalationAt: null }),
      })
    )
  })

  // SB 37 / § 6155(g)(2): once the attorneys the plaintiff chose are used up we may
  // not quietly continue to a batch they never saw.
  it('holds for plaintiff approval instead of routing to a fresh batch', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      routingLocked: false,
      sourceDetails: JSON.stringify({
        plaintiffAttorneyPreferences: {
          rankedAttorneyIds: ['att-1', 'att-2', 'att-3'],
          batchNumber: 1,
        },
      }),
    } as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      { attorneyId: 'att-1' },
      { attorneyId: 'att-2' },
      { attorneyId: 'att-3' },
    ] as any)
    vi.mocked(prisma.routingWave.findFirst).mockResolvedValue({ waveNumber: 3 } as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([
      { id: 'att-4', name: 'Dana Reyes' },
      { id: 'att-5', name: 'Sam Ortiz' },
      { id: 'att-6', name: 'Lee Chan' },
    ] as any)
    vi.mocked(runRoutingEngine).mockResolvedValueOnce({
      success: true,
      routedTo: ['att-4', 'att-5', 'att-6'],
    } as any)

    const r = await runEscalationWave('asm-1')

    expect(r.escalated).toBe(false)

    const update = vi.mocked(prisma.leadSubmission.update).mock.calls.at(-1)?.[0] as any
    expect(update.data.lifecycleState).toBe('awaiting_plaintiff_batch_approval')
    // Proposed, not promoted: the plaintiff's own queue is left untouched.
    expect(update.data.sourceDetails).toContain('"pendingBatch"')
    expect(update.data.sourceDetails).toContain('"rankedAttorneyIds":["att-1","att-2","att-3"]')
    expect(update.data.sourceDetails).not.toContain('system_generated')

    expect(sendPlaintiffBatchApprovalRequest).toHaveBeenCalledWith('asm-1', [
      'Dana Reyes',
      'Sam Ortiz',
      'Lee Chan',
    ])
    // Only the dry run — nobody was contacted.
    expect(runRoutingEngine).toHaveBeenCalledTimes(1)
    expect(runRoutingEngine).toHaveBeenNthCalledWith(1, 'asm-1', expect.objectContaining({
      dryRun: true,
      maxAttorneysPerWave: 3,
      excludeAttorneyIds: ['att-1', 'att-2', 'att-3'],
    }))
    expect(prisma.assessment.update).not.toHaveBeenCalled()
  })

  // A removal is a standing instruction: an attorney the plaintiff took off their
  // slate must not come back in a later proposal.
  it('never re-proposes an attorney the plaintiff removed', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      routingLocked: false,
      sourceDetails: JSON.stringify({
        plaintiffAttorneyPreferences: {
          rankedAttorneyIds: ['att-1'],
          dismissedAttorneyIds: ['att-9'],
          batchNumber: 1,
        },
      }),
    } as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([{ attorneyId: 'att-1' }] as any)
    vi.mocked(prisma.routingWave.findFirst).mockResolvedValue({ waveNumber: 3 } as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([{ id: 'att-4', name: 'Dana Reyes' }] as any)
    vi.mocked(runRoutingEngine).mockResolvedValueOnce({
      success: true,
      routedTo: ['att-4'],
    } as any)

    await runEscalationWave('asm-1')

    expect(runRoutingEngine).toHaveBeenNthCalledWith(1, 'asm-1', expect.objectContaining({
      dryRun: true,
      excludeAttorneyIds: expect.arrayContaining(['att-1', 'att-9']),
    }))
  })

  it('moves the case to manual review when an escalation wave cannot place new attorneys', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({ routingLocked: false } as any)
    vi.mocked(prisma.routingWave.findFirst).mockResolvedValue({
      waveNumber: 1,
      nextEscalationAt: new Date(),
      escalatedAt: null,
    } as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([{ attorneyId: 'att-old-1' }] as any)
    vi.mocked(runRoutingEngine).mockResolvedValue({
      success: false,
      errors: ['No eligible attorneys remain'],
      routedTo: [],
    } as any)

    const r = await runEscalationWave('asm-1')

    expect(r.escalated).toBe(false)
    expect(r.waveNumber).toBe(2)
    expect(r.error).toMatch(/eligible attorneys remain/i)
    expect(prisma.routingWave.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { assessmentId_waveNumber: { assessmentId: 'asm-1', waveNumber: 1 } },
      data: expect.objectContaining({ nextEscalationAt: null }),
    }))
    expect(prisma.assessment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ manualReviewStatus: 'pending' }),
    }))
    expect(sendPlaintiffNoAttorneyResponse).toHaveBeenCalledWith('asm-1', 'routing_timeout')
  })

  it('sends the generic manual-review notice when the case never reached an attorney', async () => {
    // A gate hold is not an attorney declining, so it keeps the generic message.
    await placeAssessmentInManualReview('asm-1', 'routing_gate_review', 'Fraud signals detected')

    expect(sendPlaintiffManualReviewNeeded).toHaveBeenCalledWith(
      'asm-1',
      'routing_gate_review',
      'Fraud signals detected',
    )
    expect(sendPlaintiffNoAttorneyResponse).not.toHaveBeenCalled()
  })
})

/**
 * Landing here twice is ordinary: a parked case can be selected by the sweep
 * again, an admin can re-route a held case that then fails the same way, and
 * callers retry. Repeating the placement is not free — it re-notifies the
 * claimant, resets the ageing clock the review queue is sorted by, and wipes the
 * reviewer attribution.
 */
describe('placeAssessmentInManualReview is idempotent', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  function alreadyHeld(reason: string) {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      manualReviewStatus: 'pending',
      manualReviewReason: reason,
    } as any)
  }

  it('does not email the claimant again about a case already held', async () => {
    alreadyHeld('routing_timeout')

    await placeAssessmentInManualReview('asm-1', 'routing_timeout', 'No attorney accepted.')

    expect(sendPlaintiffNoAttorneyResponse).not.toHaveBeenCalled()
    expect(sendPlaintiffManualReviewNeeded).not.toHaveBeenCalled()
  })

  it('leaves the held-at clock and reviewer attribution alone', async () => {
    alreadyHeld('routing_timeout')

    await placeAssessmentInManualReview('asm-1', 'routing_timeout')

    expect(prisma.assessment.update).not.toHaveBeenCalled()
  })

  it('still records a hold for a different reason', async () => {
    alreadyHeld('routing_gate_review')

    await placeAssessmentInManualReview('asm-1', 'routing_timeout', 'No attorney accepted.')

    expect(prisma.assessment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ manualReviewReason: 'routing_timeout' }),
      })
    )
    expect(sendPlaintiffNoAttorneyResponse).toHaveBeenCalledWith('asm-1', 'routing_timeout')
  })

  it('holds a released case again', async () => {
    // Release clears the pending flag, so the same reason is a genuinely new hold.
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      manualReviewStatus: 'released',
      manualReviewReason: 'routing_timeout',
    } as any)

    await placeAssessmentInManualReview('asm-1', 'routing_timeout')

    expect(prisma.assessment.update).toHaveBeenCalled()
  })
})

describe('plaintiff approval of a further attorney batch', () => {
  const pendingLead = {
    routingLocked: false,
    sourceDetails: JSON.stringify({
      plaintiffAttorneyPreferences: {
        rankedAttorneyIds: ['att-1', 'att-2', 'att-3'],
        batchNumber: 1,
        pendingBatch: {
          candidateAttorneyIds: ['att-4', 'att-5', 'att-6'],
          batchNumber: 2,
          proposedAt: '2026-07-29T00:00:00.000Z',
        },
      },
    }),
  }

  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
    authorizeShare()
  })

  it('lists the proposed attorneys in the order they were proposed', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue(pendingLead as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([
      { id: 'att-5', name: 'Sam Ortiz', lawFirm: { name: 'Ortiz Law', city: 'Fresno', state: 'CA' } },
      { id: 'att-4', name: 'Dana Reyes', lawFirm: { name: 'Reyes LLP', city: 'Oakland', state: 'CA' } },
    ] as any)

    const pending = await getPendingRankedBatch('asm-1')

    expect(pending?.batchNumber).toBe(2)
    expect(pending?.attorneys.map((a) => a.id)).toEqual(['att-4', 'att-5'])
    expect(pending?.attorneys[0]).toMatchObject({ name: 'Dana Reyes', firmName: 'Reyes LLP', city: 'Oakland' })
  })

  it('nothing is pending once the case is locked to an attorney', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      ...pendingLead,
      routingLocked: true,
    } as any)
    expect(await getPendingRankedBatch('asm-1')).toBeNull()
  })

  it('routes only to the approved attorneys, in the plaintiff order', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue(pendingLead as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([
      { id: 'att-5' },
      { id: 'att-6' },
    ] as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.routingWave.findFirst).mockResolvedValue({ waveNumber: 3 } as any)
    vi.mocked(runRoutingEngine).mockResolvedValue({
      success: true,
      routedTo: ['att-6'],
      introductionIds: ['intro-6'],
    } as any)

    const result = await approvePendingRankedBatch('asm-1', ['att-6', 'att-5'])

    expect(result).toMatchObject({ success: true, routed: true, attorneyId: 'att-6' })
    const update = vi.mocked(prisma.leadSubmission.update).mock.calls[0]?.[0] as any
    expect(update.data.sourceDetails).toContain('"rankedAttorneyIds":["att-6","att-5"]')
    expect(update.data.sourceDetails).toContain('"source":"plaintiff"')
    // Proposal is consumed so it cannot be replayed.
    expect(update.data.sourceDetails).not.toContain('pendingBatch')
    // att-4 was proposed and left unchecked, which is a rejection — record it so it
    // is never proposed again.
    expect(update.data.sourceDetails).toContain('"dismissedAttorneyIds":["att-4"]')
    expect(runRoutingEngine).toHaveBeenCalledWith('asm-1', expect.objectContaining({
      preferredAttorneyIds: ['att-6'],
      maxAttorneysPerWave: 1,
    }))
  })

  it('refuses attorneys that were never proposed', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue(pendingLead as any)

    const result = await approvePendingRankedBatch('asm-1', ['att-99'])

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/select at least one/i)
    expect(runRoutingEngine).not.toHaveBeenCalled()
    expect(prisma.leadSubmission.update).not.toHaveBeenCalled()
  })

  it('declining stops routing and hands the case to a human', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue(pendingLead as any)

    const result = await declinePendingRankedBatch('asm-1')

    expect(result.success).toBe(true)
    expect(runRoutingEngine).not.toHaveBeenCalled()
    expect(prisma.assessment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        manualReviewStatus: 'pending',
        manualReviewReason: 'plaintiff_declined_further_attorneys',
      }),
    }))
  })

  it('will not approve a batch that is no longer pending', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      routingLocked: false,
      sourceDetails: JSON.stringify({ plaintiffAttorneyPreferences: { rankedAttorneyIds: ['att-1'] } }),
    } as any)

    const result = await approvePendingRankedBatch('asm-1', ['att-4'])

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/awaiting your approval/i)
  })
})

describe('calculateAttorneyReputationScore', () => {
  beforeEach(() => resetUniversalPrismaMock())

  it('no-op when attorney has no introductions', async () => {
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([] as any)
    await calculateAttorneyReputationScore('att-1')
    expect(prisma.attorneyReputationScore.upsert).not.toHaveBeenCalled()
  })

  it('computes and upserts score when introductions exist', async () => {
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      { status: 'ACCEPTED', requestedAt: new Date(), respondedAt: new Date() },
      { status: 'DECLINED', requestedAt: new Date(), respondedAt: new Date() },
    ] as any)
    vi.mocked(prisma.attorneyReview.aggregate).mockResolvedValue({
      _avg: { rating: 4 },
      _count: 5,
    } as any)

    await calculateAttorneyReputationScore('att-1')
    expect(prisma.attorneyReputationScore.upsert).toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./case-notifications', () => ({
  sendPlaintiffAttorneyAccepted: vi.fn().mockResolvedValue(undefined),
  sendPlaintiffManualReviewNeeded: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

vi.mock('./routing-engine', () => ({
  runRoutingEngine: vi.fn().mockResolvedValue({
    success: true,
    routedTo: ['att-new-1', 'att-new-2'],
  }),
}))

import {
  attorneyAcceptCase,
  recordRoutingEvent,
  attorneyDeclineCase,
  attorneyRequestMoreInfo,
  isRoutingLocked,
  runEscalationWave,
  calculateAttorneyReputationScore,
} from './routing-lifecycle'
import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { runRoutingEngine } from './routing-engine'
import {
  sendPlaintiffAttorneyAccepted,
  sendPlaintiffManualReviewNeeded
} from './case-notifications'

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
    vi.mocked(sendPlaintiffAttorneyAccepted).mockClear()
    vi.mocked(sendPlaintiffManualReviewNeeded).mockClear()
  })

  it('accepts pending intro, updates lead, records event, notifies plaintiff', async () => {
    const aid = 'att-99'
    const intro = pendingIntro(aid, true)
    vi.mocked(prisma.introduction.findUnique).mockResolvedValue(intro as any)
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma))
    vi.mocked(prisma.routingAnalytics.create).mockResolvedValue({} as any)

    const r = await attorneyAcceptCase('intro-1', aid)
    expect(r.success).toBe(true)
    expect(prisma.introduction.update).toHaveBeenCalled()
    expect(prisma.leadSubmission.update).toHaveBeenCalled()
    expect(sendPlaintiffAttorneyAccepted).toHaveBeenCalledWith(
      'asm-1',
      aid,
      'Jane Lawyer',
      'Firm LLC',
      12
    )
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
  })

  it('declines pending intro with reason', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      id: 'intro-1',
      attorneyId: 'att-1',
      assessmentId: 'asm-1',
      status: 'PENDING',
    } as any)

    const r = await attorneyDeclineCase('intro-1', 'att-1', 'Conflict')
    expect(r.success).toBe(true)
    expect(prisma.introduction.update).toHaveBeenCalledWith(
      expect.objectContaining({
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

describe('attorneyRequestMoreInfo', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('sets REQUESTED_INFO and records event', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      id: 'intro-1',
      attorneyId: 'att-1',
      assessmentId: 'asm-1',
      status: 'PENDING',
    } as any)

    const r = await attorneyRequestMoreInfo('intro-1', 'att-1', 'Please upload police report.')
    expect(r.success).toBe(true)
    expect(prisma.introduction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REQUESTED_INFO',
          requestedInfoNotes: 'Please upload police report.',
        }),
      })
    )
  })

  it('fails when not pending', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue(null)
    const r = await attorneyRequestMoreInfo('intro-1', 'att-1', 'notes')
    expect(r.success).toBe(false)
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
    expect(sendPlaintiffManualReviewNeeded).toHaveBeenCalled()
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

  it('generates a fresh ranked batch when the plaintiff queue is exhausted', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      routingLocked: false,
      sourceDetails: JSON.stringify({
        plaintiffAttorneyPreferences: {
          rankedAttorneyIds: ['att-1', 'att-2', 'att-3'],
          batchNumber: 1,
        },
      }),
    } as any)
    vi.mocked(prisma.introduction.findMany)
      .mockResolvedValueOnce([
        { attorneyId: 'att-1' },
        { attorneyId: 'att-2' },
        { attorneyId: 'att-3' },
      ] as any)
      .mockResolvedValueOnce([
        { attorneyId: 'att-1' },
        { attorneyId: 'att-2' },
        { attorneyId: 'att-3' },
      ] as any)
    vi.mocked(prisma.routingWave.findFirst)
      .mockResolvedValueOnce({ waveNumber: 3 } as any)
      .mockResolvedValueOnce({ waveNumber: 3 } as any)
    vi.mocked(runRoutingEngine)
      .mockResolvedValueOnce({
        success: true,
        routedTo: ['att-4', 'att-5', 'att-6'],
      } as any)
      .mockResolvedValueOnce({
        success: true,
        routedTo: ['att-4'],
        introductionIds: ['intro-4'],
      } as any)

    const r = await runEscalationWave('asm-1')

    expect(r.escalated).toBe(true)
    expect(prisma.leadSubmission.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { assessmentId: 'asm-1' },
      data: expect.objectContaining({
        sourceDetails: expect.stringContaining('"rankedAttorneyIds":["att-4","att-5","att-6"]'),
      }),
    }))
    expect(runRoutingEngine).toHaveBeenNthCalledWith(1, 'asm-1', expect.objectContaining({
      dryRun: true,
      maxAttorneysPerWave: 3,
      excludeAttorneyIds: ['att-1', 'att-2', 'att-3'],
    }))
    expect(runRoutingEngine).toHaveBeenNthCalledWith(2, 'asm-1', expect.objectContaining({
      preferredAttorneyIds: ['att-4'],
      maxAttorneysPerWave: 1,
      waveNumber: 4,
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
    expect(sendPlaintiffManualReviewNeeded).toHaveBeenCalled()
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

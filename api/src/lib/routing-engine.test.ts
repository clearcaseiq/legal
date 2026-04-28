import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./case-notifications', () => ({
  sendCaseOfferToAttorney: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./case-normalization', () => ({
  normalizeCaseForRouting: vi.fn().mockResolvedValue({
    case_id: 'asm-eng-1',
    claim_type: 'auto',
    jurisdiction_state: 'CA',
    injury_severity: 1,
    treatment_status: 'none',
    liability_confidence: 0.6,
    evidence_score: 0.5,
    damages_score: 0.6,
    estimated_case_value_low: 10000,
    estimated_case_value_high: 50000,
    statute_of_limitations_status: 'ok',
    medical_record_present: false,
    police_report_present: false,
    wage_loss_present: false,
    urgency_level: 'medium',
    narrative_present: true,
    plaintiff_contact_complete: true,
    required_disclosures_accepted: true,
  }),
}))

vi.mock('./pre-routing-gate', () => ({
  runPreRoutingGate: vi.fn().mockResolvedValue({ pass: true, reason: 'ok' }),
}))

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { runRoutingEngine } from './routing-engine'
import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { normalizeCaseForRouting } from './case-normalization'
import { runPreRoutingGate } from './pre-routing-gate'

const assessmentRow = {
  id: 'asm-eng-1',
  claimType: 'auto',
  venueState: 'CA',
  venueCounty: 'Los Angeles',
  facts: JSON.stringify({
    consents: { tos: true, privacy: true, hipaa: true },
    incident: { narrative: 'Patient was rear ended at intersection with injury.' },
  }),
  predictions: [
    {
      viability: JSON.stringify({ overall: 0.55, liability: 0.6, causation: 0.5, damages: 0.55 }),
      bands: JSON.stringify({ p25: 20000, median: 40000, p75: 80000 }),
    },
  ],
}

function attorneyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'att-eng-1',
    isActive: true,
    isVerified: true,
    specialties: JSON.stringify(['auto']),
    responseTimeHours: 24,
    averageRating: 4.5,
    totalReviews: 12,
    attorneyProfile: {
      subscriptionTier: 'premium',
      pricingModel: 'fixed_price',
      paymentModel: 'both',
      jurisdictions: JSON.stringify([{ state: 'CA', counties: [] as string[] }]),
      excludedCaseTypes: null,
      minInjurySeverity: 0,
      minDamagesRange: null,
      maxDamagesRange: null,
      maxCasesPerWeek: null,
      maxCasesPerMonth: null,
      successRate: null,
      averageSettlement: null,
      totalCases: null,
      yearsExperience: 10,
    },
    ...overrides,
  }
}

describe('runRoutingEngine', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(normalizeCaseForRouting).mockClear()
    vi.mocked(runPreRoutingGate).mockClear()
    vi.mocked(runPreRoutingGate).mockResolvedValue({ pass: true, reason: 'ok' })
  })

  it('fails when assessment not found', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(null as any)
    const r = await runRoutingEngine('missing')
    expect(r.success).toBe(false)
    expect(r.errors?.[0]).toMatch(/not found/i)
  })

  it('fails when routing already locked', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessmentRow as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({ routingLocked: true } as any)

    const r = await runRoutingEngine('asm-eng-1')
    expect(r.success).toBe(false)
    expect(r.errors?.some((e) => /matched|locked/i.test(e))).toBe(true)
  })

  it('fails pre-routing gate when gate returns pass false', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessmentRow as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({ routingLocked: false } as any)
    vi.mocked(runPreRoutingGate).mockResolvedValue({
      pass: false,
      reason: 'Evidence score too low (0%)',
      status: 'needs_more_info',
    })

    const r = await runRoutingEngine('asm-eng-1')
    expect(r.success).toBe(false)
    expect(r.gatePassed).toBe(false)
    expect(r.gateStatus).toBe('needs_more_info')
    expect(r.gateReason).toMatch(/evidence/i)
    expect(prisma.leadSubmission.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { assessmentId: 'asm-eng-1' },
      update: expect.objectContaining({ lifecycleState: 'needs_more_info' }),
    }))
  })

  it('routes manual-review gate failures into the manual review queue', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessmentRow as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({ routingLocked: false } as any)
    vi.mocked(runPreRoutingGate).mockResolvedValue({
      pass: false,
      reason: 'High-value case has thin supporting evidence',
      status: 'manual_review',
    })

    const r = await runRoutingEngine('asm-eng-1')
    expect(r.success).toBe(false)
    expect(r.gateStatus).toBe('manual_review')
    expect(prisma.assessment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ manualReviewStatus: 'pending' }),
    }))
  })

  it('dryRun succeeds and returns ranked attorney ids without persisting', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessmentRow as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([attorneyRow()] as any)
    vi.mocked(prisma.introduction.count).mockResolvedValue(0)

    const r = await runRoutingEngine('asm-eng-1', { dryRun: true, maxAttorneysPerWave: 5 })

    expect(r.success).toBe(true)
    expect(r.gatePassed).toBe(true)
    expect(r.routedTo?.length).toBeGreaterThanOrEqual(1)
    expect(r.candidatesEligible).toBeGreaterThanOrEqual(1)
    expect(prisma.introduction.create).not.toHaveBeenCalled()
  })

  it('returns no eligible attorneys when nobody serves jurisdiction', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessmentRow as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([
      attorneyRow({
        attorneyProfile: {
          ...attorneyRow().attorneyProfile,
          jurisdictions: JSON.stringify([{ state: 'NY', counties: [] }]),
        },
      }),
    ] as any)

    const r = await runRoutingEngine('asm-eng-1', { dryRun: true })
    expect(r.success).toBe(false)
    expect(r.errors?.some((e) => /No eligible/i.test(e))).toBe(true)
    expect(r.candidatesEligible).toBe(0)
  })

  it('skips gate when skipPreRoutingGate is true', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessmentRow as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([attorneyRow()] as any)
    vi.mocked(prisma.introduction.count).mockResolvedValue(0)

    await runRoutingEngine('asm-eng-1', { dryRun: true, skipPreRoutingGate: true })
    expect(runPreRoutingGate).not.toHaveBeenCalled()
  })

  it('creates introductions only for attorneys not already introduced in the wave', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessmentRow as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([
      attorneyRow({ id: 'att-eng-1' }),
      attorneyRow({ id: 'att-eng-2' }),
    ] as any)
    vi.mocked(prisma.introduction.count).mockResolvedValue(0)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      { attorneyId: 'att-eng-1' },
    ] as any)
    vi.mocked(prisma.introduction.create)
      .mockResolvedValueOnce({ id: 'intro-new-2' } as any)

    const r = await runRoutingEngine('asm-eng-1', { maxAttorneysPerWave: 2 })

    expect(r.success).toBe(true)
    expect(prisma.introduction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        assessmentId: 'asm-eng-1',
        attorneyId: { in: expect.arrayContaining(['att-eng-1', 'att-eng-2']) },
      }),
    }))
    expect(prisma.introduction.create).toHaveBeenCalledTimes(1)
    expect(prisma.introduction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        attorneyId: 'att-eng-2',
        assessmentId: 'asm-eng-1',
      }),
    }))
    expect(r.routedTo).toEqual(['att-eng-2'])
    expect(r.introductionIds).toEqual(['intro-new-2'])
  })

  it('honors plaintiff-ranked attorney order over fit ordering', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessmentRow as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([
      attorneyRow({
        id: 'att-fast-best-fit',
        responseTimeHours: 2,
      }),
      attorneyRow({
        id: 'att-plaintiff-choice',
        responseTimeHours: 24,
      }),
    ] as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.introduction.create).mockResolvedValue({ id: 'intro-ranked-1' } as any)

    const r = await runRoutingEngine('asm-eng-1', {
      maxAttorneysPerWave: 1,
      preferredAttorneyIds: ['att-plaintiff-choice', 'att-fast-best-fit'],
    })

    expect(r.success).toBe(true)
    expect(prisma.introduction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        attorneyId: 'att-plaintiff-choice',
      }),
    }))
    expect(r.routedTo).toEqual(['att-plaintiff-choice'])
  })
})

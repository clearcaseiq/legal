import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

vi.mock('./routing-engine', () => ({
  runRoutingEngine: vi.fn(),
}))

vi.mock('./case-tier-classifier', () => ({
  assignCaseTier: vi.fn(),
}))

vi.mock('./tier1-routing', () => ({
  routeTier1Case: vi.fn(),
}))

vi.mock('./tier2-routing', () => ({
  routeTier2Case: vi.fn(),
}))

vi.mock('./tier3-routing', () => ({
  routeTier3Case: vi.fn(),
}))

vi.mock('./tier4-routing', () => ({
  routeTier4Case: vi.fn(),
}))

vi.mock('./routing-lifecycle', () => ({
  recordRoutingEvent: vi.fn().mockResolvedValue(undefined),
  placeAssessmentInManualReview: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./share-authorization', () => ({
  assertShareAuthorization: vi.fn(),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { startAssessmentRouting } from './assessment-routing'
import { runRoutingEngine } from './routing-engine'
import { assignCaseTier } from './case-tier-classifier'
import { routeTier1Case } from './tier1-routing'
import { recordRoutingEvent } from './routing-lifecycle'
import { assertShareAuthorization } from './share-authorization'

/**
 * The gate runs for real in this suite (only the authorization check is mocked),
 * so a fixture without facts fails on case score and never reaches the tier
 * engine the test is about.
 */
function routableAssessment(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    claimType: 'auto',
    venueState: 'CA',
    venueCounty: 'Los Angeles',
    facts: JSON.stringify({
      incident: {
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        narrative: 'Rear-ended at a red light on Wilshire; other driver cited.',
        location: 'Los Angeles, CA',
      },
      damages: { med_charges: 22000, wage_loss: 4000 },
      injuries: [{ severity: 2 }],
    }),
    predictions: [
      {
        viability: JSON.stringify({ overall: 0.72, liability: 0.8, causation: 0.7, damages: 0.65 }),
        bands: JSON.stringify({ p25: 30000, median: 55000, p75: 90000 }),
      },
    ],
    ...extra,
  }
}

function authorizeShare() {
  vi.mocked(assertShareAuthorization).mockResolvedValue({
    ok: true,
    authorization: {
      authorized: true,
      reason: 'authorized',
      basis: 'consent_record',
      authorizedAttorneyIds: [],
      authorizedAt: new Date(),
      withdrawnAt: null,
    },
  })
}

describe('startAssessmentRouting', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
    authorizeShare()
  })

  it('routes through the tier engine when classification succeeds', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(
      routableAssessment('asm-1', { caseTier: null }) as any
    )
    vi.mocked(assignCaseTier).mockResolvedValue({ tierNumber: 1 } as any)
    vi.mocked(routeTier1Case).mockResolvedValue({
      routed: true,
      routedToFirmId: 'att-tier-1',
      introductionId: 'intro-tier-1',
      method: 'subscription',
      attempts: { subscription: 1, fixedPrice: 0 },
    })

    const result = await startAssessmentRouting('asm-1')

    expect(result).toMatchObject({
      success: true,
      strategy: 'tier',
      tierNumber: 1,
      routedTo: ['att-tier-1'],
      introductionIds: ['intro-tier-1'],
    })
    expect(prisma.leadSubmission.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { assessmentId: 'asm-1' },
      update: expect.objectContaining({
        sourceType: 'tier_auto',
        assignedAttorneyId: 'att-tier-1',
      }),
    }))
    expect(recordRoutingEvent).toHaveBeenCalledWith(
      'asm-1',
      'intro-tier-1',
      'att-tier-1',
      'tier_routed',
      expect.objectContaining({ tierNumber: 1 })
    )
    expect(runRoutingEngine).not.toHaveBeenCalled()
  })

  it('falls back to classic routing when tier routing does not place the case', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(
      routableAssessment('asm-2', { caseTier: { tierNumber: 1 } }) as any
    )
    vi.mocked(routeTier1Case).mockResolvedValue({
      routed: false,
      holdReason: 'No subscription inventory',
    })
    vi.mocked(runRoutingEngine).mockResolvedValue({
      success: true,
      gatePassed: true,
      routedTo: ['att-classic-1'],
      introductionIds: ['intro-classic-1'],
      candidatesEligible: 5,
      candidatesQualified: 3,
    } as any)

    const result = await startAssessmentRouting('asm-2')

    expect(result).toMatchObject({
      success: true,
      strategy: 'classic',
      tierAttempted: true,
      tierNumber: 1,
      routedTo: ['att-classic-1'],
    })
    expect(recordRoutingEvent).toHaveBeenCalledWith(
      'asm-2',
      null,
      null,
      'tier_fallback_to_classic',
      expect.objectContaining({ tierNumber: 1, holdReason: 'No subscription inventory' })
    )
    expect(runRoutingEngine).toHaveBeenCalledWith('asm-2', expect.objectContaining({ skipPreRoutingGate: true }))
  })

  // skipPreRoutingGate exists so a human clearing a fraud hold is not instantly
  // re-flagged. It used to carry the disclosure check out with it, which is not
  // an admin's to skip.
  it('holds the case when there is no authorization to share it, even with the gate skipped', async () => {
    vi.mocked(assertShareAuthorization).mockResolvedValue({
      ok: false,
      reason: 'The plaintiff withdrew authorization to share this case with law firms',
      authorization: {
        authorized: false,
        reason: 'The plaintiff withdrew authorization to share this case with law firms',
        basis: 'consent_record',
        authorizedAttorneyIds: [],
        authorizedAt: null,
        withdrawnAt: new Date(),
      },
    })

    const result = await startAssessmentRouting('asm-withdrawn', {
      skipPreRoutingGate: true,
      preferTierRouting: true,
    })

    expect(result).toMatchObject({
      success: false,
      gatePassed: false,
      gateStatus: 'needs_more_info',
    })
    expect(result.gateReason).toMatch(/withdrew authorization/i)
    expect(routeTier1Case).not.toHaveBeenCalled()
    expect(runRoutingEngine).not.toHaveBeenCalled()
    expect(recordRoutingEvent).toHaveBeenCalledWith(
      'asm-withdrawn',
      null,
      null,
      'needs_more_info',
      expect.objectContaining({ check: 'share_authorization' })
    )
  })

  // Releasing a case from manual review asked for tier routing and named nobody,
  // so a consumer's case could be tier-routed to a firm outside the three they
  // authorized — the § 6155(g)(2) exposure the selection path exists to avoid.
  it('confines a case with a named authorization to those firms instead of tier routing it', async () => {
    vi.mocked(assertShareAuthorization).mockResolvedValue({
      ok: true,
      authorization: {
        authorized: true,
        reason: 'authorized',
        basis: 'consent_record',
        authorizedAttorneyIds: ['att-1', 'att-2'],
        authorizedAt: new Date(),
        withdrawnAt: null,
      },
    })
    vi.mocked(runRoutingEngine).mockResolvedValue({ success: true, routedTo: ['att-1'] } as any)

    const result = await startAssessmentRouting('asm-released', {
      skipPreRoutingGate: true,
      preferTierRouting: true,
    })

    expect(result.strategy).toBe('classic')
    expect(result.tierAttempted).toBe(false)
    expect(routeTier1Case).not.toHaveBeenCalled()
    expect(assignCaseTier).not.toHaveBeenCalled()
    expect(runRoutingEngine).toHaveBeenCalledWith(
      'asm-released',
      expect.objectContaining({ preferredAttorneyIds: ['att-1', 'att-2'] })
    )
  })

  it('narrows the authorization question to the attorneys actually being contacted', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({ id: 'asm-3', caseTier: null } as any)
    vi.mocked(assignCaseTier).mockResolvedValue({ tierNumber: null } as any)
    vi.mocked(runRoutingEngine).mockResolvedValue({ success: true, routedTo: ['att-9'] } as any)

    await startAssessmentRouting('asm-3', { preferredAttorneyIds: ['att-9'] })

    expect(assertShareAuthorization).toHaveBeenCalledWith('asm-3', ['att-9'])
  })

  it('uses classic routing directly during dry runs', async () => {
    vi.mocked(runRoutingEngine).mockResolvedValue({
      success: true,
      gatePassed: true,
      routedTo: ['att-dry-1'],
    } as any)

    const result = await startAssessmentRouting('asm-dry', { dryRun: true })

    expect(result).toMatchObject({
      success: true,
      strategy: 'classic',
      tierAttempted: false,
      routedTo: ['att-dry-1'],
    })
    expect(assignCaseTier).not.toHaveBeenCalled()
  })

  it('returns a disabled response when routing is turned off by admin', async () => {
    vi.mocked(prisma.routingConfig.findUnique).mockResolvedValue({
      key: 'matching_rules',
      value: JSON.stringify({ routingEnabled: false }),
    } as any)

    const result = await startAssessmentRouting('asm-off')

    expect(result).toMatchObject({
      success: false,
      disabledByAdmin: true,
      gatePassed: false,
      gateReason: 'Routing disabled by admin',
    })
    expect(routeTier1Case).not.toHaveBeenCalled()
    expect(runRoutingEngine).not.toHaveBeenCalled()
    expect(recordRoutingEvent).toHaveBeenCalledWith(
      'asm-off',
      null,
      null,
      'routing_disabled',
      { source: 'assessment_routing' }
    )
  })
})

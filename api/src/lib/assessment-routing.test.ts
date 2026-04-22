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
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { startAssessmentRouting } from './assessment-routing'
import { runRoutingEngine } from './routing-engine'
import { assignCaseTier } from './case-tier-classifier'
import { routeTier1Case } from './tier1-routing'
import { recordRoutingEvent } from './routing-lifecycle'

describe('startAssessmentRouting', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  it('routes through the tier engine when classification succeeds', async () => {
    vi.mocked(prisma.assessment.findUnique)
      .mockResolvedValueOnce({ id: 'asm-1', caseTier: null } as any)
      .mockResolvedValueOnce({
        predictions: [{ viability: JSON.stringify({ overall: 0.81, liability: 0.75, causation: 0.7, damages: 0.8 }) }],
      } as any)
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
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({ id: 'asm-2', caseTier: { tierNumber: 1 } } as any)
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
    expect(runRoutingEngine).toHaveBeenCalledWith('asm-2', undefined)
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

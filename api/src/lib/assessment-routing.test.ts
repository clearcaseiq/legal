import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

vi.mock('./routing-engine', () => ({
  runRoutingEngine: vi.fn(),
}))

vi.mock('./routing-lifecycle', () => ({
  recordRoutingEvent: vi.fn().mockResolvedValue(undefined),
  placeAssessmentInManualReview: vi.fn().mockResolvedValue(undefined),
  proposeInitialBatchForApproval: vi.fn(),
}))

vi.mock('./share-authorization', () => ({
  assertShareAuthorization: vi.fn(),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { PLAINTIFF_SELECTION_REQUIRED, startAssessmentRouting } from './assessment-routing'
import { runRoutingEngine } from './routing-engine'
import {
  proposeInitialBatchForApproval,
  recordRoutingEvent,
  placeAssessmentInManualReview,
} from './routing-lifecycle'
import { assertShareAuthorization } from './share-authorization'

/**
 * The gate runs for real in this suite (only the authorization check is mocked),
 * so a fixture without facts fails on case score and never reaches the engine
 * the test is about.
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

function authorizeShare(authorizedAttorneyIds: string[] = ['att-1', 'att-2']) {
  vi.mocked(assertShareAuthorization).mockResolvedValue({
    ok: true,
    authorization: {
      authorized: true,
      reason: 'authorized',
      basis: 'consent_record',
      authorizedAttorneyIds,
      authorizedAt: new Date(),
      withdrawnAt: null,
    },
  })
}

function withdrawShare() {
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
}

describe('startAssessmentRouting', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
    authorizeShare()
  })

  it('routes only to the firms the plaintiff named, in their order', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(routableAssessment('asm-1') as any)
    vi.mocked(runRoutingEngine).mockResolvedValue({
      success: true,
      gatePassed: true,
      routedTo: ['att-1'],
      introductionIds: ['intro-1'],
    } as any)

    const result = await startAssessmentRouting('asm-1')

    expect(result).toMatchObject({ success: true, strategy: 'classic', tierAttempted: false, routedTo: ['att-1'] })
    expect(runRoutingEngine).toHaveBeenCalledWith(
      'asm-1',
      expect.objectContaining({ preferredAttorneyIds: ['att-1', 'att-2'], skipPreRoutingGate: true })
    )
    expect(proposeInitialBatchForApproval).not.toHaveBeenCalled()
  })

  // Partner-referred and admin-created cases arrive with nobody named. Those
  // used to be tier-routed, where subscriptions bought earlier offers; now the
  // plaintiff is asked to choose before anyone is contacted.
  it('holds a case whose authorization names no firms for the plaintiff to choose', async () => {
    authorizeShare([])
    vi.mocked(proposeInitialBatchForApproval).mockResolvedValue({ proposed: true, attorneyIds: ['att-7', 'att-8'] })

    const result = await startAssessmentRouting('asm-unnamed')

    expect(result).toMatchObject({
      success: false,
      awaitingPlaintiffSelection: true,
      proposedAttorneyIds: ['att-7', 'att-8'],
      holdReason: PLAINTIFF_SELECTION_REQUIRED,
      routedTo: [],
    })
    expect(proposeInitialBatchForApproval).toHaveBeenCalledWith('asm-unnamed')
    expect(prisma.leadSubmission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { assessmentId: 'asm-unnamed' }, update: {} })
    )
    expect(runRoutingEngine).not.toHaveBeenCalled()
    expect(placeAssessmentInManualReview).not.toHaveBeenCalled()
  })

  it('sends a case with no named firms to a human when there is nobody to propose', async () => {
    authorizeShare([])
    vi.mocked(proposeInitialBatchForApproval).mockResolvedValue({ proposed: false, error: 'No eligible attorneys' })

    const result = await startAssessmentRouting('asm-unnamed-empty')

    expect(result.success).toBe(false)
    expect(result.awaitingPlaintiffSelection).toBe(false)
    expect(runRoutingEngine).not.toHaveBeenCalled()
    expect(placeAssessmentInManualReview).toHaveBeenCalledWith(
      'asm-unnamed-empty',
      'no_attorney_match',
      expect.stringContaining('No eligible attorneys')
    )
  })

  /**
   * A case that matches nobody used to end here with no state written at all:
   * no wave, so the escalation sweep never saw it; no offer, so the expiry sweep
   * never saw it; and still `routing_active`, so no human was looking either. The
   * admin release and bulk-route paths call this fire-and-forget, so those cases
   * were simply lost.
   */
  it('holds the case when routing matches nobody', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(routableAssessment('asm-nomatch') as any)
    vi.mocked(runRoutingEngine).mockResolvedValue({
      success: false,
      gatePassed: true,
      routedTo: [],
      candidatesTotal: 9,
      candidatesEligible: 2,
      candidatesQualified: 0,
      errors: ['No attorneys passed quality gate'],
    } as any)

    const result = await startAssessmentRouting('asm-nomatch')

    expect(result.success).toBe(false)
    expect(placeAssessmentInManualReview).toHaveBeenCalledWith(
      'asm-nomatch',
      'no_attorney_match',
      expect.stringContaining('No attorneys passed quality gate')
    )
  })

  it('records the funnel so a reviewer can see where the candidates went', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(routableAssessment('asm-funnel') as any)
    vi.mocked(runRoutingEngine).mockResolvedValue({
      success: false,
      gatePassed: true,
      routedTo: [],
      candidatesTotal: 9,
      candidatesEligible: 2,
      candidatesQualified: 0,
      errors: ['No attorneys passed quality gate'],
    } as any)

    await startAssessmentRouting('asm-funnel')

    const note = vi.mocked(placeAssessmentInManualReview).mock.calls[0][2] as string
    expect(note).toContain('9 considered')
    expect(note).toContain('2 eligible')
    expect(note).toContain('0 qualified')
  })

  it('does not double-hold a case the gate already stopped', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(routableAssessment('asm-gated') as any)
    // The gate persists its own hold and tells the plaintiff why; re-holding here
    // would overwrite that reason with a vaguer one.
    vi.mocked(runRoutingEngine).mockResolvedValue({
      success: false,
      gatePassed: false,
      gateStatus: 'manual_review',
      routedTo: [],
      errors: ['Fraud signals detected'],
    } as any)

    await startAssessmentRouting('asm-gated')

    expect(placeAssessmentInManualReview).not.toHaveBeenCalled()
  })

  it('leaves a successful route alone', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(routableAssessment('asm-ok') as any)
    vi.mocked(runRoutingEngine).mockResolvedValue({
      success: true,
      gatePassed: true,
      routedTo: ['att-1'],
      introductionIds: ['intro-1'],
    } as any)

    await startAssessmentRouting('asm-ok')

    expect(placeAssessmentInManualReview).not.toHaveBeenCalled()
  })

  // skipPreRoutingGate exists so a human clearing a fraud hold is not instantly
  // re-flagged. It used to carry the disclosure check out with it, which is not
  // an admin's to skip.
  it('holds the case when there is no authorization to share it, even with the gate skipped', async () => {
    withdrawShare()

    const result = await startAssessmentRouting('asm-withdrawn', { skipPreRoutingGate: true })

    expect(result).toMatchObject({
      success: false,
      gatePassed: false,
      gateStatus: 'needs_more_info',
    })
    expect(result.gateReason).toMatch(/withdrew authorization/i)
    expect(runRoutingEngine).not.toHaveBeenCalled()
    expect(proposeInitialBatchForApproval).not.toHaveBeenCalled()
    expect(recordRoutingEvent).toHaveBeenCalledWith(
      'asm-withdrawn',
      null,
      null,
      'needs_more_info',
      expect.objectContaining({ check: 'share_authorization' })
    )
  })

  it('narrows the authorization question to the attorneys actually being contacted', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(routableAssessment('asm-3') as any)
    vi.mocked(runRoutingEngine).mockResolvedValue({ success: true, routedTo: ['att-2'] } as any)

    await startAssessmentRouting('asm-3', { preferredAttorneyIds: ['att-2'] })

    expect(assertShareAuthorization).toHaveBeenCalledWith('asm-3', ['att-2'])
    expect(runRoutingEngine).toHaveBeenCalledWith(
      'asm-3',
      expect.objectContaining({ preferredAttorneyIds: ['att-2'] })
    )
  })

  it('refuses a caller-named attorney the plaintiff did not authorize', async () => {
    vi.mocked(assertShareAuthorization).mockImplementation(async (_id, attorneyIds) => {
      const authorization = {
        authorized: true,
        reason: 'authorized',
        basis: 'consent_record' as const,
        authorizedAttorneyIds: ['att-1'],
        authorizedAt: new Date(),
        withdrawnAt: null,
      }
      if (attorneyIds?.includes('att-outsider')) {
        return { ok: false, reason: 'Plaintiff has not authorized sharing this case with 1 of the attorneys being contacted', authorization }
      }
      return { ok: true, authorization }
    })

    const result = await startAssessmentRouting('asm-outsider', { preferredAttorneyIds: ['att-outsider'] })

    expect(result.success).toBe(false)
    expect(result.gateStatus).toBe('needs_more_info')
    expect(runRoutingEngine).not.toHaveBeenCalled()
  })

  it('uses the engine directly during dry runs', async () => {
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
    expect(assertShareAuthorization).not.toHaveBeenCalled()
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

/**
 * Releasing one finished case while routing is paused fleet-wide.
 *
 * The pause is a single global switch, so a case a specialist had finished and
 * a plaintiff had already chosen firms for could not be sent at all — there was
 * no per-case way past it, and the only workaround was the admin force-route
 * endpoint, which names one attorney and checks no disclosure authorization.
 *
 * The override therefore has to lift exactly one thing. These tests pin both
 * halves of that: it clears the pause, and it clears nothing else.
 */
describe('overriding the routing pause for one case', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
    authorizeShare()
    vi.mocked(prisma.routingConfig.findUnique).mockResolvedValue({
      key: 'matching_rules',
      value: JSON.stringify({ routingEnabled: false }),
    } as any)
  })

  it('routes the case even though routing is switched off', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(routableAssessment('asm-ov') as any)
    vi.mocked(runRoutingEngine).mockResolvedValue({ success: true, routedTo: ['att-1'] } as any)

    const result = await startAssessmentRouting('asm-ov', { overrideRoutingDisabled: true })

    expect(result).toMatchObject({ success: true, routedTo: ['att-1'] })
    expect(result.disabledByAdmin).toBeUndefined()
    expect(runRoutingEngine).toHaveBeenCalled()
  })

  it('carries the override into the engine, which checks the switch too', async () => {
    // Both layers read the switch independently, so lifting it in only one of
    // them leaves the case stopped one call further down with the same message.
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(routableAssessment('asm-ov2') as any)
    vi.mocked(runRoutingEngine).mockResolvedValue({ success: true, routedTo: ['att-1'] } as any)

    await startAssessmentRouting('asm-ov2', { overrideRoutingDisabled: true })

    expect(runRoutingEngine).toHaveBeenCalledWith(
      'asm-ov2',
      expect.objectContaining({ overrideRoutingDisabled: true })
    )
  })

  it('still refuses a case the plaintiff authorized nobody to see', async () => {
    // The pause is an operational control; the authorization is the plaintiff's
    // decision. Lifting the first must never lift the second.
    withdrawShare()

    const result = await startAssessmentRouting('asm-ov-withdrawn', {
      overrideRoutingDisabled: true,
    })

    expect(result.success).toBe(false)
    expect(result.gateReason).toMatch(/withdrew authorization/i)
    expect(runRoutingEngine).not.toHaveBeenCalled()
  })

  it('still asks the plaintiff to choose when no firms are named', async () => {
    authorizeShare([])
    vi.mocked(proposeInitialBatchForApproval).mockResolvedValue({ proposed: true, attorneyIds: ['att-7'] })

    const result = await startAssessmentRouting('asm-ov-unnamed', { overrideRoutingDisabled: true })

    expect(result.awaitingPlaintiffSelection).toBe(true)
    expect(runRoutingEngine).not.toHaveBeenCalled()
  })

  it('leaves the pause in force for every case that did not ask', async () => {
    const result = await startAssessmentRouting('asm-other')

    expect(result).toMatchObject({ success: false, disabledByAdmin: true })
    expect(runRoutingEngine).not.toHaveBeenCalled()
  })
})

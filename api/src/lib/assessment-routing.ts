import { prisma } from './prisma'
import { logger } from './logger'
import { runRoutingEngine, type RoutingEngineOptions, type RoutingEngineResult } from './routing-engine'
import { recordRoutingEvent, placeAssessmentInManualReview, proposeInitialBatchForApproval } from './routing-lifecycle'
import { isRoutingEnabled, getMatchingRules, getPreRoutingGateOptions } from './matching-rules-config'
import { normalizeCaseForRouting } from './case-normalization'
import { runPreRoutingGate } from './pre-routing-gate'
import { assertShareAuthorization } from './share-authorization'

export const PLAINTIFF_SELECTION_REQUIRED =
  'Waiting for the plaintiff to choose which firms may receive this case'

export type AssessmentRoutingStartResult = Partial<RoutingEngineResult> & {
  success: boolean
  strategy: 'classic'
  tierNumber?: number | null
  tierAttempted: boolean
  disabledByAdmin?: boolean
  /** The plaintiff has been sent a proposed slate and nobody is contacted until they approve it. */
  awaitingPlaintiffSelection?: boolean
  proposedAttorneyIds?: string[]
  gatePassed: boolean
  routedTo?: string[]
  introductionIds?: string[]
  holdReason?: string
  errors?: string[]
  method?: string
  attempts?: Record<string, number>
  price?: number
}

/**
 * Run the pre-routing gate (which includes the fraud/suspicion gate) up front,
 * BEFORE any routing strategy is attempted. This is important because tier
 * routing does not consult the gate on its own — running it here guarantees a
 * suspicious case is held for admin review no matter which routing path it
 * would have taken. Returns a terminal result when the case is held, or null
 * when the case passes and routing should proceed.
 */
async function enforcePreRoutingGate(
  assessmentId: string
): Promise<AssessmentRoutingStartResult | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { predictions: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })
  // Let the engine surface a proper "not found" error rather than guessing here.
  if (!assessment) return null

  const normalizedCase = await normalizeCaseForRouting(assessment)
  const matchingRules = await getMatchingRules()
  const gateResult = await runPreRoutingGate(normalizedCase, getPreRoutingGateOptions(matchingRules))
  if (gateResult.pass) return null

  if (gateResult.status === 'manual_review') {
    // Persists the hold + fraud score/signals and notifies the plaintiff.
    await placeAssessmentInManualReview(
      assessmentId,
      gateResult.reviewReason || 'routing_gate_review',
      gateResult.reason,
      { fraudScore: gateResult.fraudScore, fraudSignals: gateResult.fraudSignals }
    )
  } else {
    await prisma.leadSubmission.upsert({
      where: { assessmentId },
      create: {
        assessmentId,
        viabilityScore: normalizedCase.liability_confidence,
        liabilityScore: normalizedCase.liability_confidence,
        causationScore: 0.5,
        damagesScore: normalizedCase.damages_score,
        evidenceChecklist: JSON.stringify({ required: [] }),
        isExclusive: false,
        sourceType: 'routing_engine',
        status: 'submitted',
        lifecycleState: gateResult.status,
        routingLocked: false,
      },
      update: { lifecycleState: gateResult.status, routingLocked: false },
    })
    await recordRoutingEvent(assessmentId, null, null, gateResult.status, {
      reason: gateResult.reason,
    })
  }

  return {
    success: false,
    strategy: 'classic',
    tierNumber: null,
    tierAttempted: false,
    gatePassed: false,
    gateStatus: gateResult.status,
    gateReason: gateResult.reason,
    holdReason: gateResult.reason,
    routedTo: [],
    introductionIds: [],
    errors: [gateResult.reason],
  }
}

/**
 * Hold a case that has no live authorization to be disclosed to a firm.
 *
 * Deliberately separate from `enforcePreRoutingGate` and deliberately not
 * governed by `skipPreRoutingGate`: that flag exists so a human clearing a fraud
 * hold is not instantly re-flagged by the same signals, and it was quietly
 * carrying the disclosure check out with it on three paths that each contact a
 * new attorney. The consumer's permission is not an admin's to skip.
 */
async function enforceShareAuthorization(
  assessmentId: string,
  attorneyIds?: string[]
): Promise<{ held: AssessmentRoutingStartResult } | { held: null; authorizedAttorneyIds: string[] }> {
  const authorization = await assertShareAuthorization(assessmentId, attorneyIds)
  if (authorization.ok) {
    return { held: null, authorizedAttorneyIds: authorization.authorization.authorizedAttorneyIds }
  }

  await prisma.leadSubmission
    .updateMany({
      where: { assessmentId },
      data: { lifecycleState: 'needs_more_info', routingLocked: false },
    })
    .catch(() => undefined)
  await recordRoutingEvent(assessmentId, null, null, 'needs_more_info', {
    reason: authorization.reason,
    check: 'share_authorization',
  })
  logger.warn('Routing held: no live authorization to share case with attorneys', {
    assessmentId,
    reason: authorization.reason,
    withdrawnAt: authorization.authorization.withdrawnAt,
  })

  return {
    held: {
      success: false,
      strategy: 'classic',
      tierNumber: null,
      tierAttempted: false,
      gatePassed: false,
      gateStatus: 'needs_more_info',
      gateReason: authorization.reason,
      holdReason: authorization.reason,
      routedTo: [],
      introductionIds: [],
      errors: [authorization.reason],
    },
  }
}

/**
 * Leave a case that matched nobody somewhere a human will pick it up.
 *
 * The engine reports "no eligible attorneys" or "none passed the quality gate"
 * to its caller and writes no state at all. The only background driver reads
 * RoutingWave, and a wave row is created only once at least one introduction has
 * gone out — so a case that matched zero attorneys had no wave, was never swept,
 * and sat in `routing_active` indefinitely with no attorney and no review.
 *
 * Parking it here rather than at each call site is deliberate: the consumer
 * submit paths happened to fall back to manual review themselves, but the admin
 * release and bulk-route paths call this fire-and-forget, so those cases were
 * simply lost. Every caller now gets the same guarantee.
 */
async function parkUnroutableCase(
  assessmentId: string,
  outcome: AssessmentRoutingStartResult
): Promise<void> {
  const cause = outcome.errors?.[0] || outcome.holdReason || 'Routing matched no attorney'
  const funnel = [
    outcome.candidatesTotal != null ? `${outcome.candidatesTotal} considered` : null,
    outcome.candidatesEligible != null ? `${outcome.candidatesEligible} eligible` : null,
    outcome.candidatesQualified != null ? `${outcome.candidatesQualified} qualified` : null,
  ].filter(Boolean)

  logger.warn('Routing matched no attorney; holding case for review', {
    assessmentId,
    strategy: outcome.strategy,
    cause,
  })

  await placeAssessmentInManualReview(
    assessmentId,
    'no_attorney_match',
    funnel.length > 0 ? `${cause} (${funnel.join(', ')})` : cause
  )
}

/**
 * Ask the plaintiff to choose firms for a case whose authorization names none.
 * Nobody is contacted until they approve; a case with nobody to propose goes to
 * a human.
 */
async function holdForPlaintiffSelection(assessmentId: string): Promise<AssessmentRoutingStartResult> {
  await prisma.leadSubmission.upsert({
    where: { assessmentId },
    create: {
      assessmentId,
      viabilityScore: 0.5,
      liabilityScore: 0.5,
      causationScore: 0.5,
      damagesScore: 0.5,
      evidenceChecklist: JSON.stringify({ required: [] }),
      isExclusive: false,
      sourceType: 'routing_engine',
      lifecycleState: 'routing_active',
      routingLocked: false,
    },
    update: {},
  })

  const proposal = await proposeInitialBatchForApproval(assessmentId)
  const held: AssessmentRoutingStartResult = {
    success: false,
    strategy: 'classic',
    tierNumber: null,
    tierAttempted: false,
    gatePassed: true,
    awaitingPlaintiffSelection: proposal.proposed,
    proposedAttorneyIds: proposal.attorneyIds,
    holdReason: PLAINTIFF_SELECTION_REQUIRED,
    routedTo: [],
    introductionIds: [],
    errors: [proposal.proposed ? PLAINTIFF_SELECTION_REQUIRED : proposal.error || 'No firms available to propose to the plaintiff'],
  }
  if (!proposal.proposed) await parkUnroutableCase(assessmentId, held)
  return held
}

export async function startAssessmentRouting(
  assessmentId: string,
  options?: RoutingEngineOptions
): Promise<AssessmentRoutingStartResult> {
  if (options?.dryRun) {
    const classic = await runRoutingEngine(assessmentId, options)
    return {
      ...classic,
      strategy: 'classic',
      tierAttempted: false,
      tierNumber: null,
    }
  }

  // The override lifts the pause for this call only. Everything below still
  // runs, including the disclosure authorization that confines the case to the
  // firms the plaintiff chose — the pause is an operational control, not a
  // substitute for consent, and lifting one must not lift the other.
  const routingEnabled = (await isRoutingEnabled()) || options?.overrideRoutingDisabled === true
  if (!routingEnabled) {
    await recordRoutingEvent(assessmentId, null, null, 'routing_disabled', {
      source: 'assessment_routing',
    })
    return {
      success: false,
      strategy: 'classic',
      tierNumber: null,
      tierAttempted: false,
      disabledByAdmin: true,
      gatePassed: false,
      gateReason: 'Routing disabled by admin',
      gateStatus: 'not_routable_yet',
      routedTo: [],
      introductionIds: [],
      errors: ['Routing disabled by admin'],
    }
  }

  // Permission to disclose the case is checked on every path, including the ones
  // that skip the rest of the gate. An admin releasing a case from review is
  // overriding a fraud signal, which is theirs to override; they are not
  // overriding the plaintiff's decision about who may see their injury facts.
  const authorization = await enforceShareAuthorization(assessmentId)
  if (authorization.held) return authorization.held

  // Every firm contacted must be one the plaintiff chose. A case whose
  // authorization names nobody (partner-referred, admin-created, or authorized
  // before firms were recorded) is never routed to firms ClearCaseIQ picks; the
  // plaintiff is shown a proposed slate and nobody is contacted until they
  // approve it. That approval records a named authorization, and the next call
  // routes within it.
  if (authorization.authorizedAttorneyIds.length === 0) {
    return await holdForPlaintiffSelection(assessmentId)
  }
  let preferredAttorneyIds = authorization.authorizedAttorneyIds
  if (options?.preferredAttorneyIds?.length) {
    const covered = await enforceShareAuthorization(assessmentId, options.preferredAttorneyIds)
    if (covered.held) return covered.held
    preferredAttorneyIds = options.preferredAttorneyIds
  }

  // Suspicious-case review gate — held cases never reach an attorney. Skipped
  // when the caller explicitly bypasses (e.g. an admin releasing a case after
  // review, which must not be instantly re-flagged).
  let gateAlreadyRun = false
  if (!options?.skipPreRoutingGate) {
    const held = await enforcePreRoutingGate(assessmentId)
    if (held) return held
    gateAlreadyRun = true
  }
  // Avoid re-running the gate inside the engine when we've already run it, and
  // carry the plaintiff's firms through so the engine contacts them in their order.
  const engineOptions = {
    ...options,
    preferredAttorneyIds,
    ...(gateAlreadyRun ? { skipPreRoutingGate: true } : {}),
  }

  const classic = await runRoutingEngine(assessmentId, engineOptions)
  const outcome: AssessmentRoutingStartResult = {
    ...classic,
    strategy: 'classic',
    tierAttempted: false,
    tierNumber: null,
  }

  // A gate hold has already persisted its own state and told the plaintiff why;
  // this is only for the case that cleared every gate and still matched nobody.
  if (!outcome.success && !outcome.routedTo?.length && outcome.gatePassed !== false) {
    await parkUnroutableCase(assessmentId, outcome)
  }

  return outcome
}

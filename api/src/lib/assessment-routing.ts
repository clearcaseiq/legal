import { prisma } from './prisma'
import { logger } from './logger'
import { runRoutingEngine, type RoutingEngineOptions, type RoutingEngineResult } from './routing-engine'
import { assignCaseTier } from './case-tier-classifier'
import { routeTier1Case } from './tier1-routing'
import { routeTier2Case } from './tier2-routing'
import { routeTier3Case } from './tier3-routing'
import { routeTier4Case } from './tier4-routing'
import { recordRoutingEvent, placeAssessmentInManualReview } from './routing-lifecycle'
import { isRoutingEnabled, getMatchingRules, getPreRoutingGateOptions } from './matching-rules-config'
import { normalizeCaseForRouting } from './case-normalization'
import { runPreRoutingGate } from './pre-routing-gate'
import { assertShareAuthorization } from './share-authorization'

type TierRouteResult = {
  routed: boolean
  routedToFirmId?: string
  introductionId?: string
  method?: string
  price?: number
  attempts?: Record<string, number>
  holdReason?: string
  error?: string
}

export type AssessmentRoutingStartResult = Partial<RoutingEngineResult> & {
  success: boolean
  strategy: 'tier' | 'classic'
  tierNumber?: number | null
  tierAttempted: boolean
  tierOutcome?: 'fallback_to_classic'
  disabledByAdmin?: boolean
  gatePassed: boolean
  routedTo?: string[]
  introductionIds?: string[]
  holdReason?: string
  errors?: string[]
  method?: string
  attempts?: Record<string, number>
  price?: number
}

async function getAssessmentTierNumber(assessmentId: string): Promise<number | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      caseTier: {
        select: {
          tierNumber: true,
        },
      },
    },
  })

  if (!assessment) {
    return null
  }

  if (assessment.caseTier?.tierNumber != null) {
    return assessment.caseTier.tierNumber
  }

  try {
    const classified = await assignCaseTier(assessmentId)
    return classified.tierNumber
  } catch (error: unknown) {
    logger.warn('Tier classification failed, falling back to classic routing', {
      assessmentId,
      error: (error as Error).message,
    })
    return null
  }
}

async function runTierRoute(assessmentId: string, tierNumber: number): Promise<TierRouteResult | null> {
  if (tierNumber === 1) return routeTier1Case(assessmentId)
  if (tierNumber === 2) return routeTier2Case(assessmentId)
  if (tierNumber === 3) return routeTier3Case(assessmentId)
  if (tierNumber === 4) return routeTier4Case(assessmentId)
  return null
}

async function upsertTierLeadSubmission(assessmentId: string, routedAttorneyId: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      predictions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { viability: true },
      },
    },
  })

  const viability = assessment?.predictions?.[0]?.viability
    ? JSON.parse(assessment.predictions[0].viability) as Record<string, number>
    : {}

  await prisma.leadSubmission.upsert({
    where: { assessmentId },
    create: {
      assessmentId,
      viabilityScore: viability.overall ?? 0.5,
      liabilityScore: viability.liability ?? 0.5,
      causationScore: viability.causation ?? 0.5,
      damagesScore: viability.damages ?? 0.5,
      evidenceChecklist: JSON.stringify({ required: [] }),
      isExclusive: false,
      sourceType: 'tier_auto',
      assignedAttorneyId: routedAttorneyId,
      assignmentType: 'shared',
      status: 'submitted',
      lifecycleState: 'routing_active',
    },
    update: {
      sourceType: 'tier_auto',
      assignedAttorneyId: routedAttorneyId,
      assignmentType: 'shared',
      status: 'submitted',
      lifecycleState: 'routing_active',
    },
  })
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

export async function startAssessmentRouting(
  assessmentId: string,
  options?: RoutingEngineOptions & {
    preferTierRouting?: boolean
    fallbackToClassic?: boolean
  }
): Promise<AssessmentRoutingStartResult> {
  let preferTierRouting = options?.preferTierRouting ?? true
  const fallbackToClassic = options?.fallbackToClassic ?? true

  if (options?.dryRun) {
    const classic = await runRoutingEngine(assessmentId, options)
    return {
      ...classic,
      strategy: 'classic',
      tierAttempted: false,
      tierNumber: null,
    }
  }

  const routingEnabled = await isRoutingEnabled()
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
  const authorization = await enforceShareAuthorization(assessmentId, options?.preferredAttorneyIds)
  if (authorization.held) return authorization.held

  // A case whose authorization names particular firms is confined to them, even
  // when the caller asked for tier routing and named nobody. Otherwise releasing
  // a consumer's case from manual review would tier-route it to a firm they never
  // saw, which is the § 6155(g)(2) exposure the consumer-selection path exists to
  // avoid. Tier routing is left alone for cases that carry no named set.
  let preferredAttorneyIds = options?.preferredAttorneyIds
  if (!preferredAttorneyIds?.length && authorization.authorizedAttorneyIds.length > 0) {
    preferredAttorneyIds = authorization.authorizedAttorneyIds
    if (preferTierRouting) {
      logger.info('Confining routing to the firms the plaintiff authorized', {
        assessmentId,
        authorizedAttorneyIds: preferredAttorneyIds,
      })
    }
    preferTierRouting = false
  }

  // Suspicious-case review gate — held cases never reach an attorney (tier or
  // classic). Skipped when the caller explicitly bypasses (e.g. an admin
  // releasing a case after review, which must not be instantly re-flagged).
  let gateAlreadyRun = false
  if (!options?.skipPreRoutingGate) {
    const held = await enforcePreRoutingGate(assessmentId)
    if (held) return held
    gateAlreadyRun = true
  }
  // Avoid re-running the gate inside the classic engine when we've already run it,
  // and carry the authorized firm set through so the engine ranks within it.
  const engineOptions = {
    ...options,
    ...(preferredAttorneyIds?.length ? { preferredAttorneyIds } : {}),
    ...(gateAlreadyRun ? { skipPreRoutingGate: true } : {}),
  }

  let tierNumber: number | null = null
  if (preferTierRouting) {
    tierNumber = await getAssessmentTierNumber(assessmentId)
    if (tierNumber != null) {
      const tierResult = await runTierRoute(assessmentId, tierNumber)
      if (tierResult?.routed && tierResult.routedToFirmId) {
        await upsertTierLeadSubmission(assessmentId, tierResult.routedToFirmId)
        await recordRoutingEvent(assessmentId, tierResult.introductionId ?? null, tierResult.routedToFirmId, 'tier_routed', {
          tierNumber,
          method: tierResult.method,
        })
        return {
          success: true,
          strategy: 'tier',
          tierNumber,
          tierAttempted: true,
          gatePassed: true,
          routedTo: [tierResult.routedToFirmId],
          introductionIds: tierResult.introductionId ? [tierResult.introductionId] : [],
          method: tierResult.method,
          attempts: tierResult.attempts,
          price: tierResult.price,
          errors: [],
        }
      }

      if (!fallbackToClassic) {
        const held: AssessmentRoutingStartResult = {
          success: false,
          strategy: 'tier',
          tierNumber,
          tierAttempted: true,
          gatePassed: true,
          routedTo: [],
          introductionIds: [],
          holdReason: tierResult?.holdReason,
          method: tierResult?.method,
          attempts: tierResult?.attempts,
          price: tierResult?.price,
          errors: [tierResult?.error || tierResult?.holdReason || `Tier ${tierNumber} routing did not place the case`],
        }
        // Tier routing is the whole attempt when there is no classic fallback,
        // and its hold statuses are read by nothing, so without this the case
        // ends here with no attorney and no queue.
        await parkUnroutableCase(assessmentId, held)
        return held
      }

      await recordRoutingEvent(assessmentId, null, null, 'tier_fallback_to_classic', {
        tierNumber,
        holdReason: tierResult?.holdReason,
        error: tierResult?.error,
      })
    }
  }

  const classic = await runRoutingEngine(assessmentId, engineOptions)
  const outcome: AssessmentRoutingStartResult = {
    ...classic,
    strategy: 'classic',
    tierAttempted: preferTierRouting,
    tierNumber,
    tierOutcome: preferTierRouting ? 'fallback_to_classic' : undefined,
  }

  // A gate hold has already persisted its own state and told the plaintiff why;
  // this is only for the case that cleared every gate and still matched nobody.
  if (!outcome.success && !outcome.routedTo?.length && outcome.gatePassed !== false) {
    await parkUnroutableCase(assessmentId, outcome)
  }

  return outcome
}

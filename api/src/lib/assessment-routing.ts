import { prisma } from './prisma'
import { logger } from './logger'
import { runRoutingEngine, type RoutingEngineOptions, type RoutingEngineResult } from './routing-engine'
import { assignCaseTier } from './case-tier-classifier'
import { routeTier1Case } from './tier1-routing'
import { routeTier2Case } from './tier2-routing'
import { routeTier3Case } from './tier3-routing'
import { routeTier4Case } from './tier4-routing'
import { recordRoutingEvent } from './routing-lifecycle'
import { isRoutingEnabled } from './matching-rules-config'

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

export async function startAssessmentRouting(
  assessmentId: string,
  options?: RoutingEngineOptions & {
    preferTierRouting?: boolean
    fallbackToClassic?: boolean
  }
): Promise<AssessmentRoutingStartResult> {
  const preferTierRouting = options?.preferTierRouting ?? true
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
        return {
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
      }

      await recordRoutingEvent(assessmentId, null, null, 'tier_fallback_to_classic', {
        tierNumber,
        holdReason: tierResult?.holdReason,
        error: tierResult?.error,
      })
    }
  }

  const classic = await runRoutingEngine(assessmentId, options)
  return {
    ...classic,
    strategy: 'classic',
    tierAttempted: preferTierRouting,
    tierNumber,
    tierOutcome: preferTierRouting ? 'fallback_to_classic' : undefined,
  }
}

/**
 * Attorney Routing Engine
 * Controlled matching engine: case underwriting + marketplace routing + reputation system.
 *
 * Flow: normalize case → pre-routing gate → candidate pool → rank → route in waves
 */

import { prisma } from './prisma'
import { logger } from './logger'
import { normalizeCaseForRouting, type NormalizedCase } from './case-normalization'
import { runPreRoutingGate, type RoutingGateResult } from './pre-routing-gate'
import {
  filterEligibleAttorneys,
  filterQualifiedAttorneys,
  type CaseForRouting,
  type AttorneyForRouting,
  type MatchScore
} from './routing'
import { sendCaseOfferToAttorney } from './case-notifications'
import {
  recordRoutingEvent,
  isRoutingLocked,
  placeAssessmentInManualReview,
  WAVE_TIMING
} from './routing-lifecycle'
import { isRoutingEnabled } from './matching-rules-config'

/** New ranking formula weights per design doc */
const RANKING_WEIGHTS = {
  jurisdiction_fit: 0.20,
  case_type_fit: 0.20,
  economic_fit: 0.15,
  response_score: 0.15,
  conversion_score: 0.10,
  capacity_score: 0.10,
  plaintiff_fit: 0.05,
  strategic_priority: 0.05
}

function clampScore(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function safeJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function deriveCapacityScore(attorney: AttorneyForRouting): number {
  const weeklyLimit = attorney.attorneyProfile?.maxCasesPerWeek ?? null
  const monthlyLimit = attorney.attorneyProfile?.maxCasesPerMonth ?? null
  const weeklyLoad = attorney.currentCasesWeek ?? 0
  const monthlyLoad = attorney.currentCasesMonth ?? 0

  const weeklyRemaining = weeklyLimit && weeklyLimit > 0
    ? clampScore((weeklyLimit - weeklyLoad) / weeklyLimit)
    : null
  const monthlyRemaining = monthlyLimit && monthlyLimit > 0
    ? clampScore((monthlyLimit - monthlyLoad) / monthlyLimit)
    : null

  const scoredSignals = [weeklyRemaining, monthlyRemaining].filter((value): value is number => value !== null)
  if (scoredSignals.length > 0) {
    const remainingAverage = scoredSignals.reduce((sum, value) => sum + value, 0) / scoredSignals.length
    const reserveBonus = weeklyLoad === 0 && monthlyLoad === 0 ? 0.05 : 0
    return clampScore(remainingAverage + reserveBonus)
  }

  if (typeof attorney.responseTimeHours === 'number') {
    return clampScore(1 - (attorney.responseTimeHours / 96), 0.35, 1)
  }

  return 0.6
}

function derivePlaintiffFit(
  attorney: AttorneyForRouting,
  caseData: CaseForRouting,
  normalizedCase: NormalizedCase
): number {
  const plaintiffContext = (caseData.facts?.plaintiffContext || {}) as Record<string, unknown>
  const preferredContactMethod = String(plaintiffContext.preferredContactMethod || '').toLowerCase()
  const plaintiffLanguage = String(normalizedCase.plaintiff_language || '').trim().toLowerCase()
  const attorneyLanguages = safeJsonArray(attorney.attorneyProfile?.languages).map((value) => value.trim().toLowerCase())

  let languageScore = 0.6
  if (plaintiffLanguage) {
    languageScore = attorneyLanguages.some((language) =>
      language === plaintiffLanguage || language.startsWith(plaintiffLanguage) || plaintiffLanguage.startsWith(language)
    )
      ? 1
      : 0.35
  }

  let contactScore = 0.6
  const responseHours = attorney.responseTimeHours ?? 48
  if (preferredContactMethod === 'phone' || preferredContactMethod === 'call') {
    contactScore = responseHours <= 12 ? 0.95 : responseHours <= 24 ? 0.8 : 0.5
  } else if (preferredContactMethod === 'sms' || preferredContactMethod === 'text') {
    contactScore = responseHours <= 6 ? 0.95 : responseHours <= 12 ? 0.8 : 0.5
  } else if (preferredContactMethod === 'email') {
    contactScore = responseHours <= 24 ? 0.85 : responseHours <= 48 ? 0.7 : 0.5
  }

  return clampScore((languageScore * 0.7) + (contactScore * 0.3))
}

export interface RoutingEngineResult {
  success: boolean
  gatePassed: boolean
  gateReason?: string
  gateStatus?: 'needs_more_info' | 'manual_review' | 'not_routable_yet'
  normalizedCase?: NormalizedCase
  candidatesTotal?: number
  candidatesEligible?: number
  candidatesQualified?: number
  rankedCount?: number
  waveSize?: number
  routedTo?: string[]
  introductionIds?: string[]
  errors?: string[]
}

export interface RoutingEngineOptions {
  maxAttorneysPerWave?: number
  skipPreRoutingGate?: boolean
  dryRun?: boolean
  excludeAttorneyIds?: string[] // For escalation: don't re-route to attorneys already in wave 1
  waveNumber?: number // For escalation: wave 2 or 3
  preferredAttorneyIds?: string[] // Plaintiff-ranked attorney ids, in priority order
}

/**
 * Compute routing score using design doc formula:
 * routing_score = 0.20*jurisdiction + 0.20*case_type + 0.15*economic + 0.15*response
 *                + 0.10*conversion + 0.10*capacity + 0.05*plaintiff + 0.05*strategic
 */
function computeRoutingScore(
  attorney: AttorneyForRouting,
  caseData: CaseForRouting,
  normalizedCase: NormalizedCase,
  existingScores: MatchScore
): number {
  // Jurisdiction fit (from existing fit breakdown)
  const jurisdiction_fit = existingScores.breakdown?.fit?.jurisdiction ?? 0.5

  // Case type fit
  const case_type_fit = existingScores.breakdown?.fit?.caseType ?? 0.5

  // Economic fit (tier appetite + damages range)
  const economic_fit = existingScores.breakdown?.fit?.tierAppetite ?? 0.5

  // Response score (from trust/outcome)
  const response_score =
    (existingScores.breakdown?.trust?.responseTime ?? 0.5) * 0.5 +
    (existingScores.breakdown?.outcome?.speed ?? 0.5) * 0.5

  // Conversion score
  const conversion_score = existingScores.breakdown?.outcome?.signRate ?? 0.5

  // Capacity score (remaining headroom against actual recent routing load).
  const capacity_score = deriveCapacityScore(attorney)

  // Plaintiff fit (language + communication preference + responsiveness).
  const plaintiff_fit = derivePlaintiffFit(attorney, caseData, normalizedCase)

  // Strategic priority (subscription tier, premium partners)
  const strategic_priority = existingScores.breakdown?.value?.subscriptionTier ?? 0.5

  return (
    jurisdiction_fit * RANKING_WEIGHTS.jurisdiction_fit +
    case_type_fit * RANKING_WEIGHTS.case_type_fit +
    economic_fit * RANKING_WEIGHTS.economic_fit +
    response_score * RANKING_WEIGHTS.response_score +
    conversion_score * RANKING_WEIGHTS.conversion_score +
    capacity_score * RANKING_WEIGHTS.capacity_score +
    plaintiff_fit * RANKING_WEIGHTS.plaintiff_fit +
    strategic_priority * RANKING_WEIGHTS.strategic_priority
  )
}

/**
 * Run the full routing engine for a case.
 */
export async function runRoutingEngine(
  assessmentId: string,
  options?: RoutingEngineOptions
): Promise<RoutingEngineResult> {
  const maxPerWave = options?.maxAttorneysPerWave ?? 3
  const skipGate = options?.skipPreRoutingGate ?? false
  const dryRun = options?.dryRun ?? false

  const errors: string[] = []

  try {
    if (!(await isRoutingEnabled())) {
      return {
        success: false,
        gatePassed: false,
        gateReason: 'Routing disabled by admin',
        gateStatus: 'not_routable_yet',
        errors: ['Routing disabled by admin']
      }
    }

    // 1. Load assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        predictions: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    })

    if (!assessment) {
      return { success: false, gatePassed: false, errors: ['Assessment not found'] }
    }

    // 1b. Step 11: Don't route if case already locked (attorney accepted)
    if (await isRoutingLocked(assessmentId)) {
      return { success: false, gatePassed: false, errors: ['Case already matched to attorney'] }
    }

    // 2. Normalize case
    const normalizedCase = await normalizeCaseForRouting(assessment)
    logger.info('Case normalized for routing', { assessmentId, normalizedCase: { claim_type: normalizedCase.claim_type, jurisdiction_state: normalizedCase.jurisdiction_state } })

    // 3. Pre-routing gate
    let gateResult: RoutingGateResult = { pass: true }
    if (!skipGate) {
      gateResult = await runPreRoutingGate(normalizedCase)
      if (!gateResult.pass) {
        if (!dryRun) {
          if (gateResult.status === 'manual_review') {
            await placeAssessmentInManualReview(assessmentId, 'routing_gate_review', gateResult.reason)
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
                routingLocked: false
              },
              update: {
                lifecycleState: gateResult.status,
                routingLocked: false
              }
            })
          }
        }
        logger.info('Case failed pre-routing gate', {
          assessmentId,
          reason: gateResult.reason,
          status: gateResult.status
        })
        return {
          success: false,
          gatePassed: false,
          gateReason: gateResult.reason,
          gateStatus: gateResult.status,
          normalizedCase,
          errors: [gateResult.reason]
        }
      }
    }

    // 4. Build CaseForRouting for existing routing lib
    const caseData: CaseForRouting = {
      id: assessment.id,
      claimType: assessment.claimType,
      venueState: assessment.venueState,
      venueCounty: assessment.venueCounty ?? undefined,
      facts: assessment.facts ? JSON.parse(assessment.facts) : undefined,
      prediction: assessment.predictions[0]
        ? {
            viability: JSON.parse(assessment.predictions[0].viability),
            bands: JSON.parse(assessment.predictions[0].bands)
          }
        : undefined
    }

    // 5. Load attorneys and build AttorneyForRouting[]
    const attorneys = await prisma.attorney.findMany({
      where: { isActive: true },
      include: { attorneyProfile: true }
    })

    const now = new Date()
    const weekStart = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000))
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const attorneyIds = attorneys.map((attorney) => attorney.id)
    const recentIntroductions = attorneyIds.length > 0
      ? await prisma.introduction.findMany({
          where: {
            attorneyId: { in: attorneyIds },
            requestedAt: { gte: monthStart }
          },
          select: {
            attorneyId: true,
            requestedAt: true
          }
        })
      : []
    const casesThisWeekByAttorney = new Map<string, number>()
    const casesThisMonthByAttorney = new Map<string, number>()
    for (const intro of recentIntroductions) {
      casesThisMonthByAttorney.set(intro.attorneyId, (casesThisMonthByAttorney.get(intro.attorneyId) || 0) + 1)
      if (new Date(intro.requestedAt) >= weekStart) {
        casesThisWeekByAttorney.set(intro.attorneyId, (casesThisWeekByAttorney.get(intro.attorneyId) || 0) + 1)
      }
    }

    const attorneysForRouting: AttorneyForRouting[] = attorneys.map(a => ({
      id: a.id,
      isActive: a.isActive,
      isVerified: a.isVerified,
      specialties: a.specialties,
      responseTimeHours: a.responseTimeHours,
      averageRating: a.averageRating,
      totalReviews: a.totalReviews,
      subscriptionTier: a.attorneyProfile?.subscriptionTier ?? null,
      pricingModel: a.attorneyProfile?.pricingModel ?? null,
      paymentModel: a.attorneyProfile?.paymentModel ?? null,
      attorneyProfile: a.attorneyProfile
        ? {
            jurisdictions: a.attorneyProfile.jurisdictions,
            excludedCaseTypes: a.attorneyProfile.excludedCaseTypes,
            languages: a.attorneyProfile.languages,
            minInjurySeverity: a.attorneyProfile.minInjurySeverity,
            minDamagesRange: a.attorneyProfile.minDamagesRange,
            maxDamagesRange: a.attorneyProfile.maxDamagesRange,
            maxCasesPerWeek: a.attorneyProfile.maxCasesPerWeek,
            maxCasesPerMonth: a.attorneyProfile.maxCasesPerMonth,
            intakeHours: a.attorneyProfile.intakeHours,
            successRate: a.attorneyProfile.successRate,
            averageSettlement: a.attorneyProfile.averageSettlement,
            totalCases: a.attorneyProfile.totalCases,
            yearsExperience: a.attorneyProfile.yearsExperience
          }
        : null,
      currentCasesWeek: casesThisWeekByAttorney.get(a.id) || 0,
      currentCasesMonth: casesThisMonthByAttorney.get(a.id) || 0
    }))

    // 6. Candidate generation (hard filters)
    const excludeIds = new Set(options?.excludeAttorneyIds ?? [])
    const attorneysToConsider = excludeIds.size > 0
      ? attorneysForRouting.filter(a => !excludeIds.has(a.id))
      : attorneysForRouting
    const { eligible, ineligible } = await filterEligibleAttorneys(attorneysToConsider, caseData)
    if (eligible.length === 0) {
      const reasons = ineligible.slice(0, 3).map(i => i.reason)
      return {
        success: false,
        gatePassed: true,
        normalizedCase,
        candidatesTotal: attorneysForRouting.length,
        candidatesEligible: 0,
        errors: ['No eligible attorneys', ...reasons]
      }
    }

    // 7. Quality gate
    const { qualified, disqualified } = await filterQualifiedAttorneys(eligible, caseData)
    if (qualified.length === 0) {
      const reasons = disqualified.slice(0, 3).map(d => d.reason)
      return {
        success: false,
        gatePassed: true,
        normalizedCase,
        candidatesTotal: attorneysForRouting.length,
        candidatesEligible: eligible.length,
        candidatesQualified: 0,
        errors: ['No attorneys passed quality gate', ...reasons]
      }
    }

    // 8. Rank with new formula (re-use scoring, apply new weights)
    const { scoreAndRankAttorneys } = await import('./routing')
    const scored = await scoreAndRankAttorneys(qualified, caseData)

    // Re-rank using design doc formula
    const reranked = scored
      .map(({ attorney, score }) => ({
        attorney,
        score,
        routingScore: computeRoutingScore(attorney, caseData, normalizedCase, score)
      }))
      .sort((a, b) => b.routingScore - a.routingScore)

    // 9. Controlled wave: optionally honor the plaintiff's ranked attorney order first.
    const preferredAttorneyIds = (options?.preferredAttorneyIds || []).filter(Boolean)
    const rerankedByAttorneyId = new Map(reranked.map((entry) => [entry.attorney.id, entry]))
    const preferredOrdered = preferredAttorneyIds
      .map((attorneyId) => rerankedByAttorneyId.get(attorneyId))
      .filter((entry): entry is NonNullable<typeof entry> => !!entry)
    const waveAttorneys = (preferredOrdered.length > 0 ? preferredOrdered : reranked).slice(0, maxPerWave)

    if (dryRun) {
      return {
        success: true,
        gatePassed: true,
        normalizedCase,
        candidatesTotal: attorneysForRouting.length,
        candidatesEligible: eligible.length,
        candidatesQualified: qualified.length,
        rankedCount: reranked.length,
        waveSize: waveAttorneys.length,
        routedTo: waveAttorneys.map(w => w.attorney.id),
        errors: []
      }
    }

    // 10. Create introductions for wave only (Wave 1)
    const waveNumber = options?.waveNumber ?? 1
    const jurisdiction = [assessment.venueState, assessment.venueCounty].filter(Boolean).join(', ')
    const bands = caseData.prediction?.bands || {}
    const viability = caseData.prediction?.viability || {}
    const liabilityLabel = (viability.liability ?? 0.5) >= 0.7 ? 'Strong' : (viability.liability ?? 0.5) >= 0.4 ? 'Moderate' : 'Weak'
    const existingIntroductions = await prisma.introduction.findMany({
      where: {
        assessmentId,
        attorneyId: { in: waveAttorneys.map(({ attorney }) => attorney.id) }
      },
      select: { attorneyId: true }
    })
    const existingAttorneyIds = new Set(existingIntroductions.map((intro) => intro.attorneyId))
    const pendingWaveAttorneys = waveAttorneys.filter(({ attorney }) => !existingAttorneyIds.has(attorney.id))

    const introResults = await Promise.all(
      pendingWaveAttorneys.map(async ({ attorney }) => {
        const intro = await prisma.introduction.create({
          data: {
            assessmentId,
            attorneyId: attorney.id,
            status: 'PENDING',
            message: `Case routed via ClearCaseIQ matching engine`,
            requestedAt: new Date(),
            waveNumber
          }
        })

        await Promise.all([
          sendCaseOfferToAttorney(
            attorney.id,
            intro.id,
            {
              claimType: assessment.claimType,
              jurisdiction,
              estimatedValueLow: bands.p25 ?? 0,
              estimatedValueHigh: bands.p75 ?? 0,
              evidenceSummary: normalizedCase.medical_record_present ? 'Medical treatment documented' : 'See case file',
              liabilityConfidence: liabilityLabel,
              introductionId: intro.id,
              assessmentId
            },
            120
          ).catch(err => {
            logger.warn('Failed to send case offer', { attorneyId: attorney.id, error: (err as Error).message })
          }),
          recordRoutingEvent(assessmentId, intro.id, attorney.id, 'routed', { waveNumber })
        ])

        return { attorneyId: attorney.id, introId: intro.id }
      })
    )

    const introductionIds = introResults.map((result) => result.introId)
    const routedTo = introResults.map((result) => result.attorneyId)

    // Record RoutingWave for escalation (Step 13)
    if (routedTo.length > 0) {
      const nextEscalationAt = new Date()
      const waitHours = waveNumber === 1
        ? WAVE_TIMING.wave1WaitHours
        : waveNumber === 2
          ? WAVE_TIMING.wave2WaitHours
          : WAVE_TIMING.wave3WaitHours
      nextEscalationAt.setHours(nextEscalationAt.getHours() + waitHours)
      await prisma.routingWave.upsert({
        where: { assessmentId_waveNumber: { assessmentId, waveNumber } },
        create: {
          assessmentId,
          waveNumber,
          attorneyIds: JSON.stringify(routedTo),
          nextEscalationAt
        },
        update: {
          attorneyIds: JSON.stringify(routedTo),
          nextEscalationAt
        }
      })
    }

    // 11. Upsert LeadSubmission with assigned attorney (first in wave) - only for wave 1
    if (routedTo.length > 0 && waveNumber === 1) {
      const firstAttorneyId = routedTo[0]
      const viability = (caseData.prediction?.viability || {}) as Record<string, number>
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
          sourceType: 'routing_engine',
          assignedAttorneyId: firstAttorneyId,
          assignmentType: 'shared',
          status: 'submitted',
          lifecycleState: 'routing_active'
        },
        update: {
          assignedAttorneyId: firstAttorneyId,
          assignmentType: 'shared',
          sourceType: 'routing_engine',
          lifecycleState: 'routing_active'
        }
      })
    }

    logger.info('Routing engine completed', {
      assessmentId,
      candidatesEligible: eligible.length,
      candidatesQualified: qualified.length,
      waveSize: waveAttorneys.length,
      routedTo
    })

    return {
      success: true,
      gatePassed: true,
      normalizedCase,
      candidatesTotal: attorneysForRouting.length,
      candidatesEligible: eligible.length,
      candidatesQualified: qualified.length,
      rankedCount: reranked.length,
      waveSize: waveAttorneys.length,
      routedTo,
      introductionIds,
      errors
    }
  } catch (error: any) {
    logger.error('Routing engine error', { assessmentId, error: error.message })
    errors.push(error.message)
    return {
      success: false,
      gatePassed: false,
      errors
    }
  }
}

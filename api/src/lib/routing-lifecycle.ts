/**
 * Routing Lifecycle: Steps 10-20
 * Attorney actions, case locking, escalation, analytics, reputation.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import {
  sendPlaintiffAttorneyAccepted,
  sendPlaintiffManualReviewNeeded
} from './case-notifications'
import { getConfiguredWaveSize, getConfiguredWaveWaitHours, getMatchingRules } from './matching-rules-config'

const PROJECTED_CONTINGENCY_RATE = 0.33
const PROJECTED_PLATFORM_FEE_RATE = 0.1

export const WAVE_TIMING = {
  wave1WaitHours: 4,
  wave2WaitHours: 12,
  wave3WaitHours: 24
}

type LeadLifecycleState =
  | 'routing_active'
  | 'attorney_review'
  | 'attorney_matched'
  | 'manual_review_needed'
  | 'plaintiff_info_requested'
  | 'consultation_scheduled'
  | 'engaged'
  | 'closed'
  | 'needs_more_info'
  | 'not_routable_yet'

function parseLeadSourceDetails(sourceDetails?: string | null): Record<string, unknown> {
  if (!sourceDetails) return {}
  try {
    const parsed = JSON.parse(sourceDetails) as unknown
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function getRankedAttorneyIdsFromLead(lead: { sourceDetails?: string | null } | null | undefined): string[] {
  const parsed = parseLeadSourceDetails(lead?.sourceDetails)
  const preferences = parsed.plaintiffAttorneyPreferences
  if (!preferences || typeof preferences !== 'object') return []
  const rankedAttorneyIds = (preferences as Record<string, unknown>).rankedAttorneyIds
  return Array.isArray(rankedAttorneyIds)
    ? rankedAttorneyIds.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : []
}

function buildUpdatedLeadSourceDetails(params: {
  currentSourceDetails?: string | null
  rankedAttorneyIds: string[]
  source: 'plaintiff' | 'system_generated'
}) {
  const parsed = parseLeadSourceDetails(params.currentSourceDetails)
  const existingPreferences = parsed.plaintiffAttorneyPreferences
  const previousBatchNumber =
    existingPreferences && typeof existingPreferences === 'object' && typeof (existingPreferences as Record<string, unknown>).batchNumber === 'number'
      ? Number((existingPreferences as Record<string, unknown>).batchNumber)
      : 1

  return JSON.stringify({
    ...parsed,
    plaintiffAttorneyPreferences: {
      ...(existingPreferences && typeof existingPreferences === 'object' ? existingPreferences as Record<string, unknown> : {}),
      rankedAttorneyIds: params.rankedAttorneyIds,
      mode: 'sequential_ranked_top3',
      source: params.source,
      batchNumber: params.source === 'plaintiff' ? 1 : previousBatchNumber + 1,
      rankedAt: new Date().toISOString()
    }
  })
}

async function generateNextRankedBatch(
  assessmentId: string,
  lead: { sourceDetails?: string | null }
): Promise<{ generated: boolean; lead?: { sourceDetails?: string | null }; attorneyIds?: string[]; error?: string }> {
  const existingIntroductions = await prisma.introduction.findMany({
    where: { assessmentId },
    select: { attorneyId: true }
  })
  const excludeAttorneyIds = [...new Set(existingIntroductions.map((intro) => intro.attorneyId))]
  const { runRoutingEngine } = await import('./routing-engine')
  const matchingRules = await getMatchingRules()
  const dryRunResult = await runRoutingEngine(assessmentId, {
    maxAttorneysPerWave: getConfiguredWaveSize(matchingRules, 1),
    skipPreRoutingGate: true,
    dryRun: true,
    excludeAttorneyIds
  })

  if (!dryRunResult.success || !dryRunResult.routedTo?.length) {
    return {
      generated: false,
      error: dryRunResult.errors?.[0] || 'No additional attorneys available for a fresh batch'
    }
  }

  const attorneyIds = dryRunResult.routedTo.slice(0, 3)
  const sourceDetails = buildUpdatedLeadSourceDetails({
    currentSourceDetails: lead.sourceDetails,
    rankedAttorneyIds: attorneyIds,
    source: 'system_generated'
  })

  await prisma.leadSubmission.update({
    where: { assessmentId },
    data: {
      sourceDetails,
      lifecycleState: 'routing_active',
      lastContactAt: new Date()
    }
  })

  await recordRoutingEvent(assessmentId, null, null, 'plaintiff_rank_batch_generated', {
    attorneyCount: attorneyIds.length
  })

  return {
    generated: true,
    lead: { sourceDetails },
    attorneyIds
  }
}

async function advanceRankedRouting(
  assessmentId: string,
  lead: { sourceDetails?: string | null },
  reason: 'declined' | 'timeout'
): Promise<{ routed: boolean; exhausted: boolean; generatedBatch: boolean; waveNumber?: number; attorneyId?: string; error?: string }> {
  const initialAttempt = await routeNextRankedAttorney(assessmentId, lead, reason)
  if (initialAttempt.routed) {
    return { ...initialAttempt, generatedBatch: false }
  }

  if (!initialAttempt.exhausted) {
    return { ...initialAttempt, generatedBatch: false }
  }

  const generatedBatch = await generateNextRankedBatch(assessmentId, lead)
  if (!generatedBatch.generated || !generatedBatch.lead) {
    return {
      routed: false,
      exhausted: true,
      generatedBatch: false,
      error: generatedBatch.error || initialAttempt.error
    }
  }

  const generatedAttempt = await routeNextRankedAttorney(assessmentId, generatedBatch.lead, reason)
  return {
    ...generatedAttempt,
    generatedBatch: true,
    error: generatedAttempt.error || generatedBatch.error
  }
}

async function routeNextRankedAttorney(
  assessmentId: string,
  lead: { sourceDetails?: string | null },
  reason: 'declined' | 'timeout'
): Promise<{ routed: boolean; exhausted: boolean; waveNumber?: number; attorneyId?: string; error?: string }> {
  const rankedAttorneyIds = getRankedAttorneyIdsFromLead(lead)
  if (rankedAttorneyIds.length === 0) {
    return { routed: false, exhausted: false, error: 'No plaintiff-ranked attorney queue found' }
  }

  const [existingIntroductions, latestWave] = await Promise.all([
    prisma.introduction.findMany({
      where: { assessmentId },
      select: { attorneyId: true }
    }),
    prisma.routingWave.findFirst({
      where: { assessmentId },
      orderBy: { waveNumber: 'desc' },
      select: { waveNumber: true }
    })
  ])

  const attemptedAttorneyIds = new Set(existingIntroductions.map((intro) => intro.attorneyId))
  const remainingAttorneyIds = rankedAttorneyIds.filter((attorneyId) => !attemptedAttorneyIds.has(attorneyId))
  if (remainingAttorneyIds.length === 0) {
    return { routed: false, exhausted: true, error: 'All ranked attorneys have already been tried' }
  }

  const { runRoutingEngine } = await import('./routing-engine')
  const waveNumber = (latestWave?.waveNumber ?? 0) + 1
  const errors: string[] = []

  for (const attorneyId of remainingAttorneyIds) {
    const result = await runRoutingEngine(assessmentId, {
      maxAttorneysPerWave: 1,
      skipPreRoutingGate: true,
      dryRun: false,
      preferredAttorneyIds: [attorneyId],
      waveNumber
    })

    if (result.success && result.routedTo?.length) {
      await updateLeadLifecycleState(assessmentId, 'attorney_review', {
        assignedAttorneyId: attorneyId,
        assignmentType: 'shared',
        lastContactAt: new Date()
      })
      await recordRoutingEvent(
        assessmentId,
        result.introductionIds?.[0] ?? null,
        attorneyId,
        'plaintiff_rank_advanced',
        {
          reason,
          rank: rankedAttorneyIds.indexOf(attorneyId) + 1
        }
      )
      return { routed: true, exhausted: false, waveNumber, attorneyId }
    }

    if (result.errors?.length) {
      errors.push(...result.errors)
    }
  }

  return {
    routed: false,
    exhausted: true,
    waveNumber,
    error: errors[0] || 'No ranked attorneys remained routable'
  }
}

function buildDecisionRecommendation(lead: {
  viabilityScore?: number | null
  liabilityScore?: number | null
  causationScore?: number | null
  damagesScore?: number | null
}, evidenceCount: number) {
  const viability = Number(lead.viabilityScore || 0)
  const liability = Number(lead.liabilityScore || 0)
  const causation = Number(lead.causationScore || 0)
  const damages = Number(lead.damagesScore || 0)
  const averageScore = (viability + liability + causation + damages) / 4
  const evidenceScore = Math.min(1, evidenceCount / 5)
  const weightedScore = averageScore * 0.7 + evidenceScore * 0.3
  const recommendedDecision = averageScore >= 0.6 && evidenceScore >= 0.4 ? 'accept' : 'reject'

  return {
    recommendedDecision,
    recommendedConfidence: Math.round(weightedScore * 100),
    recommendedRationale: `Scores avg ${(averageScore * 100).toFixed(0)}% with ${evidenceCount} evidence files.`,
    recommendedData: JSON.stringify({
      viability,
      liability,
      causation,
      damages,
      averageScore,
      evidenceCount,
      evidenceScore
    })
  }
}

async function updateLeadLifecycleState(
  assessmentId: string,
  lifecycleState: LeadLifecycleState,
  extraData?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.leadSubmission.update({
      where: { assessmentId },
      data: {
        lifecycleState,
        ...(extraData || {})
      }
    })
  } catch (err: unknown) {
    logger.warn('Failed to update lead lifecycle state', {
      assessmentId,
      lifecycleState,
      error: (err as Error).message
    })
  }
}

async function recordProjectedRevenue(
  assessmentId: string,
  introductionId: string | null,
  attorneyId: string
): Promise<void> {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { bands: true }
        }
      }
    })
    const bandsRaw = assessment?.predictions?.[0]?.bands
    const bands = bandsRaw ? JSON.parse(bandsRaw) as { median?: number } : {}
    const caseMedianValue = Number(bands.median || 0)
    if (!caseMedianValue) return

    const projectedFeeRevenue = Math.round(caseMedianValue * PROJECTED_CONTINGENCY_RATE * PROJECTED_PLATFORM_FEE_RATE)
    await recordRoutingEvent(assessmentId, introductionId, attorneyId, 'revenue_projected', {
      caseMedianValue,
      contingencyRate: PROJECTED_CONTINGENCY_RATE,
      platformFeeRate: PROJECTED_PLATFORM_FEE_RATE,
      projectedFeeRevenue
    })
  } catch (err: unknown) {
    logger.warn('Failed to record projected revenue', {
      assessmentId,
      attorneyId,
      error: (err as Error).message
    })
  }
}

export async function syncDecisionMemoryForAssessment(params: {
  assessmentId: string
  attorneyId: string
  attorneyDecision?: string | null
  attorneyRationale?: string | null
  outcomeStatus?: string | null
  outcomeNotes?: string | null
}): Promise<void> {
  try {
    const lead = await prisma.leadSubmission.findUnique({
      where: { assessmentId: params.assessmentId },
      select: {
        id: true,
        assessmentId: true,
        viabilityScore: true,
        liabilityScore: true,
        causationScore: true,
        damagesScore: true,
      }
    })
    if (!lead) return

    const [attorney, evidenceCount] = await Promise.all([
      prisma.attorney.findUnique({
        where: { id: params.attorneyId },
        select: { lawFirmId: true }
      }),
      prisma.evidenceFile.count({
        where: { assessmentId: params.assessmentId }
      })
    ])

    const recommendation = buildDecisionRecommendation(lead, evidenceCount)
    const override = params.attorneyDecision
      ? params.attorneyDecision !== recommendation.recommendedDecision
      : false

    await prisma.decisionMemory.upsert({
      where: { leadId: lead.id },
      create: {
        leadId: lead.id,
        assessmentId: params.assessmentId,
        attorneyId: params.attorneyId,
        lawFirmId: attorney?.lawFirmId || null,
        ...recommendation,
        attorneyDecision: params.attorneyDecision ?? null,
        attorneyRationale: params.attorneyRationale ?? null,
        override,
        decisionAt: params.attorneyDecision ? new Date() : null,
        outcomeStatus: params.outcomeStatus ?? null,
        outcomeNotes: params.outcomeNotes ?? null,
        outcomeAt: params.outcomeStatus ? new Date() : null
      },
      update: {
        ...recommendation,
        attorneyDecision: params.attorneyDecision ?? undefined,
        attorneyRationale: params.attorneyRationale ?? undefined,
        override,
        decisionAt: params.attorneyDecision ? new Date() : undefined,
        outcomeStatus: params.outcomeStatus ?? undefined,
        outcomeNotes: params.outcomeNotes ?? undefined,
        outcomeAt: params.outcomeStatus ? new Date() : undefined
      }
    })
  } catch (err: unknown) {
    logger.warn('Failed to sync routing decision memory', {
      assessmentId: params.assessmentId,
      attorneyId: params.attorneyId,
      error: (err as Error).message
    })
  }
}

export async function placeAssessmentInManualReview(
  assessmentId: string,
  reason: string,
  note?: string
): Promise<void> {
  try {
    await Promise.all([
      prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          manualReviewStatus: 'pending',
          manualReviewReason: reason,
          manualReviewHeldAt: new Date(),
          manualReviewNote: note || null
        }
      }),
      prisma.leadSubmission.upsert({
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
          status: 'submitted',
          lifecycleState: 'manual_review_needed',
          routingLocked: false
        },
        update: {
          lifecycleState: 'manual_review_needed',
          routingLocked: false
        }
      })
    ])
    await recordRoutingEvent(assessmentId, null, null, 'manual_review_needed', { reason, note })
    await sendPlaintiffManualReviewNeeded(assessmentId, reason, note)
  } catch (err: unknown) {
    logger.error('Failed to place assessment in manual review', {
      assessmentId,
      reason,
      error: (err as Error).message
    })
  }
}

/**
 * Step 10 & 11: Attorney accepts case → lock routing, notify plaintiff
 */
export async function attorneyAcceptCase(
  introductionId: string,
  attorneyId: string
): Promise<{ success: boolean; error?: string }> {
  const intro = await prisma.introduction.findUnique({
    where: { id: introductionId },
    include: {
      assessment: { include: { leadSubmission: true, user: true } },
      attorney: {
        include: {
          attorneyProfile: true,
          lawFirm: true
        }
      }
    }
  })

  if (!intro || intro.attorneyId !== attorneyId) {
    return { success: false, error: 'Introduction not found or unauthorized' }
  }
  if (intro.status !== 'PENDING') {
    return { success: false, error: `Introduction already ${intro.status}` }
  }

  await prisma.$transaction(async tx => {
    await tx.introduction.update({
      where: { id: introductionId },
      data: { status: 'ACCEPTED', respondedAt: new Date() }
    })

    if (intro.assessment.leadSubmission) {
      await tx.leadSubmission.update({
        where: { assessmentId: intro.assessmentId },
        data: {
          assignedAttorneyId: attorneyId,
          assignmentType: 'exclusive',
          status: 'contacted',
          lifecycleState: 'attorney_matched',
          routingLocked: true,
          lastContactAt: new Date()
        }
      })
    }
  })

  // Step 14: Analytics
  await recordRoutingEvent(intro.assessmentId, introductionId, attorneyId, 'accepted', {
    responseTimeMs: Date.now() - intro.requestedAt.getTime()
  })
  await updateLeadLifecycleState(intro.assessmentId, 'attorney_matched', {
    routingLocked: true,
    status: 'contacted',
    lastContactAt: new Date()
  })
  await syncDecisionMemoryForAssessment({
    assessmentId: intro.assessmentId,
    attorneyId,
    attorneyDecision: 'accept'
  })
  await recordProjectedRevenue(intro.assessmentId, introductionId, attorneyId)

  // Step 12: Notify plaintiff
  await sendPlaintiffAttorneyAccepted(
    intro.assessmentId,
    attorneyId,
    intro.attorney.name,
    intro.attorney.lawFirm?.name,
    intro.attorney.attorneyProfile?.yearsExperience ?? undefined
  )
  await calculateAttorneyReputationScore(attorneyId).catch((err: unknown) => {
    logger.warn('Failed to recalculate attorney reputation after acceptance', {
      attorneyId,
      error: (err as Error).message
    })
  })

  logger.info('Attorney accepted case', { introductionId, attorneyId, assessmentId: intro.assessmentId })
  return { success: true }
}

/**
 * Step 10: Attorney declines case
 */
export async function attorneyDeclineCase(
  introductionId: string,
  attorneyId: string,
  declineReason?: string
): Promise<{ success: boolean; error?: string }> {
  const intro = await prisma.introduction.findFirst({
    where: { id: introductionId, attorneyId }
  })
  if (!intro || intro.status !== 'PENDING') {
    return { success: false, error: 'Introduction not found or already responded' }
  }

  await prisma.introduction.update({
    where: { id: introductionId },
    data: { status: 'DECLINED', respondedAt: new Date(), declineReason: declineReason || null }
  })

  await recordRoutingEvent(intro.assessmentId, introductionId, attorneyId, 'declined', { declineReason })
  await syncDecisionMemoryForAssessment({
    assessmentId: intro.assessmentId,
    attorneyId,
    attorneyDecision: 'reject',
    attorneyRationale: declineReason || null,
    outcomeStatus: 'lost',
    outcomeNotes: declineReason || null
  })
  await calculateAttorneyReputationScore(attorneyId).catch((err: unknown) => {
    logger.warn('Failed to recalculate attorney reputation after decline', {
      attorneyId,
      error: (err as Error).message
    })
  })

  const lead = await prisma.leadSubmission.findUnique({
    where: { assessmentId: intro.assessmentId },
    select: {
      routingLocked: true,
      sourceDetails: true
    }
  })

  if (!lead?.routingLocked && getRankedAttorneyIdsFromLead(lead).length > 0) {
    const nextRankedRoute = await advanceRankedRouting(intro.assessmentId, lead ?? {}, 'declined')
    if (nextRankedRoute.routed) {
      logger.info('Advanced to next ranked attorney after decline', {
        assessmentId: intro.assessmentId,
        declinedAttorneyId: attorneyId,
        nextAttorneyId: nextRankedRoute.attorneyId,
        waveNumber: nextRankedRoute.waveNumber,
        generatedBatch: nextRankedRoute.generatedBatch
      })
      return { success: true }
    }

    await placeAssessmentInManualReview(
      intro.assessmentId,
      'plaintiff_ranked_routing_exhausted',
      'All plaintiff-ranked attorneys declined, timed out, or became unavailable.'
    )
    logger.info('Plaintiff-ranked routing exhausted after decline', {
      assessmentId: intro.assessmentId,
      declinedAttorneyId: attorneyId,
      error: nextRankedRoute.error
    })
    return { success: true }
  }

  await updateLeadLifecycleState(intro.assessmentId, 'routing_active')
  logger.info('Attorney declined case', { introductionId, attorneyId, declineReason })
  return { success: true }
}

/**
 * Step 10: Attorney requests more info
 */
export async function attorneyRequestMoreInfo(
  introductionId: string,
  attorneyId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const intro = await prisma.introduction.findFirst({
    where: { id: introductionId, attorneyId }
  })
  if (!intro || intro.status !== 'PENDING') {
    return { success: false, error: 'Introduction not found or already responded' }
  }

  await prisma.introduction.update({
    where: { id: introductionId },
    data: { status: 'REQUESTED_INFO', respondedAt: new Date(), requestedInfoNotes: notes }
  })

  await recordRoutingEvent(intro.assessmentId, introductionId, attorneyId, 'requested_info', { notes })
  await updateLeadLifecycleState(intro.assessmentId, 'plaintiff_info_requested', {
    lastContactAt: new Date()
  })
  await syncDecisionMemoryForAssessment({
    assessmentId: intro.assessmentId,
    attorneyId,
    attorneyDecision: 'request_info',
    attorneyRationale: notes || null
  })
  await calculateAttorneyReputationScore(attorneyId).catch((err: unknown) => {
    logger.warn('Failed to recalculate attorney reputation after info request', {
      attorneyId,
      error: (err as Error).message
    })
  })
  logger.info('Attorney requested more info', { introductionId, attorneyId })
  return { success: true }
}

/**
 * Step 14: Record routing analytics event
 */
export async function recordRoutingEvent(
  assessmentId: string,
  introductionId: string | null,
  attorneyId: string | null,
  eventType: string,
  eventData?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.routingAnalytics.create({
      data: {
        assessmentId,
        introductionId,
        attorneyId,
        eventType,
        eventData: eventData ? JSON.stringify(eventData) : null
      }
    })
  } catch (err: unknown) {
    logger.error('Failed to record routing event', { assessmentId, eventType, error: (err as Error).message })
  }
}

/**
 * Step 11: Check if routing is locked (attorney already accepted)
 */
export async function isRoutingLocked(assessmentId: string): Promise<boolean> {
  const lead = await prisma.leadSubmission.findUnique({
    where: { assessmentId }
  })
  return !!lead?.routingLocked
}

/**
 * Step 13: Run next escalation wave
 * Called when wave N timeout expires and no attorney has accepted
 */
export async function runEscalationWave(assessmentId: string): Promise<{
  escalated: boolean
  waveNumber?: number
  error?: string
}> {
  const matchingRules = await getMatchingRules()
  if (matchingRules.routingEnabled === false) {
    return { escalated: false, error: 'Routing disabled by admin' }
  }

  const lead = await prisma.leadSubmission.findUnique({
    where: { assessmentId }
  })
  if (!lead || lead.routingLocked) {
    return { escalated: false, error: 'Case not in routing or already matched' }
  }

  const rankedAttorneyIds = getRankedAttorneyIdsFromLead(lead)
  if (rankedAttorneyIds.length > 0) {
    const nextRankedRoute = await advanceRankedRouting(assessmentId, lead, 'timeout')
    if (nextRankedRoute.routed) {
      logger.info('Advanced to next ranked attorney after timeout', {
        assessmentId,
        nextAttorneyId: nextRankedRoute.attorneyId,
        waveNumber: nextRankedRoute.waveNumber,
        generatedBatch: nextRankedRoute.generatedBatch
      })
      return {
        escalated: true,
        waveNumber: nextRankedRoute.waveNumber
      }
    }

    await placeAssessmentInManualReview(
      assessmentId,
      'plaintiff_ranked_routing_exhausted',
      'No plaintiff-ranked attorney accepted the case before the ranking queue was exhausted.'
    )
    await recordRoutingEvent(assessmentId, null, null, 'escalated', {
      manualReview: true,
      rankedFlow: true,
      failureReason: nextRankedRoute.error || 'No ranked attorneys remaining'
    })
    logger.info('Plaintiff-ranked routing exhausted after timeout', {
      assessmentId,
      error: nextRankedRoute.error
    })
    return {
      escalated: false,
      waveNumber: rankedAttorneyIds.length,
      error: nextRankedRoute.error || 'No ranked attorneys remaining'
    }
  }

  const latestWave = await prisma.routingWave.findFirst({
    where: { assessmentId },
    orderBy: { waveNumber: 'desc' }
  })

  const nextWave = (latestWave?.waveNumber ?? 0) + 1

  if (latestWave?.nextEscalationAt) {
    const overdueHours = (Date.now() - latestWave.nextEscalationAt.getTime()) / (1000 * 60 * 60)
    const alertThresholdHours = Math.max(24, getConfiguredWaveWaitHours(matchingRules, latestWave.waveNumber) * 2)
    if (overdueHours > alertThresholdHours) {
      await recordRoutingEvent(assessmentId, null, null, 'routing_overdue', {
        waveNumber: latestWave.waveNumber,
        overdueHours: Math.round(overdueHours * 10) / 10,
        alertThresholdHours,
      })
    }
  }

  // Get all attorneys already routed (from previous waves)
  const existingIntros = await prisma.introduction.findMany({
    where: { assessmentId },
    select: { attorneyId: true }
  })
  const excludeAttorneyIds = [...new Set(existingIntros.map(i => i.attorneyId))]

  async function moveEscalationToManualReview(reason: string, failedWaveNumber: number) {
    if (latestWave) {
      await prisma.routingWave.update({
        where: { assessmentId_waveNumber: { assessmentId, waveNumber: latestWave.waveNumber } },
        data: { escalatedAt: new Date(), nextEscalationAt: null }
      })
    }

    await placeAssessmentInManualReview(
      assessmentId,
      'routing_timeout',
      `Routing escalation stopped after wave ${failedWaveNumber}: ${reason}`
    )
    await recordRoutingEvent(assessmentId, null, null, 'escalated', {
      waveNumber: failedWaveNumber,
      manualReview: true,
      failureReason: reason
    })
    logger.info('Case moved to manual review after escalation failure', {
      assessmentId,
      failedWaveNumber,
      reason
    })
  }

  if (nextWave > 3) {
    if (latestWave) {
      await prisma.routingWave.update({
        where: { assessmentId_waveNumber: { assessmentId, waveNumber: latestWave.waveNumber } },
        data: { escalatedAt: new Date(), nextEscalationAt: null }
      })
    }
    await placeAssessmentInManualReview(
      assessmentId,
      'routing_timeout',
      'No attorney accepted after all routing waves.'
    )
    await recordRoutingEvent(assessmentId, null, null, 'escalated', { finalWave: true, manualReview: true })
    logger.info('Case flagged for manual review after wave 3', { assessmentId })
    return { escalated: false, waveNumber: 3 }
  }

  // Run routing engine for next wave (will add more attorneys, excluding already-routed)
  const { runRoutingEngine } = await import('./routing-engine')
  const result = await runRoutingEngine(assessmentId, {
    maxAttorneysPerWave: getConfiguredWaveSize(matchingRules, nextWave),
    skipPreRoutingGate: true, // Already passed
    dryRun: false,
    excludeAttorneyIds,
    waveNumber: nextWave
  })

  if (!result.success || !result.routedTo?.length) {
    const reason = result.errors?.[0] || `No new attorneys available for wave ${nextWave}`
    await moveEscalationToManualReview(reason, nextWave)
    return { escalated: false, waveNumber: nextWave, error: reason }
  }

  const nextEscalationAt = new Date()
  nextEscalationAt.setTime(nextEscalationAt.getTime() + getConfiguredWaveWaitHours(matchingRules, nextWave) * 60 * 60 * 1000)

  await prisma.routingWave.upsert({
    where: {
      assessmentId_waveNumber: { assessmentId, waveNumber: nextWave }
    },
    create: {
      assessmentId,
      waveNumber: nextWave,
      attorneyIds: JSON.stringify(result.routedTo),
      nextEscalationAt: nextWave < 3 ? nextEscalationAt : null,
      escalatedAt: new Date()
    },
    update: {
      attorneyIds: JSON.stringify(result.routedTo),
      nextEscalationAt: nextWave < 3 ? nextEscalationAt : null,
      escalatedAt: new Date()
    }
  })

  // Mark previous wave as escalated so cron doesn't re-pick it
  if (latestWave) {
    await prisma.routingWave.update({
      where: { assessmentId_waveNumber: { assessmentId, waveNumber: latestWave.waveNumber } },
      data: { escalatedAt: new Date() }
    })
  }

  await recordRoutingEvent(assessmentId, null, null, 'escalated', {
    waveNumber: nextWave,
    attorneyCount: result.routedTo.length
  })
  await updateLeadLifecycleState(assessmentId, 'attorney_review', {
    lastContactAt: new Date()
  })

  logger.info('Escalation wave sent', { assessmentId, waveNumber: nextWave, attorneyCount: result.routedTo.length })
  return { escalated: true, waveNumber: nextWave }
}

/**
 * Step 15: Calculate attorney reputation score
 * attorney_score = 0.30*response_speed + 0.25*acceptance_rate + 0.20*plaintiff_satisfaction
 *                + 0.15*case_follow_through + 0.10*evidence_request_quality
 */
export async function calculateAttorneyReputationScore(attorneyId: string): Promise<void> {
  const introductions = await prisma.introduction.findMany({
    where: { attorneyId },
    select: { status: true, requestedAt: true, respondedAt: true }
  })

  const total = introductions.length
  if (total === 0) return

  const accepted = introductions.filter(i => i.status === 'ACCEPTED' || i.status === 'RETAINED').length
  const acceptanceRate = accepted / total

  const responded = introductions.filter(i => i.respondedAt)
  const avgResponseHours = responded.length > 0
    ? responded.reduce((sum, i) => {
        const ms = i.respondedAt!.getTime() - i.requestedAt.getTime()
        return sum + ms / (1000 * 60 * 60)
      }, 0) / responded.length
    : 24
  const responseSpeedScore = avgResponseHours <= 2 ? 1 : avgResponseHours <= 8 ? 0.8 : avgResponseHours <= 24 ? 0.6 : 0.4

  const reviews = await prisma.attorneyReview.aggregate({
    where: { attorneyId },
    _avg: { rating: true },
    _count: true
  })
  const plaintiffSatisfaction = reviews._count > 0 ? (reviews._avg.rating ?? 3) / 5 : 0.5

  const caseFollowThrough = 0.7 // TODO: derive from lead contact/conversion
  const evidenceRequestQuality = 0.7 // TODO: derive from request quality

  const overallScore =
    responseSpeedScore * 0.3 +
    acceptanceRate * 0.25 +
    plaintiffSatisfaction * 0.2 +
    caseFollowThrough * 0.15 +
    evidenceRequestQuality * 0.1

  await prisma.attorneyReputationScore.upsert({
    where: { attorneyId },
    create: {
      attorneyId,
      responseSpeedScore,
      acceptanceRate,
      plaintiffSatisfaction,
      caseFollowThrough,
      evidenceRequestQuality,
      overallScore,
      lastCalculatedAt: new Date()
    },
    update: {
      responseSpeedScore,
      acceptanceRate,
      plaintiffSatisfaction,
      caseFollowThrough,
      evidenceRequestQuality,
      overallScore,
      lastCalculatedAt: new Date()
    }
  })
}

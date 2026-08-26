/**
 * Routing Lifecycle: Steps 10-20
 * Attorney actions, case locking, escalation, analytics, reputation.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import {
  sendPlaintiffAttorneyAccepted,
  sendPlaintiffBatchApprovalRequest,
  sendPlaintiffManualReviewNeeded,
  sendPlaintiffNoAttorneyResponse
} from './case-notifications'
import { getAttorneyResponseDeadlineMinutes, getConfiguredWaveSize, getConfiguredWaveWaitHours, getMatchingRules } from './matching-rules-config'
import { assertShareAuthorization, recordShareAuthorization } from './share-authorization'

const PROJECTED_CONTINGENCY_RATE = 0.33
const PROJECTED_PLATFORM_FEE_RATE = 0.1

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
  | 'awaiting_plaintiff_batch_approval'

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

/**
 * Attorneys the consumer explicitly took off their slate.
 *
 * A removal is a standing instruction, not a one-time reorder: we must never
 * re-propose someone the consumer already rejected, or the "you choose who is
 * contacted" representation on the results page stops being true.
 */
function getDismissedAttorneyIdsFromLead(lead: { sourceDetails?: string | null } | null | undefined): string[] {
  const preferences = parseLeadSourceDetails(lead?.sourceDetails).plaintiffAttorneyPreferences
  if (!preferences || typeof preferences !== 'object') return []
  const dismissed = (preferences as Record<string, unknown>).dismissedAttorneyIds
  return Array.isArray(dismissed)
    ? dismissed.filter((value): value is string => typeof value === 'string' && value.length > 0)
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

export interface PendingRankedBatch {
  candidateAttorneyIds: string[]
  batchNumber: number
  proposedAt: string
}

function getPendingBatchFromLead(lead: { sourceDetails?: string | null } | null | undefined): PendingRankedBatch | null {
  const preferences = parseLeadSourceDetails(lead?.sourceDetails).plaintiffAttorneyPreferences
  if (!preferences || typeof preferences !== 'object') return null
  const pending = (preferences as Record<string, unknown>).pendingBatch
  if (!pending || typeof pending !== 'object') return null
  const candidateAttorneyIds = (pending as Record<string, unknown>).candidateAttorneyIds
  if (!Array.isArray(candidateAttorneyIds) || candidateAttorneyIds.length === 0) return null
  return {
    candidateAttorneyIds: candidateAttorneyIds.filter((v): v is string => typeof v === 'string' && v.length > 0),
    batchNumber: Number((pending as Record<string, unknown>).batchNumber ?? 2),
    proposedAt: String((pending as Record<string, unknown>).proposedAt ?? new Date().toISOString())
  }
}

function writePendingBatchIntoSourceDetails(params: {
  currentSourceDetails?: string | null
  pendingBatch: PendingRankedBatch | null
}): string {
  const parsed = parseLeadSourceDetails(params.currentSourceDetails)
  const existing = parsed.plaintiffAttorneyPreferences
  const preferences = {
    ...(existing && typeof existing === 'object' ? (existing as Record<string, unknown>) : {})
  }
  if (params.pendingBatch) {
    preferences.pendingBatch = params.pendingBatch
  } else {
    delete preferences.pendingBatch
  }
  return JSON.stringify({ ...parsed, plaintiffAttorneyPreferences: preferences })
}

function addDismissedAttorneyIdsToSourceDetails(params: {
  currentSourceDetails?: string | null
  dismissedAttorneyIds: string[]
}): string {
  const parsed = parseLeadSourceDetails(params.currentSourceDetails)
  const existing = parsed.plaintiffAttorneyPreferences
  const preferences = {
    ...(existing && typeof existing === 'object' ? (existing as Record<string, unknown>) : {})
  }
  const merged = new Set([
    ...getDismissedAttorneyIdsFromLead({ sourceDetails: params.currentSourceDetails }),
    ...params.dismissedAttorneyIds.filter((id) => typeof id === 'string' && id.length > 0)
  ])
  preferences.dismissedAttorneyIds = [...merged]
  return JSON.stringify({ ...parsed, plaintiffAttorneyPreferences: preferences })
}

/**
 * Propose — but do not contact — a further set of attorneys.
 *
 * SB 37 / Bus. & Prof. Code § 6155(g)(2) treats referring a consumer to an
 * attorney "not identified in the advertising" as certifiable referral activity.
 * The consumer only ever saw and ordered their own batch, so when that queue is
 * exhausted routing halts here and waits for an explicit approval rather than
 * silently promoting a system-picked batch into the queue.
 */
async function proposeNextRankedBatch(
  assessmentId: string,
  lead: { sourceDetails?: string | null }
): Promise<{ proposed: boolean; attorneyIds?: string[]; error?: string }> {
  const existingPending = getPendingBatchFromLead(lead)
  if (existingPending) {
    return { proposed: true, attorneyIds: existingPending.candidateAttorneyIds }
  }

  const existingIntroductions = await prisma.introduction.findMany({
    where: { assessmentId },
    select: { attorneyId: true }
  })
  const excludeAttorneyIds = [
    ...new Set([
      ...existingIntroductions.map((intro) => intro.attorneyId),
      ...getDismissedAttorneyIdsFromLead(lead)
    ])
  ]
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
      proposed: false,
      error: dryRunResult.errors?.[0] || 'No additional attorneys available for a fresh batch'
    }
  }

  const candidateAttorneyIds = dryRunResult.routedTo.slice(0, 3)
  const previousBatchNumber = getPlaintiffPreferenceBatchNumber(lead)
  const sourceDetails = writePendingBatchIntoSourceDetails({
    currentSourceDetails: lead.sourceDetails,
    pendingBatch: {
      candidateAttorneyIds,
      batchNumber: previousBatchNumber + 1,
      proposedAt: new Date().toISOString()
    }
  })

  await prisma.leadSubmission.update({
    where: { assessmentId },
    data: {
      sourceDetails,
      lifecycleState: 'awaiting_plaintiff_batch_approval',
      routingLocked: false
    }
  })

  await recordRoutingEvent(assessmentId, null, null, 'plaintiff_batch_approval_requested', {
    attorneyCount: candidateAttorneyIds.length,
    batchNumber: previousBatchNumber + 1
  })

  const attorneys = await prisma.attorney.findMany({
    where: { id: { in: candidateAttorneyIds } },
    select: { id: true, name: true }
  })
  const orderedNames = candidateAttorneyIds
    .map((id) => attorneys.find((a) => a.id === id)?.name)
    .filter((name): name is string => Boolean(name))
  await sendPlaintiffBatchApprovalRequest(assessmentId, orderedNames)

  return { proposed: true, attorneyIds: candidateAttorneyIds }
}

function getPlaintiffPreferenceBatchNumber(lead: { sourceDetails?: string | null }): number {
  const preferences = parseLeadSourceDetails(lead.sourceDetails).plaintiffAttorneyPreferences
  if (preferences && typeof preferences === 'object') {
    const value = (preferences as Record<string, unknown>).batchNumber
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return 1
}

async function advanceRankedRouting(
  assessmentId: string,
  lead: { sourceDetails?: string | null },
  reason: 'declined' | 'timeout'
): Promise<{
  routed: boolean
  exhausted: boolean
  awaitingApproval: boolean
  waveNumber?: number
  attorneyId?: string
  proposedAttorneyIds?: string[]
  error?: string
}> {
  const initialAttempt = await routeNextRankedAttorney(assessmentId, lead, reason)
  if (initialAttempt.routed || !initialAttempt.exhausted) {
    return { ...initialAttempt, awaitingApproval: false }
  }

  const proposal = await proposeNextRankedBatch(assessmentId, lead)
  if (!proposal.proposed) {
    return {
      routed: false,
      exhausted: true,
      awaitingApproval: false,
      error: proposal.error || initialAttempt.error
    }
  }

  return {
    routed: false,
    exhausted: true,
    awaitingApproval: true,
    proposedAttorneyIds: proposal.attorneyIds
  }
}

/**
 * The attorneys awaiting the plaintiff's approval, with enough profile detail to
 * render them for a decision. Returns null when nothing is pending.
 */
export async function getPendingRankedBatch(assessmentId: string): Promise<{
  batchNumber: number
  proposedAt: string
  attorneys: Array<{ id: string; name: string; firmName: string | null; city: string | null; state: string | null }>
} | null> {
  const lead = await prisma.leadSubmission.findUnique({
    where: { assessmentId },
    select: { sourceDetails: true, routingLocked: true }
  })
  if (!lead || lead.routingLocked) return null
  const pending = getPendingBatchFromLead(lead)
  if (!pending) return null

  const attorneys = await prisma.attorney.findMany({
    where: { id: { in: pending.candidateAttorneyIds }, isActive: true },
    select: {
      id: true,
      name: true,
      lawFirm: { select: { name: true, city: true, state: true } }
    }
  })

  return {
    batchNumber: pending.batchNumber,
    proposedAt: pending.proposedAt,
    attorneys: pending.candidateAttorneyIds
      .map((id) => attorneys.find((a) => a.id === id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => ({
        id: a.id,
        name: a.name,
        firmName: a.lawFirm?.name ?? null,
        city: a.lawFirm?.city ?? null,
        state: a.lawFirm?.state ?? null
      }))
  }
}

/**
 * The plaintiff approved some or all of the proposed attorneys, in their own
 * order. Promote them into the ranked queue as a plaintiff-sourced batch and
 * contact the first one.
 */
export async function approvePendingRankedBatch(
  assessmentId: string,
  approvedAttorneyIds: string[],
  actor?: { userId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<{ success: boolean; routed?: boolean; attorneyId?: string; error?: string }> {
  const lead = await prisma.leadSubmission.findUnique({
    where: { assessmentId },
    select: { sourceDetails: true, routingLocked: true }
  })
  if (!lead) return { success: false, error: 'Case not found' }
  if (lead.routingLocked) return { success: false, error: 'This case has already been matched' }

  const pending = getPendingBatchFromLead(lead)
  if (!pending) return { success: false, error: 'No attorneys are awaiting your approval' }

  const allowed = new Set(pending.candidateAttorneyIds)
  const ordered = [...new Set(approvedAttorneyIds)].filter((id) => allowed.has(id))
  if (ordered.length === 0) {
    return { success: false, error: 'Select at least one attorney to continue' }
  }

  const active = await prisma.attorney.findMany({
    where: { id: { in: ordered }, isActive: true },
    select: { id: true }
  })
  const activeIds = new Set(active.map((a) => a.id))
  const routableIds = ordered.filter((id) => activeIds.has(id))
  if (routableIds.length === 0) {
    return { success: false, error: 'Those attorneys are no longer available' }
  }

  // Record the approved set as the plaintiff's own selection, then drop the
  // proposal so it cannot be replayed.
  const withQueue = buildUpdatedLeadSourceDetails({
    currentSourceDetails: lead.sourceDetails,
    rankedAttorneyIds: routableIds,
    source: 'plaintiff'
  })
  const withoutPending = writePendingBatchIntoSourceDetails({
    currentSourceDetails: withQueue,
    pendingBatch: null
  })
  // Anyone the plaintiff left unchecked was a deliberate rejection, so record it
  // and never propose them again.
  const sourceDetails = addDismissedAttorneyIdsToSourceDetails({
    currentSourceDetails: withoutPending,
    dismissedAttorneyIds: pending.candidateAttorneyIds.filter((id) => !routableIds.includes(id))
  })

  await prisma.leadSubmission.update({
    where: { assessmentId },
    data: {
      sourceDetails,
      lifecycleState: 'routing_active',
      lastContactAt: new Date()
    }
  })
  await recordRoutingEvent(assessmentId, null, null, 'plaintiff_batch_approved', {
    batchNumber: pending.batchNumber,
    approvedCount: routableIds.length,
    declinedCount: pending.candidateAttorneyIds.length - routableIds.length
  })

  // These firms are new: the authorization taken at submission named the original
  // slate and does not reach them. Approving the proposal is the authorizing act,
  // so it gets its own record naming who it covers — otherwise the per-attorney
  // check below would correctly refuse to contact them.
  await recordShareAuthorization({
    assessmentId,
    userId: actor?.userId ?? null,
    attorneyIds: routableIds,
    context: 'batch_approval',
    signatureMethod: 'clicked',
    ipAddress: actor?.ipAddress ?? null,
    userAgent: actor?.userAgent ?? null,
    metadata: { batchNumber: pending.batchNumber }
  })

  const routeResult = await routeNextRankedAttorney(assessmentId, { sourceDetails }, 'timeout')
  if (!routeResult.routed) {
    await placeAssessmentInManualReview(
      assessmentId,
      'plaintiff_approved_batch_not_routable',
      'The attorneys you approved could not be contacted. Our team will follow up.'
    )
    return { success: true, routed: false, error: routeResult.error }
  }

  return { success: true, routed: true, attorneyId: routeResult.attorneyId }
}

/**
 * The plaintiff does not want the proposed attorneys contacted. Stop routing and
 * hand the case to a human rather than continuing down the list.
 */
export async function declinePendingRankedBatch(
  assessmentId: string
): Promise<{ success: boolean; error?: string }> {
  const lead = await prisma.leadSubmission.findUnique({
    where: { assessmentId },
    select: { sourceDetails: true, routingLocked: true }
  })
  if (!lead) return { success: false, error: 'Case not found' }
  if (lead.routingLocked) return { success: false, error: 'This case has already been matched' }
  if (!getPendingBatchFromLead(lead)) {
    return { success: false, error: 'No attorneys are awaiting your approval' }
  }

  await prisma.leadSubmission.update({
    where: { assessmentId },
    data: {
      sourceDetails: writePendingBatchIntoSourceDetails({
        currentSourceDetails: lead.sourceDetails,
        pendingBatch: null
      })
    }
  })
  await recordRoutingEvent(assessmentId, null, null, 'plaintiff_batch_declined', {})
  await placeAssessmentInManualReview(
    assessmentId,
    'plaintiff_declined_further_attorneys',
    'The plaintiff asked us not to contact the attorneys we proposed.'
  )
  return { success: true }
}

/**
 * Hold a submission that carries no plaintiff selection at all, rather than
 * letting it fall through to tier routing, where offer priority is influenced by
 * what the attorney pays.
 */
export async function proposeInitialBatchForApproval(
  assessmentId: string
): Promise<{ proposed: boolean; attorneyIds?: string[]; error?: string }> {
  const lead = await prisma.leadSubmission.findUnique({
    where: { assessmentId },
    select: { sourceDetails: true }
  })
  return proposeNextRankedBatch(assessmentId, lead ?? {})
}

/**
 * Route a case an admin just released from manual review WITHOUT overriding the
 * consumer's choice of who may see their case.
 *
 * SB 37 / Bus. & Prof. Code § 6155(g): the consumer decides which attorneys are
 * contacted. When they curated their slate — ranked some, and/or explicitly
 * removed some — releasing from a fraud/compliance hold must not tier- or
 * classic-route the case to firms they never approved (least of all the ones
 * they took off the list). The admin is overriding the fraud signal, not the
 * consumer's contact decision.
 *
 * So for a curated case we:
 *   1. Advance the consumer-approved ranked queue (contacts the next attorney
 *      the consumer picked, or proposes a fresh batch for their approval when the
 *      queue is exhausted).
 *   2. If there is no live queue to advance (e.g. they removed everyone),
 *      propose a fresh batch — excluding every dismissed attorney — and hold for
 *      their approval.
 *
 * Cases with NO consumer selection (the flag was purely operational) return
 * `no_consumer_slate`, and the caller should route them normally.
 */
export async function routeReleasedCaseRespectingConsumerSlate(
  assessmentId: string
): Promise<{
  mode: 'no_consumer_slate' | 'ranked_routed' | 'awaiting_approval' | 'held'
  attorneyId?: string
  proposedAttorneyIds?: string[]
  error?: string
}> {
  const lead = await prisma.leadSubmission.findUnique({
    where: { assessmentId },
    select: { sourceDetails: true }
  })
  const dismissed = getDismissedAttorneyIdsFromLead(lead)
  const ranked = getRankedAttorneyIdsFromLead(lead)

  // No consumer curation → nothing to protect; caller routes normally.
  if (dismissed.length === 0 && ranked.length === 0) {
    return { mode: 'no_consumer_slate' }
  }

  // Try the consumer-approved queue first when one exists.
  if (ranked.length > 0) {
    const advanced = await advanceRankedRouting(assessmentId, lead ?? {}, 'timeout')
    if (advanced.routed) {
      return { mode: 'ranked_routed', attorneyId: advanced.attorneyId }
    }
    if (advanced.awaitingApproval) {
      return { mode: 'awaiting_approval', proposedAttorneyIds: advanced.proposedAttorneyIds }
    }
  }

  // Empty or exhausted consumer queue (e.g. they removed everyone): propose a
  // fresh batch that excludes the dismissed attorneys and hold for approval.
  const proposal = await proposeNextRankedBatch(assessmentId, lead ?? {})
  if (proposal.proposed) {
    return { mode: 'awaiting_approval', proposedAttorneyIds: proposal.attorneyIds }
  }
  return { mode: 'held', error: proposal.error }
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
    // Re-read the authorization per attorney rather than once per queue. The
    // queue was authorized when it was built, but a withdrawal can land between
    // waves — and before this check that had no effect at all, because consent
    // was verified once, before wave 1.
    const authorized = await assertShareAuthorization(assessmentId, [attorneyId])
    if (!authorized.ok) {
      logger.warn('Skipped ranked attorney without live share authorization', {
        assessmentId,
        attorneyId,
        reason: authorized.reason
      })
      errors.push(authorized.reason)
      // A withdrawal covers the whole case, so there is no point walking the
      // rest of the queue.
      if (authorized.authorization.withdrawnAt) break
      continue
    }

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

/**
 * Manual review reasons that mean attorneys were actually approached and none
 * took the case.
 *
 * These earn the specific "no attorney response" message rather than the generic
 * manual-review one, because the claimant needs to know their chosen attorneys
 * are exhausted rather than that some unnamed check is pending. The reasons left
 * out are deliberately excluded: a fraud or eligibility gate means the case never
 * went out, and `plaintiff_declined_further_attorneys` means the claimant is the
 * one who stopped it.
 */
const NO_ATTORNEY_RESPONSE_REASONS = new Set([
  'plaintiff_ranked_routing_exhausted',
  'plaintiff_approved_batch_not_routable',
  'routing_timeout'
])

export async function placeAssessmentInManualReview(
  assessmentId: string,
  reason: string,
  note?: string,
  extra?: { fraudScore?: number; fraudSignals?: unknown[] }
): Promise<void> {
  try {
    // Re-entry is normal rather than exceptional: a parked case can be selected
    // by the sweep again, an admin can re-route a held case that then fails the
    // same way, and callers upstream retry. Repeating the write is not harmless —
    // it clears the reviewer attribution below, resets the held-at clock so the
    // review queue's ageing is wrong, and sends the claimant another "no attorney
    // could take your case" email each time. Hold the first placement and let
    // later ones pass through quietly; a genuinely new reason still updates,
    // and a released case is no longer `pending` so it can be held again.
    const existing = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { manualReviewStatus: true, manualReviewReason: true }
    })
    if (existing?.manualReviewStatus === 'pending' && existing.manualReviewReason === reason) {
      logger.info('Assessment already held for manual review; skipping duplicate placement', {
        assessmentId,
        reason
      })
      return
    }

    await Promise.all([
      prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          manualReviewStatus: 'pending',
          manualReviewReason: reason,
          manualReviewHeldAt: new Date(),
          manualReviewNote: note || null,
          ...(extra?.fraudScore != null ? { fraudScore: extra.fraudScore } : {}),
          ...(extra?.fraudSignals != null
            ? { fraudSignals: JSON.stringify(extra.fraudSignals) }
            : {}),
          // Clear any stale reviewer attribution from a prior decision.
          reviewedBy: null,
          reviewedAt: null
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
    if (NO_ATTORNEY_RESPONSE_REASONS.has(reason)) {
      await sendPlaintiffNoAttorneyResponse(assessmentId, reason)
    } else {
      await sendPlaintiffManualReviewNeeded(assessmentId, reason, note)
    }
  } catch (err: unknown) {
    logger.error('Failed to place assessment in manual review', {
      assessmentId,
      reason,
      error: (err as Error).message
    })
  }
}

/**
 * Sentinel used to unwind the claim transaction when the case is already gone.
 * Prisma rolls an interactive transaction back on throw, which is what releases
 * the offer claim made moments earlier in the same transaction.
 */
export const ROUTING_CASE_ALREADY_CLAIMED = 'routing:case-already-claimed'

/**
 * Claim the case itself for one attorney, atomically.
 *
 * Claiming the Introduction makes a single *offer* single-writer, which is what
 * stops one attorney answering twice from two tabs. It does nothing about a
 * wave: wave 1 offers the same case to three attorneys, each with their own
 * PENDING row, so three offer claims can all succeed. The lead write was
 * unconditional, so it was last-writer-wins — two attorneys ended up holding the
 * same case, both with ACCEPTED offers, and the claimant received two "an
 * attorney accepted your case" emails naming two different firms.
 *
 * `routingLocked` is the case-level flag and is only ever set by an acceptance,
 * which makes it the natural claim key: as a WHERE predicate it lets exactly one
 * writer move it false -> true, and every other writer sees `count === 0`.
 */
export async function claimCaseForAttorney(
  assessmentId: string,
  attorneyId: string,
  client: { leadSubmission: { updateMany: (args: any) => Promise<{ count: number }> } } = prisma,
): Promise<boolean> {
  const claimed = await client.leadSubmission.updateMany({
    where: { assessmentId, routingLocked: false },
    data: {
      assignedAttorneyId: attorneyId,
      assignmentType: 'exclusive',
      status: 'contacted',
      lifecycleState: 'attorney_matched',
      routingLocked: true,
      lastContactAt: new Date(),
    },
  })
  return claimed.count > 0
}

/**
 * Close out the other offers on a case once someone has won it.
 *
 * Nothing used to retire them: the expiry sweep skips locked cases, so the
 * losing attorneys' offers stayed PENDING forever and remained acceptable months
 * later — the delivery mechanism for a second attorney claiming the same case.
 *
 * They are marked EXPIRED rather than given a status of their own because
 * EXPIRED already means "released to another attorney" everywhere else: it is in
 * `TERMINAL_INTRO_STATUSES`, so the offer drops out of the losing attorney's
 * caseload, and the existing UI copy and analytics already handle it. A new
 * value would leave the case lingering in their list.
 */
export async function retireCompetingOffers(
  assessmentId: string,
  winningIntroductionId: string,
): Promise<number> {
  const retired = await prisma.introduction.updateMany({
    where: {
      assessmentId,
      status: 'PENDING',
      id: { not: winningIntroductionId },
    },
    data: { status: 'EXPIRED', respondedAt: new Date() },
  })
  return retired.count
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

  // Claim the offer and the case together, in one transaction.
  //
  // The offer claim is conditional on PENDING because the check above is only a
  // fast path: two tabs (or a concurrent decline) can both read PENDING before
  // either writes, and a plain update would let a stale accept overwrite a
  // decline — the case ending up ACCEPTED with a decline reason still attached
  // (CP: accept after decline in 2 tabs).
  //
  // The case claim covers the other half, which the offer claim cannot: a wave
  // gives three attorneys three separate PENDING rows, so three offer claims can
  // all succeed against the same case. Both run in one transaction so that
  // losing the race for the case also releases the offer. Otherwise the loser
  // keeps an ACCEPTED offer against a case someone else holds, which grants them
  // access to the file and counts toward their acceptance rate.
  let claimOutcome: 'claimed' | 'offer_taken'
  try {
    claimOutcome = await prisma.$transaction(async (tx: any) => {
      const claimedOffer = await tx.introduction.updateMany({
        where: { id: introductionId, attorneyId, status: 'PENDING' },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      })
      if (claimedOffer.count === 0) return 'offer_taken' as const

      if (intro.assessment.leadSubmission) {
        const wonCase = await claimCaseForAttorney(intro.assessmentId, attorneyId, tx)
        if (!wonCase) throw new Error(ROUTING_CASE_ALREADY_CLAIMED)
      }
      return 'claimed' as const
    })
  } catch (err: unknown) {
    if ((err as Error)?.message === ROUTING_CASE_ALREADY_CLAIMED) {
      logger.info('Accept refused: case already claimed by another attorney', {
        introductionId,
        attorneyId,
        assessmentId: intro.assessmentId,
      })
      return { success: false, error: 'This case has already been assigned to another attorney.' }
    }
    throw err
  }

  if (claimOutcome === 'offer_taken') {
    const current = await prisma.introduction.findUnique({
      where: { id: introductionId },
      select: { status: true },
    })
    return { success: false, error: `Introduction already ${current?.status ?? 'responded'}` }
  }

  await retireCompetingOffers(intro.assessmentId, introductionId).catch((err: unknown) => {
    logger.warn('Failed to retire competing offers after acceptance', {
      assessmentId: intro.assessmentId,
      error: (err as Error).message,
    })
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

  // Acceptance is the moment the case becomes retained, so seed the attorney-side
  // Case Coach tasks (next-best actions + baseline Intelligent Question tasks) now
  // rather than waiting for the next document upload or the periodic sweep. Without
  // this, an accepted case shows an empty Tasks queue until some later trigger
  // fires. Dynamic import avoids a static import cycle; failures are swallowed so a
  // task-generation problem can never roll back a successful acceptance.
  try {
    const { syncCaseCoachTasks } = await import('./case-coach-loop')
    await syncCaseCoachTasks(intro.assessmentId, {
      attorneyId,
      trigger: 'attorney_accept',
    })
  } catch (err: unknown) {
    logger.warn('Failed to seed coach tasks after acceptance', {
      attorneyId,
      assessmentId: intro.assessmentId,
      error: (err as Error).message,
    })
  }

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

  // Atomically claim the PENDING introduction so a stale accept in another tab
  // cannot overwrite this decline (mirror of attorneyAcceptCase).
  const claimed = await prisma.introduction.updateMany({
    where: { id: introductionId, attorneyId, status: 'PENDING' },
    data: { status: 'DECLINED', respondedAt: new Date(), declineReason: declineReason || null },
  })
  if (claimed.count === 0) {
    return { success: false, error: 'Introduction not found or already responded' }
  }

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
        waveNumber: nextRankedRoute.waveNumber
      })
      return { success: true }
    }

    if (nextRankedRoute.awaitingApproval) {
      logger.info('Holding routing for plaintiff approval after decline', {
        assessmentId: intro.assessmentId,
        declinedAttorneyId: attorneyId,
        proposedAttorneyIds: nextRankedRoute.proposedAttorneyIds
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

// NOTE: "Request more info" is intentionally NOT a pre-acceptance routing
// decision. An attorney's options on a PENDING introduction are accept or
// decline only. Requesting information/documents from the client is a
// post-acceptance action handled by the separate DocumentRequest flow
// (POST /leads/:leadId/document-request), available once the attorney owns
// the case. The former attorneyRequestMoreInfo() routing decision was removed.

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
 * Retire a wave so the escalation sweep stops selecting it.
 *
 * The sweep picks waves whose `nextEscalationAt` has passed and whose
 * `escalatedAt` is still null, so any wave that has been acted on has to be
 * stamped or it comes back every sweep interval. Pass `clearNextEscalation` when
 * nothing further is scheduled — manual review, or a hold waiting on the
 * claimant — as opposed to when a later wave has taken over the schedule.
 *
 * Failures are logged rather than thrown: an escalation that has already routed
 * should not be unwound because the bookkeeping write failed.
 */
async function markWaveEscalated(
  assessmentId: string,
  waveNumber: number,
  options: { clearNextEscalation?: boolean } = {}
): Promise<void> {
  try {
    await prisma.routingWave.update({
      where: { assessmentId_waveNumber: { assessmentId, waveNumber } },
      data: {
        escalatedAt: new Date(),
        ...(options.clearNextEscalation ? { nextEscalationAt: null } : {})
      }
    })
  } catch (err: unknown) {
    logger.warn('Failed to mark routing wave escalated', {
      assessmentId,
      waveNumber,
      error: (err as Error).message
    })
  }
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
    // Capture the wave that just came due before advancing, because a successful
    // advance creates the next one — stamping the newest wave would retire a
    // window that has not opened yet.
    const dueWave = await prisma.routingWave.findFirst({
      where: { assessmentId },
      orderBy: { waveNumber: 'desc' },
      select: { waveNumber: true }
    })

    const nextRankedRoute = await advanceRankedRouting(assessmentId, lead, 'timeout')
    if (nextRankedRoute.routed) {
      // Retire the wave that timed out. Nothing on this path did, so the sweep
      // kept re-selecting the same overdue wave every ten minutes and walked the
      // claimant's entire ranked list in about half an hour — each pass sending
      // another "your case has been sent to..." email and consuming a real
      // attorney's offer window in the time it takes to read the first one.
      if (dueWave) await markWaveEscalated(assessmentId, dueWave.waveNumber)
      logger.info('Advanced to next ranked attorney after timeout', {
        assessmentId,
        nextAttorneyId: nextRankedRoute.attorneyId,
        waveNumber: nextRankedRoute.waveNumber
      })
      return {
        escalated: true,
        waveNumber: nextRankedRoute.waveNumber
      }
    }

    if (nextRankedRoute.awaitingApproval) {
      // Nothing further is scheduled here — the claimant has to approve the
      // proposed batch — so park the wave rather than leaving it due.
      if (dueWave) {
        await markWaveEscalated(assessmentId, dueWave.waveNumber, { clearNextEscalation: true })
      }
      logger.info('Holding routing for plaintiff approval after timeout', {
        assessmentId,
        proposedAttorneyIds: nextRankedRoute.proposedAttorneyIds
      })
      return { escalated: false, waveNumber: nextRankedRoute.waveNumber }
    }

    if (dueWave) {
      await markWaveEscalated(assessmentId, dueWave.waveNumber, { clearNextEscalation: true })
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
    // Same expression the sweep uses, from the same helper, so the two cannot
    // drift apart: they previously disagreed by a factor of two on wave 1.
    const waitHours = getConfiguredWaveWaitHours(matchingRules, latestWave.waveNumber)
    const alertThresholdHours = Math.max(24, waitHours * 2)
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

  // Reached only by cases with no plaintiff-ranked queue, so there is no named
  // firm set to check against — but there must still be a live authorization to
  // disclose the case at all, and a withdrawal has to stop the next wave.
  const waveAuthorization = await assertShareAuthorization(assessmentId)
  if (!waveAuthorization.ok) {
    await moveEscalationToManualReview(waveAuthorization.reason, nextWave)
    return { escalated: false, waveNumber: nextWave, error: waveAuthorization.reason }
  }

  // Run routing engine for next wave (will add more attorneys, excluding already-routed).
  // The gate itself was cleared on wave 1; the disclosure check above is not part
  // of what "already passed" covers, because consent can be withdrawn.
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

  // The wave being created has not escalated — it is only just starting. It was
  // stamped `escalatedAt` here on creation, and the sweep selects on
  // `escalatedAt: null`, so wave 2 was born invisible to the very driver meant to
  // advance it: 1 -> 2 worked (the engine creates wave 1 unstamped) and nothing
  // after it did. Wave 3 also needs a due time, or the sweep never comes back to
  // hand the case to a human once wave 3 lapses.
  await prisma.routingWave.upsert({
    where: {
      assessmentId_waveNumber: { assessmentId, waveNumber: nextWave }
    },
    create: {
      assessmentId,
      waveNumber: nextWave,
      attorneyIds: JSON.stringify(result.routedTo),
      nextEscalationAt,
      escalatedAt: null
    },
    update: {
      attorneyIds: JSON.stringify(result.routedTo),
      nextEscalationAt,
      escalatedAt: null
    }
  })

  // The wave we just left is the one that has escalated.
  if (latestWave) {
    await markWaveEscalated(assessmentId, latestWave.waveNumber)
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

  // Prefer real plaintiff-reported satisfaction from resolved cases; fall back to
  // star reviews, then a neutral prior. Both scales are 1-5, normalized to 0-1.
  const [memories, docRequests] = await Promise.all([
    prisma.decisionMemory.findMany({
      where: { attorneyId },
      select: { outcomeStatus: true, retained: true, plaintiffSatisfaction: true },
    }),
    prisma.documentRequest.findMany({
      where: { attorneyId },
      select: { status: true },
    }),
  ])

  const plaintiffScores = memories
    .map((m) => m.plaintiffSatisfaction)
    .filter((s): s is number => typeof s === 'number')
  const plaintiffSatisfaction =
    plaintiffScores.length > 0
      ? plaintiffScores.reduce((sum, s) => sum + s, 0) / plaintiffScores.length / 5
      : reviews._count > 0
        ? (reviews._avg.rating ?? 3) / 5
        : 0.5

  // Case follow-through: of the cases the attorney engaged, how many reached a
  // favorable resolution (retained / settled / won).
  const favorable = new Set(['retained', 'settled', 'won'])
  const resolved = new Set(['retained', 'settled', 'won', 'lost', 'rejected'])
  const resolvedMemories = memories.filter((m) => resolved.has(String(m.outcomeStatus || '').toLowerCase()))
  const favorableMemories = memories.filter(
    (m) => m.retained === true || favorable.has(String(m.outcomeStatus || '').toLowerCase()),
  )
  const caseFollowThrough = resolvedMemories.length > 0 ? favorableMemories.length / resolvedMemories.length : 0.7

  // Evidence-request quality: share of document requests that were fulfilled.
  const completedRequests = docRequests.filter((r) => String(r.status).toLowerCase() === 'completed').length
  const evidenceRequestQuality = docRequests.length > 0 ? completedRequests / docRequests.length : 0.7

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

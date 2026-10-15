import { prisma } from './prisma'
import { logger } from './logger'
import { startAssessmentRouting } from './assessment-routing'
import { routeReleasedCaseRespectingConsumerSlate } from './routing-lifecycle'

export type ReviewReleaseMode = 'no_consumer_slate' | 'ranked_routed' | 'awaiting_approval' | 'held'

export interface ReviewReleaseResult {
  mode: ReviewReleaseMode
  /** Attorneys the case was offered to by this release. */
  routedCount: number
  /** The plaintiff's choice the case went to, when it went down their ranked queue. */
  attorneyId?: string
  error?: string
}

/**
 * Route a case a human has just released from manual review.
 *
 * Shared by the admin Manual Review queue and the specialist workbench's
 * Release for Routing button. The workbench used to re-run the full routing
 * entry point instead, whose pre-routing gate refuses any case still marked as
 * pending review — so releasing a case from review there put it straight back
 * into review and nobody was ever offered it.
 *
 * The pre-routing (fraud) gate is skipped: the release is the override of the
 * signals that held the case, and re-running them would re-hold it. It is NOT
 * an override of the consumer's contact decision (SB 37 / § 6155). If the
 * consumer ranked or removed attorneys, their approved queue is advanced one
 * attorney at a time, or a fresh batch excluding everyone they removed is
 * proposed for their approval. Only cases with no consumer selection route
 * straight through.
 *
 * Does not record the review decision; the caller does that once it knows the
 * release placed the case, so a release that routes nobody leaves the case in
 * the queue.
 */
export async function routeCaseReleasedFromReview(
  caseId: string,
  options: { overrideRoutingDisabled?: boolean } = {}
): Promise<ReviewReleaseResult> {
  await prisma.leadSubmission.upsert({
    where: { assessmentId: caseId },
    create: {
      assessmentId: caseId,
      viabilityScore: 0.5,
      liabilityScore: 0.5,
      causationScore: 0.5,
      damagesScore: 0.5,
      evidenceChecklist: '{}',
      isExclusive: false,
      sourceType: 'admin',
      lifecycleState: 'routing_active',
      routingLocked: false
    },
    update: { lifecycleState: 'routing_active', routingLocked: false }
  })

  let slate: Awaited<ReturnType<typeof routeReleasedCaseRespectingConsumerSlate>>
  try {
    slate = await routeReleasedCaseRespectingConsumerSlate(caseId, {
      overrideRoutingDisabled: options.overrideRoutingDisabled === true,
    })
  } catch (err: any) {
    logger.error('Consumer-slate release routing failed', { caseId, error: err?.message })
    return { mode: 'held', routedCount: 0, error: err?.message }
  }

  if (slate.mode === 'ranked_routed') return { mode: slate.mode, routedCount: 1, attorneyId: slate.attorneyId }
  if (slate.mode === 'awaiting_approval') return { mode: slate.mode, routedCount: 0 }
  if (slate.mode === 'held') return { mode: slate.mode, routedCount: 0, error: slate.error }

  try {
    const classic = await startAssessmentRouting(caseId, {
      skipPreRoutingGate: true,
      preferTierRouting: true,
      fallbackToClassic: true,
      overrideRoutingDisabled: options.overrideRoutingDisabled === true,
    })
    if (!classic.success) {
      return {
        mode: 'held',
        routedCount: 0,
        error: classic.gateReason || classic.errors?.[0] || 'Routing placed nobody',
      }
    }
    return { mode: 'no_consumer_slate', routedCount: classic.routedTo?.length ?? 0 }
  } catch (err: any) {
    logger.error('Failed to re-route case after manual review release', { caseId, error: err?.message })
    return { mode: 'held', routedCount: 0, error: err?.message }
  }
}

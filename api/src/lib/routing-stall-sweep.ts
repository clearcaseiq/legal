/**
 * Routing stall sweep.
 *
 * Every other driver in the system advances a case that is *in* a routing cycle:
 * the escalation sweep reads RoutingWave, the offer-expiry sweep reads open
 * Introductions. Nothing looks for a case that fell out of the cycle entirely.
 *
 * That gap was reachable. A wave row is only written once at least one
 * introduction has gone out, so a case that matched zero attorneys had no wave,
 * no offer and no review — it sat in `routing_active` indefinitely with nobody
 * working it and nothing scheduled to look at it again. The routing entry point
 * now parks such a case as it happens, but that only fixes cases routed from
 * here on; this sweep is what finds the ones already stranded, and what catches
 * any future path that manages to drop a case the same way.
 *
 * The rule is deliberately narrow: no open offer *and* no scheduled wave means
 * no mechanism exists that could ever move this case. A case mid-cycle always
 * has one or the other, so a healthy case is never touched.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import { placeAssessmentInManualReview } from './routing-lifecycle'

export interface RoutingStallSweepResult {
  examined: number
  stalled: number
  parked: number
  /** Deliberate holds, reported rather than acted on — they are waiting on someone. */
  heldNeedsMoreInfo: number
  heldNotRoutableYet: number
  failures: number
}

/**
 * How long a case may sit with nothing scheduled before we call it stalled.
 *
 * This is a guard against catching a case in the seconds between the routing
 * engine writing the lead and writing its first wave, not a routing deadline —
 * so it only has to exceed the length of one routing attempt.
 */
const STALL_GRACE_MS = 30 * 60 * 1000

/** Bounds one pass so a large backlog cannot stall the scheduler. */
const MAX_PER_RUN = 200

export async function runRoutingStallSweep(): Promise<RoutingStallSweepResult> {
  const cutoff = new Date(Date.now() - STALL_GRACE_MS)

  const [candidates, heldNeedsMoreInfo, heldNotRoutableYet] = await Promise.all([
    prisma.leadSubmission.findMany({
      where: {
        lifecycleState: 'routing_active',
        routingLocked: false,
        updatedAt: { lt: cutoff },
      },
      select: { id: true, assessmentId: true },
      take: MAX_PER_RUN,
    }),
    prisma.leadSubmission.count({ where: { lifecycleState: 'needs_more_info' } }),
    prisma.leadSubmission.count({ where: { lifecycleState: 'not_routable_yet' } }),
  ])

  const base: RoutingStallSweepResult = {
    examined: candidates.length,
    stalled: 0,
    parked: 0,
    heldNeedsMoreInfo,
    heldNotRoutableYet,
    failures: 0,
  }
  if (candidates.length === 0) return base

  const assessmentIds = [...new Set(candidates.map((lead) => lead.assessmentId))]

  // Two narrow lookups rather than nested relation filters: what makes a case
  // live is easier to read — and to change — stated this way round.
  const [openOffers, openWaves, alreadyHeld] = await Promise.all([
    prisma.introduction.findMany({
      where: { assessmentId: { in: assessmentIds }, status: 'PENDING' },
      select: { assessmentId: true },
    }),
    prisma.routingWave.findMany({
      where: { assessmentId: { in: assessmentIds }, escalatedAt: null, nextEscalationAt: { not: null } },
      select: { assessmentId: true },
    }),
    prisma.assessment.findMany({
      where: { id: { in: assessmentIds }, manualReviewStatus: 'pending' },
      select: { id: true },
    }),
  ])

  const live = new Set([
    ...openOffers.map((offer) => offer.assessmentId),
    ...openWaves.map((wave) => wave.assessmentId),
    ...alreadyHeld.map((assessment) => assessment.id),
  ])

  const stalled = assessmentIds.filter((assessmentId) => !live.has(assessmentId))
  base.stalled = stalled.length

  for (const assessmentId of stalled) {
    try {
      await placeAssessmentInManualReview(
        assessmentId,
        'routing_stalled',
        'Case was left in routing with no open attorney offer and no scheduled escalation.'
      )
      base.parked += 1
    } catch (error: unknown) {
      base.failures += 1
      logger.error('Failed to park stalled routing case', {
        assessmentId,
        error: (error as Error).message,
      })
    }
  }

  if (base.stalled > 0) {
    logger.warn('Routing stall sweep parked cases with no way forward', {
      stalled: base.stalled,
      parked: base.parked,
      failures: base.failures,
    })
  }

  return base
}

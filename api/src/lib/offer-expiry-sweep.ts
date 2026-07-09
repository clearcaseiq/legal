/**
 * Offer expiry sweep.
 *
 * Each routed match gives the attorney a short response window
 * (requestedAt + defaultAttorneyResponseDeadlineMinutes). When that window lapses
 * while the introduction is still PENDING, the offer is no longer the attorney's to
 * accept: we mark the Introduction EXPIRED (so it drops out of that attorney's
 * "New Matches" queue) and advance routing to the next attorney via runEscalationWave
 * so a lapsed offer never strands the plaintiff.
 *
 * Exposed to the in-process scheduler (api/src/index.ts). Idempotent and safe to run
 * repeatedly: only PENDING intros past their deadline on still-open cases are touched,
 * and runEscalationWave no-ops once a case is matched/locked.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import { getMatchingRules, getAttorneyResponseDeadlineMinutes } from './matching-rules-config'
import { runEscalationWave, recordRoutingEvent } from './routing-lifecycle'

export interface OfferExpirySweepResult {
  expired: number
  escalated: number
  skipped?: boolean
  reason?: string
}

export async function runOfferExpirySweep(): Promise<OfferExpirySweepResult> {
  const config = await getMatchingRules()
  if (config.routingEnabled === false) {
    return { expired: 0, escalated: 0, skipped: true, reason: 'Routing disabled by admin' }
  }

  const deadlineMinutes = getAttorneyResponseDeadlineMinutes(config)
  const cutoff = new Date(Date.now() - deadlineMinutes * 60 * 1000)

  // Candidate offers: still awaiting the attorney's response and past the window.
  const stale = await prisma.introduction.findMany({
    where: {
      status: 'PENDING',
      requestedAt: { lt: cutoff },
    },
    select: { id: true, assessmentId: true, attorneyId: true },
  })
  if (stale.length === 0) return { expired: 0, escalated: 0 }

  // Only lapse offers whose case is still open (not accepted/locked by anyone).
  const assessmentIds = [...new Set(stale.map((i) => i.assessmentId))]
  const leads = await prisma.leadSubmission.findMany({
    where: { assessmentId: { in: assessmentIds } },
    select: { assessmentId: true, status: true, routingLocked: true },
  })
  const openAssessments = new Set(
    leads
      .filter((l) => !l.routingLocked && l.status === 'submitted')
      .map((l) => l.assessmentId),
  )

  const toExpire = stale.filter((i) => openAssessments.has(i.assessmentId))
  if (toExpire.length === 0) return { expired: 0, escalated: 0 }

  let expired = 0
  for (const intro of toExpire) {
    try {
      await prisma.introduction.update({
        where: { id: intro.id },
        data: { status: 'EXPIRED', respondedAt: new Date() },
      })
      expired += 1
      await recordRoutingEvent(intro.assessmentId, intro.id, intro.attorneyId, 'expired', {
        reason: 'offer_response_window_elapsed',
        deadlineMinutes,
      })
    } catch (err) {
      logger.error('Failed to expire introduction', { introId: intro.id, error: (err as Error).message })
    }
  }

  // Advance routing once per affected case (idempotent; no-ops if already matched).
  let escalated = 0
  for (const assessmentId of [...new Set(toExpire.map((i) => i.assessmentId))]) {
    try {
      const result = await runEscalationWave(assessmentId)
      if (result.escalated) escalated += 1
    } catch (err) {
      logger.error('Failed to escalate after offer expiry', { assessmentId, error: (err as Error).message })
    }
  }

  if (expired > 0) {
    logger.info('Offer expiry sweep completed', { expired, escalated })
  }
  return { expired, escalated }
}

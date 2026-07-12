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
import { notifyAttorneyInApp } from './case-notifications'
import { ATTORNEY_EVENTS } from './notification-events'

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
  const now = Date.now()
  const cutoff = new Date(now - deadlineMinutes * 60 * 1000)

  // --- Pass 1: "expiring soon" warnings -------------------------------------
  // Warn the attorney once when the response window is nearly up (still PENDING),
  // so a good match is not lost purely for lack of a heads-up. Deduped per offer.
  try {
    const warnMinutes = Math.max(15, Math.round(deadlineMinutes * 0.2))
    const warnStart = new Date(now - (deadlineMinutes - warnMinutes) * 60 * 1000)
    const soon = await prisma.introduction.findMany({
      where: { status: 'PENDING', requestedAt: { lte: warnStart, gt: cutoff } },
      select: { id: true, assessmentId: true, attorneyId: true },
    })
    if (soon.length > 0) {
      const soonLeads = await prisma.leadSubmission.findMany({
        where: { assessmentId: { in: [...new Set(soon.map((i) => i.assessmentId))] } },
        select: { id: true, assessmentId: true, status: true, routingLocked: true },
      })
      const openLeadByAssessment = new Map(
        soonLeads
          .filter((l) => !l.routingLocked && l.status === 'submitted')
          .map((l) => [l.assessmentId, l.id]),
      )
      for (const intro of soon) {
        const leadId = openLeadByAssessment.get(intro.assessmentId)
        if (!leadId) continue
        const already = await prisma.notification.findFirst({
          where: { type: ATTORNEY_EVENTS.case_expiring, metadata: { contains: intro.id } },
          select: { id: true },
        })
        if (already) continue
        await notifyAttorneyInApp({
          attorneyId: intro.attorneyId,
          assessmentId: intro.assessmentId,
          eventType: ATTORNEY_EVENTS.case_expiring,
          subject: 'Match expiring soon',
          body: 'Your response window on a matched case is almost up. Review and accept it before it is released to another attorney.',
          leadId,
          link: `/attorney-dashboard/lead/${leadId}/overview`,
          payload: { introductionId: intro.id },
        }).catch(() => {})
      }
    }
  } catch (err) {
    logger.warn('Expiring-soon notification pass failed', { error: (err as Error).message })
  }

  // --- Pass 2: expire lapsed offers -----------------------------------------
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
    select: { id: true, assessmentId: true, status: true, routingLocked: true },
  })
  const leadIdByAssessment = new Map(leads.map((l) => [l.assessmentId, l.id]))
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
      // Notify the attorney their offer lapsed and was released to the next attorney.
      await notifyAttorneyInApp({
        attorneyId: intro.attorneyId,
        assessmentId: intro.assessmentId,
        eventType: ATTORNEY_EVENTS.case_expired,
        subject: 'Match expired',
        body: 'A matched case you were reviewing expired and has been released to another attorney.',
        leadId: leadIdByAssessment.get(intro.assessmentId) || null,
        link: '/attorney-dashboard/leadgen/matches',
      }).catch(() => {})
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

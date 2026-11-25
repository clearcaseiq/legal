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
 * repeatedly: only PENDING intros past their deadline are touched, routing only
 * advances on still-open cases, and runEscalationWave no-ops once a case is matched/locked.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import { getMatchingRules, getAttorneyResponseDeadlineMinutes } from './matching-rules-config'
import { runEscalationWave, recordRoutingEvent } from './routing-lifecycle'
import { notifyAttorneyInApp, sendOfferExpiringToAttorney } from './case-notifications'
import { ATTORNEY_EVENTS } from './notification-events'
import { getNotificationTiming, getOfferExpiryWarningMinutes } from './notification-timing-config'

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
    const warnMinutes = getOfferExpiryWarningMinutes(await getNotificationTiming(), deadlineMinutes)
    const warnStart = new Date(now - (deadlineMinutes - warnMinutes) * 60 * 1000)
    const soon = await prisma.introduction.findMany({
      where: { status: 'PENDING', requestedAt: { lte: warnStart, gt: cutoff } },
      select: { id: true, assessmentId: true, attorneyId: true, requestedAt: true },
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
        // Every channel writes a platform event, so this dedupes text and email
        // too even when the attorney has no login for the bell entry.
        const already = await prisma.platformNotificationEvent.findFirst({
          where: { eventType: ATTORNEY_EVENTS.case_expiring, payloadJson: { contains: intro.id } },
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
          link: `/attorney-dashboard/leadgen/matches/${leadId}/overview`,
          payload: { introductionId: intro.id },
        }).catch(() => {})
        const minutesLeft = (intro.requestedAt.getTime() + deadlineMinutes * 60 * 1000 - now) / 60000
        await sendOfferExpiringToAttorney({
          attorneyId: intro.attorneyId,
          introductionId: intro.id,
          assessmentId: intro.assessmentId,
          leadId,
          minutesLeft,
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

  // A lapsed offer is expired whatever became of the case: left PENDING it reads
  // as an attorney still reviewing, forever. Routing only moves on for cases
  // that are still open, and never past the attorney who already holds the case.
  const assessmentIds = [...new Set(stale.map((i) => i.assessmentId))]
  const leads = await prisma.leadSubmission.findMany({
    where: { assessmentId: { in: assessmentIds } },
    select: { id: true, assessmentId: true, status: true, routingLocked: true, assignedAttorneyId: true },
  })
  const leadByAssessment = new Map(leads.map((l) => [l.assessmentId, l]))
  const openAssessments = new Set(
    leads
      .filter((l) => !l.routingLocked && l.status === 'submitted')
      .map((l) => l.assessmentId),
  )

  const toExpire = stale.filter((i) => {
    const lead = leadByAssessment.get(i.assessmentId)
    return !(lead?.routingLocked && lead.assignedAttorneyId === i.attorneyId)
  })
  if (toExpire.length === 0) return { expired: 0, escalated: 0 }

  let expired = 0
  for (const intro of toExpire) {
    try {
      // Conditional on PENDING: an accept or decline can land between the read
      // above and this write, and a plain update would overwrite it.
      const lapsed = await prisma.introduction.updateMany({
        where: { id: intro.id, status: 'PENDING' },
        data: { status: 'EXPIRED', respondedAt: new Date() },
      })
      if (lapsed.count === 0) continue
      expired += 1
      await recordRoutingEvent(intro.assessmentId, intro.id, intro.attorneyId, 'expired', {
        reason: 'offer_response_window_elapsed',
        deadlineMinutes,
      })
      await notifyAttorneyInApp({
        attorneyId: intro.attorneyId,
        assessmentId: intro.assessmentId,
        eventType: ATTORNEY_EVENTS.case_expired,
        subject: 'Match expired',
        body: openAssessments.has(intro.assessmentId)
          ? 'A matched case you were reviewing expired and has been released to another attorney.'
          : 'A matched case you were reviewing expired.',
        leadId: leadByAssessment.get(intro.assessmentId)?.id || null,
        link: '/attorney-dashboard/leadgen/matches',
      }).catch(() => {})
    } catch (err) {
      logger.error('Failed to expire introduction', { introId: intro.id, error: (err as Error).message })
    }
  }

  // Advance routing once per affected case (idempotent; no-ops if already matched).
  let escalated = 0
  for (const assessmentId of [...new Set(toExpire.map((i) => i.assessmentId))].filter((id) => openAssessments.has(id))) {
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

/**
 * Fire-and-forget trigger used when a dashboard read observes a lapsed offer
 * window. Ensures the next attorney is offered without waiting for the next
 * scheduled sweep tick (CP-606). Safe to call frequently — the sweep is
 * idempotent and cheap when nothing is stale.
 */
let lazyExpiryInFlight: Promise<OfferExpirySweepResult> | null = null
export function triggerOfferExpirySweepSoon(): void {
  if (lazyExpiryInFlight) return
  lazyExpiryInFlight = runOfferExpirySweep()
    .catch((err) => {
      logger.warn('Lazy offer-expiry sweep failed', { error: (err as Error)?.message || String(err) })
      return { expired: 0, escalated: 0 } as OfferExpirySweepResult
    })
    .finally(() => {
      lazyExpiryInFlight = null
    })
}

/**
 * Statute of limitations expiry sweep.
 *
 * The pre-routing gate refuses to route a case whose SOL has already run
 * (pre-routing-gate.ts, check 4), but that gate fires exactly once, at routing
 * time. The SOL clock keeps running afterwards. A case that was comfortably
 * inside the period when it was offered goes stale on its own, and nothing was
 * re-reading it: the offer stayed in the attorney's "New Matches" queue, and a
 * retained file simply went quiet on the deadline that ends it.
 *
 * This sweep re-derives the SOL for every case an attorney can still act on and
 * splits the two situations that need opposite handling:
 *
 *  - An offer nobody has accepted yet is withdrawn. The introduction is expired
 *    and the lead is held at not_routable_yet, the same terminal state the gate
 *    would have applied. Routing is deliberately NOT escalated: a time-barred
 *    case must not be passed down the wave to the next attorney.
 *  - A case an attorney already owns is never un-routed — they have a client and
 *    possibly a tolling argument, and yanking the file would be worse than the
 *    deadline. They get a single notification instead.
 *
 * Exposed to the in-process scheduler (api/src/index.ts). Idempotent: held leads
 * are excluded from the next pass, and the notification is deduped per case.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import { deriveSOLStatusFromFacts } from './solRules'
import { recordRoutingEvent } from './routing-lifecycle'
import { notifyAttorneyInApp } from './case-notifications'
import { ATTORNEY_EVENTS } from './notification-events'

export interface SolExpirySweepResult {
  scanned: number
  /** Offers withdrawn because the case is time-barred. */
  held: number
  /** Pending introductions expired as part of those withdrawals. */
  offersWithdrawn: number
  /** Attorneys told that a case they already own has run out of time. */
  notified: number
}

/** Cap per run so one sweep can never monopolise the database. */
const MAX_CASES_PER_RUN = 500

/** Lead states where the attorney has taken the case on rather than merely been offered it. */
const OWNED_LEAD_STATUSES = new Set(['contacted', 'consulted', 'retained'])

function parseFacts(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export async function runSolExpirySweep(): Promise<SolExpirySweepResult> {
  const result: SolExpirySweepResult = { scanned: 0, held: 0, offersWithdrawn: 0, notified: 0 }

  const leads = await prisma.leadSubmission.findMany({
    where: {
      lifecycleState: { notIn: ['not_routable_yet', 'closed'] },
      status: { not: 'rejected' },
    },
    select: {
      id: true,
      assessmentId: true,
      status: true,
      routingLocked: true,
      assignedAttorneyId: true,
      assessment: {
        select: { id: true, claimType: true, venueState: true, venueCounty: true, facts: true },
      },
    },
    orderBy: { updatedAt: 'asc' },
    take: MAX_CASES_PER_RUN,
  })

  for (const lead of leads) {
    const assessment = lead.assessment
    if (!assessment) continue
    result.scanned += 1

    const sol = deriveSOLStatusFromFacts({
      facts: parseFacts(assessment.facts),
      claimType: assessment.claimType,
      venueState: assessment.venueState,
      venueCounty: assessment.venueCounty,
    })
    if (sol.status !== 'expired') continue

    const expiredOn = sol.expiresAt ? sol.expiresAt.toISOString().split('T')[0] : 'an unknown date'
    const attorneyOwnsCase = lead.routingLocked || OWNED_LEAD_STATUSES.has(lead.status)

    try {
      if (attorneyOwnsCase) {
        const notified = await notifyOwnedCaseOnce(lead, expiredOn)
        if (notified) result.notified += 1
        continue
      }

      const withdrawn = await withdrawTimeBarredOffer(lead, expiredOn, sol.daysRemaining ?? null)
      result.held += 1
      result.offersWithdrawn += withdrawn
    } catch (err) {
      logger.error('SOL expiry sweep failed on a case', {
        assessmentId: lead.assessmentId,
        error: (err as Error).message,
      })
    }
  }

  if (result.held > 0 || result.notified > 0) {
    logger.info('SOL expiry sweep completed', result)
  }
  return result
}

/**
 * Pull an unaccepted, time-barred offer back out of routing.
 *
 * Returns the number of pending introductions that were expired.
 */
async function withdrawTimeBarredOffer(
  lead: { id: string; assessmentId: string; status: string },
  expiredOn: string,
  daysRemaining: number | null,
): Promise<number> {
  const pending = await prisma.introduction.findMany({
    where: { assessmentId: lead.assessmentId, status: 'PENDING' },
    select: { id: true, attorneyId: true },
  })

  for (const intro of pending) {
    await prisma.introduction.update({
      where: { id: intro.id },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    })
    await recordRoutingEvent(lead.assessmentId, intro.id, intro.attorneyId, 'expired', {
      reason: 'statute_of_limitations_expired',
      expiredOn,
    })
    await notifyAttorneyInApp({
      attorneyId: intro.attorneyId,
      assessmentId: lead.assessmentId,
      eventType: ATTORNEY_EVENTS.sol_expired,
      subject: 'Match withdrawn: filing deadline passed',
      body: `A case you were offered is outside its statute of limitations (expired ${expiredOn}) and has been withdrawn from your queue.`,
      leadId: lead.id,
      link: '/attorney-dashboard/leadgen/matches',
    }).catch(() => {})
  }

  await prisma.leadSubmission.update({
    where: { id: lead.id },
    data: { lifecycleState: 'not_routable_yet', routingLocked: false },
  })
  await recordRoutingEvent(lead.assessmentId, null, null, 'not_routable_yet', {
    reason: 'Statute of limitations has expired',
    expiredOn,
    daysRemaining,
    source: 'sol_expiry_sweep',
  })

  return pending.length
}

/**
 * Tell the assigned attorney once that a case they already hold is time-barred.
 *
 * Deduped on the assessment so a case sitting in this state does not generate a
 * fresh alert on every sweep.
 */
async function notifyOwnedCaseOnce(
  lead: { id: string; assessmentId: string; assignedAttorneyId: string | null },
  expiredOn: string,
): Promise<boolean> {
  if (!lead.assignedAttorneyId) return false

  const already = await prisma.notification.findFirst({
    where: { type: ATTORNEY_EVENTS.sol_expired, metadata: { contains: lead.assessmentId } },
    select: { id: true },
  })
  if (already) return false

  return notifyAttorneyInApp({
    attorneyId: lead.assignedAttorneyId,
    assessmentId: lead.assessmentId,
    eventType: ATTORNEY_EVENTS.sol_expired,
    subject: 'Filing deadline has passed',
    body: `The statute of limitations on this case expired ${expiredOn}. Confirm whether suit was filed, or whether tolling applies, before taking any further action.`,
    leadId: lead.id,
    link: `/attorney-dashboard/lead/${lead.id}/overview`,
    payload: { assessmentId: lead.assessmentId, expiredOn },
  })
}

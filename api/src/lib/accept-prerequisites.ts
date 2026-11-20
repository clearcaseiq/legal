import { prisma } from './prisma'
import { hasAttorneyAcceptedAgreement } from './attorney-agreement'
import { conflictNeedsAcknowledgment, getLatestConflictCheck, runAndPersistConflictCheck } from './conflict-check'
import { getAttorneyResponseDeadlineMinutes, getMatchingRules } from './matching-rules-config'
import { hasSettledRoutingFee, isRoutingFeeDue } from './routing-fee'

export type AcceptBlocker = {
  code: 'AGREEMENT_REQUIRED' | 'WINDOW_EXPIRED' | 'CONFLICT_ACK_REQUIRED' | 'ROUTING_FEE_REQUIRED'
  message: string
  leadId: string | null
}

/**
 * Everything the dashboard requires before an accept, for the channels that
 * accept an offer outside the dashboard (text reply, introductions API).
 * Returns null when the attorney may accept right away.
 */
export async function getAcceptBlocker(introductionId: string, attorneyId: string): Promise<AcceptBlocker | null> {
  const intro = await prisma.introduction.findFirst({
    where: { id: introductionId, attorneyId },
    select: {
      requestedAt: true,
      attorney: { select: { email: true } },
      assessment: { select: { leadSubmission: { select: { id: true, sourceType: true } } } },
    },
  })
  if (!intro) return null
  const lead = intro.assessment?.leadSubmission ?? null
  const leadId = lead?.id ?? null

  if (!(await hasAttorneyAcceptedAgreement(intro.attorney?.email))) {
    return {
      code: 'AGREEMENT_REQUIRED',
      message: 'Please accept the Attorney Participation Agreement before accepting cases.',
      leadId,
    }
  }

  if (intro.requestedAt) {
    const deadlineMinutes = getAttorneyResponseDeadlineMinutes(await getMatchingRules())
    if (intro.requestedAt.getTime() + deadlineMinutes * 60 * 1000 <= Date.now()) {
      return {
        code: 'WINDOW_EXPIRED',
        message: 'The response window for this match has expired and it has been released to another attorney.',
        leadId,
      }
    }
  }

  if (!lead) return null

  const preCheck =
    (await getLatestConflictCheck(attorneyId, lead.id, 'pre_acquire')) ??
    (await runAndPersistConflictCheck({ attorneyId, leadId: lead.id, phase: 'pre_acquire' })).saved
  if (preCheck && conflictNeedsAcknowledgment(preCheck)) {
    return {
      code: 'CONFLICT_ACK_REQUIRED',
      message: 'A preliminary conflict was flagged. Review and acknowledge it in CaseIQ before accepting.',
      leadId,
    }
  }

  if ((await isRoutingFeeDue(lead)) && !(await hasSettledRoutingFee(attorneyId, lead.id))) {
    return {
      code: 'ROUTING_FEE_REQUIRED',
      message: 'This case has a routing fee. Accept it in CaseIQ to pay and take the case.',
      leadId,
    }
  }

  return null
}

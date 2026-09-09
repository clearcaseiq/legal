/**
 * What the claimant hears after a call they did not take.
 *
 * `call_not_accepted` is the one status the specialist sets that describes a
 * failure to communicate, and until this existed it was silent: the case stayed
 * in the working set, the specialist was told to try again, and the claimant —
 * who most likely saw an unknown number and let it ring — was never told anyone
 * had tried. The follow-up closes that loop from our side so the next attempt
 * is expected rather than another unknown number.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { deliverDirectNotification } from './platform-notifications'
import { PLAINTIFF_EVENTS } from './notification-events'
import { sendSms } from './sms'
import { webUrl } from './app-url'

/**
 * How long a case has to wait before a second missed-call note.
 *
 * A specialist who calls twice in an afternoon, or who corrects a status they
 * mis-clicked, must not send the claimant a second identical message. The
 * window is deliberately shorter than a working day, so genuinely repeated
 * attempts across days still get through.
 */
const RESEND_COOLDOWN_MS = 6 * 60 * 60 * 1000

/** The channel and outcome this writes to the contact log. */
const FOLLOWUP_NOTE = 'Missed-call follow-up sent to the claimant'

function firstNameOf(assessment: any): string | null {
  const name = (assessment?.user?.firstName || '').trim()
  return name || null
}

/**
 * Notify the claimant that we tried to reach them, and log it on the case.
 *
 * Best-effort throughout: the specialist's status change is the thing that must
 * succeed, and a mail or SMS failure cannot be allowed to undo it or to surface
 * as an error on a workflow save.
 */
export async function sendMissedCallFollowUp(params: {
  assistanceId: string
  assessmentId: string
  contact: { email?: string | null; phone?: string | null }
  specialist: { id?: string | null; name?: string | null; email?: string | null }
}): Promise<void> {
  const { assistanceId, assessmentId, contact, specialist } = params
  if (!contact.email && !contact.phone) return

  try {
    // Read the log rather than a flag on the case: the log is what a specialist
    // sees in Activity, so the two can never disagree about whether the
    // claimant was actually written to.
    const recent = await prisma.caseInteraction.findFirst({
      where: {
        assistanceId,
        notes: FOLLOWUP_NOTE,
        occurredAt: { gte: new Date(Date.now() - RESEND_COOLDOWN_MS) },
      },
      select: { id: true },
    })
    if (recent) {
      logger.info('Skipped a repeat missed-call follow-up inside the cooldown', { assessmentId })
      return
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { id: true, user: { select: { id: true, firstName: true } } },
    })

    const greeting = firstNameOf(assessment) ? `Hi ${firstNameOf(assessment)},` : 'Hi,'
    const from = specialist.name || 'your ClearCaseIQ case specialist'
    const caseUrl = webUrl(`/results?assessment=${assessmentId}`)

    let emailed = false
    if (contact.email) {
      emailed = await deliverDirectNotification({
        type: 'email',
        recipient: contact.email,
        subject: 'We tried to reach you about your case',
        // No blame and no deadline. The claimant missing a call is the normal
        // case, not a failing, and a case in this queue has nothing pending on
        // them — we are the ones who need something.
        message: [
          greeting,
          '',
          `${from} tried to reach you by phone about your case and could not get through.`,
          '',
          'There is nothing wrong — we just have a few questions that will help us understand what happened, and they are much quicker to answer on a call than in writing.',
          '',
          'You can reply to this email with a good time to call, or open your case to see where things stand.',
        ].join('\n'),
        cta: { label: 'View your case', url: caseUrl },
        userId: assessment?.user?.id || null,
        assessmentId,
        role: 'plaintiff',
        // Replies reach the person who actually called, not a shared inbox.
        replyTo: specialist.email || null,
        fromEmail: specialist.email || null,
        fromName: specialist.name || 'Your ClearCaseIQ case specialist',
        metadata: {
          eventType: PLAINTIFF_EVENTS.more_info_requested,
          reason: 'call_not_accepted',
          specialistId: specialist.id || null,
        },
      })
        .then(() => true)
        .catch((error: unknown) => {
          logger.warn('Missed-call follow-up email failed', { assessmentId, error })
          return false
        })
    }

    // Sent alongside the email, not instead of it. Someone who does not answer
    // an unknown number is often reachable by text, and the message is short
    // enough to be read on a lock screen.
    let texted = false
    if (contact.phone) {
      texted = await sendSms(
        contact.phone,
        `ClearCaseIQ: we tried to call about your case and couldn't reach you. Reply with a good time to call, or see your case at ${caseUrl}`,
      ).catch((error: unknown) => {
        logger.warn('Missed-call follow-up SMS failed', { assessmentId, error })
        return false
      })
    }

    if (!emailed && !texted) return

    await prisma.caseInteraction.create({
      data: {
        assistanceId,
        assessmentId,
        specialistId: specialist.id || null,
        // Attributed to the channel that carried it, so Communications shows
        // the follow-up the same way it shows anything else we sent.
        channel: emailed ? 'email' : 'sms',
        direction: 'outbound',
        outcome: 'sent',
        notes: FOLLOWUP_NOTE,
      },
    })

    logger.info('Sent a missed-call follow-up to the claimant', {
      assessmentId,
      emailed,
      texted,
    })
  } catch (error) {
    logger.warn('Could not send a missed-call follow-up', { assessmentId, error })
  }
}

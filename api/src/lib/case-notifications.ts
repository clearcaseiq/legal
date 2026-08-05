/**
 * Step 8: Attorney Notification System
 * Sends case alerts via Email, SMS, and in-platform notification.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import { webUrl } from './app-url'
import { notifyAttorneyByUserEmail } from './attorney-push'
import { createNotificationEvent } from './platform-notifications'
import { ATTORNEY_EVENTS, PLAINTIFF_EVENTS } from './notification-events'

export interface CaseSummaryForNotification {
  claimType: string
  jurisdiction: string
  estimatedValueLow: number
  estimatedValueHigh: number
  evidenceSummary: string
  liabilityConfidence: string
  introductionId: string
  assessmentId: string
}

/**
 * Format claim type for display
 */
function formatClaimType(claimType: string): string {
  return claimType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Format currency for display
 */
function formatCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`
  return `$${n.toLocaleString()}`
}

async function findUserByEmail(email?: string | null) {
  if (!email) return null
  return prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true }
  })
}

/**
 * Standardized attorney IN-APP notification for the notifications bell.
 *
 * Writes a `Notification` row (channel `in_app`) keyed to the attorney's User, with a
 * deep `link` + `leadId` carried in the payload so the bell can render and navigate.
 * `eventType` MUST be an `attorney.*` type — the bell lists Notification rows whose
 * `type` starts with `attorney.` (so we intentionally omit `templateKey`, which would
 * otherwise become the stored `type`).
 */
export async function notifyAttorneyInApp(input: {
  attorneyId: string
  userId?: string | null
  recipientEmail?: string | null
  assessmentId?: string | null
  eventType: string
  subject: string
  body: string
  leadId?: string | null
  link?: string | null
  payload?: Record<string, unknown>
}): Promise<boolean> {
  try {
    let userId = input.userId || null
    let email = input.recipientEmail || null
    if (!userId || !email) {
      const attorney = await prisma.attorney.findUnique({
        where: { id: input.attorneyId },
        select: { email: true },
      })
      const user = await findUserByEmail(attorney?.email)
      if (!user) return false
      userId = user.id
      email = user.email
    }
    await createNotificationEvent({
      userId,
      attorneyId: input.attorneyId,
      assessmentId: input.assessmentId || undefined,
      role: 'attorney',
      channel: 'in_app',
      eventType: input.eventType,
      subject: input.subject,
      body: input.body,
      recipient: email || undefined,
      payload: {
        ...(input.payload || {}),
        eventType: input.eventType,
        ...(input.leadId ? { leadId: input.leadId } : {}),
        ...(input.link ? { link: input.link } : {}),
      },
    })
    return true
  } catch (err) {
    logger.warn('notifyAttorneyInApp failed', {
      attorneyId: input.attorneyId,
      eventType: input.eventType,
      error: (err as Error).message,
    })
    return false
  }
}

/** Every plaintiff in-app notification type carries this prefix. See below. */
const PLAINTIFF_EVENT_PREFIX = 'plaintiff.'

/**
 * Standardized plaintiff IN-APP notification for the notifications bell.
 *
 * The mirror of notifyAttorneyInApp, and it exists because the plaintiff side
 * had no equivalent: routes wrote in-app rows for plaintiffs that no endpoint
 * could ever return, so the bell — which derived its contents from routing
 * status and document requests — never showed them (CP-412/CP-430).
 *
 * `eventType` MUST be a `plaintiff.*` type, since the feed lists Notification
 * rows whose `type` starts with `plaintiff.`. The prefix is applied here rather
 * than trusted from the caller, because a row with the wrong type is not a
 * visible error — it is simply a notification nobody ever sees. `templateKey`
 * is deliberately omitted for the same reason it is on the attorney side: it
 * would become the stored `type`.
 */
export async function notifyPlaintiffInApp(input: {
  userId: string
  recipientEmail?: string | null
  attorneyId?: string | null
  assessmentId?: string | null
  eventType: string
  subject: string
  body: string
  link?: string | null
  payload?: Record<string, unknown>
}): Promise<boolean> {
  try {
    let email = input.recipientEmail || null
    if (!email) {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true },
      })
      email = user?.email || null
    }
    // The in-app writer drops events with no recipient, so bail loudly here
    // instead of reporting success for a row that was never created.
    if (!email) {
      logger.warn('notifyPlaintiffInApp skipped: no recipient email', {
        userId: input.userId,
        eventType: input.eventType,
      })
      return false
    }

    const eventType = input.eventType.startsWith(PLAINTIFF_EVENT_PREFIX)
      ? input.eventType
      : `${PLAINTIFF_EVENT_PREFIX}${input.eventType}`

    await createNotificationEvent({
      userId: input.userId,
      attorneyId: input.attorneyId || undefined,
      assessmentId: input.assessmentId || undefined,
      role: 'plaintiff',
      channel: 'in_app',
      eventType,
      subject: input.subject,
      body: input.body,
      recipient: email,
      payload: {
        ...(input.payload || {}),
        eventType,
        ...(input.assessmentId ? { assessmentId: input.assessmentId } : {}),
        ...(input.link ? { link: input.link } : {}),
      },
    })
    return true
  } catch (err) {
    logger.warn('notifyPlaintiffInApp failed', {
      userId: input.userId,
      eventType: input.eventType,
      error: (err as Error).message,
    })
    return false
  }
}

/**
 * Send case offer to attorney via all channels: Email, SMS, in-platform
 */
export async function sendCaseOfferToAttorney(
  attorneyId: string,
  introductionId: string,
  summary: CaseSummaryForNotification,
  timeoutMinutes = 120
): Promise<{ sms: boolean; email: boolean; inPlatform: boolean }> {
  const attorney = await prisma.attorney.findUnique({
    where: { id: attorneyId },
    select: { email: true, phone: true, name: true }
  })
  if (!attorney) {
    logger.warn('Attorney not found for notification', { attorneyId })
    return { sms: false, email: false, inPlatform: false }
  }

  const caseSummary = [
    `Claim: ${formatClaimType(summary.claimType)}`,
    `Location: ${summary.jurisdiction}`,
    `Est. Value: ${formatCurrency(summary.estimatedValueLow)}–${formatCurrency(summary.estimatedValueHigh)}`,
    `Evidence: ${summary.evidenceSummary}`,
    `Liability: ${summary.liabilityConfidence}`
  ].join('\n')

  // Deep-link to the lead detail page that actually exists in the web app
  const lead = await prisma.leadSubmission.findFirst({
    where: { assessmentId: summary.assessmentId },
    select: { id: true },
  })
  const reviewUrl = lead?.id
    ? webUrl(`/attorney-dashboard/lead/${lead.id}/overview`)
    : webUrl('/attorney-dashboard')

  const fullMessage = [
    'New Case Match',
    '',
    caseSummary,
    '',
    `Review Case: ${reviewUrl}`
  ].join('\n')

  let smsSent = false
  let emailSent = false
  let inPlatformSent = false

  // 1. SMS
  if (attorney.phone) {
    await createNotificationEvent({
      attorneyId,
      assessmentId: summary.assessmentId,
      role: 'attorney',
      channel: 'sms',
      eventType: ATTORNEY_EVENTS.case_routed,
      templateKey: 'attorney_case_routed_sms',
      subject: 'New Case Match',
      body: [
        'CaseIQ: New case routed to you.',
        caseSummary,
        `Reply ACCEPT to accept or DECLINE to decline. (${timeoutMinutes} min)`
      ].join('\n'),
      recipient: attorney.phone
    })
    smsSent = true
  }

  // 2. Email
  if (attorney.email) {
    try {
      await createNotificationEvent({
        attorneyId,
        assessmentId: summary.assessmentId,
        role: 'attorney',
        channel: 'email',
        eventType: ATTORNEY_EVENTS.case_routed,
        templateKey: 'attorney_case_routed_email',
        subject: `New Case Match: ${formatClaimType(summary.claimType)} - ${summary.jurisdiction}`,
        body: fullMessage,
        recipient: attorney.email,
        payload: {
          introductionId,
          assessmentId: summary.assessmentId,
          attorneyId,
          claimType: summary.claimType
        }
      })
      emailSent = true
    } catch (err: unknown) {
      logger.error('Failed to create email notification', { attorneyId, error: (err as Error).message })
    }
  }

  // 3. In-platform
  try {
    const user = await findUserByEmail(attorney.email)
    if (user) {
      await createNotificationEvent({
        userId: user.id,
        attorneyId,
        assessmentId: summary.assessmentId,
        role: 'attorney',
        channel: 'in_app',
        eventType: ATTORNEY_EVENTS.case_routed,
        subject: 'New case match',
        body: fullMessage,
        recipient: user.email,
        payload: {
          introductionId,
          assessmentId: summary.assessmentId,
          claimType: summary.claimType,
          ...(lead?.id ? { leadId: lead.id, link: `/attorney-dashboard/lead/${lead.id}/overview` } : {}),
        }
      })
      inPlatformSent = true
    }
  } catch (err: unknown) {
    logger.error('Failed to create in-platform notification', { attorneyId, error: (err as Error).message })
  }

  // 4. Mobile push (Expo)
  try {
    await notifyAttorneyByUserEmail(attorney.email, {
      title: 'New case match',
      body: `${formatClaimType(summary.claimType)} — ${summary.jurisdiction}`,
      // NEW_LEAD category renders one-tap Accept/Decline action buttons on the device.
      categoryId: 'NEW_LEAD',
      data: {
        type: 'case_match',
        introductionId: String(introductionId),
        assessmentId: String(summary.assessmentId),
        leadId: lead?.id ? String(lead.id) : '',
      },
    })
  } catch (err: unknown) {
    logger.warn('Case offer push failed', { attorneyId, error: (err as Error).message })
  }

  logger.info('Case offer sent to attorney', {
    attorneyId,
    introductionId,
    sms: smsSent,
    email: emailSent,
    inPlatform: inPlatformSent
  })

  return { sms: smsSent, email: emailSent, inPlatform: inPlatformSent }
}

/**
 * Step 12: Plaintiff Notification when attorney accepts
 */
export async function sendPlaintiffAttorneyAccepted(
  assessmentId: string,
  attorneyId: string,
  attorneyName: string,
  firmName?: string,
  yearsExperience?: number
): Promise<boolean> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { user: true }
  })
  if (!assessment?.user?.email) {
    logger.warn('No plaintiff email for attorney-accepted notification', { assessmentId })
    return false
  }

  const experienceText = yearsExperience ? `${yearsExperience} years of experience` : 'an experienced attorney'
  const firmText = firmName ? ` at ${firmName}` : ''
  const greetingName = assessment.user.firstName ? ` ${assessment.user.firstName}` : ''
  // Which case, and when — the notification named neither, so a plaintiff with
  // more than one claim could not tell what had just been accepted (CP-437).
  const acceptedAt = new Date()
  const caseTypeLabel = assessment.claimType ? formatClaimType(assessment.claimType) : 'Personal injury'
  const acceptedDate = acceptedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const acceptedTime = acceptedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
  const message = [
    `Hello${greetingName},`,
    '',
    `Good news — ${attorneyName}${firmText} has reviewed and accepted your case and would like to help.`,
    '',
    `Case type: ${caseTypeLabel}`,
    `Accepted: ${acceptedDate} at ${acceptedTime}`,
    `Your attorney: ${attorneyName}${firmName ? `, ${firmName}` : ''}`,
    `Experience: ${experienceText}`,
    '',
    'What happens next:',
    '1. Your attorney will reach out to schedule a consultation.',
    '2. You can message them and share documents securely from your ClearCaseIQ dashboard.',
    '',
    'We are glad to have connected you with representation for your claim.',
    '',
    'Warm regards,',
    'The ClearCaseIQ Team'
  ].join('\n')

  try {
    await createNotificationEvent({
      userId: assessment.userId!,
      attorneyId,
      assessmentId,
      role: 'plaintiff',
      channel: 'email',
      eventType: PLAINTIFF_EVENTS.attorney_match_found,
      templateKey: 'plaintiff_attorney_match_found_email',
      subject: 'An attorney is interested in your case',
      body: message,
      recipient: assessment.user.email,
      payload: {
        assessmentId,
        attorneyId,
        attorneyName,
        firmName
      }
    })
    await createNotificationEvent({
      userId: assessment.userId!,
      attorneyId,
      assessmentId,
      role: 'plaintiff',
      channel: 'in_app',
      eventType: PLAINTIFF_EVENTS.attorney_match_found,
      subject: 'An attorney is interested in your case',
      body: message,
      recipient: assessment.user.email,
      payload: {
        assessmentId,
        attorneyId,
        attorneyName,
        firmName
      }
    })
    logger.info('Plaintiff notified of attorney acceptance', { assessmentId, attorneyId })
    return true
  } catch (err: unknown) {
    logger.error('Failed to notify plaintiff', { assessmentId, error: (err as Error).message })
    return false
  }
}

/**
 * Plaintiff notification when routing needs human/manual review.
 */
export async function sendPlaintiffManualReviewNeeded(
  assessmentId: string,
  reason?: string,
  note?: string
): Promise<boolean> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { user: true }
  })
  if (!assessment?.user?.email) {
    logger.warn('No plaintiff email for manual-review notification', { assessmentId })
    return false
  }

  const reasonLine = reason ? `Reason: ${reason.replace(/_/g, ' ')}` : 'Reason: attorney review requires a human check'
  const noteLine = note ? `Note: ${note}` : 'Our team is reviewing your case and will follow up with next steps.'
  const message = [
    'Your case is being reviewed by our team.',
    '',
    reasonLine,
    noteLine,
    '',
    'No action is required right now unless we contact you for additional information.'
  ].join('\n')

  try {
    await createNotificationEvent({
      userId: assessment.userId!,
      assessmentId,
      role: 'plaintiff',
      channel: 'email',
      eventType: PLAINTIFF_EVENTS.attorneys_reviewing,
      templateKey: 'plaintiff_manual_review_email',
      subject: 'Your case is in manual review',
      body: message,
      recipient: assessment.user.email,
      payload: {
        assessmentId,
        reason,
        note
      }
    })
    await createNotificationEvent({
      userId: assessment.userId!,
      assessmentId,
      role: 'plaintiff',
      channel: 'in_app',
      eventType: PLAINTIFF_EVENTS.attorneys_reviewing,
      subject: 'Your case is in manual review',
      body: message,
      recipient: assessment.user.email,
      payload: {
        assessmentId,
        reason,
        note
      }
    })
    logger.info('Plaintiff notified of manual review', { assessmentId, reason })
    return true
  } catch (err: unknown) {
    logger.error('Failed to notify plaintiff of manual review', { assessmentId, error: (err as Error).message })
    return false
  }
}

/**
 * Ask the plaintiff to approve a further set of attorneys before any of them are
 * contacted.
 *
 * SB 37 / Bus. & Prof. Code § 6155(g): the safe harbour covers attorneys the
 * consumer "may select and initiate contact with". Once the attorneys the
 * consumer actually chose are exhausted we may not quietly continue to a fresh
 * batch, so routing stops here until they say yes.
 *
 * Guests have no User row, so fall back to the contact email captured at submit.
 */
export async function sendPlaintiffBatchApprovalRequest(
  assessmentId: string,
  attorneyNames: string[]
): Promise<boolean> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { user: true }
  })
  if (!assessment) return false

  let guestEmail: string | null = null
  if (!assessment.user?.email) {
    try {
      const facts = typeof assessment.facts === 'string' ? JSON.parse(assessment.facts) : assessment.facts || {}
      const contact = (facts?.plaintiffContext || {}) as Record<string, unknown>
      const candidate = typeof contact.email === 'string' ? contact.email.trim() : ''
      guestEmail = candidate || null
    } catch {
      guestEmail = null
    }
  }

  const recipient = assessment.user?.email || guestEmail
  if (!recipient) {
    logger.warn('No plaintiff email for batch-approval request', { assessmentId })
    return false
  }

  const reviewUrl = webUrl(`/results/${assessmentId}?review=attorneys`)
  const nameLines = attorneyNames.length
    ? attorneyNames.map((name, index) => `${index + 1}. ${name}`).join('\n')
    : 'We will show you the attorneys when you open your case.'
  const message = [
    'The attorneys you chose were not able to take your case.',
    '',
    'We found others who handle this type of matter in your area, and we will not',
    'contact anyone until you approve them:',
    '',
    nameLines,
    '',
    `Review and approve: ${reviewUrl}`,
    '',
    'You can change the order, remove anyone you would rather not work with, or stop here.'
  ].join('\n')
  const subject = 'Approve the next attorneys for your case'

  try {
    if (assessment.userId && assessment.user?.email) {
      for (const channel of ['email', 'in_app'] as const) {
        await createNotificationEvent({
          userId: assessment.userId,
          assessmentId,
          role: 'plaintiff',
          channel,
          eventType: PLAINTIFF_EVENTS.batch_approval_requested,
          ...(channel === 'email' ? { templateKey: `plaintiff_batch_approval_email` } : {}),
          subject,
          body: message,
          recipient: assessment.user.email,
          payload: { assessmentId, attorneyNames, link: `/results/${assessmentId}?review=attorneys` }
        })
      }
    } else {
      const { deliverDirectNotification } = await import('./platform-notifications')
      await deliverDirectNotification({
        type: 'email',
        recipient,
        subject,
        message,
        assessmentId,
        role: 'plaintiff',
        metadata: { eventType: PLAINTIFF_EVENTS.batch_approval_requested, assessmentId }
      })
    }
    logger.info('Plaintiff asked to approve the next attorney batch', {
      assessmentId,
      attorneyCount: attorneyNames.length
    })
    return true
  } catch (err: unknown) {
    logger.error('Failed to request plaintiff batch approval', {
      assessmentId,
      error: (err as Error).message
    })
    return false
  }
}

/**
 * Plaintiff notification when case value increases after document upload
 */
export async function sendPlaintiffCaseValueUpdated(
  assessmentId: string,
  userId: string,
  previousValue: { p25: number; median: number; p75: number } | null,
  newValue: { p25: number; median: number; p75: number },
  reason: string
): Promise<boolean> {
  const prevStr = previousValue
    ? `${formatCurrency(previousValue.p25)} – ${formatCurrency(previousValue.p75)}`
    : 'Not yet estimated'
  const newStr = `${formatCurrency(newValue.p25)} – ${formatCurrency(newValue.p75)}`
  const message = [
    'Your case just got stronger.',
    '',
    reason === 'document_upload'
      ? 'New documents increased your estimated case value.'
      : `${reason.replace(/_/g, ' ')} increased your estimated case value.`,
    '',
    `Previous estimate: ${prevStr}`,
    `Updated estimate: ${newStr}`,
    '',
    'This keeps your case competitive with attorneys.'
  ].join('\n')

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (!user?.email) return false

    await createNotificationEvent({
      userId,
      assessmentId,
      role: 'plaintiff',
      channel: 'email',
      eventType: PLAINTIFF_EVENTS.case_score_updated,
      templateKey: 'plaintiff_case_value_updated_email',
      subject: 'Case Value Updated',
      body: message,
      recipient: user.email,
      payload: {
        assessmentId,
        previousValue,
        newValue,
        reason
      }
    })
    await createNotificationEvent({
      userId,
      assessmentId,
      role: 'plaintiff',
      channel: 'in_app',
      eventType: PLAINTIFF_EVENTS.case_score_updated,
      subject: 'Case Value Updated',
      body: message,
      recipient: user.email,
      payload: {
        assessmentId,
        previousValue,
        newValue,
        reason
      }
    })
    logger.info('Plaintiff notified of case value update', { assessmentId, userId })
    return true
  } catch (err: unknown) {
    logger.error('Failed to notify plaintiff of case value update', { assessmentId, error: (err as Error).message })
    return false
  }
}

/**
 * Attorney notification when case has material update (value +20%, new liability evidence, etc.)
 */
export async function sendAttorneyCaseMaterialUpdate(
  assessmentId: string,
  newValue: { p25: number; median: number; p75: number },
  reason: string,
  hasNewLiabilityEvidence: boolean
): Promise<number> {
  const introductions = await prisma.introduction.findMany({
    where: { assessmentId, status: 'ACCEPTED' },
    include: { attorney: { select: { id: true, email: true } } }
  })
  if (introductions.length === 0) return 0

  const valueStr = `${formatCurrency(newValue.p25)} – ${formatCurrency(newValue.p75)}`
  const reasonText =
    reason === 'document_upload'
      ? 'Plaintiff uploaded new documents.'
      : hasNewLiabilityEvidence
        ? 'Plaintiff uploaded documents including liability evidence (e.g. police report).'
        : `${reason.replace(/_/g, ' ')}.`

  const materialLead = await prisma.leadSubmission.findFirst({
    where: { assessmentId },
    select: { id: true },
  })
  const materialLink = materialLead?.id
    ? `/attorney-dashboard/cases/${materialLead.id}/evidence`
    : undefined

  const message = [
    'Case Update',
    '',
    reasonText,
    '',
    `New case value estimate: ${valueStr}`,
    '',
    `Review case: ${webUrl('/attorney-dashboard')}`
  ].join('\n')

  let count = 0
  for (const intro of introductions) {
    const user = await prisma.user.findFirst({
      where: { email: intro.attorney.email || undefined }
    })
    if (user) {
      try {
        await createNotificationEvent({
          userId: user.id,
          attorneyId: intro.attorneyId,
          assessmentId,
          role: 'attorney',
          channel: 'in_app',
          eventType: ATTORNEY_EVENTS.doc_uploaded,
          subject: 'Case update – new evidence',
          body: message,
          recipient: user.email,
          payload: {
            assessmentId,
            introductionId: intro.id,
            newValue,
            reason,
            ...(materialLead?.id ? { leadId: materialLead.id, link: materialLink } : {}),
          }
        })
        count++
      } catch (_) {}
    }
  }
  return count
}

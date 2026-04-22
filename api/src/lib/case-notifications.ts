/**
 * Step 8: Attorney Notification System
 * Sends case alerts via Email, SMS, and in-platform notification.
 */

import { prisma } from './prisma'
import { logger } from './logger'
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

  const fullMessage = [
    'New Case Match',
    '',
    caseSummary,
    '',
    `Review Case: ${process.env.WEB_URL || 'https://app.clearcaseiq.com'}/attorney/cases/${introductionId}`
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
        templateKey: 'attorney_case_routed_in_app',
        subject: 'New Case Match',
        body: fullMessage,
        recipient: user.email,
        payload: {
          introductionId,
          assessmentId: summary.assessmentId,
          claimType: summary.claimType
        }
      })
      inPlatformSent = true
    }
  } catch (err: unknown) {
    logger.error('Failed to create in-platform notification', { attorneyId, error: (err as Error).message })
  }

  // 4. Mobile push (Expo)
  try {
    const lead = await prisma.leadSubmission.findFirst({
      where: { assessmentId: summary.assessmentId },
      select: { id: true },
    })
    await notifyAttorneyByUserEmail(attorney.email, {
      title: 'New case match',
      body: `${formatClaimType(summary.claimType)} — ${summary.jurisdiction}`,
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

  const experienceText = yearsExperience ? `${yearsExperience} years experience` : 'Experienced attorney'
  const firmText = firmName ? `\nFirm: ${firmName}` : ''
  const message = [
    'Good news — an attorney is interested in your case.',
    '',
    `Attorney: ${attorneyName}${firmText}`,
    `Experience: ${experienceText}`,
    '',
    'Schedule a consultation to discuss your case.'
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
      templateKey: 'plaintiff_attorney_match_found_in_app',
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
      templateKey: 'plaintiff_manual_review_in_app',
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
      templateKey: 'plaintiff_case_value_updated_in_app',
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

  const message = [
    'Case Update',
    '',
    reasonText,
    '',
    `New case value estimate: ${valueStr}`,
    '',
    `Review case: ${process.env.WEB_URL || 'https://app.clearcaseiq.com'}/attorney/cases`
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
          templateKey: 'attorney_case_material_update_in_app',
          subject: 'Case Update – New Evidence',
          body: message,
          recipient: user.email,
          payload: {
            assessmentId,
            introductionId: intro.id,
            newValue,
            reason
          }
        })
        count++
      } catch (_) {}
    }
  }
  return count
}

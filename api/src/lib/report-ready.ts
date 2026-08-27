/**
 * The "your case report is ready" email, and the delay that keeps it from
 * arriving alongside the submission receipt.
 *
 * Finishing the assessment and sending the case to attorneys are separate
 * actions — the wizard marks the intake lead complete, and a later click on the
 * results page submits it. Each sent its own email, so a claimant who did both
 * in one sitting received "Your case report is ready" and "We received your
 * case" about a minute apart.
 *
 * Which of those to send cannot be decided when the assessment completes,
 * because that is the earlier event and the submission has not happened yet.
 * So the report email is scheduled rather than sent, and a submission arriving
 * inside the window cancels it — the receipt carries the report link instead.
 * Someone who finishes but never submits still gets it when the window passes,
 * which matters because it is their only link back to the report.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { sendClaimEmail } from './claims'
import { sendSms } from './sms'
import { webUrl } from './app-url'

/**
 * How long a finished assessment waits before its report email goes out.
 *
 * Long enough to cover reading the results and deciding to submit, but tuned
 * toward the person who closes the tab: they are the one relying on this email,
 * and making them wait is a worse outcome than a prompt submitter occasionally
 * receiving both messages.
 */
export const REPORT_READY_DELAY_MS = 10 * 60_000

// Cap work per sweep so a backlog cannot hammer the email/SMS providers.
const BATCH_SIZE = 100

export function caseReportUrl(assessmentId: string): string {
  return webUrl(`/results/${encodeURIComponent(assessmentId)}`)
}

/** Best-effort: email/SMS the finished case report link. Never throws. */
export async function sendReportReady(lead: {
  id: string
  email: string | null
  phone: string | null
  assessmentId: string | null
}): Promise<void> {
  if (!lead.assessmentId) return
  const link = caseReportUrl(lead.assessmentId)
  try {
    if (lead.email) {
      await sendClaimEmail({
        to: lead.email,
        subject: 'Your ClearCaseIQ case report is ready',
        body: `Good news. Your case assessment is complete.\n\nView your case report: ${link}\n\nYou can review your estimated case value, liability analysis, and next steps any time.`,
      })
    }
    if (lead.phone) {
      await sendSms(lead.phone, `ClearCaseIQ: your case report is ready. View it here: ${link}`)
    }
  } catch (error) {
    logger.warn('Failed to send intake report-ready link', { leadId: lead.id, error })
  }
}

/** Queue the report email for later, so a submission can still supersede it. */
export async function scheduleReportReady(leadId: string): Promise<void> {
  try {
    await prisma.intakeLead.update({
      where: { id: leadId },
      data: { reportReadyDueAt: new Date(Date.now() + REPORT_READY_DELAY_MS) },
    })
  } catch (error) {
    logger.warn('Could not schedule report-ready email', { leadId, error })
  }
}

/**
 * Drop a queued report email because the case was submitted and the receipt
 * carries the report link. Never cancels one that already went out.
 */
export async function cancelReportReadyForAssessment(assessmentId: string): Promise<void> {
  try {
    await prisma.intakeLead.updateMany({
      where: { assessmentId, reportReadySentAt: null },
      data: { reportReadyDueAt: null },
    })
  } catch (error) {
    logger.warn('Could not cancel pending report-ready email', { assessmentId, error })
  }
}

export interface ReportReadySweepResult {
  due: number
  sent: number
  superseded: number
}

/**
 * Send the report email for assessments whose window has passed without a
 * submission. Never throws per lead.
 */
export async function runReportReadySweep(): Promise<ReportReadySweepResult> {
  const now = new Date()
  const due = await prisma.intakeLead.findMany({
    where: {
      reportReadyDueAt: { not: null, lte: now },
      reportReadySentAt: null,
    },
    select: { id: true, email: true, phone: true, assessmentId: true },
    orderBy: { reportReadyDueAt: 'asc' },
    take: BATCH_SIZE,
  })

  let sent = 0
  let superseded = 0

  for (const lead of due) {
    try {
      if (!lead.assessmentId) {
        await prisma.intakeLead.update({
          where: { id: lead.id },
          data: { reportReadyDueAt: null },
        })
        continue
      }

      // A submission in the meantime means the receipt already gave them the
      // report link, so sending this too would be the duplicate pair again.
      const submitted = await prisma.leadSubmission.findUnique({
        where: { assessmentId: lead.assessmentId },
        select: { id: true },
      })
      if (submitted) {
        await prisma.intakeLead.update({
          where: { id: lead.id },
          data: { reportReadyDueAt: null },
        })
        superseded += 1
        continue
      }

      await sendReportReady(lead)
      await prisma.intakeLead.update({
        where: { id: lead.id },
        data: { reportReadyDueAt: null, reportReadySentAt: new Date() },
      })
      sent += 1
    } catch (error) {
      logger.warn('Report-ready sweep failed for lead', { leadId: lead.id, error })
    }
  }

  return { due: due.length, sent, superseded }
}

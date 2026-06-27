import { prisma } from './prisma'
import { logger } from './logger'
import { sendClaimEmail } from './claims'
import { sendSms } from './sms'

// A lead is "abandoned" once it has been idle this long without completing.
const ABANDON_AFTER_MINUTES = 45
// Don't re-engage leads older than this — stale intents aren't worth contacting.
const ABANDON_WINDOW_HOURS = 72
// Cap work per sweep so a backlog can't hammer the email/SMS providers.
const BATCH_SIZE = 100

function webBaseUrl(): string {
  return (process.env.WEB_URL || 'https://www.clearcaseiq.com').replace(/\/$/, '')
}

function resumeUrl(leadId: string): string {
  return `${webBaseUrl()}/assess?lead=${encodeURIComponent(leadId)}`
}

/**
 * Find intake leads that captured contact info but left before finishing, and
 * send a one-time "you left the platform — you may have a valuable settlement"
 * re-engagement email/SMS. The `abandonmentEmailedAt` stamp guarantees each
 * lead is contacted at most once. Never throws per lead.
 */
export async function sweepAbandonedIntakeLeads(): Promise<{ scanned: number; sent: number }> {
  const now = Date.now()
  const idleBefore = new Date(now - ABANDON_AFTER_MINUTES * 60_000)
  const windowStart = new Date(now - ABANDON_WINDOW_HOURS * 60 * 60_000)

  const leads = await prisma.intakeLead.findMany({
    where: {
      status: 'in_progress',
      abandonmentEmailedAt: null,
      updatedAt: { lt: idleBefore, gt: windowStart },
      OR: [{ email: { not: null } }, { phone: { not: null } }],
    },
    orderBy: { updatedAt: 'asc' },
    take: BATCH_SIZE,
  })

  let sent = 0
  for (const lead of leads) {
    const link = resumeUrl(lead.id)
    try {
      if (lead.email) {
        await sendClaimEmail({
          to: lead.email,
          subject: 'You may have a valuable settlement waiting',
          body: `Hi,\n\nWe noticed you left ClearCaseIQ before finishing your case assessment. Based on what you started, you could potentially have a valuable settlement — but we can't complete your evaluation until your assessment is finished.\n\nIt only takes a couple of minutes to pick up right where you left off:\n${link}\n\nIf you'd prefer not to continue, you can safely ignore this email.`,
        })
      }
      if (lead.phone) {
        await sendSms(
          lead.phone,
          `ClearCaseIQ: you left before finishing and may have a valuable settlement. Pick up where you left off: ${link}`
        )
      }
      await prisma.intakeLead.update({
        where: { id: lead.id },
        data: { abandonmentEmailedAt: new Date() },
      })
      sent += 1
    } catch (error) {
      logger.warn('Abandonment re-engagement failed for lead', { leadId: lead.id, error })
    }
  }

  return { scanned: leads.length, sent }
}

export async function runIntakeAbandonmentSweep(): Promise<{ scanned: number; sent: number }> {
  try {
    return await sweepAbandonedIntakeLeads()
  } catch (error) {
    logger.error('Intake abandonment sweep failed', { error })
    throw error
  }
}

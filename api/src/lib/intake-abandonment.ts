import { prisma } from './prisma'
import { logger } from './logger'
import { sendClaimEmail } from './claims'
import { sendSms } from './sms'
import { webUrl } from './app-url'

/**
 * Off unless explicitly enabled.
 *
 * Under California SB 37 (Ch. 645, Stats. 2025, effective 2026-01-01) this
 * message is an "advertisement": Bus. & Prof. Code § 6157(b) now reaches any
 * electronic communication directed at "a limited group of individuals" to
 * encourage them to secure a lawyer's services, which is exactly what a
 * re-engagement email to abandoned intake leads is. Statutory damages run
 * $5,000-$100,000 per unique advertisement (§ 6157.2(c)(2)(A)).
 *
 * The copy below has been stripped of what § 6157.2(a) forbids — it previously
 * promised "a valuable settlement" on a case nobody had evaluated, which is both
 * a quick-settlement claim under (a)(2) and an unsubstantiated one under
 * § 6157.1. It now states only facts: an assessment was started, the answers are
 * saved, here is the link.
 *
 * Two things still block enabling it:
 *
 * 1. § 6157.2(b) requires the advertisement to conspicuously name a responsible
 *    party — a California-licensed lawyer, the law firm, a *certified* lawyer
 *    referral service, or a joint advertiser under § 6155(g) — plus a bona fide
 *    office location. This message goes out before any attorney is matched, so
 *    there is no lawyer to name, and every remaining option depends on settling
 *    what this platform is under § 6155. That question carries its own exposure:
 *    SB 37 added § 6156.5, letting any person sue for a § 6155 violation with no
 *    State Bar complaint step first.
 * 2. The SMS leg is separately a TCPA problem. An unsolicited marketing text
 *    needs prior express written consent and runs $500-$1,500 per message —
 *    per message, unlike the SB 37 figure above.
 *
 * Defaulting to off rather than deleting the sweep keeps the mechanism available
 * once those are resolved.
 */
function isIntakeAbandonmentOutreachEnabled(): boolean {
  return process.env.INTAKE_ABANDONMENT_OUTREACH_ENABLED === 'true'
}

// A lead is "abandoned" once it has been idle this long without completing.
const ABANDON_AFTER_MINUTES = 45
// Don't re-engage leads older than this — stale intents aren't worth contacting.
const ABANDON_WINDOW_HOURS = 72
// Cap work per sweep so a backlog can't hammer the email/SMS providers.
const BATCH_SIZE = 100

function resumeUrl(leadId: string): string {
  return webUrl(`/assess?lead=${encodeURIComponent(leadId)}`)
}

/**
 * Find intake leads that captured contact info but left before finishing, and
 * send a one-time reminder that the assessment is unfinished. The
 * `abandonmentEmailedAt` stamp guarantees each lead is contacted at most once.
 * Never throws per lead.
 */
export async function sweepAbandonedIntakeLeads(): Promise<{ scanned: number; sent: number; skipped?: boolean; reason?: string }> {
  if (!isIntakeAbandonmentOutreachEnabled()) {
    return { scanned: 0, sent: 0, skipped: true, reason: 'Intake abandonment outreach disabled (SB 37 review)' }
  }

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
          subject: 'Finish your ClearCaseIQ case assessment',
          body: `Hi,\n\nYou started a case assessment with ClearCaseIQ and haven't finished it. Your answers are saved.\n\nIf you'd prefer not to continue, you can safely ignore this email.`,
          cta: { label: 'Finish your assessment', url: link },
        })
      }
      if (lead.phone) {
        await sendSms(lead.phone, `ClearCaseIQ: your case assessment is unfinished. Your answers are saved: ${link}`)
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

export async function runIntakeAbandonmentSweep(): Promise<{ scanned: number; sent: number; skipped?: boolean; reason?: string }> {
  try {
    return await sweepAbandonedIntakeLeads()
  } catch (error) {
    logger.error('Intake abandonment sweep failed', { error })
    throw error
  }
}

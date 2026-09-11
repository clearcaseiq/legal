/**
 * Invite the claimant on an attorney-created case to activate their portal.
 *
 * An imported or hand-created case is one-sided. Its owner is the synthetic
 * `guest+<assessmentId>@caseiq.local` shadow user the factory mints, which has
 * no password and no provider, so nobody can sign in as it: the plaintiff
 * dashboard, messaging, document requests and fact confirmations all have no
 * reachable counterparty, and mail addressed to the owner's account would go to
 * a domain that does not exist. The claimant's real address lives in the case
 * facts instead, under `plaintiffContext.email`.
 *
 * The handover itself was already built and is not touched here: registering
 * (or signing in) against `/register?claim=<token>` moves the assessment and
 * its evidence onto the real account, and `adoptGuestCasesByEmail` does the
 * same for anyone who arrives by another door. What was missing was anything
 * that told the claimant to do it, so an attorney had to ask them out of band.
 *
 * Three properties this file exists to hold:
 *
 *   - Never twice. The invite is an unsolicited email to a law firm's client,
 *     and a re-import or a second sync must not mail them again.
 *   - Never to a case that is already someone's. A claim link is pointless once
 *     a real account holds the case, and sending one implies it is unclaimed.
 *   - Never fatal. A mail failure must not roll back or fail an import that has
 *     already committed.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import { webUrl } from './app-url'
import { createClaimToken } from './claim-token'
import { deliverDirectNotification } from './platform-notifications'
import { PLAINTIFF_EVENTS } from './notification-events'
import { isTransferableCaseOwner } from './guest-case-adoption'

/**
 * The claimant's way in.
 *
 * `/register` rather than a bespoke page: it already redeems `?claim=` both for
 * a new signup and for a visitor who turns out to be signed in already, and it
 * lands them on the claimed case afterwards. The token is signed and expires,
 * so a forwarded email stops working, and redemption still runs the ownership
 * rules — it can only ever attach a case nobody has proven is theirs.
 */
export function claimantInviteUrl(assessmentId: string): string {
  return webUrl(`/register?claim=${encodeURIComponent(createClaimToken(assessmentId))}`)
}

export interface ClaimantInvite {
  assessmentId: string
  /** The claimant's real address, as recorded on the case. */
  email: string | null | undefined
  firstName?: string | null
  /** Named as the sender, so the mail reads as coming from their own firm. */
  attorneyName?: string | null
  attorneyEmail?: string | null
  firmName?: string | null
}

/**
 * Why a case got no invite. All three are ordinary outcomes rather than errors,
 * and callers surface the counts so an attorney can tell how many of their
 * clients were actually reached.
 */
export type ClaimantInviteSkipReason =
  | 'no_email'
  | 'already_invited'
  | 'already_claimed'
  | 'account_exists'

export interface ClaimantInviteResult {
  sent: boolean
  skipped: ClaimantInviteSkipReason | null
}

export interface ClaimantInviteBatchResult {
  sent: number
  noEmail: number
  alreadyInvited: number
  alreadyClaimed: number
  accountExists: number
}

/** What the attorney is told when an address already has a login. */
export const ACCOUNT_EXISTS_MESSAGE = 'Email already exists.'

/** Whether this case has been invited before, at any time, by any path. */
async function alreadyInvited(assessmentId: string): Promise<boolean> {
  // The delivery attempt is deliberately not part of the test. A bounced or
  // provider-failed invite still means this person has been mailed once, and
  // re-sending on every subsequent import is the outcome worth avoiding more
  // than a single undelivered invite.
  const existing = await prisma.platformNotificationEvent
    .findFirst({
      where: { assessmentId, eventType: PLAINTIFF_EVENTS.case_invite },
      select: { id: true },
    })
    .catch(() => null)
  return Boolean(existing)
}

function inviteBody(invite: ClaimantInvite): string {
  const greeting = invite.firstName?.trim() || 'there'
  const from = invite.attorneyName?.trim() || invite.firmName?.trim() || 'Your attorney'
  const firmLine = invite.firmName?.trim() && invite.attorneyName?.trim()
    ? `${invite.attorneyName.trim()} at ${invite.firmName.trim()}`
    : from

  return [
    `Hi ${greeting},`,
    '',
    `${firmLine} is using ClearCaseIQ to work your case, and set up a secure portal for you.`,
    '',
    'Activating it lets you:',
    '  • see where your case stands, without having to call and ask',
    '  • upload photos, bills and records straight from your phone',
    '  • send and receive messages and documents with your legal team',
    '',
    // No bare URL here: the CTA renders a button, and both the text and HTML
    // builders already append the link themselves, so repeating it would print
    // the same long URL twice.
    'Use the button below to set a password. Your case is already waiting on the other side of it.',
    '',
    // Said plainly because the alternative is a client wondering whether this is
    // a phishing attempt or a second law firm soliciting them.
    'This does not change who represents you, and it is not a new agreement of any kind. It is only a way to see and send things on the case your firm is already handling.',
    '',
    'ClearCaseIQ',
  ].join('\n')
}

/**
 * Mail one claimant. Never throws.
 */
export async function inviteClaimantToCase(invite: ClaimantInvite): Promise<ClaimantInviteResult> {
  const email = invite.email?.trim().toLowerCase()
  // Nothing to do, and nothing recoverable: with no address on the case there
  // is no one for adoption to match either, so the case stays one-sided until
  // someone edits it. Callers report this count for exactly that reason.
  if (!email) return { sent: false, skipped: 'no_email' }

  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: invite.assessmentId },
      select: { user: { select: { email: true, passwordHash: true, provider: true } }, userId: true },
    })
    if (!assessment) return { sent: false, skipped: 'already_claimed' }
    if (!isTransferableCaseOwner(assessment.userId ? assessment.user : null)) {
      return { sent: false, skipped: 'already_claimed' }
    }

    if (await alreadyInvited(invite.assessmentId)) {
      return { sent: false, skipped: 'already_invited' }
    }

    // An address that already has a login gets no invite. The mail's whole offer
    // is "set a password and your case is waiting", which is the wrong
    // instruction for someone who already has one — they sign in, and adoption
    // attaches the case on the way through.
    const existingAccount = await prisma.user
      .findUnique({ where: { email }, select: { id: true } })
      .catch(() => null)
    if (existingAccount) {
      return { sent: false, skipped: 'account_exists' }
    }

    const url = claimantInviteUrl(invite.assessmentId)
    await deliverDirectNotification({
      type: 'email',
      recipient: email,
      subject: 'Your case portal is ready',
      message: inviteBody(invite),
      role: 'plaintiff',
      assessmentId: invite.assessmentId,
      cta: { label: 'Activate my case portal', url },
      // Replies go to the firm, not to us. The claimant's questions are about
      // their case, and we are not their counsel.
      replyTo: invite.attorneyEmail || null,
      fromName: invite.attorneyName || invite.firmName || null,
      // Carries the event type onto the stored notification event, which is
      // what `alreadyInvited` reads on the next import.
      metadata: { eventType: PLAINTIFF_EVENTS.case_invite, assessmentId: invite.assessmentId },
    })

    logger.info('Invited claimant to activate their case portal', {
      assessmentId: invite.assessmentId,
    })
    return { sent: true, skipped: null }
  } catch (error) {
    // Best-effort by design: the import has already committed, and failing it
    // now would be worse than a client who has not been mailed yet.
    logger.warn('Could not invite claimant to case', {
      assessmentId: invite.assessmentId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { sent: false, skipped: null }
  }
}

/**
 * Mail a whole import's worth of claimants, one at a time.
 *
 * Serial rather than concurrent: a 500-row import would otherwise open 500
 * simultaneous sends, and the provider rate-limits long before that helps.
 */
export async function inviteClaimants(
  invites: ClaimantInvite[]
): Promise<ClaimantInviteBatchResult> {
  const result: ClaimantInviteBatchResult = {
    sent: 0,
    noEmail: 0,
    alreadyInvited: 0,
    alreadyClaimed: 0,
    accountExists: 0,
  }

  for (const invite of invites) {
    const one = await inviteClaimantToCase(invite)
    if (one.sent) result.sent += 1
    else if (one.skipped === 'no_email') result.noEmail += 1
    else if (one.skipped === 'already_invited') result.alreadyInvited += 1
    else if (one.skipped === 'already_claimed') result.alreadyClaimed += 1
    else if (one.skipped === 'account_exists') result.accountExists += 1
  }

  return result
}

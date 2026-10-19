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
  | 'recently_invited'
  | 'invite_limit'
  | 'delivery_failed'

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

function firmLineFor(invite: ClaimantInvite): string {
  const from = invite.attorneyName?.trim() || invite.firmName?.trim() || 'Your attorney'
  return invite.firmName?.trim() && invite.attorneyName?.trim()
    ? `${invite.attorneyName.trim()} at ${invite.firmName.trim()}`
    : from
}

/** For a claimant who already has a login: sign in, and the case joins their account. */
function signInBody(invite: ClaimantInvite): string {
  const greeting = invite.firstName?.trim() || 'there'
  return [
    `Hi ${greeting},`,
    '',
    `${firmLineFor(invite)} is using ClearCaseIQ to work your case, and has added it to the platform.`,
    '',
    'You already have a ClearCaseIQ account. Sign in with the button below and the case will appear on your dashboard, where you can follow its progress, upload documents and message your legal team.',
    '',
    'This does not change who represents you, and it is not a new agreement of any kind.',
    '',
    'ClearCaseIQ',
  ].join('\n')
}

function inviteBody(invite: ClaimantInvite): string {
  const greeting = invite.firstName?.trim() || 'there'
  const firmLine = firmLineFor(invite)

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
 * Attorney-sent invites from an existing case may be re-sent, unlike the
 * automatic one at import, but only so often: each is an email to a law firm's
 * client, and a button that can be clicked repeatedly must not become spam.
 */
export const MANUAL_INVITE_COOLDOWN_MS = 24 * 60 * 60 * 1000
export const MANUAL_INVITE_MAX = 5

export type ClaimantPortalState = 'active' | 'invited' | 'not_invited'

export interface ClaimantPortalStatus {
  state: ClaimantPortalState
  email: string | null
  /** The claimant's address already has a login, so the invite asks them to sign in. */
  hasAccount: boolean
  inviteCount: number
  lastInvitedAt: string | null
  /** When the next invite may be sent; null when it may be sent now or never again. */
  nextInviteAt: string | null
  limitReached: boolean
  /** A link the attorney can pass on themselves, e.g. by text. Null once the portal is active. */
  inviteLink: string | null
}

/** Invites that actually went out; a failed send neither counts nor blocks a retry. */
async function inviteHistory(assessmentId: string): Promise<Date[]> {
  const rows = await prisma.platformNotificationEvent.findMany({
    where: { assessmentId, eventType: PLAINTIFF_EVENTS.case_invite, status: { in: ['sent', 'delivered'] } },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: MANUAL_INVITE_MAX + 1,
  })
  return rows.map((r) => r.createdAt)
}

/** A login that a plaintiff case may be attached to. Firm and staff accounts are not. */
async function clientAccountFor(email: string): Promise<{ exists: boolean; isClient: boolean }> {
  const user = await prisma.user.findUnique({ where: { email }, select: { role: true } }).catch(() => null)
  if (!user) return { exists: false, isClient: false }
  return { exists: true, isClient: (user.role || 'client') === 'client' }
}

function signInUrl(assessmentId: string): string {
  return webUrl(`/login?claim=${encodeURIComponent(createClaimToken(assessmentId))}`)
}

export async function getClaimantPortalStatus(
  assessmentId: string,
  rawEmail: string | null | undefined,
  now = Date.now(),
): Promise<ClaimantPortalStatus | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { userId: true, user: { select: { email: true, passwordHash: true, provider: true } } },
  })
  if (!assessment) return null

  const email = rawEmail?.trim().toLowerCase() || null
  const active = !isTransferableCaseOwner(assessment.userId ? assessment.user : null)
  const history = active ? [] : await inviteHistory(assessmentId)
  const account = email && !active ? await clientAccountFor(email) : { exists: false, isClient: false }
  const last = history[0] ?? null
  const limitReached = history.length >= MANUAL_INVITE_MAX
  const cooldownEnds = last ? last.getTime() + MANUAL_INVITE_COOLDOWN_MS : 0

  return {
    state: active ? 'active' : history.length > 0 ? 'invited' : 'not_invited',
    email,
    hasAccount: account.exists,
    inviteCount: history.length,
    lastInvitedAt: last ? last.toISOString() : null,
    nextInviteAt: !active && !limitReached && cooldownEnds > now ? new Date(cooldownEnds).toISOString() : null,
    limitReached,
    inviteLink: active || (account.exists && !account.isClient)
      ? null
      : account.exists
        ? signInUrl(assessmentId)
        : claimantInviteUrl(assessmentId),
  }
}

/**
 * An attorney inviting the claimant from an open case.
 *
 * Unlike `inviteClaimantToCase` this may repeat (after a cooldown, up to a cap),
 * and a claimant who already has a login is asked to sign in rather than
 * skipped, since signing in through the link attaches the case. Throws on a
 * delivery failure so the attorney is told the mail did not go.
 */
export async function sendClaimantInviteFromCase(
  invite: ClaimantInvite,
  now = Date.now(),
): Promise<ClaimantInviteResult> {
  const email = invite.email?.trim().toLowerCase()
  if (!email) return { sent: false, skipped: 'no_email' }

  const status = await getClaimantPortalStatus(invite.assessmentId, email, now)
  if (!status || status.state === 'active') return { sent: false, skipped: 'already_claimed' }
  if (status.limitReached) return { sent: false, skipped: 'invite_limit' }
  if (status.nextInviteAt) return { sent: false, skipped: 'recently_invited' }
  if (!status.inviteLink) return { sent: false, skipped: 'account_exists' }

  const delivery = await deliverDirectNotification({
    type: 'email',
    recipient: email,
    subject: status.hasAccount ? 'Your case has been added to your ClearCaseIQ account' : 'Your case portal is ready',
    message: status.hasAccount ? signInBody(invite) : inviteBody(invite),
    role: 'plaintiff',
    assessmentId: invite.assessmentId,
    cta: { label: status.hasAccount ? 'Sign in to see my case' : 'Activate my case portal', url: status.inviteLink },
    replyTo: invite.attorneyEmail || null,
    fromName: invite.attorneyName || invite.firmName || null,
    metadata: { eventType: PLAINTIFF_EVENTS.case_invite, assessmentId: invite.assessmentId, manual: true },
  })

  if (!delivery?.delivered) {
    logger.warn('Claimant invite email was not delivered', {
      assessmentId: invite.assessmentId,
      platformEventId: delivery?.platformEventId,
    })
    return { sent: false, skipped: 'delivery_failed' }
  }

  logger.info('Attorney invited claimant to case portal', {
    assessmentId: invite.assessmentId,
    signIn: status.hasAccount,
    inviteNumber: status.inviteCount + 1,
  })
  return { sent: true, skipped: null }
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

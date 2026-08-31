/**
 * Password-reset and password-setup tokens.
 *
 * Extracted from the auth route so the admin "invite a staff member" flow can
 * issue the same kind of token rather than growing a parallel one. A second
 * token scheme would be a second thing to get wrong, and this one is already
 * single-use, expiring, and stored only as a SHA-256 hash.
 */
import crypto from 'crypto'
import { prisma } from './prisma'
import { webUrl } from './app-url'

/** Self-service resets are short-lived: the user is at the keyboard already. */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000

/**
 * Invites get much longer. An admin adding a colleague has no idea when that
 * person next opens their email, and a one-hour invite would usually be dead on
 * arrival — leaving the new account unusable with no obvious way to recover.
 */
export const INVITE_TTL_MS = 72 * 60 * 60 * 1000

export function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

export function passwordResetUrl(rawToken: string): string {
  return webUrl(`/reset-password?token=${encodeURIComponent(rawToken)}`)
}

/**
 * Issue a single-use token and return the raw value for emailing. Any
 * outstanding unused token for this user is invalidated first, so a re-sent
 * invite silently retires the previous link instead of leaving several live.
 */
export async function issuePasswordSetupToken(userId: string, ttlMs: number): Promise<string> {
  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } })
  const rawToken = crypto.randomBytes(32).toString('hex')
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashResetToken(rawToken),
      expiresAt: new Date(Date.now() + ttlMs),
    },
  })
  return rawToken
}

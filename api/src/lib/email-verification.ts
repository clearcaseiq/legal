/**
 * Email-verification tokens.
 *
 * Extracted from the auth route so attorney registration can send the same
 * message plaintiff signup already does, rather than growing a second copy of
 * the token-minting and email-composition logic that would be free to drift.
 */
import crypto from 'crypto'
import { prisma } from './prisma'
import { logger } from './logger'
import { webUrl } from './app-url'
import { sendClaimEmail } from './claims'
import { hashResetToken } from './password-reset'

/**
 * Verification links share the reset-token security model — single-use,
 * expiring, and stored only as a SHA-256 hash — but live far longer, since
 * confirming an address is low-risk and people often act on it a day later.
 */
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000

export function emailVerificationUrl(rawToken: string): string {
  return webUrl(`/verify-email?token=${encodeURIComponent(rawToken)}`)
}

/**
 * Issue a single-use token and return the raw value for emailing. Outstanding
 * unused tokens are retired first, so a re-send silently invalidates the
 * previous link instead of leaving several live at once.
 */
export async function mintEmailVerificationToken(userId: string): Promise<string> {
  await prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } })
  const rawToken = crypto.randomBytes(32).toString('hex')
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashResetToken(rawToken),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    },
  })
  return rawToken
}

export interface EmailVerificationTarget {
  id: string
  email: string
  firstName?: string | null
}

/**
 * Mint a token and email the link. Best-effort: reports whether the message was
 * dispatched and never throws, so a signup path can fire-and-forget without a
 * mail outage turning into a failed registration.
 */
export async function issueEmailVerification(
  user: EmailVerificationTarget,
  options: { welcome?: boolean } = {},
): Promise<boolean> {
  try {
    const rawToken = await mintEmailVerificationToken(user.id)
    const link = emailVerificationUrl(rawToken)
    const intro = options.welcome
      ? 'Welcome to ClearCaseIQ! Please confirm your email address so we can keep your account secure and send you case updates.'
      : 'Please confirm your email address so we can keep your ClearCaseIQ account secure and send you case updates.'
    const body = [
      `Hi ${user.firstName || 'there'},`,
      '',
      `${intro} This link expires in 24 hours and can be used once.`,
      '',
      options.welcome
        ? "If you didn't create this account, you can safely ignore this email."
        : "If you didn't request this, you can safely ignore this email.",
      '',
      '— The ClearCaseIQ team',
    ].join('\n')

    const sent = await sendClaimEmail({
      to: user.email,
      subject: 'Verify your ClearCaseIQ email',
      body,
      cta: { label: 'Verify my email', url: link },
    })
    logger.info('Email verification issued', { userId: user.id, emailSent: sent })
    return sent
  } catch (error) {
    logger.error('Failed to issue email verification', { userId: user.id, error })
    return false
  }
}

/**
 * Helpers for the Yelp-style attorney profile claim flow:
 * token + OTP generation, contact masking, and transactional email delivery
 * (reusing the same Resend config as platform notifications; SMS uses ../lib/sms).
 */
import { randomBytes, randomInt } from 'crypto'
import bcrypt from 'bcryptjs'
import { logger } from './logger'

export const CLAIM_INVITE_TTL_DAYS = 14
export const CLAIM_CODE_TTL_MINUTES = 15
export const CLAIM_MAX_CODE_ATTEMPTS = 5

export function generateClaimToken(): string {
  return randomBytes(24).toString('hex')
}

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10)
}

export async function verifyCode(code: string, codeHash: string | null): Promise<boolean> {
  if (!codeHash) return false
  return bcrypt.compare(code, codeHash)
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null
  const [local, domain] = email.split('@')
  if (!domain) return null
  const head = local.slice(0, 1)
  const tail = local.length > 2 ? local.slice(-1) : ''
  return `${head}${'*'.repeat(Math.max(1, local.length - 2))}${tail}@${domain}`
}

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return null
  return `•••-•••-${digits.slice(-4)}`
}

export function normalizeBarNumber(value: string | null | undefined): string {
  return (value ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase()
}

/** Send a transactional email through Resend (same env as platform notifications). */
export async function sendClaimEmail(params: {
  to: string
  subject: string
  body: string
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from || !params.to) {
    logger.info('Claim email not sent (Resend not configured)', { to: params.to?.slice(0, 3) })
    return false
  }

  const html = String(params.body || '')
    .split('\n')
    .map((line) => `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('')

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [params.to], subject: params.subject, text: params.body, html }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      logger.warn('Claim email failed', { status: res.status, detail: text.slice(0, 200) })
      return false
    }
    return true
  } catch (err) {
    logger.error('Claim email error', { error: err instanceof Error ? err.message : String(err) })
    return false
  }
}

export function claimUrl(token: string): string {
  const webUrl = process.env.WEB_URL || 'https://app.clearcaseiq.com'
  return `${webUrl.replace(/\/$/, '')}/claim/${token}`
}

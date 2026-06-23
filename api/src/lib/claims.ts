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

type EmailParams = { to: string; subject: string; body: string }

/** Convert a plain-text body into simple paragraph HTML, escaping unsafe chars. */
function bodyToHtml(body: string): string {
  return String(body || '')
    .split('\n')
    .map((line) => `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('')
}

/**
 * Resolve which email provider to use:
 * - `EMAIL_PROVIDER=ses|resend` forces a provider.
 * - Otherwise auto-detect: SES when SES_FROM_EMAIL is set, else Resend.
 */
function resolveEmailProvider(): 'ses' | 'resend' | 'none' {
  const explicit = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase()
  if (explicit === 'ses') return 'ses'
  if (explicit === 'resend') return 'resend'
  if (process.env.SES_FROM_EMAIL) return 'ses'
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) return 'resend'
  return 'none'
}

let sesClient: any = null
function getSesClient(): any {
  if (sesClient) return sesClient
  try {
    // Lazy require so the SDK is only loaded when SES is actually used.
    const { SESv2Client } = require('@aws-sdk/client-sesv2')
    // No explicit credentials: the SDK's default chain picks up the EC2
    // instance role (or AWS_* env vars in other environments).
    sesClient = new SESv2Client({ region: process.env.AWS_REGION || 'us-east-1' })
    return sesClient
  } catch {
    return null
  }
}

/** Send a transactional email through Amazon SES v2 (uses the instance IAM role). */
async function sendViaSes(params: EmailParams): Promise<boolean> {
  const from = process.env.SES_FROM_EMAIL
  if (!from) {
    logger.info('Claim email not sent (SES_FROM_EMAIL not set)', { to: params.to?.slice(0, 3) })
    return false
  }
  const client = getSesClient()
  if (!client) {
    logger.warn('Claim email not sent (SES SDK unavailable)')
    return false
  }
  try {
    const { SendEmailCommand } = require('@aws-sdk/client-sesv2')
    await client.send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [params.to] },
        Content: {
          Simple: {
            Subject: { Data: params.subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: params.body, Charset: 'UTF-8' },
              Html: { Data: bodyToHtml(params.body), Charset: 'UTF-8' },
            },
          },
        },
        ...(process.env.SES_CONFIGURATION_SET
          ? { ConfigurationSetName: process.env.SES_CONFIGURATION_SET }
          : {}),
      })
    )
    return true
  } catch (err) {
    logger.warn('Claim email failed (SES)', { error: err instanceof Error ? err.message : String(err) })
    return false
  }
}

/** Send a transactional email through Resend's HTTP API. */
async function sendViaResend(params: EmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    logger.info('Claim email not sent (Resend not configured)', { to: params.to?.slice(0, 3) })
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [params.to], subject: params.subject, text: params.body, html: bodyToHtml(params.body) }),
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

/**
 * Send a transactional email. Routes to Amazon SES or Resend based on
 * EMAIL_PROVIDER / available config. Best-effort: never throws.
 */
export async function sendClaimEmail(params: EmailParams): Promise<boolean> {
  if (!params.to) {
    logger.info('Claim email not sent (no recipient)')
    return false
  }
  const provider = resolveEmailProvider()
  if (provider === 'ses') return sendViaSes(params)
  if (provider === 'resend') return sendViaResend(params)
  logger.info('Claim email not sent (no email provider configured)', { to: params.to.slice(0, 3) })
  return false
}

export function claimUrl(token: string): string {
  const webUrl = process.env.WEB_URL || 'https://app.clearcaseiq.com'
  return `${webUrl.replace(/\/$/, '')}/claim/${token}`
}

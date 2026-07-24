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

type EmailParams = {
  to: string
  subject: string
  body: string
  // Optional sender identity overrides so attorney-originated mail appears to
  // come from the attorney (display name) and replies route back to them, while
  // still being physically sent through the platform provider for deliverability.
  replyTo?: string
  fromName?: string
}

/**
 * Build an RFC 5322 From value. When a display name is supplied it is sanitized
 * (quotes/newlines stripped) and wrapped as `"Name" <email>`.
 */
function formatFromAddress(email: string, fromName?: string): string {
  if (!fromName) return email
  const clean = fromName.replace(/["\r\n<>]/g, '').trim()
  return clean ? `"${clean}" <${email}>` : email
}

/** Convert a plain-text body into simple paragraph HTML, escaping unsafe chars. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function bodyToHtml(body: string): string {
  // Turn bare http(s) URLs into clickable links. We escape first, then match on
  // the escaped text (query separators become `&amp;`, which is still valid
  // inside an href), so reset/verification links are actually clickable in mail
  // clients instead of arriving as plain text.
  const urlRe = /(https?:\/\/[^\s<]+)/g
  const paragraphs = String(body || '')
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return '<div style="height:12px;line-height:12px">&nbsp;</div>'
      const escaped = escapeHtml(line)
      const linked = escaped.replace(
        urlRe,
        (url) => `<a href="${url}" style="color:#2563eb;text-decoration:underline;word-break:break-all">${url}</a>`,
      )
      return `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937">${linked}</p>`
    })
    .join('')
  return wrapBrandedEmail(paragraphs)
}

/**
 * Wrap rendered content in a branded, responsive, email-client-safe shell so all
 * transactional mail looks professional (header wordmark, white card, footer with
 * confidentiality note) instead of bare <p> tags (CP-296, CP-316, CP-366).
 */
function wrapBrandedEmail(contentHtml: string): string {
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:8px 8px 16px;">
              <span style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#1e3a8a;">ClearCase<span style="color:#2563eb;">IQ</span></span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:28px 28px 24px;box-shadow:0 1px 2px rgba(15,23,42,0.04);">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 12px 8px;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#94a3b8;">
                This message was sent by ClearCaseIQ. It may contain confidential information intended only for the recipient. ClearCaseIQ is not a law firm and does not provide legal advice.
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${year} ClearCaseIQ. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
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
        FromEmailAddress: formatFromAddress(from, params.fromName),
        Destination: { ToAddresses: [params.to] },
        ...(params.replyTo ? { ReplyToAddresses: [params.replyTo] } : {}),
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
      body: JSON.stringify({
        from: formatFromAddress(from, params.fromName),
        to: [params.to],
        subject: params.subject,
        text: params.body,
        html: bodyToHtml(params.body),
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
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

/**
 * Generic, provider-aware transactional email sender (SES or Resend, per
 * EMAIL_PROVIDER / available config). Shared so all transactional email —
 * including routing/case notifications — honors the configured provider rather
 * than assuming Resend (#38).
 */
export const sendTransactionalEmail = sendClaimEmail

export function claimUrl(token: string): string {
  const webUrl = process.env.WEB_URL || 'https://app.clearcaseiq.com'
  return `${webUrl.replace(/\/$/, '')}/claim/${token}`
}

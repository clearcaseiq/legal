/**
 * Helpers for the Yelp-style attorney profile claim flow:
 * token + OTP generation, contact masking, and transactional email delivery
 * (reusing the same Resend config as platform notifications; SMS uses ../lib/sms).
 */
import { randomBytes, randomInt } from 'crypto'
import bcrypt from 'bcryptjs'
import { logger } from './logger'
import { webUrl } from './app-url'

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

/**
 * The primary action in an email, rendered as a button.
 *
 * Passed alongside the body rather than marked up inside it. Bodies interpolate
 * user-supplied text (claimant names, case details, attorney-written messages),
 * so a marker the renderer parsed out of the body would let a user get a
 * branded ClearCaseIQ button pointing wherever they chose.
 *
 * The body should not also spell out the destination: the renderer prints it
 * below the button and appends it to the plain-text alternative.
 */
export type EmailCta = {
  /** Button text. Keep it short — Outlook will not wrap it gracefully. */
  label: string
  url: string
}

type EmailParams = {
  to: string
  subject: string
  body: string
  cta?: EmailCta | null
  // Optional sender identity overrides so attorney-originated mail appears to
  // come from the attorney (display name) and replies route back to them, while
  // still being physically sent through the platform provider for deliverability.
  replyTo?: string
  fromName?: string
  /**
   * The address the sender would like the message to come from. Honoured only
   * on the verified sending domain — see `resolveFromAddress`.
   */
  fromEmail?: string
}

/** The bare address from a value that may already be in `Name <addr>` form. */
function bareAddress(value: string): string {
  const match = /<([^<>]+)>/.exec(value)
  return (match ? match[1] : value).trim()
}

/**
 * Who the platform is when nothing more specific is sending.
 *
 * System mail passes no display name, and a deployment configured with a bare
 * address then went out as `<no-reply@clearcaseiq.com>` — an inbox shows that
 * as a raw address with no name beside it, which reads like spam and is the one
 * thing a transactional email cannot afford to look like.
 */
const DEFAULT_SENDER_NAME = process.env.EMAIL_FROM_NAME?.trim() || 'ClearCaseIQ'

/**
 * Build an RFC 5322 From value. The display name is sanitized (quotes/newlines
 * stripped) and wrapped as `"Name" <email>`.
 *
 * There is always a name: a caller's own, or the platform's. A configured
 * sender that already carries one keeps it, and is unwrapped before rewrapping
 * when a caller overrides it — nesting the two produced
 * `"Name" <ClearCaseIQ <noreply@…>>`, which is not a valid address and which
 * SES rejects.
 */
export function formatFromAddress(email: string, fromName?: string): string {
  const clean = (fromName || '').replace(/["\r\n<>]/g, '').trim()
  // Only fall back when the configured value has no name of its own to lose.
  if (!clean) return email.includes('<') ? email : `"${DEFAULT_SENDER_NAME}" <${bareAddress(email)}>`
  return `"${clean}" <${bareAddress(email)}>`
}

/** The domain of an address, whether bare or in `"Name" <addr>` form. */
function domainOf(address: string): string {
  const match = /@([^@\s>]+)/.exec(address)
  return match ? match[1].toLowerCase() : ''
}

/**
 * Decide which address a message may honestly claim to come from.
 *
 * Staff mail went out as the platform's no-reply address with the sender's name
 * on it, so a claimant saw "Sri Reddy <no-reply@clearcaseiq.com>". A staff
 * member's own address is now used instead — but only when it sits on the same
 * domain as the configured sender, because that domain is the one the provider
 * holds a verified identity for and the one SPF and DKIM will align against.
 *
 * An address on any other domain is refused rather than passed through. SES
 * rejects an unverified From outright, so the send would fail and the claimant
 * would get nothing; a provider that does accept it yields mail that fails
 * authentication for the domain it claims, which is how a sending reputation
 * gets destroyed. Those senders keep the platform address and stay reachable
 * through Reply-To, which needs no verification.
 */
export function resolveFromAddress(configured: string, requested?: string | null): string {
  const wanted = (requested || '').trim().toLowerCase()
  if (!wanted) return configured

  const configuredDomain = domainOf(configured)
  const wantedDomain = domainOf(wanted)
  if (!configuredDomain || !wantedDomain || wantedDomain !== configuredDomain) {
    logger.info('Sender address is not on the verified domain; sending as the platform address', {
      requestedDomain: wantedDomain || null,
      configuredDomain: configuredDomain || null,
    })
    return configured
  }

  return wanted
}

/** Convert a plain-text body into simple paragraph HTML, escaping unsafe chars. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Escape for use inside a double-quoted HTML attribute. */
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;')
}

/** Accept only http(s), so a bad caller cannot ship a `javascript:` button. */
function safeHttpUrl(url: string | null | undefined): string | null {
  try {
    const parsed = new URL(String(url || ''))
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Render the call to action as a real button.
 *
 * The padding and background sit on the `<td>`, not the `<a>`: Outlook on
 * Windows renders through Word, which drops both from an inline element, so a
 * CSS-styled link collapses into bare underlined text.
 *
 * The destination is repeated underneath because a button is not always what
 * arrives — corporate filters strip markup, and people move a link to another
 * device by hand.
 */
function ctaToHtml(cta: EmailCta): string {
  const url = safeHttpUrl(cta.url)
  if (!url) return ''
  const href = escapeAttr(url)
  const label = escapeHtml(cta.label || 'Open')
  const font = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 12px;">` +
    `<tr><td align="center" bgcolor="#2563eb" style="border-radius:8px;padding:13px 26px;">` +
    `<a href="${href}" style="display:inline-block;font-family:${font};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a>` +
    `</td></tr></table>` +
    `<p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">Or paste this into your browser:<br />` +
    `<a href="${href}" style="color:#94a3b8;text-decoration:underline;word-break:break-all;">${escapeHtml(url)}</a></p>`
  )
}

/**
 * The plain-text alternative has to carry the action too: some clients show
 * only that part, and link scanners generally read nothing else.
 */
function bodyToText(body: string, cta?: EmailCta | null): string {
  const url = cta ? safeHttpUrl(cta.url) : null
  if (!cta || !url) return body
  return `${body}\n\n${cta.label}: ${url}`
}

function bodyToHtml(body: string, cta?: EmailCta | null): string {
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
  return wrapBrandedEmail(paragraphs + (cta ? ctaToHtml(cta) : ''))
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
export function resolveEmailProvider(): 'ses' | 'resend' | 'none' {
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

  const sender = resolveFromAddress(from, params.fromEmail)

  const attempt = async (fromAddress: string): Promise<void> => {
    const { SendEmailCommand } = require('@aws-sdk/client-sesv2')
    await client.send(
      new SendEmailCommand({
        FromEmailAddress: formatFromAddress(fromAddress, params.fromName),
        Destination: { ToAddresses: [params.to] },
        ...(params.replyTo ? { ReplyToAddresses: [params.replyTo] } : {}),
        Content: {
          Simple: {
            Subject: { Data: params.subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: bodyToText(params.body, params.cta), Charset: 'UTF-8' },
              Html: { Data: bodyToHtml(params.body, params.cta), Charset: 'UTF-8' },
            },
          },
        },
        ...(process.env.SES_CONFIGURATION_SET
          ? { ConfigurationSetName: process.env.SES_CONFIGURATION_SET }
          : {}),
      })
    )
  }

  try {
    await attempt(sender)
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    // Sending as a staff member requires SES to hold a verified identity for the
    // whole domain. If it only holds the platform address, SES refuses — and a
    // claimant waiting on a document request would receive nothing at all.
    // Losing the message is far worse than showing the no-reply address, so the
    // platform address gets one retry.
    if (sender !== from) {
      logger.warn('SES refused the staff sender address; retrying as the platform address', {
        error: message,
      })
      try {
        await attempt(from)
        return true
      } catch (retryErr) {
        logger.warn('Claim email failed (SES)', {
          error: retryErr instanceof Error ? retryErr.message : String(retryErr),
        })
        return false
      }
    }

    logger.warn('Claim email failed (SES)', { error: message })
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
  const sender = resolveFromAddress(from, params.fromEmail)

  const attempt = (fromAddress: string) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: formatFromAddress(fromAddress, params.fromName),
        to: [params.to],
        subject: params.subject,
        text: bodyToText(params.body, params.cta),
        html: bodyToHtml(params.body, params.cta),
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
    })

  try {
    let res = await attempt(sender)

    // Same reasoning as the SES path: an unverified staff sender must cost the
    // no-reply display, not the message.
    if (!res.ok && sender !== from) {
      const text = await res.text().catch(() => '')
      logger.warn('Resend refused the staff sender address; retrying as the platform address', {
        status: res.status,
        detail: text.slice(0, 200),
      })
      res = await attempt(from)
    }

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
  // A rejected CTA is not cosmetic. Bodies that carry a button no longer spell
  // the destination out in the text, so dropping it silently sends a mail with
  // nothing to act on — and the recipient is the only one who would notice.
  if (params.cta && !safeHttpUrl(params.cta.url)) {
    logger.error('Email CTA dropped: not an http(s) URL', {
      subject: params.subject,
      label: params.cta.label,
    })
  }
  const provider = resolveEmailProvider()
  if (provider === 'ses') return sendViaSes(params)
  if (provider === 'resend') return sendViaResend(params)
  // Logged at error, not info: reaching here means something asked for a
  // password reset or a document request and the user will never receive it.
  // `checkEmailProviderConfig` should have stopped the process at boot, so this
  // is a backstop for a provider that was configured and later removed.
  logger.error('Email dropped: no email provider is configured', {
    to: params.to.slice(0, 3),
    subject: params.subject,
  })
  return false
}

/**
 * Refuse to start production with no way to send mail.
 *
 * `resolveEmailProvider` returning 'none' is invisible at runtime — every send
 * returns false, and the call sites are all best-effort, so a deployment with no
 * SES or Resend credentials looks completely healthy while no user can reset a
 * password, verify an address, or receive a document request. Partial config is
 * the common way in: setting RESEND_API_KEY but not RESEND_FROM_EMAIL resolves
 * to 'none' with nothing to indicate it.
 */
export function checkEmailProviderConfig(): void {
  if (resolveEmailProvider() !== 'none') return

  const message =
    'No email provider is configured. Set EMAIL_PROVIDER=ses with SES_FROM_EMAIL, or RESEND_API_KEY together with RESEND_FROM_EMAIL. Without one, password resets, email verification, attorney claim invitations and document requests are all accepted and silently never delivered.'
  if (process.env.NODE_ENV === 'production') throw new Error(message)
  logger.warn(message)
}

/**
 * Generic, provider-aware transactional email sender (SES or Resend, per
 * EMAIL_PROVIDER / available config). Shared so all transactional email —
 * including routing/case notifications — honors the configured provider rather
 * than assuming Resend (#38).
 */
export const sendTransactionalEmail = sendClaimEmail

export function claimUrl(token: string): string {
  return webUrl(`/claim/${token}`)
}

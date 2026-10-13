/**
 * Cloudflare Turnstile, checked on the two unauthenticated steps that make us
 * send an email or a text: creating an intake lead (the resume link) and
 * requesting the case-submit code.
 *
 * Both are reachable by anyone with a browser, and each one spends money and
 * lands a message on whatever number or address was typed. The per-IP rate
 * limit bounds a single source; it does nothing about a script that rotates
 * addresses, which is what paid-traffic bots do.
 *
 * Switched on by setting both keys. The site key is served to the browser from
 * `GET /v1/intake-leads/captcha-config`, the way the Stripe publishable key is,
 * so enforcement and the widget can never disagree: a secret with no site key
 * would reject every request from a page that had no way to produce a token.
 */
import { logger } from './logger'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** Long enough for a slow round trip, short enough that a claimant never waits on it. */
const VERIFY_TIMEOUT_MS = 5_000

export type TurnstileResult = {
  ok: boolean
  /**
   * 'passed' — Cloudflare accepted the token.
   * 'disabled' — keys not set; nothing was checked.
   * 'unavailable' — Cloudflare could not be reached; let through without a check.
   * 'failed' — missing, expired, reused or forged token.
   */
  outcome: 'passed' | 'disabled' | 'unavailable' | 'failed'
  errorCodes?: string[]
}

function env(name: string): string {
  return (process.env[name] || '').trim()
}

export function turnstileSiteKey(): string | null {
  return env('TURNSTILE_SITE_KEY') || null
}

export function isTurnstileEnabled(): boolean {
  return Boolean(env('TURNSTILE_SECRET_KEY') && env('TURNSTILE_SITE_KEY'))
}

let loggedDisabled = false

/**
 * Check a Turnstile token. Never throws.
 *
 * Fails open in two cases, deliberately. With no keys (local development,
 * tests, any environment not yet set up) there is nothing to check against.
 * And when Cloudflare itself is unreachable, refusing would turn their outage
 * into ours and block real claimants mid-intake; the OTP before submission is
 * still there behind it. Both are logged so a long run of either is visible.
 */
export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<TurnstileResult> {
  if (!isTurnstileEnabled()) {
    if (!loggedDisabled) {
      loggedDisabled = true
      logger.info('Turnstile not configured; captcha checks are skipped', {
        hasSecret: Boolean(env('TURNSTILE_SECRET_KEY')),
        hasSiteKey: Boolean(env('TURNSTILE_SITE_KEY')),
      })
    }
    return { ok: true, outcome: 'disabled' }
  }

  const response = (token || '').trim()
  // Cloudflare caps tokens at 2048 characters; anything longer is not one.
  if (!response || response.length > 2048) {
    return { ok: false, outcome: 'failed', errorCodes: ['missing-input-response'] }
  }

  const body = new URLSearchParams({ secret: env('TURNSTILE_SECRET_KEY'), response })
  if (ip) body.set('remoteip', ip)

  let result: { success?: boolean; 'error-codes'?: string[] }
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`siteverify returned ${res.status}`)
    result = (await res.json()) as typeof result
  } catch (error) {
    logger.warn('Turnstile siteverify unreachable; allowing request without a captcha check', {
      error: error instanceof Error ? error.message : String(error),
    })
    return { ok: true, outcome: 'unavailable' }
  }

  if (result.success) return { ok: true, outcome: 'passed' }

  const errorCodes = Array.isArray(result['error-codes']) ? result['error-codes'] : []
  // A rejected secret is our misconfiguration, not a bot, and would otherwise
  // read in the logs as a wave of failed captchas.
  if (errorCodes.includes('invalid-input-secret') || errorCodes.includes('missing-input-secret')) {
    logger.error('Turnstile rejected the configured secret key', { errorCodes })
  }
  return { ok: false, outcome: 'failed', errorCodes }
}

/** Exported for tests, which toggle the keys between cases. */
export function resetTurnstileLogState(): void {
  loggedDisabled = false
}

/** The token the browser sends, from the JSON body. */
export function captchaTokenFrom(body: unknown): string | null {
  const token = body && typeof body === 'object' ? (body as Record<string, unknown>).captchaToken : null
  return typeof token === 'string' ? token : null
}

export const CAPTCHA_FAILED_RESPONSE = {
  error: 'We could not confirm this request came from a person. Please refresh the page and try again.',
  code: 'captcha_failed',
} as const

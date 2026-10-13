/**
 * The Turnstile check in front of the two endpoints that make us send an email
 * or a text. It has to fail open where failing closed would hurt real claimants
 * (no keys yet, Cloudflare down) and fail closed everywhere else.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isTurnstileEnabled, resetTurnstileLogState, verifyTurnstile } from './turnstile'

const fetchMock = vi.fn()

function siteverifyReturns(body: Record<string, unknown>, status = 200) {
  fetchMock.mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body })
}

beforeEach(() => {
  resetTurnstileLogState()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  process.env.TURNSTILE_SITE_KEY = 'site-key'
  process.env.TURNSTILE_SECRET_KEY = 'secret-key'
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.TURNSTILE_SITE_KEY
  delete process.env.TURNSTILE_SECRET_KEY
})

describe('when Turnstile is not configured', () => {
  it('lets the request through without calling Cloudflare', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    delete process.env.TURNSTILE_SITE_KEY

    await expect(verifyTurnstile(undefined, '203.0.113.9')).resolves.toEqual({ ok: true, outcome: 'disabled' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  /**
   * A secret with no site key would reject every request from a page that has
   * no way to render the widget, so it counts as not configured.
   */
  it('treats a secret without a site key as off', async () => {
    delete process.env.TURNSTILE_SITE_KEY

    expect(isTurnstileEnabled()).toBe(false)
    await expect(verifyTurnstile(undefined)).resolves.toMatchObject({ ok: true, outcome: 'disabled' })
  })
})

describe('when Turnstile is configured', () => {
  it('rejects a missing token without calling Cloudflare', async () => {
    const result = await verifyTurnstile('', '203.0.113.9')

    expect(result).toMatchObject({ ok: false, outcome: 'failed' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a token Cloudflare says is invalid', async () => {
    siteverifyReturns({ success: false, 'error-codes': ['invalid-input-response'] })

    const result = await verifyTurnstile('forged-token', '203.0.113.9')

    expect(result).toEqual({ ok: false, outcome: 'failed', errorCodes: ['invalid-input-response'] })
  })

  it('accepts a token Cloudflare verifies, sending the secret, token and client IP', async () => {
    siteverifyReturns({ success: true })

    const result = await verifyTurnstile('good-token', '203.0.113.9')

    expect(result).toEqual({ ok: true, outcome: 'passed' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    const body = init.body as URLSearchParams
    expect(body.get('secret')).toBe('secret-key')
    expect(body.get('response')).toBe('good-token')
    expect(body.get('remoteip')).toBe('203.0.113.9')
  })

  /** Their outage must not become ours; the OTP before submission still stands behind it. */
  it('lets the request through when Cloudflare is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'))

    await expect(verifyTurnstile('good-token')).resolves.toEqual({ ok: true, outcome: 'unavailable' })
  })

  it('lets the request through when Cloudflare answers with a server error', async () => {
    siteverifyReturns({}, 503)

    await expect(verifyTurnstile('good-token')).resolves.toEqual({ ok: true, outcome: 'unavailable' })
  })
})

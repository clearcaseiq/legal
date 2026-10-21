import crypto from 'crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ENV } from '../env'
import { callMinutes } from './video-meetings'
import { signZoomSdkJoin, verifyZoomWebhookSignature, zoomUrlValidationResponse } from './zoom'

const env = ENV as Record<string, unknown>
const SECRET = 'webhook-secret'

function sign(body: string, timestamp: string) {
  return `v0=${crypto.createHmac('sha256', SECRET).update(`v0:${timestamp}:${body}`).digest('hex')}`
}

describe('callMinutes', () => {
  it('rounds a call up to whole minutes', () => {
    expect(callMinutes('2026-10-21T17:00:00Z', '2026-10-21T17:22:10Z')).toBe(23)
  })

  it('counts a call under a minute as one minute', () => {
    expect(callMinutes('2026-10-21T17:00:00Z', '2026-10-21T17:00:20Z')).toBe(1)
  })

  it('returns null for missing or backwards times', () => {
    expect(callMinutes(undefined, '2026-10-21T17:00:00Z')).toBeNull()
    expect(callMinutes('2026-10-21T17:10:00Z', '2026-10-21T17:00:00Z')).toBeNull()
    expect(callMinutes('not a date', '2026-10-21T17:00:00Z')).toBeNull()
  })
})

describe('Zoom webhook signature', () => {
  const body = JSON.stringify({ event: 'meeting.ended', payload: { object: { id: 123 } } })
  const now = Date.parse('2026-10-21T17:00:00Z')
  const timestamp = String(Math.floor(now / 1000))

  beforeEach(() => {
    env.ZOOM_WEBHOOK_SECRET_TOKEN = SECRET
  })
  afterEach(() => {
    delete env.ZOOM_WEBHOOK_SECRET_TOKEN
  })

  it('accepts a request Zoom signed', () => {
    expect(verifyZoomWebhookSignature({ rawBody: body, signature: sign(body, timestamp), timestamp, nowMs: now })).toBe(true)
  })

  it('rejects a tampered body', () => {
    const signature = sign(body, timestamp)
    expect(verifyZoomWebhookSignature({ rawBody: `${body} `, signature, timestamp, nowMs: now })).toBe(false)
  })

  it('rejects a replayed request older than five minutes', () => {
    const signature = sign(body, timestamp)
    expect(verifyZoomWebhookSignature({ rawBody: body, signature, timestamp, nowMs: now + 6 * 60_000 })).toBe(false)
  })

  it('rejects everything when no secret is configured', () => {
    delete env.ZOOM_WEBHOOK_SECRET_TOKEN
    expect(verifyZoomWebhookSignature({ rawBody: body, signature: sign(body, timestamp), timestamp, nowMs: now })).toBe(false)
  })

  it('answers the URL validation challenge with an HMAC of the token', () => {
    const expected = crypto.createHmac('sha256', SECRET).update('abc').digest('hex')
    expect(zoomUrlValidationResponse('abc')).toEqual({ plainToken: 'abc', encryptedToken: expected })
  })
})

describe('Meeting SDK join signature', () => {
  beforeEach(() => {
    env.ZOOM_SDK_KEY = 'sdk-key'
    env.ZOOM_SDK_SECRET = 'sdk-secret'
  })
  afterEach(() => {
    delete env.ZOOM_SDK_KEY
    delete env.ZOOM_SDK_SECRET
  })

  it('signs the meeting number, role and appKey with the SDK secret', () => {
    const { signature, sdkKey } = signZoomSdkJoin('987654321', 0)
    expect(sdkKey).toBe('sdk-key')
    const [, payload] = signature.split('.')
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    expect(claims).toMatchObject({ appKey: 'sdk-key', mn: '987654321', role: 0 })
    expect(claims.exp - claims.iat).toBe(2 * 60 * 60)
  })
})

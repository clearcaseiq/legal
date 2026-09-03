/**
 * The opt-out has to bite at `sendSms`, not in the notification layer.
 *
 * Six of the eight outbound call sites reach `sendSms` directly and never touch
 * `platform-notifications` — including all three claimant-facing sends, which
 * are the ones a STOP is actually about. A check anywhere else would look
 * correct and cover the wrong half of the traffic.
 *
 * `sendSms` returns `false` for a suppressed send and for a failed one, because
 * all sends here are best-effort and never throw. So these tests distinguish the
 * two at the log line rather than the return value: a suppressed message stops
 * before the provider is even resolved, while an allowed one reaches provider
 * resolution and reports there is none configured. Observing the provider
 * directly is not an option — `sms.ts` loads both SDKs with `require()`, which
 * does not route through the mock registry.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

// Hoisted: `vi.mock` factories are lifted above ordinary declarations.
const log = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }))

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./logger', () => ({ logger: log }))
vi.mock('./offer-reference', () => ({ offerReplyInstruction: () => 'Reply ACCEPT' }))
vi.mock('./matching-rules-config', () => ({
  getCurrentAttorneyResponseDeadlineMinutes: vi.fn().mockResolvedValue(60),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { sendSms } from './sms'

const prismaMock = prisma as any

/** True when the send stopped at the opt-out gate. */
const wasSuppressed = () =>
  log.info.mock.calls.some(([message]) => String(message).includes('SMS suppressed'))

/** True when the send got past the gate and went looking for a provider. */
const reachedProvider = () =>
  log.warn.mock.calls.some(([message]) => String(message).includes('no SMS provider is configured'))

beforeEach(() => {
  resetUniversalPrismaMock()
  log.info.mockClear()
  log.warn.mockClear()
  // No provider: every send that gets past the gate lands on the same
  // recognisable log line.
  delete process.env.SMS_PROVIDER
  delete process.env.TWILIO_ACCOUNT_SID
  delete process.env.TWILIO_AUTH_TOKEN
  delete process.env.TWILIO_PHONE_NUMBER
})

describe('sendSms opt-out suppression', () => {
  it('stops before the provider for a number whose opt-out stands', async () => {
    prismaMock.smsOptOut.findUnique.mockResolvedValue({ optedInAt: null })

    expect(await sendSms('+14155550100', 'Your case report is ready')).toBe(false)
    expect(wasSuppressed()).toBe(true)
    expect(reachedProvider()).toBe(false)
  })

  it('lets a number that never opted out through the gate', async () => {
    prismaMock.smsOptOut.findUnique.mockResolvedValue(null)

    await sendSms('+14155550100', 'Your case report is ready')

    expect(wasSuppressed()).toBe(false)
    expect(reachedProvider()).toBe(true)
  })

  it('lets a number that texted START after opting out through the gate', async () => {
    prismaMock.smsOptOut.findUnique.mockResolvedValue({ optedInAt: new Date() })

    await sendSms('+14155550100', 'Your case report is ready')

    expect(wasSuppressed()).toBe(false)
    expect(reachedProvider()).toBe(true)
  })

  it('checks the number in whatever format the caller happens to hold it', async () => {
    // `IntakeLead.phone` is stored raw as captured, so the claimant-facing
    // sends pass formatted values here. If the key did not agree with the one
    // the inbound path wrote, the opt-out would silently never match.
    prismaMock.smsOptOut.findUnique.mockResolvedValue({ optedInAt: null })

    await sendSms('(415) 555-0100', 'Your assessment is unfinished')

    expect(prismaMock.smsOptOut.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { phone: '+14155550100' } }),
    )
    expect(wasSuppressed()).toBe(true)
  })

  it('still delivers the confirmation that acknowledges the opt-out itself', async () => {
    // Carriers expect one final message confirming the STOP. Without the
    // bypass, honouring the request would look identical to a dead number.
    prismaMock.smsOptOut.findUnique.mockResolvedValue({ optedInAt: null })

    await sendSms('+14155550100', 'You are unsubscribed', { ignoreOptOut: true })

    expect(wasSuppressed()).toBe(false)
    expect(reachedProvider()).toBe(true)
  })

  it('does not query the opt-out table when the bypass is set', async () => {
    await sendSms('+14155550100', 'You are unsubscribed', { ignoreOptOut: true })
    expect(prismaMock.smsOptOut.findUnique).not.toHaveBeenCalled()
  })
})

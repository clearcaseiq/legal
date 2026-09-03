import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

// The signature check is exercised against the real implementation in
// sns-webhook.verification.test.ts. Here it is stubbed to pass so the handler's
// behaviour *after* authentication is what gets tested.
vi.mock('./lib/sms-webhook-verification', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/sms-webhook-verification')>()),
  verifySnsSignature: vi.fn(async () => ({ ok: true as const })),
}))

vi.mock('./lib/sms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/sms')>()),
  sendSms: vi.fn(async () => true),
}))

vi.mock('./lib/sms-inbound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/sms-inbound')>()),
  processInboundSmsDecision: vi.fn(),
}))

import { buildApp } from './build-app'
import { sendSms } from './lib/sms'
import { processInboundSmsDecision } from './lib/sms-inbound'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

function notification(message: Record<string, unknown>) {
  return JSON.stringify({
    Type: 'Notification',
    MessageId: 'msg-1',
    TopicArn: 'arn:aws:sns:us-east-1:302524629649:inbound-sms',
    Message: JSON.stringify(message),
    Timestamp: new Date().toISOString(),
    SignatureVersion: '1',
    Signature: 'ZmFrZS1zaWduYXR1cmU=',
    SigningCertURL: 'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-abc123.pem',
  })
}

/**
 * Twilio answers the attorney just by returning TwiML from the handler, but SNS
 * throws the response body away. The outcome message therefore has to be sent
 * back explicitly, and when it was not, replying ACCEPT over SNS produced no
 * answer of any kind — a claimed case and a lost race looked the same as a text
 * that never arrived.
 */
describe('POST /v1/sms/sns/inbound — replying to the attorney', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(sendSms).mockClear()
    vi.mocked(processInboundSmsDecision).mockReset()
  })

  it('texts the outcome back to the number that replied', async () => {
    vi.mocked(processInboundSmsDecision).mockResolvedValue({
      processingStatus: 'processed',
      responseCode: 200,
      responseMessage: 'You have accepted this case. View details in CaseIQ.',
      decision: 'ACCEPTED',
    })

    const res = await request(app)
      .post('/v1/sms/sns/inbound')
      .type('text/plain')
      .send(notification({ originationNumber: '+15551234567', messageBody: 'ACCEPT' }))

    expect(res.status).toBe(200)
    // A decision reply is an ordinary message, so the opt-out applies to it.
    expect(sendSms).toHaveBeenCalledWith(
      '+15551234567',
      'You have accepted this case. View details in CaseIQ.',
      { ignoreOptOut: false },
    )
  })

  it('explains a refusal rather than leaving the attorney guessing', async () => {
    vi.mocked(processInboundSmsDecision).mockResolvedValue({
      processingStatus: 'ignored',
      responseCode: 200,
      responseMessage: 'This case has already been assigned to another attorney. View details in CaseIQ.',
    })

    await request(app)
      .post('/v1/sms/sns/inbound')
      .type('text/plain')
      .send(notification({ originationNumber: '+15551234567', messageBody: 'ACCEPT' }))

    expect(sendSms).toHaveBeenCalledWith(
      '+15551234567',
      'This case has already been assigned to another attorney. View details in CaseIQ.',
      { ignoreOptOut: false },
    )
  })

  it('delivers the opt-out confirmation despite the opt-out it just recorded', async () => {
    // Carriers expect one final message acknowledging a STOP. Since the SNS
    // path replies by placing a fresh outbound send, without the bypass the
    // suppression would swallow its own confirmation and honouring the request
    // would look exactly like a dead number.
    vi.mocked(processInboundSmsDecision).mockResolvedValue({
      processingStatus: 'processed',
      optOutKeyword: 'stop',
      responseCode: 200,
      responseMessage: 'ClearCaseIQ: You are unsubscribed and will not receive further texts from us.',
    })

    await request(app)
      .post('/v1/sms/sns/inbound')
      .type('text/plain')
      .send(notification({ originationNumber: '+15551234567', messageBody: 'STOP' }))

    expect(sendSms).toHaveBeenCalledWith(
      '+15551234567',
      expect.stringContaining('unsubscribed'),
      { ignoreOptOut: true },
    )
  })

  it('stays quiet on a redelivery so SNS retries do not text twice', async () => {
    vi.mocked(processInboundSmsDecision).mockResolvedValue({
      processingStatus: 'ignored',
      duplicate: true,
      responseCode: 200,
      responseMessage: 'This SMS reply was already processed. View details in CaseIQ.',
    })

    await request(app)
      .post('/v1/sms/sns/inbound')
      .type('text/plain')
      .send(notification({ originationNumber: '+15551234567', messageBody: 'ACCEPT' }))

    expect(sendSms).not.toHaveBeenCalled()
  })

  it('acknowledges to SNS even when the reply cannot be delivered', async () => {
    vi.mocked(processInboundSmsDecision).mockResolvedValue({
      processingStatus: 'processed',
      responseCode: 200,
      responseMessage: 'You have accepted this case. View details in CaseIQ.',
    })
    vi.mocked(sendSms).mockRejectedValueOnce(new Error('SNS publish failed'))

    const res = await request(app)
      .post('/v1/sms/sns/inbound')
      .type('text/plain')
      .send(notification({ originationNumber: '+15551234567', messageBody: 'ACCEPT' }))

    // A non-200 would make SNS redeliver and re-run the decision.
    expect(res.status).toBe(200)
  })
})

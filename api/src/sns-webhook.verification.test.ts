import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { verifySnsSignature, __clearSigningCertCache } from './lib/sms-webhook-verification'

function notification(overrides: Record<string, unknown> = {}) {
  return {
    Type: 'Notification',
    MessageId: 'msg-1',
    TopicArn: 'arn:aws:sns:us-east-1:302524629649:inbound-sms',
    Message: JSON.stringify({ originationNumber: '+15551234567', messageBody: 'ACCEPT' }),
    Timestamp: new Date().toISOString(),
    SignatureVersion: '1',
    Signature: 'ZmFrZS1zaWduYXR1cmU=',
    SigningCertURL: 'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-abc123.pem',
    ...overrides,
  }
}

/**
 * The signing certificate URL arrives inside the very message being
 * authenticated, so an attacker controls it. If we fetched whatever it named,
 * they could sign a forged "ACCEPT" with their own key and point us at their own
 * certificate — the check would pass and they would take an attorney's case.
 * Pinning the host to SNS is what makes the signature meaningful.
 */
describe('verifySnsSignature', () => {
  beforeEach(() => {
    __clearSigningCertCache()
  })

  it('refuses a signing certificate hosted somewhere other than SNS', async () => {
    const result = await verifySnsSignature(
      notification({ SigningCertURL: 'https://attacker.example.com/cert.pem' }) as any,
    )
    expect(result.ok).toBe(false)
    expect((result as any).reason).toMatch(/not an SNS endpoint/i)
  })

  it('refuses a lookalike host that merely contains the SNS domain', async () => {
    const result = await verifySnsSignature(
      notification({ SigningCertURL: 'https://sns.us-east-1.amazonaws.com.attacker.example/cert.pem' }) as any,
    )
    expect(result.ok).toBe(false)
    expect((result as any).reason).toMatch(/not an SNS endpoint/i)
  })

  it('refuses a plaintext certificate URL', async () => {
    const result = await verifySnsSignature(
      notification({ SigningCertURL: 'http://sns.us-east-1.amazonaws.com/cert.pem' }) as any,
    )
    expect(result.ok).toBe(false)
    expect((result as any).reason).toMatch(/not https/i)
  })

  it('refuses a message with no signature', async () => {
    const result = await verifySnsSignature(notification({ Signature: undefined }) as any)
    expect(result.ok).toBe(false)
    expect((result as any).reason).toMatch(/missing Signature/i)
  })

  it('refuses a replayed message outside the freshness window', async () => {
    const stale = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    const result = await verifySnsSignature(notification({ Timestamp: stale }) as any)
    expect(result.ok).toBe(false)
    expect((result as any).reason).toMatch(/timestamp/i)
  })

  it('refuses an unrecognized signature version rather than guessing', async () => {
    const result = await verifySnsSignature(notification({ SignatureVersion: '99' }) as any)
    expect(result.ok).toBe(false)
    expect((result as any).reason).toMatch(/SignatureVersion/i)
  })

  it('refuses an unknown message type', async () => {
    const result = await verifySnsSignature(notification({ Type: 'SomethingElse' }) as any)
    expect(result.ok).toBe(false)
    expect((result as any).reason).toMatch(/unsupported message type/i)
  })
})

describe('POST /v1/sms/sns/inbound', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('rejects an unverifiable envelope without touching the attorney or the case', async () => {
    const res = await request(app)
      .post('/v1/sms/sns/inbound')
      .type('text/plain')
      .send(JSON.stringify(notification({ SigningCertURL: 'https://attacker.example.com/cert.pem' })))

    expect(res.status).toBe(403)
    expect(prisma.attorney.findFirst).not.toHaveBeenCalled()
    expect(prisma.introduction.updateMany).not.toHaveBeenCalled()
  })

  it('does not call back an unverified SubscribeURL', async () => {
    const res = await request(app)
      .post('/v1/sms/sns/inbound')
      .type('text/plain')
      .send(
        JSON.stringify({
          Type: 'SubscriptionConfirmation',
          MessageId: 'sub-1',
          Token: 'tok',
          TopicArn: 'arn:aws:sns:us-east-1:302524629649:inbound-sms',
          Message: 'confirm me',
          SubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription',
          Timestamp: new Date().toISOString(),
          SignatureVersion: '1',
          Signature: 'ZmFrZQ==',
          SigningCertURL: 'https://attacker.example.com/cert.pem',
        }),
      )

    expect(res.status).toBe(403)
  })
})

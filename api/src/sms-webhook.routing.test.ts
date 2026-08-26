import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import crypto from 'crypto'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

const AUTH_TOKEN = 'test-twilio-auth-token'
// Pinning the URL keeps the signature deterministic; supertest binds an
// ephemeral port, so the URL the request actually arrives on varies per run.
const WEBHOOK_URL = 'https://api.test.local/v1/sms/webhook'

const originalToken = process.env.TWILIO_AUTH_TOKEN
const originalUrl = process.env.TWILIO_WEBHOOK_URL

process.env.TWILIO_AUTH_TOKEN = AUTH_TOKEN
process.env.TWILIO_WEBHOOK_URL = WEBHOOK_URL

afterAll(() => {
  if (originalToken === undefined) delete process.env.TWILIO_AUTH_TOKEN
  else process.env.TWILIO_AUTH_TOKEN = originalToken
  if (originalUrl === undefined) delete process.env.TWILIO_WEBHOOK_URL
  else process.env.TWILIO_WEBHOOK_URL = originalUrl
})

function twilioSignature(params: Record<string, string>, token = AUTH_TOKEN): string {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], WEBHOOK_URL)
  return crypto.createHmac('sha1', token).update(Buffer.from(payload, 'utf8')).digest('base64')
}

function postSigned(app: any, params: Record<string, string>) {
  return request(app)
    .post('/v1/sms/webhook')
    .type('form')
    .set('X-Twilio-Signature', twilioSignature(params))
    .send(params)
}

describe('POST /v1/sms/webhook routing replies', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('ACCEPT updates introduction and returns TwiML', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-sms-1', phone: '+15551234567' } as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      id: 'intro-sms-1',
      assessmentId: 'asm-sms',
      attorneyId: 'att-sms-1',
      status: 'PENDING',
    } as any)
    vi.mocked(prisma.introduction.updateMany).mockResolvedValue({ count: 1 } as any)

    const res = await postSigned(app, { MessageSid: 'SM-accept-1', From: '+1 (555) 123-4567', Body: 'ACCEPT' })

    expect(res.status).toBe(200)
    expect(res.text).toContain('Response')
    expect(prisma.smsWebhookReceipt.create).toHaveBeenCalled()
    expect(prisma.introduction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACCEPTED' }),
      })
    )
  })

  it('DECLINE updates introduction to DECLINED', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-sms-2', phone: '+15559876543' } as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      id: 'intro-sms-2',
      assessmentId: 'asm-sms-2',
      attorneyId: 'att-sms-2',
      status: 'PENDING',
    } as any)
    vi.mocked(prisma.introduction.updateMany).mockResolvedValue({ count: 1 } as any)

    const res = await postSigned(app, { MessageSid: 'SM-decline-1', From: '+15559876543', Body: 'decline' })

    expect(res.status).toBe(200)
    expect(prisma.introduction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DECLINED' }),
      })
    )
  })

  it('ACCEPT assigns the lead exclusively to the responding attorney', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-sms-3', phone: '+15551112222' } as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      id: 'intro-sms-3',
      assessmentId: 'asm-sms-3',
      attorneyId: 'att-sms-3',
      status: 'PENDING',
    } as any)
    vi.mocked(prisma.introduction.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-sms-3',
      assignmentType: 'shared',
    } as any)

    const res = await postSigned(app, { MessageSid: 'SM-accept-3', From: '+1 555 111 2222', Body: 'YES' })

    expect(res.status).toBe(200)
    expect(prisma.leadSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lead-sms-3' },
        data: expect.objectContaining({
          status: 'contacted',
          assignedAttorneyId: 'att-sms-3',
          assignmentType: 'exclusive',
        }),
      })
    )
  })

  it('unknown phone still 200 with guidance TwiML', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue(null as any)

    const res = await postSigned(app, { MessageSid: 'SM-unknown-1', From: '+15550999999', Body: 'YES' })

    expect(res.status).toBe(200)
    expect(res.text).toMatch(/not recognized|CaseIQ/i)
    expect(prisma.introduction.updateMany).not.toHaveBeenCalled()
  })

  it('recognized attorney with no pending intro gets expired guidance', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-sms-4', phone: '+15550001111' } as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue(null as any)

    const res = await postSigned(app, { MessageSid: 'SM-nopending-1', From: '+15550001111', Body: 'ACCEPT' })

    expect(res.status).toBe(200)
    expect(res.text).toMatch(/No pending case offer found|expired/i)
    expect(prisma.introduction.updateMany).not.toHaveBeenCalled()
  })

  it('duplicate MessageSid returns the existing receipt response without reprocessing', async () => {
    vi.mocked(prisma.smsWebhookReceipt.create).mockRejectedValue({ code: 'P2002' } as any)
    vi.mocked(prisma.smsWebhookReceipt.findUnique).mockResolvedValue({
      id: 'receipt-dup-1',
      messageSid: 'SM-dup-1',
      responseCode: 200,
      responseMessage: 'You have accepted this case. View details in CaseIQ.',
    } as any)

    const res = await postSigned(app, { MessageSid: 'SM-dup-1', From: '+15551234567', Body: 'ACCEPT' })

    expect(res.status).toBe(200)
    expect(res.text).toMatch(/accepted this case/i)
    expect(prisma.attorney.findFirst).not.toHaveBeenCalled()
  })
})

/**
 * The sender of an inbound text is asserted by the `From` field alone, and
 * "ACCEPT" claims a routed case. Without a signature check anyone could POST a
 * forged reply naming an attorney's published number and take their cases, so
 * these are the tests that make the phone number mean something.
 */
describe('POST /v1/sms/webhook signature verification', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('rejects a request with no signature and never looks up the attorney', async () => {
    const res = await request(app)
      .post('/v1/sms/webhook')
      .type('form')
      .send({ MessageSid: 'SM-forged-1', From: '+15551234567', Body: 'ACCEPT' })

    expect(res.status).toBe(403)
    expect(prisma.attorney.findFirst).not.toHaveBeenCalled()
    expect(prisma.introduction.updateMany).not.toHaveBeenCalled()
  })

  it('rejects a signature computed with the wrong auth token', async () => {
    const params = { MessageSid: 'SM-forged-2', From: '+15551234567', Body: 'ACCEPT' }
    const res = await request(app)
      .post('/v1/sms/webhook')
      .type('form')
      .set('X-Twilio-Signature', twilioSignature(params, 'not-the-real-token'))
      .send(params)

    expect(res.status).toBe(403)
    expect(prisma.introduction.updateMany).not.toHaveBeenCalled()
  })

  it('rejects a body altered after signing', async () => {
    const signed = { MessageSid: 'SM-forged-3', From: '+15550000000', Body: 'ACCEPT' }
    const res = await request(app)
      .post('/v1/sms/webhook')
      .type('form')
      .set('X-Twilio-Signature', twilioSignature(signed))
      // Same signature, different sender — the attack this check exists to stop.
      .send({ ...signed, From: '+15551234567' })

    expect(res.status).toBe(403)
    expect(prisma.introduction.updateMany).not.toHaveBeenCalled()
  })

  it('fails closed when no auth token is configured', async () => {
    delete process.env.TWILIO_AUTH_TOKEN
    try {
      const params = { MessageSid: 'SM-forged-4', From: '+15551234567', Body: 'ACCEPT' }
      const res = await request(app)
        .post('/v1/sms/webhook')
        .type('form')
        .set('X-Twilio-Signature', twilioSignature(params))
        .send(params)

      expect(res.status).toBe(403)
      expect(prisma.introduction.updateMany).not.toHaveBeenCalled()
    } finally {
      process.env.TWILIO_AUTH_TOKEN = AUTH_TOKEN
    }
  })
})

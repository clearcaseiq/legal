import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import crypto from 'crypto'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { offerReferenceCode } from './lib/offer-reference'

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

  /**
   * A reply now runs the same accept/decline routine as the dashboard, so the
   * mocks have to satisfy that routine rather than a local lead write.
   */
  function givenPendingOffer(opts: { attorneyId: string; phone: string; introId: string; assessmentId: string }) {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: opts.attorneyId, phone: opts.phone } as any)
    const intro = {
      id: opts.introId,
      assessmentId: opts.assessmentId,
      attorneyId: opts.attorneyId,
      status: 'PENDING',
      requestedAt: new Date(Date.now() - 60 * 1000),
      assessment: { id: opts.assessmentId, leadSubmission: { id: 'lead-for-offer' }, user: null },
      attorney: {
        id: opts.attorneyId,
        name: 'Jane Lawyer',
        attorneyProfile: { yearsExperience: 12 },
        lawFirm: { name: 'Firm LLC' },
      },
    }
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([{ id: opts.introId }] as any)
    vi.mocked(prisma.introduction.findUnique).mockResolvedValue(intro as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue(intro as any)
    vi.mocked(prisma.introduction.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.leadSubmission.updateMany).mockResolvedValue({ count: 1 } as any)
  }

  it('ACCEPT updates introduction and returns TwiML', async () => {
    givenPendingOffer({
      attorneyId: 'att-sms-1',
      phone: '+15551234567',
      introId: 'intro-sms-1',
      assessmentId: 'asm-sms',
    })

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
    givenPendingOffer({
      attorneyId: 'att-sms-2',
      phone: '+15559876543',
      introId: 'intro-sms-2',
      assessmentId: 'asm-sms-2',
    })

    const res = await postSigned(app, { MessageSid: 'SM-decline-1', From: '+15559876543', Body: 'decline' })

    expect(res.status).toBe(200)
    expect(prisma.introduction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DECLINED' }),
      })
    )
  })

  /**
   * The reply path used to assign the attorney without setting routingLocked,
   * so the case kept escalating to new attorneys, stayed claimable by a second
   * one, and the claimant was never told anyone had taken it.
   */
  it('ACCEPT locks the case to the responding attorney', async () => {
    givenPendingOffer({
      attorneyId: 'att-sms-3',
      phone: '+15551112222',
      introId: 'intro-sms-3',
      assessmentId: 'asm-sms-3',
    })

    const res = await postSigned(app, { MessageSid: 'SM-accept-3', From: '+1 555 111 2222', Body: 'YES' })

    expect(res.status).toBe(200)
    expect(prisma.leadSubmission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assessmentId: 'asm-sms-3', routingLocked: false }),
        data: expect.objectContaining({
          status: 'contacted',
          assignedAttorneyId: 'att-sms-3',
          assignmentType: 'exclusive',
          routingLocked: true,
        }),
      })
    )
  })

  it('refuses to guess which case a bare reply answers', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-sms-5', phone: '+15552223333' } as any)
    // Two open offers and no reference code: applying this to the most recently
    // routed one accepts the wrong case whenever the attorney is answering the
    // older message, and nothing tells them it went to the wrong client.
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      { id: 'intro-newer' },
      { id: 'intro-older' },
    ] as any)

    const res = await postSigned(app, { MessageSid: 'SM-ambiguous-1', From: '+15552223333', Body: 'YES' })

    expect(res.status).toBe(200)
    expect(res.text).toMatch(/more than one open offer/i)
    expect(prisma.introduction.updateMany).not.toHaveBeenCalled()
  })

  it('applies a reply to the offer whose code it quotes', async () => {
    givenPendingOffer({
      attorneyId: 'att-sms-6',
      phone: '+15554445555',
      introId: 'intro-sms-6',
      assessmentId: 'asm-sms-6',
    })
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      { id: 'intro-sms-6' },
      { id: 'other-open-offer' },
    ] as any)

    const res = await postSigned(app, {
      MessageSid: 'SM-coded-1',
      From: '+15554445555',
      Body: `ACCEPT ${offerReferenceCode('intro-sms-6')}`,
    })

    expect(res.status).toBe(200)
    expect(prisma.introduction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'intro-sms-6' }),
        data: expect.objectContaining({ status: 'ACCEPTED' }),
      })
    )
  })

  it('does not act on a code that matches no open offer', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-sms-7', phone: '+15556667777' } as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([{ id: 'intro-sms-7' }] as any)

    const res = await postSigned(app, { MessageSid: 'SM-badcode-1', From: '+15556667777', Body: 'ACCEPT ZZZZZZ' })

    expect(res.status).toBe(200)
    expect(res.text).toMatch(/does not match an open offer/i)
    expect(prisma.introduction.updateMany).not.toHaveBeenCalled()
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

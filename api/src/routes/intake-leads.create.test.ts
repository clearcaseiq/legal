/**
 * POST /v1/intake-leads is unauthenticated and sends a resume email and text,
 * so it is where paid-traffic bots cost money. These pin down the captcha gate,
 * the repeat-contact rule, and what gets recorded for the suspicious-leads report.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

const { sendClaimEmailMock, sendSmsMock, provisionMock } = vi.hoisted(() => ({
  sendClaimEmailMock: vi.fn(),
  sendSmsMock: vi.fn(),
  provisionMock: vi.fn(),
}))

vi.mock('../lib/prisma', () => import('../test/universalPrismaMock'))
vi.mock('../lib/claims', () => ({ sendClaimEmail: sendClaimEmailMock }))
vi.mock('../lib/sms', () => ({ sendSms: sendSmsMock }))
vi.mock('../lib/intake-account', () => ({ provisionAndLinkIntakeAccount: provisionMock }))
vi.mock('../lib/report-ready', () => ({ scheduleReportReady: vi.fn() }))

import router from './intake-leads'
import { prisma } from '../lib/prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { resetTurnstileLogState } from '../lib/turnstile'

const app = express()
app.set('trust proxy', 1)
app.use(express.json())
app.use('/v1/intake-leads', router)

/** Lets the fire-and-forget sends after the response run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

const fetchMock = vi.fn()

beforeEach(() => {
  resetUniversalPrismaMock()
  resetTurnstileLogState()
  sendClaimEmailMock.mockReset().mockResolvedValue(true)
  sendSmsMock.mockReset().mockResolvedValue(true)
  provisionMock.mockReset().mockResolvedValue(undefined)
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  delete process.env.TURNSTILE_SITE_KEY
  delete process.env.TURNSTILE_SECRET_KEY
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.TURNSTILE_SITE_KEY
  delete process.env.TURNSTILE_SECRET_KEY
})

const created = () => vi.mocked(prisma.intakeLead.create).mock.calls.map((call) => (call[0] as any).data)
const consentsCreated = () => vi.mocked(prisma.consent.create).mock.calls.map((call) => (call[0] as any).data)

/** Consent lookups see whatever this test has recorded so far. */
function consentTableReflectsWrites() {
  vi.mocked(prisma.consent.findFirst).mockImplementation(async () =>
    consentsCreated().length ? { id: 'consent-1', metadata: consentsCreated()[0].metadata } : null
  )
}

describe('a first-time contact', () => {
  it('creates the lead with the client IP and sends the resume link', async () => {
    consentTableReflectsWrites()
    const res = await request(app)
      .post('/v1/intake-leads')
      .set('X-Forwarded-For', '203.0.113.7')
      .send({
        email: 'New@Example.com',
        phone: '(415) 555-0100',
        currentStep: 'contact',
        smsConsent: { version: '1.0', locale: 'en' },
      })
    await settle()

    expect(res.status).toBe(201)
    expect(res.body.repeat).toBeUndefined()
    expect(created()[0]).toMatchObject({
      email: 'new@example.com',
      ipAddress: '203.0.113.7',
      repeatCount: 0,
      // Turnstile was not configured, which is recorded as unknown, not passed.
      captchaPassed: null,
    })
    expect(sendClaimEmailMock).toHaveBeenCalledTimes(1)
    expect(sendSmsMock).toHaveBeenCalledTimes(1)
  })
})

describe('SMS consent', () => {
  it('records the exact disclosure, number, IP and browser before the first text', async () => {
    consentTableReflectsWrites()
    await request(app)
      .post('/v1/intake-leads')
      .set('X-Forwarded-For', '203.0.113.7')
      .set('User-Agent', 'Mozilla/5.0 test')
      .send({ phone: '(415) 555-0100', currentStep: 'contact', smsConsent: { version: '1.0', locale: 'es' } })
    await settle()

    expect(consentsCreated()).toHaveLength(1)
    const consent = consentsCreated()[0]
    expect(consent).toMatchObject({
      consentType: 'sms',
      phone: '+14155550100',
      version: '1.0',
      granted: true,
      ipAddress: '203.0.113.7',
      userAgent: 'Mozilla/5.0 test',
    })
    expect(consent.consentText).toContain('Al agregar su teléfono')
    expect(consent.grantedAt).toBeInstanceOf(Date)
    expect(JSON.parse(consent.metadata)).toMatchObject({ locale: 'es', source: 'intake_quick', intakeLeadId: 'mock-id' })
    expect(sendSmsMock).toHaveBeenCalledTimes(1)
  })

  it('sends no text to a number with no recorded consent', async () => {
    const res = await request(app)
      .post('/v1/intake-leads')
      .send({ email: 'someone@example.com', phone: '(415) 555-0100', currentStep: 'contact' })
    await settle()

    expect(res.status).toBe(201)
    expect(consentsCreated()).toHaveLength(0)
    expect(sendClaimEmailMock).toHaveBeenCalledTimes(1)
    expect(sendSmsMock).not.toHaveBeenCalled()
  })

  it('does not record a consent for a disclosure version the server does not know', async () => {
    await request(app)
      .post('/v1/intake-leads')
      .send({ phone: '(415) 555-0100', currentStep: 'contact', smsConsent: { version: '9.9', locale: 'en' } })
    await settle()

    expect(consentsCreated()).toHaveLength(0)
    expect(sendSmsMock).not.toHaveBeenCalled()
  })
})

describe('a repeat contact within 30 days', () => {
  it('counts the repeat on the earlier lead and sends no new email or text', async () => {
    vi.mocked(prisma.intakeLead.findFirst).mockResolvedValue({ id: 'lead-original' } as any)
    vi.mocked(prisma.intakeLead.update).mockResolvedValue({ repeatCount: 2 } as any)

    const res = await request(app)
      .post('/v1/intake-leads')
      .send({ email: 'again@example.com', phone: '415-555-0100' })
    await settle()

    expect(res.status).toBe(201)
    expect(res.body.repeat).toBe(true)
    const update = vi.mocked(prisma.intakeLead.update).mock.calls[0][0] as any
    expect(update.where).toEqual({ id: 'lead-original' })
    expect(update.data).toEqual({ repeatCount: { increment: 1 } })
    expect(created()[0]).toMatchObject({ repeatCount: 2 })
    expect(sendClaimEmailMock).not.toHaveBeenCalled()
    expect(sendSmsMock).not.toHaveBeenCalled()
  })

  /**
   * The lead id is the only credential the resume endpoints check, so handing
   * back the earlier id would give a stranger's saved answers to anyone who
   * typed their email.
   */
  it('never returns the earlier lead id', async () => {
    vi.mocked(prisma.intakeLead.findFirst).mockResolvedValue({ id: 'lead-original' } as any)
    vi.mocked(prisma.intakeLead.update).mockResolvedValue({ repeatCount: 1 } as any)
    vi.mocked(prisma.intakeLead.create).mockResolvedValue({ id: 'lead-new', email: 'again@example.com', phone: null } as any)

    const res = await request(app).post('/v1/intake-leads').send({ email: 'again@example.com' })

    expect(res.body.id).toBe('lead-new')
  })

  it('matches a phone typed in a different format on its digits', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 'lead-by-phone' }] as any)
    vi.mocked(prisma.intakeLead.update).mockResolvedValue({ repeatCount: 1 } as any)

    const res = await request(app).post('/v1/intake-leads').send({ phone: '+1 (415) 555-0100' })
    await settle()

    expect(res.body.repeat).toBe(true)
    const sql = vi.mocked(prisma.$queryRaw).mock.calls[0][0] as any
    expect(sql.values).toContain('4155550100')
    expect(sendSmsMock).not.toHaveBeenCalled()
  })

  it('only looks back 30 days', async () => {
    await request(app).post('/v1/intake-leads').send({ email: 'someone@example.com' })

    const where = (vi.mocked(prisma.intakeLead.findFirst).mock.calls[0][0] as any).where
    const ageDays = (Date.now() - where.createdAt.gte.getTime()) / (24 * 60 * 60 * 1000)
    expect(Math.round(ageDays)).toBe(30)
  })
})

describe('the Turnstile gate', () => {
  beforeEach(() => {
    process.env.TURNSTILE_SITE_KEY = 'site-key'
    process.env.TURNSTILE_SECRET_KEY = 'secret-key'
  })

  it('refuses a lead with no token, creating and sending nothing', async () => {
    const res = await request(app).post('/v1/intake-leads').send({ email: 'bot@example.com' })
    await settle()

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('captcha_failed')
    expect(prisma.intakeLead.create).not.toHaveBeenCalled()
    expect(sendClaimEmailMock).not.toHaveBeenCalled()
  })

  it('refuses a token Cloudflare rejects', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: false, 'error-codes': ['timeout-or-duplicate'] }) })

    const res = await request(app).post('/v1/intake-leads').send({ email: 'bot@example.com', captchaToken: 'reused' })

    expect(res.status).toBe(403)
    expect(prisma.intakeLead.create).not.toHaveBeenCalled()
  })

  it('records a passed check on the lead', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) })

    const res = await request(app).post('/v1/intake-leads').send({ email: 'person@example.com', captchaToken: 'good' })

    expect(res.status).toBe(201)
    expect(created()[0]).toMatchObject({ captchaPassed: true })
  })

  it('serves the site key to the browser', async () => {
    const res = await request(app).get('/v1/intake-leads/captcha-config')

    expect(res.body).toEqual({ enabled: true, siteKey: 'site-key' })
  })
})

describe('the autosave PATCH', () => {
  /** Gating every autosave on a token minted minutes earlier would break later steps. */
  it('does not ask for a captcha token', async () => {
    process.env.TURNSTILE_SITE_KEY = 'site-key'
    process.env.TURNSTILE_SECRET_KEY = 'secret-key'
    vi.mocked(prisma.intakeLead.findUnique).mockResolvedValue({
      id: 'lead-1',
      email: 'a@example.com',
      phone: null,
      status: 'in_progress',
      currentStep: 'contact',
      updatedAt: new Date(),
    } as any)
    vi.mocked(prisma.intakeLead.update).mockResolvedValue({ id: 'lead-1', status: 'in_progress', email: 'a@example.com' } as any)

    const res = await request(app).patch('/v1/intake-leads/lead-1').send({ currentStep: 'injuries' })

    expect(res.status).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

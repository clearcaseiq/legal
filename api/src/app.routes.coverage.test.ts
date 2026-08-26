/**
 * Smoke coverage: one representative request per mounted router (or small cluster)
 * that uses ../lib/prisma, using the universal Prisma mock (no real DB).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import crypto from 'crypto'

vi.mock('./services/chatgpt', () => ({
  analyzeCaseWithChatGPT: vi.fn().mockResolvedValue({ summary: 'mock' }),
}))

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma, resetUniversalPrismaMock } from './test/universalPrismaMock'

// The inbound SMS webhook rejects anything it cannot verify, so reaching the
// handler at all requires a signature. Pinning the URL keeps it deterministic.
const TWILIO_TOKEN = 'coverage-twilio-token'
const TWILIO_URL = 'https://api.test.local/v1/sms/webhook'
process.env.TWILIO_AUTH_TOKEN = TWILIO_TOKEN
process.env.TWILIO_WEBHOOK_URL = TWILIO_URL

function signedSmsPost(app: any, params: Record<string, string>) {
  const signature = crypto
    .createHmac('sha1', TWILIO_TOKEN)
    .update(
      Buffer.from(
        Object.keys(params)
          .sort()
          .reduce((acc, key) => acc + key + params[key], TWILIO_URL),
        'utf8',
      ),
    )
    .digest('base64')
  return request(app).post('/v1/sms/webhook').type('form').set('X-Twilio-Signature', signature).send(params)
}

describe('HTTP API route coverage (mocked prisma)', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  const ok = new Set([200, 201, 400, 401, 403, 404, 409])

  function expectHandledStatus(code: number) {
    expect(ok.has(code)).toBe(true)
  }

  it('GET /v1/auth/health', async () => {
    const res = await request(app).get('/v1/auth/health')
    expectHandledStatus(res.status)
    expect(res.status).toBe(200)
  })

  it('POST /v1/auth/register invalid → 400', async () => {
    const res = await request(app).post('/v1/auth/register').send({ email: 'x' })
    expectHandledStatus(res.status)
    expect(res.status).toBe(400)
  })

  it('GET /v1/feature-toggles', async () => {
    const res = await request(app).get('/v1/feature-toggles')
    expectHandledStatus(res.status)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('POST /v1/notify/send (email)', async () => {
    const res = await request(app).post('/v1/notify/send').send({
      type: 'email',
      recipient: 'a@example.com',
      message: 'hello',
    })
    expectHandledStatus(res.status)
    expect(res.status).toBe(200)
  })

  it('POST /v1/sms/webhook missing fields → 400', async () => {
    const res = await signedSmsPost(app, {})
    expectHandledStatus(res.status)
    expect(res.status).toBe(400)
  })

  it('POST /v1/sms/webhook unknown keyword → 200 TwiML', async () => {
    const res = await signedSmsPost(app, {
      From: '+15555550100',
      Body: 'HELLO',
    })
    expectHandledStatus(res.status)
    expect(res.status).toBe(200)
    expect(res.text).toContain('Response')
  })

  it('POST /v1/sms/webhook without a signature → 403', async () => {
    const res = await request(app).post('/v1/sms/webhook').type('form').send({
      From: '+15555550100',
      Body: 'ACCEPT',
    })
    expectHandledStatus(res.status)
    expect(res.status).toBe(403)
  })

  it('GET /v1/attorneys/search', async () => {
    const res = await request(app).get('/v1/attorneys/search')
    expectHandledStatus(res.status)
    expect(res.status).toBe(200)
  })

  it('POST /v1/intros/request without token → 401', async () => {
    const res = await request(app).post('/v1/intros/request').send({})
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('POST /v1/demands/generate unknown assessment → 404', async () => {
    const res = await request(app)
      .post('/v1/demands/generate')
      .send({
        assessmentId: 'unknown-assess',
        targetAmount: 50000,
        recipient: { name: 'Ins Co', address: '1 Main' },
      })
    expectHandledStatus(res.status)
    expect(res.status).toBe(404)
  })

  // A pro-se claimant drafts before creating an account, so a case with no owner
  // is still readable by id. `mockResolvedValue` rather than `...Once` because
  // the access check and the handler each load the assessment.
  it('POST /v1/demands/generate supports pro-se self-help letters', async () => {
    prisma.assessment.findUnique.mockResolvedValue({
      id: 'assess-1',
      userId: null,
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      facts: JSON.stringify({
        incident: { date: '2026-01-01', narrative: 'Rear-end collision at a red light.' },
        damages: { med_charges: 12000, wage_loss: 1500 },
      }),
    })

    const res = await request(app)
      .post('/v1/demands/generate')
      .send({
        assessmentId: 'assess-1',
        targetAmount: 30000,
        recipient: { name: 'Ins Co', address: '1 Main', email: '' },
        mode: 'pro_se',
      })

    expect(res.status).toBe(200)
    expect(res.body.content).toContain('I am writing on my own behalf')
    expect(res.body.content).not.toContain('We represent')
  })

  // Attorney work product. Anonymous callers used to be able to enumerate every
  // letter on a case by assessment id.
  it('GET /v1/demands/assessment/x without token → 401', async () => {
    const res = await request(app).get('/v1/demands/assessment/x')
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('GET /v1/demands/:id without token → 403 for an attorney-drafted letter', async () => {
    prisma.demandLetter.findUnique.mockResolvedValueOnce({
      id: 'demand-1',
      assessmentId: 'assess-1',
      origin: 'attorney',
      content: 'DEMAND LETTER',
      recipient: JSON.stringify({ name: 'Ins Co', address: '1 Main' }),
      status: 'DRAFT',
      targetAmount: 30000,
    })

    const res = await request(app).get('/v1/demands/demand-1')
    expectHandledStatus(res.status)
    expect(res.status).toBe(403)
  })

  // The self-help builder is a public page, so a claimant who is not logged in
  // still has to be able to read back the letter they just generated.
  it('GET /v1/demands/:id without token → 200 for a pro-se letter', async () => {
    prisma.demandLetter.findUnique.mockResolvedValueOnce({
      id: 'demand-2',
      assessmentId: 'assess-1',
      origin: 'pro_se',
      content: 'SETTLEMENT DEMAND',
      recipient: JSON.stringify({ name: 'Ins Co', address: '1 Main' }),
      status: 'DRAFT',
      targetAmount: 30000,
      createdAt: new Date(),
      sentAt: null,
    })

    const res = await request(app).get('/v1/demands/demand-2')
    expect(res.status).toBe(200)
    expect(res.body.content).toContain('SETTLEMENT DEMAND')
  })

  // Reachable without a token only while the case has no owner (pre-account
  // intake); once it belongs to someone the read is authorized like any other
  // case read. See the hardening suite for the refusal cases.
  it('GET /v1/files/assessment/x', async () => {
    prisma.assessment.findUnique.mockResolvedValue({ id: 'x', userId: null })

    const res = await request(app).get('/v1/files/assessment/x')
    expectHandledStatus(res.status)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('GET /v1/attorney-profiles/nope → 404', async () => {
    const res = await request(app).get('/v1/attorney-profiles/nope')
    expectHandledStatus(res.status)
    expect(res.status).toBe(404)
  })

  it('GET /v1/financing/partners', async () => {
    const res = await request(app).get('/v1/financing/partners')
    expectHandledStatus(res.status)
    expect(res.status).toBe(200)
    expect(res.body.partners).toBeDefined()
  })

  it('GET /v1/case-insights/assessments/x/medical-chronology → 404', async () => {
    const res = await request(app).get('/v1/case-insights/assessments/x/medical-chronology')
    expectHandledStatus(res.status)
    expect(res.status).toBe(404)
  })

  it('GET /v1/smart-recommendations/similar-cases/x → 404', async () => {
    const res = await request(app).get('/v1/smart-recommendations/similar-cases/x')
    expectHandledStatus(res.status)
    expect(res.status).toBe(404)
  })

  it('POST /v1/tier-routing/tier1/case1 (no crash)', async () => {
    const res = await request(app).post('/v1/tier-routing/tier1/case1').send({})
    expectHandledStatus(res.status)
  })

  it('POST /v1/attorney-register/register invalid → 400', async () => {
    const res = await request(app).post('/v1/attorney-register/register').send({ email: 'a' })
    expectHandledStatus(res.status)
    expect(res.status).toBe(400)
  })

  it('POST /v1/rose/intake invalid → 400', async () => {
    const res = await request(app).post('/v1/rose/intake').send({})
    expectHandledStatus(res.status)
    expect(res.status).toBe(400)
  })

  it('POST /v1/predict invalid body → 400', async () => {
    const res = await request(app).post('/v1/predict').send({})
    expectHandledStatus(res.status)
    expect(res.status).toBe(400)
  })

  it('GET /v1/favorites without token → 401', async () => {
    const res = await request(app).get('/v1/favorites')
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('GET /v1/appointments without token → 401', async () => {
    const res = await request(app).get('/v1/appointments')
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('GET /v1/case-tracker/dashboard without token → 401', async () => {
    const res = await request(app).get('/v1/case-tracker/dashboard')
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('GET /v1/messaging/chat-rooms without token → 401', async () => {
    const res = await request(app).get('/v1/messaging/chat-rooms')
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('GET /v1/attorney-dashboard/dashboard without token → 401', async () => {
    const res = await request(app).get('/v1/attorney-dashboard/dashboard')
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('GET /v1/attorney-profile/profile without token → 401', async () => {
    const res = await request(app).get('/v1/attorney-profile/profile')
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('GET /v1/firm-dashboard without token → 401', async () => {
    const res = await request(app).get('/v1/firm-dashboard')
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('GET /v1/compliance/settings without token → 401', async () => {
    const res = await request(app).get('/v1/compliance/settings')
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('GET /v1/admin/stats without token → 401', async () => {
    const res = await request(app).get('/v1/admin/stats')
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('GET /v1/admin/communications/notifications without token → 401', async () => {
    const res = await request(app).get('/v1/admin/communications/notifications')
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('GET /v1/support-tickets without token → 401', async () => {
    const res = await request(app).get('/v1/support-tickets')
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('GET /v1/case-routing/introductions/x/summary without token → 401', async () => {
    const res = await request(app).get('/v1/case-routing/introductions/x/summary')
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('GET /v1/lead-quality/reports without token → 401', async () => {
    const res = await request(app).get('/v1/lead-quality/reports')
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })
})

/**
 * Smoke coverage: one representative request per mounted router (or small cluster)
 * that uses ../lib/prisma, using the universal Prisma mock (no real DB).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./services/chatgpt', () => ({
  analyzeCaseWithChatGPT: vi.fn().mockResolvedValue({ summary: 'mock' }),
}))

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

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
    const res = await request(app).post('/v1/sms/webhook').type('form').send({})
    expectHandledStatus(res.status)
    expect(res.status).toBe(400)
  })

  it('POST /v1/sms/webhook unknown keyword → 200 TwiML', async () => {
    const res = await request(app).post('/v1/sms/webhook').type('form').send({
      From: '+15555550100',
      Body: 'HELLO',
    })
    expectHandledStatus(res.status)
    expect(res.status).toBe(200)
    expect(res.text).toContain('Response')
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

  it('GET /v1/demands/assessment/x (list)', async () => {
    const res = await request(app).get('/v1/demands/assessment/x')
    expectHandledStatus(res.status)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('GET /v1/files/assessment/x', async () => {
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

  it('POST /v1/ai-copilot/ask without token → 401', async () => {
    const res = await request(app).post('/v1/ai-copilot/ask').send({})
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('GET /v1/recovery-hub/dashboard without token → 401', async () => {
    const res = await request(app).get('/v1/recovery-hub/dashboard')
    expectHandledStatus(res.status)
    expect(res.status).toBe(401)
  })

  it('GET /v1/verification/status without token → 401', async () => {
    const res = await request(app).get('/v1/verification/status')
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

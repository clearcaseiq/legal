import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./services/chatgpt', () => ({
  analyzeCaseWithChatGPT: vi.fn().mockResolvedValue({ summary: 'mock analysis' }),
}))

vi.mock('./lib/assessment-routing', () => ({
  startAssessmentRouting: vi.fn().mockResolvedValue({
    success: false,
    gatePassed: false,
    gateReason: 'HIPAA authorization is required before sending your case to attorneys.',
    gateStatus: 'needs_more_info',
    routedTo: [],
    errors: ['HIPAA authorization is required before sending your case to attorneys.'],
  }),
}))

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

const assessmentRow = {
  id: 'assess-int-test-1',
  userId: null as string | null,
  claimType: 'auto',
  venueState: 'CA',
  venueCounty: 'Los Angeles',
  status: 'DRAFT',
  facts: '{}',
  chatgptAnalysis: null as string | null,
  chatgptAnalysisDate: null as Date | null,
  similarCases: null as string | null,
  similarCasesUpdatedAt: null as Date | null,
  caseTierId: null as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('HTTP API (integration)', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.assessment.create).mockResolvedValue(assessmentRow as any)
    vi.mocked(prisma.auditLog.create).mockResolvedValue(undefined as any)
    vi.mocked(prisma.prediction.create).mockResolvedValue(undefined as any)
  })

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health').expect(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.timestamp).toBeDefined()
  })

  it('GET / returns API meta', async () => {
    const res = await request(app).get('/').expect(200)
    expect(res.body.name).toContain('Injury Intelligence')
    expect(res.body.endpoints.assessments).toBe('/v1/assessments')
  })

  it('GET /unknown returns 404', async () => {
    const res = await request(app).get('/no-such-route').expect(404)
    expect(res.body.error).toBe('Not found')
  })

  it('POST /v1/assessments rejects invalid body', async () => {
    const res = await request(app).post('/v1/assessments').send({ claimType: 'auto' }).expect(400)
    expect(res.body.error).toBe('Invalid input')
  })

  it('POST /v1/assessments creates assessment when valid', async () => {
    const body = {
      claimType: 'auto',
      venue: { state: 'CA', county: 'Los Angeles' },
      incident: { date: '2026-01-15', narrative: 'Detailed narrative about a rear-end crash here.' },
      injuries: [{ description: 'neck pain' }],
      damages: {},
      consents: { tos: true, privacy: true, ml_use: true },
    }
    const res = await request(app).post('/v1/assessments').send(body).expect(200)
    expect(res.body.assessment_id).toBe('assess-int-test-1')
    expect(prisma.assessment.create).toHaveBeenCalledOnce()
  })

  it('POST /v1/assessments/:id/submit-for-review requires HIPAA consent and persists it when provided', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      ...assessmentRow,
      facts: JSON.stringify({
        consents: { tos: true, privacy: true, ml_use: true, hipaa: false },
      }),
      leadSubmission: null,
      predictions: [{ viability: JSON.stringify({ overall: 0.61, liability: 0.58, causation: 0.57, damages: 0.72 }) }],
    } as any)
    vi.mocked(prisma.assessment.update).mockResolvedValue({} as any)
    vi.mocked(prisma.leadSubmission.create).mockResolvedValue({ id: 'lead-1' } as any)

    await request(app)
      .post('/v1/assessments/assess-int-test-1/submit-for-review')
      .send({
        firstName: 'Taylor',
        email: 'taylor@example.com',
        phone: '(555) 111-2222',
      })
      .expect(400)

    const ok = await request(app)
      .post('/v1/assessments/assess-int-test-1/submit-for-review')
      .send({
        firstName: 'Taylor',
        email: 'taylor@example.com',
        phone: '(555) 111-2222',
        hipaa: true,
      })
      .expect(200)

    expect(ok.body.submitted).toBe(true)
    expect(prisma.assessment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'assess-int-test-1' },
        data: {
          facts: expect.stringContaining('"hipaa":true'),
        },
      })
    )
    expect(prisma.leadSubmission.create).toHaveBeenCalledOnce()
  })

  it('POST /v1/sol/calculate returns SOL payload', async () => {
    const res = await request(app)
      .post('/v1/sol/calculate')
      .send({
        incidentDate: '2024-01-01',
        venue: { state: 'CA', county: 'Los Angeles' },
        claimType: 'auto',
      })
      .expect(200)
    expect(res.body.claim_type).toBe('auto')
    expect(res.body.daysRemaining).toBeDefined()
    expect(res.body.status).toMatch(/safe|warning|critical/)
  })

  it('GET /v1/sol/rules/CA returns rules object', async () => {
    const res = await request(app).get('/v1/sol/rules/CA').expect(200)
    expect(res.body.state).toBe('CA')
    expect(res.body.rules.auto.years).toBe(2)
  })

  it('POST /v1/predict/simulate returns deltas', async () => {
    const res = await request(app)
      .post('/v1/predict/simulate')
      .send({ base: {}, toggles: { increased_medical: true } })
      .expect(200)
    expect(res.body.deltas.overall).toBe(0.07)
  })
})

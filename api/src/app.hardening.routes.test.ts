import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

const { analyzeCaseWithChatGPTMock } = vi.hoisted(() => ({
  analyzeCaseWithChatGPTMock: vi.fn(),
}))
const { computeFeaturesMock, predictViabilityMock, simulateScenarioMock } = vi.hoisted(() => ({
  computeFeaturesMock: vi.fn(),
  predictViabilityMock: vi.fn(),
  simulateScenarioMock: vi.fn(),
}))

vi.mock('./services/chatgpt', () => ({
  analyzeCaseWithChatGPT: analyzeCaseWithChatGPTMock,
}))
vi.mock('./lib/prediction', () => ({
  computeFeatures: computeFeaturesMock,
  predictViability: predictViabilityMock,
  simulateScenario: simulateScenarioMock,
}))

vi.mock('./lib/auth', () => {
  const users: Record<string, any> = {
    plaintiff: {
      id: 'user-1',
      email: 'plaintiff@example.com',
      firstName: 'Pat',
      lastName: 'Plaintiff',
      role: 'user',
      isActive: true,
    },
    attorney: {
      id: 'attorney-1',
      email: 'attorney@example.com',
      firstName: 'Ari',
      lastName: 'Attorney',
      role: 'user',
      isActive: true,
    },
    admin: {
      id: 'admin-1',
      email: 'admin@example.com',
      firstName: 'Ada',
      lastName: 'Admin',
      role: 'admin',
      isActive: true,
    },
  }

  function resolveUser(req: any) {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) return null
    return users[header.substring(7)] ?? null
  }

  return {
    authMiddleware: (req: any, res: any, next: any) => {
      const user = resolveUser(req)
      if (!user) {
        return res.status(401).json({ error: 'No token provided' })
      }
      req.user = user
      next()
    },
    optionalAuthMiddleware: (req: any, _res: any, next: any) => {
      const user = resolveUser(req)
      if (user) req.user = user
      next()
    },
    requireRole: (roles: string[]) => (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient privileges' })
      }
      next()
    },
    generateToken: vi.fn(),
    verifyToken: vi.fn(),
  }
})

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

describe('HTTP hardening regressions', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
    analyzeCaseWithChatGPTMock.mockReset()
    analyzeCaseWithChatGPTMock.mockResolvedValue({
      assessmentId: 'asm-1',
      confidence: 0.91,
      analysisDate: '2026-04-04T00:00:00.000Z',
      analysis: {
        caseStrength: { overall: 70, liability: 70, causation: 70, damages: 70, evidence: 70 },
      },
    })
    computeFeaturesMock.mockReset()
    computeFeaturesMock.mockReturnValue({ claimType: 'auto' })
    predictViabilityMock.mockReset()
    predictViabilityMock.mockResolvedValue({
      viability: { overall: 0.82 },
      value_bands: { low: 10000, high: 25000 },
      explainability: { drivers: ['rear_end'] },
      severity: { level: 2, label: 'moderate' },
    })
    simulateScenarioMock.mockReset()
    simulateScenarioMock.mockReturnValue({ deltas: { overall: 0.07 } })
  })

  it('POST /v1/predict allows anonymous prediction for unclaimed (guest) assessments', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: null,
      facts: '{}',
      claimType: 'auto',
    } as any)
    vi.mocked(prisma.prediction.create).mockResolvedValue({ id: 'pred-1' } as any)
    vi.mocked(prisma.assessment.update).mockResolvedValue({ id: 'asm-1', status: 'COMPLETED' } as any)

    const res = await request(app)
      .post('/v1/predict')
      .send({ assessmentId: 'asm-1' })
      .expect(200)

    expect(res.body).toMatchObject({
      assessment_id: 'asm-1',
      model_version: 'heuristic-v1.0',
      viability: { overall: 0.82 },
    })
    expect(predictViabilityMock).toHaveBeenCalled()
  })

  it('POST /v1/predict rejects anonymous prediction for assessments linked to a user', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: 'user-1',
      facts: '{}',
      claimType: 'auto',
      user: { email: 'real@example.com' },
    } as any)

    const res = await request(app)
      .post('/v1/predict')
      .send({ assessmentId: 'asm-1' })
      .expect(401)

    expect(res.body).toEqual({ error: 'Authentication required' })
    expect(predictViabilityMock).not.toHaveBeenCalled()
  })

  it('POST /v1/predict allows anonymous prediction when assessment owner is guest shadow user (evidence upload)', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: 'guest-user-id',
      facts: '{}',
      claimType: 'auto',
      user: { email: 'guest+asm-1@caseiq.local' },
    } as any)
    vi.mocked(prisma.prediction.create).mockResolvedValue({ id: 'pred-1' } as any)
    vi.mocked(prisma.assessment.update).mockResolvedValue({ id: 'asm-1', status: 'COMPLETED' } as any)

    const res = await request(app)
      .post('/v1/predict')
      .send({ assessmentId: 'asm-1' })
      .expect(200)

    expect(res.body).toMatchObject({ assessment_id: 'asm-1' })
    expect(predictViabilityMock).toHaveBeenCalled()
  })

  it('POST /v1/predict rejects non-owner access to an assessment', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: 'someone-else',
      facts: '{}',
    } as any)

    const res = await request(app)
      .post('/v1/predict')
      .set('Authorization', 'Bearer plaintiff')
      .send({ assessmentId: 'asm-1' })
      .expect(403)

    expect(res.body).toEqual({ error: 'Unauthorized' })
    expect(predictViabilityMock).not.toHaveBeenCalled()
    expect(prisma.prediction.create).not.toHaveBeenCalled()
    expect(prisma.assessment.update).not.toHaveBeenCalled()
  })

  it('POST /v1/predict persists predictions for the assessment owner', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: 'user-1',
      facts: '{}',
      claimType: 'auto',
    } as any)
    vi.mocked(prisma.prediction.create).mockResolvedValue({ id: 'pred-1' } as any)
    vi.mocked(prisma.assessment.update).mockResolvedValue({ id: 'asm-1', status: 'COMPLETED' } as any)

    const res = await request(app)
      .post('/v1/predict')
      .set('Authorization', 'Bearer plaintiff')
      .send({ assessmentId: 'asm-1' })
      .expect(200)

    expect(res.body).toMatchObject({
      assessment_id: 'asm-1',
      model_version: 'heuristic-v1.0',
      viability: { overall: 0.82 },
    })
    expect(computeFeaturesMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'asm-1' }))
    expect(predictViabilityMock).toHaveBeenCalledWith({ claimType: 'auto' })
    expect(prisma.prediction.create).toHaveBeenCalledWith({
      data: {
        assessmentId: 'asm-1',
        modelVersion: 'heuristic-v1.0',
        viability: JSON.stringify({ overall: 0.82 }),
        bands: JSON.stringify({ low: 10000, high: 25000 }),
        explain: JSON.stringify({ drivers: ['rear_end'] }),
      },
    })
    expect(prisma.assessment.update).toHaveBeenCalledWith({
      where: { id: 'asm-1' },
      data: { status: 'COMPLETED' },
    })
  })

  it('GET /v1/predict/:assessmentId returns compact history for the owner', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({ userId: 'user-1' } as any)
    vi.mocked(prisma.prediction.findMany).mockResolvedValue([
      {
        id: 'pred-1',
        modelVersion: 'v1.0',
        viability: JSON.stringify({ overall: 0.82 }),
        bands: JSON.stringify({ low: 10000, high: 25000 }),
        explain: JSON.stringify({ drivers: ['rear_end'] }),
        createdAt: '2026-04-06T00:00:00.000Z',
      },
    ] as any)

    const res = await request(app)
      .get('/v1/predict/asm-1')
      .set('Authorization', 'Bearer plaintiff')
      .expect(200)

    expect(res.body).toEqual([
      {
        id: 'pred-1',
        model_version: 'v1.0',
        viability: { overall: 0.82 },
        value_bands: { low: 10000, high: 25000 },
        explainability: { drivers: ['rear_end'] },
        created_at: '2026-04-06T00:00:00.000Z',
      },
    ])
    expect(prisma.assessment.findUnique).toHaveBeenCalledWith({
      where: { id: 'asm-1' },
      select: { userId: true },
    })
    expect(prisma.prediction.findMany).toHaveBeenCalledWith({
      where: { assessmentId: 'asm-1' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        modelVersion: true,
        viability: true,
        bands: true,
        explain: true,
        createdAt: true,
      },
    })
  })

  it('GET /v1/predict/:assessmentId rejects non-owner access to history', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({ userId: 'someone-else' } as any)

    const res = await request(app)
      .get('/v1/predict/asm-1')
      .set('Authorization', 'Bearer plaintiff')
      .expect(403)

    expect(res.body).toEqual({ error: 'Unauthorized' })
    expect(prisma.prediction.findMany).not.toHaveBeenCalled()
  })

  it('POST /v1/chatgpt/analyze serializes evidence using hardened fields', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: 'user-1',
      facts: JSON.stringify({
        claimType: 'auto',
        venue: { state: 'CA' },
        incident: { date: '2025-01-01', narrative: 'Rear-end collision' },
      }),
      evidenceFiles: [
        {
          id: 'file-1',
          filename: 'record.pdf',
          category: 'medical_records',
          processingStatus: 'completed',
          aiSummary: 'Medical chronology extracted',
          aiHighlights: JSON.stringify(['2025-01-10', '$4,200']),
        },
      ],
    } as any)
    vi.mocked(prisma.assessment.update).mockResolvedValue({} as any)

    const res = await request(app)
      .post('/v1/chatgpt/analyze/asm-1')
      .set('Authorization', 'Bearer plaintiff')
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(analyzeCaseWithChatGPTMock).toHaveBeenCalledOnce()
    expect(analyzeCaseWithChatGPTMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assessmentId: 'asm-1',
        caseData: expect.objectContaining({
          evidence: [
            {
              id: 'file-1',
              filename: 'record.pdf',
              category: 'medical_records',
              processingStatus: 'completed',
              summary: 'Medical chronology extracted',
              highlights: ['2025-01-10', '$4,200'],
            },
          ],
        }),
      }),
    )
  })

  it('POST /v1/chatgpt/analyze rejects anonymous access to owned assessments', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-locked',
      userId: 'user-1',
      facts: JSON.stringify({}),
      evidenceFiles: [],
    } as any)

    const res = await request(app)
      .post('/v1/chatgpt/analyze/asm-locked')
      .expect(403)

    expect(res.body.error).toMatch(/unauthorized/i)
    expect(analyzeCaseWithChatGPTMock).not.toHaveBeenCalled()
  })

  it('GET /v1/evidence includes guest-uploaded files for the assessment owner', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({ userId: 'user-1' } as any)
    vi.mocked(prisma.evidenceFile.findMany).mockResolvedValue([{ id: 'file-1' }] as any)

    const res = await request(app)
      .get('/v1/evidence')
      .query({ assessmentId: 'asm-guest' })
      .set('Authorization', 'Bearer plaintiff')
      .expect(200)

    expect(res.body).toEqual([{ id: 'file-1' }])
    expect(prisma.evidenceFile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assessmentId: 'asm-guest',
        }),
      }),
    )
    expect(prisma.evidenceFile.findMany.mock.calls[0][0].where.userId).toBeUndefined()
  })

  it('GET /v1/evidence/insights/summary aggregates extracted-data signals', async () => {
    vi.mocked(prisma.evidenceFile.findMany).mockResolvedValue([
      {
        category: 'medical_records',
        extractedData: [{ dates: JSON.stringify(['2024-10-15']), totalAmount: 2500 }],
      },
      {
        category: 'photos',
        extractedData: [{ dates: JSON.stringify(['2025-02-01']), totalAmount: 0 }],
      },
    ] as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      facts: JSON.stringify({ incident: { date: '2025-01-10' } }),
      evidenceFiles: [],
    } as any)

    const res = await request(app)
      .get('/v1/evidence/insights/summary')
      .query({ assessmentId: 'asm-1' })
      .set('Authorization', 'Bearer plaintiff')
      .expect(200)

    expect(res.body.scope).toBe('assessment')
    expect(res.body.gaps).toEqual(expect.arrayContaining(['police_report', 'bills']))
    expect(res.body.contradictions).toContain('Evidence dates precede reported incident date')
    expect(res.body.severitySignals).toEqual({
      score: 0.36,
      drivers: ['1 medical records', '$2,500 extracted amount'],
    })
    expect(res.body.liabilitySignals).toEqual({
      score: 0.2,
      drivers: ['0 police reports', 'Photos available'],
    })
    expect(res.body.medicalChronology).toEqual(['2024-10-15', '2025-02-01'])
  })

  it('PUT /v1/attorney-dashboard/settings persists JSON encoded preferences', async () => {
    vi.mocked(prisma.attorneyDashboard.upsert).mockResolvedValue({
      id: 'dash-1',
      attorneyId: 'attorney-1',
      leadFilters: '{"caseTypes":["auto"]}',
      exclusivitySettings: '{"exclusiveOnly":true}',
      pricingModel: 'subscription',
    } as any)

    const body = {
      leadFilters: { caseTypes: ['auto'] },
      exclusivitySettings: { exclusiveOnly: true },
      pricingModel: 'subscription',
    }

    const res = await request(app)
      .put('/v1/attorney-dashboard/settings')
      .set('Authorization', 'Bearer attorney')
      .send(body)
      .expect(200)

    expect(res.body.pricingModel).toBe('subscription')
    expect(prisma.attorneyDashboard.upsert).toHaveBeenCalledWith({
      where: { attorneyId: 'attorney-1' },
      update: {
        leadFilters: JSON.stringify(body.leadFilters),
        exclusivitySettings: JSON.stringify(body.exclusivitySettings),
        pricingModel: 'subscription',
      },
      create: {
        attorneyId: 'attorney-1',
        leadFilters: JSON.stringify(body.leadFilters),
        exclusivitySettings: JSON.stringify(body.exclusivitySettings),
        pricingModel: 'subscription',
      },
    })
  })

  it('GET /v1/attorney-dashboard/analytics/funnel computes average conversion rate', async () => {
    vi.mocked(prisma.leadAnalytics.findMany).mockResolvedValue([
      {
        periodStart: '2026-01-01',
        totalLeads: 10,
        leadsAccepted: 4,
        leadsConverted: 2,
      },
      {
        periodStart: '2026-02-01',
        totalLeads: 20,
        leadsAccepted: 10,
        leadsConverted: 5,
      },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/analytics/funnel')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body.funnelData).toHaveLength(2)
    expect(res.body.funnelData[0]).toMatchObject({
      leads: 10,
      contacted: 4,
      consulted: 3,
      retained: 2,
      conversionRate: 20,
    })
    expect(res.body.averageConversionRate).toBe(22.5)
  })
})

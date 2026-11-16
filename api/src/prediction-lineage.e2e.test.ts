import crypto from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

const { predictViabilityMock } = vi.hoisted(() => ({
  predictViabilityMock: vi.fn(),
}))

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))
vi.mock('./lib/prediction', async () => {
  const actual = await vi.importActual<any>('./lib/prediction')
  return { ...actual, predictViability: predictViabilityMock }
})
vi.mock('./lib/case-notifications', () => ({
  sendPlaintiffCaseValueUpdated: vi.fn().mockResolvedValue(false),
  sendAttorneyCaseMaterialUpdate: vi.fn().mockResolvedValue(0),
}))
vi.mock('./lib/data-authority-push', () => ({
  pushCaseChange: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('./lib/auth', () => {
  const users: Record<string, any> = {
    plaintiff: {
      id: 'plaintiff-user-1',
      email: 'plaintiff@example.com',
      firstName: 'Pat',
      lastName: 'Plaintiff',
      role: 'user',
      isActive: true,
    },
    attorney: {
      id: 'attorney-user-1',
      email: 'attorney@example.com',
      firstName: 'Ari',
      lastName: 'Attorney',
      role: 'user',
      isActive: true,
    },
  }
  const resolve = (req: any) => {
    const value = String(req.headers.authorization || '').replace(/^Bearer /, '')
    return users[value] ?? null
  }
  return {
    authMiddleware: (req: any, res: any, next: any) => {
      const user = resolve(req)
      if (!user) return res.status(401).json({ error: 'No token provided' })
      req.user = user
      next()
    },
    optionalAuthMiddleware: (req: any, _res: any, next: any) => {
      const user = resolve(req)
      if (user) req.user = user
      next()
    },
    requireRole: () => (_req: any, _res: any, next: any) => next(),
    generateToken: vi.fn(),
    verifyToken: vi.fn(),
    authMiddlewareAllowPendingMfa: (_req: any, _res: any, next: any) => next(),
  }
})

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { runCaseRecalculation } from './lib/case-recalculation'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

type StoredPrediction = {
  id: string
  assessmentId: string
  modelVersion: string
  viability: string
  bands: string
  explain: string
  assessmentRevision: number
  triggerEventId: string
  inputHash: string
  inputSnapshot: string
  createdAt: Date
}

describe('complete prediction lineage and attorney disagreement scenario', () => {
  const app = buildApp()
  let assessment: any
  let predictions: StoredPrediction[]
  let events: any[]
  let reviews: Map<string, any>

  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
    predictions = []
    events = []
    reviews = new Map()
    assessment = {
      id: 'asm-e2e-1',
      userId: 'plaintiff-user-1',
      user: { id: 'plaintiff-user-1', email: 'plaintiff@example.com' },
      lawFirmId: 'firm-1',
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      status: 'IN_PROGRESS',
      revision: 0,
      lastWriteSource: 'web',
      facts: JSON.stringify({
        incident: {
          date: '2026-10-01',
          narrative: 'The defendant rear-ended the plaintiff at a red light.',
        },
        injuries: [{ type: 'neck', description: 'Neck pain and headaches' }],
        damages: { med_charges: 5_000, intake_med_charges: 5_000 },
      }),
      evidenceFiles: [],
      insuranceDetails: [],
      liabilityRecord: null,
    }

    predictViabilityMock.mockResolvedValue({
      modelVersion: 'heuristic-e2e-v1',
      viability: { overall: 0.5, liability: 0.5, damages: 0.5, attorneyAcceptance: 0.5 },
      value_bands: { p25: 10_000, median: 20_000, p75: 30_000 },
      explainability: [],
    })

    vi.mocked(prisma.assessment.findUnique).mockImplementation(async () => ({
      ...assessment,
      evidenceFiles: assessment.evidenceFiles.map((file: any) => ({ ...file })),
      insuranceDetails: assessment.insuranceDetails.map((detail: any) => ({ ...detail })),
      predictions: [...predictions].sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      ),
    }))
    vi.mocked(prisma.assessment.updateMany).mockImplementation(async (args: any) => {
      if (args.where.id !== assessment.id || args.where.revision !== assessment.revision) {
        return { count: 0 }
      }
      assessment.facts = args.data.facts
      assessment.revision += Number(args.data.revision?.increment || 0)
      assessment.lastWriteSource = args.data.lastWriteSource
      return { count: 1 }
    })
    vi.mocked(prisma.assessment.update).mockImplementation(async (args: any) => {
      if (args.data.revision?.increment) assessment.revision += args.data.revision.increment
      if (args.data.lastWriteSource) assessment.lastWriteSource = args.data.lastWriteSource
      if (args.data.status) assessment.status = args.data.status
      return { ...assessment }
    })

    vi.mocked(prisma.caseChangeEvent.create).mockImplementation(async (args: any) => {
      const event = {
        id: `event-${events.length + 1}`,
        seq: events.length + 1,
        createdAt: new Date(1_000 + events.length),
        ...args.data,
      }
      events.push(event)
      return event
    })
    vi.mocked(prisma.caseChangeEvent.findFirst).mockImplementation(async (args: any) => {
      const matches = events.filter(
        (event) =>
          (!args.where.id || event.id === args.where.id) &&
          (!args.where.assessmentId || event.assessmentId === args.where.assessmentId) &&
          (args.where.revision === undefined || event.revision === args.where.revision),
      )
      return matches.at(-1) ?? null
    })

    vi.mocked(prisma.prediction.create).mockImplementation(async (args: any) => {
      const prediction = {
        id: `prediction-${predictions.length + 1}`,
        createdAt: new Date(10_000 + predictions.length),
        ...args.data,
      } as StoredPrediction
      predictions.push(prediction)
      return prediction
    })
    vi.mocked(prisma.prediction.findFirst).mockImplementation(async (args: any) => {
      const matches = predictions.filter(
        (prediction) =>
          (!args.where.id || prediction.id === args.where.id) &&
          (!args.where.assessmentId || prediction.assessmentId === args.where.assessmentId),
      )
      return matches.at(-1) ?? null
    })

    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({
      id: 'attorney-profile-1',
      userId: 'attorney-user-1',
      email: 'attorney@example.com',
      name: 'Ari Attorney',
      lawFirmId: 'firm-1',
      isVerified: true,
    } as any)
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue({ lawFirmId: 'firm-1' } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: assessment.id,
      assignedAttorneyId: 'attorney-profile-1',
      assignmentType: 'direct',
    } as any)
    vi.mocked(prisma.attorneyCaseReview.upsert).mockImplementation(async (args: any) => {
      const key = `${args.where.attorneyId_predictionId.attorneyId}:${args.where.attorneyId_predictionId.predictionId}`
      const existing = reviews.get(key)
      const review = existing
        ? { ...existing, ...args.update, updatedAt: new Date() }
        : { id: `review-${reviews.size + 1}`, ...args.create, createdAt: new Date(), updatedAt: new Date() }
      reviews.set(key, review)
      return review
    })
    vi.mocked(prisma.attorneyCaseReview.findUnique).mockImplementation(async (args: any) => {
      const key = `${args.where.attorneyId_predictionId.attorneyId}:${args.where.attorneyId_predictionId.predictionId}`
      return reviews.get(key) ?? null
    })
  })

  it('preserves every prediction and keeps the disagreement linked to the originally reviewed version', async () => {
    // 1. Plaintiff submits the completed case and receives the initial AI result.
    const initial = await request(app)
      .post('/v1/predict')
      .set('Authorization', 'Bearer plaintiff')
      .send({ assessmentId: assessment.id })
      .expect(200)
    expect(initial.body).toMatchObject({
      liability: expect.objectContaining({ score: expect.any(Number) }),
      value_bands: expect.objectContaining({
        p25: expect.any(Number),
        median: expect.any(Number),
        p75: expect.any(Number),
      }),
    })
    expect(predictions).toHaveLength(1)
    expect(predictions[0].assessmentRevision).toBe(0)

    // 2. Attorney adds a medical bill; the existing recalculation pipeline runs.
    assessment.evidenceFiles.push({
      id: 'bill-1',
      originalName: 'first-medical-bill.pdf',
      category: 'bills',
      aiClassification: 'bills',
      aiSummary: 'Emergency treatment bill',
      aiHighlights: null,
      ocrText: 'Emergency department medical bill with itemized treatment charges.',
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
      extractedData: [
        {
          totalAmount: 20_000,
          dollarAmounts: JSON.stringify(['$20,000']),
          icdCodes: null,
          cptCodes: null,
          dates: JSON.stringify(['2026-10-02']),
          entities: null,
        },
      ],
    })
    await expect(runCaseRecalculation(assessment.id, 'document_upload')).resolves.toBeTruthy()
    expect(predictions).toHaveLength(2)
    const reviewedPrediction = predictions[1]
    expect(reviewedPrediction.assessmentRevision).toBe(1)

    // 3. Attorney records a structured disagreement against that exact version.
    const reviewedBeforeFeedback = { ...reviewedPrediction }
    await request(app)
      .put('/v1/attorney-dashboard/leads/lead-1/prediction-review')
      .set('Authorization', 'Bearer attorney')
      .send({
        predictionId: reviewedPrediction.id,
        liability: {
          disagrees: true,
          score: 85,
          notes: 'The rear-end facts support stronger liability.',
        },
        evidence: {
          disagrees: true,
          additions: ['Traffic camera footage'],
          removals: [],
          notes: 'Request the intersection recording.',
        },
        valuation: {
          disagrees: true,
          settlementLow: 30_000,
          settlementExpected: 50_000,
          settlementHigh: 75_000,
          notes: 'The documented treatment supports a higher range.',
        },
      })
      .expect(200)
    expect(reviewedPrediction).toEqual(reviewedBeforeFeedback)

    // 4. More evidence changes the case and produces a third immutable version.
    assessment.evidenceFiles.push({
      id: 'bill-2',
      originalName: 'specialist-bill.pdf',
      category: 'bills',
      aiClassification: 'bills',
      aiSummary: 'Specialist treatment and diagnostic imaging',
      aiHighlights: null,
      ocrText: 'Specialist treatment, diagnostic imaging, and follow-up medical charges.',
      createdAt: new Date('2026-11-10T00:00:00.000Z'),
      extractedData: [
        {
          totalAmount: 60_000,
          dollarAmounts: JSON.stringify(['$60,000']),
          icdCodes: JSON.stringify(['M50.20']),
          cptCodes: JSON.stringify(['72141']),
          dates: JSON.stringify(['2026-11-08']),
          entities: null,
        },
      ],
    })
    await expect(runCaseRecalculation(assessment.id, 'document_upload')).resolves.toBeTruthy()
    expect(predictions).toHaveLength(3)

    const latestPrediction = predictions[2]
    expect(latestPrediction.id).not.toBe(reviewedPrediction.id)
    expect(latestPrediction.assessmentRevision).toBeGreaterThan(reviewedPrediction.assessmentRevision)
    expect(JSON.parse(latestPrediction.bands)).not.toEqual(JSON.parse(reviewedPrediction.bands))

    // Every version retains a verifiable snapshot and a trigger event at the same revision.
    for (const prediction of predictions) {
      const snapshot = JSON.parse(prediction.inputSnapshot)
      expect(snapshot.assessmentRevision).toBe(prediction.assessmentRevision)
      expect(snapshot.modelConfiguration.modelVersion).toBe(prediction.modelVersion)
      expect(
        crypto.createHash('sha256').update(prediction.inputSnapshot).digest('hex'),
      ).toBe(prediction.inputHash)
      expect(events.find((event) => event.id === prediction.triggerEventId)?.revision).toBe(
        prediction.assessmentRevision,
      )
    }

    // The historical disagreement remains on prediction 2, not the new latest prediction.
    const historical = await request(app)
      .get(`/v1/attorney-dashboard/leads/lead-1/prediction-review?predictionId=${reviewedPrediction.id}`)
      .set('Authorization', 'Bearer attorney')
      .expect(200)
    expect(historical.body.prediction.id).toBe(reviewedPrediction.id)
    expect(historical.body.review).toMatchObject({
      predictionId: reviewedPrediction.id,
      liabilityDisagrees: true,
      evidenceDisagrees: true,
      valuationDisagrees: true,
    })

    const latest = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/prediction-review')
      .set('Authorization', 'Bearer attorney')
      .expect(200)
    expect(latest.body.prediction.id).toBe(latestPrediction.id)
    expect(latest.body.review).toBeNull()
  })
})

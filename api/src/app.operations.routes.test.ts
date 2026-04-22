import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

const { sendCaseOfferSms } = vi.hoisted(() => ({
  sendCaseOfferSms: vi.fn(),
}))
const { runEscalationWave } = vi.hoisted(() => ({
  runEscalationWave: vi.fn(),
}))
const { calculateAttorneyReputationScore, recordRoutingEvent, syncDecisionMemoryForAssessment } = vi.hoisted(() => ({
  calculateAttorneyReputationScore: vi.fn(),
  recordRoutingEvent: vi.fn(),
  syncDecisionMemoryForAssessment: vi.fn(),
}))
const { routeCaseToAttorneys } = vi.hoisted(() => ({
  routeCaseToAttorneys: vi.fn(),
}))

vi.mock('./lib/auth', () => {
  const users: Record<string, any> = {
    admin: {
      id: 'admin-1',
      email: 'admin@caseiq.com',
      firstName: 'Ada',
      lastName: 'Admin',
      role: 'admin',
      isActive: true,
    },
    attorney: {
      id: 'attorney-user-1',
      email: 'attorney@example.com',
      firstName: 'Ari',
      lastName: 'Attorney',
      role: 'attorney',
      isActive: true,
    },
    plaintiff: {
      id: 'plaintiff-user-1',
      email: 'plaintiff@example.com',
      firstName: 'Pat',
      lastName: 'Plaintiff',
      role: 'plaintiff',
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
  it('GET /v1/assessments/:id/document-requests returns plaintiff task inbox payload', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      userId: 'plaintiff-user-1',
      evidenceFiles: [
        { id: 'file-1', category: 'medical_records', originalName: 'records.pdf', createdAt: new Date('2026-04-01T00:00:00Z') },
        { id: 'file-2', category: 'photos', originalName: 'photo.jpg', createdAt: new Date('2026-04-02T00:00:00Z') },
      ],
      leadSubmission: {
        id: 'lead-1',
        documentRequests: [
          {
            id: 'docreq-1',
            requestedDocs: JSON.stringify(['medical_records', 'injury_photos', 'police_report']),
            customMessage: 'Please upload the crash report when you can.',
            uploadLink: 'http://localhost:5173/evidence-upload/asm-1?token=abc',
            status: 'pending',
            lastNudgeAt: new Date('2026-04-05T00:00:00Z'),
            createdAt: new Date('2026-04-04T00:00:00Z'),
            attorney: {
              id: 'attorney-record-1',
              name: 'Ari Attorney',
              email: 'attorney@example.com',
            },
          },
        ],
      },
    } as any)

    const res = await request(app)
      .get('/v1/assessments/asm-1/document-requests')
      .set('Authorization', 'Bearer plaintiff')
      .expect(200)

    expect(res.body.assessmentId).toBe('asm-1')
    expect(res.body.requests).toHaveLength(1)
    expect(res.body.requests[0]).toMatchObject({
      id: 'docreq-1',
      status: 'partial',
      remainingDocs: ['police_report'],
      fulfilledDocs: ['medical_records', 'injury_photos'],
      completionPercent: 67,
    })
  })
})

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))
vi.mock('./lib/sms', () => ({
  sendCaseOfferSms,
}))
vi.mock('./lib/routing-lifecycle', () => ({
  runEscalationWave,
  calculateAttorneyReputationScore,
  recordRoutingEvent,
  syncDecisionMemoryForAssessment,
}))
vi.mock('./lib/routing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/routing')>()
  return {
    ...actual,
    routeCaseToAttorneys,
  }
})

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

describe('HTTP operations regressions', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
    sendCaseOfferSms.mockReset()
    sendCaseOfferSms.mockResolvedValue(true)
    runEscalationWave.mockReset()
    calculateAttorneyReputationScore.mockReset()
    calculateAttorneyReputationScore.mockResolvedValue(undefined)
    recordRoutingEvent.mockReset()
    recordRoutingEvent.mockResolvedValue(undefined)
    syncDecisionMemoryForAssessment.mockReset()
    syncDecisionMemoryForAssessment.mockResolvedValue(undefined)
    runEscalationWave.mockResolvedValue({ escalated: true, waveNumber: 2 })
    routeCaseToAttorneys.mockReset()

    vi.mocked(prisma.user.findUnique).mockImplementation(async (args: any) => {
      const id = args?.where?.id
      if (id === 'attorney-user-1') {
        return {
          id,
          email: 'attorney@example.com',
          role: 'attorney',
          isActive: true,
        } as any
      }
      if (id === 'plaintiff-user-1') {
        return {
          id,
          email: 'plaintiff@example.com',
          role: 'plaintiff',
          isActive: true,
        } as any
      }
      if (id === 'admin-1') {
        return {
          id,
          email: 'admin@caseiq.com',
          role: 'admin',
          isActive: true,
        } as any
      }
      return null
    })

    vi.mocked(prisma.attorney.findFirst).mockImplementation(async (args: any) => {
      if (args?.where?.email === 'attorney@example.com') {
        return {
          id: 'attorney-record-1',
          email: 'attorney@example.com',
          lawFirmId: 'firm-1',
        } as any
      }
      return null
    })

    vi.mocked(prisma.attorney.findUnique).mockImplementation(async (args: any) => {
      if (args?.where?.email === 'attorney@example.com') {
        return { id: 'attorney-record-1', email: 'attorney@example.com' } as any
      }
      return null
    })
  })

  it('POST /v1/assessments/associate adopts guest-shadow assessments and evidence files', async () => {
    vi.mocked(prisma.assessment.findMany).mockResolvedValue([
      {
        id: 'asm-guest',
        userId: 'guest-user-1',
        user: { email: 'guest+asm-guest@caseiq.local' },
      },
      {
        id: 'asm-anon',
        userId: null,
        user: null,
      },
      {
        id: 'asm-owned',
        userId: 'someone-else',
        user: { email: 'real@example.com' },
      },
    ] as any)
    vi.mocked(prisma.assessment.updateMany).mockResolvedValue({ count: 2 } as any)
    vi.mocked(prisma.evidenceFile.updateMany).mockResolvedValue({ count: 5 } as any)

    const res = await request(app)
      .post('/v1/assessments/associate')
      .set('Authorization', 'Bearer plaintiff')
      .send({ assessmentIds: ['asm-guest', 'asm-anon', 'asm-owned'] })
      .expect(200)

    expect(prisma.assessment.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['asm-guest', 'asm-anon'] },
      },
      data: {
        userId: 'plaintiff-user-1',
      },
    })
    expect(prisma.evidenceFile.updateMany).toHaveBeenCalledWith({
      where: {
        assessmentId: { in: ['asm-guest', 'asm-anon'] },
      },
      data: {
        userId: 'plaintiff-user-1',
      },
    })
    expect(res.body).toMatchObject({
      message: 'Assessments associated successfully',
      updatedCount: 2,
    })
  })

  it('GET /v1/admin/stats rejects non-admin users', async () => {
    const res = await request(app)
      .get('/v1/admin/stats')
      .set('Authorization', 'Bearer attorney')
      .expect(403)

    expect(res.body.error).toMatch(/admin access required/i)
  })

  it('GET /v1/admin/stats returns aggregated metrics for admin users', async () => {
    vi.mocked(prisma.assessment.count)
      .mockResolvedValueOnce(3 as any)
      .mockResolvedValueOnce(10 as any)
    vi.mocked(prisma.assessment.findMany).mockResolvedValue([
      { _count: { introductions: 0 }, leadSubmission: null, createdAt: new Date('2026-04-01T00:00:00Z') },
      { _count: { introductions: 2 }, leadSubmission: { routingLocked: false }, createdAt: new Date('2026-04-04T00:00:00Z') },
    ] as any)
    vi.mocked(prisma.introduction.groupBy).mockResolvedValue([
      { status: 'ACCEPTED', _count: { id: 4 } },
      { status: 'DECLINED', _count: { id: 2 } },
    ] as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      {
        requestedAt: new Date('2026-04-04T10:00:00Z'),
        respondedAt: new Date('2026-04-04T11:00:00Z'),
      },
    ] as any)
    vi.mocked(prisma.leadSubmission.count).mockResolvedValue(2 as any)
    vi.mocked(prisma.assessment.groupBy)
      .mockResolvedValueOnce([{ createdAt: new Date('2026-04-04T00:00:00Z'), _count: { id: 2 } }] as any)
      .mockResolvedValueOnce([{ claimType: 'auto', _count: { id: 5 } }] as any)
    vi.mocked(prisma.introduction.count)
      .mockResolvedValueOnce(6 as any)
      .mockResolvedValueOnce(4 as any)

    const res = await request(app)
      .get('/v1/admin/stats')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    expect(res.body.cards.newCasesToday).toBe(3)
    expect(res.body.cards.routableCases).toBe(1)
    expect(res.body.cards.casesWaitingForResponse).toBe(1)
    expect(res.body.cards.attorneyAcceptanceRate).toBe(67)
    expect(res.body.routingFunnel.attorneyAccepted).toBe(4)
    expect(res.body.casesByClaimType).toEqual([{ claimType: 'auto', count: 5 }])
  })

  it('GET /v1/admin/analytics returns intake, routing, and quality rollups', async () => {
    vi.mocked(prisma.assessment.findMany).mockResolvedValue([
      {
        id: 'asm-1',
        claimType: 'auto',
        venueState: 'CA',
        createdAt: new Date('2026-04-02T00:00:00Z'),
        leadSubmission: { sourceType: 'admin' },
        predictions: [
          {
            viability: JSON.stringify({ overall: 0.8 }),
            bands: JSON.stringify({ median: 50000 }),
          },
        ],
      },
      {
        id: 'asm-2',
        claimType: 'slip_and_fall',
        venueState: 'NV',
        createdAt: new Date('2026-04-03T00:00:00Z'),
        leadSubmission: { sourceType: 'routing_engine' },
        predictions: [
          {
            viability: JSON.stringify({ overall: 0.6 }),
            bands: JSON.stringify({ median: 30000 }),
          },
        ],
      },
    ] as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      {
        attorneyId: 'attorney-record-1',
        status: 'ACCEPTED',
        waveNumber: 1,
        requestedAt: new Date('2026-04-02T10:00:00Z'),
        respondedAt: new Date('2026-04-02T11:00:00Z'),
      },
      {
        attorneyId: 'attorney-record-2',
        status: 'DECLINED',
        waveNumber: 2,
        requestedAt: new Date('2026-04-03T10:00:00Z'),
        respondedAt: null,
      },
    ] as any)
    vi.mocked(prisma.leadSubmission.count).mockResolvedValue(1 as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([
      { id: 'attorney-record-1', name: 'Ari Attorney' },
      { id: 'attorney-record-2', name: 'Bea Barrister' },
    ] as any)

    const res = await request(app)
      .get('/v1/admin/analytics?days=30')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    expect(res.body.periodDays).toBe(30)
    expect(res.body.intake.total).toBe(2)
    expect(res.body.intake.byClaimType).toEqual(
      expect.arrayContaining([
        { claimType: 'auto', count: 1 },
        { claimType: 'slip_and_fall', count: 1 },
      ]),
    )
    expect(res.body.routing.funnel).toMatchObject({
      submitted: 2,
      routed: 2,
      attorneyAccepted: 1,
      engaged: 1,
    })
    expect(res.body.caseQuality).toMatchObject({
      avgViability: 70,
      avgValue: 40000,
      casesWithPrediction: 2,
    })
    expect(res.body.plaintiffConversion).toMatchObject({
      total: 2,
      matched: 1,
      rate: 50,
    })
    expect(res.body.attorneyPerformance[0]).toMatchObject({
      attorneyId: 'attorney-record-1',
      name: 'Ari Attorney',
      accepted: 1,
      acceptanceRate: 100,
    })
  })

  it('GET /v1/admin/manual-review returns compact manual review queue data', async () => {
    vi.mocked(prisma.assessment.findMany).mockResolvedValue([
      {
        id: 'asm-review-1',
        claimType: 'auto',
        venueState: 'CA',
        venueCounty: 'Los Angeles',
        manualReviewReason: 'low_confidence',
        manualReviewHeldAt: new Date('2026-04-04T00:00:00Z'),
        manualReviewNote: 'Needs human check',
        user: {
          id: 'plaintiff-user-1',
          email: 'plaintiff@example.com',
          firstName: 'Pat',
          lastName: 'Plaintiff',
        },
        predictions: [
          {
            viability: JSON.stringify({ overall: 0.42 }),
            bands: JSON.stringify({ median: 18000 }),
          },
        ],
        _count: { introductions: 1, files: 3 },
      },
    ] as any)

    const res = await request(app)
      .get('/v1/admin/manual-review')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    expect(res.body.cases).toEqual([
      expect.objectContaining({
        id: 'asm-review-1',
        claimType: 'auto',
        caseScore: 0.42,
        valueEstimate: 18000,
        counts: { introductions: 1, files: 3 },
      }),
    ])
  })

  it('GET /v1/admin/routing-feedback/summary returns aggregate override and outcome metrics', async () => {
    vi.mocked(prisma.decisionMemory.findMany).mockResolvedValue([
      {
        recommendedDecision: 'accept',
        attorneyDecision: 'accept',
        override: false,
        outcomeStatus: 'retained',
        recommendedConfidence: 0.9,
      },
      {
        recommendedDecision: 'decline',
        attorneyDecision: 'accept',
        override: true,
        outcomeStatus: 'consulted',
        recommendedConfidence: 0.4,
      },
    ] as any)
    vi.mocked(prisma.routingAnalytics.findMany).mockResolvedValue([
      { eventType: 'feedback_recorded' },
      { eventType: 'feedback_recorded' },
      { eventType: 'revenue_realized' },
    ] as any)

    const res = await request(app)
      .get('/v1/admin/routing-feedback/summary?days=30')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    expect(res.body.totals).toMatchObject({
      decisionMemories: 2,
      outcomesRecorded: 2,
      overrides: 1,
    })
    expect(res.body.recommendations.accept).toBe(1)
    expect(res.body.attorneyDecisions.accept).toBe(2)
    expect(res.body.analyticsByEvent.feedback_recorded).toBe(2)
  })

  it('GET /v1/admin/routing-feedback/candidates returns reviewable samples', async () => {
    vi.mocked(prisma.decisionMemory.findMany).mockResolvedValue([
      {
        id: 'memory-1',
        leadId: 'lead-1',
        assessmentId: 'asm-1',
        attorney: { id: 'att-1', name: 'Ari Attorney', email: 'ari@example.com' },
        assessment: { id: 'asm-1', claimType: 'auto', venueState: 'CA', venueCounty: 'Orange' },
        lead: { id: 'lead-1', status: 'accepted', lifecycleState: 'attorney_review', score: 88 },
        recommendedDecision: 'decline',
        recommendedConfidence: 0.33,
        recommendedRationale: 'Weak evidence',
        recommendedData: JSON.stringify({ thinEvidence: true }),
        attorneyDecision: 'accept',
        attorneyRationale: 'Spoke with plaintiff',
        override: true,
        outcomeStatus: 'consulted',
        outcomeNotes: 'Promising follow-up',
        decisionAt: new Date('2026-04-01T00:00:00Z'),
        outcomeAt: new Date('2026-04-02T00:00:00Z'),
        createdAt: new Date('2026-04-01T00:00:00Z'),
      },
    ] as any)

    const res = await request(app)
      .get('/v1/admin/routing-feedback/candidates?overrideOnly=true')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    expect(res.body.candidates).toEqual([
      expect.objectContaining({
        id: 'memory-1',
        override: true,
        actualDecision: 'accept',
        recommendation: expect.objectContaining({
          decision: 'decline',
          data: { thinEvidence: true },
        }),
      }),
    ])
  })

  it('POST /v1/admin/routing-feedback/retraining-request logs an audit record', async () => {
    vi.mocked(prisma.decisionMemory.findMany).mockResolvedValue([
      {
        id: 'dm-1',
        leadId: 'lead-1',
        assessmentId: 'asm-1',
        attorneyId: 'att-1',
        recommendedDecision: 'accept',
        attorneyDecision: 'reject',
        outcomeStatus: 'lost',
        override: true,
        assessment: {
          claimType: 'auto',
          venueState: 'CA',
          venueCounty: 'Los Angeles',
        },
        attorney: {
          name: 'Ari Attorney',
          email: 'ari@example.com',
        },
        lead: {
          status: 'submitted',
          lifecycleState: 'routing_active',
        },
      },
    ] as any)
    vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: 'audit-1' } as any)

    const res = await request(app)
      .post('/v1/admin/routing-feedback/retraining-request')
      .set('Authorization', 'Bearer admin')
      .send({
        notes: 'Use override-heavy leads for the next model review',
        filters: { overrideOnly: true },
        sampleSize: 50,
      })
      .expect(202)

    expect(res.body).toMatchObject({
      success: true,
      requestId: 'audit-1',
      sampledRecords: 1,
    })
    expect(vi.mocked(prisma.auditLog.create).mock.calls[0]?.[0]).toMatchObject({
      data: expect.objectContaining({
        action: 'routing_feedback_retraining_requested',
        statusCode: 202,
      }),
    })
    expect(vi.mocked(prisma.auditLog.create).mock.calls[0]?.[0]?.data?.metadata).toContain('"sampledDecisionMemoryIds":["dm-1"]')
    expect(prisma.routingAnalytics.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        assessmentId: 'asm-1',
        attorneyId: 'att-1',
        eventType: 'feedback_retraining_requested',
      }),
    }))
  })

  it('GET /v1/admin/routing-queue returns queue summary without broad nested payloads', async () => {
    vi.mocked(prisma.assessment.findMany).mockResolvedValue([
      {
        id: 'asm-queue-1',
        claimType: 'auto',
        venueState: 'CA',
        venueCounty: 'Orange',
        createdAt: new Date('2026-04-01T00:00:00Z'),
        predictions: [
          {
            viability: JSON.stringify({ overall: 0.77 }),
            bands: JSON.stringify({ median: 55000 }),
          },
        ],
        introductions: [{ status: 'PENDING' }, { status: 'DECLINED' }],
        routingWaves: [{ waveNumber: 2, nextEscalationAt: new Date('2026-04-05T00:00:00Z') }],
        _count: { introductions: 2 },
      },
    ] as any)

    const res = await request(app)
      .get('/v1/admin/routing-queue')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    expect(res.body.cases).toEqual([
      expect.objectContaining({
        id: 'asm-queue-1',
        claimType: 'auto',
        valueEstimate: 55000,
        caseScore: 0.77,
        currentWave: 2,
        attorneysContacted: 2,
        responsesReceived: 1,
        adminStatus: 'active',
      }),
    ])
  })

  it('GET /v1/admin/cases/queue pushes unrouted filtering into Prisma and returns compact queue cases', async () => {
    vi.mocked(prisma.assessment.findMany).mockResolvedValue([
      {
        id: 'asm-case-queue-1',
        claimType: 'auto',
        venueState: 'CA',
        venueCounty: 'Los Angeles',
        status: 'COMPLETED',
        facts: JSON.stringify({ injuries: ['whiplash'] }),
        createdAt: new Date('2026-04-01T00:00:00Z'),
        updatedAt: new Date('2026-04-02T00:00:00Z'),
        user: {
          id: 'plaintiff-user-1',
          email: 'plaintiff@example.com',
          firstName: 'Pat',
          lastName: 'Plaintiff',
          phone: '555-1111',
        },
        predictions: [
          {
            viability: JSON.stringify({ overall: 0.81 }),
            bands: JSON.stringify({ median: 64000 }),
            explain: JSON.stringify({ summary: 'Strong case' }),
          },
        ],
        _count: { files: 2 },
      },
    ] as any)

    const res = await request(app)
      .get('/v1/admin/cases/queue')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    expect(res.body.total).toBe(1)
    expect(res.body.cases[0]).toMatchObject({
      id: 'asm-case-queue-1',
      claimType: 'auto',
      fileCount: 2,
      facts: { injuries: ['whiplash'] },
      prediction: {
        viability: { overall: 0.81 },
        bands: { median: 64000 },
        explain: { summary: 'Strong case' },
      },
    })

    expect(vi.mocked(prisma.assessment.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: {
        status: { in: ['DRAFT', 'COMPLETED'] },
        introductions: { none: {} },
      },
      select: {
        facts: true,
        predictions: {
          take: 1,
          select: { viability: true, bands: true, explain: true },
        },
        _count: { select: { files: true } },
      },
    })
  })

  it('GET /v1/admin/cases/all applies filters with compact related selects', async () => {
    vi.mocked(prisma.assessment.findMany).mockResolvedValue([
      {
        id: 'asm-case-all-1',
        claimType: 'auto',
        venueState: 'CA',
        venueCounty: 'Orange',
        status: 'COMPLETED',
        facts: JSON.stringify({ venue: { county: 'Orange' } }),
        createdAt: new Date('2026-04-03T00:00:00Z'),
        updatedAt: new Date('2026-04-04T00:00:00Z'),
        user: {
          id: 'plaintiff-user-1',
          email: 'plaintiff@example.com',
          firstName: 'Pat',
          lastName: 'Plaintiff',
          phone: '555-1111',
        },
        predictions: [
          {
            viability: JSON.stringify({ overall: 0.66 }),
            bands: JSON.stringify({ median: 32000 }),
            explain: JSON.stringify({ reasons: ['treatment_gap'] }),
          },
        ],
        introductions: [
          {
            id: 'intro-1',
            status: 'PENDING',
            createdAt: new Date('2026-04-03T10:00:00Z'),
            attorney: {
              id: 'attorney-record-1',
              name: 'Ari Attorney',
              email: 'attorney@example.com',
            },
          },
        ],
        leadSubmission: {
          assignmentType: 'exclusive',
          assignedAttorney: {
            id: 'attorney-record-1',
            name: 'Ari Attorney',
            email: 'attorney@example.com',
          },
        },
        _count: {
          introductions: 1,
          files: 4,
          appointments: 1,
          chatRooms: 2,
        },
      },
    ] as any)

    const res = await request(app)
      .get('/v1/admin/cases/all?status=COMPLETED&claimType=auto&state=ca&county=ora&routingStatus=accepted&limit=20&offset=10')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    expect(res.body.total).toBe(1)
    expect(res.body.cases[0]).toMatchObject({
      id: 'asm-case-all-1',
      claimType: 'auto',
      facts: { venue: { county: 'Orange' } },
      leadSubmission: {
        assignmentType: 'exclusive',
        assignedAttorney: { id: 'attorney-record-1' },
      },
      counts: {
        files: 4,
        introductions: 1,
        appointments: 1,
        chatRooms: 2,
      },
    })

    expect(vi.mocked(prisma.assessment.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: {
        status: 'COMPLETED',
        claimType: 'auto',
        venueState: 'CA',
        venueCounty: { contains: 'ora', mode: 'insensitive' },
        leadSubmission: { routingLocked: true },
      },
      take: 20,
      skip: 10,
      select: {
        facts: true,
        introductions: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            attorney: { select: { id: true, name: true, email: true } },
          },
        },
        leadSubmission: {
          select: {
            assignmentType: true,
            assignedAttorney: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })
  })

  it('GET /v1/admin/cases/:id returns compact case detail payload', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-detail-1',
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      status: 'COMPLETED',
      facts: JSON.stringify({
        incident: {
          date: '2026-03-01',
          narrative: 'Rear-end collision on freeway',
        },
      }),
      manualReviewStatus: 'pending',
      manualReviewReason: 'low_confidence',
      manualReviewHeldAt: new Date('2026-04-04T00:00:00Z'),
      manualReviewNote: 'Escalated for human review',
      createdAt: new Date('2026-04-01T00:00:00Z'),
      updatedAt: new Date('2026-04-05T00:00:00Z'),
      user: {
        id: 'plaintiff-user-1',
        email: 'plaintiff@example.com',
        firstName: 'Pat',
        lastName: 'Plaintiff',
        phone: '555-1111',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      predictions: [
        {
          viability: JSON.stringify({ overall: 0.73 }),
          bands: JSON.stringify({ median: 45000, p25: 25000, p75: 70000 }),
          explain: JSON.stringify({ summary: 'Good liability facts' }),
        },
      ],
      introductions: [
        {
          id: 'intro-detail-1',
          status: 'DECLINED',
          createdAt: new Date('2026-04-02T00:00:00Z'),
          waveNumber: 1,
          declineReason: 'conflict',
          attorney: {
            id: 'attorney-record-1',
            name: 'Ari Attorney',
            email: 'attorney@example.com',
          },
        },
      ],
      leadSubmission: {
        id: 'lead-1',
        assignedAttorneyId: 'attorney-record-1',
        assignmentType: 'exclusive',
        sourceType: 'admin',
        routingLocked: true,
        submittedAt: new Date('2026-04-02T01:00:00Z'),
        assignedAttorney: {
          id: 'attorney-record-1',
          name: 'Ari Attorney',
          email: 'attorney@example.com',
        },
      },
      routingWaves: [
        {
          id: 'wave-1',
          waveNumber: 1,
          attorneyIds: JSON.stringify(['attorney-record-1']),
          sentAt: new Date('2026-04-02T00:00:00Z'),
          nextEscalationAt: new Date('2026-04-03T00:00:00Z'),
          escalatedAt: null,
          createdAt: new Date('2026-04-02T00:00:00Z'),
          updatedAt: new Date('2026-04-02T00:00:00Z'),
        },
      ],
      files: [
        {
          id: 'file-1',
          originalName: 'records.pdf',
          status: 'UPLOADED',
          createdAt: new Date('2026-04-01T01:00:00Z'),
        },
      ],
    } as any)

    const res = await request(app)
      .get('/v1/admin/cases/asm-detail-1')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'asm-detail-1',
      claimType: 'auto',
      manualReviewStatus: 'pending',
      user: {
        id: 'plaintiff-user-1',
        createdAt: expect.any(String),
      },
      prediction: {
        viability: { overall: 0.73 },
        bands: { median: 45000, p25: 25000, p75: 70000 },
        explain: { summary: 'Good liability facts' },
      },
      leadSubmission: {
        id: 'lead-1',
        assignmentType: 'exclusive',
        routingLocked: true,
      },
      routingWaves: [
        expect.objectContaining({
          id: 'wave-1',
          waveNumber: 1,
        }),
      ],
      files: [
        expect.objectContaining({
          id: 'file-1',
          originalName: 'records.pdf',
          status: 'UPLOADED',
        }),
      ],
    })
    expect(res.body.introductions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'intro-detail-1',
          waveNumber: 1,
          declineReason: 'conflict',
          attorney: expect.objectContaining({ id: 'attorney-record-1' }),
        }),
      ]),
    )

    expect(vi.mocked(prisma.assessment.findUnique).mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'asm-detail-1' },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true,
          },
        },
        predictions: {
          take: 1,
          select: { viability: true, bands: true, explain: true },
        },
        introductions: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            waveNumber: true,
            declineReason: true,
            attorney: { select: { id: true, name: true, email: true } },
          },
        },
        leadSubmission: {
          select: {
            id: true,
            assignedAttorneyId: true,
            assignmentType: true,
            sourceType: true,
            routingLocked: true,
            submittedAt: true,
            assignedAttorney: { select: { id: true, name: true, email: true } },
          },
        },
        routingWaves: {
          select: {
            id: true,
            waveNumber: true,
            attorneyIds: true,
            sentAt: true,
            nextEscalationAt: true,
            escalatedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        files: {
          select: {
            id: true,
            originalName: true,
            status: true,
            createdAt: true,
          },
        },
      },
    })
  })

  it('GET /v1/admin/cases/:id/routing-state returns compact routing diagnostics', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      leadSubmission: {
        id: 'lead-route-1',
        assignedAttorneyId: 'attorney-record-1',
        assignmentType: 'exclusive',
      },
      introductions: [
        {
          id: 'intro-route-1',
          attorneyId: 'attorney-record-1',
          status: 'PENDING',
          attorney: {
            id: 'attorney-record-1',
            name: 'Ari Attorney',
            email: 'attorney@example.com',
          },
        },
      ],
    } as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([
      { id: 'attorney-record-1', email: 'attorney@example.com', name: 'Ari Attorney' },
    ] as any)

    const res = await request(app)
      .get('/v1/admin/cases/asm-route-1/routing-state?attorneyEmail=Attorney@Example.com')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    expect(res.body).toMatchObject({
      assessmentId: 'asm-route-1',
      hasLeadSubmission: true,
      leadSubmission: {
        id: 'lead-route-1',
        assignedAttorneyId: 'attorney-record-1',
        assignmentType: 'exclusive',
      },
      introductions: [
        {
          id: 'intro-route-1',
          attorneyId: 'attorney-record-1',
          attorneyEmail: 'attorney@example.com',
          attorneyName: 'Ari Attorney',
          status: 'PENDING',
        },
      ],
      attorneyLookupByEmail: {
        id: 'attorney-record-1',
        email: 'attorney@example.com',
        name: 'Ari Attorney',
      },
    })

    expect(vi.mocked(prisma.assessment.findUnique).mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'asm-route-1' },
      select: {
        leadSubmission: {
          select: {
            id: true,
            assignedAttorneyId: true,
            assignmentType: true,
          },
        },
        introductions: {
          select: {
            id: true,
            attorneyId: true,
            status: true,
            attorney: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })
  })

  it('GET /v1/admin/attorney-debug returns compact attorney diagnostics with sampled intro leads', async () => {
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([
      { id: 'attorney-record-1', email: 'attorney@example.com', name: 'Ari Attorney' },
    ] as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'attorney-user-1',
      email: 'attorney@example.com',
      firstName: 'Ari',
      lastName: 'Attorney',
      role: 'attorney',
    } as any)
    vi.mocked(prisma.introduction.count).mockResolvedValue(6 as any)
    vi.mocked(prisma.leadSubmission.count)
      .mockResolvedValueOnce(2 as any)
      .mockResolvedValueOnce(3 as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      { assessmentId: 'asm-1' },
      { assessmentId: 'asm-2' },
    ] as any)
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      {
        id: 'lead-a',
        assessmentId: 'asm-2',
        assignedAttorneyId: 'attorney-record-1',
        status: 'contacted',
        submittedAt: new Date('2026-04-04T00:00:00Z'),
      },
    ] as any)

    const res = await request(app)
      .get('/v1/admin/attorney-debug?email=Attorney@Example.com')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    expect(res.body).toMatchObject({
      email: 'Attorney@Example.com',
      attorney: {
        id: 'attorney-record-1',
        email: 'attorney@example.com',
        name: 'Ari Attorney',
      },
      user: {
        id: 'attorney-user-1',
        email: 'attorney@example.com',
      },
      emailMatch: true,
      introCount: 6,
      assignedCount: 2,
      totalLeadsFromIntroPath: 3,
      sampleLeads: [
        {
          id: 'lead-a',
          assessmentId: 'asm-2',
          assignedAttorneyId: 'attorney-record-1',
          status: 'contacted',
        },
      ],
      message: 'OK',
    })

    expect(vi.mocked(prisma.attorney.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: { isActive: true },
      select: { id: true, email: true, name: true },
    })
    expect(vi.mocked(prisma.introduction.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: { attorneyId: 'attorney-record-1' },
      select: { assessmentId: true },
      distinct: ['assessmentId'],
    })
    expect(vi.mocked(prisma.leadSubmission.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: { assessmentId: { in: ['asm-1', 'asm-2'] } },
      select: {
        id: true,
        assessmentId: true,
        assignedAttorneyId: true,
        status: true,
        submittedAt: true,
      },
      orderBy: { submittedAt: 'desc' },
      take: 5,
    })
  })

  it('GET /v1/admin/attorneys/:id returns compact attorney detail payload', async () => {
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue({
      id: 'attorney-record-1',
      name: 'Ari Attorney',
      email: 'attorney@example.com',
      phone: '555-1111',
      isActive: true,
      isVerified: true,
      specialties: JSON.stringify(['auto', 'premises']),
      venues: JSON.stringify([{ state: 'CA' }]),
      lawFirm: {
        id: 'firm-1',
        name: 'Firm One',
      },
      attorneyProfile: {
        jurisdictions: JSON.stringify([{ state: 'CA' }]),
      },
      dashboard: {
        id: 'dash-1',
      },
      introductions: [
        {
          status: 'ACCEPTED',
          createdAt: new Date('2026-04-04T00:00:00Z'),
          requestedAt: new Date('2026-04-04T10:00:00Z'),
          respondedAt: new Date('2026-04-04T11:00:00Z'),
          assessment: {
            id: 'asm-intro-1',
            claimType: 'auto',
            venueState: 'CA',
          },
        },
        {
          status: 'PENDING',
          createdAt: new Date('2026-04-05T00:00:00Z'),
          requestedAt: new Date('2026-04-05T10:00:00Z'),
          respondedAt: null,
          assessment: {
            id: 'asm-intro-2',
            claimType: 'slip_and_fall',
            venueState: 'NV',
          },
        },
      ],
      _count: { introductions: 2 },
    } as any)
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      {
        assessmentId: 'asm-assigned-1',
        status: 'contacted',
        submittedAt: new Date('2026-04-06T00:00:00Z'),
        assessment: {
          id: 'asm-assigned-1',
          claimType: 'med_mal',
          venueState: 'TX',
        },
      },
    ] as any)

    const res = await request(app)
      .get('/v1/admin/attorneys/attorney-record-1')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'attorney-record-1',
      name: 'Ari Attorney',
      email: 'attorney@example.com',
      lawFirm: { id: 'firm-1', name: 'Firm One' },
      specialties: ['auto', 'premises'],
      venues: [{ state: 'CA' }],
      performance: {
        acceptanceRate: 50,
        medianResponseMinutes: 60,
        totalRouted: 2,
        accepted: 1,
        declined: 0,
        pending: 1,
      },
    })
    expect(res.body.recentCases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'asm-assigned-1',
          claimType: 'med_mal',
          venueState: 'TX',
          status: 'ACCEPTED',
        }),
        expect.objectContaining({
          id: 'asm-intro-1',
          claimType: 'auto',
          venueState: 'CA',
          status: 'ACCEPTED',
        }),
      ]),
    )

    expect(vi.mocked(prisma.attorney.findUnique).mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'attorney-record-1' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        isVerified: true,
        specialties: true,
        venues: true,
        lawFirm: {
          select: { id: true, name: true },
        },
        attorneyProfile: {
          select: { jurisdictions: true },
        },
        dashboard: {
          select: { id: true },
        },
        introductions: {
          select: {
            status: true,
            createdAt: true,
            requestedAt: true,
            respondedAt: true,
            assessment: { select: { id: true, claimType: true, venueState: true } },
          },
          take: 50,
        },
      },
    })
    expect(vi.mocked(prisma.leadSubmission.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: { assignedAttorneyId: 'attorney-record-1' },
      select: {
        assessmentId: true,
        status: true,
        submittedAt: true,
        assessment: { select: { id: true, claimType: true, venueState: true } },
      },
      take: 50,
    })
  })

  it('POST /v1/admin/cases/route batches assessment and intro lookups for manual routing', async () => {
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue({
      id: 'attorney-record-1',
      isActive: true,
      isVerified: true,
      specialties: JSON.stringify(['auto']),
      attorneyProfile: {},
    } as any)
    vi.mocked(prisma.assessment.findMany).mockResolvedValue([
      {
        id: 'asm-new',
        predictions: [{ viability: JSON.stringify({ overall: 0.81 }) }],
      },
      {
        id: 'asm-existing',
        predictions: [{ viability: JSON.stringify({ overall: 0.42 }) }],
      },
    ] as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      { assessmentId: 'asm-existing' },
    ] as any)
    vi.mocked(prisma.introduction.create).mockResolvedValue({
      id: 'intro-new-1',
      assessmentId: 'asm-new',
      attorneyId: 'attorney-record-1',
      status: 'PENDING',
      message: 'Admin route',
    } as any)

    const res = await request(app)
      .post('/v1/admin/cases/route')
      .set('Authorization', 'Bearer admin')
      .send({
        caseIds: ['asm-new', 'asm-existing'],
        attorneyId: 'attorney-record-1',
        message: 'Admin route',
      })
      .expect(200)

    expect(res.body).toMatchObject({
      success: true,
      routed: 1,
      failed: 1,
      introductions: [
        {
          id: 'intro-new-1',
          assessmentId: 'asm-new',
          attorneyId: 'attorney-record-1',
          status: 'PENDING',
        },
      ],
      errors: [
        {
          caseId: 'asm-existing',
          error: 'Already routed to this attorney',
        },
      ],
    })

    expect(vi.mocked(prisma.assessment.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: { id: { in: ['asm-new', 'asm-existing'] } },
      select: {
        id: true,
        predictions: {
          take: 1,
          select: { viability: true },
        },
      },
    })
    expect(vi.mocked(prisma.introduction.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: {
        assessmentId: { in: ['asm-new', 'asm-existing'] },
        attorneyId: 'attorney-record-1',
      },
      select: { assessmentId: true },
    })
    expect(prisma.introduction.findFirst).not.toHaveBeenCalled()
    expect(prisma.assessment.findUnique).not.toHaveBeenCalled()
    expect(sendCaseOfferSms).toHaveBeenCalledTimes(1)
    expect(prisma.leadSubmission.upsert).toHaveBeenCalledTimes(1)
  })

  it('POST /v1/admin/cases/escalate-due batches unique due assessments', async () => {
    vi.mocked(prisma.routingWave.findMany).mockResolvedValue([
      { assessmentId: 'asm-1' },
      { assessmentId: 'asm-1' },
      { assessmentId: 'asm-2' },
    ] as any)
    runEscalationWave
      .mockResolvedValueOnce({ escalated: true, waveNumber: 2 })
      .mockResolvedValueOnce({ escalated: false, error: 'Case not in routing or already matched' })

    const res = await request(app)
      .post('/v1/admin/cases/escalate-due')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    expect(res.body).toEqual({
      processed: 2,
      results: [
        { assessmentId: 'asm-1', escalated: true, waveNumber: 2 },
        { assessmentId: 'asm-2', escalated: false, error: 'Case not in routing or already matched' },
      ],
    })

    expect(vi.mocked(prisma.routingWave.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: {
        nextEscalationAt: { not: null },
        escalatedAt: null,
      },
      select: { assessmentId: true },
    })
    expect(runEscalationWave).toHaveBeenCalledTimes(2)
    expect(runEscalationWave).toHaveBeenNthCalledWith(1, 'asm-1')
    expect(runEscalationWave).toHaveBeenNthCalledWith(2, 'asm-2')
  })

  it('POST /v1/admin/cases/escalate-due skips processing when routing is disabled', async () => {
    vi.mocked(prisma.routingConfig.findUnique).mockResolvedValue({
      key: 'matching_rules',
      value: JSON.stringify({ routingEnabled: false }),
    } as any)

    const res = await request(app)
      .post('/v1/admin/cases/escalate-due')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    expect(res.body).toEqual({
      processed: 0,
      skipped: true,
      reason: 'Routing disabled by admin',
      results: [],
    })
    expect(prisma.routingWave.findMany).not.toHaveBeenCalled()
    expect(runEscalationWave).not.toHaveBeenCalled()
  })

  it('GET /v1/admin/cases/:caseId/recommendations returns compact recommendation payload', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      claimType: 'auto_accident',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      facts: JSON.stringify({ injurySeverity: 'moderate' }),
      predictions: [
        {
          viability: JSON.stringify({ score: 0.81 }),
          bands: JSON.stringify({ damages: 'medium' }),
        },
      ],
    } as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([
      {
        id: 'att-1',
        name: 'Ari Attorney',
        email: 'ari@example.com',
        isActive: true,
        isVerified: true,
        specialties: JSON.stringify(['auto_accident']),
        responseTimeHours: 6,
        averageRating: 4.9,
        totalReviews: 24,
        attorneyProfile: {
          subscriptionTier: 'premium',
          pricingModel: 'contingency',
          paymentModel: 'post_settlement',
          jurisdictions: JSON.stringify([{ state: 'CA' }]),
          excludedCaseTypes: null,
          minInjurySeverity: 'minor',
          minDamagesRange: null,
          maxDamagesRange: null,
          maxCasesPerWeek: 10,
          maxCasesPerMonth: 40,
          successRate: 0.8,
          averageSettlement: 45000,
          totalCases: 120,
          yearsExperience: 12,
        },
      },
      {
        id: 'att-2',
        name: 'Bea Barrister',
        email: 'bea@example.com',
        isActive: true,
        isVerified: true,
        specialties: JSON.stringify(['auto_accident']),
        responseTimeHours: 8,
        averageRating: 4.7,
        totalReviews: 18,
        attorneyProfile: {
          subscriptionTier: 'standard',
          pricingModel: 'contingency',
          paymentModel: 'post_settlement',
          jurisdictions: JSON.stringify([{ state: 'CA' }]),
          excludedCaseTypes: null,
          minInjurySeverity: 'minor',
          minDamagesRange: null,
          maxDamagesRange: null,
          maxCasesPerWeek: 8,
          maxCasesPerMonth: 30,
          successRate: 0.74,
          averageSettlement: 38000,
          totalCases: 90,
          yearsExperience: 9,
        },
      },
    ] as any)
    routeCaseToAttorneys.mockResolvedValue({
      eligible: [{ id: 'att-1' }, { id: 'att-2' }],
      qualified: [{ id: 'att-1' }, { id: 'att-2' }],
      scored: [
        {
          attorney: { id: 'att-2' },
          score: {
            overall: 0.9123,
            fitScore: 0.88,
            outcomeScore: 0.9,
            trustScore: 0.95,
            valueScore: 0.78,
            breakdown: { fit: { venue: 1 } },
          },
        },
        {
          attorney: { id: 'att-1' },
          score: {
            overall: 0.8456,
            fitScore: 0.82,
            outcomeScore: 0.84,
            trustScore: 0.89,
            valueScore: 0.73,
            breakdown: { fit: { venue: 0.9 } },
          },
        },
      ],
      stats: {
        total: 2,
        eligible: 2,
        qualified: 2,
        scored: 2,
      },
    })

    const res = await request(app)
      .get('/v1/admin/cases/asm-1/recommendations?limit=1')
      .set('Authorization', 'Bearer admin')
      .expect(200)

    expect(res.body).toEqual({
      caseId: 'asm-1',
      eligibleCount: 2,
      qualifiedCount: 2,
      stats: {
        total: 2,
        eligible: 2,
        qualified: 2,
        scored: 2,
      },
      recommendations: [
        {
          rank: 1,
          attorney: {
            id: 'att-2',
            name: 'Bea Barrister',
            email: 'bea@example.com',
            isVerified: true,
            responseTimeHours: 8,
            averageRating: 4.7,
            totalReviews: 18,
            verifiedReviewCount: 0,
            subscriptionTier: 'standard',
          },
          matchScore: {
            overall: 0.91,
            fitScore: 0.88,
            outcomeScore: 0.9,
            trustScore: 0.95,
            valueScore: 0.78,
          },
          breakdown: { fit: { venue: 1 } },
        },
      ],
    })

    expect(vi.mocked(prisma.assessment.findUnique).mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'asm-1' },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        facts: true,
        predictions: {
          take: 1,
          select: { viability: true, bands: true },
        },
      },
    })
    expect(vi.mocked(prisma.attorney.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isVerified: true,
        specialties: true,
        responseTimeHours: true,
        averageRating: true,
        totalReviews: true,
        attorneyProfile: {
          select: {
            subscriptionTier: true,
            pricingModel: true,
            paymentModel: true,
            jurisdictions: true,
            excludedCaseTypes: true,
            minInjurySeverity: true,
            minDamagesRange: true,
            maxDamagesRange: true,
            maxCasesPerWeek: true,
            maxCasesPerMonth: true,
            successRate: true,
            averageSettlement: true,
            totalCases: true,
            yearsExperience: true,
          },
        },
      },
    })
    expect(routeCaseToAttorneys).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'att-1',
          subscriptionTier: 'premium',
          pricingModel: 'contingency',
          paymentModel: 'post_settlement',
        }),
      ]),
      expect.objectContaining({
        id: 'asm-1',
        claimType: 'auto_accident',
        venueState: 'CA',
      }),
    )
  })

  it('GET /v1/firm-dashboard returns aggregated firm metrics', async () => {
    vi.mocked(prisma.billingPayment.findMany).mockResolvedValue([
      {
        amount: 20000,
        assessment: {
          leadSubmission: { assignedAttorneyId: 'attorney-record-1' },
          introductions: [{ attorneyId: 'attorney-record-1' }],
        },
      },
      {
        amount: 4000,
        assessment: {
          leadSubmission: { assignedAttorneyId: 'attorney-record-2' },
          introductions: [{ attorneyId: 'attorney-record-2' }],
        },
      },
    ] as any)
    vi.mocked((prisma as any).lawFirm.findUnique).mockResolvedValue({
      id: 'firm-1',
      name: 'Firm One',
      slug: 'firm-one',
      primaryEmail: 'firm@example.com',
      phone: '555-1111',
      website: 'https://firm.example.com',
      address: '1 Main St',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90001',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      attorneys: [
        {
          id: 'attorney-record-1',
          name: 'Ari Attorney',
          email: 'attorney@example.com',
          isVerified: true,
          responseTimeHours: 12,
          attorneyProfile: {
            averageRating: 4.5,
            totalReviews: 8,
            subscriptionTier: 'premium',
            specialties: JSON.stringify(['auto']),
            jurisdictions: JSON.stringify([{ state: 'CA' }]),
          },
          dashboard: {
            totalLeadsReceived: 10,
            totalLeadsAccepted: 4,
            totalPlatformSpend: 5000,
          },
        },
        {
          id: 'attorney-record-2',
          name: 'Bea Barrister',
          email: 'bea@example.com',
          isVerified: false,
          responseTimeHours: 24,
          attorneyProfile: {
            averageRating: 3.5,
            totalReviews: 2,
            subscriptionTier: null,
            specialties: JSON.stringify(['slip_and_fall']),
            jurisdictions: JSON.stringify([{ state: 'NV' }]),
          },
          dashboard: {
            totalLeadsReceived: 5,
            totalLeadsAccepted: 1,
            totalPlatformSpend: 2000,
          },
        },
      ],
    } as any)

    const res = await request(app)
      .get('/v1/firm-dashboard')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body.metrics).toMatchObject({
      attorneyCount: 2,
      totalLeadsReceived: 15,
      totalLeadsAccepted: 5,
      feesCollectedFromPayments: 24000,
      totalPlatformSpend: 7000,
      totalReviews: 10,
    })
    expect(res.body.metrics.firmROI).toBeCloseTo(24000 / 7000)
    expect(res.body.attorneys[0].dashboard.feesCollectedFromPayments).toBe(20000)
    expect(res.body.attorneys[1].dashboard.feesCollectedFromPayments).toBe(4000)
    expect(res.body.attorneys[0].specialties).toEqual(['auto'])
    expect(vi.mocked(prisma.billingPayment.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: {
        assessment: {
          OR: [
            { leadSubmission: { assignedAttorneyId: { in: ['attorney-record-1', 'attorney-record-2'] } } },
            { introductions: { some: { attorneyId: { in: ['attorney-record-1', 'attorney-record-2'] } } } },
          ],
        },
      },
    })
  })

  it('POST /v1/firm-dashboard/attorneys validates required specialties', async () => {
    const res = await request(app)
      .post('/v1/firm-dashboard/attorneys')
      .set('Authorization', 'Bearer attorney')
      .send({
        email: 'newlawyer@example.com',
        venues: ['CA'],
        jurisdictions: [{ state: 'CA' }],
        specialties: [],
      })
      .expect(400)

    expect(res.body.error).toMatch(/specialty/i)
    expect(prisma.attorney.create).not.toHaveBeenCalled()
  })

  it('GET /v1/attorney-dashboard/dashboard splits capped recent leads from lean pipeline data', async () => {
    vi.mocked(prisma.attorney.findUnique).mockImplementation(async (args: any) => {
      if (args?.where?.email === 'attorney@example.com') {
        return {
          id: 'attorney-record-1',
          email: 'attorney@example.com',
          name: 'Ari Attorney',
        } as any
      }
      if (args?.where?.id === 'attorney-record-1') {
        return {
          id: 'attorney-record-1',
          email: 'attorney@example.com',
          name: 'Ari Attorney',
          attorneyProfile: {
            averageRating: 4.5,
            totalReviews: 8,
            subscriptionTier: 'premium',
          },
        } as any
      }
      return null
    })
    vi.mocked(prisma.attorneyDashboard.findUnique).mockResolvedValue({
      id: 'dash-1',
      attorneyId: 'attorney-record-1',
      totalPlatformSpend: 4000,
    } as any)
    vi.mocked(prisma.billingPayment.aggregate).mockResolvedValue({
      _sum: {
        amount: 27500,
      },
    } as any)
    vi.mocked(prisma.leadSubmission.findMany)
      .mockResolvedValueOnce([
        {
          id: 'lead-1',
          assessmentId: 'asm-1',
          status: 'submitted',
          submittedAt: new Date('2026-04-04T00:00:00Z'),
          updatedAt: new Date('2026-04-04T00:00:00Z'),
          viabilityScore: 0.7,
          isExclusive: true,
          hotnessLevel: 'hot',
          evidenceChecklist: JSON.stringify({ required: [{ uploaded: true }] }),
          contactAttempts: [],
          conflictChecks: [],
          qualityReports: [],
          documentRequests: [],
          assessment: {
            id: 'asm-1',
            claimType: 'auto',
            facts: JSON.stringify({ incident: { date: '2025-01-01' } }),
            predictions: [],
            evidenceFiles: [],
            files: [],
            user: { firstName: 'Pat', lastName: 'Plaintiff', email: 'plaintiff@example.com', phone: '555' },
          },
        },
      ] as any)
      .mockResolvedValueOnce([
        {
          id: 'lead-1',
          assessmentId: 'asm-1',
          status: 'submitted',
          submittedAt: new Date('2026-04-04T00:00:00Z'),
          updatedAt: new Date('2026-04-04T00:00:00Z'),
          lastContactAt: null,
          contactAttempts: [],
          documentRequests: [],
          assessment: {
            predictions: [],
          },
        },
      ] as any)
    vi.mocked(prisma.leadSubmission.count).mockResolvedValue(1 as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/dashboard')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body.recentLeads).toHaveLength(1)
    expect(res.body.activeCases.matched).toBe(1)
    expect(res.body.dashboard.feesCollectedFromPayments).toBe(27500)
    expect(res.body.dashboard.totalPlatformSpend).toBe(4000)
    expect(res.body.analytics.roi).toBe(6.875)
    expect(prisma.leadSubmission.findMany).toHaveBeenCalledTimes(2)
    expect(vi.mocked(prisma.billingPayment.aggregate).mock.calls[0]?.[0]).toMatchObject({
      where: {
        assessment: {
          leadSubmission: {
            is: {
              OR: [
                { assignedAttorneyId: 'attorney-record-1' },
                {
                  assessment: {
                    introductions: {
                      some: { attorneyId: 'attorney-record-1' },
                    },
                  },
                },
              ],
            },
          },
        },
      },
      _sum: {
        amount: true,
      },
    })
    expect(vi.mocked(prisma.leadSubmission.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: {
        OR: [
          { assignedAttorneyId: 'attorney-record-1' },
          {
            assessment: {
              introductions: {
                some: { attorneyId: 'attorney-record-1' },
              },
            },
          },
        ],
      },
      orderBy: { submittedAt: 'desc' },
      take: 100,
      include: expect.objectContaining({
        assessment: expect.any(Object),
        contactAttempts: { where: { attorneyId: 'attorney-record-1' } },
        conflictChecks: { where: { attorneyId: 'attorney-record-1' } },
        documentRequests: { where: { attorneyId: 'attorney-record-1', status: 'pending' } },
      }),
    })
    expect(vi.mocked(prisma.leadSubmission.findMany).mock.calls[1]?.[0]).toMatchObject({
      where: {
        OR: [
          { assignedAttorneyId: 'attorney-record-1' },
          {
            assessment: {
              introductions: {
                some: { attorneyId: 'attorney-record-1' },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        assessmentId: true,
        status: true,
        submittedAt: true,
        updatedAt: true,
        lastContactAt: true,
        contactAttempts: {
          where: { attorneyId: 'attorney-record-1' },
          select: { completedAt: true, createdAt: true },
        },
        documentRequests: {
          where: { attorneyId: 'attorney-record-1', status: 'pending' },
          select: { id: true },
        },
        assessment: {
          select: {
            predictions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { viability: true, bands: true },
            },
          },
        },
      },
    })
  })

  it('GET /v1/attorney-profile/performance uses payment aggregates for financial metrics', async () => {
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue({
      id: 'attorney-record-1',
      email: 'attorney@example.com',
      name: 'Ari Attorney',
    } as any)
    vi.mocked(prisma.attorneyDashboard.findUnique).mockResolvedValue({
      attorneyId: 'attorney-record-1',
      totalPlatformSpend: 4000,
    } as any)
    vi.mocked(prisma.leadAnalytics.findMany).mockResolvedValue([
      {
        totalLeads: 12,
        leadsAccepted: 6,
        leadsConverted: 2,
        totalFees: 1000,
      },
    ] as any)
    vi.mocked(prisma.attorneyReview.findMany).mockResolvedValue([
      { rating: 5, user: { firstName: 'Pat', lastName: 'Plaintiff' } },
      { rating: 3, user: { firstName: 'Sam', lastName: 'Client' } },
    ] as any)
    vi.mocked(prisma.billingPayment.aggregate).mockResolvedValue({
      _sum: {
        amount: 15000,
      },
    } as any)

    const res = await request(app)
      .get('/v1/attorney-profile/performance?period=monthly&startDate=2026-04-01T00:00:00.000Z&endDate=2026-04-30T23:59:59.999Z')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body.financialMetrics).toMatchObject({
      feesCollectedFromPayments: 15000,
      averageFee: 7500,
      platformSpend: 4000,
      roi: 3.75,
    })
    expect(vi.mocked(prisma.billingPayment.aggregate).mock.calls[0]?.[0]).toMatchObject({
      where: {
        assessment: {
          leadSubmission: {
            is: {
              OR: [
                { assignedAttorneyId: 'attorney-record-1' },
                {
                  assessment: {
                    introductions: {
                      some: { attorneyId: 'attorney-record-1' },
                    },
                  },
                },
              ],
            },
          },
        },
        receivedAt: {
          gte: new Date('2026-04-01T00:00:00.000Z'),
          lte: new Date('2026-04-30T23:59:59.999Z'),
        },
      },
      _sum: {
        amount: true,
      },
    })
  })

  it('GET /v1/attorney-dashboard/appointments returns compact calendar payload', async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: 'apt-1',
        assessmentId: 'asm-1',
        scheduledAt: new Date('2026-04-08T15:00:00.000Z'),
        type: 'consult',
        duration: 45,
        status: 'SCHEDULED',
        notes: 'Bring records',
        meetingUrl: 'https://meet.example.com/apt-1',
        location: 'Remote',
        phoneNumber: '555-0000',
        assessment: {
          claimType: 'auto',
          user: { firstName: 'Pat', lastName: 'Plaintiff' },
        },
      },
    ] as any)
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValueOnce([
      { id: 'lead-1', assessmentId: 'asm-1' },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/appointments?from=2026-04-01T00:00:00.000Z&to=2026-04-30T23:59:59.999Z')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toMatchObject({
      events: [
        {
          id: 'apt-1',
          leadId: 'lead-1',
          assessmentId: 'asm-1',
          type: 'consult',
          duration: 45,
          status: 'SCHEDULED',
          notes: 'Bring records',
          meetingUrl: 'https://meet.example.com/apt-1',
          location: 'Remote',
          phoneNumber: '555-0000',
          plaintiffName: 'Pat Plaintiff',
          claimType: 'auto',
        },
      ],
    })
    expect(vi.mocked(prisma.appointment.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: {
        attorneyId: 'attorney-record-1',
        assessmentId: { not: null },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        assessmentId: true,
        scheduledAt: true,
        type: true,
        duration: true,
        status: true,
        notes: true,
        meetingUrl: true,
        location: true,
        phoneNumber: true,
        assessment: {
          select: {
            claimType: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })
    expect(vi.mocked(prisma.leadSubmission.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: { in: ['asm-1'] } },
      select: { id: true, assessmentId: true },
    })
  })

  it('GET /v1/attorney-dashboard/document-requests returns compact request payload', async () => {
    vi.mocked(prisma.documentRequest.findMany).mockResolvedValue([
      {
        id: 'docreq-1',
        leadId: 'lead-1',
        status: 'pending',
        requestedDocs: '["medical_records","photos"]',
        customMessage: 'Please upload what you have.',
        uploadLink: 'https://uploads.example.com/docreq-1',
        attorneyViewedAt: null,
        lastNudgeAt: new Date('2026-04-10T10:00:00.000Z'),
        createdAt: new Date('2026-04-09T09:00:00.000Z'),
        lead: {
          id: 'lead-1',
          assessment: { claimType: 'slip_and_fall' },
        },
      },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/document-requests')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toEqual([
      {
        id: 'docreq-1',
        leadId: 'lead-1',
        status: 'pending',
        requestedDocs: ['medical_records', 'photos'],
        customMessage: 'Please upload what you have.',
        uploadLink: 'https://uploads.example.com/docreq-1',
        attorneyViewedAt: null,
        lastNudgeAt: '2026-04-10T10:00:00.000Z',
        createdAt: '2026-04-09T09:00:00.000Z',
        claimType: 'slip_and_fall',
      },
    ])
    expect(vi.mocked(prisma.documentRequest.findMany).mock.calls[0]?.[0]).toEqual({
      where: { attorneyId: 'attorney-record-1' },
      select: {
        id: true,
        leadId: true,
        status: true,
        requestedDocs: true,
        customMessage: true,
        uploadLink: true,
        attorneyViewedAt: true,
        lastNudgeAt: true,
        createdAt: true,
        lead: {
          select: {
            id: true,
            assessment: { select: { claimType: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  })

  it('POST /v1/attorney-dashboard/document-requests/:requestId/nudge uses compact fetch and records reminder', async () => {
    vi.mocked(prisma.documentRequest.findFirst).mockResolvedValue({
      id: 'docreq-1',
      status: 'pending',
      lastNudgeAt: null,
      uploadLink: 'https://uploads.example.com/docreq-1',
      leadId: 'lead-1',
      lead: {
        assessmentId: 'asm-1',
        assessment: {
          facts: null,
          user: {
            email: 'plaintiff@example.com',
            firstName: 'Pat',
            lastName: 'Plaintiff',
          },
        },
      },
    } as any)
    vi.mocked(prisma.documentRequest.update).mockResolvedValue({ id: 'docreq-1' } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/document-requests/docreq-1/nudge')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toEqual({ ok: true })
    expect(vi.mocked(prisma.documentRequest.findFirst).mock.calls[0]?.[0]).toEqual({
      where: { id: 'docreq-1', attorneyId: 'attorney-record-1' },
      select: {
        id: true,
        status: true,
        lastNudgeAt: true,
        uploadLink: true,
        leadId: true,
        lead: {
          select: {
            assessmentId: true,
            assessment: {
              select: {
                facts: true,
                user: { select: { email: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    })
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        type: 'email',
        recipient: 'plaintiff@example.com',
        subject: 'Reminder: documents requested for your case',
        message: expect.stringContaining('https://uploads.example.com/docreq-1'),
        metadata: JSON.stringify({
          leadId: 'lead-1',
          assessmentId: 'asm-1',
          documentRequestId: 'docreq-1',
          uploadLink: 'https://uploads.example.com/docreq-1',
          nudge: true,
        }),
        status: 'SENT',
      },
    })
    expect(prisma.documentRequest.update).toHaveBeenCalledWith({
      where: { id: 'docreq-1' },
      data: { lastNudgeAt: expect.any(Date) },
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/quality returns compact quality payload', async () => {
    vi.mocked(prisma.leadSubmission.findFirst).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      status: 'submitted',
      submittedAt: new Date('2026-04-10T10:00:00.000Z'),
      updatedAt: new Date('2026-04-10T11:00:00.000Z'),
      lastContactAt: new Date('2026-04-10T12:00:00.000Z'),
      liabilityScore: 82,
      causationScore: 79,
      damagesScore: 88,
      viabilityScore: 84,
      isExclusive: true,
      sourceType: 'referral',
      sourceDetails: JSON.stringify({ partner: 'clinic' }),
      hotnessLevel: 'hot',
      evidenceChecklist: JSON.stringify({
        required: [{ name: 'Medical Records', uploaded: true, critical: true }],
      }),
      assessment: {
        id: 'asm-1',
        claimType: 'auto',
        venueState: 'CA',
        venueCounty: 'Orange',
        facts: JSON.stringify({ incident: { date: '2025-10-01' } }),
        files: [
          {
            originalName: 'records.pdf',
            mimetype: 'application/pdf',
            createdAt: new Date('2026-04-09T09:00:00.000Z'),
          },
        ],
      },
      conflictChecks: [
        {
          id: 'conf-1',
          attorneyId: 'attorney-user-1',
          leadId: 'lead-1',
          conflictType: 'none',
          conflictDetails: null,
          riskLevel: 'low',
          isResolved: true,
          resolutionNotes: null,
          resolvedAt: null,
          createdAt: new Date('2026-04-09T10:00:00.000Z'),
          updatedAt: new Date('2026-04-09T10:00:00.000Z'),
        },
      ],
      qualityReports: [
        {
          id: 'qr-1',
          leadId: 'lead-1',
          overallQuality: 'good',
          qualityScore: 91,
          issues: JSON.stringify([]),
          isSpam: false,
          isDuplicate: false,
          reportedBy: 'system',
          reportReason: null,
          status: 'resolved',
          resolution: 'Cleared',
          creditIssued: 0,
          createdAt: new Date('2026-04-09T11:00:00.000Z'),
          updatedAt: new Date('2026-04-09T11:00:00.000Z'),
        },
      ],
    } as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/quality')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toMatchObject({
      lead: {
        id: 'lead-1',
        assessmentId: 'asm-1',
        status: 'submitted',
        viabilityScore: 84,
        assessment: {
          id: 'asm-1',
          claimType: 'auto',
          venueState: 'CA',
          venueCounty: 'Orange',
        },
      },
      qualityDetails: {
        viabilityBreakdown: {
          liability: 82,
          causation: 79,
          damages: 88,
          overall: 84,
        },
        evidenceChecklist: {
          required: [{ name: 'Medical Records', uploaded: true, critical: true }],
        },
        exclusivity: {
          isExclusive: true,
          sourceType: 'referral',
          sourceDetails: { partner: 'clinic' },
        },
        conflicts: [
          expect.objectContaining({ id: 'conf-1', conflictType: 'none' }),
        ],
        qualityReports: [
          expect.objectContaining({ id: 'qr-1', overallQuality: 'good', qualityScore: 91 }),
        ],
      },
    })
    expect(vi.mocked(prisma.leadSubmission.findFirst).mock.calls[0]?.[0]).toEqual({
      where: {
        id: 'lead-1',
        OR: [
          { assignedAttorneyId: 'attorney-user-1' },
          { assignmentType: 'shared' },
        ],
      },
      select: {
        id: true,
        assessmentId: true,
        status: true,
        submittedAt: true,
        updatedAt: true,
        lastContactAt: true,
        liabilityScore: true,
        causationScore: true,
        damagesScore: true,
        viabilityScore: true,
        isExclusive: true,
        sourceType: true,
        sourceDetails: true,
        hotnessLevel: true,
        evidenceChecklist: true,
        assessment: {
          select: {
            id: true,
            claimType: true,
            venueState: true,
            venueCounty: true,
            facts: true,
            files: {
              select: {
                originalName: true,
                mimetype: true,
                createdAt: true,
              },
            },
          },
        },
        conflictChecks: {
          where: { attorneyId: 'attorney-user-1' },
          select: {
            id: true,
            attorneyId: true,
            leadId: true,
            conflictType: true,
            conflictDetails: true,
            riskLevel: true,
            isResolved: true,
            resolutionNotes: true,
            resolvedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        qualityReports: {
          select: {
            id: true,
            leadId: true,
            overallQuality: true,
            qualityScore: true,
            issues: true,
            isSpam: true,
            isDuplicate: true,
            reportedBy: true,
            reportReason: true,
            status: true,
            resolution: true,
            creditIssued: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })
  })

  it('GET /v1/attorney-dashboard/leads/filtered skips unused dashboard lookup and returns compact lead rows', async () => {
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      {
        id: 'lead-1',
        assessmentId: 'asm-1',
        assignedAttorneyId: 'attorney-user-1',
        assignmentType: 'direct',
        status: 'submitted',
        submittedAt: new Date('2026-04-10T10:00:00.000Z'),
        updatedAt: new Date('2026-04-10T11:00:00.000Z'),
        lastContactAt: null,
        hotnessLevel: 'hot',
        liabilityScore: 80,
        causationScore: 78,
        damagesScore: 88,
        viabilityScore: 83,
        isExclusive: true,
        sourceType: 'referral',
        sourceDetails: JSON.stringify({ campaign: 'partner' }),
        evidenceChecklist: JSON.stringify({ required: [{ name: 'Photos', uploaded: true }] }),
        assessment: {
          id: 'asm-1',
          claimType: 'auto',
          venueState: 'CA',
          venueCounty: 'Orange',
          facts: JSON.stringify({ medicalBills: 15000, lostWages: 5000 }),
          files: [
            {
              originalName: 'photo.jpg',
              mimetype: 'image/jpeg',
              createdAt: new Date('2026-04-09T09:00:00.000Z'),
            },
          ],
        },
        assignedAttorney: {
          id: 'attorney-user-1',
          name: 'Ari Attorney',
          email: 'attorney@example.com',
        },
      },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/filtered?caseType=auto&minDamages=10000&page=1&limit=20')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toMatchObject({
      leads: [
        {
          id: 'lead-1',
          assessmentId: 'asm-1',
          assignmentType: 'direct',
          status: 'submitted',
          viabilityScore: 83,
          assessment: {
            id: 'asm-1',
            claimType: 'auto',
            venueState: 'CA',
            venueCounty: 'Orange',
          },
          assignedAttorney: {
            id: 'attorney-user-1',
            name: 'Ari Attorney',
            email: 'attorney@example.com',
          },
        },
      ],
      totalCount: 1,
      page: 1,
      limit: 20,
    })
    expect(prisma.attorneyDashboard.findUnique).not.toHaveBeenCalled()
    expect(vi.mocked(prisma.leadSubmission.findMany).mock.calls[0]?.[0]).toEqual({
      where: {
        OR: [
          { assignedAttorneyId: 'attorney-user-1' },
          { assignmentType: 'shared' },
        ],
        assessment: { claimType: 'auto' },
      },
      select: {
        id: true,
        assessmentId: true,
        assignedAttorneyId: true,
        assignmentType: true,
        status: true,
        submittedAt: true,
        updatedAt: true,
        lastContactAt: true,
        hotnessLevel: true,
        liabilityScore: true,
        causationScore: true,
        damagesScore: true,
        viabilityScore: true,
        isExclusive: true,
        sourceType: true,
        sourceDetails: true,
        evidenceChecklist: true,
        assessment: {
          select: {
            id: true,
            claimType: true,
            venueState: true,
            venueCounty: true,
            facts: true,
            files: {
              select: {
                originalName: true,
                mimetype: true,
                createdAt: true,
              },
            },
          },
        },
        assignedAttorney: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { hotnessLevel: 'desc' },
        { viabilityScore: 'desc' },
        { submittedAt: 'desc' },
      ],
      skip: 0,
      take: 20,
    })
  })

  it('POST /v1/attorney-dashboard/leads/:leadId/contact uses compact lookups for sms contact notifications', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValueOnce({
      id: 'attorney-record-1',
      name: 'Ari Attorney',
    } as any)
    vi.mocked(prisma.leadContact.create).mockResolvedValue({
      id: 'contact-1',
      leadId: 'lead-1',
      attorneyId: 'attorney-record-1',
      contactType: 'sms',
      contactMethod: 'sms',
      scheduledAt: null,
      notes: 'Checking in on your case',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      assessmentId: 'asm-1',
      assessment: {
        userId: 'plaintiff-user-1',
        facts: null,
        user: {
          id: 'plaintiff-user-1',
          email: 'plaintiff@example.com',
          firstName: 'Pat',
          lastName: 'Plaintiff',
        },
      },
    } as any)
    vi.mocked(prisma.chatRoom.findUnique).mockResolvedValue({
      id: 'room-1',
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/contact')
      .set('Authorization', 'Bearer attorney')
      .send({
        contactType: 'sms',
        contactMethod: 'sms',
        notes: 'Checking in on your case',
      })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'contact-1',
      leadId: 'lead-1',
      attorneyId: 'attorney-record-1',
      contactType: 'sms',
    })
    expect(vi.mocked(prisma.attorney.findFirst).mock.calls[0]?.[0]).toEqual({
      where: { email: 'attorney@example.com' },
      select: {
        id: true,
        name: true,
      },
    })
    expect(vi.mocked(prisma.leadSubmission.findUnique).mock.calls[0]?.[0]).toEqual({
      where: { id: 'lead-1' },
      select: {
        assessmentId: true,
        assessment: {
          select: {
            userId: true,
            facts: true,
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    })
    expect(prisma.leadSubmission.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: {
        lastContactAt: expect.any(Date),
        status: 'contacted',
      },
    })
    expect(vi.mocked(prisma.chatRoom.findUnique).mock.calls[0]?.[0]).toEqual({
      where: {
        userId_attorneyId: { userId: 'plaintiff-user-1', attorneyId: 'attorney-record-1' },
      },
      select: { id: true },
    })
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        chatRoomId: 'room-1',
        senderId: 'attorney-record-1',
        senderType: 'attorney',
        content: 'Checking in on your case',
        messageType: 'text',
      },
    })
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        type: 'email',
        recipient: 'plaintiff@example.com',
        subject: 'Message from Ari Attorney',
        message: expect.stringContaining('Checking in on your case'),
        metadata: JSON.stringify({
          leadId: 'lead-1',
          assessmentId: 'asm-1',
          contactType: 'sms',
          contactId: 'contact-1',
        }),
        status: 'SENT',
      },
    })
  })

  it('POST /v1/attorney-dashboard/leads/:leadId/document-request uses compact plaintiff lookups', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValueOnce({
      id: 'attorney-record-1',
      email: 'attorney@example.com',
      name: 'Ari Attorney',
      lawFirmId: 'firm-1',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.documentRequest.create).mockResolvedValue({
      id: 'docreq-1',
      leadId: 'lead-1',
      attorneyId: 'attorney-record-1',
      status: 'pending',
    } as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      userId: 'plaintiff-user-1',
      facts: null,
      user: {
        id: 'plaintiff-user-1',
        email: 'plaintiff@example.com',
        firstName: 'Pat',
        lastName: 'Plaintiff',
      },
    } as any)
    vi.mocked(prisma.chatRoom.findUnique).mockResolvedValue({
      id: 'room-1',
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/document-request')
      .set('Authorization', 'Bearer attorney')
      .send({
        requestedDocs: ['medical_records'],
        customMessage: 'Please upload recent treatment records.',
      })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'docreq-1',
      leadId: 'lead-1',
      attorneyId: 'attorney-record-1',
      status: 'pending',
    })
    expect(prisma.documentRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        leadId: 'lead-1',
        attorneyId: 'attorney-record-1',
        requestedDocs: '["medical_records"]',
        customMessage: 'Please upload recent treatment records.',
        secureToken: expect.any(String),
        uploadLink: expect.stringContaining('/evidence-upload/asm-1?token='),
        status: 'pending',
      }),
    })
    expect(prisma.leadSubmission.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { lastContactAt: expect.any(Date) },
    })
    expect(vi.mocked(prisma.assessment.findUnique).mock.calls[0]?.[0]).toEqual({
      where: { id: 'asm-1' },
      select: {
        userId: true,
        facts: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })
    expect(vi.mocked(prisma.chatRoom.findUnique).mock.calls[0]?.[0]).toEqual({
      where: {
        userId_attorneyId: { userId: 'plaintiff-user-1', attorneyId: 'attorney-record-1' },
      },
      select: { id: true },
    })
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        chatRoomId: 'room-1',
        senderId: 'attorney-record-1',
        senderType: 'attorney',
        messageType: 'text',
      }),
    })
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        type: 'email',
        recipient: 'plaintiff@example.com',
        subject: 'Your attorney requested additional documents',
        message: expect.stringContaining('Please upload recent treatment records.'),
        metadata: expect.any(String),
        status: 'SENT',
      },
    })
  })

  it('POST /v1/attorney-dashboard/leads/:leadId/schedule-consult reuses compact assessment lookup for plaintiff notification', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValueOnce({
      id: 'attorney-record-1',
      email: 'attorney@example.com',
      name: 'Ari Attorney',
      lawFirmId: 'firm-1',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      userId: 'plaintiff-user-1',
      user: {
        email: 'plaintiff@example.com',
        firstName: 'Pat',
        lastName: 'Plaintiff',
      },
    } as any)
    vi.mocked(prisma.appointment.create).mockResolvedValue({
      id: 'apt-1',
      userId: 'plaintiff-user-1',
      attorneyId: 'attorney-record-1',
      assessmentId: 'asm-1',
      type: 'video',
      status: 'SCHEDULED',
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/schedule-consult')
      .set('Authorization', 'Bearer attorney')
      .send({
        date: '2026-04-20',
        time: '2:30 PM',
        meetingType: 'video',
        notes: 'Bring any available records.',
      })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'apt-1',
      userId: 'plaintiff-user-1',
      attorneyId: 'attorney-record-1',
      assessmentId: 'asm-1',
      type: 'video',
      status: 'SCHEDULED',
    })
    expect(vi.mocked(prisma.assessment.findUnique).mock.calls[0]?.[0]).toEqual({
      where: { id: 'asm-1' },
      select: {
        userId: true,
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    })
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
    expect(prisma.leadSubmission.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: {
        status: 'consulted',
        lastContactAt: expect.any(Date),
        lifecycleState: 'consultation_scheduled',
      },
    })
    expect(prisma.leadContact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        leadId: 'lead-1',
        attorneyId: 'attorney-record-1',
        contactType: 'consult',
        contactMethod: 'scheduled',
        notes: 'Bring any available records.',
        status: 'sent',
      }),
    })
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        type: 'email',
        recipient: 'plaintiff@example.com',
        subject: 'Your consultation has been scheduled',
        message: expect.stringContaining('Bring any available records.'),
        metadata: expect.any(String),
        status: 'SENT',
      },
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/contacts returns compact contact history payload', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValueOnce({
      id: 'attorney-record-1',
    } as any)
    vi.mocked(prisma.leadContact.findMany).mockResolvedValue([
      {
        id: 'lc-1',
        leadId: 'lead-1',
        attorneyId: 'attorney-record-1',
        contactType: 'consult',
        contactMethod: 'scheduled',
        status: 'sent',
        scheduledAt: new Date('2026-04-20T21:30:00.000Z'),
        completedAt: null,
        notes: 'Consultation booked.',
        createdAt: new Date('2026-04-10T10:00:00.000Z'),
        updatedAt: new Date('2026-04-10T10:05:00.000Z'),
      },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/contacts')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toMatchObject([
      {
        id: 'lc-1',
        leadId: 'lead-1',
        attorneyId: 'attorney-record-1',
        contactType: 'consult',
        contactMethod: 'scheduled',
        status: 'sent',
        notes: 'Consultation booked.',
      },
    ])
    expect(vi.mocked(prisma.attorney.findFirst).mock.calls[0]?.[0]).toEqual({
      where: { email: 'attorney@example.com' },
      select: { id: true },
    })
    expect(vi.mocked(prisma.leadContact.findMany).mock.calls[0]?.[0]).toEqual({
      where: {
        leadId: 'lead-1',
        attorneyId: 'attorney-record-1',
      },
      select: {
        id: true,
        leadId: true,
        attorneyId: true,
        contactType: true,
        contactMethod: true,
        status: true,
        scheduledAt: true,
        completedAt: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('GET /v1/attorney-dashboard/case-contacts returns compact case contact list payload', async () => {
    vi.mocked(prisma.caseContact.findMany).mockResolvedValue([
      {
        id: 'cc-1',
        leadId: 'lead-1',
        attorneyId: 'attorney-record-1',
        firstName: 'Alex',
        lastName: 'Adjuster',
        email: 'alex@example.com',
        phone: '555-1111',
        companyName: 'Carrier Co',
        companyUrl: 'https://carrier.example.com',
        title: 'Adjuster',
        contactType: 'adjuster',
        notes: 'Primary adjuster',
        createdAt: new Date('2026-04-11T10:00:00.000Z'),
        updatedAt: new Date('2026-04-11T10:00:00.000Z'),
        lead: {
          id: 'lead-1',
          assessment: {
            claimType: 'auto',
            venueCounty: 'Orange',
            venueState: 'CA',
          },
        },
      },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/case-contacts')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toMatchObject([
      {
        id: 'cc-1',
        leadId: 'lead-1',
        firstName: 'Alex',
        lastName: 'Adjuster',
        contactType: 'adjuster',
        lead: {
          id: 'lead-1',
          assessment: {
            claimType: 'auto',
            venueCounty: 'Orange',
            venueState: 'CA',
          },
        },
      },
    ])
    expect(vi.mocked(prisma.caseContact.findMany).mock.calls[0]?.[0]).toEqual({
      where: { attorneyId: 'attorney-record-1' },
      select: {
        id: true,
        leadId: true,
        attorneyId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyName: true,
        companyUrl: true,
        title: true,
        contactType: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        lead: {
          select: {
            id: true,
            assessment: {
              select: { claimType: true, venueCounty: true, venueState: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/case-contacts returns compact lead-scoped case contacts', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValueOnce({
      id: 'attorney-record-1',
      email: 'attorney@example.com',
      name: 'Ari Attorney',
      lawFirmId: 'firm-1',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.caseContact.findMany).mockResolvedValue([
      {
        id: 'cc-2',
        leadId: 'lead-1',
        attorneyId: 'attorney-record-1',
        firstName: 'Wendy',
        lastName: 'Witness',
        email: null,
        phone: '555-2222',
        companyName: null,
        companyUrl: null,
        title: 'Witness',
        contactType: 'witness',
        notes: 'Saw the incident.',
        createdAt: new Date('2026-04-11T12:00:00.000Z'),
        updatedAt: new Date('2026-04-11T12:00:00.000Z'),
      },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/case-contacts')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toMatchObject([
      {
        id: 'cc-2',
        leadId: 'lead-1',
        firstName: 'Wendy',
        lastName: 'Witness',
        contactType: 'witness',
        notes: 'Saw the incident.',
      },
    ])
    expect(vi.mocked(prisma.caseContact.findMany).mock.calls[0]?.[0]).toEqual({
      where: { leadId: 'lead-1', attorneyId: 'attorney-record-1' },
      select: {
        id: true,
        leadId: true,
        attorneyId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyName: true,
        companyUrl: true,
        title: true,
        contactType: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('POST /v1/attorney-dashboard/leads/:leadId/case-contacts returns compact created contact payload', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValueOnce({
      id: 'attorney-record-1',
      email: 'attorney@example.com',
      name: 'Ari Attorney',
      lawFirmId: 'firm-1',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.caseContact.create).mockResolvedValue({
      id: 'cc-3',
      leadId: 'lead-1',
      attorneyId: 'attorney-record-1',
      firstName: 'Maya',
      lastName: 'Medina',
      email: 'maya@example.com',
      phone: '555-3333',
      companyName: 'Clinic',
      companyUrl: 'https://clinic.example.com',
      title: 'Provider',
      contactType: 'medical_provider',
      notes: 'Treating physician',
      createdAt: new Date('2026-04-12T10:00:00.000Z'),
      updatedAt: new Date('2026-04-12T10:00:00.000Z'),
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/case-contacts')
      .set('Authorization', 'Bearer attorney')
      .send({
        firstName: ' Maya ',
        lastName: ' Medina ',
        email: ' maya@example.com ',
        phone: ' 555-3333 ',
        companyName: ' Clinic ',
        companyUrl: ' https://clinic.example.com ',
        title: ' Provider ',
        contactType: ' medical_provider ',
        notes: ' Treating physician ',
      })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 'cc-3',
      leadId: 'lead-1',
      attorneyId: 'attorney-record-1',
      firstName: 'Maya',
      lastName: 'Medina',
      contactType: 'medical_provider',
    })
    expect(prisma.caseContact.create).toHaveBeenCalledWith({
      data: {
        leadId: 'lead-1',
        attorneyId: 'attorney-record-1',
        firstName: 'Maya',
        lastName: 'Medina',
        email: 'maya@example.com',
        phone: '555-3333',
        companyName: 'Clinic',
        companyUrl: 'https://clinic.example.com',
        title: 'Provider',
        contactType: 'medical_provider',
        notes: 'Treating physician',
      },
      select: {
        id: true,
        leadId: true,
        attorneyId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyName: true,
        companyUrl: true,
        title: true,
        contactType: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('PATCH /v1/attorney-dashboard/leads/:leadId/case-contacts/:contactId returns compact updated payload', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValueOnce({
      id: 'attorney-record-1',
      email: 'attorney@example.com',
      name: 'Ari Attorney',
      lawFirmId: 'firm-1',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.caseContact.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.caseContact.findFirst).mockResolvedValue({
      id: 'cc-3',
      leadId: 'lead-1',
      attorneyId: 'attorney-record-1',
      firstName: 'Maya',
      lastName: 'Medina',
      email: null,
      phone: '555-9999',
      companyName: null,
      companyUrl: null,
      title: 'Expert',
      contactType: 'expert',
      notes: 'Updated notes',
      createdAt: new Date('2026-04-12T10:00:00.000Z'),
      updatedAt: new Date('2026-04-12T11:00:00.000Z'),
    } as any)

    const res = await request(app)
      .patch('/v1/attorney-dashboard/leads/lead-1/case-contacts/cc-3')
      .set('Authorization', 'Bearer attorney')
      .send({
        phone: ' 555-9999 ',
        title: ' Expert ',
        contactType: ' expert ',
        notes: ' Updated notes ',
        email: '',
      })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'cc-3',
      leadId: 'lead-1',
      phone: '555-9999',
      title: 'Expert',
      contactType: 'expert',
      notes: 'Updated notes',
    })
    expect(prisma.caseContact.updateMany).toHaveBeenCalledWith({
      where: { id: 'cc-3', leadId: 'lead-1', attorneyId: 'attorney-record-1' },
      data: {
        email: null,
        phone: '555-9999',
        title: 'Expert',
        contactType: 'expert',
        notes: 'Updated notes',
      },
    })
    expect(vi.mocked(prisma.caseContact.findFirst).mock.calls[0]?.[0]).toEqual({
      where: { id: 'cc-3', leadId: 'lead-1', attorneyId: 'attorney-record-1' },
      select: {
        id: true,
        leadId: true,
        attorneyId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyName: true,
        companyUrl: true,
        title: true,
        contactType: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('DELETE /v1/attorney-dashboard/leads/:leadId/case-contacts/:contactId deletes scoped case contact', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValueOnce({
      id: 'attorney-record-1',
      email: 'attorney@example.com',
      name: 'Ari Attorney',
      lawFirmId: 'firm-1',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.caseContact.deleteMany).mockResolvedValue({ count: 1 } as any)

    await request(app)
      .delete('/v1/attorney-dashboard/leads/lead-1/case-contacts/cc-3')
      .set('Authorization', 'Bearer attorney')
      .expect(204)

    expect(prisma.caseContact.deleteMany).toHaveBeenCalledWith({
      where: { id: 'cc-3', leadId: 'lead-1', attorneyId: 'attorney-record-1' },
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/evidence returns compact evidence payload after backfill check', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValueOnce({
      id: 'attorney-record-1',
      email: 'attorney@example.com',
      name: 'Ari Attorney',
      lawFirmId: 'firm-1',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      userId: 'plaintiff-user-1',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
    } as any)
    vi.mocked(prisma.evidenceFile.count).mockResolvedValue(0 as any)
    vi.mocked(prisma.evidenceFile.findMany).mockResolvedValue([
      {
        id: 'ef-1',
        userId: 'plaintiff-user-1',
        assessmentId: 'asm-1',
        originalName: 'records.pdf',
        filename: 'records.pdf',
        mimetype: 'application/pdf',
        size: 12345,
        fileUrl: '/uploads/evidence/records.pdf',
        category: 'medical_records',
        subcategory: 'records',
        description: 'Treatment notes',
        dataType: 'structured',
        processingStatus: 'completed',
        isVerified: false,
        createdAt: new Date('2026-04-11T10:00:00.000Z'),
        updatedAt: new Date('2026-04-11T10:05:00.000Z'),
      },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/evidence')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toMatchObject([
      {
        id: 'ef-1',
        userId: 'plaintiff-user-1',
        assessmentId: 'asm-1',
        originalName: 'records.pdf',
        fileUrl: '/uploads/evidence/records.pdf',
        category: 'medical_records',
        processingStatus: 'completed',
      },
    ])
    expect(prisma.evidenceFile.updateMany).toHaveBeenCalledWith({
      where: {
        assessmentId: null,
        userId: 'plaintiff-user-1',
        createdAt: { gte: new Date('2026-03-25T00:00:00.000Z') },
      },
      data: { assessmentId: 'asm-1' },
    })
    expect(vi.mocked(prisma.evidenceFile.findMany).mock.calls[0]?.[0]).toEqual({
      where: {
        OR: [
          { assessmentId: 'asm-1' },
          { userId: 'plaintiff-user-1' },
        ],
      },
      select: {
        id: true,
        userId: true,
        assessmentId: true,
        originalName: true,
        filename: true,
        mimetype: true,
        size: true,
        fileUrl: true,
        category: true,
        subcategory: true,
        description: true,
        dataType: true,
        processingStatus: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('POST /v1/attorney-dashboard/leads/:leadId/evidence returns compact uploaded evidence payload', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValueOnce({
      id: 'attorney-record-1',
      email: 'attorney@example.com',
      name: 'Ari Attorney',
      lawFirmId: 'firm-1',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'direct',
      assignedAttorneyId: 'attorney-record-1',
      status: 'accepted',
    } as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      userId: 'plaintiff-user-1',
    } as any)
    vi.mocked(prisma.evidenceFile.create).mockResolvedValue({
      id: 'ef-2',
      userId: 'plaintiff-user-1',
      assessmentId: 'asm-1',
      originalName: 'report.pdf',
      filename: 'upload-123.pdf',
      mimetype: 'application/pdf',
      size: 12,
      fileUrl: '/uploads/evidence/upload-123.pdf',
      category: 'medical_records',
      subcategory: null,
      description: 'Recent provider report',
      dataType: 'structured',
      processingStatus: 'pending',
      isVerified: false,
      createdAt: new Date('2026-04-12T10:00:00.000Z'),
      updatedAt: new Date('2026-04-12T10:00:00.000Z'),
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/evidence')
      .set('Authorization', 'Bearer attorney')
      .field('category', 'medical_records')
      .field('description', 'Recent provider report')
      .attach('file', Buffer.from('test-pdf-data'), 'report.pdf')
      .expect(201)

    expect(res.body).toMatchObject({
      id: 'ef-2',
      userId: 'plaintiff-user-1',
      assessmentId: 'asm-1',
      originalName: 'report.pdf',
      filename: 'upload-123.pdf',
      fileUrl: '/uploads/evidence/upload-123.pdf',
      category: 'medical_records',
      description: 'Recent provider report',
      dataType: 'structured',
      processingStatus: 'pending',
      isVerified: false,
    })
    expect(prisma.evidenceFile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'plaintiff-user-1',
        assessmentId: 'asm-1',
        originalName: 'report.pdf',
        category: 'medical_records',
        description: 'Recent provider report',
        dataType: 'structured',
        processingStatus: 'pending',
      }),
      select: {
        id: true,
        userId: true,
        assessmentId: true,
        originalName: true,
        filename: true,
        mimetype: true,
        size: true,
        fileUrl: true,
        category: true,
        subcategory: true,
        description: true,
        dataType: true,
        processingStatus: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    expect(prisma.evidenceProcessingJob.create).toHaveBeenCalledWith({
      data: {
        evidenceFileId: 'ef-2',
        jobType: 'full_processing',
        status: 'queued',
        priority: 5,
      },
    })
    expect(prisma.evidenceAccessLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        evidenceFileId: 'ef-2',
        accessedBy: 'attorney-user-1',
        accessType: 'upload',
        purpose: 'Attorney upload to case',
      }),
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/medical-chronology uses compact assessment evidence query', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValueOnce({
      id: 'attorney-record-1',
      email: 'attorney@example.com',
      name: 'Ari Attorney',
      lawFirmId: 'firm-1',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      facts: JSON.stringify({
        incident: { date: '2026-01-01', timeline: [{ label: 'Crash scene' }] },
        treatment: [{ provider: 'Clinic', type: 'ER Visit', date: '2026-01-02', notes: 'Initial exam' }],
      }),
      evidenceFiles: [
        {
          id: 'ef-1',
          category: 'medical_records',
          originalName: 'records.pdf',
          createdAt: new Date('2026-01-03T00:00:00.000Z'),
          aiSummary: 'ER intake',
          extractedData: [
            { dates: JSON.stringify(['2026-01-02']), timeline: 'Initial evaluation', totalAmount: 1200 },
          ],
        },
      ],
    } as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/medical-chronology')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body.chronology).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'incident', label: 'Crash scene' }),
        expect.objectContaining({ source: 'treatment', label: 'ER Visit', provider: 'Clinic' }),
        expect.objectContaining({ source: 'medical_record', label: 'records.pdf', amount: 1200 }),
      ])
    )
    expect(vi.mocked(prisma.assessment.findUnique).mock.calls[0]?.[0]).toEqual({
      where: { id: 'asm-1' },
      select: {
        facts: true,
        evidenceFiles: {
          select: {
            id: true,
            category: true,
            originalName: true,
            createdAt: true,
            aiSummary: true,
            extractedData: {
              take: 1,
              select: {
                dates: true,
                timeline: true,
                totalAmount: true,
              },
            },
          },
        },
      },
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/case-preparation uses compact readiness query', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValueOnce({
      id: 'attorney-record-1',
      email: 'attorney@example.com',
      name: 'Ari Attorney',
      lawFirmId: 'firm-1',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      facts: JSON.stringify({
        consents: { hipaa: false },
        liability: { confidence: 8 },
        damages: { med_charges: 5000 },
        injuries: [{ description: 'Whiplash' }],
        treatment: [{ date: '2026-01-01' }, { date: '2026-02-15' }],
      }),
      claimType: 'auto',
      evidenceFiles: [{ category: 'medical_records' }],
      predictions: [{ id: 'pred-1' }],
    } as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/case-preparation')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toMatchObject({
      missingDocs: expect.arrayContaining([
        expect.objectContaining({ key: 'bills' }),
        expect.objectContaining({ key: 'police_report' }),
        expect.objectContaining({ key: 'photos' }),
        expect.objectContaining({ key: 'hipaa' }),
      ]),
      treatmentGaps: [
        expect.objectContaining({ startDate: '2026-01-01', endDate: '2026-02-15', gapDays: 45 }),
      ],
      strengths: expect.arrayContaining(['Strong liability evidence', 'Documented medical expenses', 'Injuries documented']),
      weaknesses: expect.arrayContaining([
        expect.stringContaining('missing document'),
        expect.stringContaining('treatment gap'),
      ]),
    })
    expect(vi.mocked(prisma.assessment.findUnique).mock.calls[0]?.[0]).toEqual({
      where: { id: 'asm-1' },
      select: {
        facts: true,
        claimType: true,
        evidenceFiles: {
          select: {
            category: true,
          },
        },
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
          },
        },
      },
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/settlement-benchmarks uses compact benchmark queries', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValueOnce({
      id: 'attorney-record-1',
      email: 'attorney@example.com',
      name: 'Ari Attorney',
      lawFirmId: 'firm-1',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      facts: JSON.stringify({ damages: { med_charges: 5000 } }),
      claimType: 'auto',
      venueState: 'CA',
      predictions: [
        {
          explain: JSON.stringify({ injury_severity: 2 }),
          bands: JSON.stringify({ low: [15000, 30000] }),
        },
      ],
    } as any)
    vi.mocked(prisma.settlementRecord.findMany).mockResolvedValue([
      { settlementAmount: 10000 },
      { settlementAmount: 20000 },
      { settlementAmount: 30000 },
      { settlementAmount: 40000 },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/settlement-benchmarks')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toMatchObject({
      benchmarks: {
        claimType: 'auto',
        venueState: 'CA',
        injurySeverity: 2,
        p25: 20000,
        p50: 30000,
        p75: 40000,
        p90: 40000,
        count: 4,
        yourCaseContext: {
          medCharges: 5000,
          predictedRange: [15000, 30000],
        },
      },
    })
    expect(vi.mocked(prisma.assessment.findUnique).mock.calls[0]?.[0]).toEqual({
      where: { id: 'asm-1' },
      select: {
        facts: true,
        claimType: true,
        venueState: true,
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            explain: true,
            bands: true,
          },
        },
      },
    })
    expect(vi.mocked(prisma.settlementRecord.findMany).mock.calls[0]?.[0]).toEqual({
      where: {
        claimType: 'auto',
        venueState: 'CA',
        injurySeverity: 2,
      },
      orderBy: { settlementAmount: 'asc' },
      select: { settlementAmount: true },
    })
  })

  it('POST /v1/attorney-dashboard/leads/:leadId/health parallelizes compact health inputs', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValueOnce({
      id: 'attorney-record-1',
      email: 'attorney@example.com',
      name: 'Ari Attorney',
      lawFirmId: 'firm-1',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique)
      .mockResolvedValueOnce({
        id: 'lead-1',
        assessmentId: 'asm-1',
        assignmentType: 'shared',
        assignedAttorneyId: null,
      } as any)
      .mockResolvedValueOnce({
        liabilityScore: 90,
        viabilityScore: 92,
        causationScore: 88,
        damagesScore: 91,
        evidenceChecklist: JSON.stringify([
          { status: 'complete', completed: true },
          { status: 'complete', completed: true },
        ]),
        submittedAt: new Date('2026-04-01T00:00:00.000Z'),
      } as any)
    vi.mocked(prisma.evidenceFile.findMany).mockResolvedValue([
      { category: 'medical_records', createdAt: new Date('2026-04-02T00:00:00.000Z') },
      { category: 'bills', createdAt: new Date('2026-04-03T00:00:00.000Z') },
      { category: 'police_report', createdAt: new Date('2026-04-04T00:00:00.000Z') },
      { category: 'photos', createdAt: new Date('2026-04-05T00:00:00.000Z') },
    ] as any)
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      { status: 'COMPLETED', scheduledAt: new Date('2026-04-06T00:00:00.000Z') },
    ] as any)
    vi.mocked(prisma.insuranceDetail.findMany).mockResolvedValue([
      { policyLimit: 100000 },
    ] as any)
    vi.mocked(prisma.billingInvoice.findMany).mockResolvedValue([
      { amount: 1000, status: 'open', dueDate: null, createdAt: new Date('2026-04-07T00:00:00.000Z') },
    ] as any)
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      { dueDate: new Date('2099-05-01T00:00:00.000Z'), taskType: 'review', title: 'Review packet' },
    ] as any)
    vi.mocked(prisma.negotiationEvent.findMany).mockResolvedValue([
      { eventType: 'demand', amount: 50000, eventDate: new Date('2026-04-08T00:00:00.000Z'), status: 'sent', concessionValue: 0 },
      { eventType: 'offer', amount: 45000, eventDate: new Date('2026-04-10T00:00:00.000Z'), status: 'received', concessionValue: 0 },
    ] as any)
    vi.mocked(prisma.lienHolder.count).mockResolvedValue(0 as any)
    vi.mocked(prisma.leadContact.findFirst).mockResolvedValue({
      createdAt: new Date('2026-04-10T00:00:00.000Z'),
    } as any)
    vi.mocked(prisma.healthEscalationRule.findMany).mockResolvedValue([
      { threshold: 70, action: 'notify-team' },
    ] as any)
    vi.mocked(prisma.caseHealthSnapshot.create).mockResolvedValue({
      id: 'snapshot-1',
      score: 87,
      level: 'green',
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/health')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toMatchObject({
      score: expect.any(Number),
      level: 'green',
      snapshot: {
        id: 'snapshot-1',
        score: 87,
        level: 'green',
      },
    })
    expect(prisma.caseTask.count).not.toHaveBeenCalled()
    expect(prisma.negotiationEvent.findFirst).not.toHaveBeenCalled()
    expect(vi.mocked(prisma.leadContact.findFirst).mock.calls[0]?.[0]).toEqual({
      where: { leadId: 'lead-1' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    expect(vi.mocked(prisma.healthEscalationRule.findMany).mock.calls[0]?.[0]).toEqual({
      where: { attorneyId: 'attorney-record-1' },
      orderBy: { threshold: 'asc' },
      select: { threshold: true, action: true },
    })
    expect(prisma.caseHealthSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assessmentId: 'asm-1',
        score: expect.any(Number),
        level: 'green',
      }),
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/decision-intelligence returns compact decision snapshot', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
      viabilityScore: 0.82,
      liabilityScore: 0.78,
      causationScore: 0.8,
      damagesScore: 0.76,
    } as any)
    vi.mocked(prisma.evidenceFile.count).mockResolvedValue(4 as any)
    vi.mocked(prisma.attorneyDecisionProfile.findUnique).mockResolvedValue({
      id: 'profile-1',
      attorneyId: 'attorney-record-1',
      lawFirmId: 'firm-1',
      negotiationStyle: 'assertive',
      riskTolerance: 'high',
      preferences: '{"target":"value"}',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    } as any)
    vi.mocked(prisma.decisionMemory.upsert).mockResolvedValue({
      id: 'memory-1',
      leadId: 'lead-1',
      assessmentId: 'asm-1',
      attorneyId: 'attorney-record-1',
      lawFirmId: 'firm-1',
      recommendedDecision: 'accept',
      recommendedConfidence: 79,
      recommendedRationale: 'Scores avg 79% with moderate evidence (4 files). Style: assertive. Risk tolerance: high.',
      recommendedData: '{"evidenceCount":4}',
      attorneyDecision: null,
      attorneyRationale: null,
      override: false,
      decisionAt: null,
      outcomeStatus: null,
      outcomeNotes: null,
      outcomeAt: null,
      createdAt: new Date('2026-04-03T00:00:00.000Z'),
      updatedAt: new Date('2026-04-03T00:00:00.000Z'),
    } as any)
    vi.mocked(prisma.decisionMemory.findMany)
      .mockResolvedValueOnce([
        { attorneyDecision: 'accept', outcomeStatus: 'retained', attorneyRationale: 'Strong venue match' },
        { attorneyDecision: 'reject', outcomeStatus: 'lost', attorneyRationale: 'Weak treatment history' },
      ] as any)
      .mockResolvedValueOnce([
        { attorneyDecision: 'accept', outcomeStatus: 'retained' },
        { attorneyDecision: 'reject', outcomeStatus: 'lost' },
      ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/decision-intelligence')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toMatchObject({
      recommendation: {
        recommendedDecision: 'accept',
        recommendedConfidence: 79,
      },
      attorneyProfile: {
        id: 'profile-1',
        attorneyId: 'attorney-record-1',
        riskTolerance: 'high',
      },
      attorneyPatterns: {
        totalDecisions: 2,
        acceptSuccessRate: 100,
        rejectSuccessRate: 0,
      },
      memory: {
        id: 'memory-1',
        leadId: 'lead-1',
        assessmentId: 'asm-1',
      },
      firmPatterns: {
        totalDecisions: 2,
        acceptSuccessRate: 100,
        rejectSuccessRate: 0,
        recentRationales: ['Strong venue match', 'Weak treatment history'],
      },
      lastWorked: {
        outcomeStatus: 'retained',
        attorneyDecision: 'accept',
        rationale: 'Strong venue match',
      },
    })
    expect(vi.mocked(prisma.attorneyDecisionProfile.findUnique).mock.calls[0]?.[0]).toEqual({
      where: { attorneyId: 'attorney-record-1' },
      select: {
        id: true,
        attorneyId: true,
        lawFirmId: true,
        negotiationStyle: true,
        riskTolerance: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    expect(vi.mocked(prisma.decisionMemory.upsert).mock.calls[0]?.[0]).toMatchObject({
      where: { leadId: 'lead-1' },
      create: expect.objectContaining({
        leadId: 'lead-1',
        assessmentId: 'asm-1',
        attorneyId: 'attorney-record-1',
        lawFirmId: 'firm-1',
      }),
      update: expect.objectContaining({
        recommendedDecision: 'accept',
        recommendedConfidence: 79,
      }),
      select: {
        id: true,
        leadId: true,
        assessmentId: true,
        attorneyId: true,
        lawFirmId: true,
        recommendedDecision: true,
        recommendedConfidence: true,
        recommendedRationale: true,
        recommendedData: true,
        attorneyDecision: true,
        attorneyRationale: true,
        override: true,
        decisionAt: true,
        outcomeStatus: true,
        outcomeNotes: true,
        outcomeAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    expect(vi.mocked(prisma.decisionMemory.findMany).mock.calls[0]?.[0]).toEqual({
      where: { lawFirmId: 'firm-1', outcomeStatus: { not: null } },
      orderBy: { outcomeAt: 'desc' },
      take: 50,
      select: {
        attorneyDecision: true,
        outcomeStatus: true,
        attorneyRationale: true,
      },
    })
    expect(vi.mocked(prisma.decisionMemory.findMany).mock.calls[1]?.[0]).toEqual({
      where: { attorneyId: 'attorney-record-1', outcomeStatus: { not: null } },
      orderBy: { outcomeAt: 'desc' },
      take: 50,
      select: {
        attorneyDecision: true,
        outcomeStatus: true,
      },
    })
  })

  it('GET /v1/attorney-dashboard/attorney/decision-benchmark uses compact identity and parallel history queries', async () => {
    vi.mocked(prisma.decisionMemory.findMany)
      .mockResolvedValueOnce([
        { attorneyDecision: 'accept', outcomeStatus: 'retained' },
        { attorneyDecision: 'reject', outcomeStatus: 'lost' },
      ] as any)
      .mockResolvedValueOnce([
        { attorneyDecision: 'accept', outcomeStatus: 'retained', attorneyRationale: 'Strong fit' },
        { attorneyDecision: 'reject', outcomeStatus: 'lost', attorneyRationale: 'Low damages' },
      ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/attorney/decision-benchmark')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toEqual({
      attorney: {
        totalDecisions: 2,
        acceptSuccessRate: 100,
        rejectSuccessRate: 0,
      },
      firm: {
        totalDecisions: 2,
        acceptSuccessRate: 100,
        rejectSuccessRate: 0,
        recentRationales: ['Strong fit', 'Low damages'],
      },
    })
    expect(vi.mocked(prisma.attorney.findFirst).mock.calls[0]?.[0]).toEqual({
      where: { email: 'attorney@example.com' },
      select: {
        id: true,
        lawFirmId: true,
      },
    })
    expect(vi.mocked(prisma.decisionMemory.findMany).mock.calls[0]?.[0]).toEqual({
      where: { attorneyId: 'attorney-record-1', outcomeStatus: { not: null } },
      orderBy: { outcomeAt: 'desc' },
      take: 100,
      select: {
        attorneyDecision: true,
        outcomeStatus: true,
      },
    })
    expect(vi.mocked(prisma.decisionMemory.findMany).mock.calls[1]?.[0]).toEqual({
      where: { lawFirmId: 'firm-1', outcomeStatus: { not: null } },
      orderBy: { outcomeAt: 'desc' },
      take: 200,
      select: {
        attorneyDecision: true,
        outcomeStatus: true,
        attorneyRationale: true,
      },
    })
  })

  it('GET /v1/attorney-dashboard/attorney/decision-summary uses compact identity and summary history shapes', async () => {
    vi.mocked(prisma.decisionMemory.findMany)
      .mockResolvedValueOnce([
        { attorneyDecision: 'accept', outcomeStatus: 'retained', override: false, recommendedConfidence: 80, attorneyRationale: 'Strong liability' },
        { attorneyDecision: 'reject', outcomeStatus: 'lost', override: true, recommendedConfidence: 60, attorneyRationale: 'Weak causation' },
      ] as any)
      .mockResolvedValueOnce([
        { attorneyDecision: 'accept', outcomeStatus: 'retained', override: false, recommendedConfidence: 90, attorneyRationale: 'Venue fit' },
        { attorneyDecision: 'reject', outcomeStatus: null, override: true, recommendedConfidence: 50, attorneyRationale: 'Client mismatch' },
      ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/attorney/decision-summary')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toEqual({
      attorney: {
        totalDecisions: 2,
        acceptCount: 1,
        rejectCount: 1,
        overrideRate: 50,
        avgConfidence: 70,
        outcomeCounts: { retained: 1, lost: 1 },
        topRationales: ['Strong liability', 'Weak causation'],
      },
      firm: {
        totalDecisions: 2,
        acceptCount: 1,
        rejectCount: 1,
        overrideRate: 50,
        avgConfidence: 70,
        outcomeCounts: { retained: 1 },
        topRationales: ['Venue fit', 'Client mismatch'],
      },
    })
    expect(vi.mocked(prisma.attorney.findFirst).mock.calls[0]?.[0]).toEqual({
      where: { email: 'attorney@example.com' },
      select: {
        id: true,
        lawFirmId: true,
      },
    })
    expect(vi.mocked(prisma.decisionMemory.findMany).mock.calls[0]?.[0]).toEqual({
      where: { attorneyId: 'attorney-record-1' },
      orderBy: { decisionAt: 'desc' },
      take: 200,
      select: {
        attorneyDecision: true,
        outcomeStatus: true,
        override: true,
        recommendedConfidence: true,
        attorneyRationale: true,
      },
    })
    expect(vi.mocked(prisma.decisionMemory.findMany).mock.calls[1]?.[0]).toEqual({
      where: { lawFirmId: 'firm-1' },
      orderBy: { decisionAt: 'desc' },
      take: 300,
      select: {
        attorneyDecision: true,
        outcomeStatus: true,
        override: true,
        recommendedConfidence: true,
        attorneyRationale: true,
      },
    })
  })

  it('GET /v1/attorney-dashboard/attorney/decision-profile returns compact profile payload', async () => {
    vi.mocked(prisma.attorneyDecisionProfile.findUnique).mockResolvedValue({
      id: 'profile-1',
      attorneyId: 'attorney-record-1',
      lawFirmId: 'firm-1',
      negotiationStyle: 'assertive',
      riskTolerance: 'medium',
      preferences: '{"focus":"speed"}',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    } as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/attorney/decision-profile')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'profile-1',
      attorneyId: 'attorney-record-1',
      lawFirmId: 'firm-1',
      negotiationStyle: 'assertive',
      riskTolerance: 'medium',
      preferences: '{"focus":"speed"}',
    })
    expect(vi.mocked(prisma.attorney.findFirst).mock.calls[0]?.[0]).toEqual({
      where: { email: 'attorney@example.com' },
      select: {
        id: true,
        lawFirmId: true,
      },
    })
    expect(vi.mocked(prisma.attorneyDecisionProfile.findUnique).mock.calls[0]?.[0]).toEqual({
      where: { attorneyId: 'attorney-record-1' },
      select: {
        id: true,
        attorneyId: true,
        lawFirmId: true,
        negotiationStyle: true,
        riskTolerance: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('POST /v1/attorney-dashboard/attorney/decision-profile saves compact profile payload', async () => {
    vi.mocked(prisma.attorneyDecisionProfile.upsert).mockResolvedValue({
      id: 'profile-1',
      attorneyId: 'attorney-record-1',
      lawFirmId: 'firm-1',
      negotiationStyle: 'collaborative',
      riskTolerance: 'high',
      preferences: '{"focus":"value"}',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-03T00:00:00.000Z'),
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/attorney/decision-profile')
      .set('Authorization', 'Bearer attorney')
      .send({
        negotiationStyle: 'collaborative',
        riskTolerance: 'high',
        preferences: { focus: 'value' },
      })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'profile-1',
      attorneyId: 'attorney-record-1',
      lawFirmId: 'firm-1',
      negotiationStyle: 'collaborative',
      riskTolerance: 'high',
      preferences: '{"focus":"value"}',
    })
    expect(vi.mocked(prisma.attorney.findFirst).mock.calls[0]?.[0]).toEqual({
      where: { email: 'attorney@example.com' },
      select: {
        id: true,
        lawFirmId: true,
      },
    })
    expect(vi.mocked(prisma.attorneyDecisionProfile.upsert).mock.calls[0]?.[0]).toEqual({
      where: { attorneyId: 'attorney-record-1' },
      create: {
        attorneyId: 'attorney-record-1',
        lawFirmId: 'firm-1',
        negotiationStyle: 'collaborative',
        riskTolerance: 'high',
        preferences: '{"focus":"value"}',
      },
      update: {
        negotiationStyle: 'collaborative',
        riskTolerance: 'high',
        preferences: '{"focus":"value"}',
        lawFirmId: 'firm-1',
      },
      select: {
        id: true,
        attorneyId: true,
        lawFirmId: true,
        negotiationStyle: true,
        riskTolerance: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('POST /v1/attorney-dashboard/leads/:leadId/decision-intelligence/override stores compact decision memory', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
      viabilityScore: 0.82,
      liabilityScore: 0.78,
      causationScore: 0.8,
      damagesScore: 0.76,
    } as any)
    vi.mocked(prisma.evidenceFile.count).mockResolvedValue(4 as any)
    vi.mocked(prisma.attorneyDecisionProfile.findUnique).mockResolvedValue({
      id: 'profile-1',
      attorneyId: 'attorney-record-1',
      lawFirmId: 'firm-1',
      negotiationStyle: 'assertive',
      riskTolerance: 'high',
      preferences: '{"target":"value"}',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    } as any)
    vi.mocked(prisma.decisionMemory.upsert).mockResolvedValue({
      id: 'memory-override-1',
      leadId: 'lead-1',
      assessmentId: 'asm-1',
      attorneyId: 'attorney-record-1',
      lawFirmId: 'firm-1',
      recommendedDecision: 'accept',
      recommendedConfidence: 79,
      recommendedRationale: 'Scores avg 79% with moderate evidence (4 files). Style: assertive. Risk tolerance: high.',
      recommendedData: '{"evidenceCount":4}',
      attorneyDecision: 'reject',
      attorneyRationale: 'Need stronger records',
      override: true,
      decisionAt: new Date('2026-04-03T00:00:00.000Z'),
      outcomeStatus: null,
      outcomeNotes: null,
      outcomeAt: null,
      createdAt: new Date('2026-04-03T00:00:00.000Z'),
      updatedAt: new Date('2026-04-03T00:00:00.000Z'),
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/decision-intelligence/override')
      .set('Authorization', 'Bearer attorney')
      .send({
        decision: 'reject',
        rationale: 'Need stronger records',
      })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'memory-override-1',
      leadId: 'lead-1',
      attorneyDecision: 'reject',
      override: true,
    })
    expect(vi.mocked(prisma.attorneyDecisionProfile.findUnique).mock.calls[0]?.[0]).toEqual({
      where: { attorneyId: 'attorney-record-1' },
      select: {
        id: true,
        attorneyId: true,
        lawFirmId: true,
        negotiationStyle: true,
        riskTolerance: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    expect(vi.mocked(prisma.decisionMemory.upsert).mock.calls[0]?.[0]).toMatchObject({
      where: { leadId: 'lead-1' },
      create: expect.objectContaining({
        leadId: 'lead-1',
        assessmentId: 'asm-1',
        attorneyId: 'attorney-record-1',
        lawFirmId: 'firm-1',
        attorneyDecision: 'reject',
        attorneyRationale: 'Need stronger records',
        override: true,
      }),
      update: expect.objectContaining({
        attorneyDecision: 'reject',
        attorneyRationale: 'Need stronger records',
        override: true,
      }),
      select: {
        id: true,
        leadId: true,
        assessmentId: true,
        attorneyId: true,
        lawFirmId: true,
        recommendedDecision: true,
        recommendedConfidence: true,
        recommendedRationale: true,
        recommendedData: true,
        attorneyDecision: true,
        attorneyRationale: true,
        override: true,
        decisionAt: true,
        outcomeStatus: true,
        outcomeNotes: true,
        outcomeAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('PATCH /v1/attorney-dashboard/leads/:leadId/decision-intelligence/outcome stores compact outcome memory', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.decisionMemory.upsert).mockResolvedValue({
      id: 'memory-outcome-1',
      leadId: 'lead-1',
      assessmentId: 'asm-1',
      attorneyId: 'attorney-record-1',
      lawFirmId: 'firm-1',
      recommendedDecision: 'accept',
      recommendedConfidence: 50,
      recommendedRationale: null,
      recommendedData: null,
      attorneyDecision: null,
      attorneyRationale: null,
      override: false,
      decisionAt: null,
      outcomeStatus: 'retained',
      outcomeNotes: 'Signed engagement letter',
      outcomeAt: new Date('2026-04-04T00:00:00.000Z'),
      createdAt: new Date('2026-04-04T00:00:00.000Z'),
      updatedAt: new Date('2026-04-04T00:00:00.000Z'),
    } as any)

    const res = await request(app)
      .patch('/v1/attorney-dashboard/leads/lead-1/decision-intelligence/outcome')
      .set('Authorization', 'Bearer attorney')
      .send({
        outcomeStatus: 'retained',
        outcomeNotes: 'Signed engagement letter',
      })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'memory-outcome-1',
      leadId: 'lead-1',
      outcomeStatus: 'retained',
      outcomeNotes: 'Signed engagement letter',
    })
    expect(vi.mocked(prisma.decisionMemory.upsert).mock.calls[0]?.[0]).toMatchObject({
      where: { leadId: 'lead-1' },
      create: {
        leadId: 'lead-1',
        assessmentId: 'asm-1',
        attorneyId: 'attorney-record-1',
        lawFirmId: 'firm-1',
        recommendedDecision: 'accept',
        recommendedConfidence: 50,
        outcomeStatus: 'retained',
        outcomeNotes: 'Signed engagement letter',
        outcomeAt: expect.any(Date),
      },
      update: {
        outcomeStatus: 'retained',
        outcomeNotes: 'Signed engagement letter',
        outcomeAt: expect.any(Date),
      },
      select: {
        id: true,
        leadId: true,
        assessmentId: true,
        attorneyId: true,
        lawFirmId: true,
        recommendedDecision: true,
        recommendedConfidence: true,
        recommendedRationale: true,
        recommendedData: true,
        attorneyDecision: true,
        attorneyRationale: true,
        override: true,
        decisionAt: true,
        outcomeStatus: true,
        outcomeNotes: true,
        outcomeAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/insurance returns compact insurance payload', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.insuranceDetail.findMany).mockResolvedValue([
      {
        id: 'ins-1',
        assessmentId: 'asm-1',
        carrierName: 'Carrier',
        policyNumber: 'PN-1',
        policyLimit: 100000,
        adjusterName: 'Alex',
        adjusterEmail: 'alex@example.com',
        adjusterPhone: '555-1212',
        notes: 'Primary policy',
        createdAt: new Date('2026-04-10T00:00:00.000Z'),
        updatedAt: new Date('2026-04-10T00:00:00.000Z'),
      },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/insurance')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body[0]).toMatchObject({
      id: 'ins-1',
      assessmentId: 'asm-1',
      carrierName: 'Carrier',
      policyLimit: 100000,
    })
    expect(vi.mocked(prisma.insuranceDetail.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: 'asm-1' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        assessmentId: true,
        carrierName: true,
        policyNumber: true,
        policyLimit: true,
        adjusterName: true,
        adjusterEmail: true,
        adjusterPhone: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('POST /v1/attorney-dashboard/leads/:leadId/liens stores compact lien payload', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.lienHolder.create).mockResolvedValue({
      id: 'lien-1',
      assessmentId: 'asm-1',
      name: 'Hospital',
      type: 'medical',
      amount: 5000,
      status: 'open',
      notes: 'Pending negotiation',
      createdAt: new Date('2026-04-10T00:00:00.000Z'),
      updatedAt: new Date('2026-04-10T00:00:00.000Z'),
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/liens')
      .set('Authorization', 'Bearer attorney')
      .send({
        name: 'Hospital',
        type: 'medical',
        amount: 5000,
        status: 'open',
        notes: 'Pending negotiation',
      })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'lien-1',
      assessmentId: 'asm-1',
      name: 'Hospital',
      amount: 5000,
    })
    expect(vi.mocked(prisma.lienHolder.create).mock.calls[0]?.[0]).toEqual({
      data: {
        assessmentId: 'asm-1',
        name: 'Hospital',
        type: 'medical',
        amount: 5000,
        status: 'open',
        notes: 'Pending negotiation',
      },
      select: {
        id: true,
        assessmentId: true,
        name: true,
        type: true,
        amount: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/tasks returns compact task payload', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      {
        id: 'task-1',
        assessmentId: 'asm-1',
        title: 'Review records',
        taskType: 'general',
        milestoneType: null,
        checkpointType: null,
        deadlineType: null,
        dueDate: new Date('2026-04-20T00:00:00.000Z'),
        reminderAt: new Date('2026-04-18T00:00:00.000Z'),
        escalationLevel: 'warning',
        assignedRole: 'attorney',
        assignedTo: 'attorney@example.com',
        status: 'open',
        priority: 'high',
        notes: 'Review before consult',
        sourceTemplateId: null,
        sourceTemplateStepId: null,
        completedAt: null,
        createdAt: new Date('2026-04-10T00:00:00.000Z'),
        updatedAt: new Date('2026-04-10T00:00:00.000Z'),
      },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/tasks')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body[0]).toMatchObject({
      id: 'task-1',
      assessmentId: 'asm-1',
      title: 'Review records',
      priority: 'high',
    })
    expect(vi.mocked(prisma.caseTask.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: 'asm-1' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        assessmentId: true,
        title: true,
        taskType: true,
        milestoneType: true,
        checkpointType: true,
        deadlineType: true,
        dueDate: true,
        reminderAt: true,
        escalationLevel: true,
        assignedRole: true,
        assignedTo: true,
        status: true,
        priority: true,
        notes: true,
        sourceTemplateId: true,
        sourceTemplateStepId: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('POST /v1/attorney-dashboard/leads/:leadId/tasks/sol stores compact task payload', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      facts: JSON.stringify({ incident: { date: '2026-01-01' } }),
      venueState: 'CA',
      claimType: 'auto',
    } as any)
    vi.mocked(prisma.caseTask.create).mockResolvedValue({
      id: 'task-sol-1',
      assessmentId: 'asm-1',
      title: 'Statute of limitations (CA • auto)',
      taskType: 'statute',
      milestoneType: null,
      checkpointType: null,
      deadlineType: 'sol',
      dueDate: new Date('2028-01-01T00:00:00.000Z'),
      reminderAt: null,
      escalationLevel: 'none',
      assignedRole: null,
      assignedTo: null,
      status: 'open',
      priority: 'low',
      notes: expect.anything(),
      sourceTemplateId: null,
      sourceTemplateStepId: null,
      completedAt: null,
      createdAt: new Date('2026-04-10T00:00:00.000Z'),
      updatedAt: new Date('2026-04-10T00:00:00.000Z'),
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/tasks/sol')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'task-sol-1',
      assessmentId: 'asm-1',
      taskType: 'statute',
      deadlineType: 'sol',
    })
    expect(vi.mocked(prisma.caseTask.create).mock.calls[0]?.[0]).toMatchObject({
      data: expect.objectContaining({
        assessmentId: 'asm-1',
        taskType: 'statute',
        deadlineType: 'sol',
      }),
      select: {
        id: true,
        assessmentId: true,
        title: true,
        taskType: true,
        milestoneType: true,
        checkpointType: true,
        deadlineType: true,
        dueDate: true,
        reminderAt: true,
        escalationLevel: true,
        assignedRole: true,
        assignedTo: true,
        status: true,
        priority: true,
        notes: true,
        sourceTemplateId: true,
        sourceTemplateStepId: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('POST /v1/attorney-dashboard/leads/:leadId/invoices stores compact invoice payload', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.billingInvoice.create).mockResolvedValue({
      id: 'inv-1',
      assessmentId: 'asm-1',
      invoiceNumber: 'INV-100',
      amount: 1200,
      status: 'open',
      dueDate: new Date('2026-04-20T00:00:00.000Z'),
      paidAt: null,
      notes: 'Experts',
      createdAt: new Date('2026-04-10T00:00:00.000Z'),
      updatedAt: new Date('2026-04-10T00:00:00.000Z'),
    } as any)
    vi.mocked(prisma.caseReminder.create).mockResolvedValue({ id: 'rem-1' } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/invoices')
      .set('Authorization', 'Bearer attorney')
      .send({
        invoiceNumber: 'INV-100',
        amount: 1200,
        status: 'open',
        dueDate: '2026-04-20T00:00:00.000Z',
        notes: 'Experts',
      })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'inv-1',
      assessmentId: 'asm-1',
      invoiceNumber: 'INV-100',
      amount: 1200,
    })
    expect(vi.mocked(prisma.billingInvoice.create).mock.calls[0]?.[0]).toEqual({
      data: {
        assessmentId: 'asm-1',
        invoiceNumber: 'INV-100',
        amount: 1200,
        status: 'open',
        dueDate: new Date('2026-04-20T00:00:00.000Z'),
        paidAt: null,
        notes: 'Experts',
      },
      select: {
        id: true,
        assessmentId: true,
        invoiceNumber: true,
        amount: true,
        status: true,
        dueDate: true,
        paidAt: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/invoices/:id/docx uses compact invoice export query', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.billingInvoice.findUnique).mockResolvedValue({
      id: 'inv-1',
      assessmentId: 'asm-1',
      invoiceNumber: 'INV-100',
      amount: 1200,
      status: 'open',
      dueDate: new Date('2026-04-20T00:00:00.000Z'),
      paidAt: null,
      notes: 'Experts',
      createdAt: new Date('2026-04-10T00:00:00.000Z'),
      updatedAt: new Date('2026-04-10T00:00:00.000Z'),
    } as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/invoices/inv-1/docx')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    expect(vi.mocked(prisma.billingInvoice.findUnique).mock.calls[0]?.[0]).toEqual({
      where: { id: 'inv-1' },
      select: {
        id: true,
        assessmentId: true,
        invoiceNumber: true,
        amount: true,
        status: true,
        dueDate: true,
        paidAt: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/payments returns compact payment payload', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.billingPayment.findMany).mockResolvedValue([
      {
        id: 'pay-1',
        assessmentId: 'asm-1',
        amount: 1200,
        method: 'ach',
        receivedAt: new Date('2026-04-21T00:00:00.000Z'),
        reference: 'REF-1',
        notes: 'Settlement received',
        createdAt: new Date('2026-04-21T00:00:00.000Z'),
        updatedAt: new Date('2026-04-21T00:00:00.000Z'),
      },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/payments')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body[0]).toMatchObject({
      id: 'pay-1',
      assessmentId: 'asm-1',
      amount: 1200,
      method: 'ach',
    })
    expect(vi.mocked(prisma.billingPayment.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: 'asm-1' },
      orderBy: { receivedAt: 'desc' },
      select: {
        id: true,
        assessmentId: true,
        amount: true,
        method: true,
        receivedAt: true,
        reference: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('POST /v1/attorney-dashboard/leads/:leadId/payments stores compact payment payload', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.billingPayment.create).mockResolvedValue({
      id: 'pay-1',
      assessmentId: 'asm-1',
      amount: 1200,
      method: 'ach',
      receivedAt: new Date('2026-04-21T00:00:00.000Z'),
      reference: 'REF-1',
      notes: 'Settlement received',
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedAt: new Date('2026-04-21T00:00:00.000Z'),
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/payments')
      .set('Authorization', 'Bearer attorney')
      .send({
        amount: 1200,
        method: 'ach',
        receivedAt: '2026-04-21T00:00:00.000Z',
        reference: 'REF-1',
        notes: 'Settlement received',
      })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'pay-1',
      assessmentId: 'asm-1',
      amount: 1200,
      method: 'ach',
    })
    expect(vi.mocked(prisma.billingPayment.create).mock.calls[0]?.[0]).toEqual({
      data: {
        assessmentId: 'asm-1',
        amount: 1200,
        method: 'ach',
        receivedAt: new Date('2026-04-21T00:00:00.000Z'),
        reference: 'REF-1',
        notes: 'Settlement received',
      },
      select: {
        id: true,
        assessmentId: true,
        amount: true,
        method: true,
        receivedAt: true,
        reference: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/payments/:id/receipt/pdf uses compact payment export query', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.billingPayment.findUnique).mockResolvedValue({
      id: 'pay-1',
      assessmentId: 'asm-1',
      amount: 1200,
      method: 'ach',
      receivedAt: new Date('2026-04-21T00:00:00.000Z'),
      reference: 'REF-1',
      notes: 'Settlement received',
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedAt: new Date('2026-04-21T00:00:00.000Z'),
    } as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/payments/pay-1/receipt/pdf')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.headers['content-type']).toContain('application/pdf')
    expect(vi.mocked(prisma.billingPayment.findUnique).mock.calls[0]?.[0]).toEqual({
      where: { id: 'pay-1' },
      select: {
        id: true,
        assessmentId: true,
        amount: true,
        method: true,
        receivedAt: true,
        reference: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/negotiations returns compact negotiation payload', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.negotiationEvent.findMany).mockResolvedValue([
      {
        id: 'neg-1',
        assessmentId: 'asm-1',
        eventType: 'offer',
        amount: 45000,
        eventDate: new Date('2026-04-10T00:00:00.000Z'),
        status: 'received',
        notes: 'Initial offer',
        counterpartyType: 'insurer',
        insurerName: 'Carrier',
        adjusterName: 'Alex Adjuster',
        adjusterEmail: 'alex@example.com',
        adjusterPhone: '555-1212',
        concessionValue: 5000,
        concessionNotes: 'Moved from reserve',
        acceptanceRationale: 'Test rationale',
        createdAt: new Date('2026-04-10T01:00:00.000Z'),
        updatedAt: new Date('2026-04-10T02:00:00.000Z'),
      },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/negotiations')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({
      id: 'neg-1',
      assessmentId: 'asm-1',
      eventType: 'offer',
      amount: 45000,
      status: 'received',
    })
    expect(vi.mocked(prisma.negotiationEvent.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: 'asm-1' },
      orderBy: { eventDate: 'desc' },
      select: {
        id: true,
        assessmentId: true,
        eventType: true,
        amount: true,
        eventDate: true,
        status: true,
        notes: true,
        counterpartyType: true,
        insurerName: true,
        adjusterName: true,
        adjusterEmail: true,
        adjusterPhone: true,
        concessionValue: true,
        concessionNotes: true,
        acceptanceRationale: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('POST /v1/attorney-dashboard/leads/:leadId/negotiations stores compact negotiation payload and recomputes insights', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.negotiationEvent.create).mockResolvedValue({
      id: 'neg-1',
      assessmentId: 'asm-1',
      eventType: 'offer',
      amount: 45000,
      eventDate: new Date('2026-04-10T00:00:00.000Z'),
      status: 'received',
      notes: 'Initial offer',
      counterpartyType: 'insurer',
      insurerName: 'Carrier',
      adjusterName: 'Alex Adjuster',
      adjusterEmail: 'alex@example.com',
      adjusterPhone: '555-1212',
      concessionValue: 5000,
      concessionNotes: 'Moved from reserve',
      acceptanceRationale: 'Test rationale',
      createdAt: new Date('2026-04-10T01:00:00.000Z'),
      updatedAt: new Date('2026-04-10T02:00:00.000Z'),
    } as any)
    vi.mocked(prisma.negotiationEvent.findMany).mockResolvedValue([
      {
        eventType: 'demand',
        amount: 60000,
        eventDate: new Date('2026-04-01T00:00:00.000Z'),
        status: 'open',
        insurerName: 'Carrier',
        adjusterName: 'Alex Adjuster',
        concessionValue: 0,
      },
      {
        eventType: 'offer',
        amount: 45000,
        eventDate: new Date('2026-04-10T00:00:00.000Z'),
        status: 'accepted',
        insurerName: 'Carrier',
        adjusterName: 'Alex Adjuster',
        concessionValue: 5000,
      },
    ] as any)
    vi.mocked(prisma.negotiationInsight.upsert).mockResolvedValue({ id: 'insight-1' } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/negotiations')
      .set('Authorization', 'Bearer attorney')
      .send({
        eventType: 'offer',
        amount: 45000,
        eventDate: '2026-04-10T00:00:00.000Z',
        status: 'received',
        notes: 'Initial offer',
        counterpartyType: 'insurer',
        insurerName: 'Carrier',
        adjusterName: 'Alex Adjuster',
        adjusterEmail: 'alex@example.com',
        adjusterPhone: '555-1212',
        concessionValue: 5000,
        concessionNotes: 'Moved from reserve',
        acceptanceRationale: 'Test rationale',
      })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'neg-1',
      assessmentId: 'asm-1',
      eventType: 'offer',
      amount: 45000,
    })
    expect(vi.mocked(prisma.negotiationEvent.create).mock.calls[0]?.[0]).toEqual({
      data: {
        assessmentId: 'asm-1',
        eventType: 'offer',
        amount: 45000,
        eventDate: new Date('2026-04-10T00:00:00.000Z'),
        status: 'received',
        notes: 'Initial offer',
        counterpartyType: 'insurer',
        insurerName: 'Carrier',
        adjusterName: 'Alex Adjuster',
        adjusterEmail: 'alex@example.com',
        adjusterPhone: '555-1212',
        concessionValue: 5000,
        concessionNotes: 'Moved from reserve',
        acceptanceRationale: 'Test rationale',
      },
      select: {
        id: true,
        assessmentId: true,
        eventType: true,
        amount: true,
        eventDate: true,
        status: true,
        notes: true,
        counterpartyType: true,
        insurerName: true,
        adjusterName: true,
        adjusterEmail: true,
        adjusterPhone: true,
        concessionValue: true,
        concessionNotes: true,
        acceptanceRationale: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    expect(vi.mocked(prisma.negotiationEvent.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: 'asm-1' },
      orderBy: { eventDate: 'asc' },
      select: {
        eventType: true,
        amount: true,
        eventDate: true,
        status: true,
        insurerName: true,
        adjusterName: true,
        concessionValue: true,
      },
    })
    expect(prisma.negotiationInsight.upsert).toHaveBeenCalledWith({
      where: { assessmentId: 'asm-1' },
      create: { assessmentId: 'asm-1', data: expect.any(String) },
      update: { data: expect.any(String) },
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/notes returns compact note payload', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.caseNote.findMany).mockResolvedValue([
      {
        id: 'note-1',
        assessmentId: 'asm-1',
        authorId: 'attorney-record-1',
        authorName: 'Ari Attorney',
        authorEmail: 'attorney@example.com',
        noteType: 'strategy',
        message: 'Call adjuster tomorrow',
        createdAt: new Date('2026-04-10T00:00:00.000Z'),
        updatedAt: new Date('2026-04-10T00:00:00.000Z'),
      },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/notes')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({
      id: 'note-1',
      assessmentId: 'asm-1',
      noteType: 'strategy',
      message: 'Call adjuster tomorrow',
    })
    expect(vi.mocked(prisma.caseNote.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: 'asm-1' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        assessmentId: true,
        authorId: true,
        authorName: true,
        authorEmail: true,
        noteType: true,
        message: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('POST /v1/attorney-dashboard/leads/:leadId/notes stores compact note payload', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.caseNote.create).mockResolvedValue({
      id: 'note-1',
      assessmentId: 'asm-1',
      authorId: 'attorney-record-1',
      authorName: 'Ari Attorney',
      authorEmail: 'attorney@example.com',
      noteType: 'strategy',
      message: 'Call adjuster tomorrow',
      createdAt: new Date('2026-04-10T00:00:00.000Z'),
      updatedAt: new Date('2026-04-10T00:00:00.000Z'),
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/notes')
      .set('Authorization', 'Bearer attorney')
      .send({
        noteType: 'strategy',
        message: 'Call adjuster tomorrow',
      })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'note-1',
      assessmentId: 'asm-1',
      noteType: 'strategy',
      message: 'Call adjuster tomorrow',
    })
    expect(vi.mocked(prisma.caseNote.create).mock.calls[0]?.[0]).toEqual({
      data: {
        assessmentId: 'asm-1',
        authorId: 'attorney-record-1',
        authorName: null,
        authorEmail: 'attorney@example.com',
        noteType: 'strategy',
        message: 'Call adjuster tomorrow',
      },
      select: {
        id: true,
        assessmentId: true,
        authorId: true,
        authorName: true,
        authorEmail: true,
        noteType: true,
        message: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/comments/threads returns compact thread previews', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.caseCommentThread.findMany).mockResolvedValue([
      {
        id: 'thread-1',
        assessmentId: 'asm-1',
        title: 'Strategy',
        threadType: 'general',
        allowedRoles: '["attorney"]',
        summary: 'Latest summary',
        createdById: 'attorney-user-1',
        createdByName: 'Ari Attorney',
        createdByEmail: 'attorney@example.com',
        lastCommentAt: new Date('2026-04-10T00:00:00.000Z'),
        createdAt: new Date('2026-04-09T00:00:00.000Z'),
        updatedAt: new Date('2026-04-10T00:00:00.000Z'),
        comments: [
          {
            id: 'comment-1',
            threadId: 'thread-1',
            authorId: 'attorney-user-1',
            authorName: 'Ari Attorney',
            authorEmail: 'attorney@example.com',
            message: 'Need carrier response',
            mentions: null,
            createdAt: new Date('2026-04-10T00:00:00.000Z'),
            updatedAt: new Date('2026-04-10T00:00:00.000Z'),
          },
        ],
      },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/comments/threads')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({
      id: 'thread-1',
      assessmentId: 'asm-1',
      title: 'Strategy',
      comments: [{ id: 'comment-1', threadId: 'thread-1', message: 'Need carrier response' }],
    })
    expect(vi.mocked(prisma.caseCommentThread.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: 'asm-1' },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        assessmentId: true,
        title: true,
        threadType: true,
        allowedRoles: true,
        summary: true,
        createdById: true,
        createdByName: true,
        createdByEmail: true,
        lastCommentAt: true,
        createdAt: true,
        updatedAt: true,
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            threadId: true,
            authorId: true,
            authorName: true,
            authorEmail: true,
            message: true,
            mentions: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })
  })

  it('GET /v1/attorney-dashboard/analytics/intelligence uses compact financial analytics queries', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValueOnce({
      id: 'attorney-record-1',
      lawFirmId: 'firm-1',
    } as any)
    vi.mocked(prisma.leadSubmission.findMany)
      .mockResolvedValueOnce([
        {
          id: 'lead-1',
          assessmentId: 'asm-1',
          assignedAttorneyId: 'attorney-record-1',
          status: 'retained',
          submittedAt: new Date('2026-04-01T00:00:00.000Z'),
          convertedAt: new Date('2026-04-11T00:00:00.000Z'),
          assessment: {
            claimType: 'auto',
            venueState: 'CA',
          },
        },
      ] as any)
      .mockResolvedValueOnce([
        {
          id: 'lead-1',
          assessmentId: 'asm-1',
          assignedAttorneyId: 'attorney-record-1',
          status: 'retained',
          submittedAt: new Date('2026-04-01T00:00:00.000Z'),
          convertedAt: new Date('2026-04-11T00:00:00.000Z'),
          assessment: {
            claimType: 'auto',
            venueState: 'CA',
          },
        },
        {
          id: 'lead-2',
          assessmentId: 'asm-2',
          assignedAttorneyId: 'attorney-record-2',
          status: 'submitted',
          submittedAt: new Date('2026-04-05T00:00:00.000Z'),
          convertedAt: null,
          assessment: {
            claimType: 'slip_and_fall',
            venueState: 'NV',
          },
        },
      ] as any)
    vi.mocked(prisma.billingInvoice.findMany)
      .mockResolvedValueOnce([
        { assessmentId: 'asm-1', amount: 1000 },
      ] as any)
      .mockResolvedValueOnce([
        { assessmentId: 'asm-1', amount: 1000 },
        { assessmentId: 'asm-2', amount: 500 },
      ] as any)
    vi.mocked(prisma.billingPayment.findMany)
      .mockResolvedValueOnce([
        { assessmentId: 'asm-1', amount: 8000 },
      ] as any)
      .mockResolvedValueOnce([
        { assessmentId: 'asm-1', amount: 8000 },
        { assessmentId: 'asm-2', amount: 1000 },
      ] as any)
    vi.mocked(prisma.negotiationEvent.findMany).mockResolvedValue([
      { assessmentId: 'asm-1', eventType: 'demand', status: 'open', amount: 10000 },
      { assessmentId: 'asm-1', eventType: 'offer', status: 'accepted', amount: 8000 },
    ] as any)
    vi.mocked(prisma.insuranceDetail.findMany).mockResolvedValue([
      { assessmentId: 'asm-1', carrierName: 'Carrier A', adjusterName: 'Adjuster A' },
      { assessmentId: 'asm-2', carrierName: 'Carrier B', adjusterName: 'Adjuster B' },
    ] as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([
      { id: 'attorney-record-1', name: 'Ari Attorney' },
      { id: 'attorney-record-2', name: 'Bea Barrister' },
    ] as any)
    vi.mocked(prisma.leadAnalytics.findMany).mockResolvedValue([
      { totalFees: 3000, platformSpend: 1000 },
      { totalFees: 1500, platformSpend: 500 },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/analytics/intelligence')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body.caseLevel).toEqual([
      expect.objectContaining({
        leadId: 'lead-1',
        assessmentId: 'asm-1',
        claimType: 'auto',
        venueState: 'CA',
        cost: 1000,
        outcome: 8000,
        settlementEfficiency: 80,
      }),
    ])
    expect(res.body.firmLevel).toMatchObject({
      profitabilityByCaseType: {
        auto: { revenue: 8000, cost: 1000, profit: 7000, count: 1 },
        slip_and_fall: { revenue: 1000, cost: 500, profit: 500, count: 1 },
      },
      attorneyPerformance: {
        'attorney-record-1': { name: 'Ari Attorney', total: 1, retained: 1 },
        'attorney-record-2': { name: 'Bea Barrister', total: 1, retained: 0 },
      },
      roiByInsurer: {
        'Carrier A': { revenue: 8000, cost: 1000, roi: 8 },
        'Carrier B': { revenue: 1000, cost: 500, roi: 2 },
      },
      roiByAdjuster: {
        'Adjuster A': { revenue: 8000, cost: 1000, roi: 8 },
        'Adjuster B': { revenue: 1000, cost: 500, roi: 2 },
      },
      roiByVenue: {
        CA: { revenue: 8000, cost: 1000, roi: 8 },
        NV: { revenue: 1000, cost: 500, roi: 2 },
      },
      forecast: {
        nextQuarterFees: 6750,
        nextQuarterSpend: 2250,
        projectedRoi: 3,
      },
    })
    expect(vi.mocked(prisma.attorney.findFirst).mock.calls[0]?.[0]).toEqual({
      where: { email: 'attorney@example.com' },
      select: {
        id: true,
        lawFirmId: true,
      },
    })
    expect(vi.mocked(prisma.leadSubmission.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assignedAttorneyId: 'attorney-record-1' },
      orderBy: { submittedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        assessmentId: true,
        assignedAttorneyId: true,
        status: true,
        submittedAt: true,
        convertedAt: true,
        assessment: {
          select: {
            claimType: true,
            venueState: true,
          },
        },
      },
    })
    expect(vi.mocked(prisma.billingInvoice.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: { in: ['asm-1'] } },
      select: {
        assessmentId: true,
        amount: true,
      },
    })
    expect(vi.mocked(prisma.billingPayment.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: { in: ['asm-1'] } },
      select: {
        assessmentId: true,
        amount: true,
      },
    })
    expect(vi.mocked(prisma.negotiationEvent.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: { in: ['asm-1'] } },
      orderBy: { eventDate: 'asc' },
      select: {
        assessmentId: true,
        eventType: true,
        status: true,
        amount: true,
      },
    })
    expect(vi.mocked(prisma.insuranceDetail.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: { in: ['asm-1', 'asm-2'] } },
      select: {
        assessmentId: true,
        carrierName: true,
        adjusterName: true,
      },
    })
    expect(vi.mocked(prisma.leadAnalytics.findMany).mock.calls[0]?.[0]).toEqual({
      where: { attorneyId: 'attorney-record-1' },
      orderBy: { periodStart: 'desc' },
      take: 6,
      select: {
        totalFees: true,
        platformSpend: true,
      },
    })
  })

  it('GET /v1/attorney-dashboard/leads/:leadId/comments/threads/:threadId returns compact thread detail', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.caseCommentThread.findUnique).mockResolvedValue({
      id: 'thread-1',
      assessmentId: 'asm-1',
      title: 'Strategy',
      threadType: 'general',
      allowedRoles: '["attorney"]',
      summary: 'Latest summary',
      createdById: 'attorney-user-1',
      createdByName: 'Ari Attorney',
      createdByEmail: 'attorney@example.com',
      lastCommentAt: new Date('2026-04-10T00:00:00.000Z'),
      createdAt: new Date('2026-04-09T00:00:00.000Z'),
      updatedAt: new Date('2026-04-10T00:00:00.000Z'),
      comments: [
        {
          id: 'comment-1',
          threadId: 'thread-1',
          authorId: 'attorney-user-1',
          authorName: 'Ari Attorney',
          authorEmail: 'attorney@example.com',
          message: 'Need carrier response',
          mentions: null,
          createdAt: new Date('2026-04-10T00:00:00.000Z'),
          updatedAt: new Date('2026-04-10T00:00:00.000Z'),
        },
      ],
    } as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-1/comments/threads/thread-1')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'thread-1',
      assessmentId: 'asm-1',
      title: 'Strategy',
      comments: [{ id: 'comment-1', message: 'Need carrier response' }],
    })
    expect(vi.mocked(prisma.caseCommentThread.findUnique).mock.calls[0]?.[0]).toEqual({
      where: { id: 'thread-1' },
      select: {
        id: true,
        assessmentId: true,
        title: true,
        threadType: true,
        allowedRoles: true,
        summary: true,
        createdById: true,
        createdByName: true,
        createdByEmail: true,
        lastCommentAt: true,
        createdAt: true,
        updatedAt: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            threadId: true,
            authorId: true,
            authorName: true,
            authorEmail: true,
            message: true,
            mentions: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })
  })

  it('POST /v1/attorney-dashboard/leads/:leadId/comments/threads/:threadId/comments stores compact comment payload', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.caseCommentThread.findUnique).mockResolvedValue({
      id: 'thread-1',
      assessmentId: 'asm-1',
      allowedRoles: '["attorney"]',
    } as any)
    vi.mocked(prisma.caseComment.create).mockResolvedValue({
      id: 'comment-1',
      threadId: 'thread-1',
      authorId: 'attorney-user-1',
      authorName: 'Ari Attorney',
      authorEmail: 'attorney@example.com',
      message: 'Please review @teammate',
      mentions: '["@teammate"]',
      createdAt: new Date('2026-04-10T00:00:00.000Z'),
      updatedAt: new Date('2026-04-10T00:00:00.000Z'),
    } as any)
    vi.mocked(prisma.caseComment.findMany).mockResolvedValue([
      { message: 'Please review @teammate' },
    ] as any)
    vi.mocked(prisma.caseCommentThread.update).mockResolvedValue({ id: 'thread-1' } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/comments/threads/thread-1/comments')
      .set('Authorization', 'Bearer attorney')
      .send({ message: 'Please review @teammate' })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'comment-1',
      threadId: 'thread-1',
      message: 'Please review @teammate',
      mentions: '["@teammate"]',
    })
    expect(vi.mocked(prisma.caseCommentThread.findUnique).mock.calls[0]?.[0]).toEqual({
      where: { id: 'thread-1' },
      select: {
        id: true,
        assessmentId: true,
        allowedRoles: true,
      },
    })
    expect(vi.mocked(prisma.caseComment.create).mock.calls[0]?.[0]).toEqual({
      data: {
        threadId: 'thread-1',
        message: 'Please review @teammate',
        mentions: '["@teammate"]',
        authorId: 'attorney-user-1',
        authorName: 'Ari Attorney',
        authorEmail: 'attorney@example.com',
      },
      select: {
        id: true,
        threadId: true,
        authorId: true,
        authorName: true,
        authorEmail: true,
        message: true,
        mentions: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('POST /v1/attorney-dashboard/leads/:leadId/comments/threads/:threadId/summary returns compact thread payload', async () => {
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValueOnce({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignmentType: 'shared',
      assignedAttorneyId: null,
    } as any)
    vi.mocked(prisma.caseCommentThread.findUnique).mockResolvedValue({
      id: 'thread-1',
      assessmentId: 'asm-1',
      allowedRoles: '["attorney"]',
    } as any)
    vi.mocked(prisma.caseComment.findMany).mockResolvedValue([
      { message: 'First message' },
      { message: 'Second message' },
    ] as any)
    vi.mocked(prisma.caseCommentThread.update).mockResolvedValue({
      id: 'thread-1',
      assessmentId: 'asm-1',
      title: 'Strategy',
      threadType: 'general',
      allowedRoles: '["attorney"]',
      summary: 'First message | Second message',
      createdById: 'attorney-user-1',
      createdByName: 'Ari Attorney',
      createdByEmail: 'attorney@example.com',
      lastCommentAt: new Date('2026-04-10T00:00:00.000Z'),
      createdAt: new Date('2026-04-09T00:00:00.000Z'),
      updatedAt: new Date('2026-04-10T00:00:00.000Z'),
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-1/comments/threads/thread-1/summary')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toMatchObject({
      id: 'thread-1',
      assessmentId: 'asm-1',
      summary: 'First message | Second message',
    })
    expect(vi.mocked(prisma.caseCommentThread.findUnique).mock.calls[0]?.[0]).toEqual({
      where: { id: 'thread-1' },
      select: {
        id: true,
        assessmentId: true,
        allowedRoles: true,
      },
    })
    expect(vi.mocked(prisma.caseCommentThread.update).mock.calls[0]?.[0]).toEqual({
      where: { id: 'thread-1' },
      data: {
        summary: 'First message | Second message',
        lastCommentAt: expect.any(Date),
      },
      select: {
        id: true,
        assessmentId: true,
        title: true,
        threadType: true,
        allowedRoles: true,
        summary: true,
        createdById: true,
        createdByName: true,
        createdByEmail: true,
        lastCommentAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('GET /v1/attorney-dashboard/messaging/chat-rooms returns compact room summaries', async () => {
    vi.mocked(prisma.chatRoom.findMany).mockResolvedValue([
      {
        id: 'room-1',
        assessmentId: 'asm-1',
        lastMessageAt: new Date('2026-04-10T00:00:00.000Z'),
        user: {
          id: 'plaintiff-user-1',
          firstName: 'Pat',
          lastName: 'Plaintiff',
          email: 'plaintiff@example.com',
        },
        assessment: {
          id: 'asm-1',
          claimType: 'auto',
          venueState: 'CA',
        },
        messages: [
          {
            content: 'Need update',
            senderType: 'user',
            createdAt: new Date('2026-04-10T00:00:00.000Z'),
          },
        ],
      },
    ] as any)
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      { id: 'lead-1', assessmentId: 'asm-1' },
    ] as any)
    vi.mocked(prisma.message.groupBy).mockResolvedValue([
      { chatRoomId: 'room-1', _count: { id: 2 } },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/messaging/chat-rooms')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toEqual([
      {
        id: 'room-1',
        leadId: 'lead-1',
        plaintiff: {
          id: 'plaintiff-user-1',
          name: 'Pat Plaintiff',
          email: 'plaintiff@example.com',
        },
        assessment: {
          id: 'asm-1',
          claimType: 'auto',
          venueState: 'CA',
        },
        lastMessage: {
          content: 'Need update',
          senderType: 'user',
          createdAt: '2026-04-10T00:00:00.000Z',
        },
        lastMessageAt: '2026-04-10T00:00:00.000Z',
        unreadCount: 2,
      },
    ])
    expect(vi.mocked(prisma.chatRoom.findMany).mock.calls[0]?.[0]).toEqual({
      where: { attorneyId: 'attorney-record-1' },
      select: {
        id: true,
        assessmentId: true,
        lastMessageAt: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assessment: {
          select: { id: true, claimType: true, venueState: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            senderType: true,
            createdAt: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })
    expect(vi.mocked(prisma.message.groupBy).mock.calls[0]?.[0]).toEqual({
      by: ['chatRoomId'],
      where: {
        chatRoomId: { in: ['room-1'] },
        senderType: 'user',
        isRead: false,
      },
      _count: { id: true },
    })
  })

  it('POST /v1/attorney-dashboard/messaging/chat-room returns compact room detail', async () => {
    vi.mocked(prisma.chatRoom.findUnique).mockResolvedValue({
      id: 'room-1',
      lastMessageAt: new Date('2026-04-10T00:00:00.000Z'),
      user: {
        id: 'plaintiff-user-1',
        firstName: 'Pat',
        lastName: 'Plaintiff',
        email: 'plaintiff@example.com',
      },
      assessment: {
        id: 'asm-1',
        claimType: 'auto',
        venueState: 'CA',
      },
      messages: [
        {
          id: 'msg-2',
          chatRoomId: 'room-1',
          senderId: 'attorney-record-1',
          senderType: 'attorney',
          content: 'Reply',
          messageType: 'text',
          metadata: null,
          isRead: true,
          readAt: new Date('2026-04-10T00:10:00.000Z'),
          createdAt: new Date('2026-04-10T00:10:00.000Z'),
        },
        {
          id: 'msg-1',
          chatRoomId: 'room-1',
          senderId: 'plaintiff-user-1',
          senderType: 'user',
          content: 'Need update',
          messageType: 'text',
          metadata: null,
          isRead: false,
          readAt: null,
          createdAt: new Date('2026-04-10T00:00:00.000Z'),
        },
      ],
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/messaging/chat-room')
      .set('Authorization', 'Bearer attorney')
      .send({ userId: 'plaintiff-user-1', assessmentId: 'asm-1' })
      .expect(200)

    expect(res.body).toMatchObject({
      chatRoomId: 'room-1',
      plaintiff: { id: 'plaintiff-user-1', name: 'Pat Plaintiff', email: 'plaintiff@example.com' },
      assessment: { id: 'asm-1', claimType: 'auto', venueState: 'CA' },
      lastMessageAt: '2026-04-10T00:00:00.000Z',
    })
    expect(res.body.messages.map((m: any) => m.id)).toEqual(['msg-1', 'msg-2'])
    expect(vi.mocked(prisma.chatRoom.findUnique).mock.calls[0]?.[0]).toEqual({
      where: { userId_attorneyId: { userId: 'plaintiff-user-1', attorneyId: 'attorney-record-1' } },
      select: {
        id: true,
        lastMessageAt: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assessment: {
          select: { id: true, claimType: true, venueState: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            chatRoomId: true,
            senderId: true,
            senderType: true,
            content: true,
            messageType: true,
            metadata: true,
            isRead: true,
            readAt: true,
            createdAt: true,
          },
        },
      },
    })
  })

  it('GET /v1/attorney-dashboard/messaging/chat-room/:chatRoomId/messages uses compact ownership and message queries', async () => {
    vi.mocked(prisma.chatRoom.findFirst).mockResolvedValue({ id: 'room-1' } as any)
    vi.mocked(prisma.message.findMany).mockResolvedValue([
      {
        id: 'msg-2',
        chatRoomId: 'room-1',
        senderId: 'attorney-record-1',
        senderType: 'attorney',
        content: 'Reply',
        messageType: 'text',
        metadata: null,
        isRead: true,
        readAt: new Date('2026-04-10T00:10:00.000Z'),
        createdAt: new Date('2026-04-10T00:10:00.000Z'),
      },
      {
        id: 'msg-1',
        chatRoomId: 'room-1',
        senderId: 'plaintiff-user-1',
        senderType: 'user',
        content: 'Need update',
        messageType: 'text',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2026-04-10T00:00:00.000Z'),
      },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/messaging/chat-room/room-1/messages?limit=50&offset=0')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body.map((m: any) => m.id)).toEqual(['msg-1', 'msg-2'])
    expect(vi.mocked(prisma.chatRoom.findFirst).mock.calls[0]?.[0]).toEqual({
      where: { id: 'room-1', attorneyId: 'attorney-record-1' },
      select: { id: true },
    })
    expect(vi.mocked(prisma.message.findMany).mock.calls[0]?.[0]).toEqual({
      where: { chatRoomId: 'room-1' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      skip: 0,
      select: {
        id: true,
        chatRoomId: true,
        senderId: true,
        senderType: true,
        content: true,
        messageType: true,
        metadata: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
    })
  })

  it('POST /v1/attorney-dashboard/messaging/send uses compact ownership and message create queries', async () => {
    vi.mocked(prisma.chatRoom.findFirst).mockResolvedValue({ id: 'room-1' } as any)
    vi.mocked(prisma.message.create).mockResolvedValue({
      id: 'msg-3',
      content: 'Hello there',
      senderType: 'attorney',
      createdAt: new Date('2026-04-10T00:20:00.000Z'),
    } as any)
    vi.mocked(prisma.chatRoom.update).mockResolvedValue({ id: 'room-1' } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/messaging/send')
      .set('Authorization', 'Bearer attorney')
      .send({ chatRoomId: 'room-1', content: 'Hello there', messageType: 'text' })
      .expect(201)

    expect(res.body).toEqual({
      messageId: 'msg-3',
      chatRoomId: 'room-1',
      content: 'Hello there',
      senderType: 'attorney',
      createdAt: '2026-04-10T00:20:00.000Z',
    })
    expect(vi.mocked(prisma.chatRoom.findFirst).mock.calls[0]?.[0]).toEqual({
      where: { id: 'room-1', attorneyId: 'attorney-record-1' },
      select: { id: true },
    })
    expect(vi.mocked(prisma.message.create).mock.calls[0]?.[0]).toEqual({
      data: {
        chatRoomId: 'room-1',
        senderId: 'attorney-record-1',
        senderType: 'attorney',
        content: 'Hello there',
        messageType: 'text',
      },
      select: {
        id: true,
        content: true,
        senderType: true,
        createdAt: true,
      },
    })
  })

  it('PUT /v1/attorney-dashboard/messaging/chat-room/:chatRoomId/read uses compact ownership query', async () => {
    vi.mocked(prisma.chatRoom.findFirst).mockResolvedValue({ id: 'room-1' } as any)
    vi.mocked(prisma.message.updateMany).mockResolvedValue({ count: 2 } as any)

    const res = await request(app)
      .put('/v1/attorney-dashboard/messaging/chat-room/room-1/read')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body).toEqual({ success: true })
    expect(vi.mocked(prisma.chatRoom.findFirst).mock.calls[0]?.[0]).toEqual({
      where: { id: 'room-1', attorneyId: 'attorney-record-1' },
      select: { id: true },
    })
    expect(vi.mocked(prisma.message.updateMany).mock.calls[0]?.[0]).toEqual({
      where: { chatRoomId: 'room-1', senderType: 'user', isRead: false },
      data: { isRead: true, readAt: expect.any(Date) },
    })
  })

  it('POST /v1/support-tickets creates attorney tickets with attorney scope', async () => {
    vi.mocked(prisma.supportTicket.create).mockResolvedValue({
      id: 'ticket-1',
      role: 'attorney',
      attorneyId: 'attorney-record-1',
    } as any)

    const res = await request(app)
      .post('/v1/support-tickets')
      .set('Authorization', 'Bearer attorney')
      .send({
        category: 'routing_issue',
        subject: 'Routing issue',
        description: 'Need help with a routed case.',
      })
      .expect(200)

    expect(res.body.ticket.id).toBe('ticket-1')
    expect(prisma.supportTicket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        attorneyId: 'attorney-record-1',
        userId: undefined,
        role: 'attorney',
      }),
    })
  })

  it('GET /v1/support-tickets lists tickets scoped by attorneyId for attorneys', async () => {
    vi.mocked(prisma.supportTicket.findMany).mockResolvedValue([
      { id: 'ticket-1', role: 'attorney' },
    ] as any)

    const res = await request(app)
      .get('/v1/support-tickets')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(res.body.tickets).toEqual([{ id: 'ticket-1', role: 'attorney' }])
    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { attorneyId: 'attorney-record-1' },
      }),
    )
  })

  it('POST /v1/support-tickets/:id/messages persists attorney senderRole from req.user', async () => {
    vi.mocked(prisma.supportTicket.findFirst).mockResolvedValue({
      id: 'ticket-1',
      userId: 'attorney-user-1',
      status: 'open',
    } as any)
    vi.mocked(prisma.supportTicketMessage.create).mockResolvedValue({
      id: 'msg-1',
      senderRole: 'attorney',
      body: 'Following up',
    } as any)

    const res = await request(app)
      .post('/v1/support-tickets/ticket-1/messages')
      .set('Authorization', 'Bearer attorney')
      .send({ body: 'Following up' })
      .expect(200)

    expect(res.body.senderRole).toBe('attorney')
    expect(prisma.supportTicketMessage.create).toHaveBeenCalledWith({
      data: {
        ticketId: 'ticket-1',
        senderId: 'attorney-user-1',
        senderRole: 'attorney',
        body: 'Following up',
      },
    })
  })

  it('GET /v1/case-tracker/dashboard returns compact plaintiff case cards', async () => {
    vi.mocked(prisma.assessment.findMany).mockResolvedValue([
      {
        id: 'asm-1',
        claimType: 'auto',
        venueState: 'CA',
        venueCounty: 'Los Angeles',
        status: 'UNDER_REVIEW',
        facts: JSON.stringify({ incident: { date: '2026-03-01' } }),
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-10T00:00:00.000Z'),
        predictions: [
          {
            id: 'pred-1',
            viability: JSON.stringify({ overall: 0.82 }),
            bands: JSON.stringify({ median: 55000, p25: 30000, p75: 80000 }),
            explain: JSON.stringify({ summary: 'Strong case' }),
            createdAt: new Date('2026-03-09T00:00:00.000Z'),
          },
        ],
        appointments: [
          {
            id: 'apt-1',
            type: 'video',
            scheduledAt: new Date('2099-04-01T12:00:00.000Z'),
            status: 'SCHEDULED',
            attorney: {
              id: 'attorney-1',
              name: 'Ari Attorney',
              email: 'attorney@example.com',
              phone: '555-1111',
            },
          },
        ],
        chatRooms: [
          {
            id: 'room-1',
            status: 'active',
            attorney: {
              id: 'attorney-1',
              name: 'Ari Attorney',
              email: 'attorney@example.com',
            },
            messages: [
              {
                id: 'msg-1',
                content: 'Latest update',
                senderType: 'attorney',
                isRead: false,
                createdAt: new Date('2026-03-10T00:00:00.000Z'),
              },
            ],
          },
        ],
        demandLetters: [
          {
            id: 'demand-1',
            createdAt: new Date('2026-03-08T00:00:00.000Z'),
            updatedAt: new Date('2026-03-08T00:00:00.000Z'),
            status: 'draft',
            title: 'Demand package',
          },
        ],
        files: [
          {
            id: 'file-1',
            name: 'records.pdf',
            originalName: 'Medical Records.pdf',
            mimetype: 'application/pdf',
            size: 2048,
            createdAt: new Date('2026-03-07T00:00:00.000Z'),
          },
        ],
      },
    ] as any)

    const res = await request(app)
      .get('/v1/case-tracker/dashboard')
      .set('Authorization', 'Bearer plaintiff')
      .expect(200)

    expect(res.body.summary).toMatchObject({
      totalCases: 1,
      activeCases: 1,
      totalValue: 55000,
      upcomingAppointments: 1,
      pendingMessages: 1,
    })
    expect(res.body.cases[0]).toMatchObject({
      id: 'asm-1',
      status: 'UNDER_REVIEW',
      demandLetters: [{ id: 'demand-1', status: 'draft', title: 'Demand package' }],
      files: [{ id: 'file-1', originalName: 'Medical Records.pdf', mimetype: 'application/pdf', size: 2048 }],
    })
    expect(res.body.cases[0].chatRooms[0].lastMessage).toMatchObject({
      id: 'msg-1',
      content: 'Latest update',
      senderType: 'attorney',
      isRead: false,
    })
    expect(vi.mocked(prisma.assessment.findMany).mock.calls[0]?.[0]).toEqual({
      where: { userId: 'plaintiff-user-1' },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        status: true,
        facts: true,
        createdAt: true,
        updatedAt: true,
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            viability: true,
            bands: true,
            explain: true,
            createdAt: true,
          },
        },
        appointments: {
          orderBy: { scheduledAt: 'desc' },
          select: {
            id: true,
            type: true,
            scheduledAt: true,
            status: true,
            attorney: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        chatRooms: {
          select: {
            id: true,
            status: true,
            attorney: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                content: true,
                senderType: true,
                isRead: true,
                createdAt: true,
              },
            },
          },
        },
        demandLetters: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            status: true,
            title: true,
          },
        },
        files: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            originalName: true,
            mimetype: true,
            size: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('GET /v1/case-tracker/case/:id caps detail chat history and keeps chronological response order', async () => {
    vi.mocked(prisma.assessment.findFirst).mockResolvedValue({
      id: 'asm-1',
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      status: 'NEGOTIATION',
      facts: JSON.stringify({ incident: { location: 'Main St' } }),
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-12T00:00:00.000Z'),
      predictions: [
        {
          id: 'pred-1',
          viability: JSON.stringify({ overall: 0.91 }),
          bands: JSON.stringify({ median: 90000, p25: 70000, p75: 120000 }),
          explain: JSON.stringify({ summary: 'Negotiation ready' }),
          createdAt: new Date('2026-03-11T00:00:00.000Z'),
        },
      ],
      appointments: [
        {
          id: 'apt-1',
          type: 'phone',
          scheduledAt: new Date('2026-03-15T12:00:00.000Z'),
          status: 'SCHEDULED',
          attorney: {
            id: 'attorney-1',
            name: 'Ari Attorney',
            email: 'attorney@example.com',
            phone: '555-1111',
          },
        },
      ],
      chatRooms: [
        {
          id: 'room-1',
          status: 'active',
          attorney: {
            id: 'attorney-1',
            name: 'Ari Attorney',
            email: 'attorney@example.com',
          },
          messages: [
            {
              id: 'msg-new',
              content: 'Newest message',
              senderType: 'attorney',
              isRead: false,
              createdAt: new Date('2026-03-12T00:00:00.000Z'),
            },
            {
              id: 'msg-old',
              content: 'Older message',
              senderType: 'user',
              isRead: true,
              createdAt: new Date('2026-03-10T00:00:00.000Z'),
            },
          ],
        },
      ],
      demandLetters: [],
      files: [
        {
          id: 'file-1',
          name: 'packet.pdf',
          originalName: 'Demand Packet.pdf',
          mimetype: 'application/pdf',
          size: 4096,
          createdAt: new Date('2026-03-09T00:00:00.000Z'),
        },
      ],
    } as any)

    const res = await request(app)
      .get('/v1/case-tracker/case/asm-1')
      .set('Authorization', 'Bearer plaintiff')
      .expect(200)

    expect(res.body.chatRooms[0].messages.map((message: any) => message.id)).toEqual(['msg-old', 'msg-new'])
    expect(res.body.files).toEqual([
      expect.objectContaining({
        id: 'file-1',
        originalName: 'Demand Packet.pdf',
        mimetype: 'application/pdf',
        size: 4096,
      }),
    ])
    expect(vi.mocked(prisma.assessment.findFirst).mock.calls[0]?.[0]).toEqual({
      where: {
        id: 'asm-1',
        userId: 'plaintiff-user-1',
      },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        status: true,
        facts: true,
        createdAt: true,
        updatedAt: true,
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            viability: true,
            bands: true,
            explain: true,
            createdAt: true,
          },
        },
        appointments: {
          orderBy: { scheduledAt: 'asc' },
          select: {
            id: true,
            type: true,
            scheduledAt: true,
            status: true,
            attorney: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        chatRooms: {
          select: {
            id: true,
            status: true,
            attorney: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 100,
              select: {
                id: true,
                content: true,
                senderType: true,
                isRead: true,
                createdAt: true,
              },
            },
          },
        },
        demandLetters: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            status: true,
            title: true,
          },
        },
        files: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            originalName: true,
            mimetype: true,
            size: true,
            createdAt: true,
          },
        },
      },
    })
  })

  it('GET /v1/case-tracker/case/:id/timeline uses compact activity queries', async () => {
    vi.mocked(prisma.assessment.findFirst).mockResolvedValue({
      id: 'asm-1',
      claimType: 'auto',
      venueState: 'CA',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
    } as any)
    vi.mocked(prisma.prediction.findMany).mockResolvedValue([
      {
        id: 'pred-1',
        createdAt: new Date('2026-03-02T00:00:00.000Z'),
      },
    ] as any)
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: 'apt-1',
        type: 'video',
        scheduledAt: new Date('2026-03-05T00:00:00.000Z'),
        status: 'SCHEDULED',
        attorney: { name: 'Ari Attorney' },
      },
    ] as any)
    vi.mocked(prisma.demandLetter.findMany).mockResolvedValue([
      {
        id: 'demand-1',
        targetAmount: 45000,
        createdAt: new Date('2026-03-06T00:00:00.000Z'),
        status: 'SENT',
      },
    ] as any)
    vi.mocked(prisma.file.findMany).mockResolvedValue([
      {
        id: 'file-1',
        originalName: 'Police Report.pdf',
        createdAt: new Date('2026-03-04T00:00:00.000Z'),
      },
    ] as any)
    vi.mocked(prisma.chatRoom.findMany).mockResolvedValue([
      {
        id: 'room-1',
        createdAt: new Date('2026-03-03T00:00:00.000Z'),
        attorney: { name: 'Ari Attorney' },
        _count: { messages: 2 },
      },
      {
        id: 'room-2',
        createdAt: new Date('2026-03-07T00:00:00.000Z'),
        attorney: { name: 'Quiet Attorney' },
        _count: { messages: 0 },
      },
    ] as any)

    const res = await request(app)
      .get('/v1/case-tracker/case/asm-1/timeline')
      .set('Authorization', 'Bearer plaintiff')
      .expect(200)

    expect(res.body.map((event: any) => event.id)).toEqual([
      'demand-demand-1',
      'appointment-apt-1',
      'file-file-1',
      'chat-room-1',
      'prediction-pred-1',
      'assessment-asm-1',
    ])
    expect(res.body.find((event: any) => event.id === 'chat-room-1')).toMatchObject({
      type: 'conversation_started',
      title: 'Started conversation with Ari Attorney',
      status: 'active',
    })
    expect(res.body.find((event: any) => event.id === 'demand-demand-1')).toMatchObject({
      description: 'Demand for $45,000',
      status: 'sent',
    })
    expect(vi.mocked(prisma.assessment.findFirst).mock.calls[0]?.[0]).toEqual({
      where: {
        id: 'asm-1',
        userId: 'plaintiff-user-1',
      },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        createdAt: true,
      },
    })
    expect(vi.mocked(prisma.prediction.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: 'asm-1' },
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    expect(vi.mocked(prisma.appointment.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: 'asm-1' },
      select: {
        id: true,
        type: true,
        scheduledAt: true,
        status: true,
        attorney: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    expect(vi.mocked(prisma.demandLetter.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: 'asm-1' },
      select: {
        id: true,
        targetAmount: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    expect(vi.mocked(prisma.file.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: 'asm-1' },
      select: {
        id: true,
        originalName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    expect(vi.mocked(prisma.chatRoom.findMany).mock.calls[0]?.[0]).toEqual({
      where: { assessmentId: 'asm-1' },
      select: {
        id: true,
        createdAt: true,
        attorney: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  })
})

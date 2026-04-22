/**
 * HTTP coverage for /v1/case-routing attorney + plaintiff routing flows.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

vi.mock('./lib/routing-lifecycle', () => ({
  attorneyAcceptCase: vi.fn(),
  attorneyDeclineCase: vi.fn(),
  attorneyRequestMoreInfo: vi.fn(),
  recordRoutingEvent: vi.fn().mockResolvedValue(undefined),
}))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'
import * as lifecycle from './lib/routing-lifecycle'

const attorneyUser = {
  id: 'user-att-1',
  email: 'counsel@test.local',
  firstName: 'Casey',
  lastName: 'Counsel',
  isActive: true,
}

const plaintiffUser = {
  id: 'user-pl-1',
  email: 'plaintiff@test.local',
  firstName: 'Pat',
  lastName: 'Lee',
  isActive: true,
}

function authHeader(userId: string) {
  return { Authorization: `Bearer ${generateToken(userId)}` }
}

describe('GET /v1/case-routing/introductions/:id/summary', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockImplementation(async (args: any) => {
      const id = args?.where?.id
      if (id === attorneyUser.id) return attorneyUser as any
      if (id === plaintiffUser.id) return plaintiffUser as any
      return null
    })
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-1' } as any)
  })

  it('403 when user is not linked to an attorney record', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue(null as any)

    const res = await request(app)
      .get('/v1/case-routing/introductions/intro-1/summary')
      .set(authHeader(attorneyUser.id))

    expect(res.status).toBe(403)
  })

  it('404 when introduction missing', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue(null as any)

    const res = await request(app)
      .get('/v1/case-routing/introductions/missing/summary')
      .set(authHeader(attorneyUser.id))

    expect(res.status).toBe(404)
  })

  it('400 when introduction already responded', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      id: 'intro-1',
      status: 'ACCEPTED',
      assessmentId: 'asm-1',
      assessment: { predictions: [], evidenceFiles: [], facts: '{}' },
    } as any)

    const res = await request(app)
      .get('/v1/case-routing/introductions/intro-1/summary')
      .set(authHeader(attorneyUser.id))

    expect(res.status).toBe(400)
  })

  it('200 returns case snapshot for pending intro', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      id: 'intro-1',
      status: 'PENDING',
      assessmentId: 'asm-1',
      attorneyId: 'att-1',
      assessment: {
        id: 'asm-1',
        claimType: 'auto',
        venueState: 'CA',
        venueCounty: 'Los Angeles',
        facts: JSON.stringify({ damages: { wage_loss: 1000 } }),
        predictions: [
          {
            viability: JSON.stringify({ overall: 0.72, liability: 0.8, damages: 0.65 }),
            bands: JSON.stringify({ p25: 25000, p75: 75000 }),
          },
        ],
        evidenceFiles: [
          { category: 'medical_records' },
          { category: 'police_report' },
        ],
        _count: { evidenceFiles: 2 },
      },
    } as any)

    const res = await request(app)
      .get('/v1/case-routing/introductions/intro-1/summary')
      .set(authHeader(attorneyUser.id))

    expect(res.status).toBe(200)
    expect(res.body.introductionId).toBe('intro-1')
    expect(res.body.caseSnapshot.claimType).toBe('auto')
    expect(res.body.caseSnapshot.jurisdiction).toContain('CA')
    expect(res.body.caseSnapshot.caseScore).toBeGreaterThan(0)
    expect(prisma.introduction.findFirst).toHaveBeenCalledWith({
      where: { id: 'intro-1', attorneyId: 'att-1' },
      select: {
        id: true,
        status: true,
        assessmentId: true,
        assessment: {
          select: {
            id: true,
            claimType: true,
            venueState: true,
            venueCounty: true,
            facts: true,
            predictions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                viability: true,
                bands: true,
              },
            },
            evidenceFiles: { select: { category: true } },
          },
        },
      },
    })
    expect(lifecycle.recordRoutingEvent).toHaveBeenCalledWith(
      'asm-1',
      'intro-1',
      'att-1',
      'viewed',
      {}
    )
  })

  it('matches attorney records case-insensitively by email via direct lookup', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-case' } as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      id: 'intro-case',
      status: 'PENDING',
      assessmentId: 'asm-case',
      attorneyId: 'att-case',
      assessment: {
        id: 'asm-case',
        claimType: 'auto',
        venueState: 'CA',
        venueCounty: null,
        facts: JSON.stringify({ damages: {} }),
        predictions: [],
        evidenceFiles: [],
        _count: { evidenceFiles: 0 },
      },
    } as any)

    const res = await request(app)
      .get('/v1/case-routing/introductions/intro-case/summary')
      .set(authHeader(attorneyUser.id))

    expect(res.status).toBe(200)
    expect(res.body.introductionId).toBe('intro-case')
    expect(prisma.attorney.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { email: attorneyUser.email },
          { email: attorneyUser.email.toLowerCase() },
          { email: attorneyUser.email.toUpperCase() },
        ],
      },
      select: { id: true },
    })
  })

  it('401 without token', async () => {
    const res = await request(app).get('/v1/case-routing/introductions/intro-1/summary')
    expect(res.status).toBe(401)
  })
})

describe('POST /v1/case-routing/introductions/:id/accept', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-1' } as any)
    vi.mocked(lifecycle.attorneyAcceptCase).mockReset()
  })

  it('200 when lifecycle succeeds', async () => {
    vi.mocked(lifecycle.attorneyAcceptCase).mockResolvedValue({ success: true })

    const res = await request(app)
      .post('/v1/case-routing/introductions/intro-1/accept')
      .set(authHeader(attorneyUser.id))

    expect(res.status).toBe(200)
    expect(lifecycle.attorneyAcceptCase).toHaveBeenCalledWith('intro-1', 'att-1')
  })

  it('400 when lifecycle returns error', async () => {
    vi.mocked(lifecycle.attorneyAcceptCase).mockResolvedValue({
      success: false,
      error: 'Introduction already ACCEPTED',
    })

    const res = await request(app)
      .post('/v1/case-routing/introductions/intro-1/accept')
      .set(authHeader(attorneyUser.id))

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Introduction already ACCEPTED')
  })
})

describe('POST /v1/case-routing/introductions/:id/decline', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-1' } as any)
    vi.mocked(lifecycle.attorneyDeclineCase).mockReset()
  })

  it('200 passes decline reason to lifecycle', async () => {
    vi.mocked(lifecycle.attorneyDeclineCase).mockResolvedValue({ success: true })

    const res = await request(app)
      .post('/v1/case-routing/introductions/intro-1/decline')
      .set(authHeader(attorneyUser.id))
      .send({ declineReason: 'Capacity' })

    expect(res.status).toBe(200)
    expect(lifecycle.attorneyDeclineCase).toHaveBeenCalledWith('intro-1', 'att-1', 'Capacity')
  })
})

describe('POST /v1/case-routing/introductions/:id/request-info', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-1' } as any)
    vi.mocked(lifecycle.attorneyRequestMoreInfo).mockReset()
  })

  it('400 when notes missing', async () => {
    const res = await request(app)
      .post('/v1/case-routing/introductions/intro-1/request-info')
      .set(authHeader(attorneyUser.id))
      .send({})

    expect(res.status).toBe(400)
    expect(lifecycle.attorneyRequestMoreInfo).not.toHaveBeenCalled()
  })

  it('200 when lifecycle succeeds', async () => {
    vi.mocked(lifecycle.attorneyRequestMoreInfo).mockResolvedValue({ success: true })

    const res = await request(app)
      .post('/v1/case-routing/introductions/intro-1/request-info')
      .set(authHeader(attorneyUser.id))
      .send({ notes: 'Medical records?' })

    expect(res.status).toBe(200)
    expect(lifecycle.attorneyRequestMoreInfo).toHaveBeenCalledWith(
      'intro-1',
      'att-1',
      'Medical records?'
    )
  })
})

describe('GET /v1/case-routing/assessment/:id/status (plaintiff)', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockImplementation(async (args: any) => {
      if (args?.where?.id === plaintiffUser.id) return plaintiffUser as any
      return null
    })
  })

  it('404 when assessment missing', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(null as any)

    const res = await request(app)
      .get('/v1/case-routing/assessment/asm-x/status')
      .set(authHeader(plaintiffUser.id))

    expect(res.status).toBe(404)
  })

  it('403 when assessment belongs to another user', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: 'someone-else',
      facts: '{}',
      introductions: [],
      leadSubmission: null,
      user: null,
    } as any)

    const res = await request(app)
      .get('/v1/case-routing/assessment/asm-1/status')
      .set(authHeader(plaintiffUser.id))

    expect(res.status).toBe(403)
  })

  it('200 returns routing stage and counts', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: plaintiffUser.id,
      facts: '{}',
      introductions: [
        {
          status: 'PENDING',
          attorney: {
            id: 'a1',
            name: 'Lawyer',
            email: 'l@test.com',
            phone: null,
            specialties: '[]',
            responseTimeHours: 24,
            lawFirmId: null,
            lawFirm: null,
          },
        },
      ],
      leadSubmission: { lifecycleState: 'routing', routingLocked: false },
      user: { email: plaintiffUser.email },
    } as any)
    vi.mocked(prisma.routingAnalytics.findMany).mockResolvedValue([] as any)

    const res = await request(app)
      .get('/v1/case-routing/assessment/asm-1/status')
      .set(authHeader(plaintiffUser.id))

    expect(res.status).toBe(200)
    expect(res.body.assessmentId).toBe('asm-1')
    expect(res.body.attorneysRouted).toBe(1)
    expect(res.body.attorneysReviewing).toBe(1)
    expect(res.body.attorneyMatched).toBeNull()
    expect(prisma.assessment.findUnique).toHaveBeenCalledWith({
      where: { id: 'asm-1' },
      select: {
        id: true,
        userId: true,
        facts: true,
        user: { select: { email: true } },
        leadSubmission: {
          select: {
            lifecycleState: true,
          },
        },
        introductions: {
          select: {
            status: true,
            attorney: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                specialties: true,
                responseTimeHours: true,
                lawFirmId: true,
                lawFirm: { select: { name: true } },
              },
            },
          },
        },
      },
    })
  })

  it('200 surfaces manual review status from lifecycle state', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: plaintiffUser.id,
      facts: '{}',
      introductions: [],
      leadSubmission: { lifecycleState: 'manual_review_needed', routingLocked: false },
      user: { email: plaintiffUser.email },
    } as any)
    vi.mocked(prisma.routingAnalytics.findMany).mockResolvedValue([
      { eventType: 'manual_review_needed', createdAt: new Date('2026-04-06T11:00:00.000Z') },
    ] as any)

    const res = await request(app)
      .get('/v1/case-routing/assessment/asm-1/status')
      .set(authHeader(plaintiffUser.id))

    expect(res.status).toBe(200)
    expect(res.body.lifecycleState).toBe('manual_review_needed')
    expect(res.body.statusMessage).toMatch(/manual review/i)
    expect(res.body.attorneyActivity).toEqual([
      expect.objectContaining({ type: 'manual_review_needed' }),
    ])
  })

  it('200 surfaces expanded-search messaging after ranked choices are exhausted', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: plaintiffUser.id,
      facts: '{}',
      introductions: [
        {
          status: 'DECLINED',
          attorney: {
            id: 'a1',
            name: 'Lawyer One',
            email: 'l1@test.com',
            phone: null,
            specialties: '[]',
            responseTimeHours: 24,
            lawFirmId: null,
            lawFirm: null,
          },
        },
        {
          status: 'PENDING',
          attorney: {
            id: 'a2',
            name: 'Lawyer Two',
            email: 'l2@test.com',
            phone: null,
            specialties: '[]',
            responseTimeHours: 24,
            lawFirmId: null,
            lawFirm: null,
          },
        },
      ],
      leadSubmission: { lifecycleState: 'attorney_review', routingLocked: false },
      user: { email: plaintiffUser.email },
    } as any)
    vi.mocked(prisma.routingAnalytics.findMany).mockResolvedValue([
      { eventType: 'plaintiff_rank_batch_generated', createdAt: new Date('2026-04-06T11:05:00.000Z') },
      { eventType: 'plaintiff_rank_advanced', createdAt: new Date('2026-04-06T11:00:00.000Z') },
    ] as any)

    const res = await request(app)
      .get('/v1/case-routing/assessment/asm-1/status')
      .set(authHeader(plaintiffUser.id))

    expect(res.status).toBe(200)
    expect(res.body.lifecycleState).toBe('attorney_review')
    expect(res.body.statusMessage).toMatch(/expanded the search/i)
    expect(res.body.attorneyActivity).toEqual([
      expect.objectContaining({ type: 'plaintiff_rank_batch_generated' }),
      expect.objectContaining({ type: 'plaintiff_rank_advanced' }),
    ])
  })

  it('200 matched attorney when intro accepted', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: plaintiffUser.id,
      facts: '{}',
      introductions: [
        {
          status: 'ACCEPTED',
          attorney: {
            id: 'a1',
            name: 'Lawyer',
            email: 'l@test.com',
            phone: '555',
            specialties: '[]',
            responseTimeHours: 12,
            lawFirmId: null,
            lawFirm: { name: 'Firm' },
          },
        },
      ],
      leadSubmission: { lifecycleState: 'attorney_matched', routingLocked: true },
      user: { email: plaintiffUser.email },
    } as any)
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      id: 'apt-1',
      scheduledAt: new Date('2026-04-07T12:00:00.000Z'),
      type: 'consult',
      attorney: { name: 'Lawyer' },
    } as any)
    vi.mocked(prisma.attorneyProfile.findUnique).mockResolvedValue({ yearsExperience: 15 } as any)
    vi.mocked(prisma.routingAnalytics.findMany).mockResolvedValue([
      { eventType: 'accepted', createdAt: new Date('2026-04-06T11:00:00.000Z') },
    ] as any)
    vi.mocked(prisma.chatRoom.findFirst).mockResolvedValue({ id: 'chat-1' } as any)
    vi.mocked(prisma.message.findMany).mockResolvedValue([
      {
        content: 'Looking forward to speaking.',
        createdAt: new Date('2026-04-06T11:05:00.000Z'),
        senderType: 'attorney',
      },
    ] as any)

    const res = await request(app)
      .get('/v1/case-routing/assessment/asm-1/status')
      .set(authHeader(plaintiffUser.id))

    expect(res.status).toBe(200)
    expect(res.body.attorneyMatched).not.toBeNull()
    expect(res.body.attorneyMatched.name).toBe('Lawyer')
    expect(res.body.attorneyMatched.firmName).toBe('Firm')
    expect(res.body.upcomingAppointment).toMatchObject({
      id: 'apt-1',
      type: 'consult',
      attorney: { name: 'Lawyer' },
    })
    expect(res.body.caseChatRoomId).toBe('chat-1')
    expect(res.body.caseMessages).toEqual([
      expect.objectContaining({
        message: 'Looking forward to speaking.',
        from: 'attorney',
        chatRoomId: 'chat-1',
      }),
    ])
    expect(prisma.appointment.findFirst).toHaveBeenCalledWith({
      where: {
        userId: plaintiffUser.id,
        assessmentId: 'asm-1',
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledAt: { gte: expect.any(Date) },
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        scheduledAt: true,
        type: true,
        attorney: { select: { name: true } },
      },
    })
    expect(prisma.attorneyProfile.findUnique).toHaveBeenCalledWith({
      where: { attorneyId: 'a1' },
      select: { yearsExperience: true },
    })
    expect(prisma.routingAnalytics.findMany).toHaveBeenCalledWith({
      where: { assessmentId: 'asm-1' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        eventType: true,
        createdAt: true,
      },
    })
    expect(prisma.chatRoom.findFirst).toHaveBeenCalledWith({
      where: {
        userId: plaintiffUser.id,
        attorneyId: 'a1',
        assessmentId: 'asm-1',
      },
      select: { id: true },
    })
    expect(prisma.message.findMany).toHaveBeenCalledWith({
      where: { chatRoomId: 'chat-1' },
      orderBy: { createdAt: 'asc' },
      take: 50,
      select: {
        content: true,
        createdAt: true,
        senderType: true,
      },
    })
  })

  it('falls back to compact notification messages when no chat room exists', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: plaintiffUser.id,
      facts: '{}',
      introductions: [
        {
          status: 'ACCEPTED',
          attorney: {
            id: 'a1',
            name: 'Lawyer',
            email: 'l@test.com',
            phone: '555',
            specialties: '[]',
            responseTimeHours: 12,
            lawFirmId: null,
            lawFirm: { name: 'Firm' },
          },
        },
      ],
      leadSubmission: { lifecycleState: 'attorney_matched' },
      user: { email: plaintiffUser.email },
    } as any)
    vi.mocked(prisma.attorneyProfile.findUnique).mockResolvedValue({ yearsExperience: 15 } as any)
    vi.mocked(prisma.routingAnalytics.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.chatRoom.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.notification.findMany).mockResolvedValue([
      {
        subject: 'Case update',
        message: 'Attorney requested more info',
        createdAt: new Date('2026-04-06T11:10:00.000Z'),
      },
    ] as any)

    const res = await request(app)
      .get('/v1/case-routing/assessment/asm-1/status')
      .set(authHeader(plaintiffUser.id))

    expect(res.status).toBe(200)
    expect(res.body.caseChatRoomId).toBeNull()
    expect(res.body.caseMessages).toEqual([
      expect.objectContaining({
        subject: 'Case update',
        message: 'Attorney requested more info',
        from: 'attorney',
      }),
    ])
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: {
        recipient: plaintiffUser.email,
        metadata: { contains: 'asm-1' },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        subject: true,
        message: true,
        createdAt: true,
      },
    })
  })
})

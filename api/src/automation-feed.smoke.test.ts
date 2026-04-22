import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/auth', () => {
  const users: Record<string, any> = {
    attorney: {
      id: 'attorney-user-1',
      email: 'attorney@example.com',
      firstName: 'Ari',
      lastName: 'Attorney',
      role: 'attorney',
      isActive: true,
    },
  }
  return {
    authMiddleware: (req: any, res: any, next: any) => {
      const header = req.headers.authorization
      if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' })
      }
      const token = header.substring(7)
      req.user = users[token] ?? null
      if (!req.user) return res.status(401).json({ error: 'No token provided' })
      next()
    },
    optionalAuthMiddleware: (req: any, _res: any, next: any) => next(),
    requireRole: () => (_req: any, _res: any, next: any) => next(),
    generateToken: vi.fn(),
    verifyToken: vi.fn(),
  }
})

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

describe('Automation feed + audit (smoke / UX regression)', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('GET /v1/attorney-dashboard/dashboard includes automationFeed with audit-backed activity trail', async () => {
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
      totalFeesCollected: 12000,
      totalPlatformSpend: 4000,
    } as any)

    const leadRow = {
      id: 'lead-1',
      assessmentId: 'asm-1',
      status: 'submitted',
      submittedAt: new Date('2026-04-04T00:00:00.000Z'),
      updatedAt: new Date('2026-04-04T00:00:00.000Z'),
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
    }

    vi.mocked(prisma.leadSubmission.findMany)
      .mockResolvedValueOnce([leadRow] as any)
      .mockResolvedValueOnce([
        {
          id: 'lead-1',
          assessmentId: 'asm-1',
          status: 'submitted',
          submittedAt: new Date('2026-04-04T00:00:00.000Z'),
          updatedAt: new Date('2026-04-04T00:00:00.000Z'),
          lastContactAt: null,
          contactAttempts: [],
          documentRequests: [],
          assessment: {
            predictions: [],
          },
        },
      ] as any)

    vi.mocked(prisma.leadSubmission.count).mockResolvedValue(1 as any)
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.chatRoom.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.leadContact.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.caseContact.count).mockResolvedValue(0 as any)

    const reminder = {
      id: 'rem-feed-1',
      assessmentId: 'asm-1',
      message: '[Readiness][missing_docs] Collect police report and records.',
      dueAt: new Date('2026-04-12T12:00:00.000Z'),
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-06T00:00:00.000Z'),
      status: 'scheduled',
    }
    vi.mocked(prisma.caseReminder.findMany).mockResolvedValue([reminder] as any)
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      {
        id: 'audit-1',
        entityType: 'automation_feed',
        entityId: 'rem-feed-1',
        action: 'automation_feed_snoozed',
        createdAt: new Date('2026-04-06T15:00:00.000Z'),
      },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-dashboard/dashboard')
      .set('Authorization', 'Bearer attorney')
      .expect(200)

    expect(Array.isArray(res.body.automationFeed)).toBe(true)
    expect(res.body.automationFeed).toHaveLength(1)
    expect(res.body.automationFeed[0]).toMatchObject({
      id: 'rem-feed-1',
      leadId: 'lead-1',
      category: 'missing_docs',
    })
    expect(res.body.automationFeed[0].activityTrail?.some((e: { label: string }) => e.label === 'Snoozed')).toBe(true)
  })

  it('PATCH /v1/attorney-dashboard/leads/:leadId/reminders/:id persists automation_feed_snoozed audit for readiness reminders', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({
      id: 'attorney-record-1',
      email: 'attorney@example.com',
      lawFirmId: 'firm-1',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignedAttorneyId: 'attorney-record-1',
      assignmentType: 'exclusive',
    } as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.ethicalWall.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.caseShare.findFirst).mockResolvedValue(null)

    const prevDue = new Date('2026-04-10T12:00:00.000Z')
    const nextDue = new Date('2026-04-15T12:00:00.000Z')

    vi.mocked(prisma.caseReminder.findUnique).mockResolvedValue({
      id: 'rem-1',
      assessmentId: 'asm-1',
      message: '[Readiness][missing_docs] Test',
      dueAt: prevDue,
      status: 'scheduled',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    } as any)

    vi.mocked(prisma.caseReminder.update).mockResolvedValue({
      id: 'rem-1',
      assessmentId: 'asm-1',
      message: '[Readiness][missing_docs] Test',
      dueAt: nextDue,
      status: 'scheduled',
    } as any)

    await request(app)
      .patch('/v1/attorney-dashboard/leads/lead-1/reminders/rem-1')
      .set('Authorization', 'Bearer attorney')
      .send({ dueAt: nextDue.toISOString(), status: 'scheduled' })
      .expect(200)

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'automation_feed_snoozed',
          entityType: 'automation_feed',
          entityId: 'rem-1',
          attorneyId: 'attorney-record-1',
        }),
      }),
    )
  })

  it('PATCH /v1/attorney-dashboard/leads/:leadId/reminders/:id persists automation_feed_dismissed audit when status is dismissed', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({
      id: 'attorney-record-1',
      email: 'attorney@example.com',
      lawFirmId: 'firm-1',
    } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignedAttorneyId: 'attorney-record-1',
      assignmentType: 'exclusive',
    } as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.ethicalWall.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.caseShare.findFirst).mockResolvedValue(null)

    vi.mocked(prisma.caseReminder.findUnique).mockResolvedValue({
      id: 'rem-2',
      assessmentId: 'asm-1',
      message: '[Readiness][treatment_gap] Gap detected',
      dueAt: new Date('2026-04-10T12:00:00.000Z'),
      status: 'scheduled',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    } as any)

    vi.mocked(prisma.caseReminder.update).mockResolvedValue({
      id: 'rem-2',
      assessmentId: 'asm-1',
      message: '[Readiness][treatment_gap] Gap detected',
      dueAt: new Date('2026-04-10T12:00:00.000Z'),
      status: 'dismissed',
    } as any)

    await request(app)
      .patch('/v1/attorney-dashboard/leads/lead-1/reminders/rem-2')
      .set('Authorization', 'Bearer attorney')
      .send({ status: 'dismissed' })
      .expect(200)

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'automation_feed_dismissed',
          entityType: 'automation_feed',
          entityId: 'rem-2',
        }),
      }),
    )
  })
})

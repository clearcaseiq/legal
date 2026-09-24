import { describe, expect, it, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

let callerIsManager = true

vi.mock('../lib/prisma', () => ({
  prisma: {
    caseAssistance: { findMany: vi.fn(), count: vi.fn() },
  },
}))

vi.mock('../lib/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', email: 'ops@clearcaseiq.com', role: callerIsManager ? 'admin' : 'specialist' }
    next()
  },
}))

vi.mock('../lib/specialist-access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/specialist-access')>()),
  specialistMiddleware: (_req: any, _res: any, next: any) => next(),
  isCaseAssistanceManager: () => callerIsManager,
}))

import { prisma } from '../lib/prisma'
import router from './case-assistance'

const app = express()
app.use('/v1/case-assistance', router)

function arrival(overrides: Record<string, any> = {}) {
  return {
    id: 'ca-1',
    assessmentId: 'asm-1',
    status: 'new_submission',
    priority: 'normal',
    assignedSpecialistId: 'user-1',
    assignedSpecialist: null,
    assignedAt: new Date(),
    createdAt: new Date(),
    assessment: {
      id: 'asm-1',
      claimType: 'auto',
      referenceCode: 'CC-1052',
      facts: '{}',
      status: 'COMPLETED',
      user: { id: 'u-1', firstName: 'Jose', lastName: 'Canseco', email: 'jose@example.com' },
      leadSubmission: null,
    },
    ...overrides,
  }
}

describe('GET /v1/case-assistance/new-arrivals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    callerIsManager = true
  })

  it('returns only the server clock without a since, so the backlog never pops up', async () => {
    const res = await request(app).get('/v1/case-assistance/new-arrivals').expect(200)

    expect(res.body).toMatchObject({ total: 0, data: [] })
    expect(typeof res.body.serverTime).toBe('string')
    expect(prisma.caseAssistance.findMany).not.toHaveBeenCalled()
  })

  it('returns cases that arrived or were assigned to the caller since then', async () => {
    vi.mocked(prisma.caseAssistance.findMany).mockResolvedValue([arrival()] as any)
    vi.mocked(prisma.caseAssistance.count).mockResolvedValue(1)
    const since = new Date(Date.now() - 60_000).toISOString()

    const res = await request(app).get('/v1/case-assistance/new-arrivals').query({ since }).expect(200)

    expect(res.body.total).toBe(1)
    expect(res.body.data[0]).toMatchObject({ id: 'ca-1', referenceCode: 'CC-1052', assignedToMe: true })
    const where = vi.mocked(prisma.caseAssistance.findMany).mock.calls[0]?.[0]?.where as any
    expect(where.AND[2].OR).toEqual([
      { createdAt: { gt: new Date(since) } },
      { assignedSpecialistId: 'user-1', assignedAt: { gt: new Date(since) } },
    ])
  })

  it('limits a specialist to their own and unassigned cases', async () => {
    callerIsManager = false
    vi.mocked(prisma.caseAssistance.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.caseAssistance.count).mockResolvedValue(0)

    await request(app)
      .get('/v1/case-assistance/new-arrivals')
      .query({ since: new Date().toISOString() })
      .expect(200)

    const where = vi.mocked(prisma.caseAssistance.findMany).mock.calls[0]?.[0]?.where as any
    expect(where.AND[0]).toEqual({ OR: [{ assignedSpecialistId: 'user-1' }, { assignedSpecialistId: null }] })
  })

  it('caps a stale since at a day back', async () => {
    vi.mocked(prisma.caseAssistance.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.caseAssistance.count).mockResolvedValue(0)

    await request(app).get('/v1/case-assistance/new-arrivals').query({ since: '2026-01-01T00:00:00Z' }).expect(200)

    const where = vi.mocked(prisma.caseAssistance.findMany).mock.calls[0]?.[0]?.where as any
    const floor = where.AND[2].OR[0].createdAt.gt as Date
    expect(Date.now() - floor.getTime()).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5_000)
  })
})

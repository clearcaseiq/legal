/**
 * Sending a case to the plaintiff's next ranked attorney from the admin console.
 *
 * The Route case modal only ever force-routed to an attorney the admin picked,
 * from an engine shortlist that ignores the plaintiff's ranking, so an admin
 * could not route a case to the attorneys the plaintiff chose without working
 * out the next name by hand.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

const routeCaseReleasedFromReview = vi.fn()
const recordRoutingEvent = vi.fn().mockResolvedValue(undefined)
const writeAdminAudit = vi.fn().mockResolvedValue(undefined)

vi.mock('../lib/prisma', () => ({
  prisma: {
    assessment: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('../lib/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'admin-1', email: 'ops@clearcaseiq.com', role: 'admin' }
    next()
  },
}))

vi.mock('../lib/admin-access', () => ({
  adminMiddleware: (_req: any, _res: any, next: any) => next(),
  requireAdminCapability: () => (_req: any, _res: any, next: any) => next(),
  isAdminUser: () => true,
}))

vi.mock('../lib/admin-audit', () => ({
  writeAdminAudit: (...args: unknown[]) => writeAdminAudit(...args),
}))

vi.mock('../lib/routing-lifecycle', async (importOriginal) => ({
  getRankedAttorneyIdsFromLead: (await importOriginal<typeof import('../lib/routing-lifecycle')>())
    .getRankedAttorneyIdsFromLead,
  recordRoutingEvent: (...args: unknown[]) => recordRoutingEvent(...args),
}))

vi.mock('../lib/manual-review-release', () => ({
  routeCaseReleasedFromReview: (...args: unknown[]) => routeCaseReleasedFromReview(...args),
}))

vi.mock('../lib/routing-escalation-sweep', () => ({ runRoutingEscalationSweep: vi.fn() }))
vi.mock('../lib/case-notifications', () => ({ sendCaseOfferToAttorney: vi.fn() }))
vi.mock('../lib/claims', () => ({
  CLAIM_INVITE_TTL_DAYS: 7,
  claimUrl: () => '',
  generateClaimToken: () => '',
  sendClaimEmail: vi.fn(),
}))

import { prisma } from '../lib/prisma'
import router from './admin-cases'

const app = express()
app.use(express.json())
app.use('/v1/admin', router)

const RANKED_LEAD = {
  status: 'submitted',
  sourceDetails: JSON.stringify({ plaintiffAttorneyPreferences: { rankedAttorneyIds: ['att-1', 'att-2'] } }),
}

function caseWith(overrides: Record<string, unknown> = {}) {
  return {
    id: 'asm-1',
    manualReviewStatus: null,
    leadSubmission: RANKED_LEAD,
    introductions: [],
    ...overrides,
  }
}

function routeNext(body: Record<string, unknown> = {}) {
  return request(app).post('/v1/admin/cases/asm-1/route-plaintiff-choice').send(body)
}

beforeEach(() => {
  vi.clearAllMocks()
  recordRoutingEvent.mockResolvedValue(undefined)
  writeAdminAudit.mockResolvedValue(undefined)
  vi.mocked(prisma.assessment.findUnique).mockResolvedValue(caseWith() as never)
  vi.mocked(prisma.assessment.update).mockResolvedValue({} as never)
  routeCaseReleasedFromReview.mockResolvedValue({ mode: 'ranked_routed', routedCount: 1, attorneyId: 'att-1' })
})

describe('routing to the plaintiff\'s next choice', () => {
  it('sends the case down the plaintiff\'s ranked queue', async () => {
    const res = await routeNext()

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, mode: 'ranked_routed', attorneyId: 'att-1' })
    expect(routeCaseReleasedFromReview).toHaveBeenCalledWith('asm-1', { overrideRoutingDisabled: false })
  })

  it('clears a pending review hold once the case is placed', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(caseWith({ manualReviewStatus: 'pending' }) as never)

    await routeNext()

    expect(prisma.assessment.update).toHaveBeenCalledWith({
      where: { id: 'asm-1' },
      data: expect.objectContaining({ manualReviewStatus: 'released', reviewedBy: 'admin-1' }),
    })
  })

  it('refuses a case where the plaintiff chose nobody, rather than tier-routing it', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(
      caseWith({ leadSubmission: { status: 'submitted', sourceDetails: '{}' } }) as never,
    )

    const res = await routeNext()

    expect(res.status).toBe(400)
    expect(routeCaseReleasedFromReview).not.toHaveBeenCalled()
  })

  it('waits while one of the plaintiff\'s choices is still reviewing', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(
      caseWith({ introductions: [{ status: 'PENDING', attorney: { name: 'Alice Donald' } }] }) as never,
    )

    const res = await routeNext()

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/Alice Donald is still reviewing/)
    expect(routeCaseReleasedFromReview).not.toHaveBeenCalled()
  })

  it('refuses a case an attorney is already working', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(
      caseWith({ leadSubmission: { ...RANKED_LEAD, status: 'retained' } }) as never,
    )

    const res = await routeNext()

    expect(res.status).toBe(409)
    expect(routeCaseReleasedFromReview).not.toHaveBeenCalled()
  })
})

describe('while routing is paused', () => {
  beforeEach(() => {
    routeCaseReleasedFromReview.mockResolvedValue({ mode: 'held', routedCount: 0, error: 'Routing disabled by admin' })
  })

  it('reports the pause, offers the override, and leaves a review hold in place', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(caseWith({ manualReviewStatus: 'pending' }) as never)

    const res = await routeNext()

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ pausedByAdmin: true, canOverride: true })
    expect(prisma.assessment.update).not.toHaveBeenCalled()
  })

  it('records who lifted the pause before trying', async () => {
    routeCaseReleasedFromReview.mockResolvedValue({ mode: 'ranked_routed', routedCount: 1, attorneyId: 'att-1' })

    await routeNext({ override: true })

    expect(recordRoutingEvent).toHaveBeenCalledWith(
      'asm-1',
      null,
      null,
      'routing_pause_overridden',
      expect.objectContaining({ source: 'admin_route_plaintiff_choice', actorEmail: 'ops@clearcaseiq.com' }),
    )
    expect(routeCaseReleasedFromReview).toHaveBeenCalledWith('asm-1', { overrideRoutingDisabled: true })
  })
})

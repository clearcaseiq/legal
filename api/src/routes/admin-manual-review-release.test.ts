/**
 * Releasing a case out of the manual review queue.
 *
 * The release used to stamp `manualReviewStatus = 'released'` before it tried
 * to route anything, and never put it back. So a release that placed nobody —
 * the platform-wide routing pause being the usual cause — took the case out of
 * the queue it was sitting in, gave it to no attorney, and answered 400 on the
 * retry because it was no longer pending. The case was reachable from nowhere.
 *
 * Now the decision is written only once routing has a result, and an admin can
 * elect to release past the pause.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

const routeReleasedCaseRespectingConsumerSlate = vi.fn()
const startAssessmentRouting = vi.fn()
const recordRoutingEvent = vi.fn().mockResolvedValue(undefined)
const writeAdminAudit = vi.fn().mockResolvedValue(undefined)

vi.mock('../lib/prisma', () => ({
  prisma: {
    assessment: { findUnique: vi.fn(), update: vi.fn() },
    leadSubmission: { upsert: vi.fn() },
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

vi.mock('../lib/routing-lifecycle', () => ({
  routeReleasedCaseRespectingConsumerSlate: (...args: unknown[]) =>
    routeReleasedCaseRespectingConsumerSlate(...args),
  recordRoutingEvent: (...args: unknown[]) => recordRoutingEvent(...args),
}))

vi.mock('../lib/assessment-routing', () => ({
  startAssessmentRouting: (...args: unknown[]) => startAssessmentRouting(...args),
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

const PAUSED = 'Routing disabled by admin'

function release(body: Record<string, unknown> = {}) {
  return request(app).post('/v1/admin/manual-review/asm-1/action').send({ action: 'release', ...body })
}

/** Whether the handler committed the decision that empties the queue row. */
function statusWritten() {
  return vi.mocked(prisma.assessment.update).mock.calls.some(
    (call) => (call[0] as any)?.data?.manualReviewStatus === 'released',
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  recordRoutingEvent.mockResolvedValue(undefined)
  writeAdminAudit.mockResolvedValue(undefined)
  vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
    id: 'asm-1',
    manualReviewStatus: 'pending',
    manualReviewNote: null,
    leadSubmission: null,
  } as never)
  vi.mocked(prisma.assessment.update).mockResolvedValue({} as never)
  vi.mocked(prisma.leadSubmission.upsert).mockResolvedValue({} as never)
  routeReleasedCaseRespectingConsumerSlate.mockResolvedValue({ mode: 'ranked_routed', attorneyId: 'att-1' })
})

describe('a release that reaches an attorney', () => {
  it('routes in the order the plaintiff chose and clears the queue row', async () => {
    const res = await release()

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, routing: 'ranked_routed' })
    expect(statusWritten()).toBe(true)
  })

  it('keeps the case in the queue only until it is placed', async () => {
    // Proposing a fresh batch is a forward state, not a failure: the claimant
    // now has something to approve, so the review decision stands.
    routeReleasedCaseRespectingConsumerSlate.mockResolvedValue({ mode: 'awaiting_approval' })

    const res = await release()

    expect(res.status).toBe(200)
    expect(statusWritten()).toBe(true)
  })
})

describe('a release the routing pause stopped', () => {
  beforeEach(() => {
    routeReleasedCaseRespectingConsumerSlate.mockResolvedValue({ mode: 'held', error: PAUSED })
  })

  it('leaves the case in the manual review queue', async () => {
    const res = await release()

    expect(res.status).toBe(409)
    expect(statusWritten()).toBe(false)
  })

  it('offers the override and names the pause as the cause', async () => {
    const res = await release()

    expect(res.body).toMatchObject({ pausedByAdmin: true, canOverride: true })
  })

  it('can be retried, because the case never left the queue', async () => {
    await release()
    routeReleasedCaseRespectingConsumerSlate.mockResolvedValue({ mode: 'ranked_routed' })

    const res = await release()

    expect(res.status).toBe(200)
    expect(statusWritten()).toBe(true)
  })
})

describe('a release stopped by something else', () => {
  it('still keeps the case in the queue but offers no override', async () => {
    // Nobody in the venue is not something an override can fix, and offering
    // one would send the admin round a loop that cannot end.
    routeReleasedCaseRespectingConsumerSlate.mockResolvedValue({
      mode: 'held',
      error: 'No attorney covers this venue',
    })

    const res = await release()

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ pausedByAdmin: false, canOverride: false })
    expect(statusWritten()).toBe(false)
  })

  it('treats a thrown router as a failure rather than a success', async () => {
    routeReleasedCaseRespectingConsumerSlate.mockRejectedValue(new Error('engine down'))

    const res = await release()

    expect(res.status).toBe(409)
    expect(statusWritten()).toBe(false)
  })
})

describe('the override', () => {
  it('is carried into the ranked release path', async () => {
    await release({ override: true })

    expect(routeReleasedCaseRespectingConsumerSlate).toHaveBeenCalledWith(
      'asm-1',
      expect.objectContaining({ overrideRoutingDisabled: true }),
    )
  })

  it('is carried into the fallback path for a case with no chosen firms', async () => {
    routeReleasedCaseRespectingConsumerSlate.mockResolvedValue({ mode: 'no_consumer_slate' })
    startAssessmentRouting.mockResolvedValue({ success: true, routedTo: ['att-9'] })

    await release({ override: true })

    expect(startAssessmentRouting).toHaveBeenCalledWith(
      'asm-1',
      expect.objectContaining({ overrideRoutingDisabled: true }),
    )
  })

  it('is audited with who used it', async () => {
    await release({ override: true })

    expect(recordRoutingEvent).toHaveBeenCalledWith(
      'asm-1',
      null,
      null,
      'routing_pause_overridden',
      expect.objectContaining({ actorEmail: 'ops@clearcaseiq.com' }),
    )
  })

  it('writes no audit row for an ordinary release', async () => {
    await release()

    expect(recordRoutingEvent).not.toHaveBeenCalled()
  })

  it('is not offered again on a release that already used it', async () => {
    routeReleasedCaseRespectingConsumerSlate.mockResolvedValue({ mode: 'held', error: PAUSED })

    const res = await release({ override: true })

    expect(res.body.canOverride).toBe(false)
  })
})

describe('the fallback for a case with no chosen firms', () => {
  it('keeps the case in the queue when the engine places nobody', async () => {
    // This path used to be fire-and-forget, so its failure was invisible and
    // the case was marked released regardless of what the engine did.
    routeReleasedCaseRespectingConsumerSlate.mockResolvedValue({ mode: 'no_consumer_slate' })
    startAssessmentRouting.mockResolvedValue({ success: false, gateReason: PAUSED })

    const res = await release()

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ canOverride: true })
    expect(statusWritten()).toBe(false)
  })
})

describe('the other review decisions', () => {
  it('are written immediately, with no routing attempted', async () => {
    const res = await request(app)
      .post('/v1/admin/manual-review/asm-1/action')
      .send({ action: 'reject', note: 'Not viable' })

    expect(res.status).toBe(200)
    expect(routeReleasedCaseRespectingConsumerSlate).not.toHaveBeenCalled()
    const call = vi.mocked(prisma.assessment.update).mock.calls.at(-1)?.[0] as any
    expect(call.data.manualReviewStatus).toBe('rejected')
  })

  it('are refused for a case that is not in the queue', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      manualReviewStatus: 'released',
    } as never)

    const res = await release()

    expect(res.status).toBe(400)
  })
})

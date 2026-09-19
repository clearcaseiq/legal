/**
 * Releasing one case past a fleet-wide routing pause.
 *
 * "Ready for Attorney" plus routing switched off was a dead end: the specialist
 * pressed Release for Routing, the engine refused on the global switch, and the
 * only way to move that one finished case was to turn routing back on for
 * everybody or to force-route it from the admin API, which names a single
 * attorney and checks no disclosure authorization at all.
 *
 * The override closes that, and these tests hold the line around it: admins
 * only, audited before the attempt, and offered in the response only to callers
 * who may actually use it.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

const startAssessmentRouting = vi.fn()
const recordRoutingEvent = vi.fn().mockResolvedValue(undefined)
let callerIsManager = true

vi.mock('../lib/prisma', () => ({
  prisma: {
    caseAssistance: { findUnique: vi.fn(), update: vi.fn() },
    caseInteraction: { create: vi.fn() },
  },
}))

vi.mock('../lib/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'admin-1', email: 'ops@clearcaseiq.com', role: 'admin' }
    next()
  },
}))

vi.mock('../lib/specialist-access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/specialist-access')>()),
  specialistMiddleware: (_req: any, _res: any, next: any) => next(),
  isCaseAssistanceManager: () => callerIsManager,
}))

vi.mock('../lib/assessment-routing', () => ({
  startAssessmentRouting: (...args: unknown[]) => startAssessmentRouting(...args),
}))

vi.mock('../lib/routing-lifecycle', () => ({
  recordRoutingEvent: (...args: unknown[]) => recordRoutingEvent(...args),
}))

vi.mock('../lib/missed-call-followup', () => ({
  sendMissedCallFollowUp: vi.fn(),
}))

import { prisma } from '../lib/prisma'
import router from './case-assistance'

const app = express()
app.use(express.json())
app.use('/v1/case-assistance', router)

/** A finished case, sitting in the one status a release is allowed from. */
function readyCase(overrides: Record<string, any> = {}) {
  return {
    id: 'ca-1',
    assessmentId: 'asm-1',
    status: 'ready_for_attorney_review',
    // Assigned to the caller, so queue visibility never colours a result here.
    assignedSpecialistId: 'admin-1',
    assessment: {
      id: 'asm-1',
      facts: '{}',
      user: { id: 'u-1', firstName: 'Jose', lastName: 'Canseco' },
      leadSubmission: null,
    },
    ...overrides,
  }
}

/** What the engine returns while the global switch is off. */
const DISABLED = {
  success: false,
  disabledByAdmin: true,
  gatePassed: false,
  gateReason: 'Routing disabled by admin',
  routedTo: [],
}

function release(body: Record<string, unknown> = {}) {
  return request(app).post('/v1/case-assistance/ca-1/release-for-routing').send(body)
}

beforeEach(() => {
  vi.clearAllMocks()
  callerIsManager = true
  recordRoutingEvent.mockResolvedValue(undefined)
  vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(readyCase() as never)
  startAssessmentRouting.mockResolvedValue(DISABLED)
})

describe('releasing while routing is paused', () => {
  it('reports the pause rather than routing the case', async () => {
    const res = await release()

    expect(res.body.outcome).toBe('routing_disabled')
    expect(startAssessmentRouting).toHaveBeenCalledWith(
      'asm-1',
      expect.objectContaining({ overrideRoutingDisabled: false }),
    )
  })

  it('offers the override to an admin', async () => {
    const res = await release()

    expect(res.body.canOverride).toBe(true)
  })

  it('does not offer it to a specialist', async () => {
    callerIsManager = false

    const res = await release()

    expect(res.body.outcome).toBe('routing_disabled')
    expect(res.body.canOverride).toBe(false)
  })

  it('does not offer it again on a release that already used it', async () => {
    const res = await release({ override: true })

    expect(res.body.canOverride).toBe(false)
  })

  it('offers nothing on verdicts an override cannot change', async () => {
    // A fraud hold is not the pause, and must not read as one press away.
    startAssessmentRouting.mockResolvedValue({ success: false, gatePassed: false, gateReason: 'held' })

    const res = await release()

    expect(res.body.outcome).toBe('held_for_review')
    expect(res.body.canOverride).toBe(false)
  })
})

describe('the override itself', () => {
  it('lifts the pause for this one case', async () => {
    startAssessmentRouting.mockResolvedValue({ success: true, routedTo: ['att-1'], strategy: 'classic' })

    const res = await release({ override: true })

    expect(res.body).toMatchObject({ outcome: 'routed', routedCount: 1 })
    expect(startAssessmentRouting).toHaveBeenCalledWith(
      'asm-1',
      expect.objectContaining({ overrideRoutingDisabled: true }),
    )
  })

  it('is refused for anyone who is not an admin', async () => {
    callerIsManager = false

    const res = await release({ override: true })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('OVERRIDE_REQUIRES_ADMIN')
    expect(startAssessmentRouting).not.toHaveBeenCalled()
  })

  it('is audited with who did it', async () => {
    startAssessmentRouting.mockResolvedValue({ success: true, routedTo: ['att-1'] })

    await release({ override: true })

    expect(recordRoutingEvent).toHaveBeenCalledWith(
      'asm-1',
      null,
      null,
      'routing_pause_overridden',
      expect.objectContaining({ actorEmail: 'ops@clearcaseiq.com' }),
    )
  })

  it('is audited even when the routing attempt then fails', async () => {
    // Written before the attempt for exactly this: the record of someone
    // electing to bypass the pause must not depend on what happened next.
    startAssessmentRouting.mockRejectedValue(new Error('engine down'))

    await release({ override: true })

    expect(recordRoutingEvent).toHaveBeenCalledWith(
      'asm-1',
      null,
      null,
      'routing_pause_overridden',
      expect.anything(),
    )
  })

  it('writes no audit row for an ordinary release', async () => {
    await release()

    expect(recordRoutingEvent).not.toHaveBeenCalled()
  })

  it('still refuses a case that is not ready for attorney', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(
      readyCase({ status: 'in_progress' }) as never,
    )

    const res = await release({ override: true })

    expect(res.status).toBe(409)
    expect(startAssessmentRouting).not.toHaveBeenCalled()
    expect(recordRoutingEvent).not.toHaveBeenCalled()
  })
})

/**
 * Marking a case "Ready for Attorney" is a handover, not a badge colour.
 *
 * It used to be the latter: the status changed, the case dropped out of the
 * specialist queue, and then nothing happened until an admin noticed it in the
 * routing screen and routed it by hand. Finished files sat for days.
 *
 * The same tests cover the second half of the fix. A specialist can move a case
 * two ways — the status control, and the "log the call and move it" shortcut —
 * and only the first ran any side effects at all, so logging a missed call
 * never sent the claimant the follow-up that status exists to trigger.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

const startAssessmentRouting = vi.fn()
const sendMissedCallFollowUp = vi.fn()

vi.mock('../lib/prisma', () => ({
  prisma: {
    caseAssistance: { findUnique: vi.fn(), update: vi.fn() },
    caseInteraction: { create: vi.fn() },
  },
}))

vi.mock('../lib/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'spec-1', email: 'sam@clearcaseiq.com', role: 'CASE_SPECIALIST' }
    next()
  },
}))

vi.mock('../lib/specialist-access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/specialist-access')>()),
  specialistMiddleware: (_req: any, _res: any, next: any) => next(),
  isCaseAssistanceManager: () => true,
}))

vi.mock('../lib/assessment-routing', () => ({
  startAssessmentRouting: (...args: unknown[]) => startAssessmentRouting(...args),
}))

vi.mock('../lib/missed-call-followup', () => ({
  sendMissedCallFollowUp: (...args: unknown[]) => sendMissedCallFollowUp(...args),
}))

import { prisma } from '../lib/prisma'
import router from './case-assistance'

const app = express()
app.use(express.json())
app.use('/v1/case-assistance', router)

/** An assistance row mid-workflow, with no attorney on the case yet. */
function assistance(overrides: Record<string, any> = {}) {
  return {
    id: 'ca-1',
    assessmentId: 'asm-1',
    status: 'in_progress',
    assignedSpecialistId: 'spec-1',
    firstContactAt: new Date(),
    assessment: {
      id: 'asm-1',
      facts: JSON.stringify({ plaintiffContext: { email: 'claimant@example.com' } }),
      user: { id: 'u-1', firstName: 'Ana', lastName: 'Ruiz', email: 'claimant@example.com' },
      leadSubmission: null,
    },
    ...overrides,
  }
}

/** Routing resolves after the response, so assertions have to wait a tick. */
const settle = () => new Promise((resolve) => setImmediate(resolve))

beforeEach(() => {
  vi.clearAllMocks()
  startAssessmentRouting.mockResolvedValue({ success: true, routedTo: ['att-1'], strategy: 'tier' })
  vi.mocked(prisma.caseAssistance.update).mockResolvedValue(assistance() as never)
  vi.mocked(prisma.caseInteraction.create).mockResolvedValue({ id: 'int-1' } as never)
})

describe('marking a case ready for attorney', () => {
  it('starts routing', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(assistance() as never)

    await request(app)
      .patch('/v1/case-assistance/ca-1')
      .send({ status: 'ready_for_attorney_review' })
      .expect(200)
    await settle()

    expect(startAssessmentRouting).toHaveBeenCalledWith('asm-1', expect.anything())
  })

  it('routes from the log-a-call shortcut too', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(assistance() as never)

    await request(app)
      .post('/v1/case-assistance/ca-1/interactions')
      .send({ channel: 'call', status: 'ready_for_attorney_review' })
      .expect(201)
    await settle()

    expect(startAssessmentRouting).toHaveBeenCalledWith('asm-1', expect.anything())
  })

  it('does not re-route a case an attorney is already working', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(
      assistance({
        assessment: { ...assistance().assessment, leadSubmission: { id: 'ls-1', status: 'retained' } },
      }) as never,
    )

    await request(app)
      .patch('/v1/case-assistance/ca-1')
      .send({ status: 'ready_for_attorney_review' })
      .expect(200)
    await settle()

    expect(startAssessmentRouting).not.toHaveBeenCalled()
  })

  it('does not route again when the case is already in that status', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(
      assistance({ status: 'ready_for_attorney_review' }) as never,
    )

    await request(app)
      .patch('/v1/case-assistance/ca-1')
      .send({ status: 'ready_for_attorney_review', priority: 'high' })
      .expect(200)
    await settle()

    expect(startAssessmentRouting).not.toHaveBeenCalled()
  })

  /**
   * A case held at the fraud gate, or one that matched nobody, is a normal
   * outcome that startAssessmentRouting parks for review itself. The
   * specialist's save must still succeed.
   */
  it('still saves when routing declines to place the case', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(assistance() as never)
    startAssessmentRouting.mockResolvedValue({ success: false, gatePassed: false, gateReason: 'held' })

    await request(app)
      .patch('/v1/case-assistance/ca-1')
      .send({ status: 'ready_for_attorney_review' })
      .expect(200)
    await settle()
  })

  it('still saves when routing throws', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(assistance() as never)
    startAssessmentRouting.mockRejectedValue(new Error('engine down'))

    await request(app)
      .patch('/v1/case-assistance/ca-1')
      .send({ status: 'ready_for_attorney_review' })
      .expect(200)
    await settle()
  })
})

describe('marking a call not accepted', () => {
  it('follows up with the claimant from the log-a-call shortcut', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(assistance() as never)

    await request(app)
      .post('/v1/case-assistance/ca-1/interactions')
      .send({ channel: 'call', outcome: 'no_answer', status: 'call_not_accepted' })
      .expect(201)
    await settle()

    expect(sendMissedCallFollowUp).toHaveBeenCalledWith(
      expect.objectContaining({ assessmentId: 'asm-1' }),
    )
  })

  it('does not start routing', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(assistance() as never)

    await request(app)
      .patch('/v1/case-assistance/ca-1')
      .send({ status: 'call_not_accepted' })
      .expect(200)
    await settle()

    expect(startAssessmentRouting).not.toHaveBeenCalled()
  })
})

/**
 * Both endpoints stamp the case closed on the way out of the working set and
 * clear the stamp on the way back in. Only the PATCH did, so a case moved by
 * the call-log shortcut kept reporting a stale closing date.
 */
describe('the closing stamp', () => {
  it('is set by both endpoints on handover', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(assistance() as never)

    await request(app)
      .post('/v1/case-assistance/ca-1/interactions')
      .send({ channel: 'call', status: 'ready_for_attorney_review' })
      .expect(201)

    const data = vi.mocked(prisma.caseAssistance.update).mock.calls.at(-1)?.[0].data as any
    expect(data.closedAt).toBeInstanceOf(Date)
  })

  it('is cleared when a case comes back into the working set', async () => {
    vi.mocked(prisma.caseAssistance.findUnique).mockResolvedValue(
      assistance({ status: 'denied' }) as never,
    )

    await request(app)
      .post('/v1/case-assistance/ca-1/interactions')
      .send({ channel: 'call', status: 'in_progress' })
      .expect(201)

    const data = vi.mocked(prisma.caseAssistance.update).mock.calls.at(-1)?.[0].data as any
    expect(data.closedAt).toBeNull()
  })
})

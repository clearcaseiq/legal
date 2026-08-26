/**
 * A lead being "shared" is not a relationship with an attorney.
 *
 * `assignmentType` defaults to 'shared' in the schema and is what the routing
 * engine sets, so every un-accepted lead in the table carries it, and the value
 * names no attorney. Both write endpoints below used to accept it as
 * authorization on its own, which meant any authenticated attorney could take
 * any unclaimed case just by knowing its id: the decision endpoint would
 * backfill an ACCEPTED introduction for them, and the status endpoint would
 * assign and lock the lead on the way to 'retained'.
 *
 * These pin the rule that replaced it — an offer routed here, a case already in
 * hand, or firm-wide visibility over a colleague's case.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()

const attorneyUser = {
  id: 'user-outsider',
  email: 'outsider@test.local',
  role: 'attorney',
  isActive: true,
}
const auth = { Authorization: `Bearer ${generateToken(attorneyUser.id)}` }

/** A live, un-accepted lead that was never routed to our caller. */
const SHARED_LEAD = {
  id: 'lead-9',
  assessmentId: 'assess-9',
  assignmentType: 'shared',
  assignedAttorneyId: 'att-someone-else',
  routingLocked: false,
  status: 'submitted',
}

/** Every write that could assign or lock the case, whichever call shape it uses. */
const leadWrites = () => [
  ...vi.mocked((prisma as any).leadSubmission.update).mock.calls,
  ...vi.mocked((prisma as any).leadSubmission.updateMany).mock.calls,
]
const introCreates = () => vi.mocked((prisma as any).introduction.create).mock.calls

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
  vi.mocked((prisma as any).attorney.findFirst).mockResolvedValue({
    id: 'att-outsider',
    isVerified: true,
    lawFirmId: null,
  } as any)
  vi.mocked((prisma as any).leadSubmission.findUnique).mockResolvedValue(SHARED_LEAD as any)
  vi.mocked((prisma as any).leadSubmission.update).mockResolvedValue(SHARED_LEAD as any)
  vi.mocked((prisma as any).introduction.updateMany).mockResolvedValue({ count: 1 } as any)
  // The case is unclaimed, so the conditional lock on an accept matches.
  vi.mocked((prisma as any).leadSubmission.updateMany).mockResolvedValue({ count: 1 } as any)
  // The caller holds no offer on this case.
  vi.mocked((prisma as any).introduction.findFirst).mockResolvedValue(null as any)
  // No firm-level claim on the lead either.
  vi.mocked((prisma as any).leadSubmission.findFirst).mockResolvedValue(null as any)
})

describe('POST /leads/:leadId/decision authorization', () => {
  it('refuses an attorney who was never offered the case', async () => {
    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-9/decision')
      .set(auth)
      .send({ decision: 'accept', conflictAcknowledged: true })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/not authorized/i)
  })

  it('does not assign the lead or fabricate an introduction when refused', async () => {
    await request(app)
      .post('/v1/attorney-dashboard/leads/lead-9/decision')
      .set(auth)
      .send({ decision: 'accept', conflictAcknowledged: true })

    expect(leadWrites()).toHaveLength(0)
    // The backfill branch was the mechanism that turned unauthorized access into
    // an accepted case; it must never run for a caller with no relationship.
    expect(introCreates()).toHaveLength(0)
  })

  it('allows an attorney holding a pending offer', async () => {
    vi.mocked((prisma as any).introduction.findFirst).mockResolvedValue({
      id: 'intro-9',
      status: 'PENDING',
      requestedAt: new Date(Date.now() - 60 * 1000),
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-9/decision')
      .set(auth)
      .send({ decision: 'accept', conflictAcknowledged: true })

    expect(res.status).toBe(200)
    expect(leadWrites()).toHaveLength(1)
  })

  it('allows the attorney the case is already assigned to', async () => {
    vi.mocked((prisma as any).leadSubmission.findUnique).mockResolvedValue({
      ...SHARED_LEAD,
      assignedAttorneyId: 'att-outsider',
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-9/decision')
      .set(auth)
      .send({ decision: 'accept', conflictAcknowledged: true })

    expect(res.status).toBe(200)
  })

  it('rejects a decision value that is neither accept nor reject', async () => {
    // This used to fall through to the reject branch, silently declining the
    // case on the attorney's behalf and pushing it back into routing.
    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-9/decision')
      .set(auth)
      .send({ decision: 'Accept', conflictAcknowledged: true })

    expect(res.status).toBe(400)
    expect(leadWrites()).toHaveLength(0)
  })
})

describe('POST /leads/:leadId/status authorization', () => {
  it('refuses an attorney who was never offered the case', async () => {
    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-9/status')
      .set(auth)
      .send({ status: 'retained' })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/not authorized/i)
  })

  it('does not claim the case via a retained status update', async () => {
    await request(app)
      .post('/v1/attorney-dashboard/leads/lead-9/status')
      .set(auth)
      .send({ status: 'retained' })

    // 'retained' sets assignedAttorneyId and routingLocked, so an unauthorized
    // write here was a second route to claiming someone else's case.
    expect(leadWrites()).toHaveLength(0)
  })

  it('allows an attorney holding an offer on the case', async () => {
    vi.mocked((prisma as any).introduction.findFirst).mockResolvedValue({
      id: 'intro-9',
      status: 'ACCEPTED',
    } as any)

    const res = await request(app)
      .post('/v1/attorney-dashboard/leads/lead-9/status')
      .set(auth)
      .send({ status: 'consulted' })

    expect(res.status).toBe(200)
  })
})

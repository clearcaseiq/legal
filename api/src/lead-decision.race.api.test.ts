/**
 * Reported failure: open the same case in two tabs, decline in the first, accept
 * in the second. The accept used to win, leaving the Introduction ACCEPTED with
 * the decline reason still attached (visible in admin routing history as
 * "Accepted ... Reason: Too busy / capacity").
 *
 * The Introduction is the decision ledger, so a decision is only valid if it
 * flips the row out of PENDING. These cases pin that: the second response must
 * be refused, and — just as important — it must be refused BEFORE the lead is
 * mutated, so a losing accept cannot assign or lock the case on its way out.
 *
 * That covers one attorney answering twice. A wave gives several attorneys their
 * own PENDING rows on the same case, so the case itself needs its own claim:
 * these cases also pin that only the attorney who flips `routingLocked` wins,
 * and that winning retires everyone else's offer.
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
  id: 'user-att-1',
  email: 'attorney@test.local',
  role: 'attorney',
  isActive: true,
}
const auth = { Authorization: `Bearer ${generateToken(attorneyUser.id)}` }

const LEAD = {
  id: 'lead-1',
  assessmentId: 'assess-1',
  assignmentType: 'exclusive',
  assignedAttorneyId: 'att-1',
  routingLocked: false,
}

function givenIntroduction(intro: Record<string, unknown> | null) {
  vi.mocked((prisma as any).introduction.findFirst).mockResolvedValue(intro as any)
}

/** Simulate the other tab winning the race between our read and our write. */
function givenClaimLost() {
  vi.mocked((prisma as any).introduction.updateMany).mockResolvedValue({ count: 0 } as any)
  vi.mocked((prisma as any).introduction.findUnique).mockResolvedValue({ status: 'DECLINED' } as any)
}

/** Simulate another attorney in the same wave locking the case first. */
function givenCaseLost() {
  vi.mocked((prisma as any).leadSubmission.updateMany).mockResolvedValue({ count: 0 } as any)
}

async function decide(decision: 'accept' | 'reject', declineReason?: string) {
  return request(app)
    .post('/v1/attorney-dashboard/leads/lead-1/decision')
    .set(auth)
    .send({ decision, declineReason, conflictAcknowledged: true })
}

/** Every write that could assign or lock the case, whichever call shape it uses. */
const leadWrites = () => [
  ...vi.mocked((prisma as any).leadSubmission.update).mock.calls,
  ...vi.mocked((prisma as any).leadSubmission.updateMany).mock.calls,
]

describe('lead decision is final', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
    vi.mocked((prisma as any).attorney.findFirst).mockResolvedValue({ id: 'att-1' } as any)
    vi.mocked((prisma as any).leadSubmission.findUnique).mockResolvedValue(LEAD as any)
    vi.mocked((prisma as any).leadSubmission.update).mockResolvedValue(LEAD as any)
    vi.mocked((prisma as any).introduction.updateMany).mockResolvedValue({ count: 1 } as any)
    // The case is unclaimed, so the conditional lock matches.
    vi.mocked((prisma as any).leadSubmission.updateMany).mockResolvedValue({ count: 1 } as any)
    givenIntroduction({
      id: 'intro-1',
      status: 'PENDING',
      requestedAt: new Date(Date.now() - 60 * 1000),
    })
  })

  it('refuses an accept once the case was declined', async () => {
    givenIntroduction({ id: 'intro-1', status: 'DECLINED', requestedAt: new Date() })

    const res = await decide('accept')

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('You have already declined this case.')
    expect(res.body.code).toBe('ALREADY_RESPONDED')
  })

  it('does not touch the lead when the accept is refused', async () => {
    givenIntroduction({ id: 'intro-1', status: 'DECLINED', requestedAt: new Date() })

    await decide('accept')

    // A losing accept that still ran the lead update would assign the case and
    // set routingLocked, which is what made the case show as accepted.
    expect(leadWrites()).toHaveLength(0)
  })

  it('refuses a second decline', async () => {
    givenIntroduction({ id: 'intro-1', status: 'DECLINED', requestedAt: new Date() })

    const res = await decide('reject', 'too_busy')

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('You have already declined this case.')
  })

  it('refuses an accept for a case already accepted', async () => {
    givenIntroduction({ id: 'intro-1', status: 'ACCEPTED', requestedAt: new Date() })

    const res = await decide('accept')

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('You have already accepted this case.')
  })

  it('claims the introduction only while it is still pending', async () => {
    await decide('accept')

    const claim = vi.mocked((prisma as any).introduction.updateMany).mock.calls[0][0] as any
    expect(claim.where).toMatchObject({ id: 'intro-1', status: 'PENDING' })
    expect(claim.data.status).toBe('ACCEPTED')
  })

  it('refuses the accept that loses a simultaneous race', async () => {
    // Both tabs read PENDING; the decline commits first, so this claim matches
    // no rows. Without the status filter this was a last-write-wins overwrite.
    givenClaimLost()

    const res = await decide('accept')

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('You have already declined this case.')
    expect(leadWrites()).toHaveLength(0)
  })

  it('never writes a decline reason onto an accepted introduction', async () => {
    await decide('accept')

    const claim = vi.mocked((prisma as any).introduction.updateMany).mock.calls[0][0] as any
    expect(claim.data).not.toHaveProperty('declineReason')
  })

  it('lets a genuine first accept through', async () => {
    const res = await decide('accept')

    expect(res.status).toBe(200)
    expect(leadWrites()).toHaveLength(1)
    expect(leadWrites()[0][0].data).toMatchObject({ routingLocked: true, assignedAttorneyId: 'att-1' })
  })

  it('locks the case only while it is still unclaimed', async () => {
    await decide('accept')

    // Without this predicate the lead write was unconditional, so a second
    // attorney's accept simply overwrote the first attorney's assignment.
    expect(leadWrites()[0][0].where).toMatchObject({
      assessmentId: 'assess-1',
      routingLocked: false,
    })
  })

  it('refuses the accept that loses the race for the case', async () => {
    givenCaseLost()

    const res = await decide('accept')

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('CASE_ALREADY_CLAIMED')
  })

  it('retires the other offers on the case once it is won', async () => {
    await decide('accept')

    // The expiry sweep skips locked cases, so nothing else retires these: left
    // PENDING they stay acceptable indefinitely, which is how a second attorney
    // could claim a case that had already been assigned.
    const retire = vi
      .mocked((prisma as any).introduction.updateMany)
      .mock.calls.find((call: any) => call[0]?.where?.id?.not)
    expect(retire?.[0].where).toMatchObject({
      assessmentId: 'assess-1',
      status: 'PENDING',
      id: { not: 'intro-1' },
    })
    expect(retire?.[0].data.status).toBe('EXPIRED')
  })

  it('leaves the other offers alone when the case is declined', async () => {
    await decide('reject', 'too_busy')

    const retire = vi
      .mocked((prisma as any).introduction.updateMany)
      .mock.calls.find((call: any) => call[0]?.where?.id?.not)
    expect(retire).toBeUndefined()
  })
})

/**
 * Several read paths authorized on `assignmentType: 'shared'`. That term names
 * no attorney: "shared" is the schema default and what the routing engine
 * writes, so it matched every un-accepted lead in the table for every caller. An
 * attorney at one firm could read the injury facts, contact details and
 * valuation of a case routed to another firm for as long as nobody accepted it.
 *
 * These tests read the query each endpoint actually issues, because that is where
 * the leak was: the handler code looked like it was scoping to the caller.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()

const ATTORNEY_USER = {
  id: 'user-outsider',
  email: 'outsider@otherfirm.test',
  role: 'attorney',
  isActive: true,
}
const ATTORNEY_ID = 'att-outsider'
const auth = { Authorization: `Bearer ${generateToken(ATTORNEY_USER.id)}` }

/** Every OR-branch the caller's queries were allowed to match on. */
function orBranches(mock: { mock: { calls: any[] } }): any[] {
  return mock.mock.calls.flatMap((call) => call[0]?.where?.OR ?? [])
}

function expectScopedToCaller(mock: { mock: { calls: any[] } }) {
  const branches = orBranches(mock)
  expect(branches.length).toBeGreaterThan(0)
  // Nothing may grant access without naming the caller.
  expect(branches).not.toContainEqual({ assignmentType: 'shared' })
  for (const branch of branches) {
    expect(JSON.stringify(branch)).toContain(ATTORNEY_ID)
  }
}

describe('shared leads are not readable by an attorney with no offer', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(ATTORNEY_USER as any)
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({
      id: ATTORNEY_ID,
      userId: ATTORNEY_USER.id,
      email: ATTORNEY_USER.email,
      lawFirmId: 'firm-other',
      isVerified: true,
    } as any)
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue({
      id: ATTORNEY_ID,
      userId: ATTORNEY_USER.id,
      lawFirmId: 'firm-other',
    } as any)
    // The lead exists and is un-accepted, but belongs to someone else's routing.
    vi.mocked(prisma.leadSubmission.findFirst).mockResolvedValue(null as any)
  })

  it('lead quality reporting cannot reach a lead the caller was never offered', async () => {
    const res = await request(app)
      .post('/v1/lead-quality/report')
      .set(auth)
      .send({ leadId: 'lead-other-firm', overallQuality: 'poor', reportReason: 'spam' })

    expect(res.status).not.toBe(200)
    expectScopedToCaller(vi.mocked(prisma.leadSubmission.findFirst))
  })

  it('the evidence checklist cannot reach a lead the caller was never offered', async () => {
    const res = await request(app)
      .put('/v1/lead-quality/evidence-checklist/lead-other-firm')
      .set(auth)
      .send({ checklist: { intake: true } })

    expect(res.status).not.toBe(200)
    expectScopedToCaller(vi.mocked(prisma.leadSubmission.findFirst))
  })

  it('conflict checks cannot reach a lead the caller was never offered', async () => {
    const res = await request(app)
      .post('/v1/lead-quality/conflict-check')
      .set(auth)
      .send({ leadId: 'lead-other-firm' })

    expect(res.status).not.toBe(200)
    expectScopedToCaller(vi.mocked(prisma.leadSubmission.findFirst))
  })

  it('provider referrals cannot reach a lead the caller was never offered', async () => {
    const res = await request(app)
      .post('/v1/medical-providers/referrals')
      .set(auth)
      .send({ leadId: 'lead-other-firm', providerId: 'prov-1', referralType: 'treatment' })

    expect(res.status).not.toBe(200)
    // The feature flag can refuse before the lookup; when it runs, it must scope.
    if (vi.mocked(prisma.leadSubmission.findFirst).mock.calls.length > 0) {
      expectScopedToCaller(vi.mocked(prisma.leadSubmission.findFirst))
    }
  })

  it('treatment summary cannot reach a lead the caller was never offered', async () => {
    const res = await request(app)
      .get('/v1/medical-providers/leads/lead-other-firm/treatment-summary')
      .set(auth)

    expect(res.status).not.toBe(200)
    expectScopedToCaller(vi.mocked(prisma.leadSubmission.findFirst))
  })

  it('lead quality details cannot reach a lead the caller was never offered', async () => {
    const res = await request(app)
      .get('/v1/attorney-dashboard/leads/lead-other-firm/quality')
      .set(auth)

    expect(res.status).not.toBe(200)
    expectScopedToCaller(vi.mocked(prisma.leadSubmission.findFirst))
  })

  it('the lead list does not fall back to every unassigned lead', async () => {
    await request(app).get('/v1/attorney-dashboard/leads').set(auth)

    const branches = vi
      .mocked(prisma.leadSubmission.findMany)
      .mock.calls.flatMap((call) => (call[0] as any)?.where?.OR ?? [])
    expect(branches).not.toContainEqual({ assignmentType: 'shared' })
  })
})

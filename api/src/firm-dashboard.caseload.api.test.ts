/**
 * A firm member without `view_all_cases` / `view_analytics` sees the cases they
 * hold (on the case team, or the attorney the lead is assigned to) plus any
 * firm case nobody has been staffed on yet. A case with a case team is hidden
 * from everyone outside it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))
vi.mock('./lib/offer-expiry-sweep', () => ({ triggerOfferExpirySweepSoon: vi.fn() }))
vi.mock('./lib/matching-rules-config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/matching-rules-config')>()),
  getMatchingRules: vi.fn().mockResolvedValue({}),
  getAttorneyResponseDeadlineMinutes: () => 60,
}))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'
import { triggerOfferExpirySweepSoon } from './lib/offer-expiry-sweep'

const app = buildApp()

const staffUser = { id: 'user-para', email: 'para@test.local', role: 'staff', isActive: true }
const auth = { Authorization: `Bearer ${generateToken(staffUser.id)}` }

const caseRow = (id: string, assignments: any[]) => ({
  id,
  lawFirmId: 'firm-1',
  claimType: 'auto',
  updatedAt: new Date('2026-09-01T00:00:00Z'),
  user: { firstName: 'Client', lastName: id },
  leadSubmission: { id: `lead-${id}`, status: 'retained', assignedAttorneyId: 'att-main' },
  caseTasks: [],
  firmCaseAssignments: assignments,
})

const asMember = (role: string) => {
  vi.mocked((prisma as any).firmMember.findFirst).mockResolvedValue({
    id: 'fm-1',
    userId: staffUser.id,
    lawFirmId: 'firm-1',
    role,
    permissions: null,
    status: 'active',
    lawFirm: { id: 'firm-1', name: 'Kia Law', rolePermissions: null },
    user: staffUser,
  } as any)
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(staffUser as any)
  vi.mocked((prisma as any).lawFirm.findUnique).mockResolvedValue({ id: 'firm-1', name: 'Kia Law', attorneys: [] } as any)
  vi.mocked((prisma as any).assessment.findMany).mockResolvedValue([
    caseRow('mine', [{ role: 'paralegal', assignedUserId: staffUser.id, assignedUser: { firstName: 'P', lastName: 'L' } }]),
    caseRow('theirs', [{ role: 'paralegal', assignedUserId: 'user-other', assignedUser: { firstName: 'O', lastName: 'T' } }]),
    caseRow('unstaffed', []),
  ] as any)
})

describe('GET /v1/firm-dashboard caseload scope', () => {
  it('shows a paralegal their staffed cases and unstaffed firm cases, not other teams', async () => {
    asMember('paralegal')

    const res = await request(app).get('/v1/firm-dashboard').set(auth)

    expect(res.status).toBe(200)
    expect(res.body.cases.map((c: any) => c.assessmentId).sort()).toEqual(['mine', 'unstaffed'])
    expect(res.body.metrics.activeCases).toBe(2)
  })

  it('shows the whole firm roster to a role with view_all_cases', async () => {
    asMember('firm_admin')

    const res = await request(app).get('/v1/firm-dashboard').set(auth)

    expect(res.status).toBe(200)
    expect(res.body.cases.map((c: any) => c.assessmentId).sort()).toEqual(['mine', 'theirs', 'unstaffed'])
  })
})

describe('GET /v1/firm-dashboard/cases/:assessmentId', () => {
  const detailRow = (id: string, assignments: any[], status = 'retained') => ({
    ...caseRow(id, assignments),
    venueState: 'CA',
    facts: JSON.stringify({ incident: { date: '2026-08-01', narrative: 'Rear-ended' } }),
    user: { firstName: 'Client', lastName: id, email: 'c@test.local', phone: '555-0100' },
    leadSubmission: { id: `lead-${id}`, status, assignedAttorneyId: 'att-main', assignedAttorney: { id: 'att-main', name: 'Kia' } },
    caseTasks: [{ id: 't1', title: 'Call client', priority: 'high', dueDate: null, assignedRole: 'intake_owner' }],
    evidenceFiles: [{ category: 'photos' }, { category: 'photos' }],
  })

  it('opens an unstaffed case for an intake specialist', async () => {
    asMember('intake_specialist')
    vi.mocked((prisma as any).assessment.findFirst).mockResolvedValue(detailRow('unstaffed', []) as any)

    const res = await request(app).get('/v1/firm-dashboard/cases/unstaffed').set(auth)

    expect(res.status).toBe(200)
    expect(res.body.client).toEqual({ name: 'Client unstaffed', email: 'c@test.local', phone: '555-0100' })
    expect(res.body.primaryAttorney).toEqual({ id: 'att-main', name: 'Kia' })
    expect(res.body.evidenceCounts).toEqual({ photos: 2 })
    expect(res.body.openTasks).toHaveLength(1)
    expect(res.body.incident.narrative).toBe('Rear-ended')
  })

  it('opens a staffed case for a member of its team', async () => {
    asMember('intake_specialist')
    vi.mocked((prisma as any).assessment.findFirst).mockResolvedValue(
      detailRow('mine', [{ role: 'intake_owner', assignedUserId: staffUser.id, assignedUser: { firstName: 'I', lastName: 'S' } }]) as any,
    )

    const res = await request(app).get('/v1/firm-dashboard/cases/mine').set(auth)

    expect(res.status).toBe(200)
    expect(res.body.assignments).toEqual([{ role: 'intake_owner', name: 'I S' }])
  })

  it("refuses a staffed case to someone outside its team", async () => {
    asMember('intake_specialist')
    vi.mocked((prisma as any).assessment.findFirst).mockResolvedValue(
      detailRow('theirs', [{ role: 'paralegal', assignedUserId: 'user-other', assignedUser: { firstName: 'O', lastName: 'T' } }]) as any,
    )

    const res = await request(app).get('/v1/firm-dashboard/cases/theirs').set(auth)

    expect(res.status).toBe(403)
  })

  it('does not open a lead that was never accepted', async () => {
    asMember('firm_admin')
    vi.mocked((prisma as any).assessment.findFirst).mockResolvedValue(detailRow('lead', [], 'submitted') as any)

    const res = await request(app).get('/v1/firm-dashboard/cases/lead').set(auth)

    expect(res.status).toBe(404)
  })
})

describe('GET /v1/firm-dashboard/new-leads expiry', () => {
  const intro = (id: string, status: string, minutesAgo: number) => ({
    id: `intro-${id}`,
    status,
    requestedAt: new Date(Date.now() - minutesAgo * 60 * 1000),
    respondedAt: null,
    waveNumber: 1,
    attorney: { id: 'att-main', name: 'Kia' },
    assessment: {
      id,
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      referenceCode: null,
      caseName: null,
      createdAt: new Date('2026-09-01T00:00:00Z'),
      leadSubmission: { id: `lead-${id}`, status: 'submitted' },
      introductions: [{ status }],
    },
  })

  it('moves a PENDING offer past its response window out of the new list', async () => {
    asMember('intake_specialist')
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([{ id: 'att-main' }] as any)
    vi.mocked(prisma.introduction.findMany).mockResolvedValue([
      intro('fresh', 'PENDING', 10),
      intro('lapsed', 'PENDING', 90),
      intro('swept', 'EXPIRED', 200),
    ] as any)

    const res = await request(app).get('/v1/firm-dashboard/new-leads').set(auth)

    expect(res.status).toBe(200)
    expect(res.body.active.map((r: any) => r.assessmentId)).toEqual(['fresh'])
    expect(res.body.expired.map((r: any) => r.assessmentId).sort()).toEqual(['lapsed', 'swept'])
    expect(triggerOfferExpirySweepSoon).toHaveBeenCalled()
  })
})

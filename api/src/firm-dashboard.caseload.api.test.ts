/**
 * A firm member without `view_all_cases` / `view_analytics` sees the cases they
 * hold — on the case team, or the attorney the lead is assigned to — and not
 * the rest of the firm's roster. Returning nothing at all left paralegals and
 * case managers with an empty Caseload for cases they were staffed on.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

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
    caseRow('theirs', []),
  ] as any)
})

describe('GET /v1/firm-dashboard caseload scope', () => {
  it('shows a paralegal the cases they are staffed on, and only those', async () => {
    asMember('paralegal')

    const res = await request(app).get('/v1/firm-dashboard').set(auth)

    expect(res.status).toBe(200)
    expect(res.body.cases.map((c: any) => c.assessmentId)).toEqual(['mine'])
    expect(res.body.metrics.activeCases).toBe(1)
  })

  it('shows the whole firm roster to a role with view_all_cases', async () => {
    asMember('firm_admin')

    const res = await request(app).get('/v1/firm-dashboard').set(auth)

    expect(res.status).toBe(200)
    expect(res.body.cases.map((c: any) => c.assessmentId).sort()).toEqual(['mine', 'theirs'])
  })
})

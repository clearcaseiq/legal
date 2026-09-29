/**
 * The firm role matrix is enforced, not just displayed.
 *
 * Most action permissions (messaging clients, demand letters, documents,
 * scheduling, chronology) used to be checkboxes nothing read, and the checks
 * that did exist fell back to the platform default, so unticking a permission
 * in Firm Settings never took it away.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'
import { firmAllows, permissionsForMember } from './lib/firm-access'
import { ALL_FIRM_PERMISSIONS } from './lib/firm-roles'

describe('permissionsForMember', () => {
  it('gives a firm admin every permission, whatever the stored list says', () => {
    const stored = JSON.stringify({ firm_admin: ['manage_users'] })
    expect(permissionsForMember('firm_admin', stored, null).sort()).toEqual([...ALL_FIRM_PERMISSIONS].sort())
  })

  it("lets the firm's settings take a default permission away", () => {
    const stored = JSON.stringify({ attorney: ['review_cases', 'accept_cases'] })
    const perms = permissionsForMember('attorney', stored, null)
    expect(perms).toContain('accept_cases')
    expect(perms).not.toContain('generate_demands')
  })

  it("adds the member's own extra grants", () => {
    expect(permissionsForMember('paralegal', null, JSON.stringify(['generate_demands']))).toContain('generate_demands')
  })

  it('does not limit a caller outside any firm', () => {
    expect(firmAllows(null, ['generate_demands'])).toBe(true)
  })
})

const app = buildApp()
const user = { id: 'user-1', email: 'member@test.local', role: 'attorney', isActive: true }
const auth = { Authorization: `Bearer ${generateToken(user.id)}` }

const asMember = (role: string, rolePermissions: string | null = null) => {
  vi.mocked((prisma as any).firmMember.findFirst).mockResolvedValue({
    id: 'fm-1',
    userId: user.id,
    lawFirmId: 'firm-1',
    role,
    permissions: null,
    status: 'active',
    lawFirm: { rolePermissions },
  } as any)
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any)
})

describe('case action gates', () => {
  it('refuses demand drafting to a role without generate_demands', async () => {
    asMember('intake_specialist')

    const res = await request(app).post('/v1/attorney-dashboard/leads/lead-1/demand-letters').set(auth).send({})

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FIRM_PERMISSION_DENIED')
  })

  it('refuses an associate the firm has taken generate_demands away from', async () => {
    asMember('attorney', JSON.stringify({ attorney: ['review_cases', 'accept_cases'] }))

    const res = await request(app).post('/v1/attorney-dashboard/leads/lead-1/demand-letters').set(auth).send({})

    expect(res.status).toBe(403)
  })

  it('refuses client messaging to a role without message_plaintiffs', async () => {
    asMember('paralegal')

    const res = await request(app)
      .post('/v1/attorney-dashboard/messaging/send')
      .set(auth)
      .send({ chatRoomId: 'room-1', content: 'hi' })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FIRM_PERMISSION_DENIED')
  })

  it('lets a solo attorney through the gate', async () => {
    const res = await request(app).post('/v1/attorney-dashboard/leads/lead-1/demand-letters').set(auth).send({})

    expect(res.body.code).not.toBe('FIRM_PERMISSION_DENIED')
  })
})

describe('reading a colleague case', () => {
  const openLetters = () => request(app).get('/v1/attorney-dashboard/leads/lead-1/demand-letters').set(auth)

  beforeEach(() => {
    asMember('attorney')
    vi.mocked((prisma as any).attorney.findFirst).mockResolvedValue({ id: 'att-assoc', email: user.email, lawFirmId: 'firm-1' } as any)
    vi.mocked((prisma as any).attorney.findUnique).mockResolvedValue({ lawFirmId: 'firm-1' } as any)
    vi.mocked((prisma as any).leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-1',
      assessmentId: 'asm-1',
      assignedAttorneyId: 'att-main',
      assignmentType: 'exclusive',
      status: 'retained',
    } as any)
  })

  /** `onTeam`: whether the caller is on the case team, when the case is staffed. */
  const staffed = (onTeam: boolean) =>
    vi.mocked((prisma as any).firmCaseAssignment.findFirst).mockImplementation(async (args: any) =>
      args?.where?.OR ? (onTeam ? ({ id: 'fca-me' } as any) : null) : ({ id: 'fca-other' } as any),
    )

  it('refuses an associate once the case is staffed with other people', async () => {
    staffed(false)

    const res = await openLetters()

    expect(res.status).toBe(403)
  })

  it('lets an associate on the case team read it', async () => {
    staffed(true)

    const res = await openLetters()

    expect(res.status).not.toBe(403)
  })

  it('lets any colleague read a case nobody is staffed on', async () => {
    const res = await openLetters()

    expect(res.status).not.toBe(403)
  })
})

describe('GET /v1/attorney-dashboard/access', () => {
  it("reports the member's resolved actions", async () => {
    asMember('paralegal')

    const res = await request(app).get('/v1/attorney-dashboard/access').set(auth)

    expect(res.status).toBe(200)
    expect(res.body.firm).toMatchObject({ id: 'firm-1', role: 'paralegal' })
    expect(res.body.actions).toMatchObject({ chronology: true, documents: true, message: false, demand: false })
  })

  it('reports no firm limits for a solo attorney', async () => {
    const res = await request(app).get('/v1/attorney-dashboard/access').set(auth)

    expect(res.body.firm).toBeNull()
    expect(Object.values(res.body.actions).every(Boolean)).toBe(true)
  })
})

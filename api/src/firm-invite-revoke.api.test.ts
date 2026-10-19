/**
 * Removing an invited attorney before they accept withdraws the invite.
 *
 * The set-password link in the invite email used to keep working after the
 * firm removed the person, so they could still activate an account.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()

const adminUser = { id: 'user-admin', email: 'admin@test.local', role: 'attorney', isActive: true, passwordHash: 'hash' }
const auth = { Authorization: `Bearer ${generateToken(adminUser.id)}` }
const firm = { id: 'firm-1', name: 'Hinton Law', rolePermissions: null }
const adminMember = { id: 'fm-admin', userId: adminUser.id, lawFirmId: firm.id, role: 'firm_admin', permissions: null, status: 'active', lawFirm: firm, user: adminUser }
const invitedMember = { id: 'fm-new', userId: 'user-new', lawFirmId: firm.id, role: 'attorney', attorneyId: 'att-new' }

function invitee(overrides: Record<string, unknown> = {}) {
  return { id: 'user-new', passwordHash: null, provider: null, isActive: true, ...overrides }
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked((prisma as any).firmMember.findFirst).mockImplementation(async ({ where }: any) =>
    where?.id === invitedMember.id
      ? invitedMember
      : where?.id === adminMember.id || where?.userId === adminUser.id
        ? adminMember
        : null,
  )
})

const removeMember = () => request(app).delete(`/v1/firm-dashboard/members/${invitedMember.id}`).set(auth)

function usersAre(target: Record<string, unknown>) {
  vi.mocked(prisma.user.findUnique).mockImplementation(async ({ where }: any) =>
    (where?.id === 'user-new' ? target : adminUser) as any,
  )
}

describe('removing a firm member who has not accepted', () => {
  it('kills their set-password link and switches off the unused account', async () => {
    usersAre(invitee())
    vi.mocked((prisma as any).firmMember.count).mockResolvedValue(0)

    expect((await removeMember()).status).toBe(200)

    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-new', usedAt: null } })
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-new' }, data: { isActive: false } })
  })

  it('leaves an account that already has a password alone', async () => {
    usersAre(invitee({ passwordHash: 'set' }))

    expect((await removeMember()).status).toBe(200)

    expect(prisma.passwordResetToken.deleteMany).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('keeps the invite when another firm still has them', async () => {
    usersAre(invitee())
    vi.mocked((prisma as any).firmMember.count).mockResolvedValue(1)

    expect((await removeMember()).status).toBe(200)

    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})

describe('a set-password link for a deactivated account', () => {
  const record = {
    id: 'tok-1',
    userId: 'user-new',
    usedAt: null,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    user: { role: 'attorney', email: 'new@hintonlaw.com', passwordHash: null, isActive: false },
  }

  it('is reported invalid and cannot set a password', async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(record as any)

    const check = await request(app).get(`/v1/auth/reset-password/${'a'.repeat(64)}/validate`)
    const set = await request(app).post('/v1/auth/reset-password').send({ token: 'a'.repeat(64), password: 'Str0ng!Passw0rd' })

    expect(check.status).toBe(400)
    expect(set.status).toBe(400)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})

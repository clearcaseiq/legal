/**
 * Per-member permission adjustments from Team & Roles: an admin can add
 * permissions to one person's role and take role permissions away from them.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()

const adminUser = { id: 'user-admin', email: 'admin@test.local', role: 'attorney', isActive: true }
const auth = { Authorization: `Bearer ${generateToken(adminUser.id)}` }
const firm = { id: 'firm-1', name: 'Kia Law', rolePermissions: null }

const adminMember = { id: 'fm-admin', userId: adminUser.id, lawFirmId: firm.id, role: 'firm_admin', permissions: null, status: 'active', lawFirm: firm, user: adminUser }
const targetMember = { id: 'fm-staff', userId: 'user-staff', lawFirmId: firm.id, role: 'case_manager', attorneyId: null }

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as any)
  vi.mocked((prisma as any).firmMember.findFirst).mockImplementation(async ({ where }: any) =>
    where?.id === targetMember.id
      ? targetMember
      : where?.id === adminMember.id || where?.userId === adminUser.id
        ? adminMember
        : null,
  )
  vi.mocked((prisma as any).firmMember.update).mockImplementation(async ({ data }: any) => ({ ...targetMember, ...data }))
})

const patch = (body: unknown, memberId = targetMember.id) =>
  request(app).patch(`/v1/firm-dashboard/members/${memberId}`).set(auth).send(body as any)

describe('PATCH /v1/firm-dashboard/members/:id permissions', () => {
  it('stores grants and revokes together', async () => {
    const res = await patch({ permissions: { grant: ['assign_cases'], revoke: ['manage_assigned_cases'] } })

    expect(res.status).toBe(200)
    const { data } = vi.mocked((prisma as any).firmMember.update).mock.calls[0][0]
    expect(JSON.parse(data.permissions)).toEqual({ v: 3, grant: ['assign_cases'], revoke: ['manage_assigned_cases'] })
  })

  it('still accepts the older bare array as grants', async () => {
    const res = await patch({ permissions: ['assign_cases'] })

    expect(res.status).toBe(200)
    const { data } = vi.mocked((prisma as any).firmMember.update).mock.calls[0][0]
    expect(JSON.parse(data.permissions)).toEqual({ v: 3, grant: ['assign_cases'], revoke: [] })
  })

  it('stores retired permissions as the ones that now cover them', async () => {
    const res = await patch({
      permissions: { grant: ['decline_cases', 'request_records', 'generate_demands'], revoke: ['manage_chronology'] },
    })

    expect(res.status).toBe(200)
    const { data } = vi.mocked((prisma as any).firmMember.update).mock.calls[0][0]
    expect(JSON.parse(data.permissions)).toEqual({
      v: 3,
      grant: ['review_cases', 'manage_documents'],
      revoke: ['manage_assigned_cases'],
    })
  })

  it('clears the adjustments on null', async () => {
    const res = await patch({ permissions: null })

    expect(res.status).toBe(200)
    expect(vi.mocked((prisma as any).firmMember.update).mock.calls[0][0].data.permissions).toBeNull()
  })

  it('rejects permissions that do not exist', async () => {
    const res = await patch({ permissions: { grant: ['launch_rockets'] } })

    expect(res.status).toBe(400)
    expect((prisma as any).firmMember.update).not.toHaveBeenCalled()
  })

  it('does not let a user remove their own manage_users', async () => {
    const res = await patch({ permissions: { revoke: ['manage_users'] } }, adminMember.id)

    expect(res.status).toBe(400)
    expect((prisma as any).firmMember.update).not.toHaveBeenCalled()
  })
})

describe('firm attorneys deactivating and deleting members', () => {
  const attorneyMember = { ...adminMember, id: 'fm-attorney', role: 'attorney' }
  const firmAdminTarget = { id: 'fm-other-admin', userId: 'user-other-admin', lawFirmId: firm.id, role: 'firm_admin', attorneyId: null }

  beforeEach(() => {
    vi.mocked((prisma as any).firmMember.findFirst).mockImplementation(async ({ where }: any) =>
      where?.id === targetMember.id
        ? targetMember
        : where?.id === firmAdminTarget.id
          ? firmAdminTarget
          : where?.userId === adminUser.id
            ? attorneyMember
            : null,
    )
  })

  it('lets an attorney deactivate a staff member', async () => {
    const res = await patch({ status: 'suspended' })

    expect(res.status).toBe(200)
    expect(vi.mocked((prisma as any).firmMember.update).mock.calls[0][0].data).toEqual({ status: 'suspended' })
  })

  it('does not let an attorney change anything but status', async () => {
    const res = await patch({ role: 'firm_admin' })

    expect(res.status).toBe(403)
    expect((prisma as any).firmMember.update).not.toHaveBeenCalled()
  })

  it('lets an attorney delete a member', async () => {
    const res = await request(app).delete(`/v1/firm-dashboard/members/${targetMember.id}`).set(auth)

    expect(res.status).toBe(200)
    expect((prisma as any).firmMember.delete).toHaveBeenCalledWith({ where: { id: targetMember.id } })
  })

  it('does not let an attorney delete or deactivate a firm admin', async () => {
    const del = await request(app).delete(`/v1/firm-dashboard/members/${firmAdminTarget.id}`).set(auth)
    const suspend = await patch({ status: 'suspended' }, firmAdminTarget.id)

    expect(del.status).toBe(403)
    expect(suspend.status).toBe(403)
    expect((prisma as any).firmMember.delete).not.toHaveBeenCalled()
  })
})

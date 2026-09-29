/**
 * Firm staff holding "Message clients" get the firm's client threads on the
 * Messages page; staff without it are refused, as before.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()

const staffUser = { id: 'user-staff', email: 'staff@test.local', role: 'staff', isActive: true }
const auth = { Authorization: `Bearer ${generateToken(staffUser.id)}` }

const asStaff = (permissions: string | null, role = 'legal_assistant') => {
  vi.mocked((prisma as any).firmMember.findFirst).mockResolvedValue({
    id: 'fm-staff',
    lawFirmId: 'firm-1',
    userId: staffUser.id,
    role,
    permissions,
    lawFirm: { rolePermissions: null },
  } as any)
}

const roomQuery = () => vi.mocked((prisma as any).chatRoom.findMany).mock.calls[0]?.[0]

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(staffUser as any)
  vi.mocked((prisma as any).attorney.findFirst).mockResolvedValue(null as any)
  vi.mocked((prisma as any).chatRoom.findMany).mockResolvedValue([] as any)
})

describe('GET /v1/messaging/attorney/unread-summary for firm staff', () => {
  it("lists the firm's threads on the cases the member can see", async () => {
    asStaff(JSON.stringify({ grant: ['message_plaintiffs'], revoke: [] }))

    const res = await request(app).get('/v1/messaging/attorney/unread-summary').set(auth)

    expect(res.status).toBe(200)
    expect(roomQuery()?.where).toMatchObject({
      attorney: { lawFirmId: 'firm-1' },
      assessment: {
        OR: [
          { firmCaseAssignments: { some: { status: 'active', assignedUserId: staffUser.id } } },
          { firmCaseAssignments: { none: { status: 'active' } } },
        ],
      },
    })
  })

  it('refuses staff without Message clients', async () => {
    asStaff(null, 'paralegal')

    const res = await request(app).get('/v1/messaging/attorney/unread-summary').set(auth)

    expect(res.status).toBe(403)
    expect(roomQuery()).toBeUndefined()
  })
})

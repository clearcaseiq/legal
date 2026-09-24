import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'
import { ONLINE_WINDOW_MS, toPresence } from './lib/presence'

const app = buildApp()

const plaintiff = { id: 'user-pl-1', email: 'pat@test.local', firstName: 'Pat', lastName: 'Lee', isActive: true, role: 'client' }
const attorneyUser = { id: 'user-att-1', email: 'mike@firm.test', firstName: 'Mike', lastName: 'Pence', isActive: true, role: 'attorney' }

function auth(userId: string) {
  return { Authorization: `Bearer ${generateToken(userId)}` }
}

describe('toPresence', () => {
  it('is online inside the window and offline after it', () => {
    const now = Date.now()
    expect(toPresence(new Date(now - 30_000), now).online).toBe(true)
    expect(toPresence(new Date(now - ONLINE_WINDOW_MS - 1_000), now).online).toBe(false)
    expect(toPresence(null, now)).toEqual({ online: false, lastSeenAt: null })
  })
})

describe('/v1/presence', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockImplementation(async (args: any) => {
      if (args?.where?.id === plaintiff.id) return plaintiff as any
      if (args?.where?.id === attorneyUser.id) return attorneyUser as any
      return null
    })
  })

  it('records a heartbeat for the caller', async () => {
    const res = await request(app).post('/v1/presence/heartbeat').set(auth(plaintiff.id))
    expect(res.status).toBe(204)
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: plaintiff.id },
      data: { lastSeenAt: expect.any(Date) },
    }))
  })

  it('shows a plaintiff only their own attorneys', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.chatRoom.findMany).mockResolvedValue([{ attorneyId: 'att-1' }] as any)
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.attorney.findMany).mockResolvedValue([{ id: 'att-1', email: 'Mike@Firm.test' }] as any)
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ email: 'mike@firm.test', lastSeenAt: new Date() }] as any)

    const res = await request(app).get('/v1/presence').set(auth(plaintiff.id))

    expect(res.status).toBe(200)
    expect(prisma.chatRoom.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: plaintiff.id } }))
    expect(res.body.attorneys['att-1'].online).toBe(true)
    expect(res.body.clients).toEqual({})
  })

  it('shows an attorney their clients by user and by case', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-1' } as any)
    vi.mocked(prisma.chatRoom.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      { assessmentId: 'asm-1', assessment: { userId: plaintiff.id } },
    ] as any)
    const seen = new Date(Date.now() - 10 * 60_000)
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: plaintiff.id, lastSeenAt: seen }] as any)

    const res = await request(app).get('/v1/presence').set(auth(attorneyUser.id))

    expect(res.status).toBe(200)
    expect(prisma.leadSubmission.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { assignedAttorneyId: 'att-1', routingLocked: true },
    }))
    expect(res.body.clients[plaintiff.id]).toEqual({ online: false, lastSeenAt: seen.toISOString() })
    expect(res.body.cases['asm-1']).toEqual(res.body.clients[plaintiff.id])
  })
})

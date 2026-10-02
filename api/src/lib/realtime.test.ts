import { createServer, type Server as HttpServer } from 'http'
import type { AddressInfo } from 'net'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { io as connect, type Socket } from 'socket.io-client'

const users: Record<string, { id: string; email: string; isActive: boolean }> = {
  'tok-winner': { id: 'u-winner', email: 'winner@firm-a.test', isActive: true },
  'tok-loser': { id: 'u-loser', email: 'loser@firm-b.test', isActive: true },
  'tok-staff': { id: 'u-staff', email: 'staff@firm-b.test', isActive: true },
}
const attorneys: Record<string, { id: string; lawFirmId: string | null }> = {
  'winner@firm-a.test': { id: 'att-winner', lawFirmId: 'firm-a' },
  'loser@firm-b.test': { id: 'att-loser', lawFirmId: 'firm-b' },
}

vi.mock('./auth', () => ({
  verifyToken: (token: string) => {
    const user = users[token]
    if (!user) throw new Error('bad token')
    return { userId: user.id }
  },
}))

vi.mock('./prisma', () => ({
  prisma: {
    user: {
      findUnique: async ({ where }: any) => Object.values(users).find((u) => u.id === where.id) ?? null,
    },
    attorney: {
      findFirst: async ({ where }: any) => attorneys[where.email] ?? null,
    },
    firmMember: {
      findFirst: async ({ where }: any) => (where.userId === 'u-staff' ? { lawFirmId: 'firm-b' } : null),
    },
  },
}))

import { closeRealtime, emitLeadClaimed, initRealtime, REALTIME_PATH } from './realtime'

let httpServer: HttpServer
let url: string
const sockets: Socket[] = []

function open(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = connect(url, { path: REALTIME_PATH, transports: ['websocket'], auth: { token }, reconnection: false })
    sockets.push(s)
    s.on('connect', () => setTimeout(() => resolve(s), 100))
    s.on('connect_error', reject)
  })
}

function nextEvent(s: Socket, timeoutMs = 500): Promise<unknown> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs)
    s.once('lead:claimed', (payload) => {
      clearTimeout(timer)
      resolve(payload)
    })
  })
}

beforeAll(async () => {
  httpServer = createServer()
  initRealtime(httpServer)
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`
})

afterAll(async () => {
  sockets.forEach((s) => s.disconnect())
  await closeRealtime()
  await new Promise<void>((resolve) => httpServer.close(() => resolve()))
})

describe('realtime lead:claimed', () => {
  it('rejects connections without a valid token', async () => {
    await expect(open('nope')).rejects.toThrow('unauthorized')
  })

  it('reaches the losing attorney and their firm staff, not the winner', async () => {
    const [winner, loser, staff] = await Promise.all([open('tok-winner'), open('tok-loser'), open('tok-staff')])
    const pending = [nextEvent(winner), nextEvent(loser), nextEvent(staff)]

    emitLeadClaimed(
      { assessmentId: 'asm-1', leadId: 'lead-1' },
      { attorneyIds: ['att-loser'], lawFirmIds: ['firm-b'] },
    )

    const [toWinner, toLoser, toStaff] = await Promise.all(pending)
    expect(toWinner).toBeNull()
    expect(toLoser).toEqual({ assessmentId: 'asm-1', leadId: 'lead-1' })
    expect(toStaff).toEqual({ assessmentId: 'asm-1', leadId: 'lead-1' })
  })
})

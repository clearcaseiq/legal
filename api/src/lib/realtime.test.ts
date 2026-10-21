import { createServer, type Server as HttpServer } from 'http'
import type { AddressInfo } from 'net'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { io as connect, type Socket } from 'socket.io-client'

const users: Record<string, { id: string; email: string; isActive: boolean }> = {
  'tok-winner': { id: 'u-winner', email: 'winner@firm-a.test', isActive: true },
  'tok-loser': { id: 'u-loser', email: 'loser@firm-b.test', isActive: true },
  'tok-staff': { id: 'u-staff', email: 'staff@firm-b.test', isActive: true },
  'tok-mixed': { id: 'u-mixed', email: 'Mixed@Firm-C.test', isActive: true },
  'tok-plaintiff': { id: 'u-plaintiff', email: 'claimant@example.test', isActive: true },
}
const hooks = vi.hoisted(() => ({ middleware: null as null | ((params: any, next: (p: any) => Promise<any>) => Promise<any>) }))
const attorneys: Record<string, { id: string; lawFirmId: string | null }> = {
  'winner@firm-a.test': { id: 'att-winner', lawFirmId: 'firm-a' },
  'loser@firm-b.test': { id: 'att-loser', lawFirmId: 'firm-b' },
  'mixed@firm-c.test': { id: 'att-mixed', lawFirmId: null },
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
      findFirst: async ({ where }: any) => attorneys[String(where.email.equals).toLowerCase()] ?? null,
      findUnique: async ({ where }: any) => Object.values(attorneys).find((a) => a.id === where.id) ?? null,
    },
    firmMember: {
      findFirst: async ({ where }: any) => (where.userId === 'u-staff' ? { lawFirmId: 'firm-b' } : null),
    },
    assessment: {
      findUnique: async ({ where }: any) =>
        where.id === 'asm-9'
          ? {
              userId: 'u-plaintiff',
              leadSubmission: { id: 'lead-9', assignedAttorneyId: 'att-loser', assignedAttorney: { lawFirmId: 'firm-b' } },
            }
          : null,
    },
    $use: (fn: any) => {
      hooks.middleware = fn
    },
  },
}))

import {
  closeRealtime,
  emitLeadClaimed,
  emitLeadNew,
  initRealtime,
  pgConfigFromPrismaUrl,
  REALTIME_PATH,
} from './realtime'

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

function nextEvent(s: Socket, event = 'lead:claimed', timeoutMs = 500): Promise<unknown> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs)
    s.once(event, (payload) => {
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

  it('places an attorney whose login email differs in case into their attorney room', async () => {
    const mixed = await open('tok-mixed')
    const pending = nextEvent(mixed)
    emitLeadClaimed({ assessmentId: 'asm-2', leadId: 'lead-2' }, { attorneyIds: ['att-mixed'], lawFirmIds: [] })
    expect(await pending).toEqual({ assessmentId: 'asm-2', leadId: 'lead-2' })
  })
})

describe('realtime negotiation:updated', () => {
  it('reaches the claimant, the assigned attorney and their firm when an offer is written', async () => {
    const [plaintiff, winner, loser, staff] = await Promise.all([
      open('tok-plaintiff'),
      open('tok-winner'),
      open('tok-loser'),
      open('tok-staff'),
    ])
    const pending = [plaintiff, winner, loser, staff].map((s) => nextEvent(s, 'negotiation:updated'))

    // The attorney sharing an offer: the write itself raises the push.
    await hooks.middleware!(
      { model: 'NegotiationEvent', action: 'create', args: { data: { assessmentId: 'asm-9' } } },
      async () => ({ id: 'neg-1', assessmentId: 'asm-9' }),
    )

    const [toPlaintiff, toWinner, toLoser, toStaff] = await Promise.all(pending)
    const event = { assessmentId: 'asm-9', leadId: 'lead-9' }
    expect(toPlaintiff).toEqual(event)
    expect(toLoser).toEqual(event)
    expect(toStaff).toEqual(event)
    expect(toWinner).toBeNull()
  })

  it('fires on the claimant decision, which writes with updateMany', async () => {
    const loser = await open('tok-loser')
    const pending = nextEvent(loser, 'negotiation:updated')
    await hooks.middleware!(
      { model: 'NegotiationEvent', action: 'updateMany', args: { where: { id: 'neg-1', assessmentId: 'asm-9' } } },
      async () => ({ count: 1 }),
    )
    expect(await pending).toEqual({ assessmentId: 'asm-9', leadId: 'lead-9' })
  })
})

describe('pgConfigFromPrismaUrl', () => {
  it('drops Prisma-only parameters and negotiates TLS without CA checks, as Prisma does, for RDS', () => {
    const cfg = pgConfigFromPrismaUrl(
      'postgresql://app:p%40ss@db.abc.us-east-1.rds.amazonaws.com:5432/caseiq?schema=public&sslmode=require&connection_limit=5',
    )
    expect(cfg.connectionString).toBe('postgresql://app:p%40ss@db.abc.us-east-1.rds.amazonaws.com:5432/caseiq')
    expect(cfg.ssl).toEqual({ rejectUnauthorized: false })
    expect(cfg.options).toBeUndefined()
  })

  it('still uses TLS for a remote host when the URL names no sslmode', () => {
    expect(pgConfigFromPrismaUrl('postgresql://app:x@db.internal:5432/caseiq').ssl).toEqual({ rejectUnauthorized: false })
  })

  it('connects in plaintext to a local database and honours sslmode=disable and verify-full', () => {
    expect(pgConfigFromPrismaUrl('postgresql://u:p@localhost:5432/caseiq_local?schema=public').ssl).toBe(false)
    expect(pgConfigFromPrismaUrl('postgresql://u:p@db.internal/x?sslmode=disable').ssl).toBe(false)
    expect(pgConfigFromPrismaUrl('postgresql://u:p@db.internal/x?sslmode=verify-full').ssl).toBe(true)
  })

  it('keeps a non-public Prisma schema on the search path, where the attachments table lives', () => {
    expect(pgConfigFromPrismaUrl('postgresql://u:p@db.internal/x?schema=tenant').options).toBe('-c search_path=tenant')
  })
})

describe('realtime lead:new', () => {
  it('reaches the offered attorney and their firm staff only', async () => {
    const [winner, loser, staff] = await Promise.all([open('tok-winner'), open('tok-loser'), open('tok-staff')])
    const pending = [winner, loser, staff].map((s) => nextEvent(s, 'lead:new'))
    const event = { assessmentId: 'asm-3', leadId: 'lead-3', introductionId: 'intro-3' }

    await emitLeadNew('att-loser', event)

    const [toWinner, toLoser, toStaff] = await Promise.all(pending)
    expect(toWinner).toBeNull()
    expect(toLoser).toEqual(event)
    expect(toStaff).toEqual(event)
  })
})

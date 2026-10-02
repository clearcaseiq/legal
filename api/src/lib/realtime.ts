/**
 * Server push for attorney workspaces and claimant dashboards (socket.io).
 *
 * Browsers connect to `/v1/realtime` so the socket rides the same nginx `/v1/`
 * route as the REST API. Each connection authenticates with the same JWT the
 * REST calls carry and is placed in rooms:
 *   - `user:<userId>` for everyone (claimant pushes)
 *   - `attorney:<attorneyId>` when the user is an attorney
 *   - `firm:<lawFirmId>` for attorneys and active firm members alike
 *
 * With more than one API instance behind the load balancer, an event raised on
 * one instance must reach sockets held by the other, so `REDIS_URL` enables the
 * Redis adapter as the shared backplane. Without it, events only reach sockets
 * on the emitting instance — fine for a single instance and for local dev.
 *
 * Emitting is fire-and-forget: a push is a hint to refresh, never the source of
 * truth, so a failure here must never fail the request that triggered it.
 */
import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { verifyToken } from './auth'
import { prisma } from './prisma'
import { logger } from './logger'

export const REALTIME_PATH = '/v1/realtime'

export type LeadClaimedEvent = {
  assessmentId: string
  leadId: string | null
}

export type LeadNewEvent = {
  assessmentId: string
  leadId: string | null
  introductionId: string | null
}

/** Something on a claimant's case changed (signature request, notification, …). */
export type CaseUpdatedEvent = {
  assessmentId: string | null
  kind: string
}

let io: Server | null = null

function allowedOrigins(): string[] {
  return String(process.env.CORS_ORIGINS || process.env.WEB_URL || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}

export function initRealtime(httpServer: HttpServer): Server {
  if (io) return io
  const isProduction = process.env.NODE_ENV === 'production'
  const origins = allowedOrigins()

  io = new Server(httpServer, {
    path: REALTIME_PATH,
    serveClient: false,
    cors: {
      origin: (origin, callback) => {
        if (!origin || !isProduction) return callback(null, true)
        callback(null, origins.includes(origin))
      },
      credentials: true,
    },
  })

  io.use(async (socket, next) => {
    try {
      const token = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : ''
      if (!token) return next(new Error('unauthorized'))
      const { userId } = verifyToken(token)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, isActive: true },
      })
      if (!user || !user.isActive) return next(new Error('unauthorized'))
      socket.data.userId = user.id
      socket.data.email = user.email
      next()
    } catch {
      next(new Error('unauthorized'))
    }
  })

  io.on('connection', async (socket) => {
    const userId: string = socket.data.userId
    const email: string | null = socket.data.email ?? null
    try {
      const [attorney, member] = await Promise.all([
        email
          ? prisma.attorney.findFirst({
              where: { email: { equals: email, mode: 'insensitive' } },
              select: { id: true, lawFirmId: true },
            })
          : Promise.resolve(null),
        (prisma as any).firmMember.findFirst({
          where: { userId, status: 'active' },
          select: { lawFirmId: true },
        }) as Promise<{ lawFirmId: string | null } | null>,
      ])
      const rooms = [`user:${userId}`]
      if (attorney) rooms.push(`attorney:${attorney.id}`)
      const firmId = attorney?.lawFirmId ?? member?.lawFirmId ?? null
      if (firmId) rooms.push(`firm:${firmId}`)
      await socket.join(rooms)
    } catch (err) {
      logger.warn('Realtime room join failed', { userId, error: (err as Error).message })
    }
  })

  const redisUrl = process.env.REDIS_URL?.trim()
  if (redisUrl) {
    const pub = createClient({ url: redisUrl })
    const sub = pub.duplicate()
    pub.on('error', (err) => logger.warn('Realtime Redis publisher error', { error: err.message }))
    sub.on('error', (err) => logger.warn('Realtime Redis subscriber error', { error: err.message }))
    Promise.all([pub.connect(), sub.connect()])
      .then(() => {
        io?.adapter(createAdapter(pub, sub))
        logger.info('Realtime Redis adapter connected')
      })
      .catch((err: Error) => {
        logger.error('Realtime Redis adapter failed to connect; events stay instance-local', { error: err.message })
      })
  } else if (isProduction) {
    logger.warn('REDIS_URL not set; realtime events only reach sockets on this instance')
  }

  logger.info(`Realtime socket server listening on ${REALTIME_PATH}`)
  return io
}

/**
 * Drop open sockets so the HTTP server can finish closing. `io.close()` is not
 * used because it also closes the underlying HTTP server, which shutdown owns.
 */
export async function closeRealtime(): Promise<void> {
  if (!io) return
  const server = io
  io = null
  server.disconnectSockets(true)
}

/**
 * Tell every attorney (and their firm) whose offer on this case was just closed
 * that the case is gone, so their New Matches list drops it immediately.
 */
export function emitLeadClaimed(
  event: LeadClaimedEvent,
  recipients: { attorneyIds: string[]; lawFirmIds: string[] },
): void {
  if (!io) return
  const rooms = [
    ...new Set([
      ...recipients.attorneyIds.map((id) => `attorney:${id}`),
      ...recipients.lawFirmIds.map((id) => `firm:${id}`),
    ]),
  ]
  if (!rooms.length) return
  try {
    io.to(rooms).emit('lead:claimed', event)
  } catch (err) {
    logger.warn('Realtime lead:claimed emit failed', { assessmentId: event.assessmentId, error: (err as Error).message })
  }
}

/**
 * Tell a claimant their case changed, so an open dashboard and notification
 * bell refetch instead of waiting for a manual refresh.
 */
export function emitCaseUpdated(userId: string, event: CaseUpdatedEvent): void {
  if (!io || !userId) return
  try {
    io.to(`user:${userId}`).emit('case:updated', event)
  } catch (err) {
    logger.warn('Realtime case:updated emit failed', { userId, kind: event.kind, error: (err as Error).message })
  }
}

/** `emitCaseUpdated` for the claimant who owns the case behind a lead. */
export async function emitCaseUpdatedForLead(leadId: string, kind: string): Promise<void> {
  if (!io || !leadId) return
  try {
    const lead = await prisma.leadSubmission.findUnique({
      where: { id: leadId },
      select: { assessmentId: true, assessment: { select: { userId: true } } },
    })
    const userId = lead?.assessment?.userId
    if (userId) emitCaseUpdated(userId, { assessmentId: lead?.assessmentId ?? null, kind })
  } catch (err) {
    logger.warn('Realtime case:updated lookup failed', { leadId, kind, error: (err as Error).message })
  }
}

/**
 * Tell an attorney (and their firm) that a case was just offered to them, so an
 * open New Matches list pulls it in without waiting for the notification poll.
 */
export async function emitLeadNew(attorneyId: string, event: LeadNewEvent): Promise<void> {
  if (!io) return
  try {
    const attorney = await prisma.attorney.findUnique({
      where: { id: attorneyId },
      select: { lawFirmId: true },
    })
    const rooms = [`attorney:${attorneyId}`]
    if (attorney?.lawFirmId) rooms.push(`firm:${attorney.lawFirmId}`)
    io.to(rooms).emit('lead:new', event)
  } catch (err) {
    logger.warn('Realtime lead:new emit failed', { attorneyId, assessmentId: event.assessmentId, error: (err as Error).message })
  }
}

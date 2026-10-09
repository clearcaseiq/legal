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
import { canWorkCaseAssistance } from './specialist-access'

/** Everyone who works the Case Assistance queue: specialists and admins. */
const CASE_ASSISTANCE_ROOM = 'case-assistance'

export const REALTIME_PATH = '/v1/realtime'

export type LeadClaimedEvent = {
  assessmentId: string
  leadId: string | null
}

export type LeadDecidedEvent = {
  assessmentId: string
  leadId: string | null
  decision: 'accept' | 'reject'
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

/** A notification row was written for this user; the bell should refetch. */
export type NotificationNewEvent = {
  kind: string | null
}

/** A chat message was written in this room; message bells and threads refetch. */
export type MessageNewEvent = {
  chatRoomId: string
  senderType: string | null
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
        select: { id: true, email: true, isActive: true, role: true },
      })
      if (!user || !user.isActive) return next(new Error('unauthorized'))
      socket.data.userId = user.id
      socket.data.email = user.email
      socket.data.caseAssistance = canWorkCaseAssistance(user)
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
      if (socket.data.caseAssistance) rooms.push(CASE_ASSISTANCE_ROOM)
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

  pushOnWrites()
  logger.info(`Realtime socket server listening on ${REALTIME_PATH}`)
  return io
}

/**
 * Notifications and chat messages are written from dozens of call sites across
 * two notification tables, so the push hangs off the write itself rather than
 * each caller: a new path cannot forget it.
 */
function pushOnWrites(): void {
  const client = prisma as any
  if (typeof client.$use !== 'function') return
  client.$use(async (params: any, next: (p: any) => Promise<any>) => {
    const result = await next(params)
    if (params.action === 'create' && result) {
      if (params.model === 'PlatformNotificationEvent') {
        emitNotificationNew(
          { userId: result.userId, attorneyId: result.role === 'attorney' ? result.attorneyId : null },
          { kind: result.eventType ?? null },
        )
      } else if (params.model === 'Notification') {
        emitNotificationNew({ userId: result.userId }, { kind: result.type ?? null })
      } else if (params.model === 'Message') {
        void emitMessageNew({ chatRoomId: result.chatRoomId, senderType: result.senderType ?? null })
      }
    }
    if (params.model === 'CaseTask' && TASK_WRITE_ACTIONS.has(params.action)) {
      const assessmentId = result?.assessmentId ?? params.args?.where?.assessmentId ?? params.args?.data?.assessmentId
      if (typeof assessmentId === 'string') void emitTasksUpdated(assessmentId)
    }
    if (params.model === 'CaseWorkflowItem' && TASK_WRITE_ACTIONS.has(params.action)) {
      const caseWorkflowId = result?.caseWorkflowId ?? params.args?.where?.caseWorkflowId
      if (typeof caseWorkflowId === 'string') {
        void client.caseWorkflow
          .findUnique({ where: { id: caseWorkflowId }, select: { assessmentId: true } })
          .then((wf: { assessmentId: string } | null) => wf && emitTasksUpdated(wf.assessmentId))
          .catch(() => undefined)
      }
    }
    return result
  })
}

const TASK_WRITE_ACTIONS = new Set(['create', 'update', 'upsert', 'delete', 'createMany', 'updateMany', 'deleteMany'])

export type TasksUpdatedEvent = {
  assessmentId: string
  leadId: string | null
}

/**
 * A task on this case changed (a paralegal completing one, say). Pushed to the
 * firm and the assigned attorney so open task lists refetch without a reload.
 */
export async function emitTasksUpdated(assessmentId: string): Promise<void> {
  if (!io) return
  try {
    const lead = await prisma.leadSubmission.findFirst({
      where: { assessmentId },
      select: { id: true, assignedAttorneyId: true, assignedAttorney: { select: { lawFirmId: true } } },
    })
    if (!lead) return
    const rooms = [
      lead.assignedAttorneyId ? `attorney:${lead.assignedAttorneyId}` : null,
      lead.assignedAttorney?.lawFirmId ? `firm:${lead.assignedAttorney.lawFirmId}` : null,
    ].filter((r): r is string => Boolean(r))
    if (rooms.length) io.to(rooms).emit('tasks:updated', { assessmentId, leadId: lead.id } satisfies TasksUpdatedEvent)
  } catch (err) {
    logger.warn('Realtime tasks:updated emit failed', { assessmentId, error: (err as Error).message })
  }
}

export function emitNotificationNew(
  recipient: { userId?: string | null; attorneyId?: string | null },
  event: NotificationNewEvent,
): void {
  if (!io) return
  const rooms = [
    ...(recipient.userId ? [`user:${recipient.userId}`] : []),
    ...(recipient.attorneyId ? [`attorney:${recipient.attorneyId}`] : []),
  ]
  if (!rooms.length) return
  try {
    io.to(rooms).emit('notification:new', event)
  } catch (err) {
    logger.warn('Realtime notification:new emit failed', { error: (err as Error).message })
  }
}

/** Push to both sides of the conversation, plus the attorney's firm for shared inboxes. */
export async function emitMessageNew(event: MessageNewEvent): Promise<void> {
  if (!io || !event.chatRoomId) return
  try {
    const room = await prisma.chatRoom.findUnique({
      where: { id: event.chatRoomId },
      select: { userId: true, attorneyId: true, attorney: { select: { lawFirmId: true } } },
    })
    if (!room) return
    const rooms = [`user:${room.userId}`, `attorney:${room.attorneyId}`]
    if (room.attorney?.lawFirmId) rooms.push(`firm:${room.attorney.lawFirmId}`)
    io.to(rooms).emit('message:new', event)
  } catch (err) {
    logger.warn('Realtime message:new emit failed', { chatRoomId: event.chatRoomId, error: (err as Error).message })
  }
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

export type ClientUpdatedEvent = {
  assessmentId: string
  leadId: string | null
}

/**
 * A claimant's contact details changed (staff edit, admin edit, or the claimant
 * correcting their own profile). Pushed to the case's attorney and firm so open
 * case headers, contact cards and send dialogs refetch, and to the claimant so
 * their own open dashboard does too.
 */
export async function emitClientUpdated(assessmentId: string): Promise<void> {
  if (!io) return
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        userId: true,
        leadSubmission: {
          select: { id: true, assignedAttorneyId: true, assignedAttorney: { select: { lawFirmId: true } } },
        },
      },
    })
    if (!assessment) return
    const lead = assessment.leadSubmission
    const rooms = [
      lead?.assignedAttorneyId ? `attorney:${lead.assignedAttorneyId}` : null,
      lead?.assignedAttorney?.lawFirmId ? `firm:${lead.assignedAttorney.lawFirmId}` : null,
    ].filter((r): r is string => Boolean(r))
    if (rooms.length) {
      io.to(rooms).emit('client:updated', { assessmentId, leadId: lead?.id ?? null } satisfies ClientUpdatedEvent)
    }
    if (assessment.userId) emitCaseUpdated(assessment.userId, { assessmentId, kind: 'contact' })
  } catch (err) {
    logger.warn('Realtime client:updated emit failed', { assessmentId, error: (err as Error).message })
  }
}

/**
 * Tell the attorney who just accepted or declined a case, and their firm, so
 * their other sessions (web after deciding on mobile, a second tab, a
 * colleague's view) move the case without a reload.
 */
export async function emitLeadDecided(attorneyId: string, event: LeadDecidedEvent): Promise<void> {
  if (!io) return
  try {
    const attorney = await prisma.attorney.findUnique({
      where: { id: attorneyId },
      select: { lawFirmId: true },
    })
    const rooms = [`attorney:${attorneyId}`]
    if (attorney?.lawFirmId) rooms.push(`firm:${attorney.lawFirmId}`)
    io.to(rooms).emit('lead:decided', event)
  } catch (err) {
    logger.warn('Realtime lead:decided emit failed', { attorneyId, assessmentId: event.assessmentId, error: (err as Error).message })
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

export type AttorneyVerifiedEvent = {
  attorneyId: string
  isVerified: boolean
  isActive: boolean
}

/**
 * Tell an attorney and everyone on their firm that an admin changed the
 * attorney's verification or active status, so Team & Roles and the dashboard
 * verification banner update without a refresh.
 */
export async function emitAttorneyVerified(event: AttorneyVerifiedEvent): Promise<void> {
  if (!io) return
  try {
    const attorney = await prisma.attorney.findUnique({
      where: { id: event.attorneyId },
      select: { lawFirmId: true },
    })
    const rooms = [`attorney:${event.attorneyId}`]
    if (attorney?.lawFirmId) rooms.push(`firm:${attorney.lawFirmId}`)
    io.to(rooms).emit('attorney:verified', event)
  } catch (err) {
    logger.warn('Realtime attorney:verified emit failed', { attorneyId: event.attorneyId, error: (err as Error).message })
  }
}

/**
 * Tell everyone working the Case Assistance queue that a case just entered it,
 * so the new-arrival popup shows it now instead of on its next poll.
 */
export function emitAssistanceNew(event: { assessmentId: string }): void {
  if (!io) return
  try {
    io.to(CASE_ASSISTANCE_ROOM).emit('assistance:new', event)
  } catch (err) {
    logger.warn('Realtime assistance:new emit failed', { assessmentId: event.assessmentId, error: (err as Error).message })
  }
}

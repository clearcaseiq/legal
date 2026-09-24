/**
 * Online indicator between a plaintiff and their attorney.
 *
 * There is no socket layer, so presence is a heartbeat: an open, visible web
 * session posts every minute and `User.lastSeenAt` moves forward. Someone is
 * online while their last heartbeat is inside the window, which is a little over
 * two intervals so one late or dropped beat does not flicker the dot.
 *
 * Each side only ever sees its own counterparts — the other party of a chat room
 * or of a case the attorney has accepted — so this cannot be used to probe
 * whether an arbitrary user is around.
 */
import { prisma } from './prisma'

export const ONLINE_WINDOW_MS = 150_000
const WRITE_THROTTLE_MS = 45_000
const MAX_TRACKED_WRITES = 10_000

export type Presence = { online: boolean; lastSeenAt: string | null }

export type CounterpartPresence = {
  /** Plaintiff view: keyed by Attorney id. */
  attorneys: Record<string, Presence>
  /** Attorney view: keyed by the plaintiff's User id. */
  clients: Record<string, Presence>
  /** Attorney view: the same plaintiffs keyed by Assessment id, for case-centric screens. */
  cases: Record<string, Presence>
}

const lastWriteByUser = new Map<string, number>()

/** Several tabs each beat every minute; one write per window is plenty. */
export async function recordHeartbeat(userId: string, now: Date = new Date()): Promise<void> {
  const previous = lastWriteByUser.get(userId)
  if (previous !== undefined && now.getTime() - previous < WRITE_THROTTLE_MS) return
  if (lastWriteByUser.size >= MAX_TRACKED_WRITES) lastWriteByUser.clear()
  lastWriteByUser.set(userId, now.getTime())
  await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: now } })
}

export function toPresence(lastSeenAt: Date | null | undefined, now: number = Date.now()): Presence {
  if (!lastSeenAt) return { online: false, lastSeenAt: null }
  return {
    online: now - lastSeenAt.getTime() <= ONLINE_WINDOW_MS,
    lastSeenAt: lastSeenAt.toISOString(),
  }
}

export async function getCounterpartPresence(viewer: { id: string; email?: string | null }): Promise<CounterpartPresence> {
  const result: CounterpartPresence = { attorneys: {}, clients: {}, cases: {} }
  const now = Date.now()

  const attorney = viewer.email
    ? await prisma.attorney.findFirst({
        where: { email: { equals: viewer.email, mode: 'insensitive' } },
        select: { id: true },
      })
    : null

  if (attorney) {
    const [rooms, leads] = await Promise.all([
      prisma.chatRoom.findMany({
        where: { attorneyId: attorney.id },
        select: { userId: true, assessmentId: true },
      }),
      prisma.leadSubmission.findMany({
        where: { assignedAttorneyId: attorney.id, routingLocked: true },
        select: { assessmentId: true, assessment: { select: { userId: true } } },
      }),
    ])
    const casesByUser = new Map<string, Set<string>>()
    const link = (userId: string | null | undefined, assessmentId: string | null | undefined) => {
      if (!userId) return
      const cases = casesByUser.get(userId) ?? new Set<string>()
      if (assessmentId) cases.add(assessmentId)
      casesByUser.set(userId, cases)
    }
    for (const room of rooms) link(room.userId, room.assessmentId)
    for (const lead of leads) link(lead.assessment?.userId, lead.assessmentId)
    if (casesByUser.size === 0) return result

    const users = await prisma.user.findMany({
      where: { id: { in: [...casesByUser.keys()] } },
      select: { id: true, lastSeenAt: true },
    })
    for (const user of users) {
      const presence = toPresence(user.lastSeenAt, now)
      result.clients[user.id] = presence
      for (const assessmentId of casesByUser.get(user.id) ?? []) result.cases[assessmentId] = presence
    }
    return result
  }

  const [rooms, leads] = await Promise.all([
    prisma.chatRoom.findMany({ where: { userId: viewer.id }, select: { attorneyId: true } }),
    prisma.leadSubmission.findMany({
      where: { assessment: { userId: viewer.id }, routingLocked: true, assignedAttorneyId: { not: null } },
      select: { assignedAttorneyId: true },
    }),
  ])
  const attorneyIds = [...new Set([
    ...rooms.map((room) => room.attorneyId),
    ...leads.map((lead) => lead.assignedAttorneyId).filter((id): id is string => !!id),
  ])]
  if (attorneyIds.length === 0) return result

  const attorneys = await prisma.attorney.findMany({
    where: { id: { in: attorneyIds } },
    select: { id: true, email: true },
  })
  const emails = attorneys.map((a) => a.email).filter((email): email is string => !!email)
  const users = emails.length
    ? await prisma.user.findMany({
        where: { OR: emails.map((email) => ({ email: { equals: email, mode: 'insensitive' as const } })) },
        select: { email: true, lastSeenAt: true },
      })
    : []
  const seenByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.lastSeenAt]))
  for (const a of attorneys) {
    result.attorneys[a.id] = toPresence(a.email ? seenByEmail.get(a.email.toLowerCase()) : null, now)
  }
  return result
}

/**
 * Plaintiff notification feed.
 *
 * The attorney bell has read `Notification` rows since it was built; the
 * plaintiff bell derived its contents from routing status and pending document
 * requests instead, and no endpoint anywhere returned a plaintiff's rows. So
 * routes that carefully wrote an in-app notification for a plaintiff — consult
 * cancellation, task assignment — were writing to a table nobody read, and the
 * plaintiff was never told (CP-412/CP-430).
 *
 * This is the missing half: the same contract as the attorney feed, keyed to
 * the `plaintiff.` type prefix that lib/case-notifications applies.
 */

import { Router, type Router as ExpressRouter } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { PLAINTIFF_EVENTS } from '../lib/notification-events'

const router: ExpressRouter = Router()

/**
 * Scoped by userId as well as type, so this can never return another user's
 * rows even if a type prefix is reused elsewhere.
 */
const plaintiffNotificationWhere = (userId: string) => ({
  userId,
  type: { startsWith: 'plaintiff.' },
})

const BATCH_APPROVAL_TYPE = PLAINTIFF_EVENTS.batch_approval_requested

function serialize(n: {
  id: string
  type: string
  subject: string | null
  message: string | null
  metadata: string | null
  readAt: Date | null
  createdAt: Date
}) {
  let link: string | null = null
  let assessmentId: string | null = null
  if (n.metadata) {
    try {
      const meta = JSON.parse(n.metadata)
      if (typeof meta?.link === 'string') link = meta.link
      if (typeof meta?.assessmentId === 'string') assessmentId = meta.assessmentId
    } catch {
      /* a malformed payload should not hide the notification itself */
    }
  }
  return {
    id: n.id,
    type: n.type,
    title: n.subject || 'Notification',
    body: n.message || '',
    link,
    assessmentId,
    read: !!n.readAt,
    createdAt: n.createdAt,
  }
}

/**
 * "Approve the next attorneys" was correct when the first ranked choices timed
 * out, but once an attorney has matched / consulted / retained the case the
 * ask is obsolete. Keep the historical row (marked read) but hide it from the
 * active feed so plaintiffs aren't asked to approve a batch they've already
 * moved past.
 */
async function assessmentIdsWithObsoleteBatchApproval(
  assessmentIds: string[],
): Promise<Set<string>> {
  const ids = [...new Set(assessmentIds.filter(Boolean))]
  if (ids.length === 0) return new Set()

  const [leads, acceptedIntros] = await Promise.all([
    prisma.leadSubmission
      .findMany({
        where: { assessmentId: { in: ids } },
        select: { assessmentId: true, lifecycleState: true },
      })
      .catch(() => [] as Array<{ assessmentId: string; lifecycleState: string | null }>),
    prisma.introduction
      .findMany({
        where: { assessmentId: { in: ids }, status: 'ACCEPTED' },
        select: { assessmentId: true },
        distinct: ['assessmentId'],
      })
      .catch(() => [] as Array<{ assessmentId: string }>),
  ])

  const obsolete = new Set<string>()
  for (const intro of acceptedIntros) {
    if (intro.assessmentId) obsolete.add(intro.assessmentId)
  }
  const leadByAssessment = new Map(leads.map((l) => [l.assessmentId, l]))
  for (const id of ids) {
    const lead = leadByAssessment.get(id)
    // Only keep this notification while routing is still waiting on batch approval.
    if (!lead || String(lead.lifecycleState || '') !== 'awaiting_plaintiff_batch_approval') {
      obsolete.add(id)
    }
  }
  return obsolete
}

async function loadPlaintiffFeed(userId: string, limit: number) {
  const rows = await prisma.notification.findMany({
    where: plaintiffNotificationWhere(userId),
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit * 2, 100), // fetch extra in case we filter some out
    select: {
      id: true,
      type: true,
      subject: true,
      message: true,
      metadata: true,
      readAt: true,
      createdAt: true,
    },
  })

  const serialized = rows.map(serialize)
  const batchAssessmentIds = serialized
    .filter((n) => n.type === BATCH_APPROVAL_TYPE && n.assessmentId)
    .map((n) => n.assessmentId!)

  const obsoleteAssessments = await assessmentIdsWithObsoleteBatchApproval(batchAssessmentIds)
  const staleIds = serialized
    .filter(
      (n) =>
        n.type === BATCH_APPROVAL_TYPE &&
        n.assessmentId &&
        obsoleteAssessments.has(n.assessmentId),
    )
    .map((n) => n.id)

  if (staleIds.length > 0) {
    await prisma.notification
      .updateMany({
        where: { id: { in: staleIds }, userId, readAt: null },
        data: { readAt: new Date(), status: 'READ' },
      })
      .catch(() => undefined)
  }

  const staleSet = new Set(staleIds)
  const visible = serialized.filter((n) => !staleSet.has(n.id)).slice(0, limit)
  const unreadCount = visible.filter((n) => !n.read).length
  return { notifications: visible, unreadCount }
}

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })

    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '30'), 10) || 30, 1), 100)
    const feed = await loadPlaintiffFeed(userId, limit)
    res.json(feed)
  } catch (error: any) {
    logger.error('Failed to load plaintiff notifications', {
      error: error?.message,
      userId: req.user?.id,
    })
    res.status(500).json({ error: 'Failed to load notifications' })
  }
})

router.get('/unread-count', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const feed = await loadPlaintiffFeed(userId, 30)
    res.json({ count: feed.unreadCount })
  } catch (error: any) {
    logger.error('Failed to load plaintiff unread count', {
      error: error?.message,
      userId: req.user?.id,
    })
    res.status(500).json({ error: 'Failed to load unread count' })
  }
})

router.post('/:id/read', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId, readAt: null },
      data: { readAt: new Date(), status: 'READ' },
    })
    const feed = await loadPlaintiffFeed(userId, 30)
    res.json({ updated: result.count, unreadCount: feed.unreadCount })
  } catch (error: any) {
    logger.error('Failed to mark plaintiff notification read', {
      error: error?.message,
      userId: req.user?.id,
    })
    res.status(500).json({ error: 'Failed to mark read' })
  }
})

router.post('/read-all', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const result = await prisma.notification.updateMany({
      where: { ...plaintiffNotificationWhere(userId), readAt: null },
      data: { readAt: new Date(), status: 'READ' },
    })
    res.json({ updated: result.count, unreadCount: 0 })
  } catch (error: any) {
    logger.error('Failed to mark all plaintiff notifications read', {
      error: error?.message,
      userId: req.user?.id,
    })
    res.status(500).json({ error: 'Failed to mark all read' })
  }
})

export default router

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

const router: ExpressRouter = Router()

/**
 * Scoped by userId as well as type, so this can never return another user's
 * rows even if a type prefix is reused elsewhere.
 */
const plaintiffNotificationWhere = (userId: string) => ({
  userId,
  type: { startsWith: 'plaintiff.' },
})

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

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })

    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '30'), 10) || 30, 1), 100)
    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: plaintiffNotificationWhere(userId),
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          type: true,
          subject: true,
          message: true,
          metadata: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: { ...plaintiffNotificationWhere(userId), readAt: null },
      }),
    ])

    res.json({ notifications: rows.map(serialize), unreadCount })
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
    const count = await prisma.notification.count({
      where: { ...plaintiffNotificationWhere(userId), readAt: null },
    })
    res.json({ count })
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
    const unreadCount = await prisma.notification.count({
      where: { ...plaintiffNotificationWhere(userId), readAt: null },
    })
    res.json({ updated: result.count, unreadCount })
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

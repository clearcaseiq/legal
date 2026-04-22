/**
 * Phase 2: Admin Communications API
 * Notifications center, support tickets, failed notifications, resend controls.
 */

import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { isAdminEmail } from '../lib/admin-access'
import { resendNotification } from '../lib/platform-notifications'
import { z } from 'zod'

const router = Router()

function adminMiddleware(req: AuthRequest, res: any, next: any) {
  const email = req.user?.email
  if (!email || !isAdminEmail(email)) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// ===== Notifications Center =====
router.get(
  '/notifications',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { role, status, channel, failed24h, limit = 100 } = req.query
      const where: Record<string, unknown> = {}

      if (role) where.role = role
      if (status) where.status = status
      if (channel) where.channel = channel
      if (failed24h === 'true') {
        where.status = 'failed'
        where.failedAt = { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }

      const events = await prisma.platformNotificationEvent.findMany({
        where,
        include: {
          assessment: { select: { id: true, claimType: true, venueState: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          attorney: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
      })

      res.json({
        notifications: events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          role: e.role,
          channel: e.channel,
          recipient: e.recipient,
          status: e.status,
          subject: e.subject,
          caseId: e.assessmentId,
          case: e.assessment
            ? { id: e.assessment.id, claimType: e.assessment.claimType, venueState: e.assessment.venueState }
            : null,
          user: e.user,
          attorney: e.attorney,
          sentAt: e.sentAt,
          failedAt: e.failedAt,
          failureReason: e.failureReason,
          retryCount: e.retryCount,
          resendCount: e.resendCount,
          createdAt: e.createdAt,
        })),
      })
    } catch (error) {
      logger.error('Admin notifications list failed', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// ===== Failed Notifications Queue =====
router.get(
  '/notifications/failed',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { channel, eventType, retryExhausted } = req.query
      const where: Record<string, unknown> = { status: 'failed' }
      if (channel) where.channel = channel
      if (eventType) where.eventType = eventType
      if (retryExhausted === 'true') where.retryCount = { gte: 3 }

      const events = await prisma.platformNotificationEvent.findMany({
        where,
        include: {
          assessment: { select: { id: true, claimType: true } },
          user: { select: { email: true } },
          attorney: { select: { name: true, email: true } },
        },
        orderBy: { failedAt: 'desc' },
        take: 200,
      })

      res.json({
        failed: events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          channel: e.channel,
          recipient: e.recipient,
          failureReason: e.failureReason,
          retryCount: e.retryCount,
          lastAttemptAt: e.failedAt,
          nextRetryAt: e.nextRetryAt,
          caseId: e.assessmentId,
          role: e.role,
        })),
      })
    } catch (error) {
      logger.error('Admin failed notifications failed', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// ===== Resend / Retry =====
router.post(
  '/notifications/:id/resend',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params
      const { switchChannel } = req.body || {}
      const result = await resendNotification(id, { switchChannel })
      if (!result.success) {
        return res.status(400).json({ error: result.error })
      }
      res.json({ success: true })
    } catch (error) {
      logger.error('Admin resend notification failed', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

router.post(
  '/notifications/:id/mark-resolved',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params
      await prisma.platformNotificationEvent.update({
        where: { id },
        data: { status: 'suppressed' },
      })
      res.json({ success: true })
    } catch (error) {
      logger.error('Admin mark resolved failed', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// ===== Support Tickets =====
const CreateTicketSchema = z.object({
  caseId: z.string().optional(),
  userId: z.string().optional(),
  attorneyId: z.string().optional(),
  role: z.enum(['plaintiff', 'attorney']),
  category: z.string(),
  subject: z.string(),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
})

router.get(
  '/support-tickets',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { status, priority, category } = req.query
      const where: Record<string, unknown> = {}
      if (status) where.status = status
      if (priority) where.priority = priority
      if (category) where.category = category

      const tickets = await prisma.supportTicket.findMany({
        where,
        include: {
          assessment: { select: { id: true, claimType: true, venueState: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          attorney: { select: { id: true, name: true, email: true } },
          assignedAdmin: { select: { id: true, email: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })

      res.json({ tickets })
    } catch (error) {
      logger.error('Admin support tickets failed', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

router.post(
  '/support-tickets',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const parsed = CreateTicketSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      }
      const data = parsed.data
      const ticket = await prisma.supportTicket.create({
        data: {
          caseId: data.caseId,
          userId: data.userId,
          attorneyId: data.attorneyId,
          role: data.role,
          category: data.category,
          subject: data.subject,
          description: data.description,
          priority: data.priority || 'medium',
        },
      })
      res.json({ ticket })
    } catch (error) {
      logger.error('Admin create ticket failed', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

router.get(
  '/support-tickets/:id',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params
      const ticket = await prisma.supportTicket.findUnique({
        where: { id },
        include: {
          assessment: true,
          user: true,
          attorney: true,
          assignedAdmin: true,
          messages: { orderBy: { createdAt: 'asc' } },
        },
      })
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' })
      res.json(ticket)
    } catch (error) {
      logger.error('Admin ticket detail failed', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

router.patch(
  '/support-tickets/:id',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params
      const { status, assignedAdminId, priority, resolutionNotes } = req.body || {}
      const update: Record<string, unknown> = {}
      if (status) update.status = status
      if (assignedAdminId !== undefined) update.assignedAdminId = assignedAdminId
      if (priority) update.priority = priority
      if (resolutionNotes !== undefined) update.resolutionNotes = resolutionNotes
      if (status === 'resolved' || status === 'closed') update.resolvedAt = new Date()

      const ticket = await prisma.supportTicket.update({
        where: { id },
        data: update,
      })
      res.json(ticket)
    } catch (error) {
      logger.error('Admin update ticket failed', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

router.post(
  '/support-tickets/:id/messages',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params
      const { body } = req.body || {}
      if (!body || typeof body !== 'string') {
        return res.status(400).json({ error: 'body required' })
      }
      const userId = req.user?.id
      const msg = await prisma.supportTicketMessage.create({
        data: {
          ticketId: id,
          senderId: userId || 'admin',
          senderRole: 'admin',
          body,
        },
      })
      await prisma.supportTicket.update({
        where: { id },
        data: { updatedAt: new Date() },
      })
      res.json(msg)
    } catch (error) {
      logger.error('Admin ticket reply failed', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// ===== Routing Alerts Monitor =====
router.get(
  '/routing-alerts',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const events = await prisma.platformNotificationEvent.findMany({
        where: {
          eventType: { in: ['attorney.case_routed', 'attorney.case_reminder', 'attorney.wave2_route'] },
          role: 'attorney',
        },
        include: {
          assessment: { select: { id: true, claimType: true } },
          attorney: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })

      res.json({
        alerts: events.map((e) => ({
          id: e.id,
          caseId: e.assessmentId,
          attorney: e.attorney,
          eventType: e.eventType,
          sentAt: e.sentAt,
          status: e.status,
        })),
      })
    } catch (error) {
      logger.error('Admin routing alerts failed', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export default router

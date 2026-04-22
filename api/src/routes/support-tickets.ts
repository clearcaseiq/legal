/**
 * Phase 2: User-facing support ticket API
 * Plaintiffs and attorneys can create and view their tickets.
 */

import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { z } from 'zod'

const router = Router()

const CreateTicketSchema = z.object({
  caseId: z.string().optional(),
  category: z.string(),
  subject: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
})

// Plaintiff categories
export const PLAINTIFF_CATEGORIES = [
  'trouble_uploading',
  'cannot_access_dashboard',
  'question_about_case_status',
  'attorney_has_not_responded',
  'privacy_concern',
  'general_support',
]

// Attorney categories
export const ATTORNEY_CATEGORIES = [
  'routing_issue',
  'cannot_access_case',
  'duplicate_case_concern',
  'case_not_fit',
  'billing_subscription',
  'general_support',
]

// Create ticket (plaintiff or attorney)
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = CreateTicketSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }
    const data = parsed.data
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })

    // Determine role from user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true },
    })
    const role = user?.role === 'attorney' ? 'attorney' : 'plaintiff'
    let attorneyId: string | undefined
    if (role === 'attorney' && user?.email) {
      const att = await prisma.attorney.findUnique({
        where: { email: user.email },
        select: { id: true },
      })
      attorneyId = att?.id
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        caseId: data.caseId,
        userId: role === 'plaintiff' ? userId : undefined,
        attorneyId,
        role,
        category: data.category,
        subject: data.subject,
        description: data.description,
        priority: data.priority || 'medium',
      },
    })

    res.json({ ticket })
  } catch (error) {
    logger.error('Create support ticket failed', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// List my tickets
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true },
    })
    let where: { userId?: string; attorneyId?: string } = { userId }
    if (user?.role === 'attorney' && user?.email) {
      const att = await prisma.attorney.findUnique({
        where: { email: user.email },
        select: { id: true },
      })
      if (att) {
        where = { attorneyId: att.id }
      }
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        assessment: { select: { id: true, claimType: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ tickets })
  } catch (error) {
    logger.error('List support tickets failed', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get ticket detail
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true },
    })
    let where: { id: string; userId?: string; attorneyId?: string } = { id, userId }
    if (user?.role === 'attorney' && user?.email) {
      const att = await prisma.attorney.findUnique({
        where: { email: user.email },
        select: { id: true },
      })
      if (att) where = { id, attorneyId: att.id }
    }

    const ticket = await prisma.supportTicket.findFirst({
      where,
      include: {
        assessment: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })

    res.json(ticket)
  } catch (error) {
    logger.error('Get ticket failed', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Reply to ticket
router.post('/:id/messages', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { body } = req.body || {}
    const userId = req.user?.id
    if (!userId || !body || typeof body !== 'string') {
      return res.status(400).json({ error: 'body required' })
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, userId },
    })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      return res.status(400).json({ error: 'Ticket is closed' })
    }

    const senderRole = req.user?.role === 'attorney' ? 'attorney' : 'plaintiff'
    const msg = await prisma.supportTicketMessage.create({
      data: {
        ticketId: id,
        senderId: userId,
        senderRole,
        body,
      },
    })
    await prisma.supportTicket.update({
      where: { id },
      data: { updatedAt: new Date(), status: 'waiting_on_user' },
    })

    res.json(msg)
  } catch (error) {
    logger.error('Ticket reply failed', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

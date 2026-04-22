import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { deliverDirectNotification } from '../lib/platform-notifications'

const router = Router()

const NotificationRequest = z.object({
  type: z.enum(['email', 'sms', 'push']),
  recipient: z.string(),
  subject: z.string().optional(),
  message: z.string(),
  metadata: z.record(z.any()).optional()
})

// Send notification
router.post('/send', async (req, res) => {
  try {
    const parsed = NotificationRequest.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { type, recipient, subject, message, metadata } = parsed.data
    const { notification, delivered, platformEventId } = await deliverDirectNotification({
      type,
      recipient,
      subject,
      message,
      metadata,
    })

    logger.info('Notification sent', {
      notificationId: notification.id,
      type,
      recipient,
      delivered,
      platformEventId,
    })

    res.json({
      notification_id: notification.id,
      status: notification.status,
      sent_at: notification.sentAt || notification.createdAt,
      delivered,
      platformEventId,
    })
  } catch (error) {
    logger.error('Failed to send notification', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get notification status
router.get('/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params
    
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    })
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json({
      notification_id: notification.id,
      type: notification.type,
      recipient: notification.recipient,
      subject: notification.subject,
      message: notification.message,
      status: notification.status,
      sent_at: notification.createdAt,
      delivered_at: notification.deliveredAt,
      read_at: notification.readAt
    })
  } catch (error) {
    logger.error('Failed to get notification', { error, notificationId: req.params.notificationId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// List notifications for a recipient
router.get('/recipient/:recipient', async (req, res) => {
  try {
    const { recipient } = req.params
    const { limit = 50, offset = 0 } = req.query
    
    const notifications = await prisma.notification.findMany({
      where: { recipient },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    })

    res.json(notifications.map(n => ({
      notification_id: n.id,
      type: n.type,
      subject: n.subject,
      status: n.status,
      sent_at: n.createdAt,
      delivered_at: n.deliveredAt,
      read_at: n.readAt
    })))
  } catch (error) {
    logger.error('Failed to list notifications', { error, recipient: req.params.recipient })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { notifyAttorneyByUserEmail } from '../lib/attorney-push'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { authMiddleware, AuthRequest } from '../lib/auth'
import {
  requireClientConsentsMiddleware,
  requireVerifiedEmailMiddleware,
} from '../lib/client-consent-guard'
import { translateForPlaintiff, getPlaintiffLanguage } from '../lib/translate'

const router = Router()

const MessageCreate = z.object({
  chatRoomId: z.string().optional(),
  attorneyId: z.string(),
  assessmentId: z.string().optional(),
  content: z.string().min(1).max(2000),
  messageType: z.enum(['text', 'image', 'file']).default('text'),
  metadata: z.string().optional()
})

const ChatBotMessage = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().optional(),
  context: z.string().optional()
})

// Get or create chat room with an attorney
router.post(
  '/chat-room',
  authMiddleware,
  requireClientConsentsMiddleware(),
  requireVerifiedEmailMiddleware(),
  async (req: AuthRequest, res) => {
  try {
    const { attorneyId, assessmentId } = req.body

    if (!attorneyId) {
      return res.status(400).json({ error: 'Attorney ID is required' })
    }

    // Check if attorney exists
    const attorney = await prisma.attorney.findUnique({
      where: { id: attorneyId, isActive: true }
    })

    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    // Get or create chat room
    let chatRoom = await prisma.chatRoom.findUnique({
      where: {
        userId_attorneyId: {
          userId: req.user!.id,
          attorneyId
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        attorney: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assessment: {
          select: {
            id: true,
            claimType: true,
            venueState: true
          }
        }
      }
    })

    if (!chatRoom) {
      chatRoom = await prisma.chatRoom.create({
        data: {
          userId: req.user!.id,
          attorneyId,
          assessmentId
        },
        include: {
          messages: true,
          attorney: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          assessment: {
            select: {
              id: true,
              claimType: true,
              venueState: true
            }
          }
        }
      })
    }

    // Reverse messages to show oldest first
    chatRoom.messages = chatRoom.messages.reverse()

    // Translate attorney messages to plaintiff's preferred language
    const plaintiffLang = getPlaintiffLanguage(req)
    if (plaintiffLang !== 'en') {
      const translated = await Promise.all(
        chatRoom.messages.map(async (m) => {
          if (m.senderType === 'attorney' && m.content) {
            const content = await translateForPlaintiff(m.content, plaintiffLang)
            return { ...m, content }
          }
          return m
        })
      )
      chatRoom.messages = translated
    }

    res.json({
      chatRoomId: chatRoom.id,
      attorney: chatRoom.attorney,
      assessment: chatRoom.assessment,
      messages: chatRoom.messages,
      status: chatRoom.status,
      lastMessageAt: chatRoom.lastMessageAt,
      createdAt: chatRoom.createdAt
    })
  } catch (error) {
    logger.error('Failed to get or create chat room', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user's chat rooms
router.get('/chat-rooms', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const chatRooms = await prisma.chatRoom.findMany({
      where: { userId: req.user!.id },
      include: {
        attorney: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: true
          }
        },
        assessment: {
          select: {
            id: true,
            claimType: true,
            venueState: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    })

    // Parse profile JSON for attorneys
    let parsedChatRooms = chatRooms.map(room => ({
      ...room,
      attorney: {
        ...room.attorney,
        profile: room.attorney.profile ? JSON.parse(room.attorney.profile) : null
      }
    }))

    // Translate last attorney message in each room to plaintiff's preferred language
    const plaintiffLang = getPlaintiffLanguage(req)
    if (plaintiffLang !== 'en') {
      parsedChatRooms = await Promise.all(
        parsedChatRooms.map(async (room) => {
          const lastMsg = room.messages?.[0]
          if (lastMsg?.senderType === 'attorney' && lastMsg?.content) {
            const content = await translateForPlaintiff(lastMsg.content, plaintiffLang)
            return {
              ...room,
              messages: [{ ...lastMsg, content }]
            }
          }
          return room
        })
      )
    }

    res.json(parsedChatRooms)
  } catch (error) {
    logger.error('Failed to get chat rooms', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Send message
router.post(
  '/send',
  authMiddleware,
  requireClientConsentsMiddleware(),
  requireVerifiedEmailMiddleware(),
  async (req: AuthRequest, res) => {
  try {
    const parsed = MessageCreate.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { chatRoomId, attorneyId, assessmentId, content, messageType, metadata } = parsed.data

    let roomId = chatRoomId

    // Create chat room if it doesn't exist
    if (!roomId) {
      const chatRoom = await prisma.chatRoom.create({
        data: {
          userId: req.user!.id,
          attorneyId,
          assessmentId
        }
      })
      roomId = chatRoom.id
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        chatRoomId: roomId,
        senderId: req.user!.id,
        senderType: 'user',
        content,
        messageType,
        metadata
      }
    })

    // Update chat room last message time
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { lastMessageAt: new Date() }
    })

    try {
      const roomForPush = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        include: { attorney: { select: { email: true } } },
      })
      const preview =
        content.length > 120 ? `${content.slice(0, 117)}…` : content
      await notifyAttorneyByUserEmail(roomForPush?.attorney?.email, {
        title: 'New message from client',
        body: preview,
        data: {
          type: 'chat_message',
          chatRoomId: String(roomId),
        },
      })
    } catch (pushErr: unknown) {
      logger.warn('Attorney push after plaintiff message failed', {
        error: pushErr instanceof Error ? pushErr.message : String(pushErr),
      })
    }

    logger.info('Message sent', { 
      messageId: message.id,
      chatRoomId: roomId,
      userId: req.user!.id
    })

    res.status(201).json({
      messageId: message.id,
      chatRoomId: roomId,
      content: message.content,
      messageType: message.messageType,
      senderType: message.senderType,
      createdAt: message.createdAt
    })
  } catch (error) {
    logger.error('Failed to send message', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get messages for a chat room
router.get('/chat-room/:chatRoomId/messages', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { chatRoomId } = req.params
    const { limit = 50, offset = 0 } = req.query

    // Verify user has access to this chat room
    const chatRoom = await prisma.chatRoom.findFirst({
      where: {
        id: chatRoomId,
        userId: req.user!.id
      }
    })

    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' })
    }

    const messages = await prisma.message.findMany({
      where: { chatRoomId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    })

    // Reverse to show oldest first
    messages.reverse()

    // Translate attorney messages to plaintiff's preferred language
    const plaintiffLang = getPlaintiffLanguage(req)
    if (plaintiffLang !== 'en') {
      const translated = await Promise.all(
        messages.map(async (m) => {
          if (m.senderType === 'attorney' && m.content) {
            const content = await translateForPlaintiff(m.content, plaintiffLang)
            return { ...m, content }
          }
          return m
        })
      )
      res.json(translated)
    } else {
      res.json(messages)
    }
  } catch (error) {
    logger.error('Failed to get messages', { error, chatRoomId: req.params.chatRoomId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark messages as read
router.put('/chat-room/:chatRoomId/read', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { chatRoomId } = req.params

    // Verify user has access to this chat room
    const chatRoom = await prisma.chatRoom.findFirst({
      where: {
        id: chatRoomId,
        userId: req.user!.id
      }
    })

    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' })
    }

    // Mark all messages from attorneys as read
    await prisma.message.updateMany({
      where: {
        chatRoomId,
        senderType: 'attorney',
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    res.json({ success: true })
  } catch (error) {
    logger.error('Failed to mark messages as read', { error, chatRoomId: req.params.chatRoomId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// AI Chat Bot endpoint
router.post('/chatbot', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = ChatBotMessage.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { message, sessionId, context } = parsed.data

    // Simple AI responses based on keywords
    const responses = {
      'statute of limitations': 'The statute of limitations varies by state and case type. In California, personal injury cases generally have a 2-year statute of limitations from the date of injury.',
      'how much is my case worth': 'Case value depends on many factors including medical bills, lost wages, pain and suffering, and liability. Our AI assessment can provide an estimate based on similar cases.',
      'do I need a lawyer': 'If you\'ve been injured due to someone else\'s negligence, consulting with an attorney can help protect your rights and maximize your recovery.',
      'what documents do I need': 'Important documents include medical records, police reports, insurance correspondence, photos of injuries/damage, and wage statements.',
      'how long does it take': 'Most personal injury cases settle within 6-18 months, but complex cases can take longer. Timeline depends on factors like case complexity and court schedules.'
    }

    let response = 'I understand you have questions about your legal case. Our qualified attorneys can provide specific guidance based on your situation. Would you like to schedule a free consultation?'

    // Simple keyword matching
    const messageLower = message.toLowerCase()
    for (const [keyword, reply] of Object.entries(responses)) {
      if (messageLower.includes(keyword)) {
        response = reply
        break
      }
    }

    // Store or update chatbot session
    let session
    if (sessionId) {
      session = await prisma.chatBotSession.findUnique({
        where: { sessionId }
      })
    }

    if (!session) {
      session = await prisma.chatBotSession.create({
        data: {
          userId: req.user!.id,
          sessionId: sessionId || `session_${Date.now()}`,
          context: context || '{}',
          lastInteraction: new Date()
        }
      })
    } else {
      await prisma.chatBotSession.update({
        where: { id: session.id },
        data: {
          lastInteraction: new Date(),
          context: context || session.context
        }
      })
    }

    logger.info('Chatbot interaction', { 
      userId: req.user!.id,
      sessionId: session.sessionId,
      messageLength: message.length
    })

    res.json({
      response,
      sessionId: session.sessionId,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Failed to process chatbot message', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get chatbot sessions
router.get('/chatbot/sessions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const sessions = await prisma.chatBotSession.findMany({
      where: { userId: req.user!.id },
      orderBy: { lastInteraction: 'desc' }
    })

    res.json(sessions)
  } catch (error) {
    logger.error('Failed to get chatbot sessions', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

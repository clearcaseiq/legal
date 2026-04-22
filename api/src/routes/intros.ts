import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { IntroRequest } from '../lib/validators'
import { logger } from '../lib/logger'
import { authMiddleware, type AuthRequest } from '../lib/auth'

const router = Router()

function canAccessAssessment(req: AuthRequest, assessmentUserId: string | null | undefined) {
  return req.user?.role === 'admin' || (!!req.user?.id && req.user.id === assessmentUserId)
}

function canAccessIntro(
  req: AuthRequest,
  intro: {
    assessment?: { userId?: string | null } | null
    attorney?: { email?: string | null } | null
  }
) {
  if (req.user?.role === 'admin') return true
  if (req.user?.id && req.user.id === intro.assessment?.userId) return true
  if (req.user?.email && intro.attorney?.email) {
    return req.user.email.toLowerCase() === intro.attorney.email.toLowerCase()
  }
  return false
}

// Request introduction to attorney
router.post('/request', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = IntroRequest.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { assessmentId, attorneyId, message } = parsed.data
    
    // Verify assessment exists
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { id: true, userId: true }
    })
    
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    if (!canAccessAssessment(req, assessment.userId)) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Verify attorney exists
    const attorney = await prisma.attorney.findUnique({
      where: { id: attorneyId },
      select: { id: true }
    })
    
    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    // Create introduction request
    const intro = await prisma.introduction.create({
      data: {
        assessmentId,
        attorneyId,
        status: 'PENDING',
        message: message || '',
        requestedAt: new Date()
      }
    })

    logger.info('Introduction requested', { 
      introId: intro.id,
      assessmentId, 
      attorneyId 
    })

    res.json({
      intro_id: intro.id,
      status: intro.status,
      requested_at: intro.requestedAt,
      message: 'Introduction request submitted. Attorney will be notified.'
    })
  } catch (error) {
    logger.error('Failed to request introduction', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get introduction status
router.get('/:introId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { introId } = req.params
    
    const intro = await prisma.introduction.findUnique({
      where: { id: introId },
      select: {
        id: true,
        assessmentId: true,
        attorneyId: true,
        status: true,
        message: true,
        requestedAt: true,
        respondedAt: true,
        assessment: {
          select: {
            userId: true
          }
        },
        attorney: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    
    if (!intro) {
      return res.status(404).json({ error: 'Introduction not found' })
    }

    if (!canAccessIntro(req, intro)) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    res.json({
      intro_id: intro.id,
      status: intro.status,
      assessment_id: intro.assessmentId,
      attorney_id: intro.attorneyId,
      attorney_name: intro.attorney.name,
      message: intro.message,
      requested_at: intro.requestedAt,
      responded_at: intro.respondedAt
    })
  } catch (error) {
    logger.error('Failed to get introduction', { error, introId: req.params.introId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// List introductions for an assessment
router.get('/assessment/:assessmentId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { userId: true }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    if (!canAccessAssessment(req, assessment.userId)) {
      return res.status(403).json({ error: 'Unauthorized' })
    }
    
    const intros = await prisma.introduction.findMany({
      where: { assessmentId },
      select: {
        id: true,
        status: true,
        attorneyId: true,
        requestedAt: true,
        respondedAt: true,
        attorney: {
          select: {
            name: true
          }
        }
      },
      orderBy: { requestedAt: 'desc' }
    })

    res.json(intros.map(intro => ({
      intro_id: intro.id,
      status: intro.status,
      attorney_id: intro.attorneyId,
      attorney_name: intro.attorney.name,
      requested_at: intro.requestedAt,
      responded_at: intro.respondedAt
    })))
  } catch (error) {
    logger.error('Failed to list introductions', { error, assessmentId: req.params.assessmentId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { IntroRequest } from '../lib/validators'
import { logger } from '../lib/logger'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { offerReferenceCode } from '../lib/offer-reference'

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
/**
 * Resolve the six-character code from an offer text to the page it refers to.
 *
 * The text an attorney receives has to carry a link, and the real destination —
 * `/attorney-dashboard/lead/<cuid>/overview` — is around eighty characters,
 * which on its own is half the message. The code is already in the text so the
 * attorney can reply ACCEPT with it, so the short link reuses it.
 *
 * Behind `authMiddleware` deliberately. Resolving a code to a lead id without a
 * session would let anyone with a code confirm a case exists and learn its
 * identifier, and codes are short. The `/o/:code` page sends the attorney
 * through login first and resolves afterwards, so nothing is lost by it.
 */
router.get('/by-code/:code', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase()
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      return res.status(400).json({ error: 'Malformed code' })
    }

    // The code is the leading characters of the id, so the prefix search finds
    // it without a column to index. `offerReferenceCode` is still the authority
    // on the mapping, and filters the candidates below.
    const candidates = await prisma.introduction.findMany({
      where: { id: { startsWith: code.toLowerCase() } },
      orderBy: [{ requestedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        assessmentId: true,
        status: true,
        assessment: { select: { userId: true } },
        attorney: { select: { email: true } },
      },
    })

    // Six characters is short enough that a collision is possible, so narrow by
    // who is asking before giving up: two attorneys' offers can share a prefix,
    // but only one of them is the reader's.
    const mine = candidates
      .filter((intro) => offerReferenceCode(intro.id) === code)
      .filter((intro) => canAccessIntro(req, intro))

    if (mine.length === 0) {
      return res.status(404).json({ error: 'No offer matches that code' })
    }

    const intro = mine[0]
    const lead = await prisma.leadSubmission.findFirst({
      where: { assessmentId: intro.assessmentId },
      select: { id: true },
    })

    res.json({
      introId: intro.id,
      status: intro.status,
      // The dashboard is the honest fallback: the offer is real, but without a
      // lead row there is no detail page to open.
      path: lead?.id ? `/attorney-dashboard/lead/${lead.id}/overview` : '/attorney-dashboard',
    })
  } catch (error) {
    logger.error('Failed to resolve offer code', { error, code: req.params.code })
    res.status(500).json({ error: 'Internal server error' })
  }
})

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

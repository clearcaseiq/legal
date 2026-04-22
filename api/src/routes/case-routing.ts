/**
 * Case Routing Lifecycle API
 * Steps 9-12: Attorney review, actions, plaintiff status
 */

import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import {
  attorneyAcceptCase,
  attorneyDeclineCase,
  attorneyRequestMoreInfo,
  recordRoutingEvent
} from '../lib/routing-lifecycle'
import { getAppointmentPreparation } from '../lib/appointment-engagement'
const router = Router()

async function getAttorneyFromRequest(req: AuthRequest): Promise<{ id: string } | null> {
  const email = req.user?.email
  if (!email) return null
  return prisma.attorney.findFirst({
    where: {
      OR: [
        { email },
        { email: email.toLowerCase() },
        { email: email.toUpperCase() }
      ]
    },
    select: { id: true }
  })
}

/**
 * Step 9: Attorney Review Screen - Case intelligence summary
 * GET /v1/case-routing/introductions/:id/summary
 */
router.get('/introductions/:id/summary', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyFromRequest(req)
    if (!attorney) return res.status(403).json({ error: 'Attorney access required' })

    const intro = await prisma.introduction.findFirst({
      where: { id: req.params.id, attorneyId: attorney.id },
      select: {
        id: true,
        status: true,
        assessmentId: true,
        assessment: {
          select: {
            id: true,
            claimType: true,
            venueState: true,
            venueCounty: true,
            facts: true,
            predictions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                viability: true,
                bands: true
              }
            },
            evidenceFiles: { select: { category: true } },
          }
        }
      }
    })

    if (!intro) return res.status(404).json({ error: 'Introduction not found' })
    if (intro.status !== 'PENDING') return res.status(400).json({ error: 'Introduction already responded' })

    const assessment = intro.assessment
    const facts = typeof assessment.facts === 'string' ? JSON.parse(assessment.facts) : assessment.facts || {}
    const pred = assessment.predictions[0]
    const viability = pred ? JSON.parse(pred.viability) : {}
    const bands = pred ? JSON.parse(pred.bands) : {}

    const evidenceCategories = new Set(intro.assessment.evidenceFiles.map(f => f.category))
    const evidenceSummary = [
      evidenceCategories.has('medical_records') || evidenceCategories.has('bills') ? 'Medical treatment: yes' : 'Medical treatment: no',
      evidenceCategories.has('police_report') ? 'Police report: yes' : 'Police report: no',
      evidenceCategories.has('photos') ? 'Photos: yes' : 'Photos: no',
      evidenceCategories.has('wage_loss') || facts.damages?.wage_loss ? 'Wage loss: yes' : 'Wage loss: unknown'
    ].join('\n')

    const liabilityLabel =
      (viability.liability ?? 0.5) >= 0.7 ? 'Strong' : (viability.liability ?? 0.5) >= 0.4 ? 'Moderate' : 'Weak'

    const jurisdiction = [assessment.venueState, assessment.venueCounty].filter(Boolean).join(', ')

    await recordRoutingEvent(intro.assessmentId, intro.id, attorney.id, 'viewed', {})

    res.json({
      introductionId: intro.id,
      assessmentId: intro.assessmentId,
      caseSnapshot: {
        claimType: assessment.claimType,
        jurisdiction,
        caseScore: Math.round((viability.overall ?? 0.5) * 100),
        evidenceStatus: evidenceSummary,
        estimatedValueLow: bands.p25 ?? 0,
        estimatedValueHigh: bands.p75 ?? 0,
        liabilitySignals: liabilityLabel,
        quickEvidenceSummary: evidenceSummary
      },
      aiInsights: {
        potentialSettlementRange: `$${((bands.p25 ?? 0) / 1000).toFixed(0)}k – $${((bands.p75 ?? 0) / 1000).toFixed(0)}k`,
        typicalTimeline: '3–12 months for settlement',
        similarCasesInRegion: 'Available in full case file'
      }
    })
  } catch (error: unknown) {
    logger.error('Case summary error', { error: (error as Error).message, introId: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Step 10: Attorney accepts case
 */
router.post('/introductions/:id/accept', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyFromRequest(req)
    if (!attorney) return res.status(403).json({ error: 'Attorney access required' })

    const result = await attorneyAcceptCase(req.params.id, attorney.id)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    res.json({ success: true, message: 'Case accepted. Plaintiff has been notified.' })
  } catch (error: unknown) {
    logger.error('Accept case error', { error: (error as Error).message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Step 10: Attorney declines case
 */
router.post('/introductions/:id/decline', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyFromRequest(req)
    if (!attorney) return res.status(403).json({ error: 'Attorney access required' })

    const { declineReason } = req.body || {}
    const result = await attorneyDeclineCase(req.params.id, attorney.id, declineReason)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    res.json({ success: true, message: 'Case declined.' })
  } catch (error: unknown) {
    logger.error('Decline case error', { error: (error as Error).message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Step 10: Attorney requests more info
 */
router.post('/introductions/:id/request-info', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyFromRequest(req)
    if (!attorney) return res.status(403).json({ error: 'Attorney access required' })

    const { notes } = req.body || {}
    if (!notes || typeof notes !== 'string') {
      return res.status(400).json({ error: 'Notes required for info request' })
    }
    const result = await attorneyRequestMoreInfo(req.params.id, attorney.id, notes)
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    res.json({ success: true, message: 'Info request sent to plaintiff.' })
  } catch (error: unknown) {
    logger.error('Request info error', { error: (error as Error).message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Step 18: Plaintiff dashboard - routing status
 * GET /v1/case-routing/assessment/:id/status
 */
router.get('/assessment/:id/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const assessmentId = req.params.id
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        userId: true,
        facts: true,
        user: { select: { email: true } },
        leadSubmission: {
          select: {
            lifecycleState: true
          }
        },
        introductions: {
          select: {
            status: true,
            attorney: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                specialties: true,
                responseTimeHours: true,
                lawFirmId: true,
                lawFirm: { select: { name: true } }
              }
            }
          }
        }
      }
    })

    if (!assessment) return res.status(404).json({ error: 'Assessment not found' })
    if (assessment.userId && assessment.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const lead = assessment.leadSubmission
    const intros = assessment.introductions
    const accepted = intros.find(i => i.status === 'ACCEPTED')
    const reviewingCount = intros.filter(i => i.status === 'PENDING').length

    // Upcoming appointment for this assessment (plaintiff dashboard)
    const [appointmentRecord, yearsExperienceRecord, recentEvents] = await Promise.all([
      assessment.userId
        ? prisma.appointment.findFirst({
            where: {
              userId: assessment.userId,
              assessmentId,
              status: { in: ['SCHEDULED', 'CONFIRMED'] },
              scheduledAt: { gte: new Date() }
            },
            orderBy: { scheduledAt: 'asc' },
            select: {
              id: true,
              scheduledAt: true,
              type: true,
              attorney: { select: { name: true } }
            }
          }).catch(() => null)
        : Promise.resolve(null),
      accepted
        ? prisma.attorneyProfile.findUnique({
            where: { attorneyId: accepted.attorney.id },
            select: { yearsExperience: true }
          }).catch(() => null)
        : Promise.resolve(null),
      prisma.routingAnalytics.findMany({
        where: { assessmentId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          eventType: true,
          createdAt: true
        }
      }).catch(() => []),
    ])

    const appointmentPrep = appointmentRecord && assessment.userId && req.user?.id === assessment.userId
      ? await getAppointmentPreparation(appointmentRecord.id, req.user.id).catch(() => null)
      : null
    const reviewEligible = accepted && assessment.userId && req.user?.id === assessment.userId
      ? Boolean(await prisma.appointment.findFirst({
          where: {
            userId: req.user.id,
            attorneyId: accepted.attorney.id,
            assessmentId,
            status: { in: ['CONFIRMED', 'COMPLETED'] }
          },
          select: { id: true }
        }).catch(() => null))
      : false
    const upcomingAppointment = appointmentRecord
      ? {
          id: appointmentRecord.id,
          scheduledAt: appointmentRecord.scheduledAt.toISOString(),
          type: appointmentRecord.type,
          attorney: {
            id: accepted?.attorney.id,
            name: appointmentRecord.attorney.name
          },
          preparation: appointmentPrep
            ? {
                checkInStatus: appointmentPrep.checkInStatus,
                preparationNotes: appointmentPrep.preparationNotes,
                prepItems: appointmentPrep.prepItems.map((item: any) => ({
                  id: item.id,
                  label: item.label,
                  status: item.status,
                  isRequired: item.isRequired
                })),
                waitlistStatus: appointmentPrep.waitlistStatus
              }
            : null,
          reviewEligible
        }
      : null

    const yearsExperience = yearsExperienceRecord?.yearsExperience ?? null

    let statusMessage = 'Case submitted for review.'
    let stage = 'routing_active'
    const searchExpanded = recentEvents.some((event: any) => event.eventType === 'plaintiff_rank_batch_generated')

    if (lead?.lifecycleState === 'manual_review_needed') {
      stage = 'manual_review_needed'
      statusMessage = 'Your case is in manual review. Our team is checking the next best step.'
    } else if (lead?.lifecycleState === 'plaintiff_info_requested') {
      stage = 'plaintiff_info_requested'
      statusMessage = 'An attorney requested more information to continue reviewing your case.'
    } else if (lead?.lifecycleState === 'needs_more_info') {
      stage = 'needs_more_info'
      statusMessage = 'We need a bit more information before routing your case.'
    } else if (lead?.lifecycleState === 'not_routable_yet') {
      stage = 'not_routable_yet'
      statusMessage = 'Your case is not routable yet. Our team may follow up with guidance.'
    } else if (accepted) {
      stage = 'attorney_matched'
      statusMessage = 'Attorney interested in your case'
    } else if (reviewingCount > 0) {
      stage = 'attorney_review'
      statusMessage = searchExpanded
        ? 'Your original top choices were unavailable, so we expanded the search. Additional attorneys are now reviewing your case.'
        : `${reviewingCount} attorney(s) reviewing your case. Expected response within 24 hours.`
    } else if (intros.length > 0) {
      statusMessage = searchExpanded
        ? 'We expanded the search to a new group of matching attorneys. Awaiting response.'
        : `${intros.length} attorney(s) received your case. Awaiting response.`
    }

    const attorneyActivity = recentEvents.map((e: any) => {
      const mins = Math.floor((Date.now() - new Date(e.createdAt).getTime()) / 60000)
      const timeAgo = mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.floor(mins / 60)} hours ago` : `${Math.floor(mins / 1440)} days ago`
      if (e.eventType === 'viewed') return { type: 'viewed', message: `Attorney viewed your case ${timeAgo}`, timeAgo }
      if (e.eventType === 'routed') return { type: 'routed', message: `Case sent to attorney`, timeAgo }
      if (e.eventType === 'accepted') return { type: 'accepted', message: `Attorney interested in your case`, timeAgo }
      if (e.eventType === 'declined') return { type: 'declined', message: `Attorney passed`, timeAgo }
      if (e.eventType === 'requested_info') return { type: 'requested_info', message: `Attorney requested more information`, timeAgo }
      if (e.eventType === 'manual_review_needed') return { type: 'manual_review_needed', message: `Case moved to manual review`, timeAgo }
      if (e.eventType === 'plaintiff_rank_advanced') return { type: 'plaintiff_rank_advanced', message: `We moved your case to the next ranked attorney`, timeAgo }
      if (e.eventType === 'plaintiff_rank_batch_generated') return { type: 'plaintiff_rank_batch_generated', message: `We expanded the search to additional matching attorneys`, timeAgo }
      return null
    }).filter(Boolean)

    // Case messages: in-app chat messages (primary) + notifications (fallback)
    let caseMessages: Array<{ subject: string; message: string; createdAt: string; from: 'attorney' | 'plaintiff'; chatRoomId?: string }> = []
    const plaintiffEmail = assessment.user?.email ?? (() => {
      try {
        const facts = typeof assessment.facts === 'string' ? JSON.parse(assessment.facts) : assessment.facts || {}
        return (facts.plaintiffContext as any)?.email || req.user?.email
      } catch {
        return req.user?.email
      }
    })()

    // In-app chat messages (when attorney matched and plaintiff has userId)
    let caseChatRoomId: string | null = null
    if (accepted && assessment.userId && req.user?.id === assessment.userId) {
      const chatRoom = await prisma.chatRoom.findFirst({
        where: {
          userId: assessment.userId,
          attorneyId: accepted.attorney.id,
          assessmentId
        },
        select: { id: true }
      }).catch(() => null)
      if (chatRoom) {
        caseChatRoomId = chatRoom.id
        const chatMessages = await prisma.message.findMany({
          where: { chatRoomId: chatRoom.id },
          orderBy: { createdAt: 'asc' },
          take: 50,
          select: {
            content: true,
            createdAt: true,
            senderType: true
          }
        }).catch(() => [])
        caseMessages = chatMessages.map((m: any) => ({
          subject: '',
          message: m.content,
          createdAt: m.createdAt?.toISOString?.() || new Date(m.createdAt).toISOString(),
          from: m.senderType === 'attorney' ? 'attorney' : 'plaintiff',
          chatRoomId: chatRoom.id
        }))
      }
    }
    // Fallback: notifications (when no chat room or for backwards compat)
    if (caseMessages.length === 0 && plaintiffEmail) {
      const notifications = await prisma.notification.findMany({
        where: {
          recipient: plaintiffEmail,
          metadata: { contains: assessmentId }
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          subject: true,
          message: true,
          createdAt: true
        }
      }).catch(() => [])
      caseMessages = notifications.map((n: any) => ({
        subject: n.subject || '',
        message: n.message || '',
        createdAt: n.createdAt?.toISOString?.() || new Date(n.createdAt).toISOString(),
        from: 'attorney' as const
      }))
    }

    res.json({
      assessmentId,
      lifecycleState: lead?.lifecycleState ?? stage,
      statusMessage,
      attorneysRouted: intros.length,
      attorneysReviewing: reviewingCount,
      attorneyMatched: accepted
        ? {
            id: accepted.attorney.id,
            name: accepted.attorney.name,
            email: accepted.attorney.email,
            phone: accepted.attorney.phone,
            firmName: accepted.attorney.lawFirm?.name,
            specialties: accepted.attorney.specialties,
            yearsExperience,
            responseTimeHours: accepted.attorney.responseTimeHours ?? 24
          }
        : null,
      attorneyActivity,
      caseMessages,
      upcomingAppointment,
      caseChatRoomId
    })
  } catch (error: unknown) {
    logger.error('Status error', { error: (error as Error).message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

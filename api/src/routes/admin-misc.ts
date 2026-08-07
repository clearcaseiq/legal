import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware, requireAdminCapability } from '../lib/admin-access'
import { parsePagination, paginated } from '../lib/pagination'
import { sendSms, isSmsConfigured } from '../lib/sms'
import { getAdminCalendarHealth } from '../lib/calendar-sync'
import { getSystemStatus } from '../lib/ops-status'
import { normalizeReferenceCode } from '../lib/case-reference'
import { isGuestCaseUserEmail } from '../lib/client-consent-guard'

const router: ExpressRouter = Router()

function adminAlertScope(req: AuthRequest) {
  const email = (req.user?.email || '').toLowerCase()
  const or: any[] = []
  if (req.user?.id) or.push({ userId: req.user.id })
  if (email) or.push({ recipient: { equals: email, mode: 'insensitive' } })
  return or.length ? { OR: or } : { id: '__none__' }
}

router.get('/alerts', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { take } = parsePagination(req.query as any, { defaultLimit: 20, maxLimit: 50 })
    const where = adminAlertScope(req)
    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          subject: true,
          message: true,
          metadata: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where: { ...where, readAt: null } }),
    ])

    const alerts = rows.map((row) => {
      let metadata: Record<string, unknown> = {}
      try {
        metadata = row.metadata ? JSON.parse(row.metadata) : {}
      } catch {
        metadata = {}
      }
      return {
        id: row.id,
        subject: row.subject,
        message: row.message,
        eventType: typeof metadata.eventType === 'string' ? metadata.eventType : null,
        assessmentId: typeof metadata.assessmentId === 'string' ? metadata.assessmentId : null,
        readAt: row.readAt,
        createdAt: row.createdAt,
      }
    })

    res.json({ alerts, unreadCount })
  } catch (error: any) {
    logger.error('Failed to load admin alerts', { error: error?.message })
    res.status(500).json({ error: 'Failed to load alerts' })
  }
})

router.post('/alerts/read', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = typeof req.body?.id === 'string' ? req.body.id : null
    const where = id
      ? { ...adminAlertScope(req), id, readAt: null }
      : { ...adminAlertScope(req), readAt: null }
    const { count } = await prisma.notification.updateMany({ where, data: { readAt: new Date() } })
    res.json({ updated: count })
  } catch (error: any) {
    logger.error('Failed to mark admin alerts read', { error: error?.message })
    res.status(500).json({ error: 'Failed to update alerts' })
  }
})

router.get('/sms/status', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  const provider = (process.env.SMS_PROVIDER || '').trim().toLowerCase() || 'auto'
  const origination = process.env.SNS_ORIGINATION_NUMBER || process.env.TWILIO_PHONE_NUMBER || ''
  res.json({
    configured: isSmsConfigured(),
    provider,
    region: process.env.SNS_REGION || process.env.AWS_REGION || 'us-east-1',
    // Only expose the last 4 digits of the sending number.
    originationNumber: origination ? `••••${origination.slice(-4)}` : null,
  })
})

router.post('/sms/test', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      phone: z.string().trim().min(7).max(40),
      message: z.string().trim().max(320).optional(),
    })
    const parsed = schema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(400).json({ error: 'A valid phone number is required.' })
    }
    if (!isSmsConfigured()) {
      return res.status(409).json({
        error: 'SMS is not configured. Set SMS_PROVIDER (and SNS_ORIGINATION_NUMBER for SNS) and redeploy.',
      })
    }
    const body = parsed.data.message || 'ClearCaseIQ: this is a test message. SMS is working. Reply STOP to opt out.'
    const sent = await sendSms(parsed.data.phone, body)
    if (!sent) {
      return res.status(502).json({ error: 'The SMS provider rejected or dropped the message. Check API logs and AWS/Twilio status.' })
    }
    logger.info('Admin test SMS sent', { to: parsed.data.phone.slice(-4) })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Admin test SMS failed', { error: error?.message })
    res.status(500).json({ error: 'Failed to send test SMS.' })
  }
})

/**
 * Everything the ops surfaces know, in one payload: readiness, schema drift,
 * background sweeps, recorded activity, what build is running, and which
 * integrations are configured. Admin-only because it names the database host
 * and reports internal failure messages.
 */
router.get('/system-status', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    res.json(await getSystemStatus())
  } catch (error: any) {
    logger.error('Failed to build system status', { error: error?.message, stack: error?.stack })
    res.status(500).json({ error: 'Failed to read system status' })
  }
})

router.get('/intake-leads', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const limit = Math.min(Number(req.query.limit) || 100, 200)

    const where: any = {}
    if (status === 'in_progress' || status === 'completed') where.status = status
    if (status === 'abandoned') {
      where.status = 'in_progress'
      where.abandonmentEmailedAt = { not: null }
    }

    const leads = await prisma.intakeLead.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone: true,
        injuryType: true,
        venueState: true,
        venueCounty: true,
        currentStep: true,
        status: true,
        assessmentId: true,
        userId: true,
        abandonmentEmailedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    res.json({ success: true, data: leads })
  } catch (error) {
    logger.error('Failed to list intake leads', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/calendar-sync/health', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    const health = await getAdminCalendarHealth()
    res.json(health)
  } catch (error: any) {
    logger.error('Failed to get admin calendar sync health', { error: error?.message, stack: error?.stack })
    res.status(500).json({
      error: 'Internal server error',
      detail: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    })
  }
})

/**
 * Unified ops inbox: one prioritized feed of routing-queue, manual-review, and
 * failed-notification work items so admins do not bounce between three screens.
 */
router.get('/ops-inbox', authMiddleware, adminMiddleware, requireAdminCapability('ops'), async (_req: AuthRequest, res) => {
  try {
    const [routingCases, reviewCases, failedNotifications] = await Promise.all([
      prisma.assessment.findMany({
        where: {
          status: 'COMPLETED',
          introductions: { some: {} },
          OR: [
            { leadSubmission: { is: null } },
            { leadSubmission: { routingLocked: false } },
          ],
        },
        select: {
          id: true,
          claimType: true,
          venueState: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 40,
      }),
      prisma.assessment.findMany({
        where: { manualReviewStatus: 'pending' },
        select: {
          id: true,
          claimType: true,
          venueState: true,
          createdAt: true,
          updatedAt: true,
          manualReviewReason: true,
          manualReviewNote: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { updatedAt: 'asc' },
        take: 40,
      }),
      prisma.platformNotificationEvent.findMany({
        where: { status: 'failed' },
        select: {
          id: true,
          eventType: true,
          channel: true,
          recipient: true,
          failureReason: true,
          assessmentId: true,
          failedAt: true,
          createdAt: true,
        },
        orderBy: { failedAt: 'desc' },
        take: 40,
      }),
    ])

    const now = Date.now()
    const items: Array<{
      id: string
      kind: 'routing' | 'manual_review' | 'failed_notification'
      priority: 'high' | 'medium' | 'low'
      title: string
      detail: string
      href: string
      ageMinutes: number
      createdAt: string
      caseId?: string | null
    }> = []

    for (const c of routingCases) {
      const queuedAt = new Date(c.createdAt).getTime()
      const ageMinutes = Math.max(0, Math.round((now - queuedAt) / 60000))
      const name = `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim() || c.user?.email || 'Unknown'
      items.push({
        id: `routing:${c.id}`,
        kind: 'routing',
        priority: ageMinutes >= 1440 ? 'high' : ageMinutes >= 60 ? 'medium' : 'low',
        title: `Route case · ${c.claimType || 'claim'}`,
        detail: `${name}${c.venueState ? ` · ${c.venueState}` : ''} · waiting ${ageMinutes >= 60 ? `${Math.round(ageMinutes / 60)}h` : `${ageMinutes}m`}`,
        href: `/admin/cases/${c.id}`,
        ageMinutes,
        createdAt: c.createdAt.toISOString(),
        caseId: c.id,
      })
    }

    for (const c of reviewCases) {
      const heldAt = new Date(c.updatedAt || c.createdAt).getTime()
      const ageMinutes = Math.max(0, Math.round((now - heldAt) / 60000))
      const name = `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim() || c.user?.email || 'Unknown'
      items.push({
        id: `review:${c.id}`,
        kind: 'manual_review',
        priority: 'high',
        title: `Manual review · ${c.manualReviewReason || 'held'}`,
        detail: `${name}${c.venueState ? ` · ${c.venueState}` : ''}${c.manualReviewNote ? ` · ${c.manualReviewNote}` : ''}`,
        href: `/admin/cases/${c.id}`,
        ageMinutes,
        createdAt: new Date(heldAt).toISOString(),
        caseId: c.id,
      })
    }

    for (const n of failedNotifications) {
      const failedAt = new Date(n.failedAt || n.createdAt).getTime()
      const ageMinutes = Math.max(0, Math.round((now - failedAt) / 60000))
      items.push({
        id: `notify:${n.id}`,
        kind: 'failed_notification',
        priority: ageMinutes >= 60 ? 'high' : 'medium',
        title: `Failed ${n.channel || 'notification'} · ${n.eventType || 'delivery'}`,
        detail: `${n.recipient || 'unknown recipient'}${n.failureReason ? ` · ${n.failureReason}` : ''}`,
        href: n.assessmentId
          ? `/admin/cases/${n.assessmentId}`
          : '/admin/communications?tab=failed',
        ageMinutes,
        createdAt: new Date(failedAt).toISOString(),
        caseId: n.assessmentId,
      })
    }

    const priorityRank = { high: 0, medium: 1, low: 2 }
    items.sort((a, b) => {
      const byPriority = priorityRank[a.priority] - priorityRank[b.priority]
      if (byPriority !== 0) return byPriority
      return b.ageMinutes - a.ageMinutes
    })

    res.json({
      items,
      counts: {
        routing: routingCases.length,
        manualReview: reviewCases.length,
        failedNotifications: failedNotifications.length,
        total: items.length,
      },
    })
  } catch (error) {
    logger.error('Failed to load ops inbox', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})


router.get('/case-lookup', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const rawCode = typeof req.query.reference === 'string' ? req.query.reference : ''
    const code = normalizeReferenceCode(rawCode)
    if (!code) return res.status(400).json({ error: 'A case reference code is required' })

    const assessment = await prisma.assessment.findUnique({
      where: { referenceCode: code },
      select: {
        id: true,
        referenceCode: true,
        claimType: true,
        venueState: true,
        status: true,
        facts: true,
        createdAt: true,
        userId: true,
        user: { select: { email: true, firstName: true, lastName: true } },
        leadSubmission: { select: { status: true, submittedAt: true, assignedAttorneyId: true } },
      },
    })

    if (!assessment) {
      return res.status(404).json({ error: 'No case matches that reference code.' })
    }

    let plaintiffContext: Record<string, unknown> = {}
    try {
      const facts = JSON.parse(assessment.facts || '{}')
      plaintiffContext = (facts.plaintiffContext || {}) as Record<string, unknown>
    } catch {
      plaintiffContext = {}
    }

    const hasRealAccount = Boolean(assessment.userId) && !isGuestCaseUserEmail(assessment.user?.email || '')

    res.json({
      referenceCode: assessment.referenceCode,
      assessmentId: assessment.id,
      claimType: assessment.claimType,
      venueState: assessment.venueState,
      status: assessment.status,
      createdAt: assessment.createdAt,
      contact: {
        firstName: (plaintiffContext.firstName as string) || assessment.user?.firstName || null,
        email: (plaintiffContext.email as string) || (hasRealAccount ? assessment.user?.email : null) || null,
        phone: (plaintiffContext.phone as string) || null,
        preferredContactMethod: (plaintiffContext.preferredContactMethod as string) || null,
      },
      hasRealAccount,
      submission: assessment.leadSubmission
        ? {
            status: assessment.leadSubmission.status,
            submittedAt: assessment.leadSubmission.submittedAt,
            assigned: Boolean(assessment.leadSubmission.assignedAttorneyId),
          }
        : null,
    })
  } catch (error) {
    logger.error('Failed to look up case by reference', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

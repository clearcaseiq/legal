/**
 * Admin review of attorney-submitted case results.
 *
 * Attorneys self-report settlements and verdicts on their profile. Those show
 * as "Self-reported" until an admin reads the supporting document and decides,
 * which is what these endpoints exist for. Attorneys can never set the status
 * themselves — the attorney-facing routes strip it.
 */
import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware, requireAdminCapability } from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import { parsePagination, paginated } from '../lib/pagination'
import { notifyAttorneyInApp } from '../lib/case-notifications'
import { ATTORNEY_EVENTS } from '../lib/notification-events'

const router: ExpressRouter = Router()

const REVIEW_STATUSES = ['pending', 'verified', 'rejected'] as const

const ReviewSchema = z
  .object({
    action: z.enum(['verify', 'reject']),
    // Free text shown back to the attorney, so a rejection is actionable.
    note: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.action !== 'reject' || !!v.note, {
    message: 'A reason is required when rejecting a case result',
    path: ['note'],
  })

function serialize(row: any) {
  return {
    id: row.id,
    attorneyId: row.attorneyId,
    attorneyName: row.attorney?.name || null,
    attorneyEmail: row.attorney?.email || null,
    firmName: row.attorney?.lawFirm?.name || null,
    caseType: row.caseType,
    resultType: row.resultType,
    settlementAmount: row.settlementAmount,
    caseDescription: row.caseDescription,
    date: row.date,
    venue: row.venue,
    caseNumber: row.caseNumber,
    documentUrl: row.documentUrl,
    documentName: row.documentName,
    status: row.status,
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt,
    reviewedBy: row.reviewedBy
      ? [row.reviewedBy.firstName, row.reviewedBy.lastName].filter(Boolean).join(' ') ||
        row.reviewedBy.email
      : null,
    submittedAt: row.createdAt,
  }
}

/**
 * The review queue. Defaults to pending, oldest first, because the queue is
 * worked front to back and the oldest submission has waited longest.
 */
router.get(
  '/case-results',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { status, search } = req.query
      const { take, skip } = parsePagination(req.query as Record<string, unknown>, {
        defaultLimit: 25,
        maxLimit: 200,
      })

      const requested = typeof status === 'string' ? status.trim() : 'pending'
      const where: Record<string, unknown> = {}
      if (requested !== 'all') {
        where.status = REVIEW_STATUSES.includes(requested as any) ? requested : 'pending'
      }

      const term = typeof search === 'string' ? search.trim() : ''
      if (term) {
        where.OR = [
          { caseType: { contains: term, mode: 'insensitive' } },
          { venue: { contains: term, mode: 'insensitive' } },
          { caseNumber: { contains: term, mode: 'insensitive' } },
          { attorney: { name: { contains: term, mode: 'insensitive' } } },
          { attorney: { email: { contains: term, mode: 'insensitive' } } },
        ]
      }

      const [rows, total, pendingCount] = await Promise.all([
        prisma.attorneyCaseResult.findMany({
          where,
          include: {
            attorney: { select: { name: true, email: true, lawFirm: { select: { name: true } } } },
            reviewedBy: { select: { firstName: true, lastName: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
          take,
          skip,
        }),
        prisma.attorneyCaseResult.count({ where }),
        prisma.attorneyCaseResult.count({ where: { status: 'pending' } }),
      ])

      const data = rows.map(serialize)
      res.json({ success: true, data, pendingCount, ...paginated(data, total, { take, skip }) })
    } catch (error: any) {
      logger.error('Failed to list case results for review', { error: error?.message })
      res.status(500).json({ error: 'Failed to load case results' })
    }
  },
)

/** Verify or reject one case result. */
router.patch(
  '/case-results/:id/review',
  authMiddleware,
  adminMiddleware,
  requireAdminCapability('network'),
  async (req: AuthRequest, res) => {
    try {
      const parsed = ReviewSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      }

      const existing = await prisma.attorneyCaseResult.findUnique({
        where: { id: req.params.id },
        include: { attorney: { select: { id: true, name: true } } },
      })
      if (!existing) {
        return res.status(404).json({ error: 'Case result not found' })
      }

      const { action, note } = parsed.data
      const status = action === 'verify' ? 'verified' : 'rejected'

      const row = await prisma.attorneyCaseResult.update({
        where: { id: existing.id },
        data: {
          status,
          reviewNote: note || null,
          reviewedAt: new Date(),
          reviewedById: req.user?.id || null,
        },
        include: {
          attorney: { select: { name: true, email: true, lawFirm: { select: { name: true } } } },
          reviewedBy: { select: { firstName: true, lastName: true, email: true } },
        },
      })

      await writeAdminAudit(req, {
        action: `attorney_case_result_${action}`,
        entityType: 'attorney_case_result',
        entityId: existing.id,
        metadata: {
          attorneyId: existing.attorneyId,
          previousStatus: existing.status,
          nextStatus: status,
          note: note || null,
        },
      })

      // The attorney needs to know, especially for a rejection they can fix.
      // Never allowed to fail the review itself.
      const amount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(Number(existing.settlementAmount || 0))
      await notifyAttorneyInApp({
        attorneyId: existing.attorneyId,
        eventType:
          status === 'verified'
            ? ATTORNEY_EVENTS.case_result_verified
            : ATTORNEY_EVENTS.case_result_rejected,
        subject:
          status === 'verified' ? 'Case result verified' : 'Case result needs another look',
        body:
          status === 'verified'
            ? `Your ${existing.caseType} result of ${amount} is now verified on your profile.`
            : `Your ${existing.caseType} result of ${amount} was not verified. ${note}`,
        link: '/attorney-profile',
        payload: { caseResultId: existing.id, status },
      }).catch((e: any) =>
        logger.warn('Case result review notify failed', { error: e?.message, id: existing.id }),
      )

      res.json({ success: true, caseResult: serialize(row) })
    } catch (error: any) {
      logger.error('Failed to review case result', { error: error?.message })
      res.status(500).json({ error: 'Failed to review case result' })
    }
  },
)

export default router

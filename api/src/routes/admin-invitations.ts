/**
 * Admin view of attorney profile invitations.
 *
 * Invites have existed for a while as a single POST with no way to see what
 * became of them: whether the attorney claimed the profile, let the link lapse,
 * or declined. Reading `profile_claims` back gives operators that answer, and
 * gives the "declined" state somewhere to live where it will actually be seen.
 *
 * Nothing here is ever shown to attorneys or on the public directory.
 */
import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { logger } from '../lib/logger'
import {
  MAX_BATCH_SIZE,
  MAX_DAILY_CAP,
  cancelInviteBatch,
  countSentInLast24Hours,
  findInviteCandidates,
  getInviteConfig,
  listInviteBatches,
  queueInviteBatch,
  saveInviteConfig,
  type InviteConfig,
} from '../lib/claim-invite-campaign'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware, requireAdminCapability } from '../lib/admin-access'
import { parsePagination, paginated } from '../lib/pagination'
import { writeAdminAudit } from '../lib/admin-audit'
import { prismaAny } from './admin-shared'

const router: ExpressRouter = Router()

/**
 * What an operator actually wants to know, which is not quite the stored
 * status. `sent` and `verified` are both "waiting on them", and a `sent` invite
 * whose expiry has passed is stale even though a sweep has not relabelled it
 * yet — the existing flow only marks a claim expired when someone tries to use
 * it, so the stored value lags reality.
 */
export type InvitationOutcome =
  | 'queued'
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled'
  | 'failed'

export function classifyInvitation(
  status: string | null | undefined,
  expiresAt: Date | string | null | undefined,
): InvitationOutcome {
  const value = String(status || '').toLowerCase()
  // Not yet emailed, so its provisional expiry means nothing.
  if (value === 'queued') return 'queued'
  if (value === 'cancelled') return 'cancelled'
  if (value === 'failed') return 'failed'
  if (value === 'completed') return 'accepted'
  if (value === 'rejected') return 'declined'
  if (value === 'expired') return 'expired'
  const expiry = expiresAt ? new Date(expiresAt).getTime() : null
  if (expiry != null && !Number.isNaN(expiry) && expiry < Date.now()) return 'expired'
  return 'pending'
}

router.get(
  '/attorney-invitations',
  authMiddleware,
  adminMiddleware,
  requireAdminCapability('network'),
  async (req: AuthRequest, res) => {
    try {
      const { search, outcome } = req.query
      const { take, skip } = parsePagination(req.query as Record<string, unknown>, {
        defaultLimit: 50,
        maxLimit: 200,
      })

      const where: Record<string, any> = {}
      const searchTerm = typeof search === 'string' ? search.trim() : ''
      if (searchTerm) {
        where.attorney = {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ],
        }
      }

      // The outcome an operator filters on is partly derived from expiry, so it
      // cannot be pushed into the query. Fetching a page and filtering it would
      // silently drop rows, so the filter is applied before paging.
      const outcomeFilter = typeof outcome === 'string' ? outcome.trim() : ''

      const rows = await prismaAny.profileClaim.findMany({
        where,
        select: {
          id: true,
          status: true,
          email: true,
          expiresAt: true,
          createdAt: true,
          sentAt: true,
          batchId: true,
          sendError: true,
          verifiedAt: true,
          completedAt: true,
          attorney: {
            select: { id: true, name: true, email: true, claimStatus: true, isVerified: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        // A full bulk pass is a couple of thousand rows; the outcome filter
        // runs in memory, so the window has to cover all of them.
        take: 5000,
      })

      const suppressedRows = await prismaAny.emailSuppression.findMany({ select: { email: true } })
      const suppressed = new Set<string>(suppressedRows.map((row: { email: string }) => row.email))

      const classified: Array<{ outcome: InvitationOutcome; [key: string]: unknown }> = rows.map((row: any) => {
        const email = row.email || row.attorney?.email || null
        const queued = row.status === 'queued'
        return {
          id: row.id,
          outcome: classifyInvitation(row.status, row.expiresAt),
          status: row.status,
          email,
          // Claims older than the sentAt column were sent when created.
          sentAt: queued ? null : row.sentAt || row.createdAt,
          queuedAt: row.createdAt,
          expiresAt: queued ? null : row.expiresAt,
          respondedAt: row.completedAt || row.verifiedAt || null,
          batchId: row.batchId || null,
          sendError: row.sendError || null,
          unsubscribed: email ? suppressed.has(String(email).trim().toLowerCase()) : false,
          attorney: row.attorney,
        }
      })

      const summary: Record<InvitationOutcome | 'totalCount', number> = {
        queued: 0,
        pending: 0,
        accepted: 0,
        declined: 0,
        expired: 0,
        cancelled: 0,
        failed: 0,
        totalCount: classified.length,
      }
      for (const row of classified) summary[row.outcome] += 1

      const filtered = outcomeFilter
        ? classified.filter((row) => row.outcome === outcomeFilter)
        : classified
      const page = filtered.slice(skip, skip + take)

      res.json({
        success: true,
        data: page,
        summary,
        ...paginated(page, filtered.length, { take, skip }),
      })
    } catch (error) {
      logger.error('Failed to list attorney invitations', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  },
)

/**
 * Retire a live invitation without recording a refusal.
 *
 * Distinct from declining: the attorney has not said no, so this must not set
 * the sticky `declined` flag that would suppress future invites. It only kills
 * the outstanding link — for an invite sent to the wrong address, say.
 */
router.post(
  '/attorney-invitations/:id/revoke',
  authMiddleware,
  adminMiddleware,
  requireAdminCapability('network'),
  async (req: AuthRequest, res) => {
    try {
      const claim = await prismaAny.profileClaim.findUnique({
        where: { id: req.params.id },
        select: { id: true, status: true, attorneyId: true },
      })
      if (!claim) return res.status(404).json({ error: 'Invitation not found' })
      if (claim.status === 'completed') {
        return res.status(409).json({ error: 'This invitation was already accepted.' })
      }
      if (claim.status === 'queued') {
        await prismaAny.profileClaim.update({ where: { id: claim.id }, data: { status: 'cancelled' } })
        await writeAdminAudit(req, {
          action: 'attorney_invitation_cancelled',
          entityType: 'profile_claim',
          entityId: claim.id,
          metadata: { attorneyId: claim.attorneyId },
        })
        return res.json({ success: true })
      }

      await prismaAny.$transaction(async (tx: any) => {
        await tx.profileClaim.update({
          where: { id: claim.id },
          data: { status: 'expired' },
        })
        // Only walk the attorney back to unclaimed if this was the invite that
        // put them in "pending". A declined attorney stays declined.
        const attorney = await tx.attorney.findUnique({
          where: { id: claim.attorneyId },
          select: { claimStatus: true },
        })
        if (attorney?.claimStatus === 'pending') {
          await tx.attorney.update({
            where: { id: claim.attorneyId },
            data: { claimStatus: 'unclaimed' },
          })
        }
      })

      await writeAdminAudit(req, {
        action: 'attorney_invitation_revoked',
        entityType: 'profile_claim',
        entityId: claim.id,
        metadata: { attorneyId: claim.attorneyId, fromStatus: claim.status },
      })

      res.json({ success: true })
    } catch (error) {
      logger.error('Failed to revoke attorney invitation', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  },
)

const FiltersSchema = z.object({
  county: z.string().trim().max(60).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  firm: z.string().trim().max(120).optional().nullable(),
})

function sendingStatus(config: InviteConfig, sentLast24h: number, queued: number) {
  return {
    dailyCap: config.dailyCap,
    paused: config.paused,
    sentLast24h,
    queued,
    postalAddressConfigured: Boolean(config.postalAddress),
    postalAddress: config.postalAddress,
    fromEmail: config.fromEmail,
    replyTo: config.replyTo,
  }
}

const SettingsSchema = z.object({
  dailyCap: z.number().int().min(0).max(MAX_DAILY_CAP).optional(),
  paused: z.boolean().optional(),
  postalAddress: z.string().trim().max(300).nullable().optional(),
  fromEmail: z.union([z.string().trim().email().max(254), z.literal(''), z.null()]).optional(),
  replyTo: z.union([z.string().trim().email().max(254), z.literal(''), z.null()]).optional(),
})

/** Sender settings and the daily cap, editable without a deploy. */
router.put(
  '/attorney-invitations/settings',
  authMiddleware,
  adminMiddleware,
  requireAdminCapability('network'),
  async (req: AuthRequest, res) => {
    try {
      const parsed = SettingsSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid settings', details: parsed.error.flatten() })
      }
      const before = await getInviteConfig()
      const saved = await saveInviteConfig(parsed.data)
      await writeAdminAudit(req, {
        action: 'attorney_invitation_settings_updated',
        entityType: 'routing_config',
        entityId: 'claim_invite_settings',
        metadata: { before, after: saved },
      })
      const [sentLast24h, queued] = await Promise.all([
        countSentInLast24Hours(),
        prismaAny.profileClaim.count({ where: { status: 'queued' } }),
      ])
      res.json({ success: true, sending: sendingStatus(saved, sentLast24h, queued) })
    } catch (error) {
      logger.error('Failed to save invite settings', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  },
)

/**
 * Who a bulk pass would reach. Read-only: lets an operator see the list,
 * and how it splits by county, before anything is queued.
 */
router.get(
  '/attorney-invitations/eligible',
  authMiddleware,
  adminMiddleware,
  requireAdminCapability('network'),
  async (req: AuthRequest, res) => {
    try {
      const parsed = FiltersSchema.safeParse(req.query)
      if (!parsed.success) return res.status(400).json({ error: 'Invalid filters' })

      const [candidates, everyone, sentLast24h, queued] = await Promise.all([
        findInviteCandidates(parsed.data),
        findInviteCandidates({}),
        countSentInLast24Hours(),
        prismaAny.profileClaim.count({ where: { status: 'queued' } }),
      ])

      const byCounty: Record<string, number> = {}
      for (const row of everyone) {
        const key = row.county || 'Unknown'
        byCounty[key] = (byCounty[key] || 0) + 1
      }

      res.json({
        success: true,
        total: candidates.length,
        sample: candidates.slice(0, 25),
        byCounty,
        maxBatchSize: MAX_BATCH_SIZE,
        sending: sendingStatus(await getInviteConfig(), sentLast24h, queued),
      })
    } catch (error) {
      logger.error('Failed to list invite candidates', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  },
)

const QueueSchema = FiltersSchema.extend({
  limit: z.number().int().min(1).max(MAX_BATCH_SIZE),
})

/** Queue a batch. Nothing is emailed here; the sender sweep works through it. */
router.post(
  '/attorney-invitations/batches',
  authMiddleware,
  adminMiddleware,
  requireAdminCapability('network'),
  async (req: AuthRequest, res) => {
    try {
      const parsed = QueueSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
      }
      // Refused up front: queued rows would otherwise sit unsent with no
      // visible reason.
      if (!(await getInviteConfig()).postalAddress) {
        return res.status(503).json({
          error: 'Set a postal address in the sender settings first. CAN-SPAM requires one in every invitation.',
          code: 'INVITE_NOT_CONFIGURED',
        })
      }

      const { limit, ...filters } = parsed.data
      const result = await queueInviteBatch(filters, limit)
      await writeAdminAudit(req, {
        action: 'attorney_invitation_batch_queued',
        entityType: 'profile_claim_batch',
        entityId: result.batchId,
        metadata: { filters, limit, queued: result.queued },
      })
      res.json({ success: true, ...result })
    } catch (error) {
      logger.error('Failed to queue invite batch', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  },
)

router.get(
  '/attorney-invitations/batches',
  authMiddleware,
  adminMiddleware,
  requireAdminCapability('network'),
  async (_req: AuthRequest, res) => {
    try {
      const [batches, sentLast24h, queued] = await Promise.all([
        listInviteBatches(),
        countSentInLast24Hours(),
        prismaAny.profileClaim.count({ where: { status: 'queued' } }),
      ])
      res.json({ success: true, data: batches, sending: sendingStatus(await getInviteConfig(), sentLast24h, queued) })
    } catch (error) {
      logger.error('Failed to list invite batches', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  },
)

/** Stop the unsent part of a batch. Invites already emailed are left alone. */
router.post(
  '/attorney-invitations/batches/:batchId/cancel',
  authMiddleware,
  adminMiddleware,
  requireAdminCapability('network'),
  async (req: AuthRequest, res) => {
    try {
      const cancelled = await cancelInviteBatch(req.params.batchId)
      await writeAdminAudit(req, {
        action: 'attorney_invitation_batch_cancelled',
        entityType: 'profile_claim_batch',
        entityId: req.params.batchId,
        metadata: { cancelled },
      })
      res.json({ success: true, cancelled })
    } catch (error) {
      logger.error('Failed to cancel invite batch', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  },
)

export default router

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
import { logger } from '../lib/logger'
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
export type InvitationOutcome = 'pending' | 'accepted' | 'declined' | 'expired'

export function classifyInvitation(
  status: string | null | undefined,
  expiresAt: Date | string | null | undefined,
): InvitationOutcome {
  const value = String(status || '').toLowerCase()
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
          verifiedAt: true,
          completedAt: true,
          attorney: {
            select: { id: true, name: true, email: true, claimStatus: true, isVerified: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      })

      const classified: Array<{ outcome: InvitationOutcome; [key: string]: unknown }> = rows.map((row: any) => ({
        id: row.id,
        outcome: classifyInvitation(row.status, row.expiresAt),
        status: row.status,
        email: row.email || row.attorney?.email || null,
        sentAt: row.createdAt,
        expiresAt: row.expiresAt,
        respondedAt: row.completedAt || row.verifiedAt || null,
        attorney: row.attorney,
      }))

      const summary: Record<InvitationOutcome | 'totalCount', number> = {
        pending: 0,
        accepted: 0,
        declined: 0,
        expired: 0,
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

export default router

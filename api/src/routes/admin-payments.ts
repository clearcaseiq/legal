/**
 * Admin view of what attorneys have paid the platform.
 *
 * Reads `platform_payments`, which is the only record of attorney → ClearCaseIQ
 * money (routing fees, subscriptions, lead credits). Until now it was surfaced
 * only to the attorney who paid and to their firm, so nobody could see revenue
 * across the marketplace without querying the database by hand.
 */
import { Router, type Router as ExpressRouter } from 'express'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware, requireAdminCapability } from '../lib/admin-access'
import { parsePagination, paginated } from '../lib/pagination'
import { writeAdminAudit } from '../lib/admin-audit'
// Deliberately the typed client rather than the `prismaAny` escape hatch the
// other admin routes use. This endpoint shipped selecting `Attorney.firmName`,
// a field that does not exist on that model, and every request 500ed until it
// was found by hand — `prismaAny` is what let a name the client would have
// rejected reach production.
import { prisma } from '../lib/prisma'
import type { Prisma } from '@prisma/client'
import { reconcilePlatformPaymentRows } from './payments'
import { ENV } from '../env'

const router: ExpressRouter = Router()

/**
 * A row's status decides whether it is money. Getting this wrong in either
 * direction misreports revenue, so the mapping is explicit rather than
 * inferred from the amount.
 *
 *  - collected     `paid`: settled through Stripe and confirmed by webhook.
 *  - pending       `checkout_created`: checkout opened, not yet settled.
 *  - abandoned     `expired`: the attorney never completed checkout.
 *  - subscription  `applied` / `subscription_applied`: the case was covered by
 *                  a plan the attorney had already bought. Always amount 0 —
 *                  real revenue, but recognised at subscription purchase, so
 *                  counting it here would bill it twice.
 *  - waived        `skipped_*`: the fee was bypassed because payments were off
 *                  or Stripe was unconfigured. No money was ever taken.
 */
export type PaymentOutcome = 'collected' | 'pending' | 'abandoned' | 'subscription' | 'waived' | 'other'

/**
 * Every spelling Stripe gives a settled checkout. `payment_status` is normally
 * `paid`, but the webhook handler falls back to `completed` when the session
 * carries none, and reconciliation accepts `succeeded` and `complete` as well.
 *
 * This list used to be just `paid`, which quietly understated revenue: a row
 * written from a session reporting any of the other three was classified
 * `other` and left out of the collected total, even though `SETTLED_STATUSES`
 * and the `isPaid` checks in payments.ts both count it as money.
 */
const COLLECTED_STATUSES = ['paid', 'succeeded', 'complete', 'completed']

export function classifyPaymentStatus(status: string | null | undefined): PaymentOutcome {
  const value = String(status || '').toLowerCase()
  if (value.startsWith('skipped')) return 'waived'
  if (COLLECTED_STATUSES.includes(value)) return 'collected'
  if (value === 'checkout_created') return 'pending'
  if (value === 'expired') return 'abandoned'
  if (value === 'applied' || value === 'subscription_applied') return 'subscription'
  return 'other'
}

/** The statuses behind each outcome, kept beside the classifier that reads them. */
const OUTCOME_STATUSES: Record<'collected' | 'pending' | 'abandoned' | 'subscription', string[]> = {
  collected: COLLECTED_STATUSES,
  pending: ['checkout_created'],
  abandoned: ['expired'],
  subscription: ['applied', 'subscription_applied'],
}

const CLASSIFIED_STATUSES = Object.values(OUTCOME_STATUSES).flat()

/**
 * `classifyPaymentStatus` expressed as a database filter.
 *
 * The outcome filter was previously applied to the page after it had been
 * fetched, so asking for "collected" returned however many collected rows
 * happened to fall in the first 50 — next to a total that counted every row
 * matching the *other* filters, and pages that could come back empty. Rows,
 * count, and pager only agree if the filter reaches the query.
 */
export function outcomeWhere(outcome: string): Prisma.PlatformPaymentWhereInput | null {
  if (outcome === 'waived') return { status: { startsWith: 'skipped', mode: 'insensitive' } }

  // Anything the classifier does not recognise, which is also the bucket that
  // catches a new Stripe status nobody has mapped yet.
  if (outcome === 'other') {
    return {
      status: { notIn: CLASSIFIED_STATUSES },
      NOT: { status: { startsWith: 'skipped', mode: 'insensitive' } },
    }
  }

  const statuses = OUTCOME_STATUSES[outcome as keyof typeof OUTCOME_STATUSES]
  return statuses ? { status: { in: statuses } } : null
}

router.get(
  '/payments',
  authMiddleware,
  adminMiddleware,
  requireAdminCapability('oversight'),
  async (req: AuthRequest, res) => {
    try {
      const { search, type, status, outcome, from, to } = req.query
      const { take, skip } = parsePagination(req.query as Record<string, unknown>, {
        defaultLimit: 50,
        maxLimit: 200,
      })

      // Typed rather than `Record<string, any>`: this is the other half of the
      // query that referenced a field Attorney does not have, and only the
      // typed form makes the compiler check it.
      const where: Prisma.PlatformPaymentWhereInput = {}

      const typeFilter = typeof type === 'string' ? type.trim() : ''
      if (typeFilter) where.type = typeFilter

      const statusFilter = typeof status === 'string' ? status.trim() : ''
      if (statusFilter) where.status = statusFilter

      const searchTerm = typeof search === 'string' ? search.trim() : ''
      if (searchTerm) {
        // Firm name is not on Attorney. It lives on the linked LawFirm, and on
        // AttorneyProfile for anyone not attached to a firm record, so a search
        // for a firm has to reach through both or it silently misses half of
        // them.
        where.attorney = {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { lawFirm: { name: { contains: searchTerm, mode: 'insensitive' } } },
            { attorneyProfile: { firmName: { contains: searchTerm, mode: 'insensitive' } } },
          ],
        }
      }

      const createdAt: Record<string, Date> = {}
      const fromDate = typeof from === 'string' && from ? new Date(from) : null
      const toDate = typeof to === 'string' && to ? new Date(to) : null
      if (fromDate && !Number.isNaN(fromDate.getTime())) createdAt.gte = fromDate
      if (toDate && !Number.isNaN(toDate.getTime())) {
        // An end date is inclusive of that whole day, which is what someone
        // picking "to: 31 Aug" means. Without this a same-day filter is empty.
        toDate.setHours(23, 59, 59, 999)
        createdAt.lte = toDate
      }
      if (Object.keys(createdAt).length) where.createdAt = createdAt

      // Combined with AND so it composes with an explicit `status` filter
      // instead of one silently overwriting the other.
      const outcomeFilter = typeof outcome === 'string' ? outcome.trim() : ''
      const outcomeClause = outcomeFilter ? outcomeWhere(outcomeFilter) : null
      if (outcomeClause) where.AND = [outcomeClause]

      const [rows, total, byStatus, byType] = await Promise.all([
        prisma.platformPayment.findMany({
          where,
          select: {
            id: true,
            type: true,
            amount: true,
            currency: true,
            status: true,
            stripeCheckoutSessionId: true,
            stripePaymentIntentId: true,
            createdAt: true,
            attorney: {
              select: {
                id: true,
                name: true,
                email: true,
                lawFirm: { select: { name: true } },
                attorneyProfile: { select: { firmName: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
        prisma.platformPayment.count({ where }),
        // Totals are computed over everything matching the filters, not just the
        // page in front of the user — a revenue figure that changed when you
        // turned the page would be worse than no figure.
        prisma.platformPayment.groupBy({
          by: ['status'],
          where,
          _sum: { amount: true },
          _count: { _all: true },
        }),
        prisma.platformPayment.groupBy({
          by: ['type'],
          where,
          _sum: { amount: true },
          _count: { _all: true },
        }),
      ])

      const summary = {
        collected: 0,
        collectedCount: 0,
        pending: 0,
        pendingCount: 0,
        abandonedCount: 0,
        subscriptionCount: 0,
        waivedCount: 0,
        totalCount: total,
      }
      for (const group of byStatus) {
        const amount = Number(group._sum?.amount ?? 0)
        const count = Number(group._count?._all ?? 0)
        switch (classifyPaymentStatus(group.status)) {
          case 'collected':
            summary.collected += amount
            summary.collectedCount += count
            break
          case 'pending':
            summary.pending += amount
            summary.pendingCount += count
            break
          case 'abandoned':
            summary.abandonedCount += count
            break
          case 'subscription':
            summary.subscriptionCount += count
            break
          case 'waived':
            summary.waivedCount += count
            break
          default:
            break
        }
      }

      const data = rows.map((row) => ({
        ...row,
        amount: row.amount == null ? null : Number(row.amount),
        outcome: classifyPaymentStatus(row.status),
        // Flattened back to the shape the console already renders. The firm
        // record wins over the profile's free-text field when both exist.
        attorney: row.attorney
          ? {
              id: row.attorney.id,
              name: row.attorney.name,
              email: row.attorney.email,
              firmName: row.attorney.lawFirm?.name ?? row.attorney.attorneyProfile?.firmName ?? null,
            }
          : null,
      }))

      res.json({
        success: true,
        data,
        summary,
        byType: byType.map((group) => ({
          type: group.type,
          amount: Number(group._sum?.amount ?? 0),
          count: Number(group._count?._all ?? 0),
        })),
        ...paginated(data, total, { take, skip }),
      })
    } catch (error) {
      logger.error('Failed to list platform payments', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  },
)

/**
 * Ask Stripe about every row that still looks unsettled and correct it.
 *
 * The webhook normally does this. This exists for the case the webhook cannot
 * cover: deliveries missed while the endpoint was down or not yet configured,
 * which leave a genuinely-paid charge reading "Pending" forever and understate
 * revenue by exactly that amount.
 */
router.post(
  '/payments/reconcile',
  authMiddleware,
  adminMiddleware,
  requireAdminCapability('oversight'),
  async (req: AuthRequest, res) => {
    try {
      if (!ENV.STRIPE_SECRET_KEY) {
        return res.status(400).json({
          error: 'Stripe is not configured in this environment, so there is nothing to reconcile against.',
        })
      }

      // Only rows with a checkout session can be looked up in Stripe at all.
      const candidates = await prisma.platformPayment.findMany({
        where: {
          stripeCheckoutSessionId: { not: null },
          status: { notIn: ['paid', 'expired', 'refunded', 'partially_refunded'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })

      const before = new Map<string, string>(candidates.map((r: any) => [r.id, String(r.status)]))
      await reconcilePlatformPaymentRows(candidates)

      const changed = candidates.filter((r: any) => before.get(r.id) !== String(r.status))
      const settled = changed.filter((r: any) => r.status === 'paid')
      const expired = changed.filter((r: any) => r.status === 'expired')

      await writeAdminAudit(req, {
        action: 'platform_payments_reconciled',
        entityType: 'platform_payment',
        entityId: 'bulk',
        metadata: {
          examined: candidates.length,
          settled: settled.length,
          expired: expired.length,
          recoveredAmount: settled.reduce((sum: number, r: any) => sum + Number(r.amount ?? 0), 0),
        },
      })

      res.json({
        success: true,
        examined: candidates.length,
        settled: settled.length,
        expired: expired.length,
        recoveredAmount: settled.reduce((sum: number, r: any) => sum + Number(r.amount ?? 0), 0),
      })
    } catch (error) {
      logger.error('Failed to reconcile platform payments', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  },
)

export default router

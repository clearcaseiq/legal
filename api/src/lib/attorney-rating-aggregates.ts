import { prisma } from './prisma'
import { logger } from './logger'

/**
 * Recompute an attorney's stored rating aggregates from the actual reviews.
 *
 * Both the Attorney row and its AttorneyProfile carry denormalized
 * averageRating/totalReviews used by the admin attorney views, the firm
 * dashboard Team & Roles tab, and the public attorney list. If either drifts
 * from the underlying AttorneyReview rows (e.g. reviews created before the
 * sync existed, or a re-rating blocked by the "already reviewed" guard), those
 * screens show 0. Recomputing from source keeps every reader consistent
 * (CP-308, CP-321, CP-326).
 */
export async function recomputeAttorneyRatingAggregates(attorneyId: string): Promise<void> {
  const reviews = await prisma.attorneyReview.findMany({
    where: { attorneyId },
    select: { rating: true },
  })
  const totalReviews = reviews.length
  const averageRating = totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0

  await prisma.attorney.update({
    where: { id: attorneyId },
    data: { averageRating, totalReviews },
  })
  await prisma.attorneyProfile.updateMany({
    where: { attorneyId },
    data: { averageRating, totalReviews },
  })
}

/**
 * One-shot backfill so stored aggregates match the review rows for every
 * attorney that has at least one review. Idempotent and cheap; safe to run on
 * startup. Heals stale data left by reviews created before the on-write sync.
 */
export async function reconcileAllAttorneyRatingAggregates(): Promise<void> {
  try {
    const grouped = await prisma.attorneyReview.groupBy({
      by: ['attorneyId'],
      _avg: { rating: true },
      _count: { _all: true },
    })
    for (const row of grouped) {
      await prisma.attorney.update({
        where: { id: row.attorneyId },
        data: {
          averageRating: row._avg.rating ?? 0,
          totalReviews: row._count._all,
        },
      }).catch(() => undefined)
      await prisma.attorneyProfile.updateMany({
        where: { attorneyId: row.attorneyId },
        data: {
          averageRating: row._avg.rating ?? 0,
          totalReviews: row._count._all,
        },
      }).catch(() => undefined)
    }
    logger.info('Attorney rating aggregates reconciled', { attorneys: grouped.length })
  } catch (error: any) {
    logger.warn('Failed to reconcile attorney rating aggregates', { error: error?.message })
  }
}

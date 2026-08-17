import { prisma } from './prisma'
import { logger } from './logger'
import { maybeVerifyAttorneyReview } from './appointment-engagement'

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
    select: { rating: true, isVerified: true },
  })
  const totalReviews = reviews.length
  // Zocdoc-style trust: the public star rating is the mean of *verified* reviews
  // only (clients who actually engaged the attorney). `totalReviews` stays the
  // full count for internal/admin views; public surfaces display the verified
  // count alongside the rating.
  const verified = reviews.filter((r) => r.isVerified)
  const averageRating = verified.length > 0 ? verified.reduce((sum, r) => sum + r.rating, 0) / verified.length : 0

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
    // Full review counts per attorney (all reviews, verified or not).
    const totals = await prisma.attorneyReview.groupBy({
      by: ['attorneyId'],
      _count: { _all: true },
    })
    // Verified-only averages drive the public star rating (Zocdoc-style trust).
    const verified = await prisma.attorneyReview.groupBy({
      by: ['attorneyId'],
      where: { isVerified: true },
      _avg: { rating: true },
    })
    const verifiedAvgByAttorney = new Map(verified.map((v) => [v.attorneyId, v._avg.rating ?? 0]))
    for (const row of totals) {
      const averageRating = verifiedAvgByAttorney.get(row.attorneyId) ?? 0
      const totalReviews = row._count._all
      await prisma.attorney.update({
        where: { id: row.attorneyId },
        data: { averageRating, totalReviews },
      }).catch(() => undefined)
      await prisma.attorneyProfile.updateMany({
        where: { attorneyId: row.attorneyId },
        data: { averageRating, totalReviews },
      }).catch(() => undefined)
    }
    logger.info('Attorney rating aggregates reconciled', { attorneys: totals.length })
    await reconcileAttorneyReviewVerification()
  } catch (error: any) {
    logger.warn('Failed to reconcile attorney rating aggregates', { error: error?.message })
  }
}

/**
 * `isVerified` is stamped once, when the review is written. A client who rates
 * their attorney before the consult is marked confirmed therefore stays
 * unverified forever, leaving the admin "Verified" count permanently at 0
 * (CP-321). Re-evaluate the unverified reviews so the count can catch up.
 */
export async function reconcileAttorneyReviewVerification(): Promise<void> {
  try {
    const pending = await prisma.attorneyReview.findMany({
      where: { isVerified: false },
      select: { id: true, attorneyId: true, userId: true },
      take: 500,
    })
    if (pending.length === 0) return

    let promoted = 0
    for (const review of pending) {
      const verified = await maybeVerifyAttorneyReview({
        attorneyId: review.attorneyId,
        userId: review.userId,
      }).catch(() => false)
      if (!verified) continue
      await prisma.attorneyReview
        .update({ where: { id: review.id }, data: { isVerified: true } })
        .catch(() => undefined)
      promoted += 1
    }
    if (promoted > 0) logger.info('Attorney review verification reconciled', { promoted })
  } catch (error: any) {
    logger.warn('Failed to reconcile attorney review verification', { error: error?.message })
  }
}

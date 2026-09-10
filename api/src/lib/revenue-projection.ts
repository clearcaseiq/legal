/**
 * What a case is worth to the platform.
 *
 * One definition, because there are now three callers that must agree: the
 * `revenue_projected` routing event, the `revenue_realized` event written when
 * an attorney retains, and the conversion value uploaded to Google Ads. If
 * those three disagree, the number the ad platform bids on is not the number
 * the business reports, and nobody notices until the spend is wrong.
 *
 * The figure is a projection, not revenue received. It is derived from the
 * model's median predicted case value at the time it is asked for, so it moves
 * as the prediction moves and it is never a settlement.
 */
import { prisma } from './prisma'

/** Typical plaintiff-side contingency share of the gross recovery. */
export const PROJECTED_CONTINGENCY_RATE = 0.33

/** Our cut of the attorney's fee. */
export const PROJECTED_PLATFORM_FEE_RATE = 0.1

export type RevenueProjection = {
  /** Model median predicted gross case value. */
  caseMedianValue: number
  /** What that median is worth to us, after contingency and platform share. */
  projectedFeeRevenue: number
}

export function projectFeeRevenue(caseMedianValue: number): number {
  return Math.round(caseMedianValue * PROJECTED_CONTINGENCY_RATE * PROJECTED_PLATFORM_FEE_RATE)
}

/**
 * Projection from the assessment's most recent prediction, or null when there
 * is nothing to project from.
 *
 * Null rather than zero on purpose. A case with no prediction is unmeasured,
 * not worthless, and a caller reporting revenue or bidding on a conversion
 * needs to be able to tell those apart.
 */
export async function buildRevenueProjection(assessmentId: string): Promise<RevenueProjection | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      predictions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { bands: true },
      },
    },
  })

  const bandsRaw = assessment?.predictions?.[0]?.bands
  if (!bandsRaw) return null

  try {
    const bands = JSON.parse(bandsRaw) as { median?: number }
    const caseMedianValue = Number(bands.median || 0)
    if (!caseMedianValue) return null

    return { caseMedianValue, projectedFeeRevenue: projectFeeRevenue(caseMedianValue) }
  } catch {
    // A malformed bands blob is a data problem, not a reason to fail whatever
    // the caller was doing — retaining a case, or sweeping conversions.
    return null
  }
}

/**
 * What insurance can actually pay, and what that does to the estimate.
 *
 * A settlement estimate above available coverage is not an estimate, it is a
 * number nobody can collect. The at-fault driver's per-person bodily-injury
 * limit is the hard ceiling on a third-party claim: a $200,000 case against a
 * $50,000 policy settles at $50,000, and the claimant's own recovery does not
 * care how the case was valued.
 *
 * The engine already knew this and then forgot it. `prediction.ts` computed a
 * proper cap in `applyPolicyLimitConstraint`, and
 * `reconcileValueBandsWithUnderwriting` overwrote the result with
 * `policyLimitConstrained: false` on both bands — so the claimant-facing number
 * was never capped, while the disclaimer next to it claimed the estimate
 * reflected "insurance constraints".
 *
 * ## Two ways to get this wrong, in opposite directions
 *
 * Capping when the limit is unknown would invent a ceiling. Most cases have no
 * limit on file for weeks — the carrier is not obliged to disclose until a
 * written request, and often not until suit — so an unknown limit has to mean
 * no cap, not a guessed one.
 *
 * Capping at the defendant's limit while ignoring the claimant's own
 * underinsured coverage would understate the case, which is the more damaging
 * error because it looks authoritative. UIM stacks on top of the defendant's
 * policy: a $120,000 case against a $50,000 policy still recovers $95,000 when
 * the claimant carries $45,000 of UIM. So when UM/UIM is confirmed but its
 * amount is unknown — which is what intake captures today, a yes/no with no
 * figure — this deliberately declines to cap at all and says why.
 *
 * MedPay is not part of the ceiling. It is a first-party medical benefit that
 * pays regardless of fault and does not reduce the third-party bodily-injury
 * recovery, so folding it in would double-count.
 */

export type CoverageCeiling = {
  /**
   * The most the claim can realistically recover, or null when coverage is
   * unknown or unbounded by what we know. Null means "do not cap".
   */
  ceiling: number | null
  defendantLimit: number | null
  underinsuredLimit: number | null
  /** Why the ceiling is what it is, for the audit trail and for display. */
  basis: string
}

/**
 * Read a per-person limit out of the shapes intake and the attorney side write.
 *
 * Handles the split notation carriers use ("100/300" means $100k per person,
 * $300k per accident — the per-person figure is the one that bounds a single
 * claimant) and plain amounts. Anything else, including the `commercial_policy`
 * and `unknown` tokens intake can store, reads as unknown rather than being
 * coerced into a number.
 */
export function parsePolicyLimit(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : null

  const text = String(raw).trim()
  const split = text.match(/\b(\d{2,4})\s*\/\s*(\d{2,4})\b/)
  if (split) {
    const perPerson = Number(split[1]) * 1000
    return Number.isFinite(perPerson) && perPerson > 0 ? perPerson : null
  }

  // "$100,000", "100000". Reject tokens like `state_minimum`, whose value
  // varies by state and by year, rather than inventing a figure for them.
  if (!/^\$?[\d,]+(\.\d+)?$/.test(text)) return null
  const amount = Number(text.replace(/[$,]/g, ''))
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

type InsuranceDetailLike = {
  insuredParty?: string | null
  coverageType?: string | null
  policyLimit?: number | null
  coverageConfirmed?: boolean | null
}

/** Whether the claimant has said they carry UM/UIM, however vaguely. */
function hasUninsuredCoverage(insurance: Record<string, any>): boolean {
  if (insurance.has_um_uim_coverage === true) return true
  const answer = String(insurance.um_uim ?? '').trim().toLowerCase()
  return answer === 'yes'
}

export function resolveCoverageCeiling(
  facts: Record<string, any> | null | undefined,
  insuranceDetails?: InsuranceDetailLike[] | null,
): CoverageCeiling {
  const insurance = facts?.insurance || {}

  const defendantFromDetails = (insuranceDetails || [])
    .filter((detail) => detail?.insuredParty === 'defendant')
    .reduce<number | null>((max, detail) => {
      const limit = parsePolicyLimit(detail?.policyLimit)
      return limit && (!max || limit > max) ? limit : max
    }, null)

  const defendantLimit =
    defendantFromDetails ??
    parsePolicyLimit(insurance.policy_limit) ??
    parsePolicyLimit(insurance.policyLimit) ??
    parsePolicyLimit(insurance.coverage_limit) ??
    parsePolicyLimit(insurance.defendant_coverage_limits)

  // Only a confirmed client-side policy counts. An unconfirmed record is a note
  // that someone should pull the declarations page, not coverage.
  const underinsuredLimit = (insuranceDetails || [])
    .filter(
      (detail) =>
        detail?.insuredParty === 'client' &&
        ['um', 'uim', 'um_uim'].includes(String(detail?.coverageType ?? '').toLowerCase()) &&
        detail?.coverageConfirmed === true,
    )
    .reduce<number | null>((sum, detail) => {
      const limit = parsePolicyLimit(detail?.policyLimit)
      return limit ? (sum ?? 0) + limit : sum
    }, null)

  if (!defendantLimit) {
    return {
      ceiling: null,
      defendantLimit: null,
      underinsuredLimit,
      basis: 'No policy limit on file, so the estimate is not capped by coverage.',
    }
  }

  if (underinsuredLimit) {
    return {
      ceiling: defendantLimit + underinsuredLimit,
      defendantLimit,
      underinsuredLimit,
      basis: `Capped at the defendant's limit plus confirmed UM/UIM coverage.`,
    }
  }

  // Coverage exists on the claimant's side but nobody has recorded how much.
  // Capping at the defendant's limit alone would understate the case, so it is
  // left uncapped until the declarations page is on file.
  if (hasUninsuredCoverage(insurance)) {
    return {
      ceiling: null,
      defendantLimit,
      underinsuredLimit: null,
      basis:
        'The claimant reports UM/UIM coverage but its limit is unknown, so the estimate is not capped until that policy is confirmed.',
    }
  }

  return {
    ceiling: defendantLimit,
    defendantLimit,
    underinsuredLimit: null,
    basis: `Capped at the defendant's known per-person policy limit.`,
  }
}

export type ConstrainedBand = {
  low: number
  expected: number
  high: number
  constrained: boolean
}

/**
 * Pull a band down to what coverage can pay.
 *
 * `low` only moves if it was itself above the ceiling, so a case worth far more
 * than the policy collapses onto the limit rather than reporting a range that
 * straddles it. A claim worth $200,000 against a $50,000 policy is a $50,000
 * claim, not a "$35,000 to $50,000" one.
 */
export function applyCoverageCeiling(
  low: number,
  expected: number,
  high: number,
  ceiling: number | null,
): ConstrainedBand {
  if (!ceiling || ceiling <= 0) return { low, expected, high, constrained: false }
  const constrained = high > ceiling
  const cappedHigh = Math.min(high, ceiling)
  return {
    low: Math.min(low, cappedHigh),
    expected: Math.min(expected, cappedHigh),
    high: cappedHigh,
    constrained,
  }
}

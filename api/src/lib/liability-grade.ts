/**
 * The one place a liability score turns into words.
 *
 * Four ladders used to exist: the underwriting engine at 85/70/45, the
 * plaintiff Results page at 70/40 for its clarity label and again at 75/45 for
 * its snapshot tile, and the plaintiff Dashboard at 70/40. A case scoring 42
 * read "Weak" to the attorney and "Mixed" to the claimant, and the two Results
 * tiles could disagree with each other on the same screen.
 *
 * The boundaries are deliberately not admin-configurable. The engine grades
 * synchronously while assembling an underwriting result and cannot await the
 * heuristics row, so a configurable boundary would let the grade stored on a
 * prediction drift from the one a surface renders — the exact split this
 * module exists to remove.
 */

export type LiabilityTier = 'very_strong' | 'strong' | 'moderate' | 'weak'
export type LiabilityGrade = 'Very Strong' | 'Strong' | 'Moderate' | 'Weak'

/** Inclusive lower bound of each tier on a 0-100 scale. Below `moderate` is weak. */
export const LIABILITY_TIER_MIN = {
  very_strong: 85,
  strong: 70,
  moderate: 45,
} as const

/**
 * Grade a 0-100 liability score. A score that is absent or unparseable grades
 * as weak; callers that need to say "not scored yet" have to check for that
 * before calling, because a missing score and a bad one are not the same claim.
 */
export function liabilityTier(score: number): LiabilityTier {
  if (!Number.isFinite(score)) return 'weak'
  if (score >= LIABILITY_TIER_MIN.very_strong) return 'very_strong'
  if (score >= LIABILITY_TIER_MIN.strong) return 'strong'
  if (score >= LIABILITY_TIER_MIN.moderate) return 'moderate'
  return 'weak'
}

const TIER_GRADES: Record<LiabilityTier, LiabilityGrade> = {
  very_strong: 'Very Strong',
  strong: 'Strong',
  moderate: 'Moderate',
  weak: 'Weak',
}

export function liabilityGrade(score: number): LiabilityGrade {
  return TIER_GRADES[liabilityTier(score)]
}

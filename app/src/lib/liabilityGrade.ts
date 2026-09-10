/**
 * Client mirror of `api/src/lib/liability-grade.ts`. The boundaries below have
 * to match that file: the attorney reads the grade the engine stored, the
 * claimant reads the grade computed here, and they are describing one case.
 *
 * Both audiences now use the same four words, except the weakest tier, which
 * reads "Needs Proof" to a claimant rather than "Weak". That is a softer way
 * to say the same thing, unlike the old copy: "Mixed" for a case the engine
 * graded "Weak" claimed the opposite. Tiers used to be drawn at 70/40 for the
 * Results clarity label, 75/45 for its snapshot tile, 70/40 on the Dashboard
 * and 85/70/45 in the engine.
 */

export type LiabilityTier = 'very_strong' | 'strong' | 'moderate' | 'weak'

/** Inclusive lower bound of each tier on a 0-100 scale. Below `moderate` is weak. */
export const LIABILITY_TIER_MIN = {
  very_strong: 85,
  strong: 70,
  moderate: 45,
} as const

export function liabilityTier(score: number): LiabilityTier {
  if (!Number.isFinite(score)) return 'weak'
  if (score >= LIABILITY_TIER_MIN.very_strong) return 'very_strong'
  if (score >= LIABILITY_TIER_MIN.strong) return 'strong'
  if (score >= LIABILITY_TIER_MIN.moderate) return 'moderate'
  return 'weak'
}

/**
 * i18n keys under `results.snapshotGrades` for claimant-facing copy. Every key
 * here is already translated in en/es/zh.
 */
export const LIABILITY_TIER_COPY_KEY: Record<LiabilityTier, string> = {
  very_strong: 'results.snapshotGrades.veryStrong',
  strong: 'results.snapshotGrades.strong',
  moderate: 'results.snapshotGrades.moderate',
  weak: 'results.snapshotGrades.needsProof',
}

/**
 * Stable English enum for the tier. Kept separate from the translated copy
 * because several components branch on the value rather than only render it.
 */
export const LIABILITY_TIER_ENUM: Record<LiabilityTier, string> = {
  very_strong: 'Very Strong',
  strong: 'Strong',
  moderate: 'Moderate',
  weak: 'Needs Proof',
}

/** Collapse the four tiers onto the three-step confidence meter. */
export function liabilityConfidenceLevel(tier: LiabilityTier): 'Low' | 'Medium' | 'High' {
  if (tier === 'very_strong' || tier === 'strong') return 'High'
  if (tier === 'moderate') return 'Medium'
  return 'Low'
}

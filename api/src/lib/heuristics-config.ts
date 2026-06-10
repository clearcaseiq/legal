/**
 * Heuristics configuration
 *
 * Centralizes the scoring/labeling heuristics that were previously hardcoded
 * across the attorney-facing surface (fit score, response badges, case-strength
 * bands, acceptance-rate and response-speed labels, conflict-check scope).
 *
 * These are stored in the same admin-editable `routingConfig` key/value table as
 * the matching rules, so they can be tuned from the Admin screen without a deploy.
 */

import { prisma } from './prisma'

const CONFIG_KEY = 'heuristics'

export interface AttorneyFitScoreHeuristics {
  /** Starting score before any signal bonuses (0-1). */
  baseScore: number
  /** Added when the attorney serves the case venue. */
  venueMatchBonus: number
  /** Added when the attorney lists the case claim type as a specialty. */
  claimTypeMatchBonus: number
  /** Added when the attorney is verified. */
  verifiedBonus: number
  /** Added when the attorney rating is at/above highRatingThreshold. */
  highRatingBonus: number
  highRatingThreshold: number
  /** Added when the attorney typically responds within fastResponseHours. */
  fastResponseBonus: number
  fastResponseHours: number
  /** Final score is clamped to [minScore, maxScore]. */
  minScore: number
  maxScore: number
}

export interface ResponseBadgeHeuristics {
  /** <= this many hours → "Fast responder". */
  fastResponderMaxHours: number
  /** <= this many hours → "Same-day replies". */
  sameDayMaxHours: number
  /** <= this many hours → "Replies within 24h", else "a few days". */
  within24MaxHours: number
}

export interface BandThresholds {
  /** Score (0-100) at/above which the label is the strongest tier. */
  strongMin: number
  /** Score (0-100) at/above which the label is the middle tier. */
  moderateMin: number
}

export interface RateLabelThresholds {
  /** Percentage (0-100) at/above which the label is "Excellent". */
  excellentMin: number
  /** Percentage (0-100) at/above which the label is "Strong". */
  strongMin: number
}

export interface ScoreLabelThresholds {
  /** Score (0-1) at/above which the label is "Excellent". */
  excellentMin: number
  /** Score (0-1) at/above which the label is "Strong". */
  strongMin: number
}

export interface ConflictCheckHeuristics {
  /** How many of the attorney's other leads to screen for conflicts. */
  lookbackCases: number
}

export interface ReadinessLabelHeuristics {
  /** Readiness score (0-100) at/above which the file is "Demand-ready". */
  demandReadyMin: number
  /** At/above which the file is "Attorney-review ready". */
  reviewReadyMin: number
  /** At/above which the file is "Needs file strengthening" (else "Early file"). */
  strengtheningMin: number
}

export interface ScoreToneHeuristics {
  /** Score (0-100) at/above which a metric renders green. */
  greenMin: number
  /** At/above which a metric renders amber (else red). */
  amberMin: number
}

export interface EvidenceCompletenessHeuristics {
  /** Evidence completeness % at/above which the file reads "High". */
  highMin: number
  /** At/above which the file reads "Moderate" (else "Low"). */
  moderateMin: number
}

export interface MarketplaceRankHeuristics {
  /** Marketplace score (0-100) at/above which the attorney ranks "Top 5%". */
  top5Min: number
  /** At/above which "Top 10%". */
  top10Min: number
  /** At/above which "Top 25%" (else "Building rank"). */
  top25Min: number
}

export interface LeadSignalHeuristics {
  /** Liability sub-score (0-1) at/above which liability is a "strength". */
  liabilityStrongMin: number
  /** Liability sub-score (0-1) below which liability is a "risk". */
  liabilityWeakMax: number
  /** Damages sub-score (0-1) at/above which damages is a "strength". */
  damagesStrongMin: number
  /** Damages sub-score (0-1) below which damages is a "risk". */
  damagesWeakMax: number
  /** Overall viability (0-1) at/above which the recommendation is "review" (else "watch"). */
  reviewDecisionMin: number
}

export interface HeuristicsConfig {
  attorneyFitScore: AttorneyFitScoreHeuristics
  responseBadge: ResponseBadgeHeuristics
  caseStrength: BandThresholds
  acceptanceRate: RateLabelThresholds
  responseSpeed: ScoreLabelThresholds
  conflictCheck: ConflictCheckHeuristics
  readinessLabels: ReadinessLabelHeuristics
  scoreTone: ScoreToneHeuristics
  evidenceCompleteness: EvidenceCompletenessHeuristics
  opportunity: BandThresholds
  marketplaceRank: MarketplaceRankHeuristics
  leadSignals: LeadSignalHeuristics
}

export const DEFAULT_HEURISTICS: HeuristicsConfig = {
  attorneyFitScore: {
    baseScore: 0.6,
    venueMatchBonus: 0.2,
    claimTypeMatchBonus: 0.15,
    verifiedBonus: 0.03,
    highRatingBonus: 0.02,
    highRatingThreshold: 4.5,
    fastResponseBonus: 0.02,
    fastResponseHours: 8,
    minScore: 0.3,
    maxScore: 0.95,
  },
  responseBadge: {
    fastResponderMaxHours: 2,
    sameDayMaxHours: 8,
    within24MaxHours: 24,
  },
  caseStrength: {
    strongMin: 70,
    moderateMin: 40,
  },
  acceptanceRate: {
    excellentMin: 75,
    strongMin: 50,
  },
  responseSpeed: {
    excellentMin: 0.85,
    strongMin: 0.65,
  },
  conflictCheck: {
    lookbackCases: 500,
  },
  readinessLabels: {
    demandReadyMin: 85,
    reviewReadyMin: 65,
    strengtheningMin: 40,
  },
  scoreTone: {
    greenMin: 70,
    amberMin: 45,
  },
  evidenceCompleteness: {
    highMin: 75,
    moderateMin: 50,
  },
  opportunity: {
    strongMin: 70,
    moderateMin: 40,
  },
  marketplaceRank: {
    top5Min: 90,
    top10Min: 80,
    top25Min: 70,
  },
  leadSignals: {
    liabilityStrongMin: 0.65,
    liabilityWeakMax: 0.45,
    damagesStrongMin: 0.65,
    damagesWeakMax: 0.45,
    reviewDecisionMin: 0.6,
  },
}

/** Deep-merge a partial config over the defaults so missing nested keys stay valid. */
function mergeHeuristics(partial?: Partial<HeuristicsConfig> | null): HeuristicsConfig {
  if (!partial || typeof partial !== 'object') return DEFAULT_HEURISTICS
  return {
    attorneyFitScore: { ...DEFAULT_HEURISTICS.attorneyFitScore, ...(partial.attorneyFitScore || {}) },
    responseBadge: { ...DEFAULT_HEURISTICS.responseBadge, ...(partial.responseBadge || {}) },
    caseStrength: { ...DEFAULT_HEURISTICS.caseStrength, ...(partial.caseStrength || {}) },
    acceptanceRate: { ...DEFAULT_HEURISTICS.acceptanceRate, ...(partial.acceptanceRate || {}) },
    responseSpeed: { ...DEFAULT_HEURISTICS.responseSpeed, ...(partial.responseSpeed || {}) },
    conflictCheck: { ...DEFAULT_HEURISTICS.conflictCheck, ...(partial.conflictCheck || {}) },
    readinessLabels: { ...DEFAULT_HEURISTICS.readinessLabels, ...(partial.readinessLabels || {}) },
    scoreTone: { ...DEFAULT_HEURISTICS.scoreTone, ...(partial.scoreTone || {}) },
    evidenceCompleteness: { ...DEFAULT_HEURISTICS.evidenceCompleteness, ...(partial.evidenceCompleteness || {}) },
    opportunity: { ...DEFAULT_HEURISTICS.opportunity, ...(partial.opportunity || {}) },
    marketplaceRank: { ...DEFAULT_HEURISTICS.marketplaceRank, ...(partial.marketplaceRank || {}) },
    leadSignals: { ...DEFAULT_HEURISTICS.leadSignals, ...(partial.leadSignals || {}) },
  }
}

export async function getHeuristics(): Promise<HeuristicsConfig> {
  try {
    const row = await prisma.routingConfig.findUnique({ where: { key: CONFIG_KEY } })
    if (!row?.value) return DEFAULT_HEURISTICS
    try {
      return mergeHeuristics(JSON.parse(row.value) as Partial<HeuristicsConfig>)
    } catch {
      return DEFAULT_HEURISTICS
    }
  } catch {
    // Table may not exist yet (migration not run) — fall back to defaults.
    return DEFAULT_HEURISTICS
  }
}

export async function saveHeuristics(config: Partial<HeuristicsConfig>): Promise<HeuristicsConfig> {
  const current = await getHeuristics()
  const merged = mergeHeuristics({
    attorneyFitScore: { ...current.attorneyFitScore, ...(config.attorneyFitScore || {}) },
    responseBadge: { ...current.responseBadge, ...(config.responseBadge || {}) },
    caseStrength: { ...current.caseStrength, ...(config.caseStrength || {}) },
    acceptanceRate: { ...current.acceptanceRate, ...(config.acceptanceRate || {}) },
    responseSpeed: { ...current.responseSpeed, ...(config.responseSpeed || {}) },
    conflictCheck: { ...current.conflictCheck, ...(config.conflictCheck || {}) },
    readinessLabels: { ...current.readinessLabels, ...(config.readinessLabels || {}) },
    scoreTone: { ...current.scoreTone, ...(config.scoreTone || {}) },
    evidenceCompleteness: { ...current.evidenceCompleteness, ...(config.evidenceCompleteness || {}) },
    opportunity: { ...current.opportunity, ...(config.opportunity || {}) },
    marketplaceRank: { ...current.marketplaceRank, ...(config.marketplaceRank || {}) },
    leadSignals: { ...current.leadSignals, ...(config.leadSignals || {}) },
  })
  try {
    await prisma.routingConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: JSON.stringify(merged) },
      update: { value: JSON.stringify(merged) },
    })
    return merged
  } catch {
    throw new Error(
      'Failed to save heuristics. Ensure the routing_config table exists (run: npx prisma migrate deploy)'
    )
  }
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/** Deterministic attorney fit score from configured signal bonuses. */
export function computeAttorneyFitScore(
  config: HeuristicsConfig,
  signals: {
    venueMatch?: boolean
    claimTypeMatch?: boolean
    isVerified?: boolean
    rating?: number | null
    responseTimeHours?: number | null
  }
): number {
  const h = config.attorneyFitScore
  let score = h.baseScore
  if (signals.venueMatch) score += h.venueMatchBonus
  if (signals.claimTypeMatch) score += h.claimTypeMatchBonus
  if (signals.isVerified) score += h.verifiedBonus
  if ((signals.rating || 0) >= h.highRatingThreshold) score += h.highRatingBonus
  if ((signals.responseTimeHours ?? Infinity) <= h.fastResponseHours) score += h.fastResponseBonus
  return clamp(score, h.minScore, h.maxScore)
}

export function getResponseBadge(config: HeuristicsConfig, responseTimeHours: number): string {
  const b = config.responseBadge
  if (responseTimeHours <= b.fastResponderMaxHours) return 'Fast responder'
  if (responseTimeHours <= b.sameDayMaxHours) return 'Same-day replies'
  if (responseTimeHours <= b.within24MaxHours) return 'Replies within 24h'
  return 'Replies within a few days'
}

/** File-readiness label from the configured bands. */
export function getReadinessLabel(config: HeuristicsConfig, score: number): string {
  const r = config.readinessLabels
  if (score >= r.demandReadyMin) return 'Demand-ready'
  if (score >= r.reviewReadyMin) return 'Attorney-review ready'
  if (score >= r.strengtheningMin) return 'Needs file strengthening'
  return 'Early file'
}

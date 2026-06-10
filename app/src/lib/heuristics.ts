/**
 * Heuristics: admin-configurable scoring/labeling thresholds.
 *
 * Mirrors the backend `heuristics-config.ts` shape. The web app fetches the
 * active values from `/v1/heuristics` (see HeuristicsContext) and falls back to
 * these defaults so the UI keeps working offline or before the fetch resolves.
 */

export interface HeuristicsConfig {
  attorneyFitScore: {
    baseScore: number
    venueMatchBonus: number
    claimTypeMatchBonus: number
    verifiedBonus: number
    highRatingBonus: number
    highRatingThreshold: number
    fastResponseBonus: number
    fastResponseHours: number
    minScore: number
    maxScore: number
  }
  responseBadge: {
    fastResponderMaxHours: number
    sameDayMaxHours: number
    within24MaxHours: number
  }
  caseStrength: {
    strongMin: number
    moderateMin: number
  }
  acceptanceRate: {
    excellentMin: number
    strongMin: number
  }
  responseSpeed: {
    excellentMin: number
    strongMin: number
  }
  conflictCheck: {
    lookbackCases: number
  }
  readinessLabels: {
    demandReadyMin: number
    reviewReadyMin: number
    strengtheningMin: number
  }
  scoreTone: {
    greenMin: number
    amberMin: number
  }
  evidenceCompleteness: {
    highMin: number
    moderateMin: number
  }
  opportunity: {
    strongMin: number
    moderateMin: number
  }
  marketplaceRank: {
    top5Min: number
    top10Min: number
    top25Min: number
  }
  leadSignals: {
    liabilityStrongMin: number
    liabilityWeakMax: number
    damagesStrongMin: number
    damagesWeakMax: number
    reviewDecisionMin: number
  }
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

/** Label a 0-100 case-strength score using the configured bands. */
export function caseStrengthLabel(config: HeuristicsConfig, score: number): string {
  if (score >= config.caseStrength.strongMin) return 'Strong'
  if (score >= config.caseStrength.moderateMin) return 'Moderate'
  return 'Weak'
}

/** Label a 0-100 acceptance-rate percentage. Returns null below the lowest band. */
export function acceptanceRateLabel(config: HeuristicsConfig, ratePercent: number): string {
  if (ratePercent >= config.acceptanceRate.excellentMin) return 'Excellent'
  if (ratePercent >= config.acceptanceRate.strongMin) return 'Strong'
  if (ratePercent > 0) return 'Improving'
  return 'No data yet'
}

/** Label a 0-1 response-speed score. */
export function responseSpeedLabel(config: HeuristicsConfig, score: number): string {
  if (score >= config.responseSpeed.excellentMin) return 'Excellent'
  if (score >= config.responseSpeed.strongMin) return 'Strong'
  if (score > 0) return 'Improving'
  return 'No data yet'
}

export type ScoreTone = 'green' | 'amber' | 'red'

/** Map a 0-100 score to a green/amber/red tone using the configured bands. */
export function scoreTone(config: HeuristicsConfig, score: number): ScoreTone {
  if (score >= config.scoreTone.greenMin) return 'green'
  if (score >= config.scoreTone.amberMin) return 'amber'
  return 'red'
}

/** Label a 0-100 file/evidence completeness score. */
export function evidenceCompletenessLabel(config: HeuristicsConfig, score: number): 'High' | 'Moderate' | 'Low' {
  if (score >= config.evidenceCompleteness.highMin) return 'High'
  if (score >= config.evidenceCompleteness.moderateMin) return 'Moderate'
  return 'Low'
}

/** Label a 0-100 opportunity score using the configured bands. */
export function opportunityLabel(config: HeuristicsConfig, score: number): 'Strong' | 'Moderate' | 'Weak' {
  if (score >= config.opportunity.strongMin) return 'Strong'
  if (score >= config.opportunity.moderateMin) return 'Moderate'
  return 'Weak'
}

/** File-readiness label from the configured bands. */
export function readinessLabel(config: HeuristicsConfig, score: number): string {
  if (score >= config.readinessLabels.demandReadyMin) return 'Demand-ready'
  if (score >= config.readinessLabels.reviewReadyMin) return 'Attorney-review ready'
  if (score >= config.readinessLabels.strengtheningMin) return 'Needs file strengthening'
  return 'Early file'
}

/** Marketplace ranking label from the configured tiers. */
export function marketplaceRankLabel(config: HeuristicsConfig, score: number): string {
  if (score >= config.marketplaceRank.top5Min) return 'Top 5%'
  if (score >= config.marketplaceRank.top10Min) return 'Top 10%'
  if (score >= config.marketplaceRank.top25Min) return 'Top 25%'
  if (score > 0) return 'Building rank'
  return 'Not ranked yet'
}

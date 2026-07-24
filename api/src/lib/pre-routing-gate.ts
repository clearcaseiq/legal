/**
 * Pre-Routing Gating
 * Determines whether a case should be routed now, or moved to needs_more_info, manual_review, or not_routable_yet.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import type { NormalizedCase } from './case-normalization'
import { normalizeClaimTypeForSOL } from './solRules'
import { evaluateCaseFraud, type FraudSignal } from './fraud-gate'

type GateHoldAction = 'manual_review' | 'needs_more_info' | 'not_routable_yet'

export type RoutingGateResult =
  | { pass: true; reason?: string }
  | {
      pass: false
      reason: string
      status: GateHoldAction
      // Populated when the hold was triggered by the fraud/suspicion gate so
      // the caller can persist the score + signals for the admin reviewer.
      reviewReason?: string
      fraudScore?: number
      fraudSignals?: FraudSignal[]
    }

export interface ClaimTypeGateOverride {
  claimType: string
  minCaseScore?: number
  minEvidenceScore?: number
  action?: GateHoldAction
}

export interface StateGateOverride {
  state: string
  minCaseScore?: number
  minEvidenceScore?: number
  action?: GateHoldAction
}

export interface JurisdictionGateOverride {
  state: string
  jurisdiction: string
  minCaseScore?: number
  minEvidenceScore?: number
  action?: GateHoldAction
}

export interface PreRoutingGateOptions {
  minCaseScore?: number
  minEvidenceScore?: number
  requireNarrative?: boolean
  requireDisclosures?: boolean
  requirePlaintiffContact?: boolean
  supportedJurisdictions?: string[]
  supportedClaimTypes?: string[]
  gateFailureAction?: GateHoldAction
  claimTypeGateOverrides?: ClaimTypeGateOverride[]
  stateGateOverrides?: StateGateOverride[]
  jurisdictionGateOverrides?: JurisdictionGateOverride[]
}

const DEFAULT_OPTIONS: Required<PreRoutingGateOptions> = {
  minCaseScore: 0.25,
  minEvidenceScore: 0.1,
  requireNarrative: false, // Can be enabled when narrative quality is enforced
  requireDisclosures: true,
  requirePlaintiffContact: false, // User may be linked via userId; relax for now
  supportedJurisdictions: ['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI', 'AZ', 'WA', 'CO', 'NV', 'NJ'],
  supportedClaimTypes: ['auto', 'slip_and_fall', 'dog_bite', 'medmal', 'product', 'nursing_home_abuse', 'wrongful_death', 'auto_accident', 'premises', 'pi'],
  gateFailureAction: 'manual_review',
  claimTypeGateOverrides: [],
  stateGateOverrides: [],
  jurisdictionGateOverrides: []
}

function normalizeJurisdiction(value?: string | null) {
  return String(value || '')
    .toLowerCase()
    .replace(/\bcounty\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

/**
 * Run pre-routing gate checks.
 * Returns pass if case is ready to route; otherwise returns status for routing queue.
 */
export async function runPreRoutingGate(
  normalizedCase: NormalizedCase,
  options?: PreRoutingGateOptions
): Promise<RoutingGateResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const claimType = normalizeClaimTypeForSOL(normalizedCase.claim_type)
  const state = normalizedCase.jurisdiction_state?.toUpperCase()
  const county = normalizeJurisdiction(normalizedCase.jurisdiction_county)
  const claimOverride = opts.claimTypeGateOverrides.find((override) =>
    normalizeClaimTypeForSOL(override.claimType) === claimType
  )
  const stateOverride = opts.stateGateOverrides.find((override) =>
    override.state?.toUpperCase() === state
  )
  const jurisdictionOverride = opts.jurisdictionGateOverrides.find((override) =>
    override.state?.toUpperCase() === state &&
    normalizeJurisdiction(override.jurisdiction) === county
  )
  const effectiveOverride = jurisdictionOverride || stateOverride || claimOverride
  const minCaseScore = Number(effectiveOverride?.minCaseScore ?? opts.minCaseScore)
  const minEvidenceScore = Number(effectiveOverride?.minEvidenceScore ?? opts.minEvidenceScore)
  // A weak case score means the case simply isn't strong enough to route yet, while a
  // low evidence score means we need the plaintiff to supply more. Explicit gate
  // overrides can still force a specific action (e.g. manual_review).
  const caseScoreFailureAction = effectiveOverride?.action || 'not_routable_yet'
  const evidenceFailureAction = effectiveOverride?.action || 'needs_more_info'
  const assessment = await prisma.assessment.findUnique({
    where: { id: normalizedCase.case_id },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      manualReviewStatus: true
    }
  })

  if (assessment?.manualReviewStatus === 'pending') {
    return {
      pass: false,
      reason: 'Case already queued for manual review',
      status: 'manual_review'
    }
  }

  // 1. Minimum routing thresholds
  const caseScore = (normalizedCase.liability_confidence + normalizedCase.damages_score) / 2
  if (caseScore < minCaseScore) {
    return {
      pass: false,
      reason: `Case score ${(caseScore * 100).toFixed(0)}% below minimum ${(minCaseScore * 100).toFixed(0)}%`,
      status: caseScoreFailureAction
    }
  }

  if (normalizedCase.evidence_score < minEvidenceScore) {
    return {
      pass: false,
      reason: `Evidence score ${(normalizedCase.evidence_score * 100).toFixed(0)}% below minimum ${(minEvidenceScore * 100).toFixed(0)}%`,
      status: evidenceFailureAction
    }
  }

  // 2. Valid jurisdiction
  if (!state || !opts.supportedJurisdictions.includes(state)) {
    return {
      pass: false,
      reason: `Jurisdiction ${state || 'unknown'} not supported`,
      status: opts.gateFailureAction
    }
  }

  // 3. Claim type supported (normalize aliases)
  if (!claimType || !opts.supportedClaimTypes.some(t => t.toLowerCase() === claimType)) {
    return {
      pass: false,
      reason: `Claim type ${claimType || 'unknown'} not supported`,
      status: opts.gateFailureAction
    }
  }

  // 4. Statute of limitations
  if (normalizedCase.statute_of_limitations_status === 'expired') {
    return {
      pass: false,
      reason: 'Statute of limitations has expired',
      status: 'not_routable_yet'
    }
  }

  if (normalizedCase.statute_of_limitations_status === 'expiring_soon') {
    return {
      pass: false,
      reason: 'Statute of limitations is expiring soon',
      status: 'manual_review'
    }
  }

  // 5. Minimum plaintiff contact completeness
  if (opts.requirePlaintiffContact && !normalizedCase.plaintiff_contact_complete) {
    return {
      pass: false,
      reason: 'Plaintiff contact information incomplete',
      status: 'needs_more_info'
    }
  }

  // 6. Required disclosures
  if (opts.requireDisclosures && !normalizedCase.required_disclosures_accepted) {
    return {
      pass: false,
      reason: 'Required disclosures not accepted',
      status: 'needs_more_info'
    }
  }

  // 7. Core narrative
  if (opts.requireNarrative && !normalizedCase.narrative_present) {
    return {
      pass: false,
      reason: 'Missing core incident narrative',
      status: 'needs_more_info'
    }
  }

  // 8. Duplicate / already routed recently
  const recentIntro = await prisma.introduction.findFirst({
    where: { assessmentId: normalizedCase.case_id },
    orderBy: { requestedAt: 'desc' }
  })
  if (recentIntro) {
    const hoursSince = (Date.now() - recentIntro.requestedAt.getTime()) / (1000 * 60 * 60)
    if (hoursSince < 24) {
      return {
        pass: false,
        reason: 'Case already routed for review in last 24 hours',
        status: 'manual_review'
      }
    }
  }

  // 9. Fraud / suspicion gate — scores an itemized set of suspicion signals and
  //    holds the case for admin review before any attorney is introduced.
  const evidenceFiles = await prisma.evidenceFile.findMany({
    where: { assessmentId: normalizedCase.case_id },
    select: {
      category: true,
      mimetype: true,
      processingStatus: true,
      isVerified: true,
      isHIPAA: true,
      aiClassification: true,
      ocrText: true,
      exifData: true,
      location: true,
    }
  })
  const complianceSetting = await prisma.complianceSetting.findUnique({
    where: { key: 'global' }
  }).catch((error) => {
    logger.warn('Failed to load compliance settings for pre-routing gate', { error })
    return null
  })

  const fraud = await evaluateCaseFraud({
    normalizedCase,
    assessment: { id: normalizedCase.case_id, userId: assessment?.userId },
    evidenceFiles,
    complianceHipaaAligned: Boolean(complianceSetting?.hipaaAligned),
  })
  if (fraud.hold) {
    return {
      pass: false,
      reason: fraud.reason || 'Case flagged for suspicious activity and requires review',
      status: 'manual_review',
      reviewReason: fraud.reviewReason,
      fraudScore: fraud.score,
      fraudSignals: fraud.signals,
    }
  }

  return { pass: true, reason: 'All pre-routing checks passed' }
}

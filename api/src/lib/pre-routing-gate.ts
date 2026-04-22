/**
 * Pre-Routing Gating
 * Determines whether a case should be routed now, or moved to needs_more_info, manual_review, or not_routable_yet.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import type { NormalizedCase } from './case-normalization'
import { normalizeClaimTypeForSOL } from './solRules'

export type RoutingGateResult =
  | { pass: true; reason?: string }
  | { pass: false; reason: string; status: 'needs_more_info' | 'manual_review' | 'not_routable_yet' }

export interface PreRoutingGateOptions {
  minCaseScore?: number
  minEvidenceScore?: number
  requireNarrative?: boolean
  requireDisclosures?: boolean
  requirePlaintiffContact?: boolean
  supportedJurisdictions?: string[]
  supportedClaimTypes?: string[]
}

const DEFAULT_OPTIONS: Required<PreRoutingGateOptions> = {
  minCaseScore: 0.25,
  minEvidenceScore: 0.1,
  requireNarrative: false, // Can be enabled when narrative quality is enforced
  requireDisclosures: true,
  requirePlaintiffContact: false, // User may be linked via userId; relax for now
  supportedJurisdictions: ['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI', 'AZ', 'WA', 'CO', 'NV', 'NJ'],
  supportedClaimTypes: ['auto', 'slip_and_fall', 'dog_bite', 'medmal', 'product', 'nursing_home_abuse', 'wrongful_death', 'auto_accident', 'premises', 'pi']
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
  if (caseScore < opts.minCaseScore) {
    return {
      pass: false,
      reason: `Case score ${(caseScore * 100).toFixed(0)}% below minimum ${(opts.minCaseScore * 100).toFixed(0)}%`,
      status: 'not_routable_yet'
    }
  }

  if (normalizedCase.evidence_score < opts.minEvidenceScore) {
    return {
      pass: false,
      reason: `Evidence score too low (${(normalizedCase.evidence_score * 100).toFixed(0)}%)`,
      status: 'needs_more_info'
    }
  }

  // 2. Valid jurisdiction
  const state = normalizedCase.jurisdiction_state?.toUpperCase()
  if (!state || !opts.supportedJurisdictions.includes(state)) {
    return {
      pass: false,
      reason: `Jurisdiction ${state || 'unknown'} not supported`,
      status: 'not_routable_yet'
    }
  }

  // 3. Claim type supported (normalize aliases)
  const claimType = normalizeClaimTypeForSOL(normalizedCase.claim_type)
  if (!claimType || !opts.supportedClaimTypes.some(t => t.toLowerCase() === claimType)) {
    return {
      pass: false,
      reason: `Claim type ${claimType || 'unknown'} not supported`,
      status: 'not_routable_yet'
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

  // 9. Fraud / compliance heuristics - suspicious cases should be reviewed manually.
  const rawFacts = normalizedCase.rawFacts || {}
  const evidenceFiles = await prisma.evidenceFile.findMany({
    where: { assessmentId: normalizedCase.case_id },
    select: {
      category: true,
      processingStatus: true,
      isVerified: true,
      isHIPAA: true,
      aiClassification: true,
      ocrText: true,
    }
  })
  const complianceSetting = await prisma.complianceSetting.findUnique({
    where: { key: 'global' }
  }).catch((error) => {
    logger.warn('Failed to load compliance settings for pre-routing gate', { error })
    return null
  })
  const verification = (rawFacts.verification as Record<string, unknown>) || {}
  const verificationStatus = String(verification.status || '').toLowerCase()
  if (verificationStatus === 'manual_review' || verificationStatus === 'failed' || verificationStatus === 'rejected') {
    return {
      pass: false,
      reason: `Identity verification status ${verificationStatus || 'unknown'} requires review`,
      status: 'manual_review'
    }
  }

  if (!normalizedCase.narrative_present && normalizedCase.liability_confidence >= 0.8) {
    return {
      pass: false,
      reason: 'High liability score without a usable incident narrative',
      status: 'manual_review'
    }
  }

  const thinEvidence = !normalizedCase.medical_record_present && !normalizedCase.police_report_present && !normalizedCase.wage_loss_present
  if (normalizedCase.estimated_case_value_high >= 100000 && thinEvidence) {
    return {
      pass: false,
      reason: 'High-value case has thin supporting evidence',
      status: 'manual_review'
    }
  }

  if (evidenceFiles.some((file) => file.processingStatus === 'failed')) {
    return {
      pass: false,
      reason: 'One or more uploaded documents failed evidence processing',
      status: 'manual_review'
    }
  }

  if (
    complianceSetting?.hipaaAligned &&
    evidenceFiles.some((file) => ['medical_records', 'bills'].includes(file.category) && !file.isHIPAA)
  ) {
    return {
      pass: false,
      reason: 'Medical evidence requires HIPAA-aligned handling before routing',
      status: 'manual_review'
    }
  }

  if (
    evidenceFiles.some((file) =>
      /suspicious|tamper|altered|fraud/i.test(String(file.aiClassification || ''))
    )
  ) {
    return {
      pass: false,
      reason: 'Uploaded evidence appears suspicious and requires compliance review',
      status: 'manual_review'
    }
  }

  if (
    normalizedCase.estimated_case_value_high >= 50000 &&
    evidenceFiles.length > 0 &&
    evidenceFiles.every((file) => !file.isVerified) &&
    !evidenceFiles.some((file) => ['medical_records', 'police_report', 'bills'].includes(file.category))
  ) {
    return {
      pass: false,
      reason: 'High-value case lacks verified core evidence',
      status: 'manual_review'
    }
  }

  if (assessment?.userId) {
    const recentCaseCount = await prisma.assessment.count({
      where: {
        userId: assessment.userId,
        id: { not: normalizedCase.case_id },
        createdAt: {
          gte: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000))
        }
      }
    })
    if (recentCaseCount >= 2) {
      return {
        pass: false,
        reason: 'Multiple recent assessments from the same plaintiff require review',
        status: 'manual_review'
      }
    }

    const duplicateProfileCount = await prisma.assessment.count({
      where: {
        userId: assessment.userId,
        id: { not: normalizedCase.case_id },
        claimType: normalizedCase.claim_type,
        venueState: normalizedCase.jurisdiction_state,
        createdAt: {
          gte: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000))
        }
      }
    })
    if (duplicateProfileCount >= 1) {
      return {
        pass: false,
        reason: 'Potential duplicate submission pattern detected for the same plaintiff',
        status: 'manual_review'
      }
    }
  }

  return { pass: true, reason: 'All pre-routing checks passed' }
}

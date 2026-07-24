/**
 * Fraud / suspicion scoring for the pre-routing gate.
 *
 * Computes an itemized set of suspicion signals and a composite 0-100 score for
 * a case. Cases that trip a high-severity signal, or whose aggregate score
 * crosses the hold threshold, are held for admin review BEFORE any attorney is
 * introduced. The signals (and score) are persisted on the Assessment so the
 * admin reviewer can see exactly why a case was flagged.
 *
 * This module is deterministic and side-effect free: it only reads inputs and
 * returns an evaluation. The caller (pre-routing gate) decides what to do.
 */

import { prisma } from './prisma'
import type { NormalizedCase } from './case-normalization'

export type FraudSeverity = 'low' | 'medium' | 'high'

export interface FraudSignal {
  code: string
  label: string
  detail: string
  points: number
  severity: FraudSeverity
}

export interface FraudEvaluation {
  score: number // 0-100 composite suspicion score
  signals: FraudSignal[]
  hold: boolean
  // Human-readable summary of the strongest signal, used as the hold note.
  reason?: string
  // manualReviewReason code to persist (drives queue filtering/labels).
  reviewReason?: string
}

/** Minimal evidence shape the evaluator needs (subset of EvidenceFile). */
export interface FraudEvidenceInput {
  category: string
  mimetype?: string | null
  processingStatus?: string | null
  isVerified?: boolean | null
  isHIPAA?: boolean | null
  aiClassification?: string | null
  ocrText?: string | null
  exifData?: string | null
  location?: string | null
}

export interface FraudGateInput {
  normalizedCase: NormalizedCase
  assessment: { id: string; userId?: string | null }
  evidenceFiles: FraudEvidenceInput[]
  complianceHipaaAligned?: boolean
}

// A case is held once its aggregate score reaches this threshold, OR when any
// single high-severity signal fires (see `hold` below).
export const FRAUD_HOLD_THRESHOLD = 45

const CORE_EVIDENCE = ['medical_records', 'police_report', 'bills']

/**
 * Map a set of fired signals to the single most specific manualReviewReason
 * code, so the admin queue can group/label the hold meaningfully.
 */
function pickReviewReason(signals: FraudSignal[]): string {
  const codes = new Set(signals.map((s) => s.code))
  if (codes.has('identity_verification')) return 'identity_mismatch'
  if (codes.has('suspicious_documents') || codes.has('images_lack_metadata')) return 'document_tampering'
  if (codes.has('duplicate_recent_submissions') || codes.has('duplicate_profile')) return 'duplicate'
  if (codes.has('evidence_processing_failed') || codes.has('ocr_empty_document')) return 'ocr_failure'
  if (codes.has('hipaa_misaligned')) return 'suspicious_documents'
  // Value/evidence mismatch signals read as general suspicion.
  return 'fraud_suspected'
}

/**
 * Evaluate fraud/suspicion signals for a normalized case. Pure aside from the
 * two duplicate-detection count queries (read-only).
 */
export async function evaluateCaseFraud(input: FraudGateInput): Promise<FraudEvaluation> {
  const { normalizedCase, assessment, evidenceFiles } = input
  const signals: FraudSignal[] = []
  const add = (s: FraudSignal) => signals.push(s)

  const rawFacts = normalizedCase.rawFacts || {}
  const verification = (rawFacts.verification as Record<string, unknown>) || {}
  const verificationStatus = String(verification.status || '').toLowerCase()

  // 1. Identity verification failed / flagged.
  if (['manual_review', 'failed', 'rejected'].includes(verificationStatus)) {
    add({
      code: 'identity_verification',
      label: 'Identity verification flagged',
      detail: `Identity verification status is "${verificationStatus}".`,
      points: 40,
      severity: 'high',
    })
  }

  // 2. AI classified one or more documents as suspicious/tampered/altered/fraud.
  const suspiciousFiles = evidenceFiles.filter((f) =>
    /suspicious|tamper|altered|fraud|forg/i.test(String(f.aiClassification || '')),
  )
  if (suspiciousFiles.length > 0) {
    add({
      code: 'suspicious_documents',
      label: 'Documents appear altered',
      detail: `${suspiciousFiles.length} uploaded document(s) were AI-classified as suspicious or tampered.`,
      points: 45,
      severity: 'high',
    })
  }

  // 3. Evidence processing failed (often a sign of a corrupt/edited file).
  const failedFiles = evidenceFiles.filter((f) => f.processingStatus === 'failed')
  if (failedFiles.length > 0) {
    add({
      code: 'evidence_processing_failed',
      label: 'Evidence failed processing',
      detail: `${failedFiles.length} document(s) failed evidence processing and could not be read.`,
      points: 25,
      severity: 'medium',
    })
  }

  // 4. High-value case with thin supporting evidence.
  const thinEvidence =
    !normalizedCase.medical_record_present &&
    !normalizedCase.police_report_present &&
    !normalizedCase.wage_loss_present
  if (normalizedCase.estimated_case_value_high >= 100000 && thinEvidence) {
    add({
      code: 'high_value_thin_evidence',
      label: 'High value, thin evidence',
      detail: `Estimated value $${Math.round(normalizedCase.estimated_case_value_high / 1000)}k with no medical, police, or wage-loss records.`,
      points: 30,
      severity: 'high',
    })
  }

  // 5. High liability confidence with no usable incident narrative.
  if (!normalizedCase.narrative_present && normalizedCase.liability_confidence >= 0.8) {
    add({
      code: 'high_liability_no_narrative',
      label: 'Strong liability, no narrative',
      detail: `Liability confidence ${(normalizedCase.liability_confidence * 100).toFixed(0)}% but the incident narrative is missing or too short.`,
      points: 25,
      severity: 'medium',
    })
  }

  // 6. HIPAA-misaligned medical evidence (compliance must review first).
  if (
    input.complianceHipaaAligned &&
    evidenceFiles.some((f) => ['medical_records', 'bills'].includes(f.category) && !f.isHIPAA)
  ) {
    add({
      code: 'hipaa_misaligned',
      label: 'HIPAA handling required',
      detail: 'Medical evidence is not marked HIPAA-aligned and needs compliance review before routing.',
      points: 20,
      severity: 'medium',
    })
  }

  // 7. High-value case whose evidence is entirely unverified and non-core.
  if (
    normalizedCase.estimated_case_value_high >= 50000 &&
    evidenceFiles.length > 0 &&
    evidenceFiles.every((f) => !f.isVerified) &&
    !evidenceFiles.some((f) => CORE_EVIDENCE.includes(f.category))
  ) {
    add({
      code: 'high_value_unverified',
      label: 'High value, unverified evidence',
      detail: 'No core evidence is present and nothing has been verified on a high-value case.',
      points: 20,
      severity: 'medium',
    })
  }

  // 8. Photo evidence stripped of all metadata (EXIF + GPS) — common with
  //    screenshots or edited/downloaded images rather than originals.
  const imageFiles = evidenceFiles.filter(
    (f) => f.category === 'photos' || /^image\//i.test(String(f.mimetype || '')),
  )
  if (
    imageFiles.length > 0 &&
    imageFiles.every((f) => !String(f.exifData || '').trim() && !String(f.location || '').trim())
  ) {
    add({
      code: 'images_lack_metadata',
      label: 'Photos missing metadata',
      detail: `${imageFiles.length} photo(s) have no EXIF/GPS metadata, which can indicate edited or non-original images.`,
      points: 15,
      severity: 'low',
    })
  }

  // 9. Documents that completed processing but yielded no readable text.
  const emptyDocs = evidenceFiles.filter(
    (f) =>
      f.processingStatus === 'completed' &&
      ['medical_records', 'bills', 'police_report', 'correspondence'].includes(f.category) &&
      !String(f.ocrText || '').trim(),
  )
  if (emptyDocs.length > 0) {
    add({
      code: 'ocr_empty_document',
      label: 'Unreadable documents',
      detail: `${emptyDocs.length} document(s) processed but contained no extractable text.`,
      points: 12,
      severity: 'low',
    })
  }

  // 10 & 11. Duplicate submission patterns from the same plaintiff.
  if (assessment.userId) {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const [recentCaseCount, duplicateProfileCount] = await Promise.all([
      prisma.assessment.count({
        where: {
          userId: assessment.userId,
          id: { not: normalizedCase.case_id },
          createdAt: { gte: since7d },
        },
      }),
      prisma.assessment.count({
        where: {
          userId: assessment.userId,
          id: { not: normalizedCase.case_id },
          claimType: normalizedCase.claim_type,
          venueState: normalizedCase.jurisdiction_state,
          createdAt: { gte: since30d },
        },
      }),
    ])

    if (recentCaseCount >= 2) {
      add({
        code: 'duplicate_recent_submissions',
        label: 'Multiple recent submissions',
        detail: `${recentCaseCount} other cases submitted by this plaintiff in the last 7 days.`,
        points: 35,
        severity: 'high',
      })
    } else if (duplicateProfileCount >= 1) {
      add({
        code: 'duplicate_profile',
        label: 'Possible duplicate case',
        detail: `${duplicateProfileCount} matching ${normalizedCase.claim_type} case(s) in ${normalizedCase.jurisdiction_state} in the last 30 days.`,
        points: 30,
        severity: 'medium',
      })
    }
  }

  const score = Math.min(100, signals.reduce((sum, s) => sum + s.points, 0))
  const hasHigh = signals.some((s) => s.severity === 'high')
  const hold = signals.length > 0 && (hasHigh || score >= FRAUD_HOLD_THRESHOLD)

  // Strongest signal (by points) drives the human-readable reason.
  const top = [...signals].sort((a, b) => b.points - a.points)[0]

  return {
    score,
    signals,
    hold,
    reason: top ? top.detail : undefined,
    reviewReason: hold ? pickReviewReason(signals) : undefined,
  }
}

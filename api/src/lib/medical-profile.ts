/**
 * Canonical medical profile — the server-side "reported vs documented" record.
 *
 * Step 3 intake now captures structured, per-region injury data tagged as
 * `user_reported` (see the app's injuryQuestionLibrary). This module folds that
 * (plus the non-body-part case modules and the legacy flat fields) into one
 * canonical `MedicalProfile` stored on `facts.medicalProfile`, where every
 * finding/treatment carries a PROVENANCE and STATUS:
 *
 *   source: user_reported | medical_record | provider_reported | ai_extracted
 *   status: reported | confirmed
 *
 * The AI document pipeline later confirms/adds findings from actual records
 * (`applyDocumentedFindings`), so valuation can weight documented evidence above
 * self-reported answers. This is the data-model half of the Step 3 redesign
 * (reported-vs-documented + Injury/FunctionalImpact/MedicalEvidence).
 */

export type Provenance = 'user_reported' | 'medical_record' | 'provider_reported' | 'ai_extracted'
export type FindingStatus = 'reported' | 'confirmed'

export interface ProfileFinding {
  code: string
  source: Provenance
  status: FindingStatus
}

export interface ProfileTreatment {
  code: string
  source: Provenance
  status: FindingStatus
}

export interface ProfileInjury {
  region: string
  side?: string
  symptoms: string[]
  findings: ProfileFinding[]
  treatments: ProfileTreatment[]
  source: Provenance
}

export interface FunctionalImpact {
  areas: string[]
  detail: Record<string, string[]>
  recoveryStatus?: string
  recoveryPercent?: number | null
  treatmentStatus?: string
}

export interface MedicalEvidence {
  userReported: { injuries: number; findings: number; treatments: number }
  medicalRecordConfirmed: { icdCodes: string[]; cptCodes: string[]; count: number }
  providerReported: Record<string, unknown>
  aiExtracted: Record<string, unknown>
}

export interface MedicalProfile {
  version: number
  generatedAt: string
  incidentType: string
  injuries: ProfileInjury[]
  functionalImpact: FunctionalImpact
  caseType?: { type: string; detail: Record<string, unknown> }
  evidence: MedicalEvidence
  /** 0-1: share of the medical picture backed by records rather than self-report. */
  documentedRatio: number
  hasDocumentedRecords: boolean
}

const PROFILE_VERSION = 1

function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

function asRecord(v: unknown): Record<string, any> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {}
}

/** Mirror of the app's incident-type normaliser (kept in sync intentionally). */
export function normalizeIncidentType(injuryType: string | undefined | null): string {
  const t = (injuryType || '').toLowerCase()
  if (t.includes('vehicle') || t.includes('auto') || t.includes('car')) return 'auto'
  if (t.includes('slip') || t.includes('fall') || t.includes('premises') || t.includes('trip')) return 'slip_fall'
  if (t.includes('assault')) return 'assault'
  if (t.includes('dog') || t.includes('bite')) return 'dog_bite'
  if (t.includes('toxic')) return 'toxic'
  if (t.includes('medmal') || t.includes('malpractice')) return 'medmal'
  if (t.includes('wrongful') || t.includes('death')) return 'wrongful_death'
  return t || 'other'
}

/** Injury details can live at facts.injuryDetails or nested under intakeData. */
function resolveInjuryDetails(facts: Record<string, any>): Record<string, any> {
  const top = asRecord(facts?.injuryDetails)
  if (Object.keys(top).length > 0) return top
  return asRecord(asRecord(facts?.intakeData)?.injuryDetails)
}

function resolveIncidentType(facts: Record<string, any>): string {
  const intake = asRecord(facts?.intakeData)
  return normalizeIncidentType(intake?.injuryType || facts?.claimType || '')
}

/**
 * Build the canonical profile from an intake `facts` blob. Everything here is
 * self-reported; call `applyDocumentedFindings` afterwards to fold in records.
 */
export function buildMedicalProfile(facts: Record<string, any> | null | undefined): MedicalProfile {
  const f = asRecord(facts)
  const details = resolveInjuryDetails(f)
  const regionDetail = asRecord(details.regionDetail)

  const injuries: ProfileInjury[] = []

  const mkFindings = (arr: unknown, source: Provenance): ProfileFinding[] =>
    asArray<string>(arr).map((code) => ({ code, source, status: source === 'user_reported' ? 'reported' : 'confirmed' }))
  const mkTreatments = (arr: unknown, source: Provenance): ProfileTreatment[] =>
    asArray<string>(arr).map((code) => ({ code, source, status: source === 'user_reported' ? 'reported' : 'confirmed' }))

  const regionKeys = Object.keys(regionDetail)
  if (regionKeys.length > 0) {
    for (const region of regionKeys) {
      const d = asRecord(regionDetail[region])
      injuries.push({
        region,
        side: typeof d.side === 'string' ? d.side : undefined,
        symptoms: asArray<string>(d.symptoms),
        findings: mkFindings(d.findings, 'user_reported'),
        treatments: mkTreatments(d.treatments, 'user_reported'),
        source: 'user_reported',
      })
    }
  } else {
    // No per-region structure (e.g. legacy or skipped body map): synthesize one
    // injury per selected body part, plus a "general" bucket for the flat
    // diagnoses/symptoms so nothing is lost.
    for (const part of asArray<string>(details.bodyParts)) {
      injuries.push({ region: part, symptoms: [], findings: [], treatments: [], source: 'user_reported' })
    }
    const diagnoses = asArray<string>(details.diagnoses)
    const symptoms = asArray<string>(details.currentSymptoms)
    if (diagnoses.length || symptoms.length) {
      injuries.push({
        region: 'general',
        symptoms,
        findings: mkFindings(diagnoses, 'user_reported'),
        treatments: [],
        source: 'user_reported',
      })
    }
  }

  const functionalImpact: FunctionalImpact = {
    areas: asArray<string>(details.lifestyleImpact),
    detail: asRecord(details.lifeImpactDetail),
    recoveryStatus: typeof details.recoveryStatus === 'string' ? details.recoveryStatus : undefined,
    recoveryPercent: typeof details.recoveryPercent === 'number' ? details.recoveryPercent : null,
    treatmentStatus: typeof details.treatmentStatus === 'string' ? details.treatmentStatus : undefined,
  }

  const incidentType = resolveIncidentType(f)
  const caseTypeDetail = asRecord(details.caseTypeDetail)
  const caseType = Object.keys(caseTypeDetail).length > 0 ? { type: incidentType, detail: caseTypeDetail } : undefined

  const reportedFindings = injuries.reduce((n, i) => n + i.findings.length, 0)
  const reportedTreatments = injuries.reduce((n, i) => n + i.treatments.length, 0)

  const profile: MedicalProfile = {
    version: PROFILE_VERSION,
    generatedAt: new Date().toISOString(),
    incidentType,
    injuries,
    functionalImpact,
    caseType,
    evidence: {
      userReported: { injuries: injuries.length, findings: reportedFindings, treatments: reportedTreatments },
      medicalRecordConfirmed: { icdCodes: [], cptCodes: [], count: 0 },
      providerReported: {},
      aiExtracted: {},
    },
    documentedRatio: 0,
    hasDocumentedRecords: false,
  }
  return profile
}

/**
 * Fold documented findings extracted from uploaded records into the profile.
 * We do not attempt a precise ICD→region mapping here (that needs a coding
 * layer); instead we record the documented codes and lift `documentedRatio`,
 * which valuation and the demand-readiness gate can weight against the
 * self-reported picture. Idempotent: recomputes from the given codes each time.
 */
export function applyDocumentedFindings(
  profile: MedicalProfile,
  documented: { icdCodes?: unknown; cptCodes?: unknown },
): MedicalProfile {
  const icdCodes = Array.from(new Set(asArray<string>(documented.icdCodes).filter(Boolean)))
  const cptCodes = Array.from(new Set(asArray<string>(documented.cptCodes).filter(Boolean)))
  const count = icdCodes.length + cptCodes.length

  profile.evidence.medicalRecordConfirmed = { icdCodes, cptCodes, count }
  profile.hasDocumentedRecords = count > 0

  const reportedFindings = profile.evidence.userReported.findings
  // Documented codes vs the self-reported finding count, capped at 1. When the
  // claimant reported nothing but records exist, treat it as fully documented.
  profile.documentedRatio = count === 0 ? 0 : reportedFindings === 0 ? 1 : Math.min(1, count / reportedFindings)
  return profile
}

/** Rebuild the profile from facts and immediately fold in documented codes. */
export function refreshMedicalProfile(
  facts: Record<string, any>,
  documented?: { icdCodes?: unknown; cptCodes?: unknown },
): MedicalProfile {
  const profile = buildMedicalProfile(facts)
  if (documented) applyDocumentedFindings(profile, documented)
  return profile
}

/** Compact provenance summary for logging / valuation inputs. */
export function profileEvidenceSummary(profile: MedicalProfile): {
  injuries: number
  reportedFindings: number
  documentedCodes: number
  documentedRatio: number
  hasDocumentedRecords: boolean
} {
  return {
    injuries: profile.injuries.length,
    reportedFindings: profile.evidence.userReported.findings,
    documentedCodes: profile.evidence.medicalRecordConfirmed.count,
    documentedRatio: profile.documentedRatio,
    hasDocumentedRecords: profile.hasDocumentedRecords,
  }
}

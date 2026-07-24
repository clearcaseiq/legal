/**
 * Case Intelligence engine (Phase 0).
 *
 * Assembles a single, DETERMINISTIC per-case "brain" from everything already
 * collected during plaintiff intake + the underwriting engine. This powers the
 * attorney-facing three-section pattern:
 *   1. Already Known  — facts the AI already collected (no re-asking)
 *   2. Missing Information — a star-rated gap registry, each with one-click actions
 *   3. (Phase 1) Intelligent Questions — see intake-questions.ts / intelligent-questions.ts
 *
 * IMPORTANT: every number here (value, scores, missing items) comes from the
 * deterministic underwriting engine or the raw facts — never from an LLM. The
 * LLM layer (Phase 1) only narrates/prioritizes what this file produces.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { underwriteCase } from './underwriting-engine'
import { deriveSOLStatus, normalizeClaimTypeForSOL } from './solRules'

export type GapCategory = 'liability' | 'medical' | 'damages' | 'insurance' | 'evidence' | 'case_strategy'
export type ValueImpact = 'high' | 'medium' | 'low'
export type GapAction = 'request_from_client' | 'assign_paralegal' | 'generate_doc_request' | 'schedule_followup'

export interface CaseGap {
  key: string
  label: string
  category: GapCategory
  /** 1-5 star criticality. */
  severity: number
  valueImpact: ValueImpact
  rationale: string
  actions: GapAction[]
  /** When a document request is the natural remedy, the request key to pre-fill. */
  requestedDoc?: string
  /** Set when an answered Intelligent Question has addressed this gap. */
  resolved?: boolean
  /** Who recorded the answer that resolved this gap (for display). */
  resolvedByName?: string | null
}

export interface KnownFact {
  key: string
  label: string
  value: string
  detail?: string
}

export interface CaseIntelligenceSummary {
  severity: { label: string; score: number }
  estimatedValue: { low: number; expected: number; high: number }
  attorneyInterest: number
  liability: { grade: string; score: number }
  caseStrength: number
  sol: { daysRemaining: number | null; expiresAt: string | null; status: string }
  medical: string
  evidence: string
  /** Documentation completeness — powers Phase 2 demand-readiness coaching. */
  documentation: { score: number; grade: string }
  /** Economic damages already modeled — powers Phase 2 future-care coaching. */
  economic: { medicalBills: number; futureMedical: number; lostWages: number }
}

export interface CaseIntelligence {
  assessmentId: string
  claimType: string
  claimTypeKey: string
  generatedAt: string
  modelVersion: string
  summary: CaseIntelligenceSummary
  known: KnownFact[]
  gaps: CaseGap[]
  /** Raw incident narrative — used to ground the Phase 1 LLM question generator; not displayed directly. */
  narrative?: string
}

function parseFacts(raw: unknown): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, any>
  try {
    return JSON.parse(String(raw)) as Record<string, any>
  } catch {
    return {}
  }
}

const INJURY_LABELS: Record<string, string> = {
  SOFT_TISSUE: 'Soft-tissue injury',
  DISC_BULGE: 'Disc bulge',
  DISC_HERNIATION: 'Disc herniation',
  RADICULOPATHY: 'Radiculopathy',
  TBI_MILD: 'Mild TBI',
  TBI_MODERATE: 'Moderate TBI',
  TBI_SEVERE: 'Severe TBI',
  BROKEN_BONE: 'Fracture',
  SPINAL_CORD: 'Spinal cord injury',
  WRONGFUL_DEATH: 'Wrongful death',
}

const TREATMENT_LABELS: Record<string, string> = {
  er: 'ER',
  emergency: 'ER',
  chiro_pt: 'PT/Chiro',
  pt: 'PT',
  physical_therapy: 'PT',
  chiropractic: 'Chiro',
  mri: 'MRI',
  imaging: 'Imaging',
  injections: 'Injections',
  pain_management: 'Pain mgmt',
  surgery: 'Surgery',
}

function formatMoney(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0'
  if (value >= 1000) return `$${Math.round(value / 1000)}k`
  return `$${Math.round(value)}`
}

function evidenceCategorySet(facts: Record<string, any>, evidenceFiles: Array<{ category?: string | null; aiClassification?: string | null }>): Set<string> {
  const set = new Set<string>()
  const verified = Array.isArray(facts?.evidence) ? facts.evidence : []
  for (const item of verified) if (item) set.add(String(item).toLowerCase())
  for (const file of evidenceFiles) {
    if (file.category) set.add(String(file.category).toLowerCase())
    if (file.aiClassification) set.add(String(file.aiClassification).toLowerCase())
  }
  return set
}

function hasAny(set: Set<string>, needles: string[]): boolean {
  return needles.some((n) => {
    const low = n.toLowerCase()
    for (const v of set) if (v.includes(low)) return true
    return false
  })
}

function summarizeTreatment(facts: Record<string, any>): string {
  const treatment = Array.isArray(facts?.treatment) ? facts.treatment : []
  const labels = new Set<string>()
  for (const item of treatment) {
    const raw = String(item?.type || item?.category || item || '').toLowerCase()
    for (const [key, label] of Object.entries(TREATMENT_LABELS)) {
      if (raw.includes(key)) labels.add(label)
    }
  }
  // Also fold in the intake medicalTreatment array if present on facts.
  const intakeTreat = Array.isArray(facts?.medicalTreatment) ? facts.medicalTreatment : []
  for (const item of intakeTreat) {
    const raw = String(item || '').toLowerCase()
    for (const [key, label] of Object.entries(TREATMENT_LABELS)) {
      if (raw.includes(key)) labels.add(label)
    }
  }
  return labels.size ? Array.from(labels).join(' + ') : 'Not provided'
}

function defendantLimitsKnown(facts: Record<string, any>, insuranceDetails: Array<any>): boolean {
  const ins = facts?.insurance || {}
  if (ins.defendant_coverage_limits || ins.policy_limit || ins.policyLimit) return true
  return insuranceDetails.some(
    (d) => (String(d?.insuredParty || '').toLowerCase() === 'defendant') && (d?.policyLimit != null && d?.policyLimit !== ''),
  )
}

function defendantCarrierKnown(facts: Record<string, any>, insuranceDetails: Array<any>): boolean {
  const ins = facts?.insurance || {}
  if (ins.defendant_carrier || ins.carrier || ins.carrierName) return true
  return insuranceDetails.some((d) => (String(d?.insuredParty || '').toLowerCase() === 'defendant') && d?.carrierName)
}

function imagingKnown(facts: Record<string, any>, evidence: Set<string>): boolean {
  if (hasAny(evidence, ['mri', 'imaging', 'x-ray', 'xray', 'ct'])) return true
  const details = facts?.injuryDetails || {}
  if (Array.isArray(details.imaging) && details.imaging.length > 0) return true
  const treatment = Array.isArray(facts?.treatment) ? facts.treatment : []
  return treatment.some((t: any) => /mri|imaging|x-?ray|ct\b/i.test(`${t?.type || ''} ${t?.notes || ''}`))
}

function priorInjuryKnown(facts: Record<string, any>): boolean {
  const details = facts?.injuryDetails || {}
  if (details.priorInjury !== undefined && details.priorInjury !== null && details.priorInjury !== '') return true
  if (facts?.priorInjury !== undefined && facts?.priorInjury !== null && facts?.priorInjury !== '') return true
  return false
}

function wageLossClaimed(facts: Record<string, any>): boolean {
  const d = facts?.damages || {}
  return Number(d.wage_loss || d.estimated_wage_loss || d.extracted_wage_loss || 0) > 0
}

/**
 * Deterministic gap catalog. Each documentation gap from the underwriting engine
 * plus a handful of high-value investigation gaps (policy limits, imaging, prior
 * injuries, witnesses, employer) that attorneys otherwise spend the first
 * consultation chasing.
 */
function buildGaps(params: {
  documentationMissing: string[]
  facts: Record<string, any>
  evidence: Set<string>
  insuranceDetails: Array<any>
  primaryInjury: string
}): CaseGap[] {
  const { documentationMissing, facts, evidence, insuranceDetails, primaryInjury } = params
  const gaps: CaseGap[] = []
  const missingLower = documentationMissing.map((m) => m.toLowerCase())
  const missingHas = (needle: string) => missingLower.some((m) => m.includes(needle))

  if (missingHas('medical record')) {
    gaps.push({
      key: 'medical_records', label: 'Medical records', category: 'medical', severity: 5, valueImpact: 'high',
      rationale: 'Treatment records are the backbone of the damages claim and are required before a demand can be built.',
      actions: ['generate_doc_request', 'assign_paralegal', 'request_from_client'], requestedDoc: 'medical_records',
    })
  }
  if (missingHas('medical bill')) {
    gaps.push({
      key: 'medical_bills', label: 'Medical bills / billing ledger', category: 'damages', severity: 4, valueImpact: 'high',
      rationale: 'Billed specials anchor the settlement value and the general-damages multiplier.',
      actions: ['generate_doc_request', 'request_from_client'], requestedDoc: 'medical_records',
    })
  }
  if (missingHas('police') || missingHas('incident report')) {
    gaps.push({
      key: 'police_report', label: 'Police / incident report', category: 'liability', severity: 5, valueImpact: 'high',
      rationale: 'Establishes fault, identifies the defendant/insurer, and often lists witnesses.',
      actions: ['assign_paralegal', 'generate_doc_request'], requestedDoc: 'police_report',
    })
  }
  if (missingHas('photo')) {
    gaps.push({
      key: 'photos', label: 'Photos (scene / injuries / property damage)', category: 'evidence', severity: 3, valueImpact: 'medium',
      rationale: 'Visual proof of impact severity and injuries strengthens both liability and damages.',
      actions: ['request_from_client'], requestedDoc: 'injury_photos',
    })
  }
  if (missingHas('wage')) {
    gaps.push({
      key: 'wage_proof', label: 'Lost-wage proof (pay stubs / employer letter)', category: 'damages', severity: 3, valueImpact: 'medium',
      rationale: 'Documents economic damages that are otherwise not recoverable.',
      actions: ['request_from_client', 'generate_doc_request'], requestedDoc: 'wage_loss',
    })
  }
  if (missingHas('daily impact')) {
    gaps.push({
      key: 'daily_impact', label: 'Daily-impact / pain journal statement', category: 'damages', severity: 2, valueImpact: 'low',
      rationale: 'A client statement on how injuries affect daily life supports non-economic damages.',
      actions: ['schedule_followup', 'request_from_client'],
    })
  }

  // High-value investigation gaps beyond raw documentation.
  if (!defendantLimitsKnown(facts, insuranceDetails)) {
    gaps.push({
      key: 'defendant_policy_limits', label: 'Defendant policy limits', category: 'insurance', severity: 5, valueImpact: 'high',
      rationale: 'Policy limits cap realistic recovery and drive the demand strategy. Send a limits request early.',
      actions: ['assign_paralegal', 'generate_doc_request'], requestedDoc: 'insurance',
    })
  } else if (!defendantCarrierKnown(facts, insuranceDetails)) {
    gaps.push({
      key: 'defendant_carrier', label: 'Defendant insurance carrier / claim number', category: 'insurance', severity: 4, valueImpact: 'medium',
      rationale: 'Needed to open the claim and direct the demand to the right adjuster.',
      actions: ['assign_paralegal', 'request_from_client'], requestedDoc: 'insurance',
    })
  }

  const discLike = ['DISC_BULGE', 'DISC_HERNIATION', 'RADICULOPATHY', 'SPINAL_CORD'].includes(primaryInjury)
  if (discLike && !imagingKnown(facts, evidence)) {
    gaps.push({
      key: 'imaging_mri', label: 'MRI / diagnostic imaging results', category: 'medical', severity: 4, valueImpact: 'high',
      rationale: 'Reported symptoms suggest a disc/nerve injury; objective imaging can materially raise case value.',
      actions: ['schedule_followup', 'assign_paralegal'],
    })
  }

  if (!priorInjuryKnown(facts)) {
    gaps.push({
      key: 'prior_injuries', label: 'Prior injuries / pre-existing conditions', category: 'case_strategy', severity: 3, valueImpact: 'medium',
      rationale: 'Prior injuries to the same body part are a leading defense argument — confirm before demand.',
      actions: ['schedule_followup'],
    })
  }

  if (hasAny(evidence, ['police_report', 'incident_report'])) {
    gaps.push({
      key: 'witness_statements', label: 'Witness contact info / statements', category: 'liability', severity: 3, valueImpact: 'medium',
      rationale: 'Police reports typically list witnesses; statements should be collected while memories are fresh.',
      actions: ['assign_paralegal', 'request_from_client'],
    })
  }

  if (wageLossClaimed(facts)) {
    gaps.push({
      key: 'employer_info', label: 'Employer information (for wage verification)', category: 'damages', severity: 3, valueImpact: 'medium',
      rationale: 'A wage loss is claimed but employer details are needed to verify and document it.',
      actions: ['request_from_client'],
    })
  }

  // Sort by criticality (severity desc), then high value-impact first.
  const impactRank: Record<ValueImpact, number> = { high: 3, medium: 2, low: 1 }
  return gaps.sort((a, b) => b.severity - a.severity || impactRank[b.valueImpact] - impactRank[a.valueImpact])
}

export async function buildCaseIntelligence(assessmentId: string): Promise<CaseIntelligence | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      insuranceDetails: true,
      evidenceFiles: { select: { category: true, aiClassification: true } },
    },
  })
  if (!assessment) return null

  const facts = parseFacts((assessment as any).facts)
  const insuranceDetails = (assessment as any).insuranceDetails || []
  const evidenceFiles = (assessment as any).evidenceFiles || []

  let underwriting
  try {
    underwriting = underwriteCase({
      id: assessment.id,
      claimType: assessment.claimType,
      venueState: assessment.venueState,
      venueCounty: assessment.venueCounty,
      facts,
      evidenceFiles,
    })
  } catch (error: any) {
    logger.warn('Underwriting failed while building case intelligence', { assessmentId, error: error?.message })
    return null
  }

  const evidence = evidenceCategorySet(facts, evidenceFiles)
  const primaryInjury = underwriting.severity.primaryInjury

  // ---- SOL ----
  let sol: CaseIntelligenceSummary['sol'] = { daysRemaining: null, expiresAt: null, status: 'unknown' }
  try {
    const solResult = deriveSOLStatus({
      incidentDate: facts?.incident?.date || underwriting.normalizedCase.incidentDate || null,
      venue: { state: assessment.venueState || '', county: assessment.venueCounty || undefined },
      claimType: assessment.claimType,
    })
    sol = {
      daysRemaining: solResult.daysRemaining ?? null,
      expiresAt: solResult.expiresAt ? solResult.expiresAt.toISOString() : null,
      status: solResult.status,
    }
  } catch {
    /* leave unknown */
  }

  // ---- Already Known ----
  const injuryLabel = INJURY_LABELS[primaryInjury] || primaryInjury.replace(/_/g, ' ').toLowerCase()
  const treatmentSummary = summarizeTreatment(facts)
  const evidenceLabels: string[] = []
  if (hasAny(evidence, ['police_report', 'incident_report'])) evidenceLabels.push('Police report')
  if (hasAny(evidence, ['photos', 'photo', 'image'])) evidenceLabels.push('Photos')
  if (hasAny(evidence, ['medical_records', 'medical'])) evidenceLabels.push('Medical records')
  if (hasAny(evidence, ['bills', 'medical_bills'])) evidenceLabels.push('Bills')
  const evidenceSummary = evidenceLabels.length ? evidenceLabels.join(' + ') : 'None uploaded yet'

  const carrierName = insuranceDetails.find((d: any) => d?.carrierName)?.carrierName
    || facts?.insurance?.defendant_carrier || facts?.insurance?.carrier || null

  const known: KnownFact[] = [
    { key: 'incident_date', label: 'Accident date', value: facts?.incident?.date ? new Date(facts.incident.date).toLocaleDateString() : 'Not provided' },
    { key: 'claim_type', label: 'Case type', value: String(assessment.claimType || '').replace(/_/g, ' ') || '—', detail: underwriting.normalizedCase.accidentSubtype },
    { key: 'venue', label: 'Venue', value: [assessment.venueCounty, assessment.venueState].filter(Boolean).join(', ') || 'Not provided' },
    { key: 'injuries', label: 'Injuries', value: injuryLabel },
    { key: 'treatment', label: 'Medical treatment', value: treatmentSummary },
    { key: 'liability', label: 'Liability', value: `${underwriting.liability.grade} (${underwriting.liability.score})` },
    { key: 'severity', label: 'Severity', value: `${underwriting.severity.tier} (${underwriting.severity.score})` },
    { key: 'value', label: 'Estimated value', value: `${formatMoney(underwriting.settlement.low)}–${formatMoney(underwriting.settlement.high)}` },
    { key: 'attorney_interest', label: 'Attorney interest', value: `${underwriting.attorneyAcceptance.probability}%` },
    { key: 'evidence', label: 'Evidence on file', value: evidenceSummary },
    { key: 'insurance', label: 'Defendant carrier', value: carrierName || 'Unknown' },
    { key: 'sol', label: 'SOL remaining', value: sol.daysRemaining != null ? `${sol.daysRemaining} days` : 'Confirm' },
  ]

  const gaps = buildGaps({
    documentationMissing: underwriting.documentation.missing,
    facts,
    evidence,
    insuranceDetails,
    primaryInjury,
  })

  return {
    assessmentId,
    claimType: assessment.claimType,
    claimTypeKey: normalizeClaimTypeForSOL(assessment.claimType),
    generatedAt: new Date().toISOString(),
    modelVersion: 'case-intelligence-v1',
    summary: {
      severity: { label: underwriting.severity.tier, score: underwriting.severity.score },
      estimatedValue: { low: underwriting.settlement.low, expected: underwriting.settlement.expected, high: underwriting.settlement.high },
      attorneyInterest: underwriting.attorneyAcceptance.probability,
      liability: { grade: underwriting.liability.grade, score: underwriting.liability.score },
      caseStrength: underwriting.scores.caseStrength,
      sol,
      medical: treatmentSummary,
      evidence: evidenceSummary,
      documentation: { score: underwriting.documentation.score, grade: underwriting.documentation.grade },
      economic: {
        medicalBills: underwriting.settlement.economicDamages.medicalBills,
        futureMedical: underwriting.settlement.economicDamages.futureMedicalAdjusted,
        lostWages: underwriting.settlement.economicDamages.lostWages,
      },
    },
    known,
    gaps,
    narrative: typeof facts?.incident?.narrative === 'string' ? facts.incident.narrative : undefined,
  }
}

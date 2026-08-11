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
import { summarizeDamages, type DamagesSummary } from './damages-ledger'
import { getLiabilityRecord, type LiabilityView } from './liability-record'
import { syncAllQuestionAnswersToCaseFacts } from './question-facts-sync'

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

function defendantIdentityKnown(facts: Record<string, any>, insuranceDetails: Array<any>): boolean {
  const candidates = [
    facts?.defendant?.name,
    facts?.defendant?.fullName,
    facts?.liability?.defendantName,
    facts?.liability?.atFaultParty,
    facts?.incident?.defendantName,
    facts?.incident?.otherDriverName,
    facts?.product?.manufacturer,
    facts?.product?.brand,
    insuranceDetails.find((d) => String(d?.insuredParty || '').toLowerCase() === 'defendant')?.insuredName,
  ]
  return candidates.some((v) => typeof v === 'string' && v.trim().length >= 2)
}

function resolveDefendantName(facts: Record<string, any>, insuranceDetails: Array<any>): string | null {
  const candidates = [
    facts?.defendant?.name,
    facts?.defendant?.fullName,
    facts?.liability?.defendantName,
    facts?.liability?.atFaultParty,
    facts?.incident?.defendantName,
    facts?.incident?.otherDriverName,
    facts?.product?.manufacturer,
    facts?.product?.brand,
    insuranceDetails.find((d) => String(d?.insuredParty || '').toLowerCase() === 'defendant')?.insuredName,
  ]
  for (const v of candidates) {
    if (typeof v === 'string' && v.trim().length >= 2) return v.trim()
  }
  return null
}

function productPreserved(facts: Record<string, any>, evidence: Set<string>): boolean {
  if (facts?.product?.preserved === true || facts?.product?.stillHaveProduct === true) return true
  if (String(facts?.product?.preservationStatus || '').toLowerCase() === 'preserved') return true
  return hasAny(evidence, ['product', 'product_evidence', 'product_photos'])
}

/** Claim types where the client's own auto policy is a live recovery source. */
const FIRST_PARTY_COVERAGE_CLAIM_TYPES = new Set(['auto', 'vehicle', 'motorcycle', 'truck', 'rideshare', 'pedestrian', 'bicycle'])

/**
 * True when the client's own first-party coverage has not been pinned down.
 *
 * "Confirmed" means an actual client-side insurance record with the coverage
 * verified — an intake checkbox is a claim, not a declarations page, so it
 * lowers urgency but does not close the gap.
 */
function firstPartyCoverageUnconfirmed(
  facts: Record<string, any>,
  insuranceDetails: Array<any>,
  claimType: string,
): boolean {
  const normalizedClaim = String(claimType || '').trim().toLowerCase()
  if (!FIRST_PARTY_COVERAGE_CLAIM_TYPES.has(normalizedClaim)) return false

  const confirmed = insuranceDetails.some((d) => {
    const party = String(d?.insuredParty || '').toLowerCase()
    const coverage = String(d?.coverageType || '').toLowerCase()
    return party === 'client' && ['um', 'uim', 'medpay'].includes(coverage) && Boolean(d?.coverageConfirmed)
  })
  return !confirmed
}

/** Defendant limits low enough that a UIM claim is likely to matter. */
function defendantLimitsThin(facts: Record<string, any>, insuranceDetails: Array<any>): boolean {
  const ins = facts?.insurance || {}
  const limits: number[] = []
  const raw = ins.policy_limit ?? ins.policyLimit ?? ins.defendant_coverage_limits
  if (typeof raw === 'number' && raw > 0) limits.push(raw)
  for (const d of insuranceDetails) {
    if (String(d?.insuredParty || '').toLowerCase() !== 'defendant') continue
    const limit = Number(d?.policyLimit)
    if (Number.isFinite(limit) && limit > 0) limits.push(limit)
  }
  if (limits.length === 0) return false
  // California's minimum auto liability limit; at or near it, UIM usually carries the claim.
  return Math.max(...limits) <= 50_000
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
export function buildGaps(params: {
  documentationMissing: string[]
  facts: Record<string, any>
  evidence: Set<string>
  insuranceDetails: Array<any>
  primaryInjury: string
  claimType: string
  /** Structured ledgers (Phase B). When present, they are authoritative over facts. */
  damages?: DamagesSummary | null
  liability?: LiabilityView | null
}): CaseGap[] {
  const { documentationMissing, facts, evidence, insuranceDetails, primaryInjury, claimType, damages, liability } = params
  const gaps: CaseGap[] = []
  const missingLower = documentationMissing.map((m) => m.toLowerCase())
  const missingHas = (needle: string) => missingLower.some((m) => m.includes(needle))
  const hasOpenGap = (key: string) => gaps.some((g) => g.key === key && !g.resolved)

  /** Keep satisfied checklist items visible (crossed off) instead of removing them. */
  const pushChecklist = (open: boolean, gap: Omit<CaseGap, 'resolved'>) => {
    gaps.push({
      ...gap,
      resolved: !open,
      actions: open ? gap.actions : [],
    })
  }

  const claimKey = String(claimType || '').toLowerCase().replace(/[\s-]+/g, '_')
  const isProduct = claimKey === 'product' || claimKey === 'product_liability'
  const isPoliceRelevant = ['auto', 'auto_accident', 'slip_and_fall', 'premises', 'dog_bite'].includes(claimKey)
  const firstPartyApplicable = FIRST_PARTY_COVERAGE_CLAIM_TYPES.has(String(claimType || '').trim().toLowerCase())

  const medicalRecordsMissing = missingHas('medical record')
  if (medicalRecordsMissing || hasAny(evidence, ['medical_records', 'medical'])) {
    pushChecklist(medicalRecordsMissing, {
      key: 'medical_records',
      label: 'Medical records',
      category: 'medical',
      severity: 5,
      valueImpact: 'high',
      rationale: medicalRecordsMissing
        ? 'Treatment records are the backbone of the damages claim and are required before a demand can be built.'
        : 'Medical records are on file.',
      actions: ['generate_doc_request', 'assign_paralegal', 'request_from_client'],
      requestedDoc: 'medical_records',
    })
  }
  const medicalBillsMissing = missingHas('medical bill')
  if (medicalBillsMissing || hasAny(evidence, ['bills', 'medical_bills'])) {
    pushChecklist(medicalBillsMissing, {
      key: 'medical_bills',
      label: 'Medical bills / billing ledger',
      category: 'damages',
      severity: 4,
      valueImpact: 'high',
      rationale: medicalBillsMissing
        ? 'Billed specials anchor the settlement value and the general-damages multiplier.'
        : 'Medical bills are on file.',
      actions: ['generate_doc_request', 'request_from_client'],
      requestedDoc: 'medical_records',
    })
  }

  // Product liability: preserve the product + identify the manufacturer — not a police report.
  if (isProduct) {
    pushChecklist(missingHas('product preservation') || !productPreserved(facts, evidence), {
      key: 'product_preservation',
      label: 'Product preservation (unaltered)',
      category: 'evidence',
      severity: 5,
      valueImpact: 'high',
      rationale:
        'The product is the key evidence. Instruct the client to preserve it unaltered — do not return, repair, or discard it. Spoliation can sink the case. Consider sending an evidence-preservation letter.',
      actions: ['request_from_client', 'assign_paralegal', 'schedule_followup'],
      requestedDoc: 'other',
    })
    const manufacturerKnown = Boolean(facts?.product?.manufacturer || facts?.product?.brand) || defendantIdentityKnown(facts, insuranceDetails)
    pushChecklist(!manufacturerKnown, {
      key: 'product_manufacturer',
      label: 'Product manufacturer / brand / model',
      category: 'liability',
      severity: 5,
      valueImpact: 'high',
      rationale:
        'In a product case the defendant is identified through the product itself (manufacturer, brand, model), not a police report.',
      actions: ['request_from_client', 'assign_paralegal'],
    })
  } else if (isPoliceRelevant) {
    const policeMissing = missingHas('police') || missingHas('incident report')
    const policeOnFile = hasAny(evidence, ['police_report', 'incident_report'])
    if (policeMissing || policeOnFile) {
      const needsDefendantId = !defendantIdentityKnown(facts, insuranceDetails)
      const needsCarrier = !defendantCarrierKnown(facts, insuranceDetails)
      const rationale = policeMissing
        ? needsDefendantId || needsCarrier
          ? `Identifies the defendant and their insurance carrier${needsDefendantId && needsCarrier ? ' — both currently unknown' : needsDefendantId ? ' — defendant not yet identified' : ' — carrier currently unknown'}.`
          : 'Corroborates how the incident happened and often lists witnesses.'
        : 'Police / incident report is on file.'
      pushChecklist(policeMissing, {
        key: 'police_report',
        label: 'Police / incident report',
        category: 'liability',
        severity: 5,
        valueImpact: 'high',
        rationale,
        actions: ['assign_paralegal', 'generate_doc_request'],
        requestedDoc: 'police_report',
      })
    }
  }

  if (!isProduct) {
    pushChecklist(!defendantIdentityKnown(facts, insuranceDetails), {
      key: 'defendant_identity',
      label: 'Defendant identity',
      category: 'liability',
      severity: 4,
      valueImpact: 'high',
      rationale:
        'The Overview shows who the plaintiff is, but the defendant has not been identified yet. Confirm the at-fault party so the claim can be opened against the right person/entity.',
      actions: ['request_from_client', 'assign_paralegal'],
    })
  }

  const photosMissing = missingHas('photo')
  if (photosMissing || hasAny(evidence, ['photos', 'photo', 'image', 'injury_photos'])) {
    pushChecklist(photosMissing, {
      key: 'photos',
      label: isProduct ? 'Photos of the product / injuries' : 'Photos (scene / injuries / property damage)',
      category: 'evidence',
      severity: isProduct ? 4 : 3,
      valueImpact: 'medium',
      rationale: photosMissing
        ? isProduct
          ? 'Photos of the product condition and injuries preserve evidence if the physical product is later unavailable.'
          : 'Visual proof of impact severity and injuries strengthens both liability and damages.'
        : 'Photos are on file.',
      actions: ['request_from_client'],
      requestedDoc: 'injury_photos',
    })
  }

  if (missingHas('wage') || wageLossClaimed(facts)) {
    const wageDocsOnFile = hasAny(evidence, ['wage_loss', 'wage', 'employment', 'pay_stub'])
    const wageOpen = missingHas('wage') || !wageDocsOnFile
    pushChecklist(wageOpen, {
      key: 'wage_proof',
      label: 'Lost-wage proof (pay stubs / employer letter)',
      category: 'damages',
      severity: 3,
      valueImpact: 'medium',
      rationale: wageOpen
        ? 'Documents economic damages that are otherwise not recoverable.'
        : 'Lost-wage documentation is on file.',
      actions: ['request_from_client', 'generate_doc_request'],
      requestedDoc: 'wage_loss',
    })
  }
  if (missingHas('daily impact') || facts?.damages?.household_impact) {
    pushChecklist(missingHas('daily impact'), {
      key: 'daily_impact',
      label: 'Daily-impact / pain journal statement',
      category: 'damages',
      severity: 2,
      valueImpact: 'low',
      rationale: missingHas('daily impact')
        ? 'A client statement on how injuries affect daily life supports non-economic damages.'
        : 'Daily-impact information is on file.',
      actions: ['schedule_followup', 'request_from_client'],
    })
  }

  // High-value investigation gaps beyond raw documentation.
  pushChecklist(!defendantCarrierKnown(facts, insuranceDetails), {
    key: 'defendant_carrier',
    label: 'Defendant insurance carrier / claim number',
    category: 'insurance',
    severity: 5,
    valueImpact: 'high',
    rationale: 'Needed to open the claim and direct the demand to the right adjuster. Currently unknown on the Overview.',
    actions: ['assign_paralegal', 'request_from_client'],
    requestedDoc: 'insurance',
  })
  pushChecklist(!defendantLimitsKnown(facts, insuranceDetails), {
    key: 'defendant_policy_limits',
    label: 'Defendant policy limits',
    category: 'insurance',
    severity: 5,
    valueImpact: 'high',
    rationale: 'Policy limits cap realistic recovery and drive the demand strategy. Send a limits request early.',
    actions: ['assign_paralegal', 'generate_doc_request'],
    requestedDoc: 'insurance',
  })

  // First-party coverage — day-one on auto files; crossed off once confirmed.
  if (firstPartyApplicable) {
    const open = firstPartyCoverageUnconfirmed(facts, insuranceDetails, claimType)
    const otherPartyInsured = String(facts?.insurance?.other_party_insured ?? '').toLowerCase()
    const defendantUninsured = otherPartyInsured === 'no'
    const coverageUnclear = otherPartyInsured !== 'yes'
    const thinDefendantLimits = defendantLimitsThin(facts, insuranceDetails)
    pushChecklist(open, {
      key: 'first_party_coverage',
      label: "Client's own coverage (UM/UIM, PIP/MedPay)",
      category: 'insurance',
      severity: defendantUninsured || coverageUnclear || thinDefendantLimits ? 5 : 4,
      valueImpact: 'high',
      rationale: defendantUninsured
        ? "The at-fault party is reported uninsured, so the client's own UM coverage is the only realistic source of recovery. Confirm the policy and open the claim before the notice deadline."
        : coverageUnclear
          ? "It is not yet confirmed whether the at-fault party is insured. Pull the client's own declarations page now so UM/UIM and PIP/MedPay are available if the liability claim falls short."
          : thinDefendantLimits
            ? "The defendant's limits look thin against this claim, which puts recovery on the client's UIM coverage. Confirm those limits and preserve the UIM claim."
            : open
              ? "The client's own UM/UIM and PIP/MedPay coverage has not been confirmed. MedPay/PIP pays treatment regardless of fault and UIM backstops a low defendant limit."
              : "Client first-party coverage (UM/UIM or PIP/MedPay) is confirmed on the file.",
      actions: ['assign_paralegal', 'generate_doc_request', 'request_from_client'],
      requestedDoc: 'insurance',
    })
  }

  const discLike = ['DISC_BULGE', 'DISC_HERNIATION', 'RADICULOPATHY', 'SPINAL_CORD'].includes(primaryInjury)
  if (discLike) {
    pushChecklist(!imagingKnown(facts, evidence), {
      key: 'imaging_mri',
      label: 'MRI / diagnostic imaging results',
      category: 'medical',
      severity: 4,
      valueImpact: 'high',
      rationale: 'Reported symptoms suggest a disc/nerve injury; objective imaging can materially raise case value.',
      actions: ['schedule_followup', 'assign_paralegal'],
    })
  }

  pushChecklist(!priorInjuryKnown(facts), {
    key: 'prior_injuries',
    label: 'Prior injuries / pre-existing conditions',
    category: 'case_strategy',
    severity: 3,
    valueImpact: 'medium',
    rationale: 'Prior injuries to the same body part are a leading defense argument. Confirm before demand.',
    actions: ['schedule_followup'],
  })

  if (isPoliceRelevant && hasAny(evidence, ['police_report', 'incident_report'])) {
    const witnessesKnown = Boolean(liability?.hasWitnesses || facts?.liability?.hasWitnesses)
    pushChecklist(!witnessesKnown, {
      key: 'witness_statements',
      label: 'Witness contact info / statements',
      category: 'liability',
      severity: 3,
      valueImpact: 'medium',
      rationale: 'Police reports typically list witnesses; statements should be collected while memories are fresh.',
      actions: ['assign_paralegal', 'request_from_client'],
    })
  }

  if (wageLossClaimed(facts)) {
    const employerKnown = Boolean(
      facts?.employment?.employer ||
        facts?.damages?.employer ||
        facts?.employer?.name ||
        facts?.employerName,
    )
    pushChecklist(!employerKnown, {
      key: 'employer_info',
      label: 'Employer information (for wage verification)',
      category: 'damages',
      severity: 3,
      valueImpact: 'medium',
      rationale: 'A wage loss is claimed but employer details are needed to verify and document it.',
      actions: ['request_from_client'],
    })
  }

  // ---- Phase B: structured-ledger gaps -------------------------------------
  if (damages && damages.itemCount === 0 && !hasOpenGap('medical_bills') && !hasOpenGap('medical_records')) {
    pushChecklist(true, {
      key: 'damages_ledger_empty',
      label: 'Itemized damages (medical bills, wage loss)',
      category: 'damages',
      severity: 4,
      valueImpact: 'high',
      rationale:
        'The damages ledger is empty. Add itemized medical bills and wage loss from the records on file — those specials set the settlement floor and drive general damages.',
      actions: ['assign_paralegal', 'request_from_client'],
      requestedDoc: 'medical_records',
    })
  } else if (damages && damages.itemCount > 0) {
    const specialsMissing =
      damages.medical.incurred === 0 &&
      !hasOpenGap('medical_bills') &&
      !(Number(facts?.damages?.med_charges || facts?.damages?.medical_bills || 0) > 0)
    if (specialsMissing || damages.medical.incurred > 0 || Number(facts?.damages?.med_charges || 0) > 0) {
      pushChecklist(specialsMissing, {
        key: 'medical_specials_missing',
        label: 'Medical specials not itemized',
        category: 'damages',
        severity: 3,
        valueImpact: 'high',
        rationale: specialsMissing
          ? 'The damages ledger has entries but no medical specials. Medical bills are typically the largest special and drive the value — enter the billed amounts from the records.'
          : 'Medical specials are itemized on the damages ledger.',
        actions: ['assign_paralegal', 'request_from_client'],
        requestedDoc: 'medical_records',
      })
    }
  }

  // Provable-fault weakness — crossed off once a report or witnesses land.
  if (liability) {
    const contested = ['disputed', 'denied', 'shared'].includes(liability.faultPosture)
    const reportOnFile =
      liability.policeReportStatus === 'received' ||
      hasAny(evidence, ['police_report', 'incident_report']) ||
      facts?.liability?.policeReport === true
    const noWitnesses = !liability.hasWitnesses && facts?.liability?.hasWitnesses !== true
    if (contested) {
      pushChecklist(!reportOnFile && noWitnesses, {
        key: 'liability_evidence',
        label: 'Liability proof for contested fault',
        category: 'liability',
        severity: 5,
        valueImpact: 'high',
        rationale:
          !reportOnFile && noWitnesses
            ? `Fault is ${liability.faultPosture} but there is no police report on file and no independent witnesses. Lock down the report, canvass for witnesses, and preserve any scene/dashcam video before it is lost — contested liability caps the recovery.`
            : 'Liability support is on file (police report and/or witnesses) for the contested-fault posture.',
        actions: ['assign_paralegal', 'generate_doc_request'],
        requestedDoc: 'police_report',
      })
    }
    if (liability.comparativeNegPct >= 25) {
      pushChecklist(!liability.faultTheory, {
        key: 'comparative_negligence_theory',
        label: 'Comparative-negligence rebuttal',
        category: 'liability',
        severity: 3,
        valueImpact: 'medium',
        rationale: liability.faultTheory
          ? 'A comparative-negligence rebuttal theory is documented on the liability record.'
          : `${liability.comparativeNegPct}% comparative negligence is on the record with no documented theory of liability to rebut it. Draft the fault narrative before the demand.`,
        actions: ['schedule_followup', 'assign_paralegal'],
      })
    }
  }

  // Coverage confirm / claim open — stay on the list and cross off as each step lands.
  const insList = Array.isArray(insuranceDetails) ? insuranceDetails : []
  if (insList.length > 0 && !hasOpenGap('defendant_policy_limits')) {
    const anyConfirmed = insList.some((d: any) => d?.coverageConfirmed === true)
    const claimNumberOnFile = Boolean(
      insList.some((d: any) => typeof d?.claimNumber === 'string' && d.claimNumber.trim()) ||
        String(facts?.insurance?.claim_number || facts?.insurance?.claimNumber || '').trim(),
    )
    const anyClaimOpen =
      claimNumberOnFile || insList.some((d: any) => d?.claimStatus && d.claimStatus !== 'not_opened')
    if (!anyConfirmed) {
      pushChecklist(true, {
        key: 'coverage_unconfirmed',
        label: 'Confirm coverage & open the claim',
        category: 'insurance',
        severity: 4,
        valueImpact: 'high',
        rationale:
          'An insurance carrier is on file but coverage is not yet confirmed. Verify the policy (declarations page) so the demand targets real, confirmed limits.',
        actions: ['assign_paralegal', 'generate_doc_request'],
        requestedDoc: 'insurance',
      })
    } else {
      pushChecklist(false, {
        key: 'coverage_unconfirmed',
        label: 'Confirm coverage & open the claim',
        category: 'insurance',
        severity: 4,
        valueImpact: 'high',
        rationale: 'Coverage has been confirmed on the insurance record.',
        actions: ['assign_paralegal', 'generate_doc_request'],
        requestedDoc: 'insurance',
      })
      pushChecklist(!anyClaimOpen, {
        key: 'claim_not_opened',
        label: 'Open the insurance claim',
        category: 'insurance',
        severity: 4,
        valueImpact: 'high',
        rationale: anyClaimOpen
          ? 'An insurance claim number is on file / the claim has been opened.'
          : 'Coverage is confirmed but no claim has been opened. Open the claim so the adjuster clock starts and the demand has a destination.',
        actions: ['assign_paralegal', 'generate_doc_request'],
        requestedDoc: 'insurance',
      })
    }
  }

  // Open items first (by severity), then crossed-off items.
  const impactRank: Record<ValueImpact, number> = { high: 3, medium: 2, low: 1 }
  return gaps.sort((a, b) => {
    const ar = a.resolved ? 1 : 0
    const br = b.resolved ? 1 : 0
    if (ar !== br) return ar - br
    return b.severity - a.severity || impactRank[b.valueImpact] - impactRank[a.valueImpact]
  })
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

  // Fold all Intelligent Question answers (liability, medical, damages,
  // insurance, AI free-text) into facts before underwriting so Overview moves.
  await syncAllQuestionAnswersToCaseFacts(assessmentId).catch(() => undefined)
  const [refreshed, liabilitySynced] = await Promise.all([
    prisma.assessment.findUnique({ where: { id: assessmentId }, select: { facts: true } }).catch(() => null),
    getLiabilityRecord(assessmentId).catch(() => null),
  ])

  const facts = parseFacts((refreshed as any)?.facts ?? (assessment as any).facts)
  // Prefer a saved Liability-tab record (id present) over possibly-racy facts JSON
  // write-through so Overview Liability matches the Liability strength meter.
  // Default/empty views (no row yet) must not override underwriting heuristics.
  if (liabilitySynced?.id) {
    const compPct = Number(liabilitySynced.comparativeNegPct || 0)
    facts.liabilityRecord = liabilitySynced
    facts.liability = {
      ...(facts.liability && typeof facts.liability === 'object' ? facts.liability : {}),
      faultPosture: liabilitySynced.faultPosture,
      defendantFaultPct: liabilitySynced.defendantFaultPct,
      comparativeNegligence: compPct / 100,
      comparativeFault: compPct >= 30 ? 'yes' : compPct > 0 ? 'possibly' : 'no',
      citationIssuedTo: liabilitySynced.citationIssuedTo,
      hasWitnesses: liabilitySynced.hasWitnesses,
      hasPhotos: liabilitySynced.hasPhotos,
      hasVideo: liabilitySynced.hasVideo,
      policeReport: liabilitySynced.policeReportStatus === 'received',
    }
  }
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

  const carrierName = insuranceDetails.find((d: any) => String(d?.insuredParty || '').toLowerCase() === 'defendant' && d?.carrierName)?.carrierName
    || insuranceDetails.find((d: any) => d?.carrierName)?.carrierName
    || facts?.insurance?.defendant_carrier || facts?.insurance?.carrier || null
  const defendantName = resolveDefendantName(facts, insuranceDetails)
  const claimNumber = insuranceDetails.find((d: any) => d?.claimNumber)?.claimNumber
    || facts?.insurance?.claim_number || facts?.insurance?.claimNumber || null
  const adjusterName = insuranceDetails.find((d: any) => d?.adjusterName)?.adjusterName
    || facts?.insurance?.adjuster_name || facts?.insurance?.adjusterName || null

  const known: KnownFact[] = [
    { key: 'incident_date', label: 'Accident date', value: facts?.incident?.date ? new Date(facts.incident.date).toLocaleDateString() : 'Not provided' },
    { key: 'claim_type', label: 'Case type', value: String(assessment.claimType || '').replace(/_/g, ' ') || '—', detail: underwriting.normalizedCase.accidentSubtype },
    { key: 'venue', label: 'Venue', value: [assessment.venueCounty, assessment.venueState].filter(Boolean).join(', ') || 'Not provided' },
    { key: 'defendant', label: 'Defendant', value: defendantName || 'Not yet identified' },
    { key: 'injuries', label: 'Injuries', value: injuryLabel },
    { key: 'treatment', label: 'Medical treatment', value: treatmentSummary },
    { key: 'liability', label: 'Liability', value: `${underwriting.liability.grade} (${underwriting.liability.score})` },
    { key: 'severity', label: 'Severity', value: `${underwriting.severity.tier} (${underwriting.severity.score})` },
    { key: 'value', label: 'Modeled settlement range', value: `${formatMoney(underwriting.settlement.low)}–${formatMoney(underwriting.settlement.high)}`, detail: 'Underwriting model' },
    { key: 'evidence', label: 'Evidence on file', value: evidenceSummary },
    { key: 'insurance', label: 'Defendant carrier', value: carrierName || 'Unknown' },
    { key: 'claim_number', label: 'Claim number', value: claimNumber || 'Not yet identified' },
    { key: 'adjuster', label: 'Adjuster', value: adjusterName || 'Not yet assigned' },
    ...(facts?.damages?.missed_work
      ? [
          {
            key: 'wage_loss',
            label: 'Wage loss',
            value: Math.max(
              Number(facts?.damages?.wage_loss || 0) || 0,
              Number(facts?.damages?.estimated_wage_loss || 0) || 0,
            )
              ? formatMoney(
                  Math.max(
                    Number(facts?.damages?.wage_loss || 0) || 0,
                    Number(facts?.damages?.estimated_wage_loss || 0) || 0,
                  ),
                )
              : 'Reported',
          },
        ]
      : []),
    ...(facts?.damages?.household_impact
      ? [{ key: 'household_impact', label: 'Daily impact', value: 'Limited activities' }]
      : []),
    ...(facts?.insurance?.um_uim === true
      ? [{ key: 'um_uim', label: 'UM/UIM', value: 'Available' }]
      : facts?.insurance?.um_uim === false
        ? [{ key: 'um_uim', label: 'UM/UIM', value: 'Not carried' }]
        : []),
    ...((() => {
      const lim = String(facts?.insurance?.policy_limit || facts?.insurance?.defendant_coverage_limits || '').trim()
      // Ignore values that look like claim numbers accidentally written as limits.
      if (!lim || /^[A-Z]*\d{6,}$/i.test(lim)) return [] as KnownFact[]
      return [{ key: 'policy_limits', label: 'Policy limits', value: lim }] as KnownFact[]
    })()),
    { key: 'sol', label: 'SOL remaining', value: sol.daysRemaining != null ? `${sol.daysRemaining} days` : 'Confirm' },
  ]

  // Structured ledgers (Phase B). Best-effort — never block intelligence on them.
  const [damagesSummary, liabilityView] = await Promise.all([
    summarizeDamages(assessmentId).catch(() => null),
    getLiabilityRecord(assessmentId).catch(() => null),
  ])

  const gaps = buildGaps({
    documentationMissing: underwriting.documentation.missing,
    facts,
    evidence,
    insuranceDetails,
    primaryInjury,
    claimType: assessment.claimType,
    damages: damagesSummary,
    liability: liabilityView,
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

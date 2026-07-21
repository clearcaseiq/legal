export type LiabilityGrade = 'Weak' | 'Moderate' | 'Strong' | 'Very Strong'
export type InjuryType =
  | 'SOFT_TISSUE'
  | 'DISC_BULGE'
  | 'DISC_HERNIATION'
  | 'RADICULOPATHY'
  | 'TBI_MILD'
  | 'TBI_MODERATE'
  | 'TBI_SEVERE'
  | 'BROKEN_BONE'
  | 'SPINAL_CORD'
  | 'WRONGFUL_DEATH'

export interface LiabilityResult {
  score: number
  grade: LiabilityGrade
  positives: string[]
  negatives: string[]
}

export interface SeverityResult {
  score: number
  tier: string
  primaryInjury: InjuryType
  factors: string[]
}

export interface TreatmentResult {
  score: number
  grade: 'Weak' | 'Developing' | 'Good' | 'Strong'
  positives: string[]
  negatives: string[]
}

export interface DocumentationResult {
  score: number
  grade: 'Sparse' | 'Developing' | 'Good' | 'Strong'
  positives: string[]
  missing: string[]
}

export interface EconomicDamagesResult {
  medicalBills: number
  lostWages: number
  outOfPocket: number
  futureMedicalAdjusted: number
  total: number
}

export interface SettlementResult {
  low: number
  expected: number
  high: number
  baseInjuryValue: number
  economicDamages: EconomicDamagesResult
  venueModifier: number
  liabilityModifier: number
  treatmentModifier: number
  formula: string
}

export interface AttorneyAcceptanceResult {
  probability: number
  expectedFee: number
  estimatedCost: number
  roi: number
  grade: 'Low' | 'Possible' | 'Likely' | 'Very Likely'
  positives: string[]
  negatives: string[]
}

export interface AttorneyCaseReviewValue {
  settlementLow: number
  settlementExpected: number
  settlementHigh: number
  trialLow?: number
  trialHigh?: number
}

export interface AttorneyConsensusResult extends AttorneyCaseReviewValue {
  reviewCount: number
  confidence: 'low' | 'medium' | 'high'
}

export interface UnderwritingResult {
  modelVersion: 'ca-pi-underwriting-v1'
  normalizedCase: {
    caseType: string
    accidentSubtype?: string
    county?: string | null
    incidentDate?: string | null
  }
  liability: LiabilityResult
  severity: SeverityResult
  treatment: TreatmentResult
  documentation: DocumentationResult
  settlement: SettlementResult
  attorneyAcceptance: AttorneyAcceptanceResult
  attorneyMatching: {
    practiceArea: string
    venue: string
    minimumMatchScore: number
    signals: string[]
  }
  scores: {
    caseStrength: number
    liability: number
    severity: number
    treatment: number
    documentation: number
    attorneyAcceptance: number
  }
}

type EvidenceLike = {
  category?: string | null
  originalName?: string | null
  aiClassification?: string | null
  aiSummary?: string | null
}

type UnderwritingInput = {
  id?: string
  claimType: string
  venueState?: string | null
  venueCounty?: string | null
  facts: Record<string, any>
  evidenceFiles?: EvidenceLike[]
}

const BASE_INJURY_VALUES: Record<InjuryType, number> = {
  SOFT_TISSUE: 7500,
  DISC_BULGE: 15000,
  DISC_HERNIATION: 30000,
  RADICULOPATHY: 45000,
  TBI_MILD: 100000,
  TBI_MODERATE: 250000,
  TBI_SEVERE: 500000,
  BROKEN_BONE: 50000,
  SPINAL_CORD: 750000,
  WRONGFUL_DEATH: 500000,
}

// General (pain-and-suffering) damages scale with the medical specials via the industry
// "multiplier method": the more (and more serious) the treatment, the larger the
// non-economic award. These multiples are applied to the medical specials and floored by
// the flat BASE_INJURY_VALUES above, so a soft-tissue case with substantial treatment is
// no longer valued at ~1x its bills. Wrongful death is driven by its base value, not a
// medical-specials multiple.
const GENERAL_DAMAGES_MULTIPLIERS: Record<InjuryType, number> = {
  SOFT_TISSUE: 1.5,
  DISC_BULGE: 2,
  DISC_HERNIATION: 2.5,
  RADICULOPATHY: 3,
  TBI_MILD: 3,
  TBI_MODERATE: 4,
  TBI_SEVERE: 5,
  BROKEN_BONE: 2.5,
  SPINAL_CORD: 5,
  WRONGFUL_DEATH: 0,
}

const VENUE_MODIFIERS: Record<string, number> = {
  'los angeles': 1.15,
  orange: 1.05,
  riverside: 0.95,
  'san francisco': 1.12,
  'san diego': 1.04,
  alameda: 1.08,
  sacramento: 1.0,
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function money(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.round(value / 1000) * 1000)
}

function textBlob(facts: Record<string, any>, evidenceFiles: EvidenceLike[] = []) {
  return [
    facts?.incident?.narrative,
    facts?.caseSubtype,
    facts?.incident?.caseSubtype,
    ...(Array.isArray(facts?.incidentTags) ? facts.incidentTags : []),
    ...(Array.isArray(facts?.incident?.incidentTags) ? facts.incident.incidentTags : []),
    ...evidenceFiles.flatMap((file) => [file.category, file.originalName, file.aiClassification, file.aiSummary]),
  ].filter(Boolean).join(' ').toLowerCase()
}

function hasEvidence(evidenceFiles: EvidenceLike[], category: string, aliases: string[] = []) {
  const needles = [category, ...aliases].map((item) => item.toLowerCase())
  return evidenceFiles.some((file) => {
    const blob = `${file.category || ''} ${file.originalName || ''} ${file.aiClassification || ''} ${file.aiSummary || ''}`.toLowerCase()
    return needles.some((needle) => blob.includes(needle))
  })
}

function countInjections(facts: Record<string, any>) {
  const treatment = Array.isArray(facts?.treatment) ? facts.treatment : []
  const procedureCount = treatment.filter((item: any) =>
    /injection|epidural|nerve|radiofrequency/i.test(`${item?.type || ''} ${item?.procedure || ''} ${item?.notes || ''}`)
  ).length
  const narrativeCount = (String(facts?.incident?.narrative || '').match(/injection|epidural/gi) || []).length
  return Math.max(procedureCount, narrativeCount)
}

function getSurgeryStatus(facts: Record<string, any>) {
  const treatment = Array.isArray(facts?.treatment) ? facts.treatment : []
  const explicit = treatment.find((item: any) => item?.type === 'surgery_status')?.status
  const narrative = String(facts?.incident?.narrative || '').toLowerCase()
  if (explicit) return String(explicit)
  if (/surgery performed|surgery completed|had surgery|underwent surgery/.test(narrative)) return 'completed'
  if (/surgery scheduled/.test(narrative)) return 'scheduled'
  if (/surgery recommended|recommended surgery/.test(narrative)) return 'recommended'
  return ''
}

function getPrimaryInjury(facts: Record<string, any>, blob: string): InjuryType {
  const claimType = String(facts?.claimType || '').toLowerCase()
  const injuries = Array.isArray(facts?.injuries) ? facts.injuries : []
  const diagnoses = injuries.flatMap((injury: any) => Array.isArray(injury?.diagnoses) ? injury.diagnoses : [])
  const diagnosisText = [...diagnoses, blob].join(' ').toLowerCase()

  if (claimType === 'wrongful_death' || /wrongful death|fatal|deceased|death/.test(diagnosisText)) return 'WRONGFUL_DEATH'
  if (/spinal cord|paraly/.test(diagnosisText)) return 'SPINAL_CORD'
  if (/severe tbi|severe traumatic brain/.test(diagnosisText)) return 'TBI_SEVERE'
  if (/moderate tbi|moderate traumatic brain/.test(diagnosisText)) return 'TBI_MODERATE'
  if (/tbi|traumatic brain|concussion/.test(diagnosisText)) return 'TBI_MILD'
  if (/fracture|broken bone|broken/.test(diagnosisText)) return 'BROKEN_BONE'
  if (/radiculopathy|radiating pain|nerve root/.test(diagnosisText)) return 'RADICULOPATHY'
  if (/herniation|herniated|disc herniation/.test(diagnosisText)) return 'DISC_HERNIATION'
  if (/disc bulge|bulging disc|bulge/.test(diagnosisText)) return 'DISC_BULGE'
  return 'SOFT_TISSUE'
}

export function calculateLiability(input: UnderwritingInput): LiabilityResult {
  const facts = input.facts
  const evidenceFiles = input.evidenceFiles || []
  const blob = textBlob(facts, evidenceFiles)
  const liability = facts?.liability || {}
  // Verified-content evidence set produced by case-recalculation. When present, credit evidence
  // from it (so a blank/unreadable upload does not raise liability via the settlement modifier).
  // Use the narrative — not file names — for self-described evidence to avoid filename self-credit.
  const evidenceSet = new Set<string>(Array.isArray(facts?.evidence) ? facts.evidence : [])
  const hasVerifiedEvidence = evidenceSet.size > 0
  const narrative = String(facts?.incident?.narrative || '').toLowerCase()
  const comparativeFaultPercent = Math.round(Number(liability.comparativeNegligence || 0) * 100) ||
    (liability.comparativeFault === 'yes' ? 35 : liability.comparativeFault === 'possibly' ? 15 : 0)
  const positives: string[] = []
  const negatives: string[] = []
  let score = 50

  if (liability.crashType === 'rear_end' || /rear[-\s]?end|hit from behind/.test(blob)) {
    score += 20
    positives.push('Rear-end facts')
  }
  if (liability.crashType === 'head_on' || /head[-\s]?on/.test(blob)) {
    score += 10
    positives.push('Head-on collision facts')
  }
  if (/red light|stop sign|failed to yield|traffic signal/.test(blob)) {
    score += 15
    positives.push('Traffic violation facts')
  }
  if (/dui|drunk|intoxicated|alcohol/.test(blob)) {
    score += 20
    positives.push('DUI or intoxication facts')
  }
  const policeReportPresent = evidenceSet.has('police_report') ||
    (!hasVerifiedEvidence && hasEvidence(evidenceFiles, 'police_report', ['incident_report'])) ||
    /police report|incident report/.test(narrative)
  if (policeReportPresent) {
    score += 10
    positives.push('Police or incident report')
  }
  if (/witness/.test(blob)) {
    score += 8
    positives.push('Witness evidence')
  }
  const photosPresent = evidenceSet.has('photos') ||
    Number(facts?.damages?.photo_count || 0) > 0 ||
    (!hasVerifiedEvidence && hasEvidence(evidenceFiles, 'photos', ['photo', 'image'])) ||
    /photo|picture|video/.test(narrative)
  if (photosPresent) {
    score += 5
    positives.push('Photos or video evidence')
  }
  if (comparativeFaultPercent > 0) {
    score -= comparativeFaultPercent
    negatives.push(`Possible comparative fault around ${comparativeFaultPercent}%`)
  }

  const normalized = clamp(score)
  const grade: LiabilityGrade = normalized >= 85 ? 'Very Strong' : normalized >= 70 ? 'Strong' : normalized >= 45 ? 'Moderate' : 'Weak'
  if (positives.length === 0) negatives.push('Liability facts need more support')

  return { score: normalized, grade, positives, negatives }
}

export function calculateSeverity(input: UnderwritingInput): SeverityResult {
  const facts = input.facts
  const blob = textBlob(facts, input.evidenceFiles)
  const primaryInjury = getPrimaryInjury(facts, blob)
  const surgeryStatus = getSurgeryStatus(facts)
  const injectionCount = countInjections(facts)
  const factors: string[] = [primaryInjury.replace(/_/g, ' ').toLowerCase()]
  let score = ({
    SOFT_TISSUE: 20,
    DISC_BULGE: 35,
    DISC_HERNIATION: 50,
    RADICULOPATHY: 55,
    TBI_MILD: 70,
    TBI_MODERATE: 82,
    TBI_SEVERE: 95,
    BROKEN_BONE: 60,
    SPINAL_CORD: 100,
    WRONGFUL_DEATH: 100,
  } satisfies Record<InjuryType, number>)[primaryInjury]

  if (surgeryStatus === 'recommended') {
    score += 15
    factors.push('surgery recommended')
  }
  if (surgeryStatus === 'scheduled' || surgeryStatus === 'completed') {
    score += 30
    factors.push('surgery scheduled or performed')
  }
  if (injectionCount === 1) {
    score += 5
    factors.push('one injection')
  } else if (injectionCount === 2) {
    score += 10
    factors.push('two injections')
  } else if (injectionCount >= 3) {
    score += 15
    factors.push('multiple injections')
  }

  const normalized = clamp(score)
  const tier = normalized >= 85 ? 'Severe' : normalized >= 70 ? 'Moderate-Severe' : normalized >= 45 ? 'Moderate' : normalized >= 25 ? 'Developing' : 'Soft Tissue'
  return { score: normalized, tier, primaryInjury, factors }
}

export function calculateTreatmentQuality(input: UnderwritingInput): TreatmentResult {
  const facts = input.facts
  const treatment = Array.isArray(facts?.treatment) ? facts.treatment : []
  const blob = textBlob(facts, input.evidenceFiles)
  const positives: string[] = []
  const negatives: string[] = []
  const treatmentDurationMonths = Number(facts?.treatmentProfile?.durationMonths || facts?.treatmentDurationMonths || 0) ||
    Math.min(12, treatment.length)
  let score = treatmentDurationMonths >= 12 ? 90
    : treatmentDurationMonths >= 6 ? 70
      : treatmentDurationMonths >= 3 ? 50
        : treatmentDurationMonths >= 1 ? 30
          : treatment.length > 0 ? 20
            : 10

  if (treatmentDurationMonths > 0) positives.push(`${treatmentDurationMonths} month treatment profile`)
  if (/pain management|epidural|injection|specialist|orthopedic|neurolog/.test(blob)) {
    score += 10
    positives.push('Specialist or pain-management care')
  }
  if (getSurgeryStatus(facts) === 'completed') {
    score += 10
    positives.push('Surgical treatment')
  }
  if (/major gap|large gap|stopped treating/.test(blob)) {
    score -= 25
    negatives.push('Major treatment gap')
  } else if (/gap/.test(blob)) {
    score -= 10
    negatives.push('Possible treatment gap')
  }
  if (treatment.length === 0) negatives.push('No treatment documented yet')

  const normalized = clamp(score)
  const grade = normalized >= 75 ? 'Strong' : normalized >= 50 ? 'Good' : normalized >= 25 ? 'Developing' : 'Weak'
  return { score: normalized, grade, positives, negatives }
}

export function calculateDocumentation(input: UnderwritingInput): DocumentationResult {
  const facts = input.facts
  const evidenceFiles = input.evidenceFiles || []
  const injuries = Array.isArray(facts?.injuries) ? facts.injuries : []
  const damages = facts?.damages || {}
  const positives: string[] = []
  const missing: string[] = []
  let score = 0

  // Prefer the verified-content evidence set from case-recalculation so unreadable/blank uploads
  // do not earn documentation credit. Fall back to label-based presence only when no verified
  // set exists yet (e.g. recalculation has not run for this assessment).
  const evidenceSet = new Set<string>(Array.isArray((facts as any)?.evidence) ? (facts as any).evidence : [])
  const hasVerifiedEvidence = evidenceSet.size > 0

  const medicalRecords = evidenceSet.has('medical_records') || injuries.length > 0 ||
    (!hasVerifiedEvidence && hasEvidence(evidenceFiles, 'medical_records'))
  const medicalBills = evidenceSet.has('medical_bills') || Number(damages.extracted_med_charges || 0) > 0 ||
    (!hasVerifiedEvidence && (hasEvidence(evidenceFiles, 'bills') || Number(damages.med_charges || damages.med_paid || damages.estimated_med_charges || 0) > 0))
  const policeReport = evidenceSet.has('police_report') ||
    (!hasVerifiedEvidence && hasEvidence(evidenceFiles, 'police_report', ['incident_report']))
  const photos = evidenceSet.has('photos') || Number(damages.photo_count || 0) > 0 ||
    (!hasVerifiedEvidence && hasEvidence(evidenceFiles, 'photos', ['photo', 'image']))
  const wageProof = Number(damages.extracted_wage_loss || 0) > 0 ||
    (!hasVerifiedEvidence && (hasEvidence(evidenceFiles, 'wage_loss', ['paystub', 'payroll']) || Number(damages.wage_loss || damages.estimated_wage_loss || 0) > 0))
  const dailyImpact = injuries.some((injury: any) => Array.isArray(injury?.lifestyleImpact) && injury.lifestyleImpact.length > 0)

  if (medicalRecords) { score += 25; positives.push('Medical records') } else missing.push('Medical records')
  if (medicalBills) { score += 20; positives.push('Medical bills') } else missing.push('Medical bills')
  if (policeReport) { score += 20; positives.push('Police or incident report') } else missing.push('Police or incident report')
  if (photos) { score += 10; positives.push('Photos') } else missing.push('Photos')
  if (wageProof) { score += 10; positives.push('Wage proof') } else missing.push('Wage proof')
  if (dailyImpact) { score += 15; positives.push('Daily impact statement') } else missing.push('Daily impact statement')

  // Surface uploads we received but could not read, so the plaintiff knows a clearer copy helps.
  if (Number(damages.evidence_unverified_count || 0) > 0) {
    missing.push('Re-upload unreadable documents (a clearer scan or photo)')
  }

  const normalized = clamp(score)
  const grade = normalized >= 80 ? 'Strong' : normalized >= 55 ? 'Good' : normalized >= 30 ? 'Developing' : 'Sparse'
  return { score: normalized, grade, positives, missing }
}

function getVenueModifier(county?: string | null) {
  const key = String(county || '').replace(/\s*county\s*$/i, '').trim().toLowerCase()
  return VENUE_MODIFIERS[key] ?? 1
}

function getFutureMedicalAdjusted(facts: Record<string, any>) {
  const damages = facts?.damages || {}
  const future = Number(damages.future_medical || damages.estimated_future_med_charges || 0)
  const surgeryStatus = getSurgeryStatus(facts)
  const multiplier = surgeryStatus === 'recommended' ? 0.8 : surgeryStatus === 'scheduled' || surgeryStatus === 'completed' ? 1 : 0.4
  return future * multiplier
}

export function calculateSettlement(input: UnderwritingInput, liability: LiabilityResult, severity: SeverityResult, treatment: TreatmentResult): SettlementResult {
  const facts = input.facts
  const damages = facts?.damages || {}
  const medicalBills = Number(damages.med_charges || damages.med_paid || damages.estimated_med_charges || 0)
  const lostWages = Number(damages.wage_loss || damages.estimated_wage_loss || 0)
  const outOfPocket = Number(damages.out_of_pocket || damages.estimated_out_of_pocket || damages.services || 0)
  const futureMedicalAdjusted = getFutureMedicalAdjusted(facts)
  const economicDamages: EconomicDamagesResult = {
    medicalBills: money(medicalBills),
    lostWages: money(lostWages),
    outOfPocket: money(outOfPocket),
    futureMedicalAdjusted: money(futureMedicalAdjusted),
    total: money(medicalBills + lostWages + outOfPocket + futureMedicalAdjusted),
  }
  const baseInjuryValue = BASE_INJURY_VALUES[severity.primaryInjury]
  const venueModifier = getVenueModifier(input.venueCounty)
  const liabilityModifier = Math.max(0.25, liability.score / 100)
  const treatmentModifier = 0.75 + (treatment.score / 100) * 0.5

  // Non-economic (pain & suffering) damages scale with the medical specials. Documented
  // procedures (injections/surgery) raise the multiplier because they signal a more painful,
  // invasive course of treatment. The flat per-injury base value acts as a floor so a case
  // with little/no billed treatment is not under-valued either.
  const medicalSpecials = economicDamages.medicalBills + economicDamages.futureMedicalAdjusted
  let generalDamagesMultiplier = GENERAL_DAMAGES_MULTIPLIERS[severity.primaryInjury]
  if (severity.factors.some((factor) => factor.includes('surgery'))) generalDamagesMultiplier += 1
  else if (severity.factors.some((factor) => factor.includes('injection'))) generalDamagesMultiplier += 0.5
  const generalDamages = Math.max(baseInjuryValue, medicalSpecials * generalDamagesMultiplier)

  const expected = (generalDamages + economicDamages.total) * venueModifier * liabilityModifier * treatmentModifier

  return {
    low: money(expected * 0.7),
    expected: money(expected),
    high: money(expected * 1.3),
    baseInjuryValue,
    economicDamages,
    venueModifier,
    liabilityModifier,
    treatmentModifier,
    formula: '(generalDamages + economicDamages) * venueModifier * liabilityModifier * treatmentModifier; generalDamages = max(baseInjuryValue, medicalSpecials * severityMultiplier)',
  }
}

function costForSeverity(severity: SeverityResult) {
  if (severity.primaryInjury === 'TBI_MILD' || severity.primaryInjury === 'TBI_MODERATE' || severity.primaryInjury === 'TBI_SEVERE') return 25000
  if (severity.factors.some((factor) => factor.includes('surgery'))) return 20000
  if (severity.factors.some((factor) => factor.includes('injection'))) return 12000
  if (['DISC_BULGE', 'DISC_HERNIATION', 'RADICULOPATHY'].includes(severity.primaryInjury)) return 8000
  return 5000
}

export function calculateAttorneyAcceptance(
  input: UnderwritingInput,
  settlement: SettlementResult,
  liability: LiabilityResult,
  severity: SeverityResult,
  documentation: DocumentationResult,
): AttorneyAcceptanceResult {
  const expectedFee = settlement.expected * 0.33
  const estimatedCost = costForSeverity(severity)
  const roi = estimatedCost > 0 ? expectedFee / estimatedCost : 0
  let probability = roi > 4 ? 95 : roi >= 3 ? 85 : roi >= 2 ? 70 : roi >= 1 ? 50 : 20
  if (liability.score < 45) probability -= 15
  if (documentation.score < 35) probability -= 10
  if (!input.facts?.insurance?.defendant_coverage_limits && !input.facts?.insurance?.policy_limit) probability -= 5
  probability = clamp(probability)

  const positives = [
    roi >= 2 && `Attorney ROI about ${roi.toFixed(1)}x`,
    liability.score >= 70 && 'Strong liability',
    severity.score >= 70 && 'Serious injury profile',
    documentation.score >= 55 && 'Useful documentation',
    input.venueCounty && `${input.venueCounty} venue`,
  ].filter(Boolean) as string[]
  const negatives = [
    roi < 2 && 'Expected fee may not justify litigation cost',
    liability.score < 45 && 'Liability risk',
    documentation.score < 35 && 'Documentation gaps',
    !input.facts?.insurance?.defendant_coverage_limits && !input.facts?.insurance?.policy_limit && 'Insurance recovery not confirmed',
  ].filter(Boolean) as string[]
  const grade = probability >= 85 ? 'Very Likely' : probability >= 70 ? 'Likely' : probability >= 50 ? 'Possible' : 'Low'

  return { probability, expectedFee: money(expectedFee), estimatedCost, roi: Number(roi.toFixed(2)), grade, positives, negatives }
}

function median(values: number[]) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function calculateAttorneyConsensus(reviews: AttorneyCaseReviewValue[]): AttorneyConsensusResult | null {
  if (reviews.length === 0) return null
  return {
    settlementLow: money(median(reviews.map((review) => review.settlementLow))),
    settlementExpected: money(median(reviews.map((review) => review.settlementExpected))),
    settlementHigh: money(median(reviews.map((review) => review.settlementHigh))),
    trialLow: money(median(reviews.map((review) => review.trialLow || 0).filter(Boolean))),
    trialHigh: money(median(reviews.map((review) => review.trialHigh || 0).filter(Boolean))),
    reviewCount: reviews.length,
    confidence: reviews.length >= 3 ? 'high' : reviews.length === 2 ? 'medium' : 'low',
  }
}

/**
 * Build a `value_bands` object whose settlement AND trial both derive from the
 * authoritative underwriting settlement, so the two can never disagree. The trial band is a
 * defensible risk-premium multiple of the settlement high (most cases settle; a verdict
 * carries added risk/exposure). This is the single reconciliation point shared by the
 * /predict route and the evidence-driven case recalculation, replacing the older behaviour
 * where the displayed settlement came from underwriting while the trial band kept a
 * divergent heuristic value anchored to the pre-underwriting settlement.
 */
export function reconcileValueBandsWithUnderwriting(legacyValueBands: any, settlement: SettlementResult) {
  const legacy = legacyValueBands || {}
  const trialLow = money(settlement.high * 1.35)
  const trialHigh = money(settlement.high * 3.25)
  return {
    ...legacy,
    p25: settlement.low,
    median: settlement.expected,
    p75: settlement.high,
    settlement: {
      ...(legacy.settlement || {}),
      p25: settlement.low,
      median: settlement.expected,
      p75: settlement.high,
      formula: settlement.formula,
      policyLimitConstrained: false,
    },
    trial: {
      ...(legacy.trial || {}),
      p25: trialLow,
      median: money((trialLow + trialHigh) / 2),
      p75: trialHigh,
      formula: 'settlement_high * trial_risk_premium (1.35x low, 3.25x high); most cases settle',
      policyLimitConstrained: false,
    },
    economics: {
      ...(legacy.economics || {}),
      medicalBills: settlement.economicDamages.medicalBills,
      lostWages: settlement.economicDamages.lostWages,
      outOfPocket: settlement.economicDamages.outOfPocket,
      futureMedicalAdjusted: settlement.economicDamages.futureMedicalAdjusted,
      economicDamages: settlement.economicDamages.total,
      baseInjuryValue: settlement.baseInjuryValue,
    },
  }
}

export function underwriteCase(input: UnderwritingInput): UnderwritingResult {
  const facts = input.facts || {}
  const liability = calculateLiability(input)
  const severity = calculateSeverity(input)
  const treatment = calculateTreatmentQuality(input)
  const documentation = calculateDocumentation(input)
  const settlement = calculateSettlement(input, liability, severity, treatment)
  const attorneyAcceptance = calculateAttorneyAcceptance(input, settlement, liability, severity, documentation)
  const caseStrength = clamp(
    liability.score * 0.25 +
    severity.score * 0.25 +
    treatment.score * 0.15 +
    documentation.score * 0.15 +
    attorneyAcceptance.probability * 0.2
  )

  return {
    modelVersion: 'ca-pi-underwriting-v1',
    normalizedCase: {
      caseType: input.claimType,
      accidentSubtype: facts?.caseSubtype || facts?.incident?.caseSubtype || facts?.intakeData?.caseTaxonomy?.caseSubtype,
      county: input.venueCounty,
      incidentDate: facts?.incident?.date || null,
    },
    liability,
    severity,
    treatment,
    documentation,
    settlement,
    attorneyAcceptance,
    attorneyMatching: {
      practiceArea: input.claimType,
      venue: [input.venueCounty, input.venueState].filter(Boolean).join(', '),
      minimumMatchScore: attorneyAcceptance.probability >= 85 ? 80 : attorneyAcceptance.probability >= 70 ? 70 : 60,
      signals: [...attorneyAcceptance.positives, ...documentation.positives].slice(0, 5),
    },
    scores: {
      caseStrength,
      liability: liability.score,
      severity: severity.score,
      treatment: treatment.score,
      documentation: documentation.score,
      attorneyAcceptance: attorneyAcceptance.probability,
    },
  }
}

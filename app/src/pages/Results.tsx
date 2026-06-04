import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import {
  getAssessment,
  getAssessmentCommandCenter,
  predict,
  calculateSOL,
  associateAssessments,
  getEvidenceFiles,
  getSimilarCaseOutcomes,
  updateAssessment,
  getMedicalChronology,
  getCasePreparation,
  getPlaintiffMedicalReview,
  getSettlementBenchmarks,
  savePlaintiffMedicalReview,
  saveDamageEstimates,
  searchAttorneys,
  submitCaseForReview,
  type PlaintiffMedicalReviewEdit,
  type PlaintiffMedicalReviewPayload,
  type PlaintiffMedicalReviewStatus,
} from '../lib/api-plaintiff'
import ChatGPTAnalysis from '../components/ChatGPTAnalysis'
import { formatPercentage, formatCurrency } from '../lib/formatters'
import { ResultsPanelSkeleton } from '../components/PageSkeletons'
import PlaintiffCaseCommandCenter from '../components/PlaintiffCaseCommandCenter'
import PlaintiffMedicalChronology from '../components/PlaintiffMedicalChronology'
import { useLanguage } from '../contexts/LanguageContext'
import type { CaseCommandCenter } from '../lib/api'
import { loadPlaintiffSessionSummary } from '../hooks/usePlaintiffSessionSummary'
import { getStoredRole, hasValidAuthToken } from '../lib/auth'
import {
  AlertTriangle,
  CheckCircle,
  Calendar,
  ClipboardList,
  BarChart3,
  ChevronRight,
  ChevronDown,
  Star
} from 'lucide-react'

function initialPlaintiffLoggedInState(): boolean | null {
  try {
    if (typeof window === 'undefined') return null
    if (!hasValidAuthToken()) return false
    const role = getStoredRole()
    if (role === 'attorney' || role === 'admin') return false
    return true
  } catch {
    return false
  }
}

const ResultsSubmittedView = lazy(() =>
  import('../components/ResultsDeferredContent').then((module) => ({ default: module.ResultsSubmittedView }))
)
const ResultsReportDetails = lazy(() =>
  import('../components/ResultsDeferredContent').then((module) => ({ default: module.ResultsReportDetails }))
)

interface Assessment {
  id: string
  claimType: string
  venue?: { state: string; county?: string }
  venueState?: string
  venueCounty?: string
  status: string
  facts: any
  created_at: string
  submittedForReview?: boolean
  latest_prediction?: any
}

interface SimilarCase {
  id: string
  description: string
  venue: string
  injuryType: string
  medicalBills: number
  settlementAmount: number
  duration: string
  keyFactors: string[]
}

type ResultsTab = 'liability' | 'medical' | 'documents' | 'value' | 'attorney'

type TimelineEstimate = {
  label: string
  stage: string
  confidence: 'low' | 'medium' | 'high'
  drivers: string[]
}

function formatClaimTypeLabel(claimType?: string) {
  if (!claimType) return 'personal injury'
  const labels: Record<string, string> = {
    auto: 'auto accident',
    slip_and_fall: 'slip and fall',
    workplace: 'workplace injury',
    medmal: 'medical malpractice',
    dog_bite: 'dog bite',
    product: 'product liability',
    assault: 'assault',
    toxic: 'toxic exposure',
  }
  return labels[claimType] || claimType.replace(/_/g, ' ')
}

function formatCaseSubtypeLabel(caseSubtype?: string) {
  if (!caseSubtype) return ''
  const labels: Record<string, string> = {
    rideshare_accident: 'rideshare accident',
    truck_accident: 'truck accident',
    delivery_vehicle_accident: 'delivery vehicle accident',
    pedestrian_accident: 'pedestrian accident',
    bicycle_accident: 'bicycle accident',
    multi_vehicle_accident: 'multi-vehicle accident',
    rear_end_collision: 'rear-end collision',
    head_on_collision: 'head-on collision',
    left_turn_collision: 'left-turn collision',
    grocery_premises: 'grocery store premises case',
    restaurant_premises: 'restaurant premises case',
    apartment_premises: 'apartment premises case',
    hotel_premises: 'hotel premises case',
    workplace_injury: 'workplace injury',
    birth_injury: 'birth injury malpractice',
    nursing_home_abuse: 'nursing home abuse',
    negligent_security: 'negligent security',
    toxic_exposure: 'toxic exposure',
  }
  return labels[caseSubtype] || caseSubtype.replace(/_/g, ' ')
}

function formatVenueLabel(venueState?: string, venueCounty?: string) {
  const normalizedCounty = venueCounty
    ? /county/i.test(venueCounty) ? venueCounty : `${venueCounty} County`
    : ''
  const normalizedState = venueState === 'CA' ? 'CA' : venueState || ''
  return [normalizedCounty, normalizedState].filter(Boolean).join(', ')
}

function normalizeReportText(value?: string | null) {
  return (value ?? '')
    .replace(/\bnarrativ\b/gi, 'narrative')
    .trim()
}

function isLostWageEvidence(file: any) {
  const text = `${file?.category ?? ''} ${file?.originalName ?? ''} ${file?.aiClassification ?? ''} ${file?.aiSummary ?? ''}`.toLowerCase()
  return /\b(wage|wages|lost wages|payroll|pay stub|employer|income|earnings)\b/.test(text)
}

function isDamagesSummaryEvidence(file: any) {
  const text = `${file?.originalName ?? ''} ${file?.aiClassification ?? ''} ${file?.aiSummary ?? ''}`.toLowerCase()
  return /\b(damages summary|economic damages|total economic damages)\b/.test(text)
}

function parseJsonArrayValue(value?: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getDocumentProcessingLabel(file: any) {
  const latestJob = Array.isArray(file?.processingJobs) ? file.processingJobs[0] : null
  if (file?.processingStatus === 'failed' || latestJob?.status === 'failed') return 'Could not read'
  if (file?.processingStatus === 'processing' || latestJob?.status === 'running') return 'Reading document'
  if (file?.processingStatus === 'completed') {
    return file?.extractedData?.[0]?.isManualReview ? 'Needs review' : 'Extracted'
  }
  return 'Uploaded'
}

function normalizeExplainability(value: any) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  return Object.values(value).filter((item) => item && typeof item === 'object')
}

function getMissingDocAction(item: any, assessmentId?: string) {
  const label = String(item?.label ?? '').toLowerCase()
  if (label.includes('hipaa')) {
    const returnPath = assessmentId ? `/results/${assessmentId}` : '/results'
    return {
      label: 'Complete HIPAA authorization',
      to: `/hipaa-authorization?return=${encodeURIComponent(returnPath)}`,
    }
  }

  const uploadLabel = item?.label ? `Upload ${String(item.label).toLowerCase()}` : 'Upload document'
  return {
    label: uploadLabel,
    to: assessmentId ? `/evidence-upload/${assessmentId}` : '/evidence-upload',
  }
}

function getResponseBadge(attorney: any) {
  return attorney.responseBadge || ((attorney.responseTimeHours || 24) <= 8 ? 'Same-day replies' : 'Replies within 24h')
}

function getAttorneyPracticePreview(
  attorney: any,
  context?: {
    venueState?: string
    venueCounty?: string
  }
) {
  const specialties = Array.isArray(attorney.specialties) ? attorney.specialties.filter(Boolean) : []
  const venues = Array.isArray(attorney.venues) ? attorney.venues.filter(Boolean) : []
  const localVenue = formatVenueLabel(context?.venueState, context?.venueCounty)
  const location = localVenue || attorney.law_firm?.state || venues[0]
  const pieces = [
    specialties.slice(0, 2).map((value: string) => formatClaimTypeLabel(value)).join(' + '),
    location ? `${localVenue ? 'Serves' : 'Practices in'} ${location}` : '',
    attorney.yearsExperience ? `${attorney.yearsExperience}+ years experience` : '',
  ].filter(Boolean)

  return pieces.join(' • ')
}

function getAttorneyWhyMatched(
  attorney: any,
  context?: {
    assessmentClaimType?: string
    venueState?: string
    venueCounty?: string
  }
) {
  const specialty = context?.assessmentClaimType
    ? formatClaimTypeLabel(context.assessmentClaimType)
    : Array.isArray(attorney.specialties) && attorney.specialties[0]
      ? formatClaimTypeLabel(attorney.specialties[0])
      : 'similar cases'
  const venue = formatVenueLabel(context?.venueState, context?.venueCounty)
    || attorney.law_firm?.state
    || (Array.isArray(attorney.venues) ? attorney.venues[0] : '')
  return `Why matched: strong for ${specialty} matters${venue ? ` in ${venue}` : ''}.`
}

function getAttorneyRecommendationReasons(
  attorney: any,
  context?: {
    assessmentClaimType?: string
    venueState?: string
    venueCounty?: string
  }
) {
  const reasons: string[] = []
  const specialty = context?.assessmentClaimType
    ? formatClaimTypeLabel(context.assessmentClaimType)
    : Array.isArray(attorney.specialties) && attorney.specialties[0]
      ? formatClaimTypeLabel(attorney.specialties[0])
      : ''
  const venue = formatVenueLabel(context?.venueState, context?.venueCounty)
    || attorney.law_firm?.state
    || (Array.isArray(attorney.venues) ? attorney.venues[0] : '')

  if (specialty) reasons.push(`Handles ${specialty} cases`)
  if (venue) reasons.push(`Serves ${venue}`)
  if ((attorney.responseTimeHours || 24) <= 8 || attorney.responseBadge) reasons.push(getResponseBadge(attorney))
  if (attorney.yearsExperience) reasons.push(`${attorney.yearsExperience}+ years of experience`)
  if ((attorney.averageRating || attorney.rating || 0) > 0) reasons.push(`${(attorney.averageRating || attorney.rating || 0).toFixed(1)} average rating`)

  return reasons.length > 0 ? reasons.slice(0, 3) : [getAttorneyWhyMatched(attorney, context)]
}

function buildTimelineEstimate(params: {
  claimType?: string
  missingDocCount: number
  treatmentGapCount: number
  hasTreatment: boolean
  evidenceCount: number
  severityLevel?: number
  chronologyCount: number
}): TimelineEstimate {
  const ranges: Record<string, [number, number]> = {
    auto: [6, 12],
    slip_and_fall: [8, 14],
    workplace: [6, 12],
    medmal: [18, 30],
    dog_bite: [5, 10],
    product: [12, 24],
    assault: [8, 16],
    toxic: [18, 36],
  }
  const [baseMin, baseMax] = ranges[params.claimType || ''] || [8, 16]
  const missingDocPenalty = params.missingDocCount >= 4 ? 4 : params.missingDocCount >= 2 ? 2 : params.missingDocCount === 1 ? 1 : 0
  const treatmentGapPenalty = params.treatmentGapCount > 0 ? 2 : 0
  const noTreatmentPenalty = params.hasTreatment ? 0 : 2
  const severeCasePenalty = (params.severityLevel || 0) >= 3 ? 4 : 0
  const lowEvidencePenalty = params.evidenceCount === 0 ? 2 : 0
  const chronologyBonus = params.chronologyCount >= 3 ? -1 : 0

  const minMonths = Math.max(3, baseMin + missingDocPenalty + treatmentGapPenalty + noTreatmentPenalty + chronologyBonus)
  const maxMonths = Math.max(
    minMonths + 2,
    baseMax + missingDocPenalty + treatmentGapPenalty + noTreatmentPenalty + severeCasePenalty + lowEvidencePenalty
  )

  const drivers: string[] = []
  if (params.claimType === 'medmal') drivers.push('Medical malpractice claims usually take longer because expert review is often needed.')
  if (params.missingDocCount > 0) drivers.push(`${params.missingDocCount} missing document${params.missingDocCount === 1 ? '' : 's'} may delay attorney review and demand preparation.`)
  if (!params.hasTreatment) drivers.push('No treatment has been documented yet, which usually slows valuation and negotiation.')
  if (params.treatmentGapCount > 0) drivers.push('Treatment gaps can extend investigation because attorneys and insurers will ask follow-up questions.')
  if (drivers.length === 0) drivers.push('Your file looks organized enough for a more typical pre-litigation timeline.')

  const confidence: TimelineEstimate['confidence'] =
    params.missingDocCount === 0 && params.evidenceCount >= 2
      ? 'high'
      : params.missingDocCount <= 2
        ? 'medium'
        : 'low'

  const stage =
    params.missingDocCount > 0
      ? 'Document collection'
      : params.hasTreatment
        ? 'Attorney-review ready'
        : 'Early intake'

  return {
    label: `${minMonths}-${maxMonths} months`,
    stage,
    confidence,
    drivers
  }
}

function getBaseCaseTypeRange(claimType?: string) {
  const ranges: Record<string, {
    label: string
    range: string
    floor: string
    why: string
    examples: string[]
  }> = {
    auto: {
      label: 'Auto accident',
      range: '$15,000 - $75,000',
      floor: 'Starts in the standard personal-injury range.',
      why: 'Auto cases often have clearer incident timing, insurance coverage, police reports, vehicle damage, and treatment records. The range can move up quickly when imaging, injections, surgery, commercial coverage, or serious wage loss appear.',
      examples: ['Soft-tissue soreness with limited treatment starts lower.', 'MRI-confirmed disc injury, injections, or surgery can move the case higher.', 'Clear rear-end liability and commercial coverage can materially improve review priority.'],
    },
    auto_accident: {
      label: 'Auto accident',
      range: '$15,000 - $75,000',
      floor: 'Starts in the standard personal-injury range.',
      why: 'Auto cases often have clearer incident timing, insurance coverage, police reports, vehicle damage, and treatment records. The range can move up quickly when imaging, injections, surgery, commercial coverage, or serious wage loss appear.',
      examples: ['Soft-tissue soreness with limited treatment starts lower.', 'MRI-confirmed disc injury, injections, or surgery can move the case higher.', 'Clear rear-end liability and commercial coverage can materially improve review priority.'],
    },
    slip_and_fall: {
      label: 'Slip and fall',
      range: '$12,000 - $60,000',
      floor: 'Starts slightly lower until notice and hazard proof are clear.',
      why: 'Premises cases depend heavily on proving the property owner knew or should have known about the hazard. Photos, incident reports, witness statements, and medical records can move the case out of the lower baseline.',
      examples: ['A fall with no photos or witnesses starts cautiously.', 'Fractures, surgery, or visible hazard evidence can raise the range.', 'A store incident report or video preservation can improve liability confidence.'],
    },
    premises: {
      label: 'Premises liability',
      range: '$12,000 - $60,000',
      floor: 'Starts slightly lower until notice and hazard proof are clear.',
      why: 'Premises cases depend heavily on proving the property owner knew or should have known about the hazard. Photos, incident reports, witness statements, and medical records can move the case out of the lower baseline.',
      examples: ['A fall with no photos or witnesses starts cautiously.', 'Fractures, surgery, or visible hazard evidence can raise the range.', 'A store incident report or video preservation can improve liability confidence.'],
    },
    dog_bite: {
      label: 'Dog bite',
      range: '$20,000 - $90,000',
      floor: 'Starts higher when liability and visible injury are documented.',
      why: 'Dog bite cases can have strong liability rules and visible damages. Photos, scarring, infection, nerve injury, and plastic surgery recommendations can push the baseline higher.',
      examples: ['Minor puncture wounds without scarring stay closer to the lower range.', 'Facial injuries, permanent scars, or child victims may increase value.', 'Animal-control reports and photos are especially important.'],
    },
    medmal: {
      label: 'Medical malpractice',
      range: '$50,000 - $250,000+',
      floor: 'Starts higher, but only after expert-support risk is considered.',
      why: 'Medical malpractice matters are more expensive and harder to prove. The baseline is higher because injuries may be severe, but the case needs records, causation analysis, and often expert review before attorneys can value it confidently.',
      examples: ['A poor outcome alone does not create a strong case.', 'Clear deviation from standard care plus serious harm can increase value.', 'Complete medical records and chronology are critical before attorney review.'],
    },
    nursing_home_abuse: {
      label: 'Nursing home abuse',
      range: '$50,000 - $250,000+',
      floor: 'Starts higher when neglect, injury, and facility responsibility are documented.',
      why: 'Elder-care cases often involve serious harm, vulnerable plaintiffs, regulatory issues, and facility records. The baseline depends on medical proof, staffing/fall records, photos, and whether neglect caused the injury.',
      examples: ['Pressure sores, falls, dehydration, or medication errors need records.', 'Severe injury or death can move the case into a higher band.', 'Facility charting and photos are key evidence.'],
    },
    wrongful_death: {
      label: 'Wrongful death',
      range: '$100,000 - $500,000+',
      floor: 'Starts in a high-severity band because the claimed harm is catastrophic.',
      why: 'Wrongful death cases involve the highest damages category, but valuation still depends on liability, causation, available insurance, beneficiaries, economic losses, and supporting records.',
      examples: ['Clear liability and strong insurance can materially increase value.', 'Causation disputes can reduce confidence.', 'Beneficiary and economic-loss documentation is important.'],
    },
    product: {
      label: 'Product liability',
      range: '$25,000 - $150,000+',
      floor: 'Starts above ordinary injury cases when defect proof is plausible.',
      why: 'Product cases depend on proving a defective product, warnings issue, or design/manufacturing problem. The baseline grows with preserved product evidence, serious injury, similar incidents, and expert support.',
      examples: ['Preserving the product is often critical.', 'Burns, fractures, surgery, or permanent harm can raise value.', 'Manufacturer identity and purchase records matter.'],
    },
  }

  return ranges[claimType || ''] || {
    label: formatClaimTypeLabel(claimType),
    range: '$10,000 - $75,000',
    floor: 'Starts in a general personal-injury baseline until the facts are more specific.',
    why: 'The system begins with a broad injury-case range, then adjusts based on liability, injury severity, treatment, evidence, venue, insurance, and missing documents.',
    examples: ['Clear liability improves confidence.', 'Objective medical proof can raise the range.', 'Missing records keep the estimate conservative.'],
  }
}

function getLiabilityModifierExplanation(params: {
  liabilityScore: number
  comparativeFaultPercent: number
}) {
  if (params.liabilityScore >= 0.7 && params.comparativeFaultPercent < 20) {
    return {
      label: 'Clearer liability',
      effect: 'Lower fault discount',
      range: '0-10% liability discount',
      explanation: 'When fault appears clearer, the model does not need to discount the case as heavily for disputed responsibility.',
    }
  }

  if (params.liabilityScore >= 0.4) {
    return {
      label: 'Mixed liability',
      effect: 'Moderate fault discount',
      range: '15-30% liability discount',
      explanation: 'When fault is partly unclear or shared fault may be argued, the model keeps more risk in the estimate.',
    }
  }

  return {
    label: 'Unclear liability',
    effect: 'Higher fault discount',
    range: '35-50% liability discount',
    explanation: 'When fault is hard to prove, the model treats the case more conservatively because the claim may be disputed.',
  }
}

function getInjuryTreatmentModifierExplanation(params: {
  severityLevel?: number
  hasTreatment: boolean
  chronologyCount: number
  treatmentGapCount: number
}) {
  if ((params.severityLevel ?? 0) >= 3) {
    return {
      label: 'High severity',
      effect: 'Upward severity modifier',
      range: 'Higher value band',
      explanation: 'Serious injuries, escalation of care, surgery recommendations, or lasting impairment can move the case above the starting category range.',
    }
  }

  if (params.hasTreatment && params.chronologyCount >= 2 && params.treatmentGapCount === 0) {
    return {
      label: 'Documented treatment',
      effect: 'Moderate upward support',
      range: 'Stronger causation support',
      explanation: 'Consistent treatment makes the injury story easier to connect to the incident and reduces causation uncertainty.',
    }
  }

  if (params.treatmentGapCount > 0) {
    return {
      label: 'Treatment gaps',
      effect: 'Confidence reduction',
      range: 'Wider / more cautious range',
      explanation: 'Gaps in treatment can cause insurers or attorneys to question injury severity, causation, or continuity of symptoms.',
    }
  }

  return {
    label: 'Early treatment picture',
    effect: 'Limited severity support',
    range: 'Conservative until records improve',
    explanation: 'Without a clear treatment timeline, the model avoids overstating value until records, bills, or medical events are confirmed.',
  }
}

function getEvidenceModifierExplanation(confidence: string) {
  if (confidence === 'Very high') {
    return {
      label: 'Strong document support',
      effect: 'Narrower confidence range',
      range: 'Higher confidence',
      explanation: 'Police reports, medical records, bills, photos, or other supporting files make the estimate more grounded and less speculative.',
    }
  }

  if (confidence === 'High') {
    return {
      label: 'Good document support',
      effect: 'Improved confidence',
      range: 'Moderate narrowing',
      explanation: 'The file has useful evidence, but additional records may still refine the value range.',
    }
  }

  if (confidence === 'Medium') {
    return {
      label: 'Partial document support',
      effect: 'Wider range',
      range: 'More uncertainty',
      explanation: 'Some evidence is available, but missing medical records, bills, photos, or liability documents may still change the estimate.',
    }
  }

  return {
    label: 'Intake-first estimate',
    effect: 'Wide confidence range',
    range: 'Most conservative confidence',
    explanation: 'When the case is based mostly on intake answers, the model keeps the range wider because documents have not confirmed the key facts yet.',
  }
}

type ConsumerConfidenceLevel = 'Low' | 'Medium' | 'High'

function getConsumerConfidenceLevel(score: number): ConsumerConfidenceLevel {
  if (score >= 70) return 'High'
  if (score >= 40) return 'Medium'
  return 'Low'
}

function formatStrengthLabel(level: ConsumerConfidenceLevel): string {
  return level === 'Medium' ? 'Moderate' : level
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function scoreLabel(score: number, labels: { high: string; medium: string; low: string }) {
  if (score >= 75) return labels.high
  if (score >= 45) return labels.medium
  return labels.low
}

function formatMatchScore(value: unknown, fallback: number) {
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) {
    return `${numeric > 1 ? Math.round(numeric) : Math.round(numeric * 100)}%`
  }
  return `${fallback}%`
}

function buildAttorneyAcceptanceProbability(params: {
  settlementHigh: number
  settlementLow: number
  liabilityPercent: number
  severityPercent: number
  completenessPercent: number
  hasMedicalRecords: boolean
  hasMedicalBills: boolean
  policyLimitConstrained: boolean
}) {
  const expectedSettlement = Math.max(params.settlementLow, params.settlementHigh * 0.55)
  const expectedFee = expectedSettlement * 0.33
  const estimatedCost = params.severityPercent >= 80 ? 15000 : params.severityPercent >= 60 ? 10000 : 6500
  const feeCostSpread = expectedFee - estimatedCost
  const economicsScore = feeCostSpread >= 25000 ? 30 : feeCostSpread >= 12000 ? 23 : feeCostSpread >= 4000 ? 15 : 6
  const liabilityScore = params.liabilityPercent >= 75 ? 24 : params.liabilityPercent >= 55 ? 16 : 7
  const severityScore = params.severityPercent >= 75 ? 18 : params.severityPercent >= 55 ? 12 : 6
  const documentationScore = Math.min(14, Math.round(params.completenessPercent * 0.14))
  const documentBonus = (params.hasMedicalRecords ? 6 : 0) + (params.hasMedicalBills ? 4 : 0)
  const policyPenalty = params.policyLimitConstrained ? 6 : 0

  return clampPercent(8 + economicsScore + liabilityScore + severityScore + documentationScore + documentBonus - policyPenalty)
}

function hasErTreatmentReported(treatment: any[], parsedFacts: any): boolean {
  const medicalTreatment = parsedFacts?.medicalTreatment || parsedFacts?.caseAcceleration?.medicalTreatment
  if (Array.isArray(medicalTreatment) && medicalTreatment.includes('er')) return true
  return treatment.some((item) => {
    const type = String(item?.type || '').toLowerCase()
    const provider = String(item?.provider || item?.facility || item?.location || '').toLowerCase()
    return type === 'er' || type.includes('emergency') || provider.includes('emergency') || /\ber\b/.test(provider)
  })
}

function hasMriReported(treatment: any[], structuredValuationDrivers: any): boolean {
  const imaging = structuredValuationDrivers?.imaging || []
  if (Array.isArray(imaging) && imaging.includes('mri')) return true
  return treatment.some((item) =>
    (item?.type === 'imaging' && item?.imaging === 'mri') ||
    item?.type === 'mri' ||
    String(item?.imaging || '').includes('mri'),
  )
}

function isRearEndCollision(parsedFacts: any, liabilityFactors: string[]): boolean {
  const crashType = parsedFacts?.liability?.crashType || parsedFacts?.auto?.crashType
  if (crashType === 'rear_end') return true
  const narrative = String(parsedFacts?.incident?.narrative || '').toLowerCase()
  if (/\b(rear[-\s]?end|hit from behind)\b/.test(narrative)) return true
  return liabilityFactors.some((factor) => /rear[-\s]?end/i.test(factor))
}

function buildEstimateConfidenceScore(params: {
  hasMedicalRecords: boolean
  hasMedicalBills: boolean
  hasPoliceReport: boolean
  hasTreatment: boolean
  hasErTreatment: boolean
  hasMri: boolean
  hasInjuryPhotos: boolean
  hasWageLossProof: boolean
  effectiveEvidenceCount: number
  liabilityOutlook: string
  readinessPercent: number
}): number {
  let score = 18
  if (params.hasTreatment) score += 12
  if (params.hasErTreatment) score += 8
  if (params.hasMri) score += 10
  if (params.hasMedicalRecords) score += 18
  if (params.hasMedicalBills) score += 14
  if (params.hasPoliceReport) score += 12
  if (params.hasInjuryPhotos) score += 6
  if (params.hasWageLossProof) score += 6
  if (params.liabilityOutlook === 'strong') score += 10
  else if (params.liabilityOutlook === 'moderate') score += 5
  if (params.effectiveEvidenceCount >= 2) score += 4
  if (params.readinessPercent >= 70) score += 6
  return Math.min(100, Math.max(8, score))
}

function buildLitigationReadinessScore(params: {
  hasMedicalRecords: boolean
  hasMedicalBills: boolean
  hasPoliceReport: boolean
  hasTreatment: boolean
  hasNarrative: boolean
  hasInjuryPhotos: boolean
  hasWageLossProof: boolean
}): number {
  const items = [
    params.hasMedicalRecords,
    params.hasMedicalBills,
    params.hasPoliceReport,
    params.hasTreatment,
    params.hasNarrative,
    params.hasInjuryPhotos,
    params.hasWageLossProof,
  ]
  return Math.round((items.filter(Boolean).length / items.length) * 100)
}

function buildAttorneyInterestLevel(params: {
  viability: number
  liabilityOutlook: string
  hasErTreatment: boolean
  hasMri: boolean
  isRearEnd: boolean
  hasMedicalRecords: boolean
  hasTreatment: boolean
}): ConsumerConfidenceLevel {
  let points = 0
  if (params.viability >= 0.65) points += 2
  else if (params.viability >= 0.45) points += 1
  if (params.liabilityOutlook === 'strong') points += 2
  else if (params.liabilityOutlook === 'moderate') points += 1
  if (params.hasErTreatment || params.hasMri) points += 1
  if (params.isRearEnd) points += 1
  if (params.hasMedicalRecords) points += 1
  if (params.hasTreatment) points += 1
  if (!params.hasMedicalRecords) points -= 1
  if (points >= 5) return 'High'
  if (points >= 3) return 'Medium'
  return 'Low'
}

function getReadinessStatusLabel(score: number): string {
  if (score >= 70) return 'Well positioned'
  if (score >= 45) return 'Needs strengthening'
  return 'Early stage'
}

function getTreatmentStrengthLabel(params: {
  hasErTreatment: boolean
  hasMri: boolean
  treatmentCount: number
  chronologyCount: number
}): ConsumerConfidenceLevel {
  if (params.hasMri || params.chronologyCount >= 3) return 'High'
  if (params.hasErTreatment || params.treatmentCount >= 2) return 'Medium'
  if (params.treatmentCount > 0) return 'Medium'
  return 'Low'
}

function upsertMedicalReviewEdit(
  edits: PlaintiffMedicalReviewEdit[],
  eventId: string,
  field: keyof PlaintiffMedicalReviewEdit,
  value: string | boolean,
) {
  const next = [...edits]
  const index = next.findIndex((item) => item.eventId === eventId)
  const current = index >= 0 ? next[index] : { eventId }
  const updated = {
    ...current,
    [field]: value,
  } as PlaintiffMedicalReviewEdit

  if (index >= 0) next[index] = updated
  else next.push(updated)

  return next
}

export default function Results() {
  const { t } = useLanguage()
  const { assessmentId } = useParams<{ assessmentId: string }>()
  const [searchParams] = useSearchParams()
  const reviewRequested = searchParams.get('review') === '1'
  const resolvedAssessmentId =
    assessmentId && assessmentId !== 'undefined' && assessmentId !== 'null'
      ? assessmentId
      : undefined
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [prediction, setPrediction] = useState<any>(null)
  const [sol, setSol] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(initialPlaintiffLoggedInState)
  const [resubmitLoading, setResubmitLoading] = useState(false)
  const [resubmitMessage, setResubmitMessage] = useState<string | null>(null)
  const [evidenceCount, setEvidenceCount] = useState(0)
  const [evidenceFiles, setEvidenceFiles] = useState<any[]>([])
  const [similarCases, setSimilarCases] = useState<SimilarCase[]>([])
  const [templateCopied, setTemplateCopied] = useState(false)
  const [wageLossForm, setWageLossForm] = useState({
    employerName: '',
    supervisorContact: '',
    positionTitle: '',
    datesMissed: '',
    reasonMissed: '',
    hourlyRate: '',
    typicalHours: '',
    notes: ''
  })
  const [wageLossHydrated, setWageLossHydrated] = useState(false)
  const [wageLossSaving, setWageLossSaving] = useState(false)
  const [wageLossStatus, setWageLossStatus] = useState<string | null>(null)
  const [damageEstimateHydrated, setDamageEstimateHydrated] = useState(false)
  const [damageEstimateForm, setDamageEstimateForm] = useState({
    medicalBillsEstimate: '',
    lostWagesEstimate: '',
    outOfPocketEstimate: '',
    propertyDamageEstimate: '',
    futureTreatmentEstimate: '',
    notes: '',
  })
  const [damageEstimateSaving, setDamageEstimateSaving] = useState(false)
  const [damageEstimateStatus, setDamageEstimateStatus] = useState<string | null>(null)
  const [coachQuestion, setCoachQuestion] = useState('')
  const [coachAnswer, setCoachAnswer] = useState<string | null>(null)
  const [medicalChronology, setMedicalChronology] = useState<any[]>([])
  const [casePreparation, setCasePreparation] = useState<any>(null)
  const [settlementBenchmarks, setSettlementBenchmarks] = useState<any>(null)
  const [plaintiffMedicalReview, setPlaintiffMedicalReview] = useState<PlaintiffMedicalReviewPayload | null>(null)
  const [medicalReviewSaving, setMedicalReviewSaving] = useState(false)
  const [medicalReviewStatus, setMedicalReviewStatus] = useState<string | null>(null)
  const [medicalReviewError, setMedicalReviewError] = useState<string | null>(null)
  const [matchedAttorneys, setMatchedAttorneys] = useState<any[]>([])
  const [attorneySearchLoading, setAttorneySearchLoading] = useState(false)
  const [rankedAttorneyIds, setRankedAttorneyIds] = useState<string[]>([])
  const [autoReviewHandled, setAutoReviewHandled] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [caseSubmittedForReview, setCaseSubmittedForReview] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [saveReviewPromptOpen, setSaveReviewPromptOpen] = useState(false)
  const [reviewPromptDismissed, setReviewPromptDismissed] = useState(false)
  const [attorneyInterestWhyOpen, setAttorneyInterestWhyOpen] = useState(false)
  const [contactForm, setContactForm] = useState({ firstName: '', email: '', phone: '', preferredContactMethod: 'phone' as 'phone' | 'text' | 'email' })
  const [hipaaAuthorizationComplete, setHipaaAuthorizationComplete] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('consent_read_hipaa') === 'true'
  )
  const [sendHipaaConsent, setSendHipaaConsent] = useState(false)
  const [contactFormError, setContactFormError] = useState<string | null>(null)
  const [commandCenter, setCommandCenter] = useState<CaseCommandCenter | null>(null)
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>('attorney')
  const medicalReviewRef = useRef<HTMLDivElement | null>(null)
  const fullReportDetailsRef = useRef<HTMLDetailsElement | null>(null)

  const parsedFacts = (() => {
    if (typeof assessment?.facts === 'string') {
      try {
        return JSON.parse(assessment.facts)
      } catch {
        return {}
      }
    }
    return assessment?.facts || {}
  })()

  const venueState = assessment?.venue?.state || assessment?.venueState || 'Unknown'
  const venueCounty = assessment?.venue?.county || assessment?.venueCounty
  const caseSubtype = parsedFacts?.caseSubtype || parsedFacts?.caseTaxonomy?.caseSubtype || parsedFacts?.intakeData?.caseTaxonomy?.caseSubtype
  const caseSnapshotClaimLabel = formatCaseSubtypeLabel(caseSubtype) || formatClaimTypeLabel(assessment?.claimType)
  const hasHipaaConsent = parsedFacts?.consents?.hipaa === true || hipaaAuthorizationComplete

  const refreshMatchedAttorneys = async () => {
    if (!assessment || !venueState) return []
    try {
      setAttorneySearchLoading(true)
      const data = await searchAttorneys({
        venue: venueState,
        claim_type: assessment.claimType,
        limit: 3
      })
      const list = (Array.isArray(data) ? data : (data?.attorneys ?? [])).slice(0, 3)
      setMatchedAttorneys(list)
      setRankedAttorneyIds(list.map((attorney: any) => attorney.id || attorney.attorney_id).filter(Boolean).slice(0, 3))
      return list
    } catch {
      setMatchedAttorneys([])
      setRankedAttorneyIds([])
      return []
    } finally {
      setAttorneySearchLoading(false)
    }
  }

  const openSendModal = async (medicalReviewStatusOverride?: PlaintiffMedicalReviewStatus) => {
    const currentMedicalReviewStatus = medicalReviewStatusOverride ?? plaintiffMedicalReview?.review.status ?? 'pending'
    if (currentMedicalReviewStatus === 'pending') {
      setMedicalReviewError('Review your treatment timeline before submitting. You can confirm it, make changes, or skip it for now.')
      openAnchoredResultsSection('#medical-story-review')
      return
    }

    if (isLoggedIn === false) {
      if (resolvedAssessmentId) localStorage.setItem('pending_assessment_id', resolvedAssessmentId)
      setSaveReviewPromptOpen(true)
      return
    }

    setContactFormError(null)
    setSendHipaaConsent(hasHipaaConsent)
    if (isLoggedIn) {
      loadPlaintiffSessionSummary().then((session) => {
        const user = session.user
        setContactForm(prev => ({
          firstName: user?.firstName || '',
          email: user?.email || '',
          phone: user?.phone || '',
          preferredContactMethod: prev.preferredContactMethod
        }))
      }).catch(() => {})
    }
    setSendModalOpen(true)
    void refreshMatchedAttorneys()
  }

  const rankedAttorneyCards = rankedAttorneyIds
    .map((attorneyId) => matchedAttorneys.find((attorney) => (attorney.id || attorney.attorney_id) === attorneyId))
    .filter(Boolean)

  const moveRankedAttorney = (attorneyId: string, direction: -1 | 1) => {
    setRankedAttorneyIds((current) => {
      const index = current.indexOf(attorneyId)
      const targetIndex = index + direction
      if (index === -1 || targetIndex < 0 || targetIndex >= current.length) {
        return current
      }
      const next = [...current]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  const persistPlaintiffMedicalReview = async (options?: {
    status?: 'pending' | 'confirmed' | 'skipped'
    successMessage?: string
  }) => {
    if (!resolvedAssessmentId || !plaintiffMedicalReview) return
    try {
      setMedicalReviewSaving(true)
      setMedicalReviewError(null)
      setMedicalReviewStatus(null)
      const nextReview = await savePlaintiffMedicalReview(resolvedAssessmentId, {
        status: options?.status,
        edits: plaintiffMedicalReview?.review?.edits ?? [],
      })
      setPlaintiffMedicalReview(nextReview)
      setMedicalChronology(Array.isArray(nextReview.chronology) ? nextReview.chronology : [])
      setMedicalReviewStatus(
        options?.successMessage ||
          (options?.status === 'confirmed'
            ? 'Your medical story is confirmed.'
            : options?.status === 'skipped'
              ? 'You can still send your case now, and attorneys can follow up if needed.'
              : 'Your medical-story updates were saved.')
      )
      if (options?.status === 'confirmed' || options?.status === 'skipped') {
        setActiveResultsTab('attorney')
        window.setTimeout(() => {
          document.getElementById('attorney-handoff')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          if (reviewRequested) {
            void openSendModal(options.status)
          }
        }, 100)
      }
    } catch (error: any) {
      setMedicalReviewError(error?.response?.data?.error || 'We could not save your medical-story review. Please try again.')
    } finally {
      setMedicalReviewSaving(false)
    }
  }

  const handleMedicalReviewEditChange = (
    eventId: string,
    field: keyof PlaintiffMedicalReviewEdit,
    value: string | boolean,
  ) => {
    setMedicalReviewStatus(null)
    setMedicalReviewError(null)
    setPlaintiffMedicalReview((current) => {
      if (!current) return current
      return {
        ...current,
        review: {
          ...(current.review ?? {}),
          status: 'pending',
          confirmedAt: undefined,
          skippedAt: undefined,
          edits: upsertMedicalReviewEdit(current?.review?.edits ?? [], eventId, field, value),
        },
      }
    })
  }

  const handleSubmitForReview = async () => {
    if (!resolvedAssessmentId) return
    const { firstName, email, phone, preferredContactMethod } = contactForm
    if (!firstName?.trim()) {
      setContactFormError('First name is required')
      return
    }
    if (!email?.trim()) {
      setContactFormError('Email is required')
      return
    }
    if (!phone?.trim()) {
      setContactFormError('Phone number is required')
      return
    }
    let selectedRankedAttorneyIds = rankedAttorneyIds
    if (attorneySearchLoading) {
      setContactFormError('Please wait while we load your attorney matches.')
      return
    }
    if (selectedRankedAttorneyIds.length === 0) {
      const refreshedMatches = await refreshMatchedAttorneys()
      if (refreshedMatches.length > 0) {
        selectedRankedAttorneyIds = refreshedMatches
          .map((attorney: any) => attorney.id || attorney.attorney_id)
          .filter(Boolean)
          .slice(0, 3)
      }
    }
    try {
      setSubmitLoading(true)
      setContactFormError(null)
      // Link case to user's account so it appears on their dashboard
      if (isLoggedIn) {
        try {
          await associateAssessments([resolvedAssessmentId])
        } catch (e) {
          console.warn('Could not associate case with account:', e)
        }
      }
      await submitCaseForReview(resolvedAssessmentId, {
        firstName: firstName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        preferredContactMethod,
        hipaa: isLoggedIn ? hasHipaaConsent || sendHipaaConsent : false,
        rankedAttorneyIds: selectedRankedAttorneyIds
      })
      setCaseSubmittedForReview(true)
      setSendModalOpen(false)
      // Store case ID so Dashboard can associate if needed (backup for API association)
      localStorage.setItem('pending_assessment_id', resolvedAssessmentId)
      if (isLoggedIn) {
        // Redirect signed-in users to dashboard with case param so they land on their case
        const target = `${window.location.origin}/dashboard?case=${resolvedAssessmentId}`
        window.location.replace(target)
      }
    } catch (err: any) {
      console.error('Failed to submit for review:', err)
      setContactFormError(err.response?.data?.error || 'Failed to submit. Please try again.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleResubmit = async () => {
    if (!resolvedAssessmentId) return
    try {
      setResubmitLoading(true)
      setResubmitMessage(null)
      const predictionData = await predict(resolvedAssessmentId)
      setPrediction(predictionData)
      setResubmitMessage('Case re-submitted. Results updated.')
    } catch (err: any) {
      setResubmitMessage(err.response?.data?.error || 'Failed to re-submit case')
    } finally {
      setResubmitLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    if (!assessment) return
    const payload = {
      assessment,
      prediction,
      sol
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `case-details-${assessment.id}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const associateAssessmentWithUser = async () => {
    if (resolvedAssessmentId && isLoggedIn) {
      try {
        await associateAssessments([resolvedAssessmentId])
        console.log('Assessment associated with user successfully')
      } catch (error) {
        console.error('Failed to associate assessment with user:', error)
      }
    }
  }

  useEffect(() => {
    if (!resolvedAssessmentId) return

    const loadData = async () => {
      try {
        setLoading(true)
        
        try {
          const session = await loadPlaintiffSessionSummary()
          setIsLoggedIn(!!session?.user)
        } catch {
          setIsLoggedIn(false)
        }
        
        // Load assessment
        const assessmentData = await getAssessment(resolvedAssessmentId)
        setAssessment(assessmentData)
        setCaseSubmittedForReview(!!assessmentData.submittedForReview)
        
        // Get prediction if not already available
        if (!assessmentData.latest_prediction) {
          const predictionData = await predict(resolvedAssessmentId)
          setPrediction(predictionData)
        } else {
          setPrediction(assessmentData.latest_prediction)
        }
        
        // Calculate SOL
        const facts = typeof assessmentData.facts === 'string'
          ? JSON.parse(assessmentData.facts)
          : assessmentData.facts
        if (facts?.incident?.date) {
          const solData = await calculateSOL(
            facts.incident.date,
            facts.venue || { state: assessmentData.venue?.state, county: assessmentData.venue?.county },
            facts.claimType || assessmentData.claimType
          )
          setSol(solData)
        }
        
      } catch (err: any) {
        console.error('Failed to load results:', err)
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          assessmentId: resolvedAssessmentId
        })
        const errorMessage = err.response?.data?.error || err.message || 'Failed to load assessment results'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [resolvedAssessmentId, isLoggedIn])

  useEffect(() => {
    const loadSimilarCases = async () => {
      if (!resolvedAssessmentId) return
      try {
        const data = await getSimilarCaseOutcomes(resolvedAssessmentId)
        setSimilarCases(data.similarCases || [])
      } catch {
        setSimilarCases([])
      }
    }
    loadSimilarCases()
  }, [resolvedAssessmentId])

  useEffect(() => {
    const loadEvidence = async () => {
      if (!resolvedAssessmentId) return
      try {
        const files = await getEvidenceFiles(resolvedAssessmentId)
        const fileList = Array.isArray(files) ? files : []
        setEvidenceCount(fileList.length)
        setEvidenceFiles(fileList)
      } catch {
        setEvidenceCount(0)
        setEvidenceFiles([])
      }
    }
    loadEvidence()
  }, [resolvedAssessmentId])

  const loadCaseInsights = useCallback(async () => {
    if (!resolvedAssessmentId) return
    try {
      const [assessmentData, chronology, preparation, plaintiffReview, benchmarks, commandSummary] = await Promise.all([
        getAssessment(resolvedAssessmentId).catch(() => null),
        getMedicalChronology(resolvedAssessmentId).catch(() => []),
        getCasePreparation(resolvedAssessmentId).catch(() => null),
        getPlaintiffMedicalReview(resolvedAssessmentId).catch(() => null),
        getSettlementBenchmarks(resolvedAssessmentId).catch(() => null),
        getAssessmentCommandCenter(resolvedAssessmentId).catch(() => null),
      ])
      if (assessmentData) {
        setAssessment(assessmentData)
        setCaseSubmittedForReview(!!assessmentData.submittedForReview)
        if (assessmentData.latest_prediction) {
          setPrediction(assessmentData.latest_prediction)
        }
      }
      const fallbackReview: PlaintiffMedicalReviewPayload = plaintiffReview || {
        chronology: Array.isArray(chronology) ? chronology : [],
        missingItems: {
          important: Array.isArray(preparation?.missingDocs)
            ? preparation.missingDocs
                .filter((item: any) => item.priority === 'high')
                .map((item: any) => ({
                  key: item.key,
                  label: item.label,
                  priority: item.priority,
                  guidance: 'This would help complete your medical story before attorneys review it.',
                }))
            : [],
          helpful: Array.isArray(preparation?.missingDocs)
            ? preparation.missingDocs
                .filter((item: any) => item.priority !== 'high')
                .map((item: any) => ({
                  key: item.key,
                  label: item.label,
                  priority: item.priority,
                  guidance: 'You may still want to upload this if you have it.',
                }))
            : [],
        },
        review: {
          status: 'pending',
          edits: [],
        },
      }
      const reviewChronology = Array.isArray(fallbackReview?.chronology) ? fallbackReview.chronology : []
      setMedicalChronology(reviewChronology.length > 0 ? reviewChronology : (Array.isArray(chronology) ? chronology : []))
      setCasePreparation(preparation)
      setPlaintiffMedicalReview(fallbackReview)
      setSettlementBenchmarks(benchmarks)
      setCommandCenter(commandSummary)
    } catch {
      setMedicalChronology([])
      setCasePreparation(null)
      setPlaintiffMedicalReview(null)
      setSettlementBenchmarks(null)
      setCommandCenter(null)
    }
  }, [resolvedAssessmentId])

  useEffect(() => {
    loadCaseInsights()
  }, [loadCaseInsights])

  useEffect(() => {
    if (!resolvedAssessmentId) return

    let cancelled = false
    let refreshTimeout: number | undefined
    let attempts = 0
    const refreshWhileProcessingSettles = async () => {
      attempts += 1
      await loadCaseInsights()
      if (!cancelled && attempts < 10) {
        refreshTimeout = window.setTimeout(refreshWhileProcessingSettles, 3000)
      }
    }
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') void loadCaseInsights()
    }

    refreshTimeout = window.setTimeout(refreshWhileProcessingSettles, 3000)
    window.addEventListener('focus', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)

    return () => {
      cancelled = true
      if (refreshTimeout) window.clearTimeout(refreshTimeout)
      window.removeEventListener('focus', refreshOnReturn)
      document.removeEventListener('visibilitychange', refreshOnReturn)
    }
  }, [resolvedAssessmentId, loadCaseInsights])

  useEffect(() => {
    const loadCommandCenter = async () => {
      if (!resolvedAssessmentId) return
      try {
        const summary = await getAssessmentCommandCenter(resolvedAssessmentId)
        setCommandCenter(summary)
      } catch {
        setCommandCenter(null)
      }
    }
    loadCommandCenter()
  }, [resolvedAssessmentId])

  useEffect(() => {
    const loadMatchedAttorneys = async () => {
      await refreshMatchedAttorneys()
    }
    loadMatchedAttorneys()
  }, [assessment?.id, venueState, assessment?.claimType])

  useEffect(() => {
    if (!reviewRequested || autoReviewHandled || loading || !assessment || !plaintiffMedicalReview) return
    window.setTimeout(() => {
      if ((plaintiffMedicalReview.review.status ?? 'pending') === 'pending') {
        medicalReviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setMedicalReviewError('Please confirm your medical story or skip this step so attorneys know whether the treatment timeline is accurate.')
        return
      }
      setAutoReviewHandled(true)
      openSendModal(plaintiffMedicalReview.review.status)
    }, 100)
  }, [reviewRequested, autoReviewHandled, loading, assessment?.id, plaintiffMedicalReview?.review.status])

  useEffect(() => {
    if (matchedAttorneys.length === 0) {
      setRankedAttorneyIds([])
      return
    }
    setRankedAttorneyIds((current) => {
      const availableIds = matchedAttorneys.map((attorney) => attorney.id || attorney.attorney_id).filter(Boolean)
      const preserved = current.filter((attorneyId) => availableIds.includes(attorneyId))
      const missing = availableIds.filter((attorneyId) => !preserved.includes(attorneyId))
      return [...preserved, ...missing].slice(0, 3)
    })
  }, [matchedAttorneys])

  // Associate assessment with user when they become logged in
  useEffect(() => {
    if (isLoggedIn && resolvedAssessmentId) {
      associateAssessmentWithUser()
    }
  }, [isLoggedIn, resolvedAssessmentId])

  // Persist assessmentId for account-creation flow (OAuth loses URL params)
  useEffect(() => {
    if (resolvedAssessmentId && isLoggedIn === false) {
      localStorage.setItem('pending_assessment_id', resolvedAssessmentId)
    }
  }, [resolvedAssessmentId, isLoggedIn])

  useEffect(() => {
    if (localStorage.getItem('consent_read_hipaa') === 'true') {
      setHipaaAuthorizationComplete(true)
      setSendHipaaConsent(true)
    }
  }, [])

  // Check authentication status on page load (for redirects from login/register)
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const session = await loadPlaintiffSessionSummary()
        if (isLoggedIn === null) {
          setIsLoggedIn(!!session?.user)
        }
      } catch {
        if (isLoggedIn === null) {
          setIsLoggedIn(false)
        }
      }
    }

    checkAuthStatus()
  }, [isLoggedIn])

  useEffect(() => {
    if (!assessment || wageLossHydrated) return
    const saved = parsedFacts?.caseAcceleration?.wageLoss
    if (saved) {
      setWageLossForm({
        employerName: saved.employerName || '',
        supervisorContact: saved.supervisorContact || '',
        positionTitle: saved.positionTitle || '',
        datesMissed: saved.datesMissed || '',
        reasonMissed: saved.reasonMissed || '',
        hourlyRate: saved.hourlyRate || '',
        typicalHours: saved.typicalHours || '',
        notes: saved.notes || ''
      })
    }
    setWageLossHydrated(true)
  }, [assessment, wageLossHydrated, parsedFacts])

  useEffect(() => {
    if (!assessment || damageEstimateHydrated) return
    const damages = parsedFacts?.damages || {}
    setDamageEstimateForm({
      medicalBillsEstimate: damages.estimated_med_charges ? String(damages.estimated_med_charges) : '',
      lostWagesEstimate: damages.estimated_wage_loss ? String(damages.estimated_wage_loss) : '',
      outOfPocketEstimate: damages.estimated_out_of_pocket ? String(damages.estimated_out_of_pocket) : '',
      propertyDamageEstimate: damages.estimated_property_damage ? String(damages.estimated_property_damage) : '',
      futureTreatmentEstimate: damages.estimated_future_med_charges ? String(damages.estimated_future_med_charges) : '',
      notes: damages.damage_estimate_notes || '',
    })
    setDamageEstimateHydrated(true)
  }, [assessment, damageEstimateHydrated, parsedFacts])


  if (!resolvedAssessmentId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid case report link</h2>
          <p className="text-gray-600">This Results link is missing a valid case reference. Start a new assessment to generate a fresh report.</p>
          <Link to="/assess" className="btn-primary mt-4">
            Start New Assessment
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-11 w-11 border-2 border-slate-200 border-t-brand-600 mx-auto" />
          <p className="mt-5 text-sm font-medium text-slate-600">Preparing your Case Intelligence Report…</p>
        </div>
      </div>
    )
  }

  if (error || !assessment) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error || 'Assessment not found'}</p>
          <Link to="/assess" className="btn-primary mt-4">
            Start New Assessment
          </Link>
        </div>
      </div>
    )
  }

  const viability = prediction?.viability
  const valueBands = prediction?.value_bands
  const underwriting = prediction?.underwriting
  const explainability = normalizeExplainability(prediction?.explainability)
  const readinessDetails = (() => {
    const facts = parsedFacts
    const injuries = Array.isArray(facts.injuries) ? facts.injuries : []
    const treatment = Array.isArray(facts.treatment) ? facts.treatment : []
    const damages = facts.damages || {}
    const hasNarrative = !!facts.incident?.narrative
    const hasLocation = !!facts.incident?.location
    const hasInjuries = injuries.length > 0 && !!injuries[0]?.description
    const hasTreatment = treatment.length > 0
    const hasDamages = damages.med_charges || damages.med_paid || damages.wage_loss || damages.services || damages.workImpact
    const hasEvidence = evidenceCount > 0

    const points = [
      hasNarrative,
      hasLocation,
      hasInjuries,
      hasTreatment,
      hasDamages,
      hasEvidence
    ].filter(Boolean).length
    const percent = Math.round((points / 6) * 100)
    const missing: string[] = []
    if (!hasNarrative) missing.push('Incident narrative')
    if (!hasLocation) missing.push('Incident location')
    if (!hasInjuries) missing.push('Injury details')
    if (!hasTreatment) missing.push('Treatment history')
    if (!hasDamages) missing.push('Damages/financial impact')
    if (!hasEvidence) missing.push('Evidence uploads')

    return { percent, missing }
  })()
  const readinessMissing = Array.isArray(readinessDetails?.missing) ? readinessDetails.missing : []

  const progressChecklist = [
    { label: 'Incident narrative', done: !readinessMissing.includes('Incident narrative') },
    { label: 'Incident location', done: !readinessMissing.includes('Incident location') },
    { label: 'Injury details', done: !readinessMissing.includes('Injury details') },
    { label: 'Treatment history', done: !readinessMissing.includes('Treatment history') },
    { label: 'Damages/financial impact', done: !readinessMissing.includes('Damages/financial impact') },
    { label: 'Evidence uploads', done: !readinessMissing.includes('Evidence uploads') }
  ]

  const damagesObj = parsedFacts?.damages || {}
  const documentedMedicalCharges = Number(
    underwriting?.settlement?.economicDamages?.medicalBills ||
    damagesObj.med_charges ||
    damagesObj.extracted_med_charges ||
    damagesObj.estimated_med_charges ||
    0,
  )
  const documentedWageLoss = Number(
    underwriting?.settlement?.economicDamages?.lostWages ||
    damagesObj.wage_loss ||
    damagesObj.extracted_wage_loss ||
    damagesObj.estimated_wage_loss ||
    parsedFacts?.caseAcceleration?.wageLoss ||
    0,
  )
  const documentedOutOfPocket = Number(
    underwriting?.settlement?.economicDamages?.outOfPocket ||
    damagesObj.out_of_pocket ||
    damagesObj.extracted_out_of_pocket ||
    damagesObj.estimated_out_of_pocket ||
    0,
  )
  const hasInjuryPhotos = evidenceFiles.some(f => f.category === 'photos')
  const hasExtractedMedicalChronology = medicalChronology.some((event: any) => event?.source === 'medical_record' || event?.source === 'treatment')
  const hasMedicalRecords = evidenceFiles.some(f => f.category === 'medical_records') || hasExtractedMedicalChronology
  const hasMedicalBills = evidenceFiles.some(f => f.category === 'bills' && !isLostWageEvidence(f)) || documentedMedicalCharges > 0
  const hasPoliceReport = evidenceFiles.some(f => f.category === 'police_report')
  const hasWageLossProof = evidenceFiles.some(f => f.category === 'wage_loss') || documentedWageLoss > 0
  const effectiveEvidenceCount = Math.max(
    evidenceCount,
    evidenceFiles.length,
    hasMedicalRecords || hasMedicalBills || hasWageLossProof ? 1 : 0,
  )
  const medicalDocumentFiles = evidenceFiles.filter((file) => ['medical_records', 'bills'].includes(file.category))
  const extractedBillItems = medicalDocumentFiles
    .filter((file) => file.category === 'bills' && !isLostWageEvidence(file) && !isDamagesSummaryEvidence(file))
    .map((file) => {
      const totalAmount = Number(file.extractedData?.[0]?.totalAmount || 0)
      return {
        id: file.id || file.originalName,
        name: file.originalName || 'Uploaded bill',
        totalAmount: Number.isFinite(totalAmount) ? totalAmount : 0,
      }
    })
    .filter((item) => item.totalAmount > 0)
  const extractedBillTotal = extractedBillItems.reduce((sum, item) => sum + item.totalAmount, 0)
  const extractedWageLossItems = medicalDocumentFiles
    .filter((file) => isLostWageEvidence(file))
    .map((file) => {
      const totalAmount = Number(file.extractedData?.[0]?.totalAmount || 0)
      return {
        id: file.id || file.originalName,
        name: file.originalName || 'Wage loss document',
        totalAmount: Number.isFinite(totalAmount) ? totalAmount : 0,
      }
    })
    .filter((item) => item.totalAmount > 0)
  const extractedWageLossTotal = extractedWageLossItems.reduce((sum, item) => sum + item.totalAmount, 0)
  const evidenceCompletionChecklist = [
    { label: 'Incident description', done: !!parsedFacts?.incident?.narrative, valueBoost: null },
    { label: 'Location confirmed', done: !!(parsedFacts?.incident?.location || parsedFacts?.venue?.state), valueBoost: null },
    { label: 'Upload injury photos', done: hasInjuryPhotos, valueBoost: '+10-20% value' },
    { label: 'Upload medical records', done: hasMedicalRecords, valueBoost: '+15-40% value' },
    { label: 'Upload wage loss proof', done: hasWageLossProof, valueBoost: '+10-25% value' }
  ]
  const evidenceCompletionPercent = Math.round((evidenceCompletionChecklist.filter(c => c.done).length / 5) * 100)

  const caseStrengthScore = Math.round((viability?.overall ?? 0.5) * 100)
  const successProbability = Math.round((viability?.overall ?? 0.5) * 100)
  const settlementRange = valueBands?.settlement || valueBands || {}
  const trialRange = valueBands?.trial || {}
  const settlementLow = underwriting?.settlement?.low ?? settlementRange?.p25 ?? valueBands?.p25 ?? 15000
  const settlementHigh = underwriting?.settlement?.high ?? settlementRange?.p75 ?? valueBands?.p75 ?? 75000
  const settlementExpected = underwriting?.settlement?.expected ?? settlementRange?.median ?? valueBands?.median ?? Math.round((settlementLow + settlementHigh) / 2)
  const potentialTrialLow = trialRange?.p25 ?? Math.round(settlementHigh * 1.35)
  const potentialTrialHigh = trialRange?.p75 ?? Math.round(settlementHigh * 3.25)
  const settlementRangeText = `${formatCurrency(settlementLow)} - ${formatCurrency(settlementHigh)}`
  const policyLimitConstrained = !!(settlementRange?.policyLimitConstrained || trialRange?.policyLimitConstrained)
  const insuranceRecoveryPercent = clampPercent(
    policyLimitConstrained
      ? 42
      : (parsedFacts?.insurance?.defendant_coverage_limits || parsedFacts?.insurance?.um_uim || parsedFacts?.insurance?.has_um_uim_coverage)
        ? 85
        : 62
  )
  const insuranceRecoveryLabel = insuranceRecoveryPercent >= 75 ? 'Coverage appears sufficient based on reported facts.' : insuranceRecoveryPercent >= 50 ? 'Coverage still needs confirmation.' : 'Potential policy limit concerns.'
  const trialProbability = Math.round((1 - (viability?.overall ?? 0.5) * 0.8) * 100)
  const missingDocItems = (Array.isArray(casePreparation?.missingDocs) ? casePreparation.missingDocs : [])
    .filter((item: any) => !(hasHipaaConsent && String(item?.label ?? '').toLowerCase().includes('hipaa')))
  const treatmentGapItems = Array.isArray(casePreparation?.treatmentGaps) ? casePreparation.treatmentGaps : []
  const benchmarkRangeText = settlementBenchmarks
    ? `${formatCurrency(settlementBenchmarks.p25)} - ${formatCurrency(settlementBenchmarks.p75)}`
    : settlementRangeText
  const baseCaseTypeRange = getBaseCaseTypeRange(assessment?.claimType)
  const timelineEstimate = buildTimelineEstimate({
    claimType: assessment?.claimType,
    missingDocCount: missingDocItems.length,
    treatmentGapCount: treatmentGapItems.length,
    hasTreatment: Array.isArray(parsedFacts?.treatment) && parsedFacts.treatment.length > 0,
    evidenceCount: effectiveEvidenceCount,
    severityLevel: prediction?.severity?.level,
    chronologyCount: medicalChronology.length,
  })
  const timelineDrivers = Array.isArray(timelineEstimate?.drivers) ? timelineEstimate.drivers : []
  const estimatedTimeline = timelineEstimate.label
  const liabilityScore = viability?.liability ?? 0.5
  const liabilityOutlook = liabilityScore >= 0.7 ? 'strong' : liabilityScore >= 0.4 ? 'moderate' : 'weak'
  const liabilityDetails = prediction?.liability
  const rawLiabilityFactors = Array.isArray(liabilityDetails?.factors)
    ? liabilityDetails.factors.slice(0, 3)
    : explainability
        .filter((item: any) => typeof item?.feature === 'string' && item.feature.startsWith('liability_factor: '))
        .map((item: any) => String(item.feature).replace('liability_factor: ', ''))
        .slice(0, 3)
  const liabilityFactors = rawLiabilityFactors
    .map((factor: string) => normalizeReportText(factor))
    .filter(Boolean)
  const comparativeFaultPercent = Math.round((liabilityDetails?.comparativeNegligence || 0) * 100)
  const liabilitySummary = normalizeReportText(liabilityFactors[0])
    || (liabilityOutlook === 'strong'
      ? 'The current facts point toward the other side being primarily at fault.'
      : liabilityOutlook === 'moderate'
        ? 'Liability looks mixed right now and may depend on more evidence.'
        : 'Liability is still uncertain and needs better supporting facts.')
  const liabilityConfidence = hasPoliceReport || (hasInjuryPhotos && !!parsedFacts?.incident?.narrative)
    ? 'Medium'
    : effectiveEvidenceCount > 0 || !!parsedFacts?.incident?.narrative
      ? 'Low'
      : 'Very low'
  const comparativeFaultRisk = comparativeFaultPercent >= 30 ? 'High' : comparativeFaultPercent > 0 ? 'Medium' : 'Low'
  const liabilityPositiveSignals = [
    ...liabilityFactors,
    hasPoliceReport && 'A police or incident report is attached.',
    hasInjuryPhotos && 'Photos may help show scene conditions or damage.',
    parsedFacts?.incident?.narrative && 'Your incident description gives attorneys a starting fault story.',
  ].filter(Boolean).slice(0, 4) as string[]
  const liabilityRiskSignals = [
    !hasPoliceReport && 'A police or incident report is not uploaded yet.',
    !hasInjuryPhotos && 'Scene, injury, or damage photos are not uploaded yet.',
    !parsedFacts?.incident?.narrative && 'The accident description is still limited.',
    comparativeFaultPercent > 0 && `The model detected possible shared-fault risk around ${comparativeFaultPercent}%.`,
  ].filter(Boolean).slice(0, 4) as string[]
  const liabilityStrengthenActions = [
    !hasPoliceReport && 'Upload the police or incident report.',
    !hasInjuryPhotos && 'Add scene, vehicle/property damage, or injury photos.',
    !parsedFacts?.incident?.narrative && 'Clarify what happened and why the other party may be responsible.',
    'Add witness names, insurance details, or repair estimates if available.',
  ].filter(Boolean).slice(0, 3) as string[]
  const evidenceLevelConfidence = (() => {
    if (effectiveEvidenceCount === 0) return { level: 'No documents', confidence: 'Low' }
    if (hasPoliceReport && hasMedicalRecords) return { level: 'Police report + medical records', confidence: 'Very high' }
    if (hasMedicalRecords) return { level: 'Medical records', confidence: 'High' }
    if (hasMedicalBills) return { level: 'Medical bills', confidence: 'Medium' }
    return { level: 'Other documents', confidence: 'Low' }
  })()
  const roundEstimateForDisplay = (value: number) => Math.max(5000, Math.round(value / 5000) * 5000)
  const isEarlyStageEstimate =
    evidenceLevelConfidence.confidence === 'Low' ||
    effectiveEvidenceCount === 0 ||
    readinessDetails.percent <= 50 ||
    liabilityOutlook !== 'strong'
  const displaySettlementLow = isEarlyStageEstimate
    ? roundEstimateForDisplay(Math.min(settlementLow * 0.4, settlementHigh * 0.25))
    : settlementLow
  const displaySettlementHigh = isEarlyStageEstimate
    ? roundEstimateForDisplay(Math.min(settlementHigh * 0.5, settlementLow * 1.05))
    : settlementHigh
  const displaySettlementRangeText = `${formatCurrency(displaySettlementLow)} - ${formatCurrency(Math.max(displaySettlementLow + 5000, displaySettlementHigh))}`
  const treatment = Array.isArray(parsedFacts?.treatment) ? parsedFacts.treatment : []
  const structuredValuationDrivers = valueBands?.drivers || {}
  const hasErTreatment = hasErTreatmentReported(treatment, parsedFacts)
  const hasMriReportedFlag = hasMriReported(treatment, structuredValuationDrivers)
  const isRearEndCase = isRearEndCollision(parsedFacts, liabilityFactors)
  const statuteSafe = sol?.status !== 'critical' && sol?.status !== 'expired' && sol?.status !== 'warning'
  const estimateConfidenceScore = buildEstimateConfidenceScore({
    hasMedicalRecords,
    hasMedicalBills,
    hasPoliceReport,
    hasTreatment: treatment.length > 0,
    hasErTreatment,
    hasMri: hasMriReportedFlag,
    hasInjuryPhotos,
    hasWageLossProof,
    effectiveEvidenceCount,
    liabilityOutlook,
    readinessPercent: readinessDetails.percent,
  })
  const estimateConfidenceLevel = getConsumerConfidenceLevel(estimateConfidenceScore)
  const litigationReadinessScore = buildLitigationReadinessScore({
    hasMedicalRecords,
    hasMedicalBills,
    hasPoliceReport,
    hasTreatment: treatment.length > 0,
    hasNarrative: !!parsedFacts?.incident?.narrative,
    hasInjuryPhotos,
    hasWageLossProof,
  })
  const litigationReadinessStatus = getReadinessStatusLabel(litigationReadinessScore)
  const attorneyInterestLevel = buildAttorneyInterestLevel({
    viability: viability?.overall ?? 0.5,
    liabilityOutlook,
    hasErTreatment,
    hasMri: hasMriReportedFlag,
    isRearEnd: isRearEndCase,
    hasMedicalRecords,
    hasTreatment: treatment.length > 0,
  })
  const liabilityPercent = clampPercent(liabilityScore * 100)
  const liabilitySnapshotLabel = scoreLabel(liabilityPercent, {
    high: 'Moderate-Strong',
    medium: 'Mixed',
    low: 'Needs Proof',
  })
  const severityPercent = clampPercent(
    typeof underwriting?.scores?.severity === 'number'
      ? underwriting.scores.severity
      : typeof prediction?.severity?.score === 'number'
      ? prediction.severity.score * 100
      : typeof prediction?.severity?.level === 'number'
        ? (prediction.severity.level / 4) * 100
        : (viability?.damages ?? 0.5) * 100,
  )
  const severitySnapshotLabel = scoreLabel(severityPercent, {
    high: 'Moderate-Severe',
    medium: 'Moderate',
    low: 'Developing',
  })
  const trialValueText = `${formatCurrency(potentialTrialLow)} - ${formatCurrency(potentialTrialHigh)}${trialRange?.policyLimitConstrained ? '' : '+'}`
  const severityFactorRows = [
    { label: 'MRI findings', present: hasMriReportedFlag },
    { label: 'Treatment duration', present: treatment.length >= 2 || medicalChronology.length >= 2 },
    {
      label: 'Injections',
      present: Array.isArray(structuredValuationDrivers.procedures) &&
        structuredValuationDrivers.procedures.some((item: string) => /injection|epidural/i.test(String(item))),
    },
    {
      label: 'Surgery',
      present: prediction?.severity?.level >= 4 ||
        String(structuredValuationDrivers.surgeryStatus || '').toLowerCase().includes('surgery'),
    },
  ]
  const attorneyAcceptanceProbability = underwriting?.attorneyAcceptance?.probability ?? buildAttorneyAcceptanceProbability({
    settlementHigh: displaySettlementHigh,
    settlementLow: displaySettlementLow,
    liabilityPercent,
    severityPercent,
    completenessPercent: readinessDetails.percent,
    hasMedicalRecords,
    hasMedicalBills,
    policyLimitConstrained,
  })
  const attorneyAcceptanceLabel = scoreLabel(attorneyAcceptanceProbability, {
    high: 'Very Likely',
    medium: 'Possible',
    low: 'Uncertain',
  })
  const attorneyAcceptanceEconomics = `Model weighs expected fee against likely case cost, then adjusts for liability, severity, documents, and insurance recovery.`
  const attorneyAcceptanceDrivers = [
    liabilityOutlook === 'strong' && 'Strong liability',
    severityPercent >= 70 && 'Severe injuries',
    venueCounty && `${venueCounty} venue`,
    insuranceRecoveryPercent >= 70 && 'Insurance available',
    hasMedicalRecords && 'Treatment records available',
  ].filter(Boolean).slice(0, 4) as string[]
  const attorneyAcceptanceReducingFactors = [
    !hasWageLossProof && documentedWageLoss > 0 && 'Missing wage documentation',
    !hasPoliceReport && 'Missing police report',
    !hasMedicalBills && 'Missing medical bills',
    policyLimitConstrained && 'Potential policy limit concern',
  ].filter(Boolean).slice(0, 3) as string[]
  const rankedSnapshotAttorneys = rankedAttorneyCards.slice(0, 3)
  const documentationScore = evidenceCompletionPercent
  const treatmentStrengthLevel = getTreatmentStrengthLabel({
    hasErTreatment,
    hasMri: hasMriReportedFlag,
    treatmentCount: treatment.length,
    chronologyCount: medicalChronology.length,
  })
  const liabilityStrengthLevel: ConsumerConfidenceLevel =
    liabilityOutlook === 'strong' ? 'High' : liabilityOutlook === 'moderate' ? 'Medium' : 'Low'
  const deadlineRiskLabel =
    sol?.status === 'critical' || sol?.status === 'expired'
      ? 'Urgent'
      : sol?.status === 'warning'
        ? 'Watch'
        : 'Safe'
  const confidenceDriversPositive = [
    hasMriReportedFlag && 'MRI reported',
    hasErTreatment && 'ER treatment reported',
    statuteSafe && 'Statute safe',
    hasPoliceReport && 'Police report on file',
    hasMedicalRecords && 'Medical records uploaded',
  ].filter(Boolean) as string[]
  const confidenceDriversNegative = [
    !hasMedicalRecords && 'Medical records missing',
    !hasMedicalBills && 'Medical bills missing',
    (liabilityOutlook !== 'strong' || (!hasPoliceReport && !hasInjuryPhotos)) && 'Liability evidence incomplete',
    !hasPoliceReport && 'No police report',
    treatment.length === 0 && 'Treatment history missing',
  ].filter(Boolean) as string[]
  const estimateConfidenceReasons = [
    !hasMedicalRecords && 'Missing medical records',
    !hasMedicalBills && 'Missing medical bills',
    !hasPoliceReport && 'No police report',
    liabilityOutlook !== 'strong' && 'Liability not fully established',
    treatment.length === 0 && 'Limited treatment documentation',
  ].filter(Boolean).slice(0, 4) as string[]
  const litigationReadinessMissing = [
    !hasMedicalRecords && 'Medical records',
    !hasMedicalBills && 'Bills',
    !hasPoliceReport && 'Police report',
    !hasInjuryPhotos && 'Scene or injury photos',
    !hasWageLossProof && 'Wage loss proof',
    treatment.length === 0 && 'Treatment history',
  ].filter(Boolean).slice(0, 4) as string[]
  const attorneyInterestFactors = [
    isRearEndCase && 'Rear-end collision',
    assessment?.claimType === 'auto' && !isRearEndCase && 'Auto accident',
    assessment?.claimType && assessment.claimType !== 'auto' && `${formatClaimTypeLabel(assessment.claimType)} case type`,
    hasErTreatment && 'ER visit',
    hasMriReportedFlag && 'MRI reported',
    liabilityOutlook === 'strong' && 'Clear liability signals',
    treatment.length > 0 && 'Treatment documented',
  ].filter(Boolean).slice(0, 4) as string[]
  const attorneyInterestMissing = [
    !hasMedicalRecords && 'Medical records',
    treatment.length === 0 && 'Treatment history',
    !hasPoliceReport && liabilityOutlook !== 'strong' && 'Liability documentation',
  ].filter(Boolean).slice(0, 3) as string[]
  const caseCompletenessItems = [
    { label: 'Medical records', done: hasMedicalRecords, boost: '+10%' },
    { label: 'Medical bills', done: hasMedicalBills, boost: '+8%' },
    { label: 'Police report', done: hasPoliceReport, boost: '+12%' },
    { label: 'Wage loss evidence', done: hasWageLossProof, boost: '+6%' },
  ]
  const caseCompletenessPercent = Math.round(
    (caseCompletenessItems.filter((item) => item.done).length / caseCompletenessItems.length) * 100
  )
  const strongestCaseFactors = [
    hasErTreatment && 'ER treatment reported',
    hasMriReportedFlag && 'MRI reported',
    treatment.length > 0 && 'Treatment documented',
    hasPoliceReport && 'Police report on file',
    liabilityOutlook === 'strong' && 'Clear responsibility signals',
    hasMedicalRecords && 'Medical records provided',
  ].filter(Boolean).slice(0, 4) as string[]
  const missingValueDrivers = caseCompletenessItems.filter((item) => !item.done)
  const potentialValueDrivers = [
    'Treatment continues',
    'Imaging confirms injuries',
    'Wage loss is documented',
    'Additional medical records are provided',
  ]
  const aiCaseSummaryBullets = [
    liabilityOutlook === 'strong'
      ? 'Defendant appears primarily responsible.'
      : liabilityOutlook === 'moderate'
        ? 'Responsibility may be disputed or shared.'
        : 'Liability needs more supporting facts.',
    treatment.length > 0 || hasMedicalRecords
      ? 'Injuries appear supported by reported treatment or records.'
      : 'Treatment documentation is still limited.',
    hasMedicalRecords || hasMedicalBills || hasPoliceReport
      ? 'Current documentation supports attorney review.'
      : 'Additional evidence may increase projected value.',
    missingValueDrivers.length > 0
      ? 'Additional evidence may increase projected value.'
      : 'Core value documents are present.'
  ]
  const totalEconomicLoss = documentedMedicalCharges + documentedWageLoss + documentedOutOfPocket
  const venueFriendlinessScore = venueState === 'CA'
    ? /los angeles/i.test(String(venueCounty || '')) ? 4 : 3
    : 3
  const venueImpactPercent = venueState === 'CA'
    ? /los angeles/i.test(String(venueCounty || '')) ? 18 : 10
    : 5
  const deadlineWarningText =
    sol?.status === 'critical' || sol?.status === 'expired' || sol?.status === 'warning'
      ? 'Your claim may be approaching a filing deadline. Consider speaking with an attorney soon.'
      : null
  const litigationPotentialLabel = isEarlyStageEstimate
    ? 'Preliminary'
    : litigationReadinessScore >= 55
      ? 'Moderate'
      : 'Limited'
  const confidenceImprovesWhen = [
    { label: 'Medical records uploaded', done: hasMedicalRecords },
    { label: 'Medical bills uploaded', done: hasMedicalBills },
    { label: 'Police report uploaded', done: hasPoliceReport },
  ]
  const improveCaseActions = [
    !hasMedicalRecords && { label: 'Medical records', impact: 'Highest impact' as const },
    !hasMedicalBills && { label: 'Medical bills', impact: 'Medium impact' as const },
    !hasPoliceReport && { label: 'Police report', impact: 'Medium impact' as const },
    !hasInjuryPhotos && hasMedicalRecords && hasMedicalBills && { label: 'Injury photos', impact: 'Helpful' as const },
  ].filter(Boolean) as Array<{ label: string; impact: string }>
  const topImproveStep = !hasMedicalRecords
    ? {
        title: 'Upload injury treatment records',
        helper: 'Treatment records are usually the fastest way to improve estimate confidence.',
      }
    : !hasMedicalBills
      ? {
          title: 'Upload medical bills',
          helper: 'Bills help confirm economic damages and improve confidence.',
        }
      : !hasPoliceReport
        ? {
            title: 'Upload police report',
            helper: 'A police report can strengthen liability documentation.',
          }
        : null
  const caseSignalRows = [
    { signal: 'Documentation', status: `${documentationScore}%` },
    { signal: 'Treatment', status: formatStrengthLabel(treatmentStrengthLevel) },
    { signal: 'Liability', status: formatStrengthLabel(liabilityStrengthLevel) },
    { signal: 'Deadline', status: deadlineRiskLabel },
  ]
  const consumerEstimateLabel = `Confidence: ${estimateConfidenceLevel}`
  const litigationExposureText = isEarlyStageEstimate
    ? 'Current assessment: Preliminary'
    : `${formatCurrency(potentialTrialLow)} - ${formatCurrency(potentialTrialHigh)}${trialRange?.policyLimitConstrained ? '' : '+'}`
  const litigationExposureHelper = isEarlyStageEstimate
    ? 'Current information suggests the case may have additional value if medical treatment continues, imaging confirms injury findings, liability evidence strengthens, or wage loss and future care are documented.'
    : 'This is not a prediction of verdict value. It reflects possible litigation exposure if the case is disputed and evidence develops.'
  const formatSolRemaining = () => {
    if (sol?.yearsRemaining == null) return '1 year 9 months'
    const y = Math.floor(sol.yearsRemaining)
    const m = Math.round((sol.yearsRemaining % 1) * 12)
    const parts = []
    if (y > 0) parts.push(`${y} year${y > 1 ? 's' : ''}`)
    if (m > 0) parts.push(`${m} month${m > 1 ? 's' : ''}`)
    return parts.join(' ') || '1 year 9 months'
  }
  const solRemaining = formatSolRemaining()
  const solDeadline = sol?.expiresAt ? new Date(sol.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null
  const solStatusTone = sol?.status === 'critical' || sol?.status === 'expired'
    ? 'bg-red-50 border-red-200 text-red-800'
    : sol?.status === 'warning'
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
  const caseStrengthLabel = (s: number) => s >= 75 ? 'Strong' : s >= 50 ? 'Moderately Strong' : s >= 25 ? 'Moderate' : 'Needs Work'

  const handleCopyShareLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    })
  }

  const handleDownloadReportPdf = async () => {
    const { downloadResultsCaseReportPdf } = await import('../lib/reportPdfExports')
    await downloadResultsCaseReportPdf({
      caseStrengthScore,
      successProbability,
      settlementRangeText: displaySettlementRangeText,
      trialValueText: litigationExposureText,
      trialProbability,
      estimatedTimeline,
      solRemaining,
      evidenceCompletionPercent,
      assessmentId: assessment?.id,
    })
  }
  const nextSteps = missingDocItems.length > 0
    ? missingDocItems.slice(0, 3).map((item: any) => item.label)
    : readinessMissing.slice(0, 3)
  const facts = parsedFacts
  const injuries = Array.isArray(facts.injuries) ? facts.injuries : []
  const damages = facts.damages || {}
  const strengths = [
    facts.incident?.narrative ? 'Clear incident narrative' : null,
    evidenceCount > 0 ? 'Supporting evidence uploaded' : null,
    treatment.length > 0 ? 'Treatment documented' : null,
    damages.med_charges || damages.med_paid || damages.wage_loss ? 'Financial impact documented' : null
  ].filter(Boolean) as string[]
  const weaknesses = [
    !facts.incident?.narrative ? 'Incident narrative is missing' : null,
    !facts.incident?.location ? 'Incident location is missing' : null,
    injuries.length === 0 ? 'Injury details are missing' : null,
    treatment.length === 0 ? 'Treatment history is missing' : null,
    evidenceCount === 0 ? 'Evidence files are missing' : null
  ].filter(Boolean) as string[]
  const insurerArguments = [
    treatment.length === 0 ? 'They may argue there is a treatment gap or no injury documentation.' : null,
    evidenceCount === 0 ? 'They may claim the case lacks objective evidence.' : null,
    !facts.incident?.narrative ? 'They may dispute how the incident happened.' : null
  ].filter(Boolean) as string[]
  const buildWageLossTemplate = (form: typeof wageLossForm) => `Wage Loss Documentation

Employer name: ${form.employerName || ''}
Supervisor/HR contact: ${form.supervisorContact || ''}
Position/title: ${form.positionTitle || ''}

Dates missed: ${form.datesMissed || ''}
Reason missed (injury-related): ${form.reasonMissed || ''}
Hourly rate / salary: ${form.hourlyRate || ''}
Typical hours per week: ${form.typicalHours || ''}

Notes:
${form.notes || ''}

Checklist:
- Attach pay stubs for 3 months prior to incident
- Include a letter from employer confirming missed time
`
  const filledWageLossTemplate = buildWageLossTemplate(wageLossForm)
  const showSavePrompt = isLoggedIn === false
  const alertMessages = [
    readinessMissing.includes('Evidence uploads') ? 'You’re falling behind on documentation.' : null,
    readinessMissing.includes('Treatment history') ? 'This gap could weaken your case.' : null,
    readinessMissing.includes('Incident narrative') ? 'Now is a good time to follow up on your incident details.' : null,
    readinessMissing.includes('Damages/financial impact') ? 'Now is a good time to add wage loss or bills.' : null
  ].filter(Boolean) as string[]
  const statusUpdates = [
    `Your case readiness is ${readinessDetails.percent}%.`,
    evidenceCount > 0 ? 'Evidence is uploaded and attached to your assessment.' : 'No evidence uploaded yet.',
    parsedFacts?.incident?.date ? 'Incident date is on file.' : 'Incident date is still missing.',
    treatment.length > 0 ? 'Treatment history is documented.' : 'Treatment history is still missing.'
  ]
  const getCoachAnswer = (question: string) => {
    const normalized = question.toLowerCase()
    if (normalized.includes('normal')) {
      return treatment.length > 0
        ? 'Based on your recorded treatment history, ongoing symptoms can be common. Keep documenting each visit.'
        : 'It may be normal, but no treatment history is recorded yet. If you sought care, add it to strengthen your case.'
    }
    if (normalized.includes('worried') || normalized.includes('worry')) {
      return readinessMissing.length > 0
        ? `You still have a few gaps: ${readinessMissing.join(', ')}. Filling these reduces risk.`
        : 'You look in good shape—no major gaps detected in your assessment.'
    }
    if (normalized.includes('next')) {
      if (readinessMissing.length === 0) {
        return 'You are ready for attorney review. Consider uploading any new evidence as it comes in.'
      }
      return `Focus next on: ${readinessMissing.slice(0, 2).join(' and ')}.`
    }
    return 'I can help. Try asking about what to do next, whether something is normal, or if you should worry.'
  }

  const handleSaveWageLoss = async () => {
    if (!assessment) return
    if (!isLoggedIn) {
      setWageLossStatus('Sign in to save this to your assessment.')
      return
    }
    try {
      setWageLossSaving(true)
      setWageLossStatus(null)
      await updateAssessment(assessment.id, {
        caseAcceleration: {
          wageLoss: { ...wageLossForm }
        }
      })
      setAssessment({
        ...assessment,
        facts: {
          ...parsedFacts,
          caseAcceleration: {
            ...(parsedFacts?.caseAcceleration || {}),
            wageLoss: { ...wageLossForm }
          }
        }
      })
      setWageLossStatus('Saved to your assessment.')
    } catch (error) {
      setWageLossStatus('Failed to save. Please try again.')
    } finally {
      setWageLossSaving(false)
    }
  }

  const handleDownloadWageLossPdf = async () => {
    const { downloadWageLossTemplatePdf } = await import('../lib/reportPdfExports')
    await downloadWageLossTemplatePdf({
      templateText: filledWageLossTemplate,
      assessmentId: assessment?.id,
    })
  }

  const parseEstimateAmount = (value: string) => {
    const parsed = Number(value.replace(/[$,]/g, ''))
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
  }

  const handleSaveDamageEstimates = async () => {
    if (!assessment) return
    try {
      setDamageEstimateSaving(true)
      setDamageEstimateStatus(null)
      const result = await saveDamageEstimates(assessment.id, {
        medicalBillsEstimate: parseEstimateAmount(damageEstimateForm.medicalBillsEstimate),
        lostWagesEstimate: parseEstimateAmount(damageEstimateForm.lostWagesEstimate),
        outOfPocketEstimate: parseEstimateAmount(damageEstimateForm.outOfPocketEstimate),
        propertyDamageEstimate: parseEstimateAmount(damageEstimateForm.propertyDamageEstimate),
        futureTreatmentEstimate: parseEstimateAmount(damageEstimateForm.futureTreatmentEstimate),
        notes: damageEstimateForm.notes.trim() || undefined,
      })
      setDamageEstimateStatus('Saved estimates and refreshed your settlement and trial ranges.')
      setDamageEstimateHydrated(false)
      await loadCaseInsights()
      if (result?.facts) {
        setAssessment((current: any) => current ? { ...current, facts: result.facts } : current)
      }
    } catch (error) {
      setDamageEstimateStatus('Could not save estimates. Please try again.')
    } finally {
      setDamageEstimateSaving(false)
    }
  }

  const whatThisMeansBullets = [
    liabilitySummary,
    injuries.length > 0 && 'Your injury indicates possible damages',
    treatment.length > 0 && 'Medical treatment supports your claim',
    settlementBenchmarks
      ? `Comparable ${formatClaimTypeLabel(assessment?.claimType)} cases in ${venueState === 'CA' ? 'California' : venueState} often land near ${formatCurrency(settlementBenchmarks.p50)} with a broader range of ${benchmarkRangeText}.`
      : `Similar cases in ${venueState === 'CA' ? 'California' : venueState} settled between ${displaySettlementRangeText}`,
    missingDocItems.length > 0 && `The fastest way to strengthen this estimate is to add ${missingDocItems.slice(0, 2).map((item: any) => (item?.label ?? '').toLowerCase()).join(' and ')}.`
  ].filter(Boolean) as string[]
  const displayedPlaintiffMedicalReview = hasHipaaConsent && plaintiffMedicalReview
    ? {
        ...plaintiffMedicalReview,
        missingItems: {
          important: (plaintiffMedicalReview.missingItems?.important ?? [])
            .filter((item: any) => !String(`${item?.key ?? ''} ${item?.label ?? ''}`).toLowerCase().includes('hipaa')),
          helpful: (plaintiffMedicalReview.missingItems?.helpful ?? [])
            .filter((item: any) => !String(`${item?.key ?? ''} ${item?.label ?? ''}`).toLowerCase().includes('hipaa')),
        },
      }
    : plaintiffMedicalReview
  const displayedCommandCenter = hasHipaaConsent && commandCenter
    ? {
        ...commandCenter,
        missingItems: (commandCenter.missingItems ?? [])
          .filter((item: any) => !String(`${item?.key ?? ''} ${item?.label ?? ''}`).toLowerCase().includes('hipaa')),
      }
    : commandCenter
  const medicalReviewPending = (plaintiffMedicalReview?.review.status ?? 'pending') === 'pending'
  const topMissingDocLabels = missingDocItems
    .slice(0, 3)
    .map((item: any) => item?.label)
    .filter(Boolean)
  const bestMissingDoc = missingDocItems.find((item: any) => item?.priority === 'high') ?? missingDocItems[0]
  const supportingNextAction = bestMissingDoc
    ? getMissingDocAction(bestMissingDoc, assessment?.id)
    : medicalReviewPending
      ? { label: 'Review medical story', to: '#medical-story-review' }
      : null
  const primaryReviewActionLabel = 'See if an attorney wants your case'
  const primaryReviewActionHelper = isLoggedIn === false
    ? 'Create a secure account first so attorneys have a real contact, saved case, and consent trail.'
    : medicalReviewPending
      ? 'We will ask you to confirm or skip the medical story before attorneys receive the case.'
    : 'Cases with similar characteristics are commonly reviewed by personal injury attorneys.'
  const liabilityClarityLabel = liabilityOutlook === 'strong' ? 'Strong' : liabilityOutlook === 'moderate' ? 'Mixed' : 'Unclear'
  const liabilityModifierExplanation = getLiabilityModifierExplanation({
    liabilityScore,
    comparativeFaultPercent,
  })
  const injuryTreatmentModifierExplanation = getInjuryTreatmentModifierExplanation({
    severityLevel: prediction?.severity?.level,
    hasTreatment: treatment.length > 0,
    chronologyCount: medicalChronology.length,
    treatmentGapCount: treatmentGapItems.length,
  })
  const evidenceModifierExplanation = getEvidenceModifierExplanation(evidenceLevelConfidence.confidence)
  const calculationModifierRows = [
    liabilityModifierExplanation,
    injuryTreatmentModifierExplanation,
    evidenceModifierExplanation,
  ]
  const valuationKeyDrivers = [
    liabilityOutlook === 'strong' ? 'Clear liability' : liabilityOutlook === 'moderate' ? 'Mixed liability' : 'Unclear liability',
    hasMedicalRecords ? 'Medical records' : null,
    hasMedicalBills ? 'Medical bills included' : null,
    structuredValuationDrivers.priorInjury && structuredValuationDrivers.priorInjury !== 'none' ? 'Prior injury / causation discount' : null,
    structuredValuationDrivers.representationStage && structuredValuationDrivers.representationStage !== 'no_lawyer' ? 'Attorney / litigation stage' : null,
    structuredValuationDrivers.surgeryStatus && structuredValuationDrivers.surgeryStatus !== 'not_discussed' ? 'Surgery recommendation/status' : null,
    Array.isArray(structuredValuationDrivers.procedures) && structuredValuationDrivers.procedures.some((item: string) => item !== 'none' && item !== 'unknown') ? 'Injections or procedures' : null,
    Array.isArray(structuredValuationDrivers.futureTreatment) && structuredValuationDrivers.futureTreatment.some((item: string) => item !== 'none' && item !== 'unknown') ? 'Future treatment' : null,
    structuredValuationDrivers.wageLoss > 0 ? 'Wage loss' : null,
    prediction?.severity?.level >= 3 ? 'High injury severity' : prediction?.severity?.level >= 2 ? 'Moderate injury severity' : null,
    treatment.length > 0 ? 'Treatment documented' : 'Treatment still undocumented',
    policyLimitConstrained ? 'Policy-limit constraints' : null,
    evidenceLevelConfidence.confidence !== 'Very high' ? 'Evidence confidence limits' : null,
  ].filter(Boolean).slice(0, 7) as string[]
  const estimateImprovementItems = [
    !hasMedicalRecords && 'Medical records',
    !hasMedicalBills && 'Medical bills',
    !hasPoliceReport && 'Police or incident report',
    treatment.length === 0 && 'Additional treatment details',
    !hasWageLossProof && 'Wage loss proof',
  ].filter(Boolean).slice(0, 4) as string[]
  const diyRiskFlags = [
    settlementHigh >= 75000 && 'The estimated settlement range is high enough that attorney review may be important.',
    comparativeFaultPercent >= 20 && 'There may be shared-fault arguments to address.',
    missingDocItems.some((item: any) => item?.priority === 'high') && 'High-impact records are still missing.',
    sol?.status === 'critical' || sol?.status === 'expired' ? 'The legal deadline may be close or expired.' : null,
  ].filter(Boolean) as string[]
  const diySuitabilityLabel = diyRiskFlags.length >= 2
    ? 'Attorney review recommended'
    : diyRiskFlags.length === 1
      ? 'Use caution'
      : 'Potential DIY fit'
  const deadlineUrgencyLabel = sol?.status === 'critical' || sol?.status === 'expired'
    ? 'Urgent'
    : sol?.status === 'warning'
      ? 'Watch'
      : solDeadline
        ? 'Low'
        : 'Unknown'
  const guidedNextSteps = [
    isLoggedIn === false && 'Create your secure account so the case can be saved and sent to attorney review.',
    isLoggedIn !== false && medicalReviewPending && 'Confirm or skip the medical story so attorneys know whether the treatment timeline is accurate.',
    topMissingDocLabels.length > 0 && `Upload ${topMissingDocLabels.join(', ')} when you have them to strengthen the file.`,
    'See if an attorney wants your case.',
  ].filter(Boolean) as string[]
  const resultsTabs: Array<{ id: ResultsTab; label: string; badge?: string }> = [
    { id: 'liability', label: 'Liability', badge: liabilityClarityLabel },
    { id: 'medical', label: 'Medical Story', badge: medicalReviewPending ? 'Review needed' : undefined },
    { id: 'documents', label: 'Documents', badge: missingDocItems.length > 0 ? `${missingDocItems.length} missing` : 'Ready' },
    { id: 'value', label: 'Value & Timeline' },
    { id: 'attorney', label: 'Attorney Acceptance', badge: medicalReviewPending ? 'Almost ready' : attorneyAcceptanceLabel },
  ]
  const openAnchoredResultsSection = (target: string) => {
    const tab: ResultsTab = target === '#attorney-handoff' ? 'attorney' : target === '#medical-story-review' ? 'medical' : activeResultsTab
    if (target === '#attorney-handoff' || target === '#medical-story-review') {
      fullReportDetailsRef.current?.setAttribute('open', '')
    }
    setActiveResultsTab(tab)
    window.setTimeout(() => {
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const openAttorneyReviewFlow = () => {
    if (medicalReviewPending) {
      setMedicalReviewError('Review your treatment timeline before submitting. You can confirm it, make changes, or skip it for now.')
      openAnchoredResultsSection('#medical-story-review')
      return
    }
    void openSendModal()
  }

  const improveCaseValueItems = [
    { label: 'Upload injury photos', done: hasInjuryPhotos, boost: '+10-20% potential increase' },
    { label: 'Upload medical records', done: hasMedicalRecords, boost: '+15-40% potential increase' },
    { label: 'Add proof of lost wages', done: hasWageLossProof, boost: '+10-25% potential increase' }
  ]
  const attorneyReviewRedirect = resolvedAssessmentId ? `/results/${resolvedAssessmentId}?review=1` : '/dashboard'
  const authAssessmentQuery = resolvedAssessmentId ? `&assessmentId=${encodeURIComponent(resolvedAssessmentId)}` : ''
  const createAccountForReviewUrl = `/register?redirect=${encodeURIComponent(attorneyReviewRedirect)}${authAssessmentQuery}`
  const signInForReviewUrl = `/login?redirect=${encodeURIComponent(attorneyReviewRedirect)}${authAssessmentQuery}`
  const closeSaveReviewPrompt = () => {
    if (resolvedAssessmentId) localStorage.setItem('pending_assessment_id', resolvedAssessmentId)
    setSaveReviewPromptOpen(false)
    setReviewPromptDismissed(true)
  }

  // Post-submission layout — transition from assessment to case tracking
  if (caseSubmittedForReview) {
    const submissionTimeline = [
      { label: 'Case submitted', done: true },
      { label: 'Attorneys reviewing', done: false },
      { label: 'Attorney responses', done: false },
      { label: 'Choose an attorney', done: false }
    ]
    return (
      <Suspense fallback={<ResultsPanelSkeleton message="Loading submitted case view..." />}>
        <ResultsSubmittedView
          assessmentId={assessment?.id}
          assessmentClaimType={assessment?.claimType}
          handleDownloadReportPdf={handleDownloadReportPdf}
          handleCopyShareLink={handleCopyShareLink}
          improveCaseValueItems={improveCaseValueItems}
          isLoggedIn={isLoggedIn}
          rankedAttorneys={rankedAttorneyCards}
          shareCopied={shareCopied}
          showSavePrompt={showSavePrompt}
          submissionTimeline={submissionTimeline}
          venueCounty={venueCounty}
          venueState={venueState}
        />
      </Suspense>
    )
  }

  // Pre-submission layout — full case report
  return (
    <div className="page-shell max-w-5xl">
      {saveReviewPromptOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" onClick={closeSaveReviewPrompt}>
          <div className="flex min-h-full items-center justify-center" onClick={e => e.stopPropagation()}>
            <div className="surface-panel w-full max-w-md p-6 shadow-xl">
              <h3 className="section-title text-ui-xl">One Final Step</h3>
              <p className="section-copy mt-2">
                Create your free account so you can save your report and receive attorney responses.
              </p>
              <ul className="mt-5 space-y-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
                <li className="flex gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Save your report</li>
                <li className="flex gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Track attorney responses</li>
                <li className="flex gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Upload documents later</li>
                <li className="flex gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Manage your case</li>
              </ul>
              <div className="mt-6 grid gap-3">
                <Link
                  to={createAccountForReviewUrl}
                  onClick={() => {
                    if (resolvedAssessmentId) localStorage.setItem('pending_assessment_id', resolvedAssessmentId)
                  }}
                  className="btn-primary w-full justify-center py-3"
                >
                  Create Free Account
                </Link>
                <Link
                  to={signInForReviewUrl}
                  onClick={() => {
                    if (resolvedAssessmentId) localStorage.setItem('pending_assessment_id', resolvedAssessmentId)
                  }}
                  className="btn-outline w-full justify-center py-3"
                >
                  Sign In
                </Link>
                <button
                  type="button"
                  onClick={closeSaveReviewPrompt}
                  className="btn-ghost w-full justify-center"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Send Case Modal — minimal contact info before routing */}
      {sendModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => !submitLoading && setSendModalOpen(false)}>
          <div className="flex min-h-full items-start justify-center py-6 sm:items-center" onClick={e => e.stopPropagation()}>
            <div className="surface-panel max-h-[calc(100vh-3rem)] w-full max-w-md overflow-y-auto p-6 shadow-xl">
            <h3 className="section-title text-ui-xl">Before we send your case to attorneys</h3>
            <p className="section-copy mb-4">
              Attorneys need your contact information and a saved case record before they review the file.
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">First Name *</label>
                <input
                  type="text"
                  value={contactForm.firstName}
                  onChange={e => setContactForm(f => ({ ...f, firstName: e.target.value }))}
                  className="input"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email *</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                  className="input"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone *</label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                  className="input"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred contact</label>
                <div className="flex gap-3">
                  {(['phone', 'text', 'email'] as const).map(m => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="preferredContact"
                        checked={contactForm.preferredContactMethod === m}
                        onChange={() => setContactForm(f => ({ ...f, preferredContactMethod: m }))}
                        className="text-brand-600"
                      />
                      <span className="text-sm capitalize">{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              {attorneySearchLoading && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  Finding the best attorney matches for your case...
                </div>
              )}
              {!attorneySearchLoading && rankedAttorneyCards.length > 0 && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Rank your top 3 attorney matches</label>
                  <p className="mb-3 text-xs text-slate-500">
                    We matched these attorneys based on venue, matter type, response signals, and profile fit. Dragging is not required; use Up/Down to reorder.
                  </p>
                  <div className="space-y-2">
                    {rankedAttorneyCards.map((attorney: any, index) => (
                      <div key={attorney.id || attorney.attorney_id} className="subtle-panel px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Choice {index + 1}</p>
                            <p className="text-sm font-semibold text-slate-900">{attorney?.name ?? 'Attorney'}</p>
                            <p className="text-xs text-slate-600">
                              {[
                                attorney?.law_firm?.name ?? 'Law Firm',
                                `${Math.round((attorney.fit_score || 0.6) * 100)}% fit`,
                                getResponseBadge(attorney)
                              ].filter(Boolean).join(' • ')}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {getAttorneyPracticePreview(attorney, {
                                venueState,
                                venueCounty,
                              }) || getAttorneyWhyMatched(attorney, {
                                assessmentClaimType: assessment?.claimType,
                                venueState,
                                venueCounty,
                              })}
                            </p>
                            <div className="mt-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">Why we recommend them</p>
                              <ul className="mt-1 space-y-1 text-[11px] text-brand-900">
                                {getAttorneyRecommendationReasons(attorney, {
                                  assessmentClaimType: assessment?.claimType,
                                  venueState,
                                  venueCounty,
                                }).map((reason) => (
                                  <li key={reason} className="flex items-start gap-1.5">
                                    <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-brand-600" />
                                    <span>{reason}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                {(attorney.verifiedReviewCount || 0) > 0
                                  ? `${attorney.verifiedReviewCount} verified reviews`
                                  : 'New profile'}
                              </span>
                              {(attorney.averageRating || attorney.rating || 0) > 0 && (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                                  <Star className="mr-1 h-3 w-3" />
                                  {(attorney.averageRating || attorney.rating || 0).toFixed(1)} rating
                                </span>
                              )}
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
                                {getResponseBadge(attorney)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => moveRankedAttorney(attorney.id || attorney.attorney_id, -1)}
                              disabled={index === 0}
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={() => moveRankedAttorney(attorney.id || attorney.attorney_id, 1)}
                              disabled={index === rankedAttorneyCards.length - 1}
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Down
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    We will contact Choice 1 first. If they decline or time out, we automatically move to the next choice.
                  </p>
                </div>
              )}
              {!attorneySearchLoading && rankedAttorneyCards.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                  <p className="font-medium text-amber-950">No attorney list loaded for ranking</p>
                  <p className="mt-1 text-xs text-amber-900/90 leading-relaxed">
                    You can still send your case—we will route it using our standard attorney matching when no ranked list is available. Try{' '}
                    <button
                      type="button"
                      className="font-semibold underline decoration-amber-700 underline-offset-2 hover:text-amber-950"
                      onClick={() => void refreshMatchedAttorneys()}
                    >
                      reload matches
                    </button>{' '}
                    if you want to pick preferred attorneys first.
                  </p>
                </div>
              )}
              {isLoggedIn ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={hasHipaaConsent || sendHipaaConsent}
                      onChange={(e) => setSendHipaaConsent(e.target.checked)}
                      disabled={hasHipaaConsent}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-amber-900">
                      I authorize{' '}
                      <Link
                        to="/hipaa-authorization"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline"
                      >
                        HIPAA disclosure for medical records
                      </Link>{' '}
                      so matched attorneys can review medical records and extracted treatment details. {hasHipaaConsent ? 'Already on file.' : 'Optional, but needed for full medical review.'}
                    </span>
                  </label>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                  <p className="font-semibold">Medical records will not be sent yet.</p>
                  <p className="mt-1">
                    Attorneys will see your non-medical case summary and contact details only. Create an account and complete HIPAA authorization later to share medical records, OCR extraction, bills, and the treatment chronology.
                  </p>
                </div>
              )}
            </div>
            {contactFormError && <p className="mt-2 text-sm text-red-600">{contactFormError}</p>}
            <p className="mt-4 text-xs text-slate-500">Attorneys will review your case and typically respond within 24 hours. Medical records are not shared unless you create/sign in to an account and authorize medical disclosure.</p>
            <p className="mt-1 text-xs text-slate-500">No obligation. You are not required to hire any attorney.</p>
            <button
              onClick={handleSubmitForReview}
              disabled={submitLoading || attorneySearchLoading}
              className="btn-primary mt-4 w-full py-3 text-base disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitLoading ? 'Sending...' : attorneySearchLoading ? 'Finding attorney matches...' : 'Send My Case'}
            </button>
              <button
                type="button"
                onClick={() => !submitLoading && setSendModalOpen(false)}
                className="btn-ghost mt-2 w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="premium-panel overflow-hidden rounded-none p-0 sm:rounded-3xl">
        <header className="border-b border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white px-5 py-5 sm:px-8 sm:py-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Preliminary assessment - confidential
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <img
                src="/clearcaseiq-logo-transparent.png?v=1"
                alt="ClearCaseIQ"
                className="mb-2 h-9 w-auto object-contain"
              />
              <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                Your case snapshot
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Case strength, liability, severity, settlement value, trial exposure, and attorney acceptance probability.
              </p>
            </div>
            <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Reference</p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-700">{(assessment?.id ?? '').slice(0, 8)}…</p>
              </div>
              {showSavePrompt && (
                <Link
                  to={createAccountForReviewUrl}
                  onClick={() => {
                    if (resolvedAssessmentId) localStorage.setItem('pending_assessment_id', resolvedAssessmentId)
                  }}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
                >
                  Create free account
                </Link>
              )}
            </div>
          </div>
        </header>

        <div className="px-6 sm:px-10 py-9 sm:py-10">
        <section className="mb-6 max-w-2xl" aria-label="Your case snapshot">
          <div className="mb-4 flex flex-wrap gap-2 text-xs text-slate-700">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold capitalize shadow-sm">
              {caseSnapshotClaimLabel}
            </span>
              {caseSubtype && (
                <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 font-semibold capitalize text-brand-800 shadow-sm">
                  {formatClaimTypeLabel(assessment?.claimType)} category
                </span>
              )}
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold shadow-sm">
              {[venueCounty, venueState === 'CA' ? 'California' : venueState].filter(Boolean).join(', ') || 'Jurisdiction unavailable'}
            </span>
          </div>
          <p className="mb-5 max-w-2xl text-sm leading-6 text-slate-700">
            Based on the reported {caseSnapshotClaimLabel.toLowerCase()} in{' '}
            {[venueCounty, venueState === 'CA' ? 'California' : venueState].filter(Boolean).join(', ') || 'your venue'},
            attorney acceptance is {attorneyAcceptanceLabel.toLowerCase()} when expected fee, likely case cost, liability, severity, and available documents are weighed together.
          </p>

          <div className="rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white p-6 shadow-sm sm:p-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Case snapshot</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Case Strength</p>
                  <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-slate-950">
                    {caseStrengthScore}/100
                  </p>
                  <p className="mt-1 text-sm font-semibold text-brand-700">
                    {scoreLabel(caseStrengthScore, { high: 'Strong', medium: 'Moderate', low: 'Needs Work' })}
                  </p>
                </div>
                <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Liability</p>
                  <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-slate-950">
                    {liabilityPercent}%
                  </p>
                  <p className="mt-1 text-sm font-semibold text-brand-700">{liabilitySnapshotLabel}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {liabilitySummary}
                  </p>
                </div>
                <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Injury Severity</p>
                  <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-slate-950">
                    {severityPercent}%
                  </p>
                  <p className="mt-1 text-sm font-semibold text-brand-700">{severitySnapshotLabel}</p>
                  <div className="mt-3 grid gap-1.5 text-xs text-slate-700">
                    {severityFactorRows.map((factor) => (
                      <div key={factor.label} className="flex items-center gap-2">
                        {factor.present ? (
                          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        ) : (
                          <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[9px] text-slate-400">×</span>
                        )}
                        <span>{factor.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Settlement Value</p>
                  <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    {displaySettlementRangeText}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-brand-700">
                    Expected: {formatCurrency(settlementExpected)}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Confidence:{' '}
                    <span className={
                      estimateConfidenceLevel === 'High' ? 'font-semibold text-emerald-700' :
                      estimateConfidenceLevel === 'Medium' ? 'font-semibold text-amber-700' : 'font-semibold text-rose-700'
                    }>
                      {estimateConfidenceLevel}
                    </span>
                  </p>
                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{estimateConfidenceLevel} confidence because</p>
                    <ul className="mt-1 space-y-1 text-[11px] text-slate-700">
                      {(confidenceDriversPositive.length > 0 ? confidenceDriversPositive : estimateConfidenceReasons).slice(0, 3).map((reason) => (
                        <li key={reason} className="flex items-start gap-1.5">
                          <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Potential Jury Verdict Range</p>
                  <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    {trialValueText}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Potential litigation exposure before collection, policy, and proof risk.
                  </p>
                </div>
                <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attorney Acceptance Probability</p>
                  <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-slate-950">
                    {attorneyAcceptanceProbability}%
                  </p>
                  <p className="mt-1 text-sm font-semibold text-brand-700">{attorneyAcceptanceLabel}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {attorneyAcceptanceEconomics}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs">
                    {attorneyAcceptanceDrivers.length > 0 && (
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-900">
                        <p className="font-semibold">Driven by:</p>
                        <ul className="mt-1 space-y-1">
                          {attorneyAcceptanceDrivers.map((driver) => (
                            <li key={driver}>✓ {driver}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {attorneyAcceptanceReducingFactors.length > 0 && (
                      <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-amber-900">
                        <p className="font-semibold">Reducing factors:</p>
                        <ul className="mt-1 space-y-1">
                          {attorneyAcceptanceReducingFactors.map((factor) => (
                            <li key={factor}>⚠ {factor}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Insurance Recovery</p>
                  <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-slate-950">
                    {insuranceRecoveryPercent}%
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{insuranceRecoveryLabel}</p>
                </div>
                <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Treatment Quality</p>
                  <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-slate-950">
                    {underwriting?.scores?.treatment ?? (treatment.length > 0 ? 50 : 10)}%
                  </p>
                  <p className="mt-1 text-sm font-semibold text-brand-700">
                    {underwriting?.treatment?.grade ?? (treatment.length > 0 ? 'Developing' : 'Weak')}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {(underwriting?.treatment?.positives?.[0] || underwriting?.treatment?.negatives?.[0]) ?? 'Treatment history improves attorney confidence.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documentation</p>
                  <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-slate-950">
                    {underwriting?.scores?.documentation ?? documentationScore}%
                  </p>
                  <p className="mt-1 text-sm font-semibold text-brand-700">
                    {underwriting?.documentation?.grade ?? scoreLabel(documentationScore, { high: 'Strong', medium: 'Developing', low: 'Sparse' })}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {underwriting?.documentation?.positives?.slice(0, 2).join(', ') || 'Upload records, bills, photos, and wage proof to improve this score.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Economic Damages</p>
                  <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                    <p>Medical Bills: <strong>{documentedMedicalCharges > 0 ? formatCurrency(documentedMedicalCharges) : 'Unknown'}</strong></p>
                    <p>Lost Wages: <strong>{documentedWageLoss > 0 ? formatCurrency(documentedWageLoss) : 'Unknown'}</strong></p>
                    <p>Out-of-Pocket: <strong>{documentedOutOfPocket > 0 ? formatCurrency(documentedOutOfPocket) : 'Unknown'}</strong></p>
                    <p className="border-t border-slate-100 pt-1.5">Total Economic Loss: <strong>{totalEconomicLoss > 0 ? formatCurrency(totalEconomicLoss) : 'Still being calculated'}</strong></p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Venue Assessment</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{formatVenueLabel(venueState, venueCounty) || 'Venue unavailable'}</p>
                  <p className="mt-2 text-sm font-semibold text-brand-700">
                    {venueFriendlinessScore >= 4 ? 'Plaintiff Friendly' : 'Moderate'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{'★'.repeat(venueFriendlinessScore)}{'☆'.repeat(5 - venueFriendlinessScore)} • Impact on value +{venueImpactPercent}%</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Case Completeness</p>
                  <p className="text-sm font-semibold text-brand-700">{caseCompletenessPercent}% Complete</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${caseCompletenessPercent}%` }} />
                </div>
                {missingValueDrivers.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-slate-900">To improve your estimate:</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                      {caseCompletenessItems.map((item) => (
                        <li key={item.label} className="flex items-center gap-2">
                          {item.done ? (
                            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-400">○</span>
                          )}
                          <span>{item.label}</span>
                          {!item.done && <span className="ml-auto rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">{item.boost}</span>}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      These uploads can raise settlement confidence, attorney acceptance, and the precision of the potential jury verdict range.
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">Your core documents are in place. Additional details may still refine the estimate.</p>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended Attorneys</p>
                  <p className="text-sm font-semibold text-brand-700">Top Attorney Matches Available</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">Attorneys are revealed after you continue to attorney review.</p>
                {attorneySearchLoading ? (
                  <p className="mt-3 text-sm text-slate-600">Finding attorney matches for this venue and claim type...</p>
                ) : rankedSnapshotAttorneys.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {rankedSnapshotAttorneys.map((attorney: any, index) => (
                      <div key={attorney.id || attorney.attorney_id || attorney.name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-950">
                            Match #{index + 1}
                          </p>
                          <p className="text-xs text-slate-600">
                            {[venueCounty || venueState, formatClaimTypeLabel(assessment?.claimType), getResponseBadge(attorney)].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Match Score</p>
                          <p className="text-sm font-bold text-brand-700">{formatMatchScore(attorney.matchScore ?? attorney.match_score ?? attorney.score, 94 - index * 3)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">
                    Attorney matches load after venue and claim details are available.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-700">
                  {[
                    venueCounty && `${venueCounty} venue`,
                    `${caseSnapshotClaimLabel} expertise`,
                    'Similar retained cases',
                    'Plaintiff response signals',
                  ].filter(Boolean).map((reason) => (
                    <span key={String(reason)} className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800">
                      ✓ {reason}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-950">AI Case Summary</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">Based on the facts reported:</p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {aiCaseSummaryBullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {deadlineWarningText ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-red-900">Important</p>
                  <p className="mt-1 text-sm leading-relaxed text-red-800">{deadlineWarningText}</p>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Strongest Factors</p>
                  {strongestCaseFactors.length > 0 ? (
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                      {strongestCaseFactors.map((factor) => (
                        <li key={factor} className="flex items-start gap-2">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">The case can become clearer as treatment and documents are added.</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Potential Value Drivers</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                    {potentialValueDrivers.map((driver) => (
                      <li key={driver} className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                        <span>{driver}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={openAttorneyReviewFlow}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-brand-700 px-5 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-brand-800"
                >
                  {medicalReviewPending ? 'Continue to Attorney Review' : 'See if an attorney wants your case'}
                </button>
                {medicalReviewPending ? (
                  <p className="text-center text-xs leading-5 text-slate-600">
                    Review your treatment timeline before submitting.
                  </p>
                ) : null}
                <Link
                  to={`/evidence-upload/${assessment.id}`}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Strengthen My Case First
                </Link>
              </div>
            </div>
          </div>
        </section>

        <details className="group mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
            <span>Why did we estimate this?</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-slate-100 px-5 py-4">
            <ul className="space-y-2 text-sm text-slate-700">
              {confidenceDriversPositive.map((driver) => (
                <li key={driver} className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{driver.charAt(0).toUpperCase() + driver.slice(1)}</span>
                </li>
              ))}
              {confidenceDriversNegative.map((driver) => (
                <li key={driver} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>{driver.charAt(0).toUpperCase() + driver.slice(1)}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>

        <details className="group mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
            <span>Advanced case analysis</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-4 border-t border-slate-100 px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Case signals</p>
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {caseSignalRows.map((row) => (
                    <tr key={row.signal} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-4 font-medium text-slate-700">{row.signal}</td>
                      <td className="py-2 text-right font-semibold text-slate-950">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Litigation readiness</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{litigationReadinessScore}%</p>
              <p className="text-sm text-slate-600">{litigationReadinessStatus}</p>
              {litigationReadinessMissing.length > 0 && (
                <p className="mt-2 text-xs text-slate-600">
                  Missing: {litigationReadinessMissing.join(', ')}.
                </p>
              )}
            </div>

            <details className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-indigo-950">
                Litigation potential: {litigationPotentialLabel}
              </summary>
              <div className="mt-3 text-xs leading-relaxed text-indigo-900">
                <p>Current information suggests the case may have additional value if:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Medical treatment continues</li>
                  <li>• Imaging confirms injury findings</li>
                  <li>• Liability evidence strengthens</li>
                  <li>• Wage loss or future care is documented</li>
                </ul>
                <p className="mt-2 font-semibold text-indigo-950">{litigationExposureText}</p>
              </div>
            </details>
          </div>
        </details>

        <details ref={fullReportDetailsRef} className="group mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
            <span>Full report</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
        <nav className="surface-panel mb-6 overflow-x-auto p-2" aria-label="Results sections">
          <div className="flex min-w-max gap-2">
            {resultsTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveResultsTab(tab.id)}
                className={`workspace-tab text-left ${
                  activeResultsTab === tab.id
                    ? 'workspace-tab-active'
                    : ''
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="status-pill-neutral ml-2 px-2 py-0.5 text-[11px]">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {activeResultsTab === 'liability' && (
        <section className="premium-panel mb-8" aria-label="Liability snapshot">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Liability snapshot</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 capitalize">
                {liabilityOutlook} outlook
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">{liabilitySummary}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-72">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Score</p>
                <p className="mt-1 text-lg font-bold text-slate-950">{Math.round(liabilityScore * 100)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Confidence</p>
                <p className="mt-1 text-lg font-bold text-slate-950">{liabilityConfidence}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Shared fault</p>
                <p className="mt-1 text-lg font-bold text-slate-950">{comparativeFaultRisk}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-4">
              <h3 className="text-sm font-semibold text-emerald-950">What supports liability</h3>
              <ul className="mt-3 space-y-2 text-sm text-emerald-900">
                {(liabilityPositiveSignals.length > 0 ? liabilityPositiveSignals : ['The current facts provide an initial liability story, but more support would help.']).map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-4">
              <h3 className="text-sm font-semibold text-amber-950">What could be challenged</h3>
              <ul className="mt-3 space-y-2 text-sm text-amber-900">
                {(liabilityRiskSignals.length > 0 ? liabilityRiskSignals : ['No major liability challenge signals were detected from the current facts.']).map((item) => (
                  <li key={item} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-4">
              <h3 className="text-sm font-semibold text-brand-950">Best ways to strengthen it</h3>
              <ul className="mt-3 space-y-2 text-sm text-brand-900">
                {liabilityStrengthenActions.map((item) => (
                  <li key={item} className="flex gap-2">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
            This is a model-based liability estimate, not a legal conclusion. An attorney will confirm fault, defenses, and comparative negligence after reviewing the documents and applicable law.
          </p>
        </section>
        )}

        {activeResultsTab === 'medical' && (
        <div id="medical-story-review" ref={medicalReviewRef} className="mb-8 scroll-mt-6">
          <div className="mb-4 rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Medical bills found</p>
                <p className="mt-1 text-2xl font-bold text-brand-950">
                  {extractedBillTotal > 0 ? formatCurrency(extractedBillTotal) : 'No extracted bill total yet'}
                </p>
                <p className="mt-1 text-sm text-brand-900/80">
                  {extractedBillTotal > 0
                    ? 'Review this total while confirming your medical story. Add missing bills or update uploads if it looks incomplete.'
                    : 'Upload itemized medical bills so your medical story includes the treatment costs.'}
                </p>
              </div>
              <Link
                to={`/evidence-upload/${resolvedAssessmentId || assessment?.id}`}
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50"
              >
                Add or update bills
              </Link>
            </div>
            {extractedWageLossTotal > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">Lost wages found separately: {formatCurrency(extractedWageLossTotal)}</p>
                <p className="mt-1 text-xs leading-relaxed">
                  This is not included in the medical bill total. Please review wage-loss documents separately because summaries can include duplicate subtotal and total amounts.
                </p>
              </div>
            )}
          </div>
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Don&apos;t have documents yet?</p>
                <p className="mt-1 text-sm text-slate-600">
                  Enter your best estimates for now. Uploaded bills and records can replace these numbers later.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveDamageEstimates}
                disabled={damageEstimateSaving}
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {damageEstimateSaving ? 'Saving...' : 'Save estimates'}
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['medicalBillsEstimate', 'Estimated medical bills'],
                ['lostWagesEstimate', 'Estimated lost wages'],
                ['outOfPocketEstimate', 'Out-of-pocket costs'],
                ['propertyDamageEstimate', 'Property damage'],
                ['futureTreatmentEstimate', 'Expected future treatment'],
              ].map(([key, label]) => (
                <label key={key} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={damageEstimateForm[key as keyof typeof damageEstimateForm]}
                      onChange={(e) => setDamageEstimateForm((current) => ({ ...current, [key]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 pl-7 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="0"
                    />
                  </div>
                </label>
              ))}
            </div>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Notes about these estimates
              <textarea
                value={damageEstimateForm.notes}
                onChange={(e) => setDamageEstimateForm((current) => ({ ...current, notes: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="Example: ER bill not received yet; missed about two weeks of work."
              />
            </label>
            {damageEstimateStatus && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{damageEstimateStatus}</p>
            )}
          </div>
          <PlaintiffMedicalChronology
            review={displayedPlaintiffMedicalReview}
            saving={medicalReviewSaving}
            statusMessage={medicalReviewStatus}
            errorMessage={medicalReviewError}
            onEditChange={handleMedicalReviewEditChange}
            onSaveDraft={() => persistPlaintiffMedicalReview({ status: 'pending' })}
            onConfirm={() => persistPlaintiffMedicalReview({ status: 'confirmed' })}
            onSkip={() => persistPlaintiffMedicalReview({ status: 'skipped' })}
          />
        </div>
        )}

        {activeResultsTab === 'documents' && (
        <section className="premium-panel mb-8" aria-label="Documents">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Documents</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">Strengthen your file</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Uploading the right documents can improve estimate confidence and make attorney review faster.
              </p>
            </div>
            <p className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">{evidenceCompletionPercent}% ready</p>
          </div>

          {missingDocItems.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {missingDocItems.slice(0, 6).map((item: any) => {
                const action = getMissingDocAction(item, assessment?.id)
                return (
                  <div key={item.key ?? item.label} className="subtle-panel px-4 py-4">
                    <p className="text-sm font-semibold text-slate-900">{item?.label ?? 'Missing document'}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {item?.priority === 'high' ? 'High impact on value and attorney review speed.' : 'Helpful for strengthening the file.'}
                    </p>
                    <Link
                      to={action.to}
                      className="mt-3 inline-flex items-center rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-50"
                    >
                      {action.label}
                    </Link>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              No major missing-document gaps were detected from the current file. You look close to attorney-review ready.
            </div>
          )}

          {treatmentGapItems.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              Treatment gap detected: {treatmentGapItems?.[0]?.gapDays ?? 'Unknown'} days between {treatmentGapItems?.[0]?.startDate ? new Date(treatmentGapItems[0].startDate).toLocaleDateString() : 'an unknown start date'} and {treatmentGapItems?.[0]?.endDate ? new Date(treatmentGapItems[0].endDate).toLocaleDateString() : 'an unknown end date'}.
            </div>
          )}

          {medicalDocumentFiles.length > 0 && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Medical document extraction</p>
                  <p className="text-xs text-slate-600">We read medical records and bills for dates, providers, treatment events, and amounts.</p>
                </div>
                <Link
                  to={assessment?.id ? `/evidence-upload/${assessment.id}` : '/evidence-upload'}
                  className="text-xs font-semibold text-brand-700 hover:text-brand-900"
                >
                  Manage uploads
                </Link>
              </div>
              <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">Extracted bill total</p>
                    <p className="mt-1 text-2xl font-bold text-brand-950">
                      {extractedBillTotal > 0 ? formatCurrency(extractedBillTotal) : 'No bill total found yet'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-brand-900/80">
                      {extractedBillTotal > 0
                        ? 'This is the sum of dollar amounts found in uploaded files marked as bills. Please review for duplicates, summaries, or non-medical amounts.'
                        : 'Upload itemized medical bills so we can total the charges for your case value estimate.'}
                    </p>
                  </div>
                  <Link
                    to={`/evidence-upload/${resolvedAssessmentId || assessment?.id}`}
                    className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50"
                  >
                    Add or update bills
                  </Link>
                </div>
                {extractedBillItems.length > 0 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {extractedBillItems.slice(0, 4).map((item) => (
                      <div key={item.id} className="rounded-lg bg-white/80 px-3 py-2 text-xs text-brand-900 ring-1 ring-brand-100">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="mt-0.5 font-semibold">{formatCurrency(item.totalAmount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {extractedWageLossTotal > 0 && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-semibold">Lost wages found separately: {formatCurrency(extractedWageLossTotal)}</p>
                  <p className="mt-1 text-xs leading-relaxed">
                    We keep wage-loss documents out of the medical bill total. Review this amount separately before relying on it.
                  </p>
                </div>
              )}
              <div className="mt-3 grid gap-2">
                {medicalDocumentFiles.slice(0, 4).map((file) => {
                  const extracted = file.extractedData?.[0]
                  const timelineCount = parseJsonArrayValue(extracted?.timeline).length
                  const datesCount = parseJsonArrayValue(extracted?.dates).length
                  return (
                    <div key={file.id || file.originalName} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-medium text-slate-900">{file.originalName || 'Medical document'}</span>
                        <span className="font-semibold text-brand-700">{getDocumentProcessingLabel(file)}</span>
                      </div>
                      {(timelineCount > 0 || datesCount > 0 || extracted?.totalAmount) && (
                        <p className="mt-1 text-slate-500">
                          {[
                            timelineCount > 0 ? `${timelineCount} timeline item${timelineCount === 1 ? '' : 's'}` : null,
                            datesCount > 0 ? `${datesCount} date${datesCount === 1 ? '' : 's'}` : null,
                            extracted?.totalAmount ? `$${Number(extracted.totalAmount).toLocaleString()} found` : null,
                          ].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-indigo-950">Ready to turn your records into a demand?</p>
                <p className="mt-1 text-sm text-indigo-900/80">
                  Once your key records are uploaded, you can generate a self-help settlement demand package.
                </p>
              </div>
              <Link
                to={`/demand/${assessment.id}`}
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
              >
                Build demand package
              </Link>
            </div>
          </div>
        </section>
        )}

        {activeResultsTab === 'value' && (
        <details className="surface-panel mb-10 px-5 py-5">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Why we estimated this</p>
                <p className="mt-1 text-sm text-slate-600">Open for liability, settlement, timeline, and document details.</p>
              </div>
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Show details</span>
            </div>
          </summary>

        <div className="mt-6 mb-8">
          <PlaintiffCaseCommandCenter summary={displayedCommandCenter} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-3">Overall assessment</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative inline-flex h-20 w-20 shrink-0 items-center justify-center">
              <svg className="absolute h-20 w-20 -rotate-90 text-slate-200" viewBox="0 0 36 36" aria-hidden>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  className="text-brand-600"
                  strokeWidth="3"
                  strokeDasharray={`${caseStrengthScore} ${100 - caseStrengthScore}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="relative text-lg font-bold text-brand-800 tabular-nums">{caseStrengthScore}</span>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">
                {caseStrengthScore} / 100 - {caseStrengthLabel(caseStrengthScore)}
              </p>
              <p className="text-sm text-slate-600 mt-1">Composite score from viability and file signals.</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 mb-8 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2 text-center">Liability outlook</p>
          <p className="text-lg font-semibold text-slate-900 capitalize text-center tracking-tight">{liabilityOutlook}</p>
          <p className="text-sm text-slate-600 text-center mt-2 leading-relaxed max-w-xl mx-auto">{liabilitySummary}</p>
          {comparativeFaultPercent > 0 && (
            <p className="text-xs text-amber-700 text-center mt-2">
              Comparative fault risk: insurers may argue you share about {comparativeFaultPercent}% of the blame.
            </p>
          )}
          {liabilityFactors.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3 text-center">Factors considered</p>
              <div className="grid gap-2 max-w-lg mx-auto">
                {liabilityFactors.map((factor: string) => (
                  <div key={factor} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-700 text-left leading-relaxed">
                    {factor}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border-l-4 border-l-brand-600 border border-slate-200 bg-slate-50/60 p-6 sm:p-8 mb-10 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">Modeled settlement range</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-1">
            {displaySettlementRangeText}
          </p>
          <div className="mb-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{consumerEstimateLabel}</span>
              <span className="text-gray-500"> · Estimate confidence {estimateConfidenceScore}/100</span>
            </p>
            {estimateConfidenceReasons.length > 0 && (
              <ul className="mt-2 text-xs text-gray-500 space-y-0.5">
                {estimateConfidenceReasons.map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            )}
            {evidenceLevelConfidence.confidence !== 'Very high' && (
              <>
                <p className="text-xs text-gray-400 mt-2">
                  {t('results.uploadHint')}
                </p>
                <div className="mt-2 text-xs text-gray-500 border-t border-gray-200 pt-2">
                  <p className="font-medium text-gray-600 mb-1">{t('results.evidenceLevel')}</p>
                  <table className="w-full">
                    <tbody>
                      <tr><td className="py-0.5">{t('results.noDocuments')}</td><td className="py-0.5 text-right">{t('results.low')}</td></tr>
                      <tr><td className="py-0.5">{t('results.medicalBills')}</td><td className="py-0.5 text-right">{t('results.medium')}</td></tr>
                      <tr><td className="py-0.5">{t('results.medicalRecords')}</td><td className="py-0.5 text-right">{t('results.high')}</td></tr>
                      <tr><td className="py-0.5">{t('results.policeAndRecords')}</td><td className="py-0.5 text-right">{t('results.veryHigh')}</td></tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Chance of a successful outcome</p>
              <p className="text-lg font-semibold text-gray-900">{successProbability}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Likely timeline</p>
              <p className="text-lg font-semibold text-gray-900">{estimatedTimeline}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Recommended next step</p>
              <p className="text-lg font-semibold text-brand-600">See if an attorney wants your case</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mt-4 leading-relaxed">
            Settlement estimates reflect injury-supported value after settlement compression, liability risk, evidence confidence, venue signals, and insurance constraints. Not a guarantee of outcome.
          </p>
        </div>

        <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">Litigation potential</p>
            <p className="mt-2 text-sm leading-relaxed text-indigo-900">
              Current information suggests the case may have additional value if medical treatment continues, imaging confirms injury findings, liability evidence strengthens, or wage loss and future care are documented.
            </p>
            <p className="mt-3 text-xl font-bold tracking-tight text-indigo-950">{litigationExposureText}</p>
            {!isEarlyStageEstimate && (
              <p className="mt-3 text-xs leading-relaxed text-indigo-800">
                Trial outcomes are uncertain, take longer, cost more, and may be limited by collectability or policy limits.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Key drivers</p>
            <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              {valuationKeyDrivers.map((driver) => (
                <li key={driver} className="flex gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <span>{driver}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Calculation detail 1</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">Base case type range</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            We start with the case category before adding facts like fault, treatment, documents, venue, insurance, and injury severity.
            Different claim types begin in different baseline ranges because attorneys and insurers evaluate them with different proof burdens,
            expected treatment patterns, and liability issues.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Your selected type</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{baseCaseTypeRange.label}</p>
              <p className="mt-2 text-2xl font-bold text-brand-800">{baseCaseTypeRange.range}</p>
              <p className="mt-2 text-sm leading-relaxed text-brand-950">{baseCaseTypeRange.floor}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-950">Why this type starts there</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{baseCaseTypeRange.why}</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {baseCaseTypeRange.examples.map((example) => (
                  <li key={example} className="flex gap-2">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-3 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <span>Claim type</span>
              <span>Starting range</span>
              <span>Why it differs</span>
            </div>
            {[
              ['Auto accident', '$15k - $75k', 'Often clearer insurance, incident timing, and treatment path.'],
              ['Slip and fall', '$12k - $60k', 'Depends heavily on proving hazard notice and property responsibility.'],
              ['Dog bite', '$20k - $90k', 'Visible injury, scarring, and strict-liability rules may increase baseline.'],
              ['Medical malpractice', '$50k - $250k+', 'Higher damages potential, but requires records, causation, and expert review.'],
            ].map(([label, range, reason]) => (
              <div key={label} className="grid grid-cols-3 gap-3 border-t border-slate-200 px-3 py-3 text-sm text-slate-700">
                <span className="font-semibold text-slate-950">{label}</span>
                <span>{range}</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            This is the starting point only. The displayed settlement range of {settlementRangeText}
            {' '}reflects later adjustments from your specific facts and available documents.
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Calculation detail 2</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">How the baseline is adjusted</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            The model does not treat each fact as a fixed dollar add-on. Instead, it treats major facts as modifiers that can
            increase confidence, reduce risk discounts, move the case into a higher injury band, or keep the estimate conservative.
          </p>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-950">Settlement calculation model</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Injury-supported value x settlement compression x liability risk x evidence confidence x venue / insurance constraints.
            </p>
            <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-5">
              {[
                'Injury-supported value',
                'Settlement compression',
                'Liability risk',
                'Evidence confidence',
                'Venue / insurance',
              ].map((part, index) => (
                <div key={part} className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Step {index + 1}</p>
                  <p className="mt-1 font-semibold text-slate-950">{part}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              This is why the explanation says clear liability reduces discounting instead of saying it added a specific dollar amount.
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-4">
            <p className="text-sm font-semibold text-indigo-950">Trial calculation model</p>
            <p className="mt-2 text-xs leading-relaxed text-indigo-900">
              Economic damages + non-economic damages + future damages, adjusted by liability, venue, jury risk, and evidence strength.
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-3 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <span>Modifier</span>
              <span>Current effect</span>
              <span>How it changes the estimate</span>
            </div>
            {calculationModifierRows.map((row) => (
              <div key={row.label} className="grid grid-cols-3 gap-3 border-t border-slate-200 px-3 py-3 text-sm text-slate-700">
                <span>
                  <span className="block font-semibold text-slate-950">{row.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{row.range}</span>
                </span>
                <span className="font-medium text-slate-900">{row.effect}</span>
                <span>{row.explanation}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950">
            Example: clear liability usually improves confidence and reduces the fault discount. It is not modeled as a universal
            “+$10,000” rule because the dollar impact depends on the size of the case, injury severity, available insurance, and evidence.
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">Self-help settlement option</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950">Prepare your own demand package</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                If you want to try resolving the claim yourself, generate a pro-se settlement demand letter, checklist, and downloadable DOCX. This does not replace legal advice.
              </p>
              <div className="mt-3 rounded-lg bg-white/70 px-3 py-3 text-sm text-slate-700">
                <span className="font-semibold text-slate-950">{diySuitabilityLabel}:</span>{' '}
                {diyRiskFlags.length > 0
                  ? diyRiskFlags.slice(0, 2).join(' ')
                  : 'Your current file does not show the common DIY risk flags we screen for.'}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Link to={`/demand/${assessment.id}`} className="btn-primary">
                Build demand package
              </Link>
              <Link to={`/attorneys?assessmentId=${assessment.id}`} className="btn-outline">
                Compare with attorney review
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-5 mb-10">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5 text-brand-600 shrink-0" />
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">Comparable benchmarks</h3>
              </div>
              {settlementBenchmarks ? (
                <>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(settlementBenchmarks.p50)}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Midpoint for comparable {formatClaimTypeLabel(assessment?.claimType)} cases in {venueState === 'CA' ? 'California' : venueState}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-gray-500">25th %</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(settlementBenchmarks.p25)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-gray-500">75th %</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(settlementBenchmarks.p75)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-gray-500">Sample size</p>
                      <p className="font-semibold text-gray-900">{settlementBenchmarks.count}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  We do not have enough benchmark data for this venue yet, so your estimate is based mainly on your facts, injuries, and uploaded records.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-brand-600 shrink-0" />
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">Expected timeline</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">{timelineEstimate.label}</p>
              <p className="text-sm text-gray-600 mt-1">
                Stage: {timelineEstimate.stage} • Confidence: {timelineEstimate.confidence}
              </p>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {timelineDrivers.slice(0, 3).map((driver) => (
                  <li key={driver} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={`${solStatusTone} border rounded-xl p-5 sm:p-6 shadow-sm`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">Statute of limitations</h3>
            </div>
            <p className="font-medium">
              {solDeadline ? `Estimated filing deadline: ${solDeadline}` : 'We could not calculate a filing deadline from the current facts.'}
            </p>
            <p className="text-sm mt-1">
              {solDeadline ? `Time remaining: ${solRemaining}.` : 'Add the incident date and venue details to confirm this risk.'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="h-5 w-5 text-brand-600 shrink-0" />
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">Documentation & readiness</h3>
            </div>
            {missingDocItems.length > 0 ? (
              <div className="space-y-3">
                {missingDocItems.slice(0, 5).map((item: any) => (
                  <div key={item.key} className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{item?.label ?? 'Missing item'}</p>
                      <p className="text-sm text-gray-600">
                        {item.priority === 'high' ? 'High impact on value and attorney review speed.' : item.priority === 'medium' ? 'Helpful for strengthening the file.' : 'Useful supporting context.'}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : item.priority === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                ))}
                {treatmentGapItems.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                    Treatment gap detected: {treatmentGapItems?.[0]?.gapDays ?? 'Unknown'} days between {treatmentGapItems?.[0]?.startDate ? new Date(treatmentGapItems[0].startDate).toLocaleDateString() : 'an unknown start date'} and {treatmentGapItems?.[0]?.endDate ? new Date(treatmentGapItems[0].endDate).toLocaleDateString() : 'an unknown end date'}.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                No major missing-document gaps were detected from the current file. You look close to attorney-review ready.
              </div>
            )}
          </div>
        </div>
        </details>
        )}

        {activeResultsTab === 'attorney' && (
        <section className="premium-panel mb-8" aria-label="Attorney review">
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-900">
          <span className="font-semibold">Attorney review does not mean you are hiring a lawyer.</span>{' '}
          It sends your summary for review so interested attorneys can contact you. You decide whether to speak with or hire anyone.
        </div>

        {showSavePrompt && reviewPromptDismissed && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            <p className="font-semibold">Your case is not sent yet.</p>
            <p className="mt-1">
              Create a free account when you are ready to send it for attorney review. Your assessment is saved on this device for now.
            </p>
          </div>
        )}

        {showSavePrompt && (
          <div className="mb-8 rounded-xl border border-brand-200/80 bg-brand-50/70 px-5 py-5 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-brand-950">Save your case</h2>
            <p className="mt-2 text-sm text-brand-900/90 leading-relaxed">
              Create an account to return to this matter, upload records, and track attorney responses.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to={createAccountForReviewUrl}
                onClick={() => {
                  if (resolvedAssessmentId) localStorage.setItem('pending_assessment_id', resolvedAssessmentId)
                }}
                className="inline-flex items-center justify-center rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
              >
                Create account
              </Link>
              <Link
                to={signInForReviewUrl}
                onClick={() => {
                  if (resolvedAssessmentId) localStorage.setItem('pending_assessment_id', resolvedAssessmentId)
                }}
                className="inline-flex items-center justify-center rounded-lg border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50/80"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}

        <div id="attorney-handoff" className="border-t border-slate-200 pt-8 mt-2 scroll-mt-6">
          <p className="text-center text-sm text-slate-600 mb-3 leading-relaxed">
            Ready to see if an attorney wants your case? Matched counsel typically respond within one business day.
          </p>
          {medicalReviewPending && (
            <p className="mb-3 text-center text-sm text-amber-700">
              Review your treatment timeline before submitting. You can confirm it or skip it for now.
            </p>
          )}
          <button
            type="button"
            onClick={openAttorneyReviewFlow}
            className="block w-full text-center py-3.5 text-base font-semibold text-white bg-brand-700 rounded-xl hover:bg-brand-800 shadow-sm transition-colors"
          >
            {medicalReviewPending ? 'Continue to Attorney Review' : t('results.sendForReview')}
          </button>
        </div>
        </section>
        )}
          </div>
        </details>
        </div>
      </div>

      <Suspense fallback={<ResultsPanelSkeleton message="Loading report details..." />}>
        <ResultsReportDetails
          assessmentId={assessment.id}
          assessmentClaimType={assessment?.claimType}
          evidenceCompletionPercent={evidenceCompletionPercent}
          handleCopyShareLink={handleCopyShareLink}
          handleDownloadReportPdf={handleDownloadReportPdf}
          improveCaseValueItems={improveCaseValueItems}
          isLoggedIn={isLoggedIn}
          rankedAttorneys={rankedAttorneyCards}
          shareCopied={shareCopied}
          solDeadline={solDeadline}
          solRemaining={solRemaining}
          settlementHigh={formatCurrency(settlementHigh)}
          settlementLow={formatCurrency(settlementLow)}
          venueCounty={venueCounty}
          venueState={venueState}
          whatThisMeansBullets={whatThisMeansBullets}
        />
      </Suspense>
    </div>
  )
}

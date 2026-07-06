import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  getWaveConfig,
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
import EstimateAccuracyStages from '../components/EstimateAccuracyStages'
import CaseFileChecklist from '../components/CaseFileChecklist'
import { useLanguage } from '../contexts/LanguageContext'
import { formatPhoneInput, validatePhoneField } from '../lib/phone'
import { savePendingRegistration } from '../lib/pendingRegistration'
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
  Star,
  Car,
  MapPin,
  DollarSign,
  Shield,
  ShieldCheck,
  User,
  FileText,
  Download,
  Upload,
  Lock,
  Scale,
  Activity,
  TrendingUp,
  Stethoscope,
  Lightbulb,
  Camera,
  Briefcase,
  HelpCircle,
  Eye,
  Pencil,
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

type ResultsTab = 'overview' | 'liability' | 'medical' | 'documents' | 'value' | 'attorney'

type TimelineEstimate = {
  label: string
  stage: string
  confidence: 'low' | 'medium' | 'high'
  drivers: string[]
}

const CLAIM_TYPE_LABELS: Record<string, string> = {
  auto: 'auto accident',
  slip_and_fall: 'slip and fall',
  workplace: 'workplace injury',
  medmal: 'medical malpractice',
  dog_bite: 'dog bite',
  product: 'product liability',
  assault: 'assault',
  toxic: 'toxic exposure',
}

const CASE_SUBTYPE_LABELS: Record<string, string> = {
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

// Passing the `t` translator localizes the label; omitting it keeps the English
// fallback (used where a translator is not in scope, e.g. attorney tags).
function formatClaimTypeLabel(claimType?: string, t?: (key: string) => string) {
  if (!claimType) return t ? t('results.claimTypes.default') : 'personal injury'
  if (t && claimType in CLAIM_TYPE_LABELS) return t(`results.claimTypes.${claimType}`)
  return CLAIM_TYPE_LABELS[claimType] || claimType.replace(/_/g, ' ')
}

function formatCaseSubtypeLabel(caseSubtype?: string, t?: (key: string) => string) {
  if (!caseSubtype) return ''
  if (t && caseSubtype in CASE_SUBTYPE_LABELS) return t(`results.caseSubtypes.${caseSubtype}`)
  return CASE_SUBTYPE_LABELS[caseSubtype] || caseSubtype.replace(/_/g, ' ')
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
  // A report opened via the "Copy Link" share URL carries ?share=1 and is
  // presented read-only: recipients can view but not edit estimates, reorder
  // attorneys, or otherwise mutate the case (#12).
  const isSharedReadOnly = searchParams.get('share') === '1'
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
  // Admin-configured wave-1 size caps how many attorney choices the plaintiff
  // sees/ranks in the Case Snapshot popup (#219). Defaults to 3.
  const [waveOneSize, setWaveOneSize] = useState(3)
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
  const [contactPhoneError, setContactPhoneError] = useState<string | null>(null)
  // Send modal: collapse heavy/optional steps so the form reads as "send as… + consent + send".
  const [showAttorneyRanking, setShowAttorneyRanking] = useState(false)
  const [showContactEdit, setShowContactEdit] = useState(false)
  const [commandCenter, setCommandCenter] = useState<CaseCommandCenter | null>(null)
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>('overview')
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
  const caseSnapshotClaimLabel = formatCaseSubtypeLabel(caseSubtype, t) || formatClaimTypeLabel(assessment?.claimType, t)
  const hasHipaaConsent = parsedFacts?.consents?.hipaa === true || hipaaAuthorizationComplete

  useEffect(() => {
    let cancelled = false
    void getWaveConfig().then((config) => {
      if (!cancelled) setWaveOneSize(Math.max(1, config.maxAttorneysWave1 || 3))
    })
    return () => { cancelled = true }
  }, [])

  const refreshMatchedAttorneys = async () => {
    if (!assessment || !venueState) return []
    try {
      setAttorneySearchLoading(true)
      const data = await searchAttorneys({
        venue: venueState,
        claim_type: assessment.claimType,
        limit: Math.max(waveOneSize, 3)
      })
      const list = (Array.isArray(data) ? data : (data?.attorneys ?? [])).slice(0, Math.max(waveOneSize, 3))
      setMatchedAttorneys(list)
      const defaultIds = list.map((attorney: any) => attorney.id || attorney.attorney_id).filter(Boolean)
      // If the plaintiff already customized their attorney order (persisted on the
      // assessment when they sent it for review), preserve that order instead of
      // resetting to the default match ranking — otherwise the case report shows
      // the wrong choice order (#189).
      const savedRankedIds = Array.isArray(parsedFacts?.plaintiffAttorneyPreferences?.rankedAttorneyIds)
        ? (parsedFacts.plaintiffAttorneyPreferences.rankedAttorneyIds as string[]).filter(Boolean)
        : []
      const orderedIds = savedRankedIds.length > 0
        ? [
            ...savedRankedIds.filter((id) => defaultIds.includes(id)),
            ...defaultIds.filter((id: string) => !savedRankedIds.includes(id)),
          ]
        : defaultIds
      setRankedAttorneyIds(orderedIds.slice(0, waveOneSize))
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
    // Only force the medical-timeline review when there is actually a timeline to
    // review. medicalReviewPending defaults to 'pending' whenever the review
    // payload hasn't loaded (or the case has no medical story), which left
    // "Continue to Attorney Review" silently redirecting to an empty medical
    // section instead of opening the send popup the user expects (#225).
    const hasMedicalStoryToReview = Array.isArray(medicalChronology) && medicalChronology.length > 0
    if (currentMedicalReviewStatus === 'pending' && hasMedicalStoryToReview) {
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
    setShowAttorneyRanking(false)
    setShowContactEdit(false)
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
    if (isSharedReadOnly) return // view-only shared report cannot reorder attorneys (#12)
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
    // Only the assessment id is truly required to save. Previously this also
    // required plaintiffMedicalReview to be loaded, which left the
    // "I'll do this later" / confirm buttons silently dead when the review
    // payload hadn't loaded (e.g. the medical-malpractice snapshot), since
    // edits already falls back to [] below (#25).
    if (!resolvedAssessmentId) return
    if (isSharedReadOnly) return // view-only shared report cannot mutate the case (#12)
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
    if (isSharedReadOnly) return // view-only shared report cannot edit the medical review (#12)
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
    if (isSharedReadOnly) return // view-only shared report cannot submit the case (#12)
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
    const phoneValidationError = validatePhoneField(phone, { required: true })
    if (phoneValidationError) {
      setContactPhoneError(phoneValidationError)
      setContactFormError(phoneValidationError)
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
          .slice(0, waveOneSize)
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
    if (isSharedReadOnly) return // view-only shared report cannot re-submit the case (#12)
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
        
        // Get prediction if not already available. A valuation failure must
        // never blank the whole results page — fall back to whatever the
        // assessment already carries so the UI can still show a preliminary
        // estimate (and the missing-data note) instead of an error screen.
        if (assessmentData.latest_prediction) {
          setPrediction(assessmentData.latest_prediction)
        } else {
          try {
            const predictionData = await predict(resolvedAssessmentId)
            setPrediction(predictionData)
          } catch (predictErr) {
            console.error('Prediction unavailable; rendering preliminary view', predictErr)
            setPrediction(null)
          }
        }
        
        // Calculate SOL
        const facts = typeof assessmentData.facts === 'string'
          ? JSON.parse(assessmentData.facts)
          : assessmentData.facts
        if (facts?.incident?.date) {
          // SOL is supplemental — an unsupported jurisdiction (e.g. non-U.S.) returns
          // a 400 and must not break the rest of the results page.
          try {
            const solData = await calculateSOL(
              facts.incident.date,
              facts.venue || { state: assessmentData.venue?.state, county: assessmentData.venue?.county },
              facts.claimType || assessmentData.claimType
            )
            setSol(solData)
          } catch (solErr) {
            console.warn('SOL unavailable for this venue; continuing without it', solErr)
            setSol(null)
          }
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

  // Refresh evidence + assessment/prediction after the client adds a document so
  // the case-file checklist and the live estimate reflect the new upload (the
  // multi-upload path re-runs the valuation server-side).
  const handleEvidenceUploaded = useCallback(async () => {
    if (!resolvedAssessmentId) return
    try {
      const files = await getEvidenceFiles(resolvedAssessmentId)
      const fileList = Array.isArray(files) ? files : []
      setEvidenceCount(fileList.length)
      setEvidenceFiles(fileList)
    } catch {
      /* keep prior evidence on transient failure */
    }
    try {
      const assessmentData = await getAssessment(resolvedAssessmentId)
      setAssessment(assessmentData)
      if (assessmentData?.latest_prediction) setPrediction(assessmentData.latest_prediction)
    } catch {
      /* estimate refresh is best-effort */
    }
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

  // React Query owns the refetch cadence for case insights so the page (Medical Story,
  // settlement ranges, missing docs, etc.) stays fresh automatically: it refetches on tab
  // focus and network reconnect, and polls every few seconds while the tab is visible
  // (polling auto-pauses in the background). loadCaseInsights remains the single place that
  // writes the derived state consumed throughout this component.
  useQuery({
    queryKey: ['caseInsights', resolvedAssessmentId],
    enabled: !!resolvedAssessmentId,
    queryFn: async () => {
      await loadCaseInsights()
      return Date.now()
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })

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
      return [...preserved, ...missing].slice(0, waveOneSize)
    })
  }, [matchedAttorneys, waveOneSize])

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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">We couldn’t load your report</h2>
          <p className="text-gray-600">{error || 'Assessment not found'}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {/* A transient fetch failure (e.g. when navigating back to this page)
                shouldn't force the user to lose their case — let them retry the
                same report before starting over (#24). */}
            {resolvedAssessmentId && (
              <button type="button" onClick={() => window.location.reload()} className="btn-primary">
                Try again
              </button>
            )}
            <Link to="/assess" className={resolvedAssessmentId ? 'btn-outline' : 'btn-primary'}>
              Start New Assessment
            </Link>
          </div>
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
  // Inputs for the case-file checklist and accuracy-stages tracker.
  const hasInsuranceDoc =
    evidenceFiles.some(f => f.category === 'insurance') ||
    !!(parsedFacts?.insurance?.defendant_coverage_limits || parsedFacts?.insurance?.policy_limit || parsedFacts?.insurance?.has_um_uim_coverage)
  const economicsEnteredForStages =
    documentedMedicalCharges > 0 ||
    documentedWageLoss > 0 ||
    Number(damagesObj.estimated_property_damage || 0) > 0 ||
    Number(damagesObj.estimated_future_med_charges || 0) > 0
  const hasSupportingDocuments = evidenceFiles.some(f => f.category === 'bills' || f.category === 'medical_records')
  const medicalSpecialsVerified = damagesObj.med_charges_source === 'documented'
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
  const attorneyInterestPercent = Math.max(0, Math.min(100, Math.round(readinessDetails?.percent ?? caseStrengthScore)))
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
  // Some model factors arrive cut off mid-sentence (e.g. "strict liability may");
  // drop fragments that end on a dangling connective so we never show broken text.
  const isTruncatedFragment = (text: string) =>
    /\b(may|and|or|but|the|a|an|to|of|with|is|are|can|could|will|would|should|that|which|when|while|because)$/i.test(
      text.trim().replace(/[.…]+$/, '').trim()
    )
  const liabilityFactors = rawLiabilityFactors
    .map((factor: string) => normalizeReportText(factor))
    .filter(Boolean)
    .filter((factor: string) => !isTruncatedFragment(factor))
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
  const displaySettlementHighValue = Math.max(displaySettlementLow + 5000, displaySettlementHigh)
  const displaySettlementRangeText = `${formatCurrency(displaySettlementLow)} - ${formatCurrency(displaySettlementHighValue)}`
  // Keep the "most likely" point inside the displayed range. When the range is
  // scaled down for early-stage estimates, map the raw expected's relative
  // position into the displayed range so it never falls outside the bounds.
  const rawSettlementSpan = Math.max(1, settlementHigh - settlementLow)
  const settlementExpectedFraction = Math.min(1, Math.max(0, (settlementExpected - settlementLow) / rawSettlementSpan))
  const displaySettlementExpected = isEarlyStageEstimate
    ? Math.min(
        displaySettlementHighValue,
        Math.max(
          displaySettlementLow,
          Math.round((displaySettlementLow + settlementExpectedFraction * (displaySettlementHighValue - displaySettlementLow)) / 1000) * 1000,
        ),
      )
    : Math.min(displaySettlementHighValue, Math.max(displaySettlementLow, settlementExpected))
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
    high: t('results.snapshotGrades.moderateStrong'),
    medium: t('results.snapshotGrades.mixed'),
    low: t('results.snapshotGrades.needsProof'),
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
    high: t('results.snapshotGrades.moderateSevere'),
    medium: t('results.snapshotGrades.moderate'),
    low: t('results.snapshotGrades.developing'),
  })

  // ---- Potential litigation costs (itemized, informational) ----
  // Pre-suit items are typically incurred even when a case settles without a
  // lawsuit; deposition + expert items only apply if the case is litigated.
  const hasValuation = displaySettlementExpected > 0
  const costFilingFees = hasValuation ? 400 : 0
  const costServiceFees = hasValuation ? 125 : 0
  const costRecordRetrieval = hasValuation ? Math.min(Math.max(medicalDocumentFiles.length * 75, 150), 1500) : 0
  const costOtherExpenses = hasValuation ? 350 : 0
  const costDeposition = hasValuation ? (severityPercent >= 66 ? 3000 : severityPercent >= 40 ? 2000 : 1200) : 0
  const costExpertWitness = hasValuation ? (severityPercent >= 66 ? 7500 : severityPercent >= 40 ? 4000 : 1800) : 0
  const litigationCostItems = [
    { label: 'Court filing fees', amount: costFilingFees, stage: 'pre' as const },
    { label: 'Service / citation fees', amount: costServiceFees, stage: 'pre' as const },
    { label: 'Medical record retrieval', amount: costRecordRetrieval, stage: 'pre' as const },
    { label: 'Deposition expenses', amount: costDeposition, stage: 'litigation' as const },
    { label: 'Expert witness fees', amount: costExpertWitness, stage: 'litigation' as const },
    { label: 'Other litigation expenses', amount: costOtherExpenses, stage: 'pre' as const },
  ]
  const litigationCostTotal = litigationCostItems.reduce((sum, item) => sum + item.amount, 0)
  // Pre-suit subset feeds the net-recovery deduction so the headline figure is
  // not penalized by costs that only occur if the case is actively litigated.
  const preSuitCaseExpenses = litigationCostItems
    .filter((item) => item.stage === 'pre')
    .reduce((sum, item) => sum + item.amount, 0)

  // ---- Estimated net recovery ("take-home") ----
  const netAttorneyFee = Math.round(displaySettlementExpected * 0.33)
  const netMedicalLiens = Math.round(Math.min(documentedMedicalCharges, displaySettlementExpected))
  const netCaseExpenses = preSuitCaseExpenses
  // Raw (unclamped) take-home. In a contingency case the plaintiff never owes
  // out of pocket beyond the recovery, so the headline is floored at $0 — but a
  // bare green "$0" implied break-even when deductions actually meet/exceed the
  // settlement, so we surface that explicitly in the UI (#22).
  const netEstimatedRecoveryRaw = displaySettlementExpected - netAttorneyFee - netMedicalLiens - netCaseExpenses
  const netEstimatedRecovery = Math.max(0, netEstimatedRecoveryRaw)
  const netRecoveryExhaustedByCosts = netEstimatedRecoveryRaw <= 0

  // Inputs that would most improve a sparse valuation (shown as a missing-data note).
  const valuationMissingInputs = [
    !hasMedicalRecords && 'medical records',
    !hasMedicalBills && 'medical bills',
    treatment.length === 0 && medicalChronology.length === 0 && 'treatment history',
    documentedWageLoss === 0 && 'proof of lost wages',
  ].filter(Boolean) as string[]

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
    high: t('results.snapshotGrades.veryLikely'),
    medium: t('results.snapshotGrades.possible'),
    low: t('results.snapshotGrades.uncertain'),
  })
  const attorneyAcceptanceDrivers = [
    liabilityOutlook === 'strong' && 'Strong liability',
    severityPercent >= 70 && 'Severe injuries',
    venueCounty && `${venueCounty} venue`,
    insuranceRecoveryPercent >= 70 && 'Insurance available',
    hasMedicalRecords && 'Treatment records available',
  ].filter(Boolean).slice(0, 4) as string[]
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
  const aiCaseSummaryBullets = Array.from(new Set([
    liabilityOutlook === 'strong'
      ? t('results.summaryBullets.defendantResponsible')
      : liabilityOutlook === 'moderate'
        ? t('results.summaryBullets.responsibilityDisputed')
        : t('results.summaryBullets.liabilityNeedsFacts'),
    treatment.length > 0 || hasMedicalRecords
      ? t('results.summaryBullets.injuriesSupported')
      : t('results.summaryBullets.treatmentLimited'),
    hasMedicalRecords || hasMedicalBills || hasPoliceReport
      ? t('results.summaryBullets.documentationSupports')
      : t('results.summaryBullets.additionalEvidence'),
    missingValueDrivers.length > 0
      ? t('results.summaryBullets.additionalEvidence')
      : t('results.summaryBullets.coreDocsPresent')
  ]))
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
  // Self-reported economic inputs the client may have skipped at intake. Unlike
  // the document-evidence prompts above, these are the dollar figures that feed
  // the valuation directly — when missing, the estimate is a conservative floor.
  const hasReportedInsuranceInfo =
    policyLimitConstrained ||
    !!(
      parsedFacts?.insurance?.defendant_coverage_limits ||
      parsedFacts?.insurance?.um_uim ||
      parsedFacts?.insurance?.has_um_uim_coverage
    )
  const reportedPropertyDamage = Number(
    damagesObj.estimated_property_damage || damagesObj.property_damage || 0
  )
  const reportedFutureTreatment = Number(
    damagesObj.estimated_future_med_charges || damagesObj.future_medical || 0
  )
  const missingEstimateInputs = [
    documentedMedicalCharges <= 0 && {
      label: 'Medical bill total',
      helper: 'Your treatment costs are a core part of the claim and usually raise the estimate.',
    },
    documentedWageLoss <= 0 && {
      label: 'Lost wages',
      helper: 'Time missed from work adds to your recoverable damages.',
    },
    !hasReportedInsuranceInfo && {
      label: 'Insurance / policy limits',
      helper: "Knowing the at-fault driver's coverage helps set a realistic recovery ceiling.",
    },
    reportedPropertyDamage <= 0 && {
      label: 'Property / vehicle damage',
      helper: 'Vehicle and property damage counts toward your economic losses.',
    },
    reportedFutureTreatment <= 0 && {
      label: 'Expected future treatment',
      helper: 'Ongoing or future care can significantly increase case value.',
    },
  ].filter(Boolean) as Array<{ label: string; helper: string }>
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
  const caseStrengthLabel = (s: number) => s >= 75 ? t('results.snapshotGrades.strong') : s >= 50 ? t('results.snapshotGrades.moderatelyStrong') : s >= 25 ? t('results.snapshotGrades.moderate') : t('results.snapshotGrades.needsWork')

  const handleCopyShareLink = () => {
    // Build a read-only share URL (?share=1) so recipients get a view-only
    // report rather than the fully editable owner view (#12).
    const url = new URL(window.location.href)
    url.searchParams.set('share', '1')
    navigator.clipboard.writeText(url.toString()).then(() => {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    })
  }

  const handleDownloadReportPdf = async () => {
   try {
    const { downloadResultsCaseReportPdf } = await import('../lib/reportPdfExports')
    const toneFromPct = (p: number): 'strong' | 'moderate' | 'weak' => (p >= 66 ? 'strong' : p >= 40 ? 'moderate' : 'weak')
    const jurisdiction = [venueCounty, venueState === 'CA' ? 'California' : venueState].filter(Boolean).join(', ') || 'Jurisdiction unavailable'
    const caseDetails: { label: string; value: string; tone: 'strong' | 'moderate' | 'weak'; desc: string }[] = [
      { label: 'Fault / Liability', value: liabilitySnapshotLabel, tone: toneFromPct(liabilityPercent), desc: liabilitySummary || 'Based on the reported facts.' },
      { label: 'Injury Severity', value: severitySnapshotLabel, tone: toneFromPct(severityPercent), desc: 'Reported injuries and treatment so far.' },
      { label: 'Treatment History', value: treatmentStrengthLevel, tone: treatmentStrengthLevel === 'High' ? 'strong' : treatmentStrengthLevel === 'Medium' ? 'moderate' : 'weak', desc: treatment.length > 0 ? `${treatment.length} treatment record${treatment.length === 1 ? '' : 's'} on file.` : 'No treatment records yet.' },
      { label: 'Insurance Coverage', value: insuranceRecoveryPercent >= 75 ? 'Sufficient' : insuranceRecoveryPercent >= 50 ? 'Developing' : 'Unclear', tone: toneFromPct(insuranceRecoveryPercent), desc: insuranceRecoveryLabel },
      { label: 'Documentation', value: scoreLabel(documentationScore, { high: 'Strong', medium: 'Developing', low: 'Low' }), tone: toneFromPct(documentationScore), desc: `${documentationScore}% of key documents added.` },
      { label: 'Venue (Location)', value: venueFriendlinessScore >= 4 ? 'Favorable' : 'Moderate', tone: venueFriendlinessScore >= 4 ? 'strong' : 'moderate', desc: formatVenueLabel(venueState, venueCounty) || 'Venue unavailable' },
    ]
    await downloadResultsCaseReportPdf({
      referenceId: (assessment?.id ?? '').slice(0, 8).toUpperCase() || null,
      claimLabel: caseSnapshotClaimLabel,
      jurisdiction,
      incidentDate: snapshotIncidentDate ?? 'Not provided',
      caseStrengthScore,
      successProbability,
      evidenceCompletionPercent,
      solRemaining,
      solDeadline,
      estimatedTimeline,
      settlementRangeText: displaySettlementRangeText,
      settlementExpectedText: formatCurrency(displaySettlementExpected),
      estimateConfidenceLevel,
      trialValueText,
      trialExpectedText: formatCurrency(Math.round((potentialTrialLow + potentialTrialHigh) / 2)),
      liabilityLabel: liabilitySnapshotLabel,
      liabilitySummary: liabilitySummary || 'Based on the facts provided, fault may rest with the other party. More evidence will strengthen liability.',
      liabilityChecklist: liabilityChecklist.map((r) => ({ label: r.label, ok: r.ok })),
      liabilityPercent: Math.round(liabilityPercent),
      attorneyInterestWord,
      attorneyInterestSummary: attorneyInterestLevel === 'High' ? 'Your case looks attractive to attorneys based on the current facts.' : 'Your case has potential, but additional records will help attract more attorney interest.',
      attorneyInterestMissing,
      caseDetails,
      topActions: snapshotTopActions.map((a) => ({ title: a.title, desc: a.desc, boost: a.boost })),
      aiSummaryBullets: aiCaseSummaryBullets,
      valueDrivers: valueDriverRows.map((r) => ({ label: r.label, level: impactWord(r.level) })),
      deadlineWarning: deadlineWarningText || null,
      assessmentId: assessment?.id,
    })
   } catch (err) {
     console.error('Failed to generate case report PDF:', err)
     const detail = err instanceof Error && err.message ? `\n\nDetails: ${err.message}` : ''
     alert(`Sorry, the case report PDF could not be generated right now. Please try again.${detail}`)
   }
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
    if (isSharedReadOnly) return // view-only shared report cannot save wage loss (#12)
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
    if (isSharedReadOnly) return // view-only shared report cannot mutate the case (#12)
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
  // Only treat the medical-story review as "pending" when there's an actual
  // timeline to confirm; otherwise the attorney-review CTA stayed stuck
  // redirecting to an empty medical section instead of opening the popup (#225).
  const medicalReviewPending = medicalChronology.length > 0 && (plaintiffMedicalReview?.review.status ?? 'pending') === 'pending'
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
  // Translated display of the same value; the English `liabilityClarityLabel`
  // above is kept as a stable enum for the branching logic further below.
  const liabilityClarityDisplay = liabilityOutlook === 'strong' ? t('results.snapshotGrades.strong') : liabilityOutlook === 'moderate' ? t('results.snapshotGrades.mixed') : t('results.snapshotGrades.unclear')
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
  const resultsTabs: Array<{ id: ResultsTab; label: string; badge?: string; badgeNeedsAction?: boolean }> = [
    { id: 'overview', label: t('results.tabs.overview') },
    { id: 'liability', label: t('results.tabs.liability'), badge: liabilityClarityDisplay },
    { id: 'medical', label: t('results.tabs.medical'), badge: medicalReviewPending ? t('results.tabs.reviewNeeded') : undefined, badgeNeedsAction: medicalReviewPending },
    { id: 'value', label: t('results.tabs.value') },
    { id: 'documents', label: t('results.tabs.documents'), badge: missingDocItems.length > 0 ? `${missingDocItems.length} ${t('results.tabs.missingSuffix')}` : t('results.tabs.ready'), badgeNeedsAction: missingDocItems.length > 0 },
    { id: 'attorney', label: t('results.tabs.attorney'), badge: medicalReviewPending ? t('results.tabs.actionNeeded') : undefined, badgeNeedsAction: medicalReviewPending },
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
  // Hand the contact details we already have to the signup step so the plaintiff
  // only has to set a password there (name/email/phone arrive prefilled).
  const handleGoCreateAccount = () => {
    if (resolvedAssessmentId) localStorage.setItem('pending_assessment_id', resolvedAssessmentId)
    savePendingRegistration({
      firstName: contactForm.firstName,
      email: contactForm.email,
      phone: contactForm.phone,
    })
  }

  const closeSaveReviewPrompt = () => {
    if (resolvedAssessmentId) localStorage.setItem('pending_assessment_id', resolvedAssessmentId)
    setSaveReviewPromptOpen(false)
    setReviewPromptDismissed(true)
  }
  const contactComplete = Boolean(contactForm.firstName.trim() && contactForm.email.trim() && contactForm.phone.trim())

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

  // ---- Case Snapshot (redesigned) derived values ----
  const snapshotIncidentDate = (() => {
    const raw = parsedFacts?.incident?.date
    if (!raw) return null
    const d = new Date(raw)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  })()
  const attorneyInterestWord =
    attorneyInterestLevel === 'High' ? t('results.snapshotGrades.strong') : attorneyInterestLevel === 'Medium' ? t('results.snapshotGrades.building') : t('results.snapshotGrades.early')
  const attorneyInterestPct =
    attorneyInterestLevel === 'High' ? 85 : attorneyInterestLevel === 'Medium' ? 55 : 28
  const hasWitnessStatements = /witness/i.test(String(parsedFacts?.incident?.narrative || ''))
  const liabilityChecklist = [
    { label: t('results.liabilityChecklist.policeReport'), ok: hasPoliceReport },
    { label: t('results.liabilityChecklist.photosOfDamage'), ok: hasInjuryPhotos },
    { label: t('results.liabilityChecklist.witnessStatements'), ok: hasWitnessStatements },
    { label: t('results.liabilityChecklist.faultAppearsClear'), ok: liabilityOutlook === 'strong' },
  ]
  const impactWord = (level: ConsumerConfidenceLevel) =>
    level === 'High' ? 'High impact' : level === 'Medium' ? 'Medium impact' : 'Low impact'
  const severityImpactLevel: ConsumerConfidenceLevel =
    severityPercent >= 66 ? 'High' : severityPercent >= 40 ? 'Medium' : 'Low'
  const valueDriverRows: { label: string; level: ConsumerConfidenceLevel }[] = [
    { label: 'Severity of injuries', level: severityImpactLevel },
    { label: 'Medical treatment', level: treatmentStrengthLevel },
    { label: 'Lost income', level: documentedWageLoss > 0 ? 'Medium' : 'Low' },
    { label: 'Pain & suffering', level: severityImpactLevel },
    { label: 'Liability strength', level: liabilityStrengthLevel },
  ]
  const snapshotActionMeta: Record<string, { icon: typeof FileText; cta: string; title: string; desc: string }> = {
    'Police report': { icon: FileText, cta: 'Upload', title: 'Upload police report', desc: 'Liability is easier to prove with official documentation.' },
    'Medical records': { icon: Stethoscope, cta: 'Upload', title: 'Upload medical records', desc: 'Shows the extent of your injuries and treatment.' },
    'Medical bills': { icon: FileText, cta: 'Upload', title: 'Upload medical bills', desc: 'Documents the economic value of your treatment.' },
    'Wage loss evidence': { icon: DollarSign, cta: 'Add', title: 'Add wage verification or pay stubs', desc: 'Helps prove lost income and work impact.' },
  }
  const snapshotTopActions = [
    ...caseCompletenessItems
      .filter((item) => !item.done)
      .map((item) => ({
        title: snapshotActionMeta[item.label]?.title ?? item.label,
        desc: snapshotActionMeta[item.label]?.desc ?? 'Strengthens your case.',
        boost: item.boost,
        icon: snapshotActionMeta[item.label]?.icon ?? FileText,
        cta: snapshotActionMeta[item.label]?.cta ?? 'Add',
      })),
    { title: 'Continue consistent treatment', desc: 'Ongoing treatment improves case value.', boost: '+5%', icon: Calendar, cta: 'Learn more' },
  ].slice(0, 4)

  // Localized labels for the case-snapshot cost/action sections (#14). The
  // underlying data keeps its English label (used as React keys and in the PDF
  // export); only the displayed text is translated, falling back to English.
  const snapshotLabelMap: Record<string, string> = {
    'Court filing fees': t('results.snap.costFiling'),
    'Service / citation fees': t('results.snap.costService'),
    'Medical record retrieval': t('results.snap.costRecords'),
    'Deposition expenses': t('results.snap.costDeposition'),
    'Expert witness fees': t('results.snap.costExpert'),
    'Other litigation expenses': t('results.snap.costOther'),
    'Upload police report': t('results.snap.actPoliceTitle'),
    'Upload medical records': t('results.snap.actRecordsTitle'),
    'Upload medical bills': t('results.snap.actBillsTitle'),
    'Add wage verification or pay stubs': t('results.snap.actWageTitle'),
    'Continue consistent treatment': t('results.snap.actTreatmentTitle'),
    'Liability is easier to prove with official documentation.': t('results.snap.actPoliceDesc'),
    'Shows the extent of your injuries and treatment.': t('results.snap.actRecordsDesc'),
    'Documents the economic value of your treatment.': t('results.snap.actBillsDesc'),
    'Helps prove lost income and work impact.': t('results.snap.actWageDesc'),
    'Ongoing treatment improves case value.': t('results.snap.actTreatmentDesc'),
    'Strengthens your case.': t('results.snap.actDefaultDesc'),
    'Upload': t('results.snap.ctaUpload'),
    'Add': t('results.snap.ctaAdd'),
    'Learn more': t('results.snap.ctaLearnMore'),
  }
  const trSnap = (value: string) => snapshotLabelMap[value] ?? value

  // ---- "Your next step" guidance: the single linear path the plaintiff should follow ----
  const nextStepItems: Array<{
    title: string
    desc: string
    done: boolean
    optional?: boolean
    cta: string
    action?: () => void
    href?: string
  }> = [
    {
      title: 'Review your treatment timeline',
      desc: 'Confirm or adjust your medical story so attorneys see an accurate timeline.',
      done: !medicalReviewPending,
      cta: 'Review',
      action: () => openAnchoredResultsSection('#medical-story-review'),
    },
    {
      title: 'Send your case for attorney review',
      desc: 'Attorneys who handle cases like yours review it — free, with no obligation.',
      done: false,
      cta: 'Send for review',
      action: openAttorneyReviewFlow,
    },
    {
      title: 'Add supporting documents',
      desc: 'Medical records, injury photos, and wage-loss proof can raise your case value.',
      done: hasMedicalRecords && hasInjuryPhotos && hasWageLossProof,
      optional: true,
      cta: 'Add documents',
      href: assessment?.id ? `/evidence-upload/${assessment.id}` : '/evidence-upload',
    },
  ]
  const currentNextStepIndex = nextStepItems.findIndex((s) => !s.done && !s.optional)

  // ---- Full Case Report: Case Overview tab derived values ----
  const overviewQualityScore = (Math.round(caseStrengthScore / 10 * 10) / 10).toFixed(1)
  const overviewQualityLabel = scoreLabel(caseStrengthScore, { high: t('results.snapshotGrades.strong'), medium: t('results.snapshotGrades.good'), low: t('results.snapshotGrades.developing') })
  const solDaysRemaining = sol?.expiresAt
    ? Math.max(0, Math.round((new Date(sol.expiresAt).getTime() - Date.now()) / 86_400_000))
    : null
  const solDeadlineShort = sol?.expiresAt
    ? new Date(sol.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const overviewLiabilityChecks = [
    { label: isRearEndCase ? 'Rear-end collision' : 'Reported incident', value: isRearEndCase ? 'Supports fault' : 'Noted', ok: true },
    { label: 'Fault appears clear', value: liabilityOutlook === 'strong' ? 'Yes' : 'Disputed', ok: liabilityOutlook === 'strong' },
    { label: 'Police report', value: hasPoliceReport ? 'On file' : 'Missing', ok: hasPoliceReport },
    { label: 'Witnesses', value: hasWitnessStatements ? 'Noted' : 'Missing', ok: hasWitnessStatements },
  ]
  const futureMedicalEstimateLow = hasMriReportedFlag || treatment.length >= 3 ? 5000 : 0
  const futureMedicalEstimateHigh = hasMriReportedFlag || treatment.length >= 3 ? 10000 : 0
  const painSufferingLow = Math.round(displaySettlementLow * 0.4)
  const painSufferingHigh = Math.round(displaySettlementHigh * 0.6)
  const overviewDamageRows = [
    { label: 'Medical Specials (bills received)', value: documentedMedicalCharges > 0 ? formatCurrency(documentedMedicalCharges) : 'Not provided' },
    { label: 'Future Medical (estimated)', value: futureMedicalEstimateHigh > 0 ? `${formatCurrency(futureMedicalEstimateLow)} – ${formatCurrency(futureMedicalEstimateHigh)}` : 'Not calculated' },
    { label: 'Lost Wages (reported)', value: documentedWageLoss > 0 ? formatCurrency(documentedWageLoss) : 'Not provided' },
    { label: 'Reduced Earning Capacity', value: 'Not calculated' },
    { label: 'Pain & Suffering (estimated)', value: `${formatCurrency(painSufferingLow)} – ${formatCurrency(painSufferingHigh)}` },
  ]
  const overviewMissingMeta: Record<string, { range: string; priority: 'High' | 'Medium' | 'Low' }> = {
    'Police report': { range: '+10-15%', priority: 'High' },
    'Medical records': { range: '+10-15%', priority: 'High' },
    'Medical bills': { range: '+5-10%', priority: 'Medium' },
    'Wage loss evidence': { range: '+5-10%', priority: 'Medium' },
  }
  const overviewMissingRows: { label: string; range: string; priority: 'High' | 'Medium' | 'Low' }[] = caseCompletenessItems
    .filter((item) => !item.done)
    .map((item) => ({
      label: item.label,
      range: overviewMissingMeta[item.label]?.range ?? item.boost,
      priority: overviewMissingMeta[item.label]?.priority ?? 'Medium',
    }))
  if (!hasInjuryPhotos) {
    overviewMissingRows.push({ label: 'Photos of vehicle damage', range: '+2-5%', priority: 'Low' })
  }
  const overviewNarrative = [
    isRearEndCase ? 'You were rear-ended' : `Your ${caseSnapshotClaimLabel.toLowerCase()} occurred`,
    venueCounty ? ` in ${venueCounty}` : venueState ? ` in ${venueState === 'CA' ? 'California' : venueState}` : '',
    '. ',
    (treatment.length > 0 || hasMedicalRecords) ? 'You received medical care' : 'Treatment documentation is still limited',
    hasMriReportedFlag ? ' including MRI findings' : '',
    '. ',
    liabilityOutlook === 'strong' ? 'Liability appears favorable' : liabilityOutlook === 'moderate' ? 'Liability looks shared or disputed' : 'Liability needs more support',
    !hasPoliceReport ? ', though the police report is still missing' : '',
    `. Current settlement value is estimated between ${displaySettlementRangeText}, with higher value possible if treatment continues and supporting records are added.`,
  ].join('')

  // ---- Liability Analysis tab derived values ----
  const liabFaultOther = clampPercent(Math.round(liabilityPercent))
  const liabFaultYou = clampPercent(Math.round((100 - liabilityPercent) * 0.35))
  const liabFaultShared = clampPercent(100 - liabFaultOther - liabFaultYou)
  const liabMostLikelyAtFault = liabFaultOther >= liabFaultShared && liabFaultOther >= liabFaultYou
    ? 'Other Driver'
    : liabFaultShared >= liabFaultYou ? 'Shared Fault' : 'You'
  const liabAttorneyCurrent = clampPercent(12 + (isRearEndCase ? 8 : 0) + (hasPoliceReport ? 23 : 0) + (hasInjuryPhotos ? 15 : 0) + (hasWitnessStatements ? 12 : 0))
  const liabAttorneyWithPolice = clampPercent(hasPoliceReport ? liabAttorneyCurrent : liabAttorneyCurrent + 23)
  const liabAttorneyWithPolicePhotos = clampPercent(liabAttorneyWithPolice + (hasInjuryPhotos ? 0 : 27))
  const sharedFaultRiskWord = liabilityPercent >= 65 ? 'Low' : liabilityPercent >= 45 ? 'Medium' : 'High'
  const sharedFaultRiskDesc = sharedFaultRiskWord === 'Low' ? 'Estimated 20% or less' : sharedFaultRiskWord === 'Medium' ? 'Estimated 20–40%' : 'Estimated 40% or more'
  const sharedFaultRiskPos = sharedFaultRiskWord === 'Low' ? 18 : sharedFaultRiskWord === 'Medium' ? 50 : 82
  const liabStrengthLabel = liabilityPercent >= 70 ? 'Strongly Favorable' : liabilityPercent >= 55 ? 'Moderately Favorable' : liabilityPercent >= 40 ? 'Mixed' : 'Needs Proof'
  const liabStrongFactors = ([
    isRearEndCase ? { label: 'Rear-end collision', impact: 25 } : null,
    (treatment.length > 0 || hasMedicalRecords) ? { label: 'Immediate medical treatment', impact: 10 } : null,
    hasMriReportedFlag ? { label: 'Injury pattern consistent', impact: 8 } : null,
    { label: 'Consistent timeline reported', impact: 7 },
    { label: 'Defendant identified', impact: 5 },
  ].filter(Boolean) as { label: string; impact: number }[])
  const liabPositiveTotal = liabStrongFactors.reduce((sum, f) => sum + f.impact, 0)
  const liabInsuranceArgues = ([
    !hasPoliceReport ? 'No police report uploaded' : null,
    !hasWitnessStatements ? 'No witness statements identified' : null,
    !hasInjuryPhotos ? 'No scene or vehicle damage photos' : null,
    'Liability based mostly on your description',
    isRearEndCase ? 'Possible argument of sudden stop' : null,
  ].filter(Boolean) as string[])
  const liabNegativeTotal = Math.min(45, liabInsuranceArgues.length * 7)
  const liabAdditionalEvidence = ([
    !hasPoliceReport ? { label: 'Police report', impact: 15, icon: FileText } : null,
    !hasWitnessStatements ? { label: 'Witness statement', impact: 12, icon: User } : null,
    !hasInjuryPhotos ? { label: 'Scene photos', impact: 10, icon: MapPin } : null,
    { label: 'Traffic citation', impact: 10, icon: Scale },
    { label: 'Dashcam / video', impact: 20, icon: Activity },
  ].filter(Boolean) as { label: string; impact: number; icon: typeof FileText }[])
  const liabMaxIncrease = liabAdditionalEvidence.reduce((sum, e) => sum + e.impact, 0)
  const liabImproveSteps = [
    { score: `${clampPercent(Math.round(liabilityPercent))}%`, label: 'Current Score', desc: "Based on today's information" },
    { score: `${clampPercent(Math.round(liabilityPercent) + 15)}%`, label: '+ Police report', desc: 'Strong official documentation' },
    { score: `${clampPercent(Math.round(liabilityPercent) + 25)}%`, label: '+ Police report + Photos', desc: 'Visual proof supports your version' },
    { score: `${clampPercent(Math.round(liabilityPercent) + 35)}%`, label: '+ Report + Photos + Witness', desc: 'Strong position with multiple evidence' },
    { score: '95%+', label: '+ Report + Photos + Video', desc: 'Very strong liability position' },
  ]
  const liabVenueImpactLow = Math.max(5, Math.round(venueImpactPercent * 0.6))
  const liabRecommendedSteps = [
    { label: 'Upload police report', impact: '+15%', desc: 'Highest impact evidence' },
    { label: 'Add witness information', impact: '+12%', desc: 'Independent accounts help' },
    { label: 'Upload scene photos', impact: '+10%', desc: 'Visual evidence is powerful' },
    { label: 'Confirm insurance details', impact: '+8%', desc: 'Helps identify all coverage' },
  ]

  // ---- Medical Story tab derived values ----
  const medTreatmentEvents: any[] = Array.isArray(medicalChronology) ? medicalChronology : []
  const medTreatmentStrengthPct = clampPercent(
    30 + Math.min(medTreatmentEvents.length, 6) * 8 + (hasMriReportedFlag ? 8 : 0) + (hasErTreatment ? 6 : 0),
  )
  const medTreatmentStrengthLabel = scoreLabel(medTreatmentStrengthPct, { high: t('results.snapshotGrades.strong'), medium: t('results.snapshotGrades.moderate'), low: t('results.snapshotGrades.limited') })
  const medAttorneyReadinessPct = attorneyInterestPct
  const medAttorneyReadinessLabel = medAttorneyReadinessPct >= 70 ? 'Strong readiness' : 'Needs more records'
  const medSeverityPct = Math.round(severityPercent)
  const medCaseConfidencePct = caseStrengthScore
  const medCaseConfidenceLabel = scoreLabel(caseStrengthScore, { high: t('results.snapshotGrades.strong'), medium: t('results.snapshotGrades.moderate'), low: t('results.snapshotGrades.developing') })

  const medTimelineTimes = medTreatmentEvents
    .map((e) => (e?.date ? new Date(e.date).getTime() : NaN))
    .filter((t) => Number.isFinite(t)) as number[]
  const medFirstTime = medTimelineTimes.length ? Math.min(...medTimelineTimes) : null
  const medTreatmentLengthDays = medTimelineTimes.length >= 2
    ? Math.max(0, Math.round((Math.max(...medTimelineTimes) - Math.min(...medTimelineTimes)) / 86_400_000))
    : 0
  const fmtMedDate = (iso: string | null | undefined) => {
    if (!iso) return 'PRESENT'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return 'PRESENT'
    return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()
  }
  const medDayLabel = (iso: string | null | undefined) => {
    if (!iso || medFirstTime == null) return 'Ongoing'
    const t = new Date(iso).getTime()
    if (!Number.isFinite(t)) return 'Ongoing'
    return `Day ${Math.max(0, Math.round((t - medFirstTime) / 86_400_000))}`
  }
  const medTimelineRows = medTreatmentEvents.map((e, i) => ({
    id: e?.id ?? `med-ev-${i}`,
    dateLabel: fmtMedDate(e?.date),
    title: e?.label || (e?.source === 'incident' ? 'Incident' : 'Treatment'),
    detail: e?.details || e?.provider || '',
    dayLabel: medDayLabel(e?.date),
    amount: typeof e?.amount === 'number' && e.amount > 0 ? e.amount : null,
    ongoing: !e?.date,
  }))

  const hasPhysicalTherapy = medTreatmentEvents.some((e) => /therapy|rehab/i.test(`${e?.label || ''} ${e?.details || ''}`))
  const medMissingEvidence = [
    { label: 'Medical records', present: hasMedicalRecords, impact: '+10%' },
    { label: 'Medical bills', present: hasMedicalBills, impact: '+8%' },
    { label: 'MRI report', present: hasMriReportedFlag, impact: '+7%' },
    { label: 'Physical therapy records', present: hasPhysicalTherapy, impact: '+5%' },
    { label: 'Doctor notes / restrictions', present: false, impact: '+5%' },
  ].filter((row) => !row.present)

  const medConfidenceSteps = [
    { label: 'Current', pct: clampPercent(medCaseConfidencePct) },
    { label: '+ Medical\u00A0Records', pct: clampPercent(medCaseConfidencePct + 10) },
    { label: '+ Bills', pct: clampPercent(medCaseConfidencePct + 18) },
    { label: '+ Records + Bills + MRI', pct: clampPercent(medCaseConfidencePct + 30) },
  ]

  const medEconomicRows = [
    { label: 'Medical Bills (received)', value: documentedMedicalCharges },
    { label: 'Lost Wages (reported)', value: documentedWageLoss },
    { label: 'Property Damage', value: Number(damagesObj.property_damage || damagesObj.estimated_property_damage || 0) },
    { label: 'Out-of-Pocket Expenses', value: documentedOutOfPocket },
  ]
  const medEconomicTotal = medEconomicRows.reduce((sum, row) => sum + (Number(row.value) || 0), 0)

  const medFutureIndicators: { label: string; status: 'yes' | 'unconfirmed' | 'unknown' }[] = [
    { label: 'Physical therapy ongoing', status: hasPhysicalTherapy ? 'yes' : 'unconfirmed' },
    { label: 'Symptoms reported as continuing', status: 'yes' },
    { label: 'Specialist evaluation', status: 'unconfirmed' },
    { label: 'Injection or pain management', status: 'unconfirmed' },
    { label: 'Surgery discussed', status: 'unknown' },
  ]
  const medFutureRiskWord = (hasMriReportedFlag || medTreatmentEvents.length >= 4)
    ? 'Moderate'
    : severityPercent >= 66 ? 'Elevated' : 'Low'

  const medRequiredEvidence = [
    { title: 'Medical Records', desc: 'Complete records from all providers and facilities.', present: hasMedicalRecords, icon: Stethoscope },
    { title: 'Medical Bills', desc: 'Itemized bills from all treatment providers.', present: hasMedicalBills, icon: FileText },
    { title: 'MRI/Imaging Reports', desc: 'Radiology reports and imaging results.', present: hasMriReportedFlag, icon: Activity },
    { title: 'Specialist Reports', desc: 'Reports from specialists or other providers.', present: false, icon: ClipboardList },
  ]
  const medHelpfulEvidence = [
    { title: 'Injury Photos', desc: 'Photos of visible injuries after the accident.', icon: Camera },
    { title: 'Medication Receipts', desc: 'Prescription and medication receipts.', icon: FileText },
    { title: 'Work Restrictions', desc: 'Doctor notes for work restrictions.', icon: Briefcase },
    { title: 'Appointment Summaries', desc: 'Visit summaries and treatment notes.', icon: Calendar },
  ]
  const medAiSummary = `Based on the information and records reviewed so far, ${(treatment.length > 0 || hasMedicalRecords) ? 'you sought treatment shortly after the accident' : 'treatment documentation is still limited'}. ${medTreatmentEvents.length > 0 ? `Your care includes ${hasErTreatment ? 'emergency treatment, ' : ''}${hasMriReportedFlag ? 'diagnostic imaging, ' : ''}and physical therapy for neck and back injuries` : 'Adding records will help build your treatment timeline'}. Symptoms appear consistent with the reported injuries.`

  // "What to do now" banner state for the Medical Story tab.
  const medReviewStatusValue = plaintiffMedicalReview?.review.status ?? 'pending'
  const medHasAnyRecords = hasMedicalRecords || hasMedicalBills || medTimelineRows.length > 0

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
                  onClick={handleGoCreateAccount}
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
              {contactComplete && !showContactEdit ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sending as</p>
                    <p className="truncate text-sm font-semibold text-slate-900">{contactForm.firstName}</p>
                    <p className="truncate text-xs text-slate-600">{contactForm.email}{'  \u00B7  '}{contactForm.phone}{'  \u00B7  prefers '}{contactForm.preferredContactMethod}</p>
                  </div>
                  <button type="button" onClick={() => setShowContactEdit(true)} className="shrink-0 text-xs font-semibold text-brand-700 hover:text-brand-800">Edit</button>
                </div>
              ) : (
              <>
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
                  inputMode="tel"
                  value={contactForm.phone}
                  onChange={e => {
                    setContactForm(f => ({ ...f, phone: formatPhoneInput(e.target.value) }))
                    if (contactPhoneError) setContactPhoneError(null)
                  }}
                  onBlur={e => setContactPhoneError(validatePhoneField(e.target.value, { required: true }) ?? null)}
                  aria-invalid={!!contactPhoneError}
                  className={`input ${contactPhoneError ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="(555) 123-4567"
                />
                {contactPhoneError && <p className="mt-1 text-xs text-red-600">{contactPhoneError}</p>}
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
              </>
              )}
              {attorneySearchLoading && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  Finding the best attorney matches for your case...
                </div>
              )}
              {!attorneySearchLoading && rankedAttorneyCards.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">We&apos;ll send to your 3 best matches</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{rankedAttorneyCards.map((a: any, i) => `${i + 1}. ${a?.name ?? 'Attorney'}`).join('  \u00B7  ')}</p>
                    </div>
                    <button type="button" onClick={() => setShowAttorneyRanking((v) => !v)} className="shrink-0 whitespace-nowrap text-xs font-semibold text-brand-700 hover:text-brand-800">
                      {showAttorneyRanking ? 'Done' : 'Customize order'}
                    </button>
                  </div>
                  {showAttorneyRanking && (
                  <div className="mt-3">
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
                              disabled={index === 0 || isSharedReadOnly}
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={() => moveRankedAttorney(attorney.id || attorney.attorney_id, 1)}
                              disabled={index === rankedAttorneyCards.length - 1 || isSharedReadOnly}
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
                {t('results.chrome.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="premium-panel overflow-hidden rounded-none p-0 sm:rounded-3xl">
        <header className="border-b border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/clearcaseiq-logo-transparent.png?v=1"
                alt="ClearCaseIQ"
                className="h-7 w-auto object-contain"
              />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {t('results.chrome.preliminaryConfidential')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-slate-500 sm:inline">
                {t('results.chrome.reference')} <span className="font-mono text-slate-700">{(assessment?.id ?? '').slice(0, 8).toUpperCase()}</span>
              </span>
              <button
                type="button"
                onClick={() => { void handleDownloadReportPdf() }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" /> {t('results.chrome.downloadSummary')}
              </button>
            </div>
          </div>
          {isSharedReadOnly && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
              <Eye className="h-4 w-4 shrink-0" aria-hidden />
              <span>{t('results.chrome.sharedReadOnly')}</span>
            </div>
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                {t('results.headings.snapshot')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {t('results.headings.snapshotSub')}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
              <button
                type="button"
                onClick={openAttorneyReviewFlow}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
              >
                {t('results.shared.continueReview')} <ChevronRight className="h-4 w-4" />
              </button>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Lock className="h-3 w-3" /> {t('results.chrome.privateSecureBadge')}
              </span>
            </div>
          </div>
        </header>

        <div className="px-6 sm:px-10 pt-9 pb-28 sm:pt-10 lg:pb-10">
        <section className="mb-6 space-y-5" aria-label={t('results.aria.snapshot')}>
          {/* Your next step — the single primary guidance card */}
          <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm">
            <p className="flex items-center gap-1.5 font-display text-base font-semibold text-slate-900">
              <ClipboardList className="h-4 w-4 text-brand-700" aria-hidden /> {t('results.chrome.yourNextStep')}
            </p>
            <p className="mt-0.5 text-sm text-slate-600">{t('results.chrome.followSteps')}</p>
            <ol className="mt-4 space-y-2.5">
              {nextStepItems.map((step, i) => {
                const isCurrent = i === currentNextStepIndex
                const isDone = step.done
                const showAction = (isCurrent || (step.optional && !isDone)) && (step.action || step.href)
                return (
                  <li
                    key={step.title}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${isCurrent ? 'border-brand-300 bg-white shadow-sm' : 'border-transparent bg-white/60'}`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isDone ? 'bg-emerald-100 text-emerald-700' : isCurrent ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isDone ? <CheckCircle className="h-4 w-4" aria-hidden /> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`flex flex-wrap items-center gap-1.5 text-sm font-semibold ${isDone ? 'text-slate-400' : 'text-slate-900'}`}>
                        <span className={isDone ? 'line-through' : undefined}>{step.title}</span>
                        {step.optional && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{t('results.shared.optional')}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{step.desc}</p>
                    </div>
                    {showAction && step.href ? (
                      <Link
                        to={step.href}
                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                      >
                        {step.cta}
                      </Link>
                    ) : showAction && step.action ? (
                      <button
                        type="button"
                        onClick={step.action}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm ${
                          isCurrent ? 'bg-brand-700 text-white hover:bg-brand-800' : 'border border-slate-200 bg-white text-brand-700 hover:bg-brand-50'
                        }`}
                      >
                        {step.cta}
                        {isCurrent && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
                      </button>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          </div>

          {/* Fact row */}
          <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:grid-cols-3 sm:gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <Car className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span className="capitalize">{caseSnapshotClaimLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800 sm:justify-center">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span>{[venueCounty, venueState === 'CA' ? 'California' : venueState].filter(Boolean).join(', ') || t('results.chrome.jurisdictionUnavailable')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800 sm:justify-end">
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span>{t('results.chrome.incidentDate')} {snapshotIncidentDate ?? t('results.chrome.notProvided')}</span>
            </div>
          </div>

          {/* Three core cards */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Settlement estimate */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><DollarSign className="h-4 w-4" aria-hidden /></span>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('results.chrome.settlementEstimate')}</p>
              </div>
              <p className="mt-4 text-xs text-slate-500">{t('results.chrome.mostLikelyRange')}</p>
              <p className="font-display text-2xl font-bold text-emerald-600">{displaySettlementRangeText}</p>
              <p className="mt-1 text-sm text-slate-600">{t('results.chrome.mostLikely')} <span className="font-semibold text-slate-900">{formatCurrency(displaySettlementExpected)}</span></p>
              {netEstimatedRecovery > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  {t('results.chrome.afterFeesA')} <span className="font-semibold text-emerald-700">{formatCurrency(netEstimatedRecovery)}</span>.{' '}
                  <button type="button" onClick={() => { document.getElementById('net-recovery')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className="font-semibold text-brand-700 hover:text-brand-800">{t('results.chrome.seeBreakdown')}</button>
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-xs text-slate-500">{t('results.chrome.confidence')}</span>
                <span className={estimateConfidenceLevel === 'High' ? 'text-xs font-semibold text-emerald-700' : estimateConfidenceLevel === 'Medium' ? 'text-xs font-semibold text-amber-600' : 'text-xs font-semibold text-rose-600'}>{estimateConfidenceLevel}</span>
                {estimateConfidenceLevel !== 'High' && (
                  <span className="text-[11px] text-slate-500">{t('results.chrome.addRecordsSharpen')}</span>
                )}
              </div>
              {valuationMissingInputs.length > 0 && (
                <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
                  <p className="text-[11px] font-semibold text-amber-800">{t('results.chrome.preliminaryEstimate')}</p>
                  <p className="mt-0.5 text-[11px] leading-5 text-amber-700">
                    {t('results.chrome.rangeBasedOnA')} {valuationMissingInputs.slice(0, 3).join(', ')} {t('results.chrome.rangeBasedOnB')}
                  </p>
                </div>
              )}
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('results.chrome.ifTrial')}</p>
                <p className="mt-1 text-xs text-slate-500">{t('results.chrome.trialRange')}</p>
                <p className="font-display text-xl font-bold text-slate-900">{trialValueText}</p>
                <p className="mt-1 text-sm text-slate-600">{t('results.chrome.mostLikely')} <span className="font-semibold text-slate-900">{formatCurrency(Math.round((potentialTrialLow + potentialTrialHigh) / 2))}</span></p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{t('results.chrome.trialGrossA')} <span className="font-semibold text-slate-600">{t('results.chrome.trialGrossMid')}</span>{t('results.chrome.trialGrossB')}</p>
                <button
                  type="button"
                  onClick={() => { const el = fullReportDetailsRef.current; if (el) { el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }) } }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
                >
                  {t('results.chrome.howWeCalc')} <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Liability */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Shield className="h-4 w-4" aria-hidden /></span>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('results.chrome.liability')}</p>
              </div>
              <span className="mt-4 inline-flex rounded-md bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-700">{liabilitySnapshotLabel}</span>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{liabilitySummary || t('results.chrome.liabilityDefault')}</p>
              <div className="mt-3 space-y-1.5">
                {liabilityChecklist.map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-700">
                      {row.ok ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-400">○</span>}
                      {row.label}
                    </span>
                    <span className={row.ok ? 'text-xs font-semibold text-emerald-600' : 'text-xs text-slate-400'}>{row.ok ? t('results.chrome.yes') : t('results.chrome.notAdded')}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="relative h-1.5 rounded-full bg-gradient-to-r from-rose-200 via-amber-200 to-emerald-300">
                  <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-600 bg-white shadow" style={{ left: `${clampPercent(liabilityPercent)}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-500"><span>{t('results.shared.weak')}</span><span>{t('results.shared.moderate')}</span><span>{t('results.shared.strong')}</span></div>
              </div>
            </div>

            {/* Attorney interest */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-600"><User className="h-4 w-4" aria-hidden /></span>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('results.chrome.attorneyInterest')}</p>
              </div>
              <span className="mt-4 inline-flex rounded-md bg-violet-50 px-2.5 py-1 text-sm font-semibold text-violet-700">{attorneyInterestWord}</span>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{attorneyInterestLevel === 'High' ? t('results.chrome.attractiveHigh') : t('results.chrome.potentialLow')}</p>
              {attorneyInterestMissing.length > 0 && (
                <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 p-3">
                  <p className="text-xs font-semibold text-slate-700">{t('results.chrome.whatsHoldingBack')}</p>
                  <ul className="mt-1.5 space-y-1">
                    {attorneyInterestMissing.map((item) => (
                      <li key={item} className="flex items-center gap-1.5 text-xs text-amber-800"><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" /> {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-4">
                <div className="relative h-1.5 rounded-full bg-gradient-to-r from-rose-200 via-violet-200 to-violet-400">
                  <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-violet-600 bg-white shadow" style={{ left: `${attorneyInterestPct}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-500"><span>{t('results.shared.low')}</span><span>{t('results.shared.building')}</span><span>{t('results.shared.high')}</span></div>
              </div>
            </div>
          </div>

          {/* Estimated net recovery */}
          {displaySettlementExpected > 0 && (
          <div id="net-recovery" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><DollarSign className="h-4 w-4" aria-hidden /></span>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('results.chrome.estNetRecovery')}</p>
            </div>
            <p className="mt-3 text-sm text-slate-600">{t('results.chrome.whatYouTakeA')} <span className="font-semibold text-slate-900">{formatCurrency(displaySettlementExpected)}</span> {t('results.chrome.whatYouTakeB')}</p>
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{t('results.chrome.settlementMostLikely')}</span>
                <span className="font-semibold text-slate-900">{formatCurrency(displaySettlementExpected)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{t('results.chrome.attorneyFeeContingency')}</span>
                <span className="font-medium text-rose-600">&ndash; {formatCurrency(netAttorneyFee)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{t('results.chrome.medicalLiens')}{documentedMedicalCharges > 0 ? '' : t('results.chrome.estSuffix')}</span>
                <span className="font-medium text-rose-600">&ndash; {formatCurrency(netMedicalLiens)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{t('results.chrome.caseExpenses')}</span>
                <span className="font-medium text-rose-600">&ndash; {formatCurrency(netCaseExpenses)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-semibold text-slate-900">{t('results.chrome.estNetToYou')}</span>
                <span className={`font-display text-xl font-bold ${netRecoveryExhaustedByCosts ? 'text-amber-600' : 'text-emerald-600'}`}>{formatCurrency(netEstimatedRecovery)}</span>
              </div>
            </div>
            {netRecoveryExhaustedByCosts ? (
              <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-700">
                <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                {t('results.chrome.exhaustedNote')}
              </p>
            ) : (
              <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-500">
                <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                {t('results.chrome.illustrativeNote')}
              </p>
            )}
          </div>
          )}

          {/* Potential litigation costs */}
          {hasValuation && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Scale className="h-4 w-4" aria-hidden /></span>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('results.snap.litTitle')}</p>
            </div>
            <p className="mt-3 text-sm text-slate-600">{t('results.snap.litDesc')}</p>
            <div className="mt-4 space-y-2.5">
              {litigationCostItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    {trSnap(item.label)}
                    {item.stage === 'litigation' && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">{t('results.snap.ifLitigated')}</span>}
                  </span>
                  <span className="font-medium text-slate-900">{formatCurrency(item.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-semibold text-slate-900">{t('results.snap.estTotal')}</span>
                <span className="font-display text-lg font-bold text-slate-900">{formatCurrency(litigationCostTotal)}</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">{t('results.snap.litDisclaimer')}</p>
          </div>
          )}

          {/* Top actions */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="font-display text-base font-semibold text-slate-900">{t('results.snap.topTitle')}</p>
              <p className="mt-0.5 text-sm text-slate-500">{t('results.snap.topDesc')}</p>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {snapshotTopActions.map((action) => {
                const Icon = action.icon
                return (
                  <div key={action.title} className="flex items-center gap-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500"><Icon className="h-4 w-4" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{trSnap(action.title)}</p>
                      <p className="text-xs text-slate-500">{trSnap(action.desc)}</p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-sm font-bold text-emerald-600">{action.boost}</p>
                      <p className="text-[11px] text-slate-400">{t('results.snap.potentialImpact')}</p>
                    </div>
                    <Link to={`/evidence-upload/${assessment?.id ?? ''}`} className="shrink-0 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">{trSnap(action.cta)}</Link>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Your case strength — unified narrative, quality score, and factor/value breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-slate-900">{t('results.chrome.yourCaseStrength')}</p>
                <p className="mt-0.5 text-sm text-slate-500">{t('results.chrome.plainLanguage')}</p>
              </div>
              <div className="flex shrink-0 flex-col items-center">
                <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t('results.chrome.overallQuality')}</p>
                <div className="relative mt-1.5 h-16 w-16">
                  <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3.4" />
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#10b981" strokeWidth="3.4" strokeLinecap="round" strokeDasharray={`${caseStrengthScore} ${100 - caseStrengthScore}`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-base font-bold text-slate-900">{overviewQualityScore}</span>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-emerald-600">{overviewQualityLabel}</span>
              </div>
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {aiCaseSummaryBullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-sm text-slate-700"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{bullet}</span></li>
              ))}
            </ul>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('results.chrome.keyFactors')}</p>
                <span className="text-[11px] text-slate-400">{t('results.chrome.whatShapes')}</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {([
                  { icon: Scale, label: t('results.chrome.faultLiability'), value: liabilitySnapshotLabel, tone: liabilityOutlook === 'strong' ? 'strong' : liabilityOutlook === 'moderate' ? 'moderate' : 'weak', desc: liabilitySummary || t('results.chrome.basedOnFacts') },
                  { icon: Activity, label: t('results.chrome.injurySeverity'), value: severitySnapshotLabel, tone: severityPercent >= 66 ? 'strong' : severityPercent >= 40 ? 'moderate' : 'weak', desc: t('results.chrome.reportedInjuries') },
                  { icon: Calendar, label: t('results.chrome.treatmentHistory'), value: treatmentStrengthLevel === 'High' ? t('results.shared.high') : treatmentStrengthLevel === 'Medium' ? t('results.shared.medium') : t('results.shared.low'), tone: treatmentStrengthLevel === 'High' ? 'strong' : treatmentStrengthLevel === 'Medium' ? 'moderate' : 'weak', desc: treatment.length > 0 ? `${treatment.length} ${t('results.chrome.treatmentRecords')}` : t('results.chrome.noTreatmentRecords') },
                  { icon: DollarSign, label: t('results.chrome.lostIncome'), value: documentedWageLoss > 0 ? t('results.chrome.documented') : t('results.chrome.notAdded'), tone: documentedWageLoss > 0 ? 'moderate' : 'weak', desc: documentedWageLoss > 0 ? `${formatCurrency(documentedWageLoss)} ${t('results.chrome.wageLossReported')}` : t('results.chrome.addWageLoss') },
                  { icon: Shield, label: t('results.chrome.insuranceCoverage'), value: insuranceRecoveryPercent >= 75 ? t('results.chrome.sufficient') : insuranceRecoveryPercent >= 50 ? t('results.chrome.developing') : t('results.chrome.unclear'), tone: insuranceRecoveryPercent >= 75 ? 'strong' : insuranceRecoveryPercent >= 50 ? 'moderate' : 'weak', desc: insuranceRecoveryLabel },
                  { icon: FileText, label: t('results.chrome.documentation'), value: scoreLabel(documentationScore, { high: t('results.chrome.docStrong'), medium: t('results.chrome.docDeveloping'), low: t('results.chrome.docLow') }), tone: documentationScore >= 66 ? 'strong' : documentationScore >= 40 ? 'moderate' : 'weak', desc: `${documentationScore}% ${t('results.chrome.docsAdded')}` },
                  { icon: MapPin, label: t('results.chrome.venueLocation'), value: venueFriendlinessScore >= 4 ? t('results.chrome.favorable') : t('results.chrome.moderate'), tone: venueFriendlinessScore >= 4 ? 'strong' : 'moderate', desc: formatVenueLabel(venueState, venueCounty) || t('results.chrome.venueUnavailable') },
                ] as { icon: typeof Scale; label: string; value: string; tone: string; desc: string }[]).map((row) => {
                  const Icon = row.icon
                  const tone = row.tone === 'strong' ? 'bg-emerald-50 text-emerald-700' : row.tone === 'moderate' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                  return (
                    <div key={row.label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm"><Icon className="h-4 w-4" aria-hidden /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">{row.label}</p>
                        <p className="text-xs leading-5 text-slate-500">{row.desc}</p>
                      </div>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${tone}`}>{row.value}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Likely attorney matches */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-display text-base font-semibold text-slate-900">{t('results.headings.likelyAttorneyMatches')}</p>
            <p className="mt-0.5 text-sm text-slate-500">{t('results.chrome.attorneysHandle')}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(rankedSnapshotAttorneys.length > 0
                ? rankedSnapshotAttorneys.map((a: any, i: number) => ({
                    name: a?.name ?? a?.law_firm?.name ?? `${t('results.chrome.topMatch')}${i + 1}`,
                    line: [venueCounty || venueState, formatClaimTypeLabel(assessment?.claimType)].filter(Boolean).join(' • '),
                    meta: [getResponseBadge(a), t('results.chrome.freeConsultation')].filter(Boolean).join(' • '),
                    score: formatMatchScore(a?.matchScore ?? a?.match_score ?? a?.score, 94 - i * 3),
                  }))
                : [
                    { name: t('results.chrome.topLocalMatch'), line: [venueCounty || venueState, formatClaimTypeLabel(assessment?.claimType)].filter(Boolean).join(' • '), meta: t('results.chrome.respondsFree'), score: '94%' },
                    { name: t('results.chrome.experiencedAttorney'), line: [venueCounty || venueState, formatClaimTypeLabel(assessment?.claimType)].filter(Boolean).join(' • '), meta: t('results.chrome.piBilingual'), score: '91%' },
                    { name: t('results.chrome.localTrialAttorney'), line: [venueCounty || venueState, formatClaimTypeLabel(assessment?.claimType)].filter(Boolean).join(' • '), meta: t('results.chrome.localExperts'), score: '88%' },
                  ]
              ).map((m, i) => (
                <div key={`${m.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700"><User className="h-5 w-5" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{m.name}</p>
                    <p className="truncate text-xs text-slate-500">{m.line}</p>
                    <p className="truncate text-[11px] text-slate-400">{m.meta}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-700">{m.score}</span>
                    <p className="mt-0.5 text-[10px] text-slate-400">{t('results.chrome.matchScore')}</p>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => { document.getElementById('attorney-matches')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800">{t('results.chrome.seeMoreMatches')} <ChevronRight className="h-3 w-3" /></button>
          </div>

          {deadlineWarningText ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <p className="text-sm font-semibold text-red-900">{t('results.chrome.important')}</p>
              <p className="mt-1 text-sm leading-relaxed text-red-800">{deadlineWarningText}</p>
            </div>
          ) : null}

          {/* Footer CTA */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Lock className="h-4 w-4" aria-hidden /></span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{t('results.shared.privateSecureTitle')}</p>
                <p className="text-xs text-slate-500">{t('results.shared.onlyShareChoose')}</p>
              </div>
            </div>
            <button type="button" onClick={openAttorneyReviewFlow} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-800">{t('results.shared.continueReview')} <ChevronRight className="h-4 w-4" /></button>
          </div>
          <button
            type="button"
            onClick={() => { const el = fullReportDetailsRef.current; if (el) { el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }) } }}
            className="flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            {t('results.chrome.reviewFullDetails')} <ChevronDown className="h-4 w-4" />
          </button>
        </section>

        <details ref={fullReportDetailsRef} className="group mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
            <span>{t('results.chrome.fullCaseReport')}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
        {/* Full Case Report header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{t('results.chrome.fullCaseReport')}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t('results.chrome.comprehensiveAnalysis')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => { void handleDownloadReportPdf() }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" /> {t('results.chrome.downloadReport')}
            </button>
            <button
              type="button"
              onClick={openAttorneyReviewFlow}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-800"
            >
              {t('results.shared.continueReview')} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {/* Fact row with filing deadline */}
        <div className="mb-5 grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <Car className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span className="capitalize">{caseSnapshotClaimLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span>{[venueCounty, venueState === 'CA' ? 'California' : venueState].filter(Boolean).join(', ') || t('results.chrome.jurisdictionUnavailable')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span>{t('results.chrome.incidentDate')} {snapshotIncidentDate ?? t('results.chrome.notProvided')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <ClipboardList className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
            <span>
              {t('results.chrome.filingDeadline')} {solDeadlineShort ?? t('results.chrome.tbd')}
              {solDaysRemaining != null && <span className="block text-xs font-normal text-slate-500">{solDaysRemaining} {t('results.chrome.daysRemaining')}</span>}
            </span>
          </div>
        </div>
        <nav className="surface-panel mb-6 overflow-x-auto p-2" aria-label={t('results.aria.sections')}>
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
                  <span className={`ml-2 px-2 py-0.5 text-[11px] ${tab.badgeNeedsAction ? 'inline-flex items-center rounded-full border border-amber-200 bg-amber-50 font-semibold text-amber-800' : 'status-pill-neutral'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {activeResultsTab === 'overview' && (
        <div className="mb-8 space-y-5" aria-label={t('results.aria.overview')}>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <p className="text-sm text-slate-600">{t('results.overview.intro')}</p>
          </div>

          {/* Medical timeline | Damages | What's missing */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><Calendar className="h-4 w-4 text-brand-600" aria-hidden /> {t('results.overview.medicalTimeline')}</p>
                <button type="button" onClick={() => setActiveResultsTab('medical')} className="text-xs font-semibold text-brand-700 hover:text-brand-800">{t('results.overview.viewFullTimeline')}</button>
              </div>
              {medicalChronology.length > 0 ? (
                <ol className="mt-3 space-y-3">
                  {medicalChronology.slice(0, 6).map((ev: any, i: number) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800">{ev?.title || ev?.eventType || ev?.type || t('results.overview.treatment')}</p>
                        <p className="text-[11px] leading-5 text-slate-500">{[ev?.date ? new Date(ev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null, ev?.description || ev?.summary || ev?.provider].filter(Boolean).join(' — ')}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{t('results.overview.noTimeline')}</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><DollarSign className="h-4 w-4 text-brand-600" aria-hidden /> {t('results.overview.damagesBreakdown')}</p>
                <button type="button" onClick={() => setActiveResultsTab('value')} className="text-xs font-semibold text-brand-700 hover:text-brand-800">{t('results.overview.viewDetails')}</button>
              </div>
              <div className="mt-3 space-y-2">
                {overviewDamageRows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600">{r.label}</span>
                    <span className="shrink-0 font-semibold text-slate-900">{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('results.overview.settlementRange')}</p>
                <div className="mt-1 grid grid-cols-3 text-center">
                  <div><p className="text-[10px] text-slate-500">{t('results.overview.low')}</p><p className="text-sm font-bold text-slate-700">{formatCurrency(displaySettlementLow)}</p></div>
                  <div><p className="text-[10px] text-slate-500">{t('results.overview.mostLikely')}</p><p className="text-sm font-bold text-emerald-600">{formatCurrency(displaySettlementExpected)}</p></div>
                  <div><p className="text-[10px] text-slate-500">{t('results.overview.high')}</p><p className="text-sm font-bold text-slate-700">{formatCurrency(displaySettlementHighValue)}</p></div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden /> {t('results.overview.whatsMissing')} <span className="text-slate-400">{t('results.overview.impact')}</span></p>
              <div className="mt-3 space-y-2.5">
                {overviewMissingRows.length > 0 ? overviewMissingRows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-700"><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" /> {r.label}</span>
                    <span className="flex shrink-0 items-center gap-2 text-[11px]">
                      <span className={r.priority === 'High' ? 'font-semibold text-rose-600' : r.priority === 'Medium' ? 'font-semibold text-amber-600' : 'font-semibold text-slate-400'}>{r.priority === 'High' ? t('results.shared.high') : r.priority === 'Medium' ? t('results.shared.medium') : t('results.shared.low')}</span>
                      <span className="font-semibold text-emerald-600">{r.range}</span>
                    </span>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">{t('results.overview.docsInPlace')}</p>
                )}
              </div>
              <button type="button" onClick={() => setActiveResultsTab('documents')} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800">{t('results.overview.uploadToIncrease')} <ChevronRight className="h-3 w-3" /></button>
            </div>
          </div>

          {/* How to increase value + important notes */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-display text-base font-semibold text-slate-900">{t('results.headings.howToIncrease')}</p>
              <p className="mt-0.5 text-sm text-slate-500">{t('results.overview.takeSteps')}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {snapshotTopActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <div key={action.title} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
                      <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm"><Icon className="h-4 w-4" aria-hidden /></span>
                      <p className="mt-2 text-[11px] font-semibold leading-4 text-slate-800">{trSnap(action.title)}</p>
                      <p className="mt-1 text-[11px] font-bold text-emerald-600">{action.boost}</p>
                    </div>
                  )
                })}
              </div>
              <button type="button" onClick={() => setActiveResultsTab('attorney')} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800">{t('results.overview.seeAllRecs')} <ChevronRight className="h-3 w-3" /></button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-display text-base font-semibold text-slate-900">{t('results.overview.importantNotes')}</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {[
                  t('results.overview.note1'),
                  t('results.overview.note2'),
                  t('results.overview.note3'),
                  t('results.overview.note4'),
                ].map((note) => (
                  <li key={note} className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{note}</span></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Lock className="h-4 w-4" aria-hidden /></span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{t('results.shared.privateSecureTitle')}</p>
                <p className="text-xs text-slate-500">{t('results.shared.onlyShareChoose')}</p>
              </div>
            </div>
            <button type="button" onClick={openAttorneyReviewFlow} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-800">{t('results.shared.continueReview')} <ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        )}

        {activeResultsTab === 'liability' && (
        <div className="mb-8 space-y-5" aria-label={t('results.aria.liability')}>
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{t('results.liability.title')}</h2>
            <p className="mt-1 text-sm text-slate-600">{t('results.liability.subtitle')}</p>
          </div>

          {/* Four cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* Liability strength gauge */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('results.headings.liabilityStrength')}</p>
              <div className="relative mx-auto mt-3 h-28 w-28">
                <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3.2" />
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#10b981" strokeWidth="3.2" strokeLinecap="round" strokeDasharray={`${clampPercent(liabilityPercent)} ${100 - clampPercent(liabilityPercent)}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-3xl font-bold text-slate-900">{Math.round(liabilityPercent)}%</span>
                </div>
              </div>
              <p className="mt-2 text-sm font-semibold text-emerald-600">{liabStrengthLabel}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{t('results.liability.strengthOfPosition')}</p>
            </div>

            {/* Most likely at fault */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><Scale className="h-3.5 w-3.5" aria-hidden /> {t('results.liability.mostLikelyAtFault')}</p>
              <p className="mt-3 font-display text-xl font-bold text-emerald-600">{liabMostLikelyAtFault}</p>
              <p className="text-[11px] text-slate-500">{t('results.liability.basedOnInfo')}</p>
              <div className="mt-3 space-y-2">
                {[
                  { label: t('results.liability.otherDriver'), pct: liabFaultOther, color: 'bg-emerald-500' },
                  { label: t('results.liability.sharedFault'), pct: liabFaultShared, color: 'bg-amber-400' },
                  { label: t('results.liability.you'), pct: liabFaultYou, color: 'bg-rose-400' },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-[11px] text-slate-600"><span>{row.label}</span><span className="font-semibold text-slate-800">{row.pct}%</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attorney interest */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><User className="h-3.5 w-3.5" aria-hidden /> {t('results.liability.attorneyInterest')}</p>
              <p className="mt-3 font-display text-2xl font-bold text-violet-700">{liabAttorneyCurrent}%</p>
              <p className="text-[11px] text-slate-500">{t('results.liability.currentLikelihood')}</p>
              <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold text-slate-700">{t('results.liability.ifAddEvidence')}</p>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]"><span className="text-slate-600">{t('results.liability.plusPolice')}</span><span className="font-semibold text-emerald-600">{liabAttorneyWithPolice}%</span></div>
                  <div className="flex items-center justify-between text-[11px]"><span className="text-slate-600">{t('results.liability.plusPolicePhotos')}</span><span className="font-semibold text-emerald-600">{liabAttorneyWithPolicePhotos}%</span></div>
                </div>
              </div>
            </div>

            {/* Shared fault risk */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><Shield className="h-3.5 w-3.5" aria-hidden /> {t('results.liability.sharedFaultRisk')}</p>
              <p className="mt-3 font-display text-2xl font-bold text-emerald-600">{sharedFaultRiskWord}</p>
              <p className="text-[11px] text-slate-500">{sharedFaultRiskDesc}</p>
              <p className="mt-4 text-[11px] text-slate-500">{t('results.liability.comparativeNegligence')}</p>
              <div className="mt-2">
                <div className="relative h-1.5 rounded-full bg-gradient-to-r from-emerald-300 via-amber-200 to-rose-300">
                  <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-600 bg-white shadow" style={{ left: `${sharedFaultRiskPos}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-slate-500"><span>{t('results.shared.low')}</span><span>{t('results.shared.medium')}</span><span>{t('results.shared.high')}</span></div>
              </div>
            </div>
          </div>

          {/* AI liability summary */}
          <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><BarChart3 className="h-4 w-4 text-brand-600" aria-hidden /> {t('results.liability.aiSummary')}</p>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
                  {t('results.liability.aiPrefix')} {isRearEndCase ? t('results.liability.aiRearEnd') : `${t('results.liability.aiGenericA')} ${caseSnapshotClaimLabel.toLowerCase()} ${t('results.liability.aiGenericB')}`} {(treatment.length > 0 || hasMedicalRecords) ? t('results.liability.aiCausationYes') : t('results.liability.aiCausationAdd')} {(!hasPoliceReport || !hasWitnessStatements || !hasInjuryPhotos) ? t('results.liability.aiDispute') : t('results.liability.aiStrong')}
                </p>
              </div>
              <div className="shrink-0 rounded-xl border border-brand-200 bg-white p-4 lg:w-64">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Scale className="h-4 w-4 text-brand-600" aria-hidden /> {t('results.liability.currentOutlook')}</p>
                <p className="mt-1 font-display text-lg font-bold text-brand-700">{liabStrengthLabel}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{t('results.liability.moreEvidenceNeeded')}</p>
              </div>
            </div>
          </div>

          {/* Three columns: strongest factors | what insurer argues | additional evidence */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{t('results.liability.strongestFactors')}</p>
              <div className="mt-3 space-y-2">
                {liabStrongFactors.map((f) => (
                  <div key={f.label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 text-slate-700"><CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" /> {f.label}</span>
                    <span className="shrink-0 font-semibold text-emerald-600">+{f.impact}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                <span className="font-semibold text-slate-700">{t('results.liability.totalPositive')}</span>
                <span className="font-bold text-emerald-600">+{liabPositiveTotal}%</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-amber-700">{t('results.liability.insurerArgue')}</p>
              <div className="mt-3 space-y-2">
                {liabInsuranceArgues.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-slate-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> <span>{item}</span></div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                <span className="font-semibold text-slate-700">{t('results.liability.potentialNegative')}</span>
                <span className="font-bold text-rose-600">-{liabNegativeTotal}%</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{t('results.liability.estImpactEvidence')}</p>
              <div className="mt-3 space-y-2">
                {liabAdditionalEvidence.map((e) => {
                  const Icon = e.icon
                  return (
                    <div key={e.label} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 text-slate-700"><Icon className="h-4 w-4 shrink-0 text-slate-400" /> {e.label}</span>
                      <span className="shrink-0 font-semibold text-emerald-600">+{e.impact}%</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                <span className="font-semibold text-slate-700">{t('results.liability.maxIncrease')}</span>
                <span className="font-bold text-emerald-600">+{liabMaxIncrease}%</span>
              </div>
            </div>
          </div>

          {/* How liability could improve */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{t('results.liability.howImprove')}</p>
            <p className="mt-0.5 text-sm text-slate-500">{t('results.liability.howImproveSub')}</p>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {liabImproveSteps.map((step, i) => (
                <div key={step.label} className="relative text-center">
                  {i < liabImproveSteps.length - 1 && <span className="absolute left-1/2 top-4 hidden h-px w-full bg-slate-200 lg:block" aria-hidden />}
                  <span className={`relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 ${i === 0 ? 'border-brand-600 bg-brand-600 text-white' : 'border-emerald-400 bg-white text-emerald-600'}`}>
                    <span className="h-2 w-2 rounded-full bg-current" />
                  </span>
                  <p className="mt-2 font-display text-base font-bold text-slate-900">{step.score}</p>
                  <p className="text-[11px] font-semibold text-slate-700">{step.label}</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Venue intelligence + insurance recovery */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><MapPin className="h-4 w-4 text-brand-600" aria-hidden /> {t('results.liability.venueIntel')}</p>
              <div className="mt-3 flex items-center gap-2">
                <p className="font-semibold text-slate-900">{formatVenueLabel(venueState, venueCounty) || t('results.liability.venueUnavailable')}</p>
                {venueFriendlinessScore >= 4 && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{t('results.liability.plaintiffFriendly')}</span>}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{t('results.liability.venueHistPrefix')} {venueFriendlinessScore >= 4 ? t('results.liability.venueHistBetter') : t('results.liability.venueHistAvg')}.</p>
              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('results.liability.expectedImpact')}</p>
                <p className="font-display text-xl font-bold text-emerald-600">+{liabVenueImpactLow}% to +{venueImpactPercent}%</p>
                <p className="text-[11px] text-slate-500">{t('results.liability.comparedNeutral')}</p>
              </div>
              <div className="mt-3 divide-y divide-slate-100 text-sm">
                {[
                  [t('results.liability.juryTendencies'), venueFriendlinessScore >= 4 ? t('results.liability.juryFavorable') : t('results.liability.juryBalanced')],
                  [t('results.liability.avgVerdict'), t('results.liability.higher')],
                  [t('results.liability.timeToResolution'), t('results.liability.months12to18')],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-2"><span className="text-slate-600">{label}</span><span className="font-semibold text-slate-800">{value}</span></div>
                ))}
              </div>
              <button type="button" onClick={() => setActiveResultsTab('value')} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800">{t('results.liability.viewVenue')} <ChevronRight className="h-3 w-3" /></button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><Shield className="h-4 w-4 text-brand-600" aria-hidden /> {t('results.liability.insuranceOutlook')}</p>
              <p className="mt-0.5 text-sm text-slate-500">{t('results.liability.insuranceSub')}</p>
              <div className="mt-3 space-y-3">
                {[
                  { label: t('results.liability.defAutoPolicy'), status: insuranceRecoveryPercent >= 50 ? t('results.liability.likelyAvailable') : t('results.liability.unknown'), tone: insuranceRecoveryPercent >= 50 ? 'emerald' : 'amber', sub: t('results.liability.estLimits'), value: insuranceRecoveryPercent >= 50 ? '$50,000' : t('results.liability.unknown') },
                  { label: t('results.liability.umuim'), status: t('results.liability.unknown'), tone: 'amber', sub: t('results.liability.yourPolicy'), value: t('results.liability.notProvided') },
                  { label: t('results.liability.commercialCov'), status: t('results.liability.noEvidence'), tone: 'slate', sub: t('results.liability.evidenceFound'), value: t('results.liability.none') },
                ].map((row) => (
                  <div key={row.label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{row.label}</p>
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${row.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : row.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{row.status}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{row.sub}</span>
                      <span className="font-semibold text-slate-700">{row.value}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setActiveResultsTab('documents')} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800">{t('results.liability.viewInsurance')} <ChevronRight className="h-3 w-3" /></button>
            </div>
          </div>

          {/* Recommended next steps */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5 shadow-sm">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><Lightbulb className="h-4 w-4 text-amber-500" aria-hidden /> {t('results.liability.recommendedSteps')}</p>
            <p className="mt-0.5 text-sm text-slate-500">{t('results.liability.recommendedStepsSub')}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {liabRecommendedSteps.map((step, i) => (
                <div key={step.label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">{i + 1}</span>
                    <span className="text-xs font-bold text-emerald-600">{step.impact}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{step.label}</p>
                  <p className="text-[11px] text-slate-500">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400">{t('results.liability.updatedFooter')}</p>
        </div>
        )}

        {activeResultsTab === 'medical' && (
        <div id="medical-story-review" ref={medicalReviewRef} className="mb-8 scroll-mt-6 space-y-5">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{t('results.medical.title')}</h2>
            <p className="mt-1 text-sm text-slate-600">{t('results.medical.subtitle')}</p>
          </div>

          {/* What to do now — single, prominent next step for this tab */}
          {medReviewStatusValue === 'confirmed' ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><CheckCircle className="h-5 w-5" aria-hidden /></span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">{t('results.medical.allSet')}</p>
                    <p className="mt-0.5 font-display text-base font-bold text-slate-900">{t('results.medical.confirmedTitle')}</p>
                    <p className="mt-1 text-sm text-slate-600">{t('results.medical.confirmedDesc')}</p>
                  </div>
                </div>
                <Link to={`/evidence-upload/${resolvedAssessmentId || assessment?.id}`} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
                  <Upload className="h-4 w-4" aria-hidden /> {t('results.shared2.uploadMoreRecords')}
                </Link>
              </div>
            </div>
          ) : medHasAnyRecords ? (
            <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white"><ClipboardList className="h-5 w-5" aria-hidden /></span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{t('results.medical.whatToDoNow')}</p>
                    <p className="mt-0.5 font-display text-base font-bold text-slate-900">{t('results.medical.reviewTimelineTitle')}</p>
                    <p className="mt-1 text-sm text-slate-600">{t('results.medical.reviewTimelineDesc')}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <button type="button" onClick={() => persistPlaintiffMedicalReview({ status: 'confirmed' })} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
                    <CheckCircle className="h-4 w-4" aria-hidden /> {t('results.medical.confirmTimeline')}
                  </button>
                  <div className="flex gap-3 text-xs font-semibold">
                    <Link to={`/evidence-upload/${resolvedAssessmentId || assessment?.id}`} className="text-brand-700 hover:text-brand-800">{t('results.shared2.uploadMoreRecords')}</Link>
                    <button type="button" onClick={() => persistPlaintiffMedicalReview({ status: 'skipped' })} className="text-slate-500 hover:text-slate-700">{t('results.shared.iolLater')}</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><Upload className="h-5 w-5" aria-hidden /></span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">{t('results.medical.whatToDoNow')}</p>
                    <p className="mt-0.5 font-display text-base font-bold text-slate-900">{t('results.medical.startAddingTitle')}</p>
                    <p className="mt-1 text-sm text-slate-600">{t('results.medical.startAddingDesc')}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <Link to={`/evidence-upload/${resolvedAssessmentId || assessment?.id}`} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                    <Upload className="h-4 w-4" aria-hidden /> {t('results.shared2.uploadRecordsBills')}
                  </Link>
                  <div className="flex gap-3 text-xs font-semibold">
                    <button type="button" onClick={() => { const el = document.getElementById('medical-estimates') as HTMLDetailsElement | null; if (el) { el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }) } }} className="text-brand-700 hover:text-brand-800">{t('results.medical.enterEstimates')}</button>
                    <button type="button" onClick={() => persistPlaintiffMedicalReview({ status: 'skipped' })} className="text-slate-500 hover:text-slate-700">{t('results.shared.iolLater')}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Five metric cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {/* Treatment strength */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t('results.medical.treatmentStrength')}</p>
              <div className="relative mx-auto mt-2 h-20 w-20">
                <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3.4" />
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#10b981" strokeWidth="3.4" strokeLinecap="round" strokeDasharray={`${medTreatmentStrengthPct} ${100 - medTreatmentStrengthPct}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center"><span className="font-display text-xl font-bold text-slate-900">{medTreatmentStrengthPct}%</span></div>
              </div>
              <p className="mt-1 text-xs font-semibold text-emerald-600">{medTreatmentStrengthLabel}</p>
              <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{t('results.medical.treatmentStrengthSub')}</p>
            </div>
            {/* Attorney readiness */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t('results.medical.attorneyReadiness')}</p>
              <p className="mt-3 font-display text-3xl font-bold text-brand-600">{medAttorneyReadinessPct}%</p>
              <p className="mt-1 text-xs font-semibold text-brand-600">{medAttorneyReadinessLabel}</p>
              <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{t('results.medical.attorneyReadinessSub')}</p>
            </div>
            {/* Injury severity (semicircle) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t('results.medical.injurySeverity')}</p>
              <div className="relative mx-auto mt-2 h-12 w-24 overflow-hidden">
                <svg viewBox="0 0 36 18" className="h-12 w-24">
                  <path d="M2 18 A16 16 0 0 1 34 18" fill="none" stroke="#e2e8f0" strokeWidth="3.4" strokeLinecap="round" />
                  <path d="M2 18 A16 16 0 0 1 34 18" fill="none" stroke="#f59e0b" strokeWidth="3.4" strokeLinecap="round" strokeDasharray={`${(medSeverityPct / 100) * 50.26} 50.26`} />
                </svg>
              </div>
              <p className="text-xs font-semibold text-amber-600">{severitySnapshotLabel}</p>
              <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{t('results.medical.severityScore')} {medSeverityPct} / 100</p>
            </div>
            {/* Case value confidence */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t('results.medical.caseValueConfidence')}</p>
              <p className="mt-3 font-display text-3xl font-bold text-emerald-600">{medCaseConfidencePct}%</p>
              <p className="mt-1 text-xs font-semibold text-emerald-600">{medCaseConfidenceLabel}</p>
              <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{t('results.medical.caseValueConfidenceSub')}</p>
            </div>
            {/* Treatment length */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t('results.medical.treatmentLength')}</p>
              <Calendar className="mx-auto mt-2 h-7 w-7 text-brand-500" aria-hidden />
              <p className="mt-2 font-display text-2xl font-bold text-slate-900">{medTreatmentLengthDays} {t('results.medical.days')}</p>
              <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{t('results.medical.fromFirstToRecent')}</p>
            </div>
          </div>

          {/* Main two-column grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Left: AI summary + timeline (2 cols) */}
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-5 shadow-sm">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><BarChart3 className="h-4 w-4 text-brand-600" aria-hidden /> {t('results.medical.aiMedSummary')}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{medAiSummary}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{t('results.medical.aiMedExtra')}</p>
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-xs text-slate-600">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                  <span><span className="font-semibold text-slate-700">{t('results.medical.tip')}</span> {t('results.medical.tipBody')}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t('results.medical.yourTimeline')}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{t('results.medical.yourTimelineSub')}</p>
                  </div>
                  <Link to={`/evidence-upload/${resolvedAssessmentId || assessment?.id}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <Upload className="h-3.5 w-3.5" aria-hidden /> {t('results.medical.addMissingVisit')}
                  </Link>
                </div>
                {medTimelineRows.length > 0 ? (
                  <ol className="mt-4 space-y-0">
                    {medTimelineRows.map((row, i) => (
                      <li key={row.id} className="relative flex gap-4 pb-5 last:pb-0">
                        <div className="flex flex-col items-center">
                          <span className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${row.ongoing ? 'bg-brand-100 text-brand-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            <span className="h-2 w-2 rounded-full bg-current" />
                          </span>
                          {i < medTimelineRows.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" aria-hidden />}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{row.dateLabel}</p>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                            <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${row.ongoing ? 'bg-brand-50 text-brand-700' : 'bg-emerald-50 text-emerald-700'}`}>{row.dayLabel}</span>
                          </div>
                          {row.detail && <p className="mt-0.5 text-xs leading-snug text-slate-600">{row.detail}</p>}
                          {row.amount != null && <p className="mt-0.5 text-xs font-semibold text-slate-700">{formatCurrency(row.amount)}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{t('results.medical.noEvents')}</p>
                )}
                {medTreatmentLengthDays > 0 && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-600">{t('results.medical.totalDurationA')}{medTreatmentLengthDays} {t('results.medical.totalDurationB')}</p>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Missing evidence impact */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">{t('results.medical.missingEvidenceImpact')}</p>
                <div className="mt-3 space-y-2">
                  {medMissingEvidence.length > 0 ? medMissingEvidence.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 text-slate-700"><FileText className="h-4 w-4 shrink-0 text-slate-400" /> {row.label}</span>
                      <span className="flex items-center gap-2"><span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">{t('results.shared2.missing')}</span><span className="font-semibold text-emerald-600">{row.impact}</span></span>
                    </div>
                  )) : (
                    <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle className="h-4 w-4" /> {t('results.medical.allKeyOnFile')}</p>
                  )}
                </div>
              </div>

              {/* Confidence if added */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">{t('results.medical.confidenceIfAdded')}</p>
                <div className="mt-4 flex items-end justify-between gap-1">
                  {medConfidenceSteps.map((step, i) => (
                    <div key={step.label} className="flex flex-1 flex-col items-center text-center">
                      <span className="font-display text-sm font-bold text-slate-900">{step.pct}%</span>
                      <span className={`mt-1 h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-brand-500' : 'bg-emerald-400'}`} />
                      <span className="mt-1 text-[9px] leading-3 text-slate-400">{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Known economic damages */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">{t('results.medical.knownEconomic')}</p>
                <div className="mt-3 divide-y divide-slate-100 text-sm">
                  {medEconomicRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-2">
                      <span className="text-slate-600">{row.label}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(Number(row.value) || 0)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2">
                    <span className="font-semibold text-slate-700">{t('results.medical.totalEconomic')}</span>
                    <span className="font-display text-base font-bold text-emerald-600">{formatCurrency(medEconomicTotal)}</span>
                  </div>
                </div>
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">{t('results.medical.estimatesUpdate')}</p>
              </div>

              {/* Future treatment indicators */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">{t('results.medical.futureIndicators')}</p>
                <div className="mt-3 space-y-2 text-sm">
                  {medFutureIndicators.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-slate-700">
                        {row.status === 'yes'
                          ? <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                          : <HelpCircle className="h-4 w-4 shrink-0 text-slate-300" />}
                        {row.label}
                      </span>
                      {row.status !== 'yes' && (
                        <span className={`shrink-0 text-[11px] font-semibold ${row.status === 'unknown' ? 'text-slate-400' : 'text-amber-600'}`}>{row.status === 'unknown' ? t('results.medical.unknown') : t('results.medical.notConfirmed')}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('results.medical.futureRisk')}</p>
                    <p className="font-display text-base font-bold text-amber-600">{medFutureRiskWord}</p>
                  </div>
                  <p className="max-w-[8rem] text-right text-[10px] leading-3 text-slate-500">{t('results.medical.futureRiskSub')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Required + helpful evidence */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-5 shadow-sm">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-700"><AlertTriangle className="h-4 w-4" aria-hidden /> {t('results.medical.requiredToMax')}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {medRequiredEvidence.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                      <Icon className="mx-auto h-5 w-5 text-rose-500" aria-hidden />
                      <p className="mt-2 text-xs font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-[10px] leading-3 text-slate-500">{item.desc}</p>
                      <span className={`mt-2 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${item.present ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{item.present ? t('results.shared2.onFile') : t('results.shared2.missing')}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-brand-50/30 p-5 shadow-sm">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700"><ShieldCheck className="h-4 w-4" aria-hidden /> {t('results.medical.helpfulSupporting')}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {medHelpfulEvidence.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                      <Icon className="mx-auto h-5 w-5 text-brand-500" aria-hidden />
                      <p className="mt-2 text-xs font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-[10px] leading-3 text-slate-500">{item.desc}</p>
                      <span className="mt-2 inline-block rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600">{t('results.shared.optional')}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer: next best action + support */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><Upload className="h-4 w-4 text-emerald-600" aria-hidden /> {t('results.medical.nextBestAction')}</p>
              <p className="mt-1 text-sm text-slate-600">{t('results.medical.nextBestActionDesc')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`/evidence-upload/${resolvedAssessmentId || assessment?.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                  <Upload className="h-4 w-4" aria-hidden /> {t('results.shared2.uploadRecordsBills')}
                </Link>
                <button type="button" onClick={() => persistPlaintiffMedicalReview({ status: 'skipped' })} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  {t('results.shared.iolLater')}
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{t('results.medical.haveQuestions')}</p>
              <p className="mt-1 text-sm text-slate-600">{t('results.medical.haveQuestionsDesc')}</p>
              <Link to="/help" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">{t('results.medical.contactSupport')} <ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400"><Lock className="h-3.5 w-3.5" aria-hidden /> {t('results.medical.privacyFooter')}</p>

          {/* Edit / correct workflow (preserves review + estimate functionality) */}
          <details id="medical-estimates" className="group scroll-mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-slate-900">
              <span className="flex items-center gap-2"><Pencil className="h-4 w-4 text-slate-400" aria-hidden /> {t('results.medical.reviewCorrect')}</span>
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t border-slate-100 px-5 py-4">
              {extractedWageLossTotal > 0 && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-semibold">{t('results.medical.lostWagesSeparate')} {formatCurrency(extractedWageLossTotal)}</p>
                  <p className="mt-1 text-xs leading-relaxed">
                    {t('results.medical.lostWagesNote')}
                  </p>
                </div>
              )}
              <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t('results.medical.noDocsYet')}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {t('results.medical.noDocsYetDesc')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveDamageEstimates}
                    disabled={damageEstimateSaving || isSharedReadOnly}
                    className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {damageEstimateSaving ? t('results.medical.saving') : t('results.medical.saveEstimates')}
                  </button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ['medicalBillsEstimate', t('results.medical.estMedicalBills')],
                    ['lostWagesEstimate', t('results.medical.estLostWages')],
                    ['outOfPocketEstimate', t('results.medical.outOfPocket')],
                    ['propertyDamageEstimate', t('results.medical.propertyDamage')],
                    ['futureTreatmentEstimate', t('results.medical.futureTreatment')],
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
                          disabled={isSharedReadOnly}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 pl-7 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                          placeholder="0"
                        />
                      </div>
                    </label>
                  ))}
                </div>
                <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t('results.medical.notesAbout')}
                  <textarea
                    value={damageEstimateForm.notes}
                    onChange={(e) => setDamageEstimateForm((current) => ({ ...current, notes: e.target.value }))}
                    rows={2}
                    disabled={isSharedReadOnly}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    placeholder={t('results.medical.notesPlaceholder')}
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
                readOnly={isSharedReadOnly}
              />
            </div>
          </details>
        </div>
        )}

        {activeResultsTab === 'documents' && (
        <section className="mb-8 space-y-5" aria-label={t('results.aria.documents')}>
          {/* Header + headline metrics */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-md">
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950">{t('results.headings.strengthenYourCase')}</h2>
                <p className="mt-2 text-sm text-slate-600">{t('results.documents.subtitle')}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{t('results.documents.caseStrength')}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{caseStrengthScore}<span className="text-sm font-medium text-slate-400"> / 100</span></p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${caseStrengthScore}%` }} /></div>
                  <p className="mt-1.5 text-xs font-medium text-emerald-600">{caseStrengthLabel(caseStrengthScore)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{t('results.documents.settlementConfidence')}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center">
                      <svg className="absolute h-14 w-14 -rotate-90 text-slate-200" viewBox="0 0 36 36" aria-hidden>
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.6" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-blue-600" strokeWidth="3.6" strokeDasharray={`${estimateConfidenceScore} ${100 - estimateConfidenceScore}`} strokeLinecap="round" />
                      </svg>
                      <span className="relative text-sm font-bold text-slate-900 tabular-nums">{estimateConfidenceScore}%</span>
                    </div>
                    <p className="text-xs font-medium text-blue-600">{estimateConfidenceScore >= 70 ? t('results.documents.strong') : t('results.documents.canImprove')}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{t('results.documents.attorneyInterest')}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center">
                      <svg className="absolute h-14 w-14 -rotate-90 text-slate-200" viewBox="0 0 36 36" aria-hidden>
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.6" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-indigo-600" strokeWidth="3.6" strokeDasharray={`${attorneyInterestPercent} ${100 - attorneyInterestPercent}`} strokeLinecap="round" />
                      </svg>
                      <span className="relative text-sm font-bold text-slate-900 tabular-nums">{attorneyInterestPercent}%</span>
                    </div>
                    <p className="text-xs font-medium text-indigo-600">{attorneyInterestPercent >= 70 ? t('results.documents.goodLikelihood') : t('results.documents.building')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Missing documents + progress/unlocks */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <p className="font-display text-base font-semibold text-slate-900">{t('results.documents.mostImportantMissing')}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t('results.documents.biggestImpact')}</p>
              {missingDocItems.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {missingDocItems.slice(0, 4).map((item: any, idx: number) => {
                    const action = getMissingDocAction(item, assessment?.id)
                    const l = String(item?.label ?? '').toLowerCase()
                    const DocIcon = l.includes('police') || l.includes('incident report') ? Shield : l.includes('photo') ? Camera : l.includes('bill') ? DollarSign : (l.includes('wage') || l.includes('employ')) ? Briefcase : FileText
                    const files = l.includes('photo') ? 'JPG, PNG' : 'PDF, JPG, PNG'
                    const meta = item?.priority === 'high'
                      ? { tier: t('results.documents.veryHigh'), conf: '+12%', value: '+$5,000 – $20,000', tierText: 'text-rose-600', iconBg: 'bg-rose-50 text-rose-500' }
                      : item?.priority === 'medium'
                        ? { tier: t('results.documents.high'), conf: '+8%', value: '+$2,000 – $8,000', tierText: 'text-amber-600', iconBg: 'bg-amber-50 text-amber-500' }
                        : { tier: t('results.documents.medium'), conf: '+5%', value: '+$2,000 – $4,000', tierText: 'text-amber-500', iconBg: 'bg-amber-50 text-amber-500' }
                    return (
                      <div key={item.key ?? item.label} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center">
                        <div className={`flex w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg py-2 ${meta.iconBg}`}>
                          <DocIcon className="h-5 w-5" aria-hidden />
                          <span className={`text-[8px] font-bold uppercase tracking-wide ${meta.tierText}`}>{meta.tier}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900"><span className="text-slate-400">{idx + 1}. </span>{item?.label?.trim() ? item.label : t('results.shared.missingDocument')}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{item?.priority === 'high' ? t('results.documents.criticalDesc') : t('results.documents.strengthensDesc')}</p>
                        </div>
                        <div className="shrink-0 sm:text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('results.documents.potentialImpact')}</p>
                          <p className="text-sm font-bold text-emerald-600">{meta.conf} <span className="font-medium text-slate-500">{t('results.documents.confidence')}</span></p>
                          <p className="text-xs font-medium text-slate-600">{meta.value} <span className="text-slate-400">{t('results.documents.estValue')}</span></p>
                        </div>
                        <Link to={action.to} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700">
                          <Upload className="h-3.5 w-3.5" aria-hidden />
                          {t('results.shared.upload')}
                          <span className="ml-1 text-[10px] font-normal text-brand-100">{files}</span>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                  {t('results.documents.noGaps')}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="font-display text-base font-semibold text-slate-900">{t('results.documents.yourProgress')}</p>
                <p className="mt-0.5 text-xs text-slate-500">{t('results.documents.yourProgressSub')}</p>
                <div className="mt-4 space-y-4">
                  {[
                    { label: t('results.documents.attorneyReviewReadiness'), pct: attorneyInterestPercent, sub: t('results.documents.attorneyReviewReadinessSub'), color: 'bg-indigo-500' },
                    { label: t('results.documents.demandReadiness'), pct: evidenceCompletionPercent, sub: t('results.documents.demandReadinessSub'), color: 'bg-violet-500' },
                    { label: t('results.documents.settlementConfidence'), pct: estimateConfidenceScore, sub: t('results.documents.settlementConfidenceSub'), color: 'bg-blue-500' },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{row.label}</span>
                        <span className="font-bold text-slate-900 tabular-nums">{row.pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} /></div>
                      <p className="mt-1 text-[11px] text-slate-400">{row.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="font-display text-base font-semibold text-slate-900">{t('results.documents.unlocksTitle')}</p>
                <p className="mt-0.5 text-xs text-slate-500">{t('results.documents.unlocksSub')}</p>
                <div className="mt-4 space-y-3">
                  {[
                    { Icon: Activity, title: t('results.documents.uMedicalTimeline'), sub: t('results.documents.uMedicalTimelineSub') },
                    { Icon: Stethoscope, title: t('results.documents.uTreatmentAnalysis'), sub: t('results.documents.uTreatmentAnalysisSub') },
                    { Icon: FileText, title: t('results.documents.uDemandPackage'), sub: t('results.documents.uDemandPackageSub') },
                    { Icon: Scale, title: t('results.documents.uSettlementAnalysis'), sub: t('results.documents.uSettlementAnalysisSub') },
                    { Icon: User, title: t('results.documents.uAttorneyMatches'), sub: t('results.documents.uAttorneyMatchesSub') },
                  ].map((u) => (
                    <div key={u.title} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><u.Icon className="h-4 w-4" aria-hidden /></span>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{u.title}</p>
                        <p className="text-[11px] text-slate-400">{u.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Impact of uploading */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="font-display text-base font-semibold text-slate-900">{t('results.documents.seeImpact')}</p>
            <p className="mt-0.5 text-xs text-slate-500">{t('results.documents.seeImpactSub')}</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-4 font-semibold">{t('results.documents.currentWithHave')}</th>
                    <th className="pb-2 pr-4 font-semibold">{t('results.documents.withKeyDocs')}</th>
                    <th className="pb-2 font-semibold">{t('results.documents.potentialImprovement')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 pr-4"><span className="text-slate-500">{t('results.documents.settlementConfidence')}</span> <span className="font-semibold text-slate-900">{estimateConfidenceScore}%</span></td>
                    <td className="py-2 pr-4 font-semibold text-slate-900">{Math.min(98, estimateConfidenceScore + 18)}%</td>
                    <td className="py-2 font-semibold text-emerald-600">+{Math.min(98, estimateConfidenceScore + 18) - estimateConfidenceScore}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4"><span className="text-slate-500">{t('results.documents.attorneyInterest')}</span> <span className="font-semibold text-slate-900">{attorneyInterestPercent}%</span></td>
                    <td className="py-2 pr-4 font-semibold text-slate-900">{Math.min(98, attorneyInterestPercent + 18)}%</td>
                    <td className="py-2 font-semibold text-emerald-600">+{Math.min(98, attorneyInterestPercent + 18) - attorneyInterestPercent}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4"><span className="text-slate-500">{t('results.documents.caseStrengthScore')}</span> <span className="font-semibold text-slate-900">{caseStrengthScore} / 100</span></td>
                    <td className="py-2 pr-4 font-semibold text-slate-900">{Math.min(100, caseStrengthScore + 11)} / 100</td>
                    <td className="py-2 font-semibold text-emerald-600">+{Math.min(100, caseStrengthScore + 11) - caseStrengthScore} {t('results.documents.points')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {treatmentGapItems.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              {t('results.documents.treatmentGapA')} {treatmentGapItems?.[0]?.gapDays ?? t('results.documents.gapUnknown')} {t('results.documents.treatmentGapDays')} {treatmentGapItems?.[0]?.startDate ? new Date(treatmentGapItems[0].startDate).toLocaleDateString() : t('results.documents.gapUnknownStart')} {t('results.documents.treatmentGapAnd')} {treatmentGapItems?.[0]?.endDate ? new Date(treatmentGapItems[0].endDate).toLocaleDateString() : t('results.documents.gapUnknownEnd')}.
            </div>
          )}

          {medicalDocumentFiles.length > 0 && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t('results.documents.docExtraction')}</p>
                  <p className="text-xs text-slate-600">{t('results.documents.docExtractionSub')}</p>
                </div>
                <Link
                  to={assessment?.id ? `/evidence-upload/${assessment.id}` : '/evidence-upload'}
                  className="text-xs font-semibold text-brand-700 hover:text-brand-900"
                >
                  {t('results.documents.manageUploads')}
                </Link>
              </div>
              <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">{t('results.documents.extractedBillTotal')}</p>
                    <p className="mt-1 text-2xl font-bold text-brand-950">
                      {extractedBillTotal > 0 ? formatCurrency(extractedBillTotal) : t('results.documents.noBillTotal')}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-brand-900/80">
                      {extractedBillTotal > 0
                        ? t('results.documents.billTotalNote')
                        : t('results.documents.billTotalEmpty')}
                    </p>
                  </div>
                  <Link
                    to={`/evidence-upload/${resolvedAssessmentId || assessment?.id}`}
                    className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50"
                  >
                    {t('results.documents.addUpdateBills')}
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
                  <p className="font-semibold">{t('results.medical.lostWagesSeparate')} {formatCurrency(extractedWageLossTotal)}</p>
                  <p className="mt-1 text-xs leading-relaxed">
                    {t('results.documents.wageLossNote2')}
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
                        <span className="font-medium text-slate-900">{file.originalName || t('results.documents.medicalDocument')}</span>
                        <span className="font-semibold text-brand-700">{getDocumentProcessingLabel(file)}</span>
                      </div>
                      {(timelineCount > 0 || datesCount > 0 || extracted?.totalAmount) && (
                        <p className="mt-1 text-slate-500">
                          {[
                            timelineCount > 0 ? `${timelineCount} ${timelineCount === 1 ? t('results.documents.timelineItem') : t('results.documents.timelineItems')}` : null,
                            datesCount > 0 ? `${datesCount} ${datesCount === 1 ? t('results.documents.dateOne') : t('results.documents.dateMany')}` : null,
                            extracted?.totalAmount ? `$${Number(extracted.totalAmount).toLocaleString()} ${t('results.documents.found')}` : null,
                          ].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Demand package status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Briefcase className="h-5 w-5" aria-hidden /></span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t('results.documents.demandStatus')}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{t('results.documents.demandStatusSub')}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('results.documents.overallCompletion')}</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums">{evidenceCompletionPercent}%</p>
                <p className="text-[11px] text-slate-400">{evidenceCompletionChecklist.filter(c => c.done).length} {t('results.documents.keyItemsUploadedA')} {evidenceCompletionChecklist.length} {t('results.documents.keyItemsUploadedB')}</p>
              </div>
              {missingDocItems.length > 0 ? (
                <div className="text-xs">
                  <p className="font-semibold text-slate-600">{t('results.documents.neededToUnlock')}</p>
                  <ul className="mt-1 space-y-0.5">
                    {missingDocItems.slice(0, 3).map((item: any) => (
                      <li key={item.key ?? item.label} className="flex items-center gap-1.5 text-slate-500"><span className="text-rose-400">✕</span>{item?.label}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs font-medium text-emerald-600">{t('results.documents.allKeyUploaded')}</p>
              )}
              <Link to={`/demand/${assessment.id}`} className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold ${missingDocItems.length > 0 ? 'bg-slate-100 text-slate-400' : 'bg-violet-600 text-white hover:bg-violet-700'}`}>
                {missingDocItems.length > 0 ? <Lock className="h-4 w-4" aria-hidden /> : <FileText className="h-4 w-4" aria-hidden />}
                {missingDocItems.length > 0 ? t('results.documents.unlockDemand') : t('results.documents.buildDemand')}
              </Link>
            </div>
          </div>

          {/* Get help */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><ShieldCheck className="h-5 w-5" aria-hidden /></span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t('results.documents.needHelpDocs')}</p>
                  <p className="text-xs text-slate-500">{t('results.documents.needHelpDocsSub')}</p>
                </div>
              </div>
              <Link to="/help" className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <HelpCircle className="h-4 w-4" aria-hidden />
                {t('results.documents.getHelp')}
              </Link>
            </div>
          </div>
        </section>
        )}

        {activeResultsTab === 'value' && (
        <section className="surface-panel mb-10 px-5 py-5" aria-label={t('results.aria.value')}>
        <div className="mt-1 mb-8">
          <PlaintiffCaseCommandCenter summary={displayedCommandCenter} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-3">{t('results.value.overallAssessment')}</p>
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
              <p className="text-sm text-slate-600 mt-1">{t('results.value.compositeScore')}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-l-4 border-l-brand-600 border border-slate-200 bg-slate-50/60 p-6 sm:p-8 mb-10 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">{t('results.value.modeledRange')}</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-1">
            {displaySettlementRangeText}
          </p>
          <div className="mb-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{consumerEstimateLabel}</span>
              <span className="text-gray-500"> · {t('results.value.estConfidence')} {estimateConfidenceScore}/100</span>
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
              <p className="text-sm text-gray-500">{t('results.value.chanceSuccess')}</p>
              <p className="text-lg font-semibold text-gray-900">{successProbability}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('results.value.likelyTimeline')}</p>
              <p className="text-lg font-semibold text-gray-900">{estimatedTimeline}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('results.value.recommendedNext')}</p>
              <p className="text-lg font-semibold text-brand-600">{t('results.value.seeIfAttorney')}</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mt-4 leading-relaxed">
            {t('results.value.settlementDisclaimer')}
          </p>
        </div>

        {missingEstimateInputs.length > 0 && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
            <p className="text-sm font-semibold text-amber-900">
              {t('results.value.preliminaryTitle')}
            </p>
            <p className="mt-1 text-sm text-amber-800 leading-relaxed">
              {t('results.value.preliminaryBody')}
            </p>
            <ul className="mt-3 space-y-2">
              {missingEstimateInputs.map((item) => (
                <li key={item.label} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                  <span>
                    <span className="font-medium text-amber-900">{item.label}</span>
                    <span className="text-amber-700"> — {item.helper}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-amber-700">
              {t('results.value.preliminaryHint')}
            </p>
          </div>
        )}

        <EstimateAccuracyStages
          hasEstimate={!!prediction}
          economicsEntered={economicsEnteredForStages}
          hasDocuments={hasSupportingDocuments}
          isVerified={medicalSpecialsVerified}
        />

        <CaseFileChecklist
          assessmentId={resolvedAssessmentId}
          hasInsurance={hasInsuranceDoc}
          hasMedicalBills={hasMedicalBills}
          hasMedicalRecords={hasMedicalRecords}
          hasPoliceReport={hasPoliceReport}
          hasWageLossProof={hasWageLossProof}
          hasInjuryPhotos={hasInjuryPhotos}
          onUploaded={handleEvidenceUploaded}
        />

        <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">{t('results.value.litigationPotential')}</p>
            <p className="mt-2 text-sm leading-relaxed text-indigo-900">
              {t('results.value.litigationPotentialBody')}
            </p>
            <p className="mt-3 text-xl font-bold tracking-tight text-indigo-950">{litigationExposureText}</p>
            {!isEarlyStageEstimate && (
              <p className="mt-3 text-xs leading-relaxed text-indigo-800">
                {t('results.value.litigationPotentialNote')}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{t('results.value.keyDrivers')}</p>
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

        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{t('results.value.caseSignals')}</p>
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
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{t('results.value.litigationReadiness')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{litigationReadinessScore}%</p>
            <p className="text-sm text-slate-600">{litigationReadinessStatus}</p>
            {litigationReadinessMissing.length > 0 && (
              <p className="mt-2 text-xs text-slate-600">
                {t('results.value.missingPrefix')} {litigationReadinessMissing.join(', ')}.
              </p>
            )}
          </div>
        </div>

        <details className="group mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
            <span>{t('results.value.howCalculated')}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-slate-100 p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-950">{t('results.value.baseCaseTypeRange')}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {t('results.value.baseCaseTypeBody')}
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{t('results.value.yourSelectedType')}</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{baseCaseTypeRange.label}</p>
              <p className="mt-2 text-2xl font-bold text-brand-800">{baseCaseTypeRange.range}</p>
              <p className="mt-2 text-sm leading-relaxed text-brand-950">{baseCaseTypeRange.floor}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-950">{t('results.value.whyStartsThere')}</p>
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

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            {t('results.value.startingPointA')} {settlementRangeText}
            {' '}{t('results.value.startingPointB')}
          </p>

          <h3 className="mt-6 border-t border-slate-100 pt-6 text-lg font-semibold text-slate-950">{t('results.value.howBaselineAdjusted')}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {t('results.value.howBaselineBody')}
          </p>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-950">{t('results.value.settlementCalcModel')}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {t('results.value.settlementCalcFormula')}
            </p>
            <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-5">
              {[
                t('results.value.partInjury'),
                t('results.value.partCompression'),
                t('results.value.partLiability'),
                t('results.value.partEvidence'),
                t('results.value.partVenue'),
              ].map((part, index) => (
                <div key={part} className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t('results.value.step')} {index + 1}</p>
                  <p className="mt-1 font-semibold text-slate-950">{part}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              {t('results.value.settlementCalcNote')}
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-4">
            <p className="text-sm font-semibold text-indigo-950">{t('results.value.trialCalcModel')}</p>
            <p className="mt-2 text-xs leading-relaxed text-indigo-900">
              {t('results.value.trialCalcFormula')}
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-3 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <span>{t('results.value.modifier')}</span>
              <span>{t('results.value.currentEffect')}</span>
              <span>{t('results.value.howItChanges')}</span>
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
            {t('results.value.calcExample')}
          </div>
          </div>
        </details>

        <div className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">{t('results.value.selfHelpOption')}</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950">{t('results.value.prepareOwnDemand')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {t('results.value.prepareOwnBody')}
              </p>
              <div className="mt-3 rounded-lg bg-white/70 px-3 py-3 text-sm text-slate-700">
                <span className="font-semibold text-slate-950">{diySuitabilityLabel}:</span>{' '}
                {diyRiskFlags.length > 0
                  ? diyRiskFlags.slice(0, 2).join(' ')
                  : t('results.value.noDiyFlags')}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Link to={`/demand/${assessment.id}`} className="btn-primary">
                {t('results.value.buildDemand')}
              </Link>
              <Link to={`/attorneys?assessmentId=${assessment.id}`} className="btn-outline">
                {t('results.value.compareAttorney')}
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-5 mb-10">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5 text-brand-600 shrink-0" />
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">{t('results.value.comparableBenchmarks')}</h3>
              </div>
              {settlementBenchmarks ? (
                <>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(settlementBenchmarks.p50)}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('results.value.midpointA')} {formatClaimTypeLabel(assessment?.claimType)} {t('results.value.midpointB')} {venueState === 'CA' ? 'California' : venueState}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-gray-500">{t('results.value.pct25')}</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(settlementBenchmarks.p25)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-gray-500">{t('results.value.pct75')}</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(settlementBenchmarks.p75)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-gray-500">{t('results.value.sampleSize')}</p>
                      <p className="font-semibold text-gray-900">{settlementBenchmarks.count}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  {t('results.value.notEnoughBenchmark')}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-brand-600 shrink-0" />
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">{t('results.value.expectedTimeline')}</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">{timelineEstimate.label}</p>
              <p className="text-sm text-gray-600 mt-1">
                {t('results.value.stage')} {timelineEstimate.stage} • {t('results.value.confidence')} {timelineEstimate.confidence}
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
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">{t('results.value.statuteOfLimitations')}</h3>
            </div>
            <p className="font-medium">
              {solDeadline ? `${t('results.value.estFilingDeadlineA')} ${solDeadline}` : t('results.value.couldNotCalcDeadline')}
            </p>
            <p className="text-sm mt-1">
              {solDeadline ? `${t('results.value.timeRemainingA')} ${solRemaining}.` : t('results.value.addIncidentDate')}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="h-5 w-5 text-brand-600 shrink-0" />
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">{t('results.value.documentationReadiness')}</h3>
            </div>
            {missingDocItems.length > 0 ? (
              <div className="space-y-3">
                {missingDocItems.slice(0, 5).map((item: any) => (
                  <div key={item.key} className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{item?.label ?? t('results.value.missingItem')}</p>
                      <p className="text-sm text-gray-600">
                        {item.priority === 'high' ? t('results.value.highImpactDesc') : item.priority === 'medium' ? t('results.value.helpfulDesc') : t('results.value.usefulDesc')}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : item.priority === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.priority === 'high' ? t('results.shared.high') : item.priority === 'medium' ? t('results.shared.medium') : t('results.shared.low')}
                    </span>
                  </div>
                ))}
                {treatmentGapItems.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                    {t('results.documents.treatmentGapA')} {treatmentGapItems?.[0]?.gapDays ?? t('results.documents.gapUnknown')} {t('results.documents.treatmentGapDays')} {treatmentGapItems?.[0]?.startDate ? new Date(treatmentGapItems[0].startDate).toLocaleDateString() : t('results.documents.gapUnknownStart')} {t('results.documents.treatmentGapAnd')} {treatmentGapItems?.[0]?.endDate ? new Date(treatmentGapItems[0].endDate).toLocaleDateString() : t('results.documents.gapUnknownEnd')}.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                {t('results.value.noGapsFromFile')}
              </div>
            )}
          </div>
        </div>
        </section>
        )}

        {activeResultsTab === 'attorney' && (
        <section className="mb-8 space-y-5" aria-label={t('results.aria.next')}>
          {/* Header + headline metrics */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-sm">
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950">{t('results.headings.almostDone')}</h2>
                <p className="mt-2 text-sm text-slate-600">{t('results.next.caseLooksStrong')}</p>
              </div>
              <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-4">
                <div className="flex h-full flex-col rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{t('results.next.attorneyInterest')}</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600 tabular-nums">{attorneyInterestPercent}%</p>
                  <p className="text-[11px] text-slate-400">{attorneyInterestPercent >= 70 ? t('results.next.highLikelihood') : t('results.next.buildingInterest')}</p>
                  <div className="mt-auto flex h-8 items-center justify-center pt-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${attorneyInterestPercent}%` }} /></div>
                  </div>
                </div>
                <div className="flex h-full flex-col rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{t('results.headings.estimatedSettlement')}</p>
                  <p className="mt-1 whitespace-nowrap text-base font-bold text-emerald-600 tabular-nums">{formatCurrency(settlementLow)} – {formatCurrency(settlementHigh)}</p>
                  <p className="text-[11px] text-slate-400">{t('results.next.rangeMostLikely')}</p>
                  <div className="mt-auto flex h-8 items-center justify-center pt-2">
                    <div className="relative h-2 w-24 rounded-full bg-slate-200"><div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500" /></div>
                  </div>
                </div>
                <div className="flex h-full flex-col rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{t('results.headings.liabilityStrength')}</p>
                  <p className="mt-1 text-lg font-bold text-amber-500">{liabilityClarityLabel === 'Strong' ? t('results.next.strong') : liabilityClarityLabel === 'Mixed' ? t('results.next.moderate') : t('results.next.developing')}</p>
                  <p className="text-[11px] text-slate-400">{liabilityClarityLabel === 'Strong' ? t('results.next.wellSupported') : t('results.next.roomToImprove')}</p>
                  <div className="mt-auto flex h-8 items-center justify-center pt-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-500"><Scale className="h-4 w-4" aria-hidden /></span>
                  </div>
                </div>
                <div className="flex h-full flex-col rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{t('results.next.reviewTime')}</p>
                  <p className="mt-1 text-lg font-bold text-blue-600">{t('results.next.oneDay')}</p>
                  <p className="text-[11px] text-slate-400">{t('results.next.averageResponse')}</p>
                  <div className="mt-auto flex h-8 items-center justify-center pt-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Calendar className="h-4 w-4" aria-hidden /></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* Left column */}
            <div className="space-y-5 lg:col-span-2">
              {/* Attorney Review Readiness */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="font-display text-base font-semibold text-slate-900">{t('results.headings.attorneyReviewReadiness')}</p>
                <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="flex shrink-0 flex-col items-center">
                    <div className="relative inline-flex h-28 w-28 items-center justify-center">
                      <svg className="absolute h-28 w-28 -rotate-90 text-slate-200" viewBox="0 0 36 36" aria-hidden>
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-emerald-500" strokeWidth="3" strokeDasharray={`${readinessDetails?.percent ?? 0} ${100 - (readinessDetails?.percent ?? 0)}`} strokeLinecap="round" />
                      </svg>
                      <div className="relative text-center">
                        <p className="text-2xl font-bold text-slate-900 tabular-nums">{readinessDetails?.percent ?? 0}%</p>
                        <p className="text-[10px] font-medium text-emerald-600">{(readinessDetails?.percent ?? 0) >= 75 ? t('results.next.strong') : (readinessDetails?.percent ?? 0) >= 50 ? t('results.next.good') : t('results.next.building')}<br />{t('results.next.submission')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid flex-1 gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{t('results.next.whatWeHave')}</p>
                      <ul className="mt-2 space-y-1.5">
                        {evidenceCompletionChecklist.filter(c => c.done).slice(0, 5).map((c) => (
                          <li key={c.label} className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />{c.label}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{t('results.next.itemsStrengthen')}</p>
                      <ul className="mt-2 space-y-2">
                        {missingDocItems.slice(0, 3).map((item: any) => {
                          const action = getMissingDocAction(item, assessment?.id)
                          return (
                            <li key={item.key ?? item.label} className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-2 text-xs text-slate-600"><AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />{item?.label?.trim() ? item.label : t('results.shared.missingDocument')}</span>
                              <Link to={action.to} className="inline-flex shrink-0 items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50">{t('results.shared.upload')}</Link>
                            </li>
                          )
                        })}
                        {missingDocItems.length === 0 && (
                          <li className="flex items-center gap-2 text-xs text-emerald-600"><CheckCircle className="h-4 w-4 shrink-0" aria-hidden />{t('results.next.fileComplete')}</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
                {missingDocItems.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2 text-xs text-emerald-800"><TrendingUp className="h-4 w-4 shrink-0" aria-hidden />{t('results.next.addingItems')}</p>
                    <Link to={assessment?.id ? `/evidence-upload/${assessment.id}` : '/evidence-upload'} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900">{t('results.next.seeMoreWays')} <ChevronRight className="h-3.5 w-3.5" /></Link>
                  </div>
                )}
              </div>

              {/* What happens next */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="font-display text-base font-semibold text-slate-900">{t('results.next.whatHappensNext')}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-4">
                  {[
                    { Icon: FileText, title: t('results.next.step1Title'), sub: t('results.next.step1Sub') },
                    { Icon: User, title: t('results.next.step2Title'), sub: t('results.next.step2Sub') },
                    { Icon: HelpCircle, title: t('results.next.step3Title'), sub: t('results.next.step3Sub') },
                    { Icon: ShieldCheck, title: t('results.next.step4Title'), sub: t('results.next.step4Sub') },
                  ].map((s, i) => (
                    <div key={s.title} className="flex flex-col items-center text-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600"><s.Icon className="h-5 w-5" aria-hidden /></span>
                      <p className="mt-2 text-xs font-semibold text-slate-800"><span className="text-blue-600">{i + 1}.</span> {s.title}</p>
                      <p className="text-[11px] text-slate-400">{s.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-900">
                  <Shield className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                  <span><span className="font-semibold">{t('results.next.freePrivate')}</span> {t('results.next.reviewNotHiring')}</span>
                </div>
              </div>

              {/* Increase your case value */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="font-display text-base font-semibold text-slate-900">{t('results.headings.increaseValue')}</p>
                <p className="mt-0.5 text-xs text-slate-500">{t('results.next.increaseValueSub')}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {improveCaseValueItems.map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-200 p-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Upload className="h-4 w-4" aria-hidden /></span>
                      <p className="mt-2 text-xs font-semibold text-slate-800">{item.label}</p>
                      <p className="text-sm font-bold text-emerald-600">{item.boost.replace(' potential increase', '')}</p>
                      <Link to={assessment?.id ? `/evidence-upload/${assessment.id}` : '/evidence-upload'} className="mt-2 inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50">{item.done ? t('results.next.added') : t('results.next.uploadNow')}</Link>
                    </div>
                  ))}
                </div>
                <Link to={assessment?.id ? `/evidence-upload/${assessment.id}` : '/evidence-upload'} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">{t('results.next.seeAllWays')} <ChevronRight className="h-3.5 w-3.5" /></Link>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {/* Top attorney matches */}
              <div id="attorney-matches" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="font-display text-base font-semibold text-slate-900">{t('results.headings.topAttorneyMatches')}</p>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{t('results.next.preview')}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{t('results.next.handleCasesLikeYours')}</p>
                <div className="mt-4 space-y-3">
                  {rankedSnapshotAttorneys.length > 0 ? rankedSnapshotAttorneys.map((attorney: any) => {
                    const initials = String(attorney?.name ?? 'AT').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
                    const matchScore = Math.round((attorney.fit_score || 0.9) * 100)
                    const rating = (attorney.averageRating || attorney.rating || 0)
                    const reviews = attorney.verifiedReviewCount || 0
                    return (
                      <div key={attorney.id || attorney.attorney_id} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{initials}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{attorney?.law_firm?.name ?? attorney?.name ?? t('results.next.lawFirm')}</p>
                          <p className="truncate text-[11px] text-slate-500">{getAttorneyPracticePreview(attorney, { venueState, venueCounty }) || t('results.next.personalInjury')}</p>
                          {rating > 0 && (
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-600"><Star className="h-3 w-3" aria-hidden />{rating.toFixed(1)}{reviews > 0 ? ` (${reviews} ${t('results.next.reviewsSuffix')})` : ''}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] font-medium text-slate-400">{t('results.next.matchScore')}</p>
                          <p className="text-sm font-bold text-emerald-600">{matchScore}%</p>
                        </div>
                      </div>
                    )
                  }) : (
                    <p className="text-xs text-slate-500">{t('results.next.submitToSee')}</p>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t('results.next.unlockProfiles')}
                </div>
              </div>

              {/* Save your case — signed-out users create/sign in; signed-in users jump to their case */}
              {isLoggedIn ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="flex items-center gap-1.5 font-display text-base font-semibold text-slate-900">{t('results.next.caseSaved')} <CheckCircle className="h-4 w-4 text-emerald-500" aria-hidden /></p>
                  <p className="mt-0.5 text-xs text-slate-500">{t('results.next.caseSavedSub')}</p>
                  <Link
                    to="/dashboard"
                    className="mt-4 block w-full rounded-lg bg-brand-700 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
                  >
                    {t('results.next.goToDashboard')}
                  </Link>
                  {resolvedAssessmentId && (
                    <Link
                      to={`/dashboard?case=${resolvedAssessmentId}`}
                      className="mt-2 block w-full rounded-lg border border-brand-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      {t('results.next.viewThisCase')}
                    </Link>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="flex items-center gap-1.5 font-display text-base font-semibold text-slate-900">{t('results.next.saveYourCase')} <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden /></p>
                  <p className="mt-0.5 text-xs text-slate-500">{t('results.next.saveYourCaseSub')}</p>
                  <ul className="mt-3 space-y-1.5">
                    {[t('results.next.benefit1'), t('results.next.benefit2'), t('results.next.benefit3'), t('results.next.benefit4'), t('results.next.benefit5')].map((b) => (
                      <li key={b} className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />{b}</li>
                    ))}
                  </ul>
                  <Link
                    to={createAccountForReviewUrl}
                    onClick={handleGoCreateAccount}
                    className="mt-4 block w-full rounded-lg bg-brand-700 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
                  >
                    {t('results.next.createFreeAccount')}
                  </Link>
                  <Link
                    to={signInForReviewUrl}
                    onClick={() => { if (resolvedAssessmentId) localStorage.setItem('pending_assessment_id', resolvedAssessmentId) }}
                    className="mt-2 block w-full rounded-lg border border-brand-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    {t('results.next.alreadyHaveAccount')}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Bottom submit CTA */}
          <div id="attorney-handoff" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {medicalReviewPending && (
              <p className="mb-3 text-center text-sm text-amber-700">
                {t('results.next.reviewBeforeSubmit')}
              </p>
            )}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Star className="h-5 w-5" aria-hidden /></span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t('results.next.readyToSee')}</p>
                  <p className="text-xs text-slate-500">{t('results.next.submitNowResponses')}</p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <button
                  type="button"
                  onClick={openAttorneyReviewFlow}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 sm:w-auto"
                >
                  {medicalReviewPending ? t('results.shared.continueReview') : t('results.next.sendMyCase')}
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
                <p className="mt-1.5 text-[11px] text-slate-400">{t('results.next.noObligationFree')}</p>
              </div>
            </div>
          </div>

          {/* Sticky next-step bar (mobile) — keeps the single primary action always visible */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-lg items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('results.next.nextStep')}</p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {medicalReviewPending ? t('results.next.reviewTimeline') : t('results.next.sendCaseReview')}
                </p>
              </div>
              <button
                type="button"
                onClick={openAttorneyReviewFlow}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
              >
                {medicalReviewPending ? t('results.next.review') : t('results.next.sendForReview')}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </section>
        )}
          </div>
        </details>
        </div>
      </div>

      <Suspense fallback={<ResultsPanelSkeleton message={t('results.next.loadingReport')} />}>
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

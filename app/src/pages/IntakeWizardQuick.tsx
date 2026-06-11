/**
 * ClearCaseIQ Universal + Branching 12-Screen Intake Flow
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAssessment, predict, uploadEvidenceFile, processEvidenceFile, analyzeCaseWithChatGPT, calculateSOL, createIntakeLead, updateIntakeLead, type IntakeLeadPayload } from '../lib/api-plaintiff'
import { ChevronRight, ChevronLeft, ChevronDown, Car, Footprints, HardHat, Stethoscope, HelpCircle, Check, MapPin, Building2, Camera, Video, FileText, Shield, Mail, Phone, DollarSign, Dog, Package, AlertTriangle, Droplets } from 'lucide-react'
import InlineEvidenceUpload from '../components/InlineEvidenceUpload'
import { useLanguage } from '../contexts/LanguageContext'
import { buildCaseTaxonomy, injuryTypeToClaimType, sanitizeDetectedCounty } from '../lib/intakeQuickHelpers'
import { US_STATES } from '../lib/constants'
import { getCountiesForState } from '../lib/usLocationData'

type Step =
  | 'injury_type'
  | 'when'
  | 'narrative'
  | 'injury_severity'
  | 'injury_details'
  | 'case_details'
  | 'evidence'
  | 'financial_impact'
  | 'legal_status'
  | 'review'
  | 'consent'

const INJURY_TYPES = [
  { value: 'vehicle', labelKey: 'injuryType_vehicle', icon: Car },
  { value: 'slip_fall', labelKey: 'injuryType_slip_fall', icon: Footprints },
  { value: 'workplace', labelKey: 'injuryType_workplace', icon: HardHat },
  { value: 'medmal', labelKey: 'injuryType_medmal', icon: Stethoscope },
  { value: 'dog_bite', labelKey: 'injuryType_dog_bite', icon: Dog },
  { value: 'product', labelKey: 'injuryType_product', icon: Package },
  { value: 'assault', labelKey: 'injuryType_assault', icon: AlertTriangle },
  { value: 'toxic', labelKey: 'injuryType_toxic', icon: Droplets },
  { value: 'other', labelKey: 'injuryType_other', icon: HelpCircle }
]

const WHEN_OPTIONS = [
  { value: 'today', labelKey: 'today', getDate: () => new Date().toISOString().split('T')[0] },
  { value: 'last_week', labelKey: 'lastWeek', getDate: () => { const d = new Date(); d.setDate(d.getDate() - 5); return d.toISOString().split('T')[0] } },
  { value: 'last_month', labelKey: 'lastMonth', getDate: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0] } },
  { value: 'last_6_months', labelKey: 'last6Months', getDate: () => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split('T')[0] } },
  { value: 'more_6_months', labelKey: 'more6Months', getDate: () => { const d = new Date(); d.setDate(d.getDate() - 365); return d.toISOString().split('T')[0] } },
  { value: 'custom', labelKey: 'customDate', getDate: () => '' }
]

const INJURY_SEVERITY_OPTIONS = [
  { value: 'minor', labelKey: 'minor' as const },
  { value: 'moderate', labelKey: 'moderate' as const },
  { value: 'serious', labelKey: 'serious' as const },
  { value: 'surgery', labelKey: 'surgery' as const },
  { value: 'unsure', labelKey: 'unsure' as const }
]

// Option definitions carry translation keys; the component maps them to
// localized `{ value, label }` arrays so every render site stays unchanged.
const MEDICAL_TREATMENT_OPTION_DEFS = [
  { value: 'er', labelKey: 'treatment_er' },
  { value: 'chiro_pt', labelKey: 'treatment_pt' },
  { value: 'mri', labelKey: 'treatment_mri' },
  { value: 'injections', labelKey: 'treatment_injections' },
  { value: 'pain_management', labelKey: 'treatment_pain' },
  { value: 'surgery', labelKey: 'treatment_surgery' },
  { value: 'none', labelKey: 'treatment_none' }
]

const PRIOR_INJURY_OPTION_DEFS = [
  { value: 'none', labelKey: 'prior_none' },
  { value: 'similar', labelKey: 'prior_similar' },
  { value: 'prior_claim', labelKey: 'prior_claim' },
  { value: 'prior_surgery', labelKey: 'prior_surgery' },
  { value: 'not_sure', labelKey: 'optionNotSure' },
]

const BODY_PART_OPTION_DEFS = [
  { value: 'neck', labelKey: 'body_neck' },
  { value: 'lower_back', labelKey: 'body_back' },
  { value: 'shoulder', labelKey: 'body_shoulder' },
  { value: 'knee', labelKey: 'body_knee' },
  { value: 'head_concussion', labelKey: 'body_head' },
  { value: 'hand_wrist', labelKey: 'body_hand' },
  { value: 'hip', labelKey: 'body_hip' },
  { value: 'other', labelKey: 'optionOther' },
]

const SURGERY_STATUS_OPTION_DEFS = [
  { value: 'recommended', labelKey: 'surgst_recommended' },
  { value: 'scheduled', labelKey: 'surgst_scheduled' },
  { value: 'completed', labelKey: 'surgst_completed' },
  { value: 'not_discussed', labelKey: 'surgst_notDiscussed' },
]

const PROCEDURE_OPTION_DEFS = [
  { value: 'epidural_injections', labelKey: 'proc_epidural' },
  { value: 'nerve_blocks', labelKey: 'proc_nerveBlocks' },
  { value: 'radiofrequency_ablation', labelKey: 'proc_rfa' },
  { value: 'prp_stem_cell', labelKey: 'proc_prp' },
  { value: 'none', labelKey: 'optionNone' },
]

const FUTURE_TREATMENT_OPTION_DEFS = [
  { value: 'additional_pt', labelKey: 'future_pt' },
  { value: 'injections', labelKey: 'future_injections' },
  { value: 'surgery', labelKey: 'future_surgery' },
  { value: 'long_term_treatment', labelKey: 'future_longTerm' },
  { value: 'none', labelKey: 'future_none' },
]

const IMAGING_OPTION_DEFS = [
  { value: 'mri', labelKey: 'imaging_mri' },
  { value: 'ct_scan', labelKey: 'imaging_ct' },
  { value: 'xray', labelKey: 'imaging_xray' },
  { value: 'scheduled', labelKey: 'imaging_scheduled' },
  { value: 'none', labelKey: 'optionNone' },
]

const CONCUSSION_SYMPTOM_OPTION_DEFS = [
  { value: 'loss_of_consciousness', labelKey: 'concussion_loc' },
  { value: 'memory_issues', labelKey: 'concussion_memory' },
  { value: 'headaches', labelKey: 'concussion_headaches' },
  { value: 'dizziness', labelKey: 'concussion_dizziness' },
]

const LIFESTYLE_IMPACT_OPTION_DEFS = [
  { value: 'daily_pain', labelKey: 'impact_dailyPain' },
  { value: 'sleep_disruption', labelKey: 'impact_sleep' },
  { value: 'exercise_limitations', labelKey: 'impact_exercise' },
  { value: 'unable_to_work_normally', labelKey: 'impact_work' },
  { value: 'parenting_difficulties', labelKey: 'impact_parenting' },
  { value: 'emotional_distress', labelKey: 'impact_emotional' },
]

const SHOULDER_FINDING_OPTION_DEFS = [
  { value: 'mri_completed', labelKey: 'finding_mriCompleted' },
  { value: 'tear_diagnosed', labelKey: 'finding_tear' },
  { value: 'surgery_recommended', labelKey: 'finding_surgeryRecommended' },
]

const BACK_FINDING_OPTION_DEFS = [
  { value: 'mri_completed', labelKey: 'finding_mriCompleted' },
  { value: 'herniation', labelKey: 'finding_herniation' },
  { value: 'radiculopathy', labelKey: 'finding_radiculopathy' },
  { value: 'surgery_recommended', labelKey: 'finding_surgeryRecommended' },
]

const DIAGNOSIS_OPTION_DEFS = [
  { value: 'fracture', labelKey: 'diag_fracture' },
  { value: 'tbi', labelKey: 'diag_tbi' },
  { value: 'concussion', labelKey: 'diag_concussion' },
  { value: 'herniation', labelKey: 'diag_herniation' },
]

const MISSED_WORK_OPTION_DEFS = [
  { value: 'no', labelKey: 'optionNo' },
  { value: 'few_days', labelKey: 'work_fewDays' },
  { value: 'several_weeks', labelKey: 'work_severalWeeks' },
  { value: 'unable_to_return', labelKey: 'work_unableToReturn' },
  { value: 'lost_job_business_income', labelKey: 'work_selfEmployed' },
]

const ACCIDENT_EXPENSE_OPTION_DEFS = [
  { value: 'medical_bills', labelKey: 'expense_medicalBills' },
  { value: 'prescriptions', labelKey: 'expense_prescriptions' },
  { value: 'transportation', labelKey: 'expense_transportation' },
  { value: 'medical_equipment', labelKey: 'expense_equipment' },
  { value: 'other_expenses', labelKey: 'expense_other' },
  { value: 'none', labelKey: 'optionNone' },
]

const TREATMENT_PAYER_OPTION_DEFS = [
  { value: 'health_insurance', labelKey: 'payer_healthInsurance' },
  { value: 'workers_comp', labelKey: 'payer_workersComp' },
  { value: 'auto_insurance', labelKey: 'payer_autoInsurance' },
  { value: 'attorney_lien', labelKey: 'payer_attorneyLien' },
  { value: 'medical_lien', labelKey: 'payer_medicalLien' },
  { value: 'out_of_pocket', labelKey: 'payer_outOfPocket' },
  { value: 'not_sure', labelKey: 'optionNotSure' },
]

const WAGE_LOSS_RANGE_OPTION_DEFS = [
  { value: 'under_1000', labelKey: 'wage_under1000', estimate: '500' },
  { value: '1000_5000', labelKey: 'wage_1000_5000', estimate: '3000' },
  { value: '5000_10000', labelKey: 'wage_5000_10000', estimate: '7500' },
  { value: 'over_10000', labelKey: 'wage_over10000', estimate: '10000' },
]

const FINANCIAL_HARDSHIP_OPTION_DEFS = [
  { value: 'no', labelKey: 'optionNo' },
  { value: 'some', labelKey: 'hardship_some' },
  { value: 'significant', labelKey: 'hardship_significant' },
]

const DEFENDANT_COVERAGE_OPTION_DEFS = [
  { value: 'state_minimum', labelKey: 'coverage_stateMinimum' },
  { value: '50000', labelKey: 'coverage_50k' },
  { value: '100000', labelKey: 'coverage_100k' },
  { value: 'commercial_policy', labelKey: 'coverage_commercial' },
  { value: 'umbrella_policy', labelKey: 'coverage_umbrella' },
  { value: 'not_sure', labelKey: 'optionNotSure' },
]

const MEDICAL_BILL_RANGE_OPTION_DEFS = [
  { value: 'under_2500', labelKey: 'bills_under2500', estimate: 2500 },
  { value: '2500_10000', labelKey: 'bills_2500_10000', estimate: 7500 },
  { value: '10000_50000', labelKey: 'bills_10000_50000', estimate: 30000 },
  { value: 'over_50000', labelKey: 'bills_over50000', estimate: 50000 },
  { value: 'not_sure', labelKey: 'optionNotSure', estimate: 0 },
]

const FUTURE_MEDICAL_RANGE_OPTION_DEFS = [
  { value: 'none', labelKey: 'futmed_none', estimate: 0 },
  { value: 'under_5000', labelKey: 'futmed_under5000', estimate: 2500 },
  { value: '5000_25000', labelKey: 'futmed_5000_25000', estimate: 15000 },
  { value: 'over_25000', labelKey: 'futmed_over25000', estimate: 25000 },
  { value: 'not_sure', labelKey: 'optionNotSure', estimate: 0 },
]

const UM_UIM_OPTION_DEFS = [
  { value: 'yes', labelKey: 'umuim_yes' },
  { value: 'no', labelKey: 'optionNo' },
  { value: 'not_sure', labelKey: 'optionNotSure' },
]

const FAULT_BELIEF_OPTION_DEFS = [
  { value: 'other_party', labelKey: 'fault_otherParty' },
  { value: 'shared_fault', labelKey: 'fault_shared' },
  { value: 'not_sure', labelKey: 'optionNotSure' },
]

const SETTLEMENT_OFFER_OPTION_DEFS = [
  { value: 'no', labelKey: 'optionNo' },
  { value: 'under_5k', labelKey: 'offer_under5k' },
  { value: '5k_25k', labelKey: 'offer_5k_25k' },
  { value: 'over_25k', labelKey: 'offer_over25k' },
  { value: 'not_sure', labelKey: 'optionNotSure' },
]

const INSURANCE_CONTACT_OPTION_DEFS = [
  { value: 'yes', labelKey: 'optionYes' },
  { value: 'no', labelKey: 'optionNo' },
  { value: 'not_sure', labelKey: 'optionNotSure' },
]

const ATTORNEY_STATUS_OPTION_DEFS = [
  { value: 'hired', labelKey: 'optionYes' },
  { value: 'no', labelKey: 'optionNo' },
]

// Vehicle branch
const VEHICLE_CRASH_OPTIONS = [
  { value: 'rear_end', labelKey: 'vehicle_rear_end' },
  { value: 'side_impact', labelKey: 'vehicle_side_impact' },
  { value: 'head_on', labelKey: 'vehicle_head_on' },
  { value: 'left_turn', labelKey: 'vehicle_left_turn' },
  { value: 'multi_vehicle', labelKey: 'vehicle_multi_vehicle' },
  { value: 'pedestrian', labelKey: 'vehicle_pedestrian' },
  { value: 'bicycle', labelKey: 'vehicle_bicycle' },
  { value: 'not_sure', labelKey: 'vehicle_not_sure' }
]

const VEHICLE_DEFENDANT_OPTIONS = [
  { value: 'private', labelKey: 'vehicle_defendant_private' },
  { value: 'uber_lyft', labelKey: 'vehicle_defendant_uber_lyft' },
  { value: 'delivery', labelKey: 'vehicle_defendant_delivery' },
  { value: 'trucking', labelKey: 'vehicle_defendant_trucking' },
  { value: 'company', labelKey: 'vehicle_defendant_company' },
  { value: 'government', labelKey: 'vehicle_defendant_government' },
  { value: 'not_sure', labelKey: 'vehicle_not_sure' }
]

const PROPERTY_DAMAGE_OPTIONS = [
  { value: 'minor', labelKey: 'vehicle_damage_minor' },
  { value: 'moderate', labelKey: 'vehicle_damage_moderate' },
  { value: 'not_drivable', labelKey: 'vehicle_damage_not_drivable' },
  { value: 'total_loss', labelKey: 'vehicle_damage_total_loss' }
]

// Slip & fall branch
const SLIP_HAZARD_OPTIONS = [
  { value: 'wet_floor', labelKey: 'slip_wet_floor' },
  { value: 'uneven', labelKey: 'slip_uneven' },
  { value: 'broken_stairs', labelKey: 'slip_broken_stairs' },
  { value: 'poor_lighting', labelKey: 'slip_poor_lighting' },
  { value: 'debris', labelKey: 'slip_debris' },
  { value: 'ice_snow', labelKey: 'slip_ice_snow' },
  { value: 'not_sure', labelKey: 'vehicle_not_sure' }
]

const SLIP_PROPERTY_OPTIONS = [
  { value: 'grocery', labelKey: 'slip_grocery' },
  { value: 'restaurant', labelKey: 'slip_restaurant' },
  { value: 'apartment', labelKey: 'slip_apartment' },
  { value: 'workplace', labelKey: 'slip_workplace' },
  { value: 'sidewalk', labelKey: 'slip_sidewalk' },
  { value: 'hotel', labelKey: 'slip_hotel' },
  { value: 'residence', labelKey: 'slip_residence' }
]

// Med mal branch
const MEDMAL_ERROR_OPTIONS = [
  { value: 'surgical', labelKey: 'medmal_surgical' },
  { value: 'misdiagnosis', labelKey: 'medmal_misdiagnosis' },
  { value: 'delayed_diagnosis', labelKey: 'medmal_delayed_diagnosis' },
  { value: 'medication', labelKey: 'medmal_medication' },
  { value: 'birth_injury', labelKey: 'medmal_birth_injury' },
  { value: 'treatment', labelKey: 'medmal_treatment' }
]

const MEDMAL_PROVIDER_OPTIONS = [
  { value: 'hospital', labelKey: 'medmal_hospital' },
  { value: 'clinic', labelKey: 'medmal_clinic' },
  { value: 'urgent', labelKey: 'medmal_urgent' },
  { value: 'nursing_home', labelKey: 'medmal_nursing_home' },
  { value: 'private', labelKey: 'medmal_private' }
]

// Dog bite branch
const DOG_OWNERSHIP_OPTIONS = [
  { value: 'yes', labelKey: 'dog_yes' },
  { value: 'no_stray', labelKey: 'dog_no_stray' },
  { value: 'not_sure', labelKey: 'vehicle_not_sure' }
]

const DOG_LOCATION_OPTIONS = [
  { value: 'public', labelKey: 'dog_public' },
  { value: 'private_home', labelKey: 'dog_private_home' },
  { value: 'apartment', labelKey: 'dog_apartment' },
  { value: 'workplace', labelKey: 'slip_workplace' }
]

const PRIOR_AGGRESSION_OPTIONS = [
  { value: 'yes', labelKey: 'dog_yes' },
  { value: 'no', labelKey: 'dog_no' },
  { value: 'not_sure', labelKey: 'vehicle_not_sure' }
]

const DOG_MEDICAL_OPTIONS = [
  { value: 'stitches', labelKey: 'dog_stitches' },
  { value: 'er', labelKey: 'dog_er' },
  { value: 'surgery', labelKey: 'dog_surgery' },
  { value: 'infection', labelKey: 'dog_infection' }
]

// Product branch
const PRODUCT_TYPE_OPTION_DEFS = [
  { value: 'vehicle', labelKey: 'product_vehicle' },
  { value: 'household', labelKey: 'product_household' },
  { value: 'medical_device', labelKey: 'product_medicalDevice' },
  { value: 'medication', labelKey: 'product_medication' },
  { value: 'machinery', labelKey: 'product_machinery' }
]

// Assault branch
const ASSAULT_TYPE_OPTIONS = [
  { value: 'assault', labelKey: 'assault_assault' },
  { value: 'robbery', labelKey: 'assault_robbery' },
  { value: 'bar_fight', labelKey: 'assault_bar_fight' },
  { value: 'nightclub', labelKey: 'assault_nightclub' },
  { value: 'apartment', labelKey: 'assault_apartment' }
]

// Toxic branch
const TOXIC_SUBSTANCE_OPTIONS = [
  { value: 'chemical', labelKey: 'toxic_chemical' },
  { value: 'mold', labelKey: 'toxic_mold' },
  { value: 'asbestos', labelKey: 'toxic_asbestos' },
  { value: 'water', labelKey: 'toxic_water' },
  { value: 'gas', labelKey: 'toxic_gas' }
]

const EXPOSURE_DURATION_OPTIONS = [
  { value: 'single', labelKey: 'toxic_single' },
  { value: 'days', labelKey: 'toxic_days' },
  { value: 'weeks', labelKey: 'toxic_weeks' },
  { value: 'months', labelKey: 'toxic_months' }
]

const YES_NO_NOT_SURE_OPTIONS = [
  { value: 'yes', labelKey: 'optionYes' },
  { value: 'no', labelKey: 'optionNo' },
  { value: 'not_sure', labelKey: 'optionNotSure' }
]

const STEPS: { key: Step; title: string }[] = [
  { key: 'injury_type', title: 'Injury Type' },
  { key: 'when', title: 'When & Where Did It Happen?' },
  { key: 'narrative', title: 'What Happened?' },
  { key: 'injury_severity', title: 'Injuries & Treatment' },
  { key: 'injury_details', title: 'Injury Details' },
  { key: 'case_details', title: 'Case Details' },
  { key: 'evidence', title: 'Evidence Upload' },
  { key: 'financial_impact', title: 'Medical Bills & Income Impact' },
  { key: 'legal_status', title: 'Insurance & Legal Status' },
  { key: 'review', title: 'Review Your Case Story' },
  { key: 'consent', title: 'Your Case Report Is Ready' }
]

/** Steps that have no questions for a given injury type are skipped entirely. */
const HIDDEN_STEPS_BY_INJURY: Record<string, Step[]> = {}

/** Steps from older drafts that were merged into a single screen. */
const LEGACY_STEP_MAP: Record<string, Step> = {
  where: 'when',
  contact: 'narrative',
  medical_treatment: 'injury_severity',
  branch_7: 'case_details',
  branch_8: 'case_details',
  branch_9: 'case_details',
  branch_10: 'case_details',
}

const DRAFT_STORAGE_KEY = 'intake_quick_draft_v1'

export default function IntakeWizardQuick() {
  const { t } = useLanguage()
  const navigate = useNavigate()

  /** Shorthand for keys in the intake namespace. */
  const tx = (key: string) => t(`intake.${key}`)
  /** Maps key-based option defs to localized `{ value, label }` arrays. */
  const localizeOptions = <T extends { value: string; labelKey: string }>(defs: readonly T[]) =>
    defs.map(({ labelKey, ...rest }) => ({ ...rest, label: tx(labelKey) }))

  const MEDICAL_TREATMENT_OPTIONS = localizeOptions(MEDICAL_TREATMENT_OPTION_DEFS)
  const PRIOR_INJURY_OPTIONS = localizeOptions(PRIOR_INJURY_OPTION_DEFS)
  const BODY_PART_OPTIONS = localizeOptions(BODY_PART_OPTION_DEFS)
  const SURGERY_STATUS_OPTIONS = localizeOptions(SURGERY_STATUS_OPTION_DEFS)
  const PROCEDURE_OPTIONS = localizeOptions(PROCEDURE_OPTION_DEFS)
  const FUTURE_TREATMENT_OPTIONS = localizeOptions(FUTURE_TREATMENT_OPTION_DEFS)
  const IMAGING_OPTIONS = localizeOptions(IMAGING_OPTION_DEFS)
  const CONCUSSION_SYMPTOM_OPTIONS = localizeOptions(CONCUSSION_SYMPTOM_OPTION_DEFS)
  const LIFESTYLE_IMPACT_OPTIONS = localizeOptions(LIFESTYLE_IMPACT_OPTION_DEFS)
  const SHOULDER_FINDING_OPTIONS = localizeOptions(SHOULDER_FINDING_OPTION_DEFS)
  const BACK_FINDING_OPTIONS = localizeOptions(BACK_FINDING_OPTION_DEFS)
  const DIAGNOSIS_OPTIONS = localizeOptions(DIAGNOSIS_OPTION_DEFS)
  const MISSED_WORK_OPTIONS = localizeOptions(MISSED_WORK_OPTION_DEFS)
  const ACCIDENT_EXPENSE_OPTIONS = localizeOptions(ACCIDENT_EXPENSE_OPTION_DEFS)
  const TREATMENT_PAYER_OPTIONS = localizeOptions(TREATMENT_PAYER_OPTION_DEFS)
  const WAGE_LOSS_RANGE_OPTIONS = localizeOptions(WAGE_LOSS_RANGE_OPTION_DEFS)
  const FINANCIAL_HARDSHIP_OPTIONS = localizeOptions(FINANCIAL_HARDSHIP_OPTION_DEFS)
  const DEFENDANT_COVERAGE_OPTIONS = localizeOptions(DEFENDANT_COVERAGE_OPTION_DEFS)
  const MEDICAL_BILL_RANGE_OPTIONS = localizeOptions(MEDICAL_BILL_RANGE_OPTION_DEFS)
  const FUTURE_MEDICAL_RANGE_OPTIONS = localizeOptions(FUTURE_MEDICAL_RANGE_OPTION_DEFS)
  const UM_UIM_OPTIONS = localizeOptions(UM_UIM_OPTION_DEFS)
  const FAULT_BELIEF_OPTIONS = localizeOptions(FAULT_BELIEF_OPTION_DEFS)
  const SETTLEMENT_OFFER_OPTIONS = localizeOptions(SETTLEMENT_OFFER_OPTION_DEFS)
  const INSURANCE_CONTACT_OPTIONS = localizeOptions(INSURANCE_CONTACT_OPTION_DEFS)
  const ATTORNEY_STATUS_OPTIONS = localizeOptions(ATTORNEY_STATUS_OPTION_DEFS)
  const PRODUCT_TYPE_OPTIONS = localizeOptions(PRODUCT_TYPE_OPTION_DEFS)

  const [currentStep, setCurrentStep] = useState<Step>('injury_type')
  const [loading, setLoading] = useState(false)
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadFailures, setUploadFailures] = useState<string[]>([])
  const [draftRestored, setDraftRestored] = useState(false)
  const [pendingEvidenceFiles, setPendingEvidenceFiles] = useState<Record<string, any[]>>({})
  const [openEvidenceSections, setOpenEvidenceSections] = useState<Record<string, boolean>>({
    evidence: true,
    medical: true,
    insurance: false,
    income_loss: false,
  })
  const [returnToReviewFromStep, setReturnToReviewFromStep] = useState<Step | null>(null)
  const [customDate, setCustomDate] = useState('')
  const [detectedLocation, setDetectedLocation] = useState<{ city: string; county: string; state: string } | null>(null)
  const [locationAccepted, setLocationAccepted] = useState(false)
  const [solPreview, setSolPreview] = useState<any>(null)
  const [solPreviewError, setSolPreviewError] = useState<string | null>(null)
  const [furthestReachedStepIndex, setFurthestReachedStepIndex] = useState(0)

  const [formData, setFormData] = useState({
    injuryType: '' as string,
    claimType: '' as string,
    incidentDate: '',
    incidentDatePreset: '' as string,
    venue: { state: '', county: '', city: '' },
    narrative: '' as string,
    injurySeverity: '' as string,
    medicalTreatment: [] as string[],
    injuryDetails: {
      priorInjury: '' as string,
      bodyParts: [] as string[],
      bodyPartSeverity: {} as Record<string, string>,
      imaging: [] as string[],
      surgeryStatus: '' as string,
      procedures: [] as string[],
      futureTreatment: [] as string[],
      concussionSymptoms: [] as string[],
      lifestyleImpact: [] as string[],
      shoulderFindings: [] as string[],
      backFindings: [] as string[],
      diagnoses: [] as string[],
    },
    branch: {} as Record<string, any>,
    contact: { email: '', phone: '' },
    casePosture: {} as Record<string, any>,
    insuranceCoverage: {
      healthCoverage: '' as '' | 'yes' | 'no' | 'unsure',
      coverageTypes: [] as string[],
      medicarePlanType: '' as '' | 'original' | 'advantage' | 'unsure',
      healthInsurancePaid: '' as string,
      outOfPocketRange: '' as string,
      billPaymentSources: [] as string[],
      defendantCoverageLimits: '' as string,
      accidentExpenses: [] as string[],
      medicalBillRange: '' as string,
      medicalBillExact: '' as string,
      billsComplete: '' as '' | 'yes' | 'no',
      futureMedicalRange: '' as string,
      umUimCoverage: '' as string,
    },
    consents: { tos: false, privacy: false, ml_use: false }
  })

  const hiddenSteps = HIDDEN_STEPS_BY_INJURY[formData.injuryType] || []
  const visibleSteps = STEPS.filter(s => !hiddenSteps.includes(s.key))
  const currentStepIndex = visibleSteps.findIndex(s => s.key === currentStep)
  const progressPercent = Math.round(((currentStepIndex + 1) / visibleSteps.length) * 100)
  const uploadedEvidenceCount = Object.values(pendingEvidenceFiles).reduce((total, files) => total + (Array.isArray(files) ? files.length : 0), 0)

  // --- Draft autosave: nothing used to be saved until final submit, so a refresh lost all 15 steps. ---
  const draftLoadedRef = useRef(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (raw) {
        const draft = JSON.parse(raw)
        if (draft && typeof draft === 'object' && draft.formData?.injuryType) {
          setFormData(prev => ({
            ...prev,
            ...draft.formData,
            venue: { ...prev.venue, ...(draft.formData.venue || {}) },
            injuryDetails: { ...prev.injuryDetails, ...(draft.formData.injuryDetails || {}) },
            insuranceCoverage: { ...prev.insuranceCoverage, ...(draft.formData.insuranceCoverage || {}) },
            contact: { ...prev.contact, ...(draft.formData.contact || {}) },
            // Consents are confirmations, not answers — always re-confirm on resume.
            consents: { tos: false, privacy: false, ml_use: false },
          }))
          if (typeof draft.customDate === 'string') setCustomDate(draft.customDate)
          const hidden = HIDDEN_STEPS_BY_INJURY[draft.formData.injuryType] || []
          const validKeys = STEPS.map(s => s.key).filter(key => !hidden.includes(key))
          const restoredStep = typeof draft.currentStep === 'string'
            ? (LEGACY_STEP_MAP[draft.currentStep] ?? draft.currentStep)
            : undefined
          if (restoredStep && validKeys.includes(restoredStep as Step)) {
            setCurrentStep(restoredStep as Step)
          }
          if (typeof draft.furthestReachedStepIndex === 'number') {
            setFurthestReachedStepIndex(draft.furthestReachedStepIndex)
          }
          if (typeof draft.leadId === 'string' && draft.leadId) {
            leadIdRef.current = draft.leadId
          }
          setDraftRestored(true)
        }
      }
    } catch {
      /* corrupt draft or storage unavailable */
    } finally {
      draftLoadedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!draftLoadedRef.current || !formData.injuryType) return
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ formData, currentStep, customDate, furthestReachedStepIndex, leadId: leadIdRef.current, savedAt: Date.now() })
        )
      } catch {
        /* ignore quota / private mode */
      }
    }, 400)
    return () => clearTimeout(handle)
  }, [formData, currentStep, customDate, furthestReachedStepIndex])

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }

  const discardDraftAndRestart = () => {
    clearDraft()
    window.location.reload()
  }

  // --- Server-side partial lead: once contact info exists, mirror progress to the API
  // so the team can follow up even if the intake is abandoned before final submit. ---
  const leadIdRef = useRef<string | null>(null)
  const leadSyncInFlightRef = useRef(false)

  const buildLeadSnapshot = (): Record<string, unknown> => {
    const { consents: _consents, contact: _contact, ...answers } = formData
    return { ...answers, customDate }
  }

  const syncLead = async (overrides: Partial<IntakeLeadPayload> = {}) => {
    const email = formData.contact.email.trim()
    const phone = formData.contact.phone.trim()
    if (!leadIdRef.current && !email && !phone) return
    // Progress pings may be dropped while a sync is in flight, but never the completion link.
    if (leadSyncInFlightRef.current && overrides.status !== 'completed') return
    leadSyncInFlightRef.current = true
    try {
      const payload: IntakeLeadPayload = {
        email,
        phone,
        injuryType: formData.injuryType,
        venueState: formData.venue.state,
        venueCounty: formData.venue.county,
        currentStep,
        formSnapshot: buildLeadSnapshot(),
        ...overrides,
      }
      if (leadIdRef.current) {
        await updateIntakeLead(leadIdRef.current, payload)
      } else {
        leadIdRef.current = await createIntakeLead(payload)
      }
    } catch {
      /* lead capture is best-effort; never block the wizard */
    } finally {
      leadSyncInFlightRef.current = false
    }
  }

  // Keep the server lead in sync as the user moves through later steps.
  useEffect(() => {
    if (!leadIdRef.current) return
    void syncLead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  useEffect(() => {
    if (currentStepIndex >= 0) {
      setFurthestReachedStepIndex((previous) => Math.max(previous, currentStepIndex))
    }
  }, [currentStepIndex])

  const editReviewStep = (step: Step) => {
    setReturnToReviewFromStep(step)
    setCurrentStep(step)
  }

  // The step panel scrolls internally; reset it so each step starts at the top.
  const stepScrollRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    stepScrollRef.current?.scrollTo({ top: 0 })
  }, [currentStep])

  // Keep validation errors in one consistent place (top of the step) and bring it into view.
  const errorSummaryRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [errors])

  // Only geolocate once the user reaches the location step — no lookup before it is needed.
  const geoRequestedRef = useRef(false)
  useEffect(() => {
    if (currentStep !== 'when' || geoRequestedRef.current || formData.venue.state) return
    geoRequestedRef.current = true
    let cancelled = false
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const city = data.city || ''
        const county = sanitizeDetectedCounty(data.region_code || '', data.county || '')
        const state = data.region_code || ''
        if (city || county || state) setDetectedLocation({ city, county, state })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [currentStep, formData.venue.state])

  useEffect(() => {
    const incidentDate =
      formData.incidentDatePreset === 'custom'
        ? customDate
        : WHEN_OPTIONS.find((option) => option.value === formData.incidentDatePreset)?.getDate() || formData.incidentDate
    const claimType = formData.claimType || injuryTypeToClaimType(formData.injuryType)
    if (!incidentDate || !formData.venue.state || !claimType) {
      setSolPreview(null)
      setSolPreviewError(null)
      return
    }

    let cancelled = false
    calculateSOL(incidentDate, { state: formData.venue.state, county: formData.venue.county || undefined }, claimType)
      .then((data) => {
        if (cancelled) return
        setSolPreview(data)
        setSolPreviewError(null)
      })
      .catch((error: any) => {
        if (cancelled) return
        setSolPreview(null)
        setSolPreviewError(error?.response?.data?.error || tx('sol_unableCalc'))
      })

    return () => {
      cancelled = true
    }
  }, [customDate, formData.claimType, formData.incidentDate, formData.incidentDatePreset, formData.injuryType, formData.venue.county, formData.venue.state])

  const updateForm = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setErrors({})
  }

  const updateVenue = (venueUpdates: Partial<typeof formData.venue>) => {
    setFormData(prev => ({
      ...prev,
      venue: { ...prev.venue, ...venueUpdates },
    }))
    setErrors({})
  }

  const setBranch = (key: string, value: any) => {
    setFormData(prev => {
      // Re-selecting the same single-select value clears it (toggle off). Checkboxes/selects/
      // textareas never resend an identical value, so this only affects re-clicked option buttons.
      const current = (prev.branch as Record<string, any>)[key]
      return {
        ...prev,
        branch: { ...prev.branch, [key]: current === value ? '' : value },
      }
    })
    setErrors({})
  }

  const getIncidentDate = (): string => {
    if (formData.incidentDatePreset === 'custom') return customDate
    const opt = WHEN_OPTIONS.find(o => o.value === formData.incidentDatePreset)
    return opt ? opt.getDate() : formData.incidentDate
  }

  /** Date presets like "Last 6 months" produce an estimated date — deadline math from them is approximate. */
  const incidentDateIsApproximate =
    !!formData.incidentDatePreset && formData.incidentDatePreset !== 'custom' && formData.incidentDatePreset !== 'today'

  const formatVenueLocation = (venue: { city?: string; county?: string; state?: string }) =>
    [venue.city, venue.county, venue.state].filter(Boolean).join(', ')

  const buildNarrative = (): string => {
    const parts: string[] = []
    const it = INJURY_TYPES.find(a => a.value === formData.injuryType)
    parts.push(it ? t(`intake.${it.labelKey}`) : formData.injuryType)
    parts.push(`Incident date: ${getIncidentDate()}`)
    parts.push(`Location: ${formatVenueLocation(formData.venue)}`)
    if (formData.narrative) parts.push(formData.narrative)
    const sevKey = INJURY_SEVERITY_OPTIONS.find(o => o.value === formData.injurySeverity)?.labelKey
    parts.push(sevKey ? t(`intake.${sevKey}`) : formData.injurySeverity)
    if (formData.medicalTreatment.length) {
      const tx = formData.medicalTreatment.map(v => {
        const opt = MEDICAL_TREATMENT_OPTIONS.find(o => o.value === v)
        return opt ? getOptionLabel(MEDICAL_TREATMENT_OPTIONS, opt.value) : v
      }).join(', ')
      parts.push(tx)
    }
    if (formData.injuryDetails.bodyParts.length) parts.push(`Body parts: ${labelsForValues(BODY_PART_OPTIONS, formData.injuryDetails.bodyParts)}`)
    if (formData.injuryDetails.priorInjury) parts.push(`Prior injuries: ${labelForValue(PRIOR_INJURY_OPTIONS, formData.injuryDetails.priorInjury)}`)
    if (formData.injuryDetails.surgeryStatus) parts.push(`Surgery status: ${labelForValue(SURGERY_STATUS_OPTIONS, formData.injuryDetails.surgeryStatus)}`)
    if (formData.injuryDetails.imaging.length) parts.push(`Imaging: ${labelsForValues(IMAGING_OPTIONS, formData.injuryDetails.imaging)}`)
    if (formData.injuryDetails.procedures.length) parts.push(`Procedures: ${labelsForValues(PROCEDURE_OPTIONS, formData.injuryDetails.procedures)}`)
    if (formData.injuryDetails.futureTreatment.length) parts.push(`Future treatment: ${labelsForValues(FUTURE_TREATMENT_OPTIONS, formData.injuryDetails.futureTreatment)}`)
    if (formData.injuryDetails.shoulderFindings.length) parts.push(`Shoulder findings: ${labelsForValues(SHOULDER_FINDING_OPTIONS, formData.injuryDetails.shoulderFindings)}`)
    if (formData.injuryDetails.backFindings.length) parts.push(`Back findings: ${labelsForValues(BACK_FINDING_OPTIONS, formData.injuryDetails.backFindings)}`)
    if (formData.injuryDetails.diagnoses.length) parts.push(`Diagnoses: ${labelsForValues(DIAGNOSIS_OPTIONS, formData.injuryDetails.diagnoses)}`)
    if (formData.insuranceCoverage.medicalBillRange) parts.push(`Medical bills: ${labelForValue(MEDICAL_BILL_RANGE_OPTIONS, formData.insuranceCoverage.medicalBillRange)}`)
    if (formData.insuranceCoverage.futureMedicalRange) parts.push(`Future medical: ${labelForValue(FUTURE_MEDICAL_RANGE_OPTIONS, formData.insuranceCoverage.futureMedicalRange)}`)
    if (formData.insuranceCoverage.umUimCoverage) parts.push(`UM/UIM: ${labelForValue(UM_UIM_OPTIONS, formData.insuranceCoverage.umUimCoverage)}`)
    Object.entries(formData.branch).forEach(([k, v]) => {
      if (v != null && v !== '' && v !== false) parts.push(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    })
    return parts.join('. ')
  }

  const getOptionLabel = (options: Array<{ value: string; labelKey?: string; label?: string }>, value?: string) => {
    const option = options.find(o => o.value === value)
    if (!option) return value || tx('notAnsweredYet')
    return option.labelKey ? t(`intake.${option.labelKey}`) : option.label || option.value
  }

  const getMedicalTreatmentSummary = () => {
    if (!formData.medicalTreatment.length) return tx('notAnsweredYet')
    return formData.medicalTreatment
      .map(value => getOptionLabel(MEDICAL_TREATMENT_OPTIONS, value))
      .join(', ')
  }

  const labelForValue = (options: Array<{ value: string; label: string }>, value?: string) => {
    return options.find(option => option.value === value)?.label || value || tx('notAnsweredYet')
  }

  const labelsForValues = (options: Array<{ value: string; label: string }>, values?: string[]) => {
    const selected = Array.isArray(values) ? values : []
    if (!selected.length) return tx('notAnsweredYet')
    return selected.map(value => labelForValue(options, value)).join(', ')
  }

  const getInjuryDetailsSummary = () => {
    const details = formData.injuryDetails
    const pieces = [
      details.bodyParts.length ? labelsForValues(BODY_PART_OPTIONS, details.bodyParts) : null,
      details.imaging.length ? `${tx('sum_imaging')}: ${labelsForValues(IMAGING_OPTIONS, details.imaging)}` : null,
      details.surgeryStatus ? `${tx('sum_surgery')}: ${labelForValue(SURGERY_STATUS_OPTIONS, details.surgeryStatus)}` : null,
      details.procedures.length ? labelsForValues(PROCEDURE_OPTIONS, details.procedures) : null,
      details.diagnoses.length ? `${tx('sum_diagnoses')}: ${labelsForValues(DIAGNOSIS_OPTIONS, details.diagnoses)}` : null,
      details.shoulderFindings.length ? `${tx('sum_shoulder')}: ${labelsForValues(SHOULDER_FINDING_OPTIONS, details.shoulderFindings)}` : null,
      details.backFindings.length ? `${tx('sum_back')}: ${labelsForValues(BACK_FINDING_OPTIONS, details.backFindings)}` : null,
      details.priorInjury ? `${tx('sum_prior')}: ${labelForValue(PRIOR_INJURY_OPTIONS, details.priorInjury)}` : null,
    ].filter(Boolean)
    return pieces.length ? pieces.join(' • ') : tx('notAnsweredYet')
  }

  const getFinancialSummary = () => {
    const pieces = [
      formData.insuranceCoverage.healthCoverage ? `${tx('sum_coverage')}: ${formData.insuranceCoverage.healthCoverage === 'yes' ? tx('optionYes') : formData.insuranceCoverage.healthCoverage === 'no' ? tx('optionNo') : tx('optionNotSure')}` : null,
      formData.insuranceCoverage.accidentExpenses.length ? `${tx('sum_expenses')}: ${labelsForValues(ACCIDENT_EXPENSE_OPTIONS, formData.insuranceCoverage.accidentExpenses)}` : null,
      formData.insuranceCoverage.medicalBillRange ? `${tx('sum_bills')}: ${labelForValue(MEDICAL_BILL_RANGE_OPTIONS, formData.insuranceCoverage.medicalBillRange)}` : null,
      formData.insuranceCoverage.futureMedicalRange ? `${tx('sum_futureMedical')}: ${labelForValue(FUTURE_MEDICAL_RANGE_OPTIONS, formData.insuranceCoverage.futureMedicalRange)}` : null,
      formData.insuranceCoverage.billPaymentSources.length ? `${tx('sum_treatmentPaidBy')}: ${labelsForValues(TREATMENT_PAYER_OPTIONS, formData.insuranceCoverage.billPaymentSources)}` : null,
      formData.casePosture.missedWork ? `${tx('sum_income')}: ${labelForValue(MISSED_WORK_OPTIONS, formData.casePosture.missedWork)}` : null,
      formData.insuranceCoverage.defendantCoverageLimits ? `${tx('sum_limits')}: ${labelForValue(DEFENDANT_COVERAGE_OPTIONS, formData.insuranceCoverage.defendantCoverageLimits)}` : null,
      formData.insuranceCoverage.umUimCoverage ? `${tx('sum_umuim')}: ${labelForValue(UM_UIM_OPTIONS, formData.insuranceCoverage.umUimCoverage)}` : null,
    ].filter(Boolean)
    return pieces.length ? pieces.join(' • ') : tx('notAnsweredYet')
  }

  const getLegalStatusSummary = () => {
    const cp = formData.casePosture
    const pieces = [
      cp.settlementOfferStatus === 'yes'
        ? `${tx('sum_offer')}: ${cp.settlementOffer ? labelForValue(SETTLEMENT_OFFER_OPTIONS, cp.settlementOffer) : tx('optionYes')}`
        : cp.settlementOfferStatus
          ? `${tx('sum_offer')}: ${cp.settlementOfferStatus === 'no' ? tx('optionNo') : tx('optionNotSure')}`
          : null,
      cp.acceptedSettlement ? `${tx('sum_acceptedSettlement')}: ${cp.acceptedSettlement === 'yes' ? tx('optionYes') : cp.acceptedSettlement === 'no' ? tx('optionNo') : tx('optionNotSure')}` : null,
      cp.faultBelief ? `${tx('sum_fault')}: ${labelForValue(FAULT_BELIEF_OPTIONS, cp.faultBelief)}` : null,
      cp.insuranceContact ? `${tx('sum_reported')}: ${labelForValue(INSURANCE_CONTACT_OPTIONS, cp.insuranceContact)}` : null,
      cp.attorneyStatus ? `${tx('sum_lawyer')}: ${labelForValue(ATTORNEY_STATUS_OPTIONS, cp.attorneyStatus)}` : null,
      cp.deadlineWarning ? `${tx('sum_deadline')}: ${cp.deadlineWarning === 'yes' ? tx('sum_deadlineFlagged') : cp.deadlineWarning === 'no' ? tx('sum_noDeadlineWarning') : tx('optionNotSure')}` : null,
    ].filter(Boolean)
    return pieces.length ? pieces.join(' • ') : tx('notAnsweredYet')
  }

  // Four consolidated cards: What happened, Injuries & treatment, Money & documents, Legal.
  const getReviewItems = () => [
    {
      title: tx('review_whatHappenedTitle'),
      value: formData.narrative || tx('review_whatHappenedEmpty'),
      step: 'narrative' as Step,
      helper: `${getIncidentDate() || tx('review_dateNotSet')}${formData.venue.state ? ` • ${formatVenueLocation(formData.venue)}` : ''}`
    },
    {
      title: tx('review_injuriesTreatmentTitle'),
      value: `${getOptionLabel(INJURY_SEVERITY_OPTIONS, formData.injurySeverity)} • ${getMedicalTreatmentSummary()}`,
      step: 'injury_details' as Step,
      helper: getInjuryDetailsSummary()
    },
    {
      title: tx('review_moneyDocsTitle'),
      value: getFinancialSummary(),
      step: 'financial_impact' as Step,
      helper: uploadedEvidenceCount > 0 ? `${uploadedEvidenceCount} ${uploadedEvidenceCount === 1 ? tx('review_fileAdded') : tx('review_filesAdded')}` : tx('review_noDocuments')
    },
    {
      title: tx('review_legalTitle'),
      value: getLegalStatusSummary(),
      step: 'legal_status' as Step,
      helper: tx('review_legalHelper')
    }
  ]

  const getPreliminaryInsights = () => {
    const insights: string[] = []
    const imaging = formData.injuryDetails.imaging
    const treatment = formData.medicalTreatment
    const priorInjury = formData.injuryDetails.priorInjury
    const missedWork = formData.casePosture.missedWork
    const offerStatus = formData.casePosture.settlementOfferStatus

    if (imaging.includes('mri') || treatment.includes('mri')) insights.push(tx('insight_mri'))
    if (imaging.includes('ct_scan') || imaging.includes('xray')) insights.push(tx('insight_imaging'))
    if (treatment.includes('injections') || formData.injuryDetails.procedures.some(value => value !== 'none')) insights.push(tx('insight_injections'))
    if (formData.injuryDetails.surgeryStatus && formData.injuryDetails.surgeryStatus !== 'not_discussed') insights.push(tx('insight_surgery'))
    if (missedWork && missedWork !== 'no') insights.push(tx('insight_missedWork'))
    if (priorInjury === 'none') insights.push(tx('insight_noPrior'))
    if (priorInjury && priorInjury !== 'none' && priorInjury !== 'not_sure') insights.push(tx('insight_prior'))
    if (offerStatus === 'no') insights.push(tx('insight_noOffer'))
    if (offerStatus === 'yes') insights.push(tx('insight_offerAnchor'))
    if (formData.casePosture.faultBelief === 'other_party') insights.push(tx('insight_fault'))
    if (uploadedEvidenceCount > 0) insights.push(tx('insight_uploads'))

    if (insights.length === 0) {
      insights.push(tx('insight_fallback1'))
      insights.push(tx('insight_fallback2'))
    }

    return insights.slice(0, 4)
  }

  const getEstimateConfidence = () => {
    const confidenceSignals = [
      uploadedEvidenceCount > 0,
      formData.medicalTreatment.length > 0 && !formData.medicalTreatment.includes('none'),
      formData.injuryDetails.bodyParts.length > 0,
      formData.injuryDetails.imaging.length > 0,
      formData.injuryDetails.shoulderFindings.length > 0 || formData.injuryDetails.backFindings.length > 0 || formData.injuryDetails.concussionSymptoms.length > 0,
      formData.injuryDetails.procedures.length > 0 || formData.injuryDetails.futureTreatment.length > 0 || !!formData.injuryDetails.surgeryStatus,
      !!formData.casePosture.faultBelief,
      !!formData.casePosture.missedWork,
      !!formData.narrative.trim(),
    ].filter(Boolean).length

    if (confidenceSignals >= 5) return 'high'
    if (confidenceSignals >= 3) return 'moderate'
    return 'early'
  }

  const handleEvidenceFiles = (category: string, files: any[]) => {
    setPendingEvidenceFiles(prev => ({ ...prev, [category]: files }))
  }

  /** Uploads queued files, keeps only the failed ones queued, and returns the failed file names. */
  const uploadPendingEvidence = async (id: string): Promise<string[]> => {
    const failedNames: string[] = []
    const remaining: Record<string, any[]> = {}
    for (const [category, files] of Object.entries(pendingEvidenceFiles)) {
      const arr = Array.isArray(files) ? files : []
      const stillPending: any[] = []
      for (const file of arr) {
        if (file?.rawFile && String(file.id || '').startsWith('temp_')) {
          try {
            const fd = new FormData()
            fd.append('file', file.rawFile)
            fd.append('assessmentId', id)
            fd.append('category', category)
            fd.append('subcategory', file.subcategory || '')
            fd.append('description', file.description || '')
            fd.append('uploadMethod', 'manual')
            const uploaded = await uploadEvidenceFile(fd)
            if (uploaded?.id) await processEvidenceFile(uploaded.id).catch(() => {})
          } catch (e) {
            console.error('Evidence upload failed', e)
            failedNames.push(file?.name || file?.fileName || file?.rawFile?.name || 'document')
            stillPending.push(file)
          }
        }
      }
      if (stillPending.length) remaining[category] = stillPending
    }
    setPendingEvidenceFiles(remaining)
    return failedNames
  }

  const goToResults = (id: string) => {
    setUploadFailures([])
    navigate(`/results/${id}`, { replace: true })
  }

  const retryFailedUploads = async () => {
    if (!assessmentId) return
    setLoading(true)
    try {
      const failed = await uploadPendingEvidence(assessmentId)
      setUploadFailures(failed)
      if (failed.length === 0) goToResults(assessmentId)
    } finally {
      setLoading(false)
    }
  }

  const validateAndNext = () => {
    const err: Record<string, string> = {}
    if (currentStep === 'injury_type' && !formData.injuryType) err.injuryType = tx('error_selectInjuryType')
    if (currentStep === 'when') {
      if (!formData.incidentDatePreset) err.incidentDate = tx('error_chooseDate')
      else if (formData.incidentDatePreset === 'custom' && !customDate) err.incidentDate = tx('error_enterDate')
      else if (formData.incidentDatePreset === 'custom' && customDate) updateForm({ incidentDate: customDate })
      else if (formData.incidentDatePreset !== 'custom') {
        const d = WHEN_OPTIONS.find(o => o.value === formData.incidentDatePreset)
        updateForm({ incidentDate: d?.getDate() || '' })
      }
      if (!formData.venue.state) err.state = t('intake.selectStateError')
      if (!formData.venue.county?.trim()) err.county = t('intake.enterCounty')
    }
    if (currentStep === 'narrative') {
      // Narrative text is optional but recommended; contact fields live here too.
      const email = formData.contact.email.trim()
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err.contactEmail = tx('contact_emailError')
    }
    if (currentStep === 'injury_severity' && !formData.injurySeverity) err.injurySeverity = t('intake.selectSeverity')
    if (currentStep === 'consent') {
      const c = formData.consents || {}
      if (!c.tos) err.tos = t('intake.acceptTos')
      if (!c.privacy) err.privacy = t('intake.acceptPrivacy')
      if (!c.ml_use) err.ml_use = t('intake.consentAi')
    }
    setErrors(err)
    if (Object.keys(err).length > 0) return
    if (currentStep === 'narrative' && (formData.contact.email.trim() || formData.contact.phone.trim())) {
      void syncLead()
    }
    if (returnToReviewFromStep === currentStep) {
      setReturnToReviewFromStep(null)
      setCurrentStep('review')
      return
    }
    if (currentStepIndex < visibleSteps.length - 1) {
      setCurrentStep(visibleSteps[currentStepIndex + 1].key)
    }
  }

  const handleSubmit = async () => {
    // The assessment was already created but some documents failed: retry uploads instead of re-submitting.
    if (assessmentId) {
      await retryFailedUploads()
      return
    }
    const consents = formData.consents || { tos: false, privacy: false, ml_use: false }
    const err: Record<string, string> = {}
    if (!formData.venue.state) err.state = t('intake.selectStateError')
    if (!formData.venue.county?.trim()) err.county = t('intake.enterCounty')
    if (!consents.tos) err.tos = t('intake.acceptTos')
    if (!consents.privacy) err.privacy = t('intake.acceptPrivacy')
    if (!consents.ml_use) err.ml_use = t('intake.consentAi')
    setErrors(err)
    if (Object.keys(err).length > 0) return
    setLoading(true)
    try {
      const claimType = injuryTypeToClaimType(formData.injuryType)
      const caseTaxonomy = buildCaseTaxonomy({
        injuryType: formData.injuryType,
        claimType,
        branch: formData.branch,
        insuranceCoverage: formData.insuranceCoverage,
        injuryDetails: formData.injuryDetails,
        casePosture: formData.casePosture,
      })
      const medicalSignalDefaults = {
        imaging: formData.injuryDetails.imaging.length > 0 ? 'answered' : 'unknown',
        procedures: formData.injuryDetails.procedures.length > 0 ? 'answered' : 'unknown',
        futureTreatment: formData.injuryDetails.futureTreatment.length > 0 ? 'answered' : 'unknown',
        surgeryStatus: formData.injuryDetails.surgeryStatus || 'unknown',
      }
      const medicalBillRangeEstimate = MEDICAL_BILL_RANGE_OPTIONS.find(option => option.value === formData.insuranceCoverage.medicalBillRange)?.estimate || 0
      // For the open-ended "$50k+" bucket, prefer an exact figure if the user supplied one
      // so large cases are not anchored at the $50k floor.
      const medicalBillExactValue = Number(String(formData.insuranceCoverage.medicalBillExact || '').replace(/[$,\s]/g, '')) || 0
      const medicalBillEstimate = medicalBillExactValue > 0 ? medicalBillExactValue : medicalBillRangeEstimate
      const futureMedicalEstimate = FUTURE_MEDICAL_RANGE_OPTIONS.find(option => option.value === formData.insuranceCoverage.futureMedicalRange)?.estimate || 0
      const payload = {
        claimType: claimType as any,
        caseSubtype: caseTaxonomy.caseSubtype,
        incidentTags: caseTaxonomy.incidentTags,
        taxonomyPath: caseTaxonomy.taxonomyPath,
        caseTaxonomy,
        venue: { state: formData.venue.state, county: formData.venue.county.trim() },
        incident: {
          date: getIncidentDate(),
          location: formatVenueLocation(formData.venue),
          narrative: buildNarrative(),
          caseSubtype: caseTaxonomy.caseSubtype,
          incidentTags: caseTaxonomy.incidentTags,
          taxonomyPath: caseTaxonomy.taxonomyPath,
        },
        injuries: [
          {
            description: formData.injurySeverity,
            bodyParts: formData.injuryDetails.bodyParts.map(bodyPart => ({
              part: bodyPart,
              severity: formData.injuryDetails.bodyPartSeverity[bodyPart] || 'unspecified',
            })),
            priorInjury: formData.injuryDetails.priorInjury,
            concussionSymptoms: formData.injuryDetails.concussionSymptoms,
            lifestyleImpact: formData.injuryDetails.lifestyleImpact,
            shoulderFindings: formData.injuryDetails.shoulderFindings,
            backFindings: formData.injuryDetails.backFindings,
            diagnoses: formData.injuryDetails.diagnoses,
            fracture: formData.injuryDetails.diagnoses.includes('fracture'),
            tbi: formData.injuryDetails.diagnoses.includes('tbi'),
          }
        ],
        treatment: [
          ...formData.medicalTreatment.map(t => ({ type: t, notes: '' })),
          ...formData.injuryDetails.imaging.map(imaging => ({ type: 'imaging', imaging })),
          ...(formData.injuryDetails.surgeryStatus ? [{ type: 'surgery_status', status: formData.injuryDetails.surgeryStatus }] : []),
          ...formData.injuryDetails.procedures.map(procedure => ({ type: 'procedure', procedure })),
          ...formData.injuryDetails.futureTreatment.map(futureTreatment => ({ type: 'future_treatment', recommendation: futureTreatment })),
          ...formData.injuryDetails.shoulderFindings.map(finding => ({ type: 'shoulder_finding', finding })),
          ...formData.injuryDetails.backFindings.map(finding => ({ type: 'back_finding', finding })),
        ],
        liability: {
          ...formData.branch,
          faultBelief: formData.casePosture.faultBelief,
          comparativeFault: formData.casePosture.comparativeFault || (
            formData.casePosture.faultBelief === 'mostly_me'
              ? 'yes'
              : formData.casePosture.faultBelief === 'shared_fault' || formData.casePosture.faultBelief === 'not_sure'
                ? 'possibly'
                : 'no'
          ),
          comparativeNegligence:
            formData.casePosture.faultBelief === 'mostly_me' || formData.casePosture.comparativeFault === 'yes'
              ? 0.35
              : formData.casePosture.faultBelief === 'shared_fault' ||
                  formData.casePosture.faultBelief === 'not_sure' ||
                  formData.casePosture.comparativeFault === 'possibly' ||
                  formData.casePosture.comparativeFault === 'not_sure'
                ? 0.15
                : 0,
        },
        damages: {
          med_charges: medicalBillEstimate,
          intake_med_charges: medicalBillEstimate,
          bills_complete: formData.insuranceCoverage.billsComplete === 'yes',
          future_medical: futureMedicalEstimate,
          medical_bill_range: formData.insuranceCoverage.medicalBillRange,
          future_medical_range: formData.insuranceCoverage.futureMedicalRange,
          estimated_wage_loss: Number(String(formData.casePosture.lostWagesEstimate || '').replace(/[$,]/g, '')) || 0,
          wage_loss: Number(String(formData.casePosture.lostWagesEstimate || '').replace(/[$,]/g, '')) || 0,
        },
        insurance: {
          health_coverage: formData.insuranceCoverage.healthCoverage,
          coverage_types:
            formData.insuranceCoverage.healthCoverage === 'yes'
              ? [...formData.insuranceCoverage.coverageTypes]
              : [],
          medicare_plan_type:
            formData.insuranceCoverage.healthCoverage === 'yes' &&
            formData.insuranceCoverage.coverageTypes.includes('medicare')
              ? formData.insuranceCoverage.medicarePlanType || 'unsure'
              : undefined,
          health_insurance_paid: formData.insuranceCoverage.healthInsurancePaid,
          out_of_pocket_range: formData.insuranceCoverage.outOfPocketRange,
          bill_payment_sources: formData.insuranceCoverage.billPaymentSources,
          accident_expenses_paid: formData.insuranceCoverage.accidentExpenses,
          medical_bill_range: formData.insuranceCoverage.medicalBillRange,
          future_medical_range: formData.insuranceCoverage.futureMedicalRange,
          um_uim: formData.insuranceCoverage.umUimCoverage,
          has_um_uim_coverage: formData.insuranceCoverage.umUimCoverage === 'yes',
          defendant_coverage_limits: formData.insuranceCoverage.defendantCoverageLimits,
          policy_limit:
            formData.insuranceCoverage.defendantCoverageLimits === '50000'
              ? 50000
              : formData.insuranceCoverage.defendantCoverageLimits === '100000'
                ? 100000
                : formData.insuranceCoverage.defendantCoverageLimits === 'state_minimum'
                  ? 25000
                  : undefined
        },
        caseAcceleration: {
          wageLoss: {
            missedWork: formData.casePosture.missedWork,
            estimatedAmount: formData.casePosture.lostWagesEstimate,
            estimatedRange: formData.casePosture.lostWagesRange,
          }
        },
        plaintiffContext: {
          representationStage:
            formData.casePosture.attorneyStatus === 'hired'
              ? 'lawyer_retained'
              : formData.casePosture.attorneyStatus === 'looking'
                ? 'no_lawyer'
                : undefined,
          settlementOfferStatus: formData.casePosture.settlementOfferStatus,
          settlementOffer: formData.casePosture.settlementOffer,
          acceptedSettlement: formData.casePosture.acceptedSettlement,
          acceptedSettlementAmount: formData.casePosture.acceptedSettlementAmount,
          insuranceContact: formData.casePosture.insuranceContact,
          financialHardship: formData.casePosture.financialHardship,
          attorneyStatus: formData.casePosture.attorneyStatus,
          secondOpinionInterest: formData.casePosture.secondOpinionInterest,
          deadlineWarning: formData.casePosture.deadlineWarning,
          painLifestyleImpact: formData.injuryDetails.lifestyleImpact,
        },
        consents: {
          tos: consents.tos,
          privacy: consents.privacy,
          ml_use: consents.ml_use
        }
      }
      ;(payload as any).intakeData = {
        injuryType: formData.injuryType,
        caseTaxonomy,
        narrative: formData.narrative,
        branch: formData.branch,
        injuryDetails: formData.injuryDetails,
        medicalSignalDefaults,
        casePosture: formData.casePosture,
        insuranceCoverage: formData.insuranceCoverage,
        contact: {
          email: formData.contact.email.trim(),
          phone: formData.contact.phone.trim(),
        },
        incidentDatePreset: formData.incidentDatePreset,
        incidentDateApproximate: incidentDateIsApproximate
      }

      const id = await createAssessment(payload)
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Assessment was created without a valid ID.')
      }
      setAssessmentId(id)
      try {
        localStorage.setItem('pending_assessment_id', id)
      } catch {
        /* ignore quota / private mode */
      }
      clearDraft()
      void syncLead({ assessmentId: id, status: 'completed' })
      predict(id).catch((e) => console.error('Prediction after intake failed', e))
      analyzeCaseWithChatGPT(id).catch(() => {})
      const failedUploads = await uploadPendingEvidence(id)
      if (failedUploads.length > 0) {
        // Stay on this step so the user can retry or knowingly continue without the documents.
        setUploadFailures(failedUploads)
        return
      }
      goToResults(id)
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message || tx('error_submitFailed')
      setErrors({ submit: msg })
    } finally {
      setLoading(false)
    }
  }

  const toggleMedicalTreatment = (v: string) => {
    setFormData(prev => {
      const medicalTreatment =
        v === 'none'
          ? prev.medicalTreatment.includes('none') ? [] : ['none']
          : prev.medicalTreatment.includes(v)
          ? prev.medicalTreatment.filter(t => t !== v)
          : [...prev.medicalTreatment.filter(t => t !== 'none'), v]
      // Keep step 5's imaging answer in sync so the user never has to say "MRI" twice.
      let imaging = prev.injuryDetails.imaging
      if (v === 'mri') {
        imaging = medicalTreatment.includes('mri')
          ? Array.from(new Set([...imaging.filter(i => i !== 'none'), 'mri']))
          : imaging.filter(i => i !== 'mri')
      }
      return { ...prev, medicalTreatment, injuryDetails: { ...prev.injuryDetails, imaging } }
    })
  }

  const toggleInjuryDetail = (
    field: 'bodyParts' | 'imaging' | 'procedures' | 'futureTreatment' | 'concussionSymptoms' | 'lifestyleImpact' | 'shoulderFindings' | 'backFindings' | 'diagnoses',
    value: string,
    exclusiveNone = false
  ) => {
    setFormData(prev => {
      const current = prev.injuryDetails[field]
      const next = exclusiveNone && value === 'none'
        ? current.includes('none') ? [] : ['none']
        : current.includes(value)
          ? current.filter(item => item !== value)
          : [...current.filter(item => item !== 'none'), value]
      return {
        ...prev,
        injuryDetails: {
          ...prev.injuryDetails,
          [field]: next,
          ...(field === 'bodyParts'
            ? {
                bodyPartSeverity: Object.fromEntries(
                  Object.entries(prev.injuryDetails.bodyPartSeverity).filter(([part]) => next.includes(part))
                )
              }
            : {})
        }
      }
    })
    setErrors({})
  }

  const setBodyPartSeverity = (bodyPart: string, severity: string) => {
    setFormData(prev => ({
      ...prev,
      injuryDetails: {
        ...prev.injuryDetails,
        bodyPartSeverity: {
          ...prev.injuryDetails.bodyPartSeverity,
          [bodyPart]: severity
        }
      }
    }))
    setErrors({})
  }

  const setCasePostureField = (key: string, value: any) => {
    setFormData(prev => {
      // Re-selecting the same single-select value clears it (toggle off).
      const current = (prev.casePosture as Record<string, any>)[key]
      return {
        ...prev,
        casePosture: { ...prev.casePosture, [key]: current === value ? '' : value },
      }
    })
    setErrors({})
  }

  const toggleBillPaymentSource = (value: string) => {
    setFormData(prev => {
      const current = prev.insuranceCoverage.billPaymentSources
      const nextSources = value === 'not_sure'
        ? current.includes('not_sure') ? [] : ['not_sure']
        : current.includes(value)
          ? current.filter(item => item !== value)
          : [...current.filter(item => item !== 'not_sure'), value]
      return {
        ...prev,
        insuranceCoverage: {
          ...prev.insuranceCoverage,
          billPaymentSources: nextSources
        }
      }
    })
    setErrors({})
  }

  const toggleAccidentExpense = (value: string) => {
    setFormData(prev => {
      const current = prev.insuranceCoverage.accidentExpenses || []
      const nextExpenses = value === 'none'
        ? current.includes('none') ? [] : ['none']
        : current.includes(value)
          ? current.filter(item => item !== value)
          : [...current.filter(item => item !== 'none'), value]
      return {
        ...prev,
        insuranceCoverage: {
          ...prev.insuranceCoverage,
          accidentExpenses: nextExpenses
        }
      }
    })
    setErrors({})
  }

  const toggleCoverageType = (v: string) => {
    setFormData(prev => {
      const ic = prev.insuranceCoverage
      const nextTypes = ic.coverageTypes.includes(v)
        ? ic.coverageTypes.filter(x => x !== v)
        : [...ic.coverageTypes, v]
      const medicarePlanType =
        v === 'medicare' && ic.coverageTypes.includes('medicare') && !nextTypes.includes('medicare')
          ? ''
          : ic.medicarePlanType
      return {
        ...prev,
        insuranceCoverage: { ...ic, coverageTypes: nextTypes, medicarePlanType }
      }
    })
    setErrors({})
  }

  const it = formData.injuryType
  const isVehicle = it === 'vehicle'
  const isSlipFall = it === 'slip_fall' || it === 'workplace'
  const isMedmal = it === 'medmal'
  const isDogBite = it === 'dog_bite'
  const isProduct = it === 'product'
  const isAssault = it === 'assault'
  const isToxic = it === 'toxic'
  const isOther = it === 'other'

  const hasSavedAnswerForStep = (step: Step) => {
    switch (step) {
      case 'injury_type':
        return !!formData.injuryType
      case 'when':
        return !!formData.incidentDatePreset || !!formData.incidentDate || !!formData.venue.state || !!formData.venue.county || !!formData.venue.city
      case 'injury_severity':
        return !!formData.injurySeverity || formData.medicalTreatment.length > 0
      case 'injury_details':
        return (
          formData.injuryDetails.bodyParts.length > 0 ||
          formData.injuryDetails.imaging.length > 0 ||
          formData.injuryDetails.diagnoses.length > 0 ||
          formData.injuryDetails.lifestyleImpact.length > 0
        )
      case 'case_details':
        return Boolean(
          formData.branch.crashType ||
          formData.branch.hazardType ||
          formData.branch.errorType ||
          formData.branch.dogOwned ||
          formData.branch.productType ||
          formData.branch.assaultType ||
          formData.branch.substance ||
          formData.branch.otherDetails ||
          formData.branch.policeReport ||
          formData.branch.ticketIssued ||
          formData.branch.witnesses ||
          formData.branch.photosVideo ||
          formData.branch.videoEvidence ||
          formData.branch.redLightViolation ||
          formData.branch.duiOtherDriver ||
          formData.branch.propertyType ||
          formData.branch.providerType ||
          formData.branch.biteLocation ||
          formData.branch.productMalfunction ||
          formData.branch.productRecalled ||
          formData.branch.securityPresent ||
          formData.branch.poorLighting ||
          formData.branch.exposureDuration ||
          formData.branch.propertyDamage ||
          formData.branch.priorAggression ||
          formData.branch.medicalTreatment ||
          formData.branch.defectKnown ||
          formData.branch.symptomsStarted ||
          formData.branch.defendantType ||
          formData.branch.dogMedical ||
          formData.branch.warningLabel ||
          formData.branch.doctorVisit
        )
      case 'financial_impact':
        return (
          !!formData.insuranceCoverage.medicalBillRange ||
          !!formData.insuranceCoverage.futureMedicalRange ||
          !!formData.casePosture.missedWork ||
          !!formData.insuranceCoverage.healthCoverage ||
          !!formData.casePosture.financialHardship
        )
      case 'legal_status':
        return (
          !!formData.casePosture.faultBelief ||
          !!formData.casePosture.comparativeFault ||
          !!formData.casePosture.insuranceContact ||
          !!formData.casePosture.attorneyStatus ||
          !!formData.casePosture.acceptedSettlement ||
          (isVehicle && (!!formData.casePosture.autoInsuranceStatus || !!formData.insuranceCoverage.umUimCoverage))
        )
      default:
        return false
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'injury_type':
        return (
          <div className="space-y-2">
            <p className="text-center font-display text-[16px] font-semibold text-gray-900 sm:text-[19px]">{t('intake.injuryType')}</p>
            <p className="text-center text-[11px] leading-snug text-gray-500 sm:text-xs">{t('intake.injuryTypeHelp')}</p>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
              {INJURY_TYPES.map(({ value, labelKey, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={formData.injuryType === value}
                  onClick={() => {
                    if (formData.injuryType === value) {
                      updateForm({ injuryType: '', claimType: '' })
                      return
                    }
                    updateForm({ injuryType: value, claimType: injuryTypeToClaimType(value) })
                    setCurrentStep('when')
                  }}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 px-1.5 py-1.5 transition-all sm:min-h-[4.5rem] sm:gap-1.5 sm:px-3 sm:py-2 ${
                    formData.injuryType === value ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-brand-300'
                  }`}
                >
                  <Icon className="h-4 w-4 text-brand-600 sm:h-5 sm:w-5" />
                  <span className="text-center text-[12px] font-semibold leading-tight sm:text-[16px] sm:font-medium sm:leading-snug">{t(`intake.${labelKey}`)}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 'when': {
        const detectedDisplay = detectedLocation ? [detectedLocation.city, detectedLocation.county, detectedLocation.state].filter(Boolean).join(', ') : ''
        const countyOptions = formData.venue.state ? getCountiesForState(formData.venue.state) : []
        return (
          <div className="mx-auto w-full max-w-3xl space-y-5">
            <div className="space-y-3">
              <p className="text-center font-display text-[16px] font-semibold text-gray-900 sm:text-[19px]">{tx('when_heading')}</p>
              <p className="text-gray-500 text-center text-sm">{tx('when_helper')}</p>
              <div className={`grid grid-cols-2 gap-2 ${errors.incidentDate ? 'rounded-xl p-1.5 ring-1 ring-red-400' : ''}`}>
                {WHEN_OPTIONS.map(({ value, labelKey, getDate }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={formData.incidentDatePreset === value}
                    onClick={() => {
                      if (formData.incidentDatePreset === value) updateForm({ incidentDatePreset: '', incidentDate: '' })
                      else if (value === 'custom') updateForm({ incidentDatePreset: value })
                      else updateForm({ incidentDatePreset: value, incidentDate: getDate() })
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${
                      formData.incidentDatePreset === value ? 'border-brand-700 bg-brand-100 ring-2 ring-brand-200' : 'border-gray-200 hover:border-brand-300'
                    }`}
                  >
                    {t(`intake.${labelKey}`)}
                    {formData.incidentDatePreset === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
              {formData.incidentDatePreset === 'custom' && (
                <div className="pt-2">
                  <input type="date" value={customDate} onChange={e => { const val = e.target.value; setCustomDate(val); if (val) updateForm({ incidentDate: val }) }} className="input w-full" autoFocus />
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-center font-display text-[16px] font-semibold text-gray-900 sm:text-[19px]">{t('intake.where')}</p>
              <p className="text-gray-500 text-center text-sm">{t('intake.whereHelp')}</p>
            {detectedLocation && !locationAccepted && !formData.venue.state && (
              <div className="p-4 bg-brand-50 rounded-xl border border-brand-200">
                <p className="text-sm font-medium text-slate-900 mb-2">{t('intake.weDetectedLocation')} {detectedDisplay}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const county = sanitizeDetectedCounty(detectedLocation.state, detectedLocation.county)
                      updateForm({ venue: { state: detectedLocation.state, county, city: detectedLocation.city } })
                      setLocationAccepted(true)
                      setDetectedLocation(null)
                      if (!county) {
                        setErrors((current) => ({ ...current, county: t('intake.enterCounty') }))
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700"
                  >
                    {t('intake.useLocation')}
                  </button>
                  <button type="button" onClick={() => setDetectedLocation(null)} className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50">{t('intake.change')}</button>
                </div>
              </div>
            )}
            {(!detectedLocation || locationAccepted || formData.venue.state) && (
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><MapPin className="h-4 w-4 text-brand-600" /> {t('intake.state')}</label>
                  <select
                    value={formData.venue.state}
                    onChange={e => {
                      const state = e.target.value
                      updateVenue({
                        state,
                        county: formData.venue.state !== state ? '' : formData.venue.county,
                      })
                    }}
                    className={`input w-full ${errors.state ? 'border-red-500' : ''}`}
                  >
                    <option value="">{t('intake.selectState')}</option>
                    {US_STATES.map(s => (<option key={s.code} value={s.code}>{s.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><Building2 className="h-4 w-4 text-brand-600" /> {t('intake.county')}</label>
                  {countyOptions.length > 0 ? (
                    <select value={formData.venue.county} onChange={e => updateVenue({ county: e.target.value })} className={`input w-full ${errors.county ? 'border-red-500' : ''}`}>
                      <option value="">{t('intake.searchCounty')}</option>
                      {(countyOptions ?? []).map(c => (<option key={c} value={c}>{c}</option>))}
                    </select>
                  ) : (
                    <input type="text" value={formData.venue.county} onChange={e => updateVenue({ county: e.target.value })} className={`input w-full ${errors.county ? 'border-red-500' : ''}`} placeholder={tx('where_countyPlaceholder')} />
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><MapPin className="h-4 w-4 text-brand-600" /> {t('intake.city')}</label>
                  <input type="text" value={formData.venue.city} onChange={e => updateVenue({ city: e.target.value })} className="input w-full" placeholder={tx('where_cityPlaceholder')} />
                </div>
              </div>
            )}
            </div>
          </div>
        )
      }

      case 'narrative':
        return (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <p className="shrink-0 text-center font-display text-[16px] font-semibold text-gray-900 sm:text-[19px]">{tx('narrative_heading')}</p>
            <p className="shrink-0 text-center text-xs leading-snug text-gray-500">
              {tx('narrative_helper')}
            </p>
            <textarea
              value={formData.narrative}
              onChange={e => updateForm({ narrative: e.target.value })}
              placeholder={tx('narrative_placeholder')}
              rows={6}
              className="input w-full flex-1 resize-none py-3 text-base leading-relaxed !min-h-[10rem] md:!min-h-[12rem]"
            />
            <p className="shrink-0 rounded-lg border border-brand-100 bg-brand-50 px-2 py-1.5 text-center text-[11px] leading-snug text-brand-800">
              {tx('narrative_tip')}
            </p>

            <div className="mt-2 shrink-0 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div>
                <p className="font-display text-sm font-semibold text-slate-950">{tx('contact_heading')}</p>
                <p className="text-xs leading-5 text-gray-500">{tx('contact_helper')}</p>
              </div>
              <div>
                <label htmlFor="contact-email" className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Mail className="h-4 w-4 text-brand-600" aria-hidden /> {tx('contact_emailLabel')}
                </label>
                <input
                  id="contact-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={formData.contact.email}
                  onChange={e => updateForm({ contact: { ...formData.contact, email: e.target.value } })}
                  placeholder="you@example.com"
                  className={`input w-full ${errors.contactEmail ? 'border-red-500' : ''}`}
                />
              </div>
              <div>
                <label htmlFor="contact-phone" className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Phone className="h-4 w-4 text-brand-600" aria-hidden /> {tx('contact_phoneLabel')}
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={formData.contact.phone}
                  onChange={e => updateForm({ contact: { ...formData.contact, phone: e.target.value } })}
                  placeholder="(555) 555-0100"
                  className="input w-full"
                />
              </div>
            </div>
          </div>
        )

      case 'injury_severity':
        return (
          <div className="mx-auto w-full max-w-3xl space-y-5">
            <div className="space-y-3">
              <p className="text-center font-display text-[16px] font-semibold text-gray-900 sm:text-[19px]">{t('intake.injurySeverity')}</p>
              <div className="grid grid-cols-1 gap-2">
                {INJURY_SEVERITY_OPTIONS.map(({ value, labelKey }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={formData.injurySeverity === value}
                    onClick={() => updateForm({ injurySeverity: formData.injurySeverity === value ? '' : value })}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${
                      formData.injurySeverity === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'
                    }`}
                  >
                    {t(`intake.${labelKey}`)}
                    {formData.injurySeverity === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-center font-display text-[16px] font-semibold text-gray-900 sm:text-[19px]">{tx('treatment_heading')}</p>
              <p className="text-gray-500 text-center text-sm">{tx('treatment_helper')}</p>
              <div className="grid grid-cols-2 gap-2">
                {MEDICAL_TREATMENT_OPTIONS.map(({ value }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={formData.medicalTreatment.includes(value)}
                    onClick={() => toggleMedicalTreatment(value)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${
                      formData.medicalTreatment.includes(value) ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'
                    }`}
                  >
                    {getOptionLabel(MEDICAL_TREATMENT_OPTIONS, value)}
                    {formData.medicalTreatment.includes(value) && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
                {tx('treatment_tip')}
              </div>
            </div>
          </div>
        )

      case 'injury_details':
        const hasHeadInjury = formData.injuryDetails.bodyParts.includes('head_concussion')
        const hasShoulderInjury = formData.injuryDetails.bodyParts.includes('shoulder')
        const hasBackInjury = formData.injuryDetails.bodyParts.includes('lower_back')
        const hasInjectionTreatment = formData.medicalTreatment.includes('injections') || formData.injuryDetails.procedures.some(item => item !== 'none')
        const hasSurgeryTreatment = formData.medicalTreatment.includes('surgery') || formData.injuryDetails.futureTreatment.includes('surgery') || !!formData.injuryDetails.surgeryStatus
        const bodyPartDisplay: Record<string, { emoji?: string; label: string }> = {
          head_concussion: { emoji: '🧠', label: tx('bodyShort_head') },
          neck: { emoji: '🦴', label: tx('bodyShort_neck') },
          lower_back: { emoji: '🦴', label: tx('bodyShort_back') },
          shoulder: { emoji: '💪', label: tx('bodyShort_shoulder') },
          knee: { emoji: '🦵', label: tx('bodyShort_knee') },
          hand_wrist: { emoji: '✋', label: tx('bodyShort_hand') },
          hip: { emoji: '🦴', label: tx('bodyShort_hip') },
          other: { label: tx('optionOther') },
        }
        const keyLifestyleImpactOptions = LIFESTYLE_IMPACT_OPTIONS.filter((option) =>
          ['daily_pain', 'sleep_disruption', 'exercise_limitations'].includes(option.value)
        )
        // Only offer diagnoses that are plausible for the selected body parts (fracture is always plausible).
        const selectedBodyParts = formData.injuryDetails.bodyParts
        const relevantDiagnosisOptions = DIAGNOSIS_OPTIONS.filter(({ value }) => {
          if (value === 'tbi' || value === 'concussion') return hasHeadInjury
          if (value === 'herniation') return selectedBodyParts.includes('neck') || selectedBodyParts.includes('lower_back')
          return true
        })
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="font-display text-[16px] font-semibold text-gray-900 sm:text-[19px]">{tx('injuryDetails_heading')}</p>
              <p className="text-xs leading-5 text-gray-500">{tx('injuryDetails_helper')}</p>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <p className="font-display text-sm font-semibold text-slate-950">{tx('injuryDetails_whereInjured')}</p>
                <p className="mt-0.5 text-xs text-slate-600">{tx('injuryDetails_whereInjuredHelper')}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                {BODY_PART_OPTIONS.map(({ value, label }) => {
                  const selected = formData.injuryDetails.bodyParts.includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleInjuryDetail('bodyParts', value)}
                      className={`min-h-12 rounded-xl border px-3 py-2 text-left text-xs font-semibold leading-tight ${selected ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-sm' : 'border-slate-200 text-slate-700 hover:border-brand-300'}`}
                    >
                      {bodyPartDisplay[value]?.emoji && <span aria-hidden="true">{bodyPartDisplay[value].emoji} </span>}
                      {bodyPartDisplay[value]?.label || label}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-display text-sm font-semibold text-slate-950">{tx('injuryDetails_medicalTreatment')}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-600">{tx('injuryDetails_testingHelper')}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {IMAGING_OPTIONS.map(({ value, label }) => (
                  <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 ${formData.injuryDetails.imaging.includes(value) ? 'border-brand-300 bg-brand-50' : 'border-slate-200'}`}>
                    <input type="checkbox" checked={formData.injuryDetails.imaging.includes(value)} onChange={() => toggleInjuryDetail('imaging', value, true)} className="rounded border-gray-300" />
                    <span className="text-xs font-semibold text-slate-800">{label}</span>
                  </label>
                ))}
              </div>

              <p className="mt-4 font-display text-sm font-semibold text-slate-950">{tx('injuryDetails_diagnosesQuestion')}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-600">{tx('injuryDetails_diagnosesHelper')}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {relevantDiagnosisOptions.map(({ value, label }) => (
                  <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 ${formData.injuryDetails.diagnoses.includes(value) ? 'border-brand-300 bg-brand-50' : 'border-slate-200'}`}>
                    <input type="checkbox" checked={formData.injuryDetails.diagnoses.includes(value)} onChange={() => toggleInjuryDetail('diagnoses', value)} className="rounded border-gray-300" />
                    <span className="text-xs font-semibold text-slate-800">{label}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-display text-sm font-semibold text-slate-950">{tx('injuryDetails_lifeImpact')}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-600">{tx('injuryDetails_lifeImpactHelper')}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {keyLifestyleImpactOptions.map(({ value, label }) => (
                  <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 ${formData.injuryDetails.lifestyleImpact.includes(value) ? 'border-brand-300 bg-brand-50' : 'border-slate-200'}`}>
                    <input type="checkbox" checked={formData.injuryDetails.lifestyleImpact.includes(value)} onChange={() => toggleInjuryDetail('lifestyleImpact', value)} className="rounded border-gray-300" />
                    <span className="text-xs font-semibold text-slate-800">{label}</span>
                  </label>
                ))}
              </div>
            </section>

            {hasHeadInjury && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
                <p className="font-display text-sm font-semibold text-slate-950">{tx('injuryDetails_headSymptoms')}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {CONCUSSION_SYMPTOM_OPTIONS.map(({ value, label }) => (
                    <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 ${formData.injuryDetails.concussionSymptoms.includes(value) ? 'border-brand-300 bg-brand-50' : 'border-slate-200'}`}>
                      <input type="checkbox" checked={formData.injuryDetails.concussionSymptoms.includes(value)} onChange={() => toggleInjuryDetail('concussionSymptoms', value)} className="rounded border-gray-300" />
                      <span className="text-xs font-semibold text-slate-800">{label}</span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {hasShoulderInjury && (
              <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-950">{tx('injuryDetails_shoulderDetails')}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {SHOULDER_FINDING_OPTIONS.map(({ value, label }) => (
                    <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 ${formData.injuryDetails.shoulderFindings.includes(value) ? 'border-brand-300 bg-brand-50' : 'border-slate-200'}`}>
                      <input type="checkbox" checked={formData.injuryDetails.shoulderFindings.includes(value)} onChange={() => toggleInjuryDetail('shoulderFindings', value)} className="rounded border-gray-300" />
                      <span className="text-xs font-semibold text-slate-800">{label}</span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {hasBackInjury && (
              <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-950">{tx('injuryDetails_backDetails')}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {BACK_FINDING_OPTIONS.map(({ value, label }) => (
                    <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 ${formData.injuryDetails.backFindings.includes(value) ? 'border-brand-300 bg-brand-50' : 'border-slate-200'}`}>
                      <input type="checkbox" checked={formData.injuryDetails.backFindings.includes(value)} onChange={() => toggleInjuryDetail('backFindings', value)} className="rounded border-gray-300" />
                      <span className="text-xs font-semibold text-slate-800">{label}</span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer font-display text-sm font-semibold text-slate-950">{tx('injuryDetails_additionalInfo')}</summary>
              <div className="mt-4 space-y-4">
                <section>
                  <p className="font-display text-sm font-semibold text-slate-950">{tx('injuryDetails_priorQuestion')}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      { value: 'none', label: tx('optionNo') },
                      { value: 'similar', label: tx('optionYes') },
                      { value: 'not_sure', label: tx('optionNotSure') },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateForm({ injuryDetails: { ...formData.injuryDetails, priorInjury: formData.injuryDetails.priorInjury === value ? '' : value } })}
                        className={`rounded-lg border px-2 py-2 text-xs font-semibold ${formData.injuryDetails.priorInjury === value ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-slate-200 text-slate-700 hover:border-brand-300'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <p className="font-display text-sm font-semibold text-slate-950">{tx('injuryDetails_otherImpacts')}</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {LIFESTYLE_IMPACT_OPTIONS
                      .filter((option) => !['daily_pain', 'sleep_disruption', 'exercise_limitations'].includes(option.value))
                      .map(({ value, label }) => (
                        <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 ${formData.injuryDetails.lifestyleImpact.includes(value) ? 'border-brand-300 bg-brand-50' : 'border-slate-200'}`}>
                          <input type="checkbox" checked={formData.injuryDetails.lifestyleImpact.includes(value)} onChange={() => toggleInjuryDetail('lifestyleImpact', value)} className="rounded border-gray-300" />
                          <span className="text-xs font-semibold text-slate-800">{label}</span>
                        </label>
                      ))}
                  </div>
                </section>

                {hasInjectionTreatment && (
                  <section>
                    <p className="font-display text-sm font-semibold text-slate-950">{tx('injuryDetails_injectionsMore')}</p>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {PROCEDURE_OPTIONS.filter(option => option.value !== 'none').map(({ value, label }) => (
                        <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 ${formData.injuryDetails.procedures.includes(value) ? 'border-brand-300 bg-brand-50' : 'border-slate-200'}`}>
                          <input type="checkbox" checked={formData.injuryDetails.procedures.includes(value)} onChange={() => toggleInjuryDetail('procedures', value)} className="rounded border-gray-300" />
                          <span className="text-xs font-semibold text-slate-800">{label}</span>
                        </label>
                      ))}
                    </div>
                  </section>
                )}

                {hasSurgeryTreatment && (
                  <section>
                    <p className="font-display text-sm font-semibold text-slate-950">{tx('injuryDetails_surgeryDiscussed')}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {SURGERY_STATUS_OPTIONS.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateForm({ injuryDetails: { ...formData.injuryDetails, surgeryStatus: formData.injuryDetails.surgeryStatus === value ? '' : value } })}
                          className={`rounded-lg border px-2 py-2 text-xs font-semibold ${formData.injuryDetails.surgeryStatus === value ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-slate-200 text-slate-700 hover:border-brand-300'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

              </div>
            </details>
          </div>
        )

      case 'case_details': {
        const section1 = (() => {
        if (isVehicle) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.vehicle_crashQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {VEHICLE_CRASH_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('crashType', value) }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.crashType === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.crashType === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isSlipFall) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.slip_hazardQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {SLIP_HAZARD_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('hazardType', value) }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.hazardType === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.hazardType === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isMedmal) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.medmal_errorQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {MEDMAL_ERROR_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('errorType', value) }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.errorType === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.errorType === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isDogBite) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.dog_ownershipQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {DOG_OWNERSHIP_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('dogOwned', value) }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.dogOwned === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.dogOwned === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isProduct) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.product_typeQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {PRODUCT_TYPE_OPTIONS.map((option) => (
                  <button key={option.value} type="button" onClick={() => { setBranch('productType', option.value) }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.productType === option.value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {'labelKey' in option ? t(`intake.${option.labelKey}`) : option.label} {formData.branch.productType === option.value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isAssault) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.assault_typeQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {ASSAULT_TYPE_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('assaultType', value) }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.assaultType === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.assaultType === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isToxic) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.toxic_substanceQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {TOXIC_SUBSTANCE_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('substance', value) }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.substance === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.substance === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isOther) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.tellMore')}</p>
              <textarea value={formData.branch.otherDetails || ''} onChange={e => setBranch('otherDetails', e.target.value)} placeholder={t('intake.otherDetailsPlaceholder')} rows={3} className="input w-full resize-none" />
            </div>
          )
        }
        return null
        })()

        const section2 = (() => {
        if (isVehicle) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.vehicle_liabilityEvidence')}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-600">
                {tx('vehicle_evidenceHelper')}
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.policeReport} onChange={e => setBranch('policeReport', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.vehicle_policeReport')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.ticketIssued} onChange={e => setBranch('ticketIssued', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.vehicle_ticket')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.witnesses} onChange={e => setBranch('witnesses', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.vehicle_witnesses')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.photosVideo} onChange={e => setBranch('photosVideo', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{tx('vehicle_photos')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.videoEvidence} onChange={e => setBranch('videoEvidence', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{tx('vehicle_video')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.redLightViolation} onChange={e => setBranch('redLightViolation', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{tx('vehicle_redLight')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.duiOtherDriver} onChange={e => setBranch('duiOtherDriver', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{tx('vehicle_dui')}</span></label>
              </div>
            </div>
          )
        }
        if (isSlipFall) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.slip_propertyQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {SLIP_PROPERTY_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('propertyType', value) }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.propertyType === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.propertyType === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isMedmal) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.medmal_providerQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {MEDMAL_PROVIDER_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('providerType', value) }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.providerType === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.providerType === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isDogBite) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.dog_locationQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {DOG_LOCATION_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('biteLocation', value) }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.biteLocation === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.biteLocation === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isProduct) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.product_failureQuestion')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.productMalfunction} onChange={e => setBranch('productMalfunction', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.product_malfunction')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.productRecalled} onChange={e => setBranch('productRecalled', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.product_recalled')}</span></label>
              </div>
            </div>
          )
        }
        if (isAssault) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.assault_securityQuestion')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.securityPresent} onChange={e => setBranch('securityPresent', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.assault_securityPresent')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.poorLighting} onChange={e => setBranch('poorLighting', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.assault_poorLighting')}</span></label>
              </div>
            </div>
          )
        }
        if (isToxic) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.toxic_durationQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {EXPOSURE_DURATION_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('exposureDuration', value) }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.exposureDuration === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.exposureDuration === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        return null
        })()

        const section3 = (() => {
        if (isVehicle) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.vehicle_propertyDamage')}</p>
              <div className="grid grid-cols-2 gap-2">
                {PROPERTY_DAMAGE_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('propertyDamage', value) }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.propertyDamage === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.propertyDamage === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isSlipFall) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.slip_hazardAwareness')}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-600">
                {tx('slip_awarenessHelper')}
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.employeesKnew} onChange={e => setBranch('employeesKnew', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.slip_employeesKnew')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.warningSigns} onChange={e => setBranch('warningSigns', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.slip_warningSigns')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.hazardDuration} onChange={e => setBranch('hazardDuration', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.slip_hazardDuration')}</span></label>
              </div>
            </div>
          )
        }
        if (isMedmal) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.medmal_harmSeverity')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.additionalTreatment} onChange={e => setBranch('additionalTreatment', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.medmal_additionalTreatment')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.permanentInjury} onChange={e => setBranch('permanentInjury', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.medmal_permanentInjury')}</span></label>
              </div>
            </div>
          )
        }
        if (isDogBite) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.dog_priorAggressionQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {PRIOR_AGGRESSION_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('priorAggression', value) }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.priorAggression === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.priorAggression === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isProduct) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.product_injuryCauseQuestion')}</p>
              <textarea value={formData.branch.injuryCause || ''} onChange={e => setBranch('injuryCause', e.target.value)} placeholder={t('intake.product_injuryPlaceholder')} rows={3} className="input w-full resize-none" />
            </div>
          )
        }
        if (isAssault) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.assault_policeQuestion')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.policeCalled} onChange={e => setBranch('policeCalled', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.assault_policeCalled')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.arrested} onChange={e => setBranch('arrested', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.assault_arrested')}</span></label>
              </div>
            </div>
          )
        }
        if (isToxic) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.toxic_symptomsQuestion')}</p>
              <textarea value={formData.branch.symptoms || ''} onChange={e => setBranch('symptoms', e.target.value)} placeholder={t('intake.toxic_symptomsPlaceholder')} rows={3} className="input w-full resize-none" />
            </div>
          )
        }
        return null
        })()

        const section4 = (() => {
        if (isVehicle) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.vehicle_defendantQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {VEHICLE_DEFENDANT_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('defendantType', value) }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.defendantType === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.defendantType === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isSlipFall) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.slip_injuryImpact')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.hitHead} onChange={e => setBranch('hitHead', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.slip_hitHead')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.ambulance} onChange={e => setBranch('ambulance', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.slip_ambulance')}</span></label>
              </div>
            </div>
          )
        }
        if (isMedmal) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.medmal_evidence')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.hasMedicalRecords} onChange={e => setBranch('hasMedicalRecords', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.medmal_hasRecords')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.knowDoctorHospital} onChange={e => setBranch('knowDoctorHospital', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.medmal_knowProvider')}</span></label>
              </div>
            </div>
          )
        }
        if (isDogBite) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.dog_medicalQuestion')}</p>
              <div className="space-y-2">
                {DOG_MEDICAL_OPTIONS.map(({ value, labelKey }) => (
                  <label key={value} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={formData.branch.dogMedical?.includes(value)} onChange={e => { const arr = formData.branch.dogMedical || []; const next = e.target.checked ? [...arr, value] : arr.filter((x: string) => x !== value); setBranch('dogMedical', next) }} className="rounded border-gray-300" />
                    <span className="text-sm">{t(`intake.${labelKey}`)}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        }
        if (isProduct) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.product_evidenceQuestion')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.hasProduct} onChange={e => setBranch('hasProduct', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.product_hasProduct')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.hasPackaging} onChange={e => setBranch('hasPackaging', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.product_hasPackaging')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.hasReceipt} onChange={e => setBranch('hasReceipt', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.product_hasReceipt')}</span></label>
              </div>
            </div>
          )
        }
        if (isAssault) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.assault_propertyOwnerQuestion')}</p>
              <input type="text" value={formData.branch.propertyOwner || ''} onChange={e => setBranch('propertyOwner', e.target.value)} placeholder={t('intake.assault_propertyPlaceholder')} className="input w-full" />
            </div>
          )
        }
        if (isToxic) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.toxic_doctorQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {YES_NO_NOT_SURE_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" aria-pressed={formData.branch.doctorLinked === value} onClick={() => { setBranch('doctorLinked', value) }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.doctorLinked === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.doctorLinked === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        return null
        })()

        const cdBranch = formData.branch
        const sectionAnswered = [
          Boolean(
            cdBranch.crashType || cdBranch.hazardType || cdBranch.errorType || cdBranch.dogOwned ||
            cdBranch.productType || cdBranch.assaultType || cdBranch.substance || (cdBranch.otherDetails || '').trim()
          ),
          Boolean(
            cdBranch.policeReport || cdBranch.ticketIssued || cdBranch.witnesses || cdBranch.photosVideo ||
            cdBranch.videoEvidence || cdBranch.redLightViolation || cdBranch.duiOtherDriver ||
            cdBranch.propertyType || cdBranch.providerType || cdBranch.biteLocation ||
            cdBranch.productMalfunction || cdBranch.productRecalled || cdBranch.securityPresent ||
            cdBranch.poorLighting || cdBranch.exposureDuration
          ),
          Boolean(
            cdBranch.propertyDamage || cdBranch.employeesKnew || cdBranch.warningSigns || cdBranch.hazardDuration ||
            cdBranch.additionalTreatment || cdBranch.permanentInjury || cdBranch.priorAggression ||
            (cdBranch.injuryCause || '').trim() || cdBranch.policeCalled || cdBranch.arrested || (cdBranch.symptoms || '').trim()
          ),
          Boolean(
            cdBranch.defendantType || cdBranch.hitHead || cdBranch.ambulance || cdBranch.hasMedicalRecords ||
            cdBranch.knowDoctorHospital || (cdBranch.dogMedical || []).length || cdBranch.hasProduct ||
            cdBranch.hasPackaging || cdBranch.hasReceipt || (cdBranch.propertyOwner || '').trim() || cdBranch.doctorLinked
          ),
        ]
        const sectionEntries = [section1, section2, section3, section4]
          .map((node, index) => ({ node, answered: sectionAnswered[index] }))
          .filter((entry) => entry.node)
        const answeredCount = sectionEntries.filter((entry) => entry.answered).length
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50/70 px-3 py-2">
              <span className="font-display text-xs font-semibold text-brand-900">{tx('caseDetails_progressTitle')}</span>
              <span className="shrink-0 text-xs font-semibold text-brand-700">
                {tx('caseDetails_progressCount').replace('{answered}', String(answeredCount)).replace('{total}', String(sectionEntries.length))}
              </span>
            </div>
            {sectionEntries.map((entry, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {entry.node}
              </div>
            ))}
          </div>
        )
      }

      case 'evidence':
        {
          const sections = [
            {
              id: 'evidence',
              title: tx('evidence_sectionEvidence'),
              helper: tx('evidence_sectionEvidenceHelper'),
              items: [
                { category: 'photos', subcategory: 'injury_photos', title: tx('evidence_photos'), helper: tx('evidence_photosHelper'), button: t('intake.uploadPhotos'), icon: Camera },
                { category: 'video', subcategory: 'incident_video', title: tx('evidence_videos'), helper: tx('evidence_videosHelper'), button: tx('evidence_uploadVideos'), icon: Video },
                { category: 'police_report', subcategory: 'report', title: tx('evidence_policeReport'), helper: tx('evidence_policeReportHelper'), button: t('intake.uploadReport'), icon: Shield },
              ],
            },
            {
              id: 'medical',
              title: tx('evidence_sectionMedical'),
              helper: tx('evidence_sectionMedicalHelper'),
              items: [
                { category: 'bills', subcategory: 'medical_bill', title: tx('evidence_medicalBills'), helper: tx('evidence_medicalBillsHelper'), button: t('intake.uploadBills'), icon: FileText },
                { category: 'medical_records', subcategory: 'records', title: tx('evidence_medicalRecords'), helper: tx('evidence_medicalRecordsHelper'), button: t('intake.uploadRecords'), icon: FileText },
              ],
            },
            {
              id: 'insurance',
              title: tx('evidence_sectionInsurance'),
              helper: tx('evidence_sectionInsuranceHelper'),
              items: [
                { category: 'insurance_letters', subcategory: 'carrier_letters', title: tx('evidence_insuranceLetters'), helper: tx('evidence_insuranceLettersHelper'), button: tx('evidence_uploadInsuranceLetters'), icon: Mail },
              ],
            },
            {
              id: 'income_loss',
              title: tx('evidence_sectionIncome'),
              helper: tx('evidence_sectionIncomeHelper'),
              items: [
                { category: 'wage_verification', subcategory: 'income_loss', title: tx('evidence_wageVerification'), helper: tx('evidence_wageVerificationHelper'), button: tx('evidence_uploadWageVerification'), icon: DollarSign },
              ],
            },
          ]

          return (
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
              <div className="shrink-0 space-y-0.5 text-center">
                <p className="font-display text-[16px] font-semibold leading-snug text-gray-900 sm:text-[19px]">{tx('evidence_heading')}</p>
                <p className="text-sm leading-snug text-gray-500 md:text-base">
                  {tx('evidence_helper')}
                </p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                <section className="rounded-xl border border-brand-100 bg-brand-50/70 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-brand-950">{tx('evidence_uploadedTitle')}</p>
                    <p className="text-xs font-medium text-brand-700">{uploadedEvidenceCount} {tx('evidence_totalSuffix')}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {evidenceStatusItems.map((item) => {
                      const count = pendingEvidenceFiles[item.category]?.length || 0
                      return (
                        <span
                          key={item.category}
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            count > 0
                              ? 'bg-white text-emerald-700 ring-1 ring-emerald-200'
                              : 'bg-white/70 text-gray-500 ring-1 ring-gray-200'
                          }`}
                        >
                          {count > 0 ? '✓' : '○'} {item.label}{count > 0 ? ` (${count})` : ''}
                        </span>
                      )
                    })}
                  </div>
                </section>

                {sections.map((section) => {
                  const isOpen = openEvidenceSections[section.id]
                  const sectionCount = section.items.reduce((total, item) => total + (pendingEvidenceFiles[item.category]?.length || 0), 0)

                  return (
                    <section key={section.id} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/60">
                      <button
                        type="button"
                        onClick={() => setOpenEvidenceSections((prev) => ({ ...prev, [section.id]: !prev[section.id] }))}
                        className="flex w-full items-center justify-between gap-3 bg-white/80 px-3 py-2 text-left hover:bg-white"
                        aria-expanded={isOpen}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-base font-semibold leading-tight text-gray-950">{section.title}</p>
                            {sectionCount > 0 && (
                              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-800">
                                {sectionCount}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs leading-snug text-gray-500 md:text-sm">{section.helper}</p>
                        </div>
                        <ChevronDown className={`h-5 w-5 shrink-0 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
                      </button>

                      {isOpen && (
                        <div className="space-y-2 p-2">
                          {section.items.map((item) => {
                            const Icon = item.icon
                            return (
                              <div key={item.category} className="flex min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                                <div className="mb-0.5 flex items-center gap-1.5">
                                  <Icon className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                                  <h4 className="text-sm font-semibold leading-tight text-gray-900 md:text-base">{item.title}</h4>
                                </div>
                                <p className="mb-1 line-clamp-2 text-xs leading-snug text-gray-500 md:text-sm">
                                  {item.helper}
                                </p>
                                <InlineEvidenceUpload
                                  assessmentId={assessmentId || undefined}
                                  category={item.category}
                                  subcategory={item.subcategory}
                                  description={item.title}
                                  initialFiles={pendingEvidenceFiles[item.category] || []}
                                  compact
                                  tightChrome
                                  hideCameraButton
                                  alwaysShowUpload
                                  hideHeader
                                  uploadButtonLabel={item.button}
                                  onFilesUploaded={(f) => handleEvidenceFiles(item.category, f)}
                                />
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep('financial_impact')}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-base font-semibold leading-snug text-amber-900 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-100 md:text-lg"
              >
                {tx('evidence_continueWithout')}
              </button>
            </div>
          )
        }

      case 'financial_impact': {
        const icFinancial = formData.insuranceCoverage
        const cpFinancial = formData.casePosture || {}
        const hasIncomeImpact = cpFinancial.missedWork && cpFinancial.missedWork !== 'no'
        const medicalBillEstimate = MEDICAL_BILL_RANGE_OPTIONS.find((option) => option.value === icFinancial.medicalBillRange)?.estimate || 0
        const futureMedicalEstimate = FUTURE_MEDICAL_RANGE_OPTIONS.find((option) => option.value === icFinancial.futureMedicalRange)?.estimate || 0
        const completedFinancialFactors = [
          !!icFinancial.medicalBillRange,
          !!cpFinancial.missedWork,
          !!icFinancial.futureMedicalRange,
        ].filter(Boolean).length
        const financialProgressPercent = Math.min(100, Math.max(15, Math.round((completedFinancialFactors / 3) * 100)))
        const showCaseValueIncrease = medicalBillEstimate >= 30000 || futureMedicalEstimate >= 15000 || cpFinancial.lostWagesRange === 'over_10000'
        const medicalBillCards = MEDICAL_BILL_RANGE_OPTIONS
        const missingFinancialFactors = [
          !icFinancial.medicalBillRange ? tx('financial_missingBills') : null,
          !cpFinancial.missedWork ? tx('financial_missingWork') : null,
          !icFinancial.futureMedicalRange ? tx('financial_missingFutureCare') : null,
        ].filter(Boolean)
        return (
          <div className="space-y-3">
            <div className="text-center">
              <p className="font-display text-[16px] font-semibold text-gray-900 sm:text-[19px]">{tx('financial_heading')}</p>
              <p className="text-xs leading-5 text-gray-500">
                {tx('financial_helper')}
              </p>
            </div>

            <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-emerald-950 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold leading-tight">{tx('financial_confidenceTitle')}</p>
                <p className="text-xs font-bold">{financialProgressPercent}%</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-300" style={{ width: `${financialProgressPercent}%` }} />
              </div>
              {missingFinancialFactors.length > 0 ? (
                <p className="mt-2 text-xs leading-5 text-emerald-800">{tx('financial_need')}: {missingFinancialFactors.join(' • ')}</p>
              ) : (
                <p className="mt-2 text-xs leading-5 text-emerald-800">{tx('financial_completeNote')}</p>
              )}
            </section>

            <div className="grid gap-3 lg:grid-cols-2">
              <section className="order-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <p className="font-display text-sm font-semibold text-slate-950">{tx('financial_medicalCosts')}</p>
                  <p className="text-xs text-slate-600">{tx('financial_medicalCostsHelper')}</p>
                </div>

                <p className="mt-3 font-display text-sm font-semibold text-slate-950">{tx('financial_billsSoFar')}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {medicalBillCards.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={icFinancial.medicalBillRange === value}
                      onClick={() => updateForm({ insuranceCoverage: { ...icFinancial, medicalBillRange: icFinancial.medicalBillRange === value ? '' : value } })}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold ${icFinancial.medicalBillRange === value ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-sm' : 'border-slate-200 text-slate-700 hover:border-brand-300'}`}
                    >
                      <span aria-hidden="true" className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${icFinancial.medicalBillRange === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-transparent'}`}>✓</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {icFinancial.medicalBillRange === 'over_50000' && (
                  <div className="mt-2">
                    <label htmlFor="medical-bill-exact" className="text-xs font-semibold text-slate-700">{tx('financial_exactAmountLabel')}</label>
                    <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-brand-400">
                      <span aria-hidden="true" className="text-sm text-slate-500">$</span>
                      <input
                        id="medical-bill-exact"
                        inputMode="numeric"
                        placeholder={tx('financial_exactAmountPlaceholder')}
                        value={icFinancial.medicalBillExact}
                        onChange={(event) => updateForm({ insuranceCoverage: { ...icFinancial, medicalBillExact: event.target.value.replace(/[^\d.,]/g, '') } })}
                        className="w-full bg-transparent text-sm text-slate-900 outline-none"
                      />
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">{tx('financial_exactAmountHelper')}</p>
                  </div>
                )}

                {!!icFinancial.medicalBillRange && icFinancial.medicalBillRange !== 'not_sure' && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-700">{tx('financial_billsCompleteQuestion')}</p>
                    <div className="mt-2 flex gap-2">
                      {[{ value: 'yes' as const, label: tx('optionYes') }, { value: 'no' as const, label: tx('optionNo') }].map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={icFinancial.billsComplete === value}
                          onClick={() => updateForm({ insuranceCoverage: { ...icFinancial, billsComplete: icFinancial.billsComplete === value ? '' : value } })}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${icFinancial.billsComplete === value ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-slate-200 text-slate-700 hover:border-brand-300'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11px] leading-4 text-slate-500">{tx('financial_billsCompleteHelper')}</p>
                  </div>
                )}

                {showCaseValueIncrease && (
                  <p className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-800">↑ {tx('financial_valueSignal')}</p>
                )}

                <p className="mt-4 font-display text-sm font-semibold text-slate-950">{tx('financial_futureTreatment')}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {FUTURE_MEDICAL_RANGE_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={icFinancial.futureMedicalRange === value}
                      onClick={() => updateForm({ insuranceCoverage: { ...icFinancial, futureMedicalRange: icFinancial.futureMedicalRange === value ? '' : value } })}
                      className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold ${icFinancial.futureMedicalRange === value ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-slate-200 text-slate-700 hover:border-brand-300'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

              </section>

              <section className="order-2 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 shadow-sm">
                <div>
                  <p className="font-display text-sm font-semibold text-slate-950">{tx('financial_workImpact')}</p>
                  <p className="text-xs text-slate-600">{tx('financial_workImpactHelper')}</p>
                </div>
                <div className="mt-3 grid gap-2">
                  {MISSED_WORK_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={cpFinancial.missedWork === value}
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          casePosture: {
                            ...prev.casePosture,
                            missedWork: prev.casePosture.missedWork === value ? '' : value,
                            ...(value === 'no' ? { lostWagesRange: '', lostWagesEstimate: '' } : {})
                          }
                        }))
                      }}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold ${cpFinancial.missedWork === value ? 'border-brand-600 bg-white text-brand-900 shadow-sm' : 'border-slate-200 bg-white/80 text-slate-700 hover:border-brand-300'}`}
                    >
                      <span aria-hidden="true" className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${cpFinancial.missedWork === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-transparent'}`}>✓</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {hasIncomeImpact && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="font-display text-sm font-semibold text-slate-950">{tx('financial_lostIncome')}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {WAGE_LOSS_RANGE_OPTIONS.map(({ value, label, estimate }) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={cpFinancial.lostWagesRange === value}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              casePosture: {
                                ...prev.casePosture,
                                lostWagesRange: prev.casePosture.lostWagesRange === value ? '' : value,
                                lostWagesEstimate: prev.casePosture.lostWagesRange === value ? '' : estimate
                              }
                            }))
                          }}
                          className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold ${cpFinancial.lostWagesRange === value ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-slate-200 text-slate-700 hover:border-brand-300'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </section>
            </div>
          </div>
        )
      }

      case 'legal_status': {
        const icLegal = formData.insuranceCoverage
        const cpLegal = formData.casePosture || {}
        const insurerContactValue =
          cpLegal.settlementOfferStatus === 'yes'
            ? 'offer'
            : cpLegal.insuranceContact === 'yes'
              ? 'contact_only'
              : cpLegal.insuranceContact === 'no'
                ? 'no'
                : ''
        const insurerContactOptions = [
          { value: 'no', label: tx('optionNo') },
          { value: 'contact_only', label: tx('legal_contactNoOffer') },
          { value: 'offer', label: tx('legal_contactWithOffer') },
        ]
        const setInsurerContact = (value: string) => {
          const isToggleOff = insurerContactValue === value
          setFormData(prev => ({
            ...prev,
            casePosture: {
              ...prev.casePosture,
              insuranceContact: isToggleOff ? '' : value === 'no' ? 'no' : 'yes',
              settlementOfferStatus: isToggleOff ? '' : value === 'offer' ? 'yes' : 'no',
              ...(isToggleOff || value !== 'offer' ? { settlementOffer: '' } : {})
            }
          }))
        }
        const liabilityOptionsForClaim = FAULT_BELIEF_OPTIONS.map((option) => {
          if (option.value !== 'other_party') return option
          const label = isVehicle
            ? tx('fault_otherDriver')
            : isSlipFall
              ? tx('fault_propertyOwner')
              : isMedmal
                ? tx('fault_provider')
                : tx('fault_otherPartyGeneric')
          return { ...option, label }
        })
        return (
          <div className="space-y-3">
            <div className="text-center">
              <p className="font-display text-[16px] font-semibold text-gray-900 sm:text-[19px]">{tx('legal_heading')}</p>
              <p className="text-xs leading-5 text-gray-500">
                {tx('legal_helper')}
              </p>
            </div>

            <div className="grid gap-3">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="font-display text-sm font-semibold text-slate-950">{tx('legal_caseReview')}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{tx('legal_caseReviewHelper')}</p>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="font-display text-sm font-semibold text-slate-950">{tx('legal_responsibleQuestion')}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {liabilityOptionsForClaim.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={cpLegal.faultBelief === value}
                          onClick={() => setCasePostureField('faultBelief', value)}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${cpLegal.faultBelief === value ? 'border-brand-600 bg-white text-brand-900 shadow-sm' : 'border-slate-200 bg-white/80 text-slate-700 hover:border-brand-300'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <p className="mt-4 font-display text-sm font-semibold text-slate-950">{tx('legal_partialFaultQuestion')}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[
                        { value: 'no', label: tx('optionNo') },
                        { value: 'possibly', label: tx('optionPossibly') },
                        { value: 'yes', label: tx('optionYes') },
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={cpLegal.comparativeFault === value}
                          onClick={() => setCasePostureField('comparativeFault', value)}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${cpLegal.comparativeFault === value ? 'border-brand-600 bg-white text-brand-900 shadow-sm' : 'border-slate-200 bg-white/80 text-slate-700 hover:border-brand-300'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="font-display text-sm font-semibold text-slate-950">{tx('legal_insuranceStatus')}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{tx('legal_insurerContactQuestion')}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {insurerContactOptions.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={insurerContactValue === value}
                          onClick={() => setInsurerContact(value)}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${insurerContactValue === value ? 'border-brand-600 bg-white text-brand-900 shadow-sm' : 'border-slate-200 bg-white/80 text-slate-700 hover:border-brand-300'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {insurerContactValue === 'offer' && (
                      <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/50 p-2">
                        <p className="font-display text-xs font-semibold text-slate-950">{tx('legal_offerAmountQuestion')}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {SETTLEMENT_OFFER_OPTIONS.filter((option) => option.value !== 'no').map(({ value, label }) => (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={cpLegal.settlementOffer === value}
                              onClick={() => setCasePostureField('settlementOffer', value)}
                              className={`rounded-lg border px-2 py-2 text-xs font-semibold ${cpLegal.settlementOffer === value ? 'border-brand-600 bg-white text-brand-900 shadow-sm' : 'border-slate-200 bg-white/80 text-slate-700 hover:border-brand-300'}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="mt-4 font-display text-sm font-semibold text-slate-950">{tx('legal_attorneyQuestion')}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {ATTORNEY_STATUS_OPTIONS.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={cpLegal.attorneyStatus === value}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              casePosture: {
                                ...prev.casePosture,
                                attorneyStatus: prev.casePosture.attorneyStatus === value ? '' : value,
                                ...(value !== 'hired' ? { attorneyName: '', secondOpinionInterest: '' } : {})
                              }
                            }))
                          }}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${cpLegal.attorneyStatus === value ? 'border-brand-600 bg-white text-brand-900 shadow-sm' : 'border-slate-200 bg-white/80 text-slate-700 hover:border-brand-300'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <p className="mt-4 font-display text-sm font-semibold text-slate-950">{tx('legal_acceptedQuestion')}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[
                        { value: 'no', label: tx('optionNo') },
                        { value: 'yes', label: tx('optionYes') },
                        { value: 'not_sure', label: tx('optionNotSure') },
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={cpLegal.acceptedSettlement === value}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              casePosture: {
                                ...prev.casePosture,
                                acceptedSettlement: prev.casePosture.acceptedSettlement === value ? '' : value,
                                ...(value !== 'yes' ? { acceptedSettlementAmount: '' } : {})
                              }
                            }))
                          }}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${cpLegal.acceptedSettlement === value ? 'border-brand-600 bg-white text-brand-900 shadow-sm' : 'border-slate-200 bg-white/80 text-slate-700 hover:border-brand-300'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {cpLegal.acceptedSettlement === 'yes' && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                        <p className="text-sm font-semibold">{tx('legal_settledTitle')}</p>
                        <p className="mt-1 text-xs leading-5">⚠ {tx('legal_settledWarning')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <summary className="cursor-pointer font-display text-sm font-semibold text-slate-950">
                  {tx('legal_insuranceDetails')}
                </summary>
                <p className="mt-2 text-xs leading-5 text-slate-500">{tx('legal_vehicleInsuranceHelper')}</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="font-display text-sm font-semibold text-slate-950">{tx('legal_coverageLimitsQuestion')}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {DEFENDANT_COVERAGE_OPTIONS.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={icLegal.defendantCoverageLimits === value}
                          onClick={() => updateForm({ insuranceCoverage: { ...icLegal, defendantCoverageLimits: icLegal.defendantCoverageLimits === value ? '' : value } })}
                          className={`rounded-lg border px-2 py-2 text-xs font-semibold ${icLegal.defendantCoverageLimits === value ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-slate-200 text-slate-700 hover:border-brand-300'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isVehicle && (
                    <div>
                      <p className="font-display text-sm font-semibold text-slate-950">{tx('legal_umUimQuestion')}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{tx('legal_umUimHelper')}</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {UM_UIM_OPTIONS.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={icLegal.umUimCoverage === value}
                            onClick={() => updateForm({ insuranceCoverage: { ...icLegal, umUimCoverage: icLegal.umUimCoverage === value ? '' : value } })}
                            className={`rounded-lg border px-2 py-2 text-xs font-semibold ${icLegal.umUimCoverage === value ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-slate-200 text-slate-700 hover:border-brand-300'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </div>
          </div>
        )
      }

      case 'review':
        const preliminaryInsights = getPreliminaryInsights()
        const estimateConfidence = getEstimateConfidence()
        return (
          <div className="space-y-3">
            <div className="text-center">
              <p className="font-display text-[16px] font-semibold text-gray-900 sm:text-[19px]">{tx('review_heading')}</p>
              <p className="text-xs text-gray-500">{tx('review_helper')}</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{tx('review_observations')}</p>
                <ul className="mt-3 grid gap-2 text-sm text-brand-950 sm:grid-cols-2">
                  {preliminaryInsights.map((insight) => (
                    <li key={insight} className="flex gap-2 rounded-xl bg-white/80 px-3 py-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tx('review_confidence')}</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{tx(`confidence_${estimateConfidence}`)}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{tx('review_confidenceHelper')}</p>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {getReviewItems().map(item => (
                <div key={item.title} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-gray-900">{item.value}</p>
                      <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-gray-500">{item.helper}</p>
                    </div>
                    <button type="button" onClick={() => editReviewStep(item.step)} className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-medium text-brand-600 ring-1 ring-brand-100 hover:text-brand-700">
                      {tx('review_edit')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              {tx('review_ready')}
            </div>
          </div>
        )

      case 'consent':
        const consents = formData.consents || { tos: false, privacy: false, ml_use: false }
        {
          const previewMedicalBillEstimate = MEDICAL_BILL_RANGE_OPTIONS.find(option => option.value === formData.insuranceCoverage.medicalBillRange)?.estimate || 0
          const previewFutureMedicalEstimate = FUTURE_MEDICAL_RANGE_OPTIONS.find(option => option.value === formData.insuranceCoverage.futureMedicalRange)?.estimate || 0
          const previewWageLossEstimate = Number(String(formData.casePosture.lostWagesEstimate || '').replace(/[$,]/g, '')) || 0
          const previewKnownValue = previewMedicalBillEstimate + previewFutureMedicalEstimate + previewWageLossEstimate
          const previewLow = previewKnownValue > 0 ? Math.max(5000, Math.round(previewKnownValue * 0.8)) : 0
          const previewHigh = previewKnownValue > 0 ? Math.max(15000, Math.round(previewKnownValue * 2.4)) : 0
          const previewSettlementRange = previewKnownValue > 0 ? `$${previewLow.toLocaleString()} - $${previewHigh.toLocaleString()}` : tx('preliminaryEstimate')
          const previewConfidence = getEstimateConfidence()
          const previewCaseStrength = previewConfidence === 'high' ? tx('strength_strong') : previewConfidence === 'moderate' ? tx('strength_moderate') : tx('strength_developing')
          const previewAttorneyInterest =
            formData.casePosture.acceptedSettlement === 'yes'
              ? tx('interest_limited')
              : formData.casePosture.attorneyStatus === 'no' && (previewMedicalBillEstimate >= 7500 || previewFutureMedicalEstimate > 0 || previewWageLossEstimate > 0)
                ? tx('interest_high')
                : previewConfidence === 'high'
                  ? tx('interest_high')
                  : tx('interest_developing')
        return (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <div className="space-y-4">
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-950">
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">✓ {tx('consent_intakeComplete')}</p>
                <p className="mt-1 font-display text-[16px] font-semibold sm:text-[19px]">{tx('consent_analyzed')}</p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">{tx('consent_reportReady')}</p>
              </section>

              <section className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">{tx('consent_preparing')}</p>
                <ul className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                  {[tx('consent_item1'), tx('consent_item2'), tx('consent_item3'), tx('consent_item4'), tx('consent_item5')].map((item) => (
                    <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 flex-shrink-0 text-green-600" /> {item}</li>
                  ))}
                </ul>

                <div className="mt-4 rounded-xl border border-white/80 bg-white/90 p-3">
                  <p className="font-display text-sm font-semibold text-gray-950">{tx('consent_willEstimate')}</p>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-lg bg-brand-50 px-3 py-2"><span className="block text-xs font-semibold uppercase tracking-wide text-brand-700">{tx('consent_caseStrength')}</span><strong>{previewCaseStrength}</strong></div>
                    <div className="rounded-lg bg-brand-50 px-3 py-2"><span className="block text-xs font-semibold uppercase tracking-wide text-brand-700">{tx('consent_settlementRange')}</span><strong>{previewSettlementRange}</strong></div>
                    <div className="rounded-lg bg-brand-50 px-3 py-2"><span className="block text-xs font-semibold uppercase tracking-wide text-brand-700">{tx('consent_attorneyInterest')}</span><strong>{previewAttorneyInterest}</strong></div>
                    <div className="rounded-lg bg-brand-50 px-3 py-2"><span className="block text-xs font-semibold uppercase tracking-wide text-brand-700">{tx('consent_confidence')}</span><strong>{tx(`confidence_${previewConfidence}`)}</strong></div>
                  </div>
                </div>
              </section>

              <section className={`rounded-2xl border ${solPreviewTone} p-4`}>
                <p className="text-sm font-semibold">{tx('consent_deadlineReminder')}</p>
                <p className="mt-1 text-sm leading-6">{solPreviewMessage}</p>
                {incidentDateIsApproximate && solPreview?.expiresAt && (
                  <p className="mt-1 text-xs leading-5">
                    {tx('consent_approxDate')}
                  </p>
                )}
              </section>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:self-start">
              <p className="text-base font-semibold text-gray-950">{tx('consent_beforeViewing')}</p>
              <p className="mt-1 text-sm leading-6 text-gray-500">{tx('consent_confirmHelper')}</p>
              <div className="mt-4 space-y-3">
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-all ${consents.tos && consents.privacy ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:border-brand-200'}`}>
                  <input type="checkbox" checked={consents.tos && consents.privacy} onChange={e => { const checked = e.target.checked; updateForm({ consents: { ...consents, tos: checked, privacy: checked } }) }} className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-brand-600" />
                  <span className="text-sm font-medium leading-6 text-gray-800">{tx('consent_agreeTerms')}</span>
                </label>
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-all ${consents.ml_use ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:border-brand-200'}`}>
                  <input type="checkbox" checked={consents.ml_use} onChange={e => updateForm({ consents: { ...consents, ml_use: e.target.checked } })} className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-brand-600" />
                  <span className="text-sm font-medium leading-6 text-gray-800">{tx('consent_agreeAi')}</span>
                </label>
              </div>
              <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">{tx('consent_privacySecure')}</p>
            </div>
            {uploadFailures.length > 0 && assessmentId && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 lg:col-span-2">
                <p className="text-sm font-semibold">
                  {tx(uploadFailures.length === 1 ? 'uploadFailed_one' : 'uploadFailed_many').replace('{count}', String(uploadFailures.length))}
                </p>
                <p className="mt-1 text-xs leading-5">{uploadFailures.join(', ')}</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={retryFailedUploads}
                    disabled={loading}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {loading ? tx('consent_retrying') : tx('consent_retryUpload')}
                  </button>
                  <button
                    type="button"
                    onClick={() => goToResults(assessmentId)}
                    disabled={loading}
                    className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                  >
                    {tx('consent_continueWithoutDocs')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
        }

      default:
        return null
    }
  }

  const stepTitles: Record<string, string> = {
    injury_type: t('intake.stepTitles_injury_type'),
    when: tx('stepTitles_when_where'),
    narrative: t('intake.stepTitles_narrative'),
    injury_severity: tx('stepTitles_injuries_treatment'),
    injury_details: tx('stepTitles_injury_details'),
    case_details: t('intake.stepTitles_branch_7'),
    evidence: tx('stepTitles_evidence'),
    financial_impact: tx('stepTitles_financial_impact'),
    legal_status: tx('stepTitles_legal_status'),
    review: tx('stepTitles_review'),
    consent: t('intake.stepTitles_consent')
  }

  const isFirstStep = currentStep === 'injury_type'
  const autoAdvanceSteps = currentStep === 'injury_type'
  const isRevisitingAnsweredStep =
    currentStepIndex >= 0 &&
    currentStepIndex < furthestReachedStepIndex &&
    hasSavedAnswerForStep(currentStep)
  const showTapHint = autoAdvanceSteps && !isRevisitingAnsweredStep
  const casePostureFit = currentStep === 'financial_impact' || currentStep === 'legal_status'
  const injuryDetailsFit = currentStep === 'injury_details'
  const reviewFit = currentStep === 'review'
  const showReassurance = currentStep !== 'consent' && !casePostureFit && !injuryDetailsFit && !isFirstStep
  const evidenceFit = currentStep === 'evidence'
  const denseStepFit = reviewFit
  const savedAnswerHintExcludedSteps: Step[] = ['narrative', 'evidence', 'review', 'consent']
  const showSavedAnswerHint =
    isRevisitingAnsweredStep &&
    !savedAnswerHintExcludedSteps.includes(currentStep) &&
    hasSavedAnswerForStep(currentStep)
  /**
   * The white panel hugs its content, but may shrink (and scroll internally) when content
   * exceeds the leftover viewport height — so the Back/Next bar always stays visible.
   */
  const previewIncidentDate = getIncidentDate()
  const shouldShowSolPreview = !!(previewIncidentDate || formData.incidentDatePreset) && !casePostureFit && currentStep !== 'consent'
  const solPreviewTone = solPreview?.status === 'critical' || solPreview?.status === 'expired'
    ? 'bg-red-50 border-red-200 text-red-800'
    : solPreview?.status === 'warning'
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : solPreview?.status
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : 'bg-slate-50 border-slate-200 text-slate-700'
  const solPreviewMessage = solPreview?.expiresAt
    ? `${incidentDateIsApproximate ? tx('sol_approxDeadline') : tx('sol_estimatedDeadline')}: ${new Date(solPreview.expiresAt).toLocaleDateString()}`
    : formData.venue.state
      ? solPreviewError || tx('sol_noDeadline')
      : tx('sol_selectState')
  const showExactDatePrompt = incidentDateIsApproximate && !!solPreview?.expiresAt
  const promptForExactDate = () => {
    updateForm({ incidentDatePreset: 'custom' })
    setCurrentStep('when')
  }
  const evidenceStatusItems = [
    { category: 'photos', label: tx('evidence_photos'), weight: 10 },
    { category: 'video', label: tx('evidence_videos'), weight: 0 },
    { category: 'police_report', label: tx('evidence_policeReport'), weight: 15 },
    { category: 'bills', label: tx('evidence_medicalBills'), weight: 15 },
    { category: 'medical_records', label: tx('evidence_medicalRecords'), weight: 20 },
    { category: 'insurance_letters', label: tx('evidence_insuranceLetters'), weight: 0 },
    { category: 'wage_verification', label: tx('evidence_wageVerification'), weight: 0 },
  ]
  const evidenceCompletenessScore = Math.min(
    100,
    evidenceStatusItems.reduce((score, item) => {
      const count = pendingEvidenceFiles[item.category]?.length || 0
      return count > 0 ? score + item.weight : score
    }, 0),
  )
  const evidenceCompletenessDrivers = evidenceStatusItems.filter((item) => item.weight > 0)
  const hasInjuryProcedureSignal =
    formData.medicalTreatment.includes('injections') ||
    formData.medicalTreatment.includes('surgery') ||
    formData.injuryDetails.procedures.some((item) => item !== 'none') ||
    !!formData.injuryDetails.surgeryStatus
  const injuryConfidenceSignals = [
    formData.injuryDetails.bodyParts.length > 0,
    formData.injuryDetails.imaging.length > 0 && !formData.injuryDetails.imaging.includes('none'),
    formData.injuryDetails.diagnoses.length > 0,
    hasInjuryProcedureSignal,
    !!formData.casePosture.missedWork && formData.casePosture.missedWork !== 'no',
    formData.injuryDetails.lifestyleImpact.length > 0,
    formData.injuryDetails.concussionSymptoms.length > 0 ||
      formData.injuryDetails.shoulderFindings.length > 0 ||
      formData.injuryDetails.backFindings.length > 0,
  ].filter(Boolean).length
  const injuryConfidencePercent = Math.min(100, Math.max(20, 20 + injuryConfidenceSignals * 10))
  const liabilitySignalLabel =
    formData.casePosture.faultBelief === 'other_party' || formData.branch.policeReport || formData.branch.ticketIssued
      ? 'strong'
      : formData.casePosture.faultBelief
        ? 'developing'
        : 'unknown'
  const injurySeveritySignalLabel =
    hasInjuryProcedureSignal || formData.injuryDetails.diagnoses.length > 0
      ? 'strong'
      : formData.injuryDetails.imaging.length > 0 || formData.medicalTreatment.length > 0
        ? 'moderate'
        : 'early'
  const documentationSignalLabel = injuryConfidencePercent >= 70 ? 'strong' : injuryConfidencePercent >= 40 ? 'moderate' : 'early'

  return (
    <div className={`mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl flex-col overflow-visible px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-4 md:h-[calc(100dvh-7.5rem)] md:min-h-0 md:overflow-hidden md:px-8 md:py-3 ${isFirstStep ? 'py-1' : 'py-1.5 sm:py-2'}`}>
      <div className="mb-1 shrink-0" aria-busy={loading}>
        <p className={`mb-0.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700 dark:text-brand-300 md:text-sm ${isFirstStep ? 'hidden sm:block' : ''}`}>
          {t('intake.timePromise')}
        </p>
        <h1 className={`text-center font-display font-bold leading-tight text-slate-900 dark:text-slate-50 md:text-2xl ${isFirstStep ? 'text-lg sm:text-xl' : 'text-lg sm:text-xl'}`}>
          {isFirstStep ? t('intake.startHeadline') : stepTitles[currentStep] || visibleSteps[currentStepIndex]?.title}
        </h1>
        {isFirstStep && (
          <p className="mx-auto mt-1 hidden max-w-2xl text-center text-xs leading-5 text-slate-600 dark:text-slate-300 sm:block sm:text-sm sm:leading-6 md:text-base md:leading-7">
            {t('intake.startHelper')}
          </p>
        )}
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums sm:text-sm">
          <span>
            {t('intake.step')} {currentStepIndex + 1} {t('intake.of')} {visibleSteps.length}
          </span>
          <span>
            {currentStepIndex + 1 < visibleSteps.length
              ? `• ${t('intake.progressTime')}`
              : `• ${t('intake.almostDone')}`}
          </span>
        </div>
        <div
          className="mt-2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPercent)}
          aria-label={tx('progress_ariaLabel')}
        >
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-accent-500 transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <p className="sr-only">{Math.round(progressPercent)} {tx('progress_percentComplete')}</p>
      </div>

      {draftRestored && (
        <div className="mb-1 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs leading-5 text-sky-900 sm:px-4 sm:py-2 sm:text-sm">
          <span><span className="font-semibold">{tx('draft_welcomeBack')}</span> {tx('draft_savedProgress')}</span>
          <span className="flex shrink-0 items-center gap-3">
            <button type="button" onClick={discardDraftAndRestart} className="font-semibold underline underline-offset-2 hover:opacity-80">
              {tx('draft_startOver')}
            </button>
            <button type="button" onClick={() => setDraftRestored(false)} aria-label={tx('draft_dismiss')} className="rounded-full px-1 text-sky-700 hover:text-sky-900">
              ✕
            </button>
          </span>
        </div>
      )}

      {showReassurance && !evidenceFit && Object.keys(errors).length === 0 && (
        <div
          className={`mb-1 shrink-0 rounded-xl border border-brand-100 bg-brand-50 text-brand-900 ${
            evidenceFit ? 'px-3 py-1.5 text-xs leading-snug' : 'px-3 py-1.5 text-xs leading-5 sm:px-4 sm:py-2 sm:text-sm sm:leading-6'
          }`}
        >
          {isFirstStep ? t('intake.skipReassurance') : t('intake.answerReassurance')}
        </div>
      )}

      {showSavedAnswerHint && Object.keys(errors).length === 0 && (
        <div className="mb-1 shrink-0 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs leading-5 text-emerald-900 sm:px-4 sm:text-sm">
          <span className="font-semibold">✓ {tx('savedAnswer_title')}</span> {tx('savedAnswer_hint')}
        </div>
      )}

      {shouldShowSolPreview && (
        <div className={`mb-1 shrink-0 rounded-lg border ${solPreviewTone} px-3 py-1.5 sm:px-4`}>
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-xs leading-5 sm:text-sm">
              <span className="font-semibold">{tx('sol_earlyCheck')}:</span> {solPreviewMessage}
              {solPreview?.daysRemaining != null && (
                <> · {tx(Math.max(0, solPreview.daysRemaining) === 1 ? 'sol_dayRemaining' : 'sol_daysRemaining').replace('{days}', String(Math.max(0, solPreview.daysRemaining)))}</>
              )}
              {showExactDatePrompt && currentStep !== 'when' && (
                <>
                  {' '}· {tx('sol_approxNote')}{' '}
                  <button type="button" onClick={promptForExactDate} className="font-semibold underline underline-offset-2 hover:opacity-80">
                    {tx('sol_enterExactDate')}
                  </button>{' '}
                  {tx('sol_forAccuracy')}
                </>
              )}
            </p>
            {solPreview?.status && (
              <span className="inline-flex shrink-0 rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-semibold uppercase">
                {['safe', 'warning', 'critical'].includes(String(solPreview.status)) ? tx(`solStatus_${solPreview.status}`) : String(solPreview.status).replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      )}

      {evidenceFit && (
        <div className="mb-1 shrink-0 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-950">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold leading-tight sm:text-base">{tx('evidence_completeness')}: {evidenceCompletenessScore}%</p>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">{tx('evidence_docsHelpAccuracy')}</p>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-emerald-100">
            <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-300" style={{ width: `${evidenceCompletenessScore}%` }} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {evidenceCompletenessDrivers.map((item) => {
              const uploaded = (pendingEvidenceFiles[item.category]?.length || 0) > 0
              return (
                <span
                  key={item.category}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    uploaded ? 'bg-white text-emerald-800 ring-1 ring-emerald-200' : 'bg-emerald-100/70 text-emerald-700'
                  }`}
                >
                  +{item.weight}% {item.label}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {injuryDetailsFit && (
        <div className="mb-1 shrink-0 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-brand-950">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold leading-tight sm:text-sm">{tx('injuryStrength_title')}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700">{tx('consent_confidence')} {injuryConfidencePercent}%</p>
          </div>
          <div className="mt-1.5 grid gap-1 text-[11px] sm:grid-cols-3">
            <span className="rounded-lg bg-white/80 px-2 py-1 font-medium text-slate-700">{tx('signal_liability')}: <strong>{tx(`signal_${liabilitySignalLabel}`)}</strong></span>
            <span className="rounded-lg bg-white/80 px-2 py-1 font-medium text-slate-700">{tx('signal_severity')}: <strong>{tx(`signal_${injurySeveritySignalLabel}`)}</strong></span>
            <span className="rounded-lg bg-white/80 px-2 py-1 font-medium text-slate-700">{tx('signal_documentation')}: <strong>{tx(`signal_${documentationSignalLabel}`)}</strong></span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300" style={{ width: `${injuryConfidencePercent}%` }} />
          </div>
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div
          ref={errorSummaryRef}
          role="alert"
          aria-live="assertive"
          className="mb-1 flex shrink-0 items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium leading-snug text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{Object.values(errors).filter(Boolean).join(' · ')}</span>
        </div>
      )}

      <div
        className={`mb-1 flex flex-col overflow-visible rounded-2xl border border-slate-200/90 bg-white shadow-card transition-shadow hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-900/80 motion-reduce:hover:shadow-card md:overflow-hidden md:rounded-3xl ${denseStepFit ? 'p-2.5 md:p-4' : casePostureFit ? 'p-3 sm:p-4 md:p-5' : 'p-3 sm:p-4 md:p-6'} ${denseStepFit ? 'text-sm md:text-base' : 'text-base'} ${
          denseStepFit
            ? "[&_button]:min-h-9 [&_button]:py-2 [&_button]:text-xs [&_button]:leading-tight md:[&_button]:min-h-10 md:[&_button]:text-sm [&_input:not([type='checkbox'])]:min-h-10 [&_input:not([type='checkbox'])]:text-sm [&_select]:min-h-10 [&_select]:text-sm [&_p.text-lg]:text-sm [&_p.text-sm]:text-xs [&_span.text-sm]:text-xs [&_textarea]:min-h-[3rem] [&_textarea]:py-2 [&_textarea]:text-sm"
            : casePostureFit
              ? "[&_button]:min-h-10 [&_button]:py-2 [&_button]:text-sm [&_button]:leading-snug md:[&_button]:min-h-11 [&_input:not([type='checkbox'])]:min-h-11 [&_input:not([type='checkbox'])]:text-base [&_label]:text-sm [&_p.text-sm]:text-[15px] [&_p.text-xs]:text-[13px] [&_select]:min-h-11 [&_select]:text-base [&_textarea]:min-h-[3.5rem] [&_textarea]:py-2 [&_textarea]:text-sm"
              : "[&_button]:min-h-14 [&_button]:leading-snug [&_button]:text-base md:[&_button]:text-lg [&_input:not([type='checkbox'])]:min-h-12 [&_input:not([type='checkbox'])]:text-lg [&_label]:text-base [&_p.text-lg]:text-xl [&_p.text-sm]:text-base [&_p.text-xs]:text-sm [&_select]:min-h-12 [&_select]:text-lg [&_span.text-sm]:text-base [&_span.text-xs]:text-sm [&_textarea]:min-h-[4.75rem] [&_textarea]:py-2 [&_textarea]:text-base [&_textarea]:leading-snug"
        } min-h-0`}
      >
        <div ref={stepScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch]">
          {renderStep()}
        </div>
      </div>

      <p className={`mb-1 hidden shrink-0 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:block md:text-sm ${isFirstStep ? 'sm:hidden md:block' : ''}`}>
        {t('intake.privacyNote')}
      </p>

      <div className={`z-20 shrink-0 rounded-xl border border-slate-200/80 bg-white/95 p-1.5 pb-[max(0.375rem,calc(0.375rem+env(safe-area-inset-bottom)))] shadow-lg shadow-slate-200/70 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 sm:rounded-2xl ${isFirstStep ? 'hidden sm:block' : ''}`}>
      <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => {
            if (returnToReviewFromStep === currentStep) {
              setReturnToReviewFromStep(null)
              setCurrentStep('review')
              return
            }
            if (currentStepIndex > 0) setCurrentStep(visibleSteps[currentStepIndex - 1].key)
          }}
          disabled={currentStepIndex === 0}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 shadow-sm transition-colors hover:border-brand-400 hover:bg-brand-100 hover:text-brand-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-200 dark:hover:bg-brand-900/50 dark:hover:text-white sm:min-h-11 sm:rounded-xl sm:px-5"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> {t('common.back')}
        </button>
        {currentStep === 'consent' ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="min-h-10 rounded-lg bg-accent-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-accent-700 hover:shadow-lg disabled:opacity-50 sm:min-h-11 sm:rounded-xl sm:px-6"
          >
            {loading ? t('intake.submitting') : tx('viewMyReport')}
          </button>
        ) : showTapHint ? (
          <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-center text-sm font-medium text-brand-800 shadow-sm dark:border-brand-800/70 dark:bg-brand-950/40 dark:text-brand-200 sm:min-h-11">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            {t('intake.tapToContinue')}
          </span>
        ) : currentStep === 'when' && formData.incidentDatePreset === 'custom' ? (
          <button
            type="button"
            onClick={validateAndNext}
            disabled={!customDate}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-accent-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:rounded-xl sm:px-6"
          >
            {t('common.next')} <ChevronRight className="h-4 w-4 ml-1" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={validateAndNext}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-accent-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-700 sm:min-h-11 sm:rounded-xl sm:px-6"
          >
            {currentStep === 'review' ? tx('generateReport') : t('common.next')} <ChevronRight className="h-4 w-4 ml-1" aria-hidden />
          </button>
        )}
      </div>
      </div>
    </div>
  )
}

/**
 * ClearCaseIQ Universal + Branching 12-Screen Intake Flow
 */
import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAssessment, predict, uploadEvidenceFile, processEvidenceFile, extractEvidenceData, analyzeCaseWithChatGPT, calculateSOL, createIntakeLead, updateIntakeLead, getIntakeLead, getEvidenceFiles, type IntakeLeadPayload } from '../lib/api-plaintiff'
import { ChevronRight, ChevronLeft, ChevronDown, Car, Footprints, HardHat, Stethoscope, HelpCircle, Check, MapPin, Building2, Camera, Video, FileText, Shield, Mail, Phone, DollarSign, Dog, Package, AlertTriangle, Droplets, CalendarDays, Hospital, Scissors, Ambulance, PersonStanding, Scan, Syringe, Pill, Lock, MessageSquare, Info, CheckCircle2, Save, ShieldCheck, Users, HeartPulse, Activity, Bone, CalendarClock, Ban, BedDouble, Moon, Dumbbell, Bike, Truck, User, Briefcase, Landmark, CornerUpLeft, Receipt, Wine, RotateCw, XCircle, Clock, UserX, Lightbulb, ClipboardCheck, Umbrella, Pencil, FolderOpen, Scale, Star, Sparkles, TrendingUp, Brain, Upload, type LucideIcon } from 'lucide-react'
import InlineEvidenceUpload from '../components/InlineEvidenceUpload'
import { useLanguage } from '../contexts/LanguageContext'
import { buildCaseTaxonomy, injuryTypeToClaimType, sanitizeDetectedCounty } from '../lib/intakeQuickHelpers'
import { US_STATES } from '../lib/constants'
import { getCountiesForState } from '../lib/usLocationData'
import { formatPhoneInput, validatePhoneField } from '../lib/phone'

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

// Format a Date as YYYY-MM-DD using the viewer's *local* calendar date.
// toISOString() converts to UTC first, which shifts the day backward for
// timezones ahead of UTC (e.g. India, UTC+5:30) and made valid dates and
// "today" fail validation (#26).
const toLocalIso = (d: Date): string => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isoToday = (): string => toLocalIso(new Date())

// Common email domains people mistype. Used to nudge ("Did you mean …?") rather than
// hard-reject, since plausibly-valid TLDs like .co should still be accepted.
const COMMON_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com', 'outlook.com',
  'live.com', 'msn.com', 'icloud.com', 'me.com', 'aol.com', 'comcast.net', 'protonmail.com',
  'proton.me', 'verizon.net', 'att.net', 'sbcglobal.net',
]

const levenshtein = (a: string, b: string): number => {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array<number>(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

/** Suggests a corrected email for likely domain typos (e.g. gmail.co → gmail.com). */
const suggestEmail = (email: string): string | null => {
  const trimmed = email.trim()
  const at = trimmed.lastIndexOf('@')
  if (at < 1 || at === trimmed.length - 1) return null
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1).toLowerCase()
  if (!domain.includes('.') || /\s/.test(domain)) return null
  if (COMMON_EMAIL_DOMAINS.includes(domain)) return null
  let best: string | null = null
  let bestDist = Infinity
  for (const candidate of COMMON_EMAIL_DOMAINS) {
    const dist = levenshtein(domain, candidate)
    if (dist < bestDist) {
      bestDist = dist
      best = candidate
    }
  }
  // Only suggest for a single-character miss (e.g. gmail.co → gmail.com). A
  // looser threshold flagged many legitimate custom/corporate domains and
  // displayed a "corrected" address the user never typed in the Save-progress
  // section (#1). Also require the suggestion to share the same second-level
  // name so we only fix the TLD/near-typo, never rewrite a real domain.
  if (best && bestDist === 1) {
    const sld = (d: string) => d.split('.')[0]
    if (sld(domain) === sld(best) || levenshtein(sld(domain), sld(best)) === 1) {
      return `${local}@${best}`
    }
  }
  return null
}

/**
 * Checks whether an email domain can actually receive mail by querying public
 * DNS-over-HTTPS for MX (and A as fallback) records. Returns true if the domain
 * looks deliverable OR if the lookup fails (we never block on network errors).
 */
const domainCanReceiveMail = async (domain: string): Promise<boolean> => {
  const query = async (type: 'MX' | 'A'): Promise<boolean> => {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`)
    if (!res.ok) throw new Error('dns lookup failed')
    const json = await res.json()
    const wantType = type === 'MX' ? 15 : 1
    return Array.isArray(json.Answer) && json.Answer.some((a: { type?: number }) => a.type === wantType)
  }
  try {
    if (await query('MX')) return true
    if (await query('A')) return true
    return false
  } catch {
    return true
  }
}

// Earliest plausible incident date. Guards against invalid/typoed years like
// "0000" or "0203" that a native date input otherwise accepts as a past date.
const MIN_INCIDENT_DATE = '1900-01-01'

// A native <input type="date"> coerces a typo like "00-00-0000" into a real but
// nonsensical value such as "0001-01-01" and still lets the form advance (#26).
// Treat a date as valid only when it is a well-formed YYYY-MM-DD string that
// parses to a real calendar date no earlier than MIN_INCIDENT_DATE and no later
// than today.
function isValidIncidentDate(value: string, todayIso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return false
  // Reject roll-overs (e.g. 2023-02-31 → Mar 3) by round-tripping. Compare in
  // local time to match how the value was parsed — using toISOString() here
  // shifts the day backward in timezones ahead of UTC and rejects valid dates.
  if (toLocalIso(parsed) !== value) return false
  return value >= MIN_INCIDENT_DATE && value <= todayIso
}

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

// Icon per option so the injuries/treatment step can render visual tiles.
const SEVERITY_ICONS: Record<string, LucideIcon> = {
  minor: Activity,
  moderate: Stethoscope,
  serious: Hospital,
  surgery: Scissors,
  unsure: HelpCircle,
}
const TREATMENT_ICONS: Record<string, LucideIcon> = {
  er: Ambulance,
  chiro_pt: PersonStanding,
  mri: Scan,
  injections: Syringe,
  pain_management: Pill,
  surgery: Scissors,
  none: CalendarDays,
}

/** Splits a label like "Minor (soreness or bruises)" into main + description. */
const splitLabel = (label: string): { main: string; desc?: string } => {
  const match = label.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  return match ? { main: match[1].trim(), desc: match[2].trim() } : { main: label }
}

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
  { value: 'mri', labelKey: 'future_mri' },
  { value: 'injections', labelKey: 'future_injections' },
  { value: 'surgery', labelKey: 'future_surgery' },
  { value: 'specialist', labelKey: 'future_specialist' },
  { value: 'additional_testing', labelKey: 'future_testing' },
  { value: 'long_term_treatment', labelKey: 'future_longTerm' },
  { value: 'none', labelKey: 'future_none' },
  { value: 'not_sure', labelKey: 'future_notSure' },
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
  { value: 'driving_difficulty', labelKey: 'impact_driving' },
  { value: 'household_chores', labelKey: 'impact_chores' },
  { value: 'parenting_difficulties', labelKey: 'impact_parenting' },
  { value: 'missed_family', labelKey: 'impact_family' },
  { value: 'emotional_distress', labelKey: 'impact_emotional' },
  { value: 'social_activities', labelKey: 'impact_social' },
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
  { value: 'herniation', labelKey: 'diag_herniation' },
  { value: 'radiculopathy', labelKey: 'diag_radiculopathy' },
  { value: 'muscle_strain', labelKey: 'diag_strain' },
  { value: 'tear', labelKey: 'diag_tear' },
  { value: 'whiplash', labelKey: 'diag_whiplash' },
  { value: 'concussion', labelKey: 'diag_concussion' },
  { value: 'fracture', labelKey: 'diag_fracture' },
  { value: 'tbi', labelKey: 'diag_tbi' },
  { value: 'other_diagnosis', labelKey: 'diag_other' },
]

// "Treatment received" tiles on the Injury Details screen (stored in injuryDetails.imaging).
const TREATMENT_RECEIVED_OPTION_DEFS = [
  { value: 'mri', labelKey: 'treatrec_mri' },
  { value: 'ct_scan', labelKey: 'treatrec_ct' },
  { value: 'xray', labelKey: 'treatrec_xray' },
  { value: 'physical_therapy', labelKey: 'treatrec_pt' },
  { value: 'chiropractic', labelKey: 'treatrec_chiro' },
  { value: 'injections', labelKey: 'treatrec_injections' },
  { value: 'surgery', labelKey: 'treatrec_surgery' },
  { value: 'other_treatment', labelKey: 'treatrec_other' },
]

const CURRENT_SYMPTOM_OPTION_DEFS = [
  { value: 'pain', labelKey: 'sym_pain' },
  { value: 'stiffness', labelKey: 'sym_stiffness' },
  { value: 'limited_rom', labelKey: 'sym_rom' },
  { value: 'numbness', labelKey: 'sym_numbness' },
  { value: 'weakness', labelKey: 'sym_weakness' },
  { value: 'headaches', labelKey: 'sym_headaches' },
  { value: 'other', labelKey: 'optionOther' },
]

const RECOVERY_STATUS_OPTION_DEFS = [
  { value: 'fully_recovered', labelKey: 'recov_full' },
  { value: 'mostly_improved', labelKey: 'recov_mostly' },
  { value: 'symptoms_ongoing', labelKey: 'recov_ongoing' },
  { value: 'getting_worse', labelKey: 'recov_worse' },
]

// Six headline "areas of life affected" tiles (stored in injuryDetails.lifestyleImpact).
const LIFE_AREA_OPTION_DEFS = [
  { value: 'unable_to_work_normally', labelKey: 'life_work' },
  { value: 'sleep_disruption', labelKey: 'life_sleep' },
  { value: 'exercise_limitations', labelKey: 'life_exercise' },
  { value: 'driving_difficulty', labelKey: 'life_driving' },
  { value: 'household_chores', labelKey: 'life_household' },
  { value: 'missed_family', labelKey: 'life_family' },
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

// Maps the coarse missed-work buckets to a conservative number of missed weeks, used to
// turn a documented weekly income (from an uploaded pay stub) into a documented wage-loss
// figure. Longer-term/permanent loss ("unable to return", lost business income) is capped
// because a single pay stub can't substantiate months of loss — that needs attorney /
// vocational review, and the self-reported range still applies via the max() below.
const MISSED_WORK_WEEKS: Record<string, number> = {
  few_days: 0.6,
  several_weeks: 3,
  unable_to_return: 12,
  lost_job_business_income: 12,
}

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

// PIP / no-fault coverage (auto cases). Required medical-payer info in no-fault states.
const PIP_OPTION_DEFS = [
  { value: 'yes', labelKey: 'optionYes' },
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

// Optional explicit repair/replacement cost for vehicle cases. When provided it
// feeds the valuation's economic damages (estimated_property_damage) more precisely
// than the impact selector's coarse fallback.
const PROPERTY_DAMAGE_COST_OPTIONS = [
  { value: 'under_1000', labelKey: 'vehicle_cost_under_1000', estimate: 600 },
  { value: '1000_5000', labelKey: 'vehicle_cost_1000_5000', estimate: 3000 },
  { value: '5000_15000', labelKey: 'vehicle_cost_5000_15000', estimate: 9000 },
  { value: 'over_15000', labelKey: 'vehicle_cost_over_15000', estimate: 20000 },
  { value: 'not_sure', labelKey: 'vehicle_cost_not_sure', estimate: 0 },
]

// Rental car / alternate transportation cost while the vehicle was being repaired.
const RENTAL_COST_OPTIONS = [
  { value: 'none', labelKey: 'vehicle_rental_none', estimate: 0 },
  { value: 'under_500', labelKey: 'vehicle_rental_under_500', estimate: 300 },
  { value: '500_2000', labelKey: 'vehicle_rental_500_2000', estimate: 1200 },
  { value: 'over_2000', labelKey: 'vehicle_rental_over_2000', estimate: 3000 },
]

// Coarse fallback estimate from the damage-impact selector when no explicit cost is given.
const PROPERTY_DAMAGE_IMPACT_ESTIMATE: Record<string, number> = {
  minor: 1500, moderate: 4000, not_drivable: 9000, total_loss: 15000,
}

/**
 * Best available property-damage dollar figure for a vehicle case: an explicit
 * repair-cost range when provided, otherwise the coarse impact-based fallback,
 * plus any rental/transportation cost.
 */
function computePropertyDamage(branch: Record<string, any>): number {
  const repairFromRange = PROPERTY_DAMAGE_COST_OPTIONS.find(o => o.value === branch.propertyDamageCostRange)?.estimate ?? 0
  const repair = repairFromRange > 0
    ? repairFromRange
    : (PROPERTY_DAMAGE_IMPACT_ESTIMATE[branch.propertyDamage] || 0)
  const rental = RENTAL_COST_OPTIONS.find(o => o.value === branch.rentalCostRange)?.estimate ?? 0
  return repair + rental
}

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

// Assault / negligent security branch — "where did it occur?"
const ASSAULT_TYPE_OPTIONS = [
  { value: 'apartment', labelKey: 'assault_apartment' },
  { value: 'hotel', labelKey: 'slip_hotel' },
  { value: 'parking_lot', labelKey: 'assault_parkingLot' },
  { value: 'store', labelKey: 'assault_store' },
  { value: 'bar_nightclub', labelKey: 'assault_barNightclub' },
  { value: 'other', labelKey: 'optionOther' }
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

// Vehicle: who appears most at fault
const FAULT_PARTY_OPTIONS = [
  { value: 'other_driver', labelKey: 'fault_otherDriver' },
  { value: 'shared', labelKey: 'fault_shared' },
  { value: 'not_sure', labelKey: 'optionNotSure' }
]

// Workplace branch
const WORKPLACE_CAUSE_OPTIONS = [
  { value: 'fall', labelKey: 'wp_fall' },
  { value: 'equipment', labelKey: 'wp_equipment' },
  { value: 'vehicle', labelKey: 'wp_vehicle' },
  { value: 'repetitive', labelKey: 'wp_repetitive' },
  { value: 'chemical', labelKey: 'wp_chemical' },
  { value: 'other', labelKey: 'optionOther' }
]

const WORKPLACE_THIRD_PARTY_OPTIONS = [
  { value: 'contractor', labelKey: 'wp_contractor' },
  { value: 'vendor', labelKey: 'wp_vendor' },
  { value: 'equipment_mfr', labelKey: 'wp_equipmentMfr' },
  { value: 'no', labelKey: 'optionNo' }
]

// Dog bite: animal type
const ANIMAL_TYPE_OPTIONS = [
  { value: 'dog', labelKey: 'animal_dog' },
  { value: 'cat', labelKey: 'animal_cat' },
  { value: 'other', labelKey: 'optionOther' }
]

// Toxic: where exposure occurred + who it was reported to
const EXPOSURE_LOCATION_OPTIONS = [
  { value: 'home', labelKey: 'exp_home' },
  { value: 'apartment', labelKey: 'exp_apartment' },
  { value: 'workplace', labelKey: 'slip_workplace' },
  { value: 'school', labelKey: 'exp_school' },
  { value: 'hotel', labelKey: 'slip_hotel' },
  { value: 'other', labelKey: 'optionOther' }
]

const TOXIC_REPORTED_OPTIONS = [
  { value: 'landlord', labelKey: 'report_landlord' },
  { value: 'employer', labelKey: 'report_employer' },
  { value: 'government', labelKey: 'report_government' },
  { value: 'no', labelKey: 'optionNo' }
]

// Other injury: who caused it
const WHO_CAUSED_OPTIONS = [
  { value: 'another_person', labelKey: 'who_anotherPerson' },
  { value: 'business', labelKey: 'who_business' },
  { value: 'property_owner', labelKey: 'who_propertyOwner' },
  { value: 'employer', labelKey: 'who_employer' },
  { value: 'product', labelKey: 'who_product' },
  { value: 'not_sure', labelKey: 'optionNotSure' }
]

const STEPS: { key: Step; title: string }[] = [
  { key: 'injury_type', title: 'Injury Type' },
  { key: 'when', title: 'Incident Facts' },
  { key: 'injury_severity', title: 'Your Injuries' },
  { key: 'injury_details', title: 'Treatment & Recovery' },
  { key: 'case_details', title: 'Case Details' },
  { key: 'evidence', title: 'Evidence Upload' },
  { key: 'financial_impact', title: 'Damages & Valuation' },
  { key: 'legal_status', title: 'Insurance & Legal Status' },
  { key: 'consent', title: 'Your Case Report Is Ready' }
]

/** Steps that have no questions for a given injury type are skipped entirely. */
const HIDDEN_STEPS_BY_INJURY: Record<string, Step[]> = {}

/** Steps from older drafts that were merged into a single screen. */
const LEGACY_STEP_MAP: Record<string, Step> = {
  where: 'when',
  narrative: 'when',
  contact: 'when',
  medical_treatment: 'when',
  branch_7: 'case_details',
  branch_8: 'case_details',
  branch_9: 'case_details',
  branch_10: 'case_details',
}

const DRAFT_STORAGE_KEY = 'intake_quick_draft_v1'

// Shared section header: a colored rounded badge (icon or number) + title + optional helper.
// Used across wizard steps so section headers look consistent.
const SECTION_HEADER_ACCENTS: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
}
function SectionHeader({ icon: Icon, number, title, helper, accent = 'brand' }: {
  icon?: LucideIcon
  number?: number
  title: ReactNode
  helper?: ReactNode
  accent?: 'brand' | 'violet' | 'blue' | 'emerald'
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${SECTION_HEADER_ACCENTS[accent]}`}>
        {Icon ? <Icon className="h-5 w-5" aria-hidden /> : number}
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
        {helper && <p className="mt-0.5 text-xs leading-5 text-gray-500 dark:text-slate-400">{helper}</p>}
      </div>
    </div>
  )
}

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
  const TREATMENT_RECEIVED_OPTIONS = localizeOptions(TREATMENT_RECEIVED_OPTION_DEFS)
  // Combined lookup so imaging-field values from either option set resolve to a label in summaries.
  const IMAGING_LABEL_OPTIONS = [...TREATMENT_RECEIVED_OPTIONS, ...IMAGING_OPTIONS]
  const CURRENT_SYMPTOM_OPTIONS = localizeOptions(CURRENT_SYMPTOM_OPTION_DEFS)
  const RECOVERY_STATUS_OPTIONS = localizeOptions(RECOVERY_STATUS_OPTION_DEFS)
  const LIFE_AREA_OPTIONS = localizeOptions(LIFE_AREA_OPTION_DEFS)
  const MISSED_WORK_OPTIONS = localizeOptions(MISSED_WORK_OPTION_DEFS)
  const ACCIDENT_EXPENSE_OPTIONS = localizeOptions(ACCIDENT_EXPENSE_OPTION_DEFS)
  const TREATMENT_PAYER_OPTIONS = localizeOptions(TREATMENT_PAYER_OPTION_DEFS)
  const WAGE_LOSS_RANGE_OPTIONS = localizeOptions(WAGE_LOSS_RANGE_OPTION_DEFS)
  const FINANCIAL_HARDSHIP_OPTIONS = localizeOptions(FINANCIAL_HARDSHIP_OPTION_DEFS)
  const DEFENDANT_COVERAGE_OPTIONS = localizeOptions(DEFENDANT_COVERAGE_OPTION_DEFS)
  const MEDICAL_BILL_RANGE_OPTIONS = localizeOptions(MEDICAL_BILL_RANGE_OPTION_DEFS)
  const FUTURE_MEDICAL_RANGE_OPTIONS = localizeOptions(FUTURE_MEDICAL_RANGE_OPTION_DEFS)
  const UM_UIM_OPTIONS = localizeOptions(UM_UIM_OPTION_DEFS)
  const PIP_OPTIONS = localizeOptions(PIP_OPTION_DEFS)
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
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [emailDeliverable, setEmailDeliverable] = useState<'unknown' | 'checking' | 'ok' | 'bad'>('unknown')
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email')
  const [pendingEvidenceFiles, setPendingEvidenceFiles] = useState<Record<string, any[]>>({})
  const [manageEvidence, setManageEvidence] = useState<Record<string, boolean>>({})
  type EvidenceWarning = { fileName: string; status: string; message: string; title?: string; action?: { label: string; onClick: () => void } }
  const [evidenceWarnings, setEvidenceWarnings] = useState<Record<string, { items: EvidenceWarning[]; dismiss: (fileName: string) => void }>>({})
  // Per-category drop targets so the entire evidence row (not just the small upload
  // button) accepts dragged files, plus the category currently being dragged over.
  const evidenceDropRefs = useRef<Record<string, { current: HTMLDivElement | null }>>({})
  const getEvidenceDropRef = (cat: string) => {
    if (!evidenceDropRefs.current[cat]) evidenceDropRefs.current[cat] = { current: null }
    return evidenceDropRefs.current[cat]
  }
  const [evidenceDragCategory, setEvidenceDragCategory] = useState<string | null>(null)
  // Document-derived financial figures extracted from uploaded bills / wage docs during intake.
  // `weeklyIncome` is only populated for wage-verification docs (documented pay rate).
  const [docFinancials, setDocFinancials] = useState<Record<string, { total: number; amounts: string[]; weeklyIncome?: number }>>({})
  // Tracks which uploaded files have already been sent for extraction so we don't re-OCR them.
  const extractedFileSigRef = useRef<Map<string, { total: number; amounts: string[]; weeklyIncome?: number }>>(new Map())
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
      bodyPartsOther: '' as string,
      imaging: [] as string[],
      surgeryStatus: '' as string,
      procedures: [] as string[],
      futureTreatment: [] as string[],
      concussionSymptoms: [] as string[],
      lifestyleImpact: [] as string[],
      lifestyleOther: '' as string,
      symptomFrequency: '' as string,
      symptomTrend: '' as string,
      shoulderFindings: [] as string[],
      backFindings: [] as string[],
      diagnoses: [] as string[],
      currentSymptoms: [] as string[],
      recoveryStatus: '' as string,
      biggestImpact: '' as string,
    },
    branch: {} as Record<string, any>,
    contact: { email: '', phone: '' },
    casePosture: {} as Record<string, any>,
    insuranceCoverage: {
      healthCoverage: '' as '' | 'yes' | 'no' | 'unsure',
      otherPartyInsured: '' as '' | 'yes' | 'no' | 'unsure',
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
      pipCoverage: '' as string,
      medPayCoverage: '' as string,
      plaintiffAutoCarrier: '' as string,
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
    // Resume from an emailed/SMS "return later" link (?lead=<id>) on any device.
    const leadParam = new URLSearchParams(window.location.search).get('lead')
    if (leadParam) {
      void (async () => {
        try {
          const lead = await getIntakeLead(leadParam)
          const snap: any = lead?.formSnapshot
          // Restore whenever the saved snapshot has any answers — not only when
          // injuryType is present — so a resume link reliably rehydrates progress
          // even on a fresh device / private window (no local draft to fall back on).
          if (snap && typeof snap === 'object' && Object.keys(snap).length > 0) {
            const { customDate: snapCustomDate, ...answers } = snap
            setFormData(prev => ({
              ...prev,
              ...answers,
              venue: { ...prev.venue, ...(answers.venue || {}) },
              injuryDetails: { ...prev.injuryDetails, ...(answers.injuryDetails || {}) },
              insuranceCoverage: { ...prev.insuranceCoverage, ...(answers.insuranceCoverage || {}) },
              // Contact + consents are intentionally re-collected, never restored from a link.
              contact: { ...prev.contact },
              consents: { tos: false, privacy: false, ml_use: false },
            }))
            if (typeof snapCustomDate === 'string') setCustomDate(snapCustomDate)
            const hidden = HIDDEN_STEPS_BY_INJURY[snap.injuryType] || []
            const validKeys = STEPS.map(s => s.key).filter(key => !hidden.includes(key))
            const restoredStep = typeof lead.currentStep === 'string'
              ? (LEGACY_STEP_MAP[lead.currentStep] ?? lead.currentStep)
              : undefined
            if (restoredStep && validKeys.includes(restoredStep as Step)) {
              setCurrentStep(restoredStep as Step)
            }
            leadIdRef.current = lead.id
            setDraftRestored(true)
          }
        } catch {
          /* invalid or expired link; fall through to a fresh start */
        } finally {
          draftLoadedRef.current = true
        }
      })()
      return
    }

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

  // When an assessment id is present (a resumed/edited case, or one that already
  // has server-persisted evidence), load its uploaded files once and merge them
  // into pendingEvidenceFiles grouped by category. This ensures verification
  // factors and summaries recognize bills/records uploaded and OCR'd in a prior
  // session — not just files queued during the current session. Files queued
  // this session (temp_ ids with a rawFile) are preserved and de-duplicated.
  const loadedEvidenceAssessmentRef = useRef<string | null>(null)
  useEffect(() => {
    if (!assessmentId || loadedEvidenceAssessmentRef.current === assessmentId) return
    loadedEvidenceAssessmentRef.current = assessmentId
    let cancelled = false
    void (async () => {
      try {
        const serverFiles: any[] = await getEvidenceFiles(assessmentId)
        if (cancelled || !Array.isArray(serverFiles) || serverFiles.length === 0) return
        const byCategory: Record<string, any[]> = {}
        for (const file of serverFiles) {
          const cat = file?.category || 'other'
          ;(byCategory[cat] ||= []).push(file)
        }
        setPendingEvidenceFiles((prev) => {
          const next: Record<string, any[]> = { ...prev }
          for (const [cat, files] of Object.entries(byCategory)) {
            const existing = Array.isArray(prev[cat]) ? prev[cat] : []
            const existingIds = new Set(existing.map((f) => f?.id))
            const merged = [...existing, ...files.filter((f) => !existingIds.has(f?.id))]
            next[cat] = merged
          }
          return next
        })

        // Seed financial aggregates from already-OCR'd server files so the
        // damages/review money figures reflect prior-session extractions.
        const parseAmounts = (raw: unknown): string[] => {
          if (Array.isArray(raw)) return raw.map(String)
          if (typeof raw === 'string') {
            try { const p = JSON.parse(raw); return Array.isArray(p) ? p.map(String) : [] } catch { return [] }
          }
          return []
        }
        // The documented pay rate is persisted inside ExtractedData.entities.wage.
        const parseWeeklyIncome = (raw: unknown): number => {
          let entities: any = raw
          if (typeof raw === 'string') {
            try { entities = JSON.parse(raw) } catch { return 0 }
          }
          return Number(entities?.wage?.weeklyIncome) || 0
        }
        setDocFinancials((prev) => {
          const next = { ...prev }
          for (const cat of FINANCIAL_DOC_CATEGORIES) {
            const files = byCategory[cat]
            if (!files || files.length === 0) continue
            const agg = files.reduce(
              (acc, file) => {
                const ext = file?.extractedData?.[0]
                const total = Number(ext?.totalAmount) || 0
                if (total > 0) {
                  acc.total += total
                  acc.amounts.push(...parseAmounts(ext?.dollarAmounts))
                }
                acc.weeklyIncome = Math.max(acc.weeklyIncome, parseWeeklyIncome(ext?.entities))
                return acc
              },
              { total: 0, amounts: [] as string[], weeklyIncome: 0 },
            )
            // Don't overwrite a richer current-session extraction with an empty one.
            const hasNewData = agg.total > 0 || agg.weeklyIncome > 0
            const hasCurrentData = !!(prev[cat]?.total) || !!(prev[cat]?.weeklyIncome)
            if (hasNewData && !hasCurrentData) next[cat] = agg
          }
          return next
        })
      } catch {
        // Best-effort: a failed load just leaves the current-session state intact.
      }
    })()
    return () => { cancelled = true }
  }, [assessmentId])

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
      // Reflect the lead id in the URL so a copied/shared link can rehydrate the
      // wizard from the server snapshot in any browser or incognito tab (#15).
      // The ?lead= handler at mount restores the saved answers.
      if (leadIdRef.current && typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        if (url.searchParams.get('lead') !== leadIdRef.current) {
          url.searchParams.set('lead', leadIdRef.current)
          window.history.replaceState(window.history.state, '', url.toString())
        }
      }
    } catch {
      /* lead capture is best-effort; never block the wizard */
    } finally {
      leadSyncInFlightRef.current = false
    }
  }

  // Persist the "save your progress" contact info as soon as the user finishes
  // typing it (on blur), instead of only when they click Next. This makes the
  // email/phone capture work even if they don't advance past this step.
  const saveContactProgress = () => {
    const email = formData.contact.email.trim()
    const phone = formData.contact.phone.trim()
    if (!email && !phone) return
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    if (phone && validatePhoneField(phone)) return
    void syncLead()
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

  // The step panel scrolls internally on desktop; reset it so each step starts at
  // the top. On mobile the panel is a normal block (the page scrolls), so reset the
  // window scroll too — otherwise a new step can start mid-page.
  const stepScrollRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    stepScrollRef.current?.scrollTo({ top: 0 })
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }, [currentStep])

  // Keep validation errors in one consistent place (top of the step) and bring it into view.
  const errorSummaryRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [errors])

  // Prefetch the IP-based location as soon as the wizard mounts (not when the user
  // first reaches the "when/where" step). Resolving it ahead of time means step 2
  // renders in its final state on first paint, instead of swapping the location
  // fields for the "we detected your location" banner mid-view — which read as a jump.
  // The ref guard runs the lookup once. We intentionally do NOT cancel the in-flight
  // fetch on effect cleanup: under React StrictMode the cleanup fires between the
  // double-invoked mount effects, and cancelling there would discard the only request,
  // leaving the banner to never resolve. A late setState after a real unmount is a
  // harmless no-op.
  const geoRequestedRef = useRef(false)
  useEffect(() => {
    if (geoRequestedRef.current || formData.venue.state) return
    geoRequestedRef.current = true
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(async data => {
        // Only pre-fill for US locations. Foreign region codes can collide with
        // US state codes (e.g. Western Australia "WA" → Washington, Bhopal "MP"),
        // which would surface a wrong/partial banner that fills city but not a
        // valid US state/county (#13).
        const country = String(data.country_code || data.country || '').toUpperCase()
        if (country && country !== 'US') return
        const city = data.city || ''
        // Resolve a valid 2-letter US state code. ipapi sometimes returns an empty
        // or non-standard region_code, which previously left the state blank after
        // "Use this location". Fall back to mapping the full region name, and drop
        // anything that isn't a known US state (e.g. international locations).
        const rawCode = String(data.region_code || '').toUpperCase()
        const regionName = String(data.region || '').trim().toLowerCase()
        const state =
          US_STATES.find(s => s.code === rawCode)?.code ||
          (regionName ? US_STATES.find(s => s.name.toLowerCase() === regionName)?.code : undefined) ||
          ''
        // Without a resolvable US state there's nothing useful to pre-fill; let the
        // user select manually rather than showing a banner that can't fill state.
        if (!state) return
        let county = sanitizeDetectedCounty(state, data.county || '')
        // ipapi rarely returns a county; resolve it from coordinates via the
        // free FCC census area API so "Use this location" can fill county too.
        if (!county && data.latitude && data.longitude) {
          try {
            const fcc = await fetch(
              `https://geo.fcc.gov/api/census/area?lat=${data.latitude}&lon=${data.longitude}&format=json`,
            ).then(r => r.json())
            const result = fcc?.results?.[0]
            if (result?.county_name) {
              county = sanitizeDetectedCounty(result.state_code || state, result.county_name)
            }
          } catch {
            /* fall back to no county — user can pick it manually */
          }
        }
        setDetectedLocation({ city, county, state })
      })
      .catch(() => {})
  }, [formData.venue.state])

  // Verify the email's domain can actually receive mail (debounced). This catches
  // plausibly-formatted but non-deliverable domains (e.g. typo'd custom domains)
  // that format/typo checks can't. Network failures never block the user.
  useEffect(() => {
    const email = formData.contact.email.trim()
    const at = email.lastIndexOf('@')
    const validFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!validFormat) {
      setEmailDeliverable('unknown')
      return
    }
    const domain = email.slice(at + 1).toLowerCase()
    if (COMMON_EMAIL_DOMAINS.includes(domain)) {
      setEmailDeliverable('ok')
      return
    }
    let cancelled = false
    setEmailDeliverable('checking')
    const handle = setTimeout(async () => {
      const ok = await domainCanReceiveMail(domain)
      if (!cancelled) setEmailDeliverable(ok ? 'ok' : 'bad')
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [formData.contact.email])

  useEffect(() => {
    const incidentDate =
      formData.incidentDatePreset === 'custom' ? customDate : formData.incidentDate
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
    return formData.incidentDate
  }

  /** Month/year produces an estimated date — deadline math from it is approximate. */
  const incidentDateIsApproximate = formData.incidentDatePreset === 'month_year'

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
    if (formData.injuryDetails.bodyPartsOther.trim()) parts.push(`Other injuries (in their words): ${formData.injuryDetails.bodyPartsOther.trim()}`)
    if (formData.injuryDetails.priorInjury) parts.push(`Prior injuries: ${labelForValue(PRIOR_INJURY_OPTIONS, formData.injuryDetails.priorInjury)}`)
    if (formData.injuryDetails.surgeryStatus) parts.push(`Surgery status: ${labelForValue(SURGERY_STATUS_OPTIONS, formData.injuryDetails.surgeryStatus)}`)
    if (formData.injuryDetails.imaging.length) parts.push(`Imaging: ${labelsForValues(IMAGING_LABEL_OPTIONS, formData.injuryDetails.imaging)}`)
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
      details.imaging.length ? `${tx('sum_imaging')}: ${labelsForValues(IMAGING_LABEL_OPTIONS, details.imaging)}` : null,
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
      formData.insuranceCoverage.otherPartyInsured ? `${tx('legal_otherPartyInsuredQuestion')} ${formData.insuranceCoverage.otherPartyInsured === 'yes' ? tx('optionYes') : formData.insuranceCoverage.otherPartyInsured === 'no' ? tx('optionNo') : tx('optionNotSure')}` : null,
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
      step: 'when' as Step,
      helper: `${getIncidentDate() || tx('review_dateNotSet')}${formData.venue.state ? ` • ${formatVenueLocation(formData.venue)}` : ''}`
    },
    {
      title: tx('review_injuriesTreatmentTitle'),
      value: `${getOptionLabel(INJURY_SEVERITY_OPTIONS, formData.injurySeverity)} • ${getMedicalTreatmentSummary()}`,
      step: 'injury_severity' as Step,
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

  /** Categories whose uploads we OCR at intake time to surface document-derived dollar figures. */
  const FINANCIAL_DOC_CATEGORIES = ['bills', 'wage_verification']

  const handleEvidenceFiles = (category: string, files: any[]) => {
    setPendingEvidenceFiles(prev => ({ ...prev, [category]: files }))
    if (FINANCIAL_DOC_CATEGORIES.includes(category)) {
      void extractFinancialsForCategory(category, files)
    }
  }

  /** OCRs newly-added bill/wage files (ephemerally, nothing persisted) and aggregates extracted totals. */
  const extractFinancialsForCategory = async (category: string, files: any[]) => {
    const arr = Array.isArray(files) ? files : []
    for (const file of arr) {
      const raw: File | undefined = file?.rawFile
      if (!raw) continue
      const sig = `${category}:${raw.name}:${raw.size}`
      if (extractedFileSigRef.current.has(sig)) continue
      // Reserve the signature immediately so rapid re-renders don't double-fire extraction.
      extractedFileSigRef.current.set(sig, { total: 0, amounts: [] })
      try {
        const fd = new FormData()
        fd.append('file', raw)
        fd.append('category', category)
        const res = await extractEvidenceData(fd)
        const extraction = res?.extraction
        const total = Number(extraction?.totalAmount) || 0
        const amounts: string[] = Array.isArray(extraction?.dollarAmounts) ? extraction.dollarAmounts : []
        const weeklyIncome = Number(extraction?.wage?.weeklyIncome) || 0
        extractedFileSigRef.current.set(sig, { total, amounts, weeklyIncome })
      } catch {
        extractedFileSigRef.current.set(sig, { total: 0, amounts: [] })
      }
    }
    // Recompute the category aggregate from every still-queued file's cached extraction.
    // Dollar totals sum across bills; weekly income takes the max across pay stubs since
    // multiple stubs document the same job's pay rate rather than additive income.
    const aggregate = (Array.isArray(files) ? files : []).reduce(
      (acc, file) => {
        const raw: File | undefined = file?.rawFile
        if (!raw) return acc
        const cached = extractedFileSigRef.current.get(`${category}:${raw.name}:${raw.size}`)
        if (cached && cached.total > 0) {
          acc.total += cached.total
          acc.amounts.push(...cached.amounts)
        }
        if (cached?.weeklyIncome) acc.weeklyIncome = Math.max(acc.weeklyIncome, cached.weeklyIncome)
        return acc
      },
      { total: 0, amounts: [] as string[], weeklyIncome: 0 },
    )
    setDocFinancials(prev => ({ ...prev, [category]: aggregate }))
  }

  /** Relocate a queued file flagged as the wrong type (e.g. a video dropped on Photos) to a better-fit category. */
  const handleMoveEvidence = (fromCategory: string, toCategory: string, fileName: string) => {
    const subcategoryByCategory: Record<string, string> = { video: 'incident_video', photos: 'injury_photos' }
    setPendingEvidenceFiles(prev => {
      const fromList = Array.isArray(prev[fromCategory]) ? prev[fromCategory] : []
      const moving = fromList.find(f => (f?.originalName || f?.filename || f?.name) === fileName)
      if (!moving) return prev
      const toList = Array.isArray(prev[toCategory]) ? prev[toCategory] : []
      return {
        ...prev,
        [fromCategory]: fromList.filter(f => f !== moving),
        [toCategory]: [...toList, { ...moving, category: toCategory, subcategory: subcategoryByCategory[toCategory] || moving?.subcategory }],
      }
    })
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
      const preset = formData.incidentDatePreset
      const today = isoToday()
      if (!preset) {
        err.incidentDate = tx('error_enterDate')
      } else if (preset === 'custom') {
        if (!customDate) err.incidentDate = tx('error_enterDate')
        else if (customDate > today) err.incidentDate = tx('error_futureDate')
        else if (!isValidIncidentDate(customDate, today)) err.incidentDate = tx('error_invalidDate')
        else updateForm({ incidentDate: customDate })
      } else if (preset === 'month_year') {
        // Date was already set when both month and year were chosen.
        if (!formData.incidentDate) err.incidentDate = tx('error_enterDate')
        else if (formData.incidentDate > today) err.incidentDate = tx('error_futureDate')
        else if (!isValidIncidentDate(formData.incidentDate, today)) err.incidentDate = tx('error_invalidDate')
      }
      if (!formData.venue.state) err.state = t('intake.selectStateError')
      if (!formData.venue.county?.trim()) err.county = t('intake.enterCounty')
      // Narrative text is optional but recommended; contact fields live on this combined screen too.
      const email = formData.contact.email.trim()
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err.contactEmail = tx('contact_emailError')
      else if (email && emailDeliverable === 'bad') err.contactEmail = tx('contact_emailUndeliverable')
      const phoneError = validatePhoneField(formData.contact.phone)
      if (phoneError) err.contactPhone = tx('contact_phoneError')
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
    if (currentStep === 'when' && (formData.contact.email.trim() || formData.contact.phone.trim())) {
      void syncLead()
    }
    if (returnToReviewFromStep === currentStep) {
      setReturnToReviewFromStep(null)
      setCurrentStep('consent')
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
      // Bills uploaded during intake are OCR'd to an actual documented total. Send
      // the greater of the self-reported estimate and the documented total so the
      // stored valuation reflects real bills immediately (the backend recalculation
      // later reconciles this once files are persisted and re-OCR'd server-side).
      const billsDocTotalForSubmit = docFinancials['bills']?.total || 0
      const medicalChargesForSubmit = Math.max(medicalBillEstimate, billsDocTotalForSubmit)
      const futureMedicalEstimate = FUTURE_MEDICAL_RANGE_OPTIONS.find(option => option.value === formData.insuranceCoverage.futureMedicalRange)?.estimate || 0
      // Wage loss: send the greater of the self-reported estimate and the documented figure
      // (uploaded pay stub's weekly income × missed-work duration). Mirrors med_charges.
      const selfReportedWageLoss = Number(String(formData.casePosture.lostWagesEstimate || '').replace(/[$,]/g, '')) || 0
      const wageWeeklyIncomeForSubmit = docFinancials['wage_verification']?.weeklyIncome || 0
      const documentedWageLossForSubmit = Math.round(wageWeeklyIncomeForSubmit * (MISSED_WORK_WEEKS[formData.casePosture.missedWork as string] || 0))
      const wageLossForSubmit = Math.max(selfReportedWageLoss, documentedWageLossForSubmit)
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
            otherDescription: formData.injuryDetails.bodyPartsOther.trim() || undefined,
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
          med_charges: medicalChargesForSubmit,
          intake_med_charges: medicalBillEstimate,
          // When bills were uploaded and OCR'd at intake we already have a documented
          // total, so flag it as partially_documented; otherwise it's a self-reported
          // range/estimate. Once files persist server-side, runCaseRecalculation
          // reconciles this to documented/partially_documented. The valuation weights
          // confidence by this so early estimates aren't treated as verified.
          med_charges_source: billsDocTotalForSubmit > 0 ? 'partially_documented' as const : 'self_reported' as const,
          bills_complete: formData.insuranceCoverage.billsComplete === 'yes',
          future_medical: futureMedicalEstimate,
          medical_bill_range: formData.insuranceCoverage.medicalBillRange,
          future_medical_range: formData.insuranceCoverage.futureMedicalRange,
          estimated_wage_loss: wageLossForSubmit,
          wage_loss: wageLossForSubmit,
          // Property/rental damage for vehicle cases. Previously this only fed the
          // client-side preview and never reached the backend valuation.
          estimated_property_damage: formData.injuryType === 'vehicle' ? computePropertyDamage(formData.branch) : 0,
        },
        insurance: {
          health_coverage: formData.insuranceCoverage.healthCoverage,
          other_party_insured: formData.insuranceCoverage.otherPartyInsured,
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
          pip_coverage: formData.insuranceCoverage.pipCoverage,
          has_pip_coverage: formData.insuranceCoverage.pipCoverage === 'yes',
          med_pay_coverage: formData.insuranceCoverage.medPayCoverage,
          has_med_pay_coverage: formData.insuranceCoverage.medPayCoverage === 'yes',
          plaintiff_auto_carrier: formData.insuranceCoverage.plaintiffAutoCarrier?.trim() || undefined,
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
            documentedWeeklyIncome: wageWeeklyIncomeForSubmit || undefined,
            documentedAmount: documentedWageLossForSubmit || undefined,
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
      // Prediction and analysis are best-effort background work; the results page
      // recomputes them. Swallow failures so they never surface as console errors
      // during submission (guests can legitimately 401 on these endpoints).
      predict(id).catch(() => {})
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
    field: 'bodyParts' | 'imaging' | 'procedures' | 'futureTreatment' | 'concussionSymptoms' | 'lifestyleImpact' | 'shoulderFindings' | 'backFindings' | 'diagnoses' | 'currentSymptoms',
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
  const isSlipFall = it === 'slip_fall'
  const isWorkplace = it === 'workplace'
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
        return !!formData.incidentDatePreset || !!formData.incidentDate || !!formData.venue.state || !!formData.venue.county || !!formData.venue.city || formData.medicalTreatment.length > 0
      case 'injury_severity':
        return (
          !!formData.injurySeverity ||
          formData.injuryDetails.bodyParts.length > 0
        )
      case 'injury_details':
        return (
          formData.injuryDetails.imaging.length > 0 ||
          formData.injuryDetails.diagnoses.length > 0 ||
          formData.injuryDetails.currentSymptoms.length > 0 ||
          !!formData.injuryDetails.recoveryStatus ||
          formData.injuryDetails.lifestyleImpact.length > 0 ||
          formData.injuryDetails.futureTreatment.length > 0
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
          formData.branch.doctorVisit ||
          formData.branch.faultParty ||
          formData.branch.workplaceCause ||
          formData.branch.reportedToEmployer ||
          formData.branch.missedWorkWC ||
          formData.branch.wcClaimFiled ||
          formData.branch.thirdParty ||
          formData.branch.animalType ||
          formData.branch.brokeSkin ||
          formData.branch.dogPhotos ||
          formData.branch.anotherDoctorConfirmed ||
          formData.branch.productPhotos ||
          formData.branch.productMedicalTreatment ||
          formData.branch.exposureLocation ||
          formData.branch.reportedTo ||
          formData.branch.priorIncidents ||
          formData.branch.securityCameras ||
          formData.branch.injuriesTreated ||
          formData.branch.incidentReport ||
          formData.branch.slipPhotos ||
          formData.branch.whoCaused ||
          formData.branch.otherPhotos ||
          formData.branch.otherMedicalTreatment
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
          <div className="space-y-1.5">
            <p className="text-center font-display text-[16px] font-semibold text-gray-900 sm:text-[19px]">{t('intake.injuryType')}</p>
            <p className="text-center text-[11px] leading-snug text-gray-500 sm:text-xs">{t('intake.injuryTypeHelp')}</p>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
              {INJURY_TYPES.map(({ value, labelKey, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={formData.injuryType === value}
                  // Prevent the browser from scroll-jumping the tile into view on click,
                  // while still keeping it focused (preventScroll) for keyboard users.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.currentTarget.focus({ preventScroll: true })
                    if (formData.injuryType === value) {
                      // Deselecting clears the type-specific branch answers too, so
                      // nothing orphaned (e.g. a police-report flag) lingers.
                      updateForm({ injuryType: '', claimType: '', branch: {} })
                      return
                    }
                    // Switching injury types must reset branch. Branch holds
                    // type-specific answers (police report, witnesses, crash type,
                    // etc.); carrying them into a different injury type produced
                    // false positives such as "Police Report: Included" in the
                    // damages step for a case where none was ever provided.
                    updateForm({
                      injuryType: value,
                      claimType: injuryTypeToClaimType(value),
                      branch: {},
                    })
                  }}
                  className={`relative flex h-20 flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] px-1.5 py-1.5 shadow-sm transition-all focus-visible:ring-inset focus-visible:ring-offset-0 active:scale-[0.99] sm:h-24 sm:gap-1.5 sm:px-3 sm:py-2 ${
                    formData.injuryType === value ? 'border-brand-600 bg-brand-50 shadow' : 'border-gray-300 bg-white hover:border-brand-500 hover:shadow-md'
                  }`}
                >
                  {formData.injuryType === value && <Check className="absolute right-1.5 top-1.5 h-4 w-4 text-brand-600" aria-hidden />}
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${formData.injuryType === value ? 'text-brand-700' : 'text-brand-600'}`} />
                  <span className="text-center text-[12px] font-semibold leading-tight sm:text-[16px] sm:font-medium sm:leading-snug">{t(`intake.${labelKey}`)}</span>
                </button>
              ))}
            </div>
          </div>
        )

      case 'when': {
        const detectedDisplay = detectedLocation ? [detectedLocation.city, detectedLocation.county, detectedLocation.state].filter(Boolean).join(', ') : ''
        const countyOptions = formData.venue.state ? getCountiesForState(formData.venue.state) : []
        const emailSuggestion = suggestEmail(formData.contact.email)
        const NARRATIVE_MAX = 1000
        const narrativeLen = formData.narrative.length
        // Helpful-detail prompts adapt to the incident type chosen in "What happened?".
        const narrativeHints = isVehicle
          ? [tx('hint_whoCaused'), tx('hint_policeCalled'), tx('hint_witnesses'), tx('hint_photos')]
          : isSlipFall
            ? [tx('hint_slip_cause'), tx('hint_slip_reported'), tx('hint_witnesses'), tx('hint_slip_photos')]
            : isWorkplace
            ? [tx('hint_wp_what'), tx('hint_wp_reported'), tx('hint_wp_missedWork'), tx('hint_wp_thirdParty')]
            : isMedmal
              ? [tx('hint_medmal_provider'), tx('hint_medmal_wrong'), tx('hint_medmal_when'), tx('hint_medmal_records')]
              : isDogBite
                ? [tx('hint_dog_owner'), tx('hint_dog_reported'), tx('hint_witnesses'), tx('hint_dog_photos')]
                : isProduct
                  ? [tx('hint_product_what'), tx('hint_product_malfunction'), tx('hint_product_have'), tx('hint_product_receipt')]
                  : isAssault
                    ? [tx('hint_assault_where'), tx('hint_policeCalled'), tx('hint_witnesses'), tx('hint_assault_security')]
                    : isToxic
                      ? [tx('hint_toxic_substance'), tx('hint_toxic_where'), tx('hint_toxic_symptoms'), tx('hint_medmal_records')]
                      : [tx('hint_whatHappened'), tx('hint_whoCaused'), tx('hint_witnesses'), tx('hint_photos')]
        const isoOffset = (opts: { days?: number; months?: number; years?: number }) => {
          const d = new Date()
          if (opts.days) d.setDate(d.getDate() - opts.days)
          if (opts.months) d.setMonth(d.getMonth() - opts.months)
          if (opts.years) d.setFullYear(d.getFullYear() - opts.years)
          return toLocalIso(d)
        }
        const datePresets = [
          { key: 'today', label: tx('datePreset_today'), iso: isoToday() },
          { key: 'lastWeek', label: tx('datePreset_lastWeek'), iso: isoOffset({ days: 7 }) },
          { key: 'lastMonth', label: tx('datePreset_lastMonth'), iso: isoOffset({ months: 1 }) },
          { key: 'lastYear', label: tx('datePreset_lastYear'), iso: isoOffset({ years: 1 }) },
        ]
        const applyPresetDate = (iso: string) => {
          setCustomDate(iso)
          updateForm({ incidentDatePreset: 'custom', incidentDate: iso })
        }
        const venueStateName = US_STATES.find(s => s.code === formData.venue.state)?.name
        const whyAskItems = [
          { Icon: CalendarClock, title: tx('whyAsk_deadline_t'), desc: tx('whyAsk_deadline_d') },
          { Icon: Users, title: tx('whyAsk_match_t'), desc: tx('whyAsk_match_d') },
          { Icon: Activity, title: tx('whyAsk_local_t'), desc: tx('whyAsk_local_d') },
        ]
        return (
          <div className="mx-auto w-full max-w-6xl">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-6">
              {/* Main form */}
              <div className="space-y-5">
                {/* Mobile-only: collapsed "Why we ask this" so the rail does not add a long scroll under the form */}
                <details className="group rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/40 lg:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-slate-100">
                    <span className="flex items-center gap-1.5"><Info className="h-4 w-4 text-brand-600" aria-hidden /> {tx('whyAsk_title')}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="space-y-3 px-3 pb-3">
                    {whyAskItems.map(({ Icon, title, desc }) => (
                      <div key={title} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15"><Icon className="h-4 w-4" aria-hidden /></span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">{title}</p>
                          <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
                {/* Section 1: When */}
                <div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15">
                      <CalendarDays className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-[15px] font-semibold leading-tight text-gray-900 dark:text-slate-100 sm:text-[17px]">1. {tx('when_heading')}</p>
                      <p className="mt-0.5 text-xs leading-snug text-gray-500 sm:text-sm">{tx('when_helper')}</p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:pl-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] lg:items-start">
                    <div>
                      {/* Exact date drives the filing deadline, so lead with it. */}
                      <div className={`rounded-xl border px-3 py-1.5 transition-colors focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 ${errors.incidentDate ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300 dark:border-slate-600'}`}>
                        <label htmlFor="incident-exact-date" className="block !text-[11px] font-medium text-gray-500">{tx('when_selectDate')}</label>
                        <input
                          id="incident-exact-date"
                          type="date"
                          min={MIN_INCIDENT_DATE}
                          max={isoToday()}
                          value={formData.incidentDatePreset === 'custom' ? customDate : ''}
                          onChange={e => {
                            const val = e.target.value
                            setCustomDate(val)
                            if (val) updateForm({ incidentDatePreset: 'custom', incidentDate: val })
                            else updateForm({ incidentDatePreset: '', incidentDate: '' })
                          }}
                          className="!min-h-0 w-full !border-0 !bg-transparent !p-0 !text-base text-gray-900 focus:!ring-0 dark:text-slate-100"
                        />
                      </div>
                      {/* Quick date presets */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {datePresets.map(p => {
                          const active = formData.incidentDatePreset === 'custom' && customDate === p.iso
                          return (
                            <button
                              key={p.key}
                              type="button"
                              onClick={() => applyPresetDate(p.iso)}
                              className={`!min-h-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${active ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/50 dark:bg-brand-500/15 dark:text-brand-300' : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800/60'}`}
                            >
                              {p.label}
                            </button>
                          )
                        })}
                      </div>
                      <div className="mt-2 min-h-[1.25rem]">
                        {whenDateChosen && !formData.venue.state ? (
                          <p className="text-xs text-gray-500">{tx('when_addLocationForDeadline')}</p>
                        ) : !whenDateChosen ? (
                          <p className="flex items-center gap-1.5 text-xs text-gray-500">
                            <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" aria-hidden /> {tx('when_dateReassure')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {/* Estimated filing deadline card */}
                    {hasFilingDeadline && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          <CalendarClock className="h-4 w-4 shrink-0" aria-hidden /> {tx('sol_estimatedFilingDeadline')}
                        </p>
                        <p className="mt-1 font-display text-xl font-bold text-emerald-800 dark:text-emerald-200">{filingDeadlineLong}</p>
                        {filingDaysRemaining != null && (
                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            {tx(filingDaysRemaining === 1 ? 'sol_dayRemainingShort' : 'sol_daysRemainingShort').replace('{days}', String(filingDaysRemaining))}
                          </p>
                        )}
                        <p className="mt-1.5 text-[11px] leading-snug text-emerald-700/80 dark:text-emerald-300/80">{tx('whenCard_estimateNote').replace('{state}', venueStateName || tx('whenCard_yourState'))}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: Briefly describe what happened */}
                <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15">
                      <MessageSquare className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-[15px] font-semibold leading-tight text-gray-900 dark:text-slate-100 sm:text-[17px]">2. {tx('narrative_heading')}</p>
                      <p className="mt-0.5 text-xs leading-snug text-gray-500 sm:text-sm">{tx('narrative_helper')}</p>
                    </div>
                  </div>
                  <div className="mt-2 sm:pl-12">
                    <div className="relative">
                      <textarea
                        value={formData.narrative}
                        onChange={e => updateForm({ narrative: e.target.value.slice(0, NARRATIVE_MAX) })}
                        placeholder={tx('narrative_placeholder')}
                        rows={3}
                        maxLength={NARRATIVE_MAX}
                        className="input w-full resize-none border-gray-300 py-2.5 pb-7 text-base leading-relaxed !min-h-[5.5rem] focus-visible:ring-inset focus-visible:ring-offset-0"
                      />
                      <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] tabular-nums text-gray-400">
                        {narrativeLen} / {NARRATIVE_MAX}
                      </span>
                    </div>
                    {/* Helpful details */}
                    <div className="mt-2 flex flex-nowrap items-center gap-x-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/50">
                      <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] font-semibold text-slate-500">
                        <Info className="h-3 w-3 text-slate-400" aria-hidden /> {tx('narrative_hintsLabel')}
                      </span>
                      {narrativeHints.map(hint => (
                        <span key={hint} className="flex min-w-0 items-center gap-0.5 truncate text-[10px] text-slate-600 dark:text-slate-300">
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" aria-hidden /> {hint}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section 3: Where */}
                <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15">
                      <MapPin className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-[15px] font-semibold leading-tight text-gray-900 dark:text-slate-100 sm:text-[17px]">3. {t('intake.where')}</p>
                      <p className="mt-0.5 text-xs leading-snug text-gray-500 sm:text-sm">{t('intake.whereHelp')}</p>
                    </div>
                  </div>
                  <div className="mt-2 sm:pl-12">
                    {detectedLocation && !locationAccepted && !formData.venue.state && (
                      <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
                        <p className="mb-2 text-sm font-medium text-slate-900">{t('intake.weDetectedLocation')} {detectedDisplay}</p>
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
                            className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                          >
                            {t('intake.useLocation')}
                          </button>
                          <button type="button" onClick={() => setDetectedLocation(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t('intake.change')}</button>
                        </div>
                      </div>
                    )}
                    {(!detectedLocation || locationAccepted || formData.venue.state) && (
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700"><MapPin className="h-4 w-4 text-brand-600" /> {t('intake.state')}</label>
                          <select
                            value={formData.venue.state}
                            onChange={e => {
                              const state = e.target.value
                              updateVenue({
                                state,
                                county: formData.venue.state !== state ? '' : formData.venue.county,
                              })
                            }}
                            className={`input w-full border-gray-300 focus-visible:ring-inset focus-visible:ring-offset-0 ${errors.state ? 'border-red-500' : ''}`}
                          >
                            <option value="">{t('intake.selectState')}</option>
                            {US_STATES.map(s => (<option key={s.code} value={s.code}>{s.name}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700"><Building2 className="h-4 w-4 text-brand-600" /> {t('intake.county')}</label>
                          {countyOptions.length > 0 ? (
                            <select value={formData.venue.county} onChange={e => updateVenue({ county: e.target.value })} className={`input w-full border-gray-300 focus-visible:ring-inset focus-visible:ring-offset-0 ${errors.county ? 'border-red-500' : ''}`}>
                              <option value="">{t('intake.searchCounty')}</option>
                              {(countyOptions ?? []).map(c => (<option key={c} value={c}>{c}</option>))}
                            </select>
                          ) : (
                            <input type="text" value={formData.venue.county} onChange={e => updateVenue({ county: e.target.value })} className={`input w-full border-gray-300 focus-visible:ring-inset focus-visible:ring-offset-0 ${errors.county ? 'border-red-500' : ''}`} placeholder={tx('where_countyPlaceholder')} />
                          )}
                        </div>
                        <div>
                          <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700"><MapPin className="h-4 w-4 text-brand-600" /> {t('intake.city')}</label>
                          <input type="text" value={formData.venue.city} onChange={e => updateVenue({ city: e.target.value })} className="input w-full border-gray-300 focus-visible:ring-inset focus-visible:ring-offset-0" placeholder={tx('where_cityPlaceholder')} />
                        </div>
                      </div>
                    )}
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                      <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden /> {tx('where_reassure')}
                    </p>
                  </div>
                </div>

                {/* Section 4: What treatment have you received? */}
                <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15">
                      <Stethoscope className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-[15px] font-semibold leading-tight text-gray-900 dark:text-slate-100 sm:text-[17px]">4. {tx('treatment_heading')}</p>
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">{tx('caseDetails_optionalBadge')}</span>
                      </div>
                      <p className="mt-0.5 text-xs leading-snug text-gray-500 sm:text-sm">{tx('treatment_helper')}</p>
                    </div>
                  </div>
                  <div className="mt-2 sm:pl-12">
                    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                      {MEDICAL_TREATMENT_OPTIONS.map(({ value }) => {
                        const Icon = TREATMENT_ICONS[value] ?? Check
                        const selected = formData.medicalTreatment.includes(value)
                        const fullWidth = value === 'none'
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleMedicalTreatment(value)}
                            className={`relative flex items-center justify-center shadow-sm transition-all focus-visible:ring-inset focus-visible:ring-offset-0 active:scale-[0.99] ${
                              fullWidth
                                ? 'col-span-3 flex-row gap-2 rounded-2xl border-[1.5px] px-3 py-2.5'
                                : 'flex-col gap-1.5 rounded-2xl border-[1.5px] px-2 py-2.5'
                            } ${
                              selected ? 'border-brand-600 bg-brand-50 shadow' : 'border-gray-200 bg-white hover:border-brand-400 hover:shadow-md'
                            }`}
                          >
                            {selected && !fullWidth && <Check className="absolute right-1.5 top-1.5 h-4 w-4 text-brand-600" aria-hidden />}
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-brand-100' : 'bg-brand-50'}`}>
                              <Icon className={`h-5 w-5 ${selected ? 'text-brand-700' : 'text-brand-600'}`} aria-hidden />
                            </span>
                            <span className="text-[13px] font-semibold leading-tight text-gray-900">{getOptionLabel(MEDICAL_TREATMENT_OPTIONS, value)}</span>
                            {selected && fullWidth && <Check className="h-4 w-4 text-brand-600" aria-hidden />}
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-2 text-[11px] leading-snug text-gray-500">{tx('treatment_tip')}</p>
                  </div>
                </div>

                {/* Save your progress (optional) — kept visually secondary to the primary Next action */}
                <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <Save className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{tx('contact_saveTitle')}</p>
                      <p className="mt-0.5 text-xs leading-snug text-gray-500">{tx('contact_saveDesc')}</p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-2 sm:max-w-md sm:pl-[2.375rem]">
                      {/* Email */}
                      <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${contactMethod === 'email' ? 'border-brand-300 bg-brand-50/40 dark:border-brand-500/40 dark:bg-brand-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                        <input
                          type="radio"
                          name="contact-method"
                          checked={contactMethod === 'email'}
                          onChange={() => setContactMethod('email')}
                          aria-label={tx('contact_emailShort')}
                          className="!h-4 !w-4 !min-h-0 shrink-0 accent-brand-600"
                        />
                        <Mail className={`h-4 w-4 shrink-0 ${contactMethod === 'email' ? 'text-brand-600' : 'text-slate-400'}`} aria-hidden />
                        <span className="shrink-0 text-sm font-medium text-gray-700 dark:text-slate-200">{tx('contact_emailShort')}</span>
                        <input
                          id="contact-email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          value={formData.contact.email}
                          onFocus={() => setContactMethod('email')}
                          onBlur={saveContactProgress}
                          onChange={e => updateForm({ contact: { ...formData.contact, email: e.target.value } })}
                          placeholder="name@email.com"
                          aria-invalid={!!errors.contactEmail}
                          className="!min-h-0 min-w-0 flex-1 !border-0 !bg-transparent !p-0 !text-sm text-gray-900 placeholder:text-gray-400 focus:!ring-0 dark:text-slate-100"
                        />
                      </div>
                      {/* Phone */}
                      <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${contactMethod === 'phone' ? 'border-brand-300 bg-brand-50/40 dark:border-brand-500/40 dark:bg-brand-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                        <input
                          type="radio"
                          name="contact-method"
                          checked={contactMethod === 'phone'}
                          onChange={() => setContactMethod('phone')}
                          aria-label={tx('contact_phoneShort')}
                          className="!h-4 !w-4 !min-h-0 shrink-0 accent-brand-600"
                        />
                        <Phone className={`h-4 w-4 shrink-0 ${contactMethod === 'phone' ? 'text-brand-600' : 'text-slate-400'}`} aria-hidden />
                        <span className="shrink-0 text-sm font-medium text-gray-700 dark:text-slate-200">{tx('contact_phoneShort')}</span>
                        <input
                          id="contact-phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={formData.contact.phone}
                          onFocus={() => setContactMethod('phone')}
                          onBlur={saveContactProgress}
                          onChange={e => updateForm({ contact: { ...formData.contact, phone: formatPhoneInput(e.target.value) } })}
                          placeholder="(555) 123-4567"
                          aria-invalid={!!errors.contactPhone}
                          className="!min-h-0 min-w-0 flex-1 !border-0 !bg-transparent !p-0 !text-sm text-gray-900 placeholder:text-gray-400 focus:!ring-0 dark:text-slate-100"
                        />
                      </div>
                      {errors.contactEmail && (
                        <p className="text-xs text-red-600">{errors.contactEmail}</p>
                      )}
                      {!errors.contactEmail && emailSuggestion && (
                        <p className="text-xs text-amber-700">
                          {tx('contact_emailDidYouMean')}{' '}
                          <button
                            type="button"
                            onClick={() => updateForm({ contact: { ...formData.contact, email: emailSuggestion } })}
                            className="!min-h-0 font-semibold underline underline-offset-2 hover:opacity-80"
                          >
                            {emailSuggestion}
                          </button>
                          ?
                        </p>
                      )}
                      {!errors.contactEmail && !emailSuggestion && emailDeliverable === 'bad' && (
                        <p className="text-xs text-amber-700">{tx('contact_emailUndeliverable')}</p>
                      )}
                      {errors.contactPhone && (
                        <p className="text-xs text-red-600">{errors.contactPhone}</p>
                      )}
                    {/* Trust badges */}
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" aria-hidden /> {tx('badge_private')}</span>
                      <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {tx('badge_neverShared')}</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden /> {tx('badge_noObligation')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Why we ask this (desktop only; mobile uses the collapsible above) */}
              <aside className="hidden space-y-3 lg:block lg:sticky lg:top-2 lg:self-start">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('whyAsk_title')}</p>
                  <ul className="mt-3 space-y-3">
                    {whyAskItems.map(({ Icon, title, desc }) => (
                      <li key={title} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15"><Icon className="h-4 w-4" aria-hidden /></span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">{title}</p>
                          <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300"><ShieldCheck className="h-4 w-4 shrink-0" aria-hidden /> {tx('whyAsk_secure_t')}</p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-600 dark:text-slate-300">{tx('whyAsk_secure_d')}</p>
                </div>
              </aside>
            </div>
          </div>
        )
      }

      case 'injury_severity':
      case 'injury_details': {
        const isSeverityStep = currentStep === 'injury_severity'
        const hasHeadInjury = formData.injuryDetails.bodyParts.includes('head_concussion')
        const hasShoulderInjury = formData.injuryDetails.bodyParts.includes('shoulder')
        const hasBackInjury = formData.injuryDetails.bodyParts.includes('lower_back')
        const hasInjectionTreatment = formData.medicalTreatment.includes('injections') || formData.injuryDetails.imaging.includes('injections') || formData.injuryDetails.procedures.some(item => item !== 'none')
        const hasSurgeryTreatment = formData.medicalTreatment.includes('surgery') || formData.injuryDetails.imaging.includes('surgery') || formData.injuryDetails.futureTreatment.includes('surgery') || !!formData.injuryDetails.surgeryStatus
        const bodyPartDisplay: Record<string, { emoji?: string; label: string }> = {
          head_concussion: { emoji: '🧠', label: tx('bodyShort_head') },
          neck: { emoji: '🦴', label: tx('bodyShort_neck') },
          lower_back: { emoji: '🦴', label: tx('bodyShort_back') },
          shoulder: { emoji: '💪', label: tx('bodyShort_shoulder') },
          knee: { emoji: '🦵', label: tx('bodyShort_knee') },
          hand_wrist: { emoji: '✋', label: tx('bodyShort_hand') },
          hip: { emoji: '🦴', label: tx('bodyShort_hip') },
          other: { emoji: '🩹', label: tx('optionOther') },
        }
        const tileClass = (selected: boolean) =>
          `flex items-center gap-2 rounded-xl border px-3 py-0.5 text-left transition-colors focus-visible:ring-inset focus-visible:ring-offset-0 ${selected ? 'border-brand-500 bg-brand-50/70 dark:border-brand-500/50 dark:bg-brand-500/10' : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'}`
        const renderCheck = (on: boolean) =>
          on ? (
            <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
          ) : (
            <span className="h-4 w-4 shrink-0" aria-hidden />
          )
        const treatmentIcons: Record<string, LucideIcon> = { mri: Activity, ct_scan: Scan, xray: Bone, physical_therapy: PersonStanding, chiropractic: Stethoscope, injections: Syringe, surgery: Scissors, other_treatment: Pill }
        const symptomIcons: Record<string, LucideIcon> = { pain: HeartPulse, stiffness: Bone, limited_rom: RotateCw, numbness: Activity, weakness: Dumbbell, headaches: Brain, other: Pencil }
        const diagnosisIcons: Record<string, LucideIcon> = { herniation: Bone, radiculopathy: Activity, muscle_strain: Dumbbell, tear: Bone, whiplash: PersonStanding, concussion: Brain, fracture: Bone, tbi: Brain, other_diagnosis: Pill }
        const lifeAreaIcons: Record<string, LucideIcon> = { unable_to_work_normally: Briefcase, sleep_disruption: Moon, exercise_limitations: Dumbbell, driving_difficulty: Car, household_chores: Building2, missed_family: CalendarDays }
        const futureTreatmentIcons: Record<string, LucideIcon> = { additional_pt: PersonStanding, mri: Scan, injections: Syringe, surgery: Scissors, specialist: Stethoscope, additional_testing: ClipboardCheck, long_term_treatment: CalendarClock, none: Clock, not_sure: HelpCircle }
        const radioDot = (on: boolean) =>
          on ? (
            <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
          ) : (
            <span className="h-4 w-4 shrink-0" aria-hidden />
          )
        const radioCardClass = (selected: boolean) =>
          `flex items-center gap-2 rounded-xl border px-3 py-0.5 text-left transition-colors focus-visible:ring-inset focus-visible:ring-offset-0 ${selected ? 'border-brand-500 bg-brand-50/70 dark:border-brand-500/50 dark:bg-brand-500/10' : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'}`

        // --- Case Snapshot + sidebar metrics (derived from selections) ---
        const idd = formData.injuryDetails
        const treatmentsSelected = new Set([...idd.imaging, ...formData.medicalTreatment].filter(v => v !== 'none')).size
        const diagnosesSelected = idd.diagnoses.length
        const symptomsSelected = idd.currentSymptoms.length
        const lifeAreasSelected = idd.lifestyleImpact.length
        const bodyCount = idd.bodyParts.length
        const seriousDx = idd.diagnoses.some(d => ['tear', 'herniation', 'fracture', 'tbi'].includes(d))
        let sevScore = bodyCount * 8 + treatmentsSelected * 6 + diagnosesSelected * 8 + lifeAreasSelected * 3 + symptomsSelected * 3
        if (seriousDx) sevScore += 15
        if (hasSurgeryTreatment) sevScore += 18
        if (idd.recoveryStatus === 'getting_worse') sevScore += 10
        if (idd.recoveryStatus === 'fully_recovered') sevScore -= 12
        sevScore = Math.max(0, Math.min(100, sevScore))
        const sevStars = Math.max(0, Math.min(5, Math.round(sevScore / 20)))
        const sevLevel = sevScore === 0
          ? tx('injuryDetails_sevUnknown')
          : sevScore >= 67 ? tx('injuryDetails_sevSerious') : sevScore >= 34 ? tx('injuryDetails_sevModerate') : tx('injuryDetails_sevMinor')
        const completenessGroups = [bodyCount > 0, treatmentsSelected > 0, diagnosesSelected > 0, symptomsSelected > 0, !!idd.recoveryStatus, lifeAreasSelected > 0, idd.futureTreatment.length > 0]
        const filledGroups = completenessGroups.filter(Boolean).length
        const valueConfidence = filledGroups === 0 ? 0 : Math.min(90, Math.round((filledGroups / completenessGroups.length) * 75) + 15)
        const docLevel = filledGroups <= 2 ? tx('injuryDetails_docEarly') : filledGroups <= 4 ? tx('injuryDetails_docBuilding') : tx('injuryDetails_docStrong')
        const bodyNames = idd.bodyParts.map(v => bodyPartDisplay[v]?.label || v)
        const dxNames = DIAGNOSIS_OPTIONS.filter(o => idd.diagnoses.includes(o.value)).map(o => o.label)
        const txNames = Array.from(new Set([
          ...MEDICAL_TREATMENT_OPTIONS.filter(o => o.value !== 'none' && formData.medicalTreatment.includes(o.value)).map(o => o.label),
          ...TREATMENT_RECEIVED_OPTIONS.filter(o => idd.imaging.includes(o.value)).map(o => o.label),
        ]))
        const recoveryLabel = RECOVERY_STATUS_OPTIONS.find(o => o.value === idd.recoveryStatus)?.label || ''
        const hasAnySelection = bodyCount > 0 || treatmentsSelected > 0 || diagnosesSelected > 0 || symptomsSelected > 0
        // Approximate marker coordinates on the body diagram (viewBox 0 0 140 250).
        // Symmetric body parts (shoulders, hands/wrists, knees) mark both sides of
        // the diagram; midline parts (head, neck, back, hip) mark a single point.
        const bodyMarkers: Record<string, { cx: number; cy: number }[]> = {
          head_concussion: [{ cx: 70, cy: 26 }],
          neck: [{ cx: 70, cy: 50 }],
          shoulder: [{ cx: 46, cy: 64 }, { cx: 94, cy: 64 }],
          hand_wrist: [{ cx: 30, cy: 128 }, { cx: 110, cy: 128 }],
          lower_back: [{ cx: 70, cy: 112 }],
          hip: [{ cx: 70, cy: 138 }],
          knee: [{ cx: 58, cy: 192 }, { cx: 82, cy: 192 }],
          other: [{ cx: 70, cy: 92 }],
        }
        const snapshotCards = [
          { key: 'severity', icon: Star, label: tx('injuryDetails_metricSeverity'), value: sevLevel, sub: '★★★★★'.slice(0, sevStars) + '☆☆☆☆☆'.slice(0, 5 - sevStars), tone: sevScore >= 67 ? 'text-rose-600' : sevScore >= 34 ? 'text-amber-600' : 'text-emerald-600' },
          { key: 'doc', icon: FileText, label: tx('injuryDetails_metricDocumentation'), value: docLevel, sub: tx('injuryDetails_metricKeepBuilding'), tone: 'text-brand-600' },
          { key: 'confidence', icon: TrendingUp, label: tx('injuryDetails_metricValueConfidence'), value: `${valueConfidence}%`, sub: tx('injuryDetails_metricMoreEvidence'), tone: 'text-brand-600' },
        ]
        // Liability strength only appears once the user has given a real fault signal on an earlier step.
        // Until then we hide the card rather than show a meaningless "Unknown / More info needed" placeholder.
        const faultBelief = formData.casePosture?.faultBelief
        const comparativeFault = formData.casePosture?.comparativeFault
        const faultParty = formData.branch?.faultParty
        const liabilityCard =
          comparativeFault === 'yes' || faultParty === 'me' || faultParty === 'mostly_me'
            ? { value: tx('injuryDetails_liabLimited'), sub: tx('injuryDetails_liabLimitedSub'), tone: 'text-rose-600' }
            : faultBelief === 'shared_fault' || faultParty === 'shared' || comparativeFault === 'possibly'
            ? { value: tx('injuryDetails_liabShared'), sub: tx('injuryDetails_liabSharedSub'), tone: 'text-amber-600' }
            : faultBelief === 'other_party' || faultParty === 'other_driver' || comparativeFault === 'no'
            ? { value: tx('injuryDetails_liabFavorable'), sub: tx('injuryDetails_liabFavorableSub'), tone: 'text-emerald-600' }
            : null
        if (liabilityCard) {
          snapshotCards.unshift({ key: 'liability', icon: ShieldCheck, label: tx('injuryDetails_metricLiability'), ...liabilityCard })
        }
        return (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                <HeartPulse className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-display text-[15px] font-semibold leading-tight text-gray-900 dark:text-slate-100 sm:text-[17px]">{isSeverityStep ? tx('injuryDetails_heading') : tx('injuryTreatment_heading')}</p>
                <p className="mt-0.5 text-xs leading-snug text-gray-500 sm:text-sm">{isSeverityStep ? tx('injuryDetails_helper') : tx('injuryTreatment_helper')}</p>
              </div>
            </div>

            {/* Case Snapshot metric bar */}
            <div className={`grid grid-cols-2 gap-2 ${snapshotCards.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {snapshotCards.map(({ key, icon: Icon, label, value, sub, tone }) => (
                <div key={key} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="flex items-center gap-1 text-[9px] font-semibold uppercase leading-none tracking-wide text-gray-400">
                    <Icon className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">{label}</span>
                  </div>
                  <p className={`mt-0.5 font-display text-[13px] font-bold leading-none ${tone}`}>{value}</p>
                  <p className="mt-0.5 truncate text-[9px] leading-none text-gray-400">{sub}</p>
                </div>
              ))}
            </div>

            {/* Two-column body: form + sidebar */}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
              {/* ---------- Main column ---------- */}
              <div className="space-y-4">

            {isSeverityStep ? (
            <>
            {/* 1. How serious are your injuries? */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <SectionHeader icon={HeartPulse} number={1} title={t('intake.injurySeverity')} helper={tx('injurySeverity_helper')} />
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
                {INJURY_SEVERITY_OPTIONS.map(({ value, labelKey }) => {
                  const { main, desc } = splitLabel(t(`intake.${labelKey}`))
                  const Icon = SEVERITY_ICONS[value] ?? HelpCircle
                  const selected = formData.injurySeverity === value
                  const fullWidth = value === 'unsure'
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => updateForm({ injurySeverity: selected ? '' : value })}
                      className={`relative flex shadow-sm transition-all focus-visible:ring-inset focus-visible:ring-offset-0 active:scale-[0.99] ${
                        fullWidth
                          ? 'col-span-2 flex-row items-center justify-center gap-2 rounded-2xl border-[1.5px] px-3 py-2.5 sm:col-span-4'
                          : 'flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] px-2 py-2.5 text-center'
                      } ${
                        selected ? 'border-brand-600 bg-brand-50 shadow' : 'border-gray-200 bg-white hover:border-brand-400 hover:shadow-md'
                      }`}
                    >
                      {selected && !fullWidth && <Check className="absolute right-1.5 top-1.5 h-4 w-4 text-brand-600" aria-hidden />}
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-brand-100' : 'bg-brand-50'}`}>
                        <Icon className={`h-5 w-5 ${selected ? 'text-brand-700' : 'text-brand-600'}`} aria-hidden />
                      </span>
                      <span className="text-[13px] font-semibold leading-tight text-gray-900">{main}</span>
                      {desc && !fullWidth && <span className="text-[11px] leading-tight text-gray-500">{desc}</span>}
                      {selected && fullWidth && <Check className="h-4 w-4 text-brand-600" aria-hidden />}
                    </button>
                  )
                })}
              </div>
              {errors.injurySeverity && <p className="mt-2 text-xs text-red-600">{errors.injurySeverity}</p>}
            </div>

            {/* 2. Where are you injured? */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <SectionHeader number={2} title={tx('injuryDetails_whereInjured')} helper={tx('injuryDetails_whereInjuredHelper')} />
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {BODY_PART_OPTIONS.map(({ value, label }) => {
                  const selected = formData.injuryDetails.bodyParts.includes(value)
                  const disp = bodyPartDisplay[value]
                  return (
                    <button key={value} type="button" aria-pressed={selected} onClick={() => toggleInjuryDetail('bodyParts', value)} className={tileClass(selected)}>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs dark:bg-slate-800" aria-hidden>{disp?.emoji || '•'}</span>
                      <span className="min-w-0 flex-1 text-xs font-semibold text-gray-800 dark:text-slate-200">{disp?.label || label}</span>
                      {renderCheck(selected)}
                    </button>
                  )
                })}
              </div>

              {formData.injuryDetails.bodyParts.includes('other') && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-brand-600 dark:bg-slate-800"><Pencil className="h-3.5 w-3.5" aria-hidden /></span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">{tx('injuryDetails_otherInjuryDescribe')}</span>
                  </div>
                  <textarea
                    value={formData.injuryDetails.bodyPartsOther}
                    onChange={(e) => updateForm({ injuryDetails: { ...formData.injuryDetails, bodyPartsOther: e.target.value } })}
                    placeholder={tx('injuryDetails_otherInjuryPlaceholder')}
                    rows={3}
                    className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              {hasHeadInjury && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('injuryDetails_headSymptoms')}</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {CONCUSSION_SYMPTOM_OPTIONS.map(({ value, label }) => {
                      const selected = formData.injuryDetails.concussionSymptoms.includes(value)
                      return (
                        <button key={value} type="button" aria-pressed={selected} onClick={() => toggleInjuryDetail('concussionSymptoms', value)} className={tileClass(selected)}>
                          <span className="min-w-0 flex-1 text-xs font-semibold text-gray-800 dark:text-slate-200">{label}</span>
                          {renderCheck(selected)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {hasShoulderInjury && (
                <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-500/30 dark:bg-indigo-500/10">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('injuryDetails_shoulderDetails')}</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {SHOULDER_FINDING_OPTIONS.map(({ value, label }) => {
                      const selected = formData.injuryDetails.shoulderFindings.includes(value)
                      return (
                        <button key={value} type="button" aria-pressed={selected} onClick={() => toggleInjuryDetail('shoulderFindings', value)} className={tileClass(selected)}>
                          <span className="min-w-0 flex-1 text-xs font-semibold text-gray-800 dark:text-slate-200">{label}</span>
                          {renderCheck(selected)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {hasBackInjury && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('injuryDetails_backDetails')}</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {BACK_FINDING_OPTIONS.map(({ value, label }) => {
                      const selected = formData.injuryDetails.backFindings.includes(value)
                      return (
                        <button key={value} type="button" aria-pressed={selected} onClick={() => toggleInjuryDetail('backFindings', value)} className={tileClass(selected)}>
                          <span className="min-w-0 flex-1 text-xs font-semibold text-gray-800 dark:text-slate-200">{label}</span>
                          {renderCheck(selected)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            </>
            ) : (
            <>
            {/* 1. Treatment received — recap of step 2 selections + only the extra imaging detail (de-duped) */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <SectionHeader number={1} title={tx('injuryDetails_treatmentReceived')} />
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{tx('injuryDetails_treatmentRecapTitle')}</p>
              {(() => {
                const picked = MEDICAL_TREATMENT_OPTIONS.filter(o => o.value !== 'none' && formData.medicalTreatment.includes(o.value))
                return picked.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {picked.map(o => {
                      const Icon = treatmentIcons[o.value] || Stethoscope
                      return (
                        <span key={o.value} className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                          <Icon className="h-3 w-3" aria-hidden />{o.label}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-gray-400">{tx('injuryDetails_treatmentRecapEmpty')}</p>
                )
              })()}
              <p className="mt-4 font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('injuryDetails_imagingDetailQuestion')}</p>
              <p className="mt-0.5 text-xs text-gray-500">{tx('injuryDetails_imagingDetailHelper')}</p>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {TREATMENT_RECEIVED_OPTIONS.filter(o => ['ct_scan', 'xray', 'chiropractic', 'other_treatment'].includes(o.value)).map(({ value, label }) => {
                  const selected = formData.injuryDetails.imaging.includes(value)
                  const Icon = treatmentIcons[value] || Stethoscope
                  return (
                    <button key={value} type="button" aria-pressed={selected} onClick={() => toggleInjuryDetail('imaging', value)} className={tileClass(selected)}>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-brand-600 dark:bg-slate-800"><Icon className="h-3.5 w-3.5" aria-hidden /></span>
                      <span className="min-w-0 flex-1 text-xs font-semibold leading-tight text-gray-800 dark:text-slate-200">{label}</span>
                      {renderCheck(selected)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Diagnoses */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <SectionHeader number={2} title={tx('injuryDetails_diagnosesQuestion')} helper={tx('injuryDetails_diagnosesHelper')} />
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {DIAGNOSIS_OPTIONS.map(({ value, label }) => {
                  const selected = formData.injuryDetails.diagnoses.includes(value)
                  const Icon = diagnosisIcons[value] || Stethoscope
                  return (
                    <button key={value} type="button" aria-pressed={selected} onClick={() => toggleInjuryDetail('diagnoses', value)} className={tileClass(selected)}>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-brand-600 dark:bg-slate-800"><Icon className="h-3.5 w-3.5" aria-hidden /></span>
                      <span className="min-w-0 flex-1 text-xs font-semibold leading-tight text-gray-800 dark:text-slate-200">{label}</span>
                      {renderCheck(selected)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 4. Current symptoms */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <SectionHeader number={3} title={tx('injuryDetails_currentSymptomsQuestion')} helper={tx('injuryDetails_selectAllApply')} />
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {CURRENT_SYMPTOM_OPTIONS.map(({ value, label }) => {
                  const selected = formData.injuryDetails.currentSymptoms.includes(value)
                  const Icon = symptomIcons[value] || Activity
                  return (
                    <button key={value} type="button" aria-pressed={selected} onClick={() => toggleInjuryDetail('currentSymptoms', value)} className={tileClass(selected)}>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-brand-600 dark:bg-slate-800"><Icon className="h-3.5 w-3.5" aria-hidden /></span>
                      <span className="min-w-0 flex-1 text-xs font-semibold leading-tight text-gray-800 dark:text-slate-200">{label}</span>
                      {renderCheck(selected)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 5. Recovery status */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <SectionHeader number={4} title={tx('injuryDetails_recoveryQuestion')} />
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {RECOVERY_STATUS_OPTIONS.map(({ value, label }) => {
                  const selected = formData.injuryDetails.recoveryStatus === value
                  return (
                    <button key={value} type="button" aria-pressed={selected} onClick={() => updateForm({ injuryDetails: { ...formData.injuryDetails, recoveryStatus: selected ? '' : value } })} className={radioCardClass(selected)}>
                      {radioDot(selected)}
                      <span className="min-w-0 flex-1 text-xs font-semibold leading-tight text-gray-800 dark:text-slate-200">{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 6. Impact on daily life */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <SectionHeader number={5} title={tx('injuryDetails_dailyLifeQuestion')} helper={tx('injuryDetails_dailyLifeHelper')} />
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {LIFE_AREA_OPTIONS.map(({ value, label }) => {
                  const selected = formData.injuryDetails.lifestyleImpact.includes(value)
                  const Icon = lifeAreaIcons[value] || Activity
                  return (
                    <button key={value} type="button" aria-pressed={selected} onClick={() => toggleInjuryDetail('lifestyleImpact', value)} className={tileClass(selected)}>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-brand-600 dark:bg-slate-800"><Icon className="h-3.5 w-3.5" aria-hidden /></span>
                      <span className="min-w-0 flex-1 text-xs font-semibold leading-tight text-gray-800 dark:text-slate-200">{label}</span>
                      {renderCheck(selected)}
                    </button>
                  )
                })}
              </div>
              <div className="mt-2.5 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-brand-600 dark:bg-slate-800"><Pencil className="h-3.5 w-3.5" aria-hidden /></span>
                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">{tx('injuryDetails_otherDescribe')}</span>
                </div>
                <input
                  type="text"
                  value={formData.injuryDetails.lifestyleOther}
                  onChange={(e) => updateForm({ injuryDetails: { ...formData.injuryDetails, lifestyleOther: e.target.value } })}
                  placeholder={tx('injuryDetails_otherPlaceholder')}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* AI summary */}
            <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white"><Sparkles className="h-4 w-4" aria-hidden /></span>
                <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('injuryDetails_aiSummaryTitle')}</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
                {hasAnySelection ? (
                  <>
                    {bodyNames.length > 0 && <>{tx('injuryDetails_aiInjuriesTo')} <strong>{bodyNames.join(', ')}</strong>. </>}
                    {txNames.length > 0 && <>{tx('injuryDetails_aiTreatment')} <strong>{txNames.join(', ')}</strong>. </>}
                    {dxNames.length > 0 && <>{tx('injuryDetails_aiDiagnoses')} <strong>{dxNames.join(', ')}</strong>. </>}
                    {recoveryLabel && <>{tx('injuryDetails_aiRecovery')} <strong>{recoveryLabel.toLowerCase()}</strong>.</>}
                  </>
                ) : (
                  <span className="text-gray-500">{tx('injuryDetails_aiEmpty')}</span>
                )}
              </p>
            </div>

            {/* Additional information (optional) */}
            <details className="group border-t border-slate-200 pt-4 dark:border-slate-700">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                    <ClipboardCheck className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[15px] font-semibold leading-tight text-gray-900 dark:text-slate-100">{tx('injuryDetails_additionalInfo')}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-gray-500">{tx('injuryDetails_additionalInfoHelper')}</span>
                  </span>
                </span>
                <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" aria-hidden />
              </summary>

              <div className="mt-4 space-y-5">
                {/* Prior injuries */}
                <section className="border-t border-slate-200 pt-4 dark:border-slate-700">
                  <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">6. {tx('injuryDetails_priorBodyAreas')}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{tx('injuryDetails_priorHelper')}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                      { value: 'none', label: tx('optionNo') },
                      { value: 'similar', label: tx('optionYes') },
                      { value: 'not_sure', label: tx('optionNotSure') },
                    ].map(({ value, label }) => {
                      const selected = formData.injuryDetails.priorInjury === value
                      return (
                        <button key={value} type="button" aria-pressed={selected} onClick={() => updateForm({ injuryDetails: { ...formData.injuryDetails, priorInjury: selected ? '' : value } })} className={radioCardClass(selected)}>
                          {radioDot(selected)}
                          <span className="min-w-0 flex-1 text-xs font-semibold text-gray-800 dark:text-slate-200">{label}</span>
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Future treatment */}
                <section className="border-t border-slate-200 pt-4 dark:border-slate-700">
                  <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">7. {tx('injuryDetails_futureTreatmentQuestion')}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{tx('injuryDetails_selectAllApply')}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    {FUTURE_TREATMENT_OPTIONS.map(({ value, label }) => {
                      const selected = formData.injuryDetails.futureTreatment.includes(value)
                      const Icon = futureTreatmentIcons[value] || Stethoscope
                      return (
                        <button key={value} type="button" aria-pressed={selected} onClick={() => toggleInjuryDetail('futureTreatment', value, value === 'none')} className={tileClass(selected)}>
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-brand-600 dark:bg-slate-800"><Icon className="h-3.5 w-3.5" aria-hidden /></span>
                          <span className="min-w-0 flex-1 text-xs font-semibold leading-tight text-gray-800 dark:text-slate-200">{label}</span>
                          {renderCheck(selected)}
                        </button>
                      )
                    })}
                  </div>
                </section>

                {hasInjectionTreatment && (
                  <section className="border-t border-slate-200 pt-4 dark:border-slate-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('injuryDetails_injectionsMore')}</p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {PROCEDURE_OPTIONS.filter(option => option.value !== 'none').map(({ value, label }) => {
                        const selected = formData.injuryDetails.procedures.includes(value)
                        return (
                          <button key={value} type="button" aria-pressed={selected} onClick={() => toggleInjuryDetail('procedures', value)} className={tileClass(selected)}>
                            <span className="min-w-0 flex-1 text-xs font-semibold text-gray-800 dark:text-slate-200">{label}</span>
                            {renderCheck(selected)}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )}

                {hasSurgeryTreatment && (
                  <section className="border-t border-slate-200 pt-4 dark:border-slate-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('injuryDetails_surgeryDiscussed')}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {SURGERY_STATUS_OPTIONS.map(({ value, label }) => {
                        const selected = formData.injuryDetails.surgeryStatus === value
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => updateForm({ injuryDetails: { ...formData.injuryDetails, surgeryStatus: formData.injuryDetails.surgeryStatus === value ? '' : value } })}
                            className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-center text-sm font-medium transition-colors focus-visible:ring-inset focus-visible:ring-offset-0 ${selected ? 'border-brand-500 bg-brand-50/70 text-brand-800 dark:border-brand-500/50 dark:bg-brand-500/10 dark:text-brand-200' : 'border-slate-200 bg-white text-gray-800 hover:border-brand-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200'}`}
                          >
                            {selected && <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />}
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )}

                {/* Why this matters */}
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-emerald-900 dark:text-emerald-200">{tx('injuryDetails_whyMatters')}</p>
                    <p className="mt-0.5 break-words text-xs leading-snug text-emerald-800/90 dark:text-emerald-200/80">{tx('injuryDetails_whyMattersBody')}</p>
                  </div>
                </div>
              </div>
            </details>
            </>
            )}
              </div>{/* end main column */}

              {/* ---------- Sidebar (injury overview + insights) ---------- */}
              <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                {/* Injury overview + body diagram */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
                  <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('injuryDetails_overviewTitle')}</p>
                  <div className="mt-3 flex justify-center">
                    <svg viewBox="0 0 140 250" className="h-44 w-auto" role="img" aria-label={tx('injuryDetails_overviewTitle')}>
                      <g className="fill-slate-200 dark:fill-slate-700">
                        <circle cx="70" cy="26" r="15" />
                        <rect x="64" y="40" width="12" height="11" rx="3" />
                        <rect x="48" y="50" width="44" height="70" rx="14" />
                        <rect x="31" y="54" width="14" height="72" rx="7" />
                        <rect x="95" y="54" width="14" height="72" rx="7" />
                        <rect x="52" y="116" width="36" height="26" rx="10" />
                        <rect x="54" y="138" width="14" height="98" rx="7" />
                        <rect x="72" y="138" width="14" height="98" rx="7" />
                      </g>
                      {formData.injuryDetails.bodyParts.map(part => {
                        const points = bodyMarkers[part]
                        if (!points) return null
                        return (
                          <g key={part}>
                            {points.map((m, i) => (
                              <g key={i}>
                                <circle cx={m.cx} cy={m.cy} r="8" className="fill-brand-500/30" />
                                <circle cx={m.cx} cy={m.cy} r="4.5" className="fill-brand-600 stroke-white" strokeWidth="1.5" />
                              </g>
                            ))}
                          </g>
                        )
                      })}
                    </svg>
                  </div>
                  {bodyNames.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {bodyNames.map(n => (
                        <span key={n} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />{n}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-center text-xs text-gray-400">{tx('injuryDetails_overviewEmpty')}</p>
                  )}
                </div>

                {/* Quick stats — only once there's data to count; desktop-only to cut mobile scroll */}
                {!isSeverityStep && hasAnySelection && (
                <div className="hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40 lg:block">
                  <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('injuryDetails_quickStats')}</p>
                  <div className="mt-3 space-y-2">
                    {[
                      { label: tx('injuryDetails_statTreatments'), value: treatmentsSelected },
                      { label: tx('injuryDetails_statDiagnoses'), value: diagnosesSelected },
                      { label: tx('injuryDetails_statSymptoms'), value: symptomsSelected },
                      { label: tx('injuryDetails_statLifeAreas'), value: lifeAreasSelected },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-slate-400">{label}</span>
                        <span className="font-display font-semibold text-gray-900 dark:text-slate-100">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {/* Why this matters + tips (combined; desktop-only). Severity already appears in the snapshot bar above, so it's not repeated here. */}
                {!isSeverityStep && (
                <div className="hidden rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10 lg:block">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-brand-600" aria-hidden />
                    <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('injuryDetails_whyMattersSidebar')}</p>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs text-gray-600 dark:text-slate-400">
                    {[tx('injuryDetails_whyBullet1'), tx('injuryDetails_whyBullet2'), tx('injuryDetails_whyBullet3'), tx('injuryDetails_whyBullet4')].map((b, i) => (
                      <li key={i} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden /><span>{b}</span></li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center gap-2 border-t border-brand-200/70 pt-3 dark:border-brand-500/20">
                    <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden />
                    <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('injuryDetails_tipsTitle')}</p>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs text-amber-900/90 dark:text-amber-200/80">
                    {[tx('injuryDetails_tip1'), tx('injuryDetails_tip2'), tx('injuryDetails_tip3')].map((b, i) => (
                      <li key={i} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{b}</li>
                    ))}
                  </ul>
                </div>
                )}
              </aside>
            </div>{/* end two-column grid */}
          </div>
        )
      }

      case 'case_details': {
        const cdTileClass = (selected: boolean) =>
          `flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-inset focus-visible:ring-offset-0 ${selected ? 'border-brand-500 bg-brand-50/70 dark:border-brand-500/50 dark:bg-brand-500/10' : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'}`
        const cdSingleGrid = (opts: { value: string; label: string; icon?: LucideIcon }[], current: string, onPick: (v: string) => void) => (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {opts.map(({ value, label, icon: Icon }) => {
              const selected = current === value
              return (
                <button key={value} type="button" aria-pressed={selected} onClick={() => onPick(value)} className={cdTileClass(selected)}>
                  {Icon && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-brand-600 dark:bg-slate-800"><Icon className="h-3.5 w-3.5" aria-hidden /></span>}
                  <span className="min-w-0 flex-1 text-sm font-medium leading-tight text-gray-800 dark:text-slate-200">{label}</span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />}
                </button>
              )
            })}
          </div>
        )
        const cdCheckList = (items: { key: string; label: string; checked: boolean; onToggle: (v: boolean) => void; icon?: LucideIcon }[]) => (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {items.map(({ key, label, checked, onToggle, icon: Icon }) => (
              <button key={key} type="button" aria-pressed={checked} onClick={() => onToggle(!checked)} className={cdTileClass(checked)}>
                {Icon && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-brand-600 dark:bg-slate-800"><Icon className="h-3.5 w-3.5" aria-hidden /></span>}
                <span className="min-w-0 flex-1 text-sm font-medium leading-tight text-gray-800 dark:text-slate-200">{label}</span>
                {checked && <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />}
              </button>
            ))}
          </div>
        )
        // Pill-style single-select grid matching the non-vehicle branch visuals.
        const cdPillGrid = (opts: { value: string; labelKey: string }[], current: string, onPick: (v: string) => void) => (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {opts.map(({ value, labelKey }) => (
              <button key={value} type="button" aria-pressed={current === value} onClick={() => onPick(value)} className={`flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border-[1.5px] px-3 py-2 text-center text-sm font-semibold leading-tight shadow-sm transition-all active:scale-[0.99] ${current === value ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}>
                {t(`intake.${labelKey}`)} {current === value && <Check className="h-5 w-5 text-brand-600" />}
              </button>
            ))}
          </div>
        )
        const cdNativeCheck = (key: string, label: string, checked: boolean) => (
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={checked} onChange={e => setBranch(key, e.target.checked)} className="rounded border-gray-300 accent-brand-600" /><span className="text-sm">{label}</span></label>
        )
        const crashIcons: Record<string, LucideIcon> = { rear_end: Car, side_impact: Car, head_on: Car, left_turn: CornerUpLeft, multi_vehicle: Car, pedestrian: Footprints, bicycle: Bike, not_sure: HelpCircle }
        const defendantIcons: Record<string, LucideIcon> = { private: User, uber_lyft: Car, delivery: Package, trucking: Truck, company: Briefcase, government: Landmark, not_sure: HelpCircle }
        const damageIcons: Record<string, LucideIcon> = { minor: Car, moderate: Car, not_drivable: AlertTriangle, total_loss: Ban }
        const vehOpts = (arr: { value: string; labelKey: string }[], icons?: Record<string, LucideIcon>) => arr.map(o => ({ value: o.value, label: t(`intake.${o.labelKey}`), icon: icons?.[o.value] }))
        const section1 = (() => {
        if (isVehicle) {
          return (
            <div className="space-y-3">
              <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{t('intake.vehicle_crashQuestion')}</p>
              {cdSingleGrid(vehOpts(VEHICLE_CRASH_OPTIONS, crashIcons), formData.branch.crashType, (v) => setBranch('crashType', v))}
              <p className="pt-1 font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('vehicle_faultQuestion')}</p>
              {cdPillGrid(FAULT_PARTY_OPTIONS, formData.branch.faultParty, (v) => setBranch('faultParty', v))}
            </div>
          )
        }
        if (isWorkplace) {
          return (
            <div className="space-y-3">
              <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('wp_causeQuestion')}</p>
              {cdPillGrid(WORKPLACE_CAUSE_OPTIONS, formData.branch.workplaceCause, (v) => setBranch('workplaceCause', v))}
            </div>
          )
        }
        if (isSlipFall) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.slip_hazardQuestion')}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SLIP_HAZARD_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('hazardType', value) }} className={`flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border-[1.5px] px-3 py-2 text-center text-sm font-semibold leading-tight shadow-sm transition-all active:scale-[0.99] ${formData.branch.hazardType === value ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}>
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
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MEDMAL_ERROR_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('errorType', value) }} className={`flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border-[1.5px] px-3 py-2 text-center text-sm font-semibold leading-tight shadow-sm transition-all active:scale-[0.99] ${formData.branch.errorType === value ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.errorType === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isDogBite) {
          return (
            <div className="space-y-3">
              <p className="font-display text-sm font-semibold text-slate-950 dark:text-slate-100">{tx('animal_typeQuestion')}</p>
              {cdPillGrid(ANIMAL_TYPE_OPTIONS, formData.branch.animalType, (v) => setBranch('animalType', v))}
              <p className="pt-1 font-display text-sm font-semibold text-slate-950 dark:text-slate-100">{t('intake.dog_ownershipQuestion')}</p>
              {cdPillGrid(DOG_OWNERSHIP_OPTIONS, formData.branch.dogOwned, (v) => setBranch('dogOwned', v))}
            </div>
          )
        }
        if (isProduct) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.product_typeQuestion')}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PRODUCT_TYPE_OPTIONS.map((option) => (
                  <button key={option.value} type="button" onClick={() => { setBranch('productType', option.value) }} className={`flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border-[1.5px] px-3 py-2 text-center text-sm font-semibold leading-tight shadow-sm transition-all active:scale-[0.99] ${formData.branch.productType === option.value ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}>
                    {'labelKey' in option ? t(`intake.${option.labelKey}`) : option.label} {formData.branch.productType === option.value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isAssault) {
          return (
            <div className="space-y-3">
              <p className="font-display text-sm font-semibold text-slate-950 dark:text-slate-100">{tx('assault_whereQuestion')}</p>
              {cdPillGrid(ASSAULT_TYPE_OPTIONS, formData.branch.assaultType, (v) => setBranch('assaultType', v))}
              <p className="pt-1 font-display text-sm font-semibold text-slate-950 dark:text-slate-100">{tx('assault_priorIncidentsQuestion')}</p>
              {cdPillGrid(YES_NO_NOT_SURE_OPTIONS, formData.branch.priorIncidents, (v) => setBranch('priorIncidents', v))}
            </div>
          )
        }
        if (isToxic) {
          return (
            <div className="space-y-3">
              <p className="font-display text-sm font-semibold text-slate-950 dark:text-slate-100">{t('intake.toxic_substanceQuestion')}</p>
              {cdPillGrid(TOXIC_SUBSTANCE_OPTIONS, formData.branch.substance, (v) => setBranch('substance', v))}
              <p className="pt-1 font-display text-sm font-semibold text-slate-950 dark:text-slate-100">{tx('exp_locationQuestion')}</p>
              {cdPillGrid(EXPOSURE_LOCATION_OPTIONS, formData.branch.exposureLocation, (v) => setBranch('exposureLocation', v))}
            </div>
          )
        }
        if (isOther) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.tellMore')}</p>
              <textarea value={formData.branch.otherDetails || ''} onChange={e => setBranch('otherDetails', e.target.value)} placeholder={t('intake.otherDetailsPlaceholder')} rows={3} className="input w-full resize-none border-gray-300" />
            </div>
          )
        }
        return null
        })()

        const section2 = (() => {
        if (isVehicle) {
          return (
            <div className="space-y-3">
              <div>
                <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{t('intake.vehicle_liabilityEvidence')}</p>
                <p className="mt-0.5 text-xs leading-snug text-gray-500">{tx('vehicle_evidenceHelper')}</p>
              </div>
              {cdCheckList([
                { key: 'policeReport', label: t('intake.vehicle_policeReport'), checked: !!formData.branch.policeReport, onToggle: (v) => setBranch('policeReport', v), icon: FileText },
                { key: 'ticketIssued', label: t('intake.vehicle_ticket'), checked: !!formData.branch.ticketIssued, onToggle: (v) => setBranch('ticketIssued', v), icon: Receipt },
                { key: 'witnesses', label: t('intake.vehicle_witnesses'), checked: !!formData.branch.witnesses, onToggle: (v) => setBranch('witnesses', v), icon: Users },
                { key: 'photosVideo', label: tx('vehicle_photos'), checked: !!formData.branch.photosVideo, onToggle: (v) => setBranch('photosVideo', v), icon: Camera },
                { key: 'videoEvidence', label: tx('vehicle_video'), checked: !!formData.branch.videoEvidence, onToggle: (v) => setBranch('videoEvidence', v), icon: Video },
                { key: 'redLightViolation', label: tx('vehicle_redLight'), checked: !!formData.branch.redLightViolation, onToggle: (v) => setBranch('redLightViolation', v), icon: AlertTriangle },
                { key: 'duiOtherDriver', label: tx('vehicle_dui'), checked: !!formData.branch.duiOtherDriver, onToggle: (v) => setBranch('duiOtherDriver', v), icon: Wine },
              ])}
            </div>
          )
        }
        if (isWorkplace) {
          return (
            <div className="space-y-3">
              <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('wp_reportingQuestion')}</p>
              <div className="space-y-2">
                {cdNativeCheck('reportedToEmployer', tx('wp_reportedToEmployer'), !!formData.branch.reportedToEmployer)}
                {cdNativeCheck('missedWorkWC', tx('wp_missedWork'), !!formData.branch.missedWorkWC)}
                {cdNativeCheck('wcClaimFiled', tx('wp_claimFiled'), !!formData.branch.wcClaimFiled)}
              </div>
            </div>
          )
        }
        if (isSlipFall) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.slip_propertyQuestion')}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SLIP_PROPERTY_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('propertyType', value) }} className={`flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border-[1.5px] px-3 py-2 text-center text-sm font-semibold leading-tight shadow-sm transition-all active:scale-[0.99] ${formData.branch.propertyType === value ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}>
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
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MEDMAL_PROVIDER_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('providerType', value) }} className={`flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border-[1.5px] px-3 py-2 text-center text-sm font-semibold leading-tight shadow-sm transition-all active:scale-[0.99] ${formData.branch.providerType === value ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}>
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
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DOG_LOCATION_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('biteLocation', value) }} className={`flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border-[1.5px] px-3 py-2 text-center text-sm font-semibold leading-tight shadow-sm transition-all active:scale-[0.99] ${formData.branch.biteLocation === value ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}>
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
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.productMalfunction} onChange={e => setBranch('productMalfunction', e.target.checked)} className="rounded border-gray-300 accent-brand-600" /><span className="text-sm">{t('intake.product_malfunction')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.productRecalled} onChange={e => setBranch('productRecalled', e.target.checked)} className="rounded border-gray-300 accent-brand-600" /><span className="text-sm">{t('intake.product_recalled')}</span></label>
              </div>
            </div>
          )
        }
        if (isAssault) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.assault_securityQuestion')}</p>
              <div className="space-y-2">
                {cdNativeCheck('securityPresent', t('intake.assault_securityPresent'), !!formData.branch.securityPresent)}
                {cdNativeCheck('securityCameras', tx('assault_securityCameras'), !!formData.branch.securityCameras)}
                {cdNativeCheck('poorLighting', t('intake.assault_poorLighting'), !!formData.branch.poorLighting)}
                {cdNativeCheck('injuriesTreated', tx('assault_injuriesTreated'), !!formData.branch.injuriesTreated)}
              </div>
            </div>
          )
        }
        if (isToxic) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.toxic_durationQuestion')}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {EXPOSURE_DURATION_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('exposureDuration', value) }} className={`flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border-[1.5px] px-3 py-2 text-center text-sm font-semibold leading-tight shadow-sm transition-all active:scale-[0.99] ${formData.branch.exposureDuration === value ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.exposureDuration === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isOther) {
          return (
            <div className="space-y-3">
              <p className="font-display text-sm font-semibold text-slate-950 dark:text-slate-100">{tx('who_causedQuestion')}</p>
              {cdPillGrid(WHO_CAUSED_OPTIONS, formData.branch.whoCaused, (v) => setBranch('whoCaused', v))}
            </div>
          )
        }
        return null
        })()

        const section3 = (() => {
        if (isVehicle) {
          return (
            <div className="space-y-3">
              <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{t('intake.vehicle_propertyDamage')}</p>
              {cdSingleGrid(vehOpts(PROPERTY_DAMAGE_OPTIONS, damageIcons), formData.branch.propertyDamage, (v) => setBranch('propertyDamage', v))}
              {!!formData.branch.propertyDamage && (
                <>
                  <p className="pt-1 font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('vehicle_repairCostQuestion')}</p>
                  {cdPillGrid(PROPERTY_DAMAGE_COST_OPTIONS, formData.branch.propertyDamageCostRange, (v) => setBranch('propertyDamageCostRange', v))}
                  <p className="pt-1 font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('vehicle_rentalCostQuestion')}</p>
                  {cdPillGrid(RENTAL_COST_OPTIONS, formData.branch.rentalCostRange, (v) => setBranch('rentalCostRange', v))}
                </>
              )}
            </div>
          )
        }
        if (isWorkplace) {
          return (
            <div className="space-y-3">
              <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('wp_thirdPartyQuestion')}</p>
              {cdPillGrid(WORKPLACE_THIRD_PARTY_OPTIONS, formData.branch.thirdParty, (v) => setBranch('thirdParty', v))}
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
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.employeesKnew} onChange={e => setBranch('employeesKnew', e.target.checked)} className="rounded border-gray-300 accent-brand-600" /><span className="text-sm">{t('intake.slip_employeesKnew')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.warningSigns} onChange={e => setBranch('warningSigns', e.target.checked)} className="rounded border-gray-300 accent-brand-600" /><span className="text-sm">{t('intake.slip_warningSigns')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.hazardDuration} onChange={e => setBranch('hazardDuration', e.target.checked)} className="rounded border-gray-300 accent-brand-600" /><span className="text-sm">{t('intake.slip_hazardDuration')}</span></label>
              </div>
            </div>
          )
        }
        if (isMedmal) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.medmal_harmSeverity')}</p>
              <div className="space-y-2">
                {cdNativeCheck('additionalTreatment', t('intake.medmal_additionalTreatment'), !!formData.branch.additionalTreatment)}
                {cdNativeCheck('permanentInjury', t('intake.medmal_permanentInjury'), !!formData.branch.permanentInjury)}
              </div>
              <p className="pt-1 font-display text-sm font-semibold text-slate-950 dark:text-slate-100">{tx('medmal_anotherDoctorQuestion')}</p>
              {cdPillGrid(YES_NO_NOT_SURE_OPTIONS, formData.branch.anotherDoctorConfirmed, (v) => setBranch('anotherDoctorConfirmed', v))}
            </div>
          )
        }
        if (isDogBite) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.dog_priorAggressionQuestion')}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PRIOR_AGGRESSION_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('priorAggression', value) }} className={`flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border-[1.5px] px-3 py-2 text-center text-sm font-semibold leading-tight shadow-sm transition-all active:scale-[0.99] ${formData.branch.priorAggression === value ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}>
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
              <textarea value={formData.branch.injuryCause || ''} onChange={e => setBranch('injuryCause', e.target.value)} placeholder={t('intake.product_injuryPlaceholder')} rows={3} className="input w-full resize-none border-gray-300" />
            </div>
          )
        }
        if (isAssault) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.assault_policeQuestion')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.policeCalled} onChange={e => setBranch('policeCalled', e.target.checked)} className="rounded border-gray-300 accent-brand-600" /><span className="text-sm">{t('intake.assault_policeCalled')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.arrested} onChange={e => setBranch('arrested', e.target.checked)} className="rounded border-gray-300 accent-brand-600" /><span className="text-sm">{t('intake.assault_arrested')}</span></label>
              </div>
            </div>
          )
        }
        if (isToxic) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.toxic_symptomsQuestion')}</p>
              <textarea value={formData.branch.symptoms || ''} onChange={e => setBranch('symptoms', e.target.value)} placeholder={t('intake.toxic_symptomsPlaceholder')} rows={3} className="input w-full resize-none border-gray-300" />
            </div>
          )
        }
        if (isOther) {
          return (
            <div className="space-y-3">
              <p className="font-display text-sm font-semibold text-slate-950 dark:text-slate-100">{tx('other_evidenceQuestion')}</p>
              <div className="space-y-2">
                {cdNativeCheck('otherPhotos', tx('other_photos'), !!formData.branch.otherPhotos)}
                {cdNativeCheck('otherMedicalTreatment', tx('other_medicalTreatment'), !!formData.branch.otherMedicalTreatment)}
              </div>
            </div>
          )
        }
        return null
        })()

        const section4 = (() => {
        if (isVehicle) {
          return (
            <div className="space-y-3">
              <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{t('intake.vehicle_defendantQuestion')}</p>
              {cdSingleGrid(vehOpts(VEHICLE_DEFENDANT_OPTIONS, defendantIcons), formData.branch.defendantType, (v) => setBranch('defendantType', v))}
            </div>
          )
        }
        if (isSlipFall) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.slip_injuryImpact')}</p>
              <div className="space-y-2">
                {cdNativeCheck('hitHead', t('intake.slip_hitHead'), !!formData.branch.hitHead)}
                {cdNativeCheck('ambulance', t('intake.slip_ambulance'), !!formData.branch.ambulance)}
              </div>
              <p className="pt-1 font-display text-sm font-semibold text-slate-950 dark:text-slate-100">{tx('slip_documentationQuestion')}</p>
              <div className="space-y-2">
                {cdNativeCheck('incidentReport', tx('slip_incidentReport'), !!formData.branch.incidentReport)}
                {cdNativeCheck('slipPhotos', tx('slip_photosTaken'), !!formData.branch.slipPhotos)}
              </div>
            </div>
          )
        }
        if (isMedmal) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.medmal_evidence')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.hasMedicalRecords} onChange={e => setBranch('hasMedicalRecords', e.target.checked)} className="rounded border-gray-300 accent-brand-600" /><span className="text-sm">{t('intake.medmal_hasRecords')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.knowDoctorHospital} onChange={e => setBranch('knowDoctorHospital', e.target.checked)} className="rounded border-gray-300 accent-brand-600" /><span className="text-sm">{t('intake.medmal_knowProvider')}</span></label>
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
                    <input type="checkbox" checked={formData.branch.dogMedical?.includes(value)} onChange={e => { const arr = formData.branch.dogMedical || []; const next = e.target.checked ? [...arr, value] : arr.filter((x: string) => x !== value); setBranch('dogMedical', next) }} className="rounded border-gray-300 accent-brand-600" />
                    <span className="text-sm">{t(`intake.${labelKey}`)}</span>
                  </label>
                ))}
              </div>
              <p className="pt-1 font-display text-sm font-semibold text-slate-950 dark:text-slate-100">{tx('dog_detailsQuestion')}</p>
              <div className="space-y-2">
                {cdNativeCheck('brokeSkin', tx('dog_brokeSkin'), !!formData.branch.brokeSkin)}
                {cdNativeCheck('dogPhotos', tx('dog_photosAvailable'), !!formData.branch.dogPhotos)}
              </div>
            </div>
          )
        }
        if (isProduct) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.product_evidenceQuestion')}</p>
              <div className="space-y-2">
                {cdNativeCheck('hasProduct', t('intake.product_hasProduct'), !!formData.branch.hasProduct)}
                {cdNativeCheck('hasPackaging', t('intake.product_hasPackaging'), !!formData.branch.hasPackaging)}
                {cdNativeCheck('hasReceipt', t('intake.product_hasReceipt'), !!formData.branch.hasReceipt)}
                {cdNativeCheck('productPhotos', tx('product_photosAvailable'), !!formData.branch.productPhotos)}
                {cdNativeCheck('productMedicalTreatment', tx('product_medicalTreatment'), !!formData.branch.productMedicalTreatment)}
              </div>
            </div>
          )
        }
        if (isAssault) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950">{t('intake.assault_propertyOwnerQuestion')}</p>
              <input type="text" value={formData.branch.propertyOwner || ''} onChange={e => setBranch('propertyOwner', e.target.value)} placeholder={t('intake.assault_propertyPlaceholder')} className="input w-full border-gray-300" />
            </div>
          )
        }
        if (isToxic) {
          return (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-slate-950 dark:text-slate-100">{t('intake.toxic_doctorQuestion')}</p>
              {cdPillGrid(YES_NO_NOT_SURE_OPTIONS, formData.branch.doctorLinked, (v) => setBranch('doctorLinked', v))}
              <p className="pt-1 font-display text-sm font-semibold text-slate-950 dark:text-slate-100">{tx('toxic_reportedQuestion')}</p>
              {cdPillGrid(TOXIC_REPORTED_OPTIONS, formData.branch.reportedTo, (v) => setBranch('reportedTo', v))}
            </div>
          )
        }
        return null
        })()

        // Emergency response details — surfaced for case types where 911 / first-responder
        // records are commonly probative (low-impact collisions, premises, slip-and-fall, dog bites).
        const emergencySection = (() => {
          const showEmergency = isVehicle || isSlipFall || isDogBite || isAssault || isOther
          if (!showEmergency) return null
          return (
            <div className="space-y-3">
              <div>
                <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">Emergency response</p>
                <p className="mt-0.5 text-xs leading-snug text-gray-500">Whether 911 was called and who responded adds objective, time-stamped proof — especially valuable in low-impact collisions, slip-and-fall, dog bite, and other premises cases.</p>
              </div>
              <p className="font-display text-sm font-semibold text-slate-950 dark:text-slate-100">Was 911 called?</p>
              {cdPillGrid(YES_NO_NOT_SURE_OPTIONS, formData.branch.nineOneOneCalled, (v) => setBranch('nineOneOneCalled', v))}
              {formData.branch.nineOneOneCalled === 'yes' && (() => {
                // Controlled hour/minute/AM-PM selects instead of the native
                // <input type="time">. This keeps the label on its own line (the
                // native picker's value overlapped the label text, #8) and avoids
                // the browser time picker's stray blank minute row (#37).
                const raw = formData.branch.emergencyCallTime || ''
                const [rawH, rawM] = raw.split(':')
                const h24 = rawH !== undefined && rawH !== '' ? parseInt(rawH, 10) : NaN
                const hasTime = !Number.isNaN(h24)
                const minute = rawM ?? ''
                const hour12 = hasTime ? String(h24 % 12 === 0 ? 12 : h24 % 12) : ''
                const period = hasTime ? (h24 < 12 ? 'AM' : 'PM') : ''
                const baseMinutes = Array.from({ length: 12 }, (_, i) => i * 5)
                const minuteNums = minute && !baseMinutes.includes(parseInt(minute, 10))
                  ? [...baseMinutes, parseInt(minute, 10)].sort((a, b) => a - b)
                  : baseMinutes
                const minuteOptions = minuteNums.map((n) => String(n).padStart(2, '0'))
                const commit = (nextHour: string, nextMinute: string, nextPeriod: string) => {
                  const hr = parseInt(nextHour || hour12 || '12', 10)
                  const per = nextPeriod || period || 'AM'
                  const min = nextMinute || minute || '00'
                  let h = hr % 12
                  if (per === 'PM') h += 12
                  setBranch('emergencyCallTime', `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
                }
                const selectCls = 'input w-auto border-gray-300'
                return (
                  <div>
                    <label className="mb-1 block font-display text-sm font-semibold text-slate-950 dark:text-slate-100">Approximate time of the call</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <select aria-label="Hour" value={hour12} onChange={(e) => commit(e.target.value, minute, period)} className={selectCls}>
                        <option value="" disabled>Hour</option>
                        {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="text-slate-500" aria-hidden="true">:</span>
                      <select aria-label="Minutes" value={minute} onChange={(e) => commit(hour12, e.target.value, period)} className={selectCls}>
                        <option value="" disabled>Min</option>
                        {minuteOptions.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select aria-label="AM or PM" value={period} onChange={(e) => commit(hour12, minute, e.target.value)} className={selectCls}>
                        <option value="" disabled>AM/PM</option>
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                )
              })()}
              {/* Only ask who responded when 911 was actually called — otherwise the
                  follow-up is irrelevant and shouldn't appear. */}
              {formData.branch.nineOneOneCalled === 'yes' && (
                <>
                  <p className="pt-1 font-display text-sm font-semibold text-slate-950 dark:text-slate-100">Who responded to the scene?</p>
                  {cdCheckList([
                    { key: 'responderPolice', label: 'Police', checked: !!formData.branch.responderPolice, onToggle: (v) => setBranch('responderPolice', v), icon: Shield },
                    { key: 'responderEms', label: 'EMS / ambulance', checked: !!formData.branch.responderEms, onToggle: (v) => setBranch('responderEms', v), icon: Ambulance },
                    { key: 'responderFire', label: 'Fire department', checked: !!formData.branch.responderFire, onToggle: (v) => setBranch('responderFire', v), icon: AlertTriangle },
                    { key: 'responderNone', label: 'No one responded', checked: !!formData.branch.responderNone, onToggle: (v) => setBranch('responderNone', v), icon: HelpCircle },
                  ])}
                </>
              )}
            </div>
          )
        })()

        const cdBranch = formData.branch
        const sectionAnswered = [
          Boolean(
            cdBranch.crashType || cdBranch.faultParty || cdBranch.workplaceCause || cdBranch.hazardType ||
            cdBranch.errorType || cdBranch.dogOwned || cdBranch.animalType || cdBranch.productType ||
            cdBranch.assaultType || cdBranch.priorIncidents || cdBranch.substance || cdBranch.exposureLocation ||
            (cdBranch.otherDetails || '').trim()
          ),
          Boolean(
            cdBranch.policeReport || cdBranch.ticketIssued || cdBranch.witnesses || cdBranch.photosVideo ||
            cdBranch.videoEvidence || cdBranch.redLightViolation || cdBranch.duiOtherDriver ||
            cdBranch.reportedToEmployer || cdBranch.missedWorkWC || cdBranch.wcClaimFiled ||
            cdBranch.propertyType || cdBranch.providerType || cdBranch.biteLocation ||
            cdBranch.productMalfunction || cdBranch.productRecalled || cdBranch.securityPresent ||
            cdBranch.securityCameras || cdBranch.injuriesTreated || cdBranch.poorLighting ||
            cdBranch.exposureDuration || cdBranch.whoCaused
          ),
          Boolean(
            cdBranch.propertyDamage || cdBranch.thirdParty || cdBranch.employeesKnew || cdBranch.warningSigns ||
            cdBranch.hazardDuration || cdBranch.additionalTreatment || cdBranch.permanentInjury ||
            cdBranch.anotherDoctorConfirmed || cdBranch.priorAggression || (cdBranch.injuryCause || '').trim() ||
            cdBranch.policeCalled || cdBranch.arrested || (cdBranch.symptoms || '').trim() ||
            cdBranch.otherPhotos || cdBranch.otherMedicalTreatment
          ),
          Boolean(
            cdBranch.defendantType || cdBranch.hitHead || cdBranch.ambulance || cdBranch.incidentReport ||
            cdBranch.slipPhotos || cdBranch.hasMedicalRecords || cdBranch.knowDoctorHospital ||
            (cdBranch.dogMedical || []).length || cdBranch.brokeSkin || cdBranch.dogPhotos || cdBranch.hasProduct ||
            cdBranch.hasPackaging || cdBranch.hasReceipt || cdBranch.productPhotos || cdBranch.productMedicalTreatment ||
            (cdBranch.propertyOwner || '').trim() || cdBranch.doctorLinked || cdBranch.reportedTo
          ),
          Boolean(
            cdBranch.nineOneOneCalled || cdBranch.responderPolice || cdBranch.responderEms ||
            cdBranch.responderFire || cdBranch.responderNone || (cdBranch.emergencyCallTime || '')
          ),
        ]
        const sectionEntries = [section1, section2, section3, section4, emergencySection]
          .map((node, index) => ({ node, answered: sectionAnswered[index] }))
          .filter((entry) => entry.node)
        const answeredCount = sectionEntries.filter((entry) => entry.answered).length
        const pct = sectionEntries.length ? Math.round((answeredCount / sectionEntries.length) * 100) : 0
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white"><ShieldCheck className="h-4 w-4" aria-hidden /></span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-sm font-semibold leading-tight text-gray-900 dark:text-slate-100">{tx('caseDetails_progressTitle')}</p>
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">{tx('caseDetails_optionalBadge')}</span>
                    </div>
                    <p className="mt-0.5 text-xs leading-snug text-gray-500">{tx('caseDetails_progressSubtitle')}</p>
                  </div>
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-gray-500">
                  {tx('caseDetails_progressCount').replace('{answered}', String(answeredCount)).replace('{total}', String(sectionEntries.length))}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
            {sectionEntries.map((entry, index) => (
              <div key={index} className={`flex gap-2.5 ${index === 0 ? '' : 'border-t border-slate-200 pt-4 dark:border-slate-700'}`}>
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{index + 1}</span>
                <div className="min-w-0 flex-1">{entry.node}</div>
              </div>
            ))}
          </div>
        )
      }

      case 'evidence':
        {
          type EvItem = { category: string; subcategory: string; title: string; helper: string; button: string; icon: LucideIcon }
          const itemDefs: Record<string, EvItem> = {
            photos: { category: 'photos', subcategory: 'injury_photos', title: tx('evidence_photos'), helper: tx('evidence_photosHelper'), button: t('intake.uploadPhotos'), icon: Camera },
            video: { category: 'video', subcategory: 'incident_video', title: tx('evidence_videos'), helper: tx('evidence_videosHelper'), button: tx('evidence_uploadVideos'), icon: Video },
            police_report: { category: 'police_report', subcategory: 'report', title: tx('evidence_policeReport'), helper: tx('evidence_policeReportHelper'), button: t('intake.uploadReport'), icon: Shield },
            medical_records: { category: 'medical_records', subcategory: 'records', title: tx('evidence_medicalRecords'), helper: tx('evidence_medicalRecordsHelper'), button: t('intake.uploadRecords'), icon: Hospital },
            bills: { category: 'bills', subcategory: 'medical_bill', title: tx('evidence_medicalBills'), helper: tx('evidence_medicalBillsHelper'), button: t('intake.uploadBills'), icon: FileText },
            insurance_letters: { category: 'insurance_letters', subcategory: 'carrier_letters', title: tx('evidence_insuranceLetters'), helper: tx('evidence_insuranceLettersHelper'), button: tx('evidence_uploadInsuranceLetters'), icon: Mail },
            wage_verification: { category: 'wage_verification', subcategory: 'income_loss', title: tx('evidence_wageVerification'), helper: tx('evidence_wageVerificationHelper'), button: tx('evidence_uploadWageVerification'), icon: DollarSign },
          }
          // Goal-centric grouping, highest-value documents first within each group.
          const groupIcons: Record<string, LucideIcon> = { accident: Car, medical: HeartPulse, financial: DollarSign }
          const evGroups = [
            { id: 'accident', title: tx('evidence_groupAccident'), helper: tx('evidence_sectionEvidenceHelper'), items: [itemDefs.photos, itemDefs.video, itemDefs.police_report] },
            { id: 'medical', title: tx('evidence_groupMedical'), helper: tx('evidence_sectionMedicalHelper'), items: [itemDefs.bills, itemDefs.medical_records] },
            { id: 'financial', title: tx('evidence_groupFinancial'), helper: tx('evidence_groupFinancialHelper'), items: [itemDefs.wage_verification] },
          ]
          const isUploaded = (cat: string) => (pendingEvidenceFiles[cat]?.length || 0) > 0
          const weightFor = (cat: string) => evidenceStatusItems.find((it) => it.category === cat)?.weight || 0
          const scoreDrivers = evGroups
            .flatMap((g) => g.items)
            .filter((it) => weightFor(it.category) > 0 && !isUploaded(it.category))
            .sort((a, b) => weightFor(b.category) - weightFor(a.category))
            .slice(0, 3)
          const relativeUploadTime = (cat: string): string => {
            const times = (pendingEvidenceFiles[cat] || [])
              .map((f: any) => new Date(f?.createdAt || 0).getTime())
              .filter((t: number) => t > 0)
            if (!times.length) return ''
            const diffMin = Math.max(0, Math.round((Date.now() - Math.max(...times)) / 60000))
            if (diffMin < 1) return tx('evidence_justNow')
            if (diffMin < 60) return tx('evidence_minAgo').replace('{n}', String(diffMin))
            const diffHr = Math.round(diffMin / 60)
            if (diffHr < 24) return tx('evidence_hrAgo').replace('{n}', String(diffHr))
            return tx('evidence_dayAgo').replace('{n}', String(Math.round(diffHr / 24)))
          }

          // Circular readiness ring geometry.
          const ringRadius = 34
          const ringCirc = 2 * Math.PI * ringRadius
          const ringOffset = ringCirc * (1 - Math.min(100, Math.max(0, evidenceCompletenessScore)) / 100)

          const renderRow = (item: EvItem) => {
            const Icon = item.icon
            const uploaded = isUploaded(item.category)
            const itemCount = pendingEvidenceFiles[item.category]?.length || 0
            const managing = !!manageEvidence[item.category]
            const setManaging = (open: boolean) => setManageEvidence((p) => ({ ...p, [item.category]: open }))
            const rel = uploaded ? relativeUploadTime(item.category) : ''
            const rowWarnings = evidenceWarnings[item.category]
            const dropRef = getEvidenceDropRef(item.category)
            const isDragging = evidenceDragCategory === item.category
            return (
              <div
                key={item.category}
                ref={dropRef}
                className={`rounded-xl border bg-white px-3 py-1 transition-colors dark:bg-slate-900/40 ${
                  isDragging
                    ? 'border-brand-400 ring-2 ring-brand-300 ring-offset-1 dark:border-brand-500'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${uploaded ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300 dark:border-slate-600'}`}>
                    {uploaded && <Check className="h-3 w-3" aria-hidden />}
                  </span>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${uploaded ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{item.title}</p>
                    <p className="truncate text-xs text-gray-500">{item.helper}</p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    {isDragging ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                        <Upload className="h-3 w-3" aria-hidden />
                        {tx('evidence_dropToUpload')}
                      </span>
                    ) : uploaded ? (
                      <>
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{tx('evidence_uploadedCount').replace('{count}', String(itemCount))}</p>
                        <p className="text-[11px] text-gray-400">{rel ? tx('evidence_lastUpload').replace('{time}', rel) : tx('evidence_savedSecurely')}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-medium text-gray-500">{tx('evidence_notUploaded')}</p>
                        <p className="text-[11px] text-gray-400">{tx('evidence_recommended')}</p>
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {uploaded && (
                      <button type="button" onClick={() => setManaging(true)} className="inline-flex !min-h-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-200">
                        <FolderOpen className="h-3.5 w-3.5" aria-hidden /><span className="hidden sm:inline">{tx('evidence_manageShort')}</span>
                      </button>
                    )}
                    <div className={uploaded ? '' : 'w-[100px]'}>
                      <InlineEvidenceUpload
                        assessmentId={assessmentId || undefined}
                        category={item.category}
                        subcategory={item.subcategory}
                        description={item.title}
                        initialFiles={pendingEvidenceFiles[item.category] || []}
                        compact
                        tightChrome
                        hideCameraButton
                        alwaysShowUpload={!uploaded}
                        hideHeader
                        hideTightSummary
                        manageOpen={managing}
                        onManageOpenChange={setManaging}
                        uploadButtonLabel={tx('evidence_uploadAction')}
                        onFilesUploaded={(f) => handleEvidenceFiles(item.category, f)}
                        onMoveMismatch={(fileName, target) => handleMoveEvidence(item.category, target, fileName)}
                        hideInlineWarnings
                        onWarningsChange={(items, dismiss) => setEvidenceWarnings((prev) => ({ ...prev, [item.category]: { items, dismiss } }))}
                        dropTargetRef={dropRef}
                        onDragStateChange={(active) => setEvidenceDragCategory(active ? item.category : null)}
                      />
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
                  </div>
                </div>
                {rowWarnings && rowWarnings.items.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {rowWarnings.items.map((warning) => (
                      <div
                        key={warning.fileName}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-0 text-[12px] leading-none ${
                          warning.status === 'relevant'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                            : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'
                        }`}
                      >
                        {warning.status === 'relevant' ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
                        ) : (
                          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                        )}
                        <p className="min-w-0 flex-1 break-words leading-snug">
                          <span className="font-semibold">{warning.title || warning.fileName}</span>
                          <span className="opacity-90"> {warning.message}</span>
                        </p>
                        {warning.action && (
                          <button type="button" onClick={warning.action.onClick} className="shrink-0 whitespace-nowrap px-1.5 py-0 !text-[12px] !leading-none font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300">
                            {warning.action.label}
                          </button>
                        )}
                        <button type="button" onClick={() => rowWarnings.dismiss(warning.fileName)} className="shrink-0 rounded px-1.5 py-0 !text-[12px] !leading-none font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300">
                          Dismiss
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <div className="space-y-4">
              {/* Attorney review readiness */}
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-[88px] w-[88px] shrink-0">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80" aria-hidden>
                      <circle cx="40" cy="40" r={ringRadius} fill="none" strokeWidth="7" className="stroke-slate-200 dark:stroke-slate-700" />
                      <circle cx="40" cy="40" r={ringRadius} fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-emerald-500" strokeDasharray={ringCirc} strokeDashoffset={ringOffset} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-lg font-bold leading-none text-gray-900 dark:text-slate-100">{evidenceCompletenessScore}%</span>
                      <span className="text-[10px] font-medium text-gray-500">{tx('evidence_complete')}</span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[15px] font-semibold text-gray-900 dark:text-slate-100">{tx('evidence_readinessTitle')}</p>
                    <p className="mt-0.5 text-xs leading-snug text-gray-500">{tx('evidence_readinessSubtitle')}</p>
                    {scoreDrivers.length > 0 && (
                      <>
                        <p className="mt-3 text-xs font-semibold text-gray-700 dark:text-slate-300">{tx('evidence_topItems')}</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          {scoreDrivers.map((it) => {
                            const DriverIcon = it.icon
                            return (
                              <div key={it.category} className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-700 dark:bg-slate-800/40">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm dark:bg-slate-900"><DriverIcon className="h-3.5 w-3.5" aria-hidden /></span>
                                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">+{weightFor(it.category)}%</span>
                                </div>
                                <p className="mt-1.5 text-xs font-semibold leading-tight text-gray-900 dark:text-slate-100">{it.title}</p>
                                <p className="text-[11px] leading-tight text-gray-500">{it.helper}</p>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* Drag-and-drop affordance */}
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-500 dark:text-slate-400">
                <Upload className="h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden />
                {tx('evidence_dragDropTip')}
              </p>

              {/* Grouped evidence accordions */}
              {evGroups.map((group) => {
                const GroupIcon = groupIcons[group.id] || FileText
                const total = group.items.length
                const done = group.items.filter((it) => isUploaded(it.category)).length
                return (
                  <details key={group.id} open className="group rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10"><GroupIcon className="h-4 w-4" aria-hidden /></span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-semibold text-gray-900 dark:text-slate-100">{group.title}</p>
                        <p className="truncate text-xs text-gray-500">{group.helper}</p>
                      </div>
                      <span className="hidden shrink-0 text-xs font-medium text-gray-500 sm:inline">{tx('evidence_xOfYUploaded').replace('{done}', String(done)).replace('{total}', String(total))}</span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-700">
                      {group.items.map((item) => renderRow(item))}
                    </div>
                  </details>
                )
              })}

              {/* Secure footer */}
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-700 dark:bg-slate-800/40">
                <div className="flex items-start gap-2.5">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{tx('evidence_secureTitle')}</p>
                    <p className="mt-0.5 text-xs leading-snug text-gray-500">{tx('evidence_secureBody')}</p>
                  </div>
                </div>
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="hidden shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700 sm:inline-flex">{tx('evidence_learnSecurity')}<ChevronRight className="h-3.5 w-3.5" aria-hidden /></a>
              </div>
            </div>
          )
        }

      case 'financial_impact': {
        const icFinancial = formData.insuranceCoverage
        const cpFinancial = formData.casePosture || {}
        const hasIncomeImpact = cpFinancial.missedWork && cpFinancial.missedWork !== 'no'
        // Uploaded evidence must count toward the verification factors below.
        // Previously these were keyed only off typed answers, so a medical bill
        // uploaded in the Evidence step still showed "Medical Bills: Missing"
        // while "Medical Records" showed "Included" from body-part answers —
        // a confusing mismatch for users who had, in fact, uploaded a bill.
        const evCountFinancial = (cat: string) => (pendingEvidenceFiles[cat]?.length || 0)
        const hasUploadedBills = evCountFinancial('bills') > 0
        const hasUploadedMedicalRecords = evCountFinancial('medical_records') > 0
        // Pay stubs / wage verification uploads document employment and income, so
        // they must flip "Employment / Income" off "Missing" even before the client
        // fills in the missed-work / lost-wages range answers.
        const hasUploadedWageDocs = evCountFinancial('wage_verification') > 0
        const hasMedicalBillsInfo = (!!icFinancial.medicalBillRange && icFinancial.medicalBillRange !== 'not_sure') || hasUploadedBills
        const medicalBillEstimate = MEDICAL_BILL_RANGE_OPTIONS.find((option) => option.value === icFinancial.medicalBillRange)?.estimate || 0
        const futureMedicalEstimate = FUTURE_MEDICAL_RANGE_OPTIONS.find((option) => option.value === icFinancial.futureMedicalRange)?.estimate || 0
        const completedFinancialFactors = [
          !!icFinancial.medicalBillRange,
          !!cpFinancial.missedWork,
          !!icFinancial.futureMedicalRange,
        ].filter(Boolean).length
        const financialProgressPercent = Math.min(100, Math.round((completedFinancialFactors / 3) * 100))
        const showCaseValueIncrease = medicalBillEstimate >= 30000 || futureMedicalEstimate >= 15000 || cpFinancial.lostWagesRange === 'over_10000'
        const medicalBillCards = MEDICAL_BILL_RANGE_OPTIONS
        const missingFinancialFactors = [
          !icFinancial.medicalBillRange ? tx('financial_missingBills') : null,
          !icFinancial.futureMedicalRange ? tx('financial_missingFutureCare') : null,
          !cpFinancial.missedWork ? tx('financial_missingWork') : null,
        ].filter(Boolean)

        // --- Live valuation (estimated from the ranges the user already entered) ---
        const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
        const parseMoney = (raw: string | undefined) => {
          const n = parseFloat(String(raw ?? '').replace(/[^\d.]/g, ''))
          return Number.isFinite(n) ? n : 0
        }
        const idet = formData.injuryDetails
        const selfReportedMedical = icFinancial.medicalBillRange === 'over_50000' && parseMoney(icFinancial.medicalBillExact) > 0
          ? parseMoney(icFinancial.medicalBillExact)
          : medicalBillEstimate
        // Uploaded + OCR'd bills give an actual documented total. Prefer it when it
        // exceeds the self-reported range so real bills (e.g. a $20,120 hospital
        // total) drive the estimate instead of the coarse dropdown bucket. Without
        // this, an uploaded bill flipped "Medical Bills: Included" but contributed
        // $0 to the damages, leaving the estimate far below the actual bills.
        const billsDocTotal = docFinancials['bills']?.total || 0
        const pastMedical = Math.max(selfReportedMedical, billsDocTotal)
        const futureMedical = futureMedicalEstimate
        const selfReportedLostWages = parseMoney(cpFinancial.lostWagesEstimate)
        // A pay stub documents weekly income; combined with the missed-work duration this
        // yields a documented wage loss. Prefer it when it exceeds the coarse self-reported
        // range so real income drives the estimate instead of the dropdown bucket. Without
        // this an uploaded pay stub flipped "Employment/Income: Included" but contributed
        // $0 to the damages.
        const wageWeeklyIncome = docFinancials['wage_verification']?.weeklyIncome || 0
        const missedWorkWeeks = MISSED_WORK_WEEKS[cpFinancial.missedWork as string] || 0
        const documentedLostWages = Math.round(wageWeeklyIncome * missedWorkWeeks)
        const lostWages = Math.max(selfReportedLostWages, documentedLostWages)
        const propertyDamage = isVehicle ? computePropertyDamage(formData.branch) : 0
        const specials = pastMedical + futureMedical
        const economicTotal = specials + lostWages + propertyDamage
        const hasMRI = idet.imaging.includes('mri') || formData.medicalTreatment.includes('mri')
        const hasSurgery = formData.medicalTreatment.includes('surgery') || idet.imaging.includes('surgery') || (idet.procedures?.some(p => p !== 'none') ?? false)
        const hasInjections = formData.medicalTreatment.includes('injections') || idet.imaging.includes('injections')
        const hasPT = formData.medicalTreatment.includes('physical_therapy') || formData.medicalTreatment.includes('chiropractic')
        const hasDiagnoses = idet.diagnoses.length > 0
        const hasOngoing = !!icFinancial.futureMedicalRange && icFinancial.futureMedicalRange !== 'none' && icFinancial.futureMedicalRange !== 'not_sure'
        const severityMultiplierBase: Record<string, number> = { minor: 1.3, moderate: 1.8, serious: 2.4, major: 3.2, not_sure: 1.6 }
        const painMultiplier = Math.min(5, Math.round(((severityMultiplierBase[formData.injurySeverity] || 1.6) + (hasSurgery ? 0.4 : 0) + (hasInjections ? 0.2 : 0)) * 10) / 10)
        const nonEconomic = Math.round(specials * (painMultiplier - 1))
        const mostLikely = economicTotal + nonEconomic
        const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step)
        const lowEstimate = roundTo(mostLikely * 0.65, 500)
        const highEstimate = roundTo(mostLikely * 1.4, 500)
        const trialLow = roundTo(mostLikely * 2.2, 1000)
        const trialHigh = roundTo(mostLikely * 4.8, 1000)

        const hasPolice = !!formData.branch.policeReport
        const hasWitnesses = !!formData.branch.witnesses
        const sharedFault = (formData.casePosture?.faultBelief === 'shared_fault') || (formData.branch.faultParty === 'shared')

        const dvConfidenceFactors: { label: string; status: 'included' | 'partial' | 'missing' }[] = [
          { label: tx('dv_factorMedRecords'), status: (idet.bodyParts.length > 0 || hasUploadedMedicalRecords) ? 'included' : 'missing' },
          { label: tx('dv_factorTreatmentHistory'), status: formData.medicalTreatment.length > 0 ? 'included' : 'missing' },
          { label: tx('dv_factorMedBills'), status: hasMedicalBillsInfo ? 'included' : 'missing' },
          { label: tx('dv_factorPoliceReport'), status: hasPolice ? 'included' : (isVehicle ? 'missing' : 'partial') },
          { label: tx('dv_factorWitness'), status: hasWitnesses ? 'included' : 'missing' },
          { label: tx('dv_factorEmployment'), status: ((cpFinancial.missedWork && cpFinancial.missedWork !== 'no') || hasUploadedWageDocs) ? ((cpFinancial.lostWagesRange || hasUploadedWageDocs) ? 'included' : 'partial') : 'missing' },
        ]
        const confScore = Math.round(dvConfidenceFactors.reduce((acc, f) => acc + (f.status === 'included' ? 1 : f.status === 'partial' ? 0.5 : 0), 0) / dvConfidenceFactors.length * 100)
        const confLabel = confScore >= 78 ? tx('dv_confHigh') : confScore >= 52 ? tx('dv_confMedium') : tx('dv_confLow')
        const readinessNow = Math.min(95, Math.round(confScore * 0.85 + 12))
        const readinessPotential = Math.min(98, readinessNow + 7)

        const increasingFactors = [
          hasMRI && tx('dv_incMRI'),
          hasOngoing && tx('dv_incOngoing'),
          hasDiagnoses && tx('dv_incDiagnosis'),
          hasPT && tx('dv_incPT'),
          hasSurgery && tx('dv_incSurgery'),
          hasInjections && tx('dv_incInjections'),
          hasPolice && tx('dv_incPolice'),
          hasWitnesses && tx('dv_incWitnesses'),
        ].filter(Boolean) as string[]
        const reducingFactors = [
          (isVehicle && !hasPolice) && tx('dv_redPolice'),
          !hasMedicalBillsInfo && tx('dv_redBills'),
          sharedFault && tx('dv_redShared'),
          !hasWitnesses && tx('dv_redWitness'),
          !hasMRI && tx('dv_redImaging'),
          (!cpFinancial.missedWork || cpFinancial.missedWork === 'no') && !hasUploadedWageDocs && tx('dv_redWage'),
        ].filter(Boolean) as string[]
        const increaseValueItems = [
          !hasMedicalBillsInfo ? { label: tx('dv_addBills'), impact: '+$3,000' } : null,
          (isVehicle && !hasPolice) ? { label: tx('dv_addPolice'), impact: '+10%' } : null,
          (cpFinancial.missedWork && cpFinancial.missedWork !== 'no' && !cpFinancial.lostWagesRange && !hasUploadedWageDocs) ? { label: tx('dv_addWage'), impact: '+$2,000' } : null,
          !hasMRI ? { label: tx('dv_addMRI'), impact: '+5%' } : null,
          !hasWitnesses ? { label: tx('dv_addWitness'), impact: '+8%' } : null,
        ].filter(Boolean) as { label: string; impact: string }[]

        const breakdownRows = [
          { label: tx('dv_brMedical'), value: pastMedical },
          { label: tx('dv_brFuture'), value: futureMedical },
          { label: tx('dv_brWages'), value: lostWages },
          { label: tx('dv_brProperty'), value: propertyDamage },
        ].filter(r => r.value > 0)

        const compMedianMap: Record<string, number> = { vehicle: 42000, slip_fall: 38000, workplace: 46000, medmal: 120000, dog_bite: 34000, product: 62000, toxic: 78000, assault: 54000, other: 31000 }
        const compMedian = compMedianMap[formData.injuryType] || 38000
        const compP25 = Math.round(compMedian * 0.55)
        const compP75 = Math.round(compMedian * 1.85)
        const timelineMonths = hasSurgery ? '12 – 24' : economicTotal > 30000 ? '9 – 18' : '7 – 14'
        const dvHasValue = mostLikely > 0
        const ringPct = Math.max(4, Math.min(100, confScore))
        const ringCirc = 2 * Math.PI * 34

        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">{tx('dv_title')}</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">{dvHasValue ? tx('dv_subtitle') : tx('dv_subtitleEmpty')}</p>
            </div>

            {dvHasValue ? (
              <>
                {/* Top metric cards */}
                <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
                  {/* Estimated case value */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{tx('dv_estValue')}</p>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400">{tx('dv_low')}</p>
                        <p className="text-sm font-semibold text-slate-600">{usd(lowEstimate)}</p>
                      </div>
                      <div className="text-center">
                        <p className="flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-600"><Star className="h-3 w-3" aria-hidden /> {tx('dv_mostLikely')}</p>
                        <p className="font-display text-2xl font-bold text-emerald-600 sm:text-3xl">{usd(mostLikely)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400">{tx('dv_high')}</p>
                        <p className="text-sm font-semibold text-slate-600">{usd(highEstimate)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="relative h-1.5 flex-1 rounded-full bg-slate-200">
                        <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-500 shadow" style={{ left: '50%' }} aria-hidden />
                      </div>
                    </div>
                    <p className="mt-3 rounded-lg bg-emerald-50 px-2 py-1.5 text-center text-[11px] leading-snug text-emerald-700">{tx('dv_rangeNote')}</p>
                  </section>

                  {/* Confidence */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{tx('dv_confTitle')}</p>
                    <div className="relative mx-auto mt-2 h-20 w-20">
                      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="7" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#059669" strokeWidth="7" strokeLinecap="round" strokeDasharray={ringCirc} strokeDashoffset={ringCirc * (1 - ringPct / 100)} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-display text-xl font-bold text-slate-900">{confScore}</span>
                        <span className="text-[9px] text-slate-400">/100</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-emerald-600">{confLabel}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{tx('dv_confSub')}</p>
                  </section>

                  {/* Attorney readiness */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{tx('dv_attorneyReadiness')}</p>
                    <p className="mt-2 text-[10px] text-slate-500">{tx('dv_currentLikelihood')}</p>
                    <p className="font-display text-2xl font-bold text-brand-600">{readinessNow}%</p>
                    <p className="mt-1 text-[10px] text-slate-500">{tx('dv_afterAdding')}</p>
                    <p className="flex items-center justify-center gap-1 text-sm font-bold text-emerald-600"><TrendingUp className="h-3.5 w-3.5" aria-hidden /> {readinessPotential}%</p>
                    <p className="mt-1 text-[10px] leading-snug text-slate-400">{tx('dv_readinessNote')}</p>
                  </section>
                </div>

                {/* Factor columns */}
                <div className="grid gap-3 lg:grid-cols-3">
                  <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><TrendingUp className="h-4 w-4" aria-hidden /> {tx('dv_increasingTitle')}</p>
                    <ul className="mt-2 space-y-1.5">
                      {increasingFactors.slice(0, 4).map(f => (
                        <li key={f} className="flex items-start gap-2 text-xs text-slate-700"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />{f}</li>
                      ))}
                      {increasingFactors.length === 0 && <li className="text-xs text-slate-400">{tx('dv_noneYet')}</li>}
                    </ul>
                    {increasingFactors.length > 4 && <p className="mt-2 text-[11px] font-semibold text-emerald-600">{tx('dv_viewAllPositive').replace('{n}', String(increasingFactors.length))}</p>}
                  </section>

                  <section className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-700"><AlertTriangle className="h-4 w-4" aria-hidden /> {tx('dv_reducingTitle')}</p>
                    <ul className="mt-2 space-y-1.5">
                      {reducingFactors.slice(0, 4).map(f => (
                        <li key={f} className="flex items-start gap-2 text-xs text-slate-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" aria-hidden />{f}</li>
                      ))}
                      {reducingFactors.length === 0 && <li className="text-xs text-slate-400">{tx('dv_noneYet')}</li>}
                    </ul>
                    {reducingFactors.length > 4 && <p className="mt-2 text-[11px] font-semibold text-rose-600">{tx('dv_viewAllRisk').replace('{n}', String(reducingFactors.length))}</p>}
                  </section>

                  <section className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700"><Sparkles className="h-4 w-4" aria-hidden /> {tx('dv_increaseTitle')}</p>
                    <ul className="mt-2 space-y-1.5">
                      {increaseValueItems.slice(0, 4).map(item => (
                        <li key={item.label} className="flex items-center justify-between gap-2 text-xs text-slate-700">
                          <span className="flex items-start gap-2"><FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden />{item.label}</span>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{item.impact}</span>
                        </li>
                      ))}
                      {increaseValueItems.length === 0 && <li className="text-xs text-slate-400">{tx('dv_wellDocumented')}</li>}
                    </ul>
                  </section>
                </div>

                {/* Breakdown + settlement vs trial */}
                <div className="grid gap-3 lg:grid-cols-2">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="font-display text-sm font-semibold text-slate-900">{tx('dv_breakdownTitle')}</p>
                    <div className="mt-3 space-y-2">
                      {breakdownRows.map(r => (
                        <div key={r.label} className="flex items-center justify-between text-xs"><span className="text-slate-600">{r.label}</span><span className="font-semibold text-slate-900">{usd(r.value)}</span></div>
                      ))}
                      <div className="flex items-center justify-between rounded-lg bg-brand-50 px-2 py-1.5 text-xs"><span className="font-medium text-brand-800">{tx('dv_brPainSuffering')}</span><span className="font-bold text-brand-700">{painMultiplier.toFixed(1)}x</span></div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm"><span className="font-semibold text-slate-900">{tx('dv_brTotal')}</span><span className="font-display font-bold text-emerald-600">{usd(mostLikely)}</span></div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="font-display text-sm font-semibold text-slate-900">{tx('dv_settleVsTrial')}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-center">
                        <Scale className="mx-auto h-4 w-4 text-emerald-600" aria-hidden />
                        <p className="mt-1 text-[11px] font-medium text-slate-600">{tx('dv_settlementValue')}</p>
                        <p className="mt-1 text-xs font-bold text-emerald-700">{usd(lowEstimate)} – {usd(highEstimate)}</p>
                      </div>
                      <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3 text-center">
                        <Landmark className="mx-auto h-4 w-4 text-violet-600" aria-hidden />
                        <p className="mt-1 text-[11px] font-medium text-slate-600">{tx('dv_trialValue')}</p>
                        <p className="mt-1 text-xs font-bold text-violet-700">{usd(trialLow)} – {usd(trialHigh)}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-snug text-slate-500">{tx('dv_settleNote')}</p>
                  </section>
                </div>

                {/* Confidence factors + comparables + timeline */}
                <div className="grid gap-3 lg:grid-cols-3">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="font-display text-sm font-semibold text-slate-900">{tx('dv_confFactorsTitle')}</p>
                    <ul className="mt-3 space-y-2">
                      {dvConfidenceFactors.map(f => {
                        const width = f.status === 'included' ? '100%' : f.status === 'partial' ? '55%' : '18%'
                        const barColor = f.status === 'included' ? 'bg-emerald-500' : f.status === 'partial' ? 'bg-amber-400' : 'bg-rose-400'
                        const tagColor = f.status === 'included' ? 'text-emerald-600' : f.status === 'partial' ? 'text-amber-600' : 'text-rose-500'
                        const tagText = f.status === 'included' ? tx('dv_included') : f.status === 'partial' ? tx('dv_partial') : tx('dv_missing')
                        return (
                          <li key={f.label} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]"><span className="text-slate-600">{f.label}</span><span className={`font-semibold ${tagColor}`}>{tagText}</span></div>
                            <div className="h-1.5 rounded-full bg-slate-200"><div className={`h-full rounded-full ${barColor}`} style={{ width }} /></div>
                          </li>
                        )
                      })}
                    </ul>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="font-display text-sm font-semibold text-slate-900">{tx('dv_compTitle')}</p>
                    <p className="mt-2 font-display text-xl font-bold text-slate-900">{usd(compMedian)}</p>
                    <p className="text-[11px] text-slate-500">{tx('dv_compMedianLabel')}</p>
                    <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[10px]">
                      <div><p className="text-slate-400">25th</p><p className="font-semibold text-slate-700">{usd(compP25)}</p></div>
                      <div><p className="text-slate-400">{tx('dv_median')}</p><p className="font-semibold text-slate-700">{usd(compMedian)}</p></div>
                      <div><p className="text-slate-400">75th</p><p className="font-semibold text-slate-700">{usd(compP75)}</p></div>
                    </div>
                    <p className="mt-2 text-[10px] leading-snug text-slate-400">{tx('dv_compNote')}</p>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="font-display text-sm font-semibold text-slate-900">{tx('dv_timelineTitle')}</p>
                    <ol className="mt-3 space-y-2">
                      {[tx('dv_tl1'), tx('dv_tl2'), tx('dv_tl3'), tx('dv_tl4'), tx('dv_tl5')].map((s, i) => (
                        <li key={i} className="flex items-center gap-2 text-[11px] text-slate-600"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700">{i + 1}</span>{s}</li>
                      ))}
                    </ol>
                    <div className="mt-3 rounded-xl bg-brand-50 p-2 text-center">
                      <p className="text-[10px] text-slate-500">{tx('dv_estTimeline')}</p>
                      <p className="font-display text-base font-bold text-brand-700">{timelineMonths} {tx('dv_months')}</p>
                    </div>
                  </section>
                </div>

                {/* How we calculated */}
                <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-2"><Info className="h-4 w-4 text-brand-600" aria-hidden /> {tx('dv_howCalcTitle')}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
                  </summary>
                  <p className="border-t border-slate-200 px-4 py-3 text-[11px] leading-5 text-slate-500">{tx('dv_howCalcBody')}</p>
                </details>
              </>
            ) : null}

            {/* Edit your damage details (inputs) */}
            <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm" open={!dvHasValue}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-slate-800">
                <span className="flex items-center gap-2"><Pencil className="h-4 w-4 text-brand-600" aria-hidden /> {dvHasValue ? tx('dv_editInputs') : tx('dv_enterInputs')}</span>
                <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="space-y-3 border-t border-slate-200 p-4">

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-900 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold leading-tight">{tx('financial_completenessTitle')}</p>
                <p className="text-xs font-bold text-slate-600">{financialProgressPercent}%</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full rounded-full transition-[width] duration-300 ${financialProgressPercent >= 67 ? 'bg-emerald-600' : financialProgressPercent >= 34 ? 'bg-amber-500' : 'bg-rose-400'}`} style={{ width: `${financialProgressPercent}%` }} />
              </div>
              {missingFinancialFactors.length > 0 ? (
                <p className="mt-2 text-xs leading-5 text-slate-600">{tx('financial_need')}: {missingFinancialFactors.join(' • ')}</p>
              ) : (
                <p className="mt-2 text-xs leading-5 text-emerald-700">{tx('financial_completeNote')}</p>
              )}
            </section>

            <div className="grid gap-3 lg:grid-cols-2">
              <section className="order-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <SectionHeader icon={DollarSign} accent="emerald" title={tx('financial_medicalCosts')} helper={tx('financial_medicalCostsHelper')} />

                <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-600">{tx('financial_estimateNote')}</p>

                <p className="mt-3 font-display text-sm font-semibold text-slate-950">{tx('financial_billsSoFar')}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {medicalBillCards.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={icFinancial.medicalBillRange === value}
                      onClick={() => updateForm({ insuranceCoverage: { ...icFinancial, medicalBillRange: icFinancial.medicalBillRange === value ? '' : value } })}
                      className={`flex items-center gap-2 rounded-xl border-[1.5px] px-3 py-2 text-left text-xs font-semibold shadow-sm transition-all active:scale-[0.99] ${icFinancial.medicalBillRange === value ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}
                    >
                      <span aria-hidden="true" className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${icFinancial.medicalBillRange === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 text-transparent'}`}>✓</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {icFinancial.medicalBillRange === 'over_50000' && (
                  <div className="mt-2">
                    <label htmlFor="medical-bill-exact" className="text-xs font-semibold text-slate-700">{tx('financial_exactAmountLabel')}</label>
                    <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 focus-within:border-brand-500">
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
                          className={`rounded-lg border-[1.5px] px-3 py-1.5 text-xs font-semibold shadow-sm transition-all active:scale-[0.99] ${icFinancial.billsComplete === value ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}
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
                      className={`flex items-center gap-2 rounded-lg border-[1.5px] px-3 py-2 text-left text-xs font-semibold shadow-sm transition-all active:scale-[0.99] ${icFinancial.futureMedicalRange === value ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}
                    >
                      <span aria-hidden="true" className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${icFinancial.futureMedicalRange === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 text-transparent'}`}>✓</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

              </section>

              <section className="order-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <SectionHeader icon={Briefcase} accent="brand" title={tx('financial_workImpact')} helper={tx('financial_workImpactHelper')} />
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
                      className={`flex items-center gap-2 rounded-xl border-[1.5px] px-3 py-2 text-left text-xs font-semibold shadow-sm transition-all active:scale-[0.99] ${cpFinancial.missedWork === value ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}
                    >
                      <span aria-hidden="true" className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${cpFinancial.missedWork === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 text-transparent'}`}>✓</span>
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
                          className={`flex items-center gap-2 rounded-lg border-[1.5px] px-3 py-2 text-left text-xs font-semibold shadow-sm transition-all active:scale-[0.99] ${cpFinancial.lostWagesRange === value ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}
                        >
                          <span aria-hidden="true" className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${cpFinancial.lostWagesRange === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 text-transparent'}`}>✓</span>
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </section>
            </div>
              </div>
            </details>
          </div>
        )
      }

      case 'legal_status': {
        const icLegal = formData.insuranceCoverage
        const cpLegal = formData.casePosture || {}
        const setInsuranceField = (field: string, value: string) =>
          updateForm({ insuranceCoverage: { ...icLegal, [field]: (icLegal as any)[field] === value ? '' : value } })
        const hasAnyInsuranceSignal = Boolean(
          icLegal.otherPartyInsured ||
          icLegal.healthCoverage ||
          icLegal.defendantCoverageLimits ||
          icLegal.umUimCoverage ||
          icLegal.pipCoverage ||
          (icLegal.plaintiffAutoCarrier && icLegal.plaintiffAutoCarrier.trim())
        )
        const insurerContactValue =
          cpLegal.settlementOfferStatus === 'yes'
            ? 'offer'
            : cpLegal.insuranceContact === 'yes'
              ? 'contact_only'
              : cpLegal.insuranceContact === 'no'
                ? 'no'
                : ''
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
        // Insurance & legal status — redesigned two-card layout with icon choices.
        const faultIconFor = (value: string): LucideIcon =>
          value === 'shared_fault' ? Users : value === 'not_sure' ? HelpCircle : isVehicle ? Car : Users
        const renderChoice = (
          active: boolean,
          onClick: () => void,
          Icon: LucideIcon,
          label: string,
          opts?: { tone?: 'emerald' | 'amber' | 'red'; stack?: boolean; key?: string }
        ) => {
          const iconColor = active
            ? 'text-brand-700'
            : opts?.tone === 'emerald'
              ? 'text-emerald-600'
              : opts?.tone === 'amber'
                ? 'text-amber-500'
                : opts?.tone === 'red'
                  ? 'text-rose-500'
                  : 'text-slate-400'
          return (
            <button
              key={opts?.key}
              type="button"
              aria-pressed={active}
              onClick={onClick}
              className={`relative flex ${opts?.stack ? 'flex-col items-center gap-1.5 text-center' : 'items-center gap-2'} rounded-xl border-[1.5px] px-3 py-2.5 text-xs font-semibold leading-tight shadow-sm transition-all active:scale-[0.99] ${active ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}
            >
              {active && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-brand-600" aria-hidden />}
              <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} aria-hidden />
              <span>{label}</span>
            </button>
          )
        }
        const detailCard = (
          active: boolean,
          onClick: () => void,
          Icon: LucideIcon,
          title: string,
          subtitle: string,
          iconWrap: string,
          key?: string
        ) => (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={`flex items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 text-left shadow-sm transition-all active:scale-[0.99] ${active ? 'border-brand-600 bg-brand-50 shadow' : 'border-gray-200 bg-white hover:border-brand-400 hover:bg-brand-50/40 hover:shadow-md'}`}
          >
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${active ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 bg-white'}`}>
              {active && <Check className="h-3.5 w-3.5" aria-hidden />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold leading-tight text-slate-900">{title}</span>
              <span className="block text-[11px] leading-4 text-slate-500">{subtitle}</span>
            </span>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconWrap}`}><Icon className="h-4 w-4" aria-hidden /></span>
          </button>
        )
        const coverageMeta: Record<string, { Icon: LucideIcon; sub: string; wrap: string }> = {
          state_minimum: { Icon: Landmark, sub: tx('coverage_stateMinimum_sub'), wrap: 'bg-violet-100 text-violet-600' },
          '50000': { Icon: DollarSign, sub: tx('coverage_50k_sub'), wrap: 'bg-emerald-100 text-emerald-600' },
          '100000': { Icon: Shield, sub: tx('coverage_100k_sub'), wrap: 'bg-emerald-100 text-emerald-600' },
          commercial_policy: { Icon: Briefcase, sub: tx('coverage_commercial_sub'), wrap: 'bg-blue-100 text-blue-600' },
          umbrella_policy: { Icon: Umbrella, sub: tx('coverage_umbrella_sub'), wrap: 'bg-violet-100 text-violet-600' },
          not_sure: { Icon: HelpCircle, sub: tx('coverage_notSure_sub'), wrap: 'bg-slate-100 text-slate-500' },
        }
        const umUimMeta: Record<string, { Icon: LucideIcon; sub: string; wrap: string }> = {
          yes: { Icon: ShieldCheck, sub: tx('umuim_yes_sub'), wrap: 'bg-blue-100 text-blue-600' },
          no: { Icon: XCircle, sub: tx('umuim_no_sub'), wrap: 'bg-rose-100 text-rose-500' },
          not_sure: { Icon: HelpCircle, sub: tx('umuim_notSure_sub'), wrap: 'bg-slate-100 text-slate-500' },
        }
        const medPayMeta: Record<string, { Icon: LucideIcon; sub: string; wrap: string }> = {
          yes: { Icon: ShieldCheck, sub: '', wrap: 'bg-emerald-100 text-emerald-600' },
          no: { Icon: XCircle, sub: '', wrap: 'bg-rose-100 text-rose-500' },
          not_sure: { Icon: HelpCircle, sub: '', wrap: 'bg-slate-100 text-slate-500' },
        }
        const pipMeta: Record<string, { Icon: LucideIcon; sub: string; wrap: string }> = {
          yes: { Icon: ShieldCheck, sub: tx('pip_yes_sub'), wrap: 'bg-emerald-100 text-emerald-600' },
          no: { Icon: XCircle, sub: tx('pip_no_sub'), wrap: 'bg-rose-100 text-rose-500' },
          not_sure: { Icon: HelpCircle, sub: tx('pip_notSure_sub'), wrap: 'bg-slate-100 text-slate-500' },
        }
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-center">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700"><ShieldCheck className="h-4 w-4" aria-hidden /></span>
              <p className="font-display text-[16px] font-semibold text-gray-900 sm:text-[19px]">{tx('legal_heading')}</p>
            </div>
            <p className="text-center text-xs leading-5 text-gray-500">{tx('legal_helper')}</p>

            <div className="grid gap-3 lg:grid-cols-2">
              <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Users className="h-5 w-5" aria-hidden /></span>
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-semibold text-slate-950">{tx('legal_caseReview')}</h3>
                    <p className="text-xs leading-5 text-slate-500">{tx('legal_caseReviewHelper')}</p>
                  </div>
                </div>

                <p className="mt-4 font-display text-sm font-semibold text-slate-950">{tx('legal_responsibleQuestion')}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {liabilityOptionsForClaim.map(({ value, label }) =>
                    renderChoice(cpLegal.faultBelief === value, () => setCasePostureField('faultBelief', value), faultIconFor(value), label, { stack: true, key: value })
                  )}
                </div>

                <p className="mt-4 font-display text-sm font-semibold text-slate-950">{tx('legal_partialFaultQuestion')}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {renderChoice(cpLegal.comparativeFault === 'no', () => setCasePostureField('comparativeFault', 'no'), CheckCircle2, tx('optionNo'), { tone: 'emerald', stack: true })}
                  {renderChoice(cpLegal.comparativeFault === 'possibly', () => setCasePostureField('comparativeFault', 'possibly'), HelpCircle, tx('optionPossibly'), { tone: 'amber', stack: true })}
                  {renderChoice(cpLegal.comparativeFault === 'yes', () => setCasePostureField('comparativeFault', 'yes'), XCircle, tx('optionYes'), { tone: 'red', stack: true })}
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2 text-[11px] leading-5 text-blue-800">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{tx('legal_whyLiability')}</span>
                </div>
              </section>

              <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><ShieldCheck className="h-5 w-5" aria-hidden /></span>
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-semibold text-slate-950">{tx('legal_insuranceStatus')}</h3>
                    <p className="text-xs leading-5 text-slate-500">{tx('legal_insuranceStatusHelper')}</p>
                  </div>
                </div>

                <p className="mt-4 font-display text-sm font-semibold text-slate-950">{tx('legal_otherPartyInsuredQuestion')}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {renderChoice(icLegal.otherPartyInsured === 'yes', () => setInsuranceField('otherPartyInsured', 'yes'), ShieldCheck, tx('optionYes'), { tone: 'emerald', stack: true })}
                  {renderChoice(icLegal.otherPartyInsured === 'no', () => setInsuranceField('otherPartyInsured', 'no'), XCircle, tx('optionNo'), { tone: 'red', stack: true })}
                  {renderChoice(icLegal.otherPartyInsured === 'unsure', () => setInsuranceField('otherPartyInsured', 'unsure'), HelpCircle, tx('optionNotSure'), { stack: true })}
                </div>

                <p className="mt-4 font-display text-sm font-semibold text-slate-950">{tx('legal_healthInsuranceQuestion')}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {renderChoice(icLegal.healthCoverage === 'yes', () => setInsuranceField('healthCoverage', 'yes'), CheckCircle2, tx('optionYes'), { tone: 'emerald', stack: true })}
                  {renderChoice(icLegal.healthCoverage === 'no', () => setInsuranceField('healthCoverage', 'no'), XCircle, tx('optionNo'), { tone: 'amber', stack: true })}
                  {renderChoice(icLegal.healthCoverage === 'unsure', () => setInsuranceField('healthCoverage', 'unsure'), HelpCircle, tx('optionNotSure'), { stack: true })}
                </div>

                {!hasAnyInsuranceSignal && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-dashed border-violet-200 bg-violet-50/60 px-3 py-2 text-[11px] leading-5 text-violet-800">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{tx('legal_insuranceNudge')}</span>
                  </div>
                )}

                <p className="mt-4 font-display text-sm font-semibold text-slate-950">{tx('legal_insurerContactQuestion')}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {renderChoice(insurerContactValue === 'no', () => setInsurerContact('no'), Phone, tx('optionNo'))}
                  {renderChoice(insurerContactValue === 'contact_only', () => setInsurerContact('contact_only'), Clock, tx('legal_contactNoOffer'))}
                  {renderChoice(insurerContactValue === 'offer', () => setInsurerContact('offer'), ClipboardCheck, tx('legal_contactWithOffer'))}
                </div>

                {insurerContactValue === 'offer' && (
                  <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/50 p-2">
                    <p className="font-display text-xs font-semibold text-slate-950">{tx('legal_offerAmountQuestion')}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {SETTLEMENT_OFFER_OPTIONS.filter((option) => option.value !== 'no').map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={cpLegal.settlementOffer === value}
                          onClick={() => setCasePostureField('settlementOffer', value)}
                          className={`flex items-center gap-2 rounded-lg border-[1.5px] px-2 py-2 text-xs font-semibold shadow-sm transition-all active:scale-[0.99] ${cpLegal.settlementOffer === value ? 'border-brand-600 bg-brand-100 text-brand-900 shadow' : 'border-gray-300 bg-white text-gray-800 hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md'}`}
                        >
                          <span aria-hidden="true" className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${cpLegal.settlementOffer === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 text-transparent'}`}>✓</span>
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="mt-4 font-display text-sm font-semibold text-slate-950">{tx('legal_attorneyQuestion')}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {ATTORNEY_STATUS_OPTIONS.map(({ value, label }) =>
                    renderChoice(
                      cpLegal.attorneyStatus === value,
                      () => {
                        setFormData(prev => ({
                          ...prev,
                          casePosture: {
                            ...prev.casePosture,
                            attorneyStatus: prev.casePosture.attorneyStatus === value ? '' : value,
                            ...(value !== 'hired' ? { attorneyName: '', secondOpinionInterest: '' } : {})
                          }
                        }))
                      },
                      value === 'hired' ? User : UserX,
                      label,
                      { key: value }
                    )
                  )}
                </div>

                <p className="mt-4 font-display text-sm font-semibold text-slate-950">{tx('legal_acceptedQuestion')}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {([
                    { value: 'no', label: tx('optionNo'), Icon: CheckCircle2, tone: 'emerald' as const },
                    { value: 'yes', label: tx('optionYes'), Icon: CheckCircle2, tone: 'amber' as const },
                    { value: 'not_sure', label: tx('optionNotSure'), Icon: HelpCircle, tone: undefined },
                  ]).map(({ value, label, Icon, tone }) =>
                    renderChoice(
                      cpLegal.acceptedSettlement === value,
                      () => {
                        setFormData(prev => ({
                          ...prev,
                          casePosture: {
                            ...prev.casePosture,
                            acceptedSettlement: prev.casePosture.acceptedSettlement === value ? '' : value,
                            ...(value !== 'yes' ? { acceptedSettlementAmount: '' } : {})
                          }
                        }))
                      },
                      Icon,
                      label,
                      { tone, key: value }
                    )
                  )}
                </div>

                {cpLegal.acceptedSettlement === 'yes' && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <p className="text-sm font-semibold">{tx('legal_settledTitle')}</p>
                    <p className="mt-1 text-xs leading-5">⚠ {tx('legal_settledWarning')}</p>
                  </div>
                )}

                <div className="mt-4 flex items-start gap-2 rounded-xl bg-violet-50 px-3 py-2 text-[11px] leading-5 text-violet-800">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{tx('legal_whyInsurance')}</span>
                </div>
              </section>
            </div>

            <details className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><ShieldCheck className="h-5 w-5" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-sm font-semibold text-slate-950">{tx('legal_insuranceDetails')}</span>
                    <span className="block text-xs leading-5 text-slate-500">{tx('legal_insuranceDetailsSubtitle')}</span>
                  </span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="mt-4 space-y-5">
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2">
                      <Umbrella className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
                      <p className="font-display text-sm font-semibold text-slate-950">{tx('legal_coverageLimitsQuestion')}</p>
                    </div>
                    <p className="mt-1 pl-6 text-xs leading-5 text-slate-500">{tx('legal_coverageLimitsHelper')}</p>
                    <div className="mt-3 grid gap-3 lg:grid-cols-4">
                      <div className="grid gap-2 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-3">
                        {DEFENDANT_COVERAGE_OPTIONS.map(({ value, label }) => {
                          const meta = coverageMeta[value] || { Icon: HelpCircle, sub: '', wrap: 'bg-slate-100 text-slate-500' }
                          return detailCard(
                            icLegal.defendantCoverageLimits === value,
                            () => updateForm({ insuranceCoverage: { ...icLegal, defendantCoverageLimits: icLegal.defendantCoverageLimits === value ? '' : value } }),
                            meta.Icon,
                            label,
                            meta.sub,
                            meta.wrap,
                            value
                          )
                        })}
                      </div>
                      <div className="flex flex-col justify-center rounded-xl bg-indigo-50 p-3 lg:col-span-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                          <Lightbulb className="h-3.5 w-3.5 shrink-0" aria-hidden /> {tx('legal_whyMattersTitle')}
                        </div>
                        <p className="mt-1.5 text-[11px] leading-4 text-indigo-800/90">{tx('legal_whyLimits')}</p>
                      </div>
                    </div>
                  </div>

                  {isVehicle && (
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-blue-500" aria-hidden />
                        <p className="font-display text-sm font-semibold text-slate-950">{tx('legal_umUimQuestion')}</p>
                      </div>
                      <p className="mt-1 pl-6 text-xs leading-5 text-slate-500">{tx('legal_umUimHelper')}</p>
                      <div className="mt-3 grid gap-3 lg:grid-cols-4">
                        <div className="grid gap-2 sm:grid-cols-3 lg:col-span-3">
                          {UM_UIM_OPTIONS.map(({ value, label }) => {
                            const meta = umUimMeta[value] || { Icon: HelpCircle, sub: '', wrap: 'bg-slate-100 text-slate-500' }
                            return detailCard(
                              icLegal.umUimCoverage === value,
                              () => updateForm({ insuranceCoverage: { ...icLegal, umUimCoverage: icLegal.umUimCoverage === value ? '' : value } }),
                              meta.Icon,
                              label,
                              meta.sub,
                              meta.wrap,
                              value
                            )
                          })}
                        </div>
                        <div className="flex flex-col justify-center rounded-xl bg-blue-50 p-3 lg:col-span-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden /> {tx('legal_whatUmUimTitle')}
                          </div>
                          <p className="mt-1.5 text-[11px] leading-4 text-blue-800/90">{tx('legal_whatUmUim')}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isVehicle && (
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2">
                        <HeartPulse className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                        <p className="font-display text-sm font-semibold text-slate-950">{tx('legal_pipQuestion')}</p>
                      </div>
                      <p className="mt-1 pl-6 text-xs leading-5 text-slate-500">{tx('legal_pipHelper')}</p>
                      <div className="mt-3 grid gap-3 lg:grid-cols-4">
                        <div className="grid gap-2 sm:grid-cols-3 lg:col-span-3">
                          {PIP_OPTIONS.map(({ value, label }) => {
                            const meta = pipMeta[value] || { Icon: HelpCircle, sub: '', wrap: 'bg-slate-100 text-slate-500' }
                            return detailCard(
                              icLegal.pipCoverage === value,
                              () => updateForm({ insuranceCoverage: { ...icLegal, pipCoverage: icLegal.pipCoverage === value ? '' : value } }),
                              meta.Icon,
                              label,
                              meta.sub,
                              meta.wrap,
                              value
                            )
                          })}
                        </div>
                        <div className="flex flex-col justify-center rounded-xl bg-emerald-50 p-3 lg:col-span-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <HeartPulse className="h-3.5 w-3.5 shrink-0" aria-hidden /> {tx('legal_whatPipTitle')}
                          </div>
                          <p className="mt-1.5 text-[11px] leading-4 text-emerald-800/90">{tx('legal_whatPip')}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isVehicle && (
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2">
                        <HeartPulse className="h-4 w-4 shrink-0 text-teal-500" aria-hidden />
                        <p className="font-display text-sm font-semibold text-slate-950">{tx('legal_medPayQuestion')}</p>
                      </div>
                      <p className="mt-1 pl-6 text-xs leading-5 text-slate-500">{tx('legal_medPayHelper')}</p>
                      <div className="mt-3 grid gap-3 lg:grid-cols-4">
                        <div className="grid gap-2 sm:grid-cols-3 lg:col-span-3">
                          {PIP_OPTIONS.map(({ value, label }) => {
                            const meta = medPayMeta[value] || { Icon: HelpCircle, sub: '', wrap: 'bg-slate-100 text-slate-500' }
                            return detailCard(
                              icLegal.medPayCoverage === value,
                              () => updateForm({ insuranceCoverage: { ...icLegal, medPayCoverage: icLegal.medPayCoverage === value ? '' : value } }),
                              meta.Icon,
                              label,
                              meta.sub,
                              meta.wrap,
                              value
                            )
                          })}
                        </div>
                        <div className="flex flex-col justify-center rounded-xl bg-teal-50 p-3 lg:col-span-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                            <HeartPulse className="h-3.5 w-3.5 shrink-0" aria-hidden /> {tx('legal_whatMedPayTitle')}
                          </div>
                          <p className="mt-1.5 text-[11px] leading-4 text-teal-800/90">{tx('legal_whatMedPay')}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isVehicle && (
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2">
                        <Umbrella className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
                        <p className="font-display text-sm font-semibold text-slate-950">{tx('legal_plaintiffCarrierQuestion')}</p>
                      </div>
                      <p className="mt-1 pl-6 text-xs leading-5 text-slate-500">{tx('legal_plaintiffCarrierHelper')}</p>
                      <input
                        type="text"
                        value={icLegal.plaintiffAutoCarrier}
                        onChange={(event) => updateForm({ insuranceCoverage: { ...icLegal, plaintiffAutoCarrier: event.target.value } })}
                        placeholder={tx('legal_plaintiffCarrierPlaceholder')}
                        className="input mt-3 w-full border-gray-300"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-start gap-2 text-[11px] leading-4 text-slate-600">
                      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                      <span>{tx('legal_uploadInstead')}</span>
                    </p>
                    <button
                      type="button"
                      onClick={(e) => { const d = e.currentTarget.closest('details'); if (d) d.open = false }}
                      className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:self-auto"
                    >
                      {tx('legal_addDetailsLater')} <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>

                  <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                    <Lock className="h-3 w-3 shrink-0" aria-hidden /> {tx('legal_secureNote')}
                  </p>
                </div>
              </details>
          </div>
        )
      }

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

          const evCount = (cat: string) => (pendingEvidenceFiles[cat]?.length || 0)
          const anyEvidence = uploadedEvidenceCount > 0 || Object.values(pendingEvidenceFiles).some((arr: any) => (arr?.length || 0) > 0)
          const profileChecks = [
            !!formData.injuryType,
            !!getIncidentDate(),
            !!formData.venue.state,
            !!formData.narrative.trim(),
            !!formData.injurySeverity,
            formData.medicalTreatment.length > 0,
            formData.injuryDetails.bodyParts.length > 0,
            !!formData.insuranceCoverage.medicalBillRange,
            !!formData.casePosture.missedWork,
            !!formData.casePosture.faultBelief,
            anyEvidence,
          ]
          const profilePercent = Math.max(20, Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100))
          const ringCirc = 2 * Math.PI * 15.5
          const readinessLabel = previewConfidence === 'high' ? tx('readiness_high') : previewConfidence === 'moderate' ? tx('readiness_moderate') : tx('readiness_building')
          const strengthenItems = ([
            evCount('police_report') === 0 ? { label: tx('strengthen_police'), step: 'evidence' as Step } : null,
            evCount('medical_records') === 0 ? { label: tx('strengthen_records'), step: 'evidence' as Step } : null,
            (!formData.casePosture.missedWork || formData.casePosture.missedWork === 'no') ? { label: tx('strengthen_income'), step: 'financial_impact' as Step } : null,
          ].filter(Boolean) as { label: string; step: Step }[]).slice(0, 3)

          const incidentLines = [
            getIncidentDate() || tx('notAnsweredYet'),
            formatVenueLocation(formData.venue) || tx('notAnsweredYet'),
            getOptionLabel(INJURY_TYPES, formData.injuryType),
            formData.casePosture.faultBelief ? labelForValue(FAULT_BELIEF_OPTIONS, formData.casePosture.faultBelief) : null,
          ].filter(Boolean) as string[]
          const injuryLines = [
            formData.injuryDetails.bodyParts.length ? `${tx('card_primary')}: ${labelsForValues(BODY_PART_OPTIONS, formData.injuryDetails.bodyParts.slice(0, 1))}` : null,
            formData.injurySeverity ? getOptionLabel(INJURY_SEVERITY_OPTIONS, formData.injurySeverity) : null,
            formData.medicalTreatment.length ? getMedicalTreatmentSummary() : null,
            (formData.injuryDetails.imaging.length && !formData.injuryDetails.imaging.includes('none')) ? labelsForValues(IMAGING_LABEL_OPTIONS, formData.injuryDetails.imaging) : null,
          ].filter(Boolean) as string[]
          const injuryCount = formData.injuryDetails.bodyParts.length
          const billsDocTotal = docFinancials['bills']?.total || 0
          // A pay stub's raw OCR total is meaningless (gross + net + YTD + deductions), so
          // show the documented wage loss = weekly income × missed-work duration instead.
          const wageWeeklyIncomeReview = docFinancials['wage_verification']?.weeklyIncome || 0
          const wageDocLoss = Math.round(wageWeeklyIncomeReview * (MISSED_WORK_WEEKS[formData.casePosture.missedWork as string] || 0))
          const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString()}`
          const financialLines = [
            billsDocTotal > 0
              ? { k: tx('card_medicalBills'), v: fmtMoney(billsDocTotal), doc: true }
              : formData.insuranceCoverage.medicalBillRange
                ? { k: tx('card_medicalBills'), v: labelForValue(MEDICAL_BILL_RANGE_OPTIONS, formData.insuranceCoverage.medicalBillRange), doc: false }
                : evCount('bills') > 0
                  ? { k: tx('card_medicalBills'), v: tx('evidence_uploadedCount').replace('{count}', String(evCount('bills'))), doc: true }
                  : { k: tx('card_medicalBills'), v: tx('notAnsweredYet'), doc: false },
            { k: tx('card_futureMedical'), v: formData.insuranceCoverage.futureMedicalRange ? labelForValue(FUTURE_MEDICAL_RANGE_OPTIONS, formData.insuranceCoverage.futureMedicalRange) : tx('notAnsweredYet'), doc: false },
            wageDocLoss > 0
              ? { k: tx('card_lostIncome'), v: fmtMoney(wageDocLoss), doc: true }
              : { k: tx('card_lostIncome'), v: formData.casePosture.missedWork ? labelForValue(MISSED_WORK_OPTIONS, formData.casePosture.missedWork) : tx('notAnsweredYet'), doc: false },
          ]
          const docRows = [
            { k: tx('evidence_medicalBills'), n: evCount('bills') },
            { k: tx('evidence_medicalRecords'), n: evCount('medical_records') },
            { k: tx('evidence_photos'), n: evCount('photos') },
            { k: tx('evidence_videos'), n: evCount('video') },
            { k: tx('evidence_policeReport'), n: evCount('police_report') },
          ]
          const legalLines = [
            { k: tx('card_settlementOffer'), v: formData.casePosture.settlementOfferStatus ? (formData.casePosture.settlementOfferStatus === 'yes' ? tx('optionYes') : formData.casePosture.settlementOfferStatus === 'no' ? tx('optionNo') : tx('optionNotSure')) : tx('notAnsweredYet') },
            { k: tx('card_reportedInsurance'), v: formData.casePosture.insuranceContact ? labelForValue(INSURANCE_CONTACT_OPTIONS, formData.casePosture.insuranceContact) : tx('notAnsweredYet') },
            { k: tx('card_lawyerRetained'), v: formData.casePosture.attorneyStatus ? labelForValue(ATTORNEY_STATUS_OPTIONS, formData.casePosture.attorneyStatus) : tx('notAnsweredYet') },
            { k: tx('card_fault'), v: formData.casePosture.faultBelief ? labelForValue(FAULT_BELIEF_OPTIONS, formData.casePosture.faultBelief) : tx('notAnsweredYet') },
          ]
          const notesText = formData.narrative.trim() || tx('notAnsweredYet')
          const priorNote = formData.injuryDetails.priorInjury ? `${tx('sum_prior')}: ${labelForValue(PRIOR_INJURY_OPTIONS, formData.injuryDetails.priorInjury)}` : null

          const renderCard = (opts: { title: string; icon: LucideIcon; step: Step; count?: string; children: ReactNode }) => {
            const { title, icon: Icon, step, count, children } = opts
            return (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40"><Icon className="h-4 w-4" aria-hidden /></span>
                    <span className="truncate">{title}</span>
                  </span>
                  <button type="button" onClick={() => editReviewStep(step)} className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-brand-600 hover:text-brand-700"><Pencil className="h-3 w-3" aria-hidden />{tx('review_edit')}</button>
                </div>
                <div className="mt-2 space-y-1 text-[13px] leading-snug text-gray-600 dark:text-slate-300">{children}</div>
                <button type="button" onClick={() => editReviewStep(step)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">{count || tx('card_viewDetails')} <ChevronRight className="h-3 w-3" aria-hidden /></button>
              </div>
            )
          }

        return (
          <div className="space-y-3">
            <p className="text-center text-sm leading-snug text-gray-500 dark:text-slate-400">{tx('report_subtitle')}</p>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tx('profile_complete')}</p>
                <div className="mt-2 flex items-center justify-center gap-3">
                  <span className="font-display text-2xl font-bold text-emerald-600">{profilePercent}%</span>
                  <div className="relative h-12 w-12">
                    <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-emerald-500" strokeWidth="3" strokeLinecap="round" strokeDasharray={ringCirc} strokeDashoffset={ringCirc * (1 - profilePercent / 100)} />
                    </svg>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">{tx('profile_almostDone')}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />{tx('profile_readyReview')}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tx('est_settlementRange')}</p>
                <p className="mt-2 font-display text-xl font-bold text-emerald-700">{previewSettlementRange}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500"><Info className="h-3.5 w-3.5" aria-hidden />{tx('preliminaryEstimate')}</p>
                <p className="mt-1 text-xs text-gray-400">{tx('est_moreAccurate')}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tx('readiness_title')}</p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/20"><Star className="h-4 w-4" aria-hidden /></span>
                  <span className="font-display text-xl font-bold text-violet-700 dark:text-violet-300">{readinessLabel}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{tx('readiness_desc')}</p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/5">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{tx('strengthen_title')}</p>
                <ul className="mt-2 space-y-1">
                  {strengthenItems.length ? strengthenItems.map((it) => (
                    <li key={it.label}>
                      <button type="button" onClick={() => editReviewStep(it.step)} className="flex w-full items-center gap-1.5 text-left text-xs font-medium text-amber-900 hover:underline dark:text-amber-200">
                        <HelpCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />{it.label}
                      </button>
                    </li>
                  )) : (
                    <li className="flex items-center gap-1.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />{tx('strengthen_allGood')}</li>
                  )}
                </ul>
                <button type="button" onClick={() => editReviewStep('evidence')} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">{tx('strengthen_nextSteps')} <ChevronRight className="h-3 w-3" aria-hidden /></button>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {renderCard({ title: tx('card_incident'), icon: Car, step: 'when', children: (
                <>{incidentLines.map((l, i) => <p key={i} className="truncate">{l}</p>)}</>
              ) })}
              {renderCard({ title: tx('card_injury'), icon: HeartPulse, step: 'injury_severity', count: injuryCount > 0 ? `${tx('card_viewAllInjuries')} (${injuryCount})` : undefined, children: (
                <>{injuryLines.length ? injuryLines.map((l, i) => <p key={i} className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 shrink-0 text-brand-500" aria-hidden /><span className="truncate">{l}</span></p>) : <p>{tx('notAnsweredYet')}</p>}</>
              ) })}
              {renderCard({ title: tx('card_financial'), icon: DollarSign, step: 'financial_impact', children: (
                <>{financialLines.map((row) => (
                  <p key={row.k} className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">{row.k}</span>
                    <span className="flex items-center gap-1 text-right font-medium text-gray-800 dark:text-slate-200">
                      {row.doc && <FileText className="h-3 w-3 shrink-0 text-emerald-600" aria-label={tx('card_fromDocuments')} />}
                      {row.v}
                    </span>
                  </p>
                ))}</>
              ) })}
              {renderCard({ title: tx('card_documents'), icon: FileText, step: 'evidence', count: tx('card_viewAllEvidence'), children: (
                <>{docRows.map((row) => <p key={row.k} className="flex items-center justify-between gap-2"><span className="text-gray-500">{row.k}</span>{row.n > 0 ? <span className="font-medium text-emerald-700">{row.n} {row.n === 1 ? tx('card_file') : tx('card_files')}</span> : <span className="text-gray-400">{tx('evidence_notUploaded')}</span>}</p>)}</>
              ) })}
              {renderCard({ title: tx('card_legal'), icon: Scale, step: 'legal_status', children: (
                <>{legalLines.map((row) => <p key={row.k} className="flex items-center justify-between gap-2"><span className="text-gray-500">{row.k}</span><span className="text-right font-medium text-gray-800 dark:text-slate-200">{row.v}</span></p>)}</>
              ) })}
              {renderCard({ title: tx('card_notes'), icon: Pencil, step: 'when', children: (
                <><p className="line-clamp-3">{notesText}</p>{priorNote && <p className="mt-1 text-gray-500">{priorNote}</p>}</>
              ) })}
            </div>

            <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/5">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300"><ShieldCheck className="h-4 w-4" aria-hidden />{tx('report_includeTitle')}</p>
              <ul className="mt-2 grid gap-1.5 text-xs text-emerald-900/90 dark:text-emerald-200 sm:grid-cols-2 lg:grid-cols-3">
                {[tx('report_inc1'), tx('report_inc2'), tx('report_inc3'), tx('report_inc4'), tx('report_inc5'), tx('report_inc6')].map((it) => (
                  <li key={it} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />{it}</li>
                ))}
              </ul>
            </section>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className={`flex cursor-pointer items-start gap-2 rounded-xl border px-2.5 py-2 transition-all ${consents.tos && consents.privacy ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/30' : 'border-slate-200 bg-slate-50 hover:border-brand-200 dark:border-slate-700 dark:bg-slate-800/40'}`}>
                  <input type="checkbox" checked={!!(consents.tos && consents.privacy)} onChange={e => { const checked = e.target.checked; updateForm({ consents: { ...consents, tos: checked, privacy: checked } }) }} className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600" />
                  <span className="text-xs leading-snug text-gray-700 dark:text-slate-300">{tx('consent_agreeTerms')} <span className="font-semibold text-red-500" aria-hidden>*</span></span>
                </label>
                <label className={`flex cursor-pointer items-start gap-2 rounded-xl border px-2.5 py-2 transition-all ${consents.ml_use ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/30' : 'border-slate-200 bg-slate-50 hover:border-brand-200 dark:border-slate-700 dark:bg-slate-800/40'}`}>
                  <input type="checkbox" checked={!!consents.ml_use} onChange={e => updateForm({ consents: { ...consents, ml_use: e.target.checked } })} className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600" />
                  <span className="text-xs leading-snug text-gray-700 dark:text-slate-300">{tx('consent_agreeAi')} <span className="font-semibold text-red-500" aria-hidden>*</span></span>
                </label>
              </div>
              {(errors.tos || errors.privacy || errors.ml_use) && (
                <p className="mt-2 text-xs font-medium text-red-600">{errors.tos || errors.privacy || errors.ml_use}</p>
              )}
              <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400"><Lock className="h-3 w-3" aria-hidden />{tx('consent_privacySecure')}</p>
            </div>

            {uploadFailures.length > 0 && assessmentId && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
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
    when: tx('stepTitles_incidentFacts'),
    narrative: t('intake.stepTitles_narrative'),
    injury_severity: tx('stepTitles_injuries'),
    injury_details: tx('stepTitles_treatment'),
    case_details: t('intake.stepTitles_branch_7'),
    evidence: tx('stepTitles_evidence'),
    financial_impact: tx('stepTitles_damagesValuation'),
    legal_status: tx('stepTitles_legal_status'),
    consent: t('intake.stepTitles_consent')
  }

  const isFirstStep = currentStep === 'injury_type'
  const isRevisitingAnsweredStep =
    currentStepIndex >= 0 &&
    currentStepIndex < furthestReachedStepIndex &&
    hasSavedAnswerForStep(currentStep)
  const casePostureFit = currentStep === 'financial_impact' || currentStep === 'legal_status'
  const injuryDetailsFit = currentStep === 'injury_details' || currentStep === 'injury_severity'
  const showReassurance = currentStep !== 'consent' && !casePostureFit && !injuryDetailsFit && !isFirstStep
  const evidenceFit = currentStep === 'evidence'
  const denseStepFit = currentStep === 'consent'
  const savedAnswerHintExcludedSteps: Step[] = ['injury_type', 'when', 'evidence', 'consent']
  const showSavedAnswerHint =
    isRevisitingAnsweredStep &&
    !savedAnswerHintExcludedSteps.includes(currentStep) &&
    hasSavedAnswerForStep(currentStep)
  /**
   * The white panel hugs its content, but may shrink (and scroll internally) when content
   * exceeds the leftover viewport height — so the Back/Next bar always stays visible.
   */
  const previewIncidentDate = getIncidentDate()
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
  // Compact, always-available filing deadline chip (shown on every step once a deadline is known).
  const filingDeadlineDate = solPreview?.expiresAt ? new Date(solPreview.expiresAt) : null
  const hasFilingDeadline = !!filingDeadlineDate && !isNaN(filingDeadlineDate.getTime())
  const filingDeadlineLong = hasFilingDeadline
    ? filingDeadlineDate!.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : ''
  const filingDaysRemaining = solPreview?.daysRemaining != null ? Math.max(0, solPreview.daysRemaining) : null
  const filingDeadlineDotTone =
    solPreview?.status === 'critical' || solPreview?.status === 'expired'
      ? 'bg-red-500'
      : solPreview?.status === 'warning'
        ? 'bg-amber-500'
        : 'bg-emerald-500'
  // A date has been provided (typed or month/year) but the deadline also needs venue.
  const whenDateChosen =
    (formData.incidentDatePreset === 'custom' && !!customDate) ||
    (formData.incidentDatePreset === 'month_year' && !!formData.incidentDate)
  const promptForExactDate = () => {
    updateForm({ incidentDatePreset: 'custom' })
    setCurrentStep('when')
  }
  const evidenceStatusItems = [
    { category: 'photos', label: tx('evidence_photos'), weight: 20 },
    { category: 'video', label: tx('evidence_videos'), weight: 0 },
    { category: 'police_report', label: tx('evidence_policeReport'), weight: 25 },
    { category: 'bills', label: tx('evidence_medicalBills'), weight: 25 },
    { category: 'medical_records', label: tx('evidence_medicalRecords'), weight: 30 },
    { category: 'insurance_letters', label: tx('evidence_insuranceLetters'), weight: 0 },
    { category: 'wage_verification', label: tx('evidence_wageVerification'), weight: 15 },
  ]
  const evidenceCompletenessScore = Math.min(
    100,
    evidenceStatusItems.reduce((score, item) => {
      const count = pendingEvidenceFiles[item.category]?.length || 0
      return count > 0 ? score + item.weight : score
    }, 0),
  )
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
    <div className={`mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl flex-col overflow-visible px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-4 md:min-h-[calc(100dvh-7.5rem)] md:overflow-visible md:px-8 md:py-3 ${isFirstStep ? 'py-1' : 'py-1.5 sm:py-2'}`}>
      <div className="mb-1 shrink-0" aria-busy={loading}>
        <p className={`mb-0.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700 dark:text-brand-300 md:text-sm ${isFirstStep ? 'hidden sm:block' : ''}`}>
          {t('intake.timePromise')}
        </p>
        <h1 className={`text-center font-display font-bold leading-tight text-slate-900 dark:text-slate-50 md:text-2xl ${isFirstStep ? 'text-lg sm:text-xl' : 'text-lg sm:text-xl'}`}>
          {isFirstStep ? t('intake.startHeadline') : stepTitles[currentStep] || visibleSteps[currentStepIndex]?.title}
        </h1>
        {isFirstStep && (
          <p className="mx-auto mt-0.5 hidden max-w-2xl text-center text-xs leading-5 text-slate-600 dark:text-slate-300 sm:block sm:text-sm sm:leading-6 md:text-base md:leading-6">
            {t('intake.startHelper')}
          </p>
        )}
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums sm:text-sm">
          <span>
            {t('intake.step')} {currentStepIndex + 1} {t('intake.of')} {visibleSteps.length}
          </span>
          <span className="flex items-center gap-3">
            <span>
              {currentStepIndex + 1 < visibleSteps.length
                ? `• ${t('intake.progressTime')}`
                : `• ${t('intake.almostDone')}`}
            </span>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-1 font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {tx('draft_startOver')}
              <RotateCw className="h-3.5 w-3.5" aria-hidden />
            </button>
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
        {hasFilingDeadline && (
          <div className="mt-2 flex justify-center">
            <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center text-xs leading-5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${filingDeadlineDotTone}`} aria-hidden />
              <span className="font-semibold text-slate-700 dark:text-slate-200">{tx('sol_estimatedFilingDeadline')}:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-50">{filingDeadlineLong}</span>
              {filingDaysRemaining != null && (
                <>
                  <span className="text-slate-300 dark:text-slate-600" aria-hidden>·</span>
                  <span className={`font-semibold ${
                    solPreview?.status === 'critical' || solPreview?.status === 'expired'
                      ? 'text-red-600'
                      : solPreview?.status === 'warning'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                  }`}>
                    {tx(filingDaysRemaining === 1 ? 'sol_dayRemainingShort' : 'sol_daysRemainingShort').replace('{days}', String(filingDaysRemaining))}
                  </span>
                </>
              )}
              <span className="text-slate-300 dark:text-slate-600" aria-hidden>·</span>
              <span className="text-slate-500 dark:text-slate-400">{tx('sol_basedOnAnswers')}</span>
              <span className="text-slate-400 dark:text-slate-500">{tx('sol_notLegalAdvice')}</span>
              {showExactDatePrompt && (
                <button
                  type="button"
                  onClick={promptForExactDate}
                  className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
                >
                  {tx('sol_enterExactDate')}
                </button>
              )}
            </p>
          </div>
        )}
      </div>

      {draftRestored && (
        <div className="mb-1 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs leading-5 text-sky-900 sm:px-4 sm:py-2 sm:text-sm">
          <span><span className="font-semibold">{tx('draft_welcomeBack')}</span> {tx('draft_savedProgress')}</span>
          <button type="button" onClick={() => setDraftRestored(false)} aria-label={tx('draft_dismiss')} className="shrink-0 rounded-full px-1 text-sky-700 hover:text-sky-900">
            ✕
          </button>
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

      {/* Step 1: reserve the hint's space so returning to an answered first step doesn't shift the layout. */}
      {isFirstStep && Object.keys(errors).length === 0 && (
        <div
          aria-hidden={!isRevisitingAnsweredStep}
          className={`mb-1 shrink-0 rounded-lg border px-3 py-1 text-xs leading-5 sm:px-4 sm:text-sm ${
            isRevisitingAnsweredStep ? 'border-emerald-100 bg-emerald-50 text-emerald-900' : 'invisible border-transparent'
          }`}
        >
          <span className="font-semibold">✓ {tx('savedAnswer_title')}</span> {tx('savedAnswer_hint')}
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
        className={`mb-1 flex flex-col overflow-visible rounded-2xl border border-slate-200/90 bg-white shadow-card transition-shadow hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-900/80 motion-reduce:hover:shadow-card md:overflow-visible md:rounded-3xl ${denseStepFit ? 'p-2.5 md:p-4' : casePostureFit ? 'p-3 sm:p-4 md:p-5' : 'p-3 sm:p-4 md:p-6'} ${isFirstStep ? 'py-2 sm:py-2.5 md:py-3' : ''} ${denseStepFit ? 'text-sm md:text-base' : 'text-base'} ${
          denseStepFit
            ? "[&_button]:min-h-9 [&_button]:py-2 [&_button]:text-xs [&_button]:leading-tight md:[&_button]:min-h-10 md:[&_button]:text-sm [&_input:not([type='checkbox'])]:min-h-10 [&_input:not([type='checkbox'])]:text-sm [&_select]:min-h-10 [&_select]:text-sm [&_p.text-lg]:text-sm [&_p.text-sm]:text-xs [&_span.text-sm]:text-xs [&_textarea]:min-h-[3rem] [&_textarea]:py-2 [&_textarea]:text-sm"
            : casePostureFit
              ? "[&_button]:min-h-10 [&_button]:py-2 [&_button]:text-sm [&_button]:leading-snug md:[&_button]:min-h-11 [&_input:not([type='checkbox'])]:min-h-11 [&_input:not([type='checkbox'])]:text-base [&_label]:text-sm [&_p.text-sm]:text-[15px] [&_p.text-xs]:text-[13px] [&_select]:min-h-11 [&_select]:text-base [&_textarea]:min-h-[3.5rem] [&_textarea]:py-2 [&_textarea]:text-sm"
              : "[&_button]:min-h-14 [&_button]:leading-snug [&_button]:text-base md:[&_button]:text-lg [&_input:not([type='checkbox'])]:min-h-12 [&_input:not([type='checkbox'])]:text-lg [&_label]:text-base [&_p.text-lg]:text-xl [&_p.text-sm]:text-base [&_p.text-xs]:text-sm [&_select]:min-h-12 [&_select]:text-lg [&_span.text-sm]:text-base [&_span.text-xs]:text-sm [&_textarea]:min-h-[4.75rem] [&_textarea]:py-2 [&_textarea]:text-base [&_textarea]:leading-snug"
        } min-h-0`}
      >
        <div ref={stepScrollRef} className="px-2">
          {renderStep()}
        </div>
      </div>

      <p className={`mb-1 hidden shrink-0 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:block md:text-sm ${isFirstStep ? 'sm:hidden md:block' : ''}`}>
        {t('intake.privacyNote')}
      </p>

      <div className="z-20 shrink-0 rounded-xl border border-slate-200/80 bg-white/95 p-1.5 pb-[max(0.375rem,calc(0.375rem+env(safe-area-inset-bottom)))] shadow-lg shadow-slate-200/70 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 sm:rounded-2xl">
      <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => {
            // Clear any validation errors from the current step so they don't linger
            // in the error summary after navigating to a different step.
            setErrors({})
            if (returnToReviewFromStep === currentStep) {
              setReturnToReviewFromStep(null)
              setCurrentStep('consent')
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
        ) : currentStep === 'when' && (formData.incidentDatePreset === 'custom' || formData.incidentDatePreset === 'month_year') ? (
          <button
            type="button"
            onClick={validateAndNext}
            disabled={formData.incidentDatePreset === 'custom' ? !customDate : !formData.incidentDate}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-accent-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:rounded-xl sm:px-6"
          >
            {t('common.next')} <ChevronRight className="h-4 w-4 ml-1" aria-hidden />
          </button>
        ) : currentStep === 'evidence' || currentStep === 'case_details' ? (
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={validateAndNext}
              className="!min-h-0 text-sm font-semibold text-slate-500 underline-offset-2 transition-colors hover:text-slate-700 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
            >
              {currentStep === 'case_details' ? tx('caseDetails_skip') : tx('evidence_skipForNow')}
            </button>
            <button
              type="button"
              onClick={validateAndNext}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-accent-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-700 sm:min-h-11 sm:rounded-xl sm:px-6"
            >
              {t('common.next')} <ChevronRight className="h-4 w-4 ml-1" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={validateAndNext}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-accent-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-700 sm:min-h-11 sm:rounded-xl sm:px-6"
          >
            {t('common.next')} <ChevronRight className="h-4 w-4 ml-1" aria-hidden />
          </button>
        )}
      </div>
      </div>

      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-confirm-title"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="reset-confirm-title" className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {tx('reset_confirmTitle')}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {tx('reset_confirmBody')}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {tx('reset_cancel')}
              </button>
              <button
                type="button"
                onClick={discardDraftAndRestart}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
              >
                {tx('reset_confirmCta')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import type { Assessment } from '@prisma/client'
import { ENV } from '../env'
import { logger } from './logger'
import { getMlPrediction } from './ml-service'
import { makeNarrativeMatcher } from './narrative-extraction'
import { analyzeClinicalCodes, type ClinicalCodeAnalysis } from './clinical-codes'
import { analyzeTreatmentChronology, type ChronologyAnalysis } from './treatment-chronology'
import { getValuationCalibration, isIdentity, type ValuationCalibration } from './valuation-config'

/**
 * Injury Severity Levels:
 * 0 = None (no injuries reported)
 * 1 = Mild (minor injuries, minimal treatment)
 * 2 = Moderate (significant injuries, ongoing treatment)
 * 3 = Severe (serious injuries, hospitalization, surgery)
 * 4 = Catastrophic (life-threatening, permanent disability, death)
 */
export type SeverityLevel = 0 | 1 | 2 | 3 | 4

export interface SeverityScore {
  level: SeverityLevel
  score: number // 0-4 numeric score
  label: string // 'none' | 'mild' | 'moderate' | 'severe' | 'catastrophic'
  factors: string[] // Reasons for the severity level
}

export interface LiabilityScore {
  score: number // 0-1 probability score
  factors: string[] // Reasons for the liability assessment
  comparativeNegligence?: number // 0-1, estimated plaintiff fault percentage
  strength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak'
}

/**
 * Calculate multi-level injury severity based on available data
 */
export function calculateInjurySeverity(facts: any): SeverityScore {
  const injuries = facts?.injuries || []
  const medPaid = facts?.damages?.med_paid || 0
  const medCharges = facts?.damages?.med_charges || facts?.damages?.estimated_med_charges || 0
  const treatment = facts?.treatment || []
  const structuredInjury = injuries[0] || {}
  const bodyParts = Array.isArray(structuredInjury.bodyParts) ? structuredInjury.bodyParts : []
  const concussionSymptoms = Array.isArray(structuredInjury.concussionSymptoms) ? structuredInjury.concussionSymptoms : []
  const lifestyleImpact = Array.isArray(structuredInjury.lifestyleImpact) ? structuredInjury.lifestyleImpact : []
  const treatmentTypes = Array.isArray(treatment)
    ? treatment.map((item: any) => `${item?.type || ''} ${item?.status || ''} ${item?.procedure || ''} ${item?.recommendation || ''}`.toLowerCase()).join(' ')
    : ''
  const narrative = facts?.incident?.narrative?.toLowerCase() || ''
  // Negation-aware matcher: "no fracture" / "denies loss of consciousness" no longer
  // count as positive injury signals.
  const nm = makeNarrativeMatcher(narrative)
  // Objective diagnosis/procedure codes extracted from uploaded records (neutral when absent).
  const codeAnalysis = analyzeClinicalCodes(facts?.clinical?.icdCodes, facts?.clinical?.cptCodes)

  const factors: string[] = []
  let score = 0
  
  // Base: No injuries = level 0. Documented diagnosis codes also count as injuries so a
  // records-only assessment isn't dropped to "none".
  if (injuries.length === 0 && medPaid === 0 && medCharges === 0 && !codeAnalysis.documentedInjury) {
    return {
      level: 0,
      score: 0,
      label: 'none',
      factors: ['No injuries or medical expenses reported']
    }
  }
  
  // Check for catastrophic indicators (level 4)
  const catastrophicKeywords = ['death', 'deceased', 'fatal', 'permanent disability', 'paralyzed', 'coma', 'amputation', 'wrongful death']
  if (nm.includesAny(catastrophicKeywords)) {
    factors.push('Catastrophic injury indicators in narrative')
    return {
      level: 4,
      score: 4,
      label: 'catastrophic',
      factors
    }
  }
  
  // Check case type for severity hints
  if (facts?.claimType === 'wrongful_death') {
    factors.push('Wrongful death case type')
    return {
      level: 4,
      score: 4,
      label: 'catastrophic',
      factors
    }
  }
  
  if (facts?.claimType === 'high_severity_surgery') {
    factors.push('High-severity surgery case type')
    score += 2.5
  }
  
  // Medical expenses scoring
  if (medCharges >= 100000 || medPaid >= 75000) {
    factors.push('Very high medical expenses')
    score += 2.5
  } else if (medCharges >= 50000 || medPaid >= 40000) {
    factors.push('High medical expenses')
    score += 2.0
  } else if (medCharges >= 25000 || medPaid >= 20000) {
    factors.push('Significant medical expenses')
    score += 1.5
  } else if (medCharges >= 10000 || medPaid >= 7500) {
    factors.push('Moderate medical expenses')
    score += 1.0
  } else if (medCharges > 0 || medPaid > 0) {
    factors.push('Minor medical expenses')
    score += 0.5
  }
  
  // Treatment duration and complexity
  if (treatment.length > 0) {
    const treatmentMonths = treatment.length // Simplified: assume each treatment entry = ~1 month
    if (treatmentMonths >= 12) {
      factors.push('Extended treatment period (12+ months)')
      score += 1.5
    } else if (treatmentMonths >= 6) {
      factors.push('Ongoing treatment (6+ months)')
      score += 1.0
    } else if (treatmentMonths >= 3) {
      factors.push('Moderate treatment period (3+ months)')
      score += 0.5
    } else {
      factors.push('Brief treatment period')
      score += 0.2
    }
  }

  if (bodyParts.length >= 2) {
    factors.push('Multiple injured body parts')
    score += Math.min(1.2, bodyParts.length * 0.25)
  }

  if (bodyParts.some((item: any) => ['head_concussion', 'lower_back', 'neck'].includes(item?.part || item))) {
    factors.push('High-impact injury area')
    score += 0.6
  }

  if (concussionSymptoms.length > 0) {
    factors.push('Concussion or cognitive symptoms reported')
    score += Math.min(1.0, concussionSymptoms.length * 0.25)
  }

  if (lifestyleImpact.includes('unable_to_work_normally') || lifestyleImpact.includes('sleep_disruption') || lifestyleImpact.includes('emotional_distress')) {
    factors.push('Meaningful daily life impact')
    score += 0.6
  }

  if (treatmentTypes.includes('surgery_status recommended') || treatmentTypes.includes('future_treatment surgery')) {
    factors.push('Surgery recommendation')
    score += 1.2
  } else if (treatmentTypes.includes('surgery_status scheduled') || treatmentTypes.includes('surgery_status completed')) {
    factors.push('Surgery scheduled or completed')
    score += 1.6
  }

  if (treatmentTypes.includes('epidural') || treatmentTypes.includes('nerve_blocks') || treatmentTypes.includes('radiofrequency')) {
    factors.push('Interventional pain procedure')
    score += 0.9
  }

  if (treatmentTypes.includes('imaging mri') || treatmentTypes.includes(' mri')) {
    factors.push('MRI imaging reported')
    score += 0.55
  } else if (treatmentTypes.includes('imaging ct_scan') || treatmentTypes.includes('imaging xray')) {
    factors.push('Diagnostic imaging reported')
    score += 0.25
  }
  
  // Check for severe injury keywords
  const severeKeywords = ['surgery', 'surgical', 'hospitalization', 'hospitalized', 'fracture', 'broken', 'dislocation', 'herniated', 'torn', 'severed']
  const moderateKeywords = ['sprain', 'strain', 'whiplash', 'contusion', 'laceration', 'concussion']
  const mildKeywords = ['bruise', 'scratch', 'minor', 'superficial']
  
  if (nm.includesAny(severeKeywords)) {
    factors.push('Severe injury keywords detected')
    score += 2.0
  } else if (nm.includesAny(moderateKeywords)) {
    factors.push('Moderate injury keywords detected')
    score += 1.0
  } else if (nm.includesAny(mildKeywords)) {
    factors.push('Mild injury keywords detected')
    score += 0.3
  }

  // Objective ICD-10/CPT codes from uploaded records: a documented diagnosis or
  // procedure outranks self-reported severity. Capped so codes inform, not dominate.
  if (codeAnalysis.hasCodes && codeAnalysis.severityBonus > 0) {
    score += codeAnalysis.severityBonus
    for (const factor of codeAnalysis.factors) factors.push(`Documented: ${factor}`)
  }
  
  // Number of injuries
  if (injuries.length > 0) {
    if (injuries.length >= 5) {
      factors.push('Multiple injuries (5+)')
      score += 1.5
    } else if (injuries.length >= 3) {
      factors.push('Several injuries (3+)')
      score += 1.0
    } else {
      factors.push(`${injuries.length} injury/injuries reported`)
      score += 0.5
    }
  }
  
  // Wage loss as severity indicator
  const wageLoss = facts?.damages?.wage_loss || 0
  if (wageLoss >= 50000) {
    factors.push('Significant wage loss')
    score += 1.0
  } else if (wageLoss >= 20000) {
    factors.push('Moderate wage loss')
    score += 0.5
  } else if (wageLoss > 0) {
    factors.push('Some wage loss')
    score += 0.2
  }
  
  // Determine final severity level based on aggregated score
  let level: SeverityLevel
  let label: string
  
  if (score >= 4.0) {
    level = 4
    label = 'catastrophic'
  } else if (score >= 3.0) {
    level = 3
    label = 'severe'
  } else if (score >= 2.0) {
    level = 2
    label = 'moderate'
  } else if (score >= 0.5) {
    level = 1
    label = 'mild'
  } else {
    level = 0
    label = 'none'
  }
  
  return {
    level,
    score: Math.min(4, Math.max(0, score)),
    label,
    factors: factors.length > 0 ? factors : ['Insufficient data for severity assessment']
  }
}

/**
 * V2 - Rules-Based Liability Scoring (Deterministic)
 * Calculates liability likelihood based on case type patterns, narrative analysis,
 * and evidence quality rather than random variation.
 */
export function calculateLiabilityScore(facts: any, venue: string): LiabilityScore {
  const claimType = facts?.claimType || ''
  const narrative = (facts?.incident?.narrative || '').toLowerCase()
  // Negation-aware matcher so "not at fault", "no police report", etc. are not
  // mis-scored as positive fault/evidence signals.
  const nm = makeNarrativeMatcher(narrative)
  const location = (facts?.incident?.location || '').toLowerCase()
  const parties = facts?.incident?.parties || []
  const liability = facts?.liability || {}
  const evidence = facts?.evidence || []
  
  const factors: string[] = []
  let score = 0.5 // Start at neutral (50%)
  let comparativeNegligence = 0 // Estimated plaintiff fault (0-1)
  
  // ===== CASE TYPE SPECIFIC RULES =====
  
  // Auto Accident Rules
  if (claimType === 'auto') {
    // Rear-end collisions: Strong liability for rear driver
    if (nm.includes('rear-end') || nm.includes('rear end') || nm.includes('hit from behind')) {
      score += 0.30
      factors.push('Rear-end collision - typically strong liability for rear driver')
    }
    
    // T-bone/Broadside: Analyze who had right of way
    if (nm.includes('t-bone') || nm.includes('broadside') || nm.includes('side impact')) {
      if (nm.includes('ran red light') || nm.includes('ran stop sign') || nm.includes('failed to yield')) {
        score += 0.25
        factors.push('Other driver ran red light/stop sign - strong liability')
      } else {
        score += 0.10
        factors.push('T-bone collision - liability depends on right-of-way')
      }
    }
    
    // Left turn accidents: Typically favor non-turning driver
    if (nm.includes('left turn') || nm.includes('turning left')) {
      if (nm.includes('oncoming') || nm.includes('straight')) {
        score += 0.20
        factors.push('Left turn collision - typically favors non-turning driver')
      } else {
        score -= 0.10
        factors.push('Left turn collision - may involve comparative negligence')
        comparativeNegligence += 0.20
      }
    }
    
    // Head-on collisions: Analyze fault
    if (nm.includes('head-on') || nm.includes('head on')) {
      if (nm.includes('wrong lane') || nm.includes('wrong side') || nm.includes('oncoming')) {
        score += 0.25
        factors.push('Head-on collision with other driver in wrong lane')
      } else {
        score += 0.10
        factors.push('Head-on collision - requires detailed fault analysis')
      }
    }
    
    // Parking lot accidents: Often shared fault
    if (nm.includes('parking lot') || nm.includes('parking')) {
      score += 0.05
      factors.push('Parking lot accident - may involve shared liability')
      comparativeNegligence += 0.15
    }
    
    // Distracted driving indicators
    if (nm.includes('texting') || nm.includes('phone') || nm.includes('distracted') || nm.includes('cell phone')) {
      score += 0.15
      factors.push('Distracted driving by other party - strengthens liability')
    }
    
    // Speeding indicators
    if (nm.includes('speeding') || nm.includes('too fast') || nm.includes('excessive speed')) {
      score += 0.10
      factors.push('Other driver speeding - increases liability')
    }
    
    // DUI indicators
    if (nm.includes('dui') || nm.includes('drunk') || nm.includes('intoxicated') || nm.includes('alcohol')) {
      score += 0.20
      factors.push('DUI/intoxication by other driver - very strong liability')
    }
  }
  
  // Slip and Fall Rules
  if (claimType === 'slip_and_fall' || claimType === 'premises') {
    // Wet floor / spill indicators
    if (nm.includes('wet') || nm.includes('spill') || nm.includes('liquid') || nm.includes('water')) {
      score += 0.20
      factors.push('Wet floor/spill - property owner may be liable for maintenance')
    }
    
    // Uneven surface / defect
    if (nm.includes('uneven') || nm.includes('crack') || nm.includes('defect') || nm.includes('broken') || nm.includes('hole')) {
      score += 0.15
      factors.push('Property defect - owner may be liable for dangerous condition')
    }
    
    // Ice/snow
    if (nm.includes('ice') || nm.includes('snow') || nm.includes('slippery')) {
      score += 0.10
      factors.push('Ice/snow - depends on notice and reasonable maintenance')
      comparativeNegligence += 0.10 // Plaintiff should exercise caution
    }
    
    // No warning signs
    if (nm.includes('no warning') || nm.includes('no sign') || nm.includes('unmarked')) {
      score += 0.10
      factors.push('Lack of warning signs - strengthens liability')
    }
    
    // Lighting issues
    if (nm.includes('dark') || nm.includes('poor lighting') || nm.includes('dim')) {
      score += 0.08
      factors.push('Poor lighting - may indicate property owner negligence')
    }
    
    // Plaintiff was a customer/invitee
    if (nm.includes('customer') || nm.includes('shopping') || nm.includes('store') || nm.includes('restaurant')) {
      score += 0.05
      factors.push('Business invitee - higher duty of care owed')
    }
  }
  
  // Dog Bite Rules
  if (claimType === 'dog_bite') {
    // Strict liability in many states
    score += 0.25
    factors.push('Dog bite cases often have strict liability for owner')
    
    // Provocation reduces liability
    if (nm.includes('provoke') || nm.includes('tease') || nm.includes('aggressive toward')) {
      score -= 0.20
      factors.push('Possible provocation - may reduce owner liability')
      comparativeNegligence += 0.30
    }
    
    // Known dangerous dog
    if (nm.includes('vicious') || nm.includes('aggressive') || nm.includes('previous bite') || nm.includes('history')) {
      score += 0.10
      factors.push('Known dangerous dog - increases owner liability')
    }
    
    // Leash law violation
    if (nm.includes('off leash') || nm.includes('unleashed') || nm.includes('no leash')) {
      score += 0.15
      factors.push('Dog off leash - violation of leash laws strengthens case')
    }
  }
  
  // Medical Malpractice Rules
  if (claimType === 'medmal') {
    // Standard of care violations
    if (nm.includes('misdiagnosis') || nm.includes('wrong diagnosis') || nm.includes('missed diagnosis')) {
      score += 0.15
      factors.push('Misdiagnosis - potential breach of standard of care')
    }
    
    if (nm.includes('surgical error') || nm.includes('wrong site') || nm.includes('surgery mistake')) {
      score += 0.20
      factors.push('Surgical error - strong liability indicator')
    }
    
    if (nm.includes('medication error') || nm.includes('wrong medication') || nm.includes('prescription error')) {
      score += 0.18
      factors.push('Medication error - clear liability')
    }
    
    // Informed consent
    if (nm.includes('no consent') || nm.includes('not informed') || nm.includes('without consent')) {
      score += 0.12
      factors.push('Lack of informed consent - strengthens case')
    }
  }
  
  // Product Liability Rules
  if (claimType === 'product') {
    score += 0.15 // Products generally have strict liability
    factors.push('Product liability - strict liability may apply')
    
    if (nm.includes('defect') || nm.includes('malfunction') || nm.includes('broke') || nm.includes('failed')) {
      score += 0.10
      factors.push('Product defect identified - strengthens liability')
    }
    
    if (nm.includes('warning') || nm.includes('label') || nm.includes('instructions')) {
      score += 0.05
      factors.push('Warning/labeling issues - may indicate manufacturer negligence')
    }
  }
  
  // Nursing Home Abuse Rules
  if (claimType === 'nursing_home_abuse') {
    score += 0.20 // High duty of care
    factors.push('Nursing home cases - high duty of care owed to residents')
    
    if (nm.includes('neglect') || nm.includes('abuse') || nm.includes('mistreatment')) {
      score += 0.15
      factors.push('Abuse/neglect indicators - very strong liability')
    }
    
    if (nm.includes('bed sore') || nm.includes('pressure sore') || nm.includes('ulcer')) {
      score += 0.10
      factors.push('Bed sores - often indicate neglect')
    }
  }
  
  // Wrongful Death Rules
  if (claimType === 'wrongful_death') {
    score += 0.10 // Base boost for wrongful death
    factors.push('Wrongful death case - liability analysis critical')
  }
  
  // ===== NARRATIVE ANALYSIS FOR FAULT INDICATORS =====
  
  // Strong plaintiff-favorable indicators
  const strongFaultIndicators = [
    'at fault', 'fault', 'negligent', 'negligence', 'careless', 'reckless',
    'violation', 'violated', 'illegal', 'unlawful', 'breach', 'failed to',
    'did not', "didn't", 'should have', 'should not', 'shouldn\'t'
  ]
  
  const strongFaultCount = strongFaultIndicators.filter(indicator => nm.includes(indicator)).length
  if (strongFaultCount > 0) {
    score += Math.min(0.10, strongFaultCount * 0.02)
    factors.push(`${strongFaultCount} fault/negligence indicators in narrative`)
  }
  
  // Plaintiff fault indicators (reduces liability)
  const plaintiffFaultIndicators = [
    'my fault', 'i was', 'i should', 'i should not', 'i should have',
    'my mistake', 'i failed', 'i did not', "i didn't", 'i caused'
  ]
  
  const plaintiffFaultCount = plaintiffFaultIndicators.filter(indicator => nm.includes(indicator)).length
  if (plaintiffFaultCount > 0) {
    score -= Math.min(0.15, plaintiffFaultCount * 0.03)
    factors.push(`${plaintiffFaultCount} plaintiff fault indicators - may reduce liability`)
    comparativeNegligence += Math.min(0.30, plaintiffFaultCount * 0.05)
  }
  
  // Witness indicators
  if (nm.includes('witness') || nm.includes('saw') || nm.includes('observed')) {
    score += 0.08
    factors.push('Witness mentioned - strengthens evidence')
  }
  
  // Police report indicators
  if (nm.includes('police') || nm.includes('officer') || nm.includes('citation') || nm.includes('ticket')) {
    score += 0.05
    factors.push('Police involvement may provide objective evidence of fault')
  }
  
  // ===== EVIDENCE QUALITY FACTORS =====
  
  // Check if evidence files are mentioned or available
  // Evidence may be in facts.evidence array or referenced in narrative
  const evidenceArray = Array.isArray(evidence) ? evidence : []
  const evidenceCount = evidenceArray.length
  
  if (evidenceCount > 0) {
    const evidenceTypes = evidenceArray.map((e: any) => {
      if (typeof e === 'string') return e.toLowerCase()
      return (e.category || e.type || e.subcategory || '').toLowerCase()
    }).join(' ')
    
    if (evidenceTypes.includes('police') || evidenceTypes.includes('report')) {
      score += 0.10
      factors.push('Police report available - strong evidence')
    }
    
    if (evidenceTypes.includes('photo') || evidenceTypes.includes('image')) {
      score += 0.08
      factors.push('Photographic evidence - strengthens case')
    }
    
    if (evidenceTypes.includes('medical') || evidenceTypes.includes('record')) {
      score += 0.05
      factors.push('Medical records available - supports causation')
    }
    
    if (evidenceTypes.includes('witness') || evidenceTypes.includes('statement')) {
      score += 0.08
      factors.push('Witness statements - valuable evidence')
    }
    
    // General evidence boost
    if (evidenceCount >= 3) {
      score += 0.05
      factors.push(`Multiple evidence files (${evidenceCount}) - strengthens case`)
    }
  }
  
  // Check narrative for evidence mentions
  if (nm.includes('photo') || nm.includes('picture') || nm.includes('image')) {
    score += 0.03
    factors.push('Photographic evidence mentioned in narrative')
  }
  
  if (nm.includes('police report') || nm.includes('police report')) {
    score += 0.05
    factors.push('Police report mentioned in narrative')
  }
  
  // ===== VENUE/STATE SPECIFIC CONSIDERATIONS =====
  
  // Comparative negligence states (reduces recovery if plaintiff at fault)
  const pureComparativeStates = ['CA', 'NY', 'FL'] // Pure comparative - can recover even if 99% at fault
  const modifiedComparativeStates = ['TX'] // Modified comparative - can't recover if >50% at fault
  
  if (pureComparativeStates.includes(venue)) {
    if (comparativeNegligence > 0) {
      factors.push(`${venue} is pure comparative negligence state - recovery reduced by fault %`)
    }
  } else if (modifiedComparativeStates.includes(venue)) {
    if (comparativeNegligence > 0.50) {
      score -= 0.20
      factors.push(`${venue} modified comparative negligence - no recovery if >50% at fault`)
    } else if (comparativeNegligence > 0) {
      factors.push(`${venue} modified comparative negligence - recovery reduced by fault %`)
    }
  }
  
  // ===== FINAL CALCULATION =====
  
  // Clamp score between 0.05 and 0.95
  score = Math.max(0.05, Math.min(0.95, score))
  
  // Determine strength category
  let strength: LiabilityScore['strength']
  if (score >= 0.80) {
    strength = 'very_strong'
  } else if (score >= 0.65) {
    strength = 'strong'
  } else if (score >= 0.50) {
    strength = 'moderate'
  } else if (score >= 0.35) {
    strength = 'weak'
  } else {
    strength = 'very_weak'
  }
  
  // Add default factor if none found
  if (factors.length === 0) {
    factors.push('Limited liability indicators in narrative - requires further investigation')
  }
  
  return {
    score,
    factors,
    comparativeNegligence: Math.min(1, Math.max(0, comparativeNegligence)),
    strength
  }
}

export function computeFeatures(a: Assessment) {
  // Derive a minimal feature vector from JSON facts
  const f = typeof a.facts === 'string'
    ? JSON.parse(a.facts)
    : a.facts as any
  const severityScore = calculateInjurySeverity(f)
  const liabilityScore = calculateLiabilityScore(f, a.venueState) // V2: Rules-based liability
  const medPaid = f?.damages?.med_paid ?? 0
  const medCharges = f?.damages?.med_charges ?? f?.damages?.estimated_med_charges ?? 0
  // Provenance of the medical figure. Absent on legacy/intake-only assessments, where
  // the number is a self-reported estimate, so default accordingly.
  const medChargesSource = f?.damages?.med_charges_source ?? 'self_reported'
  const wageLoss = f?.damages?.wage_loss ?? f?.damages?.estimated_wage_loss ?? 0
  const outOfPocket = f?.damages?.estimated_out_of_pocket ?? f?.damages?.services ?? 0
  const propertyDamage = f?.damages?.estimated_property_damage ?? 0
  const futureMedCharges = f?.damages?.estimated_future_med_charges ?? 0
  const hasTreatment = (f?.treatment?.length ?? 0) > 0
  const insurance = f?.insurance || {}
  const policyLimit = Number(insurance.policy_limit || insurance.policyLimit || insurance.coverage_limit || 0)
  const injury = Array.isArray(f?.injuries) ? f.injuries[0] || {} : {}
  const bodyParts = Array.isArray(injury.bodyParts) ? injury.bodyParts : []
  const priorInjury = injury.priorInjury || ''
  const concussionSymptoms = Array.isArray(injury.concussionSymptoms) ? injury.concussionSymptoms : []
  const lifestyleImpact = Array.isArray(injury.lifestyleImpact) ? injury.lifestyleImpact : []
  const treatmentEvents = Array.isArray(f?.treatment) ? f.treatment : []
  const surgeryStatus = treatmentEvents.find((item: any) => item?.type === 'surgery_status')?.status || ''
  const imaging = treatmentEvents.filter((item: any) => item?.type === 'imaging').map((item: any) => item.imaging).filter(Boolean)
  const procedures = treatmentEvents.filter((item: any) => item?.type === 'procedure').map((item: any) => item.procedure).filter(Boolean)
  const futureTreatment = treatmentEvents.filter((item: any) => item?.type === 'future_treatment').map((item: any) => item.recommendation).filter(Boolean)
  const plaintiffContext = f?.plaintiffContext || {}
  const liability = f?.liability || {}
  // Treatment chronology & gaps-in-care (neutral when treatment has no usable dates).
  const chronology = analyzeTreatmentChronology(f)
  // ICD-10/CPT codes extracted from uploaded records (neutral when absent).
  const clinicalCodes = analyzeClinicalCodes(f?.clinical?.icdCodes, f?.clinical?.cptCodes)
  
  return { 
    venue: a.venueState, 
    claimType: a.claimType, 
    severity: severityScore.level, // Multi-level severity (0-4)
    severityScore, // Full severity score object
    liabilityScore, // V2: Rules-based liability score
    chronology, // Treatment timeline + gaps analysis
    clinicalCodes, // ICD-10/CPT documented-injury analysis
    medPaid,
    medCharges,
    medChargesSource,
    wageLoss,
    outOfPocket,
    propertyDamage,
    futureMedCharges,
    policyLimit: Number.isFinite(policyLimit) ? policyLimit : 0,
    billPaymentSources: Array.isArray(insurance.bill_payment_sources) ? insurance.bill_payment_sources : [],
    defendantCoverageLimits: insurance.defendant_coverage_limits || '',
    priorInjury,
    bodyParts,
    surgeryStatus,
    imaging,
    procedures,
    futureTreatment,
    concussionSymptoms,
    lifestyleImpact,
    representationStage: plaintiffContext.representationStage || '',
    litigationIntent: plaintiffContext.litigationIntent || '',
    settlementOffer: plaintiffContext.settlementOffer || '',
    comparativeFault: liability.comparativeFault || '',
    hasTreatment,
    narrativeLength: (f?.incident?.narrative?.length ?? 0) / 100 // normalize to roughly 0-10
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function roundToNearest(value: number, increment = 1000) {
  return Math.round(value / increment) * increment
}

function getVenueConstraint(venue: string) {
  if (['CA', 'NY'].includes(venue)) return 1.08
  if (['TX', 'FL'].includes(venue)) return 1.0
  return 0.94
}

function getEvidenceConfidenceModifier(features: any) {
  let modifier = 0.82
  if (features.hasTreatment) modifier += 0.08
  if (features.medCharges > 0 || features.medPaid > 0) {
    modifier += 0.05
    // Medical figures verified by uploaded bills carry more confidence than a
    // self-reported intake estimate, which should be treated as a soft signal.
    if (features.medChargesSource === 'documented') modifier += 0.05
    else if (features.medChargesSource === 'partially_documented') modifier += 0.02
    // 'self_reported' (default): no extra confidence — kept as an estimate.
  }
  if (features.narrativeLength > 3) modifier += 0.03
  if ((features.procedures?.length || 0) > 0 || features.surgeryStatus) modifier += 0.04
  return clamp(modifier, 0.72, 1.08)
}

function getSettlementCompressionFactor(severityLevel: number, hasTreatment: boolean) {
  const compressionBySeverity: Record<number, number> = {
    0: 0.45,
    1: 0.5,
    2: 0.58,
    3: 0.66,
    4: 0.72,
  }
  return (compressionBySeverity[severityLevel] ?? 0.55) + (hasTreatment ? 0.04 : -0.04)
}

function getCaseStageModifier(stage: string) {
  const stageModifiers: Record<string, number> = {
    no_lawyer: 0.92,
    lawyer_retained: 1.02,
    demand_sent: 1.08,
    in_litigation: 1.18,
    mediation_scheduled: 1.24,
    trial_scheduled: 1.35,
  }
  return stageModifiers[stage] ?? 1
}

function getPriorInjuryModifier(priorInjury: string) {
  const modifiers: Record<string, number> = {
    none: 1,
    similar: 0.82,
    prior_claim: 0.78,
    prior_surgery: 0.74,
    not_sure: 0.9,
  }
  return modifiers[priorInjury] ?? 1
}

function getProcedureLeverage(features: any) {
  let leverage = 1
  if (features.surgeryStatus === 'recommended') leverage += 0.28
  if (features.surgeryStatus === 'scheduled') leverage += 0.36
  if (features.surgeryStatus === 'completed') leverage += 0.45
  if ((features.procedures || []).some((item: string) => ['epidural_injections', 'nerve_blocks', 'radiofrequency_ablation'].includes(item))) leverage += 0.22
  if ((features.futureTreatment || []).includes('surgery')) leverage += 0.24
  if ((features.futureTreatment || []).includes('long_term_treatment')) leverage += 0.25
  if ((features.concussionSymptoms || []).length > 0) leverage += 0.2
  return leverage
}

function getLienPressureModifier(sources: string[]) {
  if (!Array.isArray(sources)) return 1
  let modifier = 1
  if (sources.includes('lien')) modifier -= 0.08
  if (sources.includes('workers_comp')) modifier -= 0.05
  if (sources.includes('medpay')) modifier += 0.03
  return clamp(modifier, 0.84, 1.05)
}

function getOfferAnchor(offer: string) {
  const anchors: Record<string, number> = {
    under_10k: 10000,
    '10k_25k': 25000,
    '25k_50k': 50000,
    higher: 75000,
  }
  return anchors[offer] ?? 0
}

function applyPolicyLimitConstraint(low: number, high: number, policyLimit: number) {
  if (!policyLimit || policyLimit <= 0) return { low, high, constrained: false }
  const constrainedHigh = Math.min(high, policyLimit)
  const constrainedLow = Math.min(low, Math.max(constrainedHigh * 0.45, policyLimit * 0.25))
  return {
    low: constrainedLow,
    high: Math.max(constrainedLow, constrainedHigh),
    constrained: high > policyLimit,
  }
}

export function predictViabilityHeuristic(features: any, calibrationOverride?: ValuationCalibration) {
  // Calibration coefficients (identity unless configured / overridden by the calibration loop).
  const calibration = calibrationOverride ?? getValuationCalibration()
  const base = 0.45
  
  // Multi-level severity factor (0-4 scale)
  // Severity levels: 0=none, 1=mild, 2=moderate, 3=severe, 4=catastrophic
  const severityLevel = features.severity || 0
  const severityLifts: Record<SeverityLevel, number> = {
    0: -0.10, // No injuries: negative impact
    1: 0.02,  // Mild: slight positive
    2: 0.08,  // Moderate: positive impact
    3: 0.15,  // Severe: strong positive
    4: 0.20   // Catastrophic: very strong positive
  }
  const severityLift = severityLifts[severityLevel as SeverityLevel] || 0
  
  // Medical expenses factor (diminishing returns)
  const medFactor = Math.min(features.medPaid / 100000, 0.15)
  
  // Treatment continuity factor
  const treatmentFactor = features.hasTreatment ? 0.08 : -0.03
  
  // Narrative detail factor
  const narrativeFactor = Math.min(features.narrativeLength / 5, 0.06)
  
  // Venue factor (mock some states as more favorable)
  const venueFactor = ['CA', 'NY', 'TX'].includes(features.venue) ? 0.05 : -0.02
  
  // Claim type factor
  const claimTypeFactors = {
    medmal: 0.08,
    product: 0.06,
    auto: 0.03,
    premises: 0.01,
    workers: -0.05
  }
  const claimFactor = claimTypeFactors[features.claimType as keyof typeof claimTypeFactors] || 0
  
  const overall = Math.max(0.05, Math.min(0.95, 
    base + severityLift + medFactor + treatmentFactor + narrativeFactor + venueFactor + claimFactor
  ))
  
  // V2: Use rules-based liability score instead of random variation
  const liabilityScore = features.liabilityScore as LiabilityScore | undefined
  const liability = liabilityScore 
    ? Math.max(0.05, Math.min(0.95, liabilityScore.score))
    : Math.max(0.05, Math.min(0.95, overall - 0.04)) // Fallback if not calculated
  
  // Causation and damages still use variation (can be upgraded later)
  const causation = Math.max(0.05, Math.min(0.95, overall - 0.06 + (Math.random() - 0.5) * 0.1))
  const damages = Math.max(0.05, Math.min(0.95, overall + 0.08 + (Math.random() - 0.5) * 0.1))
  
  // Confidence interval
  const ci = [Math.max(0.05, overall - 0.09), Math.min(0.95, overall + 0.09)]
  
  // Value bands use separate settlement and trial models. This keeps the primary
  // plaintiff-facing number realistic while still showing possible jury exposure.
  const medCharges = Number(features.medCharges || 0)
  const medPaid = Number(features.medPaid || 0)
  const wageLoss = Number(features.wageLoss || 0)
  const outOfPocket = Number(features.outOfPocket || 0)
  const propertyDamage = Number(features.propertyDamage || 0)
  const futureDamages = Number(features.futureMedCharges || 0)
  const policyLimit = Number(features.policyLimit || 0)
  // Conservative imputation for skipped intake economics. Stressed claimants
  // frequently leave every dollar field blank. When NO economic figure is
  // entered but there is a genuine injury/treatment signal, estimate the medical
  // specials from injury severity instead of treating them as $0 — otherwise the
  // case collapses to the bare severity floor and is under-valued. Imputed
  // dollars feed value but deliberately do NOT raise evidence confidence (see
  // getEvidenceConfidenceModifier, which keys off the raw medCharges), so the
  // band stays wide and the number behaves as a preliminary floor that real
  // bills will refine.
  const economicsEntered =
    medCharges > 0 || medPaid > 0 || wageLoss > 0 || outOfPocket > 0 || propertyDamage > 0
  const injurySignal =
    (severityLevel as number) >= 1 || features.hasTreatment || (features.bodyParts?.length || 0) > 0
  const medicalImputationPriors: Record<number, number> = { 1: 3500, 2: 12000, 3: 35000, 4: 90000 }
  const imputedMedical =
    !economicsEntered && injurySignal ? medicalImputationPriors[severityLevel as number] || 0 : 0
  const economicsImputed = imputedMedical > 0
  const economicDamages =
    Math.max(medCharges, medPaid, imputedMedical) +
    wageLoss +
    outOfPocket +
    Math.min(propertyDamage, 25000)
  const medicalBills = Math.max(medCharges, medPaid, imputedMedical)
  const treatmentCredibility = features.hasTreatment ? 1.12 : 0.82
  // Treatment chronology & documented codes (both neutral/no-op when their data is absent).
  const chronology = features.chronology as ChronologyAnalysis | undefined
  const chronologyModifier = chronology?.modifier ?? 1
  const clinicalCodes = features.clinicalCodes as ClinicalCodeAnalysis | undefined
  let procedureLeverage = getProcedureLeverage(features)
  // Documented surgery/injection from CPT codes adds leverage beyond self-reported status.
  if (clinicalCodes?.hasSurgery) procedureLeverage += 0.4
  else if (clinicalCodes?.hasInjection) procedureLeverage += 0.2
  const severityAnchors: Record<SeverityLevel, number> = {
    0: 6000,
    1: 18000,
    2: 45000,
    3: 125000,
    4: 350000,
  }
  const painSufferingBySeverity: Record<SeverityLevel, number> = {
    0: 4000,
    1: 12000,
    2: 45000,
    3: 150000,
    4: 500000,
  }
  const medicalSupport = Math.min(medicalBills * (severityLevel >= 3 ? 1.25 : 0.9), 140000)
  const bodyPartSeveritySupport = Math.min((features.bodyParts?.length || 0) * 6000, 35000)
  const lifestyleSupport = Math.min((features.lifestyleImpact?.length || 0) * 5000, 30000)
  const concussionSupport = Math.min((features.concussionSymptoms?.length || 0) * 8000, 45000)
  // Calibrated severity floor anchor (identity scale = unchanged).
  const calibratedAnchor =
    (severityAnchors[severityLevel as SeverityLevel] ?? 25000) *
    (calibration.severityAnchorScale[severityLevel] ?? 1)
  const injurySupportedValue = Math.max(
    calibratedAnchor,
    (economicDamages + medicalSupport + futureDamages * 0.7 + bodyPartSeveritySupport + lifestyleSupport + concussionSupport) * treatmentCredibility * procedureLeverage,
  )
  const liabilityModifier = clamp(liability * (1 - (liabilityScore?.comparativeNegligence ?? 0) * 0.55), 0.25, 1.05)
  const evidenceModifier = getEvidenceConfidenceModifier(features)
  const venueConstraint = getVenueConstraint(features.venue)
  const settlementCompression = getSettlementCompressionFactor(severityLevel, features.hasTreatment)
  const caseStageModifier = getCaseStageModifier(features.representationStage)
  const priorInjuryModifier = getPriorInjuryModifier(features.priorInjury)
  const lienPressureModifier = getLienPressureModifier(features.billPaymentSources)
  const offerAnchor = getOfferAnchor(features.settlementOffer)
  const settlementMedian = Math.max(
    offerAnchor,
    injurySupportedValue * settlementCompression * liabilityModifier * evidenceModifier * venueConstraint * caseStageModifier * priorInjuryModifier * lienPressureModifier * chronologyModifier * calibration.settlementScale
  )
  const settlementFloor = Math.max(5000, Math.min(injurySupportedValue * 0.7, economicDamages + medicalBills * 0.4))
  // Band half-width is scaled by the calibrated bandWidthScale (1 = unchanged spread).
  const lowSpread = 1 - (1 - 0.62) * calibration.bandWidthScale
  const highSpread = 1 + (1.3 - 1) * calibration.bandWidthScale
  const constrainedSettlement = applyPolicyLimitConstraint(
    Math.max(settlementFloor, settlementMedian * lowSpread),
    Math.max(settlementFloor * 1.2, settlementMedian * highSpread),
    policyLimit,
  )

  const nonEconomicDamages = (painSufferingBySeverity[severityLevel as SeverityLevel] ?? 20000) + lifestyleSupport + concussionSupport
  const juryIntentModifier = features.litigationIntent === 'go_to_trial' ? 1.12 : features.litigationIntent === 'settle_quickly' ? 0.95 : 1
  const juryRiskModifier = (severityLevel >= 3 ? 1.25 : liability >= 0.75 ? 1.12 : 1.0) * juryIntentModifier
  const trialBaseValue = economicDamages + futureDamages + nonEconomicDamages + medicalSupport
  const trialMedian = trialBaseValue * liabilityModifier * venueConstraint * juryRiskModifier * evidenceModifier * chronologyModifier * calibration.trialScale
  const constrainedTrial = applyPolicyLimitConstraint(
    Math.max(constrainedSettlement.high * 1.15, trialMedian * 0.65),
    Math.max(constrainedSettlement.high * 1.8, trialMedian * 1.65),
    policyLimit,
  )
  
  const value_bands = {
    p25: roundToNearest(constrainedSettlement.low),
    median: roundToNearest((constrainedSettlement.low + constrainedSettlement.high) / 2),
    p75: roundToNearest(constrainedSettlement.high),
    settlement: {
      p25: roundToNearest(constrainedSettlement.low),
      median: roundToNearest((constrainedSettlement.low + constrainedSettlement.high) / 2),
      p75: roundToNearest(constrainedSettlement.high),
      formula: 'injury_supported_value * settlement_compression * liability_risk * evidence_confidence * venue_insurance_constraints',
      policyLimitConstrained: constrainedSettlement.constrained,
    },
    trial: {
      p25: roundToNearest(constrainedTrial.low),
      median: roundToNearest((constrainedTrial.low + constrainedTrial.high) / 2),
      p75: roundToNearest(constrainedTrial.high),
      formula: 'economic_damages + non_economic_damages + future_damages adjusted by liability, venue, jury risk, and evidence strength',
      policyLimitConstrained: constrainedTrial.constrained,
    },
    economics: {
      medicalBills: roundToNearest(medicalBills),
      economicDamages: roundToNearest(economicDamages),
      futureDamages: roundToNearest(futureDamages),
      injurySupportedValue: roundToNearest(injurySupportedValue),
      // True when medical specials were estimated from severity because the
      // claimant entered no economic figures at intake. The UI uses this to
      // label the estimate as preliminary and prompt for real bills.
      medicalSpecialsImputed: economicsImputed,
    },
    drivers: {
      priorInjury: features.priorInjury,
      representationStage: features.representationStage,
      surgeryStatus: features.surgeryStatus,
      imaging: features.imaging,
      procedures: features.procedures,
      futureTreatment: features.futureTreatment,
      bodyParts: features.bodyParts,
      wageLoss,
      billPaymentSources: features.billPaymentSources,
      defendantCoverageLimits: features.defendantCoverageLimits,
      litigationIntent: features.litigationIntent,
      comparativeFault: features.comparativeFault,
      concussionSymptoms: features.concussionSymptoms,
      settlementOffer: features.settlementOffer,
      lifestyleImpact: features.lifestyleImpact,
    },
  }
  
  // Explainability factors
  const explainability = []
  const severityScore = features.severityScore as SeverityScore | undefined
  if (severityScore && severityScore.level > 0) {
    explainability.push({ 
      feature: `injury_severity_${severityScore.label}`, 
      direction: '+', 
      impact: severityLift 
    })
    // Add severity factors to explainability
    if (severityScore.factors.length > 0) {
      explainability.push({ 
        feature: 'severity_factors', 
        direction: '+', 
        impact: severityScore.level * 0.02 
      })
    }
  }
  
  // V2: Add liability explainability factors
  if (liabilityScore) {
    explainability.push({ 
      feature: `liability_${liabilityScore.strength}`, 
      direction: liabilityScore.score > 0.5 ? '+' : '-', 
      impact: Math.abs(liabilityScore.score - 0.5) 
    })
    
    // Add comparative negligence if applicable
    if (liabilityScore.comparativeNegligence && liabilityScore.comparativeNegligence > 0) {
      explainability.push({ 
        feature: 'comparative_negligence', 
        direction: '-', 
        impact: liabilityScore.comparativeNegligence * 0.3 
      })
    }
    
    // Add top liability factors
    if (liabilityScore.factors.length > 0) {
      const topFactor = liabilityScore.factors[0]
      explainability.push({ 
        feature: `liability_factor: ${topFactor.substring(0, 40)}`, 
        direction: liabilityScore.score > 0.5 ? '+' : '-', 
        impact: 0.05 
      })
    }
  }
  
  if (economicsImputed) explainability.push({ feature: 'estimated_medical_specials_pending_documentation', direction: '+', impact: 0.03 })
  if (medicalBills > 10000) explainability.push({ feature: 'medical_bills_treatment_severity', direction: '+', impact: 0.06 })
  if (features.priorInjury && features.priorInjury !== 'none') explainability.push({ feature: 'prior_injury_causation_discount', direction: '-', impact: 1 - priorInjuryModifier })
  if (features.representationStage && features.representationStage !== 'no_lawyer') explainability.push({ feature: 'litigation_stage_pressure', direction: '+', impact: caseStageModifier - 1 })
  if (procedureLeverage > 1) explainability.push({ feature: 'surgery_or_procedure_leverage', direction: '+', impact: procedureLeverage - 1 })
  if (offerAnchor > 0) explainability.push({ feature: 'settlement_offer_anchor', direction: '+', impact: 0.04 })
  if (constrainedSettlement.constrained || constrainedTrial.constrained) explainability.push({ feature: 'policy_limit_constraint', direction: '-', impact: 0.08 })
  if (features.hasTreatment) explainability.push({ feature: 'treatment_continuity', direction: '+', impact: 0.05 })
  if (features.narrativeLength > 3) explainability.push({ feature: 'detailed_narrative', direction: '+', impact: 0.04 })
  // Treatment chronology & gaps-in-care (only when treatment had usable dates).
  if (chronology?.hasDates && chronologyModifier !== 1) {
    explainability.push({
      feature: `treatment_chronology_${chronology.continuity}`,
      direction: chronologyModifier >= 1 ? '+' : '-',
      impact: Math.abs(chronologyModifier - 1),
    })
  }
  // Documented ICD-10/CPT codes from uploaded records.
  if (clinicalCodes?.hasCodes && clinicalCodes.signals.length > 0) {
    explainability.push({
      feature: `documented_codes: ${clinicalCodes.factors[0] ?? ''}`.substring(0, 60),
      direction: '+',
      impact: Math.min(0.1, clinicalCodes.severityBonus * 0.03),
    })
  }
  // Outcome-calibrated coefficients (only when a non-identity calibration is deployed).
  if (!isIdentity(calibration)) {
    explainability.push({
      feature: `outcome_calibration_${calibration.version}`,
      direction: calibration.settlementScale >= 1 ? '+' : '-',
      impact: Math.abs(calibration.settlementScale - 1),
    })
  }
  
  const resp = {
    viability: { 
      overall, 
      liability, 
      causation, 
      damages, 
      ci 
    },
    value_bands,
    explainability,
    severity: features.severityScore, // Include multi-level severity score
    liability: features.liabilityScore, // V2: Include rules-based liability score
    caveats: [
      'Not legal advice',
      'Results based on limited information',
      ...(economicsImputed
        ? ['Medical specials estimated from injury severity — add your actual bills to refine this figure']
        : []),
      'Consult with qualified attorney',
    ],
    modelVersion: isIdentity(calibration) ? 'heuristic-v1.0' : `heuristic-v1.0+cal:${calibration.version}`,
    inferenceSource: 'heuristic',
  }
  
  return resp
}

export async function predictViability(features: any) {
  const heuristic = predictViabilityHeuristic(features)
  const mode = (ENV.ML_PREDICTION_MODE || 'fallback').toLowerCase()

  if (!ENV.ML_SERVICE_URL || mode === 'fallback') {
    return heuristic
  }

  const mlPrediction = await getMlPrediction(features)
  if (!mlPrediction) {
    return heuristic
  }

  const normalizedPrediction = {
    viability: mlPrediction.viability,
    value_bands: mlPrediction.value_bands,
    explainability: mlPrediction.explainability,
    severity: mlPrediction.severity ?? features.severityScore,
    liability: mlPrediction.liability ?? features.liabilityScore,
    caveats: mlPrediction.caveats,
    modelVersion: mlPrediction.model_version || 'ml-shadow-v1',
    inferenceSource: mlPrediction.source || 'artifact',
  }

  if (mode === 'shadow') {
    logger.info('ML prediction shadow comparison completed', {
      heuristicOverall: heuristic.viability.overall,
      mlOverall: normalizedPrediction.viability.overall,
      mlModelVersion: normalizedPrediction.modelVersion,
    })
    return {
      ...heuristic,
      shadowPrediction: {
        modelVersion: normalizedPrediction.modelVersion,
        inferenceSource: normalizedPrediction.inferenceSource,
        viability: normalizedPrediction.viability,
        value_bands: normalizedPrediction.value_bands,
      },
      caveats: [
        ...heuristic.caveats,
        `Shadow model ${normalizedPrediction.modelVersion} evaluated alongside heuristic output.`,
      ],
    }
  }

  return normalizedPrediction
}

export function simulateScenario(baseFeatures: any, toggles: any) {
  // Mock scenario simulation - adjust factors based on toggles
  const deltas: any = {}
  
  if (toggles.increased_medical) {
    deltas.overall = 0.07
    deltas.damages = 0.12
  }
  
  if (toggles.additional_evidence) {
    deltas.overall = 0.05
    deltas.liability = 0.08
  }
  
  if (toggles.expert_witness) {
    deltas.overall = 0.06
    deltas.causation = 0.10
  }
  
  return { deltas }
}

import type { Assessment } from '@prisma/client'
import { ENV } from '../env'
import { logger } from './logger'
import { getMlPrediction } from './ml-service'

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
  const medCharges = facts?.damages?.med_charges || 0
  const treatment = facts?.treatment || []
  const narrative = facts?.incident?.narrative?.toLowerCase() || ''
  
  const factors: string[] = []
  let score = 0
  
  // Base: No injuries = level 0
  if (injuries.length === 0 && medPaid === 0 && medCharges === 0) {
    return {
      level: 0,
      score: 0,
      label: 'none',
      factors: ['No injuries or medical expenses reported']
    }
  }
  
  // Check for catastrophic indicators (level 4)
  const catastrophicKeywords = ['death', 'deceased', 'fatal', 'permanent disability', 'paralyzed', 'coma', 'amputation', 'wrongful death']
  if (catastrophicKeywords.some(keyword => narrative.includes(keyword))) {
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
  
  // Check for severe injury keywords
  const severeKeywords = ['surgery', 'surgical', 'hospitalization', 'hospitalized', 'fracture', 'broken', 'dislocation', 'herniated', 'torn', 'severed']
  const moderateKeywords = ['sprain', 'strain', 'whiplash', 'contusion', 'laceration', 'concussion']
  const mildKeywords = ['bruise', 'scratch', 'minor', 'superficial']
  
  const narrativeLower = narrative.toLowerCase()
  if (severeKeywords.some(keyword => narrativeLower.includes(keyword))) {
    factors.push('Severe injury keywords detected')
    score += 2.0
  } else if (moderateKeywords.some(keyword => narrativeLower.includes(keyword))) {
    factors.push('Moderate injury keywords detected')
    score += 1.0
  } else if (mildKeywords.some(keyword => narrativeLower.includes(keyword))) {
    factors.push('Mild injury keywords detected')
    score += 0.3
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
    if (narrative.includes('rear-end') || narrative.includes('rear end') || narrative.includes('hit from behind')) {
      score += 0.30
      factors.push('Rear-end collision - typically strong liability for rear driver')
    }
    
    // T-bone/Broadside: Analyze who had right of way
    if (narrative.includes('t-bone') || narrative.includes('broadside') || narrative.includes('side impact')) {
      if (narrative.includes('ran red light') || narrative.includes('ran stop sign') || narrative.includes('failed to yield')) {
        score += 0.25
        factors.push('Other driver ran red light/stop sign - strong liability')
      } else {
        score += 0.10
        factors.push('T-bone collision - liability depends on right-of-way')
      }
    }
    
    // Left turn accidents: Typically favor non-turning driver
    if (narrative.includes('left turn') || narrative.includes('turning left')) {
      if (narrative.includes('oncoming') || narrative.includes('straight')) {
        score += 0.20
        factors.push('Left turn collision - typically favors non-turning driver')
      } else {
        score -= 0.10
        factors.push('Left turn collision - may involve comparative negligence')
        comparativeNegligence += 0.20
      }
    }
    
    // Head-on collisions: Analyze fault
    if (narrative.includes('head-on') || narrative.includes('head on')) {
      if (narrative.includes('wrong lane') || narrative.includes('wrong side') || narrative.includes('oncoming')) {
        score += 0.25
        factors.push('Head-on collision with other driver in wrong lane')
      } else {
        score += 0.10
        factors.push('Head-on collision - requires detailed fault analysis')
      }
    }
    
    // Parking lot accidents: Often shared fault
    if (narrative.includes('parking lot') || narrative.includes('parking')) {
      score += 0.05
      factors.push('Parking lot accident - may involve shared liability')
      comparativeNegligence += 0.15
    }
    
    // Distracted driving indicators
    if (narrative.includes('texting') || narrative.includes('phone') || narrative.includes('distracted') || narrative.includes('cell phone')) {
      score += 0.15
      factors.push('Distracted driving by other party - strengthens liability')
    }
    
    // Speeding indicators
    if (narrative.includes('speeding') || narrative.includes('too fast') || narrative.includes('excessive speed')) {
      score += 0.10
      factors.push('Other driver speeding - increases liability')
    }
    
    // DUI indicators
    if (narrative.includes('dui') || narrative.includes('drunk') || narrative.includes('intoxicated') || narrative.includes('alcohol')) {
      score += 0.20
      factors.push('DUI/intoxication by other driver - very strong liability')
    }
  }
  
  // Slip and Fall Rules
  if (claimType === 'slip_and_fall' || claimType === 'premises') {
    // Wet floor / spill indicators
    if (narrative.includes('wet') || narrative.includes('spill') || narrative.includes('liquid') || narrative.includes('water')) {
      score += 0.20
      factors.push('Wet floor/spill - property owner may be liable for maintenance')
    }
    
    // Uneven surface / defect
    if (narrative.includes('uneven') || narrative.includes('crack') || narrative.includes('defect') || narrative.includes('broken') || narrative.includes('hole')) {
      score += 0.15
      factors.push('Property defect - owner may be liable for dangerous condition')
    }
    
    // Ice/snow
    if (narrative.includes('ice') || narrative.includes('snow') || narrative.includes('slippery')) {
      score += 0.10
      factors.push('Ice/snow - depends on notice and reasonable maintenance')
      comparativeNegligence += 0.10 // Plaintiff should exercise caution
    }
    
    // No warning signs
    if (narrative.includes('no warning') || narrative.includes('no sign') || narrative.includes('unmarked')) {
      score += 0.10
      factors.push('Lack of warning signs - strengthens liability')
    }
    
    // Lighting issues
    if (narrative.includes('dark') || narrative.includes('poor lighting') || narrative.includes('dim')) {
      score += 0.08
      factors.push('Poor lighting - may indicate property owner negligence')
    }
    
    // Plaintiff was a customer/invitee
    if (narrative.includes('customer') || narrative.includes('shopping') || narrative.includes('store') || narrative.includes('restaurant')) {
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
    if (narrative.includes('provoke') || narrative.includes('tease') || narrative.includes('aggressive toward')) {
      score -= 0.20
      factors.push('Possible provocation - may reduce owner liability')
      comparativeNegligence += 0.30
    }
    
    // Known dangerous dog
    if (narrative.includes('vicious') || narrative.includes('aggressive') || narrative.includes('previous bite') || narrative.includes('history')) {
      score += 0.10
      factors.push('Known dangerous dog - increases owner liability')
    }
    
    // Leash law violation
    if (narrative.includes('off leash') || narrative.includes('unleashed') || narrative.includes('no leash')) {
      score += 0.15
      factors.push('Dog off leash - violation of leash laws strengthens case')
    }
  }
  
  // Medical Malpractice Rules
  if (claimType === 'medmal') {
    // Standard of care violations
    if (narrative.includes('misdiagnosis') || narrative.includes('wrong diagnosis') || narrative.includes('missed diagnosis')) {
      score += 0.15
      factors.push('Misdiagnosis - potential breach of standard of care')
    }
    
    if (narrative.includes('surgical error') || narrative.includes('wrong site') || narrative.includes('surgery mistake')) {
      score += 0.20
      factors.push('Surgical error - strong liability indicator')
    }
    
    if (narrative.includes('medication error') || narrative.includes('wrong medication') || narrative.includes('prescription error')) {
      score += 0.18
      factors.push('Medication error - clear liability')
    }
    
    // Informed consent
    if (narrative.includes('no consent') || narrative.includes('not informed') || narrative.includes('without consent')) {
      score += 0.12
      factors.push('Lack of informed consent - strengthens case')
    }
  }
  
  // Product Liability Rules
  if (claimType === 'product') {
    score += 0.15 // Products generally have strict liability
    factors.push('Product liability - strict liability may apply')
    
    if (narrative.includes('defect') || narrative.includes('malfunction') || narrative.includes('broke') || narrative.includes('failed')) {
      score += 0.10
      factors.push('Product defect identified - strengthens liability')
    }
    
    if (narrative.includes('warning') || narrative.includes('label') || narrative.includes('instructions')) {
      score += 0.05
      factors.push('Warning/labeling issues - may indicate manufacturer negligence')
    }
  }
  
  // Nursing Home Abuse Rules
  if (claimType === 'nursing_home_abuse') {
    score += 0.20 // High duty of care
    factors.push('Nursing home cases - high duty of care owed to residents')
    
    if (narrative.includes('neglect') || narrative.includes('abuse') || narrative.includes('mistreatment')) {
      score += 0.15
      factors.push('Abuse/neglect indicators - very strong liability')
    }
    
    if (narrative.includes('bed sore') || narrative.includes('pressure sore') || narrative.includes('ulcer')) {
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
  
  const strongFaultCount = strongFaultIndicators.filter(indicator => narrative.includes(indicator)).length
  if (strongFaultCount > 0) {
    score += Math.min(0.10, strongFaultCount * 0.02)
    factors.push(`${strongFaultCount} fault/negligence indicators in narrative`)
  }
  
  // Plaintiff fault indicators (reduces liability)
  const plaintiffFaultIndicators = [
    'my fault', 'i was', 'i should', 'i should not', 'i should have',
    'my mistake', 'i failed', 'i did not', "i didn't", 'i caused'
  ]
  
  const plaintiffFaultCount = plaintiffFaultIndicators.filter(indicator => narrative.includes(indicator)).length
  if (plaintiffFaultCount > 0) {
    score -= Math.min(0.15, plaintiffFaultCount * 0.03)
    factors.push(`${plaintiffFaultCount} plaintiff fault indicators - may reduce liability`)
    comparativeNegligence += Math.min(0.30, plaintiffFaultCount * 0.05)
  }
  
  // Witness indicators
  if (narrative.includes('witness') || narrative.includes('saw') || narrative.includes('observed')) {
    score += 0.08
    factors.push('Witness mentioned - strengthens evidence')
  }
  
  // Police report indicators
  if (narrative.includes('police') || narrative.includes('officer') || narrative.includes('citation') || narrative.includes('ticket')) {
    score += 0.05
    factors.push('Police involvement - may provide objective evidence')
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
  if (narrative.includes('photo') || narrative.includes('picture') || narrative.includes('image')) {
    score += 0.03
    factors.push('Photographic evidence mentioned in narrative')
  }
  
  if (narrative.includes('police report') || narrative.includes('police report')) {
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
  const f = a.facts as any
  const severityScore = calculateInjurySeverity(f)
  const liabilityScore = calculateLiabilityScore(f, a.venueState) // V2: Rules-based liability
  const medPaid = f?.damages?.med_paid ?? 0
  const medCharges = f?.damages?.med_charges ?? 0
  const wageLoss = f?.damages?.wage_loss ?? 0
  const hasTreatment = (f?.treatment?.length ?? 0) > 0
  
  return { 
    venue: a.venueState, 
    claimType: a.claimType, 
    severity: severityScore.level, // Multi-level severity (0-4)
    severityScore, // Full severity score object
    liabilityScore, // V2: Rules-based liability score
    medPaid,
    medCharges,
    wageLoss,
    hasTreatment,
    narrativeLength: (f?.incident?.narrative?.length ?? 0) / 100 // normalize to roughly 0-10
  }
}

function predictViabilityHeuristic(features: any) {
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
  
  // Value bands based on medical expenses and multi-level severity
  const baseValue = Math.max(10000, features.medPaid * 3)
  // Severity multipliers based on level (0-4)
  const severityMultipliers: Record<SeverityLevel, number> = {
    0: 1.0,   // No injuries: base value
    1: 1.3,   // Mild: 30% increase
    2: 1.8,   // Moderate: 80% increase
    3: 2.8,   // Severe: 180% increase
    4: 4.0    // Catastrophic: 300% increase
  }
  const severityMultiplier = severityMultipliers[severityLevel as SeverityLevel] || 1.2
  const median = baseValue * severityMultiplier
  
  const value_bands = {
    p25: Math.round(median * 0.3),
    median: Math.round(median),
    p75: Math.round(median * 2.2)
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
  
  if (features.medPaid > 10000) explainability.push({ feature: 'medical_expenses', direction: '+', impact: 0.06 })
  if (features.hasTreatment) explainability.push({ feature: 'treatment_continuity', direction: '+', impact: 0.05 })
  if (features.narrativeLength > 3) explainability.push({ feature: 'detailed_narrative', direction: '+', impact: 0.04 })
  
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
    caveats: ['Not legal advice', 'Results based on limited information', 'Consult with qualified attorney'],
    modelVersion: 'heuristic-v1.0',
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

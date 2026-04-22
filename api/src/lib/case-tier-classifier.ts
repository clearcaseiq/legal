import { prisma } from './prisma'
import { logger } from './logger'

/**
 * Case Tier Classification and Promotion Logic
 * 
 * Determines the appropriate tier for a case based on:
 * - Severity
 * - Expected settlement value
 * - Litigation complexity
 * - Lawyer ROI
 * 
 * Also handles promotion rules (e.g., Tier 2 -> Tier 3 or Tier 4)
 */

export interface CaseFacts {
  incident?: {
    date?: string
    location?: string
    narrative?: string
  }
  injuries?: Array<{
    type?: string
    severity?: number
    description?: string
    diagnosed?: boolean
    permanent?: boolean
  }>
  treatment?: Array<{
    provider?: string
    date?: string
    diagnosis?: string
    treatment?: string
    type?: string
    charges?: number
    surgery?: boolean
  }>
  damages?: {
    med_charges?: number
    med_paid?: number
    wage_loss?: number
    services?: number
  }
  liability?: {
    fault?: string
    evidence?: string[]
    negligence?: string
  }
  insurance?: {
    at_fault_party?: string
    policy_limit?: number
    own_insurance?: string
    uninsured?: boolean
  }
  venue?: {
    state?: string
    county?: string
  }
  defendant?: {
    type?: string // 'individual', 'commercial', 'government'
    name?: string
  }
  evidence?: {
    video?: boolean
    witnesses?: number
    reports?: boolean
  }
}

export interface CaseClassificationResult {
  tierId: string
  tierNumber: number
  tierName: string
  promoted: boolean
  promotionReason?: string
  baseTier: number
  estimatedValue: number
}

/**
 * Classify a case into a tier based on its characteristics
 */
export async function classifyCase(
  claimType: string,
  facts: CaseFacts | string, // Can be string (JSON) or object
  prediction?: {
    bands?: {
      median?: number
    }
  },
  venueState?: string
): Promise<CaseClassificationResult> {
  // Parse facts if string
  const caseFacts: CaseFacts = typeof facts === 'string' ? JSON.parse(facts) : facts

  // Get estimated value
  const estimatedValue = prediction?.bands?.median ||
                        caseFacts.damages?.med_charges ||
                        0

  // Get all tiers
  const tiers = await prisma.caseTier.findMany({
    where: { isActive: true },
    orderBy: { tierNumber: 'asc' }
  })

  // Determine base tier from settlement range
  let baseTier = tiers.find(t => {
    if (estimatedValue >= (t.minSettlementRange || 0)) {
      if (t.maxSettlementRange === null) {
        return true // Tier 4 (no upper limit)
      }
      return estimatedValue <= t.maxSettlementRange
    }
    return false
  })

  // Default to Tier 1 if no match
  if (!baseTier) {
    baseTier = tiers.find(t => t.tierNumber === 1)!
  }

  // Check for promotion rules (currently only Tier 2 can be promoted)
  if (baseTier.tierNumber === 2) {
    const promotionResult = checkPromotionRules(caseFacts, baseTier, venueState)
    
    if (promotionResult.promoted) {
      const promotedTier = tiers.find(t => t.tierNumber === promotionResult.promoteTo)
      
      if (promotedTier) {
        return {
          tierId: promotedTier.id,
          tierNumber: promotedTier.tierNumber,
          tierName: promotedTier.name,
          promoted: true,
          promotionReason: promotionResult.reason,
          baseTier: baseTier.tierNumber,
          estimatedValue
        }
      }
    }
  }

  return {
    tierId: baseTier.id,
    tierNumber: baseTier.tierNumber,
    tierName: baseTier.name,
    promoted: false,
    baseTier: baseTier.tierNumber,
    estimatedValue
  }
}

/**
 * Check if a Tier 2 case should be promoted based on promotion rules
 */
function checkPromotionRules(
  facts: CaseFacts,
  tier2: any,
  venueState?: string
): { promoted: boolean; promoteTo?: number; reason?: string } {
  if (!tier2.promotionRules) {
    return { promoted: false }
  }

  try {
    const rules = JSON.parse(tier2.promotionRules)
    const promotionFactors: string[] = []

    // Check Tier 3 promotion conditions
    if (rules.canPromoteToTier3) {
      for (const rule of rules.canPromoteToTier3) {
        if (checkPromotionCondition(rule.condition, facts, venueState)) {
          promotionFactors.push(rule.condition)
          
          // Check if this should promote to Tier 4 instead
          const tier4Check = checkTier4Promotion(facts, venueState, promotionFactors)
          if (tier4Check.promoted) {
            return tier4Check
          }
          
          return {
            promoted: true,
            promoteTo: rule.promoteTo,
            reason: rule.description
          }
        }
      }
    }

    // Check Tier 4 promotion conditions
    if (rules.canPromoteToTier4) {
      for (const rule of rules.canPromoteToTier4) {
        if (checkPromotionCondition(rule.condition, facts, venueState, promotionFactors)) {
          return {
            promoted: true,
            promoteTo: rule.promoteTo,
            reason: rule.description
          }
        }
      }
    }

    return { promoted: false }
  } catch (error) {
    logger.error('Failed to parse promotion rules', { error, tierId: tier2.id })
    return { promoted: false }
  }
}

/**
 * Check a specific promotion condition
 */
function checkPromotionCondition(
  condition: string,
  facts: CaseFacts,
  venueState?: string,
  existingFactors?: string[]
): boolean {
  switch (condition) {
    case 'surgery':
      // Check if any treatment includes surgery
      return facts.treatment?.some(t => t.surgery === true) ||
             facts.treatment?.some(t => 
               t.treatment?.toLowerCase().includes('surgery') ||
               t.diagnosis?.toLowerCase().includes('surgical')
             ) || false

    case 'permanent_disability':
      // Check if any injury is marked as permanent
      return facts.injuries?.some(i => i.permanent === true) || false

    case 'government_defendant':
      // Check if defendant is government or commercial
      return facts.defendant?.type === 'government' ||
             facts.defendant?.type === 'commercial' || false

    case 'clear_negligence_high_limits':
      // Check for clear negligence and high policy limits
      const hasClearNegligence = facts.liability?.negligence === 'clear' ||
                                 facts.liability?.fault === 'other_party'
      const hasHighLimits = (facts.insurance?.policy_limit || 0) >= 100000
      return hasClearNegligence && hasHighLimits

    case 'venue_advantage':
      // Check if venue is in CA, NY, or TX
      const advantageStates = ['CA', 'NY', 'TX']
      return venueState ? advantageStates.includes(venueState.toUpperCase()) : false

    case 'strong_evidence':
      // Check for video, multiple witnesses, or reports
      const hasVideo = facts.evidence?.video === true
      const hasWitnesses = (facts.evidence?.witnesses || 0) >= 2
      const hasReports = facts.evidence?.reports === true
      return hasVideo || hasWitnesses || hasReports

    case 'surgery_and_permanent_disability':
      return checkPromotionCondition('surgery', facts) &&
             checkPromotionCondition('permanent_disability', facts)

    case 'catastrophic_surgery':
      // Surgery with severe complications or high medical bills
      const hasSurgery = checkPromotionCondition('surgery', facts)
      const highBills = (facts.damages?.med_charges || 0) >= 100000
      return hasSurgery && highBills

    case 'high_value_government':
      return checkPromotionCondition('government_defendant', facts) &&
             checkPromotionCondition('clear_negligence_high_limits', facts) &&
             checkPromotionCondition('strong_evidence', facts)

    case 'multiple_promotion_factors':
      // At least 2 of: surgery, permanent_disability, strong_evidence
      if (!existingFactors) return false
      const requiredFactors = ['surgery', 'permanent_disability', 'strong_evidence']
      const matchingFactors = requiredFactors.filter(f => 
        existingFactors.includes(f) || checkPromotionCondition(f, facts)
      )
      return matchingFactors.length >= 2

    default:
      return false
  }
}

/**
 * Check if case should be promoted to Tier 4
 */
function checkTier4Promotion(
  facts: CaseFacts,
  venueState?: string,
  existingFactors?: string[]
): { promoted: boolean; promoteTo?: number; reason?: string } {
  // Check for catastrophic conditions
  const hasSurgery = checkPromotionCondition('surgery', facts)
  const hasPermanentDisability = checkPromotionCondition('permanent_disability', facts)
  const hasStrongEvidence = checkPromotionCondition('strong_evidence', facts)

  // Multiple severe factors = Tier 4
  const severeFactors = [hasSurgery, hasPermanentDisability, hasStrongEvidence].filter(Boolean).length
  
  if (severeFactors >= 2) {
    return {
      promoted: true,
      promoteTo: 4,
      reason: 'Multiple severe factors: surgery, permanent disability, and/or strong evidence'
    }
  }

  // Catastrophic surgery
  if (checkPromotionCondition('catastrophic_surgery', facts)) {
    return {
      promoted: true,
      promoteTo: 4,
      reason: 'Catastrophic surgery complications'
    }
  }

  // High-value government case with strong evidence
  if (checkPromotionCondition('high_value_government', facts)) {
    return {
      promoted: true,
      promoteTo: 4,
      reason: 'Government defendant + high policy limits + strong evidence'
    }
  }

  return { promoted: false }
}

/**
 * Assign tier to an assessment
 */
export async function assignCaseTier(assessmentId: string): Promise<CaseClassificationResult> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      predictions: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  })

  if (!assessment) {
    throw new Error('Assessment not found')
  }

  const facts = JSON.parse(assessment.facts)
  const prediction = assessment.predictions[0] ? {
    bands: JSON.parse(assessment.predictions[0].bands)
  } : undefined

  const classification = await classifyCase(
    assessment.claimType,
    facts,
    prediction,
    assessment.venueState
  )

  // Update assessment with tier
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { caseTierId: classification.tierId }
  })

  logger.info('Case tier assigned', {
    assessmentId,
    tier: classification.tierName,
    promoted: classification.promoted,
    promotionReason: classification.promotionReason
  })

  return classification
}

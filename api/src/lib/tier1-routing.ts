import { prisma } from './prisma'
import { logger } from './logger'
import { CaseFacts } from './case-tier-classifier'
import { CaseForRouting } from './routing'
import { sendCaseOfferSms } from './sms'

/**
 * Tier 1 Case Routing Engine
 * 
 * Implements the Tier 1 routing specification:
 * - Subscription-first allocation (45s timeout, max 3 attempts)
 * - Fixed-price routing (30s timeout, max 5 attempts)
 * - Sequential offers (no mass blasting)
 * - Inventory hold on failure
 */

// Configuration constants
const TIER_1_SUBSCRIPTION_TIMEOUT_MS = 45 * 1000 // 45 seconds
const TIER_1_FIXED_TIMEOUT_MS = 30 * 1000 // 30 seconds
const MAX_SUBSCRIPTION_ATTEMPTS = 3
const MAX_FIXED_PRICE_ATTEMPTS = 5
const MAX_SIMULTANEOUS_OFFERS = 1 // Critical safeguard
const TIER_1_FIXED_PRICE = 200 // $200 default (configurable)

// Tier 1 claim types
const TIER_1_CLAIM_TYPES = ['auto_minor', 'premises_minor', 'dog_bite_minor']

// Supported states for Tier 1 (example - should be configurable)
const SUPPORTED_STATES = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI']

export interface Tier1FirmForRouting {
  id: string // Attorney ID (using Attorney as "firm" for now)
  active: boolean // attorney.isActive
  state: string[] // jurisdictions states
  practiceAreas: string[] // specialties
  tier1Enabled: boolean // derived from subscriptionTier/pricingModel
  dailyCapRemaining: number // derived from maxCasesPerWeek/calculated
  accountBalance: number // placeholder - not in schema yet
  subscriptionActive: boolean // paymentModel === 'subscription' || paymentModel === 'both'
  subscriptionTier?: string | null // subscriptionTier field
  subscriptionRemainingCases?: number // placeholder - not in schema yet
  // Additional fields for ranking
  historicalAcceptanceRate?: number
  responseSpeedScore?: number
  recentConversionScore?: number
  recentTier1ConversionRate?: number
  accountBalanceWeight?: number
  attorney: any // Full attorney object
}

export interface Tier1CaseData {
  id: string
  claimType: string
  venueState: string
  venueCounty?: string | null
  facts: CaseFacts
  tierNumber: number
  // Tier 1 classification data
  injurySeverityScore: number
  hasSurgery: boolean
  medPaid: number
  hasCatastrophicFlags: boolean
}

export interface Tier1RoutingResult {
  routed: boolean
  routedToFirmId?: string
  introductionId?: string
  method?: 'subscription' | 'fixed_price'
  attempts?: {
    subscription: number
    fixedPrice: number
  }
  holdReason?: string
  error?: string
}

/**
 * Check if a case qualifies as Tier 1
 */
export function isTier1Case(
  claimType: string,
  facts: CaseFacts,
  venueState?: string
): {
  isTier1: boolean
  reason?: string
  data?: {
    injurySeverityScore: number
    hasSurgery: boolean
    medPaid: number
    hasCatastrophicFlags: boolean
  }
} {
  // 1. Check claim type
  if (!TIER_1_CLAIM_TYPES.includes(claimType)) {
    return { isTier1: false, reason: `Claim type ${claimType} not in Tier 1 types` }
  }

  // 2. Calculate injury severity score (0-4, Tier 1 requires ≤ 1)
  const maxSeverity = Math.max(
    0,
    ...(facts.injuries?.map(i => i.severity || 0) || []),
    facts.damages?.med_charges ? (facts.damages.med_charges > 5000 ? 1 : 0) : 0
  )
  const injurySeverityScore = maxSeverity

  if (injurySeverityScore > 1) {
    return { isTier1: false, reason: `Injury severity score ${injurySeverityScore} > 1` }
  }

  // 3. Check for surgery
  const hasSurgery = facts.treatment?.some(t => t.surgery === true) || false
  if (hasSurgery) {
    return { isTier1: false, reason: 'Case involves surgery' }
  }

  // 4. Check med_paid < $10,000
  const medPaid = facts.damages?.med_paid || 0
  if (medPaid >= 10000) {
    return { isTier1: false, reason: `Medical paid $${medPaid} >= $10,000` }
  }

  // 5. Check for catastrophic flags
  const hasPermanentDisability = facts.injuries?.some(i => i.permanent === true) || false
  const hasHighBills = (facts.damages?.med_charges || 0) >= 50000
  const hasCatastrophicFlags = hasPermanentDisability || hasHighBills

  if (hasCatastrophicFlags) {
    return { isTier1: false, reason: 'Case has catastrophic flags' }
  }

  // 6. Check venue (state supported)
  if (venueState && !SUPPORTED_STATES.includes(venueState.toUpperCase())) {
    return { isTier1: false, reason: `State ${venueState} not supported for Tier 1` }
  }

  return {
    isTier1: true,
    data: {
      injurySeverityScore,
      hasSurgery: false,
      medPaid,
      hasCatastrophicFlags: false
    }
  }
}

/**
 * STEP 0: Build Eligible Firm Pool
 */
export async function buildEligibleFirmPool(
  caseData: Tier1CaseData
): Promise<{
  eligible: Tier1FirmForRouting[]
  ineligible: Array<{ firmId: string; reason: string }>
}> {
  const eligible: Tier1FirmForRouting[] = []
  const ineligible: Array<{ firmId: string; reason: string }> = []

  // Get all active attorneys with profiles
  const attorneys = await prisma.attorney.findMany({
    where: {
      isActive: true,
      isVerified: true
    },
    include: {
      attorneyProfile: true
    }
  })

  for (const attorney of attorneys) {
    const profile = attorney.attorneyProfile

    // 1. firm.active === true
    if (!attorney.isActive) {
      ineligible.push({ firmId: attorney.id, reason: 'Attorney not active' })
      continue
    }

    // 2. firm.state.includes(case.state)
    if (!profile?.jurisdictions) {
      ineligible.push({ firmId: attorney.id, reason: 'No jurisdictions configured' })
      continue
    }

    try {
      const jurisdictions = JSON.parse(profile.jurisdictions) as Array<{
        state: string
        counties?: string[]
      }>
      const stateMatch = jurisdictions.find(
        j => j.state.toUpperCase() === caseData.venueState.toUpperCase()
      )
      if (!stateMatch) {
        ineligible.push({ firmId: attorney.id, reason: `State ${caseData.venueState} not covered` })
        continue
      }
    } catch (error) {
      ineligible.push({ firmId: attorney.id, reason: 'Invalid jurisdictions configuration' })
      continue
    }

    // 3. firm.practiceAreas.includes(case.type)
    try {
      const specialties = JSON.parse(attorney.specialties) as string[]
      const caseTypeMatch = specialties.some(
        s => s.toLowerCase() === caseData.claimType.toLowerCase() ||
             s.toLowerCase().replace(/_/g, ' ') === caseData.claimType.toLowerCase().replace(/_/g, ' ')
      )
      if (!caseTypeMatch) {
        ineligible.push({ firmId: attorney.id, reason: `Case type ${caseData.claimType} not covered` })
        continue
      }
    } catch (error) {
      ineligible.push({ firmId: attorney.id, reason: 'Invalid specialties configuration' })
      continue
    }

    // 4. firm.tier1Enabled === true
    // For now, consider tier1Enabled if:
    // - subscriptionTier includes "Tier1" OR
    // - pricingModel allows fixed_price and paymentModel allows pay_per_case
    const subscriptionTier = profile?.subscriptionTier || null
    const pricingModel = profile?.pricingModel || null
    const paymentModel = profile?.paymentModel || null
    
    const tier1Enabled = 
      (subscriptionTier && subscriptionTier.toLowerCase().includes('tier1')) ||
      (pricingModel === 'fixed_price' || pricingModel === 'both') ||
      (paymentModel === 'pay_per_case' || paymentModel === 'both')

    if (!tier1Enabled) {
      ineligible.push({ firmId: attorney.id, reason: 'Tier 1 not enabled' })
      continue
    }

    // 5. firm.dailyCapRemaining > 0
    // Calculate from maxCasesPerWeek (assume 5 days per week)
    const maxCasesPerWeek = profile?.maxCasesPerWeek || null
    const now = new Date()
    let dailyCapRemaining = 999 // Default to unlimited if no cap set
    
    if (maxCasesPerWeek !== null) {
      const dailyCap = Math.ceil(maxCasesPerWeek / 5)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const casesToday = await prisma.introduction.count({
        where: {
          attorneyId: attorney.id,
          requestedAt: { gte: todayStart }
        }
      })

      dailyCapRemaining = dailyCap - casesToday
      if (dailyCapRemaining <= 0) {
        ineligible.push({ firmId: attorney.id, reason: 'Daily cap reached' })
        continue
      }
    }

    // 6. firm.accountBalance > 0 OR firm.subscriptionActive === true
    const subscriptionActive = 
      paymentModel === 'subscription' || 
      paymentModel === 'both' ||
      (subscriptionTier !== null && subscriptionTier !== '')
    
    // For now, assume subscriptionActive firms have balance
    // In production, check actual account balance
    const accountBalance = subscriptionActive ? 1000 : 0 // Placeholder

    if (!subscriptionActive && accountBalance <= 0) {
      ineligible.push({ firmId: attorney.id, reason: 'No account balance and no active subscription' })
      continue
    }

    // Parse jurisdictions for state list
    let states: string[] = []
    try {
      const jurisdictions = JSON.parse(profile?.jurisdictions || '[]') as Array<{ state: string }>
      states = jurisdictions.map(j => j.state)
    } catch (error) {
      states = []
    }

    // Parse specialties for practice areas
    let practiceAreas: string[] = []
    try {
      practiceAreas = JSON.parse(attorney.specialties) as string[]
    } catch (error) {
      practiceAreas = []
    }

    // Build firm object
    const firm: Tier1FirmForRouting = {
      id: attorney.id,
      active: attorney.isActive,
      state: states,
      practiceAreas,
      tier1Enabled: true,
      dailyCapRemaining,
      accountBalance,
      subscriptionActive,
      subscriptionTier: subscriptionTier || null,
      subscriptionRemainingCases: subscriptionActive ? 10 : undefined, // Placeholder - would need subscription tracking table
      attorney
    }

    eligible.push(firm)
  }

  return { eligible, ineligible }
}

/**
 * Check if firm is eligible for Tier 1 subscription routing
 */
function isSubscriptionEligible(firm: Tier1FirmForRouting): boolean {
  return (
    firm.subscriptionActive === true &&
    (firm.subscriptionTier?.toLowerCase().includes('tier1') || 
     firm.subscriptionTier?.toLowerCase() === 'basic') &&
    (firm.subscriptionRemainingCases || 0) > 0
  )
}

/**
 * Calculate subscription ranking score
 */
function calculateSubscriptionRankScore(firm: Tier1FirmForRouting): number {
  const remainingCases = firm.subscriptionRemainingCases || 0
  const acceptanceRate = firm.historicalAcceptanceRate || 0.5
  const responseSpeed = firm.responseSpeedScore || 0.5
  const conversionScore = firm.recentConversionScore || 0.5

  // rankScore = (subscriptionRemainingCases DESC) + (historicalAcceptanceRate * 0.4) + 
  //            (responseSpeedScore * 0.3) + (recentConversionScore * 0.3)
  // For remainingCases, normalize to 0-1 range (assuming max 100)
  const normalizedRemaining = Math.min(remainingCases / 100, 1)
  
  return normalizedRemaining + (acceptanceRate * 0.4) + (responseSpeed * 0.3) + (conversionScore * 0.3)
}

/**
 * Calculate fixed-price ranking score
 */
function calculateFixedPriceRankScore(firm: Tier1FirmForRouting): number {
  const acceptanceRate = firm.historicalAcceptanceRate || 0.5
  const responseSpeed = firm.responseSpeedScore || 0.5
  const tier1Conversion = firm.recentTier1ConversionRate || 0.5
  const balanceWeight = firm.accountBalanceWeight || 0.5

  // rankScore = (historicalAcceptanceRate * 0.35) + (responseSpeedScore * 0.25) + 
  //            (recentTier1ConversionRate * 0.25) + (accountBalanceWeight * 0.15)
  return (acceptanceRate * 0.35) + (responseSpeed * 0.25) + (tier1Conversion * 0.25) + (balanceWeight * 0.15)
}

/**
 * Send offer to firm (create Introduction)
 */
async function sendOfferToFirm(
  caseId: string,
  firmId: string,
  method: 'subscription' | 'fixed_price'
): Promise<string> {
  // Check if introduction already exists
  const existing = await prisma.introduction.findFirst({
    where: {
      assessmentId: caseId,
      attorneyId: firmId
    }
  })

  if (existing) {
    return existing.id
  }

  // Create introduction (offer)
  const intro = await prisma.introduction.create({
    data: {
      assessmentId: caseId,
      attorneyId: firmId,
      status: 'PENDING',
      message: method === 'subscription' 
        ? 'Tier 1 case - Subscription allocation'
        : 'Tier 1 case - Fixed price offer',
      requestedAt: new Date()
    }
  })

  logger.info('Tier 1 offer sent', {
    introductionId: intro.id,
    caseId,
    firmId,
    method
  })

  const smsSummary = method === 'subscription' ? 'Tier 1 case - Subscription allocation' : 'Tier 1 case - Fixed price offer'
  await sendCaseOfferSms(firmId, intro.id, smsSummary, Math.ceil(TIER_1_SUBSCRIPTION_TIMEOUT_MS / 60000))

  return intro.id
}

/**
 * Wait for offer response with timeout
 */
async function waitForOfferResponse(
  introductionId: string,
  timeoutMs: number
): Promise<'accepted' | 'declined' | 'timeout'> {
  const startTime = Date.now()
  const checkInterval = 1000 // Check every second

  while (Date.now() - startTime < timeoutMs) {
    const intro = await prisma.introduction.findUnique({
      where: { id: introductionId }
    })

    if (!intro) {
      return 'declined'
    }

    if (intro.status === 'ACCEPTED') {
      return 'accepted'
    }

    if (intro.status === 'DECLINED' || intro.status === 'REJECTED') {
      return 'declined'
    }

    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, checkInterval))
  }

  return 'timeout'
}

/**
 * STEP 1: Subscription Allocation (FIRST PRIORITY)
 */
async function routeSubscriptionAllocation(
  caseData: Tier1CaseData,
  eligibleFirms: Tier1FirmForRouting[]
): Promise<{
  routed: boolean
  introductionId?: string
  firmId?: string
  attempts: number
}> {
  const subscriptionFirms = eligibleFirms.filter(isSubscriptionEligible)

  if (subscriptionFirms.length === 0) {
    return { routed: false, attempts: 0 }
  }

  // Rank subscription firms
  const ranked = subscriptionFirms
    .map(firm => ({
      firm,
      score: calculateSubscriptionRankScore(firm)
    }))
    .sort((a, b) => b.score - a.score) // Descending

  // Try up to MAX_SUBSCRIPTION_ATTEMPTS firms
  const maxAttempts = Math.min(MAX_SUBSCRIPTION_ATTEMPTS, ranked.length)

  for (let i = 0; i < maxAttempts; i++) {
    const { firm } = ranked[i]

    try {
      // Send exclusive offer
      const introductionId = await sendOfferToFirm(caseData.id, firm.id, 'subscription')

      // Wait for response (45 seconds)
      const response = await waitForOfferResponse(introductionId, TIER_1_SUBSCRIPTION_TIMEOUT_MS)

      if (response === 'accepted') {
        // Decrement subscription remaining cases (placeholder - would update actual field)
        logger.info('Tier 1 subscription offer accepted', {
          caseId: caseData.id,
          firmId: firm.id,
          introductionId
        })

        return {
          routed: true,
          introductionId,
          firmId: firm.id,
          attempts: i + 1
        }
      }

      // If declined or timeout, move to next firm
      logger.info('Tier 1 subscription offer declined/timeout', {
        caseId: caseData.id,
        firmId: firm.id,
        introductionId,
        response
      })
    } catch (error) {
      logger.error('Error in subscription allocation', {
        error,
        caseId: caseData.id,
        firmId: firm.id
      })
    }
  }

  return { routed: false, attempts: maxAttempts }
}

/**
 * STEP 2: Fixed-Price Routing
 */
async function routeFixedPrice(
  caseData: Tier1CaseData,
  eligibleFirms: Tier1FirmForRouting[]
): Promise<{
  routed: boolean
  introductionId?: string
  firmId?: string
  attempts: number
}> {
  // Filter out subscription firms (they already had their chance)
  const fixedPriceFirms = eligibleFirms.filter(f => !isSubscriptionEligible(f))

  if (fixedPriceFirms.length === 0) {
    return { routed: false, attempts: 0 }
  }

  // Rank fixed-price firms
  const ranked = fixedPriceFirms
    .map(firm => ({
      firm,
      score: calculateFixedPriceRankScore(firm)
    }))
    .sort((a, b) => b.score - a.score) // Descending

  // Take top 5
  const topFirms = ranked.slice(0, MAX_FIXED_PRICE_ATTEMPTS)

  for (let i = 0; i < topFirms.length; i++) {
    const { firm } = topFirms[i]

    try {
      // Send offer
      const introductionId = await sendOfferToFirm(caseData.id, firm.id, 'fixed_price')

      // Wait for response (30 seconds)
      const response = await waitForOfferResponse(introductionId, TIER_1_FIXED_TIMEOUT_MS)

      if (response === 'accepted') {
        // Charge firm (placeholder - would update account balance)
        logger.info('Tier 1 fixed-price offer accepted', {
          caseId: caseData.id,
          firmId: firm.id,
          introductionId,
          price: TIER_1_FIXED_PRICE
        })

        return {
          routed: true,
          introductionId,
          firmId: firm.id,
          attempts: i + 1
        }
      }

      // If declined or timeout, move to next firm
      logger.info('Tier 1 fixed-price offer declined/timeout', {
        caseId: caseData.id,
        firmId: firm.id,
        introductionId,
        response
      })
    } catch (error) {
      logger.error('Error in fixed-price routing', {
        error,
        caseId: caseData.id,
        firmId: firm.id
      })
    }
  }

  return { routed: false, attempts: topFirms.length }
}

/**
 * STEP 3: Mark case as Inventory Hold
 */
async function markCaseHold(caseId: string): Promise<void> {
  await prisma.assessment.update({
    where: { id: caseId },
    data: {
      status: 'TIER1_HOLD'
    }
  })

  logger.info('Case marked as Tier 1 hold', { caseId })
}

/**
 * MAIN TIER 1 ROUTING FUNCTION
 */
export async function routeTier1Case(caseId: string): Promise<Tier1RoutingResult> {
  try {
    // Load case data
    const assessment = await prisma.assessment.findUnique({
      where: { id: caseId },
      include: {
        caseTier: true,
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!assessment) {
      return { routed: false, error: 'Case not found' }
    }

    // Verify it's Tier 1
    if (!assessment.caseTier || assessment.caseTier.tierNumber !== 1) {
      return { routed: false, error: 'Case is not Tier 1' }
    }

    const facts = JSON.parse(assessment.facts) as CaseFacts
    const tier1Check = isTier1Case(assessment.claimType, facts, assessment.venueState)

    if (!tier1Check.isTier1) {
      return { routed: false, error: `Case does not qualify as Tier 1: ${tier1Check.reason}` }
    }

    const caseData: Tier1CaseData = {
      id: assessment.id,
      claimType: assessment.claimType,
      venueState: assessment.venueState,
      venueCounty: assessment.venueCounty || null,
      facts,
      tierNumber: 1,
      ...tier1Check.data!
    }

    // STEP 0: Build Eligible Firm Pool
    const { eligible, ineligible } = await buildEligibleFirmPool(caseData)

    if (eligible.length === 0) {
      await markCaseHold(caseId)
      return {
        routed: false,
        holdReason: 'No eligible firms found',
        attempts: {
          subscription: 0,
          fixedPrice: 0
        }
      }
    }

    logger.info('Tier 1 eligible firms', {
      caseId,
      eligibleCount: eligible.length,
      ineligibleCount: ineligible.length
    })

    // STEP 1: Subscription Allocation (FIRST PRIORITY)
    const subscriptionResult = await routeSubscriptionAllocation(caseData, eligible)

    if (subscriptionResult.routed) {
      return {
        routed: true,
        routedToFirmId: subscriptionResult.firmId,
        introductionId: subscriptionResult.introductionId,
        method: 'subscription',
        attempts: {
          subscription: subscriptionResult.attempts,
          fixedPrice: 0
        }
      }
    }

    // STEP 2: Fixed-Price Routing
    const fixedPriceResult = await routeFixedPrice(caseData, eligible)

    if (fixedPriceResult.routed) {
      return {
        routed: true,
        routedToFirmId: fixedPriceResult.firmId,
        introductionId: fixedPriceResult.introductionId,
        method: 'fixed_price',
        attempts: {
          subscription: subscriptionResult.attempts,
          fixedPrice: fixedPriceResult.attempts
        }
      }
    }

    // STEP 3: Failover - Mark as Hold
    await markCaseHold(caseId)

    return {
      routed: false,
      holdReason: 'No firms accepted after all attempts',
      attempts: {
        subscription: subscriptionResult.attempts,
        fixedPrice: fixedPriceResult.attempts
      }
    }
  } catch (error) {
    logger.error('Error in Tier 1 routing', { error, caseId })
    return {
      routed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

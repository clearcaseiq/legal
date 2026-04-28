import { prisma } from './prisma'
import { logger } from './logger'

/**
 * Step 0: Hard Eligibility Filter
 * Filters attorneys based on non-negotiable requirements before scoring
 * 
 * @param assessment - The assessment/case to route
 * @param attorneys - Array of attorneys to filter
 * @returns Array of eligible attorneys
 */
export interface CaseForRouting {
  id: string
  claimType: string
  venueState: string
  venueCounty?: string | null
  facts?: any // For severity/damages checks
  prediction?: {
    viability?: {
      overall?: number
      liability?: number
      causation?: number
      damages?: number
    }
    bands?: {
      p25?: number
      median?: number
      p75?: number
    }
  }
}

export interface AttorneyForRouting {
  id: string
  isActive: boolean
  isVerified: boolean
  specialties: string | null // JSON array
  responseTimeHours?: number
  averageRating?: number
  totalReviews?: number
  subscriptionTier?: string | null
  pricingModel?: string | null
  paymentModel?: string | null
  attorneyProfile: {
    jurisdictions: string | null // JSON array of {state, counties: []}
    excludedCaseTypes: string | null // JSON array
    languages?: string | null
    minInjurySeverity: number | null
    minDamagesRange: number | null
    maxDamagesRange: number | null
    maxCasesPerWeek: number | null
    maxCasesPerMonth: number | null
    intakeHours?: string | null
    successRate?: number | null
    averageSettlement?: number | null
    totalCases?: number | null
    yearsExperience?: number | null
  } | null
  // Additional data for scoring (loaded separately)
  conversionRate?: number // From introductions to retained
  platformRevenue?: number // Historical platform revenue
  complaints?: number // Number of complaints (future)
  currentCasesWeek?: number
  currentCasesMonth?: number
}

export interface EligibilityResult {
  eligible: boolean
  reason?: string // If not eligible, why
}

/**
 * Check if attorney is eligible for a case (Step 0 - Hard Filter)
 */
export async function checkAttorneyEligibility(
  attorney: AttorneyForRouting,
  caseData: CaseForRouting
): Promise<EligibilityResult> {
  const ethicalWall = await prisma.ethicalWall.findFirst({
    where: {
      assessmentId: caseData.id,
      blockedAttorneyId: attorney.id
    },
    select: { id: true }
  })
  if (ethicalWall) {
    return { eligible: false, reason: 'Attorney blocked by ethical wall' }
  }

  // 1. Must be active and verified (good standing)
  if (!attorney.isActive) {
    return { eligible: false, reason: 'Attorney is not active' }
  }

  if (!attorney.isVerified) {
    return { eligible: false, reason: 'Attorney is not verified' }
  }

  // 2. Must serve state + county
  if (!attorney.attorneyProfile?.jurisdictions) {
    return { eligible: false, reason: 'No jurisdictions configured' }
  }

  try {
    const jurisdictions = JSON.parse(attorney.attorneyProfile.jurisdictions) as Array<{
      state: string
      counties?: string[]
    }>

    // Check if attorney serves the state
    const stateMatch = jurisdictions.find(j => 
      j.state.toUpperCase() === caseData.venueState.toUpperCase()
    )

    if (!stateMatch) {
      return { eligible: false, reason: `Does not serve state: ${caseData.venueState}` }
    }

    // If case has a county, check if attorney serves that county
    // If attorney has no counties listed for the state, they serve all counties
    if (caseData.venueCounty && stateMatch.counties && stateMatch.counties.length > 0) {
      const countyMatch = stateMatch.counties.some(county =>
        county.toLowerCase() === caseData.venueCounty?.toLowerCase()
      )

      if (!countyMatch) {
        return { eligible: false, reason: `Does not serve county: ${caseData.venueCounty}` }
      }
    }
  } catch (error) {
    logger.error('Failed to parse jurisdictions', { error, attorneyId: attorney.id })
    return { eligible: false, reason: 'Invalid jurisdictions configuration' }
  }

  // 3. Must cover case type
  if (!attorney.specialties) {
    return { eligible: false, reason: 'No specialties configured' }
  }

  try {
    const specialties = JSON.parse(attorney.specialties) as string[]
    const caseTypeMatch = specialties.some(specialty =>
      specialty.toLowerCase() === caseData.claimType.toLowerCase() ||
      specialty.toLowerCase().replace(/_/g, ' ') === caseData.claimType.toLowerCase().replace(/_/g, ' ')
    )

    if (!caseTypeMatch) {
      return { eligible: false, reason: `Does not handle case type: ${caseData.claimType}` }
    }
  } catch (error) {
    logger.error('Failed to parse specialties', { error, attorneyId: attorney.id })
    return { eligible: false, reason: 'Invalid specialties configuration' }
  }

  // 4. Must not exclude the case type
  if (attorney.attorneyProfile.excludedCaseTypes) {
    try {
      const excludedTypes = JSON.parse(attorney.attorneyProfile.excludedCaseTypes) as string[]
      const isExcluded = excludedTypes.some(excluded =>
        excluded.toLowerCase() === caseData.claimType.toLowerCase() ||
        excluded.toLowerCase().replace(/_/g, ' ') === caseData.claimType.toLowerCase().replace(/_/g, ' ')
      )

      if (isExcluded) {
        return { eligible: false, reason: `Case type excluded: ${caseData.claimType}` }
      }
    } catch (error) {
      logger.error('Failed to parse excluded case types', { error, attorneyId: attorney.id })
      // Don't fail on parse error, just log it
    }
  }

  // 5. Must not exclude based on severity/tier
  // Check minimum injury severity if set
  if (attorney.attorneyProfile.minInjurySeverity !== null && 
      attorney.attorneyProfile.minInjurySeverity !== undefined) {
    // Try to get severity from case facts
    const caseSeverity = caseData.facts?.severity || 
                         caseData.facts?.injuries?.[0]?.severity || 
                         0

    if (caseSeverity < attorney.attorneyProfile.minInjurySeverity) {
      return { 
        eligible: false, 
        reason: `Case severity ${caseSeverity} below minimum ${attorney.attorneyProfile.minInjurySeverity}` 
      }
    }
  }

  // Check damages range if set
  const estimatedValue = caseData.prediction?.bands?.median || 
                        caseData.facts?.damages?.med_charges ||
                        0

  if (attorney.attorneyProfile.minDamagesRange !== null && 
      attorney.attorneyProfile.minDamagesRange !== undefined) {
    if (estimatedValue < attorney.attorneyProfile.minDamagesRange) {
      return { 
        eligible: false, 
        reason: `Estimated value ${estimatedValue} below minimum ${attorney.attorneyProfile.minDamagesRange}` 
      }
    }
  }

  if (attorney.attorneyProfile.maxDamagesRange !== null && 
      attorney.attorneyProfile.maxDamagesRange !== undefined) {
    if (estimatedValue > attorney.attorneyProfile.maxDamagesRange) {
      return { 
        eligible: false, 
        reason: `Estimated value ${estimatedValue} above maximum ${attorney.attorneyProfile.maxDamagesRange}` 
      }
    }
  }

  // 6. Must have remaining capacity
  const now = new Date()
  const weekStart = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000))
  weekStart.setHours(0, 0, 0, 0)
  
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Count cases assigned this week
  if (attorney.attorneyProfile.maxCasesPerWeek !== null) {
    const casesThisWeek = await prisma.introduction.count({
      where: {
        attorneyId: attorney.id,
        requestedAt: {
          gte: weekStart
        }
      }
    })

    if (casesThisWeek >= attorney.attorneyProfile.maxCasesPerWeek) {
      return { 
        eligible: false, 
        reason: `Weekly capacity reached: ${casesThisWeek}/${attorney.attorneyProfile.maxCasesPerWeek}` 
      }
    }
  }

  // Count cases assigned this month
  if (attorney.attorneyProfile.maxCasesPerMonth !== null) {
    const casesThisMonth = await prisma.introduction.count({
      where: {
        attorneyId: attorney.id,
        requestedAt: {
          gte: monthStart
        }
      }
    })

    if (casesThisMonth >= attorney.attorneyProfile.maxCasesPerMonth) {
      return { 
        eligible: false, 
        reason: `Monthly capacity reached: ${casesThisMonth}/${attorney.attorneyProfile.maxCasesPerMonth}` 
      }
    }
  }

  // All checks passed
  return { eligible: true }
}

/**
 * Filter attorneys to get eligible set (Step 0)
 * Returns only attorneys that pass all hard eligibility filters
 */
export async function filterEligibleAttorneys(
  attorneys: AttorneyForRouting[],
  caseData: CaseForRouting
): Promise<{
  eligible: AttorneyForRouting[]
  ineligible: Array<{ attorney: AttorneyForRouting; reason: string }>
}> {
  const eligible: AttorneyForRouting[] = []
  const ineligible: Array<{ attorney: AttorneyForRouting; reason: string }> = []

  for (const attorney of attorneys) {
    const result = await checkAttorneyEligibility(attorney, caseData)
    
    if (result.eligible) {
      eligible.push(attorney)
    } else {
      ineligible.push({
        attorney,
        reason: result.reason || 'Unknown reason'
      })
    }
  }

  return { eligible, ineligible }
}

/**
 * Step 1: Quality Gate
 * Removes firms that are technically eligible but poor fit
 * Protects consumers and platform reputation
 */
export interface QualityGateResult {
  qualified: boolean
  reason?: string
  metrics?: {
    averageResponseTime?: number
    contactRate?: number
    complaintRate?: number
    cherryPickingScore?: number
  }
}

/**
 * Check if attorney passes quality gate (Step 1)
 */
export async function checkQualityGate(
  attorney: AttorneyForRouting,
  caseData: CaseForRouting,
  options?: {
    maxResponseTimeHours?: number // For hot cases, default 24h
    minContactRate?: number // Minimum contact rate, default 70%
    maxComplaintRate?: number // Maximum complaint rate, default 5%
    maxCherryPickingScore?: number // Maximum cherry-picking score, default 0.3
  }
): Promise<QualityGateResult> {
  const {
    maxResponseTimeHours = 48, // Default: 48 hours for regular cases
    minContactRate = 0.70, // 70% minimum contact rate
    maxComplaintRate = 0.05, // 5% maximum complaint rate
    maxCherryPickingScore = 0.3 // 30% cherry-picking threshold
  } = options || {}

  // Determine if this is a "hot" case (Tier 3 or 4, or high viability)
  const isHotCase = caseData.prediction?.viability?.overall && 
                    caseData.prediction.viability.overall >= 0.75
  const hotCaseMaxResponseTime = 24 // 24 hours for hot cases

  const metrics: QualityGateResult['metrics'] = {}

  // 1. Check Response SLA (too slow for hot cases)
  const responseTimeThreshold = isHotCase ? hotCaseMaxResponseTime : maxResponseTimeHours
  
  if (attorney.responseTimeHours !== undefined) {
    metrics.averageResponseTime = attorney.responseTimeHours
    
    if (attorney.responseTimeHours > responseTimeThreshold) {
      return {
        qualified: false,
        reason: isHotCase 
          ? `Response time ${attorney.responseTimeHours}h too slow for hot case (max ${hotCaseMaxResponseTime}h)`
          : `Response time ${attorney.responseTimeHours}h exceeds threshold (max ${maxResponseTimeHours}h)`,
        metrics
      }
    }
  } else {
    // No response time data - use default or check historical data
    const historicalResponseTime = await getHistoricalResponseTime(attorney.id)
    if (historicalResponseTime && historicalResponseTime > responseTimeThreshold) {
      metrics.averageResponseTime = historicalResponseTime
      return {
        qualified: false,
        reason: `Historical response time ${historicalResponseTime}h exceeds threshold (max ${responseTimeThreshold}h)`,
        metrics
      }
    }
  }

  // 2. Check Historic Contact Rate (below threshold)
  const contactRate = await getContactRate(attorney.id)
  metrics.contactRate = contactRate

  if (contactRate < minContactRate) {
    return {
      qualified: false,
      reason: `Contact rate ${Math.round(contactRate * 100)}% below minimum ${Math.round(minContactRate * 100)}%`,
      metrics
    }
  }

  // 3. Check Consumer Complaints / Poor Outcomes
  const complaintRate = await getComplaintRate(attorney.id)
  metrics.complaintRate = complaintRate

  if (complaintRate > maxComplaintRate) {
    return {
      qualified: false,
      reason: `Complaint rate ${Math.round(complaintRate * 100)}% exceeds maximum ${Math.round(maxComplaintRate * 100)}%`,
      metrics
    }
  }

  // 4. Check Cherry-Picking Pattern (accepting cases but no follow-up)
  const cherryPickingScore = await getCherryPickingScore(attorney.id)
  metrics.cherryPickingScore = cherryPickingScore

  if (cherryPickingScore > maxCherryPickingScore) {
    return {
      qualified: false,
      reason: `Cherry-picking pattern detected (score: ${Math.round(cherryPickingScore * 100)}%, max: ${Math.round(maxCherryPickingScore * 100)}%)`,
      metrics
    }
  }

  // All quality checks passed
  return {
    qualified: true,
    metrics
  }
}

/**
 * Get historical average response time for attorney
 */
async function getHistoricalResponseTime(attorneyId: string): Promise<number | null> {
  try {
    // Get introductions that were responded to
    const introductions = await prisma.introduction.findMany({
      where: {
        attorneyId,
        respondedAt: { not: null }
      },
      select: {
        requestedAt: true,
        respondedAt: true
      },
      take: 50 // Last 50 responses
    })

    if (introductions.length === 0) {
      return null
    }

    // Calculate average response time in hours
    const responseTimes = introductions
      .filter(i => i.respondedAt)
      .map(i => {
        const diff = i.respondedAt!.getTime() - i.requestedAt.getTime()
        return diff / (1000 * 60 * 60) // Convert to hours
      })

    if (responseTimes.length === 0) {
      return null
    }

    const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    return average
  } catch (error) {
    logger.error('Failed to get historical response time', { error, attorneyId })
    return null
  }
}

/**
 * Get contact rate (percentage of cases where attorney actually contacted the client)
 */
async function getContactRate(attorneyId: string): Promise<number> {
  try {
    // Get all introductions for this attorney
    const totalIntroductions = await prisma.introduction.count({
      where: { attorneyId }
    })

    if (totalIntroductions === 0) {
      return 1.0 // New attorney, give benefit of doubt
    }

    // Count introductions where attorney actually contacted (via LeadContact or responded)
    const contactedCases = await prisma.introduction.count({
      where: {
        attorneyId,
        OR: [
          { respondedAt: { not: null } },
          {
            assessment: {
              leadSubmission: {
                contactAttempts: {
                  some: {
                    attorneyId,
                    status: { in: ['sent', 'delivered', 'opened', 'responded'] }
                  }
                }
              }
            }
          }
        ]
      }
    })

    return contactedCases / totalIntroductions
  } catch (error) {
    logger.error('Failed to get contact rate', { error, attorneyId })
    return 0.5 // Default to 50% if error
  }
}

/**
 * Get complaint rate (percentage of cases with complaints or poor outcomes)
 */
async function getComplaintRate(attorneyId: string): Promise<number> {
  try {
    // Get all introductions/accepted cases
    const totalCases = await prisma.introduction.count({
      where: {
        attorneyId,
        status: { in: ['ACCEPTED', 'RETAINED'] }
      }
    })

    if (totalCases === 0) {
      return 0 // No cases = no complaints
    }

    // Count cases with poor outcomes:
    // 1. Low ratings (1-2 stars) from reviews
    const poorReviews = await prisma.attorneyReview.count({
      where: {
        attorneyId,
        rating: { lte: 2 }
      }
    })

    // 2. Cases that were accepted but later rejected/closed without resolution
    const abandonedCases = await prisma.introduction.count({
      where: {
        attorneyId,
        status: 'ACCEPTED',
        assessment: {
          status: 'CLOSED',
          updatedAt: {
            // Closed within 30 days of acceptance (likely abandoned)
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }
    })

    // Calculate complaint rate
    const complaints = poorReviews + (abandonedCases * 0.5) // Weight abandoned cases less
    return Math.min(1.0, complaints / totalCases)
  } catch (error) {
    logger.error('Failed to get complaint rate', { error, attorneyId })
    return 0 // Default to 0% if error
  }
}

/**
 * Get cherry-picking score (pattern of accepting cases but not following up)
 * Score: 0 = good, 1 = bad (high cherry-picking)
 */
async function getCherryPickingScore(attorneyId: string): Promise<number> {
  try {
    // Get all accepted introductions
    const acceptedCases = await prisma.introduction.findMany({
      where: {
        attorneyId,
        status: { in: ['ACCEPTED', 'RETAINED'] }
      },
      include: {
        assessment: {
          include: {
            leadSubmission: {
              include: {
                contactAttempts: {
                  where: { attorneyId }
                }
              }
            }
          }
        }
      },
      take: 20 // Last 20 accepted cases
    })

    if (acceptedCases.length === 0) {
      return 0 // No cases = no cherry-picking
    }

    // Count cases with no follow-up contact
    let noFollowUpCount = 0

    for (const intro of acceptedCases) {
      // Check if attorney made any contact attempts
      const hasContact = intro.assessment.leadSubmission?.contactAttempts &&
                        intro.assessment.leadSubmission.contactAttempts.length > 0

      // Check if attorney responded to introduction
      const hasResponse = intro.respondedAt !== null

      // Check if there's a chat room with messages
      const chatRoom = await prisma.chatRoom.findFirst({
        where: {
          attorneyId,
          assessmentId: intro.assessmentId
        },
        include: {
          messages: {
            where: {
              senderType: 'attorney'
            },
            take: 1
          }
        }
      })

      const hasChatMessages = chatRoom && chatRoom.messages.length > 0

      // If no contact, no response, and no chat messages = cherry-picking
      if (!hasContact && !hasResponse && !hasChatMessages) {
        noFollowUpCount++
      }
    }

    // Score: percentage of accepted cases with no follow-up
    return noFollowUpCount / acceptedCases.length
  } catch (error) {
    logger.error('Failed to get cherry-picking score', { error, attorneyId })
    return 0 // Default to 0 (no cherry-picking) if error
  }
}

/**
 * Filter attorneys through quality gate (Step 1)
 * Returns only attorneys that pass quality checks
 */
export async function filterQualifiedAttorneys(
  eligibleAttorneys: AttorneyForRouting[],
  caseData: CaseForRouting,
  options?: Parameters<typeof checkQualityGate>[2]
): Promise<{
  qualified: AttorneyForRouting[]
  disqualified: Array<{ attorney: AttorneyForRouting; reason: string; metrics?: QualityGateResult['metrics'] }>
}> {
  const qualified: AttorneyForRouting[] = []
  const disqualified: Array<{ attorney: AttorneyForRouting; reason: string; metrics?: QualityGateResult['metrics'] }> = []

  for (const attorney of eligibleAttorneys) {
    const result = await checkQualityGate(attorney, caseData, options)
    
    if (result.qualified) {
      qualified.push(attorney)
    } else {
      disqualified.push({
        attorney,
        reason: result.reason || 'Failed quality gate',
        metrics: result.metrics
      })
    }
  }

  return { qualified, disqualified }
}

/**
 * Step 2: Compute Match Score per Firm
 * 
 * MatchScore = Weighted combination of:
 * - FitScore (35%): jurisdiction + case-type specialization + tier appetite
 * - OutcomeScore (35%): predicted sign rate + speed + historical success
 * - TrustScore (20%): complaint-adjusted reputation & behavior score
 * - ValueScore (10%): expected platform revenue contribution
 */

export interface MatchScore {
  overall: number // 0-1
  fitScore: number // 0-1
  outcomeScore: number // 0-1
  trustScore: number // 0-1
  valueScore: number // 0-1
  breakdown: {
    fit: {
      jurisdiction: number
      caseType: number
      tierAppetite: number
    }
    outcome: {
      signRate: number
      speed: number
      historicalSuccess: number
    }
    trust: {
      rating: number
      reviewCount: number
      responseTime: number
      verified: number
    }
    value: {
      subscriptionTier: number
      historicalRevenue: number
      caseValuePotential: number
    }
  }
}

/**
 * Calculate FitScore (0-1)
 * Based on: jurisdiction match, case-type specialization, tier appetite
 */
function calculateFitScore(
  attorney: AttorneyForRouting,
  caseData: CaseForRouting
): { score: number; breakdown: { jurisdiction: number; caseType: number; tierAppetite: number } } {
  let jurisdictionScore = 0
  let caseTypeScore = 0
  let tierAppetiteScore = 0

  // 1. Jurisdiction Match (0-1)
  try {
    if (attorney.attorneyProfile?.jurisdictions) {
      const jurisdictions = JSON.parse(attorney.attorneyProfile.jurisdictions) as Array<{
        state: string
        counties?: string[]
      }>

      const stateMatch = jurisdictions.find(j =>
        j.state.toUpperCase() === caseData.venueState.toUpperCase()
      )

      if (stateMatch) {
        // State match = 0.7 base
        jurisdictionScore = 0.7

        // County match = +0.3 (if county specified and matches)
        if (caseData.venueCounty && stateMatch.counties && stateMatch.counties.length > 0) {
          const countyMatch = stateMatch.counties.some(county =>
            county.toLowerCase() === caseData.venueCounty?.toLowerCase()
          )
          if (countyMatch) {
            jurisdictionScore = 1.0
          }
        } else if (!caseData.venueCounty) {
          // No county specified, state match is full score
          jurisdictionScore = 1.0
        }
      }
    }
  } catch (error) {
    logger.error('Failed to parse jurisdictions for fit score', { error, attorneyId: attorney.id })
  }

  // 2. Case-Type Specialization (0-1)
  try {
    if (attorney.specialties) {
      const specialties = JSON.parse(attorney.specialties) as string[]
      const exactMatch = specialties.some(s =>
        s.toLowerCase() === caseData.claimType.toLowerCase()
      )
      const fuzzyMatch = specialties.some(s =>
        s.toLowerCase().replace(/_/g, ' ') === caseData.claimType.toLowerCase().replace(/_/g, ' ')
      )

      if (exactMatch) {
        caseTypeScore = 1.0
      } else if (fuzzyMatch) {
        caseTypeScore = 0.8
      } else {
        // Partial match (e.g., "auto" matches "auto_accident")
        const caseTypeLower = caseData.claimType.toLowerCase()
        const hasPartialMatch = specialties.some(s =>
          s.toLowerCase().includes(caseTypeLower) || caseTypeLower.includes(s.toLowerCase())
        )
        caseTypeScore = hasPartialMatch ? 0.6 : 0.3
      }
    }
  } catch (error) {
    logger.error('Failed to parse specialties for fit score', { error, attorneyId: attorney.id })
  }

  // 3. Tier Appetite (0-1)
  // Based on how well the case tier matches attorney's preferences and subscription tier
  const estimatedValue = caseData.prediction?.bands?.median ||
                        caseData.facts?.damages?.med_charges ||
                        0

  const caseSeverity = caseData.facts?.severity ||
                      caseData.facts?.injuries?.[0]?.severity ||
                      0

  // Determine case tier based on value (simplified - could use full classifier)
  let caseTier = 1
  if (estimatedValue >= 500000) {
    caseTier = 4
  } else if (estimatedValue >= 100000) {
    caseTier = 3
  } else if (estimatedValue >= 25000) {
    caseTier = 2
  } else {
    caseTier = 1
  }

  // Check if attorney's subscription tier matches case tier
  const attorneyTier = attorney.subscriptionTier?.toLowerCase()
  let tierMatchScore = 0.5 // Default

  // Enterprise attorneys prefer Tier 3-4 cases
  if (attorneyTier === 'enterprise') {
    if (caseTier >= 3) {
      tierMatchScore = 1.0
    } else if (caseTier === 2) {
      tierMatchScore = 0.7
    } else {
      tierMatchScore = 0.3
    }
  }
  // Premium attorneys prefer Tier 2-3 cases
  else if (attorneyTier === 'premium') {
    if (caseTier === 2 || caseTier === 3) {
      tierMatchScore = 1.0
    } else if (caseTier === 1) {
      tierMatchScore = 0.8
    } else {
      tierMatchScore = 0.6 // Tier 4 might be too high
    }
  }
  // Basic attorneys prefer Tier 1-2 cases
  else if (attorneyTier === 'basic') {
    if (caseTier <= 2) {
      tierMatchScore = 1.0
    } else if (caseTier === 3) {
      tierMatchScore = 0.6
    } else {
      tierMatchScore = 0.3 // Tier 4 too high
    }
  }
  // No subscription tier = pay-per-case, accepts all but prefers mid-range
  else {
    if (caseTier === 2 || caseTier === 3) {
      tierMatchScore = 1.0
    } else {
      tierMatchScore = 0.7
    }
  }

  // Adjust based on attorney's damage/severity preferences
  if (attorney.attorneyProfile) {
    const { minDamagesRange, maxDamagesRange, minInjurySeverity } = attorney.attorneyProfile

    // Damage range fit
    let damageFit = 1.0
    if (minDamagesRange !== null && maxDamagesRange !== null) {
      // Attorney has specific range - check if case is in sweet spot
      if (estimatedValue >= minDamagesRange && estimatedValue <= maxDamagesRange) {
        damageFit = 1.0
      } else if (estimatedValue < minDamagesRange) {
        // Below minimum
        const ratio = estimatedValue / minDamagesRange
        damageFit = Math.max(0, ratio * 0.8)
      } else {
        // Above maximum
        const ratio = maxDamagesRange / estimatedValue
        damageFit = Math.max(0, ratio * 0.8)
      }
    } else if (minDamagesRange !== null) {
      // Only minimum set
      if (estimatedValue >= minDamagesRange) {
        damageFit = 1.0
      } else {
        const ratio = estimatedValue / minDamagesRange
        damageFit = Math.max(0, ratio * 0.8)
      }
    }

    // Severity fit
    let severityFit = 1.0
    if (minInjurySeverity !== null) {
      if (caseSeverity >= minInjurySeverity) {
        severityFit = 1.0
      } else {
        // Severity too low
        severityFit = Math.max(0, (caseSeverity / minInjurySeverity) * 0.7)
      }
    }

    // Combine tier match with damage/severity fit
    tierAppetiteScore = (tierMatchScore * 0.6) + (damageFit * 0.25) + (severityFit * 0.15)
  } else {
    // No preferences = use tier match only
    tierAppetiteScore = tierMatchScore
  }

  // Weighted average: jurisdiction 40%, case-type 40%, tier appetite 20%
  const fitScore = (jurisdictionScore * 0.4) + (caseTypeScore * 0.4) + (tierAppetiteScore * 0.2)

  return {
    score: Math.min(1.0, Math.max(0.0, fitScore)),
    breakdown: {
      jurisdiction: jurisdictionScore,
      caseType: caseTypeScore,
      tierAppetite: tierAppetiteScore
    }
  }
}

/**
 * Calculate OutcomeScore (0-1)
 * Based on: predicted sign rate, speed, historical success
 */
function calculateOutcomeScore(
  attorney: AttorneyForRouting
): { score: number; breakdown: { signRate: number; speed: number; historicalSuccess: number } } {
  // 1. Sign Rate / Conversion Rate (0-1)
  // Use actual conversion rate if available, otherwise estimate based on success metrics
  let signRate = 0.5 // Default baseline

  if (attorney.conversionRate !== undefined) {
    signRate = Math.min(1.0, attorney.conversionRate / 100) // Convert percentage to 0-1
  } else if (attorney.attorneyProfile?.successRate !== null && 
             attorney.attorneyProfile?.successRate !== undefined) {
    // Use success rate as proxy
    signRate = Math.min(1.0, attorney.attorneyProfile.successRate / 100)
  } else {
    // Estimate based on reviews and experience
    const reviewFactor = Math.min(1.0, (attorney.totalReviews || 0) / 50) // 50 reviews = full score
    const experienceFactor = Math.min(1.0, (attorney.attorneyProfile?.yearsExperience || 0) / 10) // 10 years = full score
    signRate = 0.3 + (reviewFactor * 0.3) + (experienceFactor * 0.2)
  }

  // 2. Speed / Response Time (0-1)
  // Faster response = higher score
  let speed = 0.5 // Default

  if (attorney.responseTimeHours !== undefined) {
    if (attorney.responseTimeHours <= 2) {
      speed = 1.0
    } else if (attorney.responseTimeHours <= 4) {
      speed = 0.9
    } else if (attorney.responseTimeHours <= 8) {
      speed = 0.8
    } else if (attorney.responseTimeHours <= 24) {
      speed = 0.7
    } else if (attorney.responseTimeHours <= 48) {
      speed = 0.5
    } else {
      speed = 0.3
    }
  }

  // 3. Historical Success (0-1)
  let historicalSuccess = 0.5 // Default

  if (attorney.attorneyProfile) {
    const { successRate, averageSettlement, totalCases } = attorney.attorneyProfile

    // Success rate component (0-0.5)
    const successRateComponent = successRate !== null && successRate !== undefined
      ? Math.min(0.5, successRate / 100)
      : 0.25

    // Settlement amount component (0-0.3)
    // Higher average settlement = better (normalized)
    let settlementComponent = 0.15
    if (averageSettlement !== null && averageSettlement !== undefined) {
      // Normalize: $200k+ = 0.3, $100k = 0.2, $50k = 0.1, $0 = 0
      settlementComponent = Math.min(0.3, (averageSettlement / 200000) * 0.3)
    }

    // Volume component (0-0.2)
    // More cases = more experience (but diminishing returns)
    let volumeComponent = 0.1
    if (totalCases !== null && totalCases !== undefined) {
      volumeComponent = Math.min(0.2, (totalCases / 100) * 0.2)
    }

    historicalSuccess = successRateComponent + settlementComponent + volumeComponent
  }

  // Weighted average: sign rate 40%, speed 30%, historical success 30%
  const outcomeScore = (signRate * 0.4) + (speed * 0.3) + (historicalSuccess * 0.3)

  return {
    score: Math.min(1.0, Math.max(0.0, outcomeScore)),
    breakdown: {
      signRate,
      speed,
      historicalSuccess
    }
  }
}

/**
 * Calculate ValueScore (0-1)
 * Based on: expected platform revenue contribution
 */
function calculateValueScore(
  attorney: AttorneyForRouting,
  caseData: CaseForRouting
): { score: number; breakdown: { subscriptionTier: number; historicalRevenue: number; caseValuePotential: number } } {
  // 1. Subscription Tier (0-1)
  let subscriptionTier = 0.5 // Default

  const tier = attorney.subscriptionTier?.toLowerCase()
  if (tier === 'enterprise') {
    subscriptionTier = 1.0
  } else if (tier === 'premium') {
    subscriptionTier = 0.8
  } else if (tier === 'basic') {
    subscriptionTier = 0.5
  } else {
    // No subscription = pay-per-case, which can be valuable
    subscriptionTier = 0.6
  }

  // 2. Historical Revenue (0-1)
  // Normalize historical platform revenue
  let historicalRevenue = 0.5 // Default

  if (attorney.platformRevenue !== undefined) {
    // Normalize: $10k+ = 1.0, $5k = 0.7, $1k = 0.4, $0 = 0.2
    if (attorney.platformRevenue >= 10000) {
      historicalRevenue = 1.0
    } else if (attorney.platformRevenue >= 5000) {
      historicalRevenue = 0.7
    } else if (attorney.platformRevenue >= 1000) {
      historicalRevenue = 0.4
    } else {
      historicalRevenue = 0.2
    }
  }

  // 3. Case Value Potential (0-1)
  // Higher case value = more potential revenue
  const estimatedValue = caseData.prediction?.bands?.median ||
                        caseData.facts?.damages?.med_charges ||
                        0

  let caseValuePotential = 0.5
  if (estimatedValue >= 200000) {
    caseValuePotential = 1.0
  } else if (estimatedValue >= 100000) {
    caseValuePotential = 0.8
  } else if (estimatedValue >= 50000) {
    caseValuePotential = 0.6
  } else if (estimatedValue >= 25000) {
    caseValuePotential = 0.4
  } else {
    caseValuePotential = 0.2
  }

  // Weighted average: subscription tier 30%, historical revenue 40%, case value 30%
  const valueScore = (subscriptionTier * 0.3) + (historicalRevenue * 0.4) + (caseValuePotential * 0.3)

  return {
    score: Math.min(1.0, Math.max(0.0, valueScore)),
    breakdown: {
      subscriptionTier,
      historicalRevenue,
      caseValuePotential
    }
  }
}

/**
 * Calculate TrustScore (0-1)
 * Based on: complaint-adjusted reputation & behavior score
 */
function calculateTrustScore(
  attorney: AttorneyForRouting
): { score: number; breakdown: { rating: number; reviewCount: number; responseTime: number; verified: number } } {
  // 1. Rating (0-1)
  // Normalize 1-5 star rating to 0-1
  let rating = 0.5 // Default

  if (attorney.averageRating !== undefined) {
    // 5 stars = 1.0, 4 stars = 0.8, 3 stars = 0.6, 2 stars = 0.4, 1 star = 0.2
    rating = Math.min(1.0, (attorney.averageRating / 5) * 0.8 + 0.2)
  }

  // 2. Review Count (0-1)
  // More reviews = more trustworthy (with diminishing returns)
  let reviewCount = 0.3 // Default

  if (attorney.totalReviews !== undefined) {
    // 50+ reviews = 1.0, 20 reviews = 0.7, 10 reviews = 0.5, 0 reviews = 0.3
    if (attorney.totalReviews >= 50) {
      reviewCount = 1.0
    } else if (attorney.totalReviews >= 20) {
      reviewCount = 0.7
    } else if (attorney.totalReviews >= 10) {
      reviewCount = 0.5
    } else if (attorney.totalReviews >= 5) {
      reviewCount = 0.4
    }
  }

  // 3. Response Time (0-1)
  // Faster response = more trustworthy
  let responseTime = 0.5 // Default

  if (attorney.responseTimeHours !== undefined) {
    if (attorney.responseTimeHours <= 4) {
      responseTime = 1.0
    } else if (attorney.responseTimeHours <= 24) {
      responseTime = 0.8
    } else if (attorney.responseTimeHours <= 48) {
      responseTime = 0.6
    } else {
      responseTime = 0.4
    }
  }

  // 4. Verified Status (0-1)
  const verified = attorney.isVerified ? 1.0 : 0.5

  // Adjust for complaints (future: subtract based on complaint count)
  let complaintPenalty = 0
  if (attorney.complaints !== undefined && attorney.complaints > 0) {
    // Each complaint reduces trust score
    complaintPenalty = Math.min(0.3, attorney.complaints * 0.1)
  }

  // Weighted average: rating 40%, review count 30%, response time 20%, verified 10%
  let trustScore = (rating * 0.4) + (reviewCount * 0.3) + (responseTime * 0.2) + (verified * 0.1)
  
  // Apply complaint penalty
  trustScore = Math.max(0.0, trustScore - complaintPenalty)

  return {
    score: Math.min(1.0, Math.max(0.0, trustScore)),
    breakdown: {
      rating,
      reviewCount,
      responseTime,
      verified
    }
  }
}

/**
 * Calculate overall MatchScore
 * Weighted combination: FitScore 35%, OutcomeScore 35%, TrustScore 20%, ValueScore 10%
 */
export function calculateMatchScore(
  attorney: AttorneyForRouting,
  caseData: CaseForRouting
): MatchScore {
  const fit = calculateFitScore(attorney, caseData)
  const outcome = calculateOutcomeScore(attorney)
  const trust = calculateTrustScore(attorney)
  const value = calculateValueScore(attorney, caseData)

  // Weighted combination
  const overall = (
    fit.score * 0.35 +
    outcome.score * 0.35 +
    trust.score * 0.20 +
    value.score * 0.10
  )

  return {
    overall: Math.min(1.0, Math.max(0.0, overall)),
    fitScore: fit.score,
    outcomeScore: outcome.score,
    trustScore: trust.score,
    valueScore: value.score,
    breakdown: {
      fit: fit.breakdown,
      outcome: outcome.breakdown,
      trust: trust.breakdown,
      value: value.breakdown
    }
  }
}

/**
 * Complete routing pipeline: Step 0 → Step 1 → Step 2
 * Filters eligible attorneys, applies quality gate, then scores and ranks
 */
export async function routeCaseToAttorneys(
  attorneys: AttorneyForRouting[],
  caseData: CaseForRouting,
  qualityGateOptions?: Parameters<typeof checkQualityGate>[2]
): Promise<{
  eligible: AttorneyForRouting[]
  qualified: AttorneyForRouting[]
  scored: Array<{ attorney: AttorneyForRouting; score: MatchScore }>
  stats: {
    total: number
    eligible: number
    qualified: number
    scored: number
  }
}> {
  // Step 0: Hard Eligibility Filter
  const { eligible, ineligible } = await filterEligibleAttorneys(attorneys, caseData)
  
  // Step 1: Quality Gate
  const { qualified, disqualified } = await filterQualifiedAttorneys(eligible, caseData, qualityGateOptions)
  
  // Step 2: Score and Rank
  const scored = await scoreAndRankAttorneys(qualified, caseData)
  
  return {
    eligible,
    qualified,
    scored,
    stats: {
      total: attorneys.length,
      eligible: eligible.length,
      qualified: qualified.length,
      scored: scored.length
    }
  }
}

/**
 * Score and rank eligible attorneys
 * Returns attorneys sorted by match score (highest first)
 */
export async function scoreAndRankAttorneys(
  eligibleAttorneys: AttorneyForRouting[],
  caseData: CaseForRouting
): Promise<Array<{ attorney: AttorneyForRouting; score: MatchScore }>> {
  if (eligibleAttorneys.length === 0) {
    return []
  }

  const attorneyIds = eligibleAttorneys.map((attorney) => attorney.id)
  const [introStatusCounts, dashboards, complaintRates] = await Promise.all([
    prisma.introduction.groupBy({
      by: ['attorneyId', 'status'],
      where: { attorneyId: { in: attorneyIds } },
      _count: { _all: true },
    }),
    prisma.attorneyDashboard.findMany({
      where: { attorneyId: { in: attorneyIds } },
      select: { attorneyId: true, totalPlatformSpend: true },
    }),
    Promise.all(attorneyIds.map(async (attorneyId) => [attorneyId, await getComplaintRate(attorneyId)] as const)),
  ])

  const introStats = new Map<string, { total: number; converted: number }>()
  for (const row of introStatusCounts) {
    const stats = introStats.get(row.attorneyId) ?? { total: 0, converted: 0 }
    const count = row._count?._all ?? 0
    stats.total += count
    if (row.status === 'ACCEPTED' || row.status === 'RETAINED') {
      stats.converted += count
    }
    introStats.set(row.attorneyId, stats)
  }

  const revenueByAttorneyId = new Map(
    dashboards.map((dashboard) => [dashboard.attorneyId, dashboard.totalPlatformSpend || 0])
  )
  const complaintRateByAttorneyId = new Map(complaintRates)

  const attorneysWithData = eligibleAttorneys.map((attorney) => {
    const stats = introStats.get(attorney.id)
    const total = stats?.total ?? 0
    const converted = stats?.converted ?? 0
    const conversionRate = total > 0 ? (converted / total) * 100 : undefined

    return {
      ...attorney,
      conversionRate,
      platformRevenue: revenueByAttorneyId.get(attorney.id) || 0,
      complaints: Math.round((complaintRateByAttorneyId.get(attorney.id) || 0) * 10)
    }
  })

  // Score each attorney
  const scored = attorneysWithData.map(attorney => ({
    attorney,
    score: calculateMatchScore(attorney, caseData)
  }))

  // Sort by overall score (highest first)
  scored.sort((a, b) => b.score.overall - a.score.overall)

  return scored
}

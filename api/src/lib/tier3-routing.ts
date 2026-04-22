import { prisma } from './prisma'
import { logger } from './logger'
import { CaseFacts } from './case-tier-classifier'
import { sendCaseOfferSms } from './sms'

/**
 * Tier 3 Case Routing Engine (High Severity / High Value)
 *
 * Goals:
 * - Prioritize quality, expertise, and speed for high-value cases
 * - Use exclusive matching first, then a high-signal auction fallback
 * - Maintain fairness without sacrificing outcomes
 * - Progressive disclosure: no PII before acceptance
 */

const TIER_3_EXCLUSIVE_TIMEOUT_SECONDS = 90
const TIER_3_AUCTION_TIMEOUT_SECONDS = 180
const MAX_EXCLUSIVE_ATTEMPTS = 2
const AUCTION_GROUP_M = 15
const MIN_ELIGIBLE_FIRMS = 5

const TIER_3_BASE_PRICE = 1500
const DOCS_BONUS = 250
const LIABILITY_BONUS = 250
const SURGERY_BONUS = 250
const STALE_DISCOUNT = 200
const STALE_DAYS = 365

const DEFAULT_AVG_ACCEPT_SECONDS = 180
const ANTI_MONOPOLY_WIN_SHARE_THRESHOLD = 0.4
const ANTI_MONOPOLY_MULTIPLIER = 0.8

const MS_PER_DAY = 24 * 60 * 60 * 1000

const SUPPORTED_STATES = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI']

type Jurisdiction = { state: string; counties?: string[] }

export interface Tier3FirmForRouting {
  id: string
  active: boolean
  jurisdictions: Jurisdiction[]
  practiceAreas: string[]
  tierEnabled: boolean
  score?: number
  capacity: {
    dailyCapRemaining: number
    weeklyCapRemaining: number
    monthlyCapRemaining: number
    openSlots: number
  }
  acceptanceRate30d: number
  avgTimeToAcceptSeconds30d: number
  qualityScore30d: number
  experienceYears: number
  subscription: {
    active: boolean
    tier3AllotmentRemaining: number
  }
  budgetRules: {
    maxPriceByTier: number
    auctionEnabled: boolean
    fixedEnabled: boolean
    subscriptionEnabled: boolean
  }
  tier3Offers30d: number
  tier3Wins7d: number
  attorney: any
}

export interface Tier3CaseData {
  id: string
  claimType: string
  venueState: string
  venueCounty?: string | null
  facts: CaseFacts
  tierNumber: number
  injurySeverityScore: number
  hasSurgery: boolean
  medPaid: number
  estimatedValue: number
  hasCatastrophicFlags: boolean
  severityLevel: number
  liabilityScore: number
  docsAvailable: boolean
  timeSinceIncidentDays?: number | null
  estimatedValueBand: string
}

export interface Tier3RoutingResult {
  routed: boolean
  routedToFirmId?: string
  introductionId?: string
  method?: 'exclusive' | 'auction'
  price?: number
  attempts?: {
    exclusive: number
    auction: number
  }
  holdReason?: string
  error?: string
}

/**
 * Check if a case qualifies as Tier 3
 */
export function isTier3Case(
  facts: CaseFacts,
  estimatedValue: number,
  venueState?: string
): {
  isTier3: boolean
  reason?: string
  data?: {
    injurySeverityScore: number
    hasSurgery: boolean
    medPaid: number
    estimatedValue: number
    hasCatastrophicFlags: boolean
  }
} {
  // Tier 3 typically has settlement value $100k-$250k
  if (estimatedValue < 100000 || estimatedValue > 250000) {
    return { isTier3: false, reason: `Estimated value $${estimatedValue} outside Tier 3 range ($100k-$250k)` }
  }

  const maxSeverity = Math.max(
    0,
    ...(facts.injuries?.map(i => i.severity || 0) || []),
    facts.damages?.med_charges ? (facts.damages.med_charges > 50000 ? 3 : 2) : 0
  )
  const injurySeverityScore = maxSeverity

  const hasSurgery = facts.treatment?.some(t => t.surgery === true) || false

  const medPaid = facts.damages?.med_paid || 0

  const hasPermanentDisability = facts.injuries?.some(i => i.permanent === true) || false
  const hasHighBills = (facts.damages?.med_charges || 0) >= 150000
  const hasCatastrophicFlags = hasPermanentDisability || hasHighBills

  // Tier 3 allows catastrophic flags, but avoid Tier 4 (handled elsewhere)
  if (estimatedValue > 250000) {
    return { isTier3: false, reason: 'Case value suggests Tier 4+' }
  }

  if (venueState && !SUPPORTED_STATES.includes(venueState.toUpperCase())) {
    return { isTier3: false, reason: `State ${venueState} not supported` }
  }

  return {
    isTier3: true,
    data: {
      injurySeverityScore,
      hasSurgery,
      medPaid,
      estimatedValue,
      hasCatastrophicFlags
    }
  }
}

function normalizeCaseType(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').trim()
}

function hasDocsAvailable(facts: CaseFacts, fileCount: number): boolean {
  return fileCount > 0 || facts.evidence?.reports === true || facts.evidence?.video === true
}

function estimateLiabilityScore(facts: CaseFacts): number {
  const fault = facts.liability?.fault?.toLowerCase()
  const negligence = facts.liability?.negligence?.toLowerCase()

  if (fault === 'other_party' || negligence === 'clear') {
    return 0.85
  }

  if (fault === 'shared' || negligence === 'mixed') {
    return 0.55
  }

  if (fault === 'insured' || negligence === 'weak') {
    return 0.35
  }

  return 0.45
}

function calculateTimeSinceIncidentDays(facts: CaseFacts): number | null {
  if (!facts.incident?.date) {
    return null
  }

  const incidentDate = new Date(facts.incident.date)
  if (Number.isNaN(incidentDate.getTime())) {
    return null
  }

  const diffMs = Date.now() - incidentDate.getTime()
  return Math.max(0, Math.floor(diffMs / MS_PER_DAY))
}

function estimatedValueBand(estimatedValue: number): string {
  if (estimatedValue < 100000) return '$75k-$100k'
  if (estimatedValue <= 150000) return '$100k-$150k'
  if (estimatedValue <= 250000) return '$150k-$250k'
  return '>$250k'
}

function liabilityBand(score: number): string {
  if (score >= 0.8) return 'High'
  if (score >= 0.65) return 'Med-High'
  if (score >= 0.5) return 'Med'
  return 'Low'
}

function computeTier3Price(caseData: Tier3CaseData): number {
  let price = TIER_3_BASE_PRICE

  if (caseData.docsAvailable) {
    price += DOCS_BONUS
  }

  if (caseData.liabilityScore > 0.7) {
    price += LIABILITY_BONUS
  }

  if (caseData.hasSurgery) {
    price += SURGERY_BONUS
  }

  if (caseData.timeSinceIncidentDays !== null && caseData.timeSinceIncidentDays !== undefined) {
    if (caseData.timeSinceIncidentDays > STALE_DAYS) {
      price -= STALE_DISCOUNT
    }
  }

  return Math.max(0, price)
}

function toFiniteCap(value: number | null | undefined): number {
  if (value === null || value === undefined) return Number.POSITIVE_INFINITY
  return Math.max(0, value)
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(1, value))
}

type EligibilityOptions = {
  allowAdjacentCounties: boolean
  allowGeneralPI: boolean
}

function isStatewideCounties(counties?: string[]): boolean {
  if (!counties || counties.length === 0) return true
  return counties.some(c => ['statewide', '*', 'all'].includes(c.toLowerCase()))
}

function matchesJurisdiction(
  firm: Tier3FirmForRouting,
  venueState: string,
  venueCounty?: string | null,
  options?: EligibilityOptions
): boolean {
  const stateEntry = firm.jurisdictions.find(j => j.state.toUpperCase() === venueState.toUpperCase())
  if (!stateEntry) return false

  if (!venueCounty) return true

  const counties = stateEntry.counties || []
  if (isStatewideCounties(counties)) return true

  if (options?.allowAdjacentCounties) return true

  return counties.some(c => c.toLowerCase() === venueCounty.toLowerCase())
}

function matchesPracticeArea(
  firm: Tier3FirmForRouting,
  claimType: string,
  options?: EligibilityOptions
): boolean {
  const normalizedClaim = normalizeCaseType(claimType)
  const normalizedAreas = firm.practiceAreas.map(normalizeCaseType)

  if (normalizedAreas.includes(normalizedClaim)) return true

  if (options?.allowGeneralPI) {
    return normalizedAreas.some(area =>
      ['personal injury', 'general pi', 'pi', 'general personal injury'].includes(area)
    )
  }

  return false
}

function meetsCommercialEligibility(firm: Tier3FirmForRouting, price: number): boolean {
  const hasSubscription = firm.subscription.active && firm.subscription.tier3AllotmentRemaining > 0
  const hasFixed = firm.budgetRules.fixedEnabled && firm.budgetRules.maxPriceByTier >= price
  const hasAuction = firm.budgetRules.auctionEnabled && firm.budgetRules.maxPriceByTier >= price

  return hasSubscription || hasFixed || hasAuction
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 1
  return clamp01((value - min) / (max - min))
}

function buildOfferMessage(
  caseData: Tier3CaseData,
  price: number,
  timeoutSeconds: number,
  method: 'exclusive' | 'auction'
): string {
  const county = caseData.venueCounty ? `, ${caseData.venueCounty}` : ''
  const incidentAge = caseData.timeSinceIncidentDays !== null && caseData.timeSinceIncidentDays !== undefined
    ? `${caseData.timeSinceIncidentDays} days ago`
    : 'incident date unknown'

  return [
    `Tier 3 case (${method})`,
    `${caseData.venueState}${county}`,
    caseData.claimType,
    `Severity ${caseData.severityLevel}`,
    `Liability ${liabilityBand(caseData.liabilityScore)}`,
    `Est. value ${caseData.estimatedValueBand}`,
    `Docs ${caseData.docsAvailable ? 'yes' : 'no'}`,
    incidentAge,
    `Price $${price}`,
    `Expires ${timeoutSeconds}s`
  ].join(' | ')
}

type FirmStats = {
  dailyCount: number
  weeklyCount: number
  monthlyCount: number
  tierOfferCount30d: number
  tierAcceptedCount30d: number
  tierAcceptedTimeSeconds: number
  tierAcceptedTimeCount: number
  tierAcceptedCount7d: number
}

function buildStatsMap(
  introductions: Array<{
    attorneyId: string
    requestedAt: Date
    respondedAt: Date | null
    status: string
    assessment: { caseTier: { tierNumber: number } | null } | null
  }>,
  tierNumber: number,
  todayStart: Date,
  sevenDaysAgo: Date
): { statsByAttorney: Map<string, FirmStats>; totalTierAccepted7d: number } {
  const statsByAttorney = new Map<string, FirmStats>()
  let totalTierAccepted7d = 0

  for (const intro of introductions) {
    const stat = statsByAttorney.get(intro.attorneyId) || {
      dailyCount: 0,
      weeklyCount: 0,
      monthlyCount: 0,
      tierOfferCount30d: 0,
      tierAcceptedCount30d: 0,
      tierAcceptedTimeSeconds: 0,
      tierAcceptedTimeCount: 0,
      tierAcceptedCount7d: 0
    }

    stat.monthlyCount += 1
    if (intro.requestedAt >= todayStart) {
      stat.dailyCount += 1
    }
    if (intro.requestedAt >= sevenDaysAgo) {
      stat.weeklyCount += 1
    }

    const isTier = intro.assessment?.caseTier?.tierNumber === tierNumber
    if (isTier) {
      stat.tierOfferCount30d += 1
      if (intro.status === 'ACCEPTED') {
        stat.tierAcceptedCount30d += 1
        if (intro.respondedAt) {
          const seconds = Math.max(1, (intro.respondedAt.getTime() - intro.requestedAt.getTime()) / 1000)
          stat.tierAcceptedTimeSeconds += seconds
          stat.tierAcceptedTimeCount += 1
        }
        if (intro.requestedAt >= sevenDaysAgo) {
          stat.tierAcceptedCount7d += 1
          totalTierAccepted7d += 1
        }
      }
    }

    statsByAttorney.set(intro.attorneyId, stat)
  }

  return { statsByAttorney, totalTierAccepted7d }
}

/**
 * STEP 0: Build Eligible Firm Pool for Tier 3
 */
export async function buildEligibleFirmPool(
  caseData: Tier3CaseData,
  price: number
): Promise<{
  eligible: Tier3FirmForRouting[]
  ineligible: Array<{ firmId: string; reason: string }>
}> {
  const eligible: Tier3FirmForRouting[] = []
  const ineligible: Array<{ firmId: string; reason: string }> = []

  const attorneys = await prisma.attorney.findMany({
    where: {
      isActive: true,
      isVerified: true
    },
    include: {
      attorneyProfile: true
    }
  })

  if (attorneys.length === 0) {
    return { eligible, ineligible }
  }

  const attorneyIds = attorneys.map(attorney => attorney.id)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(now.getTime() - 7 * MS_PER_DAY)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * MS_PER_DAY)

  const recentIntroductions = await prisma.introduction.findMany({
    where: {
      attorneyId: { in: attorneyIds },
      requestedAt: { gte: thirtyDaysAgo }
    },
    select: {
      attorneyId: true,
      requestedAt: true,
      respondedAt: true,
      status: true,
      assessment: {
        select: {
          caseTier: {
            select: { tierNumber: true }
          }
        }
      }
    }
  })

  const { statsByAttorney, totalTierAccepted7d } = buildStatsMap(
    recentIntroductions,
    3,
    todayStart,
    sevenDaysAgo
  )

  const firmCandidates: Tier3FirmForRouting[] = []

  for (const attorney of attorneys) {
    const profile = attorney.attorneyProfile

    if (!attorney.isActive) {
      ineligible.push({ firmId: attorney.id, reason: 'Attorney not active' })
      continue
    }

    if (!profile?.jurisdictions) {
      ineligible.push({ firmId: attorney.id, reason: 'No jurisdictions configured' })
      continue
    }

    let jurisdictions: Jurisdiction[] = []
    try {
      jurisdictions = JSON.parse(profile.jurisdictions) as Jurisdiction[]
    } catch (error) {
      ineligible.push({ firmId: attorney.id, reason: 'Invalid jurisdictions configuration' })
      continue
    }

    let practiceAreas: string[] = []
    try {
      practiceAreas = JSON.parse(attorney.specialties) as string[]
    } catch (error) {
      ineligible.push({ firmId: attorney.id, reason: 'Invalid specialties configuration' })
      continue
    }

    const subscriptionTier = profile?.subscriptionTier || null
    const pricingModel = profile?.pricingModel || null
    const paymentModel = profile?.paymentModel || null

    const tierEnabled =
      profile?.tier2Enabled === true ||
      (subscriptionTier && (subscriptionTier.toLowerCase().includes('tier3') || subscriptionTier.toLowerCase() === 'enterprise')) ||
      (pricingModel === 'fixed_price' || pricingModel === 'auction' || pricingModel === 'both') ||
      (paymentModel === 'pay_per_case' || paymentModel === 'both' || paymentModel === 'subscription')

    if (!tierEnabled) {
      ineligible.push({ firmId: attorney.id, reason: 'Tier 3 not enabled' })
      continue
    }

    const stats = statsByAttorney.get(attorney.id) || {
      dailyCount: 0,
      weeklyCount: 0,
      monthlyCount: 0,
      tierOfferCount30d: 0,
      tierAcceptedCount30d: 0,
      tierAcceptedTimeSeconds: 0,
      tierAcceptedTimeCount: 0,
      tierAcceptedCount7d: 0
    }

    const maxCasesPerWeek = profile?.maxCasesPerWeek ?? null
    const maxCasesPerMonth = profile?.maxCasesPerMonth ?? null

    const dailyCap = maxCasesPerWeek !== null ? Math.ceil(maxCasesPerWeek / 5) : null
    const dailyCapRemaining = dailyCap !== null ? dailyCap - stats.dailyCount : Number.POSITIVE_INFINITY
    const weeklyCapRemaining = maxCasesPerWeek !== null ? maxCasesPerWeek - stats.weeklyCount : Number.POSITIVE_INFINITY
    const monthlyCapRemaining = maxCasesPerMonth !== null ? maxCasesPerMonth - stats.monthlyCount : Number.POSITIVE_INFINITY

    const openSlots = Math.min(
      toFiniteCap(dailyCapRemaining),
      toFiniteCap(weeklyCapRemaining),
      toFiniteCap(monthlyCapRemaining)
    )

    const subscriptionActive =
      profile?.subscriptionActive ||
      paymentModel === 'subscription' ||
      paymentModel === 'both' ||
      (subscriptionTier !== null && subscriptionTier !== '')

    const subscriptionRemaining = profile?.subscriptionRemainingCases ?? 0
    const accountBalance = profile?.accountBalance || 0

    const fixedEnabled = pricingModel === 'fixed_price' || pricingModel === 'both' || paymentModel === 'pay_per_case' || paymentModel === 'both'
    const auctionEnabled = pricingModel === 'auction' || pricingModel === 'both'

    const acceptanceRateFallback = profile?.historicalAcceptanceRate ?? 0.5
    const acceptanceRate30d = stats.tierOfferCount30d > 0
      ? stats.tierAcceptedCount30d / stats.tierOfferCount30d
      : acceptanceRateFallback

    let avgTimeToAcceptSeconds30d = DEFAULT_AVG_ACCEPT_SECONDS
    if (stats.tierAcceptedTimeCount > 0) {
      avgTimeToAcceptSeconds30d = stats.tierAcceptedTimeSeconds / stats.tierAcceptedTimeCount
    } else if (profile?.responseSpeedScore !== null && profile?.responseSpeedScore !== undefined) {
      const responseScore = clamp01(profile.responseSpeedScore)
      avgTimeToAcceptSeconds30d = 60 + (1 - responseScore) * 180
    } else if (attorney.responseTimeHours > 0) {
      avgTimeToAcceptSeconds30d = Math.min(attorney.responseTimeHours * 3600, 1800)
    }

    const qualityScore30d =
      profile?.recentConversionScore ??
      profile?.recentTier2ConversionRate ??
      profile?.successRate ??
      0.5

    const experienceYears = profile?.yearsExperience ?? 0

    const firm: Tier3FirmForRouting = {
      id: attorney.id,
      active: attorney.isActive,
      jurisdictions,
      practiceAreas,
      tierEnabled: true,
      capacity: {
        dailyCapRemaining,
        weeklyCapRemaining,
        monthlyCapRemaining,
        openSlots
      },
      acceptanceRate30d: clamp01(acceptanceRate30d),
      avgTimeToAcceptSeconds30d,
      qualityScore30d: clamp01(qualityScore30d),
      experienceYears,
      subscription: {
        active: subscriptionActive,
        tier3AllotmentRemaining: subscriptionRemaining
      },
      budgetRules: {
        maxPriceByTier: accountBalance,
        auctionEnabled,
        fixedEnabled,
        subscriptionEnabled: subscriptionActive
      },
      tier3Offers30d: stats.tierOfferCount30d,
      tier3Wins7d: stats.tierAcceptedCount7d,
      attorney
    }

    firmCandidates.push(firm)
  }

  const optionsList: EligibilityOptions[] = [
    { allowAdjacentCounties: false, allowGeneralPI: false },
    { allowAdjacentCounties: true, allowGeneralPI: false },
    { allowAdjacentCounties: true, allowGeneralPI: true }
  ]

  let filtered = { eligible: [] as Tier3FirmForRouting[], ineligible: [] as Array<{ firmId: string; reason: string }> }

  for (const options of optionsList) {
    filtered = filterEligibleFirms(firmCandidates, caseData, price, options)
    if (filtered.eligible.length >= MIN_ELIGIBLE_FIRMS || options.allowGeneralPI) {
      break
    }
  }

  const adjustedEligible = applyTier3Scores(filtered.eligible, totalTierAccepted7d)
  const combinedIneligible = [...ineligible, ...filtered.ineligible]
  return { eligible: adjustedEligible, ineligible: combinedIneligible }
}

function filterEligibleFirms(
  firms: Tier3FirmForRouting[],
  caseData: Tier3CaseData,
  price: number,
  options?: EligibilityOptions
): { eligible: Tier3FirmForRouting[]; ineligible: Array<{ firmId: string; reason: string }> } {
  const eligible: Tier3FirmForRouting[] = []
  const ineligible: Array<{ firmId: string; reason: string }> = []

  for (const firm of firms) {
    if (!firm.active) {
      ineligible.push({ firmId: firm.id, reason: 'Firm not active' })
      continue
    }

    if (!matchesJurisdiction(firm, caseData.venueState, caseData.venueCounty, options)) {
      ineligible.push({ firmId: firm.id, reason: 'Jurisdiction mismatch' })
      continue
    }

    if (!matchesPracticeArea(firm, caseData.claimType, options)) {
      ineligible.push({ firmId: firm.id, reason: 'Practice area mismatch' })
      continue
    }

    if (!firm.tierEnabled) {
      ineligible.push({ firmId: firm.id, reason: 'Tier 3 not enabled' })
      continue
    }

    if (firm.capacity.openSlots <= 0) {
      ineligible.push({ firmId: firm.id, reason: 'No capacity' })
      continue
    }

    if (!meetsCommercialEligibility(firm, price)) {
      ineligible.push({ firmId: firm.id, reason: 'Commercial eligibility failed' })
      continue
    }

    eligible.push(firm)
  }

  return { eligible, ineligible }
}

function applyTier3Scores(firms: Tier3FirmForRouting[], totalTierAccepted7d: number): Tier3FirmForRouting[] {
  if (firms.length === 0) return firms

  const acceptanceRates = firms.map(f => f.acceptanceRate30d)
  const inverseTimes = firms.map(f => 1 / Math.max(f.avgTimeToAcceptSeconds30d, 1))
  const qualityScores = firms.map(f => f.qualityScore30d)
  const openSlots = firms.map(f => f.capacity.openSlots)
  const experienceYears = firms.map(f => f.experienceYears)

  const minAcceptance = Math.min(...acceptanceRates)
  const maxAcceptance = Math.max(...acceptanceRates)
  const minInverseTime = Math.min(...inverseTimes)
  const maxInverseTime = Math.max(...inverseTimes)
  const minQuality = Math.min(...qualityScores)
  const maxQuality = Math.max(...qualityScores)
  const minOpenSlots = Math.min(...openSlots)
  const maxOpenSlots = Math.max(...openSlots)
  const minExperience = Math.min(...experienceYears)
  const maxExperience = Math.max(...experienceYears)

  return firms.map(firm => {
    const baseScore =
      0.2 * normalize(firm.acceptanceRate30d, minAcceptance, maxAcceptance) +
      0.15 * normalize(1 / Math.max(firm.avgTimeToAcceptSeconds30d, 1), minInverseTime, maxInverseTime) +
      0.35 * normalize(firm.qualityScore30d, minQuality, maxQuality) +
      0.15 * normalize(firm.capacity.openSlots, minOpenSlots, maxOpenSlots) +
      0.15 * normalize(firm.experienceYears, minExperience, maxExperience)

    let score = baseScore

    if (totalTierAccepted7d > 0) {
      const share = firm.tier3Wins7d / totalTierAccepted7d
      if (share > ANTI_MONOPOLY_WIN_SHARE_THRESHOLD) {
        score *= ANTI_MONOPOLY_MULTIPLIER
      }
    }

    return { ...firm, score }
  })
}

function rankFirms(firms: Tier3FirmForRouting[]): Array<{ firm: Tier3FirmForRouting; score: number }> {
  if (firms.length === 0) return []

  return firms
    .map(firm => ({
      firm,
      score: (firm as Tier3FirmForRouting & { score?: number }).score || 0
    }))
    .sort((a, b) => b.score - a.score)
}

async function sendOfferToFirm(
  caseId: string,
  firmId: string,
  method: 'exclusive' | 'auction',
  message: string
): Promise<string> {
  const existing = await prisma.introduction.findFirst({
    where: {
      assessmentId: caseId,
      attorneyId: firmId
    }
  })

  if (existing) {
    return existing.id
  }

  const intro = await prisma.introduction.create({
    data: {
      assessmentId: caseId,
      attorneyId: firmId,
      status: 'PENDING',
      message,
      requestedAt: new Date()
    }
  })

  logger.info('Tier 3 offer sent', {
    introductionId: intro.id,
    caseId,
    firmId,
    method
  })

  await sendCaseOfferSms(firmId, intro.id, message.slice(0, 100), Math.ceil(TIER_3_EXCLUSIVE_TIMEOUT_SECONDS / 60))

  return intro.id
}

async function waitForOfferResponse(
  introductionId: string,
  timeoutMs: number
): Promise<'accepted' | 'declined' | 'timeout'> {
  const startTime = Date.now()
  const checkInterval = 1000

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

    await new Promise(resolve => setTimeout(resolve, checkInterval))
  }

  return 'timeout'
}

async function waitForFirstAcceptance(
  introductionIds: string[],
  timeoutMs: number
): Promise<{ introductionId: string; attorneyId: string } | null> {
  const startTime = Date.now()
  const checkInterval = 1000

  while (Date.now() - startTime < timeoutMs) {
    const accepted = await prisma.introduction.findFirst({
      where: {
        id: { in: introductionIds },
        status: 'ACCEPTED'
      },
      select: {
        id: true,
        attorneyId: true
      }
    })

    if (accepted) {
      return { introductionId: accepted.id, attorneyId: accepted.attorneyId }
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval))
  }

  return null
}

async function decrementSubscriptionOnAcceptance(firm: Tier3FirmForRouting): Promise<void> {
  const remaining = Math.max((firm.subscription.tier3AllotmentRemaining || 0) - 1, 0)

  await prisma.attorneyProfile.update({
    where: { attorneyId: firm.id },
    data: { subscriptionRemainingCases: remaining }
  })
}

async function sendExclusiveOfferAndWait(
  caseData: Tier3CaseData,
  firm: Tier3FirmForRouting,
  price: number,
  timeoutSeconds: number
): Promise<{ accepted: boolean; introductionId?: string }> {
  const message = buildOfferMessage(caseData, price, timeoutSeconds, 'exclusive')
  const introductionId = await sendOfferToFirm(caseData.id, firm.id, 'exclusive', message)
  const response = await waitForOfferResponse(introductionId, timeoutSeconds * 1000)

  if (response === 'accepted') {
    return { accepted: true, introductionId }
  }

  return { accepted: false, introductionId }
}

type AuctionResult = { firm: Tier3FirmForRouting; bid: number; introductionId: string }

async function runAuction(
  caseData: Tier3CaseData,
  firms: Tier3FirmForRouting[],
  floorPrice: number,
  timeoutSeconds: number
): Promise<AuctionResult | null> {
  if (firms.length === 0) return null

  // NOTE: Full bid capture is not implemented. Acceptance is treated as a floor bid.
  const message = buildOfferMessage(caseData, floorPrice, timeoutSeconds, 'auction')
  const introductions: Array<{ firm: Tier3FirmForRouting; introductionId: string }> = []

  for (const firm of firms) {
    const introId = await sendOfferToFirm(caseData.id, firm.id, 'auction', message)
    introductions.push({ firm, introductionId: introId })
  }

  const accepted = await waitForFirstAcceptance(
    introductions.map(i => i.introductionId),
    timeoutSeconds * 1000
  )

  if (!accepted) return null

  const winner = introductions.find(i => i.introductionId === accepted.introductionId)
  if (!winner) return null

  return { firm: winner.firm, bid: floorPrice, introductionId: winner.introductionId }
}

async function markCaseHold(caseId: string): Promise<void> {
  await prisma.assessment.update({
    where: { id: caseId },
    data: {
      status: 'TIER3_HOLD'
    }
  })

  logger.info('Case marked as Tier 3 hold', { caseId })
}

/**
 * MAIN TIER 3 ROUTING FUNCTION
 */
export async function routeTier3Case(caseId: string): Promise<Tier3RoutingResult> {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: caseId },
      include: {
        caseTier: true,
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        files: true
      }
    })

    if (!assessment) {
      return { routed: false, error: 'Case not found' }
    }

    if (!assessment.caseTier || assessment.caseTier.tierNumber !== 3) {
      return { routed: false, error: 'Case is not Tier 3' }
    }

    const facts = JSON.parse(assessment.facts) as CaseFacts
    const estimatedValue = assessment.predictions[0]
      ? JSON.parse(assessment.predictions[0].bands).median
      : (facts.damages?.med_charges || 0)

    const tier3Check = isTier3Case(facts, estimatedValue, assessment.venueState)

    if (!tier3Check.isTier3) {
      return { routed: false, error: `Case does not qualify as Tier 3: ${tier3Check.reason}` }
    }

    const timeSinceIncidentDays = calculateTimeSinceIncidentDays(facts)
    const liabilityScore = estimateLiabilityScore(facts)
    const docsAvailable = hasDocsAvailable(facts, assessment.files?.length || 0)

    const caseData: Tier3CaseData = {
      id: assessment.id,
      claimType: assessment.claimType,
      venueState: assessment.venueState,
      venueCounty: assessment.venueCounty || null,
      facts,
      tierNumber: 3,
      severityLevel: tier3Check.data!.injurySeverityScore,
      liabilityScore,
      docsAvailable,
      timeSinceIncidentDays,
      estimatedValueBand: estimatedValueBand(estimatedValue),
      ...tier3Check.data!
    }

    const price = computeTier3Price(caseData)

    const { eligible, ineligible } = await buildEligibleFirmPool(caseData, price)

    if (eligible.length === 0) {
      await markCaseHold(caseId)
      return {
        routed: false,
        holdReason: 'No eligible firms found',
        attempts: {
          exclusive: 0,
          auction: 0
        }
      }
    }

    logger.info('Tier 3 eligible firms', {
      caseId,
      eligibleCount: eligible.length,
      ineligibleCount: ineligible.length
    })

    const ranked = rankFirms(eligible)
    const attemptedFirmIds = new Set<string>()

    const exclusiveCandidates = ranked.filter(entry =>
      entry.firm.budgetRules.fixedEnabled &&
      entry.firm.budgetRules.maxPriceByTier >= price
    )
    const exclusiveAttempts = Math.min(MAX_EXCLUSIVE_ATTEMPTS, exclusiveCandidates.length)

    for (let i = 0; i < exclusiveAttempts; i++) {
      const firm = exclusiveCandidates[i].firm
      attemptedFirmIds.add(firm.id)

      const offerResult = await sendExclusiveOfferAndWait(caseData, firm, price, TIER_3_EXCLUSIVE_TIMEOUT_SECONDS)

      if (offerResult.accepted) {
        if (firm.subscription.active && firm.subscription.tier3AllotmentRemaining > 0) {
          await decrementSubscriptionOnAcceptance(firm)
        }

        logger.info('Tier 3 exclusive offer accepted', {
          caseId: caseData.id,
          firmId: firm.id,
          introductionId: offerResult.introductionId
        })

        return {
          routed: true,
          routedToFirmId: firm.id,
          introductionId: offerResult.introductionId,
          method: 'exclusive',
          price,
          attempts: {
            exclusive: i + 1,
            auction: 0
          }
        }
      }

      logger.info('Tier 3 exclusive offer declined/timeout', {
        caseId: caseData.id,
        firmId: firm.id,
        introductionId: offerResult.introductionId
      })
    }

    const auctionCandidates = ranked
      .filter(entry =>
        entry.firm.budgetRules.auctionEnabled &&
        entry.firm.budgetRules.maxPriceByTier >= price &&
        !attemptedFirmIds.has(entry.firm.id)
      )
      .slice(0, AUCTION_GROUP_M)
      .map(entry => entry.firm)

    const auctionWinner = await runAuction(caseData, auctionCandidates, price, TIER_3_AUCTION_TIMEOUT_SECONDS)

    if (auctionWinner) {
      logger.info('Tier 3 auction accepted', {
        caseId: caseData.id,
        firmId: auctionWinner.firm.id,
        introductionId: auctionWinner.introductionId,
        bid: auctionWinner.bid
      })

      return {
        routed: true,
        routedToFirmId: auctionWinner.firm.id,
        introductionId: auctionWinner.introductionId,
        method: 'auction',
        price: auctionWinner.bid,
        attempts: {
          exclusive: exclusiveAttempts,
          auction: auctionCandidates.length
        }
      }
    }

    await markCaseHold(caseId)

    return {
      routed: false,
      holdReason: 'No firms accepted after all attempts',
      attempts: {
        exclusive: exclusiveAttempts,
        auction: auctionCandidates.length
      }
    }
  } catch (error) {
    logger.error('Error in Tier 3 routing', { error, caseId })
    return {
      routed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

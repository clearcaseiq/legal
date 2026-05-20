/**
 * Matching rules configuration
 * Admin-configurable routing parameters.
 */

import { prisma } from './prisma'

const CONFIG_KEY = 'matching_rules'

export type PreRoutingGateMode = 'conservative' | 'balanced' | 'growth' | 'custom'
export type GateHoldAction = 'manual_review' | 'needs_more_info' | 'not_routable_yet'

export interface ClaimTypeGateOverride {
  claimType: string
  minCaseScore?: number
  minEvidenceScore?: number
  action?: GateHoldAction
}

export interface StateGateOverride {
  state: string
  minCaseScore?: number
  minEvidenceScore?: number
  action?: GateHoldAction
}

export interface JurisdictionGateOverride {
  state: string
  jurisdiction: string
  minCaseScore?: number
  minEvidenceScore?: number
  action?: GateHoldAction
}

export interface CaseRoutingPricingTier {
  id: string
  label: string
  priceCents: number
  caseTypes: string[]
  description: string
  enabled: boolean
}

export interface AttorneySubscriptionTier {
  id: string
  label: string
  monthlyPriceCents: number | null
  includedCasesPerMonth: number | null
  description: string
  features: string[]
  enabled: boolean
}

export interface MatchingRulesConfig {
  // Global kill switch
  routingEnabled: boolean

  // Wave sizing
  maxAttorneysWave1: number
  maxAttorneysWave2: number
  maxAttorneysWave3: number

  // Escalation timing
  defaultAttorneyResponseDeadlineMinutes: number
  defaultAttorneyResponseDeadlineHours?: number
  wave1WaitHours: number
  wave2WaitHours: number
  wave3WaitHours: number

  // Pre-routing gate
  preRoutingGateMode: PreRoutingGateMode
  gateFailureAction: GateHoldAction
  minCaseScore: number
  minEvidenceScore: number
  supportedJurisdictions: string[]
  supportedClaimTypes: string[]
  claimTypeGateOverrides: ClaimTypeGateOverride[]
  stateGateOverrides: StateGateOverride[]
  jurisdictionGateOverrides: JurisdictionGateOverride[]

  // Value thresholds (optional)
  minValueThreshold: number
  geographicExpansionRadiusMiles: number
  caseRoutingPricingTiers: CaseRoutingPricingTier[]
  attorneySubscriptionTiers: AttorneySubscriptionTier[]

  // Ranking weights (0-1, must sum to 1)
  jurisdiction_fit: number
  case_type_fit: number
  economic_fit: number
  response_score: number
  conversion_score: number
  capacity_score: number
  plaintiff_fit: number
  strategic_priority: number
}

export type MatchingRulesWeights = Pick<
  MatchingRulesConfig,
  | 'jurisdiction_fit'
  | 'case_type_fit'
  | 'economic_fit'
  | 'response_score'
  | 'conversion_score'
  | 'capacity_score'
  | 'plaintiff_fit'
  | 'strategic_priority'
>

export const DEFAULT_MATCHING_RULES: MatchingRulesConfig = {
  routingEnabled: true,
  maxAttorneysWave1: 3,
  maxAttorneysWave2: 5,
  maxAttorneysWave3: 10,
  defaultAttorneyResponseDeadlineMinutes: 24 * 60,
  wave1WaitHours: 4,
  wave2WaitHours: 12,
  wave3WaitHours: 24,
  preRoutingGateMode: 'balanced',
  gateFailureAction: 'manual_review',
  minCaseScore: 0.25,
  minEvidenceScore: 0.1,
  supportedJurisdictions: ['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI', 'AZ', 'WA', 'CO', 'NV', 'NJ'],
  supportedClaimTypes: ['auto', 'slip_and_fall', 'dog_bite', 'medmal', 'product', 'nursing_home_abuse', 'wrongful_death', 'auto_accident', 'premises', 'pi'],
  claimTypeGateOverrides: [],
  stateGateOverrides: [],
  jurisdictionGateOverrides: [],
  minValueThreshold: 0,
  geographicExpansionRadiusMiles: 50,
  caseRoutingPricingTiers: [
    {
      id: 'qualified_lead',
      label: 'Qualified Lead',
      priceCents: 25000,
      caseTypes: ['pi', 'other_pi', 'product', 'mass_tort'],
      description: 'Low-value or early intake PI opportunities that need more development before premium routing.',
      enabled: true,
    },
    {
      id: 'attorney_ready',
      label: 'Attorney-Ready Case',
      priceCents: 75000,
      caseTypes: ['auto', 'auto_accident', 'slip_and_fall', 'premises'],
      description: 'Standard routable PI cases with enough facts for attorney review, but no major value enhancer yet.',
      enabled: true,
    },
    {
      id: 'high_value',
      label: 'High-Value Case',
      priceCents: 150000,
      caseTypes: ['dog_bite', 'workplace_injury'],
      description: 'Clearer liability, stronger damages, scarring, third-party workplace exposure, or meaningful treatment.',
      enabled: true,
    },
    {
      id: 'premium',
      label: 'Premium Case',
      priceCents: 350000,
      caseTypes: ['medmal', 'nursing_home_abuse', 'elder_abuse', 'high_severity_surgery'],
      description: 'Complex or serious injury cases with higher expected value and higher attorney diligence burden.',
      enabled: true,
    },
    {
      id: 'catastrophic_death',
      label: 'Catastrophic / Death',
      priceCents: 750000,
      caseTypes: ['wrongful_death', 'catastrophic_injury'],
      description: 'Wrongful death, paralysis, TBI, amputation, severe burns, or other catastrophic damages.',
      enabled: true,
    },
  ],
  attorneySubscriptionTiers: [
    {
      id: 'starter',
      label: 'Starter',
      monthlyPriceCents: 29900,
      includedCasesPerMonth: 1,
      description: 'For solo attorneys testing CaseIQ with predictable monthly access.',
      features: ['1 accepted case included monthly', 'Standard routing visibility', 'Saved payment method for overages'],
      enabled: true,
    },
    {
      id: 'growth',
      label: 'Growth',
      monthlyPriceCents: 99900,
      includedCasesPerMonth: 5,
      description: 'For active PI practices that want a steady flow of attorney-ready cases.',
      features: ['5 accepted cases included monthly', 'Priority routing eligibility', 'Reduced need for per-case checkout'],
      enabled: true,
    },
    {
      id: 'pro',
      label: 'Pro',
      monthlyPriceCents: 249900,
      includedCasesPerMonth: 15,
      description: 'For firms scaling intake volume across multiple attorneys.',
      features: ['15 accepted cases included monthly', 'Premium routing eligibility', 'Best fit for multi-attorney firms'],
      enabled: true,
    },
    {
      id: 'enterprise',
      label: 'Enterprise',
      monthlyPriceCents: null,
      includedCasesPerMonth: null,
      description: 'Custom monthly agreement for regional firms and high-volume intake teams.',
      features: ['Custom accepted-case allotment', 'Dedicated onboarding', 'Custom billing terms'],
      enabled: true,
    },
  ],
  jurisdiction_fit: 0.2,
  case_type_fit: 0.2,
  economic_fit: 0.15,
  response_score: 0.15,
  conversion_score: 0.1,
  capacity_score: 0.1,
  plaintiff_fit: 0.05,
  strategic_priority: 0.05,
}

export async function isRoutingEnabled(): Promise<boolean> {
  const config = await getMatchingRules()
  return config.routingEnabled !== false
}

export async function getMatchingRules(): Promise<MatchingRulesConfig> {
  try {
    const row = await prisma.routingConfig.findUnique({
      where: { key: CONFIG_KEY },
    })
    if (!row?.value) return DEFAULT_MATCHING_RULES
    try {
      const parsed = JSON.parse(row.value) as Partial<MatchingRulesConfig>
      const merged = { ...DEFAULT_MATCHING_RULES, ...parsed }
      if (
        parsed.defaultAttorneyResponseDeadlineMinutes == null &&
        parsed.defaultAttorneyResponseDeadlineHours != null
      ) {
        merged.defaultAttorneyResponseDeadlineMinutes = Math.max(
          1,
          Math.round(Number(parsed.defaultAttorneyResponseDeadlineHours) * 60)
        )
      }
      return merged
    } catch {
      return DEFAULT_MATCHING_RULES
    }
  } catch (err) {
    // Table may not exist if migration not run yet
    return DEFAULT_MATCHING_RULES
  }
}

export async function saveMatchingRules(config: Partial<MatchingRulesConfig>): Promise<MatchingRulesConfig> {
  const current = await getMatchingRules()
  const merged = { ...current, ...config }
  try {
    await prisma.routingConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: JSON.stringify(merged) },
      update: { value: JSON.stringify(merged) },
    })
    return merged
  } catch (err) {
    throw new Error(
      'Failed to save matching rules. Ensure the routing_config table exists (run: npx prisma migrate deploy)'
    )
  }
}

export function normalizeMatchingWeights(config: MatchingRulesConfig): MatchingRulesWeights {
  const weights: MatchingRulesWeights = {
    jurisdiction_fit: Number(config.jurisdiction_fit || 0),
    case_type_fit: Number(config.case_type_fit || 0),
    economic_fit: Number(config.economic_fit || 0),
    response_score: Number(config.response_score || 0),
    conversion_score: Number(config.conversion_score || 0),
    capacity_score: Number(config.capacity_score || 0),
    plaintiff_fit: Number(config.plaintiff_fit || 0),
    strategic_priority: Number(config.strategic_priority || 0),
  }
  const total = Object.values(weights).reduce((sum, value) => sum + Math.max(0, value), 0)
  if (total <= 0) {
    return normalizeMatchingWeights(DEFAULT_MATCHING_RULES)
  }
  return Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, Math.max(0, value) / total])
  ) as MatchingRulesWeights
}

export function getConfiguredWaveSize(config: MatchingRulesConfig, waveNumber: number): number {
  const size = waveNumber === 1
    ? config.maxAttorneysWave1
    : waveNumber === 2
      ? config.maxAttorneysWave2
      : config.maxAttorneysWave3
  return Math.max(1, Math.round(Number(size || DEFAULT_MATCHING_RULES.maxAttorneysWave1)))
}

export function getConfiguredWaveWaitHours(config: MatchingRulesConfig, waveNumber: number): number {
  const waitHours = waveNumber === 1
    ? config.wave1WaitHours
    : waveNumber === 2
      ? config.wave2WaitHours
      : config.wave3WaitHours
  return Math.max(0.25, Number(waitHours || DEFAULT_MATCHING_RULES.wave1WaitHours))
}

export function getAttorneyResponseDeadlineMinutes(config: MatchingRulesConfig): number {
  return Math.max(
    1,
    Math.round(
      Number(
        config.defaultAttorneyResponseDeadlineMinutes ||
        (config.defaultAttorneyResponseDeadlineHours ? config.defaultAttorneyResponseDeadlineHours * 60 : 0) ||
        DEFAULT_MATCHING_RULES.defaultAttorneyResponseDeadlineMinutes
      )
    )
  )
}

function normalizeClaimType(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_')
}

export function getCaseRoutingPricingForClaimType(
  config: MatchingRulesConfig,
  claimType: unknown
): CaseRoutingPricingTier | null {
  const normalizedClaimType = normalizeClaimType(claimType)
  if (!normalizedClaimType) return null
  return (config.caseRoutingPricingTiers || [])
    .filter((tier) => tier.enabled !== false)
    .find((tier) => (tier.caseTypes || []).map(normalizeClaimType).includes(normalizedClaimType)) || null
}

export function getAttorneySubscriptionTier(
  config: MatchingRulesConfig,
  tierId: unknown
): AttorneySubscriptionTier | null {
  const normalizedTierId = String(tierId || '').trim().toLowerCase()
  if (!normalizedTierId) return null
  return (config.attorneySubscriptionTiers || [])
    .filter((tier) => tier.enabled !== false)
    .find((tier) => tier.id.toLowerCase() === normalizedTierId) || null
}

export function formatAttorneyResponseDeadline(minutes: number): string {
  const normalizedMinutes = Math.max(1, Math.round(Number(minutes || DEFAULT_MATCHING_RULES.defaultAttorneyResponseDeadlineMinutes)))
  const hours = Math.floor(normalizedMinutes / 60)
  const remainingMinutes = normalizedMinutes % 60
  const parts = [
    hours > 0 ? `${hours} hour${hours === 1 ? '' : 's'}` : '',
    remainingMinutes > 0 ? `${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

export function getPreRoutingGateOptions(config: MatchingRulesConfig) {
  return {
    minCaseScore: Number(config.minCaseScore ?? DEFAULT_MATCHING_RULES.minCaseScore),
    minEvidenceScore: Number(config.minEvidenceScore ?? DEFAULT_MATCHING_RULES.minEvidenceScore),
    gateFailureAction: config.gateFailureAction || DEFAULT_MATCHING_RULES.gateFailureAction,
    supportedJurisdictions: config.supportedJurisdictions?.length
      ? config.supportedJurisdictions
      : DEFAULT_MATCHING_RULES.supportedJurisdictions,
    supportedClaimTypes: config.supportedClaimTypes?.length
      ? config.supportedClaimTypes
      : DEFAULT_MATCHING_RULES.supportedClaimTypes,
    claimTypeGateOverrides: Array.isArray(config.claimTypeGateOverrides)
      ? config.claimTypeGateOverrides
      : DEFAULT_MATCHING_RULES.claimTypeGateOverrides,
    stateGateOverrides: Array.isArray(config.stateGateOverrides)
      ? config.stateGateOverrides
      : DEFAULT_MATCHING_RULES.stateGateOverrides,
    jurisdictionGateOverrides: Array.isArray(config.jurisdictionGateOverrides)
      ? config.jurisdictionGateOverrides
      : DEFAULT_MATCHING_RULES.jurisdictionGateOverrides,
  }
}

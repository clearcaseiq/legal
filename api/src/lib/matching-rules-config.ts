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

/**
 * One flat fee for every accepted case, regardless of claim type, severity or
 * expected recovery.
 *
 * This replaced a five-band schedule that ran from $250 for a "qualified lead" to
 * $7,500 for catastrophic injury and wrongful death. Even though it was never a
 * percentage of recovery, pricing the fee by anticipated case value is the feature
 * B&P § 6155(a)(2) is concerned with, and case scoring could promote a file into a
 * more expensive band. A single amount removes the question entirely: what the
 * attorney pays cannot vary with what the case is thought to be worth.
 *
 * The amount stays administrator-editable, but it is one number for all cases —
 * there is deliberately no way to configure it per claim type.
 */
export const FLAT_CASE_ROUTING_FEE_CENTS = 75_000

/** Descriptor for the flat fee, in the shape the checkout and lead views expect. */
export interface CaseRoutingFee {
  id: string
  label: string
  priceCents: number
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
  /** @deprecated Wave 1 escalates on the response deadline; kept so stored configs still parse. */
  wave1WaitHours?: number
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
  routingFeePaymentsEnabled: boolean
  caseRoutingFeeCents: number
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

  // Attorney quality gate (routing rules applied after hard eligibility)
  qualityGateMaxResponseHours: number
  qualityGateHotCaseMaxResponseHours: number
  qualityGateHotCaseViabilityThreshold: number
  qualityGateMinContactRate: number
  qualityGateMaxComplaintRate: number
  qualityGateMaxCherryPickingScore: number
}

export interface QualityGateOptions {
  maxResponseTimeHours: number
  hotCaseMaxResponseHours: number
  hotCaseViabilityThreshold: number
  minContactRate: number
  maxComplaintRate: number
  maxCherryPickingScore: number
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
  routingFeePaymentsEnabled: false,
  caseRoutingFeeCents: FLAT_CASE_ROUTING_FEE_CENTS,
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
  qualityGateMaxResponseHours: 48,
  qualityGateHotCaseMaxResponseHours: 24,
  qualityGateHotCaseViabilityThreshold: 0.75,
  qualityGateMinContactRate: 0.7,
  qualityGateMaxComplaintRate: 0.05,
  qualityGateMaxCherryPickingScore: 0.3,
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

/**
 * How long to wait on a wave before escalating to the next one.
 *
 * Wave 1 is the attorney response deadline rather than a setting of its own.
 * Wave 1's due time is stamped by the routing engine as "now + deadline", and
 * the offer-expiry sweep retires those same offers at the deadline, so a second
 * independent knob could only ever disagree with them: escalating early leaves
 * live offers on a case that has moved on, escalating late leaves the case with
 * nobody holding it. `wave1WaitHours` was that second knob — it was editable in
 * the admin UI, directly beneath the deadline that actually governs wave 1, and
 * changing it did nothing but shift an alerting threshold.
 */
export function getConfiguredWaveWaitHours(config: MatchingRulesConfig, waveNumber: number): number {
  if (waveNumber === 1) return getAttorneyResponseDeadlineMinutes(config) / 60
  const waitHours = waveNumber === 2 ? config.wave2WaitHours : config.wave3WaitHours
  return Math.max(0.25, Number(waitHours || DEFAULT_MATCHING_RULES.wave2WaitHours))
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

/**
 * The flat case fee in whole dollars, for the tier-routing modules that quote a
 * price to firms in dollars rather than cents.
 */
export async function getCaseRoutingFeeDollars(): Promise<number> {
  const config = await getMatchingRules()
  return Math.round(getCaseRoutingFeeCents(config) / 100)
}

export function getCaseRoutingFeeCents(config: MatchingRulesConfig): number {
  const configured = Number(config.caseRoutingFeeCents)
  if (!Number.isFinite(configured) || configured < 0) return FLAT_CASE_ROUTING_FEE_CENTS
  return Math.round(configured)
}

/**
 * The fee for accepting a case. Takes no case argument by design: the same amount
 * applies to every case, so there is nothing about the case to look up.
 */
export function getCaseRoutingFee(config: MatchingRulesConfig): CaseRoutingFee | null {
  const priceCents = getCaseRoutingFeeCents(config)
  if (priceCents <= 0) return null
  return {
    id: 'flat_case_fee',
    label: 'Case fee',
    priceCents,
    description:
      'A single flat fee for every accepted case. It does not vary by claim type, injury severity, or expected recovery.',
    enabled: true,
  }
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

export function getQualityGateOptions(config: MatchingRulesConfig): QualityGateOptions {
  const clampRate = (value: number, fallback: number) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return fallback
    return Math.max(0, Math.min(1, numeric))
  }
  const clampHours = (value: number, fallback: number) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric <= 0) return fallback
    return numeric
  }
  return {
    maxResponseTimeHours: clampHours(config.qualityGateMaxResponseHours, DEFAULT_MATCHING_RULES.qualityGateMaxResponseHours),
    hotCaseMaxResponseHours: clampHours(config.qualityGateHotCaseMaxResponseHours, DEFAULT_MATCHING_RULES.qualityGateHotCaseMaxResponseHours),
    hotCaseViabilityThreshold: clampRate(config.qualityGateHotCaseViabilityThreshold, DEFAULT_MATCHING_RULES.qualityGateHotCaseViabilityThreshold),
    minContactRate: clampRate(config.qualityGateMinContactRate, DEFAULT_MATCHING_RULES.qualityGateMinContactRate),
    maxComplaintRate: clampRate(config.qualityGateMaxComplaintRate, DEFAULT_MATCHING_RULES.qualityGateMaxComplaintRate),
    maxCherryPickingScore: clampRate(config.qualityGateMaxCherryPickingScore, DEFAULT_MATCHING_RULES.qualityGateMaxCherryPickingScore),
  }
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

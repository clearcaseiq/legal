/**
 * Matching rules configuration
 * Admin-configurable routing parameters.
 */

import { prisma } from './prisma'

const CONFIG_KEY = 'matching_rules'

export interface MatchingRulesConfig {
  // Global kill switch
  routingEnabled: boolean

  // Wave sizing
  maxAttorneysWave1: number
  maxAttorneysWave2: number
  maxAttorneysWave3: number

  // Escalation timing (hours)
  wave1WaitHours: number
  wave2WaitHours: number
  wave3WaitHours: number

  // Pre-routing gate
  minCaseScore: number
  minEvidenceScore: number
  supportedJurisdictions: string[]
  supportedClaimTypes: string[]

  // Value thresholds (optional)
  minValueThreshold: number
  geographicExpansionRadiusMiles: number

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
  wave1WaitHours: 4,
  wave2WaitHours: 12,
  wave3WaitHours: 24,
  minCaseScore: 0.25,
  minEvidenceScore: 0.1,
  supportedJurisdictions: ['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI', 'AZ', 'WA', 'CO', 'NV', 'NJ'],
  supportedClaimTypes: ['auto', 'slip_and_fall', 'dog_bite', 'medmal', 'product', 'nursing_home_abuse', 'wrongful_death', 'auto_accident', 'premises', 'pi'],
  minValueThreshold: 0,
  geographicExpansionRadiusMiles: 50,
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
      return { ...DEFAULT_MATCHING_RULES, ...parsed }
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

export function getPreRoutingGateOptions(config: MatchingRulesConfig) {
  return {
    minCaseScore: Number(config.minCaseScore ?? DEFAULT_MATCHING_RULES.minCaseScore),
    minEvidenceScore: Number(config.minEvidenceScore ?? DEFAULT_MATCHING_RULES.minEvidenceScore),
    supportedJurisdictions: config.supportedJurisdictions?.length
      ? config.supportedJurisdictions
      : DEFAULT_MATCHING_RULES.supportedJurisdictions,
    supportedClaimTypes: config.supportedClaimTypes?.length
      ? config.supportedClaimTypes
      : DEFAULT_MATCHING_RULES.supportedClaimTypes,
  }
}

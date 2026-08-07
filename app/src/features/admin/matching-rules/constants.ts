import type { MatchingRulesConfig } from '../../../lib/api'

export const clampInt = (raw: string, min: number, max: number, fallback: number): number => {
  const parsed = parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export const RANKING_WEIGHT_KEYS = [
  { key: 'jurisdiction_fit' as const, label: 'Jurisdiction fit' },
  { key: 'case_type_fit' as const, label: 'Case type fit' },
  { key: 'economic_fit' as const, label: 'Economic fit' },
  { key: 'response_score' as const, label: 'Response score' },
  { key: 'conversion_score' as const, label: 'Conversion score' },
  { key: 'capacity_score' as const, label: 'Capacity score' },
  { key: 'plaintiff_fit' as const, label: 'Plaintiff fit' },
  { key: 'strategic_priority' as const, label: 'Strategic priority' },
] as const

export const GATE_PRESETS = {
  conservative: {
    label: 'Conservative',
    description: 'Routes fewer cases. Better when attorney supply is tight or quality control is the priority.',
    minCaseScore: 0.45,
    minEvidenceScore: 0.25,
    gateFailureAction: 'manual_review' as const,
  },
  balanced: {
    label: 'Balanced',
    description: 'Default posture. Routes plausible cases while holding lower-confidence cases for review.',
    minCaseScore: 0.25,
    minEvidenceScore: 0.1,
    gateFailureAction: 'manual_review' as const,
  },
  growth: {
    label: 'Growth',
    description: 'Routes more cases. Better when you want more attorney review volume.',
    minCaseScore: 0.15,
    minEvidenceScore: 0.05,
    gateFailureAction: 'needs_more_info' as const,
  },
} as const

export const GATE_ACTION_OPTIONS = [
  { value: 'manual_review', label: 'Manual review' },
  { value: 'needs_more_info', label: 'Request more info' },
  { value: 'not_routable_yet', label: 'Do not route' },
] as const

export const MATCHING_RULE_TABS = [
  { id: 'routing', label: 'Routing' },
  { id: 'timing', label: 'Timing' },
  { id: 'gate', label: 'Pre-routing Gate' },
  { id: 'quality', label: 'Attorney Rules' },
  { id: 'value', label: 'Value' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'weights', label: 'Weights' },
] as const

export type MatchingRuleTab = typeof MATCHING_RULE_TABS[number]['id']

export interface MatchingRulesTabProps {
  config: MatchingRulesConfig
  update: (updates: Partial<MatchingRulesConfig>) => void
}

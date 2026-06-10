const CLAIM_LABELS: Record<string, string> = {
  auto: 'Motor vehicle',
  slip_and_fall: 'Slip & fall',
  dog_bite: 'Dog bite',
  medmal: 'Medical malpractice',
  product: 'Product liability',
  nursing_home_abuse: 'Nursing home',
  wrongful_death: 'Wrongful death',
  high_severity_surgery: 'High-severity surgery',
}

export function formatClaimType(raw: string | undefined | null): string {
  if (!raw) return 'Personal injury'
  const k = raw.replace(/-/g, '_').toLowerCase()
  return CLAIM_LABELS[k] || raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatStatus(status: string | undefined | null): string {
  if (!status) return 'Unknown'
  const s = status.toLowerCase()
  if (s === 'submitted') return 'Needs review'
  if (s === 'contacted') return 'Accepted'
  if (s === 'rejected') return 'Declined'
  if (s === 'consulted') return 'Consulted'
  if (s === 'retained') return 'Retained'
  return status.replace(/_/g, ' ')
}

export function formatLifecycleState(state: string | undefined | null): string | null {
  if (!state) return null
  const s = state.toLowerCase()
  if (s === 'routing_active') return 'Routing active'
  if (s === 'attorney_review') return 'Attorney review'
  if (s === 'attorney_matched') return 'Attorney matched'
  if (s === 'manual_review_needed') return 'Manual review'
  if (s === 'plaintiff_info_requested') return 'Awaiting plaintiff info'
  if (s === 'needs_more_info') return 'Needs more information'
  if (s === 'not_routable_yet') return 'Not routable yet'
  if (s === 'consultation_scheduled') return 'Consultation scheduled'
  if (s === 'engaged') return 'Engaged'
  if (s === 'closed') return 'Closed'
  return state.replace(/_/g, ' ')
}

export function currencyFromMedian(n: number | undefined | null): string | null {
  if (n == null || Number.isNaN(n)) return null
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M est.`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k est.`
  return `$${Math.round(n)} est.`
}

export function parseFacts(facts: unknown): Record<string, any> | null {
  if (!facts) return null
  if (typeof facts === 'object') return facts as Record<string, any>
  if (typeof facts === 'string') {
    try {
      return JSON.parse(facts) as Record<string, any>
    } catch {
      return null
    }
  }
  return null
}

/** Human-readable label for a lead (plaintiff name, else claim type, else short id). */
export function leadLabel(lead: any): string {
  const assessment = lead?.assessment || lead?.lead?.assessment || {}
  const facts = parseFacts(assessment.facts)
  const plaintiffContext = facts?.plaintiffContext || facts?.plaintiff || {}
  const plaintiff = assessment.user
    ? `${assessment.user.firstName || ''} ${assessment.user.lastName || ''}`.trim()
    : lead?.plaintiffName ||
      `${plaintiffContext.firstName || ''} ${plaintiffContext.lastName || ''}`.trim() ||
      plaintiffContext.name
  return plaintiff || formatClaimType(assessment.claimType) || `Case ${String(lead?.id || '').slice(-6)}`
}

/** Secondary line for a lead: "Claim type · County, State" (optionally · Case xxxxxx). */
export function leadMeta(lead: any, opts?: { includeId?: boolean }): string {
  const assessment = lead?.assessment || lead?.lead?.assessment || {}
  const claim = formatClaimType(assessment.claimType)
  const venue = [assessment.venueCounty, assessment.venueState].filter(Boolean).join(', ')
  const idSuffix = opts?.includeId && lead?.id ? `Case ${String(lead.id).slice(-6)}` : null
  return [claim, venue, idSuffix].filter(Boolean).join(' · ')
}

/**
 * Normalize a score that may arrive as either a 0-1 fraction or a 0-100 number
 * into a clamped 0-100 integer. Backends are inconsistent about the scale.
 */
export function normalizeScore(value: number | null | undefined): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(100, Math.round(numeric <= 1 ? numeric * 100 : numeric)))
}

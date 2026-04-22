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

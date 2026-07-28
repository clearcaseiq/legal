/**
 * Claim/incident type labels. Kept byte-identical to `shared/claim-types.ts` so
 * a case never reads differently on mobile than on web (CP-406); the labels are
 * inlined here because Metro only bundles files under the app root, and
 * `formatLead.test.ts` fails if the two ever drift.
 */
const CLAIM_LABELS: Record<string, string> = {
  auto: 'Motor vehicle',
  vehicle: 'Motor vehicle',
  motor_vehicle: 'Motor vehicle',
  car_accident: 'Motor vehicle',
  truck_accident: 'Motor vehicle',
  motorcycle: 'Motor vehicle',
  slip_and_fall: 'Slip & fall',
  slip_fall: 'Slip & fall',
  premises: 'Premises liability',
  premises_liability: 'Premises liability',
  workplace: 'Workplace injury',
  workplace_injury: 'Workplace injury',
  workers_comp: 'Workplace injury',
  medmal: 'Medical malpractice',
  medical_malpractice: 'Medical malpractice',
  med_mal: 'Medical malpractice',
  dog_bite: 'Dog bite',
  product: 'Product liability',
  product_liability: 'Product liability',
  assault: 'Assault & negligent security',
  intentional_tort: 'Assault & negligent security',
  toxic: 'Toxic exposure',
  toxic_exposure: 'Toxic exposure',
  nursing_home_abuse: 'Nursing home abuse',
  nursing_home: 'Nursing home abuse',
  wrongful_death: 'Wrongful death',
  high_severity_surgery: 'Catastrophic injury',
  other: 'Other injury',
  other_pi: 'Other injury',
}

// 3-letter claim-type codes used in the human-meaningful case reference.
const CLAIM_CODES: Record<string, string> = {
  auto: 'MVA',
  motor_vehicle: 'MVA',
  mva: 'MVA',
  car_accident: 'MVA',
  truck_accident: 'TRK',
  motorcycle: 'MTC',
  pedestrian: 'PED',
  bicycle: 'BIK',
  slip_and_fall: 'SLF',
  premises: 'PRM',
  premises_liability: 'PRM',
  dog_bite: 'DOG',
  medmal: 'MED',
  medical_malpractice: 'MED',
  product: 'PRD',
  product_liability: 'PRD',
  nursing_home_abuse: 'NRS',
  nursing_home: 'NRS',
  wrongful_death: 'WDT',
  high_severity_surgery: 'SRG',
  workplace: 'WRK',
  workers_comp: 'WRK',
}

function claimTypeCode(raw: string | undefined | null): string {
  if (!raw) return 'PI'
  const key = String(raw).trim().toLowerCase().replace(/[\s-]+/g, '_')
  return CLAIM_CODES[key] || 'PI'
}

/**
 * Human-meaningful case reference, e.g. "CCIQ-2606-MVA-7F3A".
 * Format: CCIQ-<YYMM intake>-<claim type code>-<stable 4-char suffix>.
 */
export function formatCaseId(lead: any): string {
  const assessment = lead?.assessment || lead?.lead?.assessment || {}
  const id = assessment.id || lead?.id
  const createdAt = assessment.createdAt ?? lead?.createdAt
  const segments: string[] = ['CCIQ']

  if (createdAt) {
    const d = new Date(createdAt)
    if (!Number.isNaN(d.getTime())) {
      segments.push(`${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
  }

  segments.push(claimTypeCode(assessment.claimType ?? lead?.claimType))
  const cleaned = String(id ?? '').replace(/[^a-zA-Z0-9]/g, '')
  segments.push((cleaned.slice(-4) || '0000').toUpperCase())
  return segments.join('-')
}

export function formatClaimType(raw: string | undefined | null): string {
  const value = String(raw ?? '').trim()
  if (!value) return 'Personal injury'
  const key = value.toLowerCase().replace(/[\s-]+/g, '_')
  const mapped = CLAIM_LABELS[key]
  if (mapped) return mapped
  const spaced = value.replace(/_/g, ' ').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Exported for the parity test against `shared/claim-types.ts`. */
export const CLAIM_TYPE_LABELS_FOR_TEST = CLAIM_LABELS

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

/**
 * Human-readable label for a lead: the case name the attorney set, else the
 * plaintiff name, else claim type, else short id.
 *
 * The caption ("Rivera v. Delgado Trucking") is free text on the assessment
 * because no defendant name is captured at intake. It comes first so a case
 * reads the same here as it does on web.
 */
export function leadLabel(lead: any): string {
  const assessment = lead?.assessment || lead?.lead?.assessment || {}
  const caseName = String(assessment.caseName ?? '').replace(/\s+/g, ' ').trim()
  if (caseName) return caseName
  const facts = parseFacts(assessment.facts)
  const plaintiffContext = facts?.plaintiffContext || facts?.plaintiff || {}
  const plaintiff = assessment.user
    ? `${assessment.user.firstName || ''} ${assessment.user.lastName || ''}`.trim()
    : lead?.plaintiffName ||
      `${plaintiffContext.firstName || ''} ${plaintiffContext.lastName || ''}`.trim() ||
      plaintiffContext.name
  return plaintiff || formatClaimType(assessment.claimType) || formatCaseId(lead)
}

/** Secondary line for a lead: "Claim type · County, State" (optionally · Case xxxxxx). */
export function leadMeta(lead: any, opts?: { includeId?: boolean }): string {
  const assessment = lead?.assessment || lead?.lead?.assessment || {}
  const claim = formatClaimType(assessment.claimType)
  const venue = [assessment.venueCounty, assessment.venueState].filter(Boolean).join(', ')
  const idSuffix = opts?.includeId && lead?.id ? formatCaseId(lead) : null
  return [claim, venue, idSuffix].filter(Boolean).join(' · ')
}

/** Default attorney response window (minutes) when a lead carries no explicit deadline. */
const DEFAULT_RESPONSE_WINDOW_MIN = 1440

/**
 * Effective offer-expiry timestamp (ms) for a routed match. Prefers the
 * server-computed offerExpiresAt; otherwise derives it from the offer/submission
 * time plus the response window, so offers routed without a formal Introduction
 * still resolve an expiry. Mirrors the web attorney dashboard.
 */
export function getOfferExpiryMs(lead: any): number | null {
  const direct = lead?.offerExpiresAt ? Date.parse(lead.offerExpiresAt) : NaN
  if (!Number.isNaN(direct)) return direct
  const baseRaw = lead?.offerRequestedAt || lead?.submittedAt || lead?.createdAt
  const base = baseRaw ? Date.parse(baseRaw) : NaN
  if (Number.isNaN(base)) return null
  const windowMin = Number(lead?.responseDeadlineMinutes) > 0
    ? Number(lead.responseDeadlineMinutes)
    : DEFAULT_RESPONSE_WINDOW_MIN
  return base + windowMin * 60 * 1000
}

/**
 * True once a routed match's response window has lapsed (or the backend already
 * flagged the introduction EXPIRED/DECLINED). Such offers are no longer the
 * attorney's to act on and must drop out of New Matches immediately — even before
 * the offer-expiry sweep re-routes them.
 */
export function isExpiredMatch(lead: any, nowMs: number = Date.now()): boolean {
  const offerStatus = lead?.offerStatus || ''
  if (offerStatus === 'EXPIRED' || offerStatus === 'DECLINED') return true
  if ((lead?.status || '').toLowerCase() === 'submitted') {
    const expiresAt = getOfferExpiryMs(lead)
    return expiresAt != null && expiresAt <= nowMs
  }
  return false
}

/** A still-open match the attorney can act on (submitted and not expired). */
export function isOpenMatch(lead: any, nowMs: number = Date.now()): boolean {
  return (lead?.status || '').toLowerCase() === 'submitted' && !isExpiredMatch(lead, nowMs)
}

/**
 * Statuses where the attorney has taken the case. Client-facing work (document
 * requests, consult scheduling, messaging) is only allowed from here on; a
 * `submitted` lead is still just an offer under review (CP-408, CP-409).
 */
const ACCEPTED_CASE_STATUSES = new Set(['accepted', 'contacted', 'consulted', 'retained'])

export function isAcceptedCase(lead: any): boolean {
  return ACCEPTED_CASE_STATUSES.has(String(lead?.status || '').toLowerCase())
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

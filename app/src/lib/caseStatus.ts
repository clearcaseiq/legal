/**
 * Single source of truth for the user-facing case status funnel, shared by the
 * plaintiff dashboard and the attorney pipeline so both sides show the same
 * vocabulary through consult / retain. Post-retention plaintiff badges derive
 * from Assessment.caseStage (attorney case spine), collapsed into plain-language
 * buckets.
 */

export type CaseStatusKey =
  | 'pending'
  | 'in_review'
  | 'accepted'
  | 'consultation_scheduled'
  | 'consulting_pending'
  | 'retained'
  | 'treatment'
  | 'demand'
  | 'negotiation'
  | 'completed'
  | 'closed'

/** Plaintiff pipeline milestones after consult (collapsed from CaseStage). */
export type PlaintiffPostRetainBucket = 'retained' | 'treatment' | 'demand' | 'negotiation' | 'closed'

export const CASE_STATUS_LABELS: Record<CaseStatusKey, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  accepted: 'Accepted',
  consultation_scheduled: 'Consultation Scheduled',
  consulting_pending: 'Consulting Pending',
  retained: 'Retained',
  treatment: 'Treatment & Records',
  demand: 'Demand',
  negotiation: 'Negotiation',
  completed: 'Completed',
  closed: 'Closed',
}

export const CASE_STATUS_COLORS: Record<CaseStatusKey, string> = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  in_review: 'bg-amber-100 text-amber-800 border-amber-200',
  accepted: 'bg-blue-100 text-blue-800 border-blue-200',
  consultation_scheduled: 'bg-brand-100 text-brand-800 border-brand-200',
  consulting_pending: 'bg-purple-100 text-purple-800 border-purple-200',
  retained: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  treatment: 'bg-teal-100 text-teal-800 border-teal-200',
  demand: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  negotiation: 'bg-violet-100 text-violet-800 border-violet-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-gray-100 text-gray-700 border-gray-200',
}

/** Active litigation statuses worth surfacing as a secondary chip (not none/resolved). */
const ACTIVE_LITIGATION = new Set(['pre_suit', 'filed', 'discovery', 'mediation', 'trial'])

export const LITIGATION_STATUS_LABELS: Record<string, string> = {
  pre_suit: 'Preparing suit',
  filed: 'Suit filed',
  discovery: 'Discovery',
  mediation: 'Mediation',
  trial: 'Trial',
}

export function caseStatusLabel(key: CaseStatusKey): string {
  return CASE_STATUS_LABELS[key] ?? 'Pending'
}

/**
 * i18n key for a status, so React callers can render a localized label via
 * `t(caseStatusLabelKey(key))` without this pure module depending on the
 * language context. The English fallback still lives in CASE_STATUS_LABELS.
 */
export function caseStatusLabelKey(key: CaseStatusKey): string {
  return `plaintiffDashboard.statusLabels.${key}`
}

export function caseStatusColor(key: CaseStatusKey): string {
  return CASE_STATUS_COLORS[key] ?? CASE_STATUS_COLORS.pending
}

export function caseStatusBadge(key: CaseStatusKey): { label: string; color: string } {
  return { label: caseStatusLabel(key), color: caseStatusColor(key) }
}

export function litigationStatusLabel(status?: string | null): string | null {
  const key = String(status || '').toLowerCase()
  if (!ACTIVE_LITIGATION.has(key)) return null
  return LITIGATION_STATUS_LABELS[key] ?? null
}

export function litigationStatusLabelKey(status?: string | null): string | null {
  const key = String(status || '').toLowerCase()
  if (!ACTIVE_LITIGATION.has(key)) return null
  return `plaintiffDashboard.litigationLabels.${key}`
}

/**
 * Collapse attorney Assessment.caseStage into plaintiff-facing buckets.
 */
export function plaintiffCaseStageBucket(caseStage?: string | null): PlaintiffPostRetainBucket | null {
  const s = String(caseStage || '').toUpperCase()
  if (!s) return null
  if (s === 'CLOSED') return 'closed'
  if (s === 'NEGOTIATION' || s === 'SETTLEMENT_PENDING' || s === 'DISBURSEMENT') return 'negotiation'
  if (s === 'DEMAND_PREPARATION' || s === 'DEMAND_SENT') return 'demand'
  if (s === 'TREATMENT' || s === 'RECORD_COLLECTION') return 'treatment'
  if (s === 'OPENING' || s === 'INVESTIGATION') return 'retained'
  return 'retained'
}

export function isPlaintiffRetained(routing: {
  lifecycleState?: string | null
  leadStatus?: string | null
  caseStage?: string | null
} | null | undefined): boolean {
  const lifecycle = routing?.lifecycleState || ''
  const leadStatus = routing?.leadStatus || ''
  if (lifecycle === 'engaged' || lifecycle === 'retained') return true
  if (leadStatus === 'retained') return true
  // Never treat caseStage alone as retained. Routing can leave a stale
  // caseStage (e.g. TREATMENT after an evidence upload) on a not-yet-accepted
  // matter; post-retain pipeline badges must wait for real retention.
  return false
}

const isPast = (value?: string | Date | null): boolean => {
  if (!value) return false
  const t = new Date(value).getTime()
  return Number.isFinite(t) && t < Date.now()
}

/**
 * Attorney/lead perspective. `consultScheduledAt` (when known, e.g. from contact
 * history) lets us distinguish an upcoming consult ("Consultation Scheduled")
 * from a passed one awaiting outcome ("Consulting Pending").
 */
export function getAttorneyCaseStatusKey(
  lead: { status?: string | null; lifecycleState?: string | null } | null | undefined,
  opts?: { consultScheduledAt?: string | Date | null },
): CaseStatusKey {
  const status = lead?.status || ''
  const lifecycle = lead?.lifecycleState || ''

  if (status === 'rejected' || lifecycle === 'closed') return 'closed'
  if (status === 'retained' || lifecycle === 'engaged') return 'completed'
  if (status === 'consulted' || lifecycle === 'consultation_scheduled') {
    return isPast(opts?.consultScheduledAt) ? 'consulting_pending' : 'consultation_scheduled'
  }
  if (status === 'contacted' || lifecycle === 'attorney_matched') return 'accepted'
  if (status === 'submitted' || !status || lifecycle === 'attorney_review' || lifecycle === 'manual_review_needed') {
    return 'in_review'
  }
  return 'pending'
}

/**
 * Plaintiff perspective, derived from the routing-status payload returned by
 * `GET /v1/case-routing/:assessmentId/status` (plus optional caseStage).
 */
export function getPlaintiffCaseStatusKey(routing: {
  lifecycleState?: string | null
  leadStatus?: string | null
  caseStage?: string | null
  attorneyMatched?: unknown
  upcomingAppointment?: { scheduledAt?: string | Date } | unknown
  reviewingCount?: number
  submittedForReview?: boolean
} | null | undefined): CaseStatusKey {
  const lifecycle = routing?.lifecycleState || ''
  const matched = !!routing?.attorneyMatched
  const appt = routing?.upcomingAppointment as { scheduledAt?: string | Date } | undefined
  // Only an active upcoming appointment should show "Consultation Scheduled".
  // After cancel, lifecycle may briefly lag; without an appt, fall through to Accepted.
  const hasUpcomingConsult = !!appt
  const retained = isPlaintiffRetained(routing)
  const stageBucket = plaintiffCaseStageBucket(routing?.caseStage)

  if (lifecycle === 'closed' || (retained && stageBucket === 'closed')) return 'closed'

  if (retained) {
    if (stageBucket === 'negotiation') return 'negotiation'
    if (stageBucket === 'demand') return 'demand'
    if (stageBucket === 'treatment') return 'treatment'
    return 'retained'
  }

  if (hasUpcomingConsult) {
    return isPast(appt?.scheduledAt) ? 'consulting_pending' : 'consultation_scheduled'
  }
  if (matched || lifecycle === 'attorney_matched' || lifecycle === 'consultation_scheduled') return 'accepted'
  if (
    lifecycle === 'attorney_review' ||
    lifecycle === 'manual_review_needed' ||
    (routing?.reviewingCount ?? 0) > 0
  ) {
    return 'in_review'
  }
  if (lifecycle === 'plaintiff_info_requested' || lifecycle === 'needs_more_info' || lifecycle === 'not_routable_yet') {
    return 'in_review'
  }
  if (routing?.submittedForReview) return 'in_review'
  return 'pending'
}

/**
 * Index into the expanded CaseProgressPipeline (0–9).
 * - `currentIdx` is the amber "live" step, or -1 when pre-retain is done but
 *   the case is not yet retained (consult complete; post-retain upcoming).
 * - `completeThrough` is how many leading steps are green.
 */
export function getPlaintiffPipelineProgress(input: {
  submittedForReview: boolean
  attorneyMatched: boolean
  hasScheduledConsult: boolean
  retained: boolean
  caseStage?: string | null
}): { currentIdx: number; completeThrough: number } {
  const bucket = plaintiffCaseStageBucket(input.caseStage)
  // Post-retain stages only apply once the case is actually retained.
  // A stale caseStage (e.g. TREATMENT written while still in attorney review)
  // must not advance the pipeline.
  if (input.retained && bucket === 'closed') return { currentIdx: -1, completeThrough: 10 }
  if (input.retained) {
    if (bucket === 'negotiation') return { currentIdx: 8, completeThrough: 8 }
    if (bucket === 'demand') return { currentIdx: 7, completeThrough: 7 }
    if (bucket === 'treatment') return { currentIdx: 6, completeThrough: 6 }
    return { currentIdx: 5, completeThrough: 5 } // Retained
  }
  // Consult booked/past but not retained: first 5 green, no amber post-retain step.
  if (input.hasScheduledConsult) return { currentIdx: -1, completeThrough: 5 }
  if (input.attorneyMatched) return { currentIdx: 4, completeThrough: 4 }
  if (input.submittedForReview) return { currentIdx: 2, completeThrough: 2 }
  return { currentIdx: 0, completeThrough: 0 }
}

/** @deprecated Prefer getPlaintiffPipelineProgress for complete/current split. */
export function getPlaintiffPipelineIndex(input: {
  submittedForReview: boolean
  attorneyMatched: boolean
  hasScheduledConsult: boolean
  retained: boolean
  caseStage?: string | null
}): number {
  const { currentIdx, completeThrough } = getPlaintiffPipelineProgress(input)
  return currentIdx >= 0 ? currentIdx : completeThrough
}

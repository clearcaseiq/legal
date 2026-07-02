/**
 * Single source of truth for the user-facing case status funnel, shared by the
 * plaintiff dashboard and the attorney pipeline so both sides show the same
 * seven-stage vocabulary.
 *
 * Underlying data has no single status field, so we derive the stage from the
 * LeadSubmission.status + lifecycleState (attorney side) or the routing-status
 * payload (plaintiff side).
 */

export type CaseStatusKey =
  | 'pending'
  | 'in_review'
  | 'accepted'
  | 'consultation_scheduled'
  | 'consulting_pending'
  | 'completed'
  | 'closed'

export const CASE_STATUS_LABELS: Record<CaseStatusKey, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  accepted: 'Accepted',
  consultation_scheduled: 'Consultation Scheduled',
  consulting_pending: 'Consulting Pending',
  completed: 'Completed',
  closed: 'Closed',
}

export const CASE_STATUS_COLORS: Record<CaseStatusKey, string> = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  in_review: 'bg-amber-100 text-amber-800 border-amber-200',
  accepted: 'bg-blue-100 text-blue-800 border-blue-200',
  consultation_scheduled: 'bg-brand-100 text-brand-800 border-brand-200',
  consulting_pending: 'bg-purple-100 text-purple-800 border-purple-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-gray-100 text-gray-700 border-gray-200',
}

export function caseStatusLabel(key: CaseStatusKey): string {
  return CASE_STATUS_LABELS[key] ?? 'Pending'
}

export function caseStatusColor(key: CaseStatusKey): string {
  return CASE_STATUS_COLORS[key] ?? CASE_STATUS_COLORS.pending
}

export function caseStatusBadge(key: CaseStatusKey): { label: string; color: string } {
  return { label: caseStatusLabel(key), color: caseStatusColor(key) }
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
 * `GET /v1/case-routing/:assessmentId/status`.
 */
export function getPlaintiffCaseStatusKey(routing: {
  lifecycleState?: string | null
  attorneyMatched?: unknown
  upcomingAppointment?: { scheduledAt?: string | Date } | unknown
  reviewingCount?: number
  submittedForReview?: boolean
} | null | undefined): CaseStatusKey {
  const lifecycle = routing?.lifecycleState || ''
  const matched = !!routing?.attorneyMatched
  const appt = routing?.upcomingAppointment as { scheduledAt?: string | Date } | undefined
  const hasConsult = !!appt || lifecycle === 'consultation_scheduled'

  if (lifecycle === 'engaged' || lifecycle === 'retained' || lifecycle === 'closed') return 'completed'
  if (hasConsult) {
    return isPast(appt?.scheduledAt) ? 'consulting_pending' : 'consultation_scheduled'
  }
  if (matched || lifecycle === 'attorney_matched') return 'accepted'
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

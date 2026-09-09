/**
 * Case Assistance — the human-assisted intake layer between the consumer
 * assessment and attorney routing.
 *
 * This vocabulary is deliberately narrow. The schema already carries three
 * status vocabularies plus the derived `CASE_FLOW_STAGES`
 * (`Assessment.status`, `Assessment.caseStage`, `LeadSubmission.status` and
 * `LeadSubmission.lifecycleState`), so a fourth is only justified for states
 * nothing else models: the period after a report generates and before the
 * plaintiff submits for attorney review.
 *
 * Everything downstream of that is READ from the existing fields rather than
 * copied here — see `deriveAssistancePhase`. A specialist status of
 * `ready_for_attorney_review` is the last thing this module owns; once a
 * `LeadSubmission` exists, its `lifecycleState` is the truth about routing and
 * matching, and `CLOSED_STATUSES` is the truth about closure.
 */
import { CLOSED_STATUSES } from './case-stage'

export const ASSISTANCE_STATUSES = [
  /** Plaintiff submitted the case; no specialist has connected yet. */
  'new_submission',
  /** A specialist has reached the plaintiff and is working the case. */
  'in_progress',
  /** Specialist has asked the plaintiff to upload something. */
  'document_requested',
  /** The plaintiff has uploaded; the specialist still has to review what came in. */
  'document_submitted',
  /** Documents are in and reviewed; the case is ready to go to attorneys. */
  'ready_for_attorney_review',
  /** Plaintiff does not want to take the case further. Terminal. */
  'denied',
  /** Plaintiff has not accepted or attended the call — still ours to chase. */
  'call_not_accepted',
] as const

export type AssistanceStatus = (typeof ASSISTANCE_STATUSES)[number]

export const ASSISTANCE_STATUS_LABELS: Record<AssistanceStatus, string> = {
  new_submission: 'New',
  in_progress: 'In Progress',
  document_requested: 'Document Requested',
  document_submitted: 'Document Submitted',
  ready_for_attorney_review: 'Ready for Attorney',
  denied: 'Denied',
  call_not_accepted: 'Call not Accepted',
}

/**
 * Statuses that still need specialist work — the queue's working set.
 *
 * `call_not_accepted` belongs here: an unanswered call is a case to chase, not
 * a finished one. `denied` and `ready_for_attorney_review` are both ends of the
 * line for this queue, for opposite reasons.
 */
export const ACTIVE_ASSISTANCE_STATUSES: AssistanceStatus[] = [
  'new_submission',
  'in_progress',
  'document_requested',
  'document_submitted',
  'call_not_accepted',
]

/**
 * Statuses where the next move belongs to the plaintiff, not the specialist.
 *
 * `document_submitted` is deliberately absent: once the upload lands the ball is
 * back with the specialist to review it, and counting it as waiting would park
 * a case that is actually queued for someone here.
 */
export const WAITING_ASSISTANCE_STATUSES: AssistanceStatus[] = ['document_requested']

/** Statuses where nobody has spoken to the plaintiff yet, so a call is the next move. */
export const UNCONTACTED_ASSISTANCE_STATUSES: AssistanceStatus[] = [
  'new_submission',
  'call_not_accepted',
]

/** Statuses that end the case here rather than passing it on. */
export const CLOSED_ASSISTANCE_STATUSES: AssistanceStatus[] = ['denied']

export function isAssistanceStatus(value: unknown): value is AssistanceStatus {
  return typeof value === 'string' && (ASSISTANCE_STATUSES as readonly string[]).includes(value)
}

export const ASSISTANCE_PRIORITIES = ['low', 'normal', 'high'] as const
export type AssistancePriority = (typeof ASSISTANCE_PRIORITIES)[number]

/**
 * How long a specialist has to complete first review after assignment. Drives
 * `reviewDueAt` and the queue's overdue highlighting.
 */
export const ASSISTANCE_REVIEW_SLA_HOURS = 4

export function reviewDueFrom(assignedAt: Date): Date {
  return new Date(assignedAt.getTime() + ASSISTANCE_REVIEW_SLA_HOURS * 60 * 60 * 1000)
}

/**
 * Where the case sits overall, combining the specialist phase this module owns
 * with the downstream phases owned by other fields.
 *
 * `assistance` is the only phase a specialist can set. The rest are derived, so
 * a case that has moved on cannot show a stale specialist status as its
 * headline state.
 */
export type AssistancePhase = 'assistance' | 'routing' | 'engaged' | 'closed'

export const ASSISTANCE_PHASE_LABELS: Record<AssistancePhase, string> = {
  assistance: 'Case assistance',
  routing: 'With attorneys',
  engaged: 'Represented',
  closed: 'Closed',
}

/** `LeadSubmission.lifecycleState` values that mean an attorney has taken the case. */
const ENGAGED_LIFECYCLE_STATES = new Set(['attorney_matched', 'consultation_scheduled', 'engaged'])

/**
 * Resolve the phase from existing fields, newest signal winning.
 *
 * Pass whatever is loaded; every argument is optional so the queue can resolve a
 * phase without joining tables it does not otherwise need.
 */
export function deriveAssistancePhase(input: {
  assessmentStatus?: string | null
  lifecycleState?: string | null
  hasLeadSubmission?: boolean
  assistanceStatus?: string | null
}): AssistancePhase {
  const assessmentStatus = String(input.assessmentStatus || '').toLowerCase()
  if (CLOSED_STATUSES.has(assessmentStatus)) return 'closed'

  // A plaintiff who declines to go on ends the case here, so the headline must
  // not keep reading as live specialist work.
  if ((CLOSED_ASSISTANCE_STATUSES as string[]).includes(String(input.assistanceStatus || ''))) {
    return 'closed'
  }

  const lifecycleState = String(input.lifecycleState || '').toLowerCase()
  if (lifecycleState === 'closed') return 'closed'
  if (ENGAGED_LIFECYCLE_STATES.has(lifecycleState)) return 'engaged'
  if (lifecycleState) return 'routing'

  // A LeadSubmission with no lifecycleState still means the plaintiff submitted
  // for attorney review, which is past the point specialists own.
  return input.hasLeadSubmission ? 'routing' : 'assistance'
}

/**
 * True when the specialist queue still owns this case. Cases past this point
 * stay visible for history but are not work items.
 */
export function isAssistanceOwned(input: Parameters<typeof deriveAssistancePhase>[0]): boolean {
  return deriveAssistancePhase(input) === 'assistance'
}

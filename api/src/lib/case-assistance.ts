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
  /** Report generated, nobody has looked at it yet. */
  'new_submission',
  /** Assigned and awaiting the specialist's first read of the case. */
  'needs_review',
  /** Read, and the plaintiff needs a call. */
  'needs_contact',
  /** Specialist has made contact and is actively working it. */
  'in_progress',
  /** Waiting on the plaintiff to answer questions or call back. */
  'waiting_on_plaintiff',
  /** Waiting on documents the plaintiff was asked to upload. */
  'waiting_on_documents',
  /** Specialist is done; the case is ready to go to attorneys. */
  'ready_for_attorney_review',
] as const

export type AssistanceStatus = (typeof ASSISTANCE_STATUSES)[number]

export const ASSISTANCE_STATUS_LABELS: Record<AssistanceStatus, string> = {
  new_submission: 'New submission',
  needs_review: 'Needs review',
  needs_contact: 'Needs contact',
  in_progress: 'In progress',
  waiting_on_plaintiff: 'Waiting on plaintiff',
  waiting_on_documents: 'Waiting on documents',
  ready_for_attorney_review: 'Ready for attorney review',
}

/** Statuses that still need specialist work — the queue's working set. */
export const ACTIVE_ASSISTANCE_STATUSES: AssistanceStatus[] = [
  'new_submission',
  'needs_review',
  'needs_contact',
  'in_progress',
  'waiting_on_plaintiff',
  'waiting_on_documents',
]

/** Statuses where the next move belongs to the plaintiff, not the specialist. */
export const WAITING_ASSISTANCE_STATUSES: AssistanceStatus[] = [
  'waiting_on_plaintiff',
  'waiting_on_documents',
]

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
}): AssistancePhase {
  const assessmentStatus = String(input.assessmentStatus || '').toLowerCase()
  if (CLOSED_STATUSES.has(assessmentStatus)) return 'closed'

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

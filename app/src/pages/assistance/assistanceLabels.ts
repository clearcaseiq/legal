import type { AssistancePhase, AssistanceStatus } from '../../lib/api'
import type { BadgeTone } from '../../features/shared/ui'

/**
 * Display vocabulary for Case Assistance, shared by the queue and the workspace
 * so a status never reads one way in the list and another on the case.
 */
export const ASSISTANCE_STATUS_LABELS: Record<AssistanceStatus, string> = {
  new_submission: 'New submission',
  needs_review: 'Needs review',
  needs_contact: 'Needs contact',
  in_progress: 'In progress',
  waiting_on_plaintiff: 'Waiting on claimant',
  waiting_on_documents: 'Waiting on documents',
  ready_for_attorney_review: 'Ready for attorney review',
}

export const ASSISTANCE_STATUS_ORDER: AssistanceStatus[] = [
  'new_submission',
  'needs_review',
  'needs_contact',
  'in_progress',
  'waiting_on_plaintiff',
  'waiting_on_documents',
  'ready_for_attorney_review',
]

export const ASSISTANCE_STATUS_TONES: Record<AssistanceStatus, BadgeTone> = {
  new_submission: 'brand',
  needs_review: 'blue',
  needs_contact: 'warning',
  in_progress: 'blue',
  // Waiting is neutral rather than a warning: the ball is with the claimant, so
  // it is not something the specialist is behind on.
  waiting_on_plaintiff: 'neutral',
  waiting_on_documents: 'neutral',
  ready_for_attorney_review: 'success',
}

export const ASSISTANCE_PHASE_LABELS: Record<AssistancePhase, string> = {
  assistance: 'Case assistance',
  routing: 'With attorneys',
  engaged: 'Represented',
  closed: 'Closed',
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
}

export const CHANNEL_LABELS: Record<string, string> = {
  call: 'Call',
  sms: 'Text',
  email: 'Email',
  in_app: 'In-app',
  other: 'Other',
}

/**
 * Outcomes offered when logging a call, in the order they actually happen.
 * `sent` / `received` are omitted because those are set by the email and
 * document-request actions rather than typed in.
 */
export const CALL_OUTCOMES = [
  { value: 'reached', label: 'Reached them' },
  { value: 'voicemail', label: 'Left voicemail' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'callback_requested', label: 'They asked to be called back' },
  { value: 'wrong_number', label: 'Wrong number' },
]

export const OUTCOME_LABELS: Record<string, string> = {
  ...Object.fromEntries(CALL_OUTCOMES.map((outcome) => [outcome.value, outcome.label])),
  sent: 'Sent',
  received: 'Received',
}

/** Compact relative time, e.g. "2h ago". Empty input reads as "never". */
export function timeAgo(value: string | null | undefined): string {
  if (!value) return 'Never'
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return 'Never'
  const minutes = Math.round((Date.now() - then) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'Yesterday' : `${days}d ago`
}

/** How long until an SLA is due, or how far past it. */
export function dueLabel(value: string | null | undefined): string {
  if (!value) return '—'
  const due = new Date(value).getTime()
  if (Number.isNaN(due)) return '—'
  const minutes = Math.round((due - Date.now()) / 60000)
  if (minutes < 0) return `${timeAgo(value).replace(' ago', '')} overdue`
  if (minutes < 60) return `in ${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `in ${hours}h`
  return `in ${Math.round(hours / 24)}d`
}

export function readinessTone(score: number): BadgeTone {
  if (score >= 75) return 'success'
  if (score >= 50) return 'warning'
  return 'danger'
}

/** Title-cased claim type, e.g. "motor_vehicle" -> "Motor Vehicle". */
export function humanize(value: string | null | undefined): string {
  if (!value) return '—'
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

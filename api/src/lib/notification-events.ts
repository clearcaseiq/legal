/**
 * Phase 2: Centralized notification event system
 * Event types and template keys for plaintiff, attorney, and system notifications.
 */

export const PLAINTIFF_EVENTS = {
  account_created: 'plaintiff.account_created',
  assessment_started: 'plaintiff.assessment_started',
  assessment_abandoned: 'plaintiff.assessment_abandoned',
  assessment_completed: 'plaintiff.assessment_completed',
  case_submitted: 'plaintiff.case_submitted',
  doc_requested: 'plaintiff.doc_requested',
  doc_uploaded: 'plaintiff.doc_uploaded',
  case_score_updated: 'plaintiff.case_score_updated',
  attorney_match_found: 'plaintiff.attorney_match_found',
  consultation_ready: 'plaintiff.consultation_ready',
  attorneys_reviewing: 'plaintiff.attorneys_reviewing',
  more_info_requested: 'plaintiff.more_info_requested',
  no_attorney_response: 'plaintiff.no_attorney_response',
  case_closed: 'plaintiff.case_closed',
} as const

export const ATTORNEY_EVENTS = {
  case_routed: 'attorney.case_routed',
  case_reminder: 'attorney.case_reminder',
  doc_uploaded: 'attorney.doc_uploaded',
  case_expiring: 'attorney.case_expiring',
  new_message: 'attorney.new_message',
  wave2_route: 'attorney.wave2_route',
  plaintiff_replied: 'attorney.plaintiff_replied',
} as const

export const SUPPORT_EVENTS = {
  ticket_created: 'support.ticket_created',
  ticket_updated: 'support.ticket_updated',
  ticket_resolved: 'support.ticket_resolved',
  notification_failed: 'notification.failed',
  notification_retried: 'notification.retried',
} as const

export type PlaintiffEventType = (typeof PLAINTIFF_EVENTS)[keyof typeof PLAINTIFF_EVENTS]
export type AttorneyEventType = (typeof ATTORNEY_EVENTS)[keyof typeof ATTORNEY_EVENTS]
export type SupportEventType = (typeof SUPPORT_EVENTS)[keyof typeof SUPPORT_EVENTS]
export type EventType = PlaintiffEventType | AttorneyEventType | SupportEventType

export const CHANNELS = ['email', 'sms', 'in_app', 'push'] as const
export type Channel = (typeof CHANNELS)[number]

export const NOTIFICATION_STATUS = ['pending', 'sent', 'delivered', 'failed', 'suppressed'] as const
export type NotificationStatus = (typeof NOTIFICATION_STATUS)[number]

export interface CreateNotificationEventInput {
  userId?: string
  attorneyId?: string
  assessmentId?: string
  role: 'plaintiff' | 'attorney' | 'admin'
  channel: Channel
  eventType: string
  templateKey?: string
  subject?: string
  body?: string
  payload?: Record<string, unknown>
  recipient?: string
}

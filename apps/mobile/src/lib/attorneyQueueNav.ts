import { router } from 'expo-router'
import { zonedWallClock } from './calendar'

/** Matches server `AttorneyQueueItem.actionType` */
export type QueueActionType =
  | 'request_documents'
  | 'document_request'
  | 'documents'
  | 'send_message'
  | 'reply_message'
  | 'schedule_consult'
  | 'consult_reminder'
  | 'open_demand'
  | 'open_negotiation'
  | 'open_health'
  | 'case_health'
  | 'review_documents'
  | 'review_evidence'
  | 'review_task'
  | 'task_due'
  | 'new_lead'
  | 'open_lead'

export function navigateAttorneyQueueItem(params: { actionType: QueueActionType; leadId: string }) {
  const { actionType, leadId } = params
  switch (actionType) {
    case 'send_message':
    case 'reply_message':
      router.push('/(app)/(tabs)/messages')
      return
    case 'review_task':
    case 'task_due':
      router.push('/(app)/tasks')
      return
    case 'request_documents':
    case 'document_request':
    case 'documents':
    case 'review_documents':
    case 'review_evidence':
      router.push('/(app)/document-requests')
      return
    case 'schedule_consult':
    case 'consult_reminder':
      router.push('/(app)/(tabs)/calendar')
      return
    case 'open_demand':
    case 'open_negotiation':
    case 'open_health':
    case 'case_health':
    case 'new_lead':
    case 'open_lead':
    default:
      router.push(`/(app)/lead/${leadId}`)
  }
}

/**
 * Whether `iso` falls on the same calendar day as `ref` — in `timeZone` when one
 * is given, otherwise the device's. "Today" has to mean the attorney's business
 * day: read against a device in another zone, an evening consult counted as
 * tomorrow and dropped off the today list (CP-425).
 */
export function isSameCalendarDay(iso: string, timeZone?: string | null, ref: Date = new Date()) {
  const d = zonedWallClock(iso, timeZone)
  if (Number.isNaN(d.getTime())) return false
  const refLocal = zonedWallClock(ref, timeZone)
  return (
    d.getFullYear() === refLocal.getFullYear() &&
    d.getMonth() === refLocal.getMonth() &&
    d.getDate() === refLocal.getDate()
  )
}

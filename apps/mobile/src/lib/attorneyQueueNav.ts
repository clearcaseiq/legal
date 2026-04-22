import { router } from 'expo-router'

/** Matches server `AttorneyQueueItem.actionType` */
export type QueueActionType =
  | 'request_documents'
  | 'send_message'
  | 'schedule_consult'
  | 'open_demand'
  | 'open_negotiation'
  | 'review_task'
  | 'open_lead'

export function navigateAttorneyQueueItem(params: { actionType: QueueActionType; leadId: string }) {
  const { actionType, leadId } = params
  switch (actionType) {
    case 'send_message':
      router.push('/(app)/(tabs)/messages')
      return
    case 'review_task':
      router.push('/(app)/tasks')
      return
    case 'request_documents':
      router.push('/(app)/document-requests')
      return
    case 'schedule_consult':
    case 'open_demand':
    case 'open_negotiation':
    case 'open_lead':
    default:
      router.push(`/(app)/lead/${leadId}`)
  }
}

export function isSameCalendarDay(iso: string, ref: Date = new Date()) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  )
}

import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { navigateAttorneyQueueItem, type QueueActionType } from '../lib/attorneyQueueNav'
import { useAttorneyDashboardData } from '../contexts/AttorneyDashboardContext'

/**
 * Handles notification taps for deep linking (must render under the authenticated app stack).
 */
export function PushNavigationHandler() {
  const router = useRouter()
  const { refresh } = useAttorneyDashboardData()

  useEffect(() => {
    const refreshAfterNavigation = () => {
      void refresh({ force: true, silent: true })
    }

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined
      if (!data?.type) return
      try {
        if (data.type === 'chat_message' && data.chatRoomId) {
          router.push(`/(app)/chat/${data.chatRoomId}`)
          refreshAfterNavigation()
          return
        }
        if (data.type === 'case_match' && data.leadId) {
          router.push(`/(app)/lead/${data.leadId}`)
          refreshAfterNavigation()
          return
        }
        if (['new_lead', 'lead_expiring', 'lead_assigned'].includes(data.type) && data.leadId) {
          router.push(`/(app)/lead/${data.leadId}`)
          refreshAfterNavigation()
          return
        }
        if (data.type === 'consult_reminder' && data.leadId) {
          router.push(`/(app)/lead/${data.leadId}`)
          refreshAfterNavigation()
          return
        }
        if (['document_request', 'document_uploaded', 'review_documents'].includes(data.type)) {
          if (data.leadId) {
            navigateAttorneyQueueItem({ actionType: 'request_documents', leadId: data.leadId })
            refreshAfterNavigation()
            return
          }
          router.push('/(app)/document-requests')
          refreshAfterNavigation()
          return
        }
        if (['task_due', 'task_created', 'blocker_task'].includes(data.type)) {
          if (data.leadId) {
            navigateAttorneyQueueItem({ actionType: 'review_task', leadId: data.leadId })
            refreshAfterNavigation()
            return
          }
          router.push('/(app)/tasks')
          refreshAfterNavigation()
          return
        }
        if (data.actionType && data.leadId) {
          navigateAttorneyQueueItem({
            actionType: data.actionType as QueueActionType,
            leadId: data.leadId,
          })
          refreshAfterNavigation()
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[PushNavigationHandler] Failed to handle notification response', error)
        }
      }
    }

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handleResponse(response)
      })
      .catch(() => {})

    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse)
    return () => sub.remove()
  }, [refresh, router])

  return null
}

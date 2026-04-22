import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'

/**
 * Handles notification taps for deep linking (must render under the authenticated app stack).
 */
export function PushNavigationHandler() {
  const router = useRouter()

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined
      if (!data?.type) return
      try {
        if (data.type === 'chat_message' && data.chatRoomId) {
          router.push(`/(app)/chat/${data.chatRoomId}`)
          return
        }
        if (data.type === 'case_match' && data.leadId) {
          router.push(`/(app)/lead/${data.leadId}`)
          return
        }
        if (data.type === 'consult_reminder' && data.leadId) {
          router.push(`/(app)/lead/${data.leadId}`)
        }
      } catch {
        /* no-op */
      }
    }

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handleResponse(response)
      })
      .catch(() => {})

    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse)
    return () => sub.remove()
  }, [router])

  return null
}

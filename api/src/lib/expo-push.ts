import { logger } from './logger'

/**
 * Send Expo push notifications (Expo Push API).
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */
export async function sendExpoPushNotifications(
  expoPushTokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<void> {
  const tokens = [...new Set(expoPushTokens.filter(Boolean))]
  if (tokens.length === 0) return

  const chunkSize = 99
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize)
    const messages = chunk.map((to) => ({
      to,
      sound: 'default' as const,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    }))
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      })
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        logger.warn('Expo push HTTP error', { status: res.status, body: t.slice(0, 200) })
      }
    } catch (e: unknown) {
      logger.warn('Expo push request failed', { error: e instanceof Error ? e.message : String(e) })
    }
  }
}

import { prisma } from './prisma'
import { logger } from './logger'
import { sendExpoPushNotifications } from './expo-push'

/**
 * Send a push to all devices registered for the attorney's user account (same email as User).
 */
export async function notifyAttorneyByUserEmail(
  email: string | null | undefined,
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<void> {
  if (!email?.trim()) return
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim() },
      select: { id: true },
    })
    if (!user) return
    const devices = await prisma.attorneyPushDevice.findMany({
      where: { userId: user.id },
      select: { expoPushToken: true },
    })
    const tokens = devices.map((d) => d.expoPushToken)
    if (!tokens.length) return
    await sendExpoPushNotifications(tokens, payload)
  } catch (e: unknown) {
    logger.warn('notifyAttorneyByUserEmail failed', { error: e instanceof Error ? e.message : String(e) })
  }
}

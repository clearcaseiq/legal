import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { registerAttorneyPushToken, unregisterAttorneyPushToken } from './api'

async function waitForStoredPushToken(maxMs = 8_000): Promise<string | null> {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    const token = await SecureStore.getItemAsync('expo_push_token')
    if (token) return token
    await new Promise((r) => setTimeout(r, 400))
  }
  return SecureStore.getItemAsync('expo_push_token')
}

/**
 * Associate the Expo push token with the logged-in user. Never throws — push is optional.
 */
export async function syncPushTokenAfterLogin(): Promise<void> {
  try {
    const token = await waitForStoredPushToken()
    if (!token) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(
          '[ClearCaseIQ] No Expo push token yet (permissions, projectId, or physical device).'
        )
      }
      return
    }
    await registerAttorneyPushToken(token, Platform.OS)
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { error?: string; detail?: string; code?: string } } }
    const detail = ax?.response?.data?.detail || ax?.response?.data?.error
    const code = ax?.response?.data?.code
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[ClearCaseIQ] Push registration failed (sign-in still OK):', detail || err)
      if (code === 'MIGRATION_REQUIRED') {
        console.warn(
          '[ClearCaseIQ] API database missing attorney_push_devices — run: cd api && pnpm exec prisma migrate deploy'
        )
      }
    }
  }
}

export async function clearPushTokenOnLogout(): Promise<void> {
  const token = await SecureStore.getItemAsync('expo_push_token')
  if (token) {
    try {
      await unregisterAttorneyPushToken(token)
    } catch {
      /* no-op */
    }
  }
}

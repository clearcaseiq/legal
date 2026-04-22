import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { AppState, Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { registerAttorneyPushToken } from '../lib/api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

type NotificationContextType = {
  expoPushToken: string | null
  permissionStatus: Notifications.PermissionStatus | 'unavailable'
  setupIssue: string | null
  isSettingUp: boolean
  refreshPushSetup: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: null,
  permissionStatus: 'unavailable',
  setupIssue: null,
  isSettingUp: false,
  refreshPushSetup: async () => {},
})

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | 'unavailable'>('unavailable')
  const [setupIssue, setSetupIssue] = useState<string | null>(null)
  const [isSettingUp, setIsSettingUp] = useState(true)
  const mountedRef = useRef(true)

  const setupPush = useCallback(async (options?: { requestPermission?: boolean }) => {
    const requestPermission = options?.requestPermission ?? true
    setIsSettingUp(true)
    setSetupIssue(null)
    try {
      if (!Device.isDevice) {
        if (!mountedRef.current) return
        setPermissionStatus('unavailable')
        setExpoPushToken(null)
        setSetupIssue('Push notifications require a physical device. Expo Go simulators can still browse the app.')
        return
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1e3a5f',
        })
        await Notifications.setNotificationChannelAsync('consult', {
          name: 'Consultation reminders',
          importance: Notifications.AndroidImportance.HIGH,
        })
      }

      const { status: existing } = await Notifications.getPermissionsAsync()
      let finalStatus = existing
      if (requestPermission && existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }
      if (!mountedRef.current) return
      setPermissionStatus(finalStatus)
      if (finalStatus !== 'granted') {
        setExpoPushToken(null)
        setSetupIssue('Notifications are disabled. Enable them in system settings to receive case and consult alerts.')
        return
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
      if (!projectId) {
        setExpoPushToken(null)
        setSetupIssue('Push setup is incomplete because the Expo projectId is missing.')
        if (__DEV__) {
          console.warn(
            'Push: projectId not found. Run `eas init` and rebuild, or set extra.eas.projectId in app config.'
          )
        }
        return
      }

      const token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data
      if (!mountedRef.current) return
      setExpoPushToken(token)
      setSetupIssue(null)
      await SecureStore.setItemAsync('expo_push_token', token)

      const auth = await SecureStore.getItemAsync('auth_token')
      const sessionRole = await SecureStore.getItemAsync('session_role')
      if (auth && sessionRole === 'attorney') {
        try {
          await registerAttorneyPushToken(token, Platform.OS)
        } catch (regErr) {
          if (__DEV__) {
            console.warn('[ClearCaseIQ] Server push registration failed:', regErr)
          }
        }
      }
    } catch (e) {
      if (mountedRef.current) {
        setExpoPushToken(null)
        setSetupIssue('Push notifications are unavailable on this build right now.')
      }
      if (__DEV__) {
        console.warn('Push notifications unavailable:', (e as Error).message)
      }
    } finally {
      if (mountedRef.current) {
        setIsSettingUp(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    void setupPush({ requestPermission: true })

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void setupPush({ requestPermission: false })
      }
    })

    return () => {
      mountedRef.current = false
      subscription.remove()
    }
  }, [setupPush])

  return (
    <NotificationContext.Provider value={{ expoPushToken, permissionStatus, setupIssue, isSettingUp, refreshPushSetup: setupPush }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}

/** Call after successful attorney login to associate the Expo token with the user on the server. */

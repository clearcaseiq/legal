import React, { createContext, useContext, useEffect, useState } from 'react'
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import {
  api,
  getApiErrorMessage,
  loginPlaintiff,
  loginUser,
  logout as apiLogout,
  setUnauthorizedHandler,
  updateProfile,
} from '../lib/api'
import { normalizeMobileLanguage, type MobileLanguage } from '../i18n/messages'
import { clearPushTokenOnLogout, syncPushTokenAfterLogin } from '../lib/push-sync'
import { IS_PLAINTIFF_APP } from '../lib/appVariant'

type User = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  avatar?: string | null
  role?: 'attorney' | 'plaintiff'
  preferredLanguage?: string | null
}

async function persistPreferredLanguage(value?: string | null) {
  const lang = normalizeMobileLanguage(value)
  await SecureStore.setItemAsync('preferred_language', lang)
  return lang
}

type BiometricAuthResult = 'authenticated' | 'cancelled' | 'missing_session' | 'restore_failed'

type AuthContextType = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  startupError: string | null
  preferredLanguage: MobileLanguage
  setPreferredLanguage: (language: MobileLanguage) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  retryAuthCheck: () => Promise<void>
  authenticateWithBiometrics: () => Promise<BiometricAuthResult>
  hasBiometrics: boolean
  updateUser: (patch: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasBiometrics, setHasBiometrics] = useState(false)
  const [startupError, setStartupError] = useState<string | null>(null)
  const [preferredLanguage, setPreferredLanguageState] = useState<MobileLanguage>('en')

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setIsLoading(false)
      setStartupError('Your session expired. Please sign in again.')
    })
    void SecureStore.getItemAsync('preferred_language').then((stored) => {
      if (stored) setPreferredLanguageState(normalizeMobileLanguage(stored))
    })
    checkAuth()
    LocalAuthentication.getEnrolledLevelAsync().then((level) => {
      setHasBiometrics(level !== LocalAuthentication.SecurityLevel.NONE)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  async function restoreSessionFromStoredToken(): Promise<'authenticated' | 'missing_session' | 'restore_failed'> {
    const token = await SecureStore.getItemAsync('auth_token')
    if (!token) {
      setUser(null)
      return 'missing_session'
    }

    try {
      const { data } = await api.get('/v1/auth/me')
      const sessionRole = (await SecureStore.getItemAsync('session_role')) as User['role'] | null
      const resolvedRole = sessionRole || (IS_PLAINTIFF_APP ? 'plaintiff' : 'attorney')
      setUser({ ...data, role: resolvedRole })
      const lang = await persistPreferredLanguage(data?.preferredLanguage)
      setPreferredLanguageState(lang)
      if (data?.firstName) {
        await SecureStore.setItemAsync('last_login_name', String(data.firstName))
      }
      if (resolvedRole === 'attorney') {
        await syncPushTokenAfterLogin()
      }
      return 'authenticated'
    } catch (err: unknown) {
      setUser(null)
      const storedToken = await SecureStore.getItemAsync('auth_token')
      if (storedToken) {
        setStartupError(getApiErrorMessage(err))
        return 'restore_failed'
      }
      return 'missing_session'
    }
  }

  async function checkAuth() {
    try {
      setStartupError(null)
      setIsLoading(true)
      await restoreSessionFromStoredToken()
    } catch {
      setUser(null)
      setStartupError('Unable to restore your session right now.')
    } finally {
      setIsLoading(false)
    }
  }

  async function login(email: string, password: string) {
    setStartupError(null)
    const { user: u, role } = IS_PLAINTIFF_APP
      ? await loginPlaintiff(email, password)
      : await loginUser(email, password)
    setUser({ ...u, role })
    const lang = await persistPreferredLanguage(u?.preferredLanguage)
    setPreferredLanguageState(lang)
    if (u?.firstName) {
      await SecureStore.setItemAsync('last_login_name', String(u.firstName))
    }
    if (role === 'attorney') {
      await syncPushTokenAfterLogin()
    }
  }

  async function setPreferredLanguage(language: MobileLanguage) {
    const lang = await persistPreferredLanguage(language)
    setPreferredLanguageState(lang)
    setUser((prev) => (prev ? { ...prev, preferredLanguage: lang } : prev))
    try {
      await updateProfile({ preferredLanguage: lang })
    } catch {
      // UI language still updates; sync can retry next change.
    }
  }

  async function logout() {
    await clearPushTokenOnLogout()
    await apiLogout()
    await SecureStore.deleteItemAsync('preferred_language').catch(() => undefined)
    setPreferredLanguageState('en')
    setUser(null)
    setStartupError(null)
  }

  async function authenticateWithBiometrics(): Promise<BiometricAuthResult> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to ClearCaseIQ',
      fallbackLabel: 'Use password',
    })
    if (!result.success) {
      return 'cancelled'
    }

    setStartupError(null)
    setIsLoading(true)
    try {
      return await restoreSessionFromStoredToken()
    } finally {
      setIsLoading(false)
    }
  }

  function updateUser(patch: Partial<User>) {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        startupError,
        preferredLanguage,
        setPreferredLanguage,
        login,
        logout,
        retryAuthCheck: checkAuth,
        authenticateWithBiometrics,
        hasBiometrics,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

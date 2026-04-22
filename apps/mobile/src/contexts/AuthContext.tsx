import React, { createContext, useContext, useEffect, useState } from 'react'
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { api, getApiErrorMessage, loginUser, logout as apiLogout, setUnauthorizedHandler } from '../lib/api'
import { clearPushTokenOnLogout, syncPushTokenAfterLogin } from '../lib/push-sync'

type User = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role?: 'attorney' | 'plaintiff'
}

type BiometricAuthResult = 'authenticated' | 'cancelled' | 'missing_session' | 'restore_failed'

type AuthContextType = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  startupError: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  retryAuthCheck: () => Promise<void>
  authenticateWithBiometrics: () => Promise<BiometricAuthResult>
  hasBiometrics: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasBiometrics, setHasBiometrics] = useState(false)
  const [startupError, setStartupError] = useState<string | null>(null)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setIsLoading(false)
      setStartupError('Your session expired. Please sign in again.')
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
      const resolvedRole = sessionRole || 'attorney'
      setUser({ ...data, role: resolvedRole })
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
    const { user: u, role } = await loginUser(email, password)
    setUser({ ...u, role })
    if (role === 'attorney') {
      await syncPushTokenAfterLogin()
    }
  }

  async function logout() {
    await clearPushTokenOnLogout()
    await apiLogout()
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        startupError,
        login,
        logout,
        retryAuthCheck: checkAuth,
        authenticateWithBiometrics,
        hasBiometrics,
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

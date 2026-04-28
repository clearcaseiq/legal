import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import { AppState, type AppStateStatus } from 'react-native'
import { getAttorneyDashboard, getApiErrorMessage } from '../lib/api'
import { useAuth } from './AuthContext'

const CACHE_MS = 20_000
const STORE_PREFIX = 'attorney_dashboard_cache:'

type RefreshOptions = {
  force?: boolean
  silent?: boolean
}

type AttorneyDashboardContextValue = {
  data: any | null
  loading: boolean
  error: string | null
  lastLoadedAt: number | null
  isOfflineSnapshot: boolean
  refresh: (options?: RefreshOptions) => Promise<any | null>
}

const AttorneyDashboardContext = createContext<AttorneyDashboardContextValue | null>(null)

export function AttorneyDashboardProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const isAttorney = user?.role !== 'plaintiff'
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null)
  const [isOfflineSnapshot, setIsOfflineSnapshot] = useState(false)
  const dataRef = useRef<any | null>(null)
  const lastLoadedAtRef = useRef<number | null>(null)
  const inFlightRef = useRef<Promise<any | null> | null>(null)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const cacheKey = user?.id ? `${STORE_PREFIX}${user.id}` : `${STORE_PREFIX}default`

  const readStoredSnapshot = useCallback(async () => {
    try {
      const raw = await SecureStore.getItemAsync(cacheKey)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { data?: any; savedAt?: number }
      if (!parsed?.data) return null
      return parsed
    } catch {
      return null
    }
  }, [cacheKey])

  const writeStoredSnapshot = useCallback(async (next: any) => {
    try {
      await SecureStore.setItemAsync(cacheKey, JSON.stringify({ data: next, savedAt: Date.now() }))
    } catch {
      // Best-effort cache: large dashboards or platform storage limits should not break live data.
    }
  }, [cacheKey])

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    lastLoadedAtRef.current = lastLoadedAt
  }, [lastLoadedAt])

  const refresh = useCallback(async (options: RefreshOptions = {}) => {
    if (!isAttorney) {
      setLoading(false)
      setError(null)
      setData(null)
      setLastLoadedAt(null)
      setIsOfflineSnapshot(false)
      return null
    }
    const now = Date.now()
    const currentData = dataRef.current
    const currentLoadedAt = lastLoadedAtRef.current

    if (!options.force && currentData && currentLoadedAt && now - currentLoadedAt < CACHE_MS) {
      return currentData
    }

    if (inFlightRef.current) {
      return inFlightRef.current
    }

    setError(null)
    // Silent refresh keeps prior UI visible (stale-while-revalidate); avoid full-screen loading spinner.
    if (!options.silent && !currentData) {
      setLoading(true)
    }

    const request = getAttorneyDashboard()
      .then((next) => {
        setData(next)
        setLastLoadedAt(Date.now())
        setIsOfflineSnapshot(false)
        void writeStoredSnapshot(next)
        return next
      })
      .catch(async (err: unknown) => {
        const message = getApiErrorMessage(err)
        setError(message)
        if (!currentData) {
          const snapshot = await readStoredSnapshot()
          if (snapshot?.data) {
            setData(snapshot.data)
            setLastLoadedAt(snapshot.savedAt || Date.now())
            setIsOfflineSnapshot(true)
            return snapshot.data
          }
        }
        return currentData ?? null
      })
      .finally(() => {
        inFlightRef.current = null
        setLoading(false)
      })

    inFlightRef.current = request
    return request
  }, [isAttorney, readStoredSnapshot, writeStoredSnapshot])

  useEffect(() => {
    if (!isAttorney) {
      setData(null)
      setLoading(false)
      setError(null)
      setLastLoadedAt(null)
      setIsOfflineSnapshot(false)
      return
    }
    void refresh({ force: true })
  }, [isAttorney, refresh])

  useEffect(() => {
    if (!isAttorney) return

    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current
      appStateRef.current = nextState
      if ((previousState === 'inactive' || previousState === 'background') && nextState === 'active') {
        void refresh({ force: true, silent: true })
      }
    })

    return () => subscription.remove()
  }, [isAttorney, refresh])

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      lastLoadedAt,
      isOfflineSnapshot,
      refresh,
    }),
    [data, loading, error, lastLoadedAt, isOfflineSnapshot, refresh]
  )

  return <AttorneyDashboardContext.Provider value={value}>{children}</AttorneyDashboardContext.Provider>
}

export function useAttorneyDashboardData() {
  const ctx = useContext(AttorneyDashboardContext)
  if (!ctx) throw new Error('useAttorneyDashboardData must be used within AttorneyDashboardProvider')
  return ctx
}

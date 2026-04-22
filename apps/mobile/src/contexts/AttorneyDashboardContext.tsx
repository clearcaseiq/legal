import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getAttorneyDashboard, getApiErrorMessage } from '../lib/api'
import { useAuth } from './AuthContext'

const CACHE_MS = 20_000

type RefreshOptions = {
  force?: boolean
  silent?: boolean
}

type AttorneyDashboardContextValue = {
  data: any | null
  loading: boolean
  error: string | null
  lastLoadedAt: number | null
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
  const dataRef = useRef<any | null>(null)
  const lastLoadedAtRef = useRef<number | null>(null)
  const inFlightRef = useRef<Promise<any | null> | null>(null)

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
        return next
      })
      .catch((err: unknown) => {
        const message = getApiErrorMessage(err)
        setError(message)
        return currentData ?? null
      })
      .finally(() => {
        inFlightRef.current = null
        setLoading(false)
      })

    inFlightRef.current = request
    return request
  }, [isAttorney])

  useEffect(() => {
    if (!isAttorney) {
      setData(null)
      setLoading(false)
      setError(null)
      setLastLoadedAt(null)
      return
    }
    void refresh({ force: true })
  }, [isAttorney, refresh])

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      lastLoadedAt,
      refresh,
    }),
    [data, loading, error, lastLoadedAt, refresh]
  )

  return <AttorneyDashboardContext.Provider value={value}>{children}</AttorneyDashboardContext.Provider>
}

export function useAttorneyDashboardData() {
  const ctx = useContext(AttorneyDashboardContext)
  if (!ctx) throw new Error('useAttorneyDashboardData must be used within AttorneyDashboardProvider')
  return ctx
}

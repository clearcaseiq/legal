import { useCallback, useEffect, useState } from 'react'
import { getAttorneyDashboard } from '../lib/api'

const CACHE_MS = 20_000

let cachedDashboard: any | null = null
let cachedAt = 0
let inFlight: Promise<any> | null = null
const listeners = new Set<() => void>()

export async function loadAttorneyDashboardSummary(force = false) {
  const now = Date.now()
  if (!force && cachedDashboard && now - cachedAt < CACHE_MS) {
    return cachedDashboard
  }

  if (inFlight) return inFlight

  inFlight = getAttorneyDashboard()
    .then((data) => {
      cachedDashboard = data
      cachedAt = Date.now()
      return data
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

export function invalidateAttorneyDashboardSummary() {
  cachedDashboard = null
  cachedAt = 0
  inFlight = null
  listeners.forEach((listener) => listener())
}

export function useAttorneyDashboardSummary() {
  const [data, setData] = useState<any | null>(cachedDashboard)
  const [loading, setLoading] = useState(!cachedDashboard)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (force = false) => {
    try {
      setError(null)
      if (!data || force) setLoading(true)
      const next = await loadAttorneyDashboardSummary(force)
      setData(next)
      return next
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load dashboard data')
      return null
    } finally {
      setLoading(false)
    }
  }, [data])

  useEffect(() => {
    if (!cachedDashboard) {
      void refresh()
    }
  }, [refresh])

  useEffect(() => {
    const listener = () => {
      void refresh(true)
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [refresh])

  return { data, loading, error, refresh }
}

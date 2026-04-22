import { useCallback, useEffect, useState } from 'react'
import { getFirmDashboard } from '../lib/api'

const CACHE_MS = 20_000

let cachedFirmDashboard: any | null = null
let cachedAt = 0
let inFlight: Promise<any> | null = null
const listeners = new Set<() => void>()

export async function loadFirmDashboardSummary(force = false) {
  const now = Date.now()
  if (!force && cachedFirmDashboard && now - cachedAt < CACHE_MS) {
    return cachedFirmDashboard
  }

  if (inFlight) return inFlight

  inFlight = getFirmDashboard()
    .then((data) => {
      cachedFirmDashboard = data
      cachedAt = Date.now()
      return data
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

export function invalidateFirmDashboardSummary() {
  cachedFirmDashboard = null
  cachedAt = 0
  inFlight = null
  listeners.forEach((listener) => listener())
}

export function useFirmDashboardSummary() {
  const [data, setData] = useState<any | null>(cachedFirmDashboard)
  const [loading, setLoading] = useState(!cachedFirmDashboard)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (force = false) => {
    try {
      setError(null)
      if (!data || force) setLoading(true)
      const next = await loadFirmDashboardSummary(force)
      setData(next)
      return next
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load firm dashboard')
      return null
    } finally {
      setLoading(false)
    }
  }, [data])

  useEffect(() => {
    if (!cachedFirmDashboard) {
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

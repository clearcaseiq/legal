import { useCallback, useEffect, useState } from 'react'
import { getAdminMatchingRules } from '../lib/api'

export function useAdminRoutingStatus() {
  const [routingEnabled, setRoutingEnabled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const config = await getAdminMatchingRules()
      setRoutingEnabled(config.routingEnabled !== false)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load routing status')
      setRoutingEnabled(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    routingEnabled,
    loading,
    error,
    reload,
  }
}

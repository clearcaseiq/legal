import { useCallback, useEffect, useState } from 'react'
import { getCurrentUser } from '../lib/api-auth'
import { listAssessments } from '../lib/api-plaintiff'
import { hasValidAuthToken } from '../lib/auth'

const CACHE_MS = 20_000

type PlaintiffSessionSummary = {
  user: any | null
  assessments: any[]
}

let cachedSummary: PlaintiffSessionSummary | null = null
let cachedAt = 0
let cachedSessionKey: string | null = null
let inFlight: Promise<PlaintiffSessionSummary> | null = null

function getSessionKey() {
  return localStorage.getItem('auth_token') || null
}

function isFresh(force = false) {
  const sessionKey = getSessionKey()
  return (
    !force &&
    !!cachedSummary &&
    !!cachedSessionKey &&
    cachedSessionKey === sessionKey &&
    Date.now() - cachedAt < CACHE_MS
  )
}

export async function loadPlaintiffSessionSummary(force = false): Promise<PlaintiffSessionSummary> {
  if (!hasValidAuthToken()) {
    cachedSummary = { user: null, assessments: [] }
    cachedAt = Date.now()
    cachedSessionKey = null
    inFlight = null
    return cachedSummary
  }

  if (isFresh(force) && cachedSummary) {
    return cachedSummary
  }

  if (inFlight) return inFlight

  inFlight = Promise.all([getCurrentUser(), listAssessments()])
    .then(([user, assessments]) => {
      cachedSummary = {
        user: user ?? null,
        assessments: Array.isArray(assessments) ? assessments : [],
      }
      cachedAt = Date.now()
      cachedSessionKey = getSessionKey()
      return cachedSummary
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

export function updateCachedPlaintiffUser(user: any) {
  cachedSummary = {
    user,
    assessments: cachedSummary?.assessments ?? [],
  }
  cachedAt = Date.now()
  cachedSessionKey = getSessionKey()
}

export function resetCachedPlaintiffSessionSummary() {
  cachedSummary = null
  cachedAt = 0
  cachedSessionKey = null
  inFlight = null
}

export function updateCachedPlaintiffAssessments(assessments: any[]) {
  cachedSummary = {
    user: cachedSummary?.user ?? null,
    assessments: Array.isArray(assessments) ? assessments : [],
  }
  cachedAt = Date.now()
  cachedSessionKey = getSessionKey()
}

export function usePlaintiffSessionSummary(enabled = true) {
  const [data, setData] = useState<PlaintiffSessionSummary | null>(cachedSummary)
  const [loading, setLoading] = useState(enabled && !cachedSummary)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (force = false) => {
    if (!enabled) {
      setLoading(false)
      return null
    }

    try {
      setError(null)
      if (!data || force) setLoading(true)
      const next = await loadPlaintiffSessionSummary(force)
      setData(next)
      return next
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load account data')
      return null
    } finally {
      setLoading(false)
    }
  }, [data, enabled])

  useEffect(() => {
    if (enabled && (!cachedSummary || cachedSessionKey !== getSessionKey())) {
      void refresh(cachedSessionKey !== getSessionKey())
    }
    if (!enabled) {
      setLoading(false)
    }
  }, [enabled, refresh])

  return { data, loading, error, refresh }
}

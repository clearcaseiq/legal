import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiOrigin } from './runtimeEnv'

export type Presence = { online: boolean; lastSeenAt: string | null }

export type CounterpartPresence = {
  attorneys: Record<string, Presence>
  clients: Record<string, Presence>
  cases: Record<string, Presence>
}

const HEARTBEAT_INTERVAL_MS = 60_000
const PRESENCE_POLL_MS = 30_000
const EMPTY: CounterpartPresence = { attorneys: {}, clients: {}, cases: {} }

function storedToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('auth_token')
  return token && token.split('.').length === 3 ? token : null
}

// Plain fetch rather than the shared client: these run in the background on
// every page, and the shared client's 401 handling logs the user out and
// redirects — an expired token must not do that from a heartbeat.
async function presenceFetch(path: string, method: 'GET' | 'POST'): Promise<Response | null> {
  const token = storedToken()
  if (!token) return null
  const base = getApiOrigin()
  try {
    return await fetch(`${base || ''}${path}`, { method, headers: { Authorization: `Bearer ${token}` } })
  } catch {
    return null
  }
}

/** Marks the signed-in user online while a tab is open and visible. Mount once. */
export function usePresenceHeartbeat() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const beat = () => {
      if (document.visibilityState === 'visible') void presenceFetch('/v1/presence/heartbeat', 'POST')
    }
    beat()
    const timer = window.setInterval(beat, HEARTBEAT_INTERVAL_MS)
    document.addEventListener('visibilitychange', beat)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', beat)
    }
  }, [])
}

/** Online state of the viewer's own attorneys (plaintiff) or clients (attorney). */
export function useCounterpartPresence(): CounterpartPresence {
  const { data } = useQuery({
    queryKey: ['presence'],
    queryFn: async () => {
      const res = await presenceFetch('/v1/presence', 'GET')
      if (!res?.ok) return EMPTY
      return (await res.json()) as CounterpartPresence
    },
    enabled: typeof window !== 'undefined' && !!storedToken(),
    refetchInterval: () => (typeof document !== 'undefined' && document.visibilityState === 'visible' ? PRESENCE_POLL_MS : false),
    staleTime: PRESENCE_POLL_MS / 2,
    retry: false,
  })
  return data ?? EMPTY
}

export function formatLastSeen(lastSeenAt: string | null, now: number = Date.now()): string | null {
  if (!lastSeenAt) return null
  const minutes = Math.max(1, Math.round((now - new Date(lastSeenAt).getTime()) / 60_000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return days < 7 ? `${days}d ago` : new Date(lastSeenAt).toLocaleDateString()
}

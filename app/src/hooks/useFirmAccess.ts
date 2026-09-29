import { useEffect, useState } from 'react'
import api from '../lib/http'

/** Case actions governed by the firm role matrix. Mirrors CASE_ACTION_PERMISSIONS on the API. */
export type FirmAction =
  | 'message'
  | 'demand'
  | 'documents'
  | 'request'
  | 'schedule'
  | 'chronology'
  | 'accept'
  | 'decline'
  | 'manage'
  | 'billing'

export type FirmAccess = {
  firm: { id: string; role: string; name?: string | null } | null
  permissions: string[]
  actions: Partial<Record<FirmAction, boolean>>
}

let cached: FirmAccess | null = null
let cachedForToken: string | null = null
let inFlight: Promise<FirmAccess | null> | null = null

function currentToken(): string | null {
  try {
    return localStorage.getItem('auth_token')
  } catch {
    return null
  }
}

export async function loadFirmAccess(): Promise<FirmAccess | null> {
  const token = currentToken()
  if (!token) return null
  if (cached && cachedForToken === token) return cached
  if (inFlight) return inFlight
  inFlight = api
    .get('/v1/attorney-dashboard/access')
    .then(({ data }) => {
      cached = data as FirmAccess
      cachedForToken = token
      return cached
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

/**
 * The signed-in user's firm permissions, as the server resolves them. Until
 * they load — or if they cannot — every action reads as allowed: the server
 * still refuses what the role does not grant, so this only decides what is
 * shown.
 */
export function useFirmAccess() {
  const token = currentToken()
  const [access, setAccess] = useState<FirmAccess | null>(cached && cachedForToken === token ? cached : null)

  useEffect(() => {
    let cancelled = false
    void loadFirmAccess().then((next) => {
      if (!cancelled) setAccess(next)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  const can = (action: FirmAction) => access?.actions?.[action] !== false
  return { access, can, loaded: access !== null }
}

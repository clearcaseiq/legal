let cachedSessionKey: string | null = null
let cachedHasCase: boolean | null = null
let inFlight: Promise<boolean> | null = null

function getSessionKey() {
  return localStorage.getItem('auth_token') || null
}

export function resetPlaintiffCaseHintCache() {
  cachedSessionKey = null
  cachedHasCase = null
  inFlight = null
}

export async function loadPlaintiffHasCase(force = false): Promise<boolean> {
  const sessionKey = getSessionKey()
  if (!sessionKey) return false

  if (!force && cachedSessionKey === sessionKey && cachedHasCase !== null) {
    return cachedHasCase
  }

  if (inFlight) return inFlight

  inFlight = import('./api-plaintiff')
    .then(async ({ listAssessments }) => {
      const assessments = await listAssessments()
      const hasCase = Array.isArray(assessments) && assessments.length > 0
      cachedSessionKey = sessionKey
      cachedHasCase = hasCase
      return hasCase
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

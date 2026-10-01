// Carries the contact details a plaintiff already provided during intake
// (name/email/phone) over to the signup page, so account creation collapses to
// "just set a password" instead of re-typing everything.

const KEY = 'pending_registration'

export type PendingRegistration = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  /** Signed claim token from submit; sign-up redeems it so the case stays attached under a changed email. */
  claimToken?: string
  assessmentId?: string
}

export function savePendingRegistration(next: PendingRegistration) {
  try {
    const existing = getPendingRegistration()
    // Merge so a later source (e.g. Results contact form) can fill in fields the
    // earlier source (intake wizard) didn't have, without wiping known values.
    // A token belongs to one case, so it never carries over to a different one.
    const merged: PendingRegistration = { ...existing }
    if (next.assessmentId && existing.assessmentId && next.assessmentId.trim() !== existing.assessmentId) {
      delete merged.claimToken
    }
    if (next.assessmentId && next.claimToken) saveCaseClaimToken(next.assessmentId, next.claimToken)
    for (const [k, v] of Object.entries(next) as [keyof PendingRegistration, string | undefined][]) {
      if (v && v.trim()) merged[k] = v.trim()
    }
    localStorage.setItem(KEY, JSON.stringify(merged))
  } catch {
    /* ignore quota / private mode */
  }
}

export function getPendingRegistration(): PendingRegistration {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function clearPendingRegistration() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

// Claim tokens for guest cases created or sent from this browser, keyed by case id.
const CLAIM_TOKENS_KEY = 'case_claim_tokens'

function readCaseClaimTokens(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CLAIM_TOKENS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function saveCaseClaimToken(assessmentId: string, token: string) {
  const id = assessmentId?.trim()
  const value = token?.trim()
  if (!id || !value) return
  try {
    localStorage.setItem(CLAIM_TOKENS_KEY, JSON.stringify({ ...readCaseClaimTokens(), [id]: value }))
  } catch {
    /* ignore quota / private mode */
  }
}

export function getCaseClaimToken(assessmentId: string | null | undefined): string | null {
  if (!assessmentId) return null
  return readCaseClaimTokens()[assessmentId.trim()] || null
}

export function getAllCaseClaimTokens(): string[] {
  return Object.values(readCaseClaimTokens()).filter(Boolean)
}

export function clearCaseClaimTokens() {
  try {
    localStorage.removeItem(CLAIM_TOKENS_KEY)
  } catch {
    /* ignore */
  }
}

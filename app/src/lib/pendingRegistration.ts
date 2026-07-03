// Carries the contact details a plaintiff already provided during intake
// (name/email/phone) over to the signup page, so account creation collapses to
// "just set a password" instead of re-typing everything.

const KEY = 'pending_registration'

export type PendingRegistration = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

export function savePendingRegistration(next: PendingRegistration) {
  try {
    const existing = getPendingRegistration()
    // Merge so a later source (e.g. Results contact form) can fill in fields the
    // earlier source (intake wizard) didn't have, without wiping known values.
    const merged: PendingRegistration = { ...existing }
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

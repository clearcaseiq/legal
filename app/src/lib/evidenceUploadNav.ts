export const EVIDENCE_RETURN_STORAGE_KEY = 'cciq_evidence_return'

export type EvidenceUploadNavOptions = {
  from?: 'dashboard' | 'results'
  returnTo?: string
  /** Supporting Documents category to scroll/focus (data-evidence-category). */
  focus?: string
  /** Optional attorney document-request id (analytics / future highlight). */
  requestId?: string
}

/** Build /evidence-upload/:id with an optional post-Done return hint. */
export function evidenceUploadHref(
  assessmentId: string,
  options?: EvidenceUploadNavOptions,
): string {
  const base = `/evidence-upload/${encodeURIComponent(assessmentId)}`
  const qs = new URLSearchParams()
  if (options?.from) qs.set('from', options.from)
  if (options?.returnTo) qs.set('returnTo', options.returnTo)
  if (options?.focus) qs.set('focus', options.focus)
  if (options?.requestId) qs.set('requestId', options.requestId)
  const q = qs.toString()
  return q ? `${base}?${q}` : base
}

/** Plaintiff dashboard deep-link so Done returns to the same case (and tab). */
export function plaintiffDashboardReturnTo(
  assessmentId?: string | null,
  tab?: 'tasks' | 'documents' | 'dashboard' | 'attorney' | 'value' | 'journal',
): string {
  const qs = new URLSearchParams()
  if (assessmentId) qs.set('case', assessmentId)
  if (tab) qs.set('tab', tab)
  const q = qs.toString()
  return q ? `/dashboard?${q}` : '/dashboard'
}

/** Only allow same-origin relative paths (block open redirects). */
export function safeInternalReturnTo(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) return fallback
  return raw
}

export function rememberEvidenceReturnTo(path: string) {
  try {
    if (typeof sessionStorage === 'undefined') return
    const safe = safeInternalReturnTo(path, '')
    if (safe) sessionStorage.setItem(EVIDENCE_RETURN_STORAGE_KEY, safe)
  } catch {
    /* ignore quota / private mode */
  }
}

export function takeEvidenceReturnTo(fallback: string): string {
  try {
    if (typeof sessionStorage === 'undefined') return fallback
    const stored = sessionStorage.getItem(EVIDENCE_RETURN_STORAGE_KEY)
    sessionStorage.removeItem(EVIDENCE_RETURN_STORAGE_KEY)
    return safeInternalReturnTo(stored, fallback)
  } catch {
    return fallback
  }
}

export function clearEvidenceReturnTo() {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(EVIDENCE_RETURN_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

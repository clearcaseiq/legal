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

/** The no-login upload portal, which authenticates on the token in the path. */
export function claimantPortalPath(token: string): string {
  return `/respond/documents/${encodeURIComponent(token)}`
}

/** Supporting Documents step for a case the visitor already has an id for. */
export function supportingDocumentsPath(
  assessmentId: string,
  options?: {
    from?: string | null
    returnTo?: string | null
    focus?: string | null
    requestId?: string | null
  },
): string {
  const qs = new URLSearchParams({ assessment: assessmentId, step: 'evidence' })
  if (options?.from) qs.set('from', options.from)
  if (options?.returnTo) qs.set('returnTo', options.returnTo)
  if (options?.focus) qs.set('focus', options.focus)
  if (options?.requestId) qs.set('requestId', options.requestId)
  const q = qs.toString()
  return q ? `/intake2?${q}` : '/intake2'
}

/** Case Snapshot "Upload evidence" target. Same screen as Add records. */
export function caseReportEvidencePath(assessmentId?: string | null): string {
  const id = (assessmentId || '').trim()
  if (!id || id === 'undefined' || id === 'null') return '/intake2?step=evidence'
  return supportingDocumentsPath(id)
}

/**
 * Portal destination for a document-request link opened with no session.
 *
 * Returns null when the link has no `?token=`. That token is the request's
 * `secureToken`, which the portal accepts on its own, so the person can upload
 * without an account. Most people opening these have no account — an imported
 * case's claimant has never registered — and the message that carried the link
 * promised them somewhere to put their documents. A null result means this is
 * not a document-request link; the case snapshot upload goes to Supporting
 * Documents instead of a sign-in screen.
 */
export function unauthenticatedEvidenceUploadDestination(token: string | null | undefined): string | null {
  const trimmed = (token || '').trim()
  return trimmed ? claimantPortalPath(trimmed) : null
}

/** Only allow same-origin relative paths (block open redirects). */
export function safeInternalReturnTo(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://') || raw.includes('\\')) return fallback
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

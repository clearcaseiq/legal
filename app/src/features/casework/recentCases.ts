/**
 * Lightweight client-side memory for the Case Workspace launcher: which case
 * files the attorney recently opened and which they've pinned. We only persist
 * ids (+ an opened-at timestamp for recents); the live metadata is always joined
 * against the freshly-fetched caseload so nothing goes stale.
 */
const RECENTS_KEY = 'ccq_recent_cases'
const PINNED_KEY = 'ccq_pinned_cases'
const MAX_RECENTS = 8

export interface RecentCaseEntry {
  id: string
  openedAt: number
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** Record that a case workspace was opened (moves it to the front of recents). */
export function recordRecentCase(id: string): void {
  if (!id) return
  try {
    const list = readJson<RecentCaseEntry[]>(RECENTS_KEY, [])
    const next = [{ id, openedAt: Date.now() }, ...list.filter((r) => r && r.id !== id)].slice(0, MAX_RECENTS)
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable — recents are best-effort */
  }
}

export function getRecentCases(): RecentCaseEntry[] {
  return readJson<RecentCaseEntry[]>(RECENTS_KEY, []).filter((r) => r && typeof r.id === 'string')
}

export function getPinnedCaseIds(): string[] {
  return readJson<string[]>(PINNED_KEY, []).filter((x) => typeof x === 'string')
}

export function isPinned(id: string): boolean {
  return getPinnedCaseIds().includes(id)
}

/** Toggle a case's pinned state; returns the new list of pinned ids. */
export function togglePinnedCase(id: string): string[] {
  const cur = getPinnedCaseIds()
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur]
  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable — pins are best-effort */
  }
  return next
}

/**
 * Tracks which routed matches the attorney has actually opened, so the inbox can
 * distinguish a brand-new (unread) match from one that's been opened but not yet
 * decided on. We persist just the ids in local storage; the live lead data is
 * always joined against the freshly-fetched dashboard so nothing goes stale.
 *
 * This is intentionally client-side: it's a per-attorney "have I looked at this
 * yet" signal, not case state. Accept/decline decisions remain server-side.
 */
const SEEN_KEY = 'ccq_seen_matches'

function read(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function getSeenMatchIds(): Set<string> {
  return new Set(read())
}

/** Record that the attorney opened this match. Returns the updated set. */
export function markMatchSeen(id: string): Set<string> {
  if (!id) return getSeenMatchIds()
  const cur = read()
  if (!cur.includes(id)) {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([id, ...cur].slice(0, 500)))
    } catch {
      /* storage unavailable — best-effort */
    }
  }
  return getSeenMatchIds()
}

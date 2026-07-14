import type { AttorneyNotification } from './api'

/**
 * Match-lifecycle events describe a lead the attorney has NOT accepted yet (or
 * that expired). These must open the read-only Lead Generation review, never the
 * Case Management case file.
 */
const LEADGEN_TYPES = new Set<string>([
  'attorney.case_routed',
  'attorney.case_expiring',
  'attorney.case_expired',
  'attorney.wave2_route',
])

/**
 * Resolve where clicking a notification should take the attorney.
 *
 * Priority:
 *  1. A specific lead (leadId) — deep-link to the right surface based on the
 *     notification type so "open that up" lands on the actual case/match, not a
 *     generic list. Match-lifecycle events open the Lead Generation review;
 *     everything else opens the case file.
 *  2. An explicit link stored on the notification (normalized to a router path
 *     when it's an absolute same-origin URL).
 */
export function notificationDestination(
  n: Pick<AttorneyNotification, 'type' | 'link' | 'leadId'>,
): string | null {
  if (n.leadId) {
    return LEADGEN_TYPES.has(n.type)
      ? `/attorney-dashboard/leadgen/matches/${n.leadId}/overview`
      : `/attorney-dashboard/lead/${n.leadId}/overview`
  }

  if (n.link) {
    if (/^https?:\/\//i.test(n.link)) {
      try {
        const url = new URL(n.link)
        if (typeof window !== 'undefined' && url.origin === window.location.origin) {
          return url.pathname + url.search + url.hash
        }
      } catch {
        /* fall through to raw link */
      }
    }
    return n.link
  }

  return null
}

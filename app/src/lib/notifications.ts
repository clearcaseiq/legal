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
    if (LEADGEN_TYPES.has(n.type)) return `/attorney-dashboard/leadgen/matches/${n.leadId}/overview`
    const caseFilePrefix = `/attorney-dashboard/lead/${n.leadId}/`
    if (n.link?.startsWith(caseFilePrefix)) return n.link
    return `${caseFilePrefix}overview`
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

export type NotificationCaseGroup<T> = {
  key: string
  /** Null for notifications that are not about a single case. */
  label: string | null
  caseId: string | null
  items: T[]
  unread: number
}

/**
 * Bucket notifications by the case they are about, newest case activity
 * first. Order within a group is preserved from the input.
 */
export function groupNotificationsByCase<
  T extends Pick<AttorneyNotification, 'caseKey' | 'caseLabel' | 'caseId' | 'read' | 'createdAt'>,
>(items: T[]): NotificationCaseGroup<T>[] {
  const groups = new Map<string, NotificationCaseGroup<T>>()
  for (const n of items) {
    const key = n.caseKey || '__general__'
    let group = groups.get(key)
    if (!group) {
      group = { key, label: n.caseKey ? n.caseLabel || 'Case' : null, caseId: n.caseId ?? null, items: [], unread: 0 }
      groups.set(key, group)
    }
    group.items.push(n)
    if (!n.read) group.unread += 1
  }
  const newest = (g: NotificationCaseGroup<T>) =>
    Math.max(...g.items.map((n) => new Date(n.createdAt).getTime() || 0))
  return [...groups.values()].sort((a, b) => newest(b) - newest(a))
}

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

/** Client conversations open the thread itself, not the case file. */
const CONVERSATION_TYPES = new Set<string>(['attorney.new_message', 'attorney.plaintiff_replied'])

/** The case tab each event is about, used when the notification carries no deep link. */
const CASE_SECTION_BY_TYPE: Record<string, string> = {
  'attorney.doc_uploaded': 'documents',
  'attorney.client_suggested_documents': 'documents?view=requests',
  'attorney.document_request_note': 'documents?view=requests',
  'attorney.countersign_needed': 'documents?view=signatures',
  'attorney.task_assigned': 'tasks',
  'attorney.case_reminder': 'tasks',
  'attorney.workflow_assignment': 'workflow',
  'attorney.mention': 'timeline',
  'attorney.demand_package_ready': 'demand',
  'attorney.negotiation_decision': 'negotiation',
  'attorney.case_result_verified': 'settlement',
  'attorney.case_result_rejected': 'settlement',
}

function toRouterPath(link: string): string {
  if (/^https?:\/\//i.test(link)) {
    try {
      const url = new URL(link)
      if (typeof window !== 'undefined' && url.origin === window.location.origin) {
        return url.pathname + url.search + url.hash
      }
    } catch {
      /* fall through to raw link */
    }
  }
  return link
}

/** Conversation with the client on a case, returning to wherever it was opened from. */
export function conversationPath(leadId: string, returnTo?: string): string {
  const back = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''
  return `/attorney-dashboard/draft-message/${leadId}${back}`
}

/**
 * Resolve where clicking a notification should take the attorney.
 *
 * Priority for a notification about a case (leadId):
 *  1. Match-lifecycle events open the Lead Generation review.
 *  2. Client messages open that conversation.
 *  3. A stored link into the same case is kept as is. Case URLs come in two
 *     spellings, `/lead/:id/` and `/cases/:id/`, and both open the case file.
 *  4. Otherwise the case tab the event is about, else the case overview.
 * Without a case, the stored link is used (same-origin absolute URLs are
 * reduced to a router path).
 */
export function notificationDestination(
  n: Pick<AttorneyNotification, 'type' | 'link' | 'leadId'>,
): string | null {
  const link = n.link ? toRouterPath(n.link) : null
  if (n.leadId) {
    if (LEADGEN_TYPES.has(n.type)) return `/attorney-dashboard/leadgen/matches/${n.leadId}/overview`
    if (CONVERSATION_TYPES.has(n.type)) return conversationPath(n.leadId)
    const caseFilePrefixes = [`/attorney-dashboard/lead/${n.leadId}/`, `/attorney-dashboard/cases/${n.leadId}/`]
    if (link && caseFilePrefixes.some((p) => link.startsWith(p))) return link
    return `/attorney-dashboard/lead/${n.leadId}/${CASE_SECTION_BY_TYPE[n.type] ?? 'overview'}`
  }
  return link
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

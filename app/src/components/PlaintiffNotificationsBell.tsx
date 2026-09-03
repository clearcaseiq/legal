/**
 * Global notification bell for plaintiffs — surfaces case activity that isn't a
 * chat message: attorney match, scheduled consultations, attorney activity, and
 * pending document requests. Kept separate from the Messages icon so the header
 * exposes both a Message and a Notification affordance (#179).
 *
 * Two sources feed this. Derived items are inferred from current case state
 * (routing status, outstanding document requests) and describe how things
 * *are*. Server items come from the plaintiff notification feed and record
 * things that *happened* — including events that leave no trace in current
 * state, like a consultation being cancelled, which simply removes the
 * appointment and would otherwise vanish without a word (CP-412/CP-430).
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarClock, FileText, UserCheck, Activity, CalendarX, ListTodo } from 'lucide-react'
import { listAssessments } from '../lib/api-plaintiff'
import {
  getRoutingStatus,
  getPlaintiffDocumentRequests,
  getPlaintiffNotifications,
  markAllPlaintiffNotificationsRead,
} from '../lib/api'
import { formatClaimType as claimLabel } from '../lib/claimTypes'
import { NOTIFICATION_POLL_MS } from '../lib/notificationPolling'
import { useVisibilityPoll } from '../hooks/useVisibilityPoll'

type NotificationKind =
  | 'matched'
  | 'appointment'
  | 'activity'
  | 'document'
  | 'cancelled'
  | 'task'

interface PlaintiffNotification {
  key: string
  kind: NotificationKind
  title: string
  detail?: string
  timeAgo?: string
  href: string
  /** Server-backed rows track read state in the database, not localStorage. */
  serverUnread?: boolean
}

/** Maps a `plaintiff.*` notification type onto the icon vocabulary above. */
function kindForServerType(type: string): NotificationKind {
  if (type.includes('cancel')) return 'cancelled'
  if (type.includes('task')) return 'task'
  if (type.includes('document')) return 'document'
  if (type.includes('appointment') || type.includes('consult')) return 'appointment'
  return 'activity'
}

const SEEN_STORAGE_KEY = 'plaintiff_seen_notifications'

function loadSeenKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function persistSeenKeys(keys: Set<string>) {
  try {
    // Cap the stored set so it can't grow unbounded over a long session.
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify([...keys].slice(-100)))
  } catch {
    /* ignore quota/serialisation errors */
  }
}

function formatDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Cases polled for derived notifications on each refresh. Two requests per case
 * every 60s, so this bounds the fan-out for the rare account with many claims.
 */
const MAX_TRACKED_CASES = 5

export default function PlaintiffNotificationsBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<PlaintiffNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [seenKeys, setSeenKeys] = useState<Set<string>>(() => loadSeenKeys())
  const ref = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    try {
      setLoading(true)

      // Independent of any assessment, so a cancellation or task still lands
      // even when the derived sources below have nothing to say.
      const feed = await getPlaintiffNotifications().catch(() => null)

      // Derived items were read from `assessments[0]` alone, so a claimant with
      // more than one case saw the first case's routing and document requests no
      // matter which case the alert was really about. Every case is polled, and
      // the derived keys carry the case id so two cases cannot collapse into one
      // row.
      const assessments = await listAssessments()
      const assessmentIds = (Array.isArray(assessments) ? assessments : [])
        .map((a) => a?.id)
        .filter((id): id is string => Boolean(id))
        .slice(0, MAX_TRACKED_CASES)
      if (assessmentIds.length === 0) {
        setNotifications(
          (feed?.notifications || []).map((n) => ({
            key: `n:${n.id}`,
            kind: kindForServerType(n.type),
            title: n.title,
            detail: n.body || undefined,
            timeAgo: formatDate(n.createdAt),
            href: n.link || '/dashboard',
            serverUnread: !n.read,
          })),
        )
        return
      }

      const cases = await Promise.all(
        assessmentIds.map(async (id) => {
          const [routing, docs] = await Promise.all([
            getRoutingStatus(id).catch(() => null),
            getPlaintiffDocumentRequests(id).catch(() => null),
          ])
          return { id, routing, docs }
        }),
      )

      // Hide obsolete "approve next attorneys" items once a case is matched /
      // retained (the API also filters these; this covers older API processes).
      // Only suppress when every case has moved past it, since the server feed
      // does not say which case a notification belongs to and a second case may
      // still be genuinely waiting on approval.
      const casePastBatchApproval = cases.every(({ routing }) =>
        Boolean(
          routing?.attorneyMatched ||
            routing?.leadStatus === 'retained' ||
            ['engaged', 'attorney_matched', 'consultation_scheduled'].includes(
              String(routing?.lifecycleState || ''),
            ),
        ),
      )
      const serverItems: PlaintiffNotification[] = (feed?.notifications || [])
        .filter((n) => {
          if (!casePastBatchApproval) return true
          return !String(n.type || '').includes('batch_approval')
        })
        .map((n) => ({
          key: `n:${n.id}`,
          kind: kindForServerType(n.type),
          title: n.title,
          detail: n.body || undefined,
          timeAgo: formatDate(n.createdAt),
          href: n.link || '/dashboard',
          serverUnread: !n.read,
        }))

      const next: PlaintiffNotification[] = [...serverItems]

      for (const { id: caseId, routing, docs } of cases) {
        if (routing?.attorneyMatched) {
          const matched = routing.attorneyMatched as typeof routing.attorneyMatched & {
            claimType?: string | null
            acceptedAt?: string | null
          }
          const name = matched.name || 'An attorney'
          // Name the case and say when, so a plaintiff with more than one claim can
          // tell which acceptance this is (CP-437).
          const detail = [matched.claimType ? claimLabel(matched.claimType) : null, matched.firmName]
            .filter(Boolean)
            .join(' · ')
          next.push({
            key: `matched:${caseId}:${matched.id}`,
            kind: 'matched',
            title: `${name} accepted your case`,
            detail: detail || undefined,
            timeAgo: formatDate(matched.acceptedAt || undefined),
            href: '/dashboard',
          })
        }

        if (routing?.upcomingAppointment) {
          const appt = routing.upcomingAppointment
          next.push({
            key: `appt:${caseId}:${appt.id}`,
            kind: 'appointment',
            title: 'Consultation scheduled',
            detail: `${appt.attorney?.name ? `${appt.attorney.name} · ` : ''}${formatDate(appt.scheduledAt)}`,
            href: '/dashboard',
          })
        }

        if (Array.isArray(routing?.attorneyActivity)) {
          routing.attorneyActivity.forEach((activity: { type?: string; message: string; timeAgo?: string }) => {
            if (!activity?.message) return
            next.push({
              key: `activity:${caseId}:${activity.message}`,
              kind: 'activity',
              title: activity.message,
              timeAgo: activity.timeAgo,
              href: '/dashboard',
            })
          })
        }

        const requests = Array.isArray(docs?.requests) ? docs.requests : []
        requests
          .filter((req) => (req.remainingDocs?.length ?? 0) > 0 && req.rawStatus !== 'completed')
          .forEach((req) => {
            const attorneyName = req.attorney?.name || 'Your attorney'
            const count = req.remainingDocs?.length ?? 0
            next.push({
              key: `doc:${caseId}:${req.id}:${count}`,
              kind: 'document',
              title: `${attorneyName} requested ${count} document${count === 1 ? '' : 's'}`,
              detail: req.remainingDocs?.slice(0, 3).join(', '),
              href: '/dashboard?tab=tasks',
            })
          })
      }

      setNotifications(next)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useVisibilityPoll(() => void loadData(), NOTIFICATION_POLL_MS)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Server rows carry their own read state so the badge survives a new device
  // or a cleared browser; derived items have no row to mark, so they keep using
  // the local seen-set.
  const unseenCount = notifications.filter((n) =>
    n.serverUnread === undefined ? !seenKeys.has(n.key) : n.serverUnread
  ).length

  const markAllSeen = () => {
    const nextSeen = new Set(seenKeys)
    notifications.forEach((n) => nextSeen.add(n.key))
    setSeenKeys(nextSeen)
    persistSeenKeys(nextSeen)

    if (notifications.some((n) => n.serverUnread)) {
      setNotifications((current) => current.map((n) => (n.serverUnread ? { ...n, serverUnread: false } : n)))
      void markAllPlaintiffNotificationsRead().catch(() => {
        /* the next poll re-reads the truth from the server */
      })
    }
  }

  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) {
      void loadData()
      markAllSeen()
    }
  }

  const openNotification = (notification: PlaintiffNotification) => {
    setOpen(false)
    navigate(notification.href)
  }

  const iconFor = (kind: NotificationKind) => {
    switch (kind) {
      case 'matched':
        return <UserCheck className="h-4 w-4 text-emerald-600" />
      case 'appointment':
        return <CalendarClock className="h-4 w-4 text-brand-600" />
      case 'cancelled':
        return <CalendarX className="h-4 w-4 text-rose-600" />
      case 'task':
        return <ListTodo className="h-4 w-4 text-brand-600" />
      case 'document':
        return <FileText className="h-4 w-4 text-amber-600" />
      default:
        return <Activity className="h-4 w-4 text-slate-500" />
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
        aria-label={unseenCount > 0 ? `Notifications, ${unseenCount} new` : 'Notifications'}
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unseenCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
            {unseenCount > 99 ? '99+' : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 max-h-96 overflow-hidden bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Bell className="h-4 w-4 text-brand-600" />
              Notifications
            </h3>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500 text-sm">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">You're all caught up</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.slice(0, 12).map((notification) => (
                  <button
                    key={notification.key}
                    onClick={() => openNotification(notification)}
                    className="block w-full p-3 hover:bg-slate-50 text-left"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">{iconFor(notification.kind)}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900">{notification.title}</div>
                        {notification.detail && (
                          <div className="text-xs text-slate-500 mt-0.5 truncate">{notification.detail}</div>
                        )}
                        {notification.timeAgo && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{notification.timeAgo}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="p-2 border-t border-slate-200">
            <button
              onClick={() => { setOpen(false); navigate('/dashboard') }}
              className="block w-full text-center text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

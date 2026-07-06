/**
 * Global notification bell for plaintiffs — surfaces case activity that isn't a
 * chat message: attorney match, scheduled consultations, attorney activity, and
 * pending document requests. Kept separate from the Messages icon so the header
 * exposes both a Message and a Notification affordance (#179).
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarClock, FileText, UserCheck, Activity } from 'lucide-react'
import { listAssessments } from '../lib/api-plaintiff'
import { getRoutingStatus, getPlaintiffDocumentRequests } from '../lib/api'

type NotificationKind = 'matched' | 'appointment' | 'activity' | 'document'

interface PlaintiffNotification {
  key: string
  kind: NotificationKind
  title: string
  detail?: string
  timeAgo?: string
  href: string
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
      const assessments = await listAssessments()
      const assessmentId = Array.isArray(assessments) && assessments.length > 0 ? assessments[0]?.id : null
      if (!assessmentId) {
        setNotifications([])
        return
      }

      const [routing, docs] = await Promise.all([
        getRoutingStatus(assessmentId).catch(() => null),
        getPlaintiffDocumentRequests(assessmentId).catch(() => null),
      ])

      const next: PlaintiffNotification[] = []

      if (routing?.attorneyMatched) {
        const name = routing.attorneyMatched.name || 'An attorney'
        next.push({
          key: `matched:${routing.attorneyMatched.id}`,
          kind: 'matched',
          title: `${name} accepted your case`,
          detail: routing.attorneyMatched.firmName || undefined,
          href: '/dashboard',
        })
      }

      if (routing?.upcomingAppointment) {
        const appt = routing.upcomingAppointment
        next.push({
          key: `appt:${appt.id}`,
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
            key: `activity:${activity.message}`,
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
            key: `doc:${req.id}:${count}`,
            kind: 'document',
            title: `${attorneyName} requested ${count} document${count === 1 ? '' : 's'}`,
            detail: req.remainingDocs?.slice(0, 3).join(', '),
            href: '/dashboard?tab=requested-documents',
          })
        })

      setNotifications(next)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unseenCount = notifications.filter((n) => !seenKeys.has(n.key)).length

  const markAllSeen = () => {
    const nextSeen = new Set(seenKeys)
    notifications.forEach((n) => nextSeen.add(n.key))
    setSeenKeys(nextSeen)
    persistSeenKeys(nextSeen)
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

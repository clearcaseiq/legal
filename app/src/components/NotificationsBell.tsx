/**
 * Attorney notifications bell — surfaces lead/case activity (new matches,
 * expiring/expired matches, new evidence, plaintiff messages, consults) from the
 * in-app notifications feed. Separate from the Messages bell.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarClock,
  CheckCheck,
  Clock,
  FileText,
  MessageSquare,
  Sparkles,
  TimerOff,
} from 'lucide-react'
import {
  getAttorneyNotifications,
  getAttorneyNotificationUnreadCount,
  markAttorneyNotificationRead,
  markAllAttorneyNotificationsRead,
  type AttorneyNotification,
} from '../lib/api'

type IconMeta = { Icon: typeof Bell; tone: string }

function iconFor(type: string): IconMeta {
  switch (type) {
    case 'attorney.case_routed':
      return { Icon: Sparkles, tone: 'bg-brand-50 text-brand-600' }
    case 'attorney.case_expiring':
      return { Icon: Clock, tone: 'bg-amber-50 text-amber-600' }
    case 'attorney.case_expired':
      return { Icon: TimerOff, tone: 'bg-rose-50 text-rose-600' }
    case 'attorney.doc_uploaded':
      return { Icon: FileText, tone: 'bg-blue-50 text-blue-600' }
    case 'attorney.new_message':
    case 'attorney.plaintiff_replied':
      return { Icon: MessageSquare, tone: 'bg-brand-50 text-brand-600' }
    case 'attorney.consult_scheduled':
      return { Icon: CalendarClock, tone: 'bg-emerald-50 text-emerald-600' }
    default:
      return { Icon: Bell, tone: 'bg-slate-100 text-slate-500' }
  }
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NotificationsBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<AttorneyNotification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const loadCount = useCallback(async () => {
    try {
      const res = await getAttorneyNotificationUnreadCount()
      setUnreadCount(res?.count ?? 0)
    } catch {
      /* ignore transient errors */
    }
  }, [])

  const loadList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getAttorneyNotifications(30)
      setItems(Array.isArray(res?.notifications) ? res.notifications : [])
      setUnreadCount(res?.unreadCount ?? 0)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCount()
    const interval = setInterval(loadCount, 60000)
    return () => clearInterval(interval)
  }, [loadCount])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next) loadList()
  }

  const handleOpenItem = async (n: AttorneyNotification) => {
    setOpen(false)
    if (!n.read) {
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)))
      setUnreadCount((c) => Math.max(0, c - 1))
      markAttorneyNotificationRead(n.id).catch(() => {})
    }
    const dest = n.link || (n.leadId ? `/attorney-dashboard/lead/${n.leadId}/overview` : null)
    if (dest) navigate(dest)
  }

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((it) => ({ ...it, read: true })))
    setUnreadCount(0)
    try {
      await markAllAttorneyNotificationsRead()
    } catch {
      /* ignore; next poll reconciles */
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <Bell className="h-4 w-4 text-brand-600" />
              Notifications
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
                  {unreadCount} new
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-brand-600"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-500">Loading…</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">You&apos;re all caught up</p>
                <p className="mt-1 text-xs text-slate-400">New matches, deadlines, and case activity will show up here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((n) => {
                  const { Icon, tone } = iconFor(n.type)
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleOpenItem(n)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                          n.read ? '' : 'bg-brand-50/40 dark:bg-brand-950/20'
                        }`}
                      >
                        <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</span>
                            <span className="shrink-0 text-[11px] text-slate-400">{relativeTime(n.createdAt)}</span>
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {n.body}
                          </span>
                        </span>
                        {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-hidden />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

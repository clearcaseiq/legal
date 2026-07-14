/**
 * Full attorney notifications feed — the "See all notifications" destination
 * behind the header bell (Upwork-style). Shares the bell's look & feel (icon
 * chip + title + body + relative time + unread dot) but shows the full history
 * with All / Unread filters, mark-as-read, and load-more.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  markAttorneyNotificationRead,
  markAllAttorneyNotificationsRead,
  type AttorneyNotification,
} from '../../lib/api'
import { PageHeader, SectionCard, EmptyState } from '../shared/ui'
import { notificationDestination } from '../../lib/notifications'

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
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const INITIAL_LIMIT = 30
const MAX_LIMIT = 100

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<AttorneyNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(INITIAL_LIMIT)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const load = useCallback(async (lim: number) => {
    try {
      setLoading(true)
      const res = await getAttorneyNotifications(lim)
      setItems(Array.isArray(res?.notifications) ? res.notifications : [])
      setUnreadCount(res?.unreadCount ?? 0)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(limit)
  }, [load, limit])

  const openItem = async (n: AttorneyNotification) => {
    if (!n.read) {
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)))
      setUnreadCount((c) => Math.max(0, c - 1))
      markAttorneyNotificationRead(n.id).catch(() => {})
    }
    const dest = notificationDestination(n)
    if (dest) navigate(dest)
  }

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((it) => ({ ...it, read: true })))
    setUnreadCount(0)
    try {
      await markAllAttorneyNotificationsRead()
    } catch {
      /* next load reconciles */
    }
  }

  const visible = useMemo(
    () => (filter === 'unread' ? items.filter((n) => !n.read) : items),
    [items, filter],
  )
  const canLoadMore = items.length >= limit && limit < MAX_LIMIT

  const filterChip = (key: 'all' | 'unread', label: string, count?: number) => (
    <button
      onClick={() => setFilter(key)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
        filter === key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
      {count != null && count > 0 && (
        <span
          className={`rounded-full px-1.5 text-[10px] ${
            filter === key ? 'bg-white/25 text-white' : 'bg-white text-slate-500'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="New matches, deadlines, documents, messages, and case activity — all in one place."
      />

      <SectionCard
        title="All notifications"
        trailing={
          unreadCount > 0 ? (
            <button
              onClick={handleMarkAll}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-brand-600"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          ) : undefined
        }
      >
        <div className="mb-3 flex items-center gap-2">
          {filterChip('all', 'All')}
          {filterChip('unread', 'Unread', unreadCount)}
        </div>

        {loading && items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : visible.length === 0 ? (
          <EmptyState
            message={
              filter === 'unread'
                ? "You're all caught up — no unread notifications."
                : 'No notifications yet. New matches, deadlines, and case activity will show up here.'
            }
          />
        ) : (
          <ul className="-mx-2 divide-y divide-slate-100">
            {visible.map((n) => {
              const { Icon, tone } = iconFor(n.type)
              return (
                <li key={n.id}>
                  <button
                    onClick={() => openItem(n)}
                    className={`flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-slate-50 ${
                      n.read ? '' : 'bg-brand-50/40'
                    }`}
                  >
                    <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">{n.title}</span>
                        <span className="shrink-0 text-[11px] text-slate-400">{relativeTime(n.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">{n.body}</span>
                    </span>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-hidden />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {canLoadMore && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={() => setLimit((l) => Math.min(MAX_LIMIT, l + INITIAL_LIMIT))}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

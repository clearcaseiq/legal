/**
 * Notification bell for the admin console.
 *
 * Platform events fanned out by notifyAdmins() (an attorney declining a routed
 * case, routing escalations, etc.) were only reachable by email — the admin
 * shell had no inbox at all, so ops had no in-app signal to act on (CP-390).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Bell, Check, Loader2 } from 'lucide-react'
import { getAdminAlerts, markAdminAlertsRead, type AdminAlert } from '../lib/api'

const POLL_INTERVAL_MS = 60_000

function relativeTime(iso: string): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const mins = Math.round(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(then).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function AdminNotificationBell() {
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<AdminAlert[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getAdminAlerts()
      setAlerts(res.alerts)
      setUnread(res.unreadCount)
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const markAll = async () => {
    const now = new Date().toISOString()
    setAlerts((prev) => prev.map((a) => (a.readAt ? a : { ...a, readAt: now })))
    setUnread(0)
    try {
      await markAdminAlertsRead()
    } catch {
      void load()
    }
  }

  const markOne = async (alert: AdminAlert) => {
    if (alert.readAt) return
    const now = new Date().toISOString()
    setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, readAt: now } : a)))
    setUnread((n) => Math.max(0, n - 1))
    try {
      await markAdminAlertsRead(alert.id)
    } catch {
      void load()
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-[18px] text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAll()}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400"
              >
                <Check className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && alerts.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : failed ? (
              <div className="flex items-start gap-2 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>Couldn't load notifications. They'll retry shortly.</span>
              </div>
            ) : alerts.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                No notifications yet.
              </p>
            ) : (
              alerts.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => void markOne(alert)}
                  className={`block w-full border-b border-slate-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60 ${
                    alert.readAt ? '' : 'bg-brand-50/50 dark:bg-brand-500/5'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!alert.readAt && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {alert.subject || 'Platform alert'}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{alert.message}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{relativeTime(alert.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 px-4 py-2 text-center dark:border-slate-800">
            <Link
              to="/admin/communications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400"
            >
              View all communications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

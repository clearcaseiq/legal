/**
 * Alerts an attorney the moment a new lead lands in New Matches, using the
 * alert style they picked (popup, ringtone, both, or off — see Notifications).
 *
 * Unlike the bell, this keeps polling while the tab is hidden: hearing the
 * ringtone while working in another tab is the point. Browsers throttle hidden
 * timers to about once a minute, which is acceptable here.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'
import { getAttorneyNotifications, markAttorneyNotificationRead, type AttorneyNotification } from '../lib/api'
import { notificationDestination } from '../lib/notifications'
import { NOTIFICATION_POLL_MS } from '../lib/notificationPolling'
import {
  getNewLeadAlertMode,
  getSeenLeadAlertIds,
  markLeadAlertsSeen,
  playNewLeadRingtone,
  showDesktopNotification,
  wantsPopup,
  wantsRingtone,
  type NewLeadAlertMode,
} from '../lib/newLeadAlerts'

const NEW_LEAD_TYPE = 'attorney.case_routed'
// Only alert for leads that are actually new; an attorney returning after a
// week should not be greeted by a stack of stale popups.
const MAX_ALERT_AGE_MS = 24 * 60 * 60 * 1000

export default function NewLeadAlert() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<AttorneyNotification[]>([])
  const modeRef = useRef<NewLeadAlertMode>(getNewLeadAlertMode())

  useEffect(() => {
    const onMode = () => {
      modeRef.current = getNewLeadAlertMode()
    }
    window.addEventListener('ccq:new-lead-alert-mode', onMode)
    window.addEventListener('storage', onMode)
    return () => {
      window.removeEventListener('ccq:new-lead-alert-mode', onMode)
      window.removeEventListener('storage', onMode)
    }
  }, [])

  const open = useCallback(
    (n: AttorneyNotification) => {
      setAlerts([])
      if (!n.read) markAttorneyNotificationRead(n.id).catch(() => {})
      const dest = notificationDestination(n)
      navigate(dest || '/attorney-dashboard/leadgen/matches')
    },
    [navigate],
  )

  const check = useCallback(async () => {
    const mode = modeRef.current
    try {
      const res = await getAttorneyNotifications(15)
      const seen = getSeenLeadAlertIds()
      const now = Date.now()
      const fresh = (res?.notifications || []).filter(
        (n) =>
          n.type === NEW_LEAD_TYPE &&
          !n.read &&
          !seen.has(n.id) &&
          now - new Date(n.createdAt).getTime() < MAX_ALERT_AGE_MS,
      )
      if (!fresh.length) return
      markLeadAlertsSeen(fresh.map((n) => n.id))
      if (mode === 'off') return
      if (wantsRingtone(mode)) playNewLeadRingtone()
      if (wantsPopup(mode)) {
        setAlerts((prev) => [...fresh, ...prev.filter((p) => !fresh.some((f) => f.id === p.id))])
        if (document.hidden) {
          const first = fresh[0]
          showDesktopNotification(
            fresh.length > 1 ? `${fresh.length} new leads` : first.title || 'New lead',
            fresh.length > 1 ? 'New cases are waiting in New Matches.' : first.body || 'A new case is waiting in New Matches.',
            () => open(first),
          )
        }
      }
    } catch {
      /* transient; next tick retries */
    }
  }, [open])

  useEffect(() => {
    void check()
    const timer = setInterval(() => void check(), NOTIFICATION_POLL_MS)
    const onVisible = () => {
      if (!document.hidden) void check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [check])

  if (!alerts.length) return null
  const first = alerts[0]
  const many = alerts.length > 1

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="New lead"
      className="fixed bottom-4 right-4 z-[100] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-brand-200 bg-white p-4 shadow-2xl shadow-slate-900/20 dark:border-brand-900 dark:bg-slate-900"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {many ? `${alerts.length} new leads in New Matches` : first.title || 'New lead in New Matches'}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {many ? 'Review them before they expire.' : first.body}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => (many ? (setAlerts([]), navigate('/attorney-dashboard/leadgen/matches')) : open(first))}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              {many ? 'View new matches' : 'Review lead'}
            </button>
            <button
              type="button"
              onClick={() => setAlerts([])}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => (setAlerts([]), navigate('/attorney-dashboard/notifications'))}
              className="ml-auto text-[11px] font-semibold text-slate-400 hover:text-brand-600"
            >
              Alert settings
            </button>
          </div>
        </div>
        <button type="button" onClick={() => setAlerts([])} aria-label="Dismiss" className="rounded p-1 text-slate-400 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

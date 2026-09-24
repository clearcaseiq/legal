import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, UserPlus, X } from 'lucide-react'
import { getAssistanceNewArrivals, type AssistanceQueueRow } from '../lib/api'
import { ASSISTANCE_STATUS_LABELS } from '../pages/assistance/assistanceLabels'

const POLL_MS = 30_000
const SNOOZE_MS = 10 * 60_000

type Arrival = AssistanceQueueRow & { assignedToMe: boolean }

function storageKey(email: string | null, name: string) {
  return `ccq.newCasePopup.${name}.${email || 'admin'}`
}

function receivedLabel(createdAt: string, assignedAt: string | null, now: number): string {
  const at = new Date(assignedAt && assignedAt > createdAt ? assignedAt : createdAt).getTime()
  const minutes = Math.floor((now - at) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return `${hours} hr${hours === 1 ? '' : 's'} ago`
}

/**
 * Announces cases that reach the Case Assistance queue while an admin or
 * specialist has the console open. "Seen" is a server timestamp kept per user in
 * localStorage, so the popup starts from the moment the console is first opened
 * and never replays the existing backlog.
 */
export default function AdminNewCasePopup({ email }: { email: string | null }) {
  const navigate = useNavigate()
  const [arrivals, setArrivals] = useState<Arrival[]>([])
  const [total, setTotal] = useState(0)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)

  const seenKey = storageKey(email, 'seen')
  const snoozeKey = storageKey(email, 'snoozeUntil')

  const check = useCallback(async () => {
    const snoozeUntil = Number(localStorage.getItem(snoozeKey) || 0)
    if (snoozeUntil > Date.now()) return
    try {
      const since = localStorage.getItem(seenKey)
      const res = await getAssistanceNewArrivals(since)
      if (!since) {
        localStorage.setItem(seenKey, res.serverTime)
        return
      }
      setArrivals(res.data)
      setTotal(res.total)
      setCheckedAt(res.serverTime)
    } catch {
      /* the queue is still there; a missed poll is retried */
    }
  }, [seenKey, snoozeKey])

  useEffect(() => {
    void check()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    const timer = window.setInterval(onVisible, POLL_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [check])

  const markSeen = () => {
    if (checkedAt) localStorage.setItem(seenKey, checkedAt)
    setArrivals([])
  }

  const remindLater = () => {
    localStorage.setItem(snoozeKey, String(Date.now() + SNOOZE_MS))
    setArrivals([])
  }

  const open = (path: string) => {
    markSeen()
    navigate(path)
  }

  const lead = arrivals[0]
  if (!lead) return null
  const others = total - 1
  const title = lead.assignedToMe ? 'You Have Received a New Lead' : 'A New Lead Has Arrived'
  const body = lead.assignedToMe
    ? 'A new lead has been assigned to your Case Assistance queue. Please review the case details and take the required action.'
    : 'A new lead has arrived in the Case Assistance queue. Please review the case details and take the required action.'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="new-case-title">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <button
          type="button"
          onClick={markSeen}
          aria-label="Dismiss"
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
          <AlertCircle className="h-3.5 w-3.5" /> Attention required
        </span>
        <h2 id="new-case-title" className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{body}</p>

        <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-brand-600 ring-1 ring-brand-100 dark:bg-slate-900">
              <UserPlus className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {lead.plaintiffName || lead.caseName || 'New Lead'}
              </p>
              <p className="truncate text-xs text-slate-500">{lead.claimType}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-slate-500">Lead Reference</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{lead.referenceCode || '—'}</p>
            </div>
            <div className="border-l border-slate-200 pl-3 dark:border-slate-700">
              <p className="text-slate-500">Status</p>
              <span className="mt-1 inline-block rounded-full bg-brand-100 px-2 py-0.5 font-semibold text-brand-700">
                {ASSISTANCE_STATUS_LABELS[lead.status] || lead.status}
              </span>
            </div>
            <div className="border-l border-slate-200 pl-3 dark:border-slate-700">
              <p className="text-slate-500">Received</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {receivedLabel(lead.createdAt, lead.assignedAt, Date.now())}
              </p>
            </div>
          </div>
        </div>

        {others > 0 ? (
          <button
            type="button"
            onClick={() => open('/admin/case-assistance')}
            className="mt-3 w-full text-center text-xs font-semibold text-brand-700 hover:underline"
          >
            +{others} more new lead{others === 1 ? '' : 's'} in the queue
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => open(`/admin/case-assistance/${lead.id}`)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          View Lead <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={remindLater}
          className="mt-2 w-full rounded-lg py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800"
        >
          Remind Me Later
        </button>
      </div>
    </div>
  )
}

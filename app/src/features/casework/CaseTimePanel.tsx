/**
 * Case Workspace → Time tab. Log team time against this case (self, or an admin
 * on anyone's behalf), see logged hours + billable value, and remove entries.
 * Firm-wide review/approval lives in the Firm Dashboard → Time & Billing tab.
 */
import { useCallback, useEffect, useState } from 'react'
import { Clock, Plus, Trash2, Loader2, DollarSign, Play, StopCircle } from 'lucide-react'
import {
  getCaseTime,
  createCaseTime,
  deleteCaseTime,
  type CaseTimeResponse,
  type TimeEntry,
} from '../../lib/api'

const inputCls =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100'
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
  invoiced: 'bg-violet-50 text-violet-700',
}

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—'
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function elapsed(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const hh = String(Math.floor(s / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export default function CaseTimePanel({ leadId }: { leadId: string }) {
  const [data, setData] = useState<CaseTimeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [hours, setHours] = useState('')
  const [activityType, setActivityType] = useState('general')
  const [workDate, setWorkDate] = useState(todayStr())
  const [billable, setBillable] = useState(true)
  const [description, setDescription] = useState('')
  const [onBehalf, setOnBehalf] = useState('')

  // Live start/stop timer (persisted per case so it survives reloads).
  const TIMER_KEY = `caseTimer:${leadId}`
  const [timer, setTimer] = useState<{
    startedAt: number
    activityType: string
    description: string
    billable: boolean
  } | null>(null)
  const [tNow, setTNow] = useState(Date.now())
  const [tActivity, setTActivity] = useState('general')
  const [tDesc, setTDesc] = useState('')
  const [tBillable, setTBillable] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_KEY)
      if (raw) setTimer(JSON.parse(raw))
    } catch {
      /* ignore */
    }
  }, [TIMER_KEY])

  useEffect(() => {
    if (!timer) return
    const id = setInterval(() => setTNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [timer])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getCaseTime(leadId)
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    load()
  }, [load])

  const add = async () => {
    const h = Number(hours)
    if (!Number.isFinite(h) || h <= 0) {
      alert('Enter hours greater than 0.')
      return
    }
    setBusy(true)
    try {
      await createCaseTime(leadId, {
        hours: h,
        activityType,
        workDate,
        billable,
        description: description.trim() || null,
        firmMemberId: onBehalf || undefined,
      })
      setHours('')
      setDescription('')
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to log time')
    } finally {
      setBusy(false)
    }
  }

  const startTimer = () => {
    const t = { startedAt: Date.now(), activityType: tActivity, description: tDesc, billable: tBillable }
    localStorage.setItem(TIMER_KEY, JSON.stringify(t))
    setTimer(t)
    setTNow(Date.now())
  }

  const discardTimer = () => {
    localStorage.removeItem(TIMER_KEY)
    setTimer(null)
  }

  const stopTimer = async () => {
    if (!timer) return
    const secs = Math.max(1, Math.round((Date.now() - timer.startedAt) / 1000))
    const hrs = Math.max(0.01, Math.round((secs / 3600) * 100) / 100)
    setBusy(true)
    try {
      await createCaseTime(leadId, {
        hours: hrs,
        activityType: timer.activityType,
        billable: timer.billable,
        description: timer.description.trim() || null,
        firmMemberId: onBehalf || undefined,
      })
      discardTimer()
      setTDesc('')
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to log timer')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (entry: TimeEntry) => {
    if (!confirm('Delete this time entry?')) return
    try {
      await deleteCaseTime(leadId, entry.id)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to delete')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading time…
      </div>
    )
  }

  if (!data?.canLog) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        Time tracking is available to firm members. You're not part of a firm workspace.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Clock className="h-3.5 w-3.5" /> Logged hours
          </div>
          <div className="mt-1 text-xl font-bold text-slate-900">{data.totals.totalHours}</div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <DollarSign className="h-3.5 w-3.5" /> Billable value
          </div>
          <div className="mt-1 text-xl font-bold text-slate-900">{money(data.totals.billableAmount)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="text-xs font-medium text-slate-500">Entries</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{data.totals.entryCount}</div>
        </div>
      </div>

      {/* Live timer */}
      <div className="rounded-xl border border-slate-200 p-4">
        {timer ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
              </span>
              <div>
                <div className="font-mono text-2xl font-bold tabular-nums text-slate-900">{elapsed(tNow - timer.startedAt)}</div>
                <div className="text-xs text-slate-500">
                  <span className="capitalize">{timer.activityType}</span>
                  {timer.description ? ` · ${timer.description}` : ''}
                  {!timer.billable ? ' · non-billable' : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={stopTimer}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                <StopCircle className="h-4 w-4" /> {busy ? 'Logging…' : 'Stop & log'}
              </button>
              <button type="button" onClick={discardTimer} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Discard
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Clock className="h-4 w-4 text-slate-400" /> Timer
            </div>
            <div className="min-w-[140px]">
              <label className={labelCls}>Activity</label>
              <select className={inputCls} value={tActivity} onChange={(e) => setTActivity(e.target.value)}>
                {(data.activityTypes || []).map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px] flex-1">
              <label className={labelCls}>Description</label>
              <input className={inputCls} value={tDesc} onChange={(e) => setTDesc(e.target.value)} placeholder="Optional" />
            </div>
            <label className="mb-2 inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={tBillable} onChange={(e) => setTBillable(e.target.checked)} /> Billable
            </label>
            <button
              type="button"
              onClick={startTimer}
              className="mb-0.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <Play className="h-4 w-4" /> Start
            </button>
          </div>
        )}
      </div>

      {/* Quick add */}
      <div className="rounded-xl border border-slate-200 p-4">
        <h4 className="mb-3 text-sm font-semibold text-slate-700">Log time</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className={labelCls}>Hours</label>
            <input
              type="number"
              min={0}
              step={0.25}
              className={inputCls}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="1.5"
            />
          </div>
          <div>
            <label className={labelCls}>Activity</label>
            <select className={inputCls} value={activityType} onChange={(e) => setActivityType(e.target.value)}>
              {data.activityTypes.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" className={inputCls} value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
          </div>
          {data.isAdmin && data.members.length > 0 && (
            <div>
              <label className={labelCls}>For</label>
              <select className={inputCls} value={onBehalf} onChange={(e) => setOnBehalf(e.target.value)}>
                <option value="">Me</option>
                {data.members.map((m) => (
                  <option key={m.firmMemberId} value={m.firmMemberId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="mt-3">
          <label className={labelCls}>Description</label>
          <input
            className={inputCls}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on?"
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} />
            Billable
          </label>
          <button
            type="button"
            onClick={add}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> {busy ? 'Logging…' : 'Log time'}
          </button>
        </div>
      </div>

      {/* Entries */}
      {data.entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No time logged on this case yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Who</th>
                <th className="px-3 py-2 font-semibold">Activity</th>
                <th className="px-3 py-2 text-right font-semibold">Hours</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.entries.map((e) => (
                <tr key={e.id} className="text-slate-700">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                    {new Date(e.workDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-3 py-2">{e.workerName || '—'}</td>
                  <td className="px-3 py-2">
                    <span className="capitalize">{e.activityType}</span>
                    {e.description && <span className="ml-1 text-xs text-slate-400">· {e.description}</span>}
                    {!e.billable && <span className="ml-1 text-xs text-slate-400">(non-billable)</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{e.hours}</td>
                  <td className="px-3 py-2 text-right">{money(e.amount)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_TONE[e.status] || 'bg-slate-100 text-slate-600'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => remove(e)}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                      title="Delete entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

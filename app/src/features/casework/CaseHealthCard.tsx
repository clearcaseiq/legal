/**
 * Case health on the Overview tab: the score, what is pulling it down, and any
 * alerts. Saving a snapshot keeps the trend and schedules reminders for alerts.
 */
import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, Loader2 } from 'lucide-react'
import { getLeadHealth, saveLeadHealth } from '../../lib/api'

type Health = {
  score: number
  level: string
  factors?: Array<{ key: string; detail: string }>
  alerts?: Array<{ type: string; severity: 'warning' | 'critical'; message: string }>
  snapshots?: Array<{ id: string; score: number; createdAt: string }>
}

const LEVEL: Record<string, { label: string; style: string }> = {
  green: { label: 'On track', style: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  yellow: { label: 'Needs attention', style: 'bg-amber-50 text-amber-700 ring-amber-200' },
  red: { label: 'At risk', style: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

export default function CaseHealthCard({ leadId, canSave }: { leadId: string; canSave: boolean }) {
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getLeadHealth(leadId)
      .then((data) => {
        if (!cancelled) setHealth(data)
      })
      .catch(() => {
        if (!cancelled) setError('Case health is unavailable right now.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [leadId])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const data = await saveLeadHealth(leadId)
      setHealth((prev) => ({ ...prev, ...data }))
      setSavedAt(new Date().toLocaleTimeString(undefined, { timeStyle: 'short' }))
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not save the health snapshot.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking case health…
      </section>
    )
  }
  if (!health) {
    return error ? <p className="text-xs text-slate-500">{error}</p> : null
  }

  const previous = health.snapshots?.[0]?.score
  const delta = typeof previous === 'number' ? health.score - previous : null
  const factors = health.factors ?? []
  const alerts = health.alerts ?? []

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-slate-500" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Case health</h3>
            <p className="text-xs text-slate-500">
              {delta === null
                ? 'No saved snapshot yet.'
                : delta === 0
                  ? 'Unchanged since the last snapshot.'
                  : `${delta > 0 ? 'Up' : 'Down'} ${Math.abs(delta)} since the last snapshot.`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tabular-nums text-slate-900">{health.score}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
              LEVEL[health.level]?.style ?? 'bg-slate-50 text-slate-700 ring-slate-200'
            }`}
          >
            {LEVEL[health.level]?.label ?? health.level}
          </span>
          {canSave ? (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? 'Saving…' : savedAt ? `Saved ${savedAt}` : 'Save snapshot'}
            </button>
          ) : null}
        </div>
      </div>

      {alerts.length ? (
        <ul className="mt-3 space-y-1.5">
          {alerts.map((a) => (
            <li
              key={`${a.type}-${a.message}`}
              className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                a.severity === 'critical' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800'
              }`}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {a.message}
            </li>
          ))}
        </ul>
      ) : null}

      {factors.length ? (
        <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm text-slate-600">
          {factors.map((f) => (
            <li key={f.key}>{f.detail}</li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </section>
  )
}

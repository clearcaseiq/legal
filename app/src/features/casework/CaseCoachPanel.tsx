/**
 * AI Case Coach panel (Phase 2) — the "do this next" feed at the top of the
 * case Overview tab. Renders a ranked list of next-best actions, each with why
 * it matters, its impact, and one-click actions that create tasks.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Compass,
  Loader2,
  RefreshCw,
  Send,
  UserPlus,
  FileText,
  CalendarClock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import {
  getCaseCoach,
  runCaseCoachAction,
  type CaseCoach,
  type CoachInsight,
  type CoachPriority,
  type CaseIntelligenceGapAction,
} from '../../lib/api'

const ACTION_META: Record<CaseIntelligenceGapAction, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  request_from_client: { label: 'Request from client', Icon: Send },
  assign_paralegal: { label: 'Assign to paralegal', Icon: UserPlus },
  generate_doc_request: { label: 'Document request', Icon: FileText },
  schedule_followup: { label: 'Schedule follow-up', Icon: CalendarClock },
}

const PRIORITY_META: Record<CoachPriority, { label: string; badge: string; bar: string }> = {
  critical: { label: 'Critical', badge: 'bg-rose-100 text-rose-700 ring-rose-200', bar: 'bg-rose-500' },
  high: { label: 'High', badge: 'bg-amber-100 text-amber-700 ring-amber-200', bar: 'bg-amber-500' },
  medium: { label: 'Medium', badge: 'bg-sky-100 text-sky-700 ring-sky-200', bar: 'bg-sky-500' },
  low: { label: 'Low', badge: 'bg-slate-100 text-slate-600 ring-slate-200', bar: 'bg-slate-300' },
}

export default function CaseCoachPanel({ leadId }: { leadId: string }) {
  const [coach, setCoach] = useState<CaseCoach | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioned, setActioned] = useState<Record<string, 'loading' | 'done'>>({})

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getCaseCoach(leadId)
      .then((data) => setCoach(data))
      .catch((err: any) => setError(err?.response?.data?.error || 'Coach not available yet'))
      .finally(() => setLoading(false))
  }, [leadId])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    getCaseCoach(leadId)
      .then((data) => { if (alive) setCoach(data) })
      .catch((err: any) => { if (alive) setError(err?.response?.data?.error || 'Coach not available yet') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [leadId])

  const runAction = async (insight: CoachInsight, action: CaseIntelligenceGapAction) => {
    const key = `${insight.key}:${action}`
    setActioned((prev) => ({ ...prev, [key]: 'loading' }))
    try {
      await runCaseCoachAction(leadId, { title: insight.title, action, priority: insight.priority })
      setActioned((prev) => ({ ...prev, [key]: 'done' }))
    } catch {
      setActioned((prev) => { const next = { ...prev }; delete next[key]; return next })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-brand-500" /> Analyzing the case…
      </div>
    )
  }
  if (error || !coach || coach.insights.length === 0) {
    return null // fail quietly — Overview still renders everything else
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm">
      {/* Headline banner */}
      <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-brand-700 to-brand-600 px-4 py-3 text-white">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/15"><Compass className="h-4 w-4" /></span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold">AI Case Coach</h3>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {coach.narrationSource === 'ai' ? 'AI' : 'Rules'}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-medium text-brand-50">{coach.headline}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/25"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Ranked insights */}
      <ul className="divide-y divide-slate-100">
        {coach.insights.map((insight) => {
          const pri = PRIORITY_META[insight.priority]
          return (
            <li key={insight.key} className="relative p-4 pl-5">
              <span className={`absolute left-0 top-0 h-full w-1 ${pri.bar}`} aria-hidden />
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${pri.badge}`}>
                  {pri.label}
                </span>
                <span className="text-sm font-semibold text-slate-900">{insight.title}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{insight.why}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                  <ArrowRight className="h-3 w-3" /> {insight.impact}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {insight.actions.map((action) => {
                  const meta = ACTION_META[action]
                  const state = actioned[`${insight.key}:${action}`]
                  return (
                    <button
                      key={action}
                      type="button"
                      disabled={!!state}
                      onClick={() => runAction(insight, action)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors ${
                        state === 'done'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-white text-slate-700 ring-slate-200 hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200'
                      }`}
                    >
                      {state === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : state === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <meta.Icon className="h-3.5 w-3.5" />}
                      {state === 'done' ? 'Task created' : meta.label}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

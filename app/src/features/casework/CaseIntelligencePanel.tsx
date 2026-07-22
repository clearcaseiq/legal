/**
 * Case Intelligence panel (Phase 0 + Phase 1) — renders at the top of the case
 * Overview tab. Three sections, all driven by the deterministic Case
 * Intelligence engine plus the LLM question layer:
 *   1. AI Case Summary + Already Known ✓
 *   2. Missing Information (star-rated gaps with one-click actions)
 *   3. Intelligent Questions (case-specific, grounded)
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  UserPlus,
  Send,
  CalendarClock,
  RefreshCw,
  HelpCircle,
  Star,
} from 'lucide-react'
import {
  getCaseIntelligence,
  getCaseIntelligenceQuestions,
  runCaseIntelligenceGapAction,
  type CaseIntelligence,
  type CaseIntelligenceGap,
  type CaseIntelligenceGapAction,
  type IntelligentQuestion,
} from '../../lib/api'

const ACTION_META: Record<CaseIntelligenceGapAction, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  request_from_client: { label: 'Request from client', Icon: Send },
  assign_paralegal: { label: 'Assign to paralegal', Icon: UserPlus },
  generate_doc_request: { label: 'Document request', Icon: FileText },
  schedule_followup: { label: 'Schedule follow-up', Icon: CalendarClock },
}

const IMPACT_CHIP: Record<string, string> = {
  high: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  low: 'bg-slate-100 text-slate-600 ring-slate-200',
}

const SECTION_ORDER: IntelligentQuestion['section'][] = ['Liability', 'Medical', 'Damages', 'Insurance', 'Case Strategy']

function money(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0'
  if (value >= 1000) return `$${Math.round(value / 1000)}k`
  return `$${Math.round(value)}`
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center" aria-label={`${n} of 5 criticality`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3 w-3 ${i < n ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
      ))}
    </span>
  )
}

function SummaryStat({ label, value, tone = 'text-slate-900' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-white/70 px-3 py-2 ring-1 ring-inset ring-slate-200">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${tone}`}>{value}</p>
    </div>
  )
}

export default function CaseIntelligencePanel({ leadId }: { leadId: string }) {
  const [intel, setIntel] = useState<CaseIntelligence | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioned, setActioned] = useState<Record<string, 'loading' | 'done'>>({})

  const [questions, setQuestions] = useState<IntelligentQuestion[] | null>(null)
  const [qSource, setQSource] = useState<'ai' | 'baseline' | null>(null)
  const [qLoading, setQLoading] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    getCaseIntelligence(leadId)
      .then((data) => { if (alive) setIntel(data) })
      .catch((err: any) => { if (alive) setError(err?.response?.data?.error || 'Case intelligence not available yet') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [leadId])

  const loadQuestions = useCallback(() => {
    setQLoading(true)
    getCaseIntelligenceQuestions(leadId)
      .then((data) => { setQuestions(data.questions); setQSource(data.source) })
      .catch(() => { setQuestions([]); setQSource('baseline') })
      .finally(() => setQLoading(false))
  }, [leadId])

  // Auto-load questions once the deterministic intelligence is ready.
  useEffect(() => {
    if (intel && questions === null && !qLoading) loadQuestions()
  }, [intel, questions, qLoading, loadQuestions])

  const runAction = async (gap: CaseIntelligenceGap, action: CaseIntelligenceGapAction) => {
    const key = `${gap.key}:${action}`
    setActioned((prev) => ({ ...prev, [key]: 'loading' }))
    try {
      await runCaseIntelligenceGapAction(leadId, { label: gap.label, action, severity: gap.severity })
      setActioned((prev) => ({ ...prev, [key]: 'done' }))
    } catch {
      setActioned((prev) => { const next = { ...prev }; delete next[key]; return next })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-brand-500" /> Building case intelligence…
      </div>
    )
  }
  if (error || !intel) {
    return null // fail quietly — Overview still renders the rest
  }

  const s = intel.summary
  const grouped = SECTION_ORDER.map((section) => ({
    section,
    items: (questions || []).filter((q) => q.section === section),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="space-y-4">
      {/* AI Case Summary + Already Known */}
      <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/80 to-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"><Sparkles className="h-4 w-4" /></span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI Case Summary</h3>
            <p className="text-xs text-slate-500">Everything already collected during intake — don’t re-ask.</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryStat label="Severity" value={s.severity.label} />
          <SummaryStat label="Est. value" value={`${money(s.estimatedValue.low)}–${money(s.estimatedValue.high)}`} tone="text-emerald-700" />
          <SummaryStat label="Attorney interest" value={`${s.attorneyInterest}%`} />
          <SummaryStat label="Liability" value={s.liability.grade} />
          <SummaryStat label="Case strength" value={`${s.caseStrength}`} />
          <SummaryStat label="SOL" value={s.sol.daysRemaining != null ? `${s.sol.daysRemaining}d` : 'Confirm'} tone={s.sol.daysRemaining != null && s.sol.daysRemaining < 180 ? 'text-rose-600' : 'text-slate-900'} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {intel.known.map((k) => (
            <span key={k.key} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-inset ring-slate-200">
              <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
              <span className="font-medium text-slate-500">{k.label}:</span>
              <span className="font-semibold capitalize text-slate-800">{k.value}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Missing Information */}
      {intel.gaps.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500 text-white"><AlertTriangle className="h-4 w-4" /></span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Missing Information</h3>
              <p className="text-xs text-slate-500">What the AI could not determine — ranked by impact on the case.</p>
            </div>
          </div>

          <ul className="mt-3 space-y-2.5">
            {intel.gaps.map((gap) => (
              <li key={gap.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars n={gap.severity} />
                  <span className="text-sm font-semibold text-slate-900">{gap.label}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${IMPACT_CHIP[gap.valueImpact]}`}>
                    {gap.valueImpact} impact
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{gap.rationale}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {gap.actions.map((action) => {
                    const meta = ACTION_META[action]
                    const state = actioned[`${gap.key}:${action}`]
                    return (
                      <button
                        key={action}
                        type="button"
                        disabled={!!state}
                        onClick={() => runAction(gap, action)}
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
            ))}
          </ul>
        </div>
      )}

      {/* Intelligent Questions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500 text-white"><HelpCircle className="h-4 w-4" /></span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Intelligent Questions</h3>
              <p className="text-xs text-slate-500">
                Case-specific questions for this consultation{qSource === 'ai' ? ' · AI-personalized' : qSource === 'baseline' ? ' · curated baseline' : ''}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadQuestions}
            disabled={qLoading}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
          >
            {qLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Regenerate
          </button>
        </div>

        {qLoading && questions === null ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin text-violet-500" /> Generating questions…</div>
        ) : grouped.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No open questions — the file looks complete.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {grouped.map(({ section, items }) => (
              <div key={section}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{section}</p>
                <ul className="mt-1.5 space-y-1.5">
                  {items.map((q) => (
                    <li key={q.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                      <div className="flex items-start gap-2">
                        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${q.source === 'ai' ? 'bg-violet-400' : 'bg-slate-300'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800">{q.text}</p>
                          {q.whyAsked ? <p className="mt-0.5 text-xs text-slate-500">Why: {q.whyAsked}</p> : null}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${IMPACT_CHIP[q.valueImpact]}`}>{q.valueImpact}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

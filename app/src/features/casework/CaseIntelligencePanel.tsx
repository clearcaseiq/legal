/**
 * Case Intelligence panel — renders at the top of the case Overview tab.
 * Driven by the deterministic Case Intelligence engine:
 *   1. AI Case Summary + Already Known ✓
 *   2. Missing Information (star-rated gaps with one-click actions)
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
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
  Star,
  ChevronDown,
} from 'lucide-react'
import {
  getCaseIntelligence,
  runCaseIntelligenceGapAction,
  type CaseIntelligence,
  type CaseIntelligenceGap,
  type CaseIntelligenceGapAction,
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

function CollapsibleSection({
  title,
  subtitle,
  icon,
  badge,
  defaultOpen = true,
  headerActions,
  className,
  children,
}: {
  title: string
  subtitle?: string
  icon: ReactNode
  badge?: ReactNode
  defaultOpen?: boolean
  headerActions?: ReactNode
  className: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left hover:bg-black/[0.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          {icon}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              {badge}
            </div>
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {headerActions}
      </div>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}

export default function CaseIntelligencePanel({
  leadId,
  onUpdated,
}: {
  leadId: string
  /** Fired after intelligence loads/refreshes so sibling Overview widgets (Case Metrics) can stay in sync. */
  onUpdated?: () => void
}) {
  const [intel, setIntel] = useState<CaseIntelligence | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioned, setActioned] = useState<Record<string, 'loading' | 'done'>>({})
  const [refreshing, setRefreshing] = useState(false)
  const onUpdatedRef = useRef(onUpdated)
  onUpdatedRef.current = onUpdated

  const loadIntel = useCallback((opts?: { soft?: boolean }) => {
    if (!opts?.soft) {
      setLoading(true)
      setError(null)
    }
    return getCaseIntelligence(leadId)
      .then((data) => {
        setIntel(data)
        onUpdatedRef.current?.()
      })
      .catch((err: any) => {
        if (!opts?.soft) setError(err?.response?.data?.error || 'Case intelligence not available yet')
      })
      .finally(() => {
        if (!opts?.soft) setLoading(false)
      })
  }, [leadId])

  const refreshSummary = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await loadIntel({ soft: true })
    } finally {
      setRefreshing(false)
    }
  }, [refreshing, loadIntel])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    getCaseIntelligence(leadId)
      .then((data) => {
        if (!alive) return
        setIntel(data)
        onUpdatedRef.current?.()
      })
      .catch((err: any) => { if (alive) setError(err?.response?.data?.error || 'Case intelligence not available yet') })
      .finally(() => { if (alive) setLoading(false) })
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadIntel({ soft: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [leadId, loadIntel])

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
  const openGaps = intel.gaps.filter((g) => !g.resolved).length

  return (
    <div className="space-y-4">
      <CollapsibleSection
        title="AI Case Summary"
        subtitle="Everything already collected during intake. Don’t re-ask."
        className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/80 to-white p-4 shadow-sm"
        icon={<span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-white"><Sparkles className="h-4 w-4" /></span>}
        headerActions={(
          <button
            type="button"
            onClick={() => void refreshSummary()}
            disabled={refreshing}
            title="Refresh case summary"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryStat label="Severity" value={s.severity.label} />
          <SummaryStat label="Underwriting range" value={`${money(s.estimatedValue.low)}–${money(s.estimatedValue.high)}`} tone="text-emerald-700" />
          <SummaryStat label="Liability" value={`${s.liability.grade} (${s.liability.score})`} />
          <SummaryStat label="Case strength" value={`${s.caseStrength}`} />
          <SummaryStat label="SOL" value={s.sol.daysRemaining != null ? `${s.sol.daysRemaining}d` : 'Confirm'} tone={s.sol.daysRemaining != null && s.sol.daysRemaining < 180 ? 'text-rose-600' : 'text-slate-900'} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {intel.known
            .filter((k) => k.key !== 'attorney_interest' && !/attorney interest/i.test(k.label))
            .map((k) => (
            <span key={k.key} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-inset ring-slate-200">
              <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
              <span className="font-medium text-slate-500">{k.label}:</span>
              <span className="font-semibold capitalize text-slate-800">{k.value}</span>
            </span>
          ))}
        </div>
      </CollapsibleSection>

      {intel.gaps.length > 0 && (
        <CollapsibleSection
          title="Missing Information"
          subtitle="Ranked by impact. Collected items stay on the list and are crossed off automatically."
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          icon={<span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-500 text-white"><AlertTriangle className="h-4 w-4" /></span>}
          badge={openGaps > 0 ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              {openGaps} open
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              All resolved
            </span>
          )}
        >
          <ul className="space-y-2.5">
            {intel.gaps.map((gap) =>
              gap.resolved ? (
                <li key={gap.key} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-slate-500 line-through">{gap.label}</span>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Resolved
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {gap.resolvedByName
                      ? `Answered during intake questions by ${gap.resolvedByName}.`
                      : gap.rationale || 'Collected on the file.'}
                  </p>
                </li>
              ) : (
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
              ),
            )}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  )
}

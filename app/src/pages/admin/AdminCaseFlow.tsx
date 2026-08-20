import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getAdminCaseFlow,
  type AdminCaseFlowCase,
  type AdminCaseFlowStage,
} from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'
import { formatClaimType } from '../../lib/claimTypes'
import { formatCaseId } from '../../lib/caseId'
import {
  RefreshCw,
  ChevronRight,
  TriangleAlert,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { PageHeader, EmptyState } from '../../features/shared/ui'

// Per-stage accent so the pipeline reads left-to-right at a glance. Kept as full
// class strings (not interpolated) so Tailwind's JIT never purges them.
const STAGE_STYLE: Record<
  string,
  { dot: string; bar: string; headerRing: string; softBg: string }
> = {
  intake: {
    dot: 'bg-slate-400',
    bar: 'bg-slate-400',
    headerRing: 'ring-slate-200 dark:ring-slate-700',
    softBg: 'bg-slate-50 dark:bg-slate-900/40',
  },
  routing: {
    dot: 'bg-sky-500',
    bar: 'bg-sky-500',
    headerRing: 'ring-sky-200 dark:ring-sky-900',
    softBg: 'bg-sky-50 dark:bg-sky-950/30',
  },
  awaiting_approval: {
    dot: 'bg-violet-500',
    bar: 'bg-violet-500',
    headerRing: 'ring-violet-200 dark:ring-violet-900',
    softBg: 'bg-violet-50 dark:bg-violet-950/30',
  },
  manual_review: {
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    headerRing: 'ring-amber-200 dark:ring-amber-900',
    softBg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  matched: {
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    headerRing: 'ring-emerald-200 dark:ring-emerald-900',
    softBg: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  engaged: {
    dot: 'bg-teal-500',
    bar: 'bg-teal-500',
    headerRing: 'ring-teal-200 dark:ring-teal-900',
    softBg: 'bg-teal-50 dark:bg-teal-950/30',
  },
  closed: {
    dot: 'bg-slate-300 dark:bg-slate-600',
    bar: 'bg-slate-300 dark:bg-slate-600',
    headerRing: 'ring-slate-200 dark:ring-slate-800',
    softBg: 'bg-slate-50 dark:bg-slate-900/40',
  },
}

const fallbackStyle = STAGE_STYLE.intake

export default function AdminCaseFlow() {
  const navigate = useNavigate()
  const [stages, setStages] = useState<AdminCaseFlowStage[]>([])
  const [cases, setCases] = useState<AdminCaseFlowCase[]>([])
  const [meta, setMeta] = useState<{ totalCases: number; stuckCases: number; responseDeadlineMinutes: number } | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stuckOnly, setStuckOnly] = useState(false)
  // Clicking a stage in the funnel header scopes the board below to that stage so
  // an admin can see exactly which cases sit there. Null = show every stage.
  const [stageFilter, setStageFilter] = useState<string | null>(null)
  const boardRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setError(null)
      const data = await getAdminCaseFlow()
      setStages(data.stages || [])
      setCases(data.cases || [])
      setMeta(data.meta || null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load case flow')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Background refresh so a live dispatch console stays current without a spinner.
  useEffect(() => {
    const interval = setInterval(() => load(false), 30000)
    const onFocus = () => load(false)
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  const visibleCases = useMemo(
    () => (stuckOnly ? cases.filter((c) => c.stuck) : cases),
    [cases, stuckOnly],
  )

  const casesByStage = useMemo(() => {
    const map: Record<string, AdminCaseFlowCase[]> = {}
    for (const s of stages) map[s.key] = []
    for (const c of visibleCases) {
      if (!map[c.stage]) map[c.stage] = []
      map[c.stage].push(c)
    }
    return map
  }, [visibleCases, stages])

  // The board renders every stage unless the admin drilled into one.
  const boardStages = useMemo(
    () => (stageFilter ? stages.filter((s) => s.key === stageFilter) : stages),
    [stages, stageFilter],
  )
  const boardCaseCount = useMemo(
    () =>
      boardStages.reduce((sum, s) => sum + (casesByStage[s.key]?.length || 0), 0),
    [boardStages, casesByStage],
  )
  const selectedStageLabel = stageFilter ? stages.find((s) => s.key === stageFilter)?.label ?? null : null

  const maxCount = Math.max(1, ...stages.map((s) => s.count))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Case flow"
        description="Where every live case sits in the pipeline — and which ones are stuck."
        actions={
          <>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <input
                type="checkbox"
                checked={stuckOnly}
                onChange={(e) => setStuckOnly(e.target.checked)}
                className="rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              Show stuck only
            </label>
            <button
              onClick={() => load(true)}
              className="btn-outline inline-flex items-center gap-2 text-ui-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Stuck summary strip */}
      {meta && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
            meta.stuckCases > 0
              ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40'
              : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40'
          }`}
        >
          <div className="flex items-center gap-3">
            {meta.stuckCases > 0 ? (
              <TriangleAlert className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            ) : (
              <Clock className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            <div>
              <div
                className={`text-sm font-semibold ${
                  meta.stuckCases > 0 ? 'text-red-900 dark:text-red-200' : 'text-emerald-900 dark:text-emerald-200'
                }`}
              >
                {meta.stuckCases > 0
                  ? `${meta.stuckCases} case${meta.stuckCases === 1 ? '' : 's'} stuck and need attention`
                  : 'No cases are stuck right now'}
              </div>
              <div
                className={`mt-0.5 text-xs ${
                  meta.stuckCases > 0 ? 'text-red-700 dark:text-red-300/80' : 'text-emerald-700 dark:text-emerald-300/80'
                }`}
              >
                {meta.totalCases} case{meta.totalCases === 1 ? '' : 's'} in the pipeline · attorney response window{' '}
                {Math.round(meta.responseDeadlineMinutes / 60)}h
              </div>
            </div>
          </div>
          {meta.stuckCases > 0 && !stuckOnly && (
            <button
              type="button"
              onClick={() => setStuckOnly(true)}
              className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
            >
              Show stuck only
            </button>
          )}
        </div>
      )}

      {/* Funnel header: stage nodes with counts + proportional bar */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-stretch gap-1">
          {stages.map((s, i) => {
            const style = STAGE_STYLE[s.key] || fallbackStyle
            const selected = stageFilter === s.key
            return (
              <div key={s.key} className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => {
                    setStageFilter((prev) => (prev === s.key ? null : s.key))
                    boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  aria-pressed={selected}
                  title={`Show ${s.count} case${s.count === 1 ? '' : 's'} in ${s.label}`}
                  className={`flex w-40 flex-col rounded-xl bg-white p-3 text-left shadow-sm ring-1 transition hover:shadow-md hover:ring-brand-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-slate-900 ${
                    selected
                      ? 'ring-2 ring-brand-500 dark:ring-brand-400'
                      : 'ring-slate-200 dark:ring-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                    <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {s.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {s.count}
                    </span>
                    {s.stuckCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                        <TriangleAlert className="h-3 w-3" />
                        {s.stuckCount}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${style.bar}`}
                      style={{ width: `${Math.round((s.count / maxCount) * 100)}%` }}
                    />
                  </div>
                </button>
                {i < stages.length - 1 && (
                  <div className="flex items-center px-0.5 text-slate-300 dark:text-slate-600">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Active stage-filter banner */}
      {stageFilter && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-900 dark:bg-brand-950/30">
          <div className="text-sm font-medium text-brand-900 dark:text-brand-200">
            Showing <span className="font-semibold">{selectedStageLabel}</span> · {boardCaseCount} case
            {boardCaseCount === 1 ? '' : 's'}
          </div>
          <button
            type="button"
            onClick={() => setStageFilter(null)}
            className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-sm font-medium text-brand-800 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-200"
          >
            Show all stages
          </button>
        </div>
      )}

      {/* Kanban board of stage columns */}
      <div ref={boardRef}>
      {loading ? (
        <EmptyState message="Loading case flow…" />
      ) : boardCaseCount === 0 ? (
        <EmptyState
          message={
            stageFilter
              ? `No cases in ${selectedStageLabel}${stuckOnly ? ' are stuck' : ''} right now.`
              : stuckOnly
                ? 'No stuck cases — everything is moving.'
                : 'No cases in the pipeline yet.'
          }
        />
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {boardStages.map((s) => {
              const style = STAGE_STYLE[s.key] || fallbackStyle
              const stageCases = casesByStage[s.key] || []
              return (
                <div key={s.key} className="flex w-72 shrink-0 flex-col">
                  <div
                    className={`sticky top-0 z-10 mb-2 flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ${style.headerRing} dark:bg-slate-900`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {s.stuckCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                          {s.stuckCount}
                        </span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {stageCases.length}
                      </span>
                    </div>
                  </div>

                  <div className={`min-h-[8rem] flex-1 space-y-2 rounded-xl p-2 ${style.softBg}`}>
                    {stageCases.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-slate-400 dark:text-slate-600">
                        {stuckOnly ? 'None stuck' : 'Empty'}
                      </p>
                    ) : (
                      stageCases.map((c) => (
                        <CaseCard key={c.id} c={c} onOpen={() => navigate(`/admin/cases/${c.id}`)} />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

function CaseCard({ c, onOpen }: { c: AdminCaseFlowCase; onOpen: () => void }) {
  const title =
    c.plaintiffName ||
    c.referenceCode ||
    formatCaseId({ id: c.id, claimType: c.claimType || undefined, createdAt: undefined })

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group w-full rounded-lg border bg-white p-3 text-left shadow-sm transition hover:shadow-md dark:bg-slate-900 ${
        c.stuck
          ? 'border-red-300 ring-1 ring-red-200 dark:border-red-800 dark:ring-red-900'
          : 'border-slate-200 hover:border-brand-300 dark:border-slate-800'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
          <Clock className="h-3 w-3" />
          {c.ageLabel}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
          {formatClaimType(c.claimType || '')}
        </span>
        {c.venueState && <span>{c.venueState}</span>}
        {c.valueEstimate != null && (
          <span className="tabular-nums text-slate-600 dark:text-slate-300">{formatCurrency(c.valueEstimate)}</span>
        )}
      </div>

      {(c.assignedAttorneyName || c.latestIntro) && (
        <div className="mt-1.5 flex items-center gap-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {c.assignedAttorneyName || c.latestIntro?.name}
            {c.latestIntro && !c.assignedAttorneyName ? ` · ${c.latestIntro.status.toLowerCase()}` : ''}
            {c.waveNumber ? ` · wave ${c.waveNumber}` : ''}
          </span>
        </div>
      )}

      {c.stuck && c.stuckReason && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md bg-red-50 px-2 py-1.5 text-[11px] font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
          <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{c.stuckReason}</span>
        </div>
      )}

      {c.stage === 'manual_review' && c.manualReviewReason && !c.stuck && (
        <div className="mt-2 truncate text-[11px] text-amber-700 dark:text-amber-400">{c.manualReviewReason}</div>
      )}
    </button>
  )
}

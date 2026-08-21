import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getAdminCaseFlow,
  type AdminCaseFlowCase,
  type AdminCaseFlowSort,
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
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react'
import { PageHeader, EmptyState, SectionCard, TableScroll, THeadRow, Th, Tr, Td, Pagination } from '../../features/shared/ui'

// Per-stage accent so the funnel reads left-to-right at a glance. Kept as full
// class strings (not interpolated) so Tailwind's JIT never purges them.
const STAGE_STYLE: Record<string, { dot: string; bar: string }> = {
  intake: { dot: 'bg-slate-400', bar: 'bg-slate-400' },
  routing: { dot: 'bg-sky-500', bar: 'bg-sky-500' },
  awaiting_approval: { dot: 'bg-violet-500', bar: 'bg-violet-500' },
  manual_review: { dot: 'bg-amber-500', bar: 'bg-amber-500' },
  matched: { dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  engaged: { dot: 'bg-teal-500', bar: 'bg-teal-500' },
  closed: { dot: 'bg-slate-300 dark:bg-slate-600', bar: 'bg-slate-300 dark:bg-slate-600' },
}

const fallbackStyle = STAGE_STYLE.intake

const DEFAULT_LIMIT = 50

export default function AdminCaseFlow() {
  const navigate = useNavigate()
  const [stages, setStages] = useState<AdminCaseFlowStage[]>([])
  const [cases, setCases] = useState<AdminCaseFlowCase[]>([])
  const [meta, setMeta] = useState<{
    totalCases: number
    stuckCases: number
    filteredCases: number
    truncated: boolean
    responseDeadlineMinutes: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stuckOnly, setStuckOnly] = useState(false)
  // Clicking a stage in the funnel header scopes the table below to that stage so
  // an admin can see exactly which cases sit there. Null = every stage.
  const [stageFilter, setStageFilter] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sort, setSort] = useState<AdminCaseFlowSort>('age')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [offset, setOffset] = useState(0)
  const tableRef = useRef<HTMLDivElement | null>(null)

  // Filtering, sorting and paging all run server-side across the whole pipeline.
  // Doing any of it in the browser would only ever cover the rows already
  // fetched, which is the failure mode this table replaced.
  const [appliedSearch, setAppliedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(searchTerm.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Any filter change invalidates the page position. Resetting during render
  // rather than in an effect means the fetch below never runs once with new
  // filters and a stale offset, which would race two requests.
  const filterKey = `${stageFilter}|${stuckOnly}|${appliedSearch}|${sort}|${direction}|${limit}`
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey)
    setOffset(0)
  }

  const load = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true)
        setError(null)
        const data = await getAdminCaseFlow({
          stage: stageFilter,
          stuckOnly,
          search: appliedSearch || undefined,
          sort,
          direction,
          limit,
          offset,
        })
        setStages(data.stages || [])
        setCases(data.cases || [])
        setMeta(data.meta || null)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load case flow')
      } finally {
        setLoading(false)
      }
    },
    [stageFilter, stuckOnly, appliedSearch, sort, direction, limit, offset],
  )

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

  const selectedStageLabel = stageFilter ? stages.find((s) => s.key === stageFilter)?.label ?? null : null
  const maxCount = Math.max(1, ...stages.map((s) => s.count))
  const filteredCount = meta?.filteredCases ?? 0
  const filtersActive = Boolean(stageFilter || stuckOnly || appliedSearch)

  const toggleSort = (field: AdminCaseFlowSort) => {
    if (sort === field) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(field)
      // Age and value are most useful worst-first; names read better A–Z.
      setDirection(field === 'plaintiff' || field === 'stage' ? 'asc' : 'desc')
    }
  }

  const SortableTh = ({
    field,
    label,
    align = 'left',
  }: {
    field: AdminCaseFlowSort
    label: string
    align?: 'left' | 'right'
  }) => (
    <Th align={align}>
      <button
        type="button"
        onClick={() => toggleSort(field)}
        title={`Sort by ${label}`}
        aria-sort={sort === field ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`inline-flex items-center gap-1 rounded font-bold uppercase tracking-wider transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-slate-100 ${
          align === 'right' ? 'flex-row-reverse' : ''
        }`}
      >
        {label}
        {sort !== field ? (
          <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden />
        ) : direction === 'asc' ? (
          <ArrowUp className="h-3 w-3 text-brand-600" aria-hidden />
        ) : (
          <ArrowDown className="h-3 w-3 text-brand-600" aria-hidden />
        )}
      </button>
    </Th>
  )

  const emptyMessage = useMemo(() => {
    if (appliedSearch) return `No cases match “${appliedSearch}”.`
    if (stageFilter) return `No cases in ${selectedStageLabel}${stuckOnly ? ' are stuck' : ''} right now.`
    if (stuckOnly) return 'No stuck cases — everything is moving.'
    return 'No cases in the pipeline yet.'
  }, [appliedSearch, stageFilter, selectedStageLabel, stuckOnly])

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
                  ? `${meta.stuckCases.toLocaleString()} case${meta.stuckCases === 1 ? '' : 's'} stuck and need attention`
                  : 'No cases are stuck right now'}
              </div>
              <div
                className={`mt-0.5 text-xs ${
                  meta.stuckCases > 0 ? 'text-red-700 dark:text-red-300/80' : 'text-emerald-700 dark:text-emerald-300/80'
                }`}
              >
                {meta.totalCases.toLocaleString()} case{meta.totalCases === 1 ? '' : 's'} in the pipeline · attorney
                response window {Math.round(meta.responseDeadlineMinutes / 60)}h
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

      {/* The pipeline is larger than the server will scan in one pass, so say so
          rather than presenting partial counts as the whole picture. */}
      {meta?.truncated && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Showing the {meta.totalCases.toLocaleString()} most recently updated cases. Older cases exist beyond this
            window and are not counted in the stages below.
          </span>
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
                    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  aria-pressed={selected}
                  title={`Show ${s.count} case${s.count === 1 ? '' : 's'} in ${s.label}`}
                  className={`flex w-40 flex-col rounded-xl bg-white p-3 text-left shadow-sm ring-1 transition hover:shadow-md hover:ring-brand-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-slate-900 ${
                    selected ? 'ring-2 ring-brand-500 dark:ring-brand-400' : 'ring-slate-200 dark:ring-slate-800'
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

      <div ref={tableRef}>
        <SectionCard
          title={
            <>
              {stageFilter ? selectedStageLabel : 'All cases'}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {filteredCount.toLocaleString()}
              </span>
            </>
          }
          trailing={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name, case, attorney…"
                  aria-label="Search cases"
                  className="input w-56 py-1.5 pl-8"
                />
              </div>
              {filtersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setStageFilter(null)
                    setStuckOnly(false)
                    setSearchTerm('')
                  }}
                  className="btn-outline px-2.5 py-1.5 text-ui-sm"
                >
                  Clear filters
                </button>
              )}
            </div>
          }
        >
          {loading && cases.length === 0 ? (
            <EmptyState message="Loading case flow…" />
          ) : filteredCount === 0 ? (
            <EmptyState message={emptyMessage} />
          ) : (
            <>
              <TableScroll>
                <THeadRow>
                  <SortableTh field="plaintiff" label="Case" />
                  <SortableTh field="stage" label="Stage" />
                  <Th>Claim type</Th>
                  <Th>State</Th>
                  <SortableTh field="value" label="Value" align="right" />
                  <SortableTh field="age" label="In stage" align="right" />
                  <Th>Routing</Th>
                  <Th>Issue</Th>
                </THeadRow>
                <tbody>
                  {cases.map((c) => (
                    <CaseRow key={c.id} c={c} onOpen={() => navigate(`/admin/cases/${c.id}`)} />
                  ))}
                </tbody>
              </TableScroll>

              <Pagination
                total={filteredCount}
                limit={limit}
                offset={offset}
                disabled={loading}
                onChange={(next) => {
                  setOffset(next)
                  tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                // Offset resets via the filter-key check above.
                onLimitChange={setLimit}
                className="mt-4"
              />
            </>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

function CaseRow({ c, onOpen }: { c: AdminCaseFlowCase; onOpen: () => void }) {
  const style = STAGE_STYLE[c.stage] || fallbackStyle
  const caseLabel = c.referenceCode || formatCaseId({ id: c.id, claimType: c.claimType || undefined })
  const routing = c.assignedAttorneyName || c.latestIntro?.name || null

  return (
    <Tr
      onClick={onOpen}
      className={c.stuck ? 'bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/40' : ''}
    >
      <Td>
        <div className="flex items-center gap-2">
          {/* The stuck marker rides in the first column so it survives horizontal
              scrolling on a narrow screen, where a trailing badge would not. */}
          {c.stuck && <TriangleAlert className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-label="Stuck" />}
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-900 dark:text-slate-100">
              {c.plaintiffName || caseLabel}
            </div>
            {c.plaintiffName && (
              <div className="truncate font-mono text-[11px] text-slate-400 dark:text-slate-500">{caseLabel}</div>
            )}
          </div>
        </div>
      </Td>
      <Td>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-700 dark:text-slate-300">
          <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
          {c.stageLabel}
        </span>
      </Td>
      <Td className="whitespace-nowrap text-slate-600 dark:text-slate-400">{formatClaimType(c.claimType || '')}</Td>
      <Td className="text-slate-600 dark:text-slate-400">{c.venueState || '—'}</Td>
      <Td align="right" className="tabular-nums text-slate-700 dark:text-slate-300">
        {c.valueEstimate != null ? formatCurrency(c.valueEstimate) : '—'}
      </Td>
      <Td
        align="right"
        className={`tabular-nums whitespace-nowrap ${
          c.stuck ? 'font-semibold text-red-700 dark:text-red-300' : 'text-slate-600 dark:text-slate-400'
        }`}
      >
        <span title={c.enteredStageAt ? `Entered stage ${new Date(c.enteredStageAt).toLocaleString()}` : undefined}>
          {c.ageLabel}
        </span>
      </Td>
      <Td className="text-slate-600 dark:text-slate-400">
        {routing ? (
          <span className="flex items-center gap-1">
            <ArrowRight className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">
              {routing}
              {c.latestIntro && !c.assignedAttorneyName ? ` · ${c.latestIntro.status.toLowerCase()}` : ''}
              {c.waveNumber ? ` · wave ${c.waveNumber}` : ''}
            </span>
          </span>
        ) : (
          '—'
        )}
      </Td>
      <Td>
        {c.stuck && c.stuckReason ? (
          <span className="text-xs font-medium text-red-700 dark:text-red-300">{c.stuckReason}</span>
        ) : c.manualReviewReason ? (
          <span className="text-xs text-amber-700 dark:text-amber-400">{c.manualReviewReason}</span>
        ) : (
          <span className="text-slate-400 dark:text-slate-600">—</span>
        )}
      </Td>
    </Tr>
  )
}

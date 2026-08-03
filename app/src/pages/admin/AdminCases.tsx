import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAllAdminCases, bulkRouteCases, getAdminAttorneys } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { formatCaseId } from '../../lib/caseId'
import { CLAIM_TYPE_OPTIONS, claimTypeSynonyms, formatClaimType } from '../../lib/claimTypes'
import {
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ExternalLink,
  FolderOpen,
  Download,
  Send,
  X,
} from 'lucide-react'
import EmptyState from '../../components/EmptyState'
import ErrorBanner from '../../components/ErrorBanner'
import { PageHeader, Pagination } from '../../features/shared/ui'

type SortField =
  | 'createdAt'
  | 'caseId'
  | 'plaintiff'
  | 'claimType'
  | 'venueState'
  | 'status'
  | 'routingStatus'
  | 'interest'
  | 'viability'
  | 'estimatedValue'
type SortDirection = 'asc' | 'desc'

// Sort unnamed plaintiffs last regardless of direction rather than letting an
// empty string float to the top of an A-Z sort.
const plaintiffSortKey = (c: any) => {
  const name = c.user ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() : ''
  return name ? name.toLowerCase() : '\uffff'
}

const CASE_TABS = [
  { id: 'all', label: 'All cases' },
  { id: 'queue', label: 'Queue' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'today', label: 'New today' },
] as const

type CaseTab = typeof CASE_TABS[number]['id']

function getRoutingStatus(c: any) {
  const intros = Array.isArray(c.introductions) ? c.introductions : []
  // "Accepted" must mean an attorney actually accepted the intro — not merely that
  // the lead was routing-locked (which also happens on admin assignment/retention).
  if (intros.some((i: any) => i.status === 'ACCEPTED')) return 'Accepted'
  if (intros.length > 0 || c.leadSubmission?.assignedAttorney) return 'Waiting'
  return 'Queue'
}

function getCaseTabFromFilters(routingStatus: string, createdToday: boolean): CaseTab {
  if (createdToday) return 'today'
  if (routingStatus === 'queue') return 'queue'
  if (routingStatus === 'waiting') return 'waiting'
  if (routingStatus === 'accepted') return 'accepted'
  return 'all'
}

export default function AdminCases() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [claimTypeFilter, setClaimTypeFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [routingStatusFilter, setRoutingStatusFilter] = useState(
    () => searchParams.get('routingStatus') || '',
  )
  const [createdTodayOnly, setCreatedTodayOnly] = useState(() => {
    const ct = searchParams.get('createdToday')
    return ct === '1' || ct === 'true'
  })
  const [activeCaseTab, setActiveCaseTab] = useState<CaseTab>(() =>
    getCaseTabFromFilters(searchParams.get('routingStatus') || '', searchParams.get('createdToday') === '1' || searchParams.get('createdToday') === 'true'),
  )
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(100)
  const [offset, setOffset] = useState(0)

  // Bulk routing + export. These existed only in the retired AdminDashboard, so
  // rebuilding them here restores a capability admins lost when this page replaced it.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [attorneys, setAttorneys] = useState<any[]>([])
  const [attorneyChoice, setAttorneyChoice] = useState('')
  const [attorneyEmail, setAttorneyEmail] = useState('')
  const [routingMessage, setRoutingMessage] = useState('')
  const [autoRoute, setAutoRoute] = useState(true)
  const [routing, setRouting] = useState(false)
  const [routeSuccess, setRouteSuccess] = useState<string | null>(null)

  useEffect(() => {
    const rs = searchParams.get('routingStatus') || ''
    const ct = searchParams.get('createdToday')
    setRoutingStatusFilter(rs)
    setCreatedTodayOnly(ct === '1' || ct === 'true')
    setActiveCaseTab(getCaseTabFromFilters(rs, ct === '1' || ct === 'true'))
  }, [searchParams])

  useEffect(() => {
    setActiveCaseTab(getCaseTabFromFilters(routingStatusFilter, createdTodayOnly))
  }, [routingStatusFilter, createdTodayOnly])

  // Search runs server-side so it covers every matching case, not only the rows
  // in the loaded page. Debounced so typing doesn't fire a request per keystroke.
  const [appliedSearch, setAppliedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(searchTerm.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Any filter change invalidates the page position. Resetting during render
  // (rather than in an effect) means the fetch effect below never runs once
  // with new filters and a stale offset, which would race two requests.
  const filterKey = `${claimTypeFilter}|${stateFilter}|${routingStatusFilter}|${createdTodayOnly}|${appliedSearch}|${limit}`
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey)
    setOffset(0)
    setSelectedIds(new Set())
  }

  const loadCases = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllAdminCases({
        // Sent as every equivalent slug so the filter also matches rows written
        // under an older spelling of the same type.
        claimType: claimTypeFilter ? claimTypeSynonyms(claimTypeFilter).join(',') : undefined,
        state: stateFilter || undefined,
        routingStatus: routingStatusFilter || undefined,
        createdToday: createdTodayOnly || undefined,
        search: appliedSearch || undefined,
        limit,
        offset,
      })
      setCases(data.cases || [])
      setTotal(data.total ?? (data.cases?.length || 0))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load cases')
    } finally {
      setLoading(false)
    }
  }, [claimTypeFilter, stateFilter, routingStatusFilter, createdTodayOnly, appliedSearch, limit, offset])

  useEffect(() => {
    loadCases()
  }, [loadCases])

  // Memoized: `sortedCases` feeds a selection-reconciliation effect, so a fresh
  // array identity on every render re-ran that effect (and re-sorted the whole
  // page) on every keystroke.
  const sortedCases = useMemo(
    () =>
      [...cases].sort((a, b) => {
        let aVal: any, bVal: any
        switch (sortField) {
          case 'createdAt':
            aVal = new Date(a.createdAt).getTime()
            bVal = new Date(b.createdAt).getTime()
            break
          case 'caseId':
            aVal = formatCaseId({ id: a.id, claimType: a.claimType, createdAt: a.createdAt }).toLowerCase()
            bVal = formatCaseId({ id: b.id, claimType: b.claimType, createdAt: b.createdAt }).toLowerCase()
            break
          case 'plaintiff':
            aVal = plaintiffSortKey(a)
            bVal = plaintiffSortKey(b)
            break
          case 'routingStatus':
            aVal = getRoutingStatus(a).toLowerCase()
            bVal = getRoutingStatus(b).toLowerCase()
            break
          case 'interest':
            aVal = a.introductions?.length ?? a.counts?.introductions ?? 0
            bVal = b.introductions?.length ?? b.counts?.introductions ?? 0
            break
          case 'claimType':
            aVal = (a.claimType || '').toLowerCase()
            bVal = (b.claimType || '').toLowerCase()
            break
          case 'venueState':
            aVal = (a.venueState || '').toLowerCase()
            bVal = (b.venueState || '').toLowerCase()
            break
          case 'status':
            aVal = (a.status || '').toLowerCase()
            bVal = (b.status || '').toLowerCase()
            break
          case 'viability':
            aVal = a.prediction?.viability?.overall ?? 0
            bVal = b.prediction?.viability?.overall ?? 0
            break
          case 'estimatedValue':
            aVal = a.prediction?.bands?.median ?? 0
            bVal = b.prediction?.bands?.median ?? 0
            break
          default:
            return 0
        }
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      }),
    [cases, sortField, sortDirection],
  )

  // Search and sort run over the loaded page, not the whole result set, so say
  // so rather than letting an admin think they sorted all 1,200 cases.
  const isPaged = total > cases.length

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Only offer bulk routing for cases that haven't been routed yet — routing an
  // already-accepted case is a mistake, not a bulk operation.
  const routableSelection = useMemo(
    () => sortedCases.filter((c) => selectedIds.has(c.id) && getRoutingStatus(c) === 'Queue'),
    [sortedCases, selectedIds],
  )

  // Drop ids that fell out of the current result set so the count never claims
  // more than what's actually selected on screen.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev
      const visible = new Set(sortedCases.map((c) => c.id))
      const next = new Set([...prev].filter((id) => visible.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [sortedCases])

  const toggleOne = (caseId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(caseId)) next.delete(caseId)
      else next.add(caseId)
      return next
    })
  }

  const allSelected = sortedCases.length > 0 && selectedIds.size === sortedCases.length
  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(sortedCases.map((c) => c.id)))

  const openRouteModal = () => {
    setRouteSuccess(null)
    setShowRouteModal(true)
    if (attorneys.length === 0) {
      getAdminAttorneys()
        .then((data) => setAttorneys(data?.attorneys || []))
        .catch(() => setAttorneys([]))
    }
  }

  const handleBulkRoute = async () => {
    const ids = routableSelection.map((c) => c.id)
    if (ids.length === 0) {
      setError('Select at least one routable (Queue) case')
      return
    }
    const target = attorneyEmail.trim() || attorneyChoice
    if (!autoRoute && !target) {
      setError('Choose an attorney, or switch to auto-route')
      return
    }

    setRouting(true)
    setError(null)
    setRouteSuccess(null)
    try {
      const result = await bulkRouteCases(ids, autoRoute ? undefined : target, routingMessage || undefined, {
        autoRoute,
        skipEligibilityCheck: !autoRoute,
        inviteIfMissing: Boolean(attorneyEmail.trim()),
      })
      const failed = Number(result?.failed || 0)
      setRouteSuccess(
        `Routed ${result?.routed ?? 0} case${result?.routed === 1 ? '' : 's'}.${failed > 0 ? ` ${failed} failed.` : ''}`,
      )
      if (failed > 0 && Array.isArray(result?.errors) && result.errors.length > 0) {
        setError(result.errors.map((e: any) => `${e.caseId}: ${e.error}`).join(' | '))
      }
      setSelectedIds(new Set())
      setShowRouteModal(false)
      setAttorneyChoice('')
      setAttorneyEmail('')
      setRoutingMessage('')
      loadCases()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to route cases')
    } finally {
      setRouting(false)
    }
  }

  const exportCsv = () => {
    // Export the selection when there is one, otherwise the loaded page. This
    // cannot cover rows the server hasn't sent, so the button title says so.
    const rowsSource = selectedIds.size > 0 ? sortedCases.filter((c) => selectedIds.has(c.id)) : sortedCases
    const headers = ['Case ID', 'Claim type', 'Plaintiff', 'Email', 'Location', 'Routing status', 'Viability', 'Est. value', 'Submitted']
    const rows = rowsSource.map((c) => [
      formatCaseId({ id: c.id, claimType: c.claimType, createdAt: c.createdAt }),
      formatClaimType(c.claimType),
      c.user ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() || 'Anonymous' : 'Anonymous',
      c.user?.email || '',
      `${c.venueCounty ? `${c.venueCounty}, ` : ''}${c.venueState || ''}`,
      getRoutingStatus(c),
      c.prediction?.viability?.overall != null ? `${Math.round(c.prediction.viability.overall * 100)}%` : '',
      c.prediction?.bands?.median ? formatCurrency(c.prediction.bands.median) : '',
      formatDate(c.createdAt),
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `cases_${activeCaseTab}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const applyCaseTab = (tab: CaseTab) => {
    setActiveCaseTab(tab)
    if (tab === 'today') {
      setCreatedTodayOnly(true)
      setRoutingStatusFilter('')
      return
    }
    setCreatedTodayOnly(false)
    setRoutingStatusFilter(tab === 'all' ? '' : tab)
  }

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDirection === 'asc' ? (
        <ChevronUp className="h-4 w-4 text-slate-700" />
      ) : (
        <ChevronDown className="h-4 w-4 text-slate-700" />
      )
    ) : (
      // Inactive but sortable: show a clearly visible (not near-invisible) indicator
      // so the column reads as clickable without waiting for a first click (CP-320).
      <ChevronsUpDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600" aria-hidden />
    )

  /**
   * A sortable header. The affordance is a real <button> carrying aria-sort on
   * the cell — previously the click lived on the <th> with an aria-hidden icon,
   * so the column read as having no sort control at all to keyboard and
   * assistive-tech users (CP-320).
   */
  const SortableTh = ({ field, label }: { field: SortField; label: string }) => (
    <th
      scope="col"
      aria-sort={sortField === field ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="py-3 px-4 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400"
    >
      <button
        type="button"
        onClick={() => handleSort(field)}
        title={`Sort by ${label}`}
        className="group -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium uppercase transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-slate-100"
      >
        {label}
        <SortIcon field={field} />
      </button>
    </th>
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Cases"
          actions={
            <>
              <button
                onClick={exportCsv}
                disabled={sortedCases.length === 0}
                className="btn-outline inline-flex items-center gap-2 text-ui-sm disabled:opacity-40"
                title={
                  selectedIds.size > 0
                    ? `Export ${selectedIds.size} selected`
                    : isPaged
                    ? `Export this page (${sortedCases.length} of ${total})`
                    : 'Export the filtered list'
                }
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={loadCases}
                className="btn-outline inline-flex items-center gap-2 text-ui-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </>
          }
        />
      </div>

      <div className="sticky top-14 z-20 shrink-0 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="grid gap-2 sm:grid-cols-5">
          {CASE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => applyCaseTab(tab.id)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                activeCaseTab === tab.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shrink-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Case search and filters</h2>
          <p className="mt-1 text-xs text-slate-500">Use tabs for common queues, then narrow the list without leaving the page.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {isPaged ? `${sortedCases.length} of ${total.toLocaleString()}` : `${sortedCases.length} shown`}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, case ID, claim type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        <select
          value={claimTypeFilter}
          onChange={(e) => setClaimTypeFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
        >
          {/* Was a hand-written list of six, missing most claim types and using
              its own names for them (CP-406 / CP-453). */}
          <option value="">All claim types</option>
          {CLAIM_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">All states</option>
          <option value="CA">CA</option>
          <option value="TX">TX</option>
          <option value="FL">FL</option>
          <option value="NY">NY</option>
        </select>
        <select
          value={routingStatusFilter}
          onChange={(e) => setRoutingStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">All routing status</option>
          <option value="queue">Queue (routable)</option>
          <option value="waiting">Waiting for attorney</option>
          <option value="routed">Routed (any intro)</option>
          <option value="accepted">Accepted</option>
        </select>
        <label className="inline-flex items-center gap-2 px-2 text-sm text-slate-700 whitespace-nowrap">
          <input
            type="checkbox"
            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={createdTodayOnly}
            onChange={(e) => setCreatedTodayOnly(e.target.checked)}
          />
          New today
        </label>
      </div>
      </section>

      {error && <div className="shrink-0"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}

      {routeSuccess && (
        <div className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {routeSuccess}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="text-sm font-semibold text-brand-900">
            {selectedIds.size} selected
            {routableSelection.length !== selectedIds.size && (
              <span className="ml-1 font-normal text-brand-700">
                ({routableSelection.length} routable — already-routed cases are skipped)
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openRouteModal}
              disabled={routableSelection.length === 0}
              className="btn-primary inline-flex items-center gap-2 text-ui-sm disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              Route {routableSelection.length} case{routableSelection.length === 1 ? '' : 's'}
            </button>
            <button type="button" onClick={() => setSelectedIds(new Set())} className="btn-outline text-ui-sm">
              Clear
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="surface-panel flex min-h-0 flex-1 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : sortedCases.length === 0 ? (
        <div className="surface-panel min-h-0 flex-1 overflow-hidden">
          <EmptyState
            icon={FolderOpen}
            title="No cases match your filters"
            description="Try clearing search or filters, or refresh to load the latest intake."
            compact
          >
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setClaimTypeFilter('')
                setStateFilter('')
                setRoutingStatusFilter('')
                setCreatedTodayOnly(false)
              }}
              className="btn-outline text-ui-sm"
            >
              Clear filters
            </button>
            <button type="button" onClick={loadCases} className="btn-primary text-ui-sm">
              Refresh
            </button>
          </EmptyState>
        </div>
      ) : (
        // Column flex so the scrolling table takes the remaining height and the
        // pager keeps its own row — otherwise the table's `h-full` pushes the
        // pager past the clipped bottom edge and it can't be reached.
        <div className="surface-panel flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="app-data-table w-full">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="w-10 py-3 pl-4 pr-0">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label={allSelected ? 'Clear selection' : 'Select all shown cases'}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </th>
                  <SortableTh field="caseId" label="Case ID" />
                  <SortableTh field="plaintiff" label="Plaintiff" />
                  <SortableTh field="claimType" label="Claim type" />
                  <SortableTh field="venueState" label="State / County" />
                  <SortableTh field="viability" label="Score" />
                  <SortableTh field="estimatedValue" label="Est. value" />
                  <SortableTh field="routingStatus" label="Routing status" />
                  <SortableTh field="interest" label="Interest" />
                  <SortableTh field="createdAt" label="Submitted" />
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sortedCases.map((c) => (
                  <tr
                    key={c.id}
                    className={`cursor-pointer ${selectedIds.has(c.id) ? 'bg-brand-50/60' : ''}`}
                    onClick={() => navigate(`/admin/cases/${c.id}`)}
                  >
                    {/* Stop propagation so ticking a row doesn't also open the case. */}
                    <td className="w-10 py-3 pl-4 pr-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleOne(c.id)}
                        aria-label={`Select case ${formatCaseId({ id: c.id, claimType: c.claimType, createdAt: c.createdAt })}`}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                    </td>
                    <td className="py-3 px-4 text-ui-sm font-mono text-slate-600 dark:text-slate-400">
                      {formatCaseId({ id: c.id, claimType: c.claimType, createdAt: c.createdAt })}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {c.user
                        ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() || '—'
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {formatClaimType(c.claimType)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {c.venueCounty ? `${c.venueCounty}, ` : ''}
                      {c.venueState || '—'}
                    </td>
                    <td className="py-3 px-4 text-ui-sm tabular-nums">
                      {c.prediction?.viability?.overall != null
                        ? `${Math.round(c.prediction.viability.overall * 100)}%`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-ui-sm tabular-nums">
                      {c.prediction?.bands?.median
                        ? formatCurrency(c.prediction.bands.median)
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          getRoutingStatus(c) === 'Accepted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : getRoutingStatus(c) === 'Waiting'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {getRoutingStatus(c)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {c.introductions?.length ?? c.counts?.introductions ?? 0}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/admin/cases/${c.id}`)
                        }}
                        className="text-brand-600 hover:text-brand-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            total={total}
            limit={limit}
            offset={offset}
            disabled={loading}
            onChange={(next) => {
              setOffset(next)
              // Selection is page-scoped; carrying ids across pages would let a
              // bulk route act on rows that are no longer on screen.
              setSelectedIds(new Set())
            }}
            // Offset and selection reset via the filter-key check above.
            onLimitChange={setLimit}
            className="shrink-0 px-4 pb-3"
          />
        </div>
      )}

      {showRouteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowRouteModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Route {routableSelection.length} case{routableSelection.length === 1 ? '' : 's'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Auto-route uses the matching engine. Choosing an attorney assigns all selected cases directly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRouteModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={autoRoute}
                  onChange={(e) => setAutoRoute(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">Auto-route with the matching engine</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Ranks and notifies eligible attorneys per case, honoring the configured rules.
                  </span>
                </span>
              </label>

              {!autoRoute && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Attorney</label>
                    <select
                      value={attorneyChoice}
                      onChange={(e) => {
                        setAttorneyChoice(e.target.value)
                        setAttorneyEmail('')
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">Select an attorney…</option>
                      {attorneys.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name || a.email} {a.firmName ? `— ${a.firmName}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      …or invite by email
                    </label>
                    <input
                      type="email"
                      value={attorneyEmail}
                      onChange={(e) => {
                        setAttorneyEmail(e.target.value)
                        setAttorneyChoice('')
                      }}
                      placeholder="attorney@firm.com"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      An attorney who isn&apos;t registered yet will be invited.
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Message <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={routingMessage}
                  onChange={(e) => setRoutingMessage(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Context to include with the referral…"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowRouteModal(false)} className="btn-outline text-ui-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkRoute}
                disabled={routing || (!autoRoute && !attorneyChoice && !attorneyEmail.trim())}
                className="btn-primary inline-flex items-center gap-2 text-ui-sm disabled:opacity-40"
              >
                {routing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {routing ? 'Routing…' : 'Route cases'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

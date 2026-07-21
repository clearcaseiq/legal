import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAllAdminCases } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { formatCaseId } from '../../lib/caseId'
import {
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ExternalLink,
  FolderOpen,
} from 'lucide-react'
import EmptyState from '../../components/EmptyState'
import ErrorBanner from '../../components/ErrorBanner'

type SortField = 'createdAt' | 'claimType' | 'venueState' | 'status' | 'viability' | 'estimatedValue'
type SortDirection = 'asc' | 'desc'

const CASE_TABS = [
  { id: 'all', label: 'All cases' },
  { id: 'queue', label: 'Queue' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'today', label: 'New today' },
] as const

type CaseTab = typeof CASE_TABS[number]['id']

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

  const loadCases = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllAdminCases({
        claimType: claimTypeFilter || undefined,
        state: stateFilter || undefined,
        routingStatus: routingStatusFilter || undefined,
        createdToday: createdTodayOnly || undefined,
        limit: 200,
      })
      setCases(data.cases || [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load cases')
    } finally {
      setLoading(false)
    }
  }, [claimTypeFilter, stateFilter, routingStatusFilter, createdTodayOnly])

  useEffect(() => {
    loadCases()
  }, [loadCases])

  const filteredCases = cases.filter((c) => {
    if (!searchTerm) return true
    const s = searchTerm.toLowerCase()
    const name = c.user
      ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.toLowerCase()
      : ''
    return (
      c.claimType?.toLowerCase().includes(s) ||
      c.venueState?.toLowerCase().includes(s) ||
      c.venueCounty?.toLowerCase().includes(s) ||
      name.includes(s) ||
      c.user?.email?.toLowerCase().includes(s) ||
      c.id?.toLowerCase().includes(s)
    )
  })

  const sortedCases = [...filteredCases].sort((a, b) => {
    let aVal: any, bVal: any
    switch (sortField) {
      case 'createdAt':
        aVal = new Date(a.createdAt).getTime()
        bVal = new Date(b.createdAt).getTime()
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
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
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

  const getRoutingStatus = (c: any) => {
    const intros = Array.isArray(c.introductions) ? c.introductions : []
    // "Accepted" must mean an attorney actually accepted the intro — not merely that
    // the lead was routing-locked (which also happens on admin assignment/retention).
    if (intros.some((i: any) => i.status === 'ACCEPTED')) return 'Accepted'
    if (intros.length > 0 || c.leadSubmission?.assignedAttorney) return 'Waiting'
    return 'Queue'
  }

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDirection === 'asc' ? (
        <ChevronUp className="h-4 w-4 text-slate-700" />
      ) : (
        <ChevronDown className="h-4 w-4 text-slate-700" />
      )
    ) : (
      // Inactive but sortable: show a muted indicator so the column reads as clickable
      // without waiting for a first click (CP-320).
      <ChevronsUpDown className="h-4 w-4 text-slate-300" aria-hidden />
    )

  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-0 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-ui-2xl font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight">
          Cases
        </h1>
        <button
          onClick={loadCases}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="sticky top-14 z-20 shrink-0 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
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
          {sortedCases.length} shown
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
          <option value="">All claim types</option>
          <option value="auto">Auto</option>
          <option value="slip_and_fall">Slip and fall</option>
          <option value="dog_bite">Dog bite</option>
          <option value="medmal">Med mal</option>
          <option value="product">Product</option>
          <option value="wrongful_death">Wrongful death</option>
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
        <div className="surface-panel min-h-0 flex-1 overflow-hidden p-0">
          <div className="h-full overflow-auto">
            <table className="app-data-table w-full">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Case ID
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Plaintiff
                  </th>
                  <th
                    className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('claimType')}
                  >
                    <span className="flex items-center gap-1">
                      Claim type
                      <SortIcon field="claimType" />
                    </span>
                  </th>
                  <th
                    className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('venueState')}
                  >
                    <span className="flex items-center gap-1">
                      State / County
                      <SortIcon field="venueState" />
                    </span>
                  </th>
                  <th
                    className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('viability')}
                  >
                    <span className="flex items-center gap-1">
                      Score
                      <SortIcon field="viability" />
                    </span>
                  </th>
                  <th
                    className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('estimatedValue')}
                  >
                    <span className="flex items-center gap-1">
                      Est. value
                      <SortIcon field="estimatedValue" />
                    </span>
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Routing status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Interest
                  </th>
                  <th
                    className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('createdAt')}
                  >
                    <span className="flex items-center gap-1">
                      Submitted
                      <SortIcon field="createdAt" />
                    </span>
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sortedCases.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/cases/${c.id}`)}
                  >
                    <td className="py-3 px-4 text-ui-sm font-mono text-slate-600 dark:text-slate-400">
                      {formatCaseId({ id: c.id, claimType: c.claimType, createdAt: c.createdAt })}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {c.user
                        ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() || '—'
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm capitalize">
                      {(c.claimType || '').replace(/_/g, ' ')}
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
          {sortedCases.length === 0 && (
            <div className="py-12 text-center text-slate-500">No cases found</div>
          )}
        </div>
      )}
    </div>
  )
}

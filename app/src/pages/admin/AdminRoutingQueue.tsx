import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAdminRoutingQueue } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { RefreshCw, ExternalLink, Power, TriangleAlert, CheckCircle } from 'lucide-react'
import { useAdminRoutingStatus } from '../../hooks/useAdminRoutingStatus'
import {
  Badge,
  EmptyState,
  PageHeader,
  SectionCard,
  TableScroll,
  THeadRow,
  Th,
  Tr,
  Td,
} from '../../features/shared/ui'

export default function AdminRoutingQueue() {
  const location = useLocation()
  const navigate = useNavigate()
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterWaiting, setFilterWaiting] = useState<'all' | '1h' | '24h'>('all')
  const [arrivalFeedback, setArrivalFeedback] = useState<{
    routedCaseId: string
    routedAttorneyName?: string | null
  } | null>(null)
  const { routingEnabled, loading: routingStatusLoading } = useAdminRoutingStatus()

  const loadQueue = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setError(null)
      const data = await getAdminRoutingQueue()
      setCases(data.cases || [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load routing queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  useEffect(() => {
    const state = location.state as { routedCaseId?: string; routedAttorneyName?: string | null } | null
    if (!state?.routedCaseId) return

    setArrivalFeedback({
      routedCaseId: state.routedCaseId,
      routedAttorneyName: state.routedAttorneyName,
    })
    setFilterWaiting('all')
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  // Auto-refresh every 30 seconds and when tab becomes visible (background refresh, no spinner)
  useEffect(() => {
    const interval = setInterval(() => loadQueue(false), 30000)
    const onFocus = () => loadQueue(false)
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [loadQueue])

  const now = Date.now()
  const filteredCases = cases.filter((c) => {
    if (filterWaiting === 'all') return true
    const created = new Date(c.timeInQueue).getTime()
    const ageHours = (now - created) / (1000 * 60 * 60)
    if (filterWaiting === '1h') return ageHours >= 1
    if (filterWaiting === '24h') return ageHours >= 24
    return true
  })

  const getAgeMinutes = (created: string) => {
    return Math.floor((now - new Date(created).getTime()) / 60000)
  }

  const highlightedCaseStillInQueue = arrivalFeedback
    ? cases.some((c) => c.id === arrivalFeedback.routedCaseId)
    : false

  return (
    <div className="space-y-6">
      <PageHeader
        title="Routing queue"
        description="Live dispatch console — cases currently in routing, waiting for attorney response."
        actions={
          <>
            <select
              value={filterWaiting}
              onChange={(e) => setFilterWaiting(e.target.value as any)}
              aria-label="Filter by time waiting"
              className="input w-auto"
            >
              <option value="all">All cases</option>
              <option value="1h">Waiting &gt; 1 hour</option>
              <option value="24h">Waiting &gt; 24 hours</option>
            </select>
            <button
              onClick={() => loadQueue(true)}
              className="btn-outline inline-flex items-center gap-2 text-ui-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </>
        }
      />

      {arrivalFeedback && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <div className="font-semibold text-emerald-900">
                Case routed successfully{arrivalFeedback.routedAttorneyName ? ` to ${arrivalFeedback.routedAttorneyName}` : ''}.
              </div>
              <div className="mt-1">
                {highlightedCaseStillInQueue
                  ? 'The case is highlighted below while it remains in the active routing queue.'
                  : 'The case is no longer in the active routing queue. It may already be assigned, locked, or moved forward.'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/admin/cases/${arrivalFeedback.routedCaseId}`)}
              className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
            >
              View case
            </button>
            <button
              onClick={() => setArrivalFeedback(null)}
              className="rounded-lg px-3 py-2 text-sm text-emerald-800 hover:text-emerald-950"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!routingStatusLoading && routingEnabled === false && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <div className="text-sm font-semibold text-amber-900">Routing is currently turned off</div>
              <div className="mt-1 text-sm text-amber-800">
                New automatic dispatches and escalation waves are paused until routing is turned back on.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/matching-rules')}
            className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            Manage routing
          </button>
        </div>
      )}

      {!routingStatusLoading && routingEnabled !== false && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <Power className="h-4 w-4" />
          Automated routing is on.
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
      )}

      <SectionCard title={`${filteredCases.length} case${filteredCases.length === 1 ? '' : 's'} in queue`}>
        {loading ? (
          <EmptyState message="Loading routing queue…" />
        ) : filteredCases.length === 0 ? (
          <EmptyState
            message={
              filterWaiting === 'all'
                ? 'No cases are currently in the routing queue.'
                : 'No cases have been waiting that long.'
            }
          />
        ) : (
          // Primitives rather than <DataTable> so the just-routed case can keep its
          // row-level highlight (DataTable rows don't take a per-row className).
          <TableScroll>
            <THeadRow>
              <Th>Case ID</Th>
              <Th>Claim type</Th>
              <Th>Value estimate</Th>
              <Th>Case score</Th>
              <Th>Wave</Th>
              <Th align="right">Contacted</Th>
              <Th align="right">Responses</Th>
              <Th>Latest attorney</Th>
              <Th>Time in queue</Th>
              <Th>Next escalation</Th>
              <Th />
            </THeadRow>
            <tbody>
              {filteredCases.map((c) => {
                const ageMin = getAgeMinutes(c.timeInQueue)
                const isAging = ageMin >= 60
                const isHighlighted = arrivalFeedback?.routedCaseId === c.id
                return (
                  <Tr
                    key={c.id}
                    onClick={() => navigate(`/admin/cases/${c.id}`)}
                    className={isHighlighted ? 'bg-emerald-50/70 dark:bg-emerald-950/30' : ''}
                  >
                    <Td
                      className={`font-mono ${
                        isHighlighted
                          ? 'font-semibold text-emerald-900 dark:text-emerald-300'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {c.id?.slice(0, 8)}…
                    </Td>
                    <Td className="capitalize">{(c.claimType || '').replace(/_/g, ' ')}</Td>
                    <Td>{c.valueEstimate ? formatCurrency(c.valueEstimate) : '—'}</Td>
                    <Td>{c.caseScore != null ? `${Math.round(c.caseScore * 100)}%` : '—'}</Td>
                    <Td>
                      <Badge tone="neutral">Wave {c.currentWave}</Badge>
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {c.attorneysContacted}
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {c.responsesReceived}
                    </Td>
                    <Td>
                      {c.latestAttorneyContacted ? (
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {c.latestAttorneyContacted.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {c.latestAttorneyContacted.status} •{' '}
                            {formatDate(c.latestAttorneyContacted.contactedAt)}
                          </div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td>
                      <span
                        className={
                          isAging ? 'font-medium text-amber-600 dark:text-amber-400' : undefined
                        }
                      >
                        {ageMin < 60 ? `${ageMin} min` : `${Math.floor(ageMin / 60)}h`}
                      </span>
                    </Td>
                    <Td className="text-slate-600 dark:text-slate-400">
                      {c.nextEscalationTime ? formatDate(c.nextEscalationTime) : '—'}
                    </Td>
                    <Td align="right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/admin/cases/${c.id}`)
                        }}
                        aria-label="Open case"
                        className="text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </TableScroll>
        )}
      </SectionCard>
    </div>
  )
}

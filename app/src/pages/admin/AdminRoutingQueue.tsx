import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAdminRoutingQueue } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { RefreshCw, ExternalLink, Power, TriangleAlert, CheckCircle } from 'lucide-react'
import { useAdminRoutingStatus } from '../../hooks/useAdminRoutingStatus'

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Routing queue</h1>
        <div className="flex items-center gap-2">
          <select
            value={filterWaiting}
            onChange={(e) => setFilterWaiting(e.target.value as any)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="all">All cases</option>
            <option value="1h">Waiting &gt; 1 hour</option>
            <option value="24h">Waiting &gt; 24 hours</option>
          </select>
          <button
            onClick={() => loadQueue(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <p className="text-slate-600">
        Live dispatch console — cases currently in routing, waiting for attorney response.
      </p>

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

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Case ID
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Claim type
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Value estimate
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Case score
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Wave
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Contacted
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Responses
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Latest attorney
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Time in queue
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Next escalation
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCases.map((c) => {
                  const ageMin = getAgeMinutes(c.timeInQueue)
                  const isAging = ageMin >= 60
                  const isHighlighted = arrivalFeedback?.routedCaseId === c.id
                  return (
                    <tr
                      key={c.id}
                      className={`cursor-pointer hover:bg-slate-50 ${isHighlighted ? 'bg-emerald-50/70' : ''}`}
                      onClick={() => navigate(`/admin/cases/${c.id}`)}
                    >
                      <td className={`py-3 px-4 text-sm font-mono ${isHighlighted ? 'text-emerald-900 font-semibold' : 'text-slate-600'}`}>
                        {c.id?.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-sm capitalize">
                        {(c.claimType || '').replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {c.valueEstimate ? formatCurrency(c.valueEstimate) : '—'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {c.caseScore != null ? `${Math.round(c.caseScore * 100)}%` : '—'}
                      </td>
                      <td className="py-3 px-4 text-sm">Wave {c.currentWave}</td>
                      <td className="py-3 px-4 text-sm">{c.attorneysContacted}</td>
                      <td className="py-3 px-4 text-sm">{c.responsesReceived}</td>
                      <td className="py-3 px-4 text-sm">
                        {c.latestAttorneyContacted ? (
                          <div>
                            <div className="font-medium text-slate-900">{c.latestAttorneyContacted.name}</div>
                            <div className="text-xs text-slate-500">
                              {c.latestAttorneyContacted.status} • {formatDate(c.latestAttorneyContacted.contactedAt)}
                            </div>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={isAging ? 'text-amber-600 font-medium' : ''}>
                          {ageMin < 60 ? `${ageMin} min` : `${Math.floor(ageMin / 60)}h`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {c.nextEscalationTime
                          ? formatDate(c.nextEscalationTime)
                          : '—'}
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
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredCases.length === 0 && (
            <div className="py-12 text-center text-slate-500">No cases in routing queue</div>
          )}
        </div>
      )}

      {/* Quick actions placeholder */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-2">Quick actions</h3>
        <p className="text-sm text-slate-500">
          Escalate now, pause routing, broaden matching radius, re-rank attorneys, send to manual
          review, assign directly — coming in Phase 2.
        </p>
      </div>
    </div>
  )
}

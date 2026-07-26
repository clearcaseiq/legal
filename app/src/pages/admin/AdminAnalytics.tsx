import { useState, useEffect, useCallback } from 'react'
import { getAdminAnalytics } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  Users,
  Clock,
  FileText,
  GitBranch,
  Target,
} from 'lucide-react'
import EmptyState from '../../components/EmptyState'
import { PageHeader } from '../../features/shared/ui'

function BarChart({
  data,
  labelKey,
  valueKey,
  maxBars = 10,
  color = 'brand',
}: {
  data: Array<Record<string, any>>
  labelKey: string
  valueKey: string
  maxBars?: number
  color?: string
}) {
  const sorted = [...data].sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0)).slice(0, maxBars)
  const max = Math.max(1, ...sorted.map((d) => d[valueKey] || 0))
  const colorClass =
    color === 'brand'
      ? 'bg-brand-500'
      : color === 'emerald'
        ? 'bg-emerald-500'
        : color === 'amber'
          ? 'bg-amber-500'
          : 'bg-slate-500'

  return (
    <div className="space-y-2">
      {sorted.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span
            className="w-32 shrink-0 text-sm text-slate-600 dark:text-slate-400 truncate"
            title={String(d[labelKey])}
          >
            {d[labelKey]}
          </span>
          <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
            <div
              className={`h-full ${colorClass} rounded transition-all`}
              style={{ width: `${((d[valueKey] || 0) / max) * 100}%` }}
            />
          </div>
          <span className="w-12 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
            {d[valueKey] || 0}
          </span>
        </div>
      ))}
    </div>
  )
}

function SimpleLineChart({ data }: { data: [string, number][] }) {
  const values = data.map(([, v]) => v)
  const max = Math.max(1, ...values)
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * 100
      const y = 100 - (v / max) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="h-32 w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-brand-500"
          points={points}
        />
      </svg>
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
        <span>{data[0]?.[0]}</span>
        <span>{data[Math.floor(data.length / 2)]?.[0]}</span>
        <span>{data[data.length - 1]?.[0]}</span>
      </div>
    </div>
  )
}

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getAdminAnalytics(days)
      setData(result)
    } catch (err: any) {
      const data = err?.response?.data
      setError(data?.detail || data?.error || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Couldn't load analytics"
        description={error}
      >
        <button onClick={load} className="btn-primary text-ui-sm">
          Try again
        </button>
      </EmptyState>
    )
  }

  const intake = data?.intake ?? {}
  const routing = data?.routing ?? {}
  const attorneyPerf = data?.attorneyPerformance ?? []
  const caseQuality = data?.caseQuality ?? {}
  const plaintiffConv = data?.plaintiffConversion ?? {}
  const routingFeedback = routing.feedbackLoop ?? {}
  const routingAuditActions = routing.auditActions ?? []

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description={`Intake, routing, and attorney performance over the last ${days} days.`}
        actions={
          <>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10))}
              className="input w-auto"
              aria-label="Reporting window"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={load}
              disabled={loading}
              className="btn-outline inline-flex items-center gap-2 text-ui-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </>
        }
      />

      {/* A failed refresh keeps the last good data on screen, so surface it inline. */}
      {error && data && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <span>{error} Showing the last loaded numbers.</span>
          <button onClick={load} className="shrink-0 font-medium underline">
            Retry
          </button>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="surface-panel p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
            <FileText className="h-4 w-4" />
            Intake
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{intake.total ?? 0}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Completed cases</p>
        </div>
        <div className="surface-panel p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
            <Target className="h-4 w-4" />
            Plaintiff conversion
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{plaintiffConv.rate ?? 0}%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {plaintiffConv.matched ?? 0} / {plaintiffConv.total ?? 0} matched
          </p>
        </div>
        <div className="surface-panel p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
            <Clock className="h-4 w-4" />
            Time to first accept
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {routing.timeToFirstAcceptMinutes != null ? `${routing.timeToFirstAcceptMinutes} min` : '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Median response time</p>
        </div>
        <div className="surface-panel p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
            <TrendingUp className="h-4 w-4" />
            Avg case score
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {caseQuality.avgViability != null ? `${caseQuality.avgViability}%` : '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Viability (n={caseQuality.casesWithPrediction ?? 0})</p>
        </div>
      </div>

      {/* Intake analytics */}
      <div className="surface-panel p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5" />
          Intake analytics
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Cases by claim type</h3>
            <BarChart
              data={intake.byClaimType ?? []}
              labelKey="claimType"
              valueKey="count"
              color="brand"
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Cases by state</h3>
            <BarChart
              data={intake.byState ?? []}
              labelKey="state"
              valueKey="count"
              color="emerald"
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Cases by source</h3>
            <BarChart
              data={intake.bySource ?? []}
              labelKey="source"
              valueKey="count"
              color="amber"
            />
          </div>
        </div>
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Intake volume over time</h3>
          <SimpleLineChart data={intake.byDay ?? []} />
        </div>
      </div>

      {/* Routing analytics */}
      <div className="surface-panel p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5" />
          Routing analytics
        </h2>
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">Decision memories</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{routingFeedback.decisionMemories ?? 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">Outcomes recorded</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{routingFeedback.outcomesRecorded ?? 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">Override rate</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{routingFeedback.overrideRate ?? 0}%</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">Avg confidence</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{routingFeedback.averageRecommendedConfidence ?? 0}%</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">Retraining requests</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{routingFeedback.retrainingRequests ?? 0}</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Acceptance by wave</h3>
            {routing.acceptanceByWave?.length > 0 ? (
              <div className="space-y-3 text-slate-700 dark:text-slate-300">
                {routing.acceptanceByWave.map((w: any) => (
                  <div key={w.wave} className="flex items-center gap-4">
                    <span className="w-16 font-medium">Wave {w.wave}</span>
                    <div className="flex-1 flex gap-2">
                      <span className="text-sm text-green-600">{w.accepted} accepted</span>
                      <span className="text-sm text-slate-400">/</span>
                      <span className="text-sm text-red-600">{w.declined} declined</span>
                      <span className="text-sm text-slate-500">({w.acceptanceRate}% rate)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-sm">No routing data in this period</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Routing funnel</h3>
            <div className="space-y-2 text-slate-700 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Submitted</span>
                <span className="font-medium">{routing.funnel?.submitted ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Routed (intros sent)</span>
                <span className="font-medium">{routing.funnel?.routed ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Attorney accepted</span>
                <span className="font-medium text-green-600">{routing.funnel?.attorneyAccepted ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Engaged (matched)</span>
                <span className="font-medium text-brand-600">{routing.funnel?.engaged ?? 0}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Recent routing ops actions</h3>
            {routingAuditActions.length > 0 ? (
              <BarChart
                data={routingAuditActions}
                labelKey="action"
                valueKey="count"
                color="amber"
                maxBars={8}
              />
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-sm">No routing ops actions in this period</p>
            )}
          </div>
        </div>
      </div>

      {/* Attorney performance */}
      <div className="surface-panel p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Users className="h-5 w-5" />
          Attorney performance
        </h2>
        {attorneyPerf.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 font-medium text-slate-700 dark:text-slate-300">Attorney</th>
                  <th className="text-right py-2 font-medium text-slate-700 dark:text-slate-300">Total</th>
                  <th className="text-right py-2 font-medium text-slate-700 dark:text-slate-300">Accepted</th>
                  <th className="text-right py-2 font-medium text-slate-700 dark:text-slate-300">Declined</th>
                  <th className="text-right py-2 font-medium text-slate-700 dark:text-slate-300">
                    Acceptance rate
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-700 dark:text-slate-300">
                {attorneyPerf.map((a: any) => (
                  <tr key={a.attorneyId} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2">{a.name}</td>
                    <td className="text-right py-2">{a.total}</td>
                    <td className="text-right py-2 text-green-600">{a.accepted}</td>
                    <td className="text-right py-2 text-red-600">{a.declined}</td>
                    <td className="text-right py-2 font-medium">{a.acceptanceRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-sm">No attorney activity in this period</p>
        )}
      </div>

      {/* Case quality */}
      <div className="surface-panel p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5" />
          Case quality
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">Avg viability score</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {caseQuality.avgViability != null ? `${caseQuality.avgViability}%` : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">Avg estimated value</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {caseQuality.avgValue != null ? formatCurrency(caseQuality.avgValue) : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">Cases with ML prediction</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{caseQuality.casesWithPrediction ?? 0}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

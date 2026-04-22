import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AdminRoutingFeedbackCandidate,
  AdminRoutingFeedbackExport,
  AdminRoutingFeedbackSummary,
  createAdminRoutingRetrainingRequest,
  getAdminRoutingFeedbackCandidates,
  getAdminRoutingFeedbackExport,
  getAdminRoutingFeedbackSummary,
} from '../../lib/api'
import { formatDate, formatPercentage } from '../../lib/formatters'
import {
  AlertTriangle,
  BrainCircuit,
  Download,
  RefreshCw,
  Send,
  Target,
} from 'lucide-react'

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function toChartRows(input?: Record<string, number>) {
  return Object.entries(input || {})
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }))
}

function ChartList({
  title,
  rows,
}: {
  title: string
  rows: Array<{ label: string; value: number }>
}) {
  const max = Math.max(1, ...rows.map((row) => row.value))

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <div className="text-sm text-slate-500">No data yet</div>}
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <div className="w-40 shrink-0 text-sm capitalize text-slate-600">
              {row.label.replace(/_/g, ' ')}
            </div>
            <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
              <div
                className="h-full rounded bg-brand-500"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </div>
            <div className="w-12 text-right text-sm font-medium text-slate-900">{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminRoutingFeedback() {
  const [summary, setSummary] = useState<AdminRoutingFeedbackSummary | null>(null)
  const [candidates, setCandidates] = useState<AdminRoutingFeedbackCandidate[]>([])
  const [exportData, setExportData] = useState<AdminRoutingFeedbackExport | null>(null)
  const [days, setDays] = useState(30)
  const [limit, setLimit] = useState(50)
  const [overrideOnly, setOverrideOnly] = useState(true)
  const [outcomeStatus, setOutcomeStatus] = useState('')
  const [withOutcomeOnly, setWithOutcomeOnly] = useState(true)
  const [exportLimit, setExportLimit] = useState(200)
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [sampleSize, setSampleSize] = useState(50)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [summaryData, candidateData] = await Promise.all([
        getAdminRoutingFeedbackSummary(days),
        getAdminRoutingFeedbackCandidates({
          limit,
          overrideOnly,
          outcomeStatus: outcomeStatus || undefined,
        }),
      ])
      setSummary(summaryData)
      setCandidates(candidateData.candidates || [])
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load routing feedback')
    } finally {
      setLoading(false)
    }
  }, [days, limit, outcomeStatus, overrideOnly])

  useEffect(() => {
    load()
  }, [load])

  const handleExport = async () => {
    try {
      setExportLoading(true)
      setError(null)
      const data = await getAdminRoutingFeedbackExport({
        limit: exportLimit,
        withOutcomeOnly,
      })
      setExportData(data)
      downloadJson(`routing-feedback-export-${new Date().toISOString().slice(0, 10)}.json`, data)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to export routing feedback')
    } finally {
      setExportLoading(false)
    }
  }

  const handleRetrainingRequest = async () => {
    if (!notes.trim()) return
    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)
      await createAdminRoutingRetrainingRequest({
        notes: notes.trim(),
        sampleSize,
        filters: {
          overrideOnly,
          outcomeStatus: outcomeStatus || null,
          days,
        },
      })
      setSuccess('Retraining request logged for follow-up.')
      setNotes('')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to submit retraining request')
    } finally {
      setSubmitting(false)
    }
  }

  const recommendationRows = useMemo(() => toChartRows(summary?.recommendations), [summary])
  const decisionRows = useMemo(() => toChartRows(summary?.attorneyDecisions), [summary])
  const outcomeRows = useMemo(() => toChartRows(summary?.outcomes), [summary])
  const eventRows = useMemo(() => toChartRows(summary?.analyticsByEvent), [summary])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <BrainCircuit className="h-7 w-7 text-brand-600" />
            Routing feedback
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review recommendation quality, attorney overrides, export training samples, and log retraining requests.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          {success}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard
          label="Decision memories"
          value={summary?.totals.decisionMemories ?? 0}
          helper="Samples reviewed"
        />
        <MetricCard
          label="Outcomes recorded"
          value={summary?.totals.outcomesRecorded ?? 0}
          helper="Closed feedback rows"
        />
        <MetricCard
          label="Overrides"
          value={summary?.totals.overrides ?? 0}
          helper="Attorney disagreed"
        />
        <MetricCard
          label="Override rate"
          value={summary ? formatPercentage(summary.totals.overrideRate) : '0%'}
          helper="Share of reviewed rows"
        />
        <MetricCard
          label="Avg confidence"
          value={summary ? formatPercentage(summary.totals.averageRecommendedConfidence) : '0%'}
          helper="Model confidence"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartList title="Recommended decisions" rows={recommendationRows} />
        <ChartList title="Attorney decisions" rows={decisionRows} />
        <ChartList title="Outcomes" rows={outcomeRows} />
        <ChartList title="Routing analytics events" rows={eventRows} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Reviewable candidates</h2>
            <p className="mt-1 text-sm text-slate-600">
              Focus on override-heavy rows or a specific outcome to inspect where recommendations and attorney behavior differ.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={250}>250 rows</option>
            </select>
            <select
              value={outcomeStatus}
              onChange={(e) => setOutcomeStatus(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All outcomes</option>
              <option value="retained">Retained</option>
              <option value="consulted">Consulted</option>
              <option value="rejected">Rejected</option>
              <option value="lost">Lost</option>
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={overrideOnly}
                onChange={(e) => setOverrideOnly(e.target.checked)}
              />
              Override only
            </label>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Lead</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Case</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Recommendation</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Actual</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Outcome</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Attorney</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && candidates.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No routing feedback samples matched the current filter.
                  </td>
                </tr>
              )}
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="align-top">
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">{candidate.leadId}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Score {candidate.lead?.score ?? '—'} • {candidate.lead?.lifecycleState || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <div className="font-medium capitalize text-slate-900">
                      {(candidate.assessment?.claimType || 'unknown').replace(/_/g, ' ')}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {candidate.assessment?.venueState}
                      {candidate.assessment?.venueCounty ? `, ${candidate.assessment.venueCounty}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <div className="font-medium capitalize text-slate-900">
                      {candidate.recommendation?.decision || '—'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {typeof candidate.recommendation?.confidence === 'number'
                        ? formatPercentage(candidate.recommendation.confidence)
                        : '—'}{' '}
                      confidence
                    </div>
                    {candidate.recommendation?.rationale && (
                      <div className="mt-2 max-w-xs text-xs text-slate-500">
                        {candidate.recommendation.rationale}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <div className="font-medium capitalize text-slate-900">
                      {candidate.actualDecision || '—'}
                    </div>
                    <div className="mt-1 text-xs">
                      {candidate.override ? (
                        <span className="rounded bg-amber-100 px-2 py-1 font-medium text-amber-800">
                          Override
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-2 py-1 font-medium text-emerald-800">
                          Followed recommendation
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <div className="font-medium capitalize text-slate-900">
                      {candidate.outcomeStatus || 'Pending'}
                    </div>
                    {candidate.outcomeNotes && (
                      <div className="mt-2 max-w-xs text-xs text-slate-500">{candidate.outcomeNotes}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">{candidate.attorney?.name || 'Unknown'}</div>
                    <div className="mt-1 text-xs text-slate-500">{candidate.attorney?.email || '—'}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {candidate.outcomeAt
                      ? formatDate(candidate.outcomeAt)
                      : candidate.decisionAt
                        ? formatDate(candidate.decisionAt)
                        : candidate.createdAt
                          ? formatDate(candidate.createdAt)
                          : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900">
            <Download className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold">Training export</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Pull a structured decision-memory dataset for offline review or model iteration.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={String(exportLimit)}
              onChange={(e) => setExportLimit(Number(e.target.value))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value={100}>100 rows</option>
              <option value={200}>200 rows</option>
              <option value={500}>500 rows</option>
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={withOutcomeOnly}
                onChange={(e) => setWithOutcomeOnly(e.target.checked)}
              />
              Outcome only
            </label>
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {exportLoading ? 'Exporting...' : 'Export JSON'}
            </button>
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            {exportData ? (
              <>
                <div className="font-medium text-slate-900">{exportData.count} records exported</div>
                <div className="mt-1">Generated {formatDate(exportData.exportedAt)}</div>
              </>
            ) : (
              'Run an export to generate a downloadable training snapshot.'
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900">
            <Target className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold">Retraining request</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Log the next model-review request with notes and the current sampling filters.
          </p>
          <div className="mt-4 space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Example: review override-heavy medmal leads from the last 90 days and tune against consulted vs retained outcomes."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-slate-600">
                Sample size
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="ml-2 w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <button
                onClick={handleRetrainingRequest}
                disabled={submitting || !notes.trim()}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Submitting...' : 'Log request'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{helper}</div>
    </div>
  )
}

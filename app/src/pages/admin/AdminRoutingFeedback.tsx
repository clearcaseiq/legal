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
import { AlertTriangle, Download, RefreshCw, Send, Target } from 'lucide-react'
import {
  Badge,
  DataTable,
  EmptyState as InlineMessage,
  PageHeader,
} from '../../features/shared/ui'

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
    <div className="surface-panel p-5">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <InlineMessage message="No data yet" />}
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <div className="w-40 shrink-0 text-sm capitalize text-slate-600 dark:text-slate-400">
              {row.label.replace(/_/g, ' ')}
            </div>
            <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded bg-brand-500"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </div>
            <div className="w-12 text-right text-sm font-medium text-slate-900 dark:text-slate-100">
              {row.value}
            </div>
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
      <PageHeader
        title="Routing feedback"
        description="Review recommendation quality, attorney overrides, export training samples, and log retraining requests."
        actions={
          <>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="input w-auto"
              aria-label="Reporting window"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
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

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
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

      <div className="surface-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Reviewable candidates
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Focus on override-heavy rows or a specific outcome to inspect where recommendations and attorney behavior differ.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="input w-auto"
            >
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={250}>250 rows</option>
            </select>
            <select
              value={outcomeStatus}
              onChange={(e) => setOutcomeStatus(e.target.value)}
              className="input w-auto"
            >
              <option value="">All outcomes</option>
              <option value="retained">Retained</option>
              <option value="consulted">Consulted</option>
              <option value="rejected">Rejected</option>
              <option value="lost">Lost</option>
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={overrideOnly}
                onChange={(e) => setOverrideOnly(e.target.checked)}
              />
              Override only
            </label>
          </div>
        </div>

        <div className="mt-6">
          <DataTable
            rows={candidates}
            rowKey={(c: any) => c.id}
            loading={loading}
            loadingMessage="Loading routing feedback samples…"
            emptyMessage="No routing feedback samples matched the current filter."
            columns={[
              {
                key: 'lead',
                header: 'Lead',
                cell: (c: any) => (
                  <>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{c.leadId}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Score {c.lead?.score ?? '—'} • {c.lead?.lifecycleState || '—'}
                    </div>
                  </>
                ),
              },
              {
                key: 'case',
                header: 'Case',
                cell: (c: any) => (
                  <>
                    <div className="font-medium capitalize text-slate-900 dark:text-slate-100">
                      {(c.assessment?.claimType || 'unknown').replace(/_/g, ' ')}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {c.assessment?.venueState}
                      {c.assessment?.venueCounty ? `, ${c.assessment.venueCounty}` : ''}
                    </div>
                  </>
                ),
              },
              {
                key: 'recommendation',
                header: 'Recommendation',
                cell: (c: any) => (
                  <>
                    <div className="font-medium capitalize text-slate-900 dark:text-slate-100">
                      {c.recommendation?.decision || '—'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {typeof c.recommendation?.confidence === 'number'
                        ? formatPercentage(c.recommendation.confidence)
                        : '—'}{' '}
                      confidence
                    </div>
                    {c.recommendation?.rationale && (
                      <div className="mt-2 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                        {c.recommendation.rationale}
                      </div>
                    )}
                  </>
                ),
              },
              {
                key: 'actual',
                header: 'Actual',
                cell: (c: any) => (
                  <>
                    <div className="font-medium capitalize text-slate-900 dark:text-slate-100">
                      {c.actualDecision || '—'}
                    </div>
                    <div className="mt-1">
                      <Badge tone={c.override ? 'warning' : 'success'}>
                        {c.override ? 'Override' : 'Followed recommendation'}
                      </Badge>
                    </div>
                  </>
                ),
              },
              {
                key: 'outcome',
                header: 'Outcome',
                cell: (c: any) => (
                  <>
                    <div className="font-medium capitalize text-slate-900 dark:text-slate-100">
                      {c.outcomeStatus || 'Pending'}
                    </div>
                    {c.outcomeNotes && (
                      <div className="mt-2 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                        {c.outcomeNotes}
                      </div>
                    )}
                  </>
                ),
              },
              {
                key: 'attorney',
                header: 'Attorney',
                cell: (c: any) => (
                  <>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {c.attorney?.name || 'Unknown'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {c.attorney?.email || '—'}
                    </div>
                  </>
                ),
              },
              {
                key: 'updated',
                header: 'Updated',
                cell: (c: any) => (
                  <span className="text-slate-700 dark:text-slate-300">
                    {c.outcomeAt
                      ? formatDate(c.outcomeAt)
                      : c.decisionAt
                        ? formatDate(c.decisionAt)
                        : c.createdAt
                          ? formatDate(c.createdAt)
                          : '—'}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="surface-panel p-6">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Download className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold">Training export</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Pull a structured decision-memory dataset for offline review or model iteration.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={String(exportLimit)}
              onChange={(e) => setExportLimit(Number(e.target.value))}
              className="input w-auto"
            >
              <option value={100}>100 rows</option>
              <option value={200}>200 rows</option>
              <option value={500}>500 rows</option>
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
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
              className="btn-primary inline-flex items-center gap-2 text-ui-sm"
            >
              <Download className="h-4 w-4" />
              {exportLoading ? 'Exporting…' : 'Export JSON'}
            </button>
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
            {exportData ? (
              <>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {exportData.count} records exported
                </div>
                <div className="mt-1">Generated {formatDate(exportData.exportedAt)}</div>
              </>
            ) : (
              'Run an export to generate a downloadable training snapshot.'
            )}
          </div>
        </div>

        <div className="surface-panel p-6">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Target className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold">Retraining request</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Log the next model-review request with notes and the current sampling filters.
          </p>
          <div className="mt-4 space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Example: review override-heavy medmal leads from the last 90 days and tune against consulted vs retained outcomes."
              className="input"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-slate-600 dark:text-slate-400">
                Sample size
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="input ml-2 w-24"
                />
              </label>
              <button
                onClick={handleRetrainingRequest}
                disabled={submitting || !notes.trim()}
                className="btn-secondary inline-flex items-center gap-2 text-ui-sm"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Submitting…' : 'Log request'}
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
    <div className="surface-panel p-4">
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getAdminManualReviewQueue,
  manualReviewAction,
} from '../../lib/api'
import { formatDate } from '../../lib/formatters'
import {
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  MessageSquare,
  Shield,
  ChevronDown,
  AlertTriangle,
  ClipboardCheck,
} from 'lucide-react'
import EmptyState from '../../components/EmptyState'
import { EmptyState as InlineMessage, PageHeader } from '../../features/shared/ui'

const REASON_LABELS: Record<string, string> = {
  low_confidence: 'Low confidence',
  duplicate: 'Duplicate',
  conflicting_facts: 'Conflicting facts',
  suspicious_documents: 'Suspicious documents',
  near_sol: 'Near SOL',
  unsupported_jurisdiction: 'Unsupported jurisdiction',
  premium_case: 'Premium case review',
  ocr_failure: 'OCR failure',
  fraud_suspected: 'Fraud suspected',
  identity_mismatch: 'Identity mismatch',
  document_tampering: 'Document tampering',
}

interface FraudSignal {
  code: string
  label: string
  detail: string
  points: number
  severity: 'low' | 'medium' | 'high'
}

// Color the composite suspicion score: green (low) → amber (elevated) → red (high).
function scoreTone(score: number): string {
  if (score >= 60) return 'bg-red-100 text-red-700 border border-red-200'
  if (score >= 30) return 'bg-amber-100 text-amber-700 border border-amber-200'
  return 'bg-slate-100 text-slate-600 border border-slate-200'
}

function severityTone(severity: string): string {
  if (severity === 'high') return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200'
  if (severity === 'medium') return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
  return 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200'
}

export default function AdminManualReview() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reasonFilter, setReasonFilter] = useState('')
  const [actingId, setActingId] = useState<string | null>(null)
  const [actionNote, setActionNote] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminManualReviewQueue()
      setCases(data.cases || [])
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load manual review queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const handleAction = async (
    caseId: string,
    action: 'release' | 'reject' | 'request_info' | 'compliance'
  ) => {
    setActingId(caseId)
    setError(null)
    try {
      await manualReviewAction(caseId, action, actionNote || undefined)
      setCases((prev) => prev.filter((c) => c.id !== caseId))
      setActionNote(null)
      setExpandedId(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Action failed')
    } finally {
      setActingId(null)
    }
  }

  const filteredCases = cases.filter((c) => {
    if (!reasonFilter) return true
    return c.manualReviewReason === reasonFilter
  })

  const reasons = [...new Set(cases.map((c) => c.manualReviewReason).filter(Boolean))]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manual review queue"
        description="Cases held back from routing until someone clears them."
        actions={
          <button
            onClick={loadQueue}
            disabled={loading}
            className="btn-outline inline-flex items-center gap-2 text-ui-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="surface-panel p-4">
          <InlineMessage message="Loading manual review queue…" />
        </div>
      ) : cases.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No cases in manual review"
          description="Cases can be held for low confidence, duplicates, conflicting facts, suspicious documents, near-SOL, unsupported jurisdiction, premium review, or OCR failure. To hold one, open a case and choose Actions → Hold for manual review."
        />
      ) : (
        <div className="surface-panel">
          {reasons.length > 0 && (
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <label className="mr-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                Filter by reason:
              </label>
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="input w-auto py-1.5"
              >
                <option value="">All</option>
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {REASON_LABELS[r] || r}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filteredCases.length === 0 && (
            <InlineMessage message="No cases match this reason filter." />
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCases.map((c) => (
                <div
                  key={c.id}
                  className="px-4 py-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/cases/${c.id}`)}
                          className="font-medium text-brand-600 hover:text-brand-800 truncate"
                        >
                          {c.id}
                        </button>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {REASON_LABELS[c.manualReviewReason] || c.manualReviewReason}
                        </span>
                        {typeof c.fraudScore === 'number' && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${scoreTone(c.fraudScore)}`}
                            title="Composite suspicion score (0-100)"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Risk {Math.round(c.fraudScore)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0 text-sm text-slate-600 dark:text-slate-400">
                        <span>{c.claimType}</span>
                        <span>{c.venueState}{c.venueCounty ? `, ${c.venueCounty}` : ''}</span>
                        <span>Score: {(c.caseScore * 100).toFixed(0)}%</span>
                        {c.valueEstimate != null && (
                          <span>Est. ${(c.valueEstimate / 1000).toFixed(0)}k</span>
                        )}
                      </div>
                      {c.manualReviewHeldAt && (
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Held {formatDate(c.manualReviewHeldAt)}
                        </div>
                      )}
                      {c.manualReviewNote && (
                        <div className="mt-2 rounded bg-slate-50 p-2 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
                          {c.manualReviewNote}
                        </div>
                      )}
                      {Array.isArray(c.fraudSignals) && c.fraudSignals.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Why this was flagged
                          </p>
                          {(c.fraudSignals as FraudSignal[]).map((s) => (
                            <div key={s.code} className="flex items-start gap-2 text-sm">
                              <span
                                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${severityTone(s.severity)}`}
                              >
                                {s.severity}
                              </span>
                              <span className="text-slate-700 dark:text-slate-300">
                                <span className="font-medium">{s.label}.</span>{' '}
                                <span className="text-slate-500 dark:text-slate-400">
                                  {s.detail}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigate(`/admin/cases/${c.id}`)}
                        className="btn-outline inline-flex items-center gap-1 text-ui-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View
                      </button>

                      <div className="relative">
                        <button
                          onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                          className="btn-outline inline-flex items-center gap-1 text-ui-sm"
                        >
                          Actions
                          <ChevronDown className={`h-4 w-4 transition-transform ${expandedId === c.id ? 'rotate-180' : ''}`} />
                        </button>

                        {expandedId === c.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setExpandedId(null)}
                            />
                            <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                              <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                                <input
                                  type="text"
                                  placeholder="Optional note…"
                                  value={actionNote || ''}
                                  onChange={(e) => setActionNote(e.target.value)}
                                  className="input py-1"
                                />
                              </div>
                              <button
                                onClick={() => handleAction(c.id, 'release')}
                                disabled={actingId === c.id}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                                Release to routing
                              </button>
                              <button
                                onClick={() => handleAction(c.id, 'request_info')}
                                disabled={actingId === c.id}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <MessageSquare className="h-4 w-4 text-amber-600" />
                                Request more info
                              </button>
                              <button
                                onClick={() => handleAction(c.id, 'compliance')}
                                disabled={actingId === c.id}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Shield className="h-4 w-4 text-brand-600" />
                                Send to compliance
                              </button>
                              <button
                                onClick={() => handleAction(c.id, 'reject')}
                                disabled={actingId === c.id}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

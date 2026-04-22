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
} from 'lucide-react'

const REASON_LABELS: Record<string, string> = {
  low_confidence: 'Low confidence',
  duplicate: 'Duplicate',
  conflicting_facts: 'Conflicting facts',
  suspicious_documents: 'Suspicious documents',
  near_sol: 'Near SOL',
  unsupported_jurisdiction: 'Unsupported jurisdiction',
  premium_case: 'Premium case review',
  ocr_failure: 'OCR failure',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-slate-500">Loading manual review queue…</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Manual review queue</h1>
        <button
          onClick={loadQueue}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {cases.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="font-medium">No cases in manual review</p>
            <p className="mt-1 text-sm">
              Cases can be held for low confidence, duplicate, conflicting facts, suspicious
              documents, near-SOL, unsupported jurisdiction, premium case review, or OCR failure.
            </p>
            <p className="mt-2 text-sm">
              Add cases from the Case detail page: open a case → Actions → Hold for manual review.
            </p>
          </div>
        ) : (
          <>
            {reasons.length > 0 && (
              <div className="border-b border-slate-200 px-4 py-3">
                <label className="mr-2 text-sm font-medium text-slate-700">Filter by reason:</label>
                <select
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
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

            <div className="divide-y divide-slate-100">
              {filteredCases.map((c) => (
                <div
                  key={c.id}
                  className="px-4 py-4 hover:bg-slate-50/50 transition-colors"
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
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {REASON_LABELS[c.manualReviewReason] || c.manualReviewReason}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0 text-sm text-slate-600">
                        <span>{c.claimType}</span>
                        <span>{c.venueState}{c.venueCounty ? `, ${c.venueCounty}` : ''}</span>
                        <span>Score: {(c.caseScore * 100).toFixed(0)}%</span>
                        {c.valueEstimate != null && (
                          <span>Est. ${(c.valueEstimate / 1000).toFixed(0)}k</span>
                        )}
                      </div>
                      {c.manualReviewHeldAt && (
                        <div className="mt-1 text-xs text-slate-500">
                          Held {formatDate(c.manualReviewHeldAt)}
                        </div>
                      )}
                      {c.manualReviewNote && (
                        <div className="mt-2 text-sm text-slate-600 bg-slate-50 rounded p-2">
                          {c.manualReviewNote}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigate(`/admin/cases/${c.id}`)}
                        className="flex items-center gap-1 rounded border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View
                      </button>

                      <div className="relative">
                        <button
                          onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                          className="flex items-center gap-1 rounded border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
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
                            <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
                              <div className="px-3 py-2 border-b border-slate-100">
                                <input
                                  type="text"
                                  placeholder="Optional note..."
                                  value={actionNote || ''}
                                  onChange={(e) => setActionNote(e.target.value)}
                                  className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                                />
                              </div>
                              <button
                                onClick={() => handleAction(c.id, 'release')}
                                disabled={actingId === c.id}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                Release to routing
                              </button>
                              <button
                                onClick={() => handleAction(c.id, 'request_info')}
                                disabled={actingId === c.id}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                <MessageSquare className="h-4 w-4 text-amber-600" />
                                Request more info
                              </button>
                              <button
                                onClick={() => handleAction(c.id, 'compliance')}
                                disabled={actingId === c.id}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                <Shield className="h-4 w-4 text-brand-600" />
                                Send to compliance
                              </button>
                              <button
                                onClick={() => handleAction(c.id, 'reject')}
                                disabled={actingId === c.id}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
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
          </>
        )}
      </div>
    </div>
  )
}

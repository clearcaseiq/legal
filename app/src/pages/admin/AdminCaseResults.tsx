/**
 * Review queue for attorney-submitted case results.
 *
 * Attorneys self-report settlements and verdicts; until someone here reads the
 * supporting document and decides, the result shows on their profile as
 * "Self-reported". Rejections require a reason because the attorney sees it.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'
import {
  getAdminCaseResults,
  getEvidenceObjectUrl,
  reviewAdminCaseResult,
  type AdminCaseResult,
} from '../../lib/api'
import { formatDate } from '../../lib/formatters'
import { PageHeader, Pagination, SectionCard } from '../../features/shared/ui'

const STATUS_TONE: Record<AdminCaseResult['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  verified: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-700',
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

export default function AdminCaseResults() {
  const [rows, setRows] = useState<AdminCaseResult[]>([])
  const [total, setTotal] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [limit, setLimit] = useState(25)
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [docUrls, setDocUrls] = useState<Record<string, string>>({})
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminCaseResults({ limit, offset, status, search: appliedSearch })
      setRows(data.data || [])
      setTotal(data.total || 0)
      setPendingCount(data.pendingCount || 0)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load case results')
    } finally {
      setLoading(false)
    }
  }, [limit, offset, status, appliedSearch])

  useEffect(() => {
    load()
  }, [load])

  // Debounced so typing a firm name does not fire a request per keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setAppliedSearch(searchTerm.trim())
      setOffset(0)
    }, 300)
    return () => window.clearTimeout(id)
  }, [searchTerm])

  // Documents are behind an authenticated route, so they are fetched as blobs
  // rather than linked directly.
  const openDocument = async (row: AdminCaseResult) => {
    if (!row.documentUrl) return
    const cached = docUrls[row.id]
    if (cached) {
      window.open(cached, '_blank', 'noopener')
      return
    }
    setLoadingDoc(row.id)
    setError(null)
    try {
      const url = await getEvidenceObjectUrl(row.documentUrl)
      setDocUrls((prev) => ({ ...prev, [row.id]: url }))
      window.open(url, '_blank', 'noopener')
    } catch {
      setError('Could not open the supporting document.')
    } finally {
      setLoadingDoc(null)
    }
  }

  const review = async (row: AdminCaseResult, action: 'verify' | 'reject') => {
    if (action === 'reject' && !note.trim()) {
      setError('Give a reason so the attorney knows what to fix.')
      return
    }
    setActingId(row.id)
    setError(null)
    try {
      await reviewAdminCaseResult(row.id, action, note.trim() || undefined)
      setRejectingId(null)
      setNote('')
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Review failed')
    } finally {
      setActingId(null)
    }
  }

  useEffect(() => {
    // Blob URLs leak until revoked, and this screen can open many.
    return () => Object.values(docUrls).forEach((url) => URL.revokeObjectURL(url))
  }, [docUrls])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Case Results"
        description="Attorney-reported settlements and verdicts. Results stay labelled self-reported on the attorney's profile until verified here."
        actions={
          <button
            onClick={load}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      <SectionCard
        title={`${pendingCount.toLocaleString()} awaiting review`}
        trailing={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setOffset(0)
              }}
              className="input w-auto"
              aria-label="Filter by status"
            >
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search attorney, venue, case no…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-9"
              />
            </div>
          </div>
        }
      >
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">Loading case results…</p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {status === 'pending' ? 'Nothing is waiting for review.' : 'No case results match.'}
          </p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-slate-200 p-5 dark:border-slate-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {row.caseType}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[row.status]}`}
                      >
                        {row.status}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        {row.resultType}
                      </span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {money(row.settlementAmount)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {[row.attorneyName, row.firmName, row.venue, row.date]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                    {row.caseNumber && (
                      <p className="mt-0.5 text-xs text-slate-400">Case no. {row.caseNumber}</p>
                    )}
                    {row.caseDescription && (
                      <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                        {row.caseDescription}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-400">
                      Submitted {formatDate(row.submittedAt)}
                      {row.reviewedAt &&
                        ` • Reviewed ${formatDate(row.reviewedAt)}${row.reviewedBy ? ` by ${row.reviewedBy}` : ''}`}
                    </p>
                    {row.reviewNote && (
                      <p className="mt-1 text-xs text-slate-500">Note: {row.reviewNote}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {row.documentUrl ? (
                      <button
                        onClick={() => openDocument(row)}
                        disabled={loadingDoc === row.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        {loadingDoc === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                        {row.documentName || 'View document'}
                      </button>
                    ) : (
                      <span className="text-xs italic text-slate-400">No document attached</span>
                    )}

                    {row.status !== 'verified' && (
                      <button
                        onClick={() => review(row, 'verify')}
                        disabled={actingId === row.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {actingId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        Verify
                      </button>
                    )}
                    {row.status !== 'rejected' && (
                      <button
                        onClick={() => {
                          setRejectingId(rejectingId === row.id ? null : row.id)
                          setNote('')
                        }}
                        disabled={actingId === row.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    )}
                  </div>
                </div>

                {rejectingId === row.id && (
                  <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900 dark:bg-rose-950/20">
                    <label
                      htmlFor={`reject-note-${row.id}`}
                      className="text-xs font-semibold text-rose-700 dark:text-rose-300"
                    >
                      Why is this being rejected? The attorney sees this.
                    </label>
                    <textarea
                      id={`reject-note-${row.id}`}
                      autoFocus
                      rows={2}
                      value={note}
                      maxLength={1000}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. The attached order does not show the settlement amount."
                      className="mt-2 w-full rounded-lg border border-rose-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        onClick={() => setRejectingId(null)}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => review(row, 'reject')}
                        disabled={!note.trim() || actingId === row.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-40"
                      >
                        {actingId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Confirm rejection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Pagination
          total={total}
          limit={limit}
          offset={offset}
          disabled={loading}
          onChange={setOffset}
          onLimitChange={(next) => {
            setLimit(next)
            setOffset(0)
          }}
          className="mt-4"
        />
      </SectionCard>
    </div>
  )
}

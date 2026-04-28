import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  approveAdminDocumentChronology,
  correctAdminDocumentExtraction,
  getAdminDocuments,
  reprocessAdminDocument,
  type AdminDocumentItem,
} from '../../lib/api'
import {
  CheckCircle,
  ClipboardCheck,
  Eye,
  FileSearch,
  FileText,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  TableProperties,
  AlertTriangle,
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  needs_review: 'Needs review',
  ready: 'Ready',
  approved: 'Approved',
  not_ready: 'Not ready',
  not_applicable: 'N/A',
}

const CATEGORIES = [
  'medical_records',
  'bills',
  'police_report',
  'photos',
  'correspondence',
  'wage_loss',
  'insurance',
  'other',
]

type CorrectionForm = {
  category: string
  subcategory: string
  aiSummary: string
  dates: string
  dollarAmounts: string
  totalAmount: string
  icdCodes: string
  cptCodes: string
  keywords: string
  confidence: string
}

export default function AdminDocuments() {
  const [searchParams] = useSearchParams()
  const [documents, setDocuments] = useState<AdminDocumentItem[]>([])
  const [summary, setSummary] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [actingId, setActingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdminDocumentItem | null>(null)
  const [form, setForm] = useState<CorrectionForm | null>(null)

  const assessmentId = searchParams.get('case') || undefined

  const loadDocuments = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminDocuments({
        status,
        category,
        query: query.trim() || undefined,
        assessmentId,
        limit: 100,
      })
      setDocuments(data.documents || [])
      setSummary(data.summary || {})
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDocuments()
  }, [status, category, assessmentId])

  const pipelineTotals = useMemo(() => {
    return {
      total: summary.total ?? documents.length,
      ocrPending: summary.ocrPending ?? 0,
      extractionNeedsReview: summary.extractionNeedsReview ?? 0,
      chronologyReady: summary.chronologyReady ?? 0,
      billExtractionNeedsReview: summary.billExtractionNeedsReview ?? 0,
    }
  }, [documents.length, summary])

  const replaceDocument = (updated?: AdminDocumentItem | null) => {
    if (!updated) return
    setDocuments((current) => current.map((doc) => doc.id === updated.id ? updated : doc))
    setEditing((current) => current?.id === updated.id ? updated : current)
  }

  const handleReprocess = async (document: AdminDocumentItem) => {
    setActingId(document.id)
    setError(null)
    try {
      const result = await reprocessAdminDocument(document.id)
      replaceDocument(result.document)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to reprocess document')
    } finally {
      setActingId(null)
    }
  }

  const handleApproveChronology = async (document: AdminDocumentItem) => {
    setActingId(document.id)
    setError(null)
    try {
      const result = await approveAdminDocumentChronology(document.id)
      replaceDocument(result.document)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to approve chronology')
    } finally {
      setActingId(null)
    }
  }

  const openCorrection = (document: AdminDocumentItem) => {
    setEditing(document)
    setForm({
      category: document.category || 'other',
      subcategory: document.subcategory || '',
      aiSummary: document.aiSummary || '',
      dates: document.extractedData?.dates.join(', ') || '',
      dollarAmounts: document.extractedData?.dollarAmounts.join(', ') || '',
      totalAmount: document.extractedData?.totalAmount != null ? String(document.extractedData.totalAmount) : '',
      icdCodes: document.extractedData?.icdCodes.join(', ') || '',
      cptCodes: document.extractedData?.cptCodes.join(', ') || '',
      keywords: document.extractedData?.keywords.join(', ') || '',
      confidence: document.extractedData?.confidence != null ? String(document.extractedData.confidence) : '0.95',
    })
  }

  const handleSaveCorrection = async () => {
    if (!editing || !form) return
    setActingId(editing.id)
    setError(null)
    try {
      const result = await correctAdminDocumentExtraction(editing.id, {
        category: form.category,
        subcategory: form.subcategory.trim() || null,
        aiSummary: form.aiSummary.trim() || null,
        extractedData: {
          dates: splitList(form.dates),
          dollarAmounts: splitList(form.dollarAmounts),
          totalAmount: form.totalAmount.trim() ? Number(form.totalAmount) : null,
          icdCodes: splitList(form.icdCodes),
          cptCodes: splitList(form.cptCodes),
          keywords: splitList(form.keywords),
          confidence: clampConfidence(form.confidence),
        },
      })
      replaceDocument(result.document)
      setEditing(null)
      setForm(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save corrected extraction')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="page-shell space-y-8">
      <div className="page-header">
        <div className="section-heading">
          <h1 className="section-title">Documents & OCR</h1>
          <p className="section-copy">
            Track ingestion, OCR, extraction, chronology readiness, and bill extraction across plaintiff evidence.
          </p>
        </div>
        <button onClick={loadDocuments} className="btn-ghost inline-flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {assessmentId && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Showing documents for case <span className="font-mono">{assessmentId}</span>.
          <Link to="/admin/documents" className="ml-2 font-semibold underline">Clear case filter</Link>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={FileText} label="Ingested documents" value={pipelineTotals.total} tone="brand" />
        <MetricCard icon={FileSearch} label="OCR pending" value={pipelineTotals.ocrPending} tone="amber" />
        <MetricCard icon={TableProperties} label="Extraction review" value={pipelineTotals.extractionNeedsReview} tone="rose" />
        <MetricCard icon={ClipboardCheck} label="Chronology ready" value={pipelineTotals.chronologyReady} tone="blue" />
        <MetricCard icon={AlertTriangle} label="Bills need review" value={pipelineTotals.billExtractionNeedsReview} tone="emerald" />
      </div>

      <div className="premium-panel p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_200px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void loadDocuments()
              }}
              placeholder="Search filename, OCR text, summary, or case ID"
              className="input pl-9"
            />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="select">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="select">
            <option value="all">All categories</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>{labelize(item)}</option>
            ))}
          </select>
          <button onClick={loadDocuments} className="btn-primary">
            Search
          </button>
        </div>
      </div>

      <div className="surface-panel overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
            Loading document pipeline...
          </div>
        ) : documents.length === 0 ? (
          <div className="helpful-empty m-6">
            <FileSearch className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-medium text-slate-900">No documents found</p>
            <p className="mt-1 text-sm text-slate-500">Try clearing filters or searching another case.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="app-data-table min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <HeaderCell>Document</HeaderCell>
                  <HeaderCell>Pipeline</HeaderCell>
                  <HeaderCell>Extraction</HeaderCell>
                  <HeaderCell>Case</HeaderCell>
                  <HeaderCell>Actions</HeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {documents.map((document) => (
                  <tr key={document.id} className="align-top">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-xs truncate font-medium text-slate-900">{document.originalName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatBytes(document.size)} • {labelize(document.category)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">Uploaded {formatDate(document.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <StatusPill label="Ingestion" status={document.processingStatus} />
                        <StatusPill label="OCR" status={document.ocrStatus} />
                        <StatusPill label="Extraction" status={document.extractionStatus} />
                        <StatusPill label="Chronology" status={document.chronologyStatus} />
                        <StatusPill label="Bills" status={document.billExtractionStatus} />
                      </div>
                      {document.latestJob && (
                        <p className="mt-2 text-xs text-slate-500">
                          Latest job: {labelize(document.latestJob.jobType)} ({document.latestJob.status})
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      <div className="space-y-1">
                        {document.aiClassification && <p>Classified: {labelize(document.aiClassification)}</p>}
                        {document.extractedData?.totalAmount != null && (
                          <p className="font-medium text-emerald-700">Bills: {formatCurrency(document.extractedData.totalAmount)}</p>
                        )}
                        {document.extractedData?.dates?.length ? <p>{document.extractedData.dates.length} chronology date(s)</p> : null}
                        {document.extractedData?.confidence != null && (
                          <p className="text-xs text-slate-500">Confidence {Math.round(document.extractedData.confidence * 100)}%</p>
                        )}
                        {!document.extractedData && <p className="text-slate-400">No extracted data yet</p>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {document.case ? (
                        <div>
                          <Link to={`/admin/cases/${document.case.id}`} className="font-medium text-brand-700 hover:underline">
                            {document.case.id.slice(-8)}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">
                            {labelize(document.case.claimType)} • {document.case.venueCounty ? `${document.case.venueCounty}, ` : ''}{document.case.venueState}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">{document.plaintiff?.email || 'No plaintiff email'}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400">No linked case</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => window.open(document.fileUrl, '_blank')}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          onClick={() => void handleReprocess(document)}
                          disabled={actingId === document.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reprocess
                        </button>
                        <button
                          onClick={() => openCorrection(document)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
                        >
                          <TableProperties className="h-3.5 w-3.5" />
                          Correct
                        </button>
                        <button
                          onClick={() => void handleApproveChronology(document)}
                          disabled={actingId === document.id || document.chronologyStatus === 'approved' || document.chronologyStatus === 'not_ready'}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Approve chronology
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="surface-panel max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Correct extracted data</h2>
                <p className="mt-1 text-sm text-slate-500">{editing.originalName}</p>
              </div>
              <button onClick={() => { setEditing(null); setForm(null) }} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>

            {editing.ocrPreview && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">OCR preview</p>
                <p className="mt-2 max-h-28 overflow-y-auto text-sm text-slate-700">{editing.ocrPreview}</p>
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Category">
                <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="input">
                  {CATEGORIES.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                </select>
              </Field>
              <Field label="Subcategory">
                <input value={form.subcategory} onChange={(event) => setForm({ ...form, subcategory: event.target.value })} className="input" />
              </Field>
              <Field label="Dates for chronology">
                <input value={form.dates} onChange={(event) => setForm({ ...form, dates: event.target.value })} className="input" placeholder="2026-04-01, 04/15/2026" />
              </Field>
              <Field label="Dollar amounts">
                <input value={form.dollarAmounts} onChange={(event) => setForm({ ...form, dollarAmounts: event.target.value })} className="input" placeholder="$1,200, $450" />
              </Field>
              <Field label="Total bill amount">
                <input type="number" value={form.totalAmount} onChange={(event) => setForm({ ...form, totalAmount: event.target.value })} className="input" />
              </Field>
              <Field label="Confidence">
                <input type="number" min="0" max="1" step="0.01" value={form.confidence} onChange={(event) => setForm({ ...form, confidence: event.target.value })} className="input" />
              </Field>
              <Field label="ICD codes">
                <input value={form.icdCodes} onChange={(event) => setForm({ ...form, icdCodes: event.target.value })} className="input" />
              </Field>
              <Field label="CPT codes">
                <input value={form.cptCodes} onChange={(event) => setForm({ ...form, cptCodes: event.target.value })} className="input" />
              </Field>
              <Field label="Keywords">
                <input value={form.keywords} onChange={(event) => setForm({ ...form, keywords: event.target.value })} className="input" />
              </Field>
              <Field label="AI summary">
                <textarea value={form.aiSummary} onChange={(event) => setForm({ ...form, aiSummary: event.target.value })} className="input min-h-[96px]" />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setEditing(null); setForm(null) }} className="btn-outline">Cancel</button>
              <button
                onClick={() => void handleSaveCorrection()}
                disabled={actingId === editing.id}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {actingId === editing.id ? 'Saving...' : 'Save correction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof FileText; label: string; value: number | string; tone: string }) {
  const tones: Record<string, string> = {
    brand: 'border-brand-200 bg-brand-50 text-brand-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
  return (
    <div className={`metric-card ${tones[tone] || tones.brand}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm opacity-80">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  )
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  )
}

function StatusPill({ label, status }: { label: string; status: string }) {
  const tone = status === 'completed' || status === 'approved'
    ? 'status-pill-success'
    : status === 'failed' || status === 'needs_review'
      ? 'status-pill-danger'
      : status === 'ready' || status === 'processing'
        ? 'status-pill-info'
        : 'status-pill-neutral'
  return (
    <span className={tone}>
      {label}: {STATUS_LABELS[status] || labelize(status)}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function clampConfidence(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0.95
  return Math.min(1, Math.max(0, parsed))
}

function labelize(value?: string | null) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

/**
 * Visits, charges and wage figures read from the case's uploaded records,
 * waiting for the attorney to accept them into the Medical timeline or the
 * Damages ledger.
 *
 * Every finding shows the passage it was read from and links to its page, so
 * the attorney checks it against the record before it counts toward anything.
 * Backed by /v1/attorney-dashboard/leads/:leadId/document-findings.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, FileSearch, FileText, Pencil, RefreshCw, X } from 'lucide-react'
import {
  acceptDocumentFinding,
  getDocumentFindings,
  rejectDocumentFinding,
  scanDocumentFindings,
  type DocumentFinding,
  type DocumentFindingData,
  type DocumentFindingKind,
  type DocumentFindingsResponse,
} from '../../lib/api'
import { openEvidenceFile } from '../../lib/evidenceFileUrl'

const VISIT_TYPES = [
  { value: 'initial_eval', label: 'Initial eval' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'therapy', label: 'Therapy (PT/chiro)' },
  { value: 'er', label: 'ER / urgent care' },
  { value: 'other', label: 'Other' },
]

const KIND_LABEL: Record<DocumentFindingKind, string> = {
  treatment_visit: 'Visit',
  medical_charge: 'Charge',
  wage_loss: 'Lost wages',
}

const POLL_MS = 5000
const POLL_ATTEMPTS = 12

function money(n?: number | null) {
  if (n == null || !Number.isFinite(n)) return null
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
}

function fmtDate(iso?: string | null) {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { timeZone: 'UTC' })
}

function confidenceBadge(c: number) {
  if (c >= 0.8) return { label: 'High confidence', cls: 'bg-emerald-50 text-emerald-700' }
  if (c >= 0.5) return { label: 'Medium confidence', cls: 'bg-amber-50 text-amber-700' }
  return { label: 'Low confidence', cls: 'bg-rose-50 text-rose-700' }
}

export function SourceLink({
  fileUrl,
  fileName,
  page,
  quote,
}: {
  fileUrl?: string | null
  fileName?: string | null
  page?: number | null
  quote?: string | null
}) {
  if (!fileUrl) return null
  return (
    <button
      type="button"
      onClick={() => void openEvidenceFile(fileUrl, { page })}
      title={quote ? `“${quote}”` : 'Open the source document'}
      className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 hover:bg-brand-100"
    >
      <FileText className="h-3 w-3 shrink-0" />
      <span className="truncate">
        {fileName || 'Source'}
        {page ? ` · p. ${page}` : ''}
      </span>
    </button>
  )
}

type EditState = {
  date: string
  provider: string
  visitType: string
  diagnosis: string
  description: string
  amount: string
}

function editStateFor(f: DocumentFinding): EditState {
  return {
    date: f.data.date || '',
    provider: f.data.provider || '',
    visitType: f.data.visitType || 'other',
    diagnosis: f.data.diagnosis || '',
    description: f.data.description || '',
    amount: f.data.amount != null ? String(f.data.amount) : '',
  }
}

function FindingRow({
  finding,
  busy,
  onAccept,
  onReject,
}: {
  finding: DocumentFinding
  busy: boolean
  onAccept: (overrides: Partial<DocumentFindingData>) => void
  onReject: () => void
}) {
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [edit, setEdit] = useState<EditState | null>(null)
  const d = finding.data
  const isVisit = finding.kind === 'treatment_visit'
  const badge = confidenceBadge(finding.confidence)
  const inputCls =
    'mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  const submitEdit = () => {
    if (!edit) return
    onAccept({
      date: edit.date || null,
      provider: edit.provider.trim() || null,
      ...(isVisit
        ? { visitType: edit.visitType, diagnosis: edit.diagnosis.trim() || null }
        : { description: edit.description.trim() || null }),
      amount: edit.amount === '' ? null : Number(edit.amount),
    })
  }

  const title = isVisit
    ? [d.provider, d.diagnosis].filter(Boolean).join(' · ') || 'Treatment visit'
    : d.description || d.provider || KIND_LABEL[finding.kind]

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {KIND_LABEL[finding.kind]}
            </span>
            <span className="font-medium text-slate-800">{title}</span>
            {money(d.amount) ? <span className="text-sm font-semibold tabular-nums text-slate-900">{money(d.amount)}</span> : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span>{fmtDate(d.date) || <span className="text-amber-700">No date on the page — add one</span>}</span>
            {!isVisit && d.provider ? <span>· {d.provider}</span> : null}
            {[...(d.icdCodes || []), ...(d.cptCodes || [])].map((code) => (
              <span key={code} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                {code}
              </span>
            ))}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>{badge.label}</span>
            {d.possibleDuplicateOf ? (
              <span
                className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                title="Something on this tab already matches this date and provider or amount. Accepting would count it twice."
              >
                Possible duplicate
              </span>
            ) : null}
            <SourceLink fileUrl={finding.fileUrl} fileName={finding.fileName} page={finding.pageNumber} quote={finding.sourceQuote} />
          </div>
          <button
            type="button"
            onClick={() => setQuoteOpen((v) => !v)}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700"
          >
            {quoteOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {quoteOpen ? 'Hide passage' : 'Show the passage it was read from'}
          </button>
          {quoteOpen ? (
            <blockquote className="mt-1 border-l-2 border-brand-200 bg-slate-50 px-3 py-2 text-xs italic text-slate-600">
              “{finding.sourceQuote}”
            </blockquote>
          ) : null}
        </div>
        {!edit ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => onAccept({})}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> Accept
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEdit(editStateFor(finding))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </button>
          </div>
        ) : null}
      </div>
      {edit ? (
        <div className="mt-2 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
          <label className="block text-xs font-medium text-slate-500">
            Date
            <input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} className={inputCls} />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Provider
            <input value={edit.provider} onChange={(e) => setEdit({ ...edit, provider: e.target.value })} className={inputCls} />
          </label>
          {isVisit ? (
            <>
              <label className="block text-xs font-medium text-slate-500">
                Type
                <select value={edit.visitType} onChange={(e) => setEdit({ ...edit, visitType: e.target.value })} className={inputCls}>
                  {VISIT_TYPES.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Diagnosis
                <input value={edit.diagnosis} onChange={(e) => setEdit({ ...edit, diagnosis: e.target.value })} className={inputCls} />
              </label>
            </>
          ) : (
            <label className="block text-xs font-medium text-slate-500 sm:col-span-1">
              Description
              <input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className={inputCls} />
            </label>
          )}
          <label className="block text-xs font-medium text-slate-500">
            {isVisit ? 'Billed ($)' : 'Amount ($)'}
            <input type="number" min={0} value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} className={inputCls} />
          </label>
          {!isVisit && d.amount != null && edit.amount !== '' && Number(edit.amount) !== d.amount ? (
            <p className="col-span-full text-[11px] text-slate-500">
              The document prints {money(d.amount)}. The printed figure stays on record beside yours.
            </p>
          ) : null}
          <div className="col-span-full flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEdit(null)}
              disabled={busy}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitEdit}
              disabled={busy}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Save and accept
            </button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

export default function DocumentFindingsPanel({
  leadId,
  kinds,
  title,
  destination,
  onAccepted,
  canEdit = true,
}: {
  leadId: string
  kinds: DocumentFindingKind[]
  title: string
  /** Where accepted findings go, for the help text: "the treatment timeline". */
  destination: string
  onAccepted?: () => void
  canEdit?: boolean
}) {
  const [res, setRes] = useState<DocumentFindingsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [showReviewed, setShowReviewed] = useState(false)
  const pollRef = useRef<number | null>(null)
  const kindsKey = kinds.join(',')

  const load = useCallback(async () => {
    try {
      const next = await getDocumentFindings(leadId, kindsKey.split(',') as DocumentFindingKind[])
      setRes(next)
      setError(null)
      return next
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load what was found in the documents.')
      return null
    }
  }, [leadId, kindsKey])

  useEffect(() => {
    void load()
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current)
    }
  }, [load])

  const rescan = async () => {
    setScanning(true)
    setError(null)
    try {
      const { queued } = await scanDocumentFindings(leadId)
      if (queued === 0) {
        setScanning(false)
        setError('There are no medical records, bills or wage documents on this case to read.')
        return
      }
      const before = res?.findings.filter((f) => f.status === 'proposed').length ?? 0
      let attempts = 0
      const tick = async () => {
        attempts += 1
        const next = await load()
        const now = next?.findings.filter((f) => f.status === 'proposed').length ?? 0
        if (now !== before || attempts >= POLL_ATTEMPTS) {
          setScanning(false)
          return
        }
        pollRef.current = window.setTimeout(() => void tick(), POLL_MS)
      }
      pollRef.current = window.setTimeout(() => void tick(), POLL_MS)
    } catch (err: any) {
      setScanning(false)
      setError(err?.response?.data?.error || 'Could not start reading the documents.')
    }
  }

  const accept = async (f: DocumentFinding, overrides: Partial<DocumentFindingData>) => {
    setBusyId(f.id)
    setError(null)
    try {
      await acceptDocumentFinding(leadId, f.id, overrides)
      await load()
      onAccepted?.()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not accept this finding.')
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (f: DocumentFinding) => {
    setBusyId(f.id)
    setError(null)
    try {
      await rejectDocumentFinding(leadId, f.id)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not reject this finding.')
    } finally {
      setBusyId(null)
    }
  }

  if (!res) return error ? <p className="text-sm text-rose-600">{error}</p> : null

  if (!res.medicalSharing.canShareMedicalData) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FileSearch className="h-4 w-4 text-slate-400" /> {title}
        </h3>
        {res.medicalSharing.message || 'Records can be read once the client has authorized sharing their medical information.'}
      </div>
    )
  }

  const proposed = res.findings.filter((f) => f.status === 'proposed')
  const reviewed = res.findings.filter((f) => f.status !== 'proposed')

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FileSearch className="h-4 w-4 text-brand-500" /> {title}
          {proposed.length ? (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">{proposed.length} to review</span>
          ) : null}
        </h3>
        {canEdit ? (
          <button
            type="button"
            onClick={() => void rescan()}
            disabled={scanning}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Reading documents…' : 'Re-read documents'}
          </button>
        ) : null}
      </div>
      <p className="text-xs text-slate-500">
        Read from the case&apos;s uploaded records. Nothing here counts until you accept it into {destination}. Check each one against
        the page before accepting.
        {res.mode === 'rules'
          ? ' AI reading is switched off on this deployment, so only dated charge lines on bills are picked up.'
          : ''}
      </p>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}

      {proposed.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">
          {scanning ? 'Reading the documents now. New findings appear here as they are ready.' : 'Nothing waiting for review.'}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {proposed.map((f) => (
            <FindingRow
              key={f.id}
              finding={f}
              busy={!canEdit || busyId === f.id}
              onAccept={(o) => void accept(f, o)}
              onReject={() => void reject(f)}
            />
          ))}
        </ul>
      )}

      {reviewed.length ? (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => setShowReviewed((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            {showReviewed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Reviewed ({reviewed.length})
          </button>
          {showReviewed ? (
            <ul className="mt-1 space-y-1">
              {reviewed.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      f.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {f.status === 'accepted' ? 'Accepted' : 'Rejected'}
                  </span>
                  <span>
                    {KIND_LABEL[f.kind]} · {fmtDate(f.data.date) || 'undated'}
                    {f.data.provider ? ` · ${f.data.provider}` : ''}
                    {money(f.data.amount) ? ` · ${money(f.data.amount)}` : ''}
                  </span>
                  {f.reviewedByName ? <span>by {f.reviewedByName}</span> : null}
                  <SourceLink fileUrl={f.fileUrl} fileName={f.fileName} page={f.pageNumber} quote={f.sourceQuote} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

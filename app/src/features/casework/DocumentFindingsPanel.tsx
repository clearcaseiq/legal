/**
 * Visits, charges and wage figures read from the case's uploaded records, and
 * the facts of police reports and insurance documents, waiting for the attorney
 * to accept them into the Medical timeline, Damages ledger, Liability tab or
 * Insurance tab. A record that disagrees with the case says so.
 *
 * Every finding shows the passage it was read from and links to its page, so
 * the attorney checks it against the record before it counts toward anything.
 * Backed by /v1/attorney-dashboard/leads/:leadId/document-findings.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, ChevronDown, ChevronUp, FileSearch, FileText, Pencil, RefreshCw, X } from 'lucide-react'
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
  incident_report: 'Police report',
  insurance_policy: 'Policy',
}

const MEDICAL_KINDS: DocumentFindingKind[] = ['treatment_visit', 'medical_charge', 'wage_loss']

const CITATION_LABEL: Record<string, string> = {
  none: 'No citation',
  defendant: 'Defendant cited',
  plaintiff: 'Client cited',
  both: 'Both cited',
}

type FieldSpec = {
  key: keyof DocumentFindingData
  label: string
  type?: 'date' | 'number' | 'select'
  options?: { value: string; label: string }[]
}

/** Edit fields for findings that become a police report or a policy rather than a timeline or ledger line. */
const RECORD_FIELDS: Partial<Record<DocumentFindingKind, FieldSpec[]>> = {
  incident_report: [
    { key: 'date', label: 'Incident date', type: 'date' },
    { key: 'reportNumber', label: 'Report number' },
    { key: 'agency', label: 'Agency' },
    { key: 'defendantName', label: 'Other party' },
    { key: 'defendantInsurer', label: 'Their insurer' },
    { key: 'defendantPolicyNumber', label: 'Their policy #' },
    {
      key: 'citationIssuedTo',
      label: 'Citation',
      type: 'select',
      options: [{ value: '', label: 'Not stated' }, ...Object.entries(CITATION_LABEL).map(([value, label]) => ({ value, label }))],
    },
    { key: 'witnessCount', label: 'Witnesses', type: 'number' },
  ],
  insurance_policy: [
    { key: 'carrierName', label: 'Carrier' },
    { key: 'policyNumber', label: 'Policy number' },
    { key: 'claimNumber', label: 'Claim number' },
    {
      key: 'insuredParty',
      label: 'Whose policy',
      type: 'select',
      options: [
        { value: '', label: 'Not stated' },
        { value: 'defendant', label: "Defendant's" },
        { value: 'client', label: "Client's own" },
      ],
    },
    {
      key: 'coverageType',
      label: 'Coverage',
      type: 'select',
      options: [
        { value: '', label: 'Not stated' },
        { value: 'liability', label: 'Liability' },
        { value: 'um', label: 'UM' },
        { value: 'uim', label: 'UIM' },
        { value: 'medpay', label: 'MedPay' },
        { value: 'other', label: 'Other' },
      ],
    },
    { key: 'policyLimit', label: 'Per person ($)', type: 'number' },
    { key: 'perAccidentLimit', label: 'Per accident ($)', type: 'number' },
    { key: 'adjusterName', label: 'Adjuster' },
    { key: 'adjusterEmail', label: 'Adjuster email' },
    { key: 'adjusterPhone', label: 'Adjuster phone' },
  ],
}

function documentsLabel(kinds: DocumentFindingKind[]): string {
  const parts: string[] = []
  if (kinds.some((k) => MEDICAL_KINDS.includes(k))) parts.push('medical records, bills or wage documents')
  if (kinds.includes('incident_report')) parts.push('police reports')
  if (kinds.includes('insurance_policy')) parts.push('insurance documents')
  return parts.join(' or ') || 'documents'
}

/** The headline and detail chips for a finding, by kind. */
function describeFinding(f: DocumentFinding): { title: string; details: string[] } {
  const d = f.data
  if (f.kind === 'incident_report') {
    return {
      title: [d.agency, d.reportNumber ? `Report ${d.reportNumber}` : null].filter(Boolean).join(' · ') || 'Police report',
      details: [
        d.time ? `at ${d.time}` : null,
        d.location,
        d.defendantName ? `Other party: ${d.defendantName}` : null,
        d.defendantInsurer ? `Insured by ${d.defendantInsurer}${d.defendantPolicyNumber ? ` (#${d.defendantPolicyNumber})` : ''}` : null,
        d.citationIssuedTo ? CITATION_LABEL[d.citationIssuedTo] || d.citationIssuedTo : null,
        d.witnessCount != null ? `${d.witnessCount} witness${d.witnessCount === 1 ? '' : 'es'}` : null,
      ].filter(Boolean) as string[],
    }
  }
  if (f.kind === 'insurance_policy') {
    const limits = [money(d.policyLimit), money(d.perAccidentLimit)].filter(Boolean).join(' / ')
    return {
      title: d.carrierName || 'Insurance policy',
      details: [
        d.insuredParty ? (d.insuredParty === 'client' ? "Client's policy" : "Defendant's policy") : null,
        d.coverageType ? d.coverageType.toUpperCase() : null,
        d.policyNumber ? `Policy ${d.policyNumber}` : null,
        d.claimNumber ? `Claim ${d.claimNumber}` : null,
        limits ? `Limits ${limits}` : null,
        d.insuredName ? `Insured: ${d.insuredName}` : null,
        d.adjusterName ? `Adjuster ${d.adjusterName}` : null,
      ].filter(Boolean) as string[],
    }
  }
  const isVisit = f.kind === 'treatment_visit'
  return {
    title: isVisit
      ? [d.provider, d.diagnosis].filter(Boolean).join(' · ') || 'Treatment visit'
      : d.description || d.provider || KIND_LABEL[f.kind],
    details: !isVisit && d.provider ? [d.provider] : [],
  }
}

function ConflictList({ conflicts }: { conflicts?: string[] }) {
  if (!conflicts?.length) return null
  return (
    <div className="mt-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
      <p className="flex items-center gap-1 font-semibold">
        <AlertTriangle className="h-3.5 w-3.5" /> Disagrees with the case
      </p>
      <ul className="mt-0.5 list-disc space-y-0.5 pl-5">
        {conflicts.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  )
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
  const recordFields = RECORD_FIELDS[finding.kind]
  const [recordEdit, setRecordEdit] = useState<Record<string, string> | null>(null)
  const d = finding.data
  const isVisit = finding.kind === 'treatment_visit'
  const badge = confidenceBadge(finding.confidence)
  const { title, details } = describeFinding(finding)

  const startEdit = () => {
    if (!recordFields) {
      setEdit(editStateFor(finding))
      return
    }
    const initial: Record<string, string> = {}
    for (const f of recordFields) {
      const v = d[f.key]
      initial[f.key] = v == null ? '' : String(v)
    }
    setRecordEdit(initial)
  }

  const submitRecordEdit = () => {
    if (!recordFields || !recordEdit) return
    const overrides: Record<string, unknown> = {}
    for (const f of recordFields) {
      const v = recordEdit[f.key].trim()
      overrides[f.key] = f.type === 'number' ? (v === '' ? null : Number(v)) : v || null
    }
    onAccept(overrides as Partial<DocumentFindingData>)
  }
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

  const dateLine = fmtDate(d.date)
    ? fmtDate(d.date)
    : finding.kind === 'insurance_policy'
      ? null
      : <span className="text-amber-700">No date on the page — add one</span>

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
            {dateLine ? <span>{dateLine}</span> : null}
            {details.map((text) => (
              <span key={text}>· {text}</span>
            ))}
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
          <ConflictList conflicts={finding.conflicts} />
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
        {!edit && !recordEdit ? (
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
              onClick={startEdit}
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
      {recordFields && recordEdit ? (
        <div className="mt-2 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
          {recordFields.map((f) => (
            <label key={f.key} className="block text-xs font-medium text-slate-500">
              {f.label}
              {f.type === 'select' ? (
                <select
                  value={recordEdit[f.key]}
                  onChange={(e) => setRecordEdit({ ...recordEdit, [f.key]: e.target.value })}
                  className={inputCls}
                >
                  {f.options!.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type || 'text'}
                  min={f.type === 'number' ? 0 : undefined}
                  value={recordEdit[f.key]}
                  onChange={(e) => setRecordEdit({ ...recordEdit, [f.key]: e.target.value })}
                  className={inputCls}
                />
              )}
            </label>
          ))}
          <p className="col-span-full text-[11px] text-slate-500">
            Accepting fills in what the tab is missing. It never overwrites a value already entered; a difference stays flagged
            instead.
          </p>
          <div className="col-span-full flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRecordEdit(null)}
              disabled={busy}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitRecordEdit}
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
      const { queued } = await scanDocumentFindings(leadId, { kinds })
      if (queued === 0) {
        setScanning(false)
        setError(`There are no ${documentsLabel(kinds)} on this case to read.`)
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

  const medicalOnly = kinds.every((k) => MEDICAL_KINDS.includes(k))
  if (!res.medicalSharing.canShareMedicalData && medicalOnly) {
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
          ? medicalOnly
            ? ' AI reading is switched off on this deployment, so only dated charge lines on bills are picked up.'
            : ` AI reading is switched off on this deployment, so ${documentsLabel(kinds)} are not read.`
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
                <li key={f.id} className="text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        f.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {f.status === 'accepted' ? 'Accepted' : 'Rejected'}
                    </span>
                    <span>
                      {KIND_LABEL[f.kind]} · {MEDICAL_KINDS.includes(f.kind) ? fmtDate(f.data.date) || 'undated' : describeFinding(f).title}
                      {MEDICAL_KINDS.includes(f.kind) && f.data.provider ? ` · ${f.data.provider}` : ''}
                      {money(f.data.amount) ? ` · ${money(f.data.amount)}` : ''}
                    </span>
                    {f.reviewedByName ? <span>by {f.reviewedByName}</span> : null}
                    <SourceLink fileUrl={f.fileUrl} fileName={f.fileName} page={f.pageNumber} quote={f.sourceQuote} />
                  </div>
                  <ConflictList conflicts={f.conflicts} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

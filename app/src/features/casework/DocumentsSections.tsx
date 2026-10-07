/**
 * The Documents tab's Requests and Templates sections, and the one form that
 * sends the client a packet: documents to sign plus files to upload, behind a
 * single link.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  FileSignature,
  FileText,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Upload,
  X,
} from 'lucide-react'
import ModalPortal from '../../components/ModalPortal'
import {
  ChannelButton,
  EnvelopeRow,
  RequestRow,
  type Channel,
  StepTrail,
  displayTitle,
  isEnvelopeOpen,
  rowButtonCls,
  useCaseEnvelopes,
} from '../../components/EnvelopeList'
import { FirmTemplateForm } from '../firm/FirmTemplateForm'
import { useNavigate } from 'react-router-dom'
import {
  getAttorneyDocumentRequests,
  getClaimantContact,
  getFirmTemplates,
  getLeadOpposingDocSuggestions,
  nudgeDocumentRequest,
  reviewLeadEvidence,
  type AttorneyDocumentRequest,
  type ClaimantContact,
  type FirmTemplate,
  type OpposingDocSuggestion,
} from '../../lib/api'
import {
  getEssentialFields,
  getSigningDefaults,
  listCaseFirmTemplates,
  listEnvelopes,
  previewCaseFirmTemplate,
  previewDocument,
  sendClientPacket,
  type CaseFirmTemplate,
  type DocumentEnvelope,
  type PacketSignType,
} from '../../lib/api-esign'

export const PACKET_UPLOAD_OPTIONS: { id: string; label: string }[] = [
  { id: 'medical_records', label: 'Medical records' },
  { id: 'bills', label: 'Medical bills' },
  { id: 'police_report', label: 'Police / incident report' },
  { id: 'injury_photos', label: 'Photos of injuries' },
  { id: 'photos', label: 'Photos of property damage' },
  { id: 'insurance', label: 'Insurance information' },
  { id: 'wage_loss', label: 'Wage-loss documentation' },
  { id: 'prior_treatment', label: 'Prior treatment records' },
]

const CUSTOM_UPLOAD_PREFIX = 'custom:'

const SIGN_OPTIONS: { id: PacketSignType; label: string }[] = [
  { id: 'retainer', label: 'Retainer agreement' },
  { id: 'hipaa_authorization', label: 'HIPAA authorization' },
]

const OPEN_ENVELOPE = new Set(['draft', 'sent', 'viewed'])

const inputCls =
  'w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100'

function fmtDate(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function apiError(err: any, fallback: string): string {
  return err?.response?.data?.error || fallback
}

function templatesFor(templates: CaseFirmTemplate[], type: PacketSignType): CaseFirmTemplate[] {
  return templates.filter((t) => (t.documentType || t.suggestedDocumentType) === type)
}

/** Latest envelope of a type, for "already signed / already out" hints. */
function latestEnvelope(envelopes: DocumentEnvelope[], type: PacketSignType): DocumentEnvelope | null {
  return (
    envelopes
      .filter((e) => e.documentType === type && e.status !== 'voided')
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] || null
  )
}

// ---------------------------------------------------------------------------
// Request documents
// ---------------------------------------------------------------------------

export function RequestDocumentsDialog({
  leadId,
  clientName,
  initialUploads,
  labelFor,
  onClose,
  onSent,
}: {
  leadId: string
  clientName: string
  /** Upload keys to start selected (e.g. from a coverage chip). */
  initialUploads: string[]
  labelFor: (key: string) => string
  onClose: () => void
  onSent: (summary: string) => void
}) {
  const [uploads, setUploads] = useState<string[]>(initialUploads)
  const [sign, setSign] = useState<PacketSignType[]>([])
  const [templateFor, setTemplateFor] = useState<Record<PacketSignType, string>>({
    retainer: '',
    hipaa_authorization: '',
  })
  const [delivery, setDelivery] = useState<'email' | 'text'>('email')
  const [message, setMessage] = useState('')
  const [countersign, setCountersign] = useState(true)
  const [countersignerName, setCountersignerName] = useState('')
  const [countersignerEmail, setCountersignerEmail] = useState('')
  const [contact, setContact] = useState<ClaimantContact | null>(null)
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set())
  const [envelopes, setEnvelopes] = useState<DocumentEnvelope[]>([])
  const [templates, setTemplates] = useState<CaseFirmTemplate[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getClaimantContact(leadId).then(setContact).catch(() => setContact(null))
    getAttorneyDocumentRequests(leadId)
      .then((rows) => {
        const keys = new Set<string>()
        for (const r of rows || []) {
          if (r.targetType === 'opposing_party' || r.status === 'completed') continue
          for (const k of r.requestedDocs || []) keys.add(k)
        }
        setOpenKeys(keys)
      })
      .catch(() => {})
    listEnvelopes(leadId).then(setEnvelopes).catch(() => {})
    listCaseFirmTemplates(leadId)
      .then(({ templates: list }) => {
        setTemplates(list || [])
        // Default each document to the firm's own template when it has one.
        setTemplateFor({
          retainer: templatesFor(list || [], 'retainer').find((t) => t.documentType === 'retainer')?.id || '',
          hipaa_authorization:
            templatesFor(list || [], 'hipaa_authorization').find((t) => t.documentType === 'hipaa_authorization')
              ?.id || '',
        })
      })
      .catch(() => {})
    getSigningDefaults(leadId)
      .then((d) => {
        setCountersignerName(d.attorneyName || '')
        setCountersignerEmail(d.attorneyEmail || '')
      })
      .catch(() => {})
  }, [leadId])

  const extraUploadKeys = uploads.filter((k) => !PACKET_UPLOAD_OPTIONS.some((o) => o.id === k))
  const toggleUpload = (key: string) =>
    setUploads((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  const [customOpen, setCustomOpen] = useState(false)
  const [customText, setCustomText] = useState('')
  const addCustomUpload = () => {
    const text = customText.replace(/\s+/g, ' ').trim().slice(0, 120)
    if (!text) return
    const key = `${CUSTOM_UPLOAD_PREFIX}${text}`
    setUploads((prev) => (prev.includes(key) ? prev : [...prev, key]))
    setCustomText('')
    setCustomOpen(false)
  }
  const toggleSign = (type: PacketSignType) =>
    setSign((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))

  const freshUploads = uploads.filter((k) => !openKeys.has(k))
  const hasEmail = Boolean(contact?.email)
  const hasPhone = Boolean(contact?.phone)

  const submit = async () => {
    setError(null)
    if (!freshUploads.length && !sign.length) {
      setError('Pick at least one document to sign or file to upload.')
      return
    }
    if (sign.includes('retainer') && countersign) {
      if (!countersignerName.trim() || !/^\S+@\S+\.\S+$/.test(countersignerEmail.trim())) {
        setError('Enter the countersigning attorney’s name and email, or turn off countersignature.')
        return
      }
    }
    setSending(true)
    try {
      const result = await sendClientPacket(leadId, {
        uploads: freshUploads,
        sign: sign.map((type) => ({ type, templateId: templateFor[type] || null })),
        delivery,
        customMessage: message.trim() || undefined,
        countersigner:
          sign.includes('retainer') && countersign
            ? { name: countersignerName.trim(), email: countersignerEmail.trim() }
            : undefined,
      })
      const parts: string[] = []
      if (result.envelopes.length) parts.push(`${result.envelopes.length} to sign`)
      if (result.uploads.length) parts.push(`${result.uploads.length} to upload`)
      let summary = `Sent ${clientName || 'the client'} one link (${parts.join(', ')}) by ${
        delivery === 'text' ? `text to ${result.deliveredTo}` : `email to ${result.deliveredTo}`
      }.`
      if (!result.delivered) summary = `The packet was created, but the ${delivery} could not be delivered. Copy the link from Requests.`
      if (result.failed.length) {
        summary += ` Not sent: ${result.failed.map((f) => `${f.type === 'retainer' ? 'retainer' : 'HIPAA'} (${f.error})`).join('; ')}.`
      }
      onSent(summary)
    } catch (err: any) {
      setError(apiError(err, 'Could not send the packet.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4" onClick={() => (sending ? null : onClose())}>
        <div className="flex min-h-full items-center justify-center">
          <div
            className="flex w-full max-w-xl flex-col rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Request documents"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Request documents</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {clientName || 'The client'} gets one link with everything below.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-4">
              <section>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Upload className="h-3.5 w-3.5" /> Upload
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[...PACKET_UPLOAD_OPTIONS, ...extraUploadKeys.map((id) => ({ id, label: labelFor(id) }))].map((o) => {
                    const open = openKeys.has(o.id)
                    const on = uploads.includes(o.id) && !open
                    return (
                      <button
                        key={o.id}
                        type="button"
                        disabled={open}
                        onClick={() => toggleUpload(o.id)}
                        title={open ? 'Already in an open request — nudge it from Requests' : undefined}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                          open
                            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                            : on
                              ? 'border-brand-400 bg-brand-50 text-brand-700'
                              : 'border-slate-200 text-slate-600 hover:border-brand-300'
                        }`}
                      >
                        {on ? <Check className="h-3.5 w-3.5" /> : null}
                        {o.label}
                        {open ? ' · requested' : ''}
                      </button>
                    )
                  })}
                  {customOpen ? null : (
                    <button
                      type="button"
                      onClick={() => setCustomOpen(true)}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700"
                    >
                      <Plus className="h-3.5 w-3.5" /> Other…
                    </button>
                  )}
                </div>
                {customOpen ? (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      autoFocus
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addCustomUpload()
                        } else if (e.key === 'Escape') {
                          setCustomOpen(false)
                          setCustomText('')
                        }
                      }}
                      maxLength={120}
                      placeholder="Describe the document, e.g. Rideshare trip receipt"
                      className={`${inputCls} min-w-0 flex-1`}
                    />
                    <button
                      type="button"
                      onClick={addCustomUpload}
                      disabled={!customText.trim()}
                      className="rounded-lg border border-brand-600 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomOpen(false)
                        setCustomText('')
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </section>

              <section>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <FileSignature className="h-3.5 w-3.5" /> Sign
                </p>
                <div className="mt-2 space-y-2">
                  {SIGN_OPTIONS.map((o) => {
                    const latest = latestEnvelope(envelopes, o.id)
                    const outNow = latest && OPEN_ENVELOPE.has(latest.status) && !latest.clientSignedAt
                    const signed = latest && (latest.status === 'signed' || latest.clientSignedAt)
                    const on = sign.includes(o.id)
                    const firmOptions = templatesFor(templates, o.id)
                    return (
                      <div key={o.id} className={`rounded-xl border p-3 ${on ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200'}`}>
                        <label className="flex items-start gap-2 text-sm text-slate-800">
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={Boolean(outNow)}
                            onChange={() => toggleSign(o.id)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                          />
                          <span className="min-w-0">
                            <span className="font-medium">{o.label}</span>
                            {outNow ? (
                              <span className="block text-xs text-amber-700">
                                Already out for signature since {fmtDate(latest!.sentAt || latest!.createdAt)} — remind
                                from Signatures.
                              </span>
                            ) : signed ? (
                              <span className="block text-xs text-emerald-700">
                                Signed {fmtDate(latest!.signedAt || latest!.clientSignedAt)}. Sending again starts a new
                                signature.
                              </span>
                            ) : null}
                          </span>
                        </label>
                        {on ? (
                          <div className="mt-2 space-y-2 pl-6">
                            <select
                              value={templateFor[o.id]}
                              onChange={(e) => setTemplateFor((prev) => ({ ...prev, [o.id]: e.target.value }))}
                              className={inputCls}
                            >
                              <option value="">Standard ClearCaseIQ {o.label.toLowerCase()}</option>
                              {firmOptions.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} (firm template)
                                </option>
                              ))}
                            </select>
                            {o.id === 'retainer' ? (
                              <div>
                                <label className="flex items-center gap-2 text-xs text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={countersign}
                                    onChange={(e) => setCountersign(e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                                  />
                                  Attorney countersigns after the client
                                </label>
                                {countersign ? (
                                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    <input
                                      value={countersignerName}
                                      onChange={(e) => setCountersignerName(e.target.value)}
                                      placeholder="Attorney name"
                                      className={inputCls}
                                    />
                                    <input
                                      type="email"
                                      value={countersignerEmail}
                                      onChange={(e) => setCountersignerEmail(e.target.value)}
                                      placeholder="attorney@firm.com"
                                      className={inputCls}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      { id: 'email', label: 'Email', Icon: Mail, to: contact?.email, ok: hasEmail },
                      { id: 'text', label: 'Text', Icon: MessageSquare, to: contact?.phone, ok: hasPhone },
                    ] as const
                  ).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDelivery(d.id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                        delivery === d.id ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700 hover:border-brand-300'
                      }`}
                    >
                      <d.Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0">
                        <span className="block font-medium">{d.label}</span>
                        <span className={`block truncate text-xs ${d.ok ? 'text-slate-500' : 'text-amber-700'}`}>
                          {contact ? d.to || 'Not on file — add on Client Info' : '…'}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                {sign.length > 0 && !hasEmail && contact ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Signing needs the client’s email on file, even when the link goes by text.
                  </p>
                ) : null}
              </section>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder={`Optional note to ${clientName || 'the client'}…`}
                className={inputCls}
              />

              {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
              <p className="text-xs text-slate-500">
                {sign.length ? `Sign ${sign.length}` : ''}
                {sign.length && freshUploads.length ? ' · ' : ''}
                {freshUploads.length ? `Upload ${freshUploads.length}` : ''}
                {!sign.length && !freshUploads.length ? 'Nothing selected yet' : ''}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={sending}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={sending || (!freshUploads.length && !sign.length)}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {sending ? 'Sending…' : delivery === 'text' ? 'Text packet' : 'Email packet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

// ---------------------------------------------------------------------------
// Requests: client suggestions, what the client still owes, and what's done
// ---------------------------------------------------------------------------

const UPLOAD_STEPS = ['Requested', 'Received', 'Reviewed']
const UPLOAD_STEP_INDEX = { requested: 0, received: 1, reviewed: 2 } as const

const OPPOSING_DOC_LABELS: Record<string, string> = {
  insurance_policy: 'Insurance policy / declarations page',
  incident_report: 'Incident / accident report',
  surveillance: 'Surveillance or camera footage',
  maintenance_records: 'Maintenance / inspection records',
  vehicle_records: 'Vehicle / black-box (EDR) data',
  employment_records: 'Employment / training records',
  correspondence: 'Relevant correspondence',
  photos: 'Photographs of the scene/vehicle',
  other: 'Other documents',
}

const ROLE_LABELS: Record<string, string> = {
  defendant: 'Defendant',
  opposing_counsel: 'Opposing counsel',
  insurer: 'Insurer / adjuster',
}

type UploadItem = {
  key: string
  label: string
  stage: 'requested' | 'received' | 'reviewed'
  fileIds: string[]
}

type UploadRow = { request: AttorneyDocumentRequest; item: UploadItem }

function sentenceCase(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

function uploadRowsOf(requests: AttorneyDocumentRequest[]): UploadRow[] {
  return requests.flatMap((request) => {
    const items: UploadItem[] = request.items?.length
      ? request.items
      : (request.requestedDocs || []).map((key) => ({ key, label: key.replace(/_/g, ' '), stage: 'requested' as const, fileIds: [] }))
    return items.map((item) => ({ request, item }))
  })
}

function SectionHeading({
  id,
  title,
  count,
  hint,
  trailing,
}: {
  id?: string
  title: string
  count?: number
  hint?: string
  trailing?: ReactNode
}) {
  return (
    <div id={id} className="mb-2 flex scroll-mt-24 items-center justify-between gap-2">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {count != null ? (
          <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-500">{count}</span>
        ) : null}
        {hint ? <span className="hidden text-xs text-slate-400 sm:inline">{hint}</span> : null}
      </div>
      {trailing}
    </div>
  )
}

function SummaryTile({
  label,
  value,
  tone,
  onClick,
}: {
  label: string
  value: number
  tone: 'amber' | 'indigo' | 'emerald'
  onClick: () => void
}) {
  const tones = {
    amber: value ? 'border-amber-200 bg-amber-50/60 text-amber-800' : 'border-slate-200 bg-white text-slate-500',
    indigo: value ? 'border-indigo-200 bg-indigo-50/60 text-indigo-800' : 'border-slate-200 bg-white text-slate-500',
    emerald: 'border-slate-200 bg-white text-slate-600',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-baseline justify-between gap-2 rounded-xl border px-4 py-3 text-left transition hover:shadow-sm ${tones[tone]}`}
    >
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-xl font-bold tabular-nums">{value}</span>
    </button>
  )
}

const SIGNATURE_COVERAGE: { type: string; label: string; required: boolean }[] = [
  { type: 'retainer', label: 'Retainer agreement', required: true },
  { type: 'hipaa_authorization', label: 'HIPAA authorization', required: true },
  { type: 'police_report_authorization', label: 'Police report authorization', required: false },
]

type SignatureChip = {
  key: string
  label: string
  required: boolean
  type: string
  /** Every non-voided copy, newest first. */
  envs: DocumentEnvelope[]
}

const isSigned = (env: DocumentEnvelope) => env.status === 'signed' || Boolean(env.clientSignedAt)

export function chipState(envs: DocumentEnvelope[]) {
  const signed = envs.find(isSigned) || null
  const open = envs.find(isEnvelopeOpen) || null
  const latest = envs[0] || null
  // A copy sent after the signed one: the signature stands, the new copy is still out.
  const newerOpen = signed && open && Date.parse(open.createdAt) > Date.parse(signed.createdAt) ? open : null
  return { signed, open, latest, newerOpen }
}

/**
 * One chip per agreement. Copies titled like the standard document share its
 * chip; a custom-titled one (a firm's own fee agreement) gets its own.
 */
export function signatureChips(envelopes: DocumentEnvelope[]): SignatureChip[] {
  const live = envelopes
    .filter((e) => e.status !== 'voided')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  const chips: SignatureChip[] = []
  const custom = new Map<string, SignatureChip>()
  const addCustom = (env: DocumentEnvelope) => {
    const label = displayTitle(env.title)
    const key = `${env.documentType}:${label.toLowerCase()}`
    const chip = custom.get(key)
    if (chip) chip.envs.push(env)
    else custom.set(key, { key, label, required: false, type: env.documentType, envs: [env] })
  }

  for (const d of SIGNATURE_COVERAGE) {
    const ofType = live.filter((e) => e.documentType === d.type)
    const standard = ofType.filter((e) => displayTitle(e.title).toLowerCase() === d.label.toLowerCase())
    ofType.filter((e) => !standard.includes(e)).forEach(addCustom)
    const hasCustom = ofType.length > standard.length
    // A firm's own retainer stands in for the standard one; the standard chip
    // only shows when it has copies or nothing else covers a required document.
    if (standard.length || (d.required && !hasCustom)) {
      chips.push({ key: d.type, label: d.label, required: d.required, type: d.type, envs: standard })
    }
  }
  const known = new Set(SIGNATURE_COVERAGE.map((d) => d.type))
  live.filter((e) => !known.has(e.documentType)).forEach(addCustom)
  return [...chips, ...custom.values()]
}

/** What the client has signed, what is out, and the ways to send more. */
function SignatureCoverageCard({
  envelopes,
  clientName,
  onSign,
  onSendPacket,
  onUploadSigned,
}: {
  envelopes: DocumentEnvelope[]
  clientName: string
  onSign?: (docType: string) => void
  onSendPacket?: () => void
  onUploadSigned?: () => void
}) {
  const chips = signatureChips(envelopes)
  // A required document counts as signed when any copy of its type is, including a firm's own version.
  const requiredTypes = SIGNATURE_COVERAGE.filter((d) => d.required).map((d) => d.type)
  const signedRequired = requiredTypes.filter((type) =>
    chips.some((c) => c.type === type && c.envs.some(isSigned)),
  ).length
  const policeSent = chips.some((c) => c.type === 'police_report_authorization')
  const chipCls = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <FileSignature className="h-5 w-5 text-violet-600" />
        <p className="text-base font-semibold text-slate-900">Signature documents</p>
        <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
          {signedRequired}/{requiredTypes.length} signed
        </span>
        <span className="text-xs text-slate-400">Agreements and authorizations the client signs electronically.</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => {
          const { signed, open, latest, newerOpen } = chipState(c.envs)
          if (signed) {
            return (
              <span
                key={c.key}
                title={newerOpen ? `Signed ${fmtDate(signed.signedAt || signed.clientSignedAt)}; a newer copy sent ${fmtDate(newerOpen.sentAt || newerOpen.createdAt)} is still out` : undefined}
                className={`${chipCls} border-emerald-200 bg-emerald-50 text-emerald-800`}
              >
                <CheckCircle2 className="h-4 w-4 fill-emerald-500 text-white" />
                {c.label}
                <span className="text-emerald-600">· signed {fmtDate(signed.signedAt || signed.clientSignedAt)}</span>
                {newerOpen ? <span className="text-amber-600">· new copy {newerOpen.status === 'viewed' ? 'viewed' : 'sent'}</span> : null}
              </span>
            )
          }
          if (open) {
            return (
              <span
                key={c.key}
                title={`${c.label} is out for signature — remind the client from the list below`}
                className={`${chipCls} border-amber-200 bg-amber-50 text-amber-700`}
              >
                <Send className="h-3.5 w-3.5" />
                {c.label}
                <span className="text-amber-500">· {open.status === 'viewed' ? 'viewed' : 'sent'}</span>
              </span>
            )
          }
          const env = latest
          const lapsed = env && (env.status === 'declined' || env.status === 'expired')
          return onSign ? (
            <button
              key={c.key}
              type="button"
              onClick={() => onSign(c.type)}
              title={`Send ${c.label} to ${clientName || 'the client'} for signature`}
              className={`${chipCls} shadow-sm transition ${
                lapsed
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              <Plus className="h-4 w-4 opacity-70" />
              {c.label}
              <span className="text-[11px] font-normal opacity-70">
                {lapsed ? `${env!.status} · resend` : c.required ? 'Required' : 'Send'}
              </span>
            </button>
          ) : (
            <span key={c.key} className={`${chipCls} border-slate-200 bg-white text-slate-500`}>
              {c.label}
            </span>
          )
        })}
      </div>
      {onSign || onSendPacket || onUploadSigned ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {onSign ? (
            <button
              type="button"
              onClick={() => onSign('fee_agreement')}
              title="Your own PDF or a firm template"
              className={`${chipCls} border-dashed border-slate-300 text-slate-600 transition hover:border-brand-300 hover:text-brand-700`}
            >
              <Plus className="h-4 w-4" /> Other document
            </button>
          ) : null}
          {onSign && !policeSent ? (
            <button
              type="button"
              onClick={() => onSign('police_report_authorization')}
              className={`${chipCls} border-dashed border-slate-300 text-slate-600 transition hover:border-brand-300 hover:text-brand-700`}
            >
              <Plus className="h-4 w-4" /> Police report authorization
            </button>
          ) : null}
          {onSendPacket ? (
            <button
              type="button"
              onClick={onSendPacket}
              title="Files to upload plus retainer / HIPAA to sign, in one link"
              className={`${chipCls} border-slate-200 text-slate-700 transition hover:border-brand-300 hover:text-brand-700`}
            >
              <Send className="h-3.5 w-3.5 text-brand-600" /> Client packet
            </button>
          ) : null}
          {onUploadSigned ? (
            <button
              type="button"
              onClick={onUploadSigned}
              title="File a copy the client signed on paper or elsewhere"
              className={`${chipCls} border-slate-200 text-slate-700 transition hover:border-brand-300 hover:text-brand-700`}
            >
              <Upload className="h-3.5 w-3.5 text-brand-600" /> Upload signed copy
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Everything the attorney has asked of the client (uploads and signatures) and
 * everything the client has suggested asking the other side for, ordered by
 * what needs attention.
 */
export function RequestsOverview({
  mode = 'uploads',
  leadId,
  reloadKey,
  canRequest,
  canReview,
  canSign,
  onChanged,
  onViewFiles,
  clientName = '',
  onSign,
  onSendPacket,
  onUploadSigned,
}: {
  /** `uploads`: files asked of the client and client suggestions. `signatures`: documents out for signature. */
  mode?: 'uploads' | 'signatures'
  leadId: string
  reloadKey: number
  canRequest: boolean
  canReview: boolean
  canSign: boolean
  onChanged: () => void
  onViewFiles: () => void
  clientName?: string
  /** Signatures mode: open the single-document send form for a document type. */
  onSign?: (docType: string) => void
  onSendPacket?: () => void
  onUploadSigned?: () => void
}) {
  const forSignatures = mode === 'signatures'
  const navigate = useNavigate()
  const [requests, setRequests] = useState<AttorneyDocumentRequest[] | null>(null)
  const [suggestions, setSuggestions] = useState<OpposingDocSuggestion[] | null>(null)
  const { envelopes, setEnvelopes, reload: reloadEnvelopes, refresh, refreshing } = useCaseEnvelopes(leadId, reloadKey)
  const [busy, setBusy] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [showDone, setShowDone] = useState(false)

  const loadRequests = useCallback(() => {
    getAttorneyDocumentRequests(leadId)
      .then((list) =>
        setRequests(
          (list || []).filter(
            (r) => r.leadId === leadId && r.targetType !== 'opposing_party' && (r.requestedDocs || []).length > 0,
          ),
        ),
      )
      .catch(() => setRequests([]))
  }, [leadId])

  useEffect(() => {
    loadRequests()
  }, [loadRequests, reloadKey])

  useEffect(() => {
    let cancelled = false
    getLeadOpposingDocSuggestions(leadId)
      .then((list) => {
        if (!cancelled) setSuggestions((list || []).filter((s) => s.status === 'pending'))
      })
      .catch(() => {
        if (!cancelled) setSuggestions([])
      })
    return () => {
      cancelled = true
    }
  }, [leadId, reloadKey])

  const nudge = async (requestId: string, channel: Channel) => {
    setBusy(`nudge:${requestId}`)
    try {
      const result = await nudgeDocumentRequest(requestId, channel)
      setBanner({
        tone: 'ok',
        text: channel === 'text' ? `Reminder texted to ${result.deliveredTo || 'the client'}.` : 'Reminder emailed to the client.',
      })
      loadRequests()
    } catch (err: any) {
      setBanner({ tone: 'err', text: apiError(err, 'Could not send the reminder.') })
    } finally {
      setBusy(null)
    }
  }

  const markReviewed = async (key: string, fileIds: string[]) => {
    setBusy(`review:${key}`)
    try {
      for (const id of fileIds) await reviewLeadEvidence(leadId, id, 'reviewed')
      setBanner({ tone: 'ok', text: `Marked ${fileIds.length} file${fileIds.length === 1 ? '' : 's'} reviewed.` })
      loadRequests()
      onChanged()
    } catch (err: any) {
      setBanner({ tone: 'err', text: apiError(err, 'Could not mark the files reviewed.') })
    } finally {
      setBusy(null)
    }
  }

  const uploadRows = useMemo(() => uploadRowsOf(requests || []), [requests])
  const openUploads = uploadRows.filter((r) => r.item.stage !== 'reviewed')
  const doneUploads = uploadRows.filter((r) => r.item.stage === 'reviewed')
  const openEnvelopes = (envelopes || []).filter(isEnvelopeOpen)
  const doneEnvelopes = (envelopes || []).filter((e) => !isEnvelopeOpen(e))
  const pendingSuggestions = forSignatures ? [] : suggestions || []
  const loading = forSignatures ? envelopes === null : requests === null || envelopes === null

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const renderUpload = ({ request, item }: UploadRow) => (
    <RequestRow
      key={`${request.id}:${item.key}`}
      kind="upload"
      title={sentenceCase(item.label)}
      subtitle={`Upload · requested ${fmtDate(request.createdAt)}${request.lastNudgeAt ? ` · reminded ${fmtDate(request.lastNudgeAt)}` : ''}`}
      trail={
        <StepTrail
          steps={UPLOAD_STEPS}
          current={UPLOAD_STEP_INDEX[item.stage]}
          tone={item.stage === 'reviewed' ? 'emerald' : item.stage === 'received' ? 'brand' : 'amber'}
        />
      }
      actions={
        <>
          {item.fileIds.length > 0 ? (
            <button type="button" onClick={onViewFiles} className={rowButtonCls}>
              <Eye className="h-3.5 w-3.5" /> {item.fileIds.length} file{item.fileIds.length === 1 ? '' : 's'}
            </button>
          ) : null}
          {item.stage === 'received' && canReview ? (
            <button
              type="button"
              onClick={() => void markReviewed(item.key, item.fileIds)}
              disabled={busy === `review:${item.key}`}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> Mark reviewed
            </button>
          ) : null}
          {item.stage === 'requested' && canRequest ? (
            <ChannelButton
              label="Nudge"
              busy={busy === `nudge:${request.id}`}
              onSend={(channel) => void nudge(request.id, channel)}
            />
          ) : null}
        </>
      }
    />
  )

  const renderEnvelope = (env: DocumentEnvelope) => (
    <EnvelopeRow
      key={env.id}
      leadId={leadId}
      env={env}
      canManage={canSign}
      onUpdated={(next) => setEnvelopes((prev) => (prev || []).map((e) => (e.id === next.id ? next : e)))}
      onReload={() => void reloadEnvelopes()}
      onMessage={(tone, text) => setBanner({ tone, text })}
    />
  )

  const byNewest = <T,>(rows: T[], at: (row: T) => string | null | undefined) =>
    [...rows].sort((a, b) => new Date(at(b) || 0).getTime() - new Date(at(a) || 0).getTime())

  // Requests lists everything the client owes, so documents sent for signature
  // (e.g. a welcome packet) show here as well as under Signatures.
  const waitingEnvelopes = openEnvelopes.map((env) => ({ at: env.sentAt || env.createdAt, node: renderEnvelope(env) }))
  const doneEnvelopeRows = doneEnvelopes.map((env) => ({ at: env.signedAt || env.updatedAt || env.createdAt, node: renderEnvelope(env) }))
  const waiting = forSignatures
    ? waitingEnvelopes
    : [...openUploads.map((row) => ({ at: row.request.createdAt, node: renderUpload(row) })), ...waitingEnvelopes]
  const done = forSignatures
    ? doneEnvelopeRows
    : [...doneUploads.map((row) => ({ at: row.request.createdAt, node: renderUpload(row) })), ...doneEnvelopeRows]

  return (
    <div className="space-y-6">
      {forSignatures && envelopes ? (
        <SignatureCoverageCard
          envelopes={envelopes}
          clientName={clientName}
          onSign={canSign ? onSign : undefined}
          onSendPacket={canRequest ? onSendPacket : undefined}
          onUploadSigned={onUploadSigned}
        />
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <SummaryTile
          label={forSignatures ? 'Awaiting signature' : 'Waiting on client'}
          value={waiting.length}
          tone="amber"
          onClick={() => scrollTo('requests-waiting')}
        />
        {forSignatures ? null : (
          <SummaryTile
            label="Client suggestions"
            value={pendingSuggestions.length}
            tone="indigo"
            onClick={() => scrollTo(pendingSuggestions.length ? 'requests-suggestions' : 'requests-waiting')}
          />
        )}
        <SummaryTile
          label={forSignatures ? 'Signed or closed' : 'Completed'}
          value={done.length}
          tone="emerald"
          onClick={() => {
            setShowDone(true)
            window.setTimeout(() => scrollTo('requests-done'), 0)
          }}
        />
      </div>

      {banner ? (
        <p
          className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
            banner.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </p>
      ) : null}

      {pendingSuggestions.length > 0 ? (
        <section>
          <SectionHeading
            id="requests-suggestions"
            title="Suggested by the client"
            count={pendingSuggestions.length}
            hint="Documents the client thinks the other side has"
          />
          <ul className="space-y-2">
            {pendingSuggestions.map((s) => (
              <li key={s.id} className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {s.recipientName || 'Other side'}
                      {s.recipientRole ? (
                        <span className="ml-2 text-xs font-medium text-slate-500">{ROLE_LABELS[s.recipientRole] || s.recipientRole}</span>
                      ) : null}
                    </p>
                    {s.requestedDocs.length > 0 ? (
                      <p className="mt-0.5 text-xs text-slate-600">
                        {s.requestedDocs.map((d) => OPPOSING_DOC_LABELS[d] || d).join(', ')}
                      </p>
                    ) : null}
                    {s.note ? <p className="mt-1 text-xs italic text-slate-500">“{s.note}”</p> : null}
                    <p className="mt-1 text-[11px] text-slate-400">Suggested {fmtDate(s.createdAt)}</p>
                  </div>
                  {canRequest ? (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/attorney-dashboard/request-docs/${leadId}`, {
                          state: { applySuggestionId: s.id, source: 'documents-requests' },
                        })
                      }
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      <Send className="h-3.5 w-3.5" /> Request from other side
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <SectionHeading
          id="requests-waiting"
          title={forSignatures ? 'Waiting for the client to sign' : 'Waiting on the client'}
          count={waiting.length}
          trailing={
            forSignatures ? (
            <button
              type="button"
              onClick={() => void refresh().catch(() => setBanner({ tone: 'err', text: 'Could not refresh signature status.' }))}
              disabled={refreshing}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              title="Check signature status with the signing provider"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Checking…' : 'Refresh'}
            </button>
            ) : undefined
          }
        />
        {loading ? (
          <p className="text-sm text-slate-400">{forSignatures ? 'Loading signatures…' : 'Loading requests…'}</p>
        ) : waiting.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            {forSignatures
              ? 'Nothing out for signature. Pick a document in Signature documents above to send it.'
              : 'Nothing outstanding. Use Request documents to ask the client for files.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4">
            {byNewest(waiting, (w) => w.at).map((w) => w.node)}
          </ul>
        )}
      </section>

      {done.length > 0 ? (
        <section>
          <button
            id="requests-done"
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="mb-2 flex scroll-mt-24 items-center gap-2 text-sm font-semibold text-slate-900"
          >
            {showDone ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            Completed
            <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-500">{done.length}</span>
          </button>
          {showDone ? (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4">
              {byNewest(done, (d) => d.at).map((d) => d.node)}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function DocumentTemplatesSection({ leadId, clientName }: { leadId: string; clientName: string }) {
  const [templates, setTemplates] = useState<CaseFirmTemplate[] | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [categories, setCategories] = useState<Array<{ key: string; label: string }>>([])
  const [editor, setEditor] = useState<'new' | FirmTemplate | null>(null)
  const [previewing, setPreviewing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    listCaseFirmTemplates(leadId)
      .then(({ templates: list }) => setTemplates(list || []))
      .catch(() => setTemplates([]))
  }, [leadId])

  useEffect(() => {
    load()
    getFirmTemplates()
      .then((data) => {
        setCanManage(Boolean(data.canManage))
        setCategories(data.categories || [])
      })
      .catch(() => setCanManage(false))
  }, [load])

  const groups = useMemo(
    () =>
      SIGN_OPTIONS.map((o) => ({
        ...o,
        items: templatesFor(templates || [], o.id),
      })),
    [templates],
  )

  const openPreview = async (type: PacketSignType, templateId?: string) => {
    const key = templateId || `standard:${type}`
    setPreviewing(key)
    setError(null)
    try {
      const url = templateId
        ? await previewCaseFirmTemplate(leadId, templateId, {
            documentType: type,
            fieldValues: (await getEssentialFields(leadId, type)).values,
          })
        : await previewDocument(leadId, { documentType: type, signerName: clientName || 'Client' })
      window.open(url, '_blank', 'noopener')
    } catch (err: any) {
      setError(apiError(err, 'Could not build the preview.'))
    } finally {
      setPreviewing(null)
    }
  }

  const openEditor = async (templateId: string | 'new') => {
    setError(null)
    if (templateId === 'new') {
      setEditor('new')
      return
    }
    try {
      const data = await getFirmTemplates()
      const full = data.templates.find((t) => t.id === templateId)
      if (!full) throw new Error()
      setEditor(full)
    } catch {
      setError('Could not open that template.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          Templates used when you send a retainer or HIPAA authorization. Client and case details fill in from intake;
          your legal clauses stay as written.
        </p>
        {canManage ? (
          <button
            type="button"
            onClick={() => void openEditor('new')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" /> New template
          </button>
        ) : null}
      </div>
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {templates === null ? (
        <p className="text-sm text-slate-400">Loading templates…</p>
      ) : (
        groups.map((group) => (
          <section key={group.id} className="rounded-2xl border border-slate-200">
            <p className="border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-sm font-semibold text-slate-700">
              {group.label}s
            </p>
            <ul className="divide-y divide-slate-100">
              <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="text-sm text-slate-700">Standard ClearCaseIQ {group.label.toLowerCase()}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void openPreview(group.id)}
                  disabled={previewing === `standard:${group.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50"
                >
                  {previewing === `standard:${group.id}` ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                  Preview
                </button>
              </li>
              {group.items.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <FileSignature className="h-4 w-4 shrink-0 text-brand-500" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">{t.name}</span>
                      <span className="block text-xs text-slate-500">
                        {t.fileName || (t.hasBody ? 'Written template' : 'Firm template')}
                        {t.documentType === group.id ? ' · default for this document' : ''}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void openPreview(group.id, t.id)}
                      disabled={previewing === t.id}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50"
                    >
                      {previewing === t.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                      Preview
                    </button>
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => void openEditor(t.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    ) : null}
                  </span>
                </li>
              ))}
              {group.items.length === 0 ? (
                <li className="px-4 py-2.5 text-xs text-slate-400">
                  No firm {group.label.toLowerCase()} uploaded yet{canManage ? ' — add one with New template.' : '.'}
                </li>
              ) : null}
            </ul>
          </section>
        ))
      )}

      {editor ? (
        <ModalPortal>
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4" onClick={() => setEditor(null)}>
            <div className="flex min-h-full items-center justify-center">
              <div
                className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
                  <h3 className="text-base font-semibold text-slate-900">
                    {editor === 'new' ? 'New firm template' : 'Edit firm template'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditor(null)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-5">
                  <FirmTemplateForm
                    key={editor === 'new' ? 'new' : editor.id}
                    value={editor === 'new' ? null : editor}
                    categories={categories}
                    onCancel={() => setEditor(null)}
                    onSaved={(saved) => {
                      // A new template stays open so its PDF or Word file can be attached.
                      setEditor(editor === 'new' ? saved : null)
                      load()
                    }}
                    onUpdated={() => load()}
                  />
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  )
}

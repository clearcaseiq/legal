/**
 * Attorney-facing panel to send a case document for e-signature and track
 * envelope status.
 *
 * HIPAA authorizations and retainer agreements are rendered server-side from
 * canonical templates (and can be previewed before sending). Fee agreements are
 * the firm's own PDF, uploaded here as the source document. Outstanding
 * envelopes can be reminded, voided, or re-sent to a corrected email, and open
 * envelopes are polled so status stays live even without provider webhooks.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  PenLine,
  RefreshCw,
  ExternalLink,
  Download,
  Eye,
  Bell,
  Ban,
  Link2,
  Mail,
  Upload,
  Package,
  Check,
  X,
  Clock,
} from 'lucide-react'
import { EsignProviderPicker } from './EsignProviderPicker'
import {
  createHipaaAuthorization,
  createRetainerAgreement,
  correctSignerEmail,
  downloadSignedEnvelope,
  getEsignProviders,
  getSigningDefaults,
  listEnvelopes,
  previewDocument,
  refreshEnvelopes,
  remindEnvelope,
  sendOnboardingPacket,
  uploadFeeAgreement,
  voidEnvelope,
  type DocumentEnvelope,
  type EnvelopeStatus,
  type EsignProviderMeta,
} from '../lib/api-esign'

const DOC_TYPES = [
  { id: 'hipaa_authorization', label: 'HIPAA authorization' },
  { id: 'retainer', label: 'Retainer agreement' },
  { id: 'fee_agreement', label: 'Fee agreement (upload PDF)' },
]

const STATUS_STYLES: Record<EnvelopeStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 ring-slate-200',
  sent: 'bg-blue-50 text-blue-700 ring-blue-200',
  viewed: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  signed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  declined: 'bg-red-50 text-red-700 ring-red-200',
  voided: 'bg-slate-100 text-slate-500 ring-slate-200',
  expired: 'bg-amber-50 text-amber-800 ring-amber-200',
}

// Non-terminal statuses: an envelope in one of these is still "out for signature".
const OPEN_STATUSES: EnvelopeStatus[] = ['draft', 'sent', 'viewed']

const STATUS_LABEL: Record<EnvelopeStatus, string> = {
  draft: 'Draft',
  sent: 'Awaiting signature',
  viewed: 'Viewed',
  signed: 'Signed',
  declined: 'Declined',
  voided: 'Voided',
  expired: 'Expired',
}

const POLL_MS = 20000
// An open envelope idle this many days is flagged as overdue for a nudge.
const OVERDUE_DAYS = 5

function daysSince(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const ms = Date.now() - new Date(dateStr).getTime()
  if (!Number.isFinite(ms)) return null
  return Math.floor(ms / 86400000)
}

function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Compact created → sent → viewed → signed/declined trail for an envelope. */
function StatusTimeline({ env }: { env: DocumentEnvelope }) {
  const steps: { label: string; at?: string | null; done: boolean; tone: string }[] = [
    { label: 'Created', at: env.createdAt, done: true, tone: 'text-slate-500' },
    { label: 'Sent', at: env.sentAt, done: !!env.sentAt, tone: 'text-blue-600' },
    { label: 'Viewed', at: env.viewedAt, done: !!env.viewedAt, tone: 'text-indigo-600' },
  ]
  if (env.status === 'declined') {
    steps.push({ label: 'Declined', at: env.declinedAt, done: true, tone: 'text-red-600' })
  } else if (env.status === 'voided') {
    steps.push({ label: 'Voided', at: env.updatedAt, done: true, tone: 'text-slate-500' })
  } else {
    steps.push({ label: 'Signed', at: env.signedAt, done: !!env.signedAt, tone: 'text-emerald-600' })
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px]">
      {steps.map((s, i) => (
        <span key={s.label} className="inline-flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-300">→</span>}
          <span
            className={`inline-flex h-1.5 w-1.5 rounded-full ${s.done ? 'bg-current' : 'bg-slate-300'} ${s.done ? s.tone : ''}`}
          />
          <span className={s.done ? s.tone : 'text-slate-400'}>
            {s.label}
            {s.at ? ` ${fmtDate(s.at)}` : ''}
          </span>
        </span>
      ))}
    </div>
  )
}

export default function SignatureRequestPanel({
  leadId,
  defaultSignerName = '',
  defaultSignerEmail = '',
  initialDocumentType = 'hipaa_authorization',
}: {
  leadId: string
  defaultSignerName?: string
  defaultSignerEmail?: string
  /** Preselect the document type (e.g. 'retainer' when arriving from "Send retainer"). */
  initialDocumentType?: string
}) {
  const [providers, setProviders] = useState<EsignProviderMeta[]>([])
  const [envelopes, setEnvelopes] = useState<DocumentEnvelope[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [documentType, setDocumentType] = useState(initialDocumentType)
  const [provider, setProvider] = useState<string | null>(null)
  const [signerName, setSignerName] = useState(defaultSignerName)
  const [signerEmail, setSignerEmail] = useState(defaultSignerEmail)
  const [recordsCustodian, setRecordsCustodian] = useState('')
  const [recordsDateRange, setRecordsDateRange] = useState('')
  const [clientDob, setClientDob] = useState('')
  // Retainer-specific fee terms (firm/attorney prefilled from firm defaults).
  const [firmName, setFirmName] = useState('')
  const [attorneyName, setAttorneyName] = useState('')
  const [contingencyPercent, setContingencyPercent] = useState('33.33')
  const [costsResponsibility, setCostsResponsibility] = useState('')
  const [scope, setScope] = useState('')
  // Fee-agreement upload.
  const [feeFile, setFeeFile] = useState<File | null>(null)
  const [feeTitle, setFeeTitle] = useState('')
  const feeInputRef = useRef<HTMLInputElement | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  // Inline "correct email" editor per envelope.
  const [correctingId, setCorrectingId] = useState<string | null>(null)
  const [correctEmail, setCorrectEmail] = useState('')
  // Set after the duplicate warning is shown so a confirming second click sends anyway.
  const [confirmResend, setConfirmResend] = useState(false)
  // Preview modal.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const isHipaa = documentType === 'hipaa_authorization'
  const isRetainer = documentType === 'retainer'
  const isFee = documentType === 'fee_agreement'
  const canPreview = isHipaa || isRetainer

  // An already-open envelope of the same type (not yet signed/terminal) — sending
  // another would create a duplicate signature request for the client.
  const outstanding = useMemo(
    () => envelopes.find((e) => e.documentType === documentType && OPEN_STATUSES.includes(e.status)),
    [envelopes, documentType]
  )

  const hasOpen = useMemo(() => envelopes.some((e) => OPEN_STATUSES.includes(e.status)), [envelopes])

  // Keep the selected doc type in sync with the deep-link (e.g. navigating to the
  // documents section via "Send retainer" preselects the retainer agreement even
  // if this panel was already mounted on the Evidence tab).
  useEffect(() => {
    setDocumentType(initialDocumentType)
    setConfirmResend(false)
  }, [initialDocumentType])

  useEffect(() => {
    setConfirmResend(false)
    setNotice(null)
    setError(null)
  }, [documentType])

  const available = useMemo(
    () => providers.filter((p) => p.configured && (!isHipaa || p.hipaaCapable)),
    [providers, isHipaa]
  )
  // The onboarding packet always includes a HIPAA authorization, so it needs a
  // HIPAA-capable tool regardless of the currently selected document type.
  const packetProvider = useMemo(
    () => providers.find((p) => p.configured && p.hipaaCapable)?.id ?? null,
    [providers]
  )

  const load = useCallback(async () => {
    try {
      const [prov, envs, defaults] = await Promise.all([
        getEsignProviders(),
        listEnvelopes(leadId),
        getSigningDefaults(leadId).catch(() => null),
      ])
      setProviders(prov)
      setEnvelopes(envs)
      if (defaults) {
        if (defaults.firmName) setFirmName((v) => v || defaults.firmName || '')
        if (defaults.attorneyName) setAttorneyName((v) => v || defaults.attorneyName || '')
        if (typeof defaults.contingencyPercent === 'number') {
          setContingencyPercent((v) => (v && v !== '33.33' ? v : String(defaults.contingencyPercent)))
        }
      }
    } catch (err) {
      console.error('Failed to load e-signature data', err)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    load()
  }, [load])

  // Live status: poll open envelopes against the provider so the panel reflects
  // "viewed" / "signed" without waiting on webhooks (useful in local dev).
  useEffect(() => {
    if (!hasOpen) return
    const t = setInterval(async () => {
      try {
        const envs = await refreshEnvelopes(leadId)
        setEnvelopes(envs)
      } catch {
        /* transient; next tick retries */
      }
    }, POLL_MS)
    return () => clearInterval(t)
  }, [hasOpen, leadId])

  // Revoke any preview blob URL when it changes / on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // Keep the selected provider valid as the document type / provider list changes.
  useEffect(() => {
    if (!provider || !available.find((p) => p.id === provider)) {
      setProvider(available[0]?.id ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType, providers])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const envs = await refreshEnvelopes(leadId)
      setEnvelopes(envs)
    } catch {
      setError('Could not refresh signature status.')
    } finally {
      setRefreshing(false)
    }
  }

  const parsedPct = () => {
    const pct = parseFloat(contingencyPercent)
    return Number.isFinite(pct) && pct > 0 ? pct : undefined
  }

  const duplicateGuard = (): boolean => {
    if (outstanding && !confirmResend) {
      const label = DOC_TYPES.find((d) => d.id === documentType)?.label ?? 'document'
      const when = outstanding.createdAt ? ` (sent ${new Date(outstanding.createdAt).toLocaleDateString()})` : ''
      setNotice(
        `A ${label} is already awaiting signature${when}. Click "Send anyway" to send another, or remind/void the open one below.`
      )
      setConfirmResend(true)
      return true
    }
    return false
  }

  const afterSend = (env: DocumentEnvelope, msg: string) => {
    setEnvelopes((prev) => [env, ...prev])
    setNotice(msg)
    setConfirmResend(false)
  }

  const handleSend = async () => {
    setError(null)
    setNotice(null)
    if (!signerName.trim() || !signerEmail.trim()) {
      setError('Client name and email are required.')
      return
    }
    if (isFee && !feeFile) {
      setError('Attach the fee-agreement PDF to send.')
      return
    }
    if (duplicateGuard()) return

    setSubmitting(true)
    try {
      let envelope: DocumentEnvelope
      if (isRetainer) {
        envelope = await createRetainerAgreement(leadId, {
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          firmName: firmName.trim() || undefined,
          attorneyName: attorneyName.trim() || undefined,
          contingencyPercent: parsedPct(),
          costsResponsibility: costsResponsibility.trim() || undefined,
          scope: scope.trim() || undefined,
          provider: provider ?? undefined,
        })
      } else if (isHipaa) {
        envelope = await createHipaaAuthorization(leadId, {
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          clientDob: clientDob.trim() || undefined,
          recordsCustodian: recordsCustodian.trim() || undefined,
          recordsDateRange: recordsDateRange.trim() || undefined,
          provider: provider ?? undefined,
        })
      } else {
        envelope = await uploadFeeAgreement(leadId, feeFile as File, {
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          title: feeTitle.trim() || undefined,
          provider: provider ?? undefined,
        })
        setFeeFile(null)
        setFeeTitle('')
        if (feeInputRef.current) feeInputRef.current.value = ''
      }
      afterSend(envelope, `Sent "${envelope.title}" for signature via ${envelope.provider}.`)
      setRecordsCustodian('')
      setRecordsDateRange('')
      setCostsResponsibility('')
      setScope('')
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.response?.data?.error || 'Failed to send for signature.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendPacket = async () => {
    setError(null)
    setNotice(null)
    if (!signerName.trim() || !signerEmail.trim()) {
      setError('Client name and email are required for the onboarding packet.')
      return
    }
    if (!packetProvider) {
      setError('The onboarding packet includes a HIPAA authorization — configure a HIPAA-capable signature tool first.')
      return
    }
    setSubmitting(true)
    try {
      const { retainer, hipaa } = await sendOnboardingPacket(leadId, {
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim(),
        provider: packetProvider,
        firmName: firmName.trim() || undefined,
        attorneyName: attorneyName.trim() || undefined,
        contingencyPercent: parsedPct(),
        costsResponsibility: costsResponsibility.trim() || undefined,
        scope: scope.trim() || undefined,
        clientDob: clientDob.trim() || undefined,
        recordsCustodian: recordsCustodian.trim() || undefined,
        recordsDateRange: recordsDateRange.trim() || undefined,
      })
      setEnvelopes((prev) => [hipaa, retainer, ...prev])
      setNotice('Sent onboarding packet — retainer + HIPAA authorization — to the client.')
      setConfirmResend(false)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.response?.data?.error || 'Failed to send onboarding packet.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePreview = async () => {
    setError(null)
    if (!signerName.trim()) {
      setError('Enter the client name to preview the document.')
      return
    }
    setPreviewLoading(true)
    try {
      const url = await previewDocument(leadId, {
        documentType: isRetainer ? 'retainer' : 'hipaa_authorization',
        signerName: signerName.trim(),
        firmName: firmName.trim() || undefined,
        attorneyName: attorneyName.trim() || undefined,
        contingencyPercent: parsedPct(),
        costsResponsibility: costsResponsibility.trim() || undefined,
        scope: scope.trim() || undefined,
        clientDob: clientDob.trim() || undefined,
        recordsCustodian: recordsCustodian.trim() || undefined,
        recordsDateRange: recordsDateRange.trim() || undefined,
      })
      setPreviewUrl(url)
    } catch {
      setError('Could not render a preview of this document.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDownload = async (env: DocumentEnvelope) => {
    setError(null)
    setDownloadingId(env.id)
    try {
      await downloadSignedEnvelope(env.id, `${env.title}.pdf`)
    } catch {
      setError('Could not download the signed document.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleRemind = async (env: DocumentEnvelope) => {
    setError(null)
    setNotice(null)
    setBusyId(env.id)
    try {
      await remindEnvelope(leadId, env.id)
      setNotice(`Reminder sent to ${env.signerEmail}.`)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not send a reminder.')
    } finally {
      setBusyId(null)
    }
  }

  const handleVoid = async (env: DocumentEnvelope) => {
    setError(null)
    setNotice(null)
    if (!window.confirm(`Void "${env.title}"? The signing link will stop working.`)) return
    setBusyId(env.id)
    try {
      const updated = await voidEnvelope(leadId, env.id)
      setEnvelopes((prev) => prev.map((e) => (e.id === env.id ? updated : e)))
      setNotice(`Voided "${env.title}".`)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not void this envelope.')
    } finally {
      setBusyId(null)
    }
  }

  const startCorrect = (env: DocumentEnvelope) => {
    setCorrectingId(env.id)
    setCorrectEmail(env.signerEmail)
    setError(null)
    setNotice(null)
  }

  const handleCorrect = async (env: DocumentEnvelope) => {
    const email = correctEmail.trim()
    if (!email) return
    setBusyId(env.id)
    try {
      const updated = await correctSignerEmail(leadId, env.id, email)
      setEnvelopes((prev) => prev.map((e) => (e.id === env.id ? updated : e)))
      setNotice(`Re-sent to ${email}.`)
      setCorrectingId(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not update the recipient.')
    } finally {
      setBusyId(null)
    }
  }

  const handleCopyLink = async (env: DocumentEnvelope) => {
    if (!env.signingUrl) return
    try {
      await navigator.clipboard.writeText(env.signingUrl)
      setCopiedId(env.id)
      setTimeout(() => setCopiedId((v) => (v === env.id ? null : v)), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const inputCls =
    'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400'
  const labelCls = 'block text-xs font-medium text-slate-500 mb-1'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <PenLine className="h-4 w-4 text-brand-600" />
          E-signature
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-lg px-2 py-1 hover:bg-slate-100 disabled:opacity-50"
          title="Poll signature status"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Document type</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className={inputCls}
            >
              {DOC_TYPES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Signature tool</label>
            <EsignProviderPicker
              providers={providers}
              documentType={documentType}
              value={provider}
              onChange={setProvider}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Client name</label>
            <input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Signer (the client)"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Client email</label>
            <input
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="client@example.com"
              className={inputCls}
            />
          </div>
        </div>

        {isHipaa && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Records custodian / provider</label>
              <input
                value={recordsCustodian}
                onChange={(e) => setRecordsCustodian(e.target.value)}
                placeholder="e.g. St. Mary's Hospital"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Records date range</label>
              <input
                value={recordsDateRange}
                onChange={(e) => setRecordsDateRange(e.target.value)}
                placeholder="All dates relevant to the claim"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {isRetainer && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Firm name</label>
                <input
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="Your firm"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Responsible attorney</label>
                <input
                  value={attorneyName}
                  onChange={(e) => setAttorneyName(e.target.value)}
                  placeholder="Attorney of record"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Contingency fee (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={contingencyPercent}
                  onChange={(e) => setContingencyPercent(e.target.value)}
                  placeholder="33.33"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Costs &amp; expenses</label>
                <input
                  value={costsResponsibility}
                  onChange={(e) => setCostsResponsibility(e.target.value)}
                  placeholder="Advanced by the firm, reimbursed from recovery"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Scope of representation</label>
              <input
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="e.g. Personal injury claim arising from the 6/1 collision"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {isFee && (
          <div>
            <label className={labelCls}>Fee-agreement PDF</label>
            <div className="flex items-center gap-3">
              <input
                ref={feeInputRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => setFeeFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
              />
            </div>
            {feeFile && (
              <input
                value={feeTitle}
                onChange={(e) => setFeeTitle(e.target.value)}
                placeholder={`Title (default: Fee agreement — ${signerName || 'client'})`}
                className={`${inputCls} mt-2`}
              />
            )}
            <p className="mt-1 text-xs text-slate-400">Upload your firm's own agreement PDF (max 25MB) to send it for signature.</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && (
          <p className={`text-sm ${confirmResend ? 'text-amber-700' : 'text-slate-600'}`}>{notice}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleSend}
            disabled={submitting || (!isFee && available.length === 0)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${
              confirmResend ? 'bg-amber-600 hover:bg-amber-700' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {isFee ? <Upload className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
            {submitting ? 'Sending…' : confirmResend ? 'Send anyway' : 'Send for signature'}
          </button>

          {canPreview && (
            <button
              onClick={handlePreview}
              disabled={previewLoading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              {previewLoading ? 'Rendering…' : 'Preview'}
            </button>
          )}

          <button
            onClick={handleSendPacket}
            disabled={submitting || !packetProvider}
            title={packetProvider ? 'Send retainer + HIPAA authorization together' : 'Requires a HIPAA-capable signature tool'}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-700 border border-brand-200 bg-brand-50 rounded-lg hover:bg-brand-100 disabled:opacity-50"
          >
            <Package className="h-4 w-4" />
            Send onboarding packet
          </button>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/40">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          Signature requests ({envelopes.length})
        </h3>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : envelopes.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing sent for signature yet.</p>
        ) : (
          <ul className="space-y-2">
            {envelopes.map((env) => {
              const open = OPEN_STATUSES.includes(env.status)
              const waiting = open ? daysSince(env.sentAt || env.createdAt) : null
              const overdue = waiting != null && waiting >= OVERDUE_DAYS
              const isBusy = busyId === env.id
              return (
                <li
                  key={env.id}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{env.title}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {env.signerName} · {env.signerEmail} · {env.provider}
                      </p>
                      <StatusTimeline env={env} />
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${STATUS_STYLES[env.status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}
                      >
                        {STATUS_LABEL[env.status] || env.status}
                      </span>
                      {open && waiting != null && (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] ${overdue ? 'text-amber-700 font-medium' : 'text-slate-400'}`}
                        >
                          <Clock className="h-3 w-3" />
                          {overdue ? 'Overdue · ' : 'Awaiting '}
                          {waiting} {waiting === 1 ? 'day' : 'days'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5">
                    {env.signingUrl && env.status !== 'signed' && (
                      <>
                        <a
                          href={env.signingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Open link
                        </a>
                        <button
                          onClick={() => handleCopyLink(env)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                        >
                          {copiedId === env.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Link2 className="h-3.5 w-3.5" />}
                          {copiedId === env.id ? 'Copied' : 'Copy link'}
                        </button>
                      </>
                    )}
                    {open && (
                      <>
                        <button
                          onClick={() => handleRemind(env)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
                        >
                          <Bell className="h-3.5 w-3.5" /> Remind
                        </button>
                        <button
                          onClick={() => startCorrect(env)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
                        >
                          <Mail className="h-3.5 w-3.5" /> Fix email
                        </button>
                        <button
                          onClick={() => handleVoid(env)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          <Ban className="h-3.5 w-3.5" /> Void
                        </button>
                      </>
                    )}
                    {env.status === 'signed' && (
                      <button
                        onClick={() => handleDownload(env)}
                        disabled={downloadingId === env.id}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {downloadingId === env.id ? 'Downloading…' : 'Download signed'}
                      </button>
                    )}
                  </div>

                  {correctingId === env.id && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="email"
                        value={correctEmail}
                        onChange={(e) => setCorrectEmail(e.target.value)}
                        placeholder="corrected@example.com"
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => handleCorrect(env)}
                        disabled={isBusy || !correctEmail.trim()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" /> Re-send
                      </button>
                      <button
                        onClick={() => setCorrectingId(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Eye className="h-4 w-4 text-brand-600" />
                Preview — {isRetainer ? 'Retainer agreement' : 'HIPAA authorization'}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open tab
                </a>
                <button onClick={() => setPreviewUrl(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe title="Document preview" src={previewUrl} className="flex-1 w-full" />
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <span className="text-xs text-slate-400 mr-auto">This is a draft — nothing has been sent yet.</span>
              <button
                onClick={() => setPreviewUrl(null)}
                className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setPreviewUrl(null)
                  handleSend()
                }}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                <PenLine className="h-4 w-4" /> Send for signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

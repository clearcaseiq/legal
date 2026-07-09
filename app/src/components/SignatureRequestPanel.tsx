/**
 * Attorney-facing panel to send a case document for e-signature and track
 * envelope status. HIPAA authorizations are rendered server-side from the
 * canonical template, so no source-file upload is needed here. Retainer / fee
 * documents need a source PDF and are gated until that flow is wired.
 */
import { useEffect, useMemo, useState } from 'react'
import { PenLine, RefreshCw, ExternalLink, Download } from 'lucide-react'
import { EsignProviderPicker } from './EsignProviderPicker'
import {
  createHipaaAuthorization,
  createRetainerAgreement,
  downloadSignedEnvelope,
  getEsignProviders,
  listEnvelopes,
  type DocumentEnvelope,
  type EnvelopeStatus,
  type EsignProviderMeta,
} from '../lib/api-esign'

const DOC_TYPES = [
  { id: 'hipaa_authorization', label: 'HIPAA authorization' },
  { id: 'retainer', label: 'Retainer agreement' },
  { id: 'fee_agreement', label: 'Fee agreement' },
]

const STATUS_STYLES: Record<EnvelopeStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-indigo-100 text-indigo-700',
  signed: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
  voided: 'bg-gray-100 text-gray-600',
  expired: 'bg-amber-100 text-amber-800',
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

  const [documentType, setDocumentType] = useState(initialDocumentType)
  const [provider, setProvider] = useState<string | null>(null)
  const [signerName, setSignerName] = useState(defaultSignerName)
  const [signerEmail, setSignerEmail] = useState(defaultSignerEmail)
  const [recordsCustodian, setRecordsCustodian] = useState('')
  const [recordsDateRange, setRecordsDateRange] = useState('')
  // Retainer-specific fee terms.
  const [contingencyPercent, setContingencyPercent] = useState('33.33')
  const [costsResponsibility, setCostsResponsibility] = useState('')
  const [scope, setScope] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  // Set after the duplicate warning is shown so a confirming second click sends anyway.
  const [confirmResend, setConfirmResend] = useState(false)

  const isHipaa = documentType === 'hipaa_authorization'
  const isRetainer = documentType === 'retainer'
  const isImplemented = isHipaa || isRetainer

  // An already-open envelope of the same type (not yet signed/terminal) — sending
  // another would create a duplicate signature request for the client.
  const outstanding = useMemo(
    () => envelopes.find((e) => e.documentType === documentType && OPEN_STATUSES.includes(e.status)),
    [envelopes, documentType]
  )

  // Keep the selected doc type in sync with the deep-link (e.g. navigating to the
  // documents section via "Send retainer" preselects the retainer agreement even
  // if this panel was already mounted on the Evidence tab).
  useEffect(() => {
    setDocumentType(initialDocumentType)
    setConfirmResend(false)
  }, [initialDocumentType])

  // Reset the "send anyway" confirmation whenever the doc type changes.
  useEffect(() => {
    setConfirmResend(false)
  }, [documentType])

  const available = useMemo(
    () => providers.filter((p) => p.configured && (!isHipaa || p.hipaaCapable)),
    [providers, isHipaa]
  )

  const load = async () => {
    try {
      const [prov, envs] = await Promise.all([getEsignProviders(), listEnvelopes(leadId)])
      setProviders(prov)
      setEnvelopes(envs)
    } catch (err) {
      console.error('Failed to load e-signature data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  // Keep the selected provider valid as the document type / provider list changes.
  useEffect(() => {
    if (!provider || !available.find((p) => p.id === provider)) {
      setProvider(available[0]?.id ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType, providers])

  const handleSend = async () => {
    setError(null)
    setNotice(null)
    if (!isImplemented) {
      setNotice('Fee agreements need a source document upload — coming soon.')
      return
    }
    if (!signerName.trim() || !signerEmail.trim()) {
      setError('Client name and email are required.')
      return
    }
    // Guard against accidentally sending a duplicate while one is still open.
    if (outstanding && !confirmResend) {
      const label = DOC_TYPES.find((d) => d.id === documentType)?.label ?? 'document'
      const when = outstanding.createdAt ? ` (sent ${new Date(outstanding.createdAt).toLocaleDateString()})` : ''
      setNotice(
        `A ${label} is already awaiting signature${when}. Click “Send anyway” to send another, or wait for the client to sign.`
      )
      setConfirmResend(true)
      return
    }
    setSubmitting(true)
    try {
      let envelope: DocumentEnvelope
      if (isRetainer) {
        const pct = parseFloat(contingencyPercent)
        envelope = await createRetainerAgreement(leadId, {
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          contingencyPercent: Number.isFinite(pct) && pct > 0 ? pct : undefined,
          costsResponsibility: costsResponsibility.trim() || undefined,
          scope: scope.trim() || undefined,
          provider: provider ?? undefined,
        })
      } else {
        envelope = await createHipaaAuthorization(leadId, {
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          recordsCustodian: recordsCustodian.trim() || undefined,
          recordsDateRange: recordsDateRange.trim() || undefined,
          provider: provider ?? undefined,
        })
      }
      setEnvelopes((prev) => [envelope, ...prev])
      setNotice(`Sent “${envelope.title}” for signature via ${envelope.provider}.`)
      setConfirmResend(false)
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <PenLine className="h-4 w-4 text-brand-600" />
          E-signature
        </h2>
        <button
          onClick={load}
          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
          title="Refresh status"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Document type</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {DOC_TYPES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Signature tool</label>
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
            <label className="block text-xs text-gray-500 mb-1">Client name</label>
            <input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Signer (the client)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Client email</label>
            <input
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="client@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {isHipaa && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Records custodian / provider</label>
              <input
                value={recordsCustodian}
                onChange={(e) => setRecordsCustodian(e.target.value)}
                placeholder="e.g. St. Mary's Hospital"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Records date range</label>
              <input
                value={recordsDateRange}
                onChange={(e) => setRecordsDateRange(e.target.value)}
                placeholder="All dates relevant to the claim"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        {isRetainer && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contingency fee (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={contingencyPercent}
                  onChange={(e) => setContingencyPercent(e.target.value)}
                  placeholder="33.33"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Costs &amp; expenses</label>
                <input
                  value={costsResponsibility}
                  onChange={(e) => setCostsResponsibility(e.target.value)}
                  placeholder="Advanced by the firm, reimbursed from recovery"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Scope of representation</label>
              <input
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="e.g. Personal injury claim arising from the 6/1 collision"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && (
          <p className={`text-sm ${confirmResend ? 'text-amber-700' : 'text-gray-600'}`}>{notice}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSend}
            disabled={submitting || (isImplemented && available.length === 0)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
              confirmResend ? 'bg-amber-600 hover:bg-amber-700' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            <PenLine className="h-4 w-4" />
            {submitting ? 'Sending…' : confirmResend ? 'Send anyway' : 'Send for signature'}
          </button>
          {!isImplemented && (
            <span className="text-xs text-gray-500">
              Fee agreements need a source upload (coming soon).
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-200">
        <h3 className="text-xs font-medium text-gray-500 mb-3">
          Signature requests ({envelopes.length})
        </h3>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : envelopes.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing sent for signature yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {envelopes.map((env) => (
              <li key={env.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{env.title}</p>
                  <p className="text-xs text-gray-500">
                    {env.signerName} · {env.provider}
                    {env.createdAt && <> · {new Date(env.createdAt).toLocaleDateString()}</>}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {env.signingUrl && env.status !== 'signed' && (
                    <a
                      href={env.signingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:text-brand-700"
                      title="Open signing link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {env.status === 'signed' && (
                    <button
                      onClick={() => handleDownload(env)}
                      disabled={downloadingId === env.id}
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                      title="Download signed PDF"
                    >
                      <Download className="h-4 w-4" />
                      {downloadingId === env.id ? 'Downloading…' : 'Download'}
                    </button>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[env.status] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {STATUS_LABEL[env.status] || env.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

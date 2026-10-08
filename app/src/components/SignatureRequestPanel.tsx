/**
 * Attorney-facing form to send one case document for e-signature.
 *
 * HIPAA authorizations and retainer agreements are rendered server-side from
 * canonical templates (and can be previewed before sending). Fee agreements are
 * the firm's own PDF, uploaded here as the source document. Sent envelopes are
 * tracked in Documents > Signatures (see EnvelopeList).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PenLine, ExternalLink, Eye, Upload, Check, X, Pencil, Plus, AlertTriangle } from 'lucide-react'
import { EsignProviderPicker } from './EsignProviderPicker'
import { EssentialFieldsForm } from './EssentialFieldsForm'
import ModalPortal from './ModalPortal'
import { FirmTemplateForm } from '../features/firm/FirmTemplateForm'
import { getFirmTemplates, type FirmTemplate } from '../lib/api'
import {
  createHipaaAuthorization,
  createPoliceReportAuthorization,
  createRetainerAgreement,
  getEsignProviders,
  getEssentialFields,
  getSigningDefaults,
  previewCaseFirmTemplate,
  previewCustomDocument,
  sendCustomDocument,
  listCaseFirmTemplates,
  listEnvelopes,
  previewDocument,
  sendCaseFirmTemplate,
  textEnvelope,
  uploadFeeAgreement,
  type CaseFirmTemplate,
  type DocumentEnvelope,
  type EnvelopeStatus,
  type EsignProviderMeta,
  type EssentialDocType,
  type EssentialField,
  type EssentialValues,
} from '../lib/api-esign'

/** Error text from an axios error whose response body may be a Blob (PDF endpoints). */
async function errorMessage(err: any, fallback: string): Promise<string> {
  const data = err?.response?.data
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text())
      return parsed?.error || fallback
    } catch {
      return fallback
    }
  }
  return data?.detail || data?.error || fallback
}

type EssentialState = { fields: EssentialField[]; prefill: EssentialValues; values: EssentialValues }

const DOC_TYPES = [
  { id: 'hipaa_authorization', label: 'HIPAA authorization' },
  { id: 'retainer', label: 'Retainer agreement' },
  { id: 'police_report_authorization', label: 'Police report authorization (CA)' },
  { id: 'fee_agreement', label: 'Fee agreement (upload PDF)' },
  { id: 'firm_template', label: 'Firm template' },
]

type RetainerSource = 'platform' | 'firm' | 'upload'

// Non-terminal statuses: an envelope in one of these is still "out for signature".
const OPEN_STATUSES: EnvelopeStatus[] = ['draft', 'sent', 'viewed']

function TemplateSourcePicker({
  name,
  value,
  onChange,
  docLabel,
  labelCls,
}: {
  name: string
  value: RetainerSource
  onChange: (next: RetainerSource) => void
  docLabel: string
  labelCls: string
}) {
  const options: { id: RetainerSource; label: string }[] = [
    { id: 'platform', label: 'ClearCaseIQ template' },
    { id: 'firm', label: 'Firm template library' },
    { id: 'upload', label: `Upload my own ${docLabel} (PDF or Word)` },
  ]
  return (
    <div>
      <label className={labelCls}>{docLabel.charAt(0).toUpperCase() + docLabel.slice(1)} source</label>
      <div className="mt-1 flex flex-col gap-1.5 text-sm text-slate-700">
        {options.map((o) => (
          <label key={o.id} className="inline-flex items-center gap-2">
            <input
              type="radio"
              name={name}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
              className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-400"
            />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  )
}

function FirmTemplatePicker({
  templates,
  value,
  onChange,
  onLibraryChanged,
  labelCls,
  inputCls,
  emptyHint,
}: {
  templates: CaseFirmTemplate[]
  value: string
  onChange: (id: string) => void
  /** Refresh case-scoped template list after create/edit. */
  onLibraryChanged: (preferredId?: string) => void | Promise<void>
  labelCls: string
  inputCls: string
  emptyHint: string
}) {
  const [editor, setEditor] = useState<'new' | FirmTemplate | null>(null)
  const [categories, setCategories] = useState<Array<{ key: string; label: string }>>([])
  const [canManage, setCanManage] = useState(false)
  const [manageChecked, setManageChecked] = useState(false)
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)

  const selected = templates.find((t) => t.id === value) || templates[0] || null

  const ensureManageMeta = async () => {
    if (manageChecked && categories.length) return { canManage, categories }
    const data = await getFirmTemplates()
    setCanManage(Boolean(data.canManage))
    setCategories(data.categories || [])
    setManageChecked(true)
    return { canManage: Boolean(data.canManage), categories: data.categories || [] }
  }

  const openEditor = async (mode: 'edit' | 'new') => {
    setOpenError(null)
    setOpening(true)
    try {
      const meta = await ensureManageMeta()
      if (!meta.canManage) {
        setOpenError('Your firm role cannot edit templates. Ask a firm admin, or open Firm Dashboard → Templates.')
        return
      }
      if (mode === 'new') {
        setEditor('new')
        return
      }
      if (!selected) {
        setOpenError('Choose a template to edit.')
        return
      }
      const data = await getFirmTemplates()
      const full = data.templates.find((t) => t.id === selected.id)
      if (!full) {
        setOpenError('Template not found in the firm library. It may have been deleted.')
        return
      }
      setEditor(full)
    } catch {
      setOpenError('Could not open the template editor.')
    } finally {
      setOpening(false)
    }
  }

  const manageActions = (
    <div className="flex flex-wrap items-center gap-2">
      {selected ? (
        <button
          type="button"
          onClick={() => openEditor('edit')}
          disabled={opening}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          {opening ? 'Opening…' : 'Edit template'}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => openEditor('new')}
        disabled={opening}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        New template
      </button>
      <Link
        to="/firm-dashboard?tab=templates"
        className="text-xs font-medium text-brand-700 hover:underline"
      >
        Firm Dashboard → Templates
      </Link>
    </div>
  )

  return (
    <div className="space-y-2">
      {templates.length ? (
        <>
          <div>
            <label className={labelCls}>Firm template</label>
            <select
              value={value || selected?.id || ''}
              onChange={(e) => onChange(e.target.value)}
              className={inputCls}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.category ? ` · ${t.category}` : ''}
                </option>
              ))}
            </select>
          </div>
          {selected?.description ? <p className="text-xs text-slate-500">{selected.description}</p> : null}
          <p className="text-xs text-slate-400">
            {selected?.isPdf
              ? `Uses attached PDF${selected.fileName ? ` (${selected.fileName})` : ''}.`
              : 'Renders the template body to a PDF with case merge fields filled in.'}
          </p>
        </>
      ) : (
        <p className="text-sm text-amber-700">{emptyHint}</p>
      )}

      {manageActions}
      {openError ? <p className="text-xs text-rose-600">{openError}</p> : null}

      {editor && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4"
            onClick={() => setEditor(null)}
          >
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
                    onSaved={async (saved) => {
                      // Keep editor open after create so the attorney can attach a PDF.
                      if (editor === 'new') {
                        setEditor(saved)
                      } else {
                        setEditor(null)
                      }
                      await onLibraryChanged(saved.id)
                    }}
                    onUpdated={async (updated) => {
                      await onLibraryChanged(updated.id)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

export default function SignatureRequestPanel({
  leadId,
  defaultSignerName = '',
  defaultSignerEmail = '',
  initialDocumentType = 'hipaa_authorization',
  onSent,
}: {
  leadId: string
  defaultSignerName?: string
  defaultSignerEmail?: string
  /** Preselect the document type (e.g. 'retainer' when arriving from "Send retainer"). */
  initialDocumentType?: string
  /** `summary` says how it reached the client (email, or email plus a texted link). */
  onSent?: (envelope: DocumentEnvelope, summary: string) => void
}) {
  const [delivery, setDelivery] = useState<'email' | 'text'>('email')
  const [providers, setProviders] = useState<EsignProviderMeta[]>([])
  const [envelopes, setEnvelopes] = useState<DocumentEnvelope[]>([])
  const [loading, setLoading] = useState(true)

  const [documentType, setDocumentType] = useState(initialDocumentType)
  const [retainerSource, setRetainerSource] = useState<RetainerSource>('platform')
  const [hipaaSource, setHipaaSource] = useState<RetainerSource>('platform')
  const [essential, setEssential] = useState<Partial<Record<EssentialDocType, EssentialState>>>({})
  const [essentialLoading, setEssentialLoading] = useState(false)
  const [firmTemplates, setFirmTemplates] = useState<CaseFirmTemplate[]>([])
  const [firmTemplateId, setFirmTemplateId] = useState('')
  const [provider, setProvider] = useState<string | null>(null)
  const [signerName, setSignerName] = useState(defaultSignerName)
  const [signerEmail, setSignerEmail] = useState(defaultSignerEmail)
  const [recordsCustodian, setRecordsCustodian] = useState('')
  const [recordsDateRange, setRecordsDateRange] = useState('')
  const [clientDob, setClientDob] = useState('')
  // Police report authorization (CA) — agency / report identifiers when known.
  const [agencyName, setAgencyName] = useState('')
  const [reportNumber, setReportNumber] = useState('')
  const [incidentDate, setIncidentDate] = useState('')
  const [incidentVenue, setIncidentVenue] = useState('')
  // Retainer-specific fee terms (firm/attorney prefilled from firm defaults).
  const [firmName, setFirmName] = useState('')
  const [attorneyName, setAttorneyName] = useState('')
  // Retainers and fee agreements: the attorney countersigns after the client.
  const [countersignerName, setCountersignerName] = useState('')
  const [countersignerEmail, setCountersignerEmail] = useState('')
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
  // Set after the duplicate warning is shown so a confirming second click sends anyway.
  const [confirmResend, setConfirmResend] = useState(false)
  // Preview modal.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const isHipaa = documentType === 'hipaa_authorization'
  const isRetainer = documentType === 'retainer'
  const isPoliceAuth = documentType === 'police_report_authorization'
  const isFee = documentType === 'fee_agreement'
  const isFirmTemplate = documentType === 'firm_template'
  const essentialType: EssentialDocType | null = isRetainer ? 'retainer' : isHipaa ? 'hipaa_authorization' : null
  const essentialSource = isRetainer ? retainerSource : isHipaa ? hipaaSource : 'platform'
  // The firm's own retainer / HIPAA (library or one-off upload) gets the editable fields.
  const customMode = essentialType !== null && essentialSource !== 'platform'
  const isCustomUpload = customMode && essentialSource === 'upload'
  const usesFirmTemplate = isFirmTemplate || (customMode && essentialSource === 'firm')
  const isUploadDoc = isFee || isCustomUpload
  const essentialState = essentialType ? essential[essentialType] : undefined
  const canPreview = customMode || isHipaa || isPoliceAuth || (isRetainer && retainerSource === 'platform')

  const selectableFirmTemplates = useMemo(() => {
    if (isRetainer && retainerSource === 'firm') {
      return firmTemplates.filter(
        (t) => t.suggestedDocumentType === 'retainer' || /retainer|contingency|representation/i.test(t.name),
      )
    }
    if (isHipaa && hipaaSource === 'firm') {
      return firmTemplates.filter((t) => t.suggestedDocumentType === 'hipaa_authorization' || /hipaa/i.test(t.name))
    }
    return firmTemplates
  }, [firmTemplates, isRetainer, retainerSource, isHipaa, hipaaSource])

  // Prefill the essential fields from intake the first time a custom source is chosen.
  useEffect(() => {
    if (!customMode || !essentialType || essential[essentialType]) return
    let cancelled = false
    setEssentialLoading(true)
    getEssentialFields(leadId, essentialType)
      .then(({ fields, values }) => {
        if (cancelled) return
        setEssential((prev) => ({ ...prev, [essentialType]: { fields, prefill: values, values } }))
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the client and case details for this document.')
      })
      .finally(() => {
        if (!cancelled) setEssentialLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [customMode, essentialType, essential, leadId])

  const setEssentialValues = (next: EssentialValues) => {
    if (!essentialType) return
    setEssential((prev) => {
      const cur = prev[essentialType]
      return cur ? { ...prev, [essentialType]: { ...cur, values: next } } : prev
    })
  }

  const selectedFirmTemplate = useMemo(
    () => selectableFirmTemplates.find((t) => t.id === firmTemplateId) || null,
    [selectableFirmTemplates, firmTemplateId],
  )
  const sendsAsType = usesFirmTemplate
    ? essentialType ?? selectedFirmTemplate?.suggestedDocumentType ?? 'other'
    : documentType
  const needsCountersign = sendsAsType === 'retainer' || sendsAsType === 'fee_agreement'
  /** An uploaded firm PDF with no fields placed gets the provider's signature page appended. */
  const firmPdfWithoutFields = Boolean(
    usesFirmTemplate && selectedFirmTemplate?.isPdf && !selectedFirmTemplate.signatureFieldCount,
  )

  // An already-open envelope of the same type (not yet signed/terminal) — sending
  // another would create a duplicate signature request for the client.
  const outstanding = useMemo(() => {
    if (usesFirmTemplate && selectedFirmTemplate) {
      return envelopes.find(
        (e) =>
          OPEN_STATUSES.includes(e.status) &&
          (e.title === selectedFirmTemplate.name ||
            e.documentType === selectedFirmTemplate.suggestedDocumentType),
      )
    }
    const typeKey = isFirmTemplate ? 'other' : documentType
    return envelopes.find((e) => e.documentType === typeKey && OPEN_STATUSES.includes(e.status))
  }, [envelopes, documentType, usesFirmTemplate, selectedFirmTemplate, isFirmTemplate])

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
  const load = useCallback(async () => {
    try {
      const [prov, envs, defaults, firmTpl] = await Promise.all([
        getEsignProviders(),
        listEnvelopes(leadId),
        getSigningDefaults(leadId).catch(() => null),
        listCaseFirmTemplates(leadId).catch(() => ({ templates: [] as CaseFirmTemplate[], lawFirmId: null })),
      ])
      setProviders(prov)
      setEnvelopes(envs)
      setFirmTemplates(Array.isArray(firmTpl?.templates) ? firmTpl.templates : [])
      if (defaults) {
        if (defaults.firmName) setFirmName((v) => v || defaults.firmName || '')
        if (defaults.attorneyName) setAttorneyName((v) => v || defaults.attorneyName || '')
        if (defaults.attorneyName) setCountersignerName((v) => v || defaults.attorneyName || '')
        if (defaults.attorneyEmail) setCountersignerEmail((v) => v || defaults.attorneyEmail || '')
        if (typeof defaults.contingencyPercent === 'number') {
          setContingencyPercent((v) => (v && v !== '33.33' ? v : String(defaults.contingencyPercent)))
        }
      }
    } catch (err) {
      console.error('Failed to load e-signature data', err)
      // Providers and envelopes are fetched together, so one failing call left
      // the whole panel empty with nothing on screen to say why.
      setError(
        (err as any)?.response?.data?.error ||
          'Could not load the signature tools for this case. Refresh to try again.',
      )
    } finally {
      setLoading(false)
    }
  }, [leadId])

  const refreshFirmTemplates = useCallback(
    async (preferredId?: string) => {
      try {
        const firmTpl = await listCaseFirmTemplates(leadId)
        const next = Array.isArray(firmTpl?.templates) ? firmTpl.templates : []
        setFirmTemplates(next)
        if (preferredId && next.some((t) => t.id === preferredId)) {
          setFirmTemplateId(preferredId)
        }
      } catch {
        /* keep existing list */
      }
    },
    [leadId],
  )

  // Keep firm template selection valid as the filtered list changes.
  useEffect(() => {
    if (!selectableFirmTemplates.length) {
      setFirmTemplateId('')
      return
    }
    if (!selectableFirmTemplates.some((t) => t.id === firmTemplateId)) {
      setFirmTemplateId(selectableFirmTemplates[0].id)
    }
  }, [selectableFirmTemplates, firmTemplateId])

  useEffect(() => {
    load()
  }, [load])

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

  const parsedPct = () => {
    const pct = parseFloat(contingencyPercent)
    return Number.isFinite(pct) && pct > 0 ? pct : undefined
  }

  const duplicateGuard = (): boolean => {
    if (outstanding && !confirmResend) {
      const label = DOC_TYPES.find((d) => d.id === documentType)?.label ?? 'document'
      const when = outstanding.createdAt ? ` (sent ${new Date(outstanding.createdAt).toLocaleDateString()})` : ''
      setNotice(
        `A ${label} is already awaiting signature${when}. Click "Send anyway" to send another, or remind/void the open one under Requests.`
      )
      setConfirmResend(true)
      return true
    }
    return false
  }

  const afterSend = async (env: DocumentEnvelope, msg: string) => {
    setEnvelopes((prev) => [env, ...prev])
    setNotice(msg)
    setConfirmResend(false)
    let summary = `Sent "${env.title.split(' — ')[0]}" to ${env.signerEmail} for signature.`
    if (delivery === 'text') {
      try {
        const { deliveredTo } = await textEnvelope(leadId, env.id)
        summary = `Sent "${env.title.split(' — ')[0]}" for signature and texted the link to ${deliveredTo}.`
      } catch (err: any) {
        summary = `Sent "${env.title.split(' — ')[0]}" for signature by email, but the text failed: ${
          err?.response?.data?.error || 'could not send the text.'
        } You can text it from Signatures with Remind.`
      }
    }
    onSent?.(env, summary)
  }

  const handleSend = async () => {
    setError(null)
    setNotice(null)
    if (!signerName.trim() || !signerEmail.trim()) {
      setError('Client name and email are required.')
      return
    }
    if (usesFirmTemplate && !firmTemplateId) {
      setError(
        selectableFirmTemplates.length
          ? 'Choose a firm template to send.'
          : 'No firm templates are available. Add one under Firm Dashboard → Templates.',
      )
      return
    }
    if (isUploadDoc && !feeFile) {
      setError(
        isCustomUpload
          ? `Attach your ${isRetainer ? 'retainer' : 'HIPAA authorization'} (PDF or Word) to send.`
          : 'Attach the fee-agreement PDF to send.',
      )
      return
    }
    if (customMode && !essentialState) {
      setError('The document fields are still loading.')
      return
    }
    const countersigner = needsCountersign
      ? { name: countersignerName.trim(), email: countersignerEmail.trim() }
      : undefined
    if (countersigner && (!countersigner.name || !/^\S+@\S+\.\S+$/.test(countersigner.email))) {
      setError('Enter the countersigning attorney’s name and email. Retainers and fee agreements need the attorney’s signature.')
      return
    }
    if (duplicateGuard()) return

    setSubmitting(true)
    try {
      let envelope: DocumentEnvelope
      if (isCustomUpload && essentialType && essentialState) {
        envelope = await sendCustomDocument(leadId, feeFile as File, {
          documentType: essentialType,
          fieldValues: essentialState.values,
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          title: feeTitle.trim() || undefined,
          provider: provider ?? undefined,
          countersigner,
        })
        setFeeFile(null)
        setFeeTitle('')
        if (feeInputRef.current) feeInputRef.current.value = ''
      } else if (usesFirmTemplate) {
        envelope = await sendCaseFirmTemplate(leadId, firmTemplateId, {
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          title: selectedFirmTemplate?.name,
          provider: provider ?? undefined,
          documentType: essentialType ?? (selectedFirmTemplate?.suggestedDocumentType || 'other'),
          fieldValues: customMode ? essentialState?.values : undefined,
          countersigner,
        })
      } else if (isRetainer && retainerSource === 'platform') {
        envelope = await createRetainerAgreement(leadId, {
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          firmName: firmName.trim() || undefined,
          attorneyName: attorneyName.trim() || undefined,
          contingencyPercent: parsedPct(),
          costsResponsibility: costsResponsibility.trim() || undefined,
          scope: scope.trim() || undefined,
          provider: provider ?? undefined,
          countersigner,
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
      } else if (isPoliceAuth) {
        envelope = await createPoliceReportAuthorization(leadId, {
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          clientDob: clientDob.trim() || undefined,
          firmName: firmName.trim() || undefined,
          attorneyName: attorneyName.trim() || undefined,
          agencyName: agencyName.trim() || undefined,
          reportNumber: reportNumber.trim() || undefined,
          incidentDate: incidentDate.trim() || undefined,
          incidentVenue: incidentVenue.trim() || undefined,
          provider: provider ?? undefined,
        })
      } else {
        envelope = await uploadFeeAgreement(leadId, feeFile as File, {
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          title: feeTitle.trim() || undefined,
          provider: provider ?? undefined,
          documentType: 'fee_agreement',
          countersigner,
        })
        setFeeFile(null)
        setFeeTitle('')
        if (feeInputRef.current) feeInputRef.current.value = ''
      }
      await afterSend(envelope, `Sent "${envelope.title}" for signature via ${envelope.provider}.`)
      setRecordsCustodian('')
      setRecordsDateRange('')
      setCostsResponsibility('')
      setScope('')
    } catch (err: any) {
      setError(await errorMessage(err, 'Failed to send for signature.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePreview = async () => {
    setError(null)
    if (customMode && essentialType) {
      if (!essentialState) return setError('The document fields are still loading.')
      if (isCustomUpload && !feeFile) return setError('Attach your template (PDF or Word) to preview it.')
      if (!isCustomUpload && !firmTemplateId) return setError('Choose a firm template to preview.')
      setPreviewLoading(true)
      try {
        const url = isCustomUpload
          ? await previewCustomDocument(leadId, feeFile as File, {
              documentType: essentialType,
              fieldValues: essentialState.values,
              signerName: signerName.trim() || undefined,
              title: feeTitle.trim() || undefined,
            })
          : await previewCaseFirmTemplate(leadId, firmTemplateId, {
              documentType: essentialType,
              title: selectedFirmTemplate?.name,
              fieldValues: essentialState.values,
            })
        setPreviewUrl(url)
      } catch (err) {
        setError(await errorMessage(err, 'Could not render a preview of this document.'))
      } finally {
        setPreviewLoading(false)
      }
      return
    }
    if (!signerName.trim()) {
      setError('Enter the client name to preview the document.')
      return
    }
    setPreviewLoading(true)
    try {
      const url = await previewDocument(leadId, {
        documentType: isRetainer
          ? 'retainer'
          : isPoliceAuth
            ? 'police_report_authorization'
            : 'hipaa_authorization',
        signerName: signerName.trim(),
        firmName: firmName.trim() || undefined,
        attorneyName: attorneyName.trim() || undefined,
        contingencyPercent: parsedPct(),
        costsResponsibility: costsResponsibility.trim() || undefined,
        scope: scope.trim() || undefined,
        clientDob: clientDob.trim() || undefined,
        recordsCustodian: recordsCustodian.trim() || undefined,
        recordsDateRange: recordsDateRange.trim() || undefined,
        agencyName: agencyName.trim() || undefined,
        reportNumber: reportNumber.trim() || undefined,
        incidentDate: incidentDate.trim() || undefined,
        incidentVenue: incidentVenue.trim() || undefined,
      })
      setPreviewUrl(url)
    } catch {
      setError('Could not render a preview of this document.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const inputCls =
    'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400'
  const labelCls = 'block text-xs font-medium text-slate-500 mb-1'

  return (
    <div>
      <div className="space-y-4">
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
              loading={loading}
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
          <TemplateSourcePicker
            name="hipaa-source"
            value={hipaaSource}
            onChange={setHipaaSource}
            docLabel="HIPAA authorization"
            labelCls={labelCls}
          />
        )}

        {isHipaa && hipaaSource === 'firm' && (
          <FirmTemplatePicker
            templates={selectableFirmTemplates}
            value={firmTemplateId}
            onChange={setFirmTemplateId}
            onLibraryChanged={refreshFirmTemplates}
            labelCls={labelCls}
            inputCls={inputCls}
            emptyHint="No HIPAA templates in your firm library yet. Upload one in Firm Dashboard → Templates and set its document type to HIPAA authorization."
          />
        )}

        {isHipaa && hipaaSource === 'platform' && (
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

        {isPoliceAuth && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Client permission for counsel to obtain a California police / traffic collision / incident
              report (Vehicle Code § 20012 context). Attach the signed copy when the agency asks for
              client authorization; you may still need the agency’s own form and attorney declaration.
            </p>
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
                <label className={labelCls}>Attorney of record</label>
                <input
                  value={attorneyName}
                  onChange={(e) => setAttorneyName(e.target.value)}
                  placeholder="Attorney name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Agency (CHP / PD / sheriff)</label>
                <input
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="e.g. CHP – Golden Gate Division"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Report / DR number</label>
                <input
                  value={reportNumber}
                  onChange={(e) => setReportNumber(e.target.value)}
                  placeholder="If known"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Incident date</label>
                <input
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  placeholder="e.g. 2026-03-15"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Venue (city / county)</label>
                <input
                  value={incidentVenue}
                  onChange={(e) => setIncidentVenue(e.target.value)}
                  placeholder="e.g. Los Angeles County"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Client date of birth</label>
                <input
                  value={clientDob}
                  onChange={(e) => setClientDob(e.target.value)}
                  placeholder="Optional"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}

        {isRetainer && (
          <div className="space-y-4">
            <TemplateSourcePicker
              name="retainer-source"
              value={retainerSource}
              onChange={setRetainerSource}
              docLabel="retainer"
              labelCls={labelCls}
            />
            {retainerSource === 'platform' && (
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
            {retainerSource === 'firm' && (
              <FirmTemplatePicker
                templates={selectableFirmTemplates}
                value={firmTemplateId}
                onChange={setFirmTemplateId}
                onLibraryChanged={refreshFirmTemplates}
                labelCls={labelCls}
                inputCls={inputCls}
                emptyHint="No retainer templates in your firm library yet. Create one here or in Firm Dashboard → Templates."
              />
            )}
          </div>
        )}

        {isFirmTemplate && (
          <FirmTemplatePicker
            templates={selectableFirmTemplates}
            value={firmTemplateId}
            onChange={setFirmTemplateId}
            onLibraryChanged={refreshFirmTemplates}
            labelCls={labelCls}
            inputCls={inputCls}
            emptyHint="No active firm templates yet. Create one here or in Firm Dashboard → Templates."
          />
        )}

        {isUploadDoc && (
          <div>
            <label className={labelCls}>
              {isCustomUpload
                ? `Your ${isRetainer ? 'retainer agreement' : 'HIPAA authorization'} (PDF or Word)`
                : 'Fee-agreement PDF'}
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={feeInputRef}
                type="file"
                accept={
                  isCustomUpload
                    ? 'application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx'
                    : 'application/pdf'
                }
                onChange={(e) => setFeeFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
              />
            </div>
            {feeFile && (
              <input
                value={feeTitle}
                onChange={(e) => setFeeTitle(e.target.value)}
                placeholder={`Title (default: ${isRetainer ? 'Retainer agreement' : isHipaa ? 'HIPAA authorization' : 'Fee agreement'} — ${signerName || 'client'})`}
                className={`${inputCls} mt-2`}
              />
            )}
            <p className="mt-1 text-xs text-slate-400">
              {isCustomUpload
                ? 'Max 25MB. Fillable PDF fields and {{tokens}} in Word files (e.g. {{client_name}}, {{fee_percentage}}) are filled from the fields below. A PDF without fillable fields gets a "Key terms" page in front, and your pages are kept unchanged.'
                : "Upload your firm's own agreement PDF (max 25MB) to send it for signature."}
            </p>
          </div>
        )}

        {firmPdfWithoutFields && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              No signature fields are placed on this template, so signers get a separate signature page after the
              document. To have them sign on your signature lines, open the template under Firm Dashboard → Templates
              and choose “Place signature fields”.
            </span>
          </div>
        )}

        {needsCountersign && (
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-700">Attorney countersignature (required)</p>
            <p className="text-xs text-slate-500">
              After the client signs, this attorney gets the signing email and signs on the attorney line. The agreement
              counts as signed only once both have signed. It must be an attorney at your firm.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Countersigning attorney</label>
                <input
                  value={countersignerName}
                  onChange={(e) => setCountersignerName(e.target.value)}
                  placeholder="Attorney name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Attorney email</label>
                <input
                  type="email"
                  value={countersignerEmail}
                  onChange={(e) => setCountersignerEmail(e.target.value)}
                  placeholder="attorney@firm.com"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}

        {customMode && (
          <EssentialFieldsForm
            fields={essentialState?.fields ?? []}
            values={essentialState?.values ?? {}}
            prefill={essentialState?.prefill ?? {}}
            loading={essentialLoading && !essentialState}
            onChange={setEssentialValues}
            labelCls={labelCls}
            inputCls={inputCls}
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice &&
          (confirmResend ? (
            <p className="text-sm text-amber-700">{notice}</p>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{notice}</span>
            </div>
          ))}

        <div>
          <label className={labelCls}>Send to the client by</label>
          <div className="inline-flex rounded-lg bg-slate-100 p-1" role="radiogroup" aria-label="Delivery">
            {(['email', 'text'] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={delivery === d}
                onClick={() => setDelivery(d)}
                className={`rounded-md px-3 py-1 text-sm font-semibold transition ${
                  delivery === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {d === 'email' ? 'Email' : 'Text'}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {delivery === 'email'
              ? 'The signing service emails the client a link to sign.'
              : 'We text the client a no-login link to sign. The signing service also sends its usual email.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleSend}
            disabled={
              submitting ||
              available.length === 0 ||
              (usesFirmTemplate && !firmTemplateId) ||
              (isUploadDoc && !feeFile)
            }
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${
              confirmResend ? 'bg-amber-600 hover:bg-amber-700' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {isUploadDoc ? <Upload className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
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
        </div>
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
              <span className="text-xs text-slate-400 mr-auto">This is a draft. Nothing has been sent yet.</span>
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

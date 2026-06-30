/**
 * Document request page - dedicated screen for requesting docs from plaintiff (not post-acceptance).
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Sparkles, UploadCloud, CheckCircle2 } from 'lucide-react'
import {
  getLead,
  createDocumentRequest,
  createOpposingDocumentRequest,
  getLeadOpposingDocSuggestions,
  getAttorneyDocumentRequests,
  getOpposingDocumentUploads,
  downloadOpposingDocument,
  nudgeDocumentRequest,
  uploadLeadEvidenceOnBehalf,
  getLeadCommandCenter,
  type CaseCommandCenter,
  type OpposingDocRole,
  type OpposingDocSuggestion,
  type AttorneyDocumentRequest,
  type OpposingDocUpload,
} from '../lib/api'
import { DOC_TYPES, type DocTypeId } from '../components/DocumentRequestModal'
import { invalidateAttorneyDashboardSummary } from '../hooks/useAttorneyDashboardSummary'

const claimLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

// Documents an attorney can request from the defendant / opposing party / insurer.
const OPPOSING_DOC_TYPES = [
  { id: 'insurance_policy', label: 'Insurance policy / declarations page' },
  { id: 'incident_report', label: 'Incident / accident report' },
  { id: 'surveillance', label: 'Surveillance or camera footage' },
  { id: 'maintenance_records', label: 'Maintenance / inspection records' },
  { id: 'vehicle_records', label: 'Vehicle / black-box (EDR) data' },
  { id: 'employment_records', label: 'Employment / training records' },
  { id: 'correspondence', label: 'Relevant correspondence' },
  { id: 'photos', label: 'Photographs of the scene/vehicle' },
  { id: 'other', label: 'Other documents' },
] as const

const ROLE_OPTIONS: Array<{ id: OpposingDocRole; label: string }> = [
  { id: 'defendant', label: 'Defendant' },
  { id: 'opposing_counsel', label: 'Opposing counsel' },
  { id: 'insurer', label: 'Insurer / adjuster' },
]

// Evidence categories for documents the attorney collects and uploads on the
// client's behalf. Mirrors the plaintiff-upload categories the valuation reads.
const BEHALF_CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'insurance', label: 'Insurance / declarations page' },
  { id: 'bills', label: 'Medical bills' },
  { id: 'medical_records', label: 'Medical records' },
  { id: 'police_report', label: 'Police / incident report' },
  { id: 'wage_loss', label: 'Lost wage proof' },
  { id: 'photos', label: 'Injury / scene photos' },
  { id: 'other', label: 'Other document' },
]

export default function DocumentRequestPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [lead, setLead] = useState<any>(null)
  const [commandCenter, setCommandCenter] = useState<CaseCommandCenter | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commandCenterLoading, setCommandCenterLoading] = useState(false)

  const [selected, setSelected] = useState<Set<DocTypeId>>(new Set())
  const [customMessage, setCustomMessage] = useState('')
  const [sendUploadLinkOnly, setSendUploadLinkOnly] = useState(false)
  const [formTouched, setFormTouched] = useState(false)
  const [appliedAutoSuggestion, setAppliedAutoSuggestion] = useState(false)

  // Recipient mode: request from the plaintiff (default) or the defendant/opposing party.
  const [mode, setMode] = useState<'plaintiff' | 'opposing'>('plaintiff')
  const [opposingSelected, setOpposingSelected] = useState<Set<string>>(new Set())
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientRole, setRecipientRole] = useState<OpposingDocRole>('defendant')
  const [opposingMessage, setOpposingMessage] = useState('')
  const [suggestions, setSuggestions] = useState<OpposingDocSuggestion[]>([])
  const [appliedSuggestionId, setAppliedSuggestionId] = useState<string | null>(null)
  const [sentRequests, setSentRequests] = useState<AttorneyDocumentRequest[]>([])
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null)
  const [uploadsByRequest, setUploadsByRequest] = useState<Record<string, OpposingDocUpload[]>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  // "Upload on behalf of client" panel state.
  const [behalfCategory, setBehalfCategory] = useState<string>('insurance')
  const [behalfUploading, setBehalfUploading] = useState(false)
  const [behalfError, setBehalfError] = useState<string | null>(null)
  const [behalfUploaded, setBehalfUploaded] = useState<string[]>([])
  const prefill = (location.state as {
    prefill?: { requestedDocs?: DocTypeId[]; customMessage?: string; sendUploadLinkOnly?: boolean }
    source?: string
  } | null)?.prefill
  const source = (location.state as { source?: string } | null)?.source

  const applySuggestedRequest = (payload: {
    requestedDocs?: DocTypeId[]
    customMessage?: string
    sendUploadLinkOnly?: boolean
  }) => {
    setSelected(new Set(payload.requestedDocs || []))
    setCustomMessage(payload.customMessage || '')
    setSendUploadLinkOnly(Boolean(payload.sendUploadLinkOnly))
  }

  useEffect(() => {
    if (!leadId) {
      setError('No case selected')
      setLoading(false)
      return
    }
    getLead(leadId)
      .then(setLead)
      .catch((err: any) => setError(err?.response?.data?.error || err?.message || 'Failed to load case'))
      .finally(() => setLoading(false))
  }, [leadId])

  useEffect(() => {
    if (!prefill) return
    applySuggestedRequest(prefill)
  }, [prefill])

  useEffect(() => {
    if (!leadId) return
    let cancelled = false
    const loadCommandCenter = async () => {
      try {
        setCommandCenterLoading(true)
        const summary = await getLeadCommandCenter(leadId)
        if (!cancelled) {
          setCommandCenter(summary)
        }
      } catch {
        if (!cancelled) setCommandCenter(null)
      } finally {
        if (!cancelled) setCommandCenterLoading(false)
      }
    }
    void loadCommandCenter()
    return () => {
      cancelled = true
    }
  }, [leadId])

  useEffect(() => {
    if (prefill || formTouched || appliedAutoSuggestion) return
    if (!commandCenter?.suggestedDocumentRequest) return
    applySuggestedRequest({
      requestedDocs: commandCenter.suggestedDocumentRequest.requestedDocs as DocTypeId[],
      customMessage: commandCenter.suggestedDocumentRequest.customMessage,
      sendUploadLinkOnly: false,
    })
    setAppliedAutoSuggestion(true)
  }, [appliedAutoSuggestion, commandCenter, formTouched, prefill])

  const loadSentRequests = async () => {
    if (!leadId) return
    try {
      const all = await getAttorneyDocumentRequests()
      setSentRequests(all.filter((r) => r.leadId === leadId && r.targetType === 'opposing_party'))
    } catch {
      setSentRequests([])
    }
  }

  useEffect(() => {
    if (!leadId) return
    let cancelled = false
    getLeadOpposingDocSuggestions(leadId)
      .then((rows) => {
        if (cancelled) return
        const pending = rows.filter((r) => r.status === 'pending')
        setSuggestions(pending)
        // If the plaintiff suggested a request, surface the defendant tab first.
        if (pending.length > 0) setMode('opposing')
      })
      .catch(() => {
        if (!cancelled) setSuggestions([])
      })
    void loadSentRequests()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  const toggleUploads = async (requestId: string) => {
    if (expandedRequestId === requestId) {
      setExpandedRequestId(null)
      return
    }
    setExpandedRequestId(requestId)
    if (!uploadsByRequest[requestId]) {
      try {
        const uploads = await getOpposingDocumentUploads(requestId)
        setUploadsByRequest((prev) => ({ ...prev, [requestId]: uploads }))
      } catch {
        setUploadsByRequest((prev) => ({ ...prev, [requestId]: [] }))
      }
    }
  }

  const copyLink = async (request: AttorneyDocumentRequest) => {
    if (!request.uploadLink) return
    try {
      await navigator.clipboard.writeText(request.uploadLink)
      setCopiedId(request.id)
      setTimeout(() => setCopiedId((id) => (id === request.id ? null : id)), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  const handleNudge = async (requestId: string) => {
    try {
      await nudgeDocumentRequest(requestId)
      await loadSentRequests()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not send a reminder right now.')
    }
  }

  const toggle = (id: DocTypeId) => {
    setFormTouched(true)
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleOpposing = (id: string) => {
    setOpposingSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const applySuggestion = (s: OpposingDocSuggestion) => {
    setOpposingSelected(new Set(s.requestedDocs))
    if (s.recipientName) setRecipientName(s.recipientName)
    if (s.recipientRole) setRecipientRole(s.recipientRole)
    if (s.note) setOpposingMessage(s.note)
    setAppliedSuggestionId(s.id)
  }

  const handleOpposingSubmit = async () => {
    if (!leadId) return
    if (!recipientName.trim()) {
      setError('Enter the name of the defendant, opposing counsel, or insurer.')
      return
    }
    if (opposingSelected.size === 0) {
      setError('Select at least one document to request.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await createOpposingDocumentRequest(leadId, {
        requestedDocs: [...opposingSelected],
        customMessage: opposingMessage.trim() || undefined,
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim() || undefined,
        recipientRole,
        suggestionId: appliedSuggestionId || undefined,
      })
      invalidateAttorneyDashboardSummary()
      // Stay on the page so the attorney can copy the secure link and track uploads.
      setOpposingSelected(new Set())
      setRecipientName('')
      setRecipientEmail('')
      setOpposingMessage('')
      setAppliedSuggestionId(null)
      setSuggestions((prev) => prev.filter((s) => s.id !== appliedSuggestionId))
      await loadSentRequests()
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to send document request')
    } finally {
      setSaving(false)
    }
  }

  const handleBehalfUpload = async (files: FileList | null) => {
    if (!leadId || !files || files.length === 0) return
    setBehalfError(null)
    setBehalfUploading(true)
    const label = BEHALF_CATEGORIES.find((c) => c.id === behalfCategory)?.label || behalfCategory
    try {
      for (const file of Array.from(files)) {
        await uploadLeadEvidenceOnBehalf(leadId, file, {
          category: behalfCategory,
          description: `${label} — uploaded by attorney on behalf of client`,
        })
        setBehalfUploaded((prev) => [...prev, file.name])
      }
      invalidateAttorneyDashboardSummary()
    } catch (err: any) {
      setBehalfError(err?.response?.data?.error || err?.message || 'Upload failed')
    } finally {
      setBehalfUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!leadId) return
    const canSubmit = sendUploadLinkOnly || selected.size > 0
    if (!canSubmit) {
      setError('Please select at least one document type or "Send Upload Link only".')
      return
    }
    setError(null)
    setSaving(true)
    try {
      if (sendUploadLinkOnly) {
        await createDocumentRequest(leadId, { requestedDocs: [], customMessage, sendUploadLinkOnly: true })
      } else {
        await createDocumentRequest(leadId, { requestedDocs: [...selected], customMessage: customMessage.trim() || undefined })
      }
      invalidateAttorneyDashboardSummary()
      navigate('/attorney-dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to send document request')
    } finally {
      setSaving(false)
    }
  }

  const caseLabel = lead
    ? `${claimLabel(lead.assessment?.claimType || 'Case')} — ${[lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || '—'}`
    : ''

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (error && !lead) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
        <button
          onClick={() => navigate('/attorney-dashboard')}
          className="mt-4 px-4 py-2 text-brand-600 hover:underline"
        >
          ← Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/attorney-dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Request documents</h1>
          <p className="text-sm text-gray-500 mt-1">{caseLabel}</p>
        </div>

        <div className="mb-6 inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => { setMode('plaintiff'); setError(null) }}
            className={`px-4 py-2 text-sm font-medium rounded-md ${mode === 'plaintiff' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            From plaintiff
          </button>
          <button
            type="button"
            onClick={() => { setMode('opposing'); setError(null) }}
            className={`px-4 py-2 text-sm font-medium rounded-md ${mode === 'opposing' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            From defendant / opposing party
            {suggestions.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                {suggestions.length}
              </span>
            )}
          </button>
        </div>

        {mode === 'plaintiff' && commandCenter ? (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Case Command Center</div>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{commandCenter.stage.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{commandCenter.nextBestAction.detail}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-right">
                <div className="text-xs uppercase tracking-wide text-slate-500">Readiness</div>
                <div className="text-lg font-semibold text-slate-900">{commandCenter.readiness.score}%</div>
                <div className="text-xs text-slate-600">{commandCenter.readiness.label}</div>
              </div>
            </div>

            {commandCenter.missingItems.length > 0 ? (
              <div className="mt-4">
                <div className="text-sm font-medium text-slate-900">Highest-impact blockers</div>
                <div className="mt-2 grid gap-2">
                  {commandCenter.missingItems.slice(0, 3).map((item) => (
                    <div key={item.key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-slate-900">{item.label}</div>
                        <div className="text-xs uppercase tracking-wide text-slate-500">{item.priority}</div>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">{item.plaintiffReason}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {commandCenter.suggestedDocumentRequest ? (
              <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-3 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                  <Sparkles className="h-4 w-4" />
                  Live recommendation
                </div>
                <div className="mt-2 text-sm text-brand-900">{commandCenter.suggestedDocumentRequest.customMessage}</div>
                <button
                  type="button"
                  onClick={() => {
                    applySuggestedRequest({
                      requestedDocs: commandCenter.suggestedDocumentRequest?.requestedDocs as DocTypeId[],
                      customMessage: commandCenter.suggestedDocumentRequest?.customMessage,
                    })
                    setFormTouched(false)
                  }}
                  className="mt-3 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Use recommendation in form
                </button>
              </div>
            ) : null}
          </div>
        ) : mode === 'plaintiff' && commandCenterLoading ? (
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            Loading case command center...
          </div>
        ) : null}

        {mode === 'plaintiff' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 space-y-5">
            {source === 'command-center' && prefill ? (
              <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-3 text-sm text-brand-800">
                Suggested from the case command center. You can edit the request before sending it.
              </div>
            ) : !prefill && commandCenter?.suggestedDocumentRequest ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                The form has been prefilled from the latest case command center recommendation. You can adjust anything before sending.
              </div>
            ) : null}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Select documents needed:</p>
              <div className="space-y-2">
                {DOC_TYPES.map((doc) => (
                  <label key={doc.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(doc.id)}
                      onChange={() => toggle(doc.id)}
                      disabled={sendUploadLinkOnly}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-800">{doc.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendUploadLinkOnly}
                  onChange={(e) => {
                    setFormTouched(true)
                    setSendUploadLinkOnly(e.target.checked)
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Send Upload Link only</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">Let plaintiff upload anything quickly without selecting document types.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Optional message</label>
              <textarea
                value={customMessage}
                onChange={(e) => {
                  setFormTouched(true)
                  setCustomMessage(e.target.value)
                }}
                placeholder='e.g. "Please upload the police report if available."'
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => navigate('/attorney-dashboard')}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={(!sendUploadLinkOnly && selected.size === 0) || saving}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </div>
        )}

        {mode === 'plaintiff' && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-brand-50 p-2">
              <UploadCloud className="h-5 w-5 text-brand-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-gray-900">Or upload on the client&apos;s behalf</h2>
              <p className="mt-1 text-sm text-gray-500">
                Have a document the client sent you (or that your firm collected)? Add it directly to
                their case file. It attaches to the client&apos;s assessment and updates the live
                estimate — no need to wait on the client.
              </p>
            </div>
          </div>

          {behalfError && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {behalfError}
            </div>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document type</label>
              <select
                value={behalfCategory}
                onChange={(e) => setBehalfCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {BEHALF_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <label className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium cursor-pointer ${behalfUploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
              <UploadCloud className="h-4 w-4" />
              {behalfUploading ? 'Uploading…' : 'Choose file(s)'}
              <input
                type="file"
                multiple
                disabled={behalfUploading}
                onChange={(e) => {
                  void handleBehalfUpload(e.target.files)
                  e.target.value = ''
                }}
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.txt"
              />
            </label>
          </div>

          {behalfUploaded.length > 0 && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Added to the client&apos;s case file — the estimate is recalculating.
              </div>
              <ul className="mt-1 ml-6 list-disc text-xs text-emerald-700">
                {behalfUploaded.map((name, i) => (
                  <li key={`${name}-${i}`} className="truncate">{name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        )}

        {mode === 'opposing' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 space-y-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>
                  This sends a secure upload link to the defendant, opposing counsel, or insurer.
                  They do not need an account. Use this for pre-litigation requests or to collect
                  documents the other side has agreed to produce.
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
                  <Sparkles className="h-4 w-4" />
                  The plaintiff suggested requesting documents from the other side
                </div>
                <div className="mt-2 space-y-2">
                  {suggestions.map((s) => (
                    <div key={s.id} className="rounded-md border border-indigo-200 bg-white px-3 py-2">
                      {s.recipientName && (
                        <div className="text-sm font-medium text-slate-900">{s.recipientName}</div>
                      )}
                      {s.requestedDocs.length > 0 && (
                        <div className="text-xs text-slate-600">
                          {s.requestedDocs
                            .map((d) => OPPOSING_DOC_TYPES.find((o) => o.id === d)?.label || d)
                            .join(', ')}
                        </div>
                      )}
                      {s.note && <div className="mt-1 text-xs text-slate-500">“{s.note}”</div>}
                      <button
                        type="button"
                        onClick={() => applySuggestion(s)}
                        className="mt-2 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        Use this suggestion
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g., Acme Insurance / John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient role</label>
                <select
                  value={recipientRole}
                  onChange={(e) => setRecipientRole(e.target.value as OpposingDocRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Where to send the secure upload link"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              <p className="text-xs text-gray-500 mt-1">If left blank, you can copy and share the secure link from the document requests list.</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Documents to request:</p>
              <div className="space-y-2">
                {OPPOSING_DOC_TYPES.map((doc) => (
                  <label key={doc.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opposingSelected.has(doc.id)}
                      onChange={() => toggleOpposing(doc.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-800">{doc.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message to recipient</label>
              <textarea
                value={opposingMessage}
                onChange={(e) => setOpposingMessage(e.target.value)}
                placeholder='e.g. "Per our call, please upload the declarations page and the incident report."'
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => navigate('/attorney-dashboard')}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleOpposingSubmit}
              disabled={opposingSelected.size === 0 || !recipientName.trim() || saving}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Sending…' : 'Send to recipient'}
            </button>
          </div>
        </div>
        )}

        {mode === 'opposing' && sentRequests.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Requests sent to the other side</h2>
            <div className="mt-4 space-y-3">
              {sentRequests.map((r) => (
                <div key={r.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {r.recipientName || 'Recipient'}
                        {r.recipientRole && (
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            {ROLE_OPTIONS.find((o) => o.id === r.recipientRole)?.label}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        Sent {new Date(r.createdAt).toLocaleDateString()}
                        {r.lastNudgeAt ? ` • Reminder ${new Date(r.lastNudgeAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      r.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : r.status === 'partial'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}>
                      {r.status === 'completed' ? 'Completed' : r.status === 'partial' ? 'Partial' : 'Awaiting upload'}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyLink(r)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {copiedId === r.id ? 'Copied!' : 'Copy secure link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudge(r.id)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Send reminder
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleUploads(r.id)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {expandedRequestId === r.id ? 'Hide files' : `View files (${r.uploadedCount ?? 0})`}
                    </button>
                  </div>

                  {expandedRequestId === r.id && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      {(uploadsByRequest[r.id]?.length ?? 0) === 0 ? (
                        <p className="text-xs text-gray-500">No files uploaded yet.</p>
                      ) : (
                        <ul className="space-y-1">
                          {uploadsByRequest[r.id].map((u) => (
                            <li key={u.id} className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm text-gray-700">
                                {u.originalName}
                                {u.uploadedByName ? <span className="text-xs text-gray-400"> · {u.uploadedByName}</span> : null}
                              </span>
                              <button
                                type="button"
                                onClick={() => downloadOpposingDocument(r.id, u.id, u.originalName)}
                                className="shrink-0 text-xs font-medium text-brand-600 hover:underline"
                              >
                                Download
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

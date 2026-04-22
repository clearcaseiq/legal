/**
 * Document request page - dedicated screen for requesting docs from plaintiff (not post-acceptance).
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Sparkles } from 'lucide-react'
import { getLead, createDocumentRequest, getLeadCommandCenter, type CaseCommandCenter } from '../lib/api'
import { DOC_TYPES, type DocTypeId } from '../components/DocumentRequestModal'
import { invalidateAttorneyDashboardSummary } from '../hooks/useAttorneyDashboardSummary'

const claimLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

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

  const toggle = (id: DocTypeId) => {
    setFormTouched(true)
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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

        {commandCenter ? (
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
        ) : commandCenterLoading ? (
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            Loading case command center...
          </div>
        ) : null}

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
      </div>
    </div>
  )
}

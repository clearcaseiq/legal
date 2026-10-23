/**
 * Medical records and billing request to one treating provider, in three steps:
 * Details (what to ask for, and whether the case backs the letter's statements),
 * Review (edit beside a live preview), and Send (the server's pre-send checks,
 * which block blanks, unsupported representation or authorization statements,
 * and any send from a test case).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Download, FileText, FlaskConical, Mail, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import {
  checkRecordsRequest,
  downloadDraftLetterPdf,
  getLetterTemplates,
  getRecordsRequestPreview,
  sendRecordsRequest,
  type CaseLetter,
  type LetterCheck,
  type LetterTemplateOption,
  type RecordsRequestPreview,
  type RecordsRequestScope,
  type RecordsRequestType,
  type RepresentationStatus,
} from '../../lib/api'
import { saveLetterPdf } from './LetterComposerModal'
import { LetterChecklist, LetterPaper, RepresentationPanel, checkCounts, openPdfBlob, shortDay } from './LetterSafeguards'

type SendResult = { letter: CaseLetter; emailed: boolean; tasksCompleted: number }

const REQUEST_TYPES: Array<{ id: RecordsRequestType; label: string; hint: string }> = [
  { id: 'records_and_billing', label: 'Medical records and itemized billing', hint: 'Clinical records plus an itemized statement' },
  { id: 'records', label: 'Medical records only', hint: 'Notes, reports, results, imaging' },
  { id: 'billing', label: 'Billing only', hint: 'Itemized charges, CPT codes, payments, balance' },
]

const HIPAA_TEXT: Record<string, string> = {
  missing: 'The client has not signed a HIPAA authorization.',
  expired: 'The signed authorization has expired.',
  other_provider: 'The signed authorization names a different provider.',
}

const STEPS = ['Details', 'Review letter', 'Send'] as const

export default function RecordsRequestModal({
  leadId,
  providerName,
  canAttest,
  onClose,
  onSent,
  onOpenSection,
}: {
  leadId: string
  providerName: string
  canAttest: boolean
  onClose: () => void
  onSent: (result: SendResult, message: string) => void
  onOpenSection?: (section: string) => void
}) {
  const [step, setStep] = useState(0)
  const [preview, setPreview] = useState<RecordsRequestPreview | null>(null)
  const [scope, setScope] = useState<RecordsRequestScope | null>(null)
  const [builtFor, setBuiltFor] = useState('')
  const [representation, setRepresentation] = useState<RepresentationStatus | null>(null)
  const [templates, setTemplates] = useState<LetterTemplateOption[]>([])
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [loadedBody, setLoadedBody] = useState('')
  const [delivery, setDelivery] = useState<'email' | 'download'>('email')
  const [email, setEmail] = useState('')
  const [checks, setChecks] = useState<LetterCheck[]>([])
  const [ack, setAck] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<null | 'send' | 'pdf' | 'checks'>(null)
  const [error, setError] = useState<string | null>(null)
  const checksSeq = useRef(0)

  const scopeKey = (s: RecordsRequestScope | null, t: string | null) => JSON.stringify([s, t])

  const build = async (nextScope: RecordsRequestScope | null, tId: string | null) => {
    setLoading(true)
    setError(null)
    try {
      const p = await getRecordsRequestPreview(leadId, { name: providerName, templateId: tId, ...(nextScope || {}) })
      setPreview(p)
      setScope(p.scope)
      setRepresentation(p.representation)
      setBody(p.body)
      setLoadedBody(p.body)
      setChecks(p.checks)
      setBuiltFor(scopeKey(p.scope, tId))
      if (!email && p.recipientEmail) setEmail(p.recipientEmail)
      if (!p.recipientEmail) setDelivery('download')
      return true
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not build the request.')
      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    getLetterTemplates(leadId, 'provider_lor')
      .then((list) => {
        if (cancelled) return
        setTemplates(list)
        const def = list.find((t) => t.isDefault)?.id ?? null
        setTemplateId(def)
        void build(null, def)
      })
      .catch(() => !cancelled && void build(null, null))
    return () => {
      cancelled = true
    }
  }, [leadId, providerName]) // eslint-disable-line react-hooks/exhaustive-deps

  const runChecks = async () => {
    if (!scope) return
    const seq = ++checksSeq.current
    setBusy((b) => b ?? 'checks')
    try {
      const next = await checkRecordsRequest(leadId, {
        name: providerName,
        ...scope,
        body,
        delivery,
        recipientEmail: delivery === 'email' ? email.trim() : undefined,
      })
      if (seq === checksSeq.current) setChecks(next)
    } catch {
      /* keep the last checks */
    } finally {
      setBusy((b) => (b === 'checks' ? null : b))
    }
  }

  useEffect(() => {
    if (step !== 2) return
    const t = window.setTimeout(() => void runChecks(), 350)
    return () => window.clearTimeout(t)
  }, [step, delivery, email]) // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = async () => {
    if (step === 0) {
      const stale = builtFor !== scopeKey(scope, templateId)
      if (stale) {
        if (body !== loadedBody && !window.confirm('Changing the request rebuilds the letter and replaces your edits. Continue?')) return
        if (!(await build(scope, templateId))) return
      }
      setStep(1)
    } else if (step === 1) {
      setAck(false)
      setStep(2)
    }
  }

  const pdfPreview = async () => {
    setBusy('pdf')
    try {
      await openPdfBlob(await downloadDraftLetterPdf(leadId, 'provider_lor', body))
    } catch {
      setError('Could not render the PDF preview.')
    } finally {
      setBusy(null)
    }
  }

  const send = async () => {
    if (!scope) return
    setBusy('send')
    setError(null)
    try {
      const result = await sendRecordsRequest(leadId, {
        name: providerName,
        ...scope,
        body,
        delivery,
        acknowledgeWarnings: ack,
        ...(delivery === 'email' ? { recipientEmail: email.trim() } : {}),
      })
      if (delivery === 'download') {
        await saveLetterPdf(leadId, result.letter.id, `Records-Request-${providerName.replace(/[^a-z0-9]+/gi, '-')}.pdf`)
      }
      const closed = result.tasksCompleted ? ' The task is marked done.' : ''
      onSent(
        result,
        delivery === 'email'
          ? `Records request emailed to ${email.trim()}.${closed}`
          : `Records request for ${providerName} downloaded and logged as sent.${closed}`,
      )
    } catch (err: any) {
      const data = err?.response?.data
      if (Array.isArray(data?.checks)) setChecks(data.checks)
      setError(data?.error || 'Could not send the request.')
    } finally {
      setBusy(null)
    }
  }

  const counts = checkCounts(checks)
  const isTest = Boolean(preview?.isTest)
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSend = !isTest && counts.block === 0 && (counts.warn === 0 || ack) && (delivery === 'download' || emailValid)
  const hipaa = preview?.hipaa
  const recordOptions = useMemo(() => Object.entries(preview?.recordTypeOptions || {}), [preview])

  const updateScope = (patch: Partial<RecordsRequestScope>) => setScope((s) => (s ? { ...s, ...patch } : s))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3" role="dialog" aria-modal="true">
      <div className="flex h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">Medical records request</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Draft</span>
                {isTest ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                    <FlaskConical className="h-3 w-3" /> Test case
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                {preview?.patient.name || 'Patient'} · {providerName}
              </p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <ol className="mt-3 flex gap-1">
            {STEPS.map((label, i) => (
              <li key={label} className="flex-1">
                <button
                  type="button"
                  disabled={i > step || loading}
                  onClick={() => setStep(i)}
                  className={`w-full border-b-2 pb-2 text-left text-sm font-semibold transition ${
                    i === step ? 'border-brand-600 text-brand-700' : i < step ? 'border-emerald-400 text-slate-600 hover:text-slate-900' : 'border-slate-200 text-slate-400'
                  }`}
                >
                  <span className="mr-1.5 text-xs">{i + 1}.</span>
                  {label}
                </button>
              </li>
            ))}
          </ol>
        </div>

        {isTest ? (
          <div className="flex items-start gap-2 border-b border-rose-100 bg-rose-50 px-5 py-2 text-sm text-rose-800">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              This case contains synthetic or test documents{preview?.testDocuments.length ? ` (${preview.testDocuments.slice(0, 2).join(', ')})` : ''}. Nothing can be
              emailed or logged as sent to a provider; you can download a watermarked test copy.
            </span>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && !preview ? (
            <div className="px-5 py-16 text-center text-sm text-slate-400">Preparing the request…</div>
          ) : step === 0 && scope && preview ? (
            <div className="grid gap-5 px-5 py-4 lg:grid-cols-[1.25fr_1fr]">
              <div className="space-y-4">
                <section>
                  <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Request type</h3>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {REQUEST_TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => updateScope({ requestType: t.id })}
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          scope.requestType === t.id ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-sm font-semibold text-slate-800">{t.label}</span>
                        <span className="block text-xs text-slate-500">{t.hint}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className={scope.requestType === 'billing' ? 'opacity-50' : ''}>
                  <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Records to request</h3>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {recordOptions.map(([key, label]) => (
                      <label key={key} className="flex items-start gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                          disabled={scope.requestType === 'billing'}
                          checked={scope.recordTypes.includes(key)}
                          onChange={(e) =>
                            updateScope({
                              recordTypes: e.target.checked ? [...scope.recordTypes, key] : scope.recordTypes.filter((k) => k !== key),
                            })
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Preselected for {preview.provider.specialty || 'this kind of provider'}
                    {preview.caseType ? ` on a ${preview.caseType.label.toLowerCase()} case` : ''}. Imaging providers are asked for the DICOM studies, not just the reports.
                  </p>
                </section>

                <section>
                  <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dates of service</h3>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="text-xs font-semibold text-slate-600">
                      From
                      <input
                        type="date"
                        value={scope.from || ''}
                        onChange={(e) => updateScope({ from: e.target.value || null })}
                        className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal"
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                      Through
                      <input
                        type="date"
                        value={scope.to || ''}
                        onChange={(e) => updateScope({ to: e.target.value || null })}
                        className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal"
                      />
                    </label>
                    <span className="pb-2 text-xs text-slate-400">{scope.to ? '' : 'Leave "Through" empty for "to the present".'}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Starts at this provider's first known visit, or the date of injury.</p>
                </section>

                {templates.length ? (
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Start from</span>
                    <select
                      value={templateId ?? ''}
                      onChange={(e) => setTemplateId(e.target.value || null)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">ClearCaseIQ standard request</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.isDefault ? ' (firm default)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              <div className="space-y-3">
                <section className="rounded-xl border border-slate-200 p-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Patient</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{preview.patient.name || '—'}</p>
                  <p className="text-xs text-slate-500">Date of injury: {preview.patient.dateOfInjury || '—'}</p>
                  {preview.caseType ? <p className="text-xs text-slate-500">Case type: {preview.caseType.label}</p> : null}
                  {preview.patient.dob ? (
                    <p className="text-xs text-slate-500">
                      Date of birth: {preview.patient.dob}
                      {preview.patient.dobSource === 'authorization' ? ' (from the signed authorization)' : ''}
                    </p>
                  ) : (
                    <p className="mt-1 flex items-start gap-1 text-xs text-amber-700">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Patient identifier needs review: no date of birth on file. The provider will match on
                      name and date of injury.
                    </p>
                  )}
                </section>
                <section className="rounded-xl border border-slate-200 p-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Provider</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{preview.provider.name}</p>
                  <p className="text-xs text-slate-500">
                    {[preview.provider.email, preview.provider.fax ? `Fax ${preview.provider.fax}` : null].filter(Boolean).join(' · ') || 'No email or fax on file'}
                  </p>
                  <p className="text-xs text-slate-500">{preview.provider.address || 'No mailing address on file'}</p>
                </section>
                <section>
                  <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Verification</h3>
                  <div className="space-y-2">
                    {representation ? (
                      <RepresentationPanel
                        leadId={leadId}
                        status={representation}
                        canAttest={canAttest}
                        onChange={(next) => {
                          setRepresentation(next)
                          setBuiltFor('')
                        }}
                      />
                    ) : null}
                    {hipaa?.status === 'ok' ? (
                      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <div>
                          <p className="font-medium">Signed HIPAA authorization covers this provider</p>
                          <p className="text-xs text-emerald-800">
                            Signed {shortDay(hipaa.signedAt)}
                            {hipaa.expiresAt ? `, valid until ${shortDay(hipaa.expiresAt)}` : ''}
                            {hipaa.custodian ? ` · custodian: ${hipaa.custodian}` : ' · custodian: as directed by counsel'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">HIPAA authorization: verification failed</p>
                          <p className="text-xs">{HIPAA_TEXT[hipaa?.status || 'missing']} The request cannot be sent until a covering authorization is signed.</p>
                        </div>
                        {onOpenSection ? (
                          <button
                            type="button"
                            onClick={() => onOpenSection('documents?view=signatures&doc=hipaa_authorization')}
                            className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200"
                          >
                            Send authorization
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="grid min-h-full gap-4 px-5 py-4 lg:grid-cols-2">
              <div className="flex min-h-[50vh] flex-col">
                <div className="mb-1.5 flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Edit</h3>
                  {body !== loadedBody ? (
                    <button type="button" onClick={() => setBody(loadedBody)} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
                      Reset to generated letter
                    </button>
                  ) : null}
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[50vh] flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  spellCheck
                />
              </div>
              <div className="flex flex-col">
                <div className="mb-1.5 flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Preview</h3>
                  <button
                    type="button"
                    onClick={pdfPreview}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-50"
                  >
                    <FileText className="h-3.5 w-3.5" /> {busy === 'pdf' ? 'Rendering…' : 'Open PDF preview'}
                  </button>
                </div>
                <LetterPaper body={body} />
              </div>
            </div>
          ) : step === 2 ? (
            <div className="grid gap-5 px-5 py-4 lg:grid-cols-[1fr_1.1fr]">
              <div className="space-y-3">
                <section>
                  <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Delivery</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setDelivery('email')}
                      className={`rounded-xl border px-3 py-2 text-left ${delivery === 'email' ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200' : 'border-slate-200'}`}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <Mail className="h-4 w-4" /> Email
                      </span>
                      <span className="text-xs text-slate-500">PDF plus the signed authorization, with the secure upload link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDelivery('download')}
                      className={`rounded-xl border px-3 py-2 text-left ${delivery === 'download' ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200' : 'border-slate-200'}`}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <Download className="h-4 w-4" /> Fax or mail
                      </span>
                      <span className="text-xs text-slate-500">Download the PDF; it is logged as sent</span>
                    </button>
                  </div>
                  {delivery === 'email' ? (
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="records@provider.com"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                  ) : null}
                </section>
                <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-700">Subject:</span> {preview?.subject}
                  </p>
                  <p className="mt-1">
                    The case keeps who approved this request, the checklist below and when it went out. Records uploaded through the secure link
                    file into the case and feed the medical chronology.
                  </p>
                </section>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pre-send checklist</h3>
                  <span className="text-xs text-slate-400">{busy === 'checks' ? 'Checking…' : counts.block ? `${counts.block} blocking` : counts.warn ? `${counts.warn} to review` : 'All clear'}</span>
                </div>
                <LetterChecklist checks={checks} compact />
                {counts.warn > 0 && counts.block === 0 && !isTest ? (
                  <label className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-amber-300" />
                    I reviewed the warnings above and want to send anyway.
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}
          {error ? <p className="mx-5 mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
          <div>
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {step < 2 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={loading || !scope || (step === 1 && !body.trim())}
                className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
              >
                {step === 0 ? 'Review letter' : 'Continue to send'} <ArrowRight className="h-4 w-4" />
              </button>
            ) : isTest ? (
              <button
                type="button"
                onClick={pdfPreview}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                <FlaskConical className="h-4 w-4" /> {busy === 'pdf' ? 'Rendering…' : 'Download test copy'}
              </button>
            ) : (
              <button
                type="button"
                onClick={send}
                disabled={busy !== null || !canSend}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
              >
                {delivery === 'email' ? <Mail className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                {busy === 'send' ? 'Sending…' : delivery === 'email' ? 'Approve and email' : 'Approve and download'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Letter of protection to one provider. Separate from the records request: it
 * promises payment from the recovery and adds the provider to the case's
 * liens, so only an attorney can issue it, after confirming the terms and the
 * client's authorization and typing their name to sign.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, Download, FileText, FlaskConical, Mail, Scale, X } from 'lucide-react'
import {
  downloadDraftLetterPdf,
  getLetterTemplates,
  getLopPreview,
  issueProviderLetterOfProtection,
  type CaseLetter,
  type LetterCheck,
  type LetterTemplateOption,
  type LopPreview,
  type RepresentationStatus,
} from '../../lib/api'
import { saveLetterPdf } from './LetterComposerModal'
import { LetterChecklist, LetterPaper, RepresentationPanel, checkCounts, openPdfBlob } from './LetterSafeguards'

type SendResult = { letter: CaseLetter; emailed: boolean; tasksCompleted: number }

export default function LetterOfProtectionModal({
  leadId,
  providerName,
  onClose,
  onSent,
}: {
  leadId: string
  providerName: string
  onClose: () => void
  onSent: (result: SendResult, message: string) => void
}) {
  const [preview, setPreview] = useState<LopPreview | null>(null)
  const [representation, setRepresentation] = useState<RepresentationStatus | null>(null)
  const [templates, setTemplates] = useState<LetterTemplateOption[]>([])
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [from, setFrom] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)
  const [reduction, setReduction] = useState('')
  const [body, setBody] = useState('')
  const [checks, setChecks] = useState<LetterCheck[]>([])
  const [delivery, setDelivery] = useState<'email' | 'download'>('email')
  const [email, setEmail] = useState('')
  const [termsReviewed, setTermsReviewed] = useState(false)
  const [clientAuthorized, setClientAuthorized] = useState(false)
  const [signature, setSignature] = useState('')
  const [ack, setAck] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<null | 'send' | 'pdf'>(null)
  const [error, setError] = useState<string | null>(null)

  const build = async (opts: { from?: string | null; to?: string | null; templateId?: string | null } = {}) => {
    setLoading(true)
    setError(null)
    try {
      const p = await getLopPreview(leadId, {
        name: providerName,
        ...(opts.from !== undefined ? { from: opts.from } : {}),
        ...(opts.to !== undefined ? { to: opts.to } : {}),
        reductionTerms: reduction.trim() || undefined,
        templateId: opts.templateId ?? templateId,
      })
      setPreview(p)
      setRepresentation(p.representation)
      setBody(p.body)
      setChecks(p.checks)
      setFrom(p.from)
      setTo(p.to)
      if (!email && p.recipientEmail) setEmail(p.recipientEmail)
      if (!p.recipientEmail) setDelivery('download')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not build the letter of protection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getLetterTemplates(leadId, 'provider_lop')
      .then((list) => {
        setTemplates(list)
        const def = list.find((t) => t.isDefault)?.id ?? null
        setTemplateId(def)
        void build({ templateId: def })
      })
      .catch(() => void build())
  }, [leadId, providerName]) // eslint-disable-line react-hooks/exhaustive-deps

  const counts = checkCounts(checks)
  const isTest = Boolean(preview?.isTest)
  const canSign = Boolean(preview?.canSign)
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, ' ').trim()
  const signatureOk = Boolean(preview?.signerName) && norm(signature) === norm(preview?.signerName || '')
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const ready =
    canSign &&
    !isTest &&
    counts.block === 0 &&
    (counts.warn === 0 || ack) &&
    termsReviewed &&
    clientAuthorized &&
    signatureOk &&
    (delivery === 'download' || emailValid)

  const pdfPreview = async () => {
    setBusy('pdf')
    try {
      await openPdfBlob(await downloadDraftLetterPdf(leadId, 'provider_lop', body))
    } catch {
      setError('Could not render the PDF preview.')
    } finally {
      setBusy(null)
    }
  }

  const send = async () => {
    setBusy('send')
    setError(null)
    try {
      const result = await issueProviderLetterOfProtection(leadId, {
        name: providerName,
        from,
        to,
        body,
        delivery,
        acknowledgeWarnings: ack,
        confirmTermsReviewed: termsReviewed,
        confirmClientAuthorized: clientAuthorized,
        signatureName: signature.trim(),
        ...(delivery === 'email' ? { recipientEmail: email.trim() } : {}),
      })
      if (delivery === 'download') {
        await saveLetterPdf(leadId, result.letter.id, `Letter-of-Protection-${providerName.replace(/[^a-z0-9]+/gi, '-')}.pdf`)
      }
      onSent(
        result,
        `Letter of protection ${delivery === 'email' ? `emailed to ${email.trim()}` : 'downloaded'} and signed by ${preview?.signerName}. ${providerName} was added to the case's liens.`,
      )
    } catch (err: any) {
      const data = err?.response?.data
      if (Array.isArray(data?.checks)) setChecks(data.checks)
      setError(data?.error || 'Could not issue the letter of protection.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3" role="dialog" aria-modal="true">
      <div className="flex h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Scale className="h-4 w-4 text-violet-600" /> Letter of protection
              {isTest ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                  <FlaskConical className="h-3 w-3" /> Test case
                </span>
              ) : null}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">To {providerName}. Attorney review and signature required.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-violet-100 bg-violet-50/70 px-5 py-2.5 text-sm text-violet-900">
            A letter of protection commits the firm to pay this provider's charges from any recovery, and adds the provider to the case's liens
            when it is issued. Its terms are a financial and legal obligation, so review them with the client before signing.
            {preview?.alreadyIssued ? <span className="font-semibold"> {preview.alreadyIssued} already issued to this provider.</span> : null}
          </div>
          {!loading && !canSign ? (
            <div className="mx-5 mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Only an attorney can sign and issue a letter of protection. You can review the draft.
            </div>
          ) : null}

          {loading && !preview ? (
            <div className="px-5 py-16 text-center text-sm text-slate-400">Preparing the letter…</div>
          ) : (
            <div className="grid gap-5 px-5 py-4 lg:grid-cols-2">
              <div className="space-y-3">
                {representation ? (
                  <RepresentationPanel leadId={leadId} status={representation} canAttest={canSign} onChange={(next) => {
                    setRepresentation(next)
                    void build({ from, to })
                  }} />
                ) : null}
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-xs font-semibold text-slate-600">
                    Treatment from
                    <input type="date" value={from || ''} onChange={(e) => setFrom(e.target.value || null)} className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Through (optional)
                    <input type="date" value={to || ''} onChange={(e) => setTo(e.target.value || null)} className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal" />
                  </label>
                  {templates.length ? (
                    <label className="text-xs font-semibold text-slate-600">
                      Start from
                      <select
                        value={templateId ?? ''}
                        onChange={(e) => setTemplateId(e.target.value || null)}
                        className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal"
                      >
                        <option value="">ClearCaseIQ standard</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
                <label className="block text-xs font-semibold text-slate-600">
                  Reduction or other agreed terms (optional)
                  <input
                    value={reduction}
                    onChange={(e) => setReduction(e.target.value)}
                    placeholder="e.g. Charges are subject to a pro-rata reduction if the recovery is insufficient."
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (body !== preview?.body && !window.confirm('Rebuilding replaces your edits. Continue?')) return
                    void build({ from, to })
                  }}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Rebuild letter with these terms
                </button>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="h-72 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <LetterChecklist checks={checks} compact />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Preview</h3>
                  <button type="button" onClick={pdfPreview} disabled={busy !== null || !body.trim()} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 disabled:opacity-50">
                    <FileText className="h-3.5 w-3.5" /> {busy === 'pdf' ? 'Rendering…' : isTest ? 'Download test copy' : 'Open PDF preview'}
                  </button>
                </div>
                <LetterPaper body={`${body.trimEnd()}\n\n/s/ ${signatureOk ? preview?.signerName : '[attorney signature]'}`} />

                <section className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Attorney approval</h3>
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={termsReviewed} onChange={(e) => setTermsReviewed(e.target.checked)} disabled={!canSign} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
                    I reviewed these terms, including the dates of service and that payment comes only from the recovery.
                  </label>
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={clientAuthorized} onChange={(e) => setClientAuthorized(e.target.checked)} disabled={!canSign} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
                    The client authorized this letter of protection, and paying this provider from their recovery.
                  </label>
                  {counts.warn > 0 && counts.block === 0 ? (
                    <label className="flex items-start gap-2 text-sm text-amber-900">
                      <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} disabled={!canSign} className="mt-0.5 h-4 w-4 rounded border-amber-300" />
                      I reviewed the checklist warnings.
                    </label>
                  ) : null}
                  <label className="block text-xs font-semibold text-slate-600">
                    Type your full name to sign{preview?.signerName ? ` (${preview.signerName})` : ''}
                    <input
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      disabled={!canSign}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-1.5 font-serif text-base italic text-slate-900"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
                    <label className="flex items-center gap-1.5">
                      <input type="radio" checked={delivery === 'email'} onChange={() => setDelivery('email')} /> Email
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="radio" checked={delivery === 'download'} onChange={() => setDelivery('download')} /> Download to fax or mail
                    </label>
                  </div>
                  {delivery === 'email' ? (
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="billing@provider.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  ) : null}
                </section>
              </div>
            </div>
          )}
          {error ? <p className="mx-5 mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={busy !== null || !ready}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
          >
            {delivery === 'email' ? <Mail className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {busy === 'send' ? 'Issuing…' : 'Sign and issue'}
          </button>
        </div>
      </div>
    </div>
  )
}

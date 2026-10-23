/**
 * Preview, edit and send a letter of representation — to an insurance carrier
 * (Insurance tab) or a treating provider (Medical tab). The letter is prefilled
 * from case data; anything still unknown shows as a "__________" blank.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Download, FlaskConical, Mail, X } from 'lucide-react'
import {
  downloadDraftLetterPdf,
  downloadLeadLetterPdf,
  getLetterTemplates,
  type CaseLetter,
  type LetterCheck,
  type LetterDelivery,
  type LetterPreview,
  type LetterTemplateOption,
  type LetterUse,
} from '../../lib/api'
import { LetterChecklist, openPdfBlob } from './LetterSafeguards'

type SendResult = { letter: CaseLetter; emailed: boolean; tasksCompleted: number }

const UPLOAD_LINK_TOKEN = '{{records_upload_link}}'

export function countBlanks(body: string): number {
  return (body.match(/_{4,}/g) || []).length
}

export async function saveLetterPdf(leadId: string, letterId: string, fileName: string) {
  const blob = await downloadLeadLetterPdf(leadId, letterId)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function LetterComposerModal({
  leadId,
  title,
  recipientLabel,
  defaultEmail,
  previewKey,
  loadPreview,
  onSend,
  onSent,
  onClose,
  controls,
  footnote,
  docLabel = 'Letter of representation',
  templateUse,
}: {
  leadId: string
  title: string
  docLabel?: string
  recipientLabel: string
  defaultEmail: string | null
  /** Changing this reloads the prefilled letter (e.g. toggling lien language). */
  previewKey?: string
  /** templateId is a firm template to start from; null means the built-in letter. */
  loadPreview: (templateId: string | null) => Promise<LetterPreview>
  onSend: (payload: LetterDelivery) => Promise<SendResult>
  onSent: (result: SendResult, message: string) => void
  onClose: () => void
  controls?: ReactNode
  footnote?: ReactNode
  /** Offer the firm's templates tagged for this letter as starting points. */
  templateUse?: LetterUse
}) {
  const [body, setBody] = useState('')
  const [loadedBody, setLoadedBody] = useState('')
  const [email, setEmail] = useState(defaultEmail || '')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<null | 'email' | 'download'>(null)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<LetterTemplateOption[]>([])
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [templatesReady, setTemplatesReady] = useState(!templateUse)
  const [checks, setChecks] = useState<LetterCheck[]>([])
  const [isTest, setIsTest] = useState(false)
  const [ack, setAck] = useState(false)

  useEffect(() => {
    if (!templateUse) return
    let cancelled = false
    getLetterTemplates(leadId, templateUse)
      .then((list) => {
        if (cancelled) return
        setTemplates(list)
        setTemplateId(list.find((t) => t.isDefault)?.id ?? null)
      })
      .catch(() => {})
      .finally(() => !cancelled && setTemplatesReady(true))
    return () => {
      cancelled = true
    }
  }, [leadId, templateUse])

  useEffect(() => {
    if (!templatesReady) return
    let cancelled = false
    setLoading(true)
    setError(null)
    loadPreview(templateId)
      .then((p) => {
        if (cancelled) return
        setBody(p.body)
        setLoadedBody(p.body)
        setChecks(p.checks || [])
        setIsTest(Boolean(p.isTest))
        if (!email && p.recipientEmail) setEmail(p.recipientEmail)
      })
      .catch((err) => !cancelled && setError(err?.response?.data?.error || 'Could not build the letter.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [previewKey, templateId, templatesReady]) // eslint-disable-line react-hooks/exhaustive-deps

  const pickTemplate = (next: string | null) => {
    if (next === templateId) return
    if (body !== loadedBody && !window.confirm('Switching templates replaces your edits to this letter. Continue?')) return
    setTemplateId(next)
  }

  const blanks = countBlanks(body)
  const missingUploadLink = templateUse === 'provider_lor' && !loading && body.trim() !== '' && !body.includes(UPLOAD_LINK_TOKEN)
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  // Blanks and the delivery address are re-checked from the edited text on send; these depend on the case.
  const caseBlocks = checks.filter((c) => c.status === 'block' && ['representation', 'signature', 'hipaa'].includes(c.key))
  const warnings = checks.filter((c) => c.status === 'warn')
  const blocked = isTest || caseBlocks.length > 0 || blanks > 0 || (warnings.length > 0 && !ack)

  const testCopy = async () => {
    setBusy('download')
    try {
      await openPdfBlob(await downloadDraftLetterPdf(leadId, templateUse === 'provider_lop' ? 'provider_lop' : templateUse === 'provider_lor' ? 'provider_lor' : 'carrier_lor', body))
    } catch {
      setError('Could not render the test copy.')
    } finally {
      setBusy(null)
    }
  }

  const send = async (delivery: 'email' | 'download') => {
    setBusy(delivery)
    setError(null)
    try {
      const result = await onSend({
        body,
        delivery,
        ...(warnings.length ? { acknowledgeWarnings: ack } : {}),
        ...(delivery === 'email' ? { recipientEmail: email.trim() } : {}),
      })
      if (delivery === 'download') {
        await saveLetterPdf(leadId, result.letter.id, `${docLabel.replace(/[^a-z0-9]+/gi, '-')}-${recipientLabel.replace(/[^a-z0-9]+/gi, '-')}.pdf`)
      }
      const closed = result.tasksCompleted ? ' The task is marked done.' : ''
      onSent(
        result,
        delivery === 'email'
          ? `${docLabel} emailed to ${email.trim()}.${closed}`
          : `${docLabel} downloaded for ${recipientLabel} and logged as sent.${closed}`,
      )
    } catch (err: any) {
      const data = err?.response?.data
      if (Array.isArray(data?.checks)) setChecks(data.checks)
      setError(data?.error || err?.message || 'Could not send the letter.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3" role="dialog" aria-modal="true">
      <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-sm text-slate-500">To {recipientLabel}. Review and edit before sending.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {templateUse ? (
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Start from</span>
              <select
                value={templateId ?? ''}
                onChange={(e) => pickTemplate(e.target.value || null)}
                disabled={!templatesReady || busy !== null}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">ClearCaseIQ standard letter</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.isDefault ? ' (firm default)' : ''}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-400">
                {templates.length
                  ? 'Firm templates are filled in from this case. You can still edit the letter below.'
                  : 'Your firm can add its own version in Firm Dashboard → Templates by setting "Use for" on a template.'}
              </span>
            </label>
          ) : null}
          {controls}
          {loading ? (
            <div className="rounded-xl border border-slate-200 px-4 py-10 text-center text-sm text-slate-400">Preparing the letter…</div>
          ) : (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="h-[46vh] w-full resize-y rounded-xl border border-slate-300 px-4 py-3 font-mono text-[13px] leading-relaxed text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              spellCheck
            />
          )}
          {!loading && blanks > 0 ? (
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {blanks} blank{blanks === 1 ? '' : 's'} (__________) still to fill in. Replace {blanks === 1 ? 'it' : 'them'} or delete the line; the letter
              cannot be sent with blanks.
            </p>
          ) : null}
          {missingUploadLink ? (
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This letter has no <code className="font-mono text-[12px]">{UPLOAD_LINK_TOKEN}</code>, so the provider will not get the
                secure link to the signed HIPAA authorization and the records upload page. Add it where the link should appear.
              </span>
            </p>
          ) : null}
          {footnote}
          {isTest ? (
            <p className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
              This case contains synthetic or test documents, so nothing can be sent to a third party. Download a watermarked test copy instead.
            </p>
          ) : null}
          {checks.length ? (
            <div className="space-y-2">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pre-send checklist</span>
              <LetterChecklist checks={checks} compact />
              {warnings.length && !isTest ? (
                <label className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-amber-300" />
                  I reviewed the warnings above and want to send anyway.
                </label>
              ) : null}
            </div>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email to</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          {isTest ? (
            <button
              type="button"
              onClick={testCopy}
              disabled={loading || busy !== null || !body.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
            >
              <FlaskConical className="h-4 w-4" /> {busy ? 'Rendering…' : 'Download test copy'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => send('download')}
                disabled={loading || busy !== null || !body.trim() || blocked}
                title="Download the PDF to fax or mail yourself. It is logged as sent."
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> {busy === 'download' ? 'Preparing…' : 'Download PDF to fax'}
              </button>
              <button
                type="button"
                onClick={() => send('email')}
                disabled={loading || busy !== null || !body.trim() || !emailValid || blocked}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" /> {busy === 'email' ? 'Sending…' : 'Email letter'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

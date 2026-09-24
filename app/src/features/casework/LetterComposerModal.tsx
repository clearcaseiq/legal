/**
 * Preview, edit and send a letter of representation — to an insurance carrier
 * (Insurance tab) or a treating provider (Medical tab). The letter is prefilled
 * from case data; anything still unknown shows as a "__________" blank.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Download, Mail, X } from 'lucide-react'
import { downloadLeadLetterPdf, type CaseLetter, type LetterDelivery, type LetterPreview } from '../../lib/api'

type SendResult = { letter: CaseLetter; emailed: boolean; tasksCompleted: number }

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
}: {
  leadId: string
  title: string
  recipientLabel: string
  defaultEmail: string | null
  /** Changing this reloads the prefilled letter (e.g. toggling lien language). */
  previewKey?: string
  loadPreview: () => Promise<LetterPreview>
  onSend: (payload: LetterDelivery) => Promise<SendResult>
  onSent: (result: SendResult, message: string) => void
  onClose: () => void
  controls?: ReactNode
  footnote?: ReactNode
}) {
  const [body, setBody] = useState('')
  const [email, setEmail] = useState(defaultEmail || '')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<null | 'email' | 'download'>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadPreview()
      .then((p) => {
        if (cancelled) return
        setBody(p.body)
        if (!email && p.recipientEmail) setEmail(p.recipientEmail)
      })
      .catch((err) => !cancelled && setError(err?.response?.data?.error || 'Could not build the letter.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [previewKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const blanks = countBlanks(body)
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const send = async (delivery: 'email' | 'download') => {
    setBusy(delivery)
    setError(null)
    try {
      const result = await onSend({ body, delivery, ...(delivery === 'email' ? { recipientEmail: email.trim() } : {}) })
      if (delivery === 'download') {
        await saveLetterPdf(leadId, result.letter.id, `Letter-of-Representation-${recipientLabel.replace(/[^a-z0-9]+/gi, '-')}.pdf`)
      }
      const closed = result.tasksCompleted ? ' The task is marked done.' : ''
      onSent(
        result,
        delivery === 'email'
          ? `Letter of representation emailed to ${email.trim()}.${closed}`
          : `Letter of representation downloaded for ${recipientLabel} and logged as sent.${closed}`,
      )
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Could not send the letter.')
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
              {blanks} blank{blanks === 1 ? '' : 's'} (__________) still to fill in. Replace {blanks === 1 ? 'it' : 'them'} or delete the line before sending.
            </p>
          ) : null}
          {footnote}
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
          <button
            type="button"
            onClick={() => send('download')}
            disabled={loading || busy !== null || !body.trim()}
            title="Download the PDF to fax or mail yourself. It is logged as sent."
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> {busy === 'download' ? 'Preparing…' : 'Download PDF to fax'}
          </button>
          <button
            type="button"
            onClick={() => send('email')}
            disabled={loading || busy !== null || !body.trim() || !emailValid}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          >
            <Mail className="h-4 w-4" /> {busy === 'email' ? 'Sending…' : 'Email letter'}
          </button>
        </div>
      </div>
    </div>
  )
}

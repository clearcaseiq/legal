import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, FileText, Handshake, Loader2, XCircle } from 'lucide-react'
import {
  downloadEvidenceByUrl,
  getPlaintiffNegotiations,
  submitPlaintiffNegotiationDecision,
  type NegotiationEntry,
} from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'
import { formatCurrency } from '../lib/formatters'
import { dateLocale } from '../i18n'
import ConfirmDialog from './ConfirmDialog'

const KNOWN_TYPES = new Set(['offer', 'counter', 'demand', 'call', 'note'])

/**
 * Negotiation entries the firm sent for the plaintiff's decision. Renders
 * nothing until the firm shares at least one entry.
 */
export default function PlaintiffNegotiationDecisions({ assessmentId }: { assessmentId?: string }) {
  const { t, language } = useLanguage()
  const [entries, setEntries] = useState<NegotiationEntry[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<{ entry: NegotiationEntry; decision: 'accepted' | 'declined' } | null>(null)

  useEffect(() => {
    if (!assessmentId) return
    let cancelled = false
    getPlaintiffNegotiations(assessmentId)
      .then((rows) => {
        if (!cancelled) setEntries(rows)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [assessmentId])

  if (!assessmentId || entries.length === 0) return null

  const k = (key: string, params?: Record<string, string | number>) => t(`plaintiffDashboard.negotiationDecision.${key}`, params)
  const typeLabel = (type: string) => (KNOWN_TYPES.has(type) ? k(`type_${type}`) : type)
  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString(dateLocale(language), { month: 'short', day: 'numeric', year: 'numeric' }) : ''

  const decide = async (entry: NegotiationEntry, decision: 'accepted' | 'declined') => {
    setBusy(entry.id)
    setError(null)
    try {
      const updated = await submitPlaintiffNegotiationDecision(assessmentId, entry.id, decision, notes[entry.id])
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    } catch (err: any) {
      setError(err?.response?.data?.error || k('failed'))
    } finally {
      setBusy(null)
      setConfirming(null)
    }
  }

  const renderConfirmMessage = (entry: NegotiationEntry, decision: 'accepted' | 'declined') => {
    const note = (notes[entry.id] || '').trim()
    const from = entry.counterpartyType === 'claimant' ? k('fromFirm') : entry.insurerName || k('fromCarrier')
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold text-slate-800">{typeLabel(entry.eventType)}</span>
            {typeof entry.amount === 'number' ? (
              <span className="text-base font-bold text-slate-900">{formatCurrency(entry.amount)}</span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">{from} · {fmtDate(entry.eventDate)}</p>
        </div>
        <p>{k(decision === 'accepted' ? 'confirmAcceptBody' : 'confirmDeclineBody')}</p>
        {note ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k('confirmYourNote')}</p>
            <p className="mt-0.5 whitespace-pre-line text-slate-700">{note}</p>
          </div>
        ) : null}
        <p className="text-xs text-slate-500">{k('confirmFinal')}</p>
      </div>
    )
  }

  const openProof = (f: { fileUrl: string | null; originalName: string }) => {
    if (!f.fileUrl) return
    downloadEvidenceByUrl(f.fileUrl, f.originalName).catch(() => setError(k('openFailed')))
  }

  const pending = entries.filter((e) => e.clientDecision === 'pending')
  const decided = entries.filter((e) => e.clientDecision && e.clientDecision !== 'pending')

  const renderEntry = (e: NegotiationEntry) => (
    <li key={e.id} className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">{typeLabel(e.eventType)}</p>
          <p className="text-xs text-gray-500">
            {e.counterpartyType === 'claimant' ? k('fromFirm') : e.insurerName || k('fromCarrier')} · {fmtDate(e.eventDate)}
          </p>
        </div>
        {typeof e.amount === 'number' ? (
          <p className="text-lg font-bold text-gray-900">{formatCurrency(e.amount)}</p>
        ) : null}
      </div>
      {e.terms ? (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{k('terms')}</p>
          <p className="mt-0.5 whitespace-pre-line text-sm text-gray-700">{e.terms}</p>
        </div>
      ) : null}
      {e.proofFiles.length ? (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{k('proof')}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {e.proofFiles.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => openProof(f)}
                className="inline-flex max-w-[16rem] items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="truncate">{f.originalName}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {e.clientDecision === 'pending' ? (
        <div className="mt-3 space-y-2">
          <textarea
            rows={2}
            value={notes[e.id] || ''}
            onChange={(ev) => setNotes((prev) => ({ ...prev, [e.id]: ev.target.value }))}
            placeholder={k('notePlaceholder')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy === e.id}
              onClick={() => setConfirming({ entry: e, decision: 'accepted' })}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {k('accept')}
            </button>
            <button
              type="button"
              disabled={busy === e.id}
              onClick={() => setConfirming({ entry: e, decision: 'declined' })}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" />
              {k('decline')}
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${
            e.clientDecision === 'accepted' ? 'text-emerald-700' : 'text-red-700'
          }`}
        >
          {e.clientDecision === 'accepted' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {k(e.clientDecision === 'accepted' ? 'accepted' : 'declined')} · {fmtDate(e.clientDecidedAt)}
        </p>
      )}
    </li>
  )

  return (
    <div id="negotiation" className="rounded-xl border border-amber-200 bg-amber-50/40 p-5">
      <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
        <Handshake className="h-6 w-6 text-brand-600" aria-hidden />
        {pending.length ? k('title') : k('historyTitle')}
      </h3>
      {pending.length ? (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
          <Clock className="h-4 w-4 text-amber-600" aria-hidden /> {k('subtitle')}
        </p>
      ) : null}
      {error ? <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <ul className="mt-3 space-y-3">
        {pending.map(renderEntry)}
        {decided.map(renderEntry)}
      </ul>
      <ConfirmDialog
        open={!!confirming}
        tone={confirming?.decision === 'declined' ? 'danger' : 'default'}
        title={
          confirming
            ? k(confirming.decision === 'accepted' ? 'confirmAcceptTitle' : 'confirmDeclineTitle', {
                what: typeLabel(confirming.entry.eventType).toLowerCase(),
              })
            : ''
        }
        message={confirming ? renderConfirmMessage(confirming.entry, confirming.decision) : null}
        confirmLabel={k(confirming?.decision === 'declined' ? 'confirmDeclineCta' : 'confirmAcceptCta')}
        cancelLabel={k('confirmCancel')}
        busy={!!confirming && busy === confirming.entry.id}
        onConfirm={() => confirming && void decide(confirming.entry, confirming.decision)}
        onCancel={() => setConfirming(null)}
      />
    </div>
  )
}

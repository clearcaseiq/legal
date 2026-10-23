/**
 * Pieces shared by the letter windows: the pre-send checklist, the case's
 * representation status (with the attorney's attestation of an outside
 * engagement), and a paper-style preview of the letter text.
 */
import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react'
import {
  attestRepresentation,
  withdrawRepresentationAttestation,
  type LetterCheck,
  type RepresentationStatus,
} from '../../lib/api'

export function shortDay(iso?: string | null) {
  if (!iso) return ''
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_ICON = {
  ok: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />,
  warn: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />,
  block: <XCircle className="h-4 w-4 shrink-0 text-rose-600" />,
}

export function checkCounts(checks: LetterCheck[]) {
  return {
    block: checks.filter((c) => c.status === 'block').length,
    warn: checks.filter((c) => c.status === 'warn').length,
  }
}

export function LetterChecklist({ checks, compact = false }: { checks: LetterCheck[]; compact?: boolean }) {
  const sorted = [...checks].sort((a, b) => order(a.status) - order(b.status))
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {sorted.map((c) => (
        <li key={c.key} className={`flex items-start gap-2.5 px-3 ${compact ? 'py-1.5' : 'py-2'}`}>
          <span className="mt-0.5">{STATUS_ICON[c.status]}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">{c.label}</p>
            <p className={`text-xs ${c.status === 'block' ? 'text-rose-700' : c.status === 'warn' ? 'text-amber-700' : 'text-slate-500'}`}>{c.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function order(s: LetterCheck['status']) {
  return s === 'block' ? 0 : s === 'warn' ? 1 : 2
}

export function RepresentationPanel({
  leadId,
  status,
  canAttest,
  onChange,
}: {
  leadId: string
  status: RepresentationStatus
  canAttest: boolean
  onChange: (next: RepresentationStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const attest = async () => {
    setBusy(true)
    setError(null)
    try {
      onChange(await attestRepresentation(leadId, { engagementDate: date, note: note.trim() || undefined }))
      setOpen(false)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not record the attestation.')
    } finally {
      setBusy(false)
    }
  }

  const withdraw = async () => {
    if (!status.attestation || !window.confirm('Withdraw this attestation? Letters will stop stating that the firm represents the client.')) return
    setBusy(true)
    try {
      onChange(await withdrawRepresentationAttestation(leadId, status.attestation.id))
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not withdraw the attestation.')
    } finally {
      setBusy(false)
    }
  }

  if (status.verified) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Representation verified</p>
          <p className="text-xs text-emerald-800">
            {status.basis === 'signed_retainer'
              ? `Retainer signed in ClearCaseIQ${status.signedAt ? ` on ${shortDay(status.signedAt)}` : ''}.`
              : `Engagement attested by ${status.attestation?.attorneyName} (engaged ${shortDay(status.attestation?.engagementDate)}, recorded ${shortDay(status.attestation?.createdAt)}).`}
          </p>
        </div>
        {status.basis === 'attested' && canAttest ? (
          <button type="button" onClick={withdraw} disabled={busy} className="text-xs font-semibold text-emerald-800 underline-offset-2 hover:underline">
            Withdraw
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-900">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Representation not verified</p>
          <p className="text-xs text-amber-800">
            No retainer signed in ClearCaseIQ and no attorney attestation. Letters will not state that the firm represents the client, and
            letters of representation and protection cannot be sent.
          </p>
        </div>
        {canAttest && !open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100"
          >
            Attest engagement
          </button>
        ) : null}
      </div>
      {!canAttest ? <p className="mt-1 pl-6 text-xs text-amber-800">An attorney can attest to an engagement signed outside ClearCaseIQ.</p> : null}
      {open ? (
        <div className="mt-2 space-y-2 rounded-lg bg-white p-3 ring-1 ring-amber-200">
          <label className="block text-xs font-semibold text-slate-600">
            Engagement agreement signed on
            <input
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-48 rounded-lg border border-slate-300 px-2 py-1 text-sm font-normal text-slate-800"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Note (optional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Signed paper retainer in office; kept in firm file"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-1 text-sm font-normal text-slate-800"
            />
          </label>
          <label className="flex items-start gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
            I confirm the client signed an engagement agreement with this firm for this matter, and I am authorized to state that the firm
            represents them. This attestation is recorded under my name.
          </label>
          {error ? <p className="text-xs text-rose-700">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600">
              Cancel
            </button>
            <button
              type="button"
              onClick={attest}
              disabled={busy || !confirm || !date}
              className="rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Record attestation'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** The letter as it will read, with blanks and template tokens highlighted. */
export function LetterPaper({ body, letterhead }: { body: string; letterhead?: string }) {
  const highlight = (line: string) =>
    line.split(/(_{4,}|\{\{\s*[a-z0-9_.]+\s*\}\})/i).map((part, i) =>
      /^_{4,}$/.test(part) ? (
        <mark key={i} className="rounded bg-rose-100 px-1 text-rose-700">
          missing
        </mark>
      ) : /^\{\{/.test(part) ? (
        <mark key={i} className={`rounded px-1 ${/records_upload_link/.test(part) ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>
          {/records_upload_link/.test(part) ? 'secure upload link' : part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      ),
    )
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-8 py-7 font-serif text-[13px] leading-relaxed text-slate-800 shadow-sm">
      {letterhead ? <p className="mb-4 border-b border-slate-200 pb-2 font-sans text-sm font-bold text-slate-900">{letterhead}</p> : null}
      {body.split('\n').map((raw, i) => {
        const line = raw.trimEnd()
        if (!line) return <div key={i} className="h-3" />
        if (line.startsWith('- ')) {
          return (
            <p key={i} className="pl-4 -indent-3">
              • {highlight(line.slice(2))}
            </p>
          )
        }
        return <p key={i}>{highlight(line)}</p>
      })}
    </div>
  )
}

export async function openPdfBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank', 'noopener')
  if (!win) {
    const a = document.createElement('a')
    a.href = url
    a.download = 'letter-preview.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

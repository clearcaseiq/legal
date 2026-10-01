/**
 * Negotiation history for a case: the firm logs demands, offers, counters and
 * calls with their terms and supporting proof, and can send an entry to the
 * client to accept or decline. The client's answer shows on each row.
 */
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, FileText, Loader2, Paperclip, Plus, Send, Trash2, X, XCircle, Clock } from 'lucide-react'
import {
  createLeadNegotiation,
  deleteLeadNegotiation,
  downloadEvidenceByUrl,
  getLeadEvidenceFiles,
  getLeadNegotiations,
  updateLeadNegotiation,
  uploadLeadEvidenceOnBehalf,
  type NegotiationEntry,
} from '../../lib/api'

const EVENT_TYPES = [
  { id: 'offer', label: 'Offer', party: 'insurer' },
  { id: 'counter', label: 'Counteroffer', party: 'claimant' },
  { id: 'demand', label: 'Demand', party: 'claimant' },
  { id: 'call', label: 'Call', party: 'insurer' },
  { id: 'note', label: 'Note', party: 'insurer' },
] as const

const TYPE_LABEL: Record<string, string> = Object.fromEntries(EVENT_TYPES.map((t) => [t.id, t.label]))
/** Entry types a client can meaningfully accept or decline. */
const DECIDABLE = new Set(['offer', 'counter', 'demand'])

type FormState = {
  eventType: string
  counterpartyType: string
  amount: string
  eventDate: string
  insurerName: string
  terms: string
  notes: string
  proofFileIds: string[]
  shareWithClient: boolean
}

const today = () => new Date().toISOString().slice(0, 10)

const emptyForm = (): FormState => ({
  eventType: 'offer',
  counterpartyType: 'insurer',
  amount: '',
  eventDate: today(),
  insurerName: '',
  terms: '',
  notes: '',
  proofFileIds: [],
  shareWithClient: true,
})

const money = (n: number | null | undefined) =>
  typeof n === 'number' ? `$${Math.round(n).toLocaleString('en-US')}` : '—'

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30'

function DecisionBadge({ entry }: { entry: NegotiationEntry }) {
  if (!entry.sharedWithClientAt || !entry.clientDecision) return null
  if (entry.clientDecision === 'accepted') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Client accepted {fmtDate(entry.clientDecidedAt)}
      </span>
    )
  }
  if (entry.clientDecision === 'declined') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
        <XCircle className="h-3 w-3" /> Client declined {fmtDate(entry.clientDecidedAt)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
      <Clock className="h-3 w-3" /> Awaiting client
    </span>
  )
}

export default function NegotiationLogPanel({
  leadId,
  clientName,
  canManage = true,
  onChanged,
}: {
  leadId: string
  /** The plaintiff's display name, shown for entries made on the client's side. */
  clientName?: string
  canManage?: boolean
  /** Called after any write so the summary cards and ladder refresh. */
  onChanged?: () => void
}) {
  const [entries, setEntries] = useState<NegotiationEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [caseFiles, setCaseFiles] = useState<Array<{ id: string; originalName?: string; filename?: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const plaintiffName = clientName?.trim()
  const plaintiffLabel = plaintiffName && plaintiffName !== 'Client' ? `Plaintiff · ${plaintiffName}` : 'Plaintiff'

  const flash = (tone: 'ok' | 'err', text: string) => {
    setMsg({ tone, text })
    window.setTimeout(() => setMsg(null), 4000)
  }

  const load = async () => {
    try {
      const rows = await getLeadNegotiations(leadId)
      setEntries(Array.isArray(rows) ? rows : [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  const openForm = () => {
    setForm(emptyForm())
    setFormOpen(true)
    getLeadEvidenceFiles(leadId)
      .then(({ files }) => setCaseFiles(files || []))
      .catch(() => setCaseFiles([]))
  }

  const uploadProof = async (list: FileList | null) => {
    const files = Array.from(list || [])
    if (!files.length) return
    setUploading(true)
    try {
      const uploaded: Array<{ id: string; originalName?: string }> = []
      for (const file of files) {
        const rec = await uploadLeadEvidenceOnBehalf(leadId, file, {
          category: 'correspondence',
          description: `Negotiation proof — ${TYPE_LABEL[form.eventType] || form.eventType}`,
        })
        if (rec?.id) uploaded.push(rec)
      }
      setCaseFiles((prev) => [...uploaded, ...prev])
      setForm((f) => ({ ...f, proofFileIds: [...new Set([...f.proofFileIds, ...uploaded.map((u) => u.id)])] }))
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Could not upload the proof file.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const toggleProof = (id: string) =>
    setForm((f) => ({
      ...f,
      proofFileIds: f.proofFileIds.includes(id) ? f.proofFileIds.filter((x) => x !== id) : [...f.proofFileIds, id],
    }))

  const submit = async () => {
    if (form.amount && Number.isNaN(Number(form.amount))) {
      flash('err', 'Amount must be a number.')
      return
    }
    setBusy('save')
    try {
      await createLeadNegotiation(leadId, {
        eventType: form.eventType,
        counterpartyType: form.counterpartyType,
        amount: form.amount ? Number(form.amount) : null,
        eventDate: form.eventDate || null,
        insurerName: form.insurerName.trim() || null,
        terms: form.terms.trim() || null,
        notes: form.notes.trim() || null,
        proofFileIds: form.proofFileIds,
        shareWithClient: DECIDABLE.has(form.eventType) && form.shareWithClient,
      })
      flash(
        'ok',
        DECIDABLE.has(form.eventType) && form.shareWithClient
          ? 'Entry logged and sent to the client for a decision.'
          : 'Entry logged.',
      )
      setFormOpen(false)
      await load()
      onChanged?.()
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Could not save the entry.')
    } finally {
      setBusy(null)
    }
  }

  const sendToClient = async (entry: NegotiationEntry) => {
    setBusy(entry.id)
    try {
      await updateLeadNegotiation(leadId, entry.id, { shareWithClient: true })
      flash('ok', 'Sent to the client for a decision.')
      await load()
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Could not send to the client.')
    } finally {
      setBusy(null)
    }
  }

  const remove = async (entry: NegotiationEntry) => {
    if (!window.confirm('Delete this negotiation entry? Proof files stay on the case.')) return
    setBusy(entry.id)
    try {
      await deleteLeadNegotiation(leadId, entry.id)
      await load()
      onChanged?.()
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Could not delete the entry.')
    } finally {
      setBusy(null)
    }
  }

  const openProof = (f: { fileUrl: string | null; originalName: string }) => {
    if (!f.fileUrl) return
    downloadEvidenceByUrl(f.fileUrl, f.originalName).catch(() => flash('err', 'Could not open the proof file.'))
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Negotiation history</h3>
          <p className="text-xs text-slate-500">Every demand, offer, and call with its terms and proof.</p>
        </div>
        {canManage && !formOpen ? (
          <button
            type="button"
            onClick={openForm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Log entry
          </button>
        ) : null}
      </div>

      {msg ? (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-xs ${
            msg.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {msg.text}
        </p>
      ) : null}

      {formOpen ? (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">New negotiation entry</h4>
            <button type="button" onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Type</label>
              <select
                className={inputCls}
                value={form.eventType}
                onChange={(e) => {
                  const next = EVENT_TYPES.find((t) => t.id === e.target.value)
                  setForm((f) => ({ ...f, eventType: e.target.value, counterpartyType: next?.party || f.counterpartyType }))
                }}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Party</label>
              <select
                className={inputCls}
                value={form.counterpartyType}
                onChange={(e) => setForm((f) => ({ ...f, counterpartyType: e.target.value }))}
              >
                <option value="insurer">{form.insurerName.trim() ? `Carrier · ${form.insurerName.trim()}` : 'Carrier'}</option>
                <option value="claimant">{plaintiffLabel}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Amount ($)</label>
              <input
                className={inputCls}
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9.]/g, '') }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Date</label>
              <input
                type="date"
                className={inputCls}
                value={form.eventDate}
                onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Carrier</label>
            <input
              className={inputCls}
              value={form.insurerName}
              onChange={(e) => setForm((f) => ({ ...f, insurerName: e.target.value }))}
              placeholder="e.g. State Farm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Terms (visible to the client)</label>
            <textarea
              className={inputCls}
              rows={3}
              value={form.terms}
              onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))}
              placeholder="Structure, lien handling, release scope, response deadline…"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Internal notes (firm only)</label>
            <textarea
              className={inputCls}
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">Proof</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                Upload proof
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => void uploadProof(e.target.files)}
              />
            </div>
            {caseFiles.length ? (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
                {caseFiles.map((f) => (
                  <li key={f.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.proofFileIds.includes(f.id)}
                        onChange={() => toggleProof(f.id)}
                        className="rounded border-slate-300 text-brand-600"
                      />
                      <span className="truncate">{f.originalName || f.filename || 'Document'}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">Upload the carrier letter or email, or attach a file already on the case.</p>
            )}
          </div>

          {DECIDABLE.has(form.eventType) ? (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.shareWithClient}
                onChange={(e) => setForm((f) => ({ ...f, shareWithClient: e.target.checked }))}
                className="mt-0.5 rounded border-slate-300 text-brand-600"
              />
              <span>
                Send to the client to accept or decline
                <span className="block text-xs text-slate-500">
                  They see the amount, terms, and proof on their dashboard. Internal notes stay private.
                </span>
              </span>
            </label>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy === 'save' || uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save entry
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-sm text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : entries.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No negotiation entries yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {entries.map((e) => (
              <li key={e.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {TYPE_LABEL[e.eventType] || e.eventType}
                      </span>
                      <span className="text-xs text-slate-500">
                        {e.counterpartyType === 'claimant' ? plaintiffLabel : e.insurerName || 'Carrier'} · {fmtDate(e.eventDate)}
                      </span>
                      <DecisionBadge entry={e} />
                    </div>
                    {e.terms ? <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{e.terms}</p> : null}
                    {e.notes ? <p className="mt-1 text-xs italic text-slate-500">Internal: {e.notes}</p> : null}
                    {e.clientDecisionNote ? (
                      <p className="mt-1 text-xs text-slate-600">Client note: “{e.clientDecisionNote}”</p>
                    ) : null}
                    {e.proofFiles?.length ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {e.proofFiles.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => openProof(f)}
                            className="inline-flex max-w-[16rem] items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
                          >
                            <FileText className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate">{f.originalName}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{money(e.amount)}</span>
                    {canManage && DECIDABLE.has(e.eventType) && e.clientDecision !== 'pending' ? (
                      <button
                        type="button"
                        onClick={() => void sendToClient(e)}
                        disabled={busy === e.id}
                        title={e.clientDecision ? 'Ask the client again' : 'Send to the client for a decision'}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Send className="h-3 w-3" /> {e.clientDecision ? 'Resend' : 'Send to client'}
                      </button>
                    ) : null}
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => void remove(e)}
                        disabled={busy === e.id}
                        aria-label="Delete entry"
                        className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

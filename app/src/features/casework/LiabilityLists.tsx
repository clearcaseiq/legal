/**
 * The defendants and the liability evidence items on a case, each edited in
 * place with its own Save / Cancel / Remove. Every change returns the refreshed
 * lists and the rolled-up liability record.
 */
import { useState, type ReactNode } from 'react'
import { Camera, FileText, Pencil, Plus, Send, Trash2, User, Users, Video } from 'lucide-react'
import {
  createLiabilityItem,
  deleteLiabilityItem,
  requestWitnessUpload,
  updateLiabilityItem,
  type LiabilityDefendant,
  type LiabilityEvidenceItem,
  type LiabilityParties,
  type LiabilityResponse,
} from '../../lib/api'

export const EVIDENCE_TYPES = [
  { value: 'police_report', label: 'Police report' },
  { value: 'photos', label: 'Scene / damage photos' },
  { value: 'video', label: 'Video (dashcam / surveillance)' },
  { value: 'witness_statement', label: 'Witness statement' },
  { value: 'expert_report', label: 'Expert / reconstruction report' },
  { value: 'other', label: 'Other' },
]

const EVIDENCE_STATUSES = [
  { value: 'needed', label: 'Needed' },
  { value: 'requested', label: 'Requested' },
  { value: 'received', label: 'Received' },
]

export const DEFENDANT_ROLES = [
  { value: 'driver', label: 'Driver' },
  { value: 'vehicle_owner', label: 'Vehicle owner' },
  { value: 'employer', label: 'Employer' },
  { value: 'property_owner', label: 'Property owner' },
  { value: 'other', label: 'Other' },
]

const labelOf = (list: { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v

const inputCls =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}

const errorOf = (err: any, fallback: string) => err?.response?.data?.error || fallback

type Editable = Record<string, string>

/**
 * One list row: a read-only summary, or an edit form with Save / Cancel. New
 * rows start in edit mode and are created on Save.
 */
function ItemRow({
  isNew,
  initial,
  summary,
  form,
  onSave,
  onRemove,
  onCancelNew,
  canSave,
}: {
  isNew?: boolean
  initial: Editable
  summary: ReactNode
  form: (draft: Editable, set: (patch: Editable) => void) => ReactNode
  onSave: (draft: Editable) => Promise<void>
  onRemove?: () => Promise<void>
  onCancelNew?: () => void
  canSave: (draft: Editable) => boolean
}) {
  const [editing, setEditing] = useState(Boolean(isNew))
  const [draft, setDraft] = useState<Editable>(initial)
  const [busy, setBusy] = useState<null | 'save' | 'remove'>(null)
  const [error, setError] = useState<string | null>(null)
  const dirty = Object.keys(draft).some((k) => (draft[k] ?? '') !== (initial[k] ?? ''))

  const save = async () => {
    setBusy('save')
    setError(null)
    try {
      await onSave(draft)
      if (!isNew) setEditing(false)
    } catch (err: any) {
      setError(errorOf(err, 'Could not save.'))
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!onRemove || !window.confirm('Remove this from the case?')) return
    setBusy('remove')
    setError(null)
    try {
      await onRemove()
    } catch (err: any) {
      setError(errorOf(err, 'Could not remove.'))
      setBusy(null)
    }
  }

  const cancel = () => {
    if (isNew) return onCancelNew?.()
    setDraft(initial)
    setEditing(false)
    setError(null)
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
        <div className="min-w-0 flex-1 text-sm">{summary}</div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => {
              setDraft(initial)
              setEditing(true)
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Edit"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
            aria-label="Remove"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4">
      <div className="grid gap-3 sm:grid-cols-2">{form(draft, (patch) => setDraft((d) => ({ ...d, ...patch })))}</div>
      {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      <div className="mt-3 flex items-center justify-end gap-2">
        {!isNew && onRemove ? (
          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            className="mr-auto inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        ) : null}
        <button
          type="button"
          onClick={cancel}
          disabled={busy !== null}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy !== null || !canSave(draft) || (!isNew && !dirty)}
          className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
        >
          {busy === 'save' ? 'Saving…' : isNew ? 'Add' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-brand-400 hover:text-brand-700"
    >
      <Plus className="h-4 w-4" /> {children}
    </button>
  )
}

// ---- Evidence ---------------------------------------------------------------

const EVIDENCE_ICON: Record<string, typeof FileText> = { photos: Camera, video: Video, witness_statement: Users }

const STATUS_TONE: Record<string, string> = {
  needed: 'bg-slate-100 text-slate-600',
  requested: 'bg-amber-50 text-amber-700',
  received: 'bg-emerald-50 text-emerald-700',
}

const evidenceInitial = (e?: LiabilityEvidenceItem): Editable => ({
  type: e?.type ?? 'police_report',
  status: e?.status ?? 'needed',
  referenceNumber: e?.referenceNumber ?? '',
  date: e?.date ?? '',
  description: e?.description ?? '',
  evidenceFileId: e?.evidenceFileId ?? '',
  witnessName: e?.witnessName ?? '',
  summary: e?.summary ?? '',
  demandExcerpt: e?.demandExcerpt ?? '',
})

const MAX_DEMAND_EXCERPT = 600
const isWitness = (d: Editable) => d.type === 'witness_statement'

/** Evidence a witness or bystander can send from their phone. */
const UPLOAD_REQUEST_TYPES = new Set(['witness_statement', 'video', 'photos'])

function WitnessUploadRequest({
  leadId,
  item,
  onChanged,
}: {
  leadId: string
  item: LiabilityEvidenceItem
  onChanged: (parties: LiabilityParties) => void
}) {
  const sent = item.uploadRequest
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(sent?.recipientName ?? item.witnessName ?? '')
  const [email, setEmail] = useState(sent?.recipientEmail ?? '')
  const [phone, setPhone] = useState(sent?.recipientPhone ?? '')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const send = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await requestWitnessUpload(leadId, item.id, {
        recipientName: name.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        message: message.trim() || undefined,
      })
      const via = [res.emailed && 'email', res.texted && 'text'].filter(Boolean).join(' and ')
      setNotice(`Upload link sent by ${via}.`)
      setOpen(false)
      onChanged(res)
    } catch (err: any) {
      setError(errorOf(err, 'Could not send the upload link.'))
    } finally {
      setBusy(false)
    }
  }

  const sentTo = sent ? [sent.recipientEmail, sent.recipientPhone].filter(Boolean).join(' · ') : ''

  return (
    <div className="mt-2">
      {sent ? (
        <p className="text-xs text-slate-500">
          Upload link sent{sent.recipientName ? ` to ${sent.recipientName}` : ''}
          {sentTo ? ` (${sentTo})` : ''} on {new Date(sent.sentAt).toLocaleDateString('en-US')}
          {' · '}
          {sent.uploadCount > 0
            ? `${sent.uploadCount} file${sent.uploadCount > 1 ? 's' : ''} received`
            : 'nothing uploaded yet'}
        </p>
      ) : null}
      {notice ? <p className="mt-1 text-xs font-medium text-emerald-700">{notice}</p> : null}
      {open ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-600">
            They get a secure link to upload photos, video (up to 500MB) or a written statement. No account needed.
            Uploads are added to the case and linked here.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={inputCls} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputCls} />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" className={inputCls} />
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Message (optional). A short thank-you note is sent if left blank."
            className={inputCls}
          />
          {error ? <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
              disabled={busy}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={send}
              disabled={busy || (!email.trim() && !phone.trim())}
              className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send link'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setNotice(null)
            setOpen(true)
          }}
          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
        >
          <Send className="h-3.5 w-3.5" /> {sent ? 'Resend upload link' : 'Request upload link'}
        </button>
      )}
    </div>
  )
}

export function EvidenceList({
  leadId,
  items,
  documents,
  onChanged,
}: {
  leadId: string
  items: LiabilityEvidenceItem[]
  documents: LiabilityResponse['documents']
  onChanged: (parties: LiabilityParties) => void
}) {
  const [adding, setAdding] = useState(false)

  const form = (d: Editable, set: (p: Editable) => void) => (
    <>
      <Field label="Type">
        <select value={d.type} onChange={(e) => set({ type: e.target.value })} className={inputCls}>
          {EVIDENCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Status">
        <select value={d.status} onChange={(e) => set({ status: e.target.value })} className={inputCls}>
          {EVIDENCE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Reference / case number">
        <input value={d.referenceNumber} onChange={(e) => set({ referenceNumber: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Date">
        <input type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} className={inputCls} />
      </Field>
      {isWitness(d) ? (
        <Field label="Witness name">
          <input value={d.witnessName} onChange={(e) => set({ witnessName: e.target.value })} placeholder="e.g. Jane Ruiz" className={inputCls} />
        </Field>
      ) : null}
      <Field label="Description" wide>
        <input
          value={d.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder={isWitness(d) ? 'e.g. Bystander at the crosswalk, saw the light' : 'e.g. Camera at 5th and Main'}
          className={inputCls}
        />
      </Field>
      {isWitness(d) ? (
        <>
          <Field label="Interview summary" wide>
            <textarea
              value={d.summary}
              onChange={(e) => set({ summary: e.target.value })}
              rows={5}
              placeholder="Where they were, what they saw, anything bearing on fault, credibility and ties to either party. Internal only."
              className={inputCls}
            />
          </Field>
          <Field label="Excerpt to quote in the demand (optional)" wide>
            <textarea
              value={d.demandExcerpt}
              onChange={(e) => set({ demandExcerpt: e.target.value })}
              rows={2}
              maxLength={MAX_DEMAND_EXCERPT}
              placeholder="e.g. The truck had a red light and never slowed down."
              className={inputCls}
            />
            <span className="mt-1 block text-[11px] text-slate-500">
              Quoted word-for-word in the demand's liability section once the status is Received. Use the witness's own words.
            </span>
          </Field>
        </>
      ) : null}
      <Field label="Document on the case" wide>
        <select value={d.evidenceFileId} onChange={(e) => set({ evidenceFileId: e.target.value })} className={inputCls}>
          <option value="">None linked</option>
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.originalName}
            </option>
          ))}
        </select>
      </Field>
    </>
  )

  const summary = (e: LiabilityEvidenceItem) => {
    const Icon = EVIDENCE_ICON[e.type] ?? FileText
    const details = [e.referenceNumber && `#${e.referenceNumber}`, e.date].filter(Boolean).join(' · ')
    return (
      <>
        <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
          <Icon className="h-4 w-4 text-slate-400" /> {labelOf(EVIDENCE_TYPES, e.type)}
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[e.status] ?? STATUS_TONE.needed}`}>
            {labelOf(EVIDENCE_STATUSES, e.status)}
          </span>
          {details ? <span className="text-xs font-normal text-slate-500">{details}</span> : null}
        </p>
        {e.witnessName ? <p className="mt-0.5 font-medium text-slate-800">{e.witnessName}</p> : null}
        {e.description ? <p className="mt-0.5 text-slate-600">{e.description}</p> : null}
        {e.summary ? <p className="mt-1 whitespace-pre-line text-slate-600">{e.summary}</p> : null}
        {e.demandExcerpt ? (
          <p className="mt-1 border-l-2 border-brand-300 pl-2 text-xs italic text-slate-600">
            “{e.demandExcerpt}”
            <span className="ml-1 not-italic text-slate-400">
              {e.status === 'received' ? '· quoted in the demand' : '· quoted once received'}
            </span>
          </p>
        ) : null}
        {e.evidenceFileName ? <p className="mt-0.5 text-xs text-slate-500">Document: {e.evidenceFileName}</p> : null}
        {UPLOAD_REQUEST_TYPES.has(e.type) ? <WitnessUploadRequest leadId={leadId} item={e} onChanged={onChanged} /> : null}
      </>
    )
  }

  return (
    <div className="space-y-2">
      {items.length === 0 && !adding ? (
        <p className="text-sm text-slate-500">No liability evidence recorded yet.</p>
      ) : null}
      {items.map((e) => (
        <ItemRow
          key={`${e.id}:${JSON.stringify(evidenceInitial(e))}`}
          initial={evidenceInitial(e)}
          summary={summary(e)}
          form={form}
          canSave={() => true}
          onSave={async (d) => onChanged(await updateLiabilityItem(leadId, 'evidence', e.id, d))}
          onRemove={async () => onChanged(await deleteLiabilityItem(leadId, 'evidence', e.id))}
        />
      ))}
      {adding ? (
        <ItemRow
          isNew
          initial={evidenceInitial()}
          summary={null}
          form={form}
          canSave={() => true}
          onCancelNew={() => setAdding(false)}
          onSave={async (d) => {
            onChanged(await createLiabilityItem(leadId, 'evidence', d))
            setAdding(false)
          }}
        />
      ) : (
        <AddButton onClick={() => setAdding(true)}>Add evidence</AddButton>
      )}
    </div>
  )
}

// ---- Defendants -------------------------------------------------------------

const defendantInitial = (d?: LiabilityDefendant): Editable => ({
  name: d?.name ?? '',
  role: d?.role ?? 'driver',
  faultPct: d?.faultPct == null ? '' : String(d.faultPct),
  insuranceDetailId: d?.insuranceDetailId ?? '',
  insurerName: d?.insurerName ?? '',
  address: d?.address ?? '',
  phone: d?.phone ?? '',
  email: d?.email ?? '',
  counselName: d?.counselName ?? '',
  counselFirm: d?.counselFirm ?? '',
  counselPhone: d?.counselPhone ?? '',
  counselEmail: d?.counselEmail ?? '',
})

export function DefendantList({
  leadId,
  items,
  policies,
  onChanged,
}: {
  leadId: string
  items: LiabilityDefendant[]
  policies: LiabilityResponse['policies']
  onChanged: (parties: LiabilityParties) => void
}) {
  const [adding, setAdding] = useState(false)

  const form = (d: Editable, set: (p: Editable) => void) => (
    <>
      <Field label="Name">
        <input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Person or company" className={inputCls} />
      </Field>
      <Field label="Role">
        <select value={d.role} onChange={(e) => set({ role: e.target.value })} className={inputCls}>
          {DEFENDANT_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Share of fault (%)">
        <input
          type="number"
          min={0}
          max={100}
          value={d.faultPct}
          onChange={(e) => set({ faultPct: e.target.value })}
          placeholder="Not allocated"
          className={inputCls}
        />
      </Field>
      <Field label="Policy on the Insurance tab">
        <select value={d.insuranceDetailId} onChange={(e) => set({ insuranceDetailId: e.target.value })} className={inputCls}>
          <option value="">None linked</option>
          {policies.map((p) => (
            <option key={p.id} value={p.id}>
              {p.carrierName}
              {p.policyNumber ? ` · ${p.policyNumber}` : ''}
            </option>
          ))}
        </select>
      </Field>
      {!d.insuranceDetailId ? (
        <Field label="Insurer (if not on the Insurance tab)" wide>
          <input value={d.insurerName} onChange={(e) => set({ insurerName: e.target.value })} className={inputCls} />
        </Field>
      ) : null}
      <Field label="Address" wide>
        <input value={d.address} onChange={(e) => set({ address: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Phone">
        <input value={d.phone} onChange={(e) => set({ phone: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Email">
        <input type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Defense counsel">
        <input value={d.counselName} onChange={(e) => set({ counselName: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Counsel's firm">
        <input value={d.counselFirm} onChange={(e) => set({ counselFirm: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Counsel phone">
        <input value={d.counselPhone} onChange={(e) => set({ counselPhone: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Counsel email">
        <input type="email" value={d.counselEmail} onChange={(e) => set({ counselEmail: e.target.value })} className={inputCls} />
      </Field>
    </>
  )

  const summary = (d: LiabilityDefendant) => {
    const insurer = d.linkedCarrierName || d.insurerName
    const contact = [d.address, d.phone, d.email].filter(Boolean).join(' · ')
    const counsel = [d.counselName, d.counselFirm, d.counselPhone, d.counselEmail].filter(Boolean).join(' · ')
    return (
      <>
        <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
          <User className="h-4 w-4 text-slate-400" /> {d.name}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {labelOf(DEFENDANT_ROLES, d.role)}
          </span>
          {d.faultPct != null ? <span className="text-xs font-normal text-slate-500">{d.faultPct}% at fault</span> : null}
        </p>
        {insurer ? (
          <p className="mt-0.5 text-slate-600">
            Insurer: {insurer}
            {d.linkedCarrierName ? <span className="text-xs text-slate-400"> (linked policy)</span> : null}
          </p>
        ) : null}
        {contact ? <p className="mt-0.5 text-xs text-slate-500">{contact}</p> : null}
        {counsel ? <p className="mt-0.5 text-xs text-slate-500">Counsel: {counsel}</p> : null}
      </>
    )
  }

  const payload = (d: Editable) => ({ ...d, faultPct: d.faultPct === '' ? null : Number(d.faultPct), insurerName: d.insuranceDetailId ? '' : d.insurerName })

  return (
    <div className="space-y-2">
      {items.length === 0 && !adding ? <p className="text-sm text-slate-500">No defendants recorded yet.</p> : null}
      {items.map((d) => (
        <ItemRow
          key={`${d.id}:${JSON.stringify(defendantInitial(d))}`}
          initial={defendantInitial(d)}
          summary={summary(d)}
          form={form}
          canSave={(x) => Boolean(x.name.trim())}
          onSave={async (x) => onChanged(await updateLiabilityItem(leadId, 'defendants', d.id, payload(x)))}
          onRemove={async () => onChanged(await deleteLiabilityItem(leadId, 'defendants', d.id))}
        />
      ))}
      {adding ? (
        <ItemRow
          isNew
          initial={defendantInitial()}
          summary={null}
          form={form}
          canSave={(x) => Boolean(x.name.trim())}
          onCancelNew={() => setAdding(false)}
          onSave={async (x) => {
            onChanged(await createLiabilityItem(leadId, 'defendants', payload(x)))
            setAdding(false)
          }}
        />
      ) : (
        <AddButton onClick={() => setAdding(true)}>Add defendant</AddButton>
      )}
    </div>
  )
}

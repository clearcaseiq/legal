/**
 * Treating providers on the case, the medical records and billing request each
 * one gets, and (separately) any letter of protection. Providers come from the
 * medical timeline, the intake answers and Contacts; only contacts carry an
 * email, fax or mailing address, so one saved here becomes a "medical
 * provider" contact.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, BellRing, Check, FileText, FlaskConical, Pencil, Plus, Scale, Send, Stethoscope, X } from 'lucide-react'
import {
  getLeadProviders,
  saveLeadProviderContact,
  sendRecordsFollowUp,
  type CaseLetter,
  type CaseProviderRow,
  type RepresentationStatus,
} from '../../lib/api'
import { saveLetterPdf } from './LetterComposerModal'
import RecordsRequestModal from './RecordsRequestModal'
import LetterOfProtectionModal from './LetterOfProtectionModal'
import { RepresentationPanel } from './LetterSafeguards'

const HIPAA_CHIP: Record<string, { label: string; cls: string }> = {
  ok: { label: 'HIPAA covered', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  missing: { label: 'No signed HIPAA', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  expired: { label: 'HIPAA expired', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  other_provider: { label: 'HIPAA names another provider', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

const REQUEST_LABEL: Record<string, string> = {
  records_and_billing: 'Records and billing',
  records: 'Records',
  billing: 'Billing',
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

/** Sent → Records received → Filed to case → In chronology. */
function lifecycle(letter: CaseLetter) {
  const t = letter.tracking
  const status = letter.recordsStatus || 'pending'
  return [
    { label: letter.deliveredVia === 'email' ? 'Emailed' : 'Faxed / mailed', done: true },
    { label: status === 'completed' ? 'All received' : status === 'partial' ? 'Some received' : 'Received', done: (t?.uploads ?? 0) > 0 },
    { label: 'Filed to case', done: (t?.filed ?? 0) > 0 },
    { label: 'In chronology', done: (t?.processed ?? 0) > 0 && (t?.processed ?? 0) >= (t?.filed ?? 0) },
  ]
}

function RequestTracker({
  leadId,
  letter,
  isTest,
  onChanged,
}: {
  leadId: string
  letter: CaseLetter
  isTest: boolean
  onChanged: (message: string, tone: 'ok' | 'err') => void
}) {
  const [busy, setBusy] = useState(false)
  const steps = lifecycle(letter)
  const waiting = (letter.recordsStatus || 'pending') !== 'completed'
  const age = daysSince(letter.lastFollowUpAt || letter.createdAt)
  const followUp = async () => {
    setBusy(true)
    try {
      const r = await sendRecordsFollowUp(leadId, letter.id)
      onChanged(`Follow-up emailed to ${r.recipientEmail}.`, 'ok')
    } catch (err: any) {
      onChanged(err?.response?.data?.error || 'Could not send the follow-up.', 'err')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5">
      <p className="text-xs text-slate-500">
        {REQUEST_LABEL[letter.requestType || ''] || 'Request'} · sent {shortDate(letter.createdAt)}
        {letter.approvedByEmail ? ` by ${letter.approvedByEmail}` : ''}
        {letter.representationBasis === 'omitted' ? ' · no representation statement' : ''}
        {letter.followUpCount ? ` · ${letter.followUpCount} follow-up${letter.followUpCount === 1 ? '' : 's'}` : ''}
      </p>
      <ol className="mt-1 flex flex-wrap items-center gap-1">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                s.done ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400 ring-1 ring-slate-200'
              }`}
            >
              {s.done ? <Check className="h-3 w-3" /> : null}
              {s.label}
            </span>
            {i < steps.length - 1 ? <span className="text-slate-300">›</span> : null}
          </li>
        ))}
        {waiting && !isTest ? (
          <button
            type="button"
            onClick={followUp}
            disabled={busy}
            title={`Last contact ${age} day${age === 1 ? '' : 's'} ago`}
            className={`ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold transition disabled:opacity-50 ${
              age >= 14 ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'text-slate-500 hover:bg-white hover:text-slate-800'
            }`}
          >
            <BellRing className="h-3 w-3" /> {busy ? 'Sending…' : age >= 14 ? `Follow up (${age}d)` : 'Follow up'}
          </button>
        ) : null}
      </ol>
    </div>
  )
}

export default function ProviderLettersPanel({
  leadId,
  onOpenSection,
  openLetter = false,
}: {
  leadId: string
  onOpenSection?: (section: string) => void
  /** Open the request for the first provider that has none yet. */
  openLetter?: boolean
}) {
  const [providers, setProviders] = useState<CaseProviderRow[]>([])
  const [hipaaSigned, setHipaaSigned] = useState(false)
  const [representation, setRepresentation] = useState<RepresentationStatus | null>(null)
  const [isTest, setIsTest] = useState(false)
  const [canSignLop, setCanSignLop] = useState(false)
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draftEmail, setDraftEmail] = useState('')
  const [draftFax, setDraftFax] = useState('')
  const [draftAddress, setDraftAddress] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newFax, setNewFax] = useState('')
  const [saving, setSaving] = useState(false)
  const [composing, setComposing] = useState<CaseProviderRow | null>(null)
  const [lopFor, setLopFor] = useState<CaseProviderRow | null>(null)
  const autoOpened = useRef(false)

  const load = useCallback(async () => {
    try {
      const data = await getLeadProviders(leadId)
      setProviders(data.providers || [])
      setHipaaSigned(Boolean(data.hipaa?.signed))
      setRepresentation(data.representation)
      setIsTest(Boolean(data.isTest))
      setCanSignLop(Boolean(data.canSignLop))
    } catch (err: any) {
      setBanner({ tone: 'err', text: err?.response?.data?.error || 'Could not load providers.' })
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!openLetter || loading || autoOpened.current) return
    autoOpened.current = true
    const target = providers.find((p) => !p.letters.length)
    if (target) setComposing(target)
  }, [openLetter, loading, providers])

  const saveContact = async (p: CaseProviderRow) => {
    setSaving(true)
    setBanner(null)
    try {
      await saveLeadProviderContact(leadId, {
        name: p.name,
        email: draftEmail.trim(),
        fax: draftFax.trim(),
        address: draftAddress.trim(),
        specialty: p.specialty || undefined,
      })
      setEditing(null)
      await load()
    } catch (err: any) {
      setBanner({ tone: 'err', text: err?.response?.data?.error || 'Could not save the contact details.' })
    } finally {
      setSaving(false)
    }
  }

  const addProvider = async () => {
    if (newName.trim().length < 2) return
    setSaving(true)
    setBanner(null)
    try {
      await saveLeadProviderContact(leadId, {
        name: newName.trim(),
        email: newEmail.trim() || undefined,
        fax: newFax.trim() || undefined,
      })
      setAdding(false)
      setNewName('')
      setNewEmail('')
      setNewFax('')
      await load()
    } catch (err: any) {
      setBanner({ tone: 'err', text: err?.response?.data?.error || 'Could not add the provider.' })
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Providers: records and billing requests</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Each provider gets a request with the signed HIPAA authorization and a secure link to upload records and itemized bills. Letters of
            protection are issued separately, by an attorney.
          </p>
        </div>
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add provider
          </button>
        ) : null}
      </div>

      {!loading && isTest ? (
        <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
          This case contains synthetic or test documents. Requests and letters can be drafted and downloaded as watermarked test copies, but nothing is
          sent to a provider.
        </div>
      ) : null}

      {!loading && representation ? (
        <div className="mt-3">
          <RepresentationPanel leadId={leadId} status={representation} canAttest={canSignLop} onChange={setRepresentation} />
        </div>
      ) : null}

      {!loading && !hipaaSigned ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span className="flex items-start gap-1.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            The client hasn't signed the HIPAA authorization yet. Providers won't release records without it.
          </span>
          {onOpenSection ? (
            <button
              type="button"
              onClick={() => onOpenSection('documents?view=signatures&doc=hipaa_authorization')}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
            >
              Send HIPAA authorization
            </button>
          ) : null}
        </div>
      ) : null}

      {banner ? (
        <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${banner.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {banner.text}
        </div>
      ) : null}

      {adding ? (
        <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[1.2fr_1.2fr_1fr_auto]">
          <input className={inputCls} placeholder="Provider or clinic name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input className={inputCls} placeholder="Records email (leave blank to fax)" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          <input className={inputCls} placeholder="Records fax (optional)" type="tel" value={newFax} onChange={(e) => setNewFax(e.target.value)} />
          <div className="flex gap-1.5">
            <button type="button" onClick={addProvider} disabled={saving || newName.trim().length < 2} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
              <Check className="h-4 w-4" /> Add
            </button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-600" aria-label="Cancel">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 divide-y divide-slate-100">
        {loading ? <p className="py-6 text-center text-sm text-slate-400">Loading providers…</p> : null}
        {!loading && !providers.length ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No providers on this case yet. Add treatment to the timeline above, or add a provider here.
          </p>
        ) : null}
        {providers.map((p) => {
          const last = p.letters[0]
          const lop = p.lops[0]
          const chip = HIPAA_CHIP[p.hipaaStatus] || HIPAA_CHIP.missing
          return (
            <div key={p.key} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Stethoscope className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <span className="truncate">{p.name}</span>
                      {p.specialty ? <span className="font-normal text-slate-500">· {p.specialty}</span> : null}
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${chip.cls}`}>{chip.label}</span>
                      {lop ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-200">
                          <Scale className="h-2.5 w-2.5" /> LOP signed {shortDate(lop.createdAt)}
                          {lop.signedByName ? ` by ${lop.signedByName}` : ''}
                        </span>
                      ) : null}
                    </p>
                    {editing === p.key ? (
                      <div className="mt-1 grid gap-1.5 sm:grid-cols-2">
                        <input className={inputCls} type="email" autoFocus placeholder="records@provider.com" value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} />
                        <input className={inputCls} type="tel" placeholder="Fax (555) 555-0100" value={draftFax} onChange={(e) => setDraftFax(e.target.value)} />
                        <input className={`${inputCls} sm:col-span-2`} placeholder="Mailing address (street, city, state ZIP)" value={draftAddress} onChange={(e) => setDraftAddress(e.target.value)} />
                        <div className="flex gap-1.5 sm:col-span-2">
                          <button type="button" onClick={() => saveContact(p)} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50">
                            <Check className="h-3.5 w-3.5" /> Save
                          </button>
                          <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(p.key)
                          setDraftEmail(p.email || '')
                          setDraftFax(p.fax || '')
                          setDraftAddress(p.address || '')
                        }}
                        className="mt-0.5 inline-flex items-center gap-1 text-left text-xs text-slate-500 hover:text-brand-700"
                      >
                        {p.email || p.fax || p.address
                          ? [p.email, p.fax ? `Fax ${p.fax}` : null, p.address].filter(Boolean).join(' · ')
                          : 'Add records email, fax or mailing address'}{' '}
                        <Pencil className="h-3 w-3 shrink-0" />
                      </button>
                    )}
                    {last ? (
                      <RequestTracker
                        leadId={leadId}
                        letter={last}
                        isTest={isTest}
                        onChanged={(text, tone) => {
                          setBanner({ tone, text })
                          if (tone === 'ok') void load()
                        }}
                      />
                    ) : (
                      <p className="mt-0.5 text-xs text-slate-400">No request sent</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {last ? (
                    <button
                      type="button"
                      onClick={() => void saveLetterPdf(leadId, last.id, `Records-Request-${p.name.replace(/[^a-z0-9]+/gi, '-')}.pdf`)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <FileText className="h-3.5 w-3.5" /> View PDF
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setLopFor(p)}
                    title={canSignLop ? 'Attorney-signed letter of protection' : 'Only an attorney can issue a letter of protection'}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 px-2.5 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                  >
                    <Scale className="h-3.5 w-3.5" /> Letter of protection
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposing(p)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      last ? 'border border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" /> {last ? 'New request' : 'Request records'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {composing ? (
        <RecordsRequestModal
          leadId={leadId}
          providerName={composing.name}
          canAttest={canSignLop}
          onOpenSection={onOpenSection}
          onSent={(_result, message) => {
            setComposing(null)
            setBanner({ tone: 'ok', text: message })
            void load()
          }}
          onClose={() => {
            setComposing(null)
            void load()
          }}
        />
      ) : null}

      {lopFor ? (
        <LetterOfProtectionModal
          leadId={leadId}
          providerName={lopFor.name}
          onSent={(_result, message) => {
            setLopFor(null)
            setBanner({ tone: 'ok', text: message })
            void load()
          }}
          onClose={() => {
            setLopFor(null)
            void load()
          }}
        />
      ) : null}
    </div>
  )
}

/**
 * Treating providers on the case, and the letter of representation + records
 * request each one gets. Providers come from the medical timeline, the intake
 * answers and Contacts; only contacts carry an email, so an email saved here
 * becomes a "medical provider" contact.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, FileText, Pencil, Plus, Send, Stethoscope, X } from 'lucide-react'
import {
  getLeadProviders,
  getProviderLetterPreview,
  saveLeadProviderContact,
  sendProviderLetter,
  type CaseProviderRow,
} from '../../lib/api'
import LetterComposerModal, { saveLetterPdf } from './LetterComposerModal'

const RECORDS_LABEL: Record<string, string> = {
  pending: 'Records not received yet',
  partial: 'Some records received',
  completed: 'Records received',
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ProviderLettersPanel({
  leadId,
  onOpenSection,
  openLetter = false,
}: {
  leadId: string
  onOpenSection?: (section: string) => void
  /** Open the letter for the first provider that has none yet. */
  openLetter?: boolean
}) {
  const [providers, setProviders] = useState<CaseProviderRow[]>([])
  const [hipaaSigned, setHipaaSigned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draftEmail, setDraftEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [composing, setComposing] = useState<CaseProviderRow | null>(null)
  const [includeLop, setIncludeLop] = useState(false)
  const autoOpened = useRef(false)

  const load = useCallback(async () => {
    try {
      const data = await getLeadProviders(leadId)
      setProviders(data.providers || [])
      setHipaaSigned(Boolean(data.hipaa?.signed))
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
    if (!hipaaSigned) return
    const target = providers.find((p) => !p.letters.length)
    if (target) openComposer(target)
  }, [openLetter, loading, providers, hipaaSigned]) // eslint-disable-line react-hooks/exhaustive-deps

  const openComposer = (p: CaseProviderRow) => {
    setIncludeLop(false)
    setComposing(p)
  }

  const saveEmail = async (p: CaseProviderRow) => {
    setSaving(true)
    setBanner(null)
    try {
      await saveLeadProviderContact(leadId, { name: p.name, email: draftEmail.trim(), specialty: p.specialty || undefined })
      setEditing(null)
      await load()
    } catch (err: any) {
      setBanner({ tone: 'err', text: err?.response?.data?.error || 'Could not save the email.' })
    } finally {
      setSaving(false)
    }
  }

  const addProvider = async () => {
    if (newName.trim().length < 2) return
    setSaving(true)
    setBanner(null)
    try {
      await saveLeadProviderContact(leadId, { name: newName.trim(), email: newEmail.trim() || undefined })
      setAdding(false)
      setNewName('')
      setNewEmail('')
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
          <h3 className="text-sm font-semibold text-slate-900">Providers: letters of representation</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Each provider gets a letter with the signed HIPAA authorization and a secure link to upload records and itemized bills.
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

      {!loading && !hipaaSigned ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span className="flex items-start gap-1.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            The client hasn't signed the HIPAA authorization yet. Providers won't release records without it.
          </span>
          {onOpenSection ? (
            <button
              type="button"
              onClick={() => onOpenSection('signatures?doc=hipaa_authorization')}
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
        <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[1fr_1fr_auto]">
          <input className={inputCls} placeholder="Provider or clinic name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input className={inputCls} placeholder="Records email (optional)" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
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
          return (
            <div key={p.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Stethoscope className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {p.name}
                    {p.specialty ? <span className="ml-1.5 font-normal text-slate-500">· {p.specialty}</span> : null}
                  </p>
                  {editing === p.key ? (
                    <div className="mt-1 flex items-center gap-1.5">
                      <input className={inputCls} type="email" autoFocus placeholder="records@provider.com" value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} />
                      <button type="button" onClick={() => saveEmail(p)} disabled={saving} className="rounded-lg bg-brand-600 p-1.5 text-white disabled:opacity-50" aria-label="Save email">
                        <Check className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 p-1.5 text-slate-500" aria-label="Cancel">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(p.key)
                        setDraftEmail(p.email || '')
                      }}
                      className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-700"
                    >
                      {p.email ? p.email : 'Add records email'} <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  <p className="mt-0.5 text-xs text-slate-400">
                    {last
                      ? `Letter ${last.deliveredVia === 'email' ? 'emailed' : 'downloaded to fax'} ${shortDate(last.createdAt)}${last.includesLop ? ' · with letter of protection' : ''} · ${RECORDS_LABEL[last.recordsStatus || 'pending'] || 'Records not received yet'}`
                      : 'Letter not sent'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {last ? (
                  <button
                    type="button"
                    onClick={() => void saveLetterPdf(leadId, last.id, `Letter-of-Representation-${p.name.replace(/[^a-z0-9]+/gi, '-')}.pdf`)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FileText className="h-3.5 w-3.5" /> View PDF
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openComposer(p)}
                  disabled={!hipaaSigned}
                  title={hipaaSigned ? undefined : 'The client has to sign the HIPAA authorization first'}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-40 ${
                    last ? 'border border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                  }`}
                >
                  <Send className="h-3.5 w-3.5" /> {last ? 'Send again' : 'Send letter'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {composing ? (
        <LetterComposerModal
          leadId={leadId}
          title="Letter of representation and records request"
          recipientLabel={composing.name}
          defaultEmail={composing.email}
          previewKey={`${composing.key}:${includeLop ? 1 : 0}`}
          loadPreview={() => getProviderLetterPreview(leadId, composing.name, includeLop)}
          onSend={(payload) => sendProviderLetter(leadId, { ...payload, name: composing.name, includeLop })}
          onSent={(_result, message) => {
            setComposing(null)
            setBanner({ tone: 'ok', text: message })
            void load()
          }}
          onClose={() => setComposing(null)}
          controls={
            <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                checked={includeLop}
                onChange={(e) => setIncludeLop(e.target.checked)}
              />
              <span>
                Include a letter of protection (the firm promises to pay this provider's bills from the settlement). This resets any edits
                and adds the provider to the case's liens.
              </span>
            </label>
          }
          footnote={
            <p className="text-xs text-slate-500">
              The secure upload link replaces {'{{records_upload_link}}'} when the letter is sent. Emails also attach the signed HIPAA
              authorization.
            </p>
          }
        />
      ) : null}
    </div>
  )
}

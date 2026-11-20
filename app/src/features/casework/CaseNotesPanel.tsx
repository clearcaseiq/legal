/**
 * Notes tab: private team notes on the case and the log of every call, email,
 * text, and meeting with the client. Both belong to the case, so a colleague or
 * a new attorney after a transfer sees the full history.
 */
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Mail, MessageSquare, Phone, Trash2, Users } from 'lucide-react'
import { createLeadContact, createLeadNote, deleteLeadNote, getLeadContacts, getLeadNotes } from '../../lib/api'

type CaseNote = {
  id: string
  noteType?: string | null
  message: string
  authorName?: string | null
  createdAt: string
}

type ContactEntry = {
  id: string
  contactType: string
  contactMethod?: string | null
  status?: string | null
  scheduledAt?: string | null
  completedAt?: string | null
  notes?: string | null
  createdAt: string
}

const CONTACT_TYPES = [
  { id: 'call', label: 'Call', Icon: Phone },
  { id: 'email', label: 'Email', Icon: Mail },
  { id: 'sms', label: 'Text', Icon: MessageSquare },
  { id: 'meeting', label: 'Meeting', Icon: Users },
  { id: 'consult', label: 'Consult', Icon: Users },
] as const

const contactMeta = (type: string) => CONTACT_TYPES.find((t) => t.id === type) ?? CONTACT_TYPES[0]

const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''

const errText = (err: any, fallback: string) => err?.response?.data?.error || fallback

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50'

export default function CaseNotesPanel({ leadId }: { leadId: string }) {
  const [notes, setNotes] = useState<CaseNote[]>([])
  const [contacts, setContacts] = useState<ContactEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [contactType, setContactType] = useState<string>('call')
  const [contactNotes, setContactNotes] = useState('')
  const [savingContact, setSavingContact] = useState(false)

  const load = useCallback(async () => {
    const [noteRows, contactRows] = await Promise.allSettled([getLeadNotes(leadId), getLeadContacts(leadId)])
    if (noteRows.status === 'fulfilled') setNotes(Array.isArray(noteRows.value) ? noteRows.value : [])
    if (contactRows.status === 'fulfilled') setContacts(Array.isArray(contactRows.value) ? contactRows.value : [])
    if (noteRows.status === 'rejected' || contactRows.status === 'rejected') {
      setMessage({ tone: 'err', text: 'Some of the notes or contact history could not be loaded.' })
    }
  }, [leadId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMessage(null)
    load().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const addNote = async () => {
    const text = noteDraft.trim()
    if (!text) return
    setSavingNote(true)
    setMessage(null)
    try {
      const created: CaseNote = await createLeadNote(leadId, { noteType: 'general', message: text })
      setNotes((prev) => [created, ...prev])
      setNoteDraft('')
    } catch (err: any) {
      setMessage({ tone: 'err', text: errText(err, 'Could not save the note.') })
    } finally {
      setSavingNote(false)
    }
  }

  const removeNote = async (id: string) => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    setDeletingId(id)
    setMessage(null)
    try {
      await deleteLeadNote(leadId, id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
    } catch (err: any) {
      setMessage({ tone: 'err', text: errText(err, 'Could not delete the note.') })
    } finally {
      setDeletingId(null)
    }
  }

  const logContact = async () => {
    setSavingContact(true)
    setMessage(null)
    try {
      await createLeadContact(leadId, {
        contactType,
        contactMethod: contactType,
        notes: contactNotes.trim() || undefined,
      })
      setContactNotes('')
      const rows = await getLeadContacts(leadId)
      setContacts(Array.isArray(rows) ? rows : [])
      setMessage({ tone: 'ok', text: `${contactMeta(contactType).label} logged.` })
    } catch (err: any) {
      setMessage({ tone: 'err', text: errText(err, 'Could not log the contact.') })
    } finally {
      setSavingContact(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading notes…
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {message ? (
        <div
          className={`rounded-lg px-3 py-2 text-sm lg:col-span-2 ${
            message.tone === 'err' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Team notes</h3>
          <p className="text-xs text-slate-500">Visible to your firm only. The client never sees these.</p>
        </div>
        <label className="block">
          <span className="sr-only">New note</span>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={3}
            placeholder="Strategy, adjuster impressions, what the client told you…"
            disabled={savingNote}
            className={inputClass}
          />
        </label>
        <button
          type="button"
          onClick={addNote}
          disabled={savingNote || !noteDraft.trim()}
          className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {savingNote ? 'Saving…' : 'Add note'}
        </button>

        {notes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
            No notes yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{note.message}</p>
                  <button
                    type="button"
                    onClick={() => removeNote(note.id)}
                    disabled={deletingId === note.id}
                    aria-label="Delete note"
                    className="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {note.authorName || 'Team member'} · {when(note.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Client contact log</h3>
          <p className="text-xs text-slate-500">Record each call, email, text, or meeting with the client.</p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Contact type">
          {CONTACT_TYPES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={contactType === id}
              onClick={() => setContactType(id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                contactType === id
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="sr-only">What was discussed</span>
          <textarea
            value={contactNotes}
            onChange={(e) => setContactNotes(e.target.value)}
            rows={3}
            placeholder="What was discussed, and any follow-up promised"
            disabled={savingContact}
            className={inputClass}
          />
        </label>
        <button
          type="button"
          onClick={logContact}
          disabled={savingContact}
          className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {savingContact ? 'Logging…' : `Log ${contactMeta(contactType).label.toLowerCase()}`}
        </button>

        {contacts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
            No client contact logged yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {contacts.map((c) => {
              const { label, Icon } = contactMeta(c.contactType)
              return (
                <li key={c.id} className="flex gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {label}
                      {c.scheduledAt && !c.completedAt ? (
                        <span className="ml-1.5 font-normal text-slate-500">scheduled {when(c.scheduledAt)}</span>
                      ) : null}
                    </p>
                    {c.notes ? <p className="whitespace-pre-wrap text-sm text-slate-700">{c.notes}</p> : null}
                    <p className="mt-0.5 text-xs text-slate-500">{when(c.completedAt || c.createdAt)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

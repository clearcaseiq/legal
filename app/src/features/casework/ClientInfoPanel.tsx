/**
 * Client Info tab: the claimant's contact details on file, editable in place.
 *
 * Same write as the header's Edit dialog, so a corrected number also becomes the
 * one the platform texts. It is where "Verify client contact information" lands,
 * and closing that task from here saves a trip back to Tasks.
 */
import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Loader2 } from 'lucide-react'
import { getClaimantContact, updateClaimantContact, updateLeadTask, type ClaimantContact } from '../../lib/api'

type Form = Record<
  'firstName' | 'lastName' | 'email' | 'phone' | 'addressLine1' | 'addressLine2' | 'city' | 'state' | 'postalCode',
  string
>

const EMPTY_FORM: Form = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
}

function toForm(contact: Partial<ClaimantContact> | null | undefined): Form {
  const form = { ...EMPTY_FORM }
  for (const key of Object.keys(form) as (keyof Form)[]) form[key] = String(contact?.[key] ?? '')
  return form
}

const VERIFY_TASK = /verify client contact/i
const isDone = (status?: string | null) => ['done', 'completed'].includes(String(status || '').toLowerCase())

interface ClientInfoPanelProps {
  leadId: string
  tasks: Array<{ id: string; title?: string | null; status?: string | null }>
  reloadTasks: () => Promise<void> | void
  onSaved: (contact: ClaimantContact, loginEmailUnchanged: boolean) => void
}

export default function ClientInfoPanel({ leadId, tasks, reloadTasks, onSaved }: ClientInfoPanelProps) {
  const [saved, setSaved] = useState<Form>(EMPTY_FORM)
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getClaimantContact(leadId)
      .then((contact) => {
        if (cancelled) return
        const next = toForm(contact)
        setSaved(next)
        setForm(next)
      })
      .catch((err: any) => {
        if (!cancelled) setMessage({ tone: 'err', text: err?.response?.data?.error || 'Could not load the client details.' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [leadId])

  const dirty = useMemo(() => (Object.keys(form) as (keyof Form)[]).some((k) => form[k] !== saved[k]), [form, saved])
  const verifyTask = tasks.find((t) => VERIFY_TASK.test(String(t.title || '')))
  const verified = verifyTask ? isDone(verifyTask.status) : false

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const result = await updateClaimantContact(leadId, { ...form })
      const next = toForm(result.contact)
      setSaved(next)
      setForm(next)
      onSaved(result.contact, result.loginEmailUnchanged)
      setMessage({
        tone: 'ok',
        text: result.loginEmailUnchanged
          ? 'Saved. The client still signs in with their original email; only the case contact address changed.'
          : 'Saved. Document request texts will go to this number.',
      })
    } catch (err: any) {
      setMessage({ tone: 'err', text: err?.response?.data?.error || 'Could not save the client details.' })
    } finally {
      setSaving(false)
    }
  }

  const markVerified = async () => {
    if (!verifyTask) return
    setVerifying(true)
    setMessage(null)
    try {
      await updateLeadTask(leadId, verifyTask.id, { status: 'done' })
      await reloadTasks()
      setMessage({ tone: 'ok', text: 'Client contact information marked as verified.' })
    } catch (err: any) {
      setMessage({ tone: 'err', text: err?.response?.data?.error || 'Could not update the verification task.' })
    } finally {
      setVerifying(false)
    }
  }

  const field = (label: string, key: keyof Form, opts: { type?: string; placeholder?: string; autoComplete?: string } = {}) => (
    <label className="block min-w-0">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        type={opts.type || 'text'}
        value={form[key]}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
        placeholder={opts.placeholder}
        autoComplete={opts.autoComplete || 'off'}
        disabled={loading || saving}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
      />
    </label>
  )

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading client details…
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      {verifyTask ? (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
            verified ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <BadgeCheck className={`mt-0.5 h-5 w-5 shrink-0 ${verified ? 'text-emerald-600' : 'text-amber-600'}`} aria-hidden />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {verified ? 'Contact information verified' : 'Verify client contact information'}
              </p>
              <p className="text-xs text-slate-600">
                {verified
                  ? 'The verification task is complete.'
                  : 'Confirm the name, phone, email, and mailing address with the client, correct anything below, then mark it verified.'}
              </p>
            </div>
          </div>
          {!verified ? (
            <button
              type="button"
              onClick={markVerified}
              disabled={verifying || dirty}
              title={dirty ? 'Save your changes first' : undefined}
              className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {verifying ? 'Updating…' : 'Mark verified'}
            </button>
          ) : null}
        </div>
      ) : null}

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Contact</h3>
        <p className="mt-0.5 text-xs text-slate-500">The mobile number saved here is the one we text for document requests.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {field('First name', 'firstName')}
          {field('Last name', 'lastName')}
          {field('Email', 'email', { type: 'email' })}
          {field('Mobile phone', 'phone', { type: 'tel', placeholder: '(555) 555-0100' })}
        </div>
      </section>

      <section className="border-t border-slate-100 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">Mailing address</h3>
        <p className="mt-0.5 text-xs text-slate-500">Where demand letters and settlement checks are sent.</p>
        <div className="mt-3 space-y-4">
          {field('Street address', 'addressLine1', { placeholder: '123 Sample Avenue' })}
          {field('Apt, suite, unit (optional)', 'addressLine2', { placeholder: 'Apt 4B' })}
          <div className="grid gap-4 sm:grid-cols-[2fr,1fr,1.2fr]">
            {field('City', 'city')}
            {field('State', 'state', { placeholder: 'CA' })}
            {field('ZIP', 'postalCode', { placeholder: '90012' })}
          </div>
        </div>
      </section>

      {message ? (
        <p
          role={message.tone === 'err' ? 'alert' : 'status'}
          className={`rounded-md border px-3 py-2 text-xs ${
            message.tone === 'err' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-brand-200 bg-brand-50 text-brand-800'
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => setForm(saved)}
          disabled={!dirty || saving}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Discard changes
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

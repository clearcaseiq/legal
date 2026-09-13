/**
 * Correcting the client's contact details from the case file.
 *
 * Firms hit this constantly on imported cases, where the sheet carried a typo,
 * and on live ones, where a claimant changes their number and tells whoever
 * answers the phone. Saving here also moves the number the platform texts.
 */
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { updateClaimantContact, type ClaimantContact } from '../../lib/api'

interface ClientContactDialogProps {
  leadId: string
  initial: ClaimantContact
  onClose: () => void
  onSaved: (contact: ClaimantContact, loginEmailUnchanged: boolean) => void
}

export default function ClientContactDialog({ leadId, initial, onClose, onSaved }: ClientContactDialogProps) {
  const [form, setForm] = useState({
    firstName: initial.firstName || '',
    lastName: initial.lastName || '',
    email: initial.email || '',
    phone: initial.phone || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const result = await updateClaimantContact(leadId, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
      })
      onSaved(result.contact, result.loginEmailUnchanged)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not save the contact details.')
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder?: string) => (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Client contact details</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              The phone number saved here is the one we text for document requests.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {field('First name', 'firstName')}
            {field('Last name', 'lastName')}
          </div>
          {field('Email', 'email', 'email')}
          {field('Mobile phone', 'phone', 'tel', '(555) 555-0100')}
        </div>

        {error ? (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

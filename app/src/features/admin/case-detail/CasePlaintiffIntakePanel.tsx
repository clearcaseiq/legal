import { useState } from 'react'
import { FileText, User } from 'lucide-react'
import { formatDate } from '../../../lib/formatters'
import { updateAdminClaimantContact, formatMailingAddress, type ClaimantContact } from '../../../lib/api'
import { resolveClaimantContact } from '../../../lib/claimantContact'

type ContactForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
}

function formFrom(contact: Partial<ClaimantContact>): ContactForm {
  return {
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    email: contact.email || '',
    phone: contact.phone || '',
    addressLine1: contact.addressLine1 || '',
    addressLine2: contact.addressLine2 || '',
    city: contact.city || '',
    state: contact.state || '',
    postalCode: contact.postalCode || '',
  }
}

export default function CasePlaintiffIntakePanel({ caseData, hasRealAccount, plaintiffContext }: any) {
  const incident = caseData.facts?.incident || {}
  const user = caseData.user || {}
  // Resolved the same way as the attorney screens and the server, so admin and
  // the firm never read different numbers for one claimant.
  const resolved = resolveClaimantContact({ user, facts: caseData.facts })
  const [contact, setContact] = useState<ContactForm>(
    formFrom({
      firstName: resolved.firstName,
      lastName: resolved.lastName,
      email: resolved.email,
      phone: resolved.phone,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      city: user.city,
      state: user.state,
      postalCode: user.postalCode,
    }),
  )
  const [draft, setDraft] = useState<ContactForm>(contact)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const startEditing = () => {
    setDraft(contact)
    setMessage(null)
    setEditing(true)
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const result = await updateAdminClaimantContact(caseData.id, draft)
      setContact(formFrom(result.contact))
      setEditing(false)
      setMessage(
        result.loginEmailUnchanged
          ? 'Saved. The claimant still signs in with their original address, so only the case contact email changed.'
          : 'Contact details saved.',
      )
      setTimeout(() => setMessage(null), 8000)
    } catch (err: any) {
      setMessage(err?.response?.data?.error || 'Could not save the contact details.')
    } finally {
      setSaving(false)
    }
  }

  const input = (key: keyof ContactForm, placeholder: string, type = 'text') => (
    <input
      type={type}
      value={draft[key]}
      onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
      placeholder={placeholder}
      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 focus:border-brand-400 focus:outline-none"
    />
  )

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ')

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <User className="h-5 w-5" />
            Plaintiff profile
          </h2>
          <button
            type="button"
            onClick={editing ? () => setEditing(false) : startEditing}
            className="text-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {input('firstName', 'First name')}
              {input('lastName', 'Last name')}
            </div>
            {input('email', 'Email', 'email')}
            {input('phone', 'Mobile phone', 'tel')}
            <p className="text-xs text-slate-500">
              The phone number saved here is the one document requests are texted to.
            </p>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-sm font-medium text-slate-700">Mailing address</p>
              <p className="mb-2 text-xs text-slate-500">Where demand letters and settlement checks are sent.</p>
              <div className="space-y-2">
                {input('addressLine1', 'Street address')}
                {input('addressLine2', 'Apt, suite, unit (optional)')}
                <div className="grid grid-cols-[2fr,1fr,1.2fr] gap-2">
                  {input('city', 'City')}
                  {input('state', 'State')}
                  {input('postalCode', 'ZIP')}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save contact details'}
            </button>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-slate-500">Name:</span> {fullName || '—'}
            </p>
            <p>
              <span className="text-slate-500">Email:</span> {contact.email || '—'}
            </p>
            <p>
              <span className="text-slate-500">Phone:</span> {contact.phone || '—'}
            </p>
            <p>
              <span className="text-slate-500">Mailing address:</span>{' '}
              {formatMailingAddress(contact) || <span className="text-amber-600">Not on file</span>}
            </p>
            {plaintiffContext.preferredContactMethod && (
              <p>
                <span className="text-slate-500">Preferred contact:</span> {plaintiffContext.preferredContactMethod}
              </p>
            )}
            {hasRealAccount ? (
              <p>
                <span className="text-slate-500">Account created:</span> {formatDate(caseData.user.createdAt)}
              </p>
            ) : (
              <p className="text-xs text-amber-600">Contact provided during intake — no registered account yet.</p>
            )}
          </div>
        )}

        {message && <p className="mt-3 text-xs text-slate-600">{message}</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
          <FileText className="h-5 w-5" />
          Intake responses
        </h2>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-slate-500">Incident summary:</span> {incident.narrative?.slice(0, 200) || '—'}
            {incident.narrative?.length > 200 ? '...' : ''}
          </p>
          <p>
            <span className="text-slate-500">Incident date:</span> {incident.date || '—'}
          </p>
        </div>
      </section>
    </div>
  )
}

import { useState } from 'react'
import { FileText, User } from 'lucide-react'
import { formatDate } from '../../../lib/formatters'
import { updateAdminClaimantContact } from '../../../lib/api'

type AddressForm = {
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
}

function formatAddress(a: Partial<AddressForm>): string | null {
  const street = [a.addressLine1, a.addressLine2].filter(Boolean).join(', ')
  const region = [a.city, [a.state, a.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [street, region].filter(Boolean).join(', ') || null
}

export default function CasePlaintiffIntakePanel({ caseData, contactName, contactEmail, contactPhone, hasRealAccount, plaintiffContext }: any) {
  const incident = caseData.facts?.incident || {}
  const user = caseData.user || {}
  const [address, setAddress] = useState<AddressForm>({
    addressLine1: user.addressLine1 || '',
    addressLine2: user.addressLine2 || '',
    city: user.city || '',
    state: user.state || '',
    postalCode: user.postalCode || '',
  })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const result = await updateAdminClaimantContact(caseData.id, address)
      setAddress({
        addressLine1: result.contact.addressLine1 || '',
        addressLine2: result.contact.addressLine2 || '',
        city: result.contact.city || '',
        state: result.contact.state || '',
        postalCode: result.contact.postalCode || '',
      })
      setEditing(false)
      setMessage('Mailing address saved.')
      setTimeout(() => setMessage(null), 5000)
    } catch (err: any) {
      setMessage(err?.response?.data?.error || 'Could not save the mailing address.')
    } finally {
      setSaving(false)
    }
  }

  const input = (key: keyof AddressForm, placeholder: string) => (
    <input
      value={address[key]}
      onChange={(e) => setAddress((prev) => ({ ...prev, [key]: e.target.value }))}
      placeholder={placeholder}
      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 focus:border-brand-400 focus:outline-none"
    />
  )

  return <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900"><User className="h-5 w-5" />Plaintiff profile</h2>
      {(contactEmail || contactPhone || contactName) ? <div className="space-y-2 text-sm">{contactName && <p><span className="text-slate-500">Name:</span> {contactName}</p>}<p><span className="text-slate-500">Email:</span> {contactEmail || '—'}</p><p><span className="text-slate-500">Phone:</span> {contactPhone || '—'}</p>{plaintiffContext.preferredContactMethod && <p><span className="text-slate-500">Preferred contact:</span> {plaintiffContext.preferredContactMethod}</p>}{hasRealAccount ? <p><span className="text-slate-500">Account created:</span> {formatDate(caseData.user.createdAt)}</p> : <p className="text-xs text-amber-600">Contact provided during intake — no registered account yet.</p>}</div> : <p className="text-slate-500">No contact information on file</p>}

      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Mailing address</p>
          {editing
            ? <button type="button" onClick={() => setEditing(false)} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
            : <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-brand-700 hover:text-brand-800">Edit</button>}
        </div>
        {editing ? <div className="mt-2 space-y-2">
          {input('addressLine1', 'Street address')}
          {input('addressLine2', 'Apt, suite, unit (optional)')}
          <div className="grid grid-cols-[2fr,1fr,1.2fr] gap-2">
            {input('city', 'City')}
            {input('state', 'State')}
            {input('postalCode', 'ZIP')}
          </div>
          <button type="button" onClick={save} disabled={saving} className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save address'}</button>
        </div> : <p className="mt-1 text-sm text-slate-800">{formatAddress(address) || <span className="text-amber-600">Not on file</span>}</p>}
        {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
      </div>
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900"><FileText className="h-5 w-5" />Intake responses</h2><div className="space-y-2 text-sm"><p><span className="text-slate-500">Incident summary:</span> {incident.narrative?.slice(0, 200) || '—'}{incident.narrative?.length > 200 ? '...' : ''}</p><p><span className="text-slate-500">Incident date:</span> {incident.date || '—'}</p></div></section>
  </div>
}

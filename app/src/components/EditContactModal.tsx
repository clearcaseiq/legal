/**
 * Modal to edit a case contact.
 */
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const CONTACT_TYPES = [
  { id: 'client', label: 'Client / Plaintiff' },
  { id: 'opposing_counsel', label: 'Opposing Counsel' },
  { id: 'adjuster', label: 'Insurance Adjuster' },
  { id: 'witness', label: 'Witness' },
  { id: 'medical_provider', label: 'Medical Provider' },
  { id: 'expert', label: 'Expert' },
  { id: 'other', label: 'Other' }
] as const

interface Contact {
  id: string
  leadId: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  companyName?: string | null
  companyUrl?: string | null
  title?: string | null
  contactType?: string | null
  notes?: string | null
  lead?: { assessment?: { claimType?: string; venueCounty?: string; venueState?: string } }
}

interface EditContactModalProps {
  isOpen: boolean
  onClose: () => void
  contact: Contact | null
  onSubmit: (payload: {
    firstName: string
    lastName: string
    email?: string
    phone?: string
    companyName?: string
    companyUrl?: string
    title?: string
    contactType?: string
    notes?: string
  }) => Promise<void>
  loading?: boolean
}

export default function EditContactModal({
  isOpen,
  onClose,
  contact,
  onSubmit,
  loading = false
}: EditContactModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyUrl, setCompanyUrl] = useState('')
  const [title, setTitle] = useState('')
  const [contactType, setContactType] = useState('')
  const [notes, setNotes] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (contact) {
      setFirstName(contact.firstName || '')
      setLastName(contact.lastName || '')
      setEmail(contact.email || '')
      setPhone(contact.phone || '')
      setCompanyName(contact.companyName || '')
      setCompanyUrl(contact.companyUrl || '')
      setTitle(contact.title || '')
      setContactType(contact.contactType || '')
      setNotes(contact.notes || '')
      setSubmitError(null)
    }
  }, [contact])

  const handleClose = () => {
    setSubmitError(null)
    onClose()
  }

  const handleSubmit = async () => {
    const fn = firstName.trim()
    const ln = lastName.trim()
    if (!fn || !ln) {
      setSubmitError('First name and last name are required.')
      return
    }
    setSubmitError(null)
    try {
      await onSubmit({
        firstName: fn,
        lastName: ln,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        companyName: companyName.trim() || undefined,
        companyUrl: companyUrl.trim() || undefined,
        title: title.trim() || undefined,
        contactType: contactType || undefined,
        notes: notes.trim() || undefined
      })
      handleClose()
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error || err?.message || 'Failed to save contact.')
    }
  }

  if (!isOpen || !contact) return null

  const claimLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  const caseLabel = contact.lead?.assessment
    ? `${claimLabel(contact.lead.assessment.claimType || 'Case')} — ${[contact.lead.assessment.venueCounty, contact.lead.assessment.venueState].filter(Boolean).join(', ') || '—'}`
    : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Edit Contact</h3>
            <p className="text-sm text-gray-500 mt-0.5">{caseLabel}</p>
          </div>
          <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="Smith"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="Acme Insurance"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company URL</label>
            <input
              type="url"
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title / Role</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="e.g. Claims Adjuster"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact type</label>
            <select
              value={contactType}
              onChange={(e) => setContactType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">Select type</option>
              {CONTACT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="Additional notes..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button onClick={handleClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !firstName.trim() || !lastName.trim()}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

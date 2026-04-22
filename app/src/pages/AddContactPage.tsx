/**
 * Full-screen page to add a case contact after selecting a case.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getLead, createCaseContact } from '../lib/api'
import { invalidateAttorneyDashboardSummary } from '../hooks/useAttorneyDashboardSummary'

const CONTACT_TYPES = [
  { id: 'client', label: 'Client / Plaintiff' },
  { id: 'opposing_counsel', label: 'Opposing Counsel' },
  { id: 'adjuster', label: 'Insurance Adjuster' },
  { id: 'witness', label: 'Witness' },
  { id: 'medical_provider', label: 'Medical Provider' },
  { id: 'expert', label: 'Expert' },
  { id: 'other', label: 'Other' }
] as const

export default function AddContactPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = (location.state as any)?.returnTo
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyUrl, setCompanyUrl] = useState('')
  const [title, setTitle] = useState('')
  const [contactType, setContactType] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!leadId) {
      setError('No case selected')
      setLoading(false)
      return
    }
    getLead(leadId)
      .then(setLead)
      .catch((err: any) => setError(err?.response?.data?.error || err?.message || 'Failed to load case'))
      .finally(() => setLoading(false))
  }, [leadId])

  const claimLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  const caseLabel = lead
    ? `${claimLabel(lead.assessment?.claimType || 'Case')} — ${[lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || '—'}`
    : ''

  const handleSubmit = async () => {
    const fn = firstName.trim()
    const ln = lastName.trim()
    if (!fn || !ln) {
      setError('First name and last name are required.')
      return
    }
    if (!leadId) return
    setError(null)
    setSaving(true)
    try {
      await createCaseContact(leadId, {
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
      invalidateAttorneyDashboardSummary()
      navigate(returnTo === 'contacts' ? '/attorney-dashboard/contacts' : '/attorney-dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to save contact.'
      const details = err?.response?.data?.details
      const path = err?.config?.url
      const status = err?.response?.status
      let display = msg
      if (details) display += `: ${details}`
      if (status === 404 && path) display += ` (requested: ${path})`
      setError(display)
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (leadId) {
      navigate(`/attorney-dashboard/lead/${leadId}/communications`)
    } else {
      navigate('/attorney-dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (error && !lead) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
        <button
          onClick={() => navigate('/attorney-dashboard')}
          className="mt-4 px-4 py-2 text-brand-600 hover:underline"
        >
          ← Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">Add Contact</h1>
            <p className="text-sm text-gray-500 mt-1">{caseLabel}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">Case #{leadId?.slice(-8)?.toUpperCase()}</p>
          </div>

          <div className="p-6 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
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
                placeholder="e.g. Claims Adjuster, Defense Attorney"
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
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="Additional notes about this contact..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !firstName.trim() || !lastName.trim()}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save contact'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CheckCircle, Lock } from 'lucide-react'
import { BackButton } from '../features/shared/ui'
import { US_STATES } from '../lib/constants'
import { updateFirm } from '../lib/api'
import { invalidateFirmDashboardSummary, useFirmDashboardSummary } from '../hooks/useFirmDashboardSummary'

interface FirmForm {
  name: string
  primaryEmail: string
  phone: string
  website: string
  address: string
  city: string
  state: string
  zip: string
}

const EMPTY_FORM: FirmForm = {
  name: '',
  primaryEmail: '',
  phone: '',
  website: '',
  address: '',
  city: '',
  state: '',
  zip: '',
}

export default function FirmSettings() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useFirmDashboardSummary()

  const [form, setForm] = useState<FirmForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const firm = data?.firm
  const canEdit = useMemo(() => {
    const permissions: string[] = data?.workspace?.permissions || []
    const role: string = data?.workspace?.currentRole || ''
    return role === 'firm_admin' || permissions.includes('manage_users')
  }, [data])

  // Prefill the form once firm data is available.
  useEffect(() => {
    if (!firm) return
    setForm({
      name: firm.name || '',
      primaryEmail: firm.primaryEmail || '',
      phone: firm.phone || '',
      website: firm.website || '',
      address: firm.address || '',
      city: firm.city || '',
      state: firm.state || '',
      zip: firm.zip || '',
    })
  }, [firm])

  const updateField = (key: keyof FirmForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaveSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError(null)
    setSaveSuccess(false)

    if (!form.name.trim()) {
      setSaveError('Firm name is required.')
      return
    }
    if (form.primaryEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.primaryEmail.trim())) {
      setSaveError('Please enter a valid email address.')
      return
    }

    try {
      setSaving(true)
      await updateFirm({
        name: form.name.trim(),
        primaryEmail: form.primaryEmail.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip: form.zip.trim() || null,
      })
      invalidateFirmDashboardSummary()
      await refresh(true)
      setSaveSuccess(true)
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || err?.message || 'Failed to save firm settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !firm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading firm settings...</p>
        </div>
      </div>
    )
  }

  if (!firm) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center">
            <Building2 className="h-5 w-5 text-amber-600 mr-2" />
            <h3 className="text-lg font-medium text-amber-900">Firm settings are not available yet</h3>
          </div>
          <p className="mt-2 text-sm text-amber-800">
            {error === 'No law firm associated with this attorney'
              ? 'This attorney account is not linked to a law firm, so firm settings are unavailable.'
              : 'We could not load your firm details. Please try again.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/attorney-dashboard')}
            className="mt-4 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            Back to Attorney Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <BackButton onClick={() => navigate('/firm-dashboard')} label="Back to Firm Dashboard" />
      </div>

      <div className="flex items-center space-x-4 mb-8">
        <div className="h-14 w-14 rounded-full bg-brand-100 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-brand-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Firm Settings</h1>
          <p className="text-sm text-gray-600">Manage your firm’s public profile and contact details.</p>
        </div>
      </div>

      {!canEdit && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <Lock className="h-5 w-5 text-slate-500 mt-0.5" />
          <p className="text-sm text-slate-600">
            You have read-only access to firm settings. Ask a firm admin to make changes.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        {saveError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{saveError}</div>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Firm settings saved.
          </div>
        )}

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Firm Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Enter firm name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Email</label>
              <input
                type="email"
                value={form.primaryEmail}
                onChange={(e) => updateField('primaryEmail', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="contact@firm.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => updateField('website', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="https://www.firm.com"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="123 Main St, Suite 400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="City"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <select
                  value={form.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">—</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                <input
                  type="text"
                  value={form.zip}
                  onChange={(e) => updateField('zip', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="ZIP"
                />
              </div>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyAttorneyProfile, updateAttorneyProfile } from '../lib/api'
import { Save, AlertCircle } from 'lucide-react'
import { US_STATES } from '../lib/constants'

const CASE_TYPES = [
  { value: 'auto', label: 'Auto Accident' },
  { value: 'slip_and_fall', label: 'Slip-and-Fall' },
  { value: 'dog_bite', label: 'Dog Bite' },
  { value: 'medmal', label: 'Medical Malpractice' },
  { value: 'product', label: 'Product Liability' },
  { value: 'nursing_home_abuse', label: 'Nursing Home Abuse' },
  { value: 'wrongful_death', label: 'Wrongful Death' },
  { value: 'high_severity_surgery', label: 'High-Severity / Surgery' }
]


export default function AttorneyPreferences() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    // Firm information
    firmName: '',
    firmLocations: [] as Array<{ address: string; city: string; state: string; zip: string; phone?: string }>,
    
    // Jurisdictions
    jurisdictions: [] as Array<{ state: string; counties: string[] }>,
    
    // Case preferences
    minInjurySeverity: null as number | null,
    excludedCaseTypes: [] as string[],
    minDamagesRange: null as number | null,
    maxDamagesRange: null as number | null,
    
    // Capacity
    maxCasesPerWeek: null as number | null,
    maxCasesPerMonth: null as number | null,
    intakeHours: '24/7' as string | Array<{ dayOfWeek: number; startTime: number; endTime: number }>,
    
    // Buying preferences
    pricingModel: '' as string,
    paymentModel: '' as string,
    subscriptionTier: '' as string
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const profile = await getMyAttorneyProfile()
      
      setFormData({
        firmName: profile.firmName || '',
        firmLocations: profile.firmLocations ? JSON.parse(profile.firmLocations) : [],
        jurisdictions: profile.jurisdictions ? JSON.parse(profile.jurisdictions) : [],
        minInjurySeverity: profile.minInjurySeverity,
        excludedCaseTypes: profile.excludedCaseTypes ? JSON.parse(profile.excludedCaseTypes) : [],
        minDamagesRange: profile.minDamagesRange,
        maxDamagesRange: profile.maxDamagesRange,
        maxCasesPerWeek: profile.maxCasesPerWeek,
        maxCasesPerMonth: profile.maxCasesPerMonth,
        intakeHours: profile.intakeHours === '24/7' ? '24/7' : (profile.intakeHours ? JSON.parse(profile.intakeHours) : '24/7'),
        pricingModel: profile.pricingModel || '',
        paymentModel: profile.paymentModel || '',
        subscriptionTier: profile.subscriptionTier || ''
      })
    } catch (err: any) {
      setError('Failed to load profile')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      await updateAttorneyProfile(formData)
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const toggleArrayValue = (field: 'excludedCaseTypes', value: string) => {
    const current = formData[field] || []
    if (current.includes(value)) {
      setFormData(prev => ({ ...prev, [field]: current.filter(v => v !== value) }))
    } else {
      setFormData(prev => ({ ...prev, [field]: [...current, value] }))
    }
  }

  const addJurisdiction = () => {
    setFormData(prev => ({
      ...prev,
      jurisdictions: [...prev.jurisdictions, { state: '', counties: [] }]
    }))
  }

  const updateJurisdiction = (index: number, updates: Partial<{ state: string; counties: string[] }>) => {
    setFormData(prev => ({
      ...prev,
      jurisdictions: prev.jurisdictions.map((j, i) => i === index ? { ...j, ...updates } : j)
    }))
  }

  const removeJurisdiction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      jurisdictions: prev.jurisdictions.filter((_, i) => i !== index)
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading preferences...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Attorney Preferences</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/attorney-dashboard')}
                className="btn-secondary"
              >
                Back to Dashboard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-center justify-between">
              <p className="text-sm text-green-600">Preferences saved successfully!</p>
              <button
                onClick={() => navigate('/attorney-dashboard')}
                className="text-sm text-green-700 hover:text-green-900"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          <div className="space-y-8">
            {/* Firm Information */}
            <section>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Firm Information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name</label>
                <input
                  type="text"
                  value={formData.firmName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firmName: e.target.value }))}
                  className="input"
                  placeholder="Your firm name"
                />
              </div>
            </section>

            {/* Jurisdictions */}
            <section>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Jurisdictions Covered</h2>
              <p className="text-sm text-gray-600 mb-4">Specify which states and counties you practice in</p>
              
              {formData.jurisdictions.map((jurisdiction, index) => (
                <div key={index} className="mb-4 p-4 border rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <select
                        value={jurisdiction.state}
                        onChange={(e) => updateJurisdiction(index, { state: e.target.value })}
                        className="input"
                      >
                        <option value="">Select state</option>
                        {US_STATES.map(state => (
                          <option key={state.code} value={state.code}>
                            {state.code} - {state.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Counties (comma-separated)</label>
                      <input
                        type="text"
                        value={jurisdiction.counties.join(', ')}
                        onChange={(e) => updateJurisdiction(index, { 
                          counties: e.target.value.split(',').map(c => c.trim()).filter(c => c) 
                        })}
                        className="input"
                        placeholder="e.g., Los Angeles, Orange, San Diego"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeJurisdiction(index)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addJurisdiction}
                className="btn-secondary text-sm"
              >
                + Add Jurisdiction
              </button>
            </section>

            {/* Case Preferences */}
            <section>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Case Preferences</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Excluded Case Types</label>
                <p className="text-xs text-gray-500 mb-2">Select case types you do NOT want to receive</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {CASE_TYPES.map(type => (
                    <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.excludedCaseTypes.includes(type.value)}
                        onChange={() => toggleArrayValue('excludedCaseTypes', type.value)}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Injury Severity</label>
                  <select
                    value={formData.minInjurySeverity ?? ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      minInjurySeverity: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                    className="input"
                  >
                    <option value="">No minimum</option>
                    <option value="0">None</option>
                    <option value="1">Mild</option>
                    <option value="2">Moderate</option>
                    <option value="3">Severe</option>
                    <option value="4">Catastrophic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Damages ($)</label>
                  <input
                    type="number"
                    value={formData.minDamagesRange ?? ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      minDamagesRange: e.target.value ? parseFloat(e.target.value) : null 
                    }))}
                    className="input"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Damages ($)</label>
                  <input
                    type="number"
                    value={formData.maxDamagesRange ?? ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      maxDamagesRange: e.target.value ? parseFloat(e.target.value) : null 
                    }))}
                    className="input"
                    placeholder="No maximum"
                  />
                </div>
              </div>
            </section>

            {/* Capacity */}
            <section>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Capacity</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Cases Per Week</label>
                  <input
                    type="number"
                    value={formData.maxCasesPerWeek ?? ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      maxCasesPerWeek: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                    className="input"
                    placeholder="No limit"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Cases Per Month</label>
                  <input
                    type="number"
                    value={formData.maxCasesPerMonth ?? ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      maxCasesPerMonth: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                    className="input"
                    placeholder="No limit"
                  />
                </div>
              </div>
            </section>

            {/* Buying Preferences */}
            <section>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Buying Preferences</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Model</label>
                  <select
                    value={formData.pricingModel}
                    onChange={(e) => setFormData(prev => ({ ...prev, pricingModel: e.target.value }))}
                    className="input"
                  >
                    <option value="">Select...</option>
                    <option value="fixed_price">Fixed Price</option>
                    <option value="auction">Auction</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Model</label>
                  <select
                    value={formData.paymentModel}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentModel: e.target.value }))}
                    className="input"
                  >
                    <option value="">Select...</option>
                    <option value="subscription">Subscription</option>
                    <option value="pay_per_case">Pay Per Case</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyAttorneyProfile, updateAttorneyProfile } from '../lib/api'
import { Save, AlertCircle } from 'lucide-react'
import { US_STATES, ATTORNEY_CASE_TYPES } from '../lib/constants'

// Shared source of truth so practice-area labels stay consistent with
// registration and the rest of the app (#49).
const CASE_TYPES = ATTORNEY_CASE_TYPES

// The profile API serializes JSON columns as strings, but be defensive: if a
// value ever arrives already parsed (object/array), don't blow up loadProfile
// (which previously called JSON.parse on it and threw). Falls back gracefully.
function safeParseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback
  if (typeof value !== 'string') return value as T
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}


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
        firmLocations: safeParseJson(profile.firmLocations, [] as typeof formData.firmLocations),
        jurisdictions: safeParseJson(profile.jurisdictions, [] as typeof formData.jurisdictions),
        minInjurySeverity: profile.minInjurySeverity,
        excludedCaseTypes: safeParseJson(profile.excludedCaseTypes, [] as string[]),
        minDamagesRange: profile.minDamagesRange,
        maxDamagesRange: profile.maxDamagesRange,
        maxCasesPerWeek: profile.maxCasesPerWeek,
        maxCasesPerMonth: profile.maxCasesPerMonth,
        intakeHours: profile.intakeHours === '24/7' ? '24/7' : safeParseJson(profile.intakeHours, '24/7' as typeof formData.intakeHours),
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

  const addFirmLocation = () => {
    setFormData(prev => ({
      ...prev,
      firmLocations: [...prev.firmLocations, { address: '', city: '', state: '', zip: '', phone: '' }]
    }))
  }

  const updateFirmLocation = (
    index: number,
    updates: Partial<{ address: string; city: string; state: string; zip: string; phone: string }>
  ) => {
    setFormData(prev => ({
      ...prev,
      firmLocations: prev.firmLocations.map((loc, i) => (i === index ? { ...loc, ...updates } : loc))
    }))
  }

  const removeFirmLocation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      firmLocations: prev.firmLocations.filter((_, i) => i !== index)
    }))
  }

  const is247 = formData.intakeHours === '24/7'
  const intakeWindows = Array.isArray(formData.intakeHours) ? formData.intakeHours : []
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const setIntakeAlwaysOn = (alwaysOn: boolean) => {
    if (alwaysOn) {
      setFormData(prev => ({ ...prev, intakeHours: '24/7' }))
    } else {
      // Seed a sensible Mon–Fri 9am–5pm default when switching off 24/7.
      setFormData(prev => ({
        ...prev,
        intakeHours: [1, 2, 3, 4, 5].map(dayOfWeek => ({ dayOfWeek, startTime: 9, endTime: 17 }))
      }))
    }
  }

  const toggleIntakeDay = (dayOfWeek: number) => {
    setFormData(prev => {
      const windows = Array.isArray(prev.intakeHours) ? prev.intakeHours : []
      const exists = windows.some(w => w.dayOfWeek === dayOfWeek)
      const next = exists
        ? windows.filter(w => w.dayOfWeek !== dayOfWeek)
        : [...windows, { dayOfWeek, startTime: 9, endTime: 17 }].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      return { ...prev, intakeHours: next }
    })
  }

  const updateIntakeWindow = (dayOfWeek: number, updates: Partial<{ startTime: number; endTime: number }>) => {
    setFormData(prev => {
      const windows = Array.isArray(prev.intakeHours) ? prev.intakeHours : []
      return {
        ...prev,
        intakeHours: windows.map(w => (w.dayOfWeek === dayOfWeek ? { ...w, ...updates } : w))
      }
    })
  }

  if (loading) {
    // Keep the same page shell (background + centered container) as the loaded
    // view so the transition from the route Suspense fallback to content doesn't
    // swap the whole screen and read as a flicker (#212).
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center gap-3 text-gray-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
              <span>Loading preferences...</span>
            </div>
          </div>
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
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name</label>
                <input
                  type="text"
                  value={formData.firmName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firmName: e.target.value }))}
                  className="input"
                  placeholder="Your firm name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office Locations</label>
                <p className="text-xs text-gray-500 mb-3">Add the offices where you intake and meet clients.</p>
                {formData.firmLocations.map((location, index) => (
                  <div key={index} className="mb-4 p-4 border rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Street Address</label>
                        <input
                          type="text"
                          value={location.address}
                          onChange={(e) => updateFirmLocation(index, { address: e.target.value })}
                          className="input"
                          placeholder="123 Main St, Suite 400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                        <input
                          type="text"
                          value={location.city}
                          onChange={(e) => updateFirmLocation(index, { city: e.target.value })}
                          className="input"
                          placeholder="Los Angeles"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                          <select
                            value={location.state}
                            onChange={(e) => updateFirmLocation(index, { state: e.target.value })}
                            className="input"
                          >
                            <option value="">—</option>
                            {US_STATES.map(state => (
                              <option key={state.code} value={state.code}>{state.code}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">ZIP</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={10}
                            value={location.zip}
                            onChange={(e) => updateFirmLocation(index, { zip: e.target.value.replace(/[^0-9-]/g, '') })}
                            className="input"
                            placeholder="90012"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Phone (optional)</label>
                        <input
                          type="tel"
                          inputMode="tel"
                          maxLength={20}
                          value={location.phone || ''}
                          // Phone numbers never contain letters; strip anything
                          // that isn't a digit or common phone punctuation (#115).
                          onChange={(e) => updateFirmLocation(index, { phone: e.target.value.replace(/[^0-9+()\-.\s]/g, '') })}
                          className="input"
                          placeholder="(213) 555-0100"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFirmLocation(index)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addFirmLocation} className="btn-secondary text-sm">
                  + Add Office Location
                </button>
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
                        value={(jurisdiction.counties || []).join(', ')}
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
                    min="0"
                    max={100000000}
                    value={formData.minDamagesRange ?? ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      minDamagesRange: e.target.value ? Math.min(100000000, Math.max(0, parseFloat(e.target.value))) : null 
                    }))}
                    className="input"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Damages ($)</label>
                  <input
                    type="number"
                    min="0"
                    max={100000000}
                    value={formData.maxDamagesRange ?? ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      maxDamagesRange: e.target.value ? Math.min(100000000, Math.max(0, parseFloat(e.target.value))) : null 
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
                    min="0"
                    max={1000}
                    value={formData.maxCasesPerWeek ?? ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      maxCasesPerWeek: e.target.value ? Math.min(1000, Math.max(0, parseInt(e.target.value))) : null 
                    }))}
                    className="input"
                    placeholder="No limit"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Cases Per Month</label>
                  <input
                    type="number"
                    min="0"
                    max={5000}
                    value={formData.maxCasesPerMonth ?? ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      maxCasesPerMonth: e.target.value ? Math.min(5000, Math.max(0, parseInt(e.target.value))) : null 
                    }))}
                    className="input"
                    placeholder="No limit"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Intake Availability</label>
                <p className="text-xs text-gray-500 mb-3">When new cases can be routed to you.</p>
                <div className="flex gap-6 mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="intakeAvailability"
                      checked={is247}
                      onChange={() => setIntakeAlwaysOn(true)}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-700">Accept intakes 24/7</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="intakeAvailability"
                      checked={!is247}
                      onChange={() => setIntakeAlwaysOn(false)}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-700">Specific hours</span>
                  </label>
                </div>

                {!is247 && (
                  <div className="space-y-2">
                    {DAY_LABELS.map((label, dayOfWeek) => {
                      const window = intakeWindows.find(w => w.dayOfWeek === dayOfWeek)
                      const enabled = Boolean(window)
                      return (
                        <div key={dayOfWeek} className="flex items-center gap-3">
                          <label className="flex items-center space-x-2 w-24 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={() => toggleIntakeDay(dayOfWeek)}
                              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span className="text-sm text-gray-700">{label}</span>
                          </label>
                          {enabled && window && (
                            <div className="flex items-center gap-2">
                              <select
                                value={window.startTime}
                                onChange={(e) => updateIntakeWindow(dayOfWeek, { startTime: parseInt(e.target.value) })}
                                className="input py-1"
                              >
                                {Array.from({ length: 24 }, (_, h) => (
                                  <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                                ))}
                              </select>
                              <span className="text-sm text-gray-500">to</span>
                              <select
                                value={window.endTime}
                                onChange={(e) => updateIntakeWindow(dayOfWeek, { endTime: parseInt(e.target.value) })}
                                className="input py-1"
                              >
                                {Array.from({ length: 24 }, (_, h) => (
                                  <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Tier</label>
                  <select
                    value={formData.subscriptionTier}
                    onChange={(e) => setFormData(prev => ({ ...prev, subscriptionTier: e.target.value }))}
                    className="input"
                  >
                    <option value="">Not subscribed</option>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
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

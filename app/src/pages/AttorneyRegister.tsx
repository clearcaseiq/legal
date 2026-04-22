import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerAttorney, lookupStateBarLicense, uploadAttorneyLicense } from '../lib/api-auth'
import { US_STATES, CA_COUNTIES } from '../lib/constants'
import { useLanguage } from '../contexts/LanguageContext'
import {
  ATTORNEY_REGISTER_DEFAULTS,
  validateAttorneyRegisterInput,
  type AttorneyRegisterFieldErrors,
  type AttorneyRegisterFormInput,
  type AttorneyRegisterSubmission,
} from '../lib/attorneyRegisterValidation'
import AttorneyRegisterProgress from '../components/AttorneyRegisterProgress'
import AttorneyRegisterBenefits from '../components/AttorneyRegisterBenefits'
import BrandLogo from '../components/BrandLogo'

const CASE_TYPES = [
  { value: 'auto', label: 'Auto Accidents' },
  { value: 'slip_and_fall', label: 'Slip & Fall' },
  { value: 'dog_bite', label: 'Dog Bite' },
  { value: 'medmal', label: 'Medical Malpractice' },
  { value: 'wrongful_death', label: 'Wrongful Death' },
  { value: 'product', label: 'Product Liability' },
  { value: 'nursing_home_abuse', label: 'Nursing Home Abuse' },
  { value: 'high_severity_surgery', label: 'High-Severity / Surgery' }
]

export default function AttorneyRegister() {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<AttorneyRegisterFieldErrors>({})
  const [emailExistsError, setEmailExistsError] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [stateSearchQuery, setStateSearchQuery] = useState('')
  const [verificationMethod, setVerificationMethod] = useState<'state_bar_lookup' | 'manual_upload'>('state_bar_lookup')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseState, setLicenseState] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [licenseVerified, setLicenseVerified] = useState(false)
  const [form, setForm] = useState<AttorneyRegisterFormInput>(ATTORNEY_REGISTER_DEFAULTS)
  const navigate = useNavigate()

  const firstName = form.firstName
  const lastName = form.lastName
  const firmName = form.firmName
  const specialties = form.specialties
  const venues = form.venues
  const watchedSecondary = form.secondaryCaseTypes
  const watchedCounties = form.preferredCounties

  const updateField = <K extends keyof AttorneyRegisterFormInput>(
    field: K,
    value: AttorneyRegisterFormInput[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const toggleArray = (field: 'specialties' | 'secondaryCaseTypes' | 'venues' | 'excludedCaseTypes' | 'preferredCounties', value: string) => {
    const current = form[field]
    updateField(
      field,
      (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) as AttorneyRegisterFormInput[typeof field]
    )
  }

  const onSubmit = async (data: AttorneyRegisterSubmission) => {
    setIsLoading(true)
    setError(null)
    setEmailExistsError(false)
    let licenseVerificationSucceeded = false

    try {
      const name = `${data.firstName} ${data.lastName}, Esq.`
      const jurisdictions = data.venues.map((stateCode) => ({
        state: stateCode,
        counties: (data.preferredCounties || []).filter((c) => c),
        cities: (data.preferredCities || '').split(',').map((s) => s.trim()).filter(Boolean)
      }))

      const payload: any = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        name,
        phone: data.phone || undefined,
        firmName: data.firmName || undefined,
        firmWebsite: data.firmWebsite || undefined,
        stateBarNumber: data.stateBarNumber || undefined,
        stateBarState: data.stateBarState || undefined,
        specialties: data.specialties,
        secondaryCaseTypes: data.secondaryCaseTypes || [],
        venues: data.venues,
        jurisdictions,
        excludedCaseTypes: data.excludedCaseTypes || [],
        minInjurySeverity: data.minInjurySeverity,
        minDamagesRange: data.minDamagesRange,
        maxDamagesRange: data.maxDamagesRange,
        insuranceRequired: data.insuranceRequired === 'yes',
        mustHaveMedicalTreatment: data.mustHaveMedicalTreatment === 'yes',
        requirePoliceReport: data.requirePoliceReport ?? undefined,
        requireMedicalRecords: data.requireMedicalRecords ?? undefined,
        intakeStatus: data.intakeStatus || undefined,
        preferredConsultationMethod: data.preferredConsultationMethod || undefined,
        pricingModel: data.pricingModel || undefined,
        paymentModel: data.paymentModel || undefined
      }

      const maxWeek = typeof data.maxCasesPerWeek === 'number' ? data.maxCasesPerWeek : undefined
      const maxMonth = typeof data.maxCasesPerMonth === 'number' ? data.maxCasesPerMonth : undefined
      if (maxWeek !== undefined && maxWeek > 0) payload.maxCasesPerWeek = maxWeek
      if (maxMonth !== undefined && maxMonth > 0) payload.maxCasesPerMonth = maxMonth

      const response = await registerAttorney(payload)

      if (response.token) localStorage.setItem('auth_token', response.token)
      if (response.user) localStorage.setItem('user', JSON.stringify(response.user))
      if (response.attorney) localStorage.setItem('attorney', JSON.stringify(response.attorney))
      localStorage.setItem('auth_role', 'attorney')

      await new Promise((r) => setTimeout(r, 300))

      if (verificationMethod === 'state_bar_lookup' && licenseNumber && licenseState) {
        try {
          await lookupStateBarLicense(licenseNumber, licenseState)
          licenseVerificationSucceeded = true
          setLicenseVerified(true)
        } catch {
          // Continue to license upload page
        }
      } else if (verificationMethod === 'manual_upload' && selectedFile) {
        try {
          const formData = new FormData()
          formData.append('licenseFile', selectedFile)
          if (licenseNumber) formData.append('licenseNumber', licenseNumber)
          if (licenseState) formData.append('licenseState', licenseState)
          await uploadAttorneyLicense(formData)
          licenseVerificationSucceeded = true
          setLicenseVerified(true)
        } catch {
          // Continue
        }
      }

      navigate(licenseVerificationSucceeded ? '/attorney-dashboard' : '/attorney-license-upload')
    } catch (err: any) {
      const d = err.response?.data as { error?: string; details?: string | Record<string, unknown> } | undefined
      let msg = d?.error || err.message || 'Registration failed'
      if (d?.details && typeof d.details === 'string') {
        msg = `${msg}: ${d.details}`
      } else if (d?.details && typeof d.details === 'object' && 'fieldErrors' in d.details) {
        const fe = (d.details as { fieldErrors?: Record<string, string[]> }).fieldErrors
        if (fe && typeof fe === 'object') {
          const parts = Object.entries(fe).flatMap(([k, v]) =>
            Array.isArray(v) ? v.map((x) => `${k}: ${x}`) : [`${k}: ${String(v)}`]
          )
          if (parts.length) msg = parts.join(' · ')
        }
      }
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        setEmailExistsError(true)
        setError(null)
      } else {
        setError(msg)
        setEmailExistsError(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validation = validateAttorneyRegisterInput(form)
    setFieldErrors(validation.fieldErrors)

    if (!validation.data) {
      const messages = Object.values(validation.fieldErrors).filter(Boolean)
      setError(
        messages.length
          ? `Please fix: ${messages.join(' · ')}`
          : 'Please review the form and fix any highlighted fields.'
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    await onSubmit(validation.data)
  }

  const filteredStates = US_STATES.filter(
    (s) =>
      s.code.toLowerCase().includes(stateSearchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(stateSearchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <Link
            to="/"
            aria-label={t('common.appName')}
            className="inline-flex justify-center mb-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <BrandLogo appName={t('common.appName')} size="lg" />
          </Link>
          <h2 className="text-xl font-extrabold font-display text-gray-900 dark:text-slate-100 tracking-tight">
            Attorney Registration
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/attorney-login" className="font-medium text-brand-600 hover:text-brand-500">
              Sign in
            </Link>
          </p>
        </div>

        <AttorneyRegisterProgress currentStep={currentStep} />

        <div className="flex flex-col lg:flex-row gap-8">
          <form
            noValidate
            onSubmit={handleFormSubmit}
            className="flex-1 bg-white shadow rounded-xl border border-gray-200 p-6"
          >
            {currentStep === 1 && emailExistsError && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-2">This email already has an account.</p>
                <div className="flex flex-wrap gap-3">
                  <Link to="/attorney-login" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                    Sign in instead →
                  </Link>
                  <a href="#" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                    Reset password →
                  </a>
                </div>
              </div>
            )}

            {error && !emailExistsError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            {/* Step 1: Account — keep mounted so RHF values survive to final submit */}
            <div hidden={currentStep !== 1} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Account</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      className="input"
                    />
                    {fieldErrors.firstName && <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      className="input"
                    />
                    {fieldErrors.lastName && <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="input"
                  />
                  {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name</label>
                  <input
                    type="text"
                    value={form.firmName}
                    onChange={(e) => updateField('firmName', e.target.value)}
                    className="input"
                    placeholder="Owens Law Firm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firm Website</label>
                  <input
                    type="url"
                    value={form.firmWebsite}
                    onChange={(e) => updateField('firmWebsite', e.target.value)}
                    className="input"
                    placeholder="https://www.yourfirm.com"
                  />
                  {fieldErrors.firmWebsite && <p className="mt-1 text-xs text-red-600">{fieldErrors.firmWebsite}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State Bar Number</label>
                    <input
                      type="text"
                      value={form.stateBarNumber}
                      onChange={(e) => updateField('stateBarNumber', e.target.value)}
                      className="input"
                      placeholder="e.g., 123456"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <select
                      value={form.stateBarState}
                      onChange={(e) => updateField('stateBarState', e.target.value)}
                      className="input"
                    >
                      <option value="">Select</option>
                      {US_STATES.map((s) => (
                        <option key={s.code} value={s.code}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className="input"
                    />
                    {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="button" onClick={() => setCurrentStep(2)} className="btn-primary">
                    Next: Practice Areas
                  </button>
                </div>
              </div>

            {/* Step 2: Practice Areas */}
            <div hidden={currentStep !== 2} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Practice Areas & Jurisdictions</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Case Types You Accept *</label>
                  <p className="text-xs text-gray-500 mb-2">Primary case types</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CASE_TYPES.map((t) => (
                      <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={specialties.includes(t.value)}
                          onChange={() => toggleArray('specialties', t.value)}
                          className="rounded border-gray-300 text-brand-600"
                        />
                        <span className="text-sm">{t.label}</span>
                      </label>
                    ))}
                  </div>
                  {fieldErrors.specialties && <p className="mt-1 text-xs text-red-600">{fieldErrors.specialties}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Case Types</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CASE_TYPES.filter((t) => !specialties.includes(t.value)).map((t) => (
                      <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={watchedSecondary.includes(t.value)}
                          onChange={() => toggleArray('secondaryCaseTypes', t.value)}
                          className="rounded border-gray-300 text-brand-600"
                        />
                        <span className="text-sm">{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jurisdictions (States) *</label>
                  <input
                    type="text"
                    placeholder="Search states..."
                    value={stateSearchQuery}
                    onChange={(e) => setStateSearchQuery(e.target.value)}
                    className="input mb-2"
                  />
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {filteredStates.map((s) => (
                      <label
                        key={s.code}
                        className={`flex items-center gap-2 cursor-pointer p-2 rounded ${
                          venues.includes(s.code) ? 'bg-brand-50 border border-brand-200' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={venues.includes(s.code)}
                          onChange={() => toggleArray('venues', s.code)}
                          className="rounded border-gray-300 text-brand-600"
                        />
                        <span className="text-sm">{s.code}</span>
                      </label>
                    ))}
                  </div>
                  {fieldErrors.venues && <p className="mt-1 text-xs text-red-600">{fieldErrors.venues}</p>}
                </div>
                {venues.includes('CA') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Counties (CA)</label>
                      <div className="border rounded-lg p-3 max-h-32 overflow-y-auto bg-gray-50 grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {CA_COUNTIES.map((c) => (
                          <label key={c} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={watchedCounties.includes(c)}
                              onChange={() => toggleArray('preferredCounties', c)}
                              className="rounded border-gray-300 text-brand-600"
                            />
                            <span className="text-sm">{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Cities</label>
                      <input
                        type="text"
                        value={form.preferredCities}
                        onChange={(e) => updateField('preferredCities', e.target.value)}
                        className="input"
                        placeholder="e.g., Los Angeles, San Diego, Irvine"
                      />
                    </div>
                  </>
                )}
                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setCurrentStep(1)} className="btn-secondary">
                    Back
                  </button>
                  <button type="button" onClick={() => setCurrentStep(3)} className="btn-primary">
                    Next: Case Preferences
                  </button>
                </div>
              </div>

            {/* Step 3: Case Preferences */}
            <div hidden={currentStep !== 3} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Case Preferences</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Required</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={form.insuranceRequired === 'yes'}
                        onChange={() => updateField('insuranceRequired', 'yes')}
                        className="text-brand-600"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={form.insuranceRequired === 'no'}
                        onChange={() => updateField('insuranceRequired', 'no')}
                        className="text-brand-600"
                      />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Must Have Medical Treatment</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={form.mustHaveMedicalTreatment === 'yes'}
                        onChange={() => updateField('mustHaveMedicalTreatment', 'yes')}
                        className="text-brand-600"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={form.mustHaveMedicalTreatment === 'no'}
                        onChange={() => updateField('mustHaveMedicalTreatment', 'no')}
                        className="text-brand-600"
                      />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requirePoliceReport}
                      onChange={(e) => updateField('requirePoliceReport', e.target.checked)}
                      className="rounded text-brand-600"
                    />
                    <span className="text-sm">Require police report</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requireMedicalRecords}
                      onChange={(e) => updateField('requireMedicalRecords', e.target.checked)}
                      className="rounded text-brand-600"
                    />
                    <span className="text-sm">Require medical records</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Injury Severity</label>
                    <select
                      value={form.minInjurySeverity}
                      onChange={(e) => updateField('minInjurySeverity', e.target.value)}
                      className="input"
                    >
                      <option value="">No minimum</option>
                      <option value={0}>None</option>
                      <option value={1}>Mild</option>
                      <option value={2}>Moderate</option>
                      <option value={3}>Severe</option>
                      <option value={4}>Catastrophic</option>
                    </select>
                    {fieldErrors.minInjurySeverity && <p className="mt-1 text-xs text-red-600">{fieldErrors.minInjurySeverity}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Damages ($)</label>
                    <input
                      type="number"
                      value={form.minDamagesRange}
                      onChange={(e) => updateField('minDamagesRange', e.target.value)}
                      className="input"
                      placeholder="0"
                    />
                    {fieldErrors.minDamagesRange && <p className="mt-1 text-xs text-red-600">{fieldErrors.minDamagesRange}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Damages ($)</label>
                    <input
                      type="number"
                      value={form.maxDamagesRange}
                      onChange={(e) => updateField('maxDamagesRange', e.target.value)}
                      className="input"
                      placeholder="No max"
                    />
                    {fieldErrors.maxDamagesRange && <p className="mt-1 text-xs text-red-600">{fieldErrors.maxDamagesRange}</p>}
                  </div>
                </div>
                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setCurrentStep(2)} className="btn-secondary">
                    Back
                  </button>
                  <button type="button" onClick={() => setCurrentStep(4)} className="btn-primary">
                    Next: Capacity
                  </button>
                </div>
              </div>

            {/* Step 4: Capacity */}
            <div hidden={currentStep !== 4} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Lead Capacity</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { value: 'accept_immediately', label: 'Accept cases immediately' },
                      { value: 'pause', label: 'Pause intake' },
                      { value: 'vacation', label: 'Vacation mode' }
                    ].map((o) => (
                      <label
                        key={o.value}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                          form.intakeStatus === o.value ? 'border-brand-600 bg-brand-50' : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          checked={form.intakeStatus === o.value}
                          onChange={() => updateField('intakeStatus', o.value as AttorneyRegisterFormInput['intakeStatus'])}
                          className="sr-only"
                        />
                        <span className="text-sm">{o.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Cases Per Week</label>
                    <input
                      type="number"
                      value={form.maxCasesPerWeek}
                      onChange={(e) => updateField('maxCasesPerWeek', e.target.value)}
                      className="input"
                      placeholder="No limit"
                    />
                    {fieldErrors.maxCasesPerWeek && <p className="mt-1 text-xs text-red-600">{fieldErrors.maxCasesPerWeek}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Cases Per Month</label>
                    <input
                      type="number"
                      value={form.maxCasesPerMonth}
                      onChange={(e) => updateField('maxCasesPerMonth', e.target.value)}
                      className="input"
                      placeholder="No limit"
                    />
                    {fieldErrors.maxCasesPerMonth && <p className="mt-1 text-xs text-red-600">{fieldErrors.maxCasesPerMonth}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Consultation Method</label>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { value: 'phone', label: 'Phone' },
                      { value: 'zoom', label: 'Zoom' },
                      { value: 'in_person', label: 'In-person' }
                    ].map((o) => (
                      <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={form.preferredConsultationMethod === o.value}
                          onChange={() => updateField('preferredConsultationMethod', o.value as AttorneyRegisterFormInput['preferredConsultationMethod'])}
                          className="text-brand-600"
                        />
                        <span className="text-sm">{o.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Model</label>
                    <select
                      value={form.pricingModel}
                      onChange={(e) => updateField('pricingModel', e.target.value as AttorneyRegisterFormInput['pricingModel'])}
                      className="input"
                    >
                      <option value="">Select</option>
                      <option value="fixed_price">Fixed Price</option>
                      <option value="auction">Auction</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Model</label>
                    <select
                      value={form.paymentModel}
                      onChange={(e) => updateField('paymentModel', e.target.value as AttorneyRegisterFormInput['paymentModel'])}
                      className="input"
                    >
                      <option value="">Select</option>
                      <option value="subscription">Subscription</option>
                      <option value="pay_per_case">Pay Per Case</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setCurrentStep(3)} className="btn-secondary">
                    Back
                  </button>
                  <button type="button" onClick={() => setCurrentStep(5)} className="btn-primary">
                    Next: License Verification
                  </button>
                </div>
              </div>

            {/* Step 5: License Verification */}
            <div hidden={currentStep !== 5} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">License Verification</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setVerificationMethod('state_bar_lookup')}
                    className={`p-4 border-2 rounded-lg text-left ${
                      verificationMethod === 'state_bar_lookup' ? 'border-brand-600 bg-brand-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="font-medium">State Bar Lookup</div>
                    <div className="text-sm text-gray-500">Verify via state bar records</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerificationMethod('manual_upload')}
                    className={`p-4 border-2 rounded-lg text-left ${
                      verificationMethod === 'manual_upload' ? 'border-brand-600 bg-brand-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="font-medium">Manual Upload</div>
                    <div className="text-sm text-gray-500">Upload license document</div>
                  </button>
                </div>
                {verificationMethod === 'state_bar_lookup' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bar Number</label>
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className="input"
                        placeholder="License number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <select
                        value={licenseState}
                        onChange={(e) => setLicenseState(e.target.value)}
                        className="input"
                      >
                        <option value="">Select</option>
                        {US_STATES.map((s) => (
                          <option key={s.code} value={s.code}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {verificationMethod === 'manual_upload' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License File</label>
                    <div
                      className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg hover:border-brand-400"
                      onClick={() => document.getElementById('license-file')?.click()}
                    >
                      <input
                        id="license-file"
                        type="file"
                        className="sr-only"
                        accept=".pdf,.jpg,.jpeg,.png,.gif"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      {selectedFile ? (
                        <span className="text-sm text-gray-700">{selectedFile.name}</span>
                      ) : (
                        <span className="text-sm text-gray-500">Click to upload PDF or image</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Profile Preview */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Your ClearCaseIQ Profile</h4>
                  <p className="text-sm text-gray-600">
                    <strong>{firstName} {lastName}</strong>
                    {firmName && ` • ${firmName}`}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Practice Areas: {specialties.map((v) => CASE_TYPES.find((t) => t.value === v)?.label || v).join(', ') || '—'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Jurisdiction: {venues.join(', ') || '—'}
                  </p>
                </div>

                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setCurrentStep(4)} className="btn-secondary">
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Registering...' : 'Complete Registration'}
                  </button>
                </div>
              </div>
          </form>

          <aside className="lg:w-72 flex-shrink-0">
            <div className="lg:sticky lg:top-8">
              <AttorneyRegisterBenefits />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

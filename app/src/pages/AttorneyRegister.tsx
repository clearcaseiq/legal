import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerAttorney, lookupStateBarLicense, uploadAttorneyLicense, checkAttorneyEmailAvailable } from '../lib/api-auth'
import { US_STATES, CA_COUNTIES, ATTORNEY_CASE_TYPES } from '../lib/constants'
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
import { PasswordInputWithReveal } from '../components/PasswordInputWithReveal'
import { formatPhoneInput } from '../lib/phone'
import { CheckCircle, FileText, Globe, CreditCard } from 'lucide-react'

// Single source of truth for attorney practice areas (the canonical claimType
// enum used for routing/matching). Previously this page kept its own drifted
// copy (e.g. "Auto Accidents"), which contributed to the practice-area vs.
// incident-type inconsistency reported in #49.
const CASE_TYPES = ATTORNEY_CASE_TYPES

const POPULAR_STATES = ['CA', 'NV', 'AZ']
const PRACTICE_STATE_LIMIT = 9
const MVP_CA_COUNTIES = ['Los Angeles', 'Orange', 'Riverside', 'San Bernardino', 'Ventura', 'San Diego']

export default function AttorneyRegister() {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<AttorneyRegisterFieldErrors>({})
  const [emailExistsError, setEmailExistsError] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [stateSearchQuery, setStateSearchQuery] = useState('')
  const [verificationMethod, setVerificationMethod] = useState<'state_bar_lookup' | 'manual_upload'>('state_bar_lookup')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseState, setLicenseState] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [govIdFile, setGovIdFile] = useState<File | null>(null)
  const [showFirmWebsite, setShowFirmWebsite] = useState(false)
  const [licenseVerified, setLicenseVerified] = useState(false)
  const [form, setForm] = useState<AttorneyRegisterFormInput>(ATTORNEY_REGISTER_DEFAULTS)
  const navigate = useNavigate()

  const firstName = form.firstName
  const lastName = form.lastName
  const firmName = form.firmName
  const specialties = form.specialties
  const venues = form.venues
  const selectedCounties = form.preferredCounties

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

  const setStepError = (errors: AttorneyRegisterFieldErrors, fields: Array<keyof AttorneyRegisterFieldErrors>) => {
    const messages = fields.map((field) => errors[field]).filter(Boolean)
    setFieldErrors((prev) => ({ ...prev, ...errors }))
    if (messages.length) {
      setError(`Please fix: ${messages.join(' · ')}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    return messages.length > 0
  }

  const goToStep = async (nextStep: number) => {
    setError(null)
    const validation = validateAttorneyRegisterInput(form)
    const errors = validation.fieldErrors

    if (currentStep === 1 && setStepError(errors, ['email', 'password', 'firstName', 'lastName'])) return
    if (currentStep === 2 && setStepError(errors, ['specialties', 'venues'])) return
    if (currentStep === 3 && setStepError(errors, ['preferredCounties'])) return
    if (currentStep === 4 && setStepError(errors, ['maxCasesPerMonth'])) return

    // Surface an already-registered email at step 1 rather than after the whole
    // multi-step form is filled out and finally submitted (#63).
    if (currentStep === 1) {
      setEmailExistsError(false)
      try {
        setCheckingEmail(true)
        const available = await checkAttorneyEmailAvailable(form.email)
        if (!available) {
          setEmailExistsError(true)
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
      } catch {
        // Network/validation hiccup: don't block registration; the final submit
        // still enforces uniqueness server-side.
      } finally {
        setCheckingEmail(false)
      }
    }

    setCurrentStep(nextStep)
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
        cities: []
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
      } else if (verificationMethod === 'manual_upload' && (selectedFile || govIdFile)) {
        try {
          const formData = new FormData()
          // Prefer the bar card; fall back to the government ID so a selected
          // document is never silently dropped.
          formData.append('licenseFile', (selectedFile || govIdFile) as File)
          if (licenseNumber) formData.append('licenseNumber', licenseNumber)
          if (licenseState) formData.append('licenseState', licenseState)
          await uploadAttorneyLicense(formData)
          licenseVerificationSucceeded = true
          setLicenseVerified(true)
        } catch {
          // Continue
        }
      }

      // Require a saved card before reaching the dashboard, so accepting a case
      // charges the routing fee instantly instead of redirecting to checkout.
      const destination = licenseVerificationSucceeded ? '/attorney-dashboard' : '/attorney-license-upload'
      navigate(`/attorney-onboarding/payment?next=${encodeURIComponent(destination)}`)
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
        // Return to step 1 so the warning (and the email field) is visible and editable.
        setCurrentStep(1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
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

  // Trim so whitespace-only input (e.g. a stray space) doesn't trigger odd
  // partial matches or an empty "no results" state.
  const normalizedStateQuery = stateSearchQuery.trim().toLowerCase()
  const filteredStates = US_STATES.filter(
    (s) =>
      s.code.toLowerCase().includes(normalizedStateQuery) ||
      s.name.toLowerCase().includes(normalizedStateQuery)
  )
  const visibleStates = (normalizedStateQuery ? filteredStates : US_STATES.filter((state) => POPULAR_STATES.includes(state.code)))
    .slice(0, PRACTICE_STATE_LIMIT)
  const selectedStates = US_STATES.filter((state) => venues.includes(state.code))
  const visibleCaCounties = CA_COUNTIES.filter((county) => MVP_CA_COUNTIES.includes(county))
  const completionPercent = Math.round((currentStep / 5) * 100)

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

        <div className="flex flex-col lg:flex-row lg:items-start gap-8">
          <form
            noValidate
            onSubmit={handleFormSubmit}
            className="flex-1 bg-white shadow rounded-xl border border-gray-200 p-6"
          >
            {emailExistsError && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-2">This email already has an account.</p>
                <div className="flex flex-wrap gap-3">
                  <Link to="/attorney-login" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                    Sign in instead →
                  </Link>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Reset password →
                  </Link>
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
                      className={`input ${fieldErrors.firstName ? 'border-red-500' : ''}`}
                    />
                    {fieldErrors.firstName && <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      className={`input ${fieldErrors.lastName ? 'border-red-500' : ''}`}
                    />
                    {fieldErrors.lastName && <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className={`input ${fieldErrors.email ? 'border-red-500' : ''}`}
                    />
                    {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField('phone', formatPhoneInput(e.target.value))}
                      className={`input ${fieldErrors.phone ? 'border-red-500' : ''}`}
                      placeholder="(555) 123-4567"
                    />
                    {fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>}
                    <p className="mt-1 text-[11px] leading-snug text-gray-400">
                      By providing your phone number, you agree to receive SMS text messages from ClearCaseIQ about case
                      routing offers and case activity. Msg &amp; data rates may apply. Message frequency varies. Reply STOP
                      to opt out, HELP for help. Consent is not a condition of service. See our{' '}
                      <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-gray-600">Terms of Service</a>
                      {' '}&amp;{' '}
                      <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-gray-600">Privacy Policy</a>.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <PasswordInputWithReveal
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      disabled={isLoading}
                      className={`input ${fieldErrors.password ? 'border-red-500' : ''}`}
                    />
                    {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
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
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State Bar #</label>
                  <input
                    type="text"
                    value={form.stateBarNumber}
                    onChange={(e) => {
                      updateField('stateBarNumber', e.target.value)
                      setLicenseNumber(e.target.value)
                    }}
                    className="input"
                    placeholder="e.g., 123456"
                  />
                  <p className="mt-1 text-xs text-gray-500">We can verify license details after account creation.</p>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                  Firm website and bar-state verification can be completed later.
                </div>
                <div hidden aria-hidden="true">
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
                <div hidden aria-hidden="true">
                  <div>
                    <input type="url" value={form.firmWebsite} onChange={(e) => updateField('firmWebsite', e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="button" onClick={() => { void goToStep(2) }} disabled={checkingEmail} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
                    {checkingEmail ? 'Checking…' : 'Next: Practice Areas'}
                  </button>
                </div>
              </div>

            {/* Step 2: Practice Areas */}
            <div hidden={currentStep !== 2} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Practice Areas</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Which cases do you want? *</label>
                  <p className="mb-2 text-xs text-gray-500">These cover the same incident types clients select: "Slip &amp; Fall / Premises" also includes workplace and assault/negligent-security matters, and "Product Liability / Toxic" includes toxic-exposure claims.</p>
                  <div className="flex flex-wrap gap-2">
                    {CASE_TYPES.map((t) => (
                      <label
                        key={t.value}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                          specialties.includes(t.value) ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={specialties.includes(t.value)}
                          onChange={() => toggleArray('specialties', t.value)}
                          className="sr-only"
                        />
                        <span>{specialties.includes(t.value) ? '✓' : '+'}</span>
                        <span>{t.label}</span>
                      </label>
                    ))}
                  </div>
                  {fieldErrors.specialties && <p className="mt-1 text-xs text-red-600">{fieldErrors.specialties}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Where do you practice? *</label>
                  <input
                    type="text"
                    placeholder="Search states..."
                    value={stateSearchQuery}
                    onChange={(e) => setStateSearchQuery(e.target.value.replace(/^\s+/, ''))}
                    className="input mb-2"
                  />
                  {selectedStates.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedStates.map((s) => (
                        <button
                          key={s.code}
                          type="button"
                          onClick={() => toggleArray('venues', s.code)}
                          className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white"
                        >
                          {s.name}
                          <span aria-hidden="true">×</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {visibleStates.map((s) => (
                      <label
                        key={s.code}
                        className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-2 text-sm transition ${
                          venues.includes(s.code) ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={venues.includes(s.code)}
                          onChange={() => toggleArray('venues', s.code)}
                          className="sr-only"
                        />
                        <span>{venues.includes(s.code) ? '✓ ' : ''}{s.name}</span>
                      </label>
                    ))}
                  </div>
                  {!normalizedStateQuery && (
                    <p className="mt-2 text-xs text-gray-500">Start typing to find another state.</p>
                  )}
                  {fieldErrors.venues && <p className="mt-1 text-xs text-red-600">{fieldErrors.venues}</p>}
                </div>
                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setCurrentStep(1)} className="btn-secondary">
                    Back
                  </button>
                  <button type="button" onClick={() => { void goToStep(3) }} className="btn-primary">
                    Next: Service Area
                  </button>
                </div>
              </div>

            {/* Step 3: Service Area */}
            <div hidden={currentStep !== 3} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Service Area</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">How do you want to receive cases?</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      { value: 'state', label: 'Entire State' },
                      { value: 'counties', label: 'Selected Counties' },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-sm font-medium ${
                          (option.value === 'state' && selectedCounties.length === 0) ||
                          (option.value === 'counties' && selectedCounties.length > 0)
                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          checked={(option.value === 'state' && selectedCounties.length === 0) || (option.value === 'counties' && selectedCounties.length > 0)}
                          onChange={() => {
                            if (option.value !== 'counties') updateField('preferredCounties', [])
                          }}
                          className="sr-only"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
                {venues.includes('CA') ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">California counties</label>
                    <p className="mb-3 text-xs text-gray-500">County matters most for PI routing. Cities can be added later in Settings.</p>
                    <div className="flex flex-wrap gap-2">
                      {visibleCaCounties.map((county) => (
                        <label
                          key={county}
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                            selectedCounties.includes(county) ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCounties.includes(county)}
                            onChange={() => toggleArray('preferredCounties', county)}
                            className="sr-only"
                          />
                          <span>{selectedCounties.includes(county) ? '✓' : '+'}</span>
                          <span>{county} County</span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-gray-500">
                      Advanced rules like minimum damages, treatment requirements, police report preferences, and consultation method live in Settings after onboarding.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                    County preferences for your selected states can be added in Settings after verification.
                  </div>
                )}
                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setCurrentStep(2)} className="btn-secondary">
                    Back
                  </button>
                  <button type="button" onClick={() => { void goToStep(4) }} className="btn-primary">
                    Next: Capacity &amp; Availability
                  </button>
                </div>
              </div>

            {/* Step 4: Capacity & Availability */}
            <div hidden={currentStep !== 4} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Capacity &amp; Availability</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">How many new cases can you take?</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                    {[
                      { value: '5', label: '1-5/month' },
                      { value: '10', label: '5-10/month' },
                      { value: '25', label: '10-25/month' },
                      { value: '50', label: '25+/month' },
                    ].map((o) => (
                      <label
                        key={o.value}
                        className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-sm font-medium ${
                          form.maxCasesPerMonth === o.value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          checked={form.maxCasesPerMonth === o.value}
                          onChange={() => updateField('maxCasesPerMonth', o.value)}
                          className="sr-only"
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                  {fieldErrors.maxCasesPerMonth && <p className="mt-1 text-xs text-red-600">{fieldErrors.maxCasesPerMonth}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current status</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                      { value: 'accept_immediately', label: 'Accepting Cases', tone: 'text-emerald-700', dot: '●' },
                      { value: 'vacation', label: 'Limited Capacity', tone: 'text-amber-700', dot: '●' },
                      { value: 'pause', label: 'Pause Intake', tone: 'text-red-700', dot: '●' }
                    ].map((o) => (
                      <label
                        key={o.value}
                        className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium ${
                          form.intakeStatus === o.value ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          checked={form.intakeStatus === o.value}
                          onChange={() => updateField('intakeStatus', o.value as AttorneyRegisterFormInput['intakeStatus'])}
                          className="sr-only"
                        />
                        <span className={o.tone}>{o.dot}</span>
                        <span>{o.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Consultation method, pricing, and payment settings can be edited later.</p>
                </div>
                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setCurrentStep(3)} className="btn-secondary">
                    Back
                  </button>
                  <button type="button" onClick={() => { void goToStep(5) }} className="btn-primary">
                    Next: License Verification
                  </button>
                </div>
              </div>

            {/* Step 5: License Verification */}
            <div hidden={currentStep !== 5} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Verify Your License</h3>
                <p className="text-sm text-gray-600">
                  Upload what you have now. Anything missing can be completed after your account is created.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { id: 'license-file', label: 'Bar Card', helper: selectedFile?.name || 'PDF or image', Icon: FileText, selected: !!selectedFile },
                    { id: 'firm-website', label: 'Firm Website', helper: showFirmWebsite ? 'Enter URL below' : 'Add your website', Icon: Globe, selected: showFirmWebsite },
                    { id: 'government-id', label: 'Government ID', helper: govIdFile?.name || 'PDF or image', Icon: CreditCard, selected: !!govIdFile },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === 'license-file') {
                          setVerificationMethod('manual_upload')
                          document.getElementById('license-file')?.click()
                        } else if (item.id === 'government-id') {
                          setVerificationMethod('manual_upload')
                          document.getElementById('government-id')?.click()
                        } else if (item.id === 'firm-website') {
                          // Toggle so the card can be turned back off; clearing the
                          // value when hiding keeps the selected state honest (#62).
                          setShowFirmWebsite((prev) => {
                            if (prev) updateField('firmWebsite', '')
                            return !prev
                          })
                        }
                      }}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        item.selected ? 'border-brand-400 bg-brand-50' : 'border-gray-200 bg-white hover:border-brand-300'
                      }`}
                    >
                      <div className="mb-2">
                        {item.selected ? (
                          <CheckCircle className="h-6 w-6 text-emerald-600" />
                        ) : (
                          <item.Icon className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="font-medium text-gray-900">{item.label}</div>
                      <div className="mt-1 text-xs text-gray-500">{item.helper}</div>
                    </button>
                  ))}
                </div>
                {showFirmWebsite && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Firm Website</label>
                    <input
                      type="url"
                      value={form.firmWebsite}
                      onChange={(e) => updateField('firmWebsite', e.target.value)}
                      className={`input ${fieldErrors.firmWebsite ? 'border-red-500' : ''}`}
                      placeholder="https://yourfirm.com"
                    />
                    {fieldErrors.firmWebsite && <p className="mt-1 text-xs text-red-600">{fieldErrors.firmWebsite}</p>}
                  </div>
                )}
                <input
                  id="license-file"
                  type="file"
                  className="sr-only"
                  accept=".pdf,.jpg,.jpeg,.png,.gif"
                  onChange={(e) => {
                    setSelectedFile(e.target.files?.[0] || null)
                    // Reset so picking the same file again re-fires onChange (#62).
                    e.target.value = ''
                  }}
                />
                <input
                  id="government-id"
                  type="file"
                  className="sr-only"
                  accept=".pdf,.jpg,.jpeg,.png,.gif"
                  onChange={(e) => {
                    setGovIdFile(e.target.files?.[0] || null)
                    e.target.value = ''
                  }}
                />
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">Expected approval: Within 1 business day</p>
                  <p className="mt-1 text-sm text-emerald-800">
                    After verification, you can review matched case intelligence and contact plaintiffs directly.
                  </p>
                </div>

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
              <AttorneyRegisterBenefits currentStep={currentStep} completionPercent={completionPercent} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

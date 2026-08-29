import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerAttorney, lookupStateBarLicense, uploadAttorneyLicense, checkAttorneyEmailAvailable } from '../lib/api-auth'
import { US_STATES, ATTORNEY_CASE_TYPES } from '../lib/constants'
import { getCountiesForState } from '../lib/usLocationData'
import { useLanguage } from '../contexts/LanguageContext'
import {
  ATTORNEY_REGISTER_DEFAULTS,
  ATTORNEY_REGISTER_STEP_FIELDS,
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
import { CheckCircle, FileText, Globe, CreditCard, Info } from 'lucide-react'

// Single source of truth for attorney practice areas (the canonical claimType
// enum used for routing/matching). Previously this page kept its own drifted
// copy (e.g. "Auto Accidents"), which contributed to the practice-area vs.
// incident-type inconsistency reported in #49.
const CASE_TYPES = ATTORNEY_CASE_TYPES

const PRACTICE_STATE_LIMIT = 9

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
  const [form, setForm] = useState<AttorneyRegisterFormInput>(ATTORNEY_REGISTER_DEFAULTS)
  // Explicit service-area choice. Previously the "Entire State" vs "Selected
  // Counties" selection was inferred from whether any counties were picked,
  // which made the "Selected Counties" button unresponsive (clicking it with no
  // counties yet did nothing). Tracking the mode explicitly fixes that (A3-01).
  const [serviceAreaMode, setServiceAreaMode] = useState<'state' | 'counties'>(
    ATTORNEY_REGISTER_DEFAULTS.preferredCounties.length > 0 ? 'counties' : 'state',
  )
  const navigate = useNavigate()

  const firstName = form.firstName
  const lastName = form.lastName
  const firmName = form.firmName
  const specialties = form.specialties
  const venues = form.venues
  const selectedCounties = form.preferredCounties

  // Practice-area options reuse the exact incident-type labels a plaintiff sees
  // during intake (the `intake.injuryType_*` keys), so the attorney list can
  // never drift from the client-facing list and stays localized (#49).
  const practiceAreaOptions = CASE_TYPES.map((caseType) => {
    const localeKey = `intake.injuryType_${caseType.value}`
    const translated = t(localeKey)
    return {
      value: caseType.value,
      label: translated !== localeKey ? translated : caseType.label,
    }
  })

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

  // Firms that take the full range of injury work were having to tap twelve
  // chips to say so. Derived from the rendered options rather than the raw
  // constant so the control can never select a case type the attorney cannot see.
  const allSpecialtiesSelected =
    practiceAreaOptions.length > 0 &&
    practiceAreaOptions.every((opt) => specialties.includes(opt.value))
  const someSpecialtiesSelected = specialties.length > 0 && !allSpecialtiesSelected

  const toggleAllSpecialties = () => {
    updateField(
      'specialties',
      allSpecialtiesSelected ? [] : practiceAreaOptions.map((opt) => opt.value)
    )
  }

  const setStepError = (errors: AttorneyRegisterFieldErrors, fields: Array<keyof AttorneyRegisterFieldErrors>) => {
    const messages = fields.map((field) => errors[field]).filter(Boolean)
    setFieldErrors((prev) => ({ ...prev, ...errors }))
    if (messages.length) {
      setError(`${t('attorneyReg.pleaseFix')} ${messages.join(' · ')}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    return messages.length > 0
  }

  const goToStep = async (nextStep: number) => {
    setError(null)
    const validation = validateAttorneyRegisterInput(form, t)
    const errors = validation.fieldErrors

    const gatedFields = ATTORNEY_REGISTER_STEP_FIELDS[currentStep]
    if (gatedFields && setStepError(errors, gatedFields)) return

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

      // License verification is optional at signup. Best-effort upload/lookup if
      // the attorney provided something; never block access to the dashboard.
      if (verificationMethod === 'state_bar_lookup' && licenseNumber && licenseState) {
        try {
          await lookupStateBarLicense(licenseNumber, licenseState)
        } catch {
          // Verify later from profile settings.
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
        } catch {
          // Verify later from profile settings.
        }
      }

      navigate('/attorney-dashboard')
    } catch (err: any) {
      const d = err.response?.data as { error?: string; details?: string | Record<string, unknown> } | undefined
      let msg = d?.error || err.message || t('attorneyReg.registrationFailed')
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

  const submitRegistration = async () => {
    const validation = validateAttorneyRegisterInput(form, t)
    setFieldErrors(validation.fieldErrors)

    if (!validation.data) {
      const messages = Object.values(validation.fieldErrors).filter(Boolean)
      setError(
        messages.length
          ? `${t('attorneyReg.pleaseFix')} ${messages.join(' · ')}`
          : t('attorneyReg.reviewForm')
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    await onSubmit(validation.data)
  }

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await submitRegistration()
  }

  /** Finish signup without visiting or completing license verification. */
  const skipLicenseAndFinish = async () => {
    setError(null)
    const validation = validateAttorneyRegisterInput(form, t)
    const gatedFields = ATTORNEY_REGISTER_STEP_FIELDS[currentStep]
    if (gatedFields && setStepError(validation.fieldErrors, gatedFields)) return
    await submitRegistration()
  }

  // Trim so whitespace-only input (e.g. a stray space) doesn't trigger odd
  // partial matches or an empty "no results" state.
  const normalizedStateQuery = stateSearchQuery.trim().toLowerCase()
  const filteredStates = (() => {
    if (!normalizedStateQuery) return []
    const codeExact = US_STATES.filter((s) => s.code.toLowerCase() === normalizedStateQuery)
    if (codeExact.length > 0) return codeExact
    const nameStarts = US_STATES.filter((s) => s.name.toLowerCase().startsWith(normalizedStateQuery))
    if (nameStarts.length > 0) return nameStarts
    return US_STATES.filter((s) =>
      s.code.toLowerCase().includes(normalizedStateQuery) ||
      s.name.toLowerCase().includes(normalizedStateQuery)
    )
  })()
  const visibleStates = filteredStates.slice(0, PRACTICE_STATE_LIMIT)
  const selectedStates = US_STATES.filter((state) => venues.includes(state.code))
  const completionPercent = (() => {
    const fields: boolean[] = [
      !!form.firstName.trim(),
      !!form.lastName.trim(),
      !!form.email.trim(),
      !!form.phone.trim(),
      !!form.password,
      !!form.firmName.trim(),
      form.specialties.length > 0,
      form.venues.length > 0,
      !!form.maxCasesPerWeek.trim() || !!form.maxCasesPerMonth.trim(),
      !!form.stateBarNumber.trim(),
    ]
    return Math.round((fields.filter(Boolean).length / fields.length) * 100)
  })()

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
            {t('attorneyReg.title')}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {t('attorneyReg.alreadyHave')}{' '}
            <Link to="/attorney-login" className="font-medium text-brand-600 hover:text-brand-500">
              {t('auth.signIn')}
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
                <p className="text-sm font-medium text-amber-800 mb-2">{t('attorneyReg.emailExists')}</p>
                <div className="flex flex-wrap gap-3">
                  <Link to="/attorney-login" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                    {t('attorneyReg.signInInstead')}
                  </Link>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                  >
                    {t('attorneyReg.resetPassword')}
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
                <h3 className="text-lg font-medium text-gray-900">{t('attorneyReg.step1Title')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('attorneyReg.firstNameLabel')}</label>
                    <input
                      type="text"
                      maxLength={80}
                      value={form.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      className={`input ${fieldErrors.firstName ? 'border-red-500' : ''}`}
                    />
                    {fieldErrors.firstName && <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('attorneyReg.lastNameLabel')}</label>
                    <input
                      type="text"
                      maxLength={80}
                      value={form.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      className={`input ${fieldErrors.lastName ? 'border-red-500' : ''}`}
                    />
                    {fieldErrors.lastName && <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('attorneyReg.emailLabel')}</label>
                    <input
                      type="email"
                      maxLength={254}
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className={`input ${fieldErrors.email ? 'border-red-500' : ''}`}
                    />
                    {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      {t('attorneyReg.phoneLabel')}
                      <span className="group relative">
                        <Info className="h-3.5 w-3.5 cursor-help text-gray-400" aria-hidden />
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2.5 text-[11px] leading-snug font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                          {t('attorneyReg.smsTooltip')}
                        </span>
                      </span>
                    </label>
                    <input
                      type="tel"
                      maxLength={20}
                      value={form.phone}
                      onChange={(e) => updateField('phone', formatPhoneInput(e.target.value))}
                      className={`input ${fieldErrors.phone ? 'border-red-500' : ''}`}
                      placeholder="(555) 123-4567"
                    />
                    {fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('attorneyReg.passwordLabel')}</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('attorneyReg.firmNameLabel')}</label>
                    <input
                      type="text"
                      required
                      maxLength={160}
                      value={form.firmName}
                      onChange={(e) => updateField('firmName', e.target.value)}
                      className="input"
                      placeholder="Owens Law Firm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('attorneyReg.stateBarLabel')}</label>
                  <input
                    type="text"
                    maxLength={40}
                    value={form.stateBarNumber}
                    onChange={(e) => {
                      updateField('stateBarNumber', e.target.value)
                      setLicenseNumber(e.target.value)
                    }}
                    className="input"
                    placeholder="e.g., 123456"
                  />
                  <p className="mt-1 text-xs text-gray-500">{t('attorneyReg.stateBarHelp')}</p>
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
                    <input type="url" maxLength={200} value={form.firmWebsite} onChange={(e) => updateField('firmWebsite', e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="button" onClick={() => { void goToStep(2) }} disabled={checkingEmail} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
                    {checkingEmail ? t('attorneyReg.checking') : t('attorneyReg.next2')}
                  </button>
                </div>
              </div>

            {/* Step 2: Practice & Service Area */}
            <div hidden={currentStep !== 2} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">{t('attorneyReg.step2Title')}</h3>
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-sm font-medium text-gray-700">{t('attorneyReg.casesWantLabel')}</label>
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allSpecialtiesSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSpecialtiesSelected
                        }}
                        onChange={toggleAllSpecialties}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-xs font-semibold text-gray-600">{t('attorneyReg.selectAllCases')}</span>
                    </label>
                  </div>
                  <p className="mb-2 text-xs text-gray-500">{t('attorneyReg.casesWantHelp')}</p>
                  <div className="flex flex-wrap gap-2">
                    {practiceAreaOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                          specialties.includes(opt.value) ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={specialties.includes(opt.value)}
                          onChange={() => toggleArray('specialties', opt.value)}
                          className="sr-only"
                        />
                        <span>{specialties.includes(opt.value) ? '✓' : '+'}</span>
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  {fieldErrors.specialties && <p className="mt-1 text-xs text-red-600">{fieldErrors.specialties}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('attorneyReg.whereLabel')}</label>
                  <input
                    type="text"
                    placeholder={t('attorneyReg.searchStates')}
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
                    <p className="mt-2 text-xs text-gray-500">{t('attorneyReg.typeToFind')}</p>
                  )}
                  {fieldErrors.venues && <p className="mt-1 text-xs text-red-600">{fieldErrors.venues}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('attorneyReg.receiveHowLabel')}</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      { value: 'state', label: t('attorneyReg.entireState') },
                      { value: 'counties', label: t('attorneyReg.selectedCounties') },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-sm font-medium ${
                          serviceAreaMode === option.value
                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          checked={serviceAreaMode === option.value}
                          onChange={() => {
                            if (option.value === 'counties') {
                              setServiceAreaMode('counties')
                            } else {
                              setServiceAreaMode('state')
                              updateField('preferredCounties', [])
                            }
                          }}
                          className="sr-only"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
                {serviceAreaMode === 'counties' && venues.length > 0 && (
                  <div className="space-y-4">
                    {venues.map((stateCode) => {
                      const stateCounties = getCountiesForState(stateCode)
                      if (stateCounties.length === 0) return null
                      const stateName = US_STATES.find((s) => s.code === stateCode)?.name || stateCode
                      return (
                        <div key={stateCode}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('attorneyReg.countiesIn')} {stateName}</label>
                          <div className="flex flex-wrap gap-2">
                            {stateCounties.map((county) => (
                              <label
                                key={`${stateCode}-${county}`}
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
                                <span>{county}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setCurrentStep(1)} className="btn-secondary">
                    {t('attorneyReg.back')}
                  </button>
                  <button type="button" onClick={() => { void goToStep(3) }} className="btn-primary">
                    {t('attorneyReg.next3')}
                  </button>
                </div>
              </div>

            {/* Step 3: Capacity & Availability */}
            <div hidden={currentStep !== 3} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">{t('attorneyReg.step3Title')}</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('attorneyReg.howManyLabel')}</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                    {[
                      { value: '5', label: t('attorneyReg.cap1') },
                      { value: '10', label: t('attorneyReg.cap2') },
                      { value: '25', label: t('attorneyReg.cap3') },
                      { value: '50', label: t('attorneyReg.cap4') },
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
                  {/* Availability / intake status is an operational setting that
                      belongs on the dashboard after the account is active, not at
                      registration where there is nothing to pause yet (A3-02). New
                      registrants default to "accepting" and can change it later. */}
                  <p className="mt-2 text-xs text-gray-500">{t('attorneyReg.capacityNote')}</p>
                </div>
                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => setCurrentStep(2)} className="btn-secondary">
                    {t('attorneyReg.back')}
                  </button>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => { void skipLicenseAndFinish() }}
                      className="order-2 text-sm font-semibold text-slate-600 underline decoration-dotted underline-offset-2 hover:text-slate-900 disabled:opacity-50 sm:order-1 sm:no-underline sm:rounded-lg sm:border sm:border-slate-300 sm:bg-white sm:px-4 sm:py-2 sm:hover:bg-slate-50"
                    >
                      {isLoading ? t('attorneyReg.registering') : t('attorneyReg.skipLicense')}
                    </button>
                    <button type="button" onClick={() => { void goToStep(4) }} className="order-1 btn-primary sm:order-2">
                      {t('attorneyReg.next4')}
                    </button>
                  </div>
                </div>
              </div>

            {/* Step 4: License Verification (optional — can finish without uploading) */}
            <div hidden={currentStep !== 4} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">{t('attorneyReg.step4Title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('attorneyReg.uploadNow')}
                </p>
                <p className="text-sm text-slate-500">
                  {t('attorneyReg.licenseOptionalNote')}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { id: 'license-file', label: t('attorneyReg.barCard'), helper: selectedFile?.name || t('attorneyReg.pdfOrImage'), Icon: FileText, selected: !!selectedFile },
                    { id: 'firm-website', label: t('attorneyReg.firmWebsiteLabel'), helper: showFirmWebsite ? t('attorneyReg.enterUrlBelow') : t('attorneyReg.addWebsite'), Icon: Globe, selected: showFirmWebsite },
                    { id: 'government-id', label: t('attorneyReg.govId'), helper: govIdFile?.name || t('attorneyReg.pdfOrImage'), Icon: CreditCard, selected: !!govIdFile },
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('attorneyReg.firmWebsiteLabel')}</label>
                    <input
                      type="url"
                      maxLength={200}
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
                  <p className="text-sm font-semibold text-emerald-900">{t('attorneyReg.expectedApproval')}</p>
                  <p className="mt-1 text-sm text-emerald-800">
                    {t('attorneyReg.afterVerificationNote')}
                  </p>
                </div>

                {/* Profile Preview */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">{t('attorneyReg.profileTitle')}</h4>
                  <p className="text-sm text-gray-600">
                    <strong>{firstName} {lastName}</strong>
                    {firmName && ` • ${firmName}`}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('attorneyReg.practiceAreasLabel')} {specialties.map((v) => practiceAreaOptions.find((o) => o.value === v)?.label || v).join(', ') || '—'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t('attorneyReg.jurisdictionLabel')} {venues.join(', ') || '—'}
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => setCurrentStep(3)} className="btn-secondary">
                    {t('attorneyReg.back')}
                  </button>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="order-2 text-sm font-semibold text-slate-600 underline decoration-dotted underline-offset-2 hover:text-slate-900 disabled:opacity-50 sm:order-1 sm:no-underline sm:rounded-lg sm:border sm:border-slate-300 sm:bg-white sm:px-4 sm:py-2 sm:hover:bg-slate-50"
                    >
                      {isLoading ? t('attorneyReg.registering') : t('attorneyReg.skipLicense')}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="order-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed sm:order-2"
                    >
                      {isLoading ? t('attorneyReg.registering') : t('attorneyReg.completeRegistration')}
                    </button>
                  </div>
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

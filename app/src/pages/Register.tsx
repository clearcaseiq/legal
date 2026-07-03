import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { register } from '../lib/api-auth'
import { createConsent } from '../lib/api-consent'
import { associateAssessments, listAssessments } from '../lib/api-plaintiff'
import OAuthButtons from '../components/OAuthButtons'
import ConsentWorkflow from '../components/ConsentWorkflow'
import BrandLogo from '../components/BrandLogo'
import { PasswordInputWithReveal } from '../components/PasswordInputWithReveal'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'
import { resetCachedPlaintiffSessionSummary, updateCachedPlaintiffAssessments, updateCachedPlaintiffUser } from '../hooks/usePlaintiffSessionSummary'
import { type RegisterFieldErrors, type RegisterInput, validateRegisterInput } from '../lib/registerValidation'
import { formatPhoneInput } from '../lib/phone'
import { clearPendingRegistration, getPendingRegistration } from '../lib/pendingRegistration'

// Turn an email local-part into a friendly first name when intake didn't collect
// one (e.g. "joe.rogan@x.com" → "Joe"). Falls back to "there" so the required
// name is never empty. The user can change it later in their profile.
function deriveFirstNameFromEmail(email: string): string {
  const local = (email.split('@')[0] || '').trim()
  const first = local.split(/[._\-+\d]+/).filter(Boolean)[0] || local
  if (!first) return 'there'
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

export default function Register() {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<RegisterInput>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
  })
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({})
  const [showConsentWorkflow, setShowConsentWorkflow] = useState(false)
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null)
  const [acceptedLegalSignup, setAcceptedLegalSignup] = useState(false)
  const [consentSaving, setConsentSaving] = useState(false)
  const [consentSaveError, setConsentSaveError] = useState<string | null>(null)
  // When the user came from intake we already know their contact details, so the
  // signup collapses to "set a password". They can still expand to edit anything.
  const [streamlined, setStreamlined] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const assessmentId = searchParams.get('assessmentId')
  // After an intake signup, send the user straight to their dashboard (with the
  // new case linked). Otherwise honor an explicit redirect or fall back home.
  const redirectTo = assessmentId
    ? `/dashboard?case=${encodeURIComponent(assessmentId)}`
    : searchParams.get('redirect') || '/dashboard'

  // Persist assessmentId for OAuth flow (assessmentId is lost during OAuth redirect)
  useEffect(() => {
    if (assessmentId) {
      localStorage.setItem('pending_assessment_id', assessmentId)
    }
  }, [assessmentId])

  // Prefill the details the plaintiff already gave during intake so they only
  // need to set a password to finish.
  useEffect(() => {
    const pending = getPendingRegistration()
    const hasPrefill = Boolean(pending.firstName || pending.email || pending.phone)
    if (!hasPrefill) return
    setForm((current) => ({
      ...current,
      firstName: pending.firstName || current.firstName,
      lastName: pending.lastName || current.lastName,
      email: pending.email || current.email,
      phone: pending.phone ? formatPhoneInput(pending.phone) : current.phone,
    }))
    // Only treat it as the streamlined "just set a password" flow when we have an
    // email (the account identifier). Phone-only intakes still need an email.
    setStreamlined(Boolean(pending.email))
  }, [])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Intake never asks for a name, so in the streamlined flow derive a friendly
    // first name from the email local-part (e.g. joe@rogan.com → "Joe") when one
    // wasn't provided. It stays editable later in the profile.
    const derivedFirstName = form.firstName.trim() || deriveFirstNameFromEmail(form.email)
    const normalizedForm = { ...form, firstName: derivedFirstName }
    const nextFieldErrors = validateRegisterInput(normalizedForm)
    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length > 0) {
      // In the collapsed streamlined view the name/email/phone inputs are hidden;
      // expand them so any validation error (e.g. an invalid email) is visible
      // instead of the button appearing to do nothing.
      setShowDetails(true)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await register({
        firstName: derivedFirstName,
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
      })
      
      // Store the auth token
      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      localStorage.setItem('auth_role', 'plaintiff')
      resetCachedPlaintiffSessionSummary()
      updateCachedPlaintiffUser(response.user)

      if (assessmentId) {
        try {
          await associateAssessments([assessmentId])
          const assessments = await listAssessments()
          updateCachedPlaintiffAssessments(assessments || [])
          localStorage.removeItem('pending_assessment_id')
        } catch (error) {
          console.error('Failed to associate assessment after register:', error)
        }
      }
      
      clearPendingRegistration()

      // Set up consent workflow
      setRegisteredUserId(response.user.id)
      showToast({
        variant: 'success',
        title: 'Account created',
        message: 'Review the agreements and e-sign once to continue.',
      })
      setShowConsentWorkflow(true)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConsentComplete = async (consents: any[]) => {
    setConsentSaving(true)
    setConsentSaveError(null)
    try {
      for (const consent of consents) {
        await createConsent({
          ...consent,
          expiresAt:
            consent.consentType === 'marketing'
              ? undefined
              : new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
      navigate(redirectTo)
    } catch (error: unknown) {
      console.error('Error saving consents:', error)
      const ax = error as { response?: { data?: { error?: string } }; message?: string }
      const message =
        ax.response?.data?.error || ax.message || 'Could not save your signatures. Please try again.'
      setConsentSaveError(message)
      showToast({
        variant: 'error',
        title: 'Could not save agreements',
        message,
      })
    } finally {
      setConsentSaving(false)
    }
  }

  const handleConsentCancel = () => {
    setShowConsentWorkflow(false)
    setRegisteredUserId(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    localStorage.removeItem('auth_role')
    showToast({
      variant: 'info',
      title: 'Signed out',
      message: 'Complete agreements when you register again to use case features.',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      {consentSaving && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="rounded-xl bg-white dark:bg-slate-900 px-6 py-4 shadow-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100">
            Saving your agreements…
          </div>
        </div>
      )}
      {consentSaveError && showConsentWorkflow && (
        <div
          className="fixed top-0 left-0 right-0 z-[199] px-4 py-3 bg-red-50 border-b border-red-200 text-sm text-red-800 text-center shadow-sm"
          role="alert"
        >
          {consentSaveError}
        </div>
      )}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Link
            to="/"
            aria-label={t('common.appName')}
            className="inline-flex justify-center mb-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <BrandLogo appName={t('common.appName')} size="lg" />
          </Link>
          <p className="text-sm text-gray-600 dark:text-slate-400">AI-Powered Legal Assessment Platform</p>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {streamlined ? "You're almost done" : 'Create your account'}
        </h2>
        {streamlined ? (
          <p className="mt-2 text-center text-sm text-gray-600">
            We saved the details from your case. Just set a password to finish and open your dashboard.
          </p>
        ) : (
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-500">
              Sign in
            </Link>
            {' '}•{' '}
            <Link to="/attorney-register" className="font-medium text-brand-600 hover:text-brand-500">
              Attorney Sign Up
            </Link>
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* OAuth Registration Buttons */}
          <div className="mb-6">
            <OAuthButtons onError={setError} disabled={isLoading || !acceptedLegalSignup} />
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or create account with email</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={onSubmit}>
            {(!streamlined || showDetails) ? (
            <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First name
                </label>
                <div className="mt-1">
                  <input
                    id="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, firstName: event.target.value }))
                      setFieldErrors((current) => ({ ...current, firstName: undefined }))
                    }}
                    className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm ${fieldErrors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="John"
                  />
                </div>
                {fieldErrors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last name <span className="text-gray-400">(optional)</span>
                </label>
                <div className="mt-1">
                  <input
                    id="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, lastName: event.target.value }))
                      setFieldErrors((current) => ({ ...current, lastName: undefined }))
                    }}
                    className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm ${fieldErrors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Doe"
                  />
                </div>
                {fieldErrors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, email: event.target.value }))
                    setFieldErrors((current) => ({ ...current, email: undefined }))
                  }}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm ${fieldErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="john@example.com"
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>
            </>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {[form.firstName, form.lastName].filter(Boolean).join(' ') || 'Your account'}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-gray-600">{form.email}</p>
                    {form.phone && <p className="mt-0.5 text-sm text-gray-600">{form.phone}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDetails(true)}
                    className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-500"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <PasswordInputWithReveal
                  id="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, password: event.target.value }))
                    setFieldErrors((current) => ({ ...current, password: undefined }))
                  }}
                  disabled={isLoading}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm ${fieldErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="••••••••"
                />
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            {(!streamlined || showDetails) && (
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone number (optional)
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, phone: formatPhoneInput(event.target.value) }))
                    setFieldErrors((current) => ({ ...current, phone: undefined }))
                  }}
                  aria-invalid={!!fieldErrors.phone}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm ${fieldErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="(555) 123-4567"
                />
                {fieldErrors.phone && <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>}
              </div>
            </div>
            )}

            <div className="flex gap-2 items-start">
              <input
                id="accept-legal-signup"
                type="checkbox"
                checked={acceptedLegalSignup}
                onChange={(e) => setAcceptedLegalSignup(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="accept-legal-signup" className="text-sm text-gray-700 dark:text-slate-300">
                I agree to create an account. Right after signup I will review and electronically sign the{' '}
                <Link to="/terms-of-service" className="font-medium text-brand-600 hover:text-brand-500" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </Link>
                ,{' '}
                <Link to="/privacy-policy" className="font-medium text-brand-600 hover:text-brand-500" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </Link>
                , and{' '}
                <Link to="/hipaa-authorization" className="font-medium text-brand-600 hover:text-brand-500" target="_blank" rel="noopener noreferrer">
                  HIPAA authorization
                </Link>{' '}
                in one combined step (same versions as those pages; your signature applies to each).
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || !acceptedLegalSignup}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue without account</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/assess?fresh=1"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                Continue as guest
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Consent Workflow Modal */}
      {showConsentWorkflow && registeredUserId && (
        <ConsentWorkflow
          userId={registeredUserId}
          requiredConsents={['terms', 'privacy', 'hipaa']}
          flow="combined"
          onComplete={handleConsentComplete}
          onCancel={handleConsentCancel}
        />
      )}
    </div>
  )
}

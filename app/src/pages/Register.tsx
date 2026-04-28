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
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const assessmentId = searchParams.get('assessmentId')
  const rawRedirectTo = searchParams.get('redirect') || (assessmentId ? `/results/${assessmentId}` : '/dashboard')
  const redirectTo = assessmentId && rawRedirectTo === '/dashboard'
    ? `/dashboard?case=${encodeURIComponent(assessmentId)}`
    : rawRedirectTo

  // Persist assessmentId for OAuth flow (assessmentId is lost during OAuth redirect)
  useEffect(() => {
    if (assessmentId) {
      localStorage.setItem('pending_assessment_id', assessmentId)
    }
  }, [assessmentId])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextFieldErrors = validateRegisterInput(form)
    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length > 0) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await register({
        firstName: form.firstName.trim(),
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
      
      // Set up consent workflow
      setRegisteredUserId(response.user.id)
      showToast({
        variant: 'success',
        title: 'Account created',
        message: 'Review the agreements and e-sign once to continue.',
      })
      setShowConsentWorkflow(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed')
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
          Create your account
        </h2>
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
            <div className="grid grid-cols-2 gap-4">
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
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                    placeholder="John"
                  />
                </div>
                {fieldErrors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last name
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
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
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
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder="john@example.com"
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

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
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
              )}
            </div>

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
                    setForm((current) => ({ ...current, phone: event.target.value }))
                    setFieldErrors((current) => ({ ...current, phone: undefined }))
                  }}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

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
                to="/"
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

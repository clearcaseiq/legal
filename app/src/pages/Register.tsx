import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Bell, CheckCircle, FileText, Headset, Lock, MessageSquare, ShieldCheck, UploadCloud } from 'lucide-react'
import { register } from '../lib/api-auth'
import { createConsent } from '../lib/api-consent'
import { associateAssessments, claimAssessmentByToken, listAssessments } from '../lib/api-plaintiff'
import OAuthButtons from '../components/OAuthButtons'
import ConsentWorkflow from '../components/ConsentWorkflow'
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
  // Resolved from a claim link (?claim=<token>) after registration, so the final
  // redirect lands on the just-claimed case.
  const [claimedAssessmentId, setClaimedAssessmentId] = useState<string | null>(null)
  const [acceptedLegalSignup, setAcceptedLegalSignup] = useState(false)
  // Set while an already-signed-in visitor's claim link is being redeemed, and
  // when a signup fails only because the account already exists.
  const [claimingExistingSession, setClaimingExistingSession] = useState(false)
  const [offerSignIn, setOfferSignIn] = useState(false)
  const [consentSaving, setConsentSaving] = useState(false)
  const [consentSaveError, setConsentSaveError] = useState<string | null>(null)
  // When the user came from intake we already know their contact details, so the
  // signup collapses to "set a password". They can still expand to edit anything.
  const [streamlined, setStreamlined] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const assessmentId = searchParams.get('assessmentId')
  // Signed "claim your case" token from the guest confirmation email. Names the
  // exact case to attach to the new account (see /assessments/claim).
  const claimToken = searchParams.get('claim')
  // After an intake signup, send the user straight to their dashboard (with the
  // new case linked). Otherwise honor an explicit redirect or fall back home.
  const redirectTo = assessmentId
    ? `/dashboard?case=${encodeURIComponent(assessmentId)}`
    : searchParams.get('redirect') || '/dashboard'
  // The case identifier has to ride along to sign-in, whichever form it takes.
  // The confirmation email offers only "create an account", so anyone who
  // already had one used to arrive at a signup form they could not complete,
  // with no way to attach their case; and a just-submitted assessment sent to
  // bare /login was never associated with the account they signed into, so the
  // dashboard came up empty right after they had finished the intake.
  const signInParams = new URLSearchParams()
  if (claimToken) signInParams.set('claim', claimToken)
  if (assessmentId) signInParams.set('assessmentId', assessmentId)
  const signInHref = signInParams.toString() ? `/login?${signInParams}` : '/login'

  // Account benefits shown as tiles so guests can see what an account unlocks.
  const accountFeatures = [
    { icon: Bell, title: 'auth.featTrackTitle', desc: 'auth.featTrackDesc', wrap: 'bg-emerald-50 text-emerald-600' },
    { icon: UploadCloud, title: 'auth.featUploadTitle', desc: 'auth.featUploadDesc', wrap: 'bg-blue-50 text-blue-600' },
    { icon: FileText, title: 'auth.featReportTitle', desc: 'auth.featReportDesc', wrap: 'bg-violet-50 text-violet-600' },
    { icon: MessageSquare, title: 'auth.featMessagesTitle', desc: 'auth.featMessagesDesc', wrap: 'bg-emerald-50 text-emerald-600' },
    { icon: Lock, title: 'auth.featPrivacyTitle', desc: 'auth.featPrivacyDesc', wrap: 'bg-blue-50 text-blue-600' },
  ]
  const emailLooksValid = /\S+@\S+\.\S+/.test(form.email.trim())

  // Persist assessmentId for OAuth flow (assessmentId is lost during OAuth redirect)
  useEffect(() => {
    if (assessmentId) {
      localStorage.setItem('pending_assessment_id', assessmentId)
    }
  }, [assessmentId])

  // A visitor who is already signed in has nothing to register. Redeem the case
  // and take them to it rather than showing a signup form they cannot use.
  useEffect(() => {
    if (!claimToken) return
    // Only a plaintiff session may claim. Attaching the case to a signed-in
    // attorney or staff user would hand the case to the wrong account.
    const isPlaintiffSession =
      Boolean(localStorage.getItem('auth_token')) && localStorage.getItem('auth_role') === 'plaintiff'
    if (!isPlaintiffSession) return

    let cancelled = false
    setClaimingExistingSession(true)
    claimAssessmentByToken(claimToken)
      .then(async (result) => {
        if (cancelled || !result?.assessmentId) return
        const assessments = await listAssessments()
        updateCachedPlaintiffAssessments(assessments || [])
        navigate(`/dashboard?case=${encodeURIComponent(result.assessmentId)}`, { replace: true })
      })
      .catch((claimError) => {
        console.error('Failed to claim case for signed-in user:', claimError)
        if (!cancelled) setError(t('auth.claimAttachFailed'))
      })
      .finally(() => {
        if (!cancelled) setClaimingExistingSession(false)
      })

    return () => {
      cancelled = true
    }
  }, [claimToken])

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
    const nextFieldErrors = validateRegisterInput(normalizedForm, t)
    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length > 0) {
      return
    }

    setIsLoading(true)
    setError(null)
    setOfferSignIn(false)

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
      localStorage.removeItem('attorney')
      localStorage.removeItem('firm_member')
      localStorage.removeItem('admin_capabilities')
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

      // Attach the case named by the emailed claim link, then send the user to
      // that case once consent is done.
      if (claimToken) {
        try {
          const claimResult = await claimAssessmentByToken(claimToken)
          if (claimResult?.assessmentId) {
            setClaimedAssessmentId(claimResult.assessmentId)
            const assessments = await listAssessments()
            updateCachedPlaintiffAssessments(assessments || [])
          }
        } catch (error) {
          console.error('Failed to claim case after register:', error)
        }
      }

      clearPendingRegistration()

      // Set up consent workflow
      setRegisteredUserId(response.user.id)
      showToast({
        variant: 'success',
        title: t('auth.toastAccountCreatedTitle'),
        message: t('auth.toastAccountCreatedMsg'),
      })
      setShowConsentWorkflow(true)
    } catch (err: any) {
      // "User already exists" is a wrong turn rather than a failure: the person
      // has an account and needs to sign in. Left as a raw error it dead-ends
      // anyone following a claim link, because their case is only attachable
      // once they are authenticated.
      if (err.response?.status === 409) {
        setError(t('auth.claimAlreadyRegistered'))
        setOfferSignIn(true)
      } else {
        setError(err.response?.data?.error || err.message || 'Registration failed. Please try again.')
      }
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
        // Keep the intake / Supporting Documents client gate in sync with registration.
        try {
          if (consent.consentType === 'hipaa') localStorage.setItem('consent_read_hipaa', 'true')
          if (consent.consentType === 'terms') localStorage.setItem('consent_read_tos', 'true')
          if (consent.consentType === 'privacy') localStorage.setItem('consent_read_privacy', 'true')
        } catch {
          /* ignore quota / private mode */
        }
      }
      navigate(claimedAssessmentId ? `/dashboard?case=${encodeURIComponent(claimedAssessmentId)}` : redirectTo)
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

  if (claimingExistingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-sm text-slate-600">{t('auth.claimAttaching')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-start pt-6 pb-12 sm:px-6 lg:px-8 relative">
      {consentSaving && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="rounded-xl bg-white dark:bg-slate-900 px-6 py-4 shadow-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100">
            {t('auth.savingAgreements')}
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
      <div className="sm:mx-auto sm:w-full sm:max-w-[1600px]">
        {streamlined && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <CheckCircle className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-900">{t('auth.caseSubmittedBanner')}</p>
              <p className="text-xs leading-snug text-emerald-800/90">{t('auth.caseSubmittedBannerSub')}</p>
            </div>
          </div>
        )}
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {streamlined ? (
            <>
              {t('auth.almostDoneTitle')} <span aria-hidden>🎉</span>
            </>
          ) : (
            t('auth.createAccountTitle')
          )}
        </h2>
        {streamlined && (
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth.streamlinedSubtitle')}
          </p>
        )}
        {/* Shown even in the streamlined flow whenever the case can ride along
            to sign-in, which otherwise offers no way to reach it: a returning
            user who already has an account was left with a signup form as the
            only exit from their own submitted case. */}
        {(!streamlined || claimToken || assessmentId) && (
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to={signInHref} className="font-medium text-brand-600 hover:text-brand-500">
              {t('auth.signIn')}
            </Link>
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[1600px]">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
              {offerSignIn && (
                <Link
                  to={signInHref}
                  className="mt-2 inline-block text-sm font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700"
                >
                  {claimToken ? t('auth.claimSignInToAttach') : t('auth.signIn')}
                </Link>
              )}
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[28rem_26rem] lg:items-start lg:justify-center lg:gap-24">
            <div className="mx-auto w-full max-w-md lg:mx-0">
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
              <span className="px-2 bg-white text-gray-500">{t('auth.orCreateWithEmail')}</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  {t('auth.firstNameLabel')}
                </label>
                <div className="relative mt-1">
                  <input
                    id="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, firstName: event.target.value }))
                      setFieldErrors((current) => ({ ...current, firstName: undefined }))
                    }}
                    className={`appearance-none block w-full rounded-md border px-3 py-2 pr-10 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-brand-500 sm:text-sm ${fieldErrors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="John"
                  />
                  {form.firstName.trim() && !fieldErrors.firstName && (
                    <CheckCircle className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-500" aria-hidden />
                  )}
                </div>
                {fieldErrors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  {t('auth.lastNameLabel')} <span className="text-gray-400">{t('auth.optionalSuffix')}</span>
                </label>
                <div className="relative mt-1">
                  <input
                    id="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, lastName: event.target.value }))
                      setFieldErrors((current) => ({ ...current, lastName: undefined }))
                    }}
                    className={`appearance-none block w-full rounded-md border px-3 py-2 pr-10 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-brand-500 sm:text-sm ${fieldErrors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Doe"
                  />
                  {form.lastName.trim() && !fieldErrors.lastName && (
                    <CheckCircle className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-500" aria-hidden />
                  )}
                </div>
                {fieldErrors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth.emailLabel')}
              </label>
              <div className="relative mt-1">
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, email: event.target.value }))
                    setFieldErrors((current) => ({ ...current, email: undefined }))
                  }}
                  className={`appearance-none block w-full rounded-md border px-3 py-2 pr-10 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-brand-500 sm:text-sm ${fieldErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="john@example.com"
                />
                {emailLooksValid && !fieldErrors.email && (
                  <CheckCircle className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-500" aria-hidden />
                )}
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {t('auth.passwordLabel')}
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
                    className={`appearance-none block w-full rounded-md border px-3 py-2 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-brand-500 sm:text-sm ${fieldErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="••••••••"
                  />
                </div>
                {fieldErrors.password ? (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">{t('auth.passwordHint')}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  {t('auth.phoneOptionalLabel')}
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
                    className={`appearance-none block w-full rounded-md border px-3 py-2 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-brand-500 sm:text-sm ${fieldErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="(555) 123-4567"
                  />
                  {fieldErrors.phone && <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>}
                </div>
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
                {t('auth.legalAgreeIntro')}{' '}
                <Link to="/terms-of-service" className="font-medium text-brand-600 hover:text-brand-500" target="_blank" rel="noopener noreferrer">
                  {t('auth.termsOfService')}
                </Link>
                ,{' '}
                <Link to="/privacy-policy" className="font-medium text-brand-600 hover:text-brand-500" target="_blank" rel="noopener noreferrer">
                  {t('auth.privacyPolicy')}
                </Link>
                {' '}{t('auth.legalAnd')}{' '}
                <Link to="/hipaa-authorization" className="font-medium text-brand-600 hover:text-brand-500" target="_blank" rel="noopener noreferrer">
                  {t('auth.hipaaAuthorization')}
                </Link>{' '}
                {t('auth.legalAgreeEnd')}
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || !acceptedLegalSignup}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
                {!isLoading && <ArrowRight className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{t('auth.orContinueWithoutAccount')}</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/assess?fresh=1"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                {t('common.continueAsGuest')}
              </Link>
            </div>
          </div>

          <div className="mt-6 flex items-start justify-center gap-2 text-center">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <p className="text-xs leading-snug text-gray-500">{t('auth.footerReassure')}</p>
          </div>
            </div>

            {/* Right: what an account unlocks */}
            <div className="mt-2 lg:mt-0 lg:border-l lg:border-gray-100 lg:pl-14">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('auth.benefitsHeading')}</h3>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {accountFeatures.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <div key={feature.title} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${feature.wrap}`}>
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{t(feature.title)}</p>
                        <p className="mt-0.5 text-xs leading-snug text-gray-500">{t(feature.desc)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 flex items-start gap-3 border-t border-gray-100 pt-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Headset className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{t('auth.needHelpTitle')}</p>
                  <p className="text-xs text-gray-500">{t('auth.needHelpDesc')}</p>
                  <p className="mt-1 text-xs">
                    <a href={`tel:${t('auth.supportPhone')}`} className="font-medium text-brand-600 hover:text-brand-500">{t('auth.supportPhone')}</a>
                    <span className="text-gray-400">{'  •  '}</span>
                    <a href={`mailto:${t('auth.supportEmail')}`} className="font-medium text-brand-600 hover:text-brand-500">{t('auth.supportEmail')}</a>
                  </p>
                </div>
              </div>
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

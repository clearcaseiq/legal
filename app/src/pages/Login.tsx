import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { login } from '../lib/api-auth'
import { getPlaintiffConsentCompliance } from '../lib/api-consent'
import { associateAssessments, listAssessments } from '../lib/api-plaintiff'
import OAuthButtons from '../components/OAuthButtons'
import LoginLayout from '../components/LoginLayout'
import { PasswordInputWithReveal } from '../components/PasswordInputWithReveal'
import { resetCachedPlaintiffSessionSummary, updateCachedPlaintiffAssessments, updateCachedPlaintiffUser } from '../hooks/usePlaintiffSessionSummary'
import { type LoginFieldErrors, type LoginInput, validateLoginInput } from '../lib/loginValidation'
import { useLanguage } from '../contexts/LanguageContext'

export default function Login() {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const assessmentId = searchParams.get('assessmentId')
  const rawRedirectTo = searchParams.get('redirect') || (assessmentId ? `/results/${assessmentId}` : '/dashboard')
  const redirectTo = assessmentId && rawRedirectTo === '/dashboard'
    ? `/dashboard?case=${encodeURIComponent(assessmentId)}`
    : rawRedirectTo

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextFieldErrors = validateLoginInput(form, t)
    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length > 0) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await login({
        email: form.email.trim(),
        password: form.password,
      })

      if (response.isAttorney) {
        setError(t('auth.errUseAttorneyLogin'))
        return
      }

      if (!response.token || !response.user) {
        setError('Login failed: No token received')
        return
      }

      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      localStorage.setItem('auth_role', 'plaintiff')
      // Drop any leftover attorney/staff session keys from a prior login in this
      // browser so the nav doesn't still label the user "Attorney".
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
        } catch (err) {
          console.error('Failed to associate assessment after login:', err)
        }
      }

      try {
        const compliance = await getPlaintiffConsentCompliance(response.user.id)
        if (!compliance.allRequiredConsentsGranted) {
          let recentlyCompleted = false
          try {
            const stamp = Number(sessionStorage.getItem('cciq_consents_just_completed') || 0)
            recentlyCompleted = Boolean(stamp && Date.now() - stamp < 30_000)
          } catch {
            /* ignore */
          }
          if (!recentlyCompleted) {
            const dest = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`
            window.location.assign(
              `${window.location.origin}/auth/complete-consent?redirect=${encodeURIComponent(dest)}`
            )
            return
          }
        }
      } catch {
        /* proceed if status check fails */
      }

      const target = redirectTo.startsWith('/') ? `${window.location.origin}${redirectTo}` : redirectTo
      window.location.assign(target)
      return
    } catch (err: any) {
      if (err.response?.data?.isAttorney) {
        setError(t('auth.errAttorneyEmail'))
      } else if (err.response?.data?.useOAuth) {
        setError(err.response?.data?.error || 'Please sign in with Google or Apple.')
      } else if (!err.response) {
        setError(t('auth.errNetwork'))
      } else if (err.response?.status === 401) {
        // A 401 here always means the email/password didn't match. Surface a
        // clear auth message rather than a raw status or (when the body fails to
        // parse) the misleading "couldn't reach the server" fallback (#39).
        setError(t('auth.errInvalidCredentials'))
      } else {
        const apiError = err.response?.data?.error || err.message || 'Login failed'
        const details = err.response?.data?.details as { fieldErrors?: Record<string, string[]> } | undefined
        const fieldErrs = details?.fieldErrors ? Object.values(details.fieldErrors).flat().filter(Boolean) : []
        setError(fieldErrs.length ? `${apiError}: ${fieldErrs.join(', ')}` : apiError)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LoginLayout
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      error={error}
      footerDividerText={t('auth.newToApp')}
      footerContent={
        <>
          <Link
            to="/register"
            className="font-semibold text-blue-600 hover:text-blue-700 transition-colors block"
          >
            {t('auth.startFreeAssessment')}
          </Link>
          <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-400">
            {t('auth.alreadyAttorney')}{' '}
            <Link
              to="/attorney-login"
              className="font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              {t('auth.attorneyLogin')}
            </Link>
          </p>
        </>
      }
    >
      <div className="mb-6">
        <OAuthButtons onError={setError} disabled={isLoading} emphasizeGoogle />
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">{t('auth.orUseEmail')}</span>
        </div>
      </div>

      <form className="space-y-6" onSubmit={onSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            {t('auth.emailLabel')}
          </label>
          <div className="mt-1">
            <input
              id="email"
              type="email"
              autoComplete="email"
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

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            {t('auth.passwordLabel')}
          </label>
          <div className="mt-1">
            <PasswordInputWithReveal
              id="password"
              autoComplete="current-password"
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

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
              {t('auth.rememberMe')}
            </label>
          </div>
          <div className="text-sm">
            <Link to="/forgot-password" className="font-medium text-brand-600 hover:text-brand-500">
              {t('auth.forgotPasswordLink')}
            </Link>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-brand-600 hover:from-blue-700 hover:to-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 transition-all duration-200"
          >
            {isLoading ? t('auth.signingIn') : t('auth.continueMyCase')}
          </button>
        </div>
      </form>

      <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
        {t('auth.platformDisclaimer')}
      </p>
    </LoginLayout>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loginAttorney } from '../lib/api-auth'
import { getStoredRole, hasValidAuthToken } from '../lib/auth'
import { safeInternalReturnTo } from '../lib/evidenceUploadNav'
import OAuthButtons from '../components/OAuthButtons'
import { PasswordInputWithReveal } from '../components/PasswordInputWithReveal'
import { type LoginFieldErrors, type LoginInput, validateLoginInput } from '../lib/loginValidation'
import { useLanguage } from '../contexts/LanguageContext'
import { CheckCircle } from 'lucide-react'

// Only benefits the product delivers today: matching on practice area and
// service area, the case assessment, and importing an existing caseload.
const ATTORNEY_BENEFITS = [1, 2, 4]

export default function AttorneyLogin() {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})

  const destination = safeInternalReturnTo(
    new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search).get('redirect'),
    '/attorney-dashboard',
  )

  useEffect(() => {
    if (hasValidAuthToken() && getStoredRole() === 'attorney') {
      window.location.assign(destination)
    }
  }, [destination])

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
      const response = await loginAttorney({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      if (!response.token) {
        setError(t('auth.errLoginFailedRetry'))
        return
      }
      localStorage.setItem('auth_token', response.token)
      if (response.user) localStorage.setItem('user', JSON.stringify(response.user))
      if (response.attorney) localStorage.setItem('attorney', JSON.stringify(response.attorney))
      localStorage.setItem('auth_role', 'attorney')
      window.location.assign(destination)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || t('auth.errLoginFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[1.4fr_1fr]">
          <section className="p-8 sm:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{t('auth.attorneyLoginLabel')}</p>
              <h1 className="mt-2 text-3xl font-extrabold text-slate-950">{t('auth.attorneySignInTitle')}</h1>
              <p className="mt-2 text-sm text-slate-600">{t('auth.attorneySignInSubtitle')}</p>
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  {t('auth.emailShortLabel')}
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={form.email}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, email: event.target.value }))
                      setFieldErrors((current) => ({ ...current, email: undefined }))
                    }}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm ${fieldErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder={t('auth.attorneyEmailPlaceholder')}
                  />
                </div>
                {fieldErrors.email && (
                  <p id="email-error" className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    {t('auth.passwordLabel')}
                  </label>
                  <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                    {t('auth.forgotPasswordShort')}
                  </Link>
                </div>
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
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                    className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm ${fieldErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                {fieldErrors.password && (
                  <p id="password-error" className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl border border-transparent bg-brand-700 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? t('auth.signingIn') : t('auth.signInCta')}
              </button>
            </form>

            <div className="mt-6">
              <OAuthButtons role="attorney" onError={setError} disabled={isLoading} dividerLabel={t('auth.orDivider')} />
            </div>

            <p className="mt-8 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
              {t('auth.notAttorney')} <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">{t('auth.plaintiffLogin')}</Link>
            </p>
          </section>

          <aside className="border-t border-slate-200 bg-slate-50 p-8 sm:p-10 lg:border-l lg:border-t-0">
            <h2 className="text-lg font-bold text-slate-900">{t('auth.newToApp')}</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {ATTORNEY_BENEFITS.map((n) => (
                <li key={n} className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  {t(`auth.attorneyBenefit${n}`)}
                </li>
              ))}
            </ul>
            <Link
              to="/attorney-register"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-brand-700 bg-white px-4 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              {t('auth.joinAttorneyNetwork')}
            </Link>
          </aside>
        </div>
      </div>
    </div>
  )
}

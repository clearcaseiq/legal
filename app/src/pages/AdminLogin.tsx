import { type ReactNode, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  login,
  loginSpecialist,
  verifyAdminAccess,
  verifySpecialistAccess,
} from '../lib/api-auth'
import { clearStoredAuth } from '../lib/auth'
import { storeAdminCapabilities } from '../lib/adminCapabilities'
import LoginLayout from '../components/LoginLayout'
import { PasswordInputWithReveal } from '../components/PasswordInputWithReveal'
import { type LoginFieldErrors, type LoginInput, validateLoginInput } from '../lib/loginValidation'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * An account turned away here is usually not unauthorized — it is standing at
 * the wrong one of five doors. Naming the right one beats the previous message,
 * which told a law-firm paralegal to edit `ADMIN_EMAILS` in `api/.env`.
 */
function wrongDoor(label: string, to: string): ReactNode {
  return (
    <>
      This is the ClearCaseIQ admin sign-in. {label}{' '}
      <Link to={to} className="font-semibold underline">
        Go to the right sign-in page
      </Link>
      .
    </>
  )
}

export default function AdminLogin() {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ReactNode>(null)
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Only same-origin paths are honoured: the parameter is attacker-controllable,
  // so an absolute URL would turn this page into an open redirect.
  const redirectParam = searchParams.get('redirect')
  const destination =
    redirectParam?.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : null

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextFieldErrors = validateLoginInput(form, t)
    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length > 0) {
      return
    }

    setIsLoading(true)
    setError(null)

    const credentials = { email: form.email.trim(), password: form.password }

    /** Case Specialists share this door; the queue is where they belong. */
    const enterAsSpecialist = () => {
      localStorage.setItem('auth_role', 'specialist')
      navigate(destination || '/assistance')
    }

    try {
      const response = await login(credentials)
      if (!response.token || !response.user) {
        setError(t('auth.errLoginFailedRetry'))
        return
      }

      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))

      try {
        const access = await verifyAdminAccess()
        storeAdminCapabilities(access.capabilities)
        localStorage.setItem('auth_role', 'admin')
        navigate(destination || '/admin')
        return
      } catch {
        // Not an admin — but specialists sign in here too, and their own gate is
        // the one that decides. It grants strictly less than admin: the Case
        // Assistance queue, and nothing else under /admin.
        const specialist = await verifySpecialistAccess().catch(() => ({ ok: false }))
        if (specialist.ok) {
          enterAsSpecialist()
          return
        }

        clearStoredAuth()
        setError(
          'This account does not have admin or Case Assistance access. Ask an existing admin to grant the role in Configuration → User Roles.',
        )
        return
      }
    } catch (err: any) {
      // The login endpoint turns away roles that have their own door before it
      // issues a token, so what to do next comes off the error rather than the
      // session. A specialist is signed in through their own endpoint; everyone
      // else is pointed at the page that will actually let them in.
      const data = err.response?.data

      if (data?.isSpecialist) {
        try {
          const response = await loginSpecialist(credentials)
          if (response.token) {
            localStorage.setItem('auth_token', response.token)
            if (response.user) localStorage.setItem('user', JSON.stringify(response.user))
            enterAsSpecialist()
            return
          }
        } catch {
          // Fall through to the message below.
        }
        setError(wrongDoor('This is a Case Specialist account.', '/login/specialist'))
        return
      }

      // An invited colleague who never opened the invitation email, or opened it
      // after the 72-hour link lapsed. There is nothing wrong with their
      // credentials because they do not have any yet, so the way out is a fresh
      // link rather than another attempt at the password.
      if (data?.code === 'NO_PASSWORD_SET') {
        setError(
          <>
            {data.error}{' '}
            <Link to="/forgot-password" className="font-semibold underline">
              Send me a link
            </Link>
            .
          </>,
        )
        return
      }

      if (data?.isFirmStaff) {
        setError(wrongDoor('This is a law-firm staff account.', '/login/staff'))
        return
      }
      if (data?.isAttorney) {
        setError(wrongDoor('This is an attorney account.', '/login/attorney'))
        return
      }

      setError(data?.error || err.message || t('auth.errLoginFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LoginLayout
      title={t('auth.adminTitle')}
      subtitle={t('auth.adminSubtitle')}
      error={error}
      footerDividerText={t('auth.otherLoginOptions')}
      footerContent={
        <>
          <Link
            to="/login"
            className="font-semibold text-blue-600 hover:text-blue-700 transition-colors block"
          >
            {t('auth.plaintiffLoginArrow')}
          </Link>
          <Link
            to="/attorney-login"
            className="font-semibold text-blue-600 hover:text-blue-700 transition-colors block mt-2"
          >
            {t('auth.attorneyLoginArrow')}
          </Link>
        </>
      }
    >
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
              placeholder="admin@caseiq.com"
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

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-brand-600 hover:from-blue-700 hover:to-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 transition-all duration-200"
          >
            {isLoading ? t('auth.signingIn') : t('auth.signInCta')}
          </button>
        </div>
      </form>
    </LoginLayout>
  )
}

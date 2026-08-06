import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import LoginLayout from '../components/LoginLayout'
import { PasswordInputWithReveal } from '../components/PasswordInputWithReveal'
import { resetPassword, validatePasswordResetToken } from '../lib/api-auth'
import { useLanguage } from '../contexts/LanguageContext'

export default function ResetPassword() {
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid'>('checking')
  const [isNewPassword, setIsNewPassword] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setStatus('invalid')
      setError(t('auth.errLinkMissingToken'))
      return
    }
    validatePasswordResetToken(token)
      .then((res) => {
        if (cancelled) return
        if (res.valid) {
          setStatus('valid')
          setIsNewPassword(!!res.isNewPassword)
          if (res.role) setUserRole(res.role)
        } else {
          setStatus('invalid')
          setError(res.error || t('auth.errLinkInvalid'))
        }
      })
      .catch((err: any) => {
        if (cancelled) return
        setStatus('invalid')
        setError(err?.response?.data?.error || t('auth.errLinkInvalid'))
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password.length < 8) {
      setError(t('auth.errPasswordMin'))
      return
    }
    if (password !== confirm) {
      setError(t('auth.errPasswordsNoMatch'))
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await resetPassword(token, password)
      const role = result.role || userRole
      setDone(true)
      const loginPath =
        role === 'attorney' ? '/attorney-login'
        : role === 'staff' ? '/staff-login'
        : role === 'admin' ? '/staff-login'
        : '/login'
      setTimeout(() => navigate(loginPath), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.error || t('auth.errResetFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const heading = isNewPassword ? t('auth.setPasswordTitle') : t('auth.resetTitle')
  const subtitle = isNewPassword ? t('auth.setPasswordSubtitle') : t('auth.resetSubtitle')

  return (
    <LoginLayout
      title={heading}
      subtitle={subtitle}
      error={status === 'valid' ? error : null}
      footerDividerText={t('auth.needHelp')}
      footerContent={
        <Link
          to={userRole === 'attorney' ? '/attorney-login' : userRole === 'staff' || userRole === 'admin' ? '/staff-login' : '/login'}
          className="font-semibold text-brand-600 hover:text-brand-700 transition-colors block"
        >
          {t('auth.backToSignIn')}
        </Link>
      }
    >
      {status === 'checking' && <p className="text-center text-sm text-slate-500">{t('auth.validatingLink')}</p>}

      {status === 'invalid' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700">
          <p className="font-semibold">{t('auth.linkInvalidTitle')}</p>
          <p className="mt-2">{error}</p>
          <Link
            to="/forgot-password"
            className="mt-4 inline-block font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            {t('auth.requestNewLink')}
          </Link>
        </div>
      )}

      {status === 'valid' && done && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm text-emerald-800">
          <p className="font-semibold">{t('auth.passwordUpdatedTitle')}</p>
          <p className="mt-2">{t('auth.redirectingSignIn')}</p>
        </div>
      )}

      {status === 'valid' && !done && (
        <form className="space-y-6" onSubmit={onSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              {t('auth.newPasswordLabel')}
            </label>
            <div className="mt-1">
              <PasswordInputWithReveal
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(null)
                }}
                disabled={isLoading}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                placeholder={t('auth.atLeast8Chars')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
              {t('auth.confirmPasswordLabel')}
            </label>
            <div className="mt-1">
              <PasswordInputWithReveal
                id="confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value)
                  setError(null)
                }}
                disabled={isLoading}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                placeholder={t('auth.reenterPassword')}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-brand-600 hover:from-blue-700 hover:to-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 transition-all duration-200"
          >
            {isLoading ? t('auth.saving') : isNewPassword ? t('auth.setPasswordCta') : t('auth.resetPasswordCta')}
          </button>
        </form>
      )}
    </LoginLayout>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import LoginLayout from '../components/LoginLayout'
import { PasswordInputWithReveal } from '../components/PasswordInputWithReveal'
import { resetPassword, validatePasswordResetToken } from '../lib/api-auth'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid'>('checking')
  const [isNewPassword, setIsNewPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setStatus('invalid')
      setError('This reset link is missing its token. Please request a new one.')
      return
    }
    validatePasswordResetToken(token)
      .then((res) => {
        if (cancelled) return
        if (res.valid) {
          setStatus('valid')
          setIsNewPassword(!!res.isNewPassword)
        } else {
          setStatus('invalid')
          setError(res.error || 'This reset link is invalid or has expired.')
        }
      })
      .catch((err: any) => {
        if (cancelled) return
        setStatus('invalid')
        setError(err?.response?.data?.error || 'This reset link is invalid or has expired.')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      await resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not reset your password. The link may have expired.')
    } finally {
      setIsLoading(false)
    }
  }

  const heading = isNewPassword ? 'Set your password' : 'Choose a new password'
  const subtitle = isNewPassword
    ? 'Create a password to finish setting up your account'
    : 'Enter a new password for your account'

  return (
    <LoginLayout
      title={heading}
      subtitle={subtitle}
      error={status === 'valid' ? error : null}
      footerDividerText="Need help?"
      footerContent={
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors block">
          Back to sign in
        </Link>
      }
    >
      {status === 'checking' && <p className="text-center text-sm text-slate-500">Validating your reset link…</p>}

      {status === 'invalid' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700">
          <p className="font-semibold">Link expired or invalid</p>
          <p className="mt-2">{error}</p>
          <Link
            to="/forgot-password"
            className="mt-4 inline-block font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            Request a new link
          </Link>
        </div>
      )}

      {status === 'valid' && done && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm text-emerald-800">
          <p className="font-semibold">Password updated</p>
          <p className="mt-2">Redirecting you to sign in…</p>
        </div>
      )}

      {status === 'valid' && !done && (
        <form className="space-y-6" onSubmit={onSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New password
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
                placeholder="At least 8 characters"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
              Confirm password
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
                placeholder="Re-enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-brand-600 hover:from-blue-700 hover:to-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 transition-all duration-200"
          >
            {isLoading ? 'Saving…' : isNewPassword ? 'Set password' : 'Reset password'}
          </button>
        </form>
      )}
    </LoginLayout>
  )
}

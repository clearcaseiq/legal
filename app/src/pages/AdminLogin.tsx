import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, verifyAdminAccess } from '../lib/api-auth'
import { clearStoredAuth } from '../lib/auth'
import LoginLayout from '../components/LoginLayout'
import { type LoginFieldErrors, type LoginInput, validateLoginInput } from '../lib/loginValidation'

export default function AdminLogin() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const navigate = useNavigate()

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextFieldErrors = validateLoginInput(form)
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
      if (!response.token || !response.user) {
        setError('Login failed. Please try again.')
        return
      }

      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))

      try {
        await verifyAdminAccess()
      } catch {
        clearStoredAuth()
        setError(
          'This account is not authorized for admin access. Add your email to ADMIN_EMAILS in the API environment (api/.env), then try again.',
        )
        return
      }

      localStorage.setItem('auth_role', 'admin')
      navigate('/admin')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LoginLayout
      title="Admin Login"
      subtitle="Sign in to access admin tools"
      error={error}
      footerDividerText="Other login options"
      footerContent={
        <>
          <Link
            to="/login"
            className="font-semibold text-blue-600 hover:text-blue-700 transition-colors block"
          >
            Plaintiff login →
          </Link>
          <Link
            to="/attorney-login"
            className="font-semibold text-blue-600 hover:text-blue-700 transition-colors block mt-2"
          >
            Attorney login →
          </Link>
        </>
      }
    >
      <form className="space-y-6" onSubmit={onSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
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
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
              placeholder="admin@caseiq.com"
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
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => {
                setForm((current) => ({ ...current, password: event.target.value }))
                setFieldErrors((current) => ({ ...current, password: undefined }))
              }}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
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
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </form>
    </LoginLayout>
  )
}

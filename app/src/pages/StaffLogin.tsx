import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loginStaff } from '../lib/api-auth'
import { getStoredRole, hasValidAuthToken } from '../lib/auth'
import BrandLogo from '../components/BrandLogo'
import { PasswordInputWithReveal } from '../components/PasswordInputWithReveal'
import { type LoginFieldErrors, type LoginInput, validateLoginInput } from '../lib/loginValidation'

function formatRole(role?: string | null): string {
  if (!role) return 'Team member'
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function StaffLogin() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})

  useEffect(() => {
    if (hasValidAuthToken() && getStoredRole() === 'staff') {
      window.location.assign('/firm-dashboard')
    }
  }, [])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextFieldErrors = validateLoginInput(form)
    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length > 0) {
      return
    }

    setIsLoading(true)
    setError(null)
    setInfo(null)
    try {
      const response = await loginStaff({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      if (!response.token) {
        setError('Login failed: missing token in response.')
        return
      }
      localStorage.setItem('auth_token', response.token)
      if (response.user) localStorage.setItem('user', JSON.stringify(response.user))
      if (response.firm) localStorage.setItem('firm_member', JSON.stringify(response.firm))
      localStorage.setItem('auth_role', 'staff')
      window.location.assign('/firm-dashboard')
    } catch (err: any) {
      const data = err.response?.data
      // A pending invite isn't really an error — nudge them to the invite email.
      if (data?.code === 'INVITE_PENDING' || data?.code === 'NO_PASSWORD_SET') {
        setInfo(data.error)
      } else {
        setError(data?.error || err.message || 'Login failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/"
          className="mb-8 flex justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <BrandLogo size="lg" />
        </Link>

        <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[1fr_0.9fr]">
          <section className="p-8 sm:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Firm Staff Login</p>
              <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Sign in to your firm workspace</h1>
              <p className="mt-2 text-sm text-slate-600">
                For paralegals, case managers, intake specialists, and other law-firm team members.
              </p>
            </div>

            {info && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">{info}</p>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form className="mt-8 space-y-5" onSubmit={onSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
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
                    placeholder="you@example.com"
                  />
                </div>
                {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
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
                    placeholder="Password"
                  />
                </div>
                {fieldErrors.password && <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl border border-transparent bg-brand-700 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="text-center">
                <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                  Forgot Password?
                </Link>
              </div>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6 text-center">
              <p className="text-xs text-slate-500">
                Are you an attorney?{' '}
                <Link to="/login/attorney" className="font-medium text-brand-700 hover:text-brand-800">
                  Attorney login
                </Link>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Looking for your case?{' '}
                <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
                  Client login
                </Link>
              </p>
            </div>
          </section>

          <aside className="bg-slate-950 p-8 text-white sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-300">Your Firm Workspace</p>
            <h2 className="mt-3 text-3xl font-extrabold">Everything your team needs, in one place.</h2>
            <div className="mt-8 space-y-4 text-sm text-slate-100">
              {[
                'Work the cases assigned to you',
                'Upload and organize records & documents',
                'Manage chronologies and evidence requests',
                'Message clients and coordinate consults',
                'Track your time and billing',
              ].map((benefit) => (
                <div key={benefit} className="rounded-xl bg-white/10 px-4 py-3">
                  {benefit}
                </div>
              ))}
            </div>
            <p className="mt-8 text-xs text-slate-400">
              Access is scoped to your role ({formatRole('case_manager')}, {formatRole('paralegal')}, and more). Ask
              your firm admin to invite you from Team &amp; Roles.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}

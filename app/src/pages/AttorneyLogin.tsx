import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loginAttorney } from '../lib/api-auth'
import { getStoredRole, hasValidAuthToken } from '../lib/auth'
import BrandLogo from '../components/BrandLogo'
import { PasswordInputWithReveal } from '../components/PasswordInputWithReveal'
import { type LoginFieldErrors, type LoginInput, validateLoginInput } from '../lib/loginValidation'
import { getApiOrigin } from '../lib/runtimeEnv'

export default function AttorneyLogin() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})

  useEffect(() => {
    if (hasValidAuthToken() && getStoredRole() === 'attorney') {
      window.location.assign('/attorney-dashboard')
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
    try {
      const response = await loginAttorney({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      if (!response.token) {
        setError('Login failed: missing token in response.')
        return
      }
      localStorage.setItem('auth_token', response.token)
      if (response.user) localStorage.setItem('user', JSON.stringify(response.user))
      if (response.attorney) localStorage.setItem('attorney', JSON.stringify(response.attorney))
      localStorage.setItem('auth_role', 'attorney')
      window.location.assign('/attorney-dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setError(null)
      const apiUrl = getApiOrigin() || 'http://localhost:4000'
      const response = await fetch(`${apiUrl}/v1/auth/status`)
      const status = await response.json()
      if (!status.google?.configured) {
        setError('Google sign-in is not configured yet. Please use email and password for now.')
        return
      }
      localStorage.setItem('oauth_intended_role', 'attorney')
      window.location.href = `${apiUrl}/v1/auth/google?role=attorney`
    } catch (err: any) {
      setError(err?.message || 'Unable to start Google sign-in.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="mb-8 flex justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
          <BrandLogo size="lg" />
        </Link>

        <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[1fr_0.9fr]">
          <section className="p-8 sm:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Attorney Login</p>
              <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Sign in to ClearCaseIQ</h1>
              <p className="mt-2 text-sm text-slate-600">Manage cases, reviews, consults, and firm intelligence.</p>
            </div>

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
                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl border border-transparent bg-brand-700 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="text-center">
                <a href="mailto:support@clearcaseiq.com?subject=Attorney%20password%20reset" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                  Forgot Password?
                </a>
              </div>
            </form>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign in with Google
              </button>
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-400"
                title="Microsoft SSO is coming soon"
              >
                Sign in with Microsoft
              </button>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-6 text-center">
              <p className="text-sm text-slate-500">New to ClearCaseIQ?</p>
              <Link to="/attorney-network" className="mt-2 block font-semibold text-brand-700 hover:text-brand-800">
                Join the Attorney Network -&gt;
              </Link>
              <p className="mt-3 text-xs text-slate-500">
                Not an attorney? <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">Plaintiff login</Link>
              </p>
            </div>
          </section>

          <aside className="bg-slate-950 p-8 text-white sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-300">Why Attorneys Join</p>
            <h2 className="mt-3 text-3xl font-extrabold">Grow your practice with qualified PI cases.</h2>
            <div className="mt-8 space-y-4 text-sm text-slate-100">
              {[
                'Receive qualified PI cases',
                'Review AI-powered case assessments',
                'Improve intake efficiency',
                'Import existing firm cases',
                'Increase case conversion',
              ].map((benefit) => (
                <div key={benefit} className="rounded-xl bg-white/10 px-4 py-3">
                  {benefit}
                </div>
              ))}
            </div>
            <Link
              to="/attorney-network"
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
            >
              Join Attorney Network
            </Link>
          </aside>
        </div>
      </div>
    </div>
  )
}

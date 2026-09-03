import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { loginSpecialist } from '../lib/api-auth'
import { getStoredRole, hasValidAuthToken } from '../lib/auth'
import BrandLogo from '../components/BrandLogo'
import { PasswordInputWithReveal } from '../components/PasswordInputWithReveal'
import { type LoginFieldErrors, type LoginInput, validateLoginInput } from '../lib/loginValidation'

/**
 * Sign-in for ClearCaseIQ Case Specialists.
 *
 * Distinct from `/login/staff`, which despite the name is for law-firm staff.
 */
export default function SpecialistLogin() {
  const [searchParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})

  // Only honour same-origin paths: a redirect param is attacker-controllable, so
  // an absolute URL here would turn the login page into an open redirect.
  const redirectParam = searchParams.get('redirect')
  const destination = redirectParam?.startsWith('/') && !redirectParam.startsWith('//')
    ? redirectParam
    : '/assistance'

  useEffect(() => {
    const role = getStoredRole()
    if (hasValidAuthToken() && (role === 'specialist' || role === 'admin')) {
      window.location.assign(destination)
    }
  }, [destination])

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
      const response = await loginSpecialist({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      if (!response.token) {
        setError('Login failed: missing token in response.')
        return
      }
      localStorage.setItem('auth_token', response.token)
      if (response.user) localStorage.setItem('user', JSON.stringify(response.user))
      localStorage.setItem('auth_role', 'specialist')
      window.location.assign(destination)
    } catch (err: any) {
      const data = err.response?.data
      // An un-set password is a state to fix, not a rejection to retry.
      if (data?.code === 'NO_PASSWORD_SET') {
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
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Case Specialist Login</p>
              <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Sign in to Case Assistance</h1>
              <p className="mt-2 text-sm text-slate-600">
                For the ClearCaseIQ team who help claimants get their case ready before it reaches attorneys.
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
                    placeholder="you@clearcaseiq.com"
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
                Law-firm team member?{' '}
                <Link to="/login/staff" className="font-medium text-brand-700 hover:text-brand-800">
                  Firm staff login
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
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-300">Case Assistance</p>
            <h2 className="mt-3 text-3xl font-extrabold">Help claimants tell their story properly.</h2>
            <div className="mt-8 space-y-4 text-sm text-slate-100">
              {[
                'Work a queue of newly assessed cases',
                'See exactly what information is missing and why it matters',
                'Guide claimants through the questions attorneys will ask',
                'Request the documents a case is short on',
                'Hand over cases that are genuinely ready',
              ].map((benefit) => (
                <div key={benefit} className="rounded-xl bg-white/10 px-4 py-3">
                  {benefit}
                </div>
              ))}
            </div>
            <p className="mt-8 text-xs text-slate-400">
              Specialists help claimants understand and complete their own case. They do not give legal advice, and
              they do not answer questions on a claimant's behalf.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}

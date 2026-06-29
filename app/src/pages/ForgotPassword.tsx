import { useState } from 'react'
import { Link } from 'react-router-dom'
import LoginLayout from '../components/LoginLayout'
import { requestPasswordReset } from '../lib/api-auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      await requestPasswordReset(trimmed)
      setSubmitted(true)
    } catch {
      // The endpoint is intentionally generic; only surface true network errors.
      setError("We couldn't send the reset email. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LoginLayout
      title="Reset your password"
      subtitle="We'll email you a secure link to set a new password"
      error={error}
      footerDividerText="Remembered it?"
      footerContent={
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors block">
          Back to sign in
        </Link>
      }
    >
      {submitted ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm text-emerald-800">
          <p className="font-semibold">Check your email</p>
          <p className="mt-2">
            If an account exists for <span className="font-medium">{email.trim()}</span>, we've sent a link to reset
            your password. It expires in 1 hour.
          </p>
          <p className="mt-2 text-emerald-700">
            Don't see it? Check your spam folder, or{' '}
            <button
              type="button"
              onClick={() => {
                setSubmitted(false)
                setError(null)
              }}
              className="font-semibold underline underline-offset-2 hover:text-emerald-900"
            >
              try again
            </button>
            .
          </p>
        </div>
      ) : (
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
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-brand-600 hover:from-blue-700 hover:to-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 transition-all duration-200"
          >
            {isLoading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </LoginLayout>
  )
}

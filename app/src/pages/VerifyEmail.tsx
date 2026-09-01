import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import LoginLayout from '../components/LoginLayout'
import { verifyEmail } from '../lib/api'
import { getStoredRole } from '../lib/auth'

/**
 * Attorneys and firm staff verify through this same page, so a hardcoded
 * /dashboard would drop them on the plaintiff view. Anyone verifying on a
 * device they aren't signed in on falls back to the plaintiff dashboard, which
 * redirects to the right login.
 */
function dashboardPath(): string {
  switch (getStoredRole()) {
    case 'attorney':
      return '/attorney-dashboard'
    case 'staff':
      return '/firm-dashboard'
    case 'admin':
      return '/admin'
    default:
      return '/dashboard'
  }
}

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [destination] = useState(dashboardPath)

  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking')
  const [message, setMessage] = useState<string>('')
  // React 18 StrictMode mounts effects twice in dev; the token is single-use, so
  // guard against a double POST that would fail the second time.
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    if (!token) {
      setStatus('error')
      setMessage('This verification link is missing its token. Please request a new one from your dashboard.')
      return
    }

    verifyEmail(token)
      .then((res) => {
        setStatus('success')
        setMessage(res.message || 'Your email has been verified. Thank you!')
      })
      .catch((err: any) => {
        setStatus('error')
        setMessage(
          err?.response?.data?.error ||
            'This verification link is invalid or has expired. Please request a new one from your dashboard.'
        )
      })
  }, [token])

  return (
    <LoginLayout
      title="Email verification"
      subtitle="Confirming your email address"
      error={null}
      footerDividerText="Need help?"
      footerContent={
        <Link to={destination} className="font-semibold text-brand-600 hover:text-brand-700 transition-colors block">
          Go to dashboard
        </Link>
      }
    >
      {status === 'checking' && (
        <p className="text-center text-sm text-slate-500">Verifying your email…</p>
      )}

      {status === 'success' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm text-emerald-800">
          <p className="font-semibold">Email verified</p>
          <p className="mt-2">{message}</p>
          <Link
            to={destination}
            className="mt-4 inline-block font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            Continue to your dashboard
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700">
          <p className="font-semibold">Verification failed</p>
          <p className="mt-2">{message}</p>
          <Link
            to={destination}
            className="mt-4 inline-block font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            Back to dashboard
          </Link>
        </div>
      )}
    </LoginLayout>
  )
}

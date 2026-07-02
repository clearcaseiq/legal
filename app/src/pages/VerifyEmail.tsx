import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import LoginLayout from '../components/LoginLayout'
import { verifyEmail } from '../lib/api'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

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
        <Link to="/dashboard" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors block">
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
            to="/dashboard"
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
            to="/dashboard"
            className="mt-4 inline-block font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            Back to dashboard
          </Link>
        </div>
      )}
    </LoginLayout>
  )
}

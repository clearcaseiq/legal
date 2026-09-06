import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import LoginLayout from '../components/LoginLayout'
import { verifyEmail } from '../lib/api'
import { getLoginPathForRole, getPostLoginRoute, getStoredRole, hasValidAuthToken } from '../lib/auth'

/**
 * Every role verifies through this page, so where "continue" goes depends on who
 * is verifying.
 *
 * Signed in, it is their own dashboard. Signed out — which is the normal case
 * for someone activating a brand-new account from an invite — it is the sign-in
 * screen their account actually uses, taken from the role the verify call
 * returns. This used to fall back to the plaintiff dashboard, so a new admin
 * was handed a claimant login and could not get in with it.
 */
function destinationFor(verifiedRole: string | null): string {
  if (hasValidAuthToken()) return getPostLoginRoute(getStoredRole())
  return getLoginPathForRole(verifiedRole)
}

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [verifiedRole, setVerifiedRole] = useState<string | null>(null)
  const destination = destinationFor(verifiedRole)
  // The link is a sign-in page for anyone not already authenticated, so it should
  // not promise a dashboard they will not land on.
  const continueLabel = hasValidAuthToken() ? 'Continue to your dashboard' : 'Continue to sign in'

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
        setVerifiedRole(res.role ?? null)
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
          {continueLabel}
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
            {continueLabel}
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
            {continueLabel}
          </Link>
        </div>
      )}
    </LoginLayout>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { getPlaintiffConsentCompliance } from '../lib/api-consent'
import { loadPlaintiffSessionSummary, resetCachedPlaintiffSessionSummary, updateCachedPlaintiffUser } from '../hooks/usePlaintiffSessionSummary'

export default function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const token = searchParams.get('token')
    const provider = searchParams.get('provider')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setStatus('error')
      setError(errorParam === 'oauth_failed' ? 'OAuth authentication failed' : 'Authentication error')
      return
    }

    if (token && provider) {
      try {
        localStorage.setItem('auth_token', token)
        localStorage.setItem('auth_provider', provider)
        localStorage.setItem('auth_role', 'plaintiff')
        resetCachedPlaintiffSessionSummary()

        setStatus('success')

        const continueAfterOAuth = async () => {
          try {
            const session = await loadPlaintiffSessionSummary(true)
            const user = session.user
            if (user?.id) {
              updateCachedPlaintiffUser(user)
              const compliance = await getPlaintiffConsentCompliance(user.id)
              if (!compliance.allRequiredConsentsGranted) {
                navigate(`/auth/complete-consent?redirect=${encodeURIComponent('/dashboard')}`, {
                  replace: true,
                })
                return
              }
            }
          } catch {
            /* fall through to dashboard */
          }
          navigate('/dashboard', { replace: true })
        }

        setTimeout(continueAfterOAuth, 900)
      } catch (error) {
        setStatus('error')
        setError('Failed to store authentication token')
      }
    } else {
      setStatus('error')
      setError('No authentication token received')
    }
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Completing Authentication...
            </h2>
            <p className="text-gray-600">
              Please wait while we complete your login.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Login Successful!
            </h2>
            <p className="text-gray-600 mb-4">
              You have been successfully logged in.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 mb-4">
              {error}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Back to Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Create Account
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

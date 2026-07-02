import { useEffect, useState } from 'react'
import { Chrome, Loader2 } from 'lucide-react'
import { getApiOrigin } from '../lib/runtimeEnv'

interface OAuthButtonsProps {
  onError?: (error: string) => void
  disabled?: boolean
  emphasizeGoogle?: boolean
  role?: 'plaintiff' | 'attorney'
}

export default function OAuthButtons({ disabled = false, emphasizeGoogle = false, role = 'plaintiff' }: OAuthButtonsProps) {
  const [loading, setLoading] = useState<'google' | 'apple' | 'microsoft' | null>(null)
  // Only render providers the backend actually has configured. Previously the
  // buttons always showed and only surfaced "OAuth is not configured" after a
  // click — confusing for users on environments without OAuth set up (#78).
  const [providers, setProviders] = useState<{ google: boolean; apple: boolean; microsoft: boolean } | null>(null)
  const apiUrl = getApiOrigin() || 'http://localhost:4000'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch(`${apiUrl}/v1/auth/status`)
        const status = await response.json()
        if (cancelled) return
        setProviders({
          google: Boolean(status?.google?.configured),
          apple: Boolean(status?.apple?.configured),
          microsoft: Boolean(status?.microsoft?.configured),
        })
      } catch {
        // If we can't determine status, assume OAuth is unavailable rather than
        // showing buttons that will only error on click.
        if (!cancelled) setProviders({ google: false, apple: false, microsoft: false })
      }
    })()
    return () => { cancelled = true }
  }, [apiUrl])

  const handleGoogleLogin = () => {
    setLoading('google')
    localStorage.setItem('oauth_intended_role', role)
    if (role === 'plaintiff') {
      localStorage.removeItem('auth_role')
      localStorage.removeItem('attorney')
    }
    window.location.href = `${apiUrl}/v1/auth/google?role=${encodeURIComponent(role)}`
  }

  const handleAppleLogin = () => {
    setLoading('apple')
    localStorage.setItem('oauth_intended_role', role)
    if (role === 'plaintiff') {
      localStorage.removeItem('auth_role')
      localStorage.removeItem('attorney')
    }
    window.location.href = `${apiUrl}/v1/auth/apple?role=${encodeURIComponent(role)}`
  }

  const handleMicrosoftLogin = () => {
    setLoading('microsoft')
    localStorage.setItem('oauth_intended_role', role)
    window.location.href = `${apiUrl}/v1/auth/microsoft?role=${encodeURIComponent(role)}`
  }

  // Provider matrix by role: plaintiffs get Google + Apple, attorneys get
  // Google + Microsoft (#74). Each still requires the backend to be configured.
  const showGoogle = Boolean(providers?.google)
  const showApple = role === 'plaintiff' && Boolean(providers?.apple)
  const showMicrosoft = role === 'attorney' && Boolean(providers?.microsoft)

  // Wait until we know which providers are available before rendering, so the
  // buttons don't flash in and then disappear.
  if (!providers || (!showGoogle && !showApple && !showMicrosoft)) return null

  return (
    <div className="space-y-3">
      {/* Google Login Button */}
      {showGoogle && (
      <button
        onClick={handleGoogleLogin}
        disabled={disabled || loading === 'google'}
        className={`w-full flex items-center justify-center px-4 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
          emphasizeGoogle
            ? 'py-3.5 border-brand-600 bg-brand-700 text-base font-semibold text-white hover:bg-brand-800'
            : 'py-3 border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50'
        }`}
      >
        {loading === 'google' ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Chrome className="h-5 w-5 mr-2 text-red-500" />
        )}
        {loading === 'google' ? 'Signing in...' : 'Continue with Google'}
      </button>
      )}

      {/* Apple Login Button (plaintiff) */}
      {showApple && (
      <button
        onClick={handleAppleLogin}
        disabled={disabled || loading === 'apple'}
        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading === 'apple' ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
        )}
        {loading === 'apple' ? 'Signing in...' : 'Continue with Apple'}
      </button>
      )}

      {/* Microsoft Login Button (attorney) */}
      {showMicrosoft && (
      <button
        onClick={handleMicrosoftLogin}
        disabled={disabled || loading === 'microsoft'}
        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading === 'microsoft' ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <svg className="h-5 w-5 mr-2" viewBox="0 0 23 23" aria-hidden>
            <path fill="#f25022" d="M1 1h10v10H1z" />
            <path fill="#7fba00" d="M12 1h10v10H12z" />
            <path fill="#00a4ef" d="M1 12h10v10H1z" />
            <path fill="#ffb900" d="M12 12h10v10H12z" />
          </svg>
        )}
        {loading === 'microsoft' ? 'Signing in...' : 'Continue with Microsoft'}
      </button>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import { unsubscribeFromClaimInvites } from '../lib/api'

/**
 * Opt-out page linked from every claim invitation. The opt-out waits for a
 * click rather than firing on load, because corporate link scanners open every
 * URL in an email and would otherwise unsubscribe attorneys who never asked.
 */
export default function ClaimUnsubscribe() {
  const { token = '' } = useParams<{ token: string }>()
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const unsubscribe = async () => {
    setState('working')
    setError(null)
    try {
      await unsubscribeFromClaimInvites(token)
      setState('done')
    } catch (err: any) {
      setError(err.response?.data?.error || 'We could not process this request. Please try again.')
      setState('error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="mb-8 flex justify-center">
          <BrandLogo size="lg" />
        </Link>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-8 py-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Email preferences</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-950">
              {state === 'done' ? 'You are unsubscribed' : 'Stop invitation emails'}
            </h1>
          </div>

          <div className="space-y-4 px-8 py-7">
            {state === 'done' ? (
              <p className="text-sm text-slate-700">
                ClearCaseIQ will not send you any more profile invitations. If you change your mind, you can still
                claim your profile with the link in the email you received.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-700">
                  Unsubscribing stops all ClearCaseIQ profile invitation emails to this address. It does not remove
                  your public listing; to do that, use the decline option on the claim page.
                </p>
                {error && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm text-amber-800">{error}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void unsubscribe()}
                    disabled={state === 'working' || !token}
                    className="btn-primary"
                  >
                    {state === 'working' ? 'Working…' : 'Unsubscribe'}
                  </button>
                  <Link to={`/claim/${token}`} className="btn-outline">
                    Claim my profile instead
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

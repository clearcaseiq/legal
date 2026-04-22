import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ConsentWorkflow from '../components/ConsentWorkflow'
import { createConsent } from '../lib/api-consent'
import { clearStoredAuth, getLoginRedirect } from '../lib/auth'
import { loadPlaintiffSessionSummary } from '../hooks/usePlaintiffSessionSummary'

/**
 * Dedicated flow after OAuth (or if dashboard detects missing / outdated consents).
 */
export default function CompleteConsent() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const [userId, setUserId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savingConsents, setSavingConsents] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    loadPlaintiffSessionSummary()
      .then((session) => {
        const u = session.user
        if (u?.id) setUserId(u.id)
        else setLoadError('Not signed in')
      })
      .catch(() => setLoadError('Not signed in'))
  }, [])

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-700 dark:text-slate-300">{loadError}</p>
        <button type="button" className="btn-primary" onClick={() => navigate(getLoginRedirect('/dashboard', 'plaintiff'), { replace: true })}>
          Go to sign in
        </button>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
      </div>
    )
  }

  const safeRedirect = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`

  async function handleConsentsSigned(consents: any[]) {
    setSavingConsents(true)
    setSaveError(null)
    try {
      for (const consent of consents) {
        await createConsent({
          ...consent,
          expiresAt:
            consent.consentType === 'marketing'
              ? undefined
              : new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
      navigate(safeRedirect, { replace: true })
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string } }; message?: string }
      setSaveError(ax.response?.data?.error || ax.message || 'Could not save your signatures. Please try again.')
    } finally {
      setSavingConsents(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 relative">
      {savingConsents && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="rounded-xl bg-white dark:bg-slate-900 px-6 py-4 shadow-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100">
            Saving your agreements…
          </div>
        </div>
      )}
      <div className="max-w-2xl mx-auto px-4 mb-6 text-center">
        <h1 className="text-ui-xl font-semibold font-display text-slate-900 dark:text-slate-100">
          Complete your agreements
        </h1>
        <p className="mt-2 text-ui-sm text-slate-600 dark:text-slate-400">
          Sign-in is complete. Review the Terms, Privacy Policy, and HIPAA authorization below, confirm the attestation, then add
          one electronic signature—we save each agreement separately for your records.
        </p>
      </div>
      {saveError && (
        <div className="max-w-2xl mx-auto px-4 mb-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {saveError}
          </div>
        </div>
      )}
      <ConsentWorkflow
        userId={userId}
        requiredConsents={['terms', 'privacy', 'hipaa']}
        flow="combined"
        presentation="inline"
        onComplete={handleConsentsSigned}
        onCancel={() => {
          clearStoredAuth()
          navigate(getLoginRedirect('/dashboard', 'plaintiff'), { replace: true })
        }}
      />
    </div>
  )
}

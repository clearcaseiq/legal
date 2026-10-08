import { useState } from 'react'
import { Mail } from 'lucide-react'
import { requestEmailVerification } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'

/** Asks a plaintiff with an unconfirmed address to open the link we emailed. */
export function EmailVerificationBanner({ email }: { email: string }) {
  const { t } = useLanguage()
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const resend = async () => {
    setState('sending')
    setError(null)
    try {
      await requestEmailVerification()
      setState('sent')
    } catch (e: any) {
      setError(e?.response?.data?.error || t('plaintiffDashboard.verifyEmail.resendFailed'))
      setState('error')
    }
  }

  return (
    <section
      role="status"
      className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t('plaintiffDashboard.verifyEmail.title')}</p>
          <p className="mt-0.5 text-sm">
            {t('plaintiffDashboard.verifyEmail.body', { email })}
          </p>
          {state === 'sent' && (
            <p className="mt-1 text-sm font-medium text-emerald-700">{t('plaintiffDashboard.verifyEmail.sent', { email })}</p>
          )}
          {error && <p className="mt-1 text-sm text-rose-700">{error}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void resend()}
        disabled={state === 'sending' || state === 'sent'}
        className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
      >
        {state === 'sending' ? t('plaintiffDashboard.verifyEmail.sending') : t('plaintiffDashboard.verifyEmail.resend')}
      </button>
    </section>
  )
}

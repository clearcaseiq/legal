import { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import {
  OPEN_PREFERENCES_EVENT,
  hasGlobalPrivacyControl,
  marketingTagsPresent,
  readConsent,
  saveConsent,
  type ConsentChoice,
} from '../lib/cookieConsent'

/**
 * Shown on pages that loaded the marketing tags until the visitor chooses, and
 * again whenever "Cookie preferences" is opened from the footer. App screens
 * load no marketing tags, so there is nothing to ask about there.
 */
export default function CookieBanner() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<ConsentChoice | null>(null)
  const [gpc, setGpc] = useState(false)

  useEffect(() => {
    setGpc(hasGlobalPrivacyControl())
    const stored = readConsent()
    setCurrent(stored)
    if (!stored && marketingTagsPresent()) setOpen(true)
    const reopen = () => {
      setCurrent(readConsent())
      setOpen(true)
    }
    window.addEventListener(OPEN_PREFERENCES_EVENT, reopen)
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, reopen)
  }, [])

  if (!open) return null

  const choose = (choice: ConsentChoice) => {
    saveConsent(choice)
    setCurrent(choice)
    setOpen(false)
  }

  const button = (choice: ConsentChoice, label: string, primary = false) => (
    <button
      type="button"
      onClick={() => choose(choice)}
      aria-pressed={current === choice}
      className={
        primary
          ? 'rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700'
          : 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'
      }
    >
      {label}
    </button>
  )

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t('cookieBanner.title')}
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200 bg-white/95 px-4 py-4 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-700">
          <p className="font-semibold text-slate-900">{t('cookieBanner.title')}</p>
          <p className="mt-1">
            {t('cookieBanner.body')}{' '}
            <a href="/privacy-policy" className="font-medium text-brand-700 underline underline-offset-2">
              {t('cookieBanner.learnMore')}
            </a>
          </p>
          {gpc && <p className="mt-1 text-xs text-slate-500">{t('cookieBanner.gpcHonored')}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {button('none', t('cookieBanner.rejectAll'))}
          {button('analytics', t('cookieBanner.analyticsOnly'))}
          {button('all', t('cookieBanner.acceptAll'), true)}
        </div>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { RotateCw, X } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { currentBuildId, parseBuildId, isNewBuild } from '../lib/buildVersion'

/** Long enough to be invisible, short enough that a long session catches up. */
const POLL_INTERVAL_MS = 10 * 60 * 1000

/**
 * Tells a long-lived tab that it is running superseded code.
 *
 * A tab left open across a deploy keeps its original bundle for as long as it
 * lives, because the app never refetches its HTML and the old content-hashed
 * chunks are still served. Nothing breaks, so nothing prompts a reload — the
 * tab just shows figures computed by code that no longer exists, which is how
 * a deleted valuation formula went on being displayed hours after it shipped.
 *
 * The prompt is deliberately not an automatic reload. A claimant part-way
 * through intake would lose what they had typed, so the choice stays theirs.
 */
export default function NewVersionPrompt() {
  const { t } = useLanguage()
  const [stale, setStale] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const check = useCallback(async () => {
    const current = currentBuildId()
    if (!current) return

    try {
      const res = await fetch(window.location.pathname, {
        cache: 'no-store',
        headers: { accept: 'text/html' },
      })
      if (!res.ok) return
      if (isNewBuild(current, parseBuildId(await res.text()))) setStale(true)
    } catch {
      // Offline or blocked. Staying quiet is right: the tab is no more stale
      // than it was a moment ago, and a failed check is not evidence of a
      // deploy.
    }
  }, [])

  useEffect(() => {
    // Checking when the tab regains focus is what catches the common case —
    // a tab left open overnight, returned to the next morning.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }

    const timer = window.setInterval(() => void check(), POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [check])

  if (!stale || dismissed) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-4 print:hidden"
    >
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-brand-200 bg-white px-4 py-3 shadow-lg dark:border-brand-500/40 dark:bg-slate-900">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            {t('newVersion.title')}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-gray-500 dark:text-slate-400">
            {t('newVersion.body')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden />
          {t('newVersion.reload')}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t('newVersion.dismiss')}
          className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}

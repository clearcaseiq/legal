import { useEffect, useState } from 'react'
import { Download, Share, Plus, X } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'cciq_pwa_install_dismissed_at'
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 14 // 14 days

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const iOSDevice = /iphone|ipad|ipod/i.test(ua)
  // iPadOS 13+ reports as Mac; detect touch + Mac
  const iPadOsDesktop =
    /macintosh/i.test(ua) && 'ontouchend' in document && navigator.maxTouchPoints > 1
  return iOSDevice || iPadOsDesktop
}

function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  // Exclude in-app browsers / other engines that can't add to home screen the same way
  const notSafari = /crios|fxios|edgios|opios/i.test(ua)
  return isIos() && !notSafari
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const ts = Number(raw)
    if (!Number.isFinite(ts)) return false
    return Date.now() - ts < DISMISS_COOLDOWN_MS
  } catch {
    return false
  }
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandalone() || recentlyDismissed()) return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Small delay so it doesn't fight with initial page paint.
      window.setTimeout(() => setVisible(true), 2500)
    }

    const onInstalled = () => {
      setVisible(false)
      setIosHint(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    // iOS has no beforeinstallprompt — show a gentle hint instead.
    let iosTimer: number | undefined
    if (isIosSafari()) {
      iosTimer = window.setTimeout(() => setVisible(true), 3500)
      setIosHint(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      if (iosTimer) window.clearTimeout(iosTimer)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
  }

  const install = async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
    } catch {
      /* ignore */
    } finally {
      setDeferredPrompt(null)
      setVisible(false)
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2"
      role="dialog"
      aria-label="Install ClearCaseIQ app"
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-brand-100 bg-white p-4 shadow-2xl shadow-brand-900/20 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-900 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="" className="h-11 w-11 rounded-xl" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-semibold leading-tight text-gray-900 dark:text-slate-100">
              Install ClearCaseIQ
            </p>
            {iosHint ? (
              <p className="mt-1 text-[13px] leading-snug text-gray-600 dark:text-slate-300">
                Tap{' '}
                <Share className="mx-0.5 -mt-0.5 inline h-4 w-4 text-brand-600" aria-hidden />{' '}
                then{' '}
                <span className="whitespace-nowrap font-medium text-gray-800 dark:text-slate-200">
                  <Plus className="mx-0.5 -mt-0.5 inline h-4 w-4" aria-hidden />
                  Add to Home Screen
                </span>{' '}
                for quick, app-like access.
              </p>
            ) : (
              <p className="mt-1 text-[13px] leading-snug text-gray-600 dark:text-slate-300">
                Add it to your home screen for fast, app-like access to your case.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {!iosHint && (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={install}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-700"
            >
              <Download className="h-4 w-4" aria-hidden />
              Install app
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

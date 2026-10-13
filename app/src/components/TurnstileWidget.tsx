import { useCallback, useEffect, useRef, useState } from 'react'
import { getCaptchaConfig } from '../lib/api-plaintiff'

// Cloudflare Turnstile, loaded from Cloudflare at runtime (it may not be
// bundled). Guards the two steps that make the server send an email or text to
// whatever contact was typed: creating an intake lead and requesting the
// case-submit code.
//
// Whether it is on comes from the API, which serves the site key alongside the
// secret it verifies with, so the widget only appears where tokens are checked.
// With Turnstile off nothing renders and requests go out exactly as before.

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

function turnstileApi(): TurnstileApi | undefined {
  return typeof window === 'undefined' ? undefined : (window as unknown as { turnstile?: TurnstileApi }).turnstile
}

let scriptPromise: Promise<void> | null = null
let siteKeyPromise: Promise<string | null> | null = null

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Turnstile can only load in the browser'))
  if (turnstileApi()) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Failed to load Turnstile'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * The site key, or null when Turnstile is off. A failed config read is treated
 * as off and retried next time: the server still decides whether a request
 * without a token is acceptable, and the wizard must not stall waiting on this.
 */
export function loadTurnstileSiteKey(): Promise<string | null> {
  if (!siteKeyPromise) {
    siteKeyPromise = Promise.resolve()
      .then(() => getCaptchaConfig())
      .then((config) => (config?.enabled && config.siteKey ? config.siteKey : null))
      .catch(() => {
        siteKeyPromise = null
        return null
      })
  }
  return siteKeyPromise
}

/** Exported for tests, which switch the config between cases. */
export function resetTurnstileForTests() {
  scriptPromise = null
  siteKeyPromise = null
}

/**
 * State for one widget: the site key to render it with, and `takeToken` for
 * the request it guards.
 *
 * `takeToken` resolves to a fresh token, to `undefined` when Turnstile is off
 * (send none), or to `null` when it is on but no token arrived in time. Tokens
 * are single-use, so taking one also resets the widget for the next request.
 */
export function useTurnstile() {
  const [siteKey, setSiteKey] = useState<string | null | undefined>(undefined)
  const [resetSignal, setResetSignal] = useState(0)
  const tokenRef = useRef<string | null>(null)
  const waitersRef = useRef<Array<(token: string) => void>>([])

  useEffect(() => {
    let live = true
    void loadTurnstileSiteKey().then((key) => {
      if (live) setSiteKey(key)
    })
    return () => {
      live = false
    }
  }, [])

  const onToken = useCallback((token: string | null) => {
    tokenRef.current = token
    if (!token) return
    const waiters = waitersRef.current
    waitersRef.current = []
    waiters.forEach((resolve) => resolve(token))
  }, [])

  const takeToken = useCallback(async (timeoutMs = 8000): Promise<string | null | undefined> => {
    const key = await loadTurnstileSiteKey()
    if (!key) return undefined

    let token = tokenRef.current
    if (!token) {
      token = await new Promise<string | null>((resolve) => {
        const waiter = (value: string) => {
          window.clearTimeout(timer)
          resolve(value)
        }
        const timer = window.setTimeout(() => {
          waitersRef.current = waitersRef.current.filter((w) => w !== waiter)
          resolve(null)
        }, timeoutMs)
        waitersRef.current.push(waiter)
      })
    }
    if (!token) return null

    tokenRef.current = null
    setResetSignal((n) => n + 1)
    return token
  }, [])

  return { siteKey, onToken, resetSignal, takeToken }
}

export interface TurnstileWidgetProps {
  siteKey: string
  onToken: (token: string | null) => void
  /** Bumped by `useTurnstile` after a token is used, to fetch the next one. */
  resetSignal?: number
  /** Shown in Cloudflare's analytics, to tell the two placements apart. */
  action?: string
  className?: string
}

/**
 * Renders in "interaction-only" appearance: invisible unless Cloudflare decides
 * this visitor needs to click something, which for nearly everyone it does not.
 */
export default function TurnstileWidget({ siteKey, onToken, resetSignal = 0, action, className }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    let cancelled = false
    loadScript()
      .then(() => {
        const api = turnstileApi()
        if (cancelled || !api || !containerRef.current) return
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          action,
          appearance: 'interaction-only',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        })
      })
      .catch(() => {
        // Blocked by an extension or a network filter. Requests go out without a
        // token and the server's response decides what happens next.
      })
    return () => {
      cancelled = true
      const api = turnstileApi()
      if (widgetIdRef.current && api) api.remove(widgetIdRef.current)
      widgetIdRef.current = null
      onTokenRef.current(null)
    }
  }, [siteKey, action])

  useEffect(() => {
    const api = turnstileApi()
    if (!resetSignal || !widgetIdRef.current || !api) return
    api.reset(widgetIdRef.current)
  }, [resetSignal])

  return <div ref={containerRef} className={className} />
}

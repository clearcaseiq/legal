import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { isLocalizedPath, localeFromPath } from '../i18n/routing'
import {
  DEFAULT_LANGUAGE,
  ensureLanguageResources,
  getInitialLanguage,
  hasLanguageResources,
  seedLanguageResources,
  setStoredLanguage,
  translate,
  type LanguageCode,
  type TranslateParams,
} from '../i18n'
import { getStoredRole, getStoredUser, hasValidAuthToken } from '../lib/auth'
import { getCurrentUser, updateProfile } from '../lib/api'

type LanguageContextValue = {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
  t: (key: string, params?: TranslateParams) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function normalizePreferredLanguage(value?: string | null): LanguageCode | null {
  if (!value) return null
  const lower = value.toLowerCase()
  if (lower.startsWith('es')) return 'es'
  if (lower.startsWith('zh')) return 'zh'
  if (lower.startsWith('en')) return 'en'
  return null
}

function persistPreferredLanguageLocally(language: LanguageCode) {
  if (typeof window === 'undefined') return
  const user = getStoredUser<Record<string, unknown>>('user')
  if (!user) return
  localStorage.setItem('user', JSON.stringify({ ...user, preferredLanguage: language }))
}

export function LanguageProvider({
  children,
  deferStoredLanguage = false,
  urlLanguage,
  urlMessages,
}: {
  children: ReactNode
  /**
   * On server-rendered routes the first client render has to match markup the
   * server produced with the default language, so the stored preference is
   * adopted one commit later instead of during the initial render.
   */
  deferStoredLanguage?: boolean
  /**
   * Language fixed by the URL, on routes that have their own localized path.
   *
   * The URL wins over both the stored preference and the account setting. A
   * visitor who lands on a Spanish URL from a search result should stay on the
   * page they clicked, and a crawler must see the same language on every fetch
   * regardless of what any header says.
   */
  urlLanguage?: LanguageCode
  /** Dictionary slices for `urlLanguage`, needed before the first render. */
  urlMessages?: Record<string, unknown>
}) {
  // Seeded during the state initialiser rather than in an effect: `translate`
  // reads it while this very render runs, on the server and again during
  // hydration, and the two have to produce identical markup.
  useState(() => {
    if (urlLanguage && urlMessages) seedLanguageResources(urlLanguage, urlMessages)
  })

  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (urlLanguage) return urlLanguage
    return deferStoredLanguage ? DEFAULT_LANGUAGE : getInitialLanguage()
  })
  // Captured before any effect runs so the deferred adoption below cannot read
  // back a value that this provider itself has already persisted.
  const [pendingLanguage] = useState<LanguageCode | null>(() =>
    !urlLanguage && deferStoredLanguage && typeof window !== 'undefined' ? getInitialLanguage() : null
  )
  const [adopted, setAdopted] = useState(!pendingLanguage)
  const [resourceVersion, setResourceVersion] = useState(0)
  const accountSyncedRef = useRef(false)

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage)
    // Persist immediately so API requests (chat translation via X-Language)
    // see the new language without waiting for the effect below.
    setStoredLanguage(nextLanguage)
    // Logged-in plaintiffs persist preferred language on the account so email /
    // chat translation can use it even when they aren't actively browsing.
    if (hasValidAuthToken() && getStoredRole() === 'plaintiff') {
      persistPreferredLanguageLocally(nextLanguage)
      void updateProfile({ preferredLanguage: nextLanguage }).catch(() => {
        // Local UI language still updates; account sync can retry on next change.
      })
    }
  }, [])

  useEffect(() => {
    if (adopted) return
    if (pendingLanguage) setLanguageState(pendingLanguage)
    setAdopted(true)
  }, [adopted, pendingLanguage])

  useEffect(() => {
    if (!adopted || accountSyncedRef.current) return
    // On a localized URL the path is the authority. Without this a logged-in
    // plaintiff whose account says English would be pulled out of the Spanish
    // page they deliberately opened.
    if (urlLanguage) {
      accountSyncedRef.current = true
      return
    }
    if (!hasValidAuthToken() || getStoredRole() !== 'plaintiff') {
      accountSyncedRef.current = true
      return
    }

    let cancelled = false
    void getCurrentUser()
      .then((user) => {
        if (cancelled) return
        accountSyncedRef.current = true
        const preferred = normalizePreferredLanguage(user?.preferredLanguage)
        if (preferred) {
          setLanguageState(preferred)
          persistPreferredLanguageLocally(preferred)
        }
      })
      .catch(() => {
        accountSyncedRef.current = true
      })

    return () => {
      cancelled = true
    }
  }, [adopted, urlLanguage])

  useEffect(() => {
    if (!adopted) return
    setStoredLanguage(language)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language
    }
  }, [language, adopted])

  useEffect(() => {
    if (hasLanguageResources(language)) return

    let cancelled = false
    void ensureLanguageResources(language).then(() => {
      if (!cancelled) {
        setResourceVersion((current) => current + 1)
      }
    })

    return () => {
      cancelled = true
    }
  }, [language])

  const t = useCallback(
    (key: string, params?: TranslateParams) => translate(language, key, params),
    [language, resourceVersion]
  )

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

/**
 * Keeps the interface language in step with the path during client-side
 * navigation, for the locales that have their own URL space.
 *
 * Mounted inside the router, because the provider sits outside it and only sees
 * the entry URL. Without this, a browser Back into `/es/...` would restore the
 * Spanish URL with English text.
 *
 * Unprefixed paths are left alone on purpose. `/press` and the rest have no
 * translated URL, so a reader who prefers Spanish should keep reading them in
 * Spanish rather than being forced back to English by their own address bar.
 */
export function LocalePathSync() {
  const location = useLocation()
  const { language, setLanguage } = useLanguage()
  const pathLocale = isLocalizedPath(location.pathname) ? localeFromPath(location.pathname) : null

  useEffect(() => {
    if (pathLocale && pathLocale !== language) setLanguage(pathLocale)
  }, [pathLocale, language, setLanguage])

  return null
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => undefined,
      t: (key: string, params?: TranslateParams) => translate(DEFAULT_LANGUAGE, key, params),
    }
  }
  return context
}

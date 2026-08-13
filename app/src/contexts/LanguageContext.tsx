import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  DEFAULT_LANGUAGE,
  ensureLanguageResources,
  getInitialLanguage,
  hasLanguageResources,
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
}: {
  children: ReactNode
  /**
   * On server-rendered routes the first client render has to match markup the
   * server produced with the default language, so the stored preference is
   * adopted one commit later instead of during the initial render.
   */
  deferStoredLanguage?: boolean
}) {
  const [language, setLanguageState] = useState<LanguageCode>(() =>
    deferStoredLanguage ? DEFAULT_LANGUAGE : getInitialLanguage()
  )
  // Captured before any effect runs so the deferred adoption below cannot read
  // back a value that this provider itself has already persisted.
  const [pendingLanguage] = useState<LanguageCode | null>(() =>
    deferStoredLanguage && typeof window !== 'undefined' ? getInitialLanguage() : null
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
  }, [adopted])

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

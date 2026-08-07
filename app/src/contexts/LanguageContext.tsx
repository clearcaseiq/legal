import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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

type LanguageContextValue = {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
  t: (key: string, params?: TranslateParams) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => getInitialLanguage())
  const [resourceVersion, setResourceVersion] = useState(0)

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage)
  }, [])

  useEffect(() => {
    setStoredLanguage(language)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language
    }
  }, [language])

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

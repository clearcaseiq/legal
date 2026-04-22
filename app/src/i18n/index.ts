import en from './locales/en.json'

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
] as const

export type LanguageCode = 'en' | 'es' | 'zh'
export const DEFAULT_LANGUAGE: LanguageCode = 'en'
export const LANGUAGE_STORAGE_KEY = 'i18nextLng'

type TranslationDictionary = Record<string, unknown>

const resources: Partial<Record<LanguageCode, TranslationDictionary>> = {
  en,
}

const resourceLoaders: Partial<Record<LanguageCode, () => Promise<TranslationDictionary>>> = {
  es: () => import('./locales/es.json').then((module) => module.default as TranslationDictionary),
  zh: () => import('./locales/zh.json').then((module) => module.default as TranslationDictionary),
}

const inFlightLoads = new Map<LanguageCode, Promise<void>>()

function normalizeLanguage(language?: string | null): LanguageCode {
  const value = language?.toLowerCase()
  if (value?.startsWith('es')) return 'es'
  if (value?.startsWith('zh')) return 'zh'
  return DEFAULT_LANGUAGE
}

export function getInitialLanguage(): LanguageCode {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (storedLanguage) {
    return normalizeLanguage(storedLanguage)
  }

  return normalizeLanguage(window.navigator.language)
}

export function setStoredLanguage(language: LanguageCode) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }
}

export function hasLanguageResources(language: LanguageCode) {
  return !!resources[language]
}

export async function ensureLanguageResources(language: LanguageCode) {
  if (resources[language]) return

  const existingLoad = inFlightLoads.get(language)
  if (existingLoad) {
    await existingLoad
    return
  }

  const loader = resourceLoaders[language]
  if (!loader) return

  const load = loader()
    .then((dictionary) => {
      resources[language] = dictionary
    })
    .finally(() => {
      inFlightLoads.delete(language)
    })

  inFlightLoads.set(language, load)
  await load
}

function getNestedTranslation(source: unknown, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined
    }
    return (current as Record<string, unknown>)[segment]
  }, source)

  return typeof value === 'string' ? value : undefined
}

export function translate(language: LanguageCode, key: string): string {
  return (
    getNestedTranslation(resources[language], key) ??
    getNestedTranslation(resources[DEFAULT_LANGUAGE], key) ??
    key
  )
}

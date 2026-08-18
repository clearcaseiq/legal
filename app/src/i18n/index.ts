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

// Copied rather than aliased so the lazy merge below writes into our own object
// instead of mutating the shared module record webpack hands out for the JSON.
const resources: Partial<Record<LanguageCode, TranslationDictionary>> = {
  en: { ...en },
}

/**
 * The English strings for the intake wizard, the results report and the
 * plaintiff dashboard, which live in `en-app.json`.
 *
 * Those three namespaces are three quarters of the English dictionary — 215 KB
 * of the 291 KB — and none of them appear on a marketing or landing page. While
 * they sat in `en.json` every anonymous visitor parsed all of it before first
 * paint to read the handful of kilobytes of nav and hero copy they could
 * actually see.
 *
 * English is the fallback `translate` reaches for when a key is missing in any
 * other language, so this cannot be loaded on demand per key: a screen that
 * rendered before the file arrived would show raw key paths. Instead the four
 * routes that read these namespaces await it as part of their own lazy chunk
 * load, behind the route skeleton that was already there. See `withAppMessages`
 * in App.tsx.
 *
 * Three small subtrees stay behind in `en.json` because they are read from
 * outside those routes: `plaintiffDashboard.skeleton` is the loading screen
 * shown *during* this very load, and `statusLabels` / `litigationLabels` are
 * built as key strings by `lib/caseStatus`, which any surface may call.
 */
let appMessagesLoad: Promise<void> | null = null

export function ensureAppMessages(): Promise<void> {
  if (!appMessagesLoad) {
    appMessagesLoad = import('./locales/en-app.json').then((module) => {
      Object.assign(resources[DEFAULT_LANGUAGE] as TranslationDictionary, module.default)
    })
  }
  return appMessagesLoad
}

const resourceLoaders: Partial<Record<LanguageCode, () => Promise<TranslationDictionary>>> = {
  es: () => import('./locales/es.json').then((module) => module.default as TranslationDictionary),
  zh: () => import('./locales/zh.json').then((module) => module.default as TranslationDictionary),
}

const inFlightLoads = new Map<LanguageCode, Promise<void>>()

/**
 * Languages whose full dictionary is loaded, as opposed to the handful of
 * namespaces a server-rendered page seeds.
 *
 * `resources[language]` being present is no longer proof the language is ready:
 * a `/es` page seeds only the namespaces its own markup needs, so that the
 * server's Spanish HTML and the client's first render agree without shipping
 * the whole 280 KB dictionary before paint. Treating that partial seed as
 * complete would leave every other string on the page in English forever.
 */
const completeLanguages = new Set<LanguageCode>([DEFAULT_LANGUAGE])

/**
 * Merge a subset of a dictionary in, for the first render of a page the server
 * rendered in that language. Safe to call repeatedly with the same payload.
 */
export function seedLanguageResources(language: LanguageCode, messages: TranslationDictionary) {
  if (completeLanguages.has(language)) return
  resources[language] = { ...resources[language], ...messages }
}

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
  return completeLanguages.has(language)
}

export async function ensureLanguageResources(language: LanguageCode) {
  if (completeLanguages.has(language)) return

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
      completeLanguages.add(language)
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

export type TranslateParams = Record<string, string | number>

// Replace `{name}` style placeholders with provided values. Unknown placeholders
// are left intact so a missing param is visible rather than silently dropped.
function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  )
}

export function translate(language: LanguageCode, key: string, params?: TranslateParams): string {
  const template =
    getNestedTranslation(resources[language], key) ??
    getNestedTranslation(resources[DEFAULT_LANGUAGE], key) ??
    key
  return interpolate(template, params)
}

/** BCP 47 locale tag for `toLocaleString` / `toLocaleDateString` from UI language. */
export function dateLocale(language: LanguageCode): string {
  if (language === 'es') return 'es-US'
  if (language === 'zh') return 'zh-CN'
  return 'en-US'
}

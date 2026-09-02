/**
 * Translate attorney/plaintiff communications to a target language.
 * Uses OpenAI when configured; falls back to the original text otherwise.
 */
import { logger } from './logger'
import { getLlmChatClient, LLM_CHAT_MODEL } from './llm-client'

const openai = getLlmChatClient()
const TRANSLATE_MODEL = LLM_CHAT_MODEL

export type SupportedLanguage = 'en' | 'es' | 'zh'

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Spanish',
  zh: 'Chinese (Simplified)',
}

export function normalizeLanguageCode(language?: string | null): SupportedLanguage {
  const value = (language || 'en').toLowerCase()
  if (value.startsWith('es')) return 'es'
  if (value.startsWith('zh')) return 'zh'
  return 'en'
}

// CJK ranges plus common Spanish punctuation/stopwords — a cheap pre-filter so we
// only spend an LLM call when text plausibly isn't English.
const CJK_PATTERN = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/
const SPANISH_HINT_PATTERN = /[¿¡]|\b(?:el|la|los|las|una?|que|porque|gracias|hola|usted|señor|años|también|está|estoy|tengo|necesito|abogado|accidente|lesión|lesiones|por|para|con|mensaje|documento)\b/i

export function looksNonEnglish(text: string): boolean {
  if (!text?.trim()) return false
  if (CJK_PATTERN.test(text)) return true
  return SPANISH_HINT_PATTERN.test(text)
}

export function guessSourceLanguage(text: string, fallback: SupportedLanguage = 'en'): SupportedLanguage {
  if (!text?.trim()) return fallback
  if (CJK_PATTERN.test(text)) return 'zh'
  if (SPANISH_HINT_PATTERN.test(text)) return 'es'
  return fallback
}

/**
 * Translate text into a target language. No-ops when source and target match
 * or when the LLM provider is unavailable.
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang?: string,
): Promise<string> {
  if (!text?.trim()) return text
  const target = normalizeLanguageCode(targetLang)
  const source = normalizeLanguageCode(sourceLang || guessSourceLanguage(text, target === 'en' ? 'es' : 'en'))
  if (target === source) return text

  if (!openai) {
    logger.debug('LLM not configured, skipping translation', { target, source })
    return text
  }

  try {
    const completion = await openai.chat.completions.create({
      model: TRANSLATE_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a professional legal translator. Translate the following message from ${LANGUAGE_NAMES[source]} to ${LANGUAGE_NAMES[target]}. Preserve the tone, formatting, and meaning. If the text is already in ${LANGUAGE_NAMES[target]}, return it unchanged. Return ONLY the translated text, no explanations.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    })

    const translated = completion.choices?.[0]?.message?.content?.trim()
    return translated || text
  } catch (err: any) {
    logger.warn('Translation failed, using original', { error: err?.message, target, source })
    return text
  }
}

/**
 * Translate text from English to the plaintiff's preferred language.
 * @param text - Original text (assumed to be in English from attorney)
 * @param targetLang - Plaintiff's language code (e.g. 'es', 'zh')
 * @returns Translated text, or original if translation fails or target is 'en'
 */
export async function translateForPlaintiff(text: string, targetLang: string): Promise<string> {
  return translateText(text, targetLang, 'en')
}

/**
 * Translate plaintiff-authored text into English for attorney-facing views.
 * No-ops when the text already looks like English or OpenAI is not configured.
 */
export async function translateToEnglish(text: string): Promise<string> {
  if (!text?.trim()) return text
  if (!looksNonEnglish(text)) return text
  return translateText(text, 'en')
}

/**
 * Get plaintiff's preferred language from request.
 * Prefer X-Language (active UI language on web/mobile) over the stored account
 * preference so chat translation matches what the user currently selected —
 * the DB field can lag or stay at the default `en`.
 */
export function getPlaintiffLanguage(req: {
  headers?: Record<string, string | string[] | undefined>
  user?: { preferredLanguage?: string | null }
}): SupportedLanguage {
  const xLang = req.headers?.['x-language']
  if (xLang && typeof xLang === 'string' && xLang.trim()) {
    return normalizeLanguageCode(xLang)
  }
  if (Array.isArray(xLang) && xLang[0]) {
    return normalizeLanguageCode(xLang[0])
  }

  if (req.user?.preferredLanguage) {
    return normalizeLanguageCode(req.user.preferredLanguage)
  }

  const acceptLang = req.headers?.['accept-language']
  if (acceptLang && typeof acceptLang === 'string') {
    const first = acceptLang.split(',')[0]?.trim()
    if (first) return normalizeLanguageCode(first)
  }

  return 'en'
}

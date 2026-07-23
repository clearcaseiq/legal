/**
 * Translate attorney communications to plaintiff's preferred language.
 * Uses the configured LLM provider (OpenAI or Kimi) when available; falls back
 * to original text otherwise.
 */
import { logger } from './logger'
import { getLlmChatClient, LLM_CHAT_MODEL } from './llm-client'

const openai = getLlmChatClient()
const TRANSLATE_MODEL = LLM_CHAT_MODEL

const TARGET_LANGUAGES: Record<string, string> = {
  es: 'Spanish',
  zh: 'Chinese (Simplified)',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
}

/**
 * Translate text from English to the plaintiff's preferred language.
 * @param text - Original text (assumed to be in English from attorney)
 * @param targetLang - Plaintiff's language code (e.g. 'es', 'zh')
 * @returns Translated text, or original if translation fails or target is 'en'
 */
export async function translateForPlaintiff(text: string, targetLang: string): Promise<string> {
  if (!text?.trim()) return text
  const lang = (targetLang || 'en').toLowerCase().split('-')[0]
  if (lang === 'en') return text

  const targetLanguage = TARGET_LANGUAGES[lang] || TARGET_LANGUAGES[targetLang]
  if (!targetLanguage) return text

  if (!openai) {
    logger.debug('OpenAI not configured, skipping translation', { targetLang })
    return text
  }

  try {
    const completion = await openai.chat.completions.create({
      model: TRANSLATE_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a professional legal translator. Translate the following message from English to ${targetLanguage}. Preserve the tone, formatting, and meaning. Return ONLY the translated text, no explanations.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })

    const translated = completion.choices?.[0]?.message?.content?.trim()
    return translated || text
  } catch (err: any) {
    logger.warn('Translation failed, using original', { error: err?.message, targetLang })
    return text
  }
}

// CJK ranges plus common Spanish punctuation/stopwords — a cheap pre-filter so we
// only spend an OpenAI call when text plausibly isn't English.
const CJK_PATTERN = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/
const SPANISH_HINT_PATTERN = /[¿¡]|\b(?:el|la|los|las|una?|que|porque|gracias|hola|usted|señor|años|también|está|estoy|tengo|necesito|abogado|accidente|lesión|lesiones)\b/i

export function looksNonEnglish(text: string): boolean {
  if (!text?.trim()) return false
  if (CJK_PATTERN.test(text)) return true
  return SPANISH_HINT_PATTERN.test(text)
}

/**
 * Translate plaintiff-authored text into English for attorney-facing views.
 * No-ops when the text already looks like English or OpenAI is not configured.
 */
export async function translateToEnglish(text: string): Promise<string> {
  if (!text?.trim()) return text
  if (!looksNonEnglish(text)) return text

  if (!openai) {
    logger.debug('OpenAI not configured, skipping English translation')
    return text
  }

  try {
    const completion = await openai.chat.completions.create({
      model: TRANSLATE_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a professional legal translator. Translate the following message into English. Preserve the tone, formatting, and meaning. If the text is already English, return it unchanged. Return ONLY the translated text, no explanations.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })

    const translated = completion.choices?.[0]?.message?.content?.trim()
    return translated || text
  } catch (err: any) {
    logger.warn('English translation failed, using original', { error: err?.message })
    return text
  }
}

/**
 * Get plaintiff's preferred language from request.
 * Checks: X-Language header, Accept-Language header, User.preferredLanguage (if available).
 */
export function getPlaintiffLanguage(req: { headers?: Record<string, string | string[] | undefined>; user?: { preferredLanguage?: string } }): string {
  const xLang = req.headers?.['x-language']
  if (xLang && typeof xLang === 'string') return xLang
  if (Array.isArray(xLang) && xLang[0]) return xLang[0]

  const acceptLang = req.headers?.['accept-language']
  if (acceptLang && typeof acceptLang === 'string') {
    const first = acceptLang.split(',')[0]?.trim().split('-')[0]
    if (first) return first
  }

  if (req.user?.preferredLanguage) return req.user.preferredLanguage

  return 'en'
}

/**
 * Translate attorney communications to plaintiff's preferred language.
 * Uses OpenAI when available; falls back to original text otherwise.
 */
import OpenAI from 'openai'
import { logger } from './logger'

const openai = (process.env.OPENAI_API_KEY)
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

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
      model: 'gpt-4o-mini',
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

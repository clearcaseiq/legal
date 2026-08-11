/**
 * Reader-facing chat translation helpers.
 *
 * CP-572 still applies: `content` is always the original text the sender typed.
 * When the reader's preferred language differs, we attach `contentTranslated`
 * (and cache it on Message.metadata.translations) instead of rewriting content.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import {
  guessSourceLanguage,
  normalizeLanguageCode,
  translateText,
  type SupportedLanguage,
} from './translate'

type MessageRow = {
  id: string
  content: string
  senderType: string
  metadata?: string | null
  [key: string]: unknown
}

type MessageMetadata = {
  translations?: Partial<Record<SupportedLanguage, string>>
  [key: string]: unknown
}

function parseMetadata(raw: string | null | undefined): MessageMetadata {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as MessageMetadata) : {}
  } catch {
    return {}
  }
}

async function cacheTranslation(messageId: string, lang: SupportedLanguage, translated: string, existingRaw?: string | null) {
  try {
    const meta = parseMetadata(existingRaw)
    const translations = { ...(meta.translations || {}), [lang]: translated }
    await prisma.message.update({
      where: { id: messageId },
      data: { metadata: JSON.stringify({ ...meta, translations }) },
    })
  } catch (err: any) {
    logger.debug('Failed to cache message translation', { messageId, lang, error: err?.message })
  }
}

/**
 * For each message from the *other* party, attach contentTranslated when the
 * reader's language differs from the source language. Own messages stay as-is.
 */
export async function decorateMessagesForReader<T extends MessageRow>(
  messages: T[],
  readerLang: string,
  readerSenderType: 'user' | 'attorney',
): Promise<Array<T & { contentTranslated?: string | null }>> {
  const target = normalizeLanguageCode(readerLang)
  const out: Array<T & { contentTranslated?: string | null }> = []

  for (const message of messages) {
    if (message.senderType === readerSenderType || !message.content?.trim()) {
      out.push({ ...message, contentTranslated: null })
      continue
    }

    const meta = parseMetadata(message.metadata)
    const cached = meta.translations?.[target]
    if (cached && cached.trim() && cached.trim() !== message.content.trim()) {
      out.push({ ...message, contentTranslated: cached })
      continue
    }

    const sourceFallback = message.senderType === 'attorney' ? 'en' : target === 'en' ? 'es' : target
    const source = guessSourceLanguage(message.content, sourceFallback)
    if (source === target) {
      out.push({ ...message, contentTranslated: null })
      continue
    }

    const translated = await translateText(message.content, target, source)
    if (!translated || translated.trim() === message.content.trim()) {
      out.push({ ...message, contentTranslated: null })
      continue
    }

    void cacheTranslation(message.id, target, translated, message.metadata)
    out.push({ ...message, contentTranslated: translated })
  }

  return out
}

export async function translatePreviewForLanguage(
  text: string,
  targetLang: string,
  sourceFallback: SupportedLanguage = 'en',
): Promise<string> {
  const target = normalizeLanguageCode(targetLang)
  const source = guessSourceLanguage(text, sourceFallback)
  if (source === target) return text
  return translateText(text, target, source)
}

export const MESSAGE_EMAIL_I18N: Record<
  SupportedLanguage,
  {
    subject: (attorneyName: string) => string
    body: (args: { plaintiffName: string; attorneyName: string; preview: string; link: string }) => string
  }
> = {
  en: {
    subject: (attorneyName) => `New message from ${attorneyName}`,
    body: ({ plaintiffName, attorneyName, preview, link }) =>
      `Hi ${plaintiffName},\n\n${attorneyName} sent you a new message:\n\n"${preview}"\n\nView and reply here:\n${link}\n\nBest regards,\nClearCaseIQ`,
  },
  es: {
    subject: (attorneyName) => `Nuevo mensaje de ${attorneyName}`,
    body: ({ plaintiffName, attorneyName, preview, link }) =>
      `Hola ${plaintiffName},\n\n${attorneyName} te envió un nuevo mensaje:\n\n"${preview}"\n\nVer y responder aquí:\n${link}\n\nSaludos,\nClearCaseIQ`,
  },
  zh: {
    subject: (attorneyName) => `来自 ${attorneyName} 的新消息`,
    body: ({ plaintiffName, attorneyName, preview, link }) =>
      `您好 ${plaintiffName}，\n\n${attorneyName} 给您发送了一条新消息：\n\n"${preview}"\n\n在此查看并回复：\n${link}\n\n此致，\nClearCaseIQ`,
  },
}

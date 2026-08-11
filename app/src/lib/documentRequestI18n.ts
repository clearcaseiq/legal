import type { TranslateParams } from '../i18n'
import { DOCUMENT_REQUEST_LABEL_KEYS } from './documentRequestLabels'

type Translate = (key: string, params?: TranslateParams) => string

const KNOWN_LABEL_KEYS = new Set(DOCUMENT_REQUEST_LABEL_KEYS)

/** Localized display label for a document-request key (falls back to API/English label). */
export function localizeDocumentRequestLabel(
  key: string,
  t: Translate,
  fallbackLabel?: string | null,
): string {
  if (KNOWN_LABEL_KEYS.has(key as (typeof DOCUMENT_REQUEST_LABEL_KEYS)[number])) {
    return t(`plaintiffDashboard.docRequestLabels.${key}`)
  }
  if (fallbackLabel?.trim()) return fallbackLabel
  return key.replace(/_/g, ' ')
}

/**
 * Localize attorney/system notes on document requests when they match known
 * templates. Free-form attorney text is left unchanged.
 */
export function localizeDocumentRequestMessage(
  message: string | null | undefined,
  itemKeys: string[],
  t: Translate,
): string | null {
  if (!message?.trim()) return null
  const trimmed = message.trim()
  if (itemKeys.length === 0) return trimmed

  const docs = itemKeys
    .map((key) => localizeDocumentRequestLabel(key, t).toLowerCase())
    .join(', ')

  if (/^To keep your case moving, please send /i.test(trimmed)) {
    const reasonKey = itemKeys[0]
    const specificReasonKeys = new Set(['medical_records', 'police_report', 'bills', 'hipaa'])
    const reason = specificReasonKeys.has(reasonKey)
      ? t(`plaintiffDashboard.docRequestReasons.${reasonKey}`)
      : t('plaintiffDashboard.docRequestReasons.default')
    return t('plaintiffDashboard.docRequestMessages.keepMoving', { docs, reason })
  }

  if (/^Please send /i.test(trimmed)) {
    return t('plaintiffDashboard.docRequestMessages.pleaseSend', { docs })
  }

  return trimmed
}

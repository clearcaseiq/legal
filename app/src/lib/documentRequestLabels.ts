/**
 * Canonical document-request keys that have plaintiff-facing i18n labels.
 * Keep in sync with api/src/lib/document-request-status.ts DOCUMENT_REQUEST_LABELS.
 */
export const DOCUMENT_REQUEST_LABEL_KEYS = [
  'police_report',
  'medical_records',
  'injury_photos',
  'wage_loss',
  'insurance',
  'dec_page',
  'other',
  'bills',
  'photos',
  'hipaa',
  'prior_treatment',
  'product_preservation',
] as const

export type DocumentRequestLabelKey = (typeof DOCUMENT_REQUEST_LABEL_KEYS)[number]

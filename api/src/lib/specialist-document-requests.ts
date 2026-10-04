import { prisma } from './prisma'
import { PLAINTIFF_EVENTS } from './notification-events'
import {
  countRequestUploads,
  evidenceCategoryForRequestKey,
  isRequestedDocFulfilled,
  normalizeRequestedDocKeys,
  requestUploadSubcategory,
  requestedDocLabel,
  type RequestEvidenceFile,
} from './document-request-status'

/**
 * Documents a case specialist has asked the claimant for, read back from the
 * request emails.
 *
 * A case in the assistance queue has no `LeadSubmission` or `Attorney`, so a
 * specialist's ask cannot be a `DocumentRequest` row (see the document-request
 * route in routes/case-assistance.ts). Only that route emits
 * `plaintiff.doc_requested`, and each event's payload carries the requested
 * keys, so the events are the record.
 *
 * Every ask on a case folds into one request: asking for medical records three
 * times is one item asked three times, not three items. An item counts as
 * received once something arrives after its most recent ask, so asking again
 * after a wrong upload reopens it.
 */
export type SpecialistRequestItem = {
  key: string
  label: string
  fulfilled: boolean
  uploadedCount: number
  uploadCategory: string
  uploadSubcategory: string | null
  askCount: number
  lastAskedAt: Date
}

export type SpecialistDocumentRequest = {
  requestedBy: string | null
  message: string | null
  firstAskedAt: Date
  lastAskedAt: Date
  items: SpecialistRequestItem[]
  status: 'pending' | 'partial' | 'completed'
}

type AskPayload = { docs?: unknown; message?: unknown; fromName?: unknown }

function parsePayload(json: string | null): AskPayload {
  if (!json) return {}
  try {
    const parsed = JSON.parse(json) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as AskPayload) : {}
  } catch {
    return {}
  }
}

export async function loadSpecialistDocumentRequest(
  assessmentId: string,
  evidenceFiles: RequestEvidenceFile[],
): Promise<SpecialistDocumentRequest | null> {
  const asks = await prisma.platformNotificationEvent.findMany({
    where: { assessmentId, eventType: PLAINTIFF_EVENTS.doc_requested },
    orderBy: { createdAt: 'asc' },
    take: 200,
    select: { payloadJson: true, createdAt: true },
  })
  if (asks.length === 0) return null

  const byKey = new Map<string, { askCount: number; lastAskedAt: Date }>()
  let requestedBy: string | null = null
  let message: string | null = null
  for (const ask of asks) {
    const payload = parsePayload(ask.payloadJson)
    for (const key of normalizeRequestedDocKeys(payload.docs)) {
      const seen = byKey.get(key)
      byKey.set(key, { askCount: (seen?.askCount ?? 0) + 1, lastAskedAt: ask.createdAt })
    }
    if (typeof payload.fromName === 'string' && payload.fromName.trim()) requestedBy = payload.fromName.trim()
    if (typeof payload.message === 'string' && payload.message.trim()) message = payload.message.trim()
  }
  if (byKey.size === 0) return null

  const requestKeys = Array.from(byKey.keys())
  const items = requestKeys.map((key) => {
    const { askCount, lastAskedAt } = byKey.get(key)!
    const match = { key, evidenceFiles, requestCreatedAt: lastAskedAt, requestKeys }
    return {
      key,
      label: requestedDocLabel(key),
      fulfilled: isRequestedDocFulfilled(match),
      uploadedCount: countRequestUploads(match),
      uploadCategory: evidenceCategoryForRequestKey(key),
      uploadSubcategory: requestUploadSubcategory(key),
      askCount,
      lastAskedAt,
    }
  })
  const fulfilled = items.filter((item) => item.fulfilled).length

  return {
    requestedBy,
    message,
    firstAskedAt: asks[0].createdAt,
    lastAskedAt: asks[asks.length - 1].createdAt,
    items,
    status: fulfilled === items.length ? 'completed' : fulfilled > 0 ? 'partial' : 'pending',
  }
}

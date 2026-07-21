import { prisma } from './prisma'
import { logger } from './logger'

/**
 * Maps an attorney-requested document type to the evidence categories that
 * satisfy it. Kept as the single source of truth so the plaintiff view
 * (assessments route) and the persisted status stay consistent.
 */
export const DOCUMENT_REQUEST_CATEGORY_MAP: Record<string, string[]> = {
  // Include synonyms actually used across the app so a plaintiff upload advances
  // the matching request regardless of which category spelling the upload UI
  // sends (e.g. request key `injury_photos` vs upload category `photos`) — CP-330.
  police_report: ['police_report', 'police'],
  medical_records: ['medical_records', 'bills', 'medical', 'medical_bills'],
  injury_photos: ['photos', 'injury_photos', 'injury', 'injuries'],
  wage_loss: ['wage_loss', 'lost_wages', 'wages'],
  insurance: ['insurance', 'insurance_card', 'insurance_info'],
  other: [],
}

export function parseRequestedDocs(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
      : []
  } catch {
    return []
  }
}

/** Compute a request's status from the set of uploaded evidence categories. */
export function computeRequestStatus(requestedDocs: string[], uploadedCategories: Set<string>): string | null {
  if (requestedDocs.length === 0) return null // link-only / free-form request: can't auto-complete
  const fulfilledCount = requestedDocs.filter((key) => {
    const accepted = DOCUMENT_REQUEST_CATEGORY_MAP[key] || []
    // Match a known synonym, or the request key used verbatim as the upload
    // category (the requested-docs uploader tags files with the request key).
    return uploadedCategories.has(key) || accepted.some((category) => uploadedCategories.has(category))
  }).length
  if (fulfilledCount === 0) return 'pending'
  return fulfilledCount === requestedDocs.length ? 'completed' : 'partial'
}

/**
 * Recompute and persist the status of the plaintiff-facing document requests for
 * an assessment based on the evidence uploaded so far. The attorney "Request
 * from client" list reads the stored status, so without this a client's upload
 * would leave the request stuck on "pending" (CP-330). Never downgrades a
 * request (e.g. back to pending) and ignores opposing-party requests, which are
 * tracked separately through the external portal.
 */
export async function syncPlaintiffDocumentRequestStatuses(assessmentId: string): Promise<void> {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        evidenceFiles: { select: { category: true } },
        leadSubmission: {
          select: {
            documentRequests: {
              where: { targetType: 'plaintiff' },
              select: { id: true, requestedDocs: true, status: true },
            },
          },
        },
      },
    })

    const requests = assessment?.leadSubmission?.documentRequests || []
    if (requests.length === 0) return

    const uploadedCategories = new Set(
      (assessment?.evidenceFiles || []).map((f) => f.category).filter(Boolean) as string[]
    )

    const rank: Record<string, number> = { pending: 0, partial: 1, completed: 2 }
    for (const request of requests) {
      const next = computeRequestStatus(parseRequestedDocs(request.requestedDocs), uploadedCategories)
      // Only advance status; never regress a request the attorney already sees progressing.
      if (next && next !== request.status && (rank[next] ?? 0) > (rank[request.status] ?? 0)) {
        await prisma.documentRequest.update({ where: { id: request.id }, data: { status: next } })
      }
    }
  } catch (error: any) {
    logger.warn('Failed to sync document request status', { error: error?.message, assessmentId })
  }
}

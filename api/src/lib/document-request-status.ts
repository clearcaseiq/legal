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
  insurance: ['insurance', 'insurance_card', 'insurance_info', 'insurance_letters', 'dec_page'],
  // Declarations page requests (attorney insurance / DEC flow) — CP-583.
  dec_page: ['dec_page', 'insurance', 'insurance_policy', 'insurance_letters', 'declarations'],
  other: [],
  // AI "suggested document request" keys (from case-insights missingDocs). Mapped
  // here so a client upload advances them and, crucially, so the plaintiff view can
  // resolve a friendly label that matches the attorney note (CP-318).
  bills: ['bills', 'medical_bills', 'medical'],
  photos: ['photos', 'injury_photos', 'injury', 'injuries'],
  hipaa: ['hipaa', 'hipaa_authorization', 'authorization'],
  prior_treatment: ['prior_treatment', 'medical_records', 'medical'],
  product_preservation: ['product', 'product_evidence', 'product_photos', 'photos'],
}

/**
 * Friendly labels for every document-request key the app can emit — both the manual
 * picker keys (DocumentRequestModal) and the AI "suggested request" keys from
 * case-insights missingDocs. Kept here as the single source of truth so the
 * plaintiff "Upload next" pills read the SAME name the attorney note uses (CP-318).
 */
export const DOCUMENT_REQUEST_LABELS: Record<string, string> = {
  police_report: 'Police/incident report',
  medical_records: 'Medical records',
  injury_photos: 'Injury photos',
  wage_loss: 'Wage loss documentation',
  insurance: 'Insurance information',
  dec_page: 'Insurance declarations (Dec) page',
  other: 'Other documents',
  // Suggested-request keys — labels mirror case-insights missingDocs exactly.
  bills: 'Medical bills',
  photos: 'Injury/damage photos',
  hipaa: 'HIPAA authorization',
  prior_treatment: 'Prior treatment records',
  product_preservation: 'Product preservation confirmation',
}

/**
 * Some attorney surfaces (the case workspace Evidence tab, and the AI
 * missing-items fallback) send the human-readable label instead of the
 * canonical key. Stored that way, no category lookup ever matched, so a
 * request could never advance past "pending" no matter what the client
 * uploaded, and the plaintiff saw a raw label instead of the curated one
 * (CP-330, CP-318). Normalizing here fixes both new and already-stored rows.
 */
const REQUEST_KEY_ALIASES: Record<string, string> = {
  'medical records': 'medical_records',
  'medical record': 'medical_records',
  'medical bills': 'bills',
  'medical bill': 'bills',
  'police / incident report': 'police_report',
  'police/incident report': 'police_report',
  'police report': 'police_report',
  'incident report': 'police_report',
  'photos of injuries': 'injury_photos',
  'injury photos': 'injury_photos',
  'injury/damage photos': 'photos',
  'photos of property damage': 'photos',
  'property damage photos': 'photos',
  'insurance information': 'insurance',
  'insurance info': 'insurance',
  'insurance declarations (dec) page': 'dec_page',
  'insurance declarations page': 'dec_page',
  'declarations page': 'dec_page',
  'dec page': 'dec_page',
  'wage-loss documentation': 'wage_loss',
  'wage loss documentation': 'wage_loss',
  'lost wages': 'wage_loss',
  'prior treatment records': 'prior_treatment',
  'hipaa authorization': 'hipaa',
  'other documents': 'other',
}

/** Resolve a requested-doc entry to its canonical key, tolerating labels. */
export function normalizeRequestedDocKey(value: string): string {
  const raw = (value || '').trim()
  if (!raw) return raw
  if (DOCUMENT_REQUEST_CATEGORY_MAP[raw] || DOCUMENT_REQUEST_LABELS[raw]) return raw
  const collapsed = raw.toLowerCase().replace(/\s+/g, ' ')
  const aliased = REQUEST_KEY_ALIASES[collapsed]
  if (aliased) return aliased
  const slug = collapsed.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return DOCUMENT_REQUEST_CATEGORY_MAP[slug] ? slug : raw
}

export function normalizeRequestedDocKeys(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) continue
    const key = normalizeRequestedDocKey(value)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

export function parseRequestedDocs(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return normalizeRequestedDocKeys(parsed)
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

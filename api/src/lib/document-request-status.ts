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
  // Intake Supporting Documents uploads wage docs as `wage_verification`.
  wage_loss: ['wage_loss', 'lost_wages', 'wages', 'wage_verification'],
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
  // Prior treatment records. The plaintiff Tasks inline uploader saves these into
  // the `medical_records` category (see app documentRequestUpload.ts), so that
  // category MUST count here or a client's upload can never clear the request
  // (CP: "uploaded the document but still showing under action required").
  // The old worry — a brand-new request auto-completing from PRE-EXISTING case
  // records — is already prevented by isRequestedDocFulfilled's time gate, which
  // only counts evidence uploaded at/after the request was created.
  prior_treatment: ['prior_treatment', 'prior_medical', 'prior_records', 'medical_records', 'medical'],
  product_preservation: ['product', 'product_evidence', 'product_photos', 'photos'],
  // Intake Supporting Documents files these under `witness_statements`.
  witness_statements: ['witness_statements', 'witness_statement', 'witness', 'statements'],
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
  witness_statements: 'Witness statements',
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
  'witness statement': 'witness_statements',
  'witness statements': 'witness_statements',
  'witness statement(s)': 'witness_statements',
}

/**
 * Attorney-written request items ("custom:Rideshare trip receipt") for documents
 * the preset list does not cover. The text after the prefix is shown to the
 * client verbatim, and an upload filed as `other` after the request satisfies it.
 */
export const CUSTOM_REQUEST_PREFIX = 'custom:'
const CUSTOM_REQUEST_MAX_LENGTH = 120

export function isCustomRequestKey(key: string): boolean {
  return (key || '').toLowerCase().startsWith(CUSTOM_REQUEST_PREFIX)
}

/** Client-facing name for a requested-doc key, including custom items. */
export function requestedDocLabel(key: string): string {
  if (isCustomRequestKey(key)) return key.slice(CUSTOM_REQUEST_PREFIX.length)
  return DOCUMENT_REQUEST_LABELS[key] || key.replace(/[_-]+/g, ' ')
}

/** Resolve a requested-doc entry to its canonical key, tolerating labels. */
export function normalizeRequestedDocKey(value: string): string {
  const raw = (value || '').trim()
  if (!raw) return raw
  if (isCustomRequestKey(raw)) {
    const text = raw
      .slice(CUSTOM_REQUEST_PREFIX.length)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, CUSTOM_REQUEST_MAX_LENGTH)
    return text ? `${CUSTOM_REQUEST_PREFIX}${text}` : ''
  }
  if (DOCUMENT_REQUEST_CATEGORY_MAP[raw] || DOCUMENT_REQUEST_LABELS[raw]) return raw
  const collapsed = raw.toLowerCase().replace(/\s+/g, ' ')
  const aliased = REQUEST_KEY_ALIASES[collapsed]
  if (aliased) return aliased
  const slug = collapsed.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return presetKeyForSlug(slug) ?? raw
}

/** "witness_statement" and "witness_statements" name the same preset. */
function presetKeyForSlug(slug: string): string | null {
  if (!slug) return null
  if (DOCUMENT_REQUEST_CATEGORY_MAP[slug]) return slug
  if (DOCUMENT_REQUEST_CATEGORY_MAP[`${slug}s`]) return `${slug}s`
  if (slug.endsWith('s') && DOCUMENT_REQUEST_CATEGORY_MAP[slug.slice(0, -1)]) return slug.slice(0, -1)
  return null
}

/**
 * The preset a custom item's wording names ("custom:Witness statement" is a
 * witness-statements request), so an upload into that preset's slot counts.
 */
function presetKeyForCustomText(key: string): string | null {
  const text = key.slice(CUSTOM_REQUEST_PREFIX.length)
  const preset = normalizeRequestedDocKey(text)
  return preset !== 'other' && DOCUMENT_REQUEST_CATEGORY_MAP[preset] ? preset : null
}

/**
 * Items with no preset behind them: explicit custom items and free-text keys
 * stored before custom items existed. Both are answered by `other` uploads.
 */
function isAdHocRequestKey(key: string): boolean {
  return isCustomRequestKey(key) || !DOCUMENT_REQUEST_CATEGORY_MAP[key]
}

/** Subcategory an upload carries to name the ad-hoc item it answers. */
export function requestUploadSubcategory(key: string): string | null {
  if (!isAdHocRequestKey(key) || key === 'other') return null
  return isCustomRequestKey(key) ? key : `${CUSTOM_REQUEST_PREFIX}${key}`
}

export function normalizeRequestedDocKeys(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) continue
    const key = normalizeRequestedDocKey(value)
    if (!key || seen.has(key)) continue
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

/** Categories that satisfy a requested-doc key (includes the key itself). */
export function acceptedCategoriesForRequestKey(key: string): string[] {
  if (isCustomRequestKey(key)) {
    const preset = presetKeyForCustomText(key)
    return preset ? Array.from(new Set(['other', ...acceptedCategoriesForRequestKey(preset)])) : ['other']
  }
  const accepted = DOCUMENT_REQUEST_CATEGORY_MAP[key]
  if (!accepted) return [key, 'other']
  return accepted.length ? Array.from(new Set([key, ...accepted])) : [key]
}

/**
 * The category to file an upload under when the claimant said which requested
 * item it answers.
 *
 * Request keys and evidence categories are not the same vocabulary — a client
 * answering `injury_photos` produces a file the rest of the app expects to find
 * under `photos`. Storing the request key verbatim would leave the upload in a
 * category nothing reads, so the request it was sent to satisfy would stay
 * pending forever. The first accepted category is the canonical one.
 */
export function evidenceCategoryForRequestKey(key: string): string {
  const normalized = normalizeRequestedDocKey(key)
  if (isAdHocRequestKey(normalized)) return 'other'
  return DOCUMENT_REQUEST_CATEGORY_MAP[normalized]?.[0] || normalized || 'other'
}

/**
 * Whether a requested item is fulfilled by evidence. Only evidence uploaded
 * at/after the request counts — older files on the case must not instantly
 * complete a brand-new attorney ask.
 */
export type RequestEvidenceFile = {
  category: string | null | undefined
  subcategory?: string | null
  createdAt: Date | string
}

/**
 * Custom items share the `other` category, so an upload names the item it
 * answers in `subcategory` (the full `custom:` key). An untagged `other` file
 * can only stand in for a custom item when the request has exactly one.
 */
function customTagFor(file: RequestEvidenceFile): string {
  const tag = (file.subcategory || '').trim()
  return isCustomRequestKey(tag) ? tag.toLowerCase() : ''
}

function customItemMatches(key: string, file: RequestEvidenceFile, requestKeys: string[] | undefined): boolean {
  const tag = customTagFor(file)
  if (tag) return tag === (requestUploadSubcategory(key) || key).toLowerCase()
  const adHocCount = (requestKeys || [key]).filter((k) => k !== 'other' && isAdHocRequestKey(k)).length
  return adHocCount <= 1
}

type RequestMatchParams = {
  key: string
  evidenceFiles: RequestEvidenceFile[]
  requestCreatedAt: Date | string
  /** Every key on the same request; needed to attribute untagged custom uploads. */
  requestKeys?: string[]
}

function matchingRequestFiles(params: RequestMatchParams): RequestEvidenceFile[] {
  const accepted = new Set(acceptedCategoriesForRequestKey(params.key))
  const adHoc = params.key !== 'other' && isAdHocRequestKey(params.key)
  const requestAt = new Date(params.requestCreatedAt).getTime()
  if (!Number.isFinite(requestAt)) return []
  return params.evidenceFiles.filter((file) => {
    const category = (file.category || '').trim()
    if (!category || !accepted.has(category)) return false
    if (adHoc) {
      if (category === 'other') {
        if (!customItemMatches(params.key, file, params.requestKeys)) return false
      } else {
        // A preset-slot upload answers the item its wording names, unless it
        // was tagged for a different custom item.
        const tag = customTagFor(file)
        if (tag && tag !== (requestUploadSubcategory(params.key) || params.key).toLowerCase()) return false
      }
    }
    const uploadedAt = new Date(file.createdAt).getTime()
    return Number.isFinite(uploadedAt) && uploadedAt >= requestAt
  })
}

export function isRequestedDocFulfilled(params: RequestMatchParams): boolean {
  return matchingRequestFiles(params).length > 0
}

/** How many uploads answer a requested item (same rules as fulfillment). */
export function countRequestUploads(params: RequestMatchParams): number {
  return matchingRequestFiles(params).length
}

/** Compute a request's status from evidence uploaded for that request. */
export function computeRequestStatus(
  requestedDocs: string[],
  evidenceFiles: RequestEvidenceFile[],
  requestCreatedAt: Date | string,
): string | null {
  if (requestedDocs.length === 0) return null // link-only / free-form request: can't auto-complete
  const fulfilledCount = requestedDocs.filter((key) =>
    isRequestedDocFulfilled({ key, evidenceFiles, requestCreatedAt, requestKeys: requestedDocs }),
  ).length
  if (fulfilledCount === 0) return 'pending'
  return fulfilledCount === requestedDocs.length ? 'completed' : 'partial'
}

/** Distinct uploads answering any item on a request. */
export function countUploadsForRequest(
  requestedDocs: string[],
  evidenceFiles: RequestEvidenceFile[],
  requestCreatedAt: Date | string,
): number {
  const seen = new Set<RequestEvidenceFile>()
  for (const key of requestedDocs) {
    for (const file of matchingRequestFiles({ key, evidenceFiles, requestCreatedAt, requestKeys: requestedDocs })) {
      seen.add(file)
    }
  }
  return seen.size
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
        evidenceFiles: { select: { category: true, subcategory: true, createdAt: true } },
        leadSubmission: {
          select: {
            documentRequests: {
              where: { targetType: 'plaintiff' },
              select: { id: true, requestedDocs: true, status: true, createdAt: true },
            },
          },
        },
      },
    })

    const requests = assessment?.leadSubmission?.documentRequests || []
    if (requests.length === 0) return

    const evidenceFiles = assessment?.evidenceFiles || []
    const rank: Record<string, number> = { pending: 0, partial: 1, completed: 2 }
    for (const request of requests) {
      const next = computeRequestStatus(
        parseRequestedDocs(request.requestedDocs),
        evidenceFiles,
        request.createdAt,
      )
      // Only advance status; never regress a request the attorney already sees progressing.
      if (next && next !== request.status && (rank[next] ?? 0) > (rank[request.status] ?? 0)) {
        await prisma.documentRequest.update({ where: { id: request.id }, data: { status: next } })
      }
    }
  } catch (error: any) {
    logger.warn('Failed to sync document request status', { error: error?.message, assessmentId })
  }
}

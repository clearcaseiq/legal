/**
 * "Request documents via text": ask the claimant for documents over SMS and
 * open the channel they will send them back through.
 *
 * This creates the same `DocumentRequest` rows the portal flow creates, so a
 * texted photo settles the request the attorney actually made rather than
 * landing in a parallel silo. The difference is only how the claimant hears
 * about it, and that a `CasePhoneBinding` is opened so their reply can be
 * matched back to this case.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { canReceiveInboundMedia, sendSms } from './sms'
import { isSmsSuppressed } from './sms-opt-out'
import { bindCasePhone, claimantPhoneForAssessment } from './case-phone-binding'
import { createAndNotifyPlaintiffDocumentRequest, DocumentRequestAttorney } from './document-request-create'
import { webUrl } from './app-url'
import { DOCUMENT_REQUEST_LABELS, normalizeRequestedDocKeys } from './document-request-status'

export type DocumentRequestTextOutcome =
  | 'sent'
  | 'no_phone'
  | 'opted_out'
  | 'already_requested'
  | 'send_failed'

/**
 * What the claimant is actually asked to do, which depends on whether their
 * reply could reach us.
 *
 * `photo_reply` is the experience the feature was built for: they answer the
 * thread with photos. `upload_link` is the honest fallback when the SMS
 * provider cannot receive media — one tap to a tokenised page, no login, and
 * critically no instruction to do something that would silently fail.
 */
export type DocumentRequestTextMode = 'photo_reply' | 'upload_link'

export type DocumentRequestTextResult = {
  outcome: DocumentRequestTextOutcome
  mode: DocumentRequestTextMode
  /** Last four digits only — the full number does not belong in a response body. */
  phoneLast4: string | null
  docs: string[]
  alreadyRequested: string[]
  documentRequestId: string | null
}

/** Listing every requested document turns one text into four. */
const MAX_LISTED_DOCS = 4

/** The no-login upload page, which authenticates on the token in the path. */
export function claimantPortalUrl(secureToken: string): string {
  return webUrl(`/respond/documents/${secureToken}`)
}

/**
 * The message the claimant receives.
 *
 * Written to be answerable without leaving the thread: the ask is "take a photo
 * and text it back", not "log in and upload", because the whole point is that
 * they will not log in.
 */
export function documentRequestSmsBody(params: {
  firstName?: string | null
  firmName?: string | null
  docs: string[]
  customMessage?: string | null
  mode?: DocumentRequestTextMode
  /** Required for `upload_link`; ignored otherwise. */
  uploadLink?: string | null
}): string {
  const sender = (params.firmName || '').trim() || 'ClearCaseIQ'
  const first = (params.firstName || '').trim()
  const greeting = first ? `Hi ${first}, ` : ''

  const labels = params.docs.map((key) => DOCUMENT_REQUEST_LABELS[key] || key.replace(/_/g, ' '))
  const listed = labels.slice(0, MAX_LISTED_DOCS)
  const remainder = labels.length - listed.length
  const list = listed.length
    ? listed.map((label) => `- ${label}`).join('\n') + (remainder > 0 ? `\n- and ${remainder} more` : '')
    : '- Any case documents you have'

  const custom = (params.customMessage || '').trim()

  // Never tell someone to do something this channel cannot support. The
  // instruction is the promise, so it changes with the capability.
  //
  // "No login needed" is a claim about a specific URL, not a figure of speech:
  // it is only true because the link points at the tokenised portal. Pointed at
  // `/evidence-upload/:id` — which redirects a visitor with no session to sign
  // in — the same sentence sends a client to a wall we told them was not there.
  const instruction =
    params.mode === 'upload_link'
      ? `Tap to send them from your phone — no login needed: ${params.uploadLink || ''}`.trim()
      : 'Take a photo of each and text it back to this number.'

  return [
    `${sender}: ${greeting}we need a few documents for your case:`,
    list,
    custom || null,
    `${instruction} Reply STOP to opt out.`,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Create the document request, bind the claimant's number, and text them.
 *
 * Order matters. The binding is opened before the text goes out so a claimant
 * who replies instantly is already recognized; opening it afterwards leaves a
 * window where their first photo is refused.
 */
export async function sendDocumentRequestText(params: {
  leadId: string
  assessmentId: string
  attorney: DocumentRequestAttorney
  requestedDocs: string[]
  customMessage?: string | null
  firmName?: string | null
  boundByUserId?: string | null
}): Promise<DocumentRequestTextResult> {
  const mode: DocumentRequestTextMode = canReceiveInboundMedia() ? 'photo_reply' : 'upload_link'
  const empty = { mode, docs: [], alreadyRequested: [], documentRequestId: null }

  const phone = await claimantPhoneForAssessment(params.assessmentId)
  if (!phone) return { outcome: 'no_phone', phoneLast4: null, ...empty }

  const phoneLast4 = phone.slice(-4)

  if (await isSmsSuppressed(phone)) {
    return { outcome: 'opted_out', phoneLast4, ...empty }
  }

  const requested = normalizeRequestedDocKeys(params.requestedDocs)
  const result = await createAndNotifyPlaintiffDocumentRequest({
    leadId: params.leadId,
    assessmentId: params.assessmentId,
    attorney: params.attorney,
    requestedDocs: requested,
    customMessage: params.customMessage || null,
    // The claimant is about to get a text about exactly this. Emailing and
    // messaging them as well turns one ask into three.
    notify: false,
  })

  if (!result.created) {
    return {
      outcome: 'already_requested',
      mode,
      phoneLast4,
      docs: result.docs,
      alreadyRequested: result.alreadyRequested,
      documentRequestId: result.docRequest.id,
    }
  }

  // Only open the channel when something could actually come back through it.
  // A binding on a provider that cannot receive media is a standing permission
  // for documents that will never arrive, and it would make the case look
  // reachable by text in every audit and UI that reads this table.
  if (mode === 'photo_reply') {
    await bindCasePhone({
      assessmentId: params.assessmentId,
      phone,
      boundByUserId: params.boundByUserId || null,
    })
  }

  const firstName = await claimantFirstName(params.assessmentId)
  const body = documentRequestSmsBody({
    firstName,
    firmName: params.firmName,
    docs: result.docs,
    customMessage: params.customMessage,
    mode,
    // Deliberately not `docRequest.uploadLink`. That field is the emailed link,
    // which routes through the signed-in dashboard — fine in an inbox the
    // account owner is already reading, useless to someone holding a phone who
    // has never registered, which is most of the people this text reaches.
    uploadLink: claimantPortalUrl(result.docRequest.secureToken),
  })

  const sent = await sendSms(phone, body)
  if (!sent) {
    logger.warn('Document request text was not delivered', {
      assessmentId: params.assessmentId,
      documentRequestId: result.docRequest.id,
    })
  }

  return {
    outcome: sent ? 'sent' : 'send_failed',
    mode,
    phoneLast4,
    docs: result.docs,
    alreadyRequested: result.alreadyRequested,
    documentRequestId: result.docRequest.id,
  }
}

async function claimantFirstName(assessmentId: string): Promise<string | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { facts: true, user: { select: { firstName: true } } },
  })
  if (!assessment) return null
  if (assessment.facts) {
    try {
      const facts = typeof assessment.facts === 'string' ? JSON.parse(assessment.facts) : assessment.facts
      const context = (facts?.plaintiffContext || {}) as Record<string, unknown>
      if (typeof context.firstName === 'string' && context.firstName.trim()) return context.firstName.trim()
    } catch {
      /* fall through to the user row */
    }
  }
  return assessment.user?.firstName || null
}

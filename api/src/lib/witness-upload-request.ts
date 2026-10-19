import crypto from 'crypto'
import { prisma } from './prisma'
import { logger } from './logger'
import { webUrl } from './app-url'
import { sendTransactionalEmail } from './claims'
import { sendSms } from './sms'
import { normalizePhone } from './phone'
import { ATTORNEY_EVENTS } from './notification-events'
import { notifyAttorneyInApp } from './case-notifications'
import { notifyAttorneyByUserEmail } from './attorney-push'
import { runCaseRecalculation } from './case-recalculation'
import { updateEvidenceItem } from './liability-parties'

/** What a witness or footage holder is asked for, by the evidence item's type. */
const DOCS_BY_ITEM_TYPE: Record<string, string[]> = {
  witness_statement: ['written_statement', 'photos', 'video_footage'],
  video: ['video_footage', 'photos'],
  photos: ['photos', 'video_footage'],
}

export const WITNESS_DOC_LABELS: Record<string, string> = {
  written_statement: 'A written statement of what you saw',
  photos: 'Photos of the scene, vehicles or injuries',
  video_footage: 'Video (phone, dashcam or doorbell camera)',
}

export function canRequestWitnessUpload(itemType: string): boolean {
  return itemType in DOCS_BY_ITEM_TYPE
}

export class WitnessRequestError extends Error {}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const text = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

/**
 * Send a witness (or whoever holds the footage) a secure link to upload photos,
 * video or a written statement for one liability evidence item. The link goes by
 * email, text, or both; at least one has to reach them or nothing is kept.
 */
export async function sendWitnessUploadRequest(params: {
  leadId: string
  assessmentId: string
  attorneyId: string
  itemId: string
  body: { recipientName?: unknown; email?: unknown; phone?: unknown; message?: unknown }
  actor: { actorId: string | null; actorName: string | null }
}) {
  const { leadId, assessmentId, attorneyId, itemId, body, actor } = params
  const item = await prisma.liabilityEvidenceItem.findFirst({
    where: { id: itemId, assessmentId },
    select: { id: true, type: true, status: true, witnessName: true, description: true },
  })
  if (!item) return null
  const requestedDocs = DOCS_BY_ITEM_TYPE[item.type]
  if (!requestedDocs) throw new WitnessRequestError('Upload links are for witness statements, photos and video.')

  const email = text(body.email, 191)
  if (email && !EMAIL_RE.test(email)) throw new WitnessRequestError('That email address does not look right.')
  const rawPhone = text(body.phone, 40)
  const phone = rawPhone ? normalizePhone(rawPhone) : undefined
  if (rawPhone && !phone) throw new WitnessRequestError('That phone number does not look right.')
  if (!email && !phone) throw new WitnessRequestError('Add an email address or a mobile number to send the link to.')

  const recipientName = text(body.recipientName, 191) || item.witnessName || null
  const [attorney, assessment] = await Promise.all([
    prisma.attorney.findUnique({
      where: { id: attorneyId },
      select: { name: true, email: true, lawFirm: { select: { name: true } } },
    }),
    prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { user: { select: { firstName: true, lastName: true } } },
    }),
  ])
  const attorneyName = attorney?.name?.trim() || 'Our office'
  const firmName = attorney?.lawFirm?.name?.trim() || null
  const clientName = [assessment?.user?.firstName, assessment?.user?.lastName].filter(Boolean).join(' ') || 'our client'
  const sender = [attorneyName, firmName].filter(Boolean).join(', ')

  const message =
    text(body.message, 2000) ||
    `Thank you for your help with ${clientName}'s case. If you have photos, video or anything you wrote down about what you saw, you can send it to us through this secure link. No account is needed.`

  const secureToken = crypto.randomUUID()
  const uploadLink = webUrl(`/respond/documents/${secureToken}`)
  const request = await prisma.documentRequest.create({
    data: {
      leadId,
      attorneyId,
      requestedDocs: JSON.stringify(requestedDocs),
      customMessage: message,
      secureToken,
      uploadLink,
      status: 'pending',
      targetType: 'opposing_party',
      recipientRole: 'witness',
      recipientName,
      recipientEmail: email,
      recipientPhone: phone || null,
      liabilityEvidenceItemId: item.id,
    },
  })

  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,'
  const emailed = email
    ? await sendTransactionalEmail({
        to: email,
        subject: `${firmName || attorneyName}: request for photos or video`,
        body: `${greeting}\n\n${message}\n\nPhotos, video up to 500MB per file, and documents are all accepted.\n\n${sender}`,
        cta: { label: 'Upload photos or video', url: uploadLink },
        replyTo: attorney?.email || undefined,
        fromName: sender || undefined,
        fromEmail: attorney?.email || undefined,
      }).catch((error: any) => {
        logger.warn('Witness upload email failed', { requestId: request.id, error: error?.message })
        return false
      })
    : false
  const texted = phone
    ? await sendSms(
        phone,
        `${firmName || attorneyName} is asking for any photos or video you have for ${clientName}'s case. Upload securely, no account needed: ${uploadLink}`,
      ).catch((error: any) => {
        logger.warn('Witness upload text failed', { requestId: request.id, error: error?.message })
        return false
      })
    : false

  if (!emailed && !texted) {
    await prisma.documentRequest.delete({ where: { id: request.id } }).catch(() => undefined)
    throw new WitnessRequestError('The link could not be sent. Check the email or number and try again.')
  }

  if (item.status === 'needed') {
    await updateEvidenceItem(assessmentId, item.id, { status: 'requested' }, actor)
  }
  logger.info('Witness upload request sent', { leadId, itemId: item.id, requestId: request.id, emailed, texted })
  return { requestId: request.id, uploadLink, emailed: Boolean(emailed), texted: Boolean(texted) }
}

/**
 * A witness uploaded through their link: link the file to the evidence item if
 * it has none yet, mark the item received, and tell the requesting attorney.
 */
export async function recordWitnessUpload(params: {
  docRequest: { id: string; leadId: string; attorneyId: string; liabilityEvidenceItemId: string | null; recipientName: string | null }
  assessmentId: string
  evidenceFileId: string | null
  originalName: string
  uploadedByName: string | null
}) {
  const { docRequest, assessmentId, evidenceFileId, originalName, uploadedByName } = params
  if (!docRequest.liabilityEvidenceItemId) return
  const item = await prisma.liabilityEvidenceItem.findFirst({
    where: { id: docRequest.liabilityEvidenceItemId, assessmentId },
    select: { id: true, type: true, status: true, evidenceFileId: true },
  })
  if (!item) return

  const patch: Record<string, unknown> = {}
  if (item.status !== 'received') patch.status = 'received'
  if (!item.evidenceFileId && evidenceFileId) patch.evidenceFileId = evidenceFileId
  const who = uploadedByName || docRequest.recipientName || 'A witness'
  if (Object.keys(patch).length) {
    await updateEvidenceItem(assessmentId, item.id, patch, { actorId: null, actorName: `${who} (upload link)` })
    void runCaseRecalculation(assessmentId, 'liability_updated')
  }

  const link = `/attorney-dashboard/cases/${docRequest.leadId}/liability`
  const subject = `${who} uploaded evidence`
  const body = `${originalName} was added to the case and linked on the Liability tab.`
  await notifyAttorneyInApp({
    attorneyId: docRequest.attorneyId,
    assessmentId,
    leadId: docRequest.leadId,
    eventType: ATTORNEY_EVENTS.doc_uploaded,
    subject,
    body,
    link,
    payload: { documentRequestId: docRequest.id, liabilityEvidenceItemId: item.id, evidenceFileId },
  })
  const attorney = await prisma.attorney.findUnique({ where: { id: docRequest.attorneyId }, select: { email: true } })
  if (attorney?.email) {
    await notifyAttorneyByUserEmail(attorney.email, {
      title: subject,
      body,
      data: { leadId: docRequest.leadId, type: ATTORNEY_EVENTS.doc_uploaded },
    }).catch(() => undefined)
  }
}

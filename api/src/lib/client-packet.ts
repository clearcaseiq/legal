/**
 * One client packet: documents to sign plus files to upload, behind one link.
 *
 * The packet is a plaintiff `DocumentRequest` (its token is the link) with the
 * signature envelopes pointing back at it through `packetRequestId`. The client
 * hears about it once, by email or text, instead of one message per document.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { createAndNotifyPlaintiffDocumentRequest } from './document-request-create'
import { claimantPortalUrl } from './document-request-text'
import { normalizeRequestedDocKeys, requestedDocLabel } from './document-request-status'
import { readClaimantContact } from './claimant-contact'
import { bindCasePhone, claimantPhoneForAssessment } from './case-phone-binding'
import { isSmsSuppressed } from './sms-opt-out'
import { canReceiveInboundMedia, sendSms } from './sms'
import { deliverDirectNotification } from './platform-notifications'
import { notifyPlaintiffInApp } from './case-notifications'
import { listESignatureProviders } from './esign'
import { createHipaaAuthorizationEnvelope, createRetainerAgreementEnvelope } from './esign/esign-service'
import { sendFirmTemplateForLead } from './esign/send-firm-template'
import { resolveDefaultContingency } from './esign/essential-fields'

export type PacketSignType = 'retainer' | 'hipaa_authorization'

export const PACKET_SIGN_LABELS: Record<PacketSignType, string> = {
  retainer: 'Retainer agreement',
  hipaa_authorization: 'HIPAA authorization',
}

export type PacketSignItem = {
  type: PacketSignType
  /** A firm template to send; omitted sends the standard document. */
  templateId?: string | null
}

export type ClientPacketAttorney = {
  id: string
  name?: string | null
  email?: string | null
  lawFirmId?: string | null
}

export type SendClientPacketParams = {
  leadId: string
  assessmentId: string
  attorney: ClientPacketAttorney
  uploads: string[]
  sign: PacketSignItem[]
  delivery: 'email' | 'text'
  customMessage?: string | null
  /** Retainers: the attorney countersigns after the client. */
  countersigner?: { name: string; email: string } | null
  firmName?: string | null
  boundByUserId?: string | null
}

export type SendClientPacketResult =
  | {
      ok: true
      documentRequestId: string
      link: string
      uploads: string[]
      alreadyRequested: string[]
      envelopes: Array<{ id: string; type: PacketSignType; title: string }>
      failed: Array<{ type: PacketSignType; error: string }>
      delivered: boolean
      deliveredTo: string
    }
  | { ok: false; status: number; error: string }

const fail = (status: number, error: string): SendClientPacketResult => ({ ok: false, status, error })

/** The message body: what to sign and what to upload, then the one link. */
export function clientPacketMessage(params: {
  firstName?: string | null
  firmName?: string | null
  sign: string[]
  uploads: string[]
  customMessage?: string | null
  link: string
  channel: 'email' | 'text'
}): string {
  const sender = (params.firmName || '').trim() || 'ClearCaseIQ'
  const greeting = params.firstName ? `Hi ${params.firstName}` : 'Hi'
  const lines: string[] = []
  if (params.channel === 'text') {
    lines.push(`${sender}: ${greeting}, please complete these for your case:`)
  } else {
    lines.push(`${greeting},`, '', `${sender} needs a few things from you for your case:`)
  }
  if (params.sign.length) {
    if (params.channel === 'email') lines.push('')
    lines.push('Sign these documents:', ...params.sign.map((label) => `- ${label}`))
  }
  if (params.uploads.length) {
    if (params.channel === 'email') lines.push('')
    lines.push('Upload these files:', ...params.uploads.map((label) => `- ${label}`))
  }
  const custom = (params.customMessage || '').trim()
  if (custom) {
    if (params.channel === 'email') lines.push('')
    lines.push(custom)
  }
  if (params.channel === 'text') {
    lines.push(`Open: ${params.link} (no login needed). Reply STOP to opt out.`)
  } else {
    lines.push('', 'Everything is on one page — no login needed.')
  }
  return lines.join('\n')
}

function hipaaProviderId(): string | null {
  return listESignatureProviders().find((p) => p.configured && p.hipaaCapable)?.id || null
}

export async function sendClientPacket(params: SendClientPacketParams): Promise<SendClientPacketResult> {
  const uploads = normalizeRequestedDocKeys(params.uploads)
  const seen = new Set<PacketSignType>()
  const sign = params.sign.filter((item) => {
    if (seen.has(item.type)) return false
    seen.add(item.type)
    return true
  })
  if (!uploads.length && !sign.length) return fail(400, 'Pick at least one document to sign or file to upload.')

  const contact = await readClaimantContact(params.assessmentId)
  const signerName = [contact?.firstName, contact?.lastName].filter(Boolean).join(' ').trim()
  const signerEmail = (contact?.email || '').trim()
  if (sign.length && (!signerName || !signerEmail)) {
    return fail(409, 'Add the client’s name and email on Client Info before sending documents to sign.')
  }

  // Check the channel before creating anything, so a refusal leaves no half-sent packet.
  let phone: string | null = null
  if (params.delivery === 'text') {
    phone = await claimantPhoneForAssessment(params.assessmentId)
    if (!phone) return fail(409, 'No mobile number on file for this client. Add one on Client Info, or send by email.')
    if (await isSmsSuppressed(phone)) {
      return fail(409, 'This client texted STOP, so we cannot text them. Send the packet by email instead.')
    }
  } else if (!signerEmail) {
    return fail(409, 'No email on file for this client. Add one on Client Info, or send by text.')
  }

  let request = await createAndNotifyPlaintiffDocumentRequest({
    leadId: params.leadId,
    assessmentId: params.assessmentId,
    attorney: params.attorney,
    requestedDocs: uploads,
    customMessage: params.customMessage || null,
    sendUploadLinkOnly: uploads.length === 0,
    notify: false,
  })
  const alreadyRequested = request.alreadyRequested
  if (!request.created) {
    if (!sign.length) {
      return fail(
        409,
        alreadyRequested.length === 1
          ? `${requestedDocLabel(alreadyRequested[0])} is already in an open request. Nudge the client instead of requesting it again.`
          : 'Those files are already in an open request. Nudge the client instead of requesting them again.',
      )
    }
    // Every upload is already open elsewhere; the packet still needs its own link for signing.
    request = await createAndNotifyPlaintiffDocumentRequest({
      leadId: params.leadId,
      assessmentId: params.assessmentId,
      attorney: params.attorney,
      requestedDocs: [],
      customMessage: params.customMessage || null,
      sendUploadLinkOnly: true,
      notify: false,
    })
  }
  const packetRequestId = request.docRequest.id
  const freshUploads = request.docs

  const envelopes: Array<{ id: string; type: PacketSignType; title: string }> = []
  const failed: Array<{ type: PacketSignType; error: string }> = []
  for (const item of sign) {
    try {
      const providerId = item.type === 'hipaa_authorization' ? hipaaProviderId() : null
      if (item.type === 'hipaa_authorization' && !providerId) {
        throw new Error('HIPAA authorizations need a HIPAA-capable e-signature provider, and none is configured.')
      }
      const countersigner = item.type === 'retainer' ? params.countersigner || null : null
      let envelope: { id: string; title: string }
      if (item.templateId && params.attorney.lawFirmId) {
        envelope = await sendFirmTemplateForLead({
          templateId: item.templateId,
          lawFirmId: params.attorney.lawFirmId,
          leadId: params.leadId,
          attorneyId: params.attorney.id,
          signerName,
          signerEmail,
          providerId: providerId || undefined,
          documentType: item.type,
          countersigner,
          packetRequestId,
        })
      } else if (item.type === 'retainer') {
        envelope = await createRetainerAgreementEnvelope({
          leadId: params.leadId,
          attorneyId: params.attorney.id,
          signerName,
          signerEmail,
          firmName: params.firmName || params.attorney.name || undefined,
          attorneyName: params.attorney.name || undefined,
          contingencyPercent: await resolveDefaultContingency(params.attorney.lawFirmId),
          caseRef: params.leadId,
          countersigner,
          packetRequestId,
        })
      } else {
        envelope = await createHipaaAuthorizationEnvelope({
          leadId: params.leadId,
          attorneyId: params.attorney.id,
          signerName,
          signerEmail,
          caseRef: params.leadId,
          providerId: providerId || undefined,
          packetRequestId,
        })
      }
      envelopes.push({ id: envelope.id, type: item.type, title: envelope.title })
    } catch (error: any) {
      logger.warn('Client packet: signature document failed', {
        leadId: params.leadId,
        type: item.type,
        error: error?.message,
      })
      failed.push({ type: item.type, error: error?.message || 'Could not send for signature.' })
    }
  }

  if (!freshUploads.length && !envelopes.length) {
    return fail(502, failed[0]?.error || 'Nothing in the packet could be sent.')
  }

  const link = claimantPortalUrl(request.docRequest.secureToken)
  const signLabels = envelopes.map((e) => PACKET_SIGN_LABELS[e.type])
  const uploadLabels = freshUploads.map(requestedDocLabel)
  const firstName = contact?.firstName || null

  let delivered = false
  let deliveredTo = ''
  if (params.delivery === 'text' && phone) {
    if (freshUploads.length && canReceiveInboundMedia()) {
      await bindCasePhone({
        assessmentId: params.assessmentId,
        phone,
        boundByUserId: params.boundByUserId || null,
      }).catch(() => undefined)
    }
    delivered = await sendSms(
      phone,
      clientPacketMessage({
        firstName,
        firmName: params.firmName,
        sign: signLabels,
        uploads: uploadLabels,
        customMessage: params.customMessage,
        link,
        channel: 'text',
      }),
    )
    deliveredTo = `•••${phone.slice(-4)}`
  } else {
    const assessment = await prisma.assessment.findUnique({
      where: { id: params.assessmentId },
      select: { userId: true },
    })
    const message = clientPacketMessage({
      firstName,
      firmName: params.firmName,
      sign: signLabels,
      uploads: uploadLabels,
      customMessage: params.customMessage,
      link,
      channel: 'email',
    })
    const subject =
      signLabels.length && uploadLabels.length
        ? 'Documents to sign and files to upload for your case'
        : signLabels.length
          ? 'Documents to sign for your case'
          : 'Files to upload for your case'
    try {
      await deliverDirectNotification({
        type: 'email',
        recipient: signerEmail,
        subject,
        message,
        cta: { label: 'Open your documents', url: link },
        userId: assessment?.userId || null,
        assessmentId: params.assessmentId,
        role: 'plaintiff',
        replyTo: params.attorney.email || null,
        fromName: params.attorney.name || null,
        attorneyId: params.attorney.id,
        metadata: {
          eventType: 'client_packet',
          leadId: params.leadId,
          documentRequestId: packetRequestId,
          envelopeIds: envelopes.map((e) => e.id),
          uploadLink: link,
        },
      })
      delivered = true
    } catch (error: any) {
      logger.warn('Client packet email failed', { leadId: params.leadId, error: error?.message })
    }
    deliveredTo = signerEmail
    if (assessment?.userId) {
      await notifyPlaintiffInApp({
        userId: assessment.userId,
        recipientEmail: signerEmail,
        attorneyId: params.attorney.id,
        assessmentId: params.assessmentId,
        eventType: 'documents_requested',
        subject,
        body: [...signLabels.map((l) => `Sign: ${l}`), ...uploadLabels.map((l) => `Upload: ${l}`)].join('\n'),
        link: '/dashboard?tab=tasks',
        payload: { leadId: params.leadId, documentRequestId: packetRequestId },
      }).catch(() => undefined)
    }
  }

  await prisma.leadSubmission
    .update({ where: { id: params.leadId }, data: { lastContactAt: new Date() } })
    .catch(() => undefined)

  return {
    ok: true,
    documentRequestId: packetRequestId,
    link,
    uploads: freshUploads,
    alreadyRequested,
    envelopes,
    failed,
    delivered,
    deliveredTo,
  }
}

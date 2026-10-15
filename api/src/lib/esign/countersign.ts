/**
 * Retainers and fee agreements the client has signed and an attorney still has
 * to countersign.
 *
 * The provider emails the countersigner when their turn comes, and that email
 * was the only signal: nothing in ClearCaseIQ told the attorney, and the only
 * place a half-signed agreement showed was each case's Signatures list. These
 * give the attorney a list across their cases, a ClearCaseIQ email and bell
 * entry when the client signs, and a way to have the signing email re-sent.
 */
import { prisma } from '../prisma'
import { logger } from '../logger'
import { webUrl } from '../app-url'
import { notifyAttorneyInApp } from '../case-notifications'
import { deliverDirectNotification } from '../platform-notifications'
import { ATTORNEY_EVENTS } from '../notification-events'
import { getESignatureProvider } from './index'
import { OPEN_ENVELOPE_STATUSES } from './esign-service'

export interface CountersignQueueItem {
  id: string
  leadId: string
  title: string
  documentType: string
  clientName: string
  clientSignedAt: string
  /** Opens the attorney's own signing page, when the provider gives one. */
  countersignUrl: string | null
  /** Where the agreement sits on the case. */
  caseLink: string
}

const QUEUE_LIMIT = 100

function signaturesLink(leadId: string): string {
  return `/attorney-dashboard/cases/${leadId}/documents?view=signatures`
}

function clientNameOf(env: {
  signerName: string
  lead?: { assessment?: { user?: { firstName: string | null; lastName: string | null } | null } | null } | null
}): string {
  const user = env.lead?.assessment?.user
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
  return name || env.signerName || 'Client'
}

/** Agreements waiting on this attorney's countersignature, oldest first. */
export async function listCountersignQueue(attorneyEmail: string): Promise<CountersignQueueItem[]> {
  const email = attorneyEmail.trim()
  if (!email) return []
  const rows = await prisma.documentEnvelope.findMany({
    where: {
      countersignerEmail: { equals: email, mode: 'insensitive' },
      clientSignedAt: { not: null },
      status: { in: [...OPEN_ENVELOPE_STATUSES] },
    },
    select: {
      id: true,
      leadId: true,
      title: true,
      documentType: true,
      signerName: true,
      clientSignedAt: true,
      countersignUrl: true,
      lead: { select: { assessment: { select: { user: { select: { firstName: true, lastName: true } } } } } },
    },
    orderBy: { clientSignedAt: 'asc' },
    take: QUEUE_LIMIT,
  })
  return rows.map((env) => ({
    id: env.id,
    leadId: env.leadId,
    title: env.title,
    documentType: env.documentType,
    clientName: clientNameOf(env),
    clientSignedAt: (env.clientSignedAt as Date).toISOString(),
    countersignUrl: env.countersignUrl ?? null,
    caseLink: signaturesLink(env.leadId),
  }))
}

export class CountersignAccessError extends Error {
  status = 403
}

/**
 * Have the provider re-send the countersigner's signing email. Allowed for the
 * countersigner and for the attorney who sent the agreement.
 */
export async function resendCountersignRequest(envelopeId: string, actor: { id: string; email: string }) {
  const env = await prisma.documentEnvelope.findUnique({ where: { id: envelopeId } })
  if (!env) throw new CountersignAccessError('Signature request not found')
  const isCountersigner = (env.countersignerEmail || '').toLowerCase() === actor.email.trim().toLowerCase()
  if (!isCountersigner && env.attorneyId !== actor.id) {
    throw new CountersignAccessError('This agreement is not waiting on your countersignature')
  }
  if (!env.clientSignedAt || !(OPEN_ENVELOPE_STATUSES as readonly string[]).includes(env.status)) {
    throw new Error('This agreement is not waiting on a countersignature')
  }
  if (!env.externalEnvelopeId) throw new Error('This agreement has not been sent yet')
  const provider = getESignatureProvider(env.provider)
  if (!provider.sendReminder) throw new Error(`${provider.label} cannot re-send signing emails`)
  // Both providers re-email the first signer who has not signed, which is the
  // countersigner once the client has.
  await provider.sendReminder(env.externalEnvelopeId)
}

/** Tell the countersigner the client has signed and it is their turn. */
export async function notifyCountersignerClientSigned(envelopeId: string): Promise<void> {
  const env = await prisma.documentEnvelope.findUnique({
    where: { id: envelopeId },
    select: {
      id: true,
      leadId: true,
      title: true,
      signerName: true,
      countersignerName: true,
      countersignerEmail: true,
      countersignUrl: true,
      lead: {
        select: {
          assessmentId: true,
          assessment: { select: { user: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
  })
  if (!env?.countersignerEmail) return

  const countersigner = await prisma.attorney.findFirst({
    where: { email: { equals: env.countersignerEmail, mode: 'insensitive' } },
    select: { id: true, name: true },
  })
  const clientName = clientNameOf(env)
  const caseLink = signaturesLink(env.leadId)
  const subject = `${clientName} signed: ${env.title} needs your countersignature`
  const assessmentId = env.lead?.assessmentId || null

  if (countersigner) {
    await notifyAttorneyInApp({
      attorneyId: countersigner.id,
      assessmentId,
      leadId: env.leadId,
      eventType: ATTORNEY_EVENTS.countersign_needed,
      subject,
      body: `${clientName} signed ${env.title}. It is not complete until you countersign.`,
      link: caseLink,
      payload: { envelopeId: env.id },
    })
  }

  const greeting = (env.countersignerName || countersigner?.name || '').split(/\s+/)[0] || 'there'
  await deliverDirectNotification({
    type: 'email',
    recipient: env.countersignerEmail,
    subject,
    message:
      `Hi ${greeting},\n\n${clientName} has signed ${env.title}. The agreement is not complete until you countersign it.\n\n` +
      (env.countersignUrl
        ? 'Use the button below to countersign.'
        : 'Our e-signature partner has emailed you a separate signing link. If you cannot find it, open the case in ClearCaseIQ and choose "Resend my signing email".'),
    cta: env.countersignUrl
      ? [
          { label: 'Countersign now', url: env.countersignUrl },
          { label: 'Open the case', url: webUrl(caseLink) },
        ]
      : { label: 'Open the case', url: webUrl(caseLink) },
    assessmentId,
    attorneyId: countersigner?.id || null,
    role: 'attorney',
    metadata: { eventType: ATTORNEY_EVENTS.countersign_needed, leadId: env.leadId, envelopeId: env.id },
  })
}

export function notifyCountersignerClientSignedSafe(envelopeId: string): void {
  void notifyCountersignerClientSigned(envelopeId).catch((err) =>
    logger.warn('Countersign notification failed', {
      envelopeId,
      error: err instanceof Error ? err.message : String(err),
    }),
  )
}

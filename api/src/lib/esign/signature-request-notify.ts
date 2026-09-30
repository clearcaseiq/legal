/**
 * Tell the plaintiff their attorney sent documents to sign. The e-sign provider
 * sends its own signing email; this adds the attorney-branded email and the
 * in-app notification that point the client to their Tasks tab, where pending
 * signatures are listed alongside requested documents.
 */
import { prisma } from '../prisma'
import { logger } from '../logger'
import { webUrl } from '../app-url'
import { notifyPlaintiffInApp } from '../case-notifications'
import { deliverDirectNotification } from '../platform-notifications'

export async function notifyPlaintiffSignatureRequested(envelopeIds: string[]): Promise<void> {
  if (!envelopeIds.length) return
  const envelopes = await prisma.documentEnvelope.findMany({
    where: { id: { in: envelopeIds } },
    select: {
      id: true,
      title: true,
      signerEmail: true,
      signerName: true,
      signingUrl: true,
      leadId: true,
      attorney: { select: { id: true, name: true, email: true } },
      lead: {
        select: {
          assessmentId: true,
          assessment: { select: { userId: true, user: { select: { email: true, firstName: true } } } },
        },
      },
    },
  })
  const first = envelopes[0]
  if (!first) return

  const attorney = first.attorney
  const attorneyName = attorney?.name || 'Your attorney'
  const assessmentId = first.lead?.assessmentId || null
  const userId = first.lead?.assessment?.userId || null
  const recipient = first.signerEmail || first.lead?.assessment?.user?.email || null
  const firstName = first.lead?.assessment?.user?.firstName || first.signerName?.split(/\s+/)[0] || 'there'
  const docList = envelopes.map((e) => `• ${e.title}`).join('\n')
  const tasksLink = '/dashboard?tab=tasks'
  const directSigningUrl = envelopes.find((e) => e.signingUrl)?.signingUrl || null

  if (userId) {
    await notifyPlaintiffInApp({
      userId,
      recipientEmail: recipient,
      attorneyId: attorney?.id,
      assessmentId,
      eventType: 'signature_requested',
      subject: `${attorneyName} sent documents for you to sign`,
      body: docList,
      link: tasksLink,
      payload: { leadId: first.leadId, envelopeIds },
    })
  }

  if (!recipient) return
  const message = `Hi ${firstName},\n\n${attorneyName} has sent the following documents for your signature:\n\n${docList}\n\n${
    directSigningUrl
      ? 'Use the button below to review and sign.'
      : 'You will also receive a separate email from our e-signature partner with your secure signing link.'
  } You can track this anytime under Tasks on your ClearCaseIQ dashboard.\n\nBest regards,\n${attorneyName}`

  await deliverDirectNotification({
    type: 'email',
    recipient,
    subject: `${attorneyName} sent documents for you to sign`,
    message,
    cta: directSigningUrl
      ? [
          { label: 'Review and sign', url: directSigningUrl },
          { label: 'View your tasks', url: webUrl(tasksLink) },
        ]
      : { label: 'View your tasks', url: webUrl(tasksLink) },
    userId,
    assessmentId,
    attorneyId: attorney?.id || null,
    role: 'plaintiff',
    replyTo: attorney?.email || null,
    fromName: attorney?.name || null,
    metadata: { eventType: 'signature_requested', leadId: first.leadId, envelopeIds },
  })
}

export function notifyPlaintiffSignatureRequestedSafe(envelopeIds: string[]): void {
  void notifyPlaintiffSignatureRequested(envelopeIds).catch((err) =>
    logger.warn('Signature request plaintiff notify failed', {
      envelopeIds,
      error: err instanceof Error ? err.message : String(err),
    }),
  )
}

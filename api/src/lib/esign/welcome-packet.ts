/**
 * Send the firm's welcome packet (Firm Settings → Intake automation) to the
 * client for signature. Used by the "Send client welcome packet" task and,
 * when the firm allows it, automatically when a case is purchased.
 *
 * The client is told once for the whole packet — email, text and dashboard —
 * by the batched notifier in `signature-request-notify.ts`.
 */
import { prisma } from '../prisma'
import { readClaimantContact } from '../claimant-contact'
import {
  completeWelcomePacketForLead,
  getWelcomePacketContents,
  markSendRetainerTaskDone,
} from '../intake-acquire'
import { listESignatureProviders } from './index'
import {
  createHipaaAuthorizationEnvelope,
  createOnboardingPacket,
  createRetainerAgreementEnvelope,
} from './esign-service'
import { sendFirmTemplateForLead } from './send-firm-template'

export type WelcomePacketErrorCode =
  | 'missing_client_contact'
  | 'empty_packet'
  | 'no_hipaa_provider'
  | 'no_provider'
  | 'packet_already_sent'
  | 'packet_send_failed'

export class WelcomePacketError extends Error {
  constructor(
    public code: WelcomePacketErrorCode,
    public status: number,
    message: string,
    public failed: { templateId: string; error: string }[] = [],
  ) {
    super(message)
  }
}

export async function sendWelcomePacketForLead(params: {
  leadId: string
  attorney: { id: string; name?: string | null; lawFirmId?: string | null }
  force?: boolean
}) {
  const { leadId, attorney } = params
  const lead = await prisma.leadSubmission.findUnique({ where: { id: leadId }, select: { assessmentId: true } })
  const contact = lead?.assessmentId ? await readClaimantContact(lead.assessmentId) : null
  const signerName = [contact?.firstName, contact?.lastName].filter(Boolean).join(' ').trim()
  const signerEmail = contact?.email?.trim() || ''
  if (!signerName || !signerEmail) {
    throw new WelcomePacketError(
      'missing_client_contact',
      422,
      'The client needs a name and email on file before the welcome packet can be sent. Add them under Client Info.',
    )
  }

  const contents = await getWelcomePacketContents(attorney.lawFirmId)
  if (!contents.retainer && !contents.hipaa && contents.templateIds.length === 0) {
    throw new WelcomePacketError(
      'empty_packet',
      422,
      'The welcome packet has no documents. Choose them in Firm Settings → Intake automation.',
    )
  }

  const configured = listESignatureProviders().filter((p) => p.configured)
  const provider = contents.hipaa ? configured.find((p) => p.hipaaCapable) : configured[0]
  if (!provider) {
    throw contents.hipaa
      ? new WelcomePacketError(
          'no_hipaa_provider',
          422,
          'The welcome packet includes a HIPAA authorization. Connect a HIPAA-capable signature tool first.',
        )
      : new WelcomePacketError('no_provider', 422, 'Connect a signature tool before sending the welcome packet.')
  }

  const open = await prisma.documentEnvelope.findMany({
    where: {
      leadId,
      documentType: { in: ['retainer', 'hipaa_authorization'] },
      status: { in: ['sent', 'viewed'] },
    },
    select: { documentType: true },
  })
  const openTypes = new Set(open.map((e) => e.documentType))
  const builtInsAlreadyOut =
    (!contents.retainer || openTypes.has('retainer')) && (!contents.hipaa || openTypes.has('hipaa_authorization'))
  if ((contents.retainer || contents.hipaa) && builtInsAlreadyOut && contents.templateIds.length === 0 && !params.force) {
    throw new WelcomePacketError(
      'packet_already_sent',
      409,
      'The welcome packet documents are already out for signature with this client.',
    )
  }

  const withFirm = await prisma.attorney.findUnique({
    where: { id: attorney.id },
    select: { name: true, lawFirm: { select: { name: true } } },
  })
  const envPct = Number(process.env.DEFAULT_CONTINGENCY_PERCENT)
  const retainerTerms = {
    attorneyName: withFirm?.name || attorney.name || undefined,
    firmName: withFirm?.lawFirm?.name || withFirm?.name || undefined,
    contingencyPercent: Number.isFinite(envPct) && envPct > 0 ? envPct : 33.33,
  }
  const base = { leadId, attorneyId: attorney.id, providerId: provider.id, caseRef: leadId, signerName, signerEmail }

  const result: { retainer?: unknown; hipaa?: unknown } = {}
  if (contents.retainer && contents.hipaa) {
    Object.assign(result, await createOnboardingPacket({ ...base, ...retainerTerms }))
  } else if (contents.retainer) {
    result.retainer = await createRetainerAgreementEnvelope({ ...base, ...retainerTerms })
  } else if (contents.hipaa) {
    result.hipaa = await createHipaaAuthorizationEnvelope(base)
  }

  const templates: unknown[] = []
  const failed: { templateId: string; error: string }[] = []
  if (contents.templateIds.length && attorney.lawFirmId) {
    for (const templateId of contents.templateIds) {
      try {
        templates.push(
          await sendFirmTemplateForLead({
            templateId,
            lawFirmId: attorney.lawFirmId,
            leadId,
            attorneyId: attorney.id,
            signerName,
            signerEmail,
            providerId: provider.id,
          }),
        )
      } catch (err) {
        failed.push({ templateId, error: err instanceof Error ? err.message : String(err) })
      }
    }
  }
  if (!result.retainer && !result.hipaa && templates.length === 0) {
    throw new WelcomePacketError(
      'packet_send_failed',
      422,
      failed[0]?.error || 'None of the welcome packet documents could be sent.',
      failed,
    )
  }

  if (result.retainer && lead?.assessmentId) {
    await markSendRetainerTaskDone(lead.assessmentId, 'Sent via welcome packet.').catch(() => undefined)
  }
  await completeWelcomePacketForLead(leadId, `Welcome packet sent to ${signerEmail}.`).catch(() => undefined)
  return { ...result, templates, failed, signerEmail }
}

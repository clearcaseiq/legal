import { prisma } from './prisma'
import { updateCaseFacts } from './case-facts'

/**
 * Record a signed HIPAA authorization as the case's HIPAA consent.
 *
 * The medical-sharing gate reads `facts.consents.hipaa`, which intake sets from
 * a checkbox. A HIPAA authorization the client signs through e-signature (the
 * welcome packet) is a stronger grant of the same thing, but never set it, so
 * the attorney kept seeing "hidden until the client signs the HIPAA".
 */
export async function recordHipaaConsent(assessmentId: string, envelopeId: string): Promise<boolean> {
  const signedAt = new Date().toISOString()
  const updated = await updateCaseFacts({
    assessmentId,
    source: 'system',
    action: 'hipaa_consent_recorded',
    entityType: 'consent',
    entityId: envelopeId,
    summary: 'Signed HIPAA authorization recorded',
    actor: { type: 'system' },
    mutate: (facts) => {
      if (facts?.consents?.hipaa === true) return null
      return {
        ...facts,
        consents: {
          ...(facts.consents || {}),
          hipaa: true,
          hipaaEnvelopeId: envelopeId,
          hipaaSignedAt: signedAt,
        },
      }
    },
  })
  return updated?.written === true
}

/** Catch up cases whose HIPAA was signed before the signature recorded consent. */
export async function syncHipaaConsentFromSignedEnvelope(leadId: string, assessmentId: string): Promise<boolean> {
  const signed = await prisma.documentEnvelope.findFirst({
    where: { leadId, documentType: 'hipaa_authorization', clientSignedAt: { not: null }, status: { notIn: ['voided', 'declined'] } },
    select: { id: true },
  })
  return signed ? recordHipaaConsent(assessmentId, signed.id) : false
}

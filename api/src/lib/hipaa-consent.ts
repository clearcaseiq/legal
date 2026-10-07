import { prisma } from './prisma'
import { parseCaseFacts } from './case-facts'

/**
 * Record a signed HIPAA authorization as the case's HIPAA consent.
 *
 * The medical-sharing gate reads `facts.consents.hipaa`, which intake sets from
 * a checkbox. A HIPAA authorization the client signs through e-signature (the
 * welcome packet) is a stronger grant of the same thing, but never set it, so
 * the attorney kept seeing "hidden until the client signs the HIPAA".
 */
export async function recordHipaaConsent(assessmentId: string, envelopeId: string): Promise<boolean> {
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { facts: true } })
  if (!assessment) return false
  const facts: any = parseCaseFacts(assessment.facts)
  if (facts?.consents?.hipaa === true) return false
  const consents = { ...(facts.consents || {}), hipaa: true, hipaaEnvelopeId: envelopeId, hipaaSignedAt: new Date().toISOString() }
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { facts: JSON.stringify({ ...facts, consents }) },
  })
  return true
}

/** Catch up cases whose HIPAA was signed before the signature recorded consent. */
export async function syncHipaaConsentFromSignedEnvelope(leadId: string, assessmentId: string): Promise<boolean> {
  const signed = await prisma.documentEnvelope.findFirst({
    where: { leadId, documentType: 'hipaa_authorization', clientSignedAt: { not: null }, status: { notIn: ['voided', 'declined'] } },
    select: { id: true },
  })
  return signed ? recordHipaaConsent(assessmentId, signed.id) : false
}

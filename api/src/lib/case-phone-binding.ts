/**
 * Binds a claimant's phone number to a case so texted documents can be filed.
 *
 * Inbound SMS carries no identity beyond the sending number. The claimant's
 * number lives in `Assessment.facts.plaintiffContext.phone` — a JSON blob with
 * no reverse lookup — so without a binding row there is no way to answer "whose
 * case is this photo for" without scanning every assessment.
 *
 * A binding is also the consent record. It only exists because an attorney on
 * the case sent the invite, which is why an unrecognized number is refused
 * rather than matched heuristically against intake data.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { optOutKey } from './sms-opt-out'

export type CasePhoneBindingRef = {
  id: string
  assessmentId: string
  phoneE164: string
}

/**
 * The claimant's number for a case, normalized, or null when we have none.
 *
 * Prefers the facts blob over `User.phone` because intake writes the number the
 * claimant gave for this case, while the user row may carry an older one from a
 * previous matter.
 */
export async function claimantPhoneForAssessment(assessmentId: string): Promise<string | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { facts: true, user: { select: { phone: true } } },
  })
  if (!assessment) return null

  let fromFacts: string | null = null
  if (assessment.facts) {
    try {
      const facts = typeof assessment.facts === 'string' ? JSON.parse(assessment.facts) : assessment.facts
      const context = (facts?.plaintiffContext || {}) as Record<string, unknown>
      if (typeof context.phone === 'string') fromFacts = context.phone
    } catch {
      /* a malformed facts blob is not a reason to fail the lookup */
    }
  }

  return optOutKey(fromFacts) || optOutKey(assessment.user?.phone) || null
}

/**
 * Point a number at a case, revoking whatever it pointed at before.
 *
 * Numbers get reassigned between people, and one claimant can hold two matters,
 * so a number resolves to exactly one case: the one whose attorney most recently
 * asked for documents. Anything else means guessing which case a photo belongs
 * to, and guessing wrong files medical records on a stranger's matter.
 */
export async function bindCasePhone(params: {
  assessmentId: string
  phone: string
  boundByUserId?: string | null
}): Promise<CasePhoneBindingRef | null> {
  const phoneE164 = optOutKey(params.phone)
  if (!phoneE164) return null

  const superseded = await prisma.casePhoneBinding.updateMany({
    where: { phoneE164, status: 'active', assessmentId: { not: params.assessmentId } },
    data: { status: 'revoked', revokedAt: new Date() },
  })
  if (superseded.count > 0) {
    logger.info('Case phone binding superseded', {
      assessmentId: params.assessmentId,
      revoked: superseded.count,
    })
  }

  const existing = await prisma.casePhoneBinding.findFirst({
    where: { phoneE164, assessmentId: params.assessmentId },
    select: { id: true },
  })

  const binding = existing
    ? await prisma.casePhoneBinding.update({
        where: { id: existing.id },
        data: {
          status: 'active',
          revokedAt: null,
          boundAt: new Date(),
          boundByUserId: params.boundByUserId || null,
        },
        select: { id: true, assessmentId: true, phoneE164: true },
      })
    : await prisma.casePhoneBinding.create({
        data: {
          assessmentId: params.assessmentId,
          phoneE164,
          status: 'active',
          boundByUserId: params.boundByUserId || null,
        },
        select: { id: true, assessmentId: true, phoneE164: true },
      })

  return binding
}

/** The case a number may currently text documents to, or null. */
export async function activeBindingForPhone(phone: string): Promise<CasePhoneBindingRef | null> {
  const phoneE164 = optOutKey(phone)
  if (!phoneE164) return null
  return prisma.casePhoneBinding.findFirst({
    where: { phoneE164, status: 'active' },
    orderBy: { boundAt: 'desc' },
    select: { id: true, assessmentId: true, phoneE164: true },
  })
}

/** Record that documents arrived, for the audit trail. */
export async function markBindingUsed(bindingId: string): Promise<void> {
  await prisma.casePhoneBinding
    .update({ where: { id: bindingId }, data: { lastInboundAt: new Date() } })
    .catch((error: any) => {
      logger.warn('Failed to stamp case phone binding', { bindingId, error: error?.message })
    })
}

/** Stop accepting texted documents for a case. */
export async function revokeCasePhoneBindings(assessmentId: string): Promise<number> {
  const result = await prisma.casePhoneBinding.updateMany({
    where: { assessmentId, status: 'active' },
    data: { status: 'revoked', revokedAt: new Date() },
  })
  return result.count
}

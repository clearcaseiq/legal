import { prisma } from './prisma'
import { logger } from './logger'
import { updateCaseFacts } from './case-facts'
import { verifyClaimToken } from './claim-token'
import { isTransferableCaseOwner } from './guest-case-adoption'

export type CaseClaimResult =
  | { ok: true; assessmentId: string; referenceCode: string | null; transferred: boolean }
  | { ok: false; status: number; error: string }

/**
 * Move the case a claim token names onto `userId`.
 *
 * The token is the proof: it is handed only to the browser that created or sent
 * the case, or to the inbox it was submitted under. The caller's own email is
 * deliberately not compared, so a claimant who signs up under a new address
 * keeps the same case id. A case held by a real account never moves.
 */
export async function claimCaseWithToken(token: string, userId: string): Promise<CaseClaimResult> {
  const assessmentId = verifyClaimToken(token)
  if (!assessmentId) return { ok: false, status: 400, error: 'This claim link is invalid or has expired.' }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      userId: true,
      referenceCode: true,
      user: { select: { email: true, passwordHash: true, provider: true } },
    },
  })
  if (!assessment) return { ok: false, status: 404, error: 'Case not found' }

  if (assessment.userId === userId) {
    return { ok: true, assessmentId, referenceCode: assessment.referenceCode, transferred: false }
  }
  if (!isTransferableCaseOwner(assessment.userId ? assessment.user : null)) {
    return { ok: false, status: 409, error: 'This case is already linked to another account.' }
  }

  await prisma.assessment.update({ where: { id: assessmentId }, data: { userId } })
  await prisma.evidenceFile.updateMany({ where: { assessmentId }, data: { userId } })
  await prisma.intakeLead
    .updateMany({ where: { assessmentId }, data: { userId } })
    .catch((err: unknown) =>
      logger.warn('Could not relink intake lead on claimed case', {
        assessmentId,
        error: err instanceof Error ? err.message : String(err),
      }),
    )

  // Attorneys reach the claimant at the account's address, not the one typed at intake.
  const owner = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, phone: true } })
  if (owner?.email) {
    await updateCaseFacts({
      assessmentId,
      source: 'web',
      action: 'contact_updated',
      recordChange: false,
      mutate: (current) => {
        const context = { ...((current.plaintiffContext || {}) as Record<string, unknown>) }
        context.email = owner.email
        if (owner.phone) context.phone = owner.phone
        return { ...current, plaintiffContext: context }
      },
    }).catch((err: unknown) =>
      logger.warn('Could not sync claimant contact onto claimed case', {
        assessmentId,
        error: err instanceof Error ? err.message : String(err),
      }),
    )
  }

  logger.info('Case claimed with claim token', { assessmentId, userId })
  return { ok: true, assessmentId, referenceCode: assessment.referenceCode, transferred: true }
}

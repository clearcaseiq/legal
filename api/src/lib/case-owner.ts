/**
 * Who owns the files on a case.
 *
 * `EvidenceFile.userId` is required but `Assessment.userId` is not: intake runs
 * before an account exists. Attaching a document to a case therefore has to mint
 * a synthetic owner (`guest+<assessmentId>@caseiq.local`) that nobody can sign in
 * as, which `lib/guest-case-adoption.ts` later hands to the real account once the
 * claimant proves control of the matching inbox.
 *
 * Extracted from the evidence upload route so the SMS intake path resolves the
 * owner the same way. Two implementations of this would diverge into two
 * different owners for the same case.
 */
import { prisma } from './prisma'

export function guestCaseUserEmail(assessmentId: string): string {
  return `guest+${assessmentId}@caseiq.local`
}

/**
 * The user id to file a document under, creating the guest owner if needed.
 * Returns null only when the assessment does not exist.
 */
export async function ensureCaseOwnerUserId(assessmentId: string): Promise<string | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { userId: true },
  })
  if (!assessment) return null
  if (assessment.userId) return assessment.userId

  const email = guestCaseUserEmail(assessmentId)
  const existing = await prisma.user.findUnique({ where: { email } })
  const guestUser =
    existing ||
    (await prisma.user.create({
      data: {
        email,
        firstName: 'Guest',
        lastName: 'User',
        isActive: true,
        emailVerified: false,
      },
    }))

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { userId: guestUser.id },
  })

  return guestUser.id
}

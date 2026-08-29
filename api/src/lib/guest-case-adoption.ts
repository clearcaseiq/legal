import { prisma } from './prisma'
import { logger } from './logger'
import { isGuestCaseUserEmail } from './client-consent-guard'

/**
 * Attach cases submitted before an account existed to the account that now owns
 * the email they were submitted under.
 *
 * A guest submission produces two rows for one person: a provisional
 * passwordless `User` keyed on their real email (see `intake-account.ts`), and
 * an assessment owned by either nothing or the synthetic
 * `guest+<id>@caseiq.local` shadow user that evidence upload creates. Only two
 * things ever married them up — the `pending_assessment_id` in `localStorage`
 * and the emailed claim link — and a claimant who instead set a password
 * through "forgot password" went through neither. They signed in to an account
 * with no cases on it while their case sat on the shadow user (CP-811).
 *
 * Email is the join key here, so control of the inbox is what authorizes the
 * transfer. That is the same trust the claim link already runs on, and callers
 * must have established it: pass `emailVerified` only after a reset or
 * verification proved it. An unverified signup must not be able to name a
 * stranger's address and inherit their case.
 */

/** The contact email captured at intake, which is the only copy on the case. */
function contactEmailFromFacts(rawFacts: string | null | undefined): string | null {
  if (!rawFacts) return null
  try {
    const facts = JSON.parse(rawFacts) as { plaintiffContext?: { email?: unknown } }
    const email = facts?.plaintiffContext?.email
    return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null
  } catch {
    return null
  }
}

export interface AdoptGuestCasesResult {
  adoptedCount: number
  assessmentIds: string[]
}

/**
 * Transfer this user's pre-account cases to them. Best-effort: never throws, so
 * a failure here can never block the sign-in or reset that triggered it.
 */
export async function adoptGuestCasesByEmail(
  userId: string,
  email: string | null | undefined
): Promise<AdoptGuestCasesResult> {
  const normalizedEmail = email?.trim().toLowerCase()
  if (!userId || !normalizedEmail) return { adoptedCount: 0, assessmentIds: [] }

  try {
    // `facts` is a JSON text column, so the address cannot be matched in SQL.
    // `contains` narrows the scan to rows that mention it at all; the exact
    // field comparison happens below, because a match anywhere in the blob is
    // not evidence that this is the submitter's own address.
    const candidates = await prisma.assessment.findMany({
      where: {
        facts: { contains: normalizedEmail },
        OR: [{ userId: null }, { user: { email: { startsWith: 'guest+' } } }],
      },
      select: {
        id: true,
        userId: true,
        facts: true,
        user: { select: { email: true } },
      },
    })

    const adoptable = candidates
      .filter((assessment) => {
        // Re-check ownership rather than trusting the SQL prefilter: only a case
        // that belongs to nobody, or to a synthetic guest shadow user, may move.
        // A case already held by a real account is never transferable.
        if (assessment.userId && !isGuestCaseUserEmail(assessment.user?.email || '')) return false
        return contactEmailFromFacts(assessment.facts) === normalizedEmail
      })
      .map((assessment) => assessment.id)

    if (adoptable.length === 0) return { adoptedCount: 0, assessmentIds: [] }

    const updated = await prisma.assessment.updateMany({
      where: { id: { in: adoptable } },
      data: { userId },
    })
    // Evidence carries its own owner, and the dashboard reads it separately, so
    // files left behind would be invisible on an otherwise adopted case.
    await prisma.evidenceFile.updateMany({
      where: { assessmentId: { in: adoptable } },
      data: { userId },
    })

    logger.info('Adopted pre-account cases into account', {
      userId,
      assessmentIds: adoptable,
      adoptedCount: updated.count,
    })

    return { adoptedCount: updated.count, assessmentIds: adoptable }
  } catch (error) {
    logger.warn('Failed to adopt pre-account cases', { userId, error })
    return { adoptedCount: 0, assessmentIds: [] }
  }
}

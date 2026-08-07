/**
 * Read authorization for a single assessment.
 *
 * Assessment reads had no authorization at all: `GET /assessments/:id` and
 * `GET /assessments/:id/command-center` served a plaintiff's injury facts,
 * valuation bands and viability scores to any caller holding an id. Once a
 * plaintiff registers, their case is owned by a real account, so serving it
 * unauthenticated leaks an identified person's medical and financial detail.
 *
 * The wrinkle is that intake is deliberately anonymous. A visitor completes
 * `/assess` and lands on `/results/:id` before any account exists, so a blanket
 * auth requirement would break the funnel it is meant to protect. Access is
 * therefore scoped by whether the assessment has an owner yet:
 *
 *  - Owned by a user: the caller must be that user, an attorney the case was
 *    routed to, a member of the firm holding it, or an admin.
 *  - Not yet owned: the id is the only credential, so the read is allowed. That
 *    is a capability URL and is treated as one — see `noIndexAssessmentResponse`.
 *
 * Kept separate from the route handlers so the plaintiff, attorney and mobile
 * read paths cannot drift into different answers about who may see a case.
 */

import type { Response } from 'express'
import { prisma } from './prisma'
import { logger } from './logger'
import { isGuestCaseUserEmail } from './client-consent-guard'

export interface AssessmentAccessResult {
  allowed: boolean
  /** HTTP status to return when `allowed` is false. */
  status?: 401 | 403 | 404
  message?: string
  /** True when the assessment has no owner and was reached by id alone. */
  anonymous?: boolean
}

/**
 * Whether `user` may read `assessmentId`.
 *
 * `user` is the decoded request user, or null/undefined for an unauthenticated
 * caller (i.e. behind `optionalAuthMiddleware`).
 */
export async function canReadAssessment(
  assessmentId: string,
  user: { id: string; email?: string; role?: string } | null | undefined,
): Promise<AssessmentAccessResult> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      userId: true,
      lawFirmId: true,
      user: { select: { email: true } },
      leadSubmission: { select: { assignedAttorneyId: true, assignmentType: true, status: true } },
    },
  })
  if (!assessment) return { allowed: false, status: 404, message: 'Assessment not found' }

  // Pre-account intake. The id is the credential; nothing more can be checked.
  if (!assessment.userId) return { allowed: true, anonymous: true }

  // Uploading evidence during anonymous intake attaches the assessment to a
  // synthetic guest-case user (`guest+<id>@caseiq.local`) so the file has an
  // owner row. That is not a real account, so the case is still reachable by id
  // alone — treat it as anonymous rather than locking the guest out with a 401
  // the moment they add a document (the pre-account funnel must keep working).
  if (assessment.user?.email && isGuestCaseUserEmail(assessment.user.email)) {
    return { allowed: true, anonymous: true }
  }

  if (!user) {
    return { allowed: false, status: 401, message: 'Authentication required' }
  }
  if (user.role === 'admin') return { allowed: true }
  if (assessment.userId === user.id) return { allowed: true }

  // Attorneys and firm staff reach cases through the routing record rather than
  // ownership, so resolve the caller's attorney identity and firm membership.
  const [attorney, memberships] = await Promise.all([
    prisma.attorney.findFirst({
      where: { OR: [{ claimedByUserId: user.id }, ...(user.email ? [{ email: user.email }] : [])] },
      select: { id: true, lawFirmId: true },
    }),
    prisma.firmMember.findMany({
      where: { userId: user.id, status: 'active' },
      select: { lawFirmId: true },
    }),
  ])

  const lead = assessment.leadSubmission
  if (attorney) {
    if (lead?.assignedAttorneyId === attorney.id) return { allowed: true }
    // Attorneys who were not assigned reach a case only through the offer that
    // was actually made to them, so require an introduction on this assessment.
    const intro = await prisma.introduction.findFirst({
      where: { assessmentId, attorneyId: attorney.id },
      select: { id: true },
    })
    if (intro) return { allowed: true }
  }

  const firmIds = new Set(memberships.map((m) => m.lawFirmId))
  if (attorney?.lawFirmId) firmIds.add(attorney.lawFirmId)
  if (assessment.lawFirmId && firmIds.has(assessment.lawFirmId)) return { allowed: true }

  return { allowed: false, status: 403, message: 'Not authorized to view this assessment' }
}

/**
 * Mark a response as non-indexable.
 *
 * An anonymous results page is reachable by id alone, which makes it a
 * capability URL. If a crawler ever reaches one, the case detail becomes a
 * public document — and under California's SB 37 definition of an
 * advertisement, a publicly reachable page carrying a settlement estimate is an
 * advertisement subject to disclosure requirements it does not satisfy.
 */
export function noIndexAssessmentResponse(res: Response): void {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
}

/**
 * Apply the access decision to a response.
 *
 * Returns true when the caller may proceed; when false, the response has
 * already been sent.
 */
export async function enforceAssessmentReadAccess(params: {
  assessmentId: string
  user: { id: string; email?: string; role?: string } | null | undefined
  res: Response
  route: string
}): Promise<boolean> {
  const decision = await canReadAssessment(params.assessmentId, params.user)
  if (decision.allowed) {
    if (decision.anonymous) noIndexAssessmentResponse(params.res)
    return true
  }

  if (decision.status === 403) {
    logger.warn('Blocked unauthorized assessment read', {
      assessmentId: params.assessmentId,
      userId: params.user?.id ?? null,
      route: params.route,
    })
  }
  params.res.status(decision.status || 403).json({ error: decision.message || 'Not authorized' })
  return false
}

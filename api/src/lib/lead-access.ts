/**
 * Who may see a lead.
 *
 * Several read paths authorized on `assignmentType: 'shared'`. That term carries
 * no attorney predicate at all — `"shared"` is the schema default and what the
 * routing engine writes, so it matched every un-accepted lead in the table for
 * every caller. An attorney at one firm could read the injury facts, contact
 * details and valuation of a case routed to another firm for as long as nobody
 * had accepted it.
 *
 * Access has to name the caller. It comes from being assigned the lead, or from
 * holding a live introduction to it.
 */

/**
 * Introduction statuses that mean the offer is no longer this attorney's to act
 * on: the response window lapsed (EXPIRED) or they declined (DECLINED). A lead
 * whose only introductions for an attorney are terminal must not surface in that
 * attorney's caseload — otherwise a lead that expires and re-routes to the next
 * attorney keeps lingering in the first attorney's cases and New Matches.
 */
export const TERMINAL_INTRO_STATUSES = ['EXPIRED', 'DECLINED'] as const

/**
 * The Attorney id for the caller.
 *
 * `req.user` is a User row; leads, referrals and treatment records are keyed to
 * the Attorney row. The two share an email, not an id, so comparing `req.user.id`
 * to an `attorneyId` column matches nothing — and where that comparison sat next
 * to a blanket `assignmentType: 'shared'` term, the blanket term was doing all
 * the work.
 */
export async function resolveRequestAttorneyId(
  req: { user?: { email?: string } },
  client: { attorney: { findFirst: (args: any) => Promise<{ id: string } | null> } }
): Promise<string | null> {
  const email = String(req.user?.email || '').trim()
  if (!email) return null
  const attorney = await client.attorney.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  })
  return attorney?.id ?? null
}

/** OR-clause for queries rooted at `LeadSubmission`. */
export function leadAccessOr(attorneyId: string): any[] {
  return [
    { assignedAttorneyId: attorneyId },
    {
      assessment: {
        introductions: { some: { attorneyId, status: { notIn: [...TERMINAL_INTRO_STATUSES] } } },
      },
    },
  ]
}

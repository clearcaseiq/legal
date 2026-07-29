/**
 * Shared vocabulary for "has the attorney actually taken this case?".
 *
 * A lead the attorney has only been offered is still anonymised and must not
 * appear in surfaces that act on a real matter — scheduling, messaging, adding
 * documents (CP-426 and the related scoping reports).
 */

/** Statuses that mean the attorney has accepted and is working the case. */
export const ENGAGED_LEAD_STATUSES = ['accepted', 'contacted', 'consulted', 'retained'] as const

export function isEngagedLead(lead?: { status?: string | null } | null): boolean {
  return ENGAGED_LEAD_STATUSES.includes((lead?.status || '') as (typeof ENGAGED_LEAD_STATUSES)[number])
}

export function engagedLeadsOnly<T extends { status?: string | null }>(leads: T[]): T[] {
  return leads.filter(isEngagedLead)
}

/**
 * Server-side vocabulary for "has the attorney actually taken this case?".
 *
 * Mirrors app/src/lib/leadStatus.ts and apps/mobile/src/lib/formatLead.ts. A
 * lead the attorney has only been offered is still anonymised and must not be
 * actionable — no scheduling, messaging or document work against it (CP-426).
 */

/** Statuses that mean the attorney has accepted and is working the case. */
export const ENGAGED_LEAD_STATUSES = ['accepted', 'contacted', 'consulted', 'retained'] as const

export function isEngagedLeadStatus(status?: string | null): boolean {
  return (ENGAGED_LEAD_STATUSES as readonly string[]).includes(String(status || '').trim().toLowerCase())
}

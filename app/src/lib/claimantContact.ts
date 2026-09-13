/**
 * One answer to "what are the client's contact details", for every screen.
 *
 * Mirrors `api/src/lib/claimant-contact.ts`. A case carries two copies — the
 * account row and `plaintiffContext` inside the assessment's facts blob — and
 * the case copy wins, because that is the order the SMS layer resolves the
 * number it texts and the order staff edits are written in. Screens used to
 * rank them however each was written, so an attorney could read one number off
 * the case and have the platform dial another.
 */

export interface ResolvedClaimantContact {
  firstName: string | null
  lastName: string | null
  /** Both names joined, or null when neither side has one. */
  fullName: string | null
  email: string | null
  phone: string | null
  /** False for the synthetic guest owner, which nobody can sign in as. */
  hasAccount: boolean
}

interface ContactSource {
  user?: {
    email?: string | null
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
  } | null
  /** The assessment's facts, parsed or still a JSON string. */
  facts?: unknown
}

export function isShadowEmail(email: string | null | undefined): boolean {
  return /^guest\+.*@caseiq\.local$/i.test(email || '')
}

export function resolveClaimantContact(source: ContactSource): ResolvedClaimantContact {
  let context: Record<string, any> = {}
  if (source.facts) {
    try {
      const facts = typeof source.facts === 'string' ? JSON.parse(source.facts) : (source.facts as any)
      context = (facts?.plaintiffContext || {}) as Record<string, any>
    } catch {
      context = {}
    }
  }

  const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null)
  const user = source.user
  const accountEmail = str(user?.email)
  const hasAccount = Boolean(accountEmail) && !isShadowEmail(accountEmail)

  const firstName = str(context.firstName) || str(user?.firstName)
  const lastName = str(context.lastName) || str(user?.lastName)
  return {
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(' ') || null,
    email: str(context.email) || (hasAccount ? accountEmail : null),
    phone: str(context.phone) || str(user?.phone),
    hasAccount,
  }
}

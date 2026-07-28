/**
 * The name a case is displayed under.
 *
 * Cases have always been labelled by whatever could be derived at render time —
 * the plaintiff's name, falling back to the claim type — and that label was
 * rebuilt inline in a dozen places. Attorneys think of a matter by its caption
 * ("Rivera v. Delgado Trucking"), so `Assessment.caseName` lets them set one.
 *
 * The caption is free text, not a plaintiff/defendant pair, because the
 * defendant's name is not captured anywhere: intake never asks, and the only
 * defendant name stored in the whole schema is a document request's
 * `recipientName`, which exists only if someone served the opposing party.
 *
 * A crucial distinction for callers: this is the *case* name, not the
 * *plaintiff's* name. Anywhere addressing or describing the person — "Hi
 * {name}", "{name} has sent a message" — must keep using the plaintiff's real
 * name, or a renamed case starts greeting clients as "Rivera v. Delgado
 * Trucking".
 */

/** Long enough for a real caption with corporate parties, short enough to render. */
export const MAX_CASE_NAME_LENGTH = 160

export interface CaseNameSource {
  caseName?: string | null
  claimType?: string | null
  user?: { firstName?: string | null; lastName?: string | null } | null
}

/** Trim and collapse whitespace; empty input becomes null (meaning "unset"). */
export function normalizeCaseName(input: unknown): string | null {
  const value = String(input ?? '').replace(/\s+/g, ' ').trim()
  return value ? value.slice(0, MAX_CASE_NAME_LENGTH) : null
}

/** The plaintiff's own name, or null. Never substitute the caption for this. */
export function plaintiffNameOf(source: CaseNameSource): string | null {
  const name = [source.user?.firstName, source.user?.lastName].filter(Boolean).join(' ').trim()
  return name || null
}

/**
 * What to show as the case's name.
 *
 * Falls back through the chain cases have always used, so a case with no
 * caption set reads exactly as it did before this field existed.
 */
export function resolveCaseName(source: CaseNameSource, fallback = 'Case'): string {
  return normalizeCaseName(source.caseName) || plaintiffNameOf(source) || humanClaimType(source.claimType) || fallback
}

/** Title-cased claim type, e.g. "motor_vehicle" -> "Motor Vehicle". */
function humanClaimType(claimType?: string | null): string | null {
  const value = String(claimType ?? '').trim()
  if (!value) return null
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/**
 * Starting point for the caption editor, e.g. "Rivera v. ".
 *
 * The defendant is left for the attorney to type because nothing in the system
 * knows who it is. Returns null when there is no plaintiff name to build on.
 */
export function suggestedCaseName(source: CaseNameSource): string | null {
  const plaintiff = plaintiffNameOf(source)
  if (!plaintiff) return null
  const surname = plaintiff.split(' ').filter(Boolean).pop()
  return `${surname || plaintiff} v. `
}

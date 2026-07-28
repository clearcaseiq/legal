// The name a case is displayed under.
//
// Mirrors `api/src/lib/case-name.ts`. Cases were historically labelled by
// whatever could be derived at render time — the plaintiff's name, falling back
// to the claim type — and attorneys can now set a caption ("Rivera v. Delgado
// Trucking") instead. The caption is free text because no defendant name is
// captured anywhere in intake.
//
// Note the distinction: this is the *case* name, not the *plaintiff's* name.
// Anywhere that addresses the person ("Hi {name}") must keep using the client's
// real name, or a renamed case starts greeting clients by caption.

import { formatClaimType } from './claimTypes'

export const MAX_CASE_NAME_LENGTH = 160

export interface CaseNameSource {
  caseName?: string | null
  claimType?: string | null
  user?: { firstName?: string | null; lastName?: string | null } | null
}

/** The plaintiff's own name, or null. Never substitute the caption for this. */
export function plaintiffNameOf(source: CaseNameSource | null | undefined): string | null {
  const name = [source?.user?.firstName, source?.user?.lastName].filter(Boolean).join(' ').trim()
  return name || null
}

/**
 * What to show as the case's name. Falls back through the chain cases have
 * always used, so a case with no caption reads exactly as it did before.
 */
export function resolveCaseName(source: CaseNameSource | null | undefined, fallback = 'Case'): string {
  const caption = String(source?.caseName ?? '').replace(/\s+/g, ' ').trim()
  if (caption) return caption
  const plaintiff = plaintiffNameOf(source)
  if (plaintiff) return plaintiff
  return source?.claimType ? formatClaimType(source.claimType) : fallback
}

/** Reads the case name off a lead-shaped object ({ assessment: { ... } }). */
export function resolveLeadCaseName(lead: any, fallback = 'Case'): string {
  return resolveCaseName(lead?.assessment ?? lead, fallback)
}

/**
 * Just the name-like part of a case — the caption or the client — with no
 * claim-type fallback. For labels that already state the claim type separately
 * and would otherwise read "Motor Vehicle — Motor Vehicle".
 */
export function caseCaptionOf(source: CaseNameSource | null | undefined): string | null {
  const caption = String(source?.caseName ?? '').replace(/\s+/g, ' ').trim()
  return caption || plaintiffNameOf(source)
}

/**
 * Starting point for the caption editor, e.g. "Rivera v. ". The defendant is
 * left blank because nothing in the system knows who it is.
 */
export function suggestedCaseName(source: CaseNameSource | null | undefined): string | null {
  const plaintiff = plaintiffNameOf(source)
  if (!plaintiff) return null
  const surname = plaintiff.split(' ').filter(Boolean).pop()
  return `${surname || plaintiff} v. `
}

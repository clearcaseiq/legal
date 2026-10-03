/**
 * Which case files count as evidence.
 *
 * Signed retainers and authorizations live in the case's Documents list next to
 * the medical records and police reports, but they say nothing about the claim.
 * Counting them made a freshly signed retainer read as "more evidence" on every
 * strength score and coverage figure.
 */

/** Category for executed agreements (retainer, fee agreement, authorizations). */
export const AGREEMENT_CATEGORY = 'agreements'

/** Prisma `where` fragment selecting only supporting case records. */
export const SUPPORTING_EVIDENCE_WHERE = {
  uploadMethod: { not: 'esign' },
  category: { not: AGREEMENT_CATEGORY },
}

export function isSupportingEvidence(file: { uploadMethod?: string | null; category?: string | null }): boolean {
  return file.uploadMethod !== 'esign' && file.category !== AGREEMENT_CATEGORY
}

export function countSupportingEvidence(
  files: Array<{ uploadMethod?: string | null; category?: string | null }> | null | undefined,
): number {
  return (files || []).filter(isSupportingEvidence).length
}

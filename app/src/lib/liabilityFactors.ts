/**
 * Cleaning the liability factor before it is shown to a claimant.
 *
 * The factor is a written sentence that `prediction.ts` files inside the
 * `explainability` array, whose other entries are short machine keys. It used
 * to be cut to 40 characters on the way in, which mangled 37 of the 70 factor
 * strings — and the longest were the explanatory ones, so the cut landed
 * squarely on the text with the most to say. "Wet floor/spill - property owner
 * may be liable for maintenance" reached a claimant's PDF as "Wet floor/spill -
 * property owner may be".
 *
 * The cut is fixed at the source, but predictions already stored carry the
 * truncated text and keep serving it until the case is recalculated. So the
 * display side still has to recognise the damage rather than trust its input.
 */

/** The width of the old cap, and so the length a mangled factor still has. */
const LEGACY_TRUNCATION_LENGTH = 40

/**
 * Words a sentence does not end on.
 *
 * Catches a cut that happened to land on a space, which reads as broken English
 * rather than as a missing word. Retained alongside the length check because it
 * also catches sentences truncated somewhere other than by the 40-char cap.
 */
const DANGLING_WORD =
  /\b(may|and|or|but|the|a|an|to|of|with|is|are|be|been|was|were|has|have|had|can|could|will|would|should|that|which|when|while|because|for|from|in|on|at|as|by|its|their)$/i

export function isDanglingFragment(text: string): boolean {
  return DANGLING_WORD.test(text.trim().replace(/[.\u2026]+$/, '').trim())
}

/**
 * Whether a stored factor bears the fingerprint of the old cap.
 *
 * Measured before trimming, since the cut frequently landed on a space and the
 * trailing space is the evidence. Two of the 70 factors are legitimately 40
 * characters long and are therefore dropped too — they fall back to the generic
 * liability copy, which is a better outcome than any claimant reading a
 * sentence that stops mid-clause.
 */
export function isLegacyTruncated(rawFactor: string): boolean {
  return rawFactor.length === LEGACY_TRUNCATION_LENGTH
}

/**
 * Every factor fit to show, in order. Empty means fall back to generic copy.
 *
 * Takes raw, untrimmed strings exactly as they came out of `explainability`,
 * because `isLegacyTruncated` needs to measure them before anything trims them.
 */
export function presentableFactors(rawFactors: unknown[]): string[] {
  return rawFactors
    .filter((raw): raw is string => typeof raw === 'string')
    .filter((raw) => !isLegacyTruncated(raw))
    .map((raw) => raw.trim())
    .filter((text) => text.length > 0 && !isDanglingFragment(text))
}

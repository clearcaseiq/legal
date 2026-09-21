/**
 * Whether the settlement range needs something said about insurance coverage.
 *
 * Coverage is the only input that can invalidate the headline figure rather
 * than refine it. A claim modelled at $177,000 against a 15/30 policy recovers
 * $15,000 — so a range shown with no mention of coverage reads as
 * unconditional when its largest condition is simply unknown.
 *
 * Three states, because conflating any two of them misleads:
 *
 * - `capped`   A limit is on file and it bit. Say so, and say what the claim
 *              is worth as well as what it can collect: a capped case is an
 *              underinsured large case, not a small one, and that gap is what
 *              a bad-faith argument against the carrier rests on.
 * - `unknown`  No limit on file, so nothing was capped. The estimate is
 *              uncapped rather than low, and may fall once the limit is known.
 * - `null`     A limit is on file and sits above the band. Coverage is not a
 *              constraint here, so warning about it would be noise.
 *
 * Note the direction throughout: a policy limit is a ceiling on recovery,
 * never a floor. Copy that called it a floor would promise a minimum the
 * coverage does not provide.
 */
export type CoverageNoteKind = 'capped' | 'unknown' | null

export function coverageNoteKind(input: {
  /** True when the engine actually applied the ceiling to the band. */
  policyLimitConstrained: boolean
  /** The defendant's limit, when one has reached the file. */
  policyLimit: number | null | undefined
}): CoverageNoteKind {
  if (input.policyLimitConstrained) return 'capped'
  // A limit of zero is not a limit; it is an empty field that parsed to a
  // number. Treating it as known coverage would silence the caveat on exactly
  // the cases that most need it.
  if (input.policyLimit && input.policyLimit > 0) return null
  return 'unknown'
}

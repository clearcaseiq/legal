/**
 * Whether the claimant told us, at intake, that they have already hired a lawyer.
 *
 * Offering such a case to other attorneys asks them to contact someone who is
 * already represented, so routing holds it for a person to confirm first.
 *
 * The answer is read from `intakeData.casePosture`: `plaintiffContext` is
 * validated against a schema that strips the key, so the copy sent there never
 * reaches the database.
 */
export const CLAIMANT_REPRESENTED_REASON = 'claimant_represented'

export const CLAIMANT_REPRESENTED_NOTE =
  'Claimant says they have already hired a lawyer. Confirm with them before offering the case to other attorneys.'

export function claimantReportsRetainedLawyer(facts: unknown): boolean {
  const parsed = typeof facts === 'string' ? safeParse(facts) : facts
  if (!parsed || typeof parsed !== 'object') return false
  const record = parsed as Record<string, any>
  const status =
    record.intakeData?.casePosture?.attorneyStatus ?? record.plaintiffContext?.attorneyStatus
  return status === 'hired'
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

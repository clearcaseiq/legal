/**
 * The clinical fallback for `treatmentComplete`.
 *
 * Completing a treatment task used to be the only route out of the TREATMENT
 * stage, so a case that never grew one froze there — and the rule that raises
 * that task only fired while medical records were missing, meaning a claimant
 * who uploaded everything guaranteed the freeze. This is the second arm that
 * reads the recorded clinical position instead.
 */
import { describe, expect, it } from 'vitest'
import { careFinishedOnRecord } from './workflow-signals'

describe('careFinishedOnRecord', () => {
  it('accepts an explicit MMI flag', () => {
    expect(careFinishedOnRecord({ mmi: true, treatmentStatus: 'treating', stillTreating: true })).toBe(true)
  })

  it.each(['completed', 'mmi', 'discharged'])('accepts the terminal status %s', (treatmentStatus) => {
    expect(careFinishedOnRecord({ treatmentStatus, mmi: false, stillTreating: true })).toBe(true)
  })

  it('accepts a cleared stillTreating flag', () => {
    // What the claimant's own "I have finished treatment" writes, alongside
    // `completed`. Either one alone is enough.
    expect(careFinishedOnRecord({ stillTreating: false, mmi: false, treatmentStatus: 'treating' })).toBe(true)
  })

  it('is case-insensitive about the status', () => {
    expect(careFinishedOnRecord({ treatmentStatus: 'Discharged', mmi: false, stillTreating: true })).toBe(true)
  })

  it('rejects a case that is still treating', () => {
    expect(careFinishedOnRecord({ treatmentStatus: 'treating', mmi: false, stillTreating: true })).toBe(false)
  })

  it('rejects an unknown status', () => {
    // `unknown` is a real stored value and means nobody has assessed it.
    expect(careFinishedOnRecord({ treatmentStatus: 'unknown', mmi: false, stillTreating: true })).toBe(false)
  })

  it('treats a missing record as still treating, not as finished', () => {
    // The conservative direction, and the one that matters: silence is not a
    // discharge. A case nobody has assessed must not advance its stage.
    expect(careFinishedOnRecord(null)).toBe(false)
  })
})

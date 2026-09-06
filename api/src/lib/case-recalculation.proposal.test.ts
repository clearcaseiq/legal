import { describe, expect, it } from 'vitest'
import { mergeEvidenceIntoFacts } from './case-recalculation'
import { applyFactPath } from './case-fact-paths'

/**
 * A confirmed answer has to survive the next recalculation.
 *
 * `wage_loss`, `med_charges` and `med_paid` are not storage — the recalculation
 * recomputes each as max(intake_*, extracted_*) on every run. A proposal that
 * wrote only the visible key would display the confirmed figure right up until
 * the next upload or estimate touched the case, and then quietly put the old
 * intake number back. The claimant would watch an answer they had confirmed
 * revert on its own, with nothing in the audit trail to explain it.
 *
 * These run the real merge rather than asserting on the mirrors, because the
 * mirror is only interesting if it actually holds through the recalculation.
 */
describe('a confirmed answer survives recalculation', () => {
  it('keeps a corrected wage loss when no document contradicts it', () => {
    const before = { damages: { wage_loss: 2000, intake_wage_loss: 2000 } }
    const corrected = applyFactPath(before, 'damages.wage_loss', 5000)

    expect(mergeEvidenceIntoFacts(corrected, []).damages).toMatchObject({ wage_loss: 5000 })
  })

  it('keeps a corrected medical charge when no document contradicts it', () => {
    const before = { damages: { med_charges: 1000, intake_med_charges: 1000 } }
    const corrected = applyFactPath(before, 'damages.med_charges', 8200)

    expect(mergeEvidenceIntoFacts(corrected, []).damages).toMatchObject({ med_charges: 8200 })
  })

  it('keeps a corrected amount already paid', () => {
    const before = { damages: { med_paid: 100, intake_med_paid: 100 } }
    const corrected = applyFactPath(before, 'damages.med_paid', 750)

    expect(mergeEvidenceIntoFacts(corrected, []).damages).toMatchObject({ med_paid: 750 })
  })

  it('holds across repeated recalculations rather than reverting on the second', () => {
    const corrected = applyFactPath({ damages: { wage_loss: 2000, intake_wage_loss: 2000 } }, 'damages.wage_loss', 5000)
    const once = mergeEvidenceIntoFacts(corrected, [])
    const twice = mergeEvidenceIntoFacts(once, [])

    expect((twice.damages as any).wage_loss).toBe(5000)
  })

  // The correction is the claimant's own figure, so a document that evidences
  // more still wins. That is the existing rule and this must not weaken it.
  it('still lets a larger documented figure win', () => {
    const wageDoc = {
      id: 'file-wage',
      originalName: 'wage-verification.pdf',
      category: 'wage_loss',
      ocrText: 'Employer letter. Total Lost Wages: $12,000.00 for the period.',
      extractedData: [{ totalAmount: 12000, dollarAmounts: '["12000"]' }],
    }
    const corrected = applyFactPath({ damages: { wage_loss: 2000, intake_wage_loss: 2000 } }, 'damages.wage_loss', 5000)
    const merged = mergeEvidenceIntoFacts(corrected, [wageDoc]) as any

    expect(merged.damages.wage_loss).toBe(12000)
    // ...and the claimant's corrected figure is still on file as theirs.
    expect(merged.damages.intake_wage_loss).toBe(5000)
  })

  it('clears both keys when an answer is retracted, so nothing lingers', () => {
    const before = { damages: { wage_loss: 5000, intake_wage_loss: 5000 } }
    const cleared = applyFactPath(before, 'damages.wage_loss', null)

    expect((cleared.damages as any).wage_loss).toBeUndefined()
    expect((cleared.damages as any).intake_wage_loss).toBeUndefined()
    expect((mergeEvidenceIntoFacts(cleared, []).damages as any).wage_loss).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import { extractWageLossAmount, mergeEvidenceIntoFacts } from './case-recalculation'

// A pay stub documents income, not loss. Every figure on it — gross, net, YTD,
// deductions — is a number the OCR layer happily sums, and that sum used to become
// the claimed wage loss whenever the per-period pay rate failed to parse. On a
// modest case the phantom figure dominates the valuation, which is how an animal
// bite with roughly $4,000 in medical charges reported a $45,000 settlement
// estimate the moment a wage-verification document was attached.
const PAY_STUB = `
ACME PAYROLL SERVICES
Employee: Jane Doe          Pay Period: 03/01 - 03/15
Gross Earnings              $2,400.00
Federal Withholding         $412.00
State Withholding           $158.00
Net Pay                     $1,830.00
YTD Gross                   $38,400.00
YTD Net                     $29,280.00
`

describe('extractWageLossAmount', () => {
  it('claims nothing from a pay stub whose pay rate could not be parsed', () => {
    expect(extractWageLossAmount(PAY_STUB, 0, 3)).toBe(0)
  })

  it('converts a documented weekly rate over the missed-work period', () => {
    expect(extractWageLossAmount(PAY_STUB, 1200, 3)).toBe(3600)
  })

  it('trusts an explicitly labeled loss total over any parsed rate', () => {
    const employerLetter = 'Jane was unable to work. Total Lost Wages: $3,120.00 for the period.'

    expect(extractWageLossAmount(employerLetter, 1200, 3)).toBe(3120)
  })

  it('claims nothing when the claimant never reported missing work', () => {
    // Income alone is not a loss — without a duration there is nothing to multiply.
    expect(extractWageLossAmount(PAY_STUB, 1200, 0)).toBe(0)
  })
})

// Wage loss used to be read from and written back to the same `damages.wage_loss`
// key through a max(), so each run's output became the next run's floor and the
// figure could only ratchet upward. Deleting the wage document left the value
// untouched, which is what QA saw: the last column of the sweep removed a document
// and the $41,000 estimate did not move.
describe('wage loss does not ratchet across recalculations', () => {
  const wageDoc = {
    id: 'file-wage',
    originalName: 'wage-verification.pdf',
    category: 'wage_loss',
    ocrText: 'Employer letter. Total Lost Wages: $12,000.00 for the period.',
    extractedData: [{ totalAmount: 12000, dollarAmounts: '["12000"]' }],
  }
  const factsWithSelfReport = { damages: { wage_loss: 2000 } }

  it('keeps the claimant\u2019s own figure separate from the documented one', () => {
    const merged = mergeEvidenceIntoFacts(factsWithSelfReport, [wageDoc]) as any

    expect(merged.damages.wage_loss).toBe(12000)
    expect(merged.damages.intake_wage_loss).toBe(2000)
  })

  it('falls back to the reported figure when the wage document is removed', () => {
    const afterUpload = mergeEvidenceIntoFacts(factsWithSelfReport, [wageDoc])
    const afterRemoval = mergeEvidenceIntoFacts(afterUpload, []) as any

    expect(afterRemoval.damages.wage_loss).toBe(2000)
  })

  it('is idempotent when re-run against its own output', () => {
    const once = mergeEvidenceIntoFacts(factsWithSelfReport, [wageDoc])
    const twice = mergeEvidenceIntoFacts(once, [wageDoc]) as any
    const thrice = mergeEvidenceIntoFacts(twice, [wageDoc]) as any

    expect(twice.damages.wage_loss).toBe(12000)
    expect(thrice.damages.wage_loss).toBe(12000)
  })
})

// Rows written before `intake_wage_loss` existed carry the ratcheted figure in
// `wage_loss` itself. Reading it back as the claimant's own number would stamp the
// inflation as self-reported on the first run after the fix and make it permanent,
// so these pin the one-way door shut.
describe('wage loss written before the intake figure was kept separately', () => {
  const wageDoc = {
    id: 'file-wage',
    originalName: 'wage-verification.pdf',
    category: 'wage_loss',
    ocrText: 'Employer letter. Total Lost Wages: $12,000.00 for the period.',
    extractedData: [{ totalAmount: 12000, dollarAmounts: '["12000"]' }],
  }

  it('does not adopt a derived figure as the claimant\u2019s own', () => {
    // The shape the old code left behind: wage_loss promoted to the extracted value,
    // with no intake_wage_loss to say what was actually reported.
    const ratcheted = { damages: { wage_loss: 12000, extracted_wage_loss: 12000 } }
    const merged = mergeEvidenceIntoFacts(ratcheted, [wageDoc]) as any

    expect(merged.damages.intake_wage_loss).toBe(0)
    expect(merged.damages.wage_loss).toBe(12000)
  })

  it('lets the figure fall away with the document that produced it', () => {
    const ratcheted = { damages: { wage_loss: 12000, extracted_wage_loss: 12000 } }
    const repaired = mergeEvidenceIntoFacts(ratcheted, [wageDoc])
    const afterRemoval = mergeEvidenceIntoFacts(repaired, []) as any

    expect(afterRemoval.damages.wage_loss).toBe(0)
  })

  it('keeps a reported figure that was never overwritten', () => {
    // wage_loss above extracted_wage_loss means the claimant's own number won the
    // old max(), so it is genuinely theirs and must survive.
    const legacy = { damages: { wage_loss: 20000, extracted_wage_loss: 12000 } }
    const merged = mergeEvidenceIntoFacts(legacy, [wageDoc]) as any

    expect(merged.damages.intake_wage_loss).toBe(20000)
    expect(merged.damages.wage_loss).toBe(20000)
  })

  it('keeps a reported figure on a case that never had a wage document', () => {
    const legacy = { damages: { wage_loss: 3000 } }
    const merged = mergeEvidenceIntoFacts(legacy, []) as any

    expect(merged.damages.intake_wage_loss).toBe(3000)
    expect(merged.damages.wage_loss).toBe(3000)
  })

  it('does not re-zero once the intake figure is recorded', () => {
    // An explicit 0 must be read as "nothing reported", not as absent, or the
    // repair would run again on every future recalculation.
    const repaired = { damages: { intake_wage_loss: 0, wage_loss: 12000, extracted_wage_loss: 12000 } }
    const merged = mergeEvidenceIntoFacts(repaired, [wageDoc]) as any

    expect(merged.damages.intake_wage_loss).toBe(0)
    expect(merged.damages.wage_loss).toBe(12000)
  })

  it('leaves a claimant who reported the documented amount no worse off', () => {
    const coincidence = { damages: { wage_loss: 12000, extracted_wage_loss: 12000 } }
    const merged = mergeEvidenceIntoFacts(coincidence, [wageDoc]) as any

    // Zeroed as unrecoverable, but the max() puts the same total straight back.
    expect(merged.damages.wage_loss).toBe(12000)
  })
})

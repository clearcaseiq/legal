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

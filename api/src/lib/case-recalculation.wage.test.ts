import { describe, expect, it } from 'vitest'
import { extractWageLossAmount } from './case-recalculation'

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

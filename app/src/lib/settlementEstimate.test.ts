import { describe, expect, it } from 'vitest'
import { estimateSettlement, formatUsd } from './settlementEstimate'
import { CALCULATOR_VARIANT_SLUGS } from '../data/settlementCalculatorVariantSlugs'
import { CALCULATOR_VARIANTS, calculatorVariantBySlug } from '../data/settlementCalculatorVariants'

const baseInput = {
  medicalBills: 10_000,
  futureMedical: 0,
  lostWages: 5_000,
  otherCosts: 0,
  severity: 'moderate' as const,
  liability: 'clear' as const,
  faultPercent: 0,
  claimType: 'general' as const,
}

describe('estimateSettlement', () => {
  it('adds economic loss to a multiplier-driven non-economic range', () => {
    const result = estimateSettlement(baseInput)
    expect('error' in result).toBe(false)
    if ('error' in result) return

    // 10k medical specials x 2 to 3.5, plus 15k economic.
    expect(result.economicTotal).toBe(15_000)
    expect(result.nonEconomicLow).toBe(20_000)
    expect(result.nonEconomicHigh).toBe(35_000)
    expect(result.low).toBe(35_000)
    expect(result.high).toBe(50_000)
  })

  it('bases the multiplier on medical specials only, not wages', () => {
    const withWages = estimateSettlement({ ...baseInput, lostWages: 100_000 })
    if ('error' in withWages) throw new Error(withWages.error)

    // Wages move the economic total but must not inflate the multiplier base.
    expect(withWages.medicalSpecials).toBe(10_000)
    expect(withWages.nonEconomicHigh).toBe(35_000)
  })

  it('reduces proportionally for comparative fault without barring recovery', () => {
    const majorityFault = estimateSettlement({ ...baseInput, faultPercent: 75 })
    if ('error' in majorityFault) throw new Error(majorityFault.error)

    // Pure comparative negligence: 75% at fault still recovers 25%.
    expect(majorityFault.high).toBe(12_500)
    expect(majorityFault.notes.join(' ')).toContain('pure comparative negligence')
  })

  it('discounts a disputed liability picture', () => {
    const disputed = estimateSettlement({ ...baseInput, liability: 'disputed' })
    if ('error' in disputed) throw new Error(disputed.error)
    expect(disputed.high).toBe(35_000)
  })

  it('caps the range at a known policy limit and says so', () => {
    const capped = estimateSettlement({ ...baseInput, policyLimit: 25_000 })
    if ('error' in capped) throw new Error(capped.error)

    expect(capped.cappedByPolicyLimit).toBe(true)
    expect(capped.high).toBe(25_000)
    expect(capped.notes.join(' ')).toContain('insurance limit')
  })

  it('leaves the range alone when the policy limit is not binding', () => {
    const roomy = estimateSettlement({ ...baseInput, policyLimit: 500_000 })
    if ('error' in roomy) throw new Error(roomy.error)
    expect(roomy.cappedByPolicyLimit).toBe(false)
    expect(roomy.high).toBe(50_000)
  })

  it('warns that the malpractice non-economic figure is uncapped', () => {
    const medmal = estimateSettlement({ ...baseInput, claimType: 'medical_malpractice' })
    if ('error' in medmal) throw new Error(medmal.error)
    expect(medmal.notes.join(' ')).toContain('MICRA')
  })

  it('rejects negative and non-finite amounts', () => {
    expect(estimateSettlement({ ...baseInput, medicalBills: -1 })).toEqual({
      error: 'Enter dollar amounts as positive numbers.',
    })
    expect(estimateSettlement({ ...baseInput, lostWages: Number.NaN })).toEqual({
      error: 'Enter dollar amounts as positive numbers.',
    })
  })

  it('rejects a fault share outside 0-100', () => {
    expect(estimateSettlement({ ...baseInput, faultPercent: 120 })).toEqual({
      error: 'Your share of fault must be between 0 and 100 percent.',
    })
  })

  it('requires at least one dollar amount', () => {
    const empty = estimateSettlement({
      ...baseInput,
      medicalBills: 0,
      lostWages: 0,
    })
    expect(empty).toEqual({
      error: 'Enter at least one dollar amount — medical bills, future care, wages, or costs.',
    })
  })

  it('reports economic loss only when there is no treatment cost', () => {
    const noTreatment = estimateSettlement({ ...baseInput, medicalBills: 0 })
    if ('error' in noTreatment) throw new Error(noTreatment.error)

    expect(noTreatment.nonEconomicHigh).toBe(0)
    expect(noTreatment.high).toBe(5_000)
    expect(noTreatment.notes.join(' ')).toContain('no basis for the non-economic component')
  })

  it('rounds coarsely at larger values so the range reads as an estimate', () => {
    const large = estimateSettlement({
      ...baseInput,
      medicalBills: 187_431,
      lostWages: 63_219,
      severity: 'severe',
    })
    if ('error' in large) throw new Error(large.error)

    expect(large.high % 5_000).toBe(0)
    expect(large.low % 5_000).toBe(0)
  })

  it('formats dollars without cents', () => {
    expect(formatUsd(48_500)).toBe('$48,500')
  })
})

describe('calculator variants', () => {
  it('defines a variant for every routed slug', () => {
    const missing = CALCULATOR_VARIANT_SLUGS.filter((slug) => !calculatorVariantBySlug.has(slug))
    expect(missing).toEqual([])
  })

  it('routes every variant it defines', () => {
    const unrouted = CALCULATOR_VARIANTS.map((variant) => variant.slug).filter(
      (slug) => !CALCULATOR_VARIANT_SLUGS.includes(slug),
    )
    expect(unrouted).toEqual([])
  })

  it('gives each variant distinct copy rather than a templated reskin', () => {
    // The five pages previously shared FAQs that differed only by injury name,
    // which is the scaled-content pattern this replaced.
    const questions = CALCULATOR_VARIANTS.flatMap((variant) => variant.faqs.map((faq) => faq.q))
    expect(new Set(questions).size).toBe(questions.length)

    const intros = CALCULATOR_VARIANTS.map((variant) => variant.intro)
    expect(new Set(intros).size).toBe(intros.length)
  })

  it('gives every variant enough substance to stand alone', () => {
    for (const variant of CALCULATOR_VARIANTS) {
      expect(variant.valueDrivers.length, variant.slug).toBeGreaterThanOrEqual(4)
      expect(variant.faqs.length, variant.slug).toBeGreaterThanOrEqual(4)
      expect(variant.caveats.length, variant.slug).toBeGreaterThanOrEqual(1)
      expect(variant.coverageHint.length, variant.slug).toBeGreaterThan(40)
    }
  })

  it('starts each variant at a severity that suits the injury', () => {
    expect(calculatorVariantBySlug.get('/tools/whiplash-settlement-calculator')?.defaultSeverity).toBe('soft_tissue')
    expect(calculatorVariantBySlug.get('/tools/tbi-settlement-calculator')?.defaultSeverity).toBe('severe')
  })

  it('warns that the method fits brain injury claims poorly', () => {
    const tbi = calculatorVariantBySlug.get('/tools/tbi-settlement-calculator')
    expect(tbi?.methodWarning).toBeTruthy()
    expect(tbi?.wageLabel).toContain('earning capacity')
  })
})

/**
 * Just the variant URLs, so `App.tsx` can declare routes without importing the
 * variant prose into the chunk that loads on every route.
 *
 * `settlementCalculatorVariants` types its slugs against this list, and
 * `settlementEstimate.test.ts` asserts the two stay in step.
 */
export const CALCULATOR_VARIANT_SLUGS = [
  '/tools/whiplash-settlement-calculator',
  '/tools/herniated-disc-calculator',
  '/tools/tbi-settlement-calculator',
  '/tools/truck-accident-calculator',
  '/tools/uber-accident-calculator',
] as const

export type CalculatorVariantSlug = (typeof CALCULATOR_VARIANT_SLUGS)[number]

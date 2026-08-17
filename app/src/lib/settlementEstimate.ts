/**
 * Educational settlement range estimator.
 *
 * Uses the "multiplier method" that plaintiff firms and insurers both describe
 * publicly: total documented economic loss, plus a non-economic component
 * derived from medical specials times a severity multiplier, then reduced for
 * the claimant's share of fault and capped by any known policy limit.
 *
 * The method is deliberately transparent rather than a black box. A visitor can
 * reproduce every number by hand, which is what makes the tool citable — and it
 * keeps ClearCaseIQ from appearing to promise an outcome it cannot promise.
 *
 * Deliberately NOT modelled:
 *  - Venue and jury tendencies. Real, but not reducible to a published constant.
 *  - Liens and subrogation, which reduce net recovery rather than case value.
 *  - Attorney fees and costs.
 *  - MICRA's non-economic cap for medical malpractice, which escalates annually.
 *    Hardcoding this year's figure would silently go stale, so the cap is
 *    surfaced as a warning instead of a computation.
 */

export type InjurySeverity = 'soft_tissue' | 'moderate' | 'serious' | 'severe' | 'catastrophic'
export type LiabilityClarity = 'clear' | 'mostly_clear' | 'disputed'
export type EstimateClaimType = 'general' | 'medical_malpractice'

export const SEVERITY_OPTIONS: Array<{
  value: InjurySeverity
  label: string
  hint: string
  /** Multiplier applied to medical specials for the non-economic component. */
  low: number
  high: number
}> = [
  {
    value: 'soft_tissue',
    label: 'Soft tissue, no objective findings',
    hint: 'Strain or sprain, resolved with conservative care. No imaging findings.',
    low: 1.5,
    high: 2.5,
  },
  {
    value: 'moderate',
    label: 'Objective findings, extended treatment',
    hint: 'Imaging confirms an injury. Months of physical therapy or chiropractic care.',
    low: 2,
    high: 3.5,
  },
  {
    value: 'serious',
    label: 'Fracture, injections, or surgery recommended',
    hint: 'Documented structural injury. Interventional pain management or a surgical recommendation.',
    low: 3,
    high: 5,
  },
  {
    value: 'severe',
    label: 'Surgery performed, lasting limitation',
    hint: 'Surgery completed, with documented permanent impairment or work restrictions.',
    low: 4,
    high: 7,
  },
  {
    value: 'catastrophic',
    label: 'Permanent disability or catastrophic injury',
    hint: 'Traumatic brain injury, spinal cord injury, amputation, or permanent disability.',
    low: 6,
    high: 10,
  },
]

/**
 * Carriers discount disputed liability, so the same injury settles for less when
 * fault is genuinely contested. Separate from comparative fault, which reduces a
 * proven recovery by a specific percentage.
 */
export const LIABILITY_OPTIONS: Array<{
  value: LiabilityClarity
  label: string
  hint: string
  factor: number
}> = [
  {
    value: 'clear',
    label: 'Clear — other side plainly at fault',
    hint: 'Rear-end collision, citation issued, or a liability admission.',
    factor: 1,
  },
  {
    value: 'mostly_clear',
    label: 'Probably clear, some argument',
    hint: 'Fault likely rests with the other side but the carrier is raising questions.',
    factor: 0.9,
  },
  {
    value: 'disputed',
    label: 'Actively disputed',
    hint: 'Conflicting accounts, no citation, or the carrier denies liability.',
    factor: 0.7,
  },
]

export type SettlementEstimateInput = {
  medicalBills: number
  futureMedical: number
  lostWages: number
  otherCosts: number
  severity: InjurySeverity
  liability: LiabilityClarity
  /** Claimant's own share of fault, 0–100. */
  faultPercent: number
  claimType: EstimateClaimType
  /** Known or suspected insurance limit. 0 or absent means unknown. */
  policyLimit?: number
}

export type SettlementEstimate = {
  medicalSpecials: number
  economicTotal: number
  multiplierLow: number
  multiplierHigh: number
  nonEconomicLow: number
  nonEconomicHigh: number
  /** Before comparative fault and any policy limit. */
  grossLow: number
  grossHigh: number
  faultPercent: number
  low: number
  high: number
  cappedByPolicyLimit: boolean
  notes: string[]
}

/** Guards against typos producing a nonsense headline number. */
const MAX_INPUT = 100_000_000

function isCleanAmount(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= MAX_INPUT
}

/**
 * Rounds so the output does not imply precision the method cannot support.
 * A range of $47,312–$78,908 reads like a quote; $47,500–$79,000 reads like an
 * estimate, which is what it is.
 */
function roundForDisplay(value: number) {
  const step = value >= 250_000 ? 5_000 : value >= 50_000 ? 1_000 : 500
  return Math.round(value / step) * step
}

export function formatUsd(value: number) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

export function estimateSettlement(
  input: SettlementEstimateInput,
): SettlementEstimate | { error: string } {
  const { medicalBills, futureMedical, lostWages, otherCosts, policyLimit = 0 } = input

  for (const amount of [medicalBills, futureMedical, lostWages, otherCosts, policyLimit]) {
    if (!isCleanAmount(amount)) {
      return { error: 'Enter dollar amounts as positive numbers.' }
    }
  }

  if (!Number.isFinite(input.faultPercent) || input.faultPercent < 0 || input.faultPercent > 100) {
    return { error: 'Your share of fault must be between 0 and 100 percent.' }
  }

  const severity = SEVERITY_OPTIONS.find((option) => option.value === input.severity)
  const liability = LIABILITY_OPTIONS.find((option) => option.value === input.liability)
  if (!severity || !liability) return { error: 'Choose an injury severity and liability description.' }

  const medicalSpecials = medicalBills + futureMedical
  const economicTotal = medicalSpecials + lostWages + otherCosts
  if (economicTotal <= 0) {
    return { error: 'Enter at least one dollar amount — medical bills, future care, wages, or costs.' }
  }

  const nonEconomicLow = medicalSpecials * severity.low
  const nonEconomicHigh = medicalSpecials * severity.high

  const grossLow = (economicTotal + nonEconomicLow) * liability.factor
  const grossHigh = (economicTotal + nonEconomicHigh) * liability.factor

  // California is a pure comparative negligence state: a claimant's own fault
  // reduces recovery proportionally but never bars it, even above 50%. Many
  // other states bar recovery past a threshold, which is why this is stated.
  const retained = 1 - input.faultPercent / 100
  let low = grossLow * retained
  let high = grossHigh * retained

  const notes: string[] = []
  let cappedByPolicyLimit = false

  if (policyLimit > 0 && high > policyLimit) {
    cappedByPolicyLimit = true
    low = Math.min(low, policyLimit)
    high = policyLimit
    notes.push(
      'The estimate reached the insurance limit you entered. Available coverage often decides actual recovery, regardless of how a claim is valued. Ask whether other policies apply — umbrella, employer, commercial, or your own underinsured motorist coverage.',
    )
  }

  if (input.faultPercent > 0) {
    notes.push(
      `Reduced by your ${input.faultPercent}% share of fault. California uses pure comparative negligence, so partial fault lowers recovery proportionally but does not eliminate it.`,
    )
  }

  if (input.claimType === 'medical_malpractice') {
    notes.push(
      'California caps non-economic damages in medical malpractice claims, and the cap rises each year under the 2022 MICRA amendments. The non-economic portion above is uncapped, so treat it as an upper bound and confirm the current figure with counsel.',
    )
  }

  if (medicalSpecials === 0) {
    notes.push(
      'Without medical treatment costs there is no basis for the non-economic component, so this shows economic loss only. Untreated injuries are difficult to value.',
    )
  }

  if (input.severity === 'soft_tissue' && medicalSpecials > 50_000) {
    notes.push(
      'Large treatment totals for a soft tissue injury draw carrier scrutiny over whether the care was reasonable and necessary. Expect the billed amount itself to be contested.',
    )
  }

  if (futureMedical > 0) {
    notes.push(
      'Future medical care usually has to be supported by a physician’s written opinion or a life care plan before a carrier will pay it.',
    )
  }

  return {
    medicalSpecials,
    economicTotal,
    multiplierLow: severity.low,
    multiplierHigh: severity.high,
    nonEconomicLow: roundForDisplay(nonEconomicLow),
    nonEconomicHigh: roundForDisplay(nonEconomicHigh),
    grossLow: roundForDisplay(grossLow),
    grossHigh: roundForDisplay(grossHigh),
    faultPercent: input.faultPercent,
    low: roundForDisplay(low),
    high: roundForDisplay(high),
    cappedByPolicyLimit,
    notes,
  }
}

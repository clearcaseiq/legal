/**
 * The trial band must be able to say "you could lose".
 *
 * The floor was a flat 1.35x the settlement *high*, so the worst trial outcome
 * always beat the best settlement and the band could not represent a defence
 * verdict. These lock the floor to liability, and in particular lock it below
 * the settlement high once liability is genuinely contested — which is the
 * whole point, and the thing a flat multiple can never do.
 */
import { describe, expect, it } from 'vitest'
import { reconcileValueBandsWithUnderwriting } from './underwriting-engine'

/** The reported case: $45k-$103k, most likely $79k, on a wet-floor premises claim. */
const settlement = {
  low: 45000,
  expected: 79000,
  high: 103000,
  policyLimitConstrained: false,
  coverage: { basis: 'unknown', defendantLimit: null },
  baseInjuryValue: 30000,
  economicDamages: {
    medicalBills: 26000,
    lostWages: 0,
    outOfPocket: 0,
    futureMedicalAdjusted: 0,
    total: 26000,
  },
} as any

const liabilityOf = (score: number) => ({ score, grade: 'moderate', positives: [], negatives: [] }) as any

const trialOf = (score: number) =>
  reconcileValueBandsWithUnderwriting(null, settlement, liabilityOf(score)).trial

describe('trial band', () => {
  it('leaves an airtight liability case at the original multiples', () => {
    const trial = trialOf(100)
    expect(trial.p25).toBe(139000) // 103000 * 1.35
    expect(trial.p75).toBe(335000) // 103000 * 3.25
  })

  it('drops the floor below the settlement high once liability is contested', () => {
    // The reported case: Moderate liability, no police report, no photos, no
    // witnesses. Trial must not promise more than the best settlement.
    const trial = trialOf(55)
    expect(trial.p25).toBeLessThan(settlement.high)
  })

  it('takes the floor toward nothing when liability is unsupported', () => {
    expect(trialOf(10).p25).toBeLessThan(10000)
    expect(trialOf(0).p25).toBe(0)
  })

  it('never lowers the ceiling, because winning is worth what it is worth', () => {
    for (const score of [0, 25, 55, 80, 100]) {
      expect(trialOf(score).p75).toBe(335000)
    }
  })

  it('moves the floor monotonically with liability', () => {
    const floors = [0, 20, 40, 60, 80, 100].map((score) => trialOf(score).p25)
    for (let i = 1; i < floors.length; i += 1) {
      expect(floors[i]).toBeGreaterThanOrEqual(floors[i - 1])
    }
  })

  it('penalises a middling case more than linearly', () => {
    // Half the liability score is worth a quarter of the floor, not half:
    // a jury has to find duty, breach, causation and notice.
    const half = trialOf(50).p25
    const full = trialOf(100).p25
    expect(half).toBeLessThan(full * 0.3)
  })

  it('records the liability score it used, so a band can be explained later', () => {
    const trial = trialOf(55)
    expect(trial.liabilityScore).toBe(55)
    expect(trial.formula).toContain('55/100')
  })

  it('still reports the coverage constraint without applying it', () => {
    // An excess judgment is the predicate for a bad-faith claim, so the trial
    // band reports the cap and is not capped by it.
    const constrained = { ...settlement, policyLimitConstrained: true }
    const trial = reconcileValueBandsWithUnderwriting(null, constrained, liabilityOf(100)).trial
    expect(trial.policyLimitConstrained).toBe(true)
    expect(trial.p75).toBe(335000)
  })

  it('leaves the settlement band untouched', () => {
    const bands = reconcileValueBandsWithUnderwriting(null, settlement, liabilityOf(20))
    expect(bands.p25).toBe(45000)
    expect(bands.median).toBe(79000)
    expect(bands.p75).toBe(103000)
  })
})

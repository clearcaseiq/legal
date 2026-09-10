import { describe, expect, it } from 'vitest'
import {
  liabilityTier,
  liabilityConfidenceLevel,
  LIABILITY_TIER_MIN,
  LIABILITY_TIER_COPY_KEY,
  LIABILITY_TIER_ENUM,
  type LiabilityTier,
} from './liabilityGrade'
import { LIABILITY_TIER_MIN as API_TIER_MIN, liabilityGrade } from '../../../api/src/lib/liability-grade'

describe('liabilityTier', () => {
  it('grades on the engine boundaries', () => {
    expect(liabilityTier(100)).toBe('very_strong')
    expect(liabilityTier(85)).toBe('very_strong')
    expect(liabilityTier(84)).toBe('strong')
    expect(liabilityTier(70)).toBe('strong')
    expect(liabilityTier(69)).toBe('moderate')
    expect(liabilityTier(45)).toBe('moderate')
    expect(liabilityTier(44)).toBe('weak')
    expect(liabilityTier(0)).toBe('weak')
  })

  /**
   * The defect this module was written for. A case scoring 42 used to grade
   * 'moderate' here — rendered "Mixed" — while the engine graded it 'Weak',
   * because this page drew the line at 40 and the engine at 45.
   */
  it('calls a 42 weak, the way the engine does', () => {
    expect(liabilityTier(42)).toBe('weak')
    expect(liabilityGrade(42)).toBe('Weak')
  })

  /**
   * The worse defect: the Results page graded the same score twice, once at
   * 70/40 for its clarity label and once at 75/45 for its snapshot tile, so a
   * 72 read "Strong" in one tile and "Mixed" in the other on one screen.
   */
  it('gives a 72 a single answer', () => {
    expect(liabilityTier(72)).toBe('strong')
    expect(LIABILITY_TIER_COPY_KEY[liabilityTier(72)]).toBe('results.snapshotGrades.strong')
  })

  it('treats an unparseable score as weak rather than as a strong default', () => {
    expect(liabilityTier(Number.NaN)).toBe('weak')
  })
})

/**
 * This file is a hand-maintained mirror of the server module. If the two drift
 * the claimant and the attorney go back to reading different grades off one
 * score, which is the whole failure being fixed, so pin them together.
 */
describe('mirror of api/src/lib/liability-grade', () => {
  it('draws the tiers at the same scores as the server', () => {
    expect(LIABILITY_TIER_MIN).toEqual(API_TIER_MIN)
  })

  it('agrees with the server tier at every boundary', () => {
    const serverTier = (score: number) => liabilityGrade(score).toLowerCase().replace(/\s+/g, '_')
    for (const score of [0, 44, 45, 69, 70, 84, 85, 100]) {
      expect(liabilityTier(score)).toBe(serverTier(score))
    }
  })
})

describe('claimant-facing copy', () => {
  const tiers: LiabilityTier[] = ['very_strong', 'strong', 'moderate', 'weak']

  it('has a translated key for every tier', () => {
    for (const tier of tiers) {
      expect(LIABILITY_TIER_COPY_KEY[tier]).toMatch(/^results\.snapshotGrades\./)
    }
  })

  /**
   * Only the weakest tier is reworded for claimants, and "Needs Proof" says the
   * same thing as "Weak" more gently. The old "Mixed" did not — it described a
   * middling case where the engine saw an unsupported one.
   */
  it('softens only the weakest tier', () => {
    expect(LIABILITY_TIER_ENUM.very_strong).toBe('Very Strong')
    expect(LIABILITY_TIER_ENUM.strong).toBe('Strong')
    expect(LIABILITY_TIER_ENUM.moderate).toBe('Moderate')
    expect(LIABILITY_TIER_ENUM.weak).toBe('Needs Proof')
  })

  it('collapses onto the three-step meter without losing order', () => {
    expect(liabilityConfidenceLevel('very_strong')).toBe('High')
    expect(liabilityConfidenceLevel('strong')).toBe('High')
    expect(liabilityConfidenceLevel('moderate')).toBe('Medium')
    expect(liabilityConfidenceLevel('weak')).toBe('Low')
  })
})

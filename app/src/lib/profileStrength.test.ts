import { describe, expect, it } from 'vitest'
import { computeProfileStrength } from './profileStrength'

const COMPLETE = {
  photoUrl: '/uploads/avatars/a.png',
  bio: 'Fifteen years representing injured Californians.',
  languages: ['English', 'Spanish'],
  totalSettlements: 250_000,
}

describe('computeProfileStrength', () => {
  it('scores a fully filled profile at 100%', () => {
    expect(computeProfileStrength(COMPLETE).percent).toBe(100)
  })

  it('scores an empty profile at 0% and lists every item as missing', () => {
    const result = computeProfileStrength({})
    expect(result.percent).toBe(0)
    expect(result.missing.map((m) => m.label)).toEqual([
      'Headshot',
      'Practice Description',
      'Spanish Language',
      'Settlement History',
    ])
  })

  it('moves in quarters, because the four items carry equal weight', () => {
    // The dashboard tile has always shown 0/25/50/75/100 and the Overview meter
    // draws one segment per item, so any other step would break both.
    expect(computeProfileStrength({ ...COMPLETE, photoUrl: null }).percent).toBe(75)
    expect(computeProfileStrength({ ...COMPLETE, photoUrl: null, bio: '' }).percent).toBe(50)
    expect(
      computeProfileStrength({ photoUrl: null, bio: '', languages: [], totalSettlements: 1 }).percent,
    ).toBe(25)
  })

  it('treats a whitespace-only practice description as absent', () => {
    const result = computeProfileStrength({ ...COMPLETE, bio: '   \n  ' })
    expect(result.missing.map((m) => m.label)).toEqual(['Practice Description'])
  })

  it('matches Spanish case-insensitively and within a longer label', () => {
    expect(computeProfileStrength({ languages: ['spanish'] }).percent).toBe(25)
    expect(computeProfileStrength({ languages: ['Spanish (fluent)'] }).percent).toBe(25)
    expect(computeProfileStrength({ languages: ['English'] }).percent).toBe(0)
  })

  it('ignores blank entries in the language list', () => {
    expect(computeProfileStrength({ languages: [null, undefined, ''] }).percent).toBe(0)
  })

  it('does not credit a zero settlement history', () => {
    expect(computeProfileStrength({ totalSettlements: 0 }).percent).toBe(0)
    expect(computeProfileStrength({ totalSettlements: 1 }).percent).toBe(25)
  })

  it('reports items and missing in the same order', () => {
    const result = computeProfileStrength({ ...COMPLETE, photoUrl: null, bio: '' })
    expect(result.items.map((i) => i.label)).toEqual([
      'Headshot',
      'Practice Description',
      'Spanish Language',
      'Settlement History',
    ])
    expect(result.missing.map((m) => m.label)).toEqual(['Headshot', 'Practice Description'])
  })
})

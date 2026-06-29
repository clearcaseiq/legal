import { describe, it, expect } from 'vitest'
import { makeNarrativeMatcher } from './narrative-extraction'
import { analyzeClinicalCodes } from './clinical-codes'
import { analyzeTreatmentChronology } from './treatment-chronology'
import { calculateInjurySeverity } from './prediction'

describe('makeNarrativeMatcher (negation-aware)', () => {
  it('matches a plain positive mention', () => {
    const nm = makeNarrativeMatcher('I was rear-ended at a red light.')
    expect(nm.includes('rear-end')).toBe(true)
  })

  it('does NOT match a negated clinical mention', () => {
    const nm = makeNarrativeMatcher('CT was negative for fracture; denies loss of consciousness.')
    expect(nm.includes('fracture')).toBe(false)
    expect(nm.includes('loss of consciousness')).toBe(false)
  })

  it('still matches a positive mention elsewhere even if negated once', () => {
    const nm = makeNarrativeMatcher('No fracture of the wrist. CT confirmed a fracture of the hip.')
    expect(nm.includes('fracture')).toBe(true)
  })

  it('records source spans for explainability', () => {
    const nm = makeNarrativeMatcher('Severe whiplash after the crash.')
    expect(nm.includes('whiplash')).toBe(true)
    expect(nm.spansFor('whiplash')[0]).toContain('whiplash')
  })
})

describe('analyzeClinicalCodes', () => {
  it('is neutral when no codes present', () => {
    const r = analyzeClinicalCodes([], [])
    expect(r.hasCodes).toBe(false)
    expect(r.severityBonus).toBe(0)
    expect(r.documentedInjury).toBe(false)
  })

  it('maps a fracture ICD-10 code to a documented injury with severity bonus', () => {
    const r = analyzeClinicalCodes(['S72.001A'], [])
    expect(r.hasCodes).toBe(true)
    expect(r.documentedInjury).toBe(true)
    expect(r.severityBonus).toBeGreaterThan(0)
  })

  it('flags surgery from a spinal CPT code', () => {
    const r = analyzeClinicalCodes(['M51.26'], ['22551'])
    expect(r.hasSurgery).toBe(true)
    expect(r.signals.some((s) => s.category === 'spinal_surgery')).toBe(true)
  })

  it('flags an epidural injection CPT code', () => {
    const r = analyzeClinicalCodes([], ['62323'])
    expect(r.hasInjection).toBe(true)
  })
})

describe('analyzeTreatmentChronology', () => {
  it('is neutral (modifier 1.0) when treatment has no dates', () => {
    const r = analyzeTreatmentChronology({ treatment: [{ type: 'chiro' }, { type: 'pt' }] })
    expect(r.hasDates).toBe(false)
    expect(r.modifier).toBe(1)
  })

  it('rewards consistent care over a long period', () => {
    const r = analyzeTreatmentChronology({
      incident: { date: '2026-01-01' },
      treatment: [
        { type: 'pt', date: '2026-01-05' },
        { type: 'pt', date: '2026-02-10' },
        { type: 'pt', date: '2026-03-15' },
        { type: 'pt', date: '2026-04-20' },
      ],
    })
    expect(r.continuity).toBe('continuous')
    expect(r.modifier).toBeGreaterThan(1)
    expect(r.gapCount).toBe(0)
  })

  it('penalizes large gaps in care', () => {
    const r = analyzeTreatmentChronology({
      incident: { date: '2026-01-01' },
      treatment: [
        { type: 'pt', date: '2026-01-05' },
        { type: 'pt', date: '2026-06-20' },
        { type: 'pt', date: '2026-12-01' },
      ],
    })
    expect(r.continuity).toBe('gapped')
    expect(r.modifier).toBeLessThan(1)
    expect(r.largestGapDays).toBeGreaterThan(90)
  })

  it('penalizes a long delay before first treatment', () => {
    const r = analyzeTreatmentChronology({
      incident: { date: '2026-01-01' },
      treatment: [
        { type: 'pt', date: '2026-05-01' },
        { type: 'pt', date: '2026-05-20' },
      ],
    })
    expect(r.treatmentOnsetDays).toBeGreaterThan(90)
    expect(r.modifier).toBeLessThan(1)
  })
})

describe('calculateInjurySeverity with documented codes', () => {
  it('does not return level 0 when documented injury codes exist but no self-reported injury', () => {
    const r = calculateInjurySeverity({
      injuries: [],
      damages: {},
      clinical: { icdCodes: ['S72.001A'], cptCodes: ['22551'] },
    })
    expect(r.level).toBeGreaterThan(0)
  })

  it('does not count a negated injury keyword', () => {
    const withNeg = calculateInjurySeverity({
      injuries: [{ description: 'eval' }],
      damages: { med_charges: 100 },
      incident: { narrative: 'No fracture and no surgery were required.' },
    })
    const withPos = calculateInjurySeverity({
      injuries: [{ description: 'eval' }],
      damages: { med_charges: 100 },
      incident: { narrative: 'Surgery was required for the fracture.' },
    })
    expect(withPos.score).toBeGreaterThan(withNeg.score)
  })
})

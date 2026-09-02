import { describe, expect, it, vi } from 'vitest'

vi.mock('../env', () => ({
  ENV: { OPENAI_API_KEY: 'sk-test', OPENAI_ANALYSIS_MODEL: 'gpt-4o-mini', LLM_ALLOW_PHI: true },
}))

import { __testables } from './incident-extraction'

const { coerce, coerceIncidentDate } = __testables
const TODAY = new Date('2026-09-01T00:00:00Z')

/**
 * These values are applied straight onto the intake form, so anything the form
 * does not offer has to be dropped here rather than silently failing to select
 * a control the claimant can see.
 */
describe('coerceIncidentDate', () => {
  it('accepts a plausible past date', () => {
    expect(coerceIncidentDate('2026-03-14', TODAY)).toBe('2026-03-14')
  })

  it('rejects a future date', () => {
    // The model resolves relative phrases against a date we hand it and
    // sometimes lands a year out.
    expect(coerceIncidentDate('2026-12-25', TODAY)).toBeNull()
  })

  it('rejects a date more than twenty years old', () => {
    expect(coerceIncidentDate('1999-01-01', TODAY)).toBeNull()
  })

  it('rejects a date that parses but is not real', () => {
    expect(coerceIncidentDate('2026-02-31', TODAY)).toBeNull()
  })

  it('rejects anything that is not an ISO day', () => {
    expect(coerceIncidentDate('last Tuesday', TODAY)).toBeNull()
    expect(coerceIncidentDate('2026-03', TODAY)).toBeNull()
    expect(coerceIncidentDate(20260314, TODAY)).toBeNull()
    expect(coerceIncidentDate(null, TODAY)).toBeNull()
  })
})

describe('coerce', () => {
  it('keeps only body parts the form offers, without duplicates', () => {
    const out = coerce(
      { bodyParts: ['neck', 'neck', 'lower_back', 'elbow', 'spleen', 42] },
      TODAY,
    )
    expect(out.bodyParts).toEqual(['neck', 'lower_back'])
  })

  it('drops crash and fault when the incident is not a vehicle one', () => {
    const out = coerce(
      { isVehicle: false, crashType: 'rear_end', atFault: 'other_driver' },
      TODAY,
    )
    expect(out.crashType).toBeNull()
    expect(out.atFault).toBeNull()
  })

  it('normalizes the state and strips "County" from the county', () => {
    const out = coerce({ state: 'ca', county: 'Los Angeles County' }, TODAY)
    expect(out.state).toBe('CA')
    expect(out.county).toBe('Los Angeles')
  })

  it('rejects a state that is not a two-letter code', () => {
    expect(coerce({ state: 'California' }, TODAY).state).toBeNull()
  })

  it('falls back to unknown for tri-state signals it cannot read', () => {
    const out = coerce({ policeReport: 'maybe', witnesses: 'yes', emsResponded: 'no' }, TODAY)
    expect(out.policeReport).toBe('unknown')
    expect(out.witnesses).toBe('yes')
    expect(out.emsResponded).toBe('no')
  })

  it('rejects enum values outside the form vocabulary', () => {
    const out = coerce({ injurySeverity: 'catastrophic', firstCare: 'chiropractor' }, TODAY)
    expect(out.injurySeverity).toBeNull()
    expect(out.firstCare).toBeNull()
  })

  it('survives an entirely empty model response', () => {
    const out = coerce({}, TODAY)
    expect(out.bodyParts).toEqual([])
    expect(out.summary).toBe('')
    expect(out.confidence).toBe(0.5)
    expect(out.incidentDate).toBeNull()
  })
})

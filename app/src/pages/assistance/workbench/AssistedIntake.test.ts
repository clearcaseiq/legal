import { describe, expect, it } from 'vitest'
import { buildIntakeSteps } from './AssistedIntake'
import type { AssistanceGap, AssistanceQuestion } from '../../../lib/api'

function question(overrides: Partial<AssistanceQuestion> & { id: string }): AssistanceQuestion {
  return {
    section: 'Insurance',
    text: 'Who insures the other driver?',
    whyAsked: 'Needed to open the claim.',
    valueImpact: 'high',
    source: 'baseline',
    ...overrides,
  }
}

function gap(overrides: Partial<AssistanceGap> & { key: string }): AssistanceGap {
  return {
    label: overrides.key,
    category: 'insurance',
    severity: 4,
    valueImpact: 'high',
    rationale: '',
    ...overrides,
  }
}

describe('buildIntakeSteps', () => {
  it('attaches the fields that close the gaps a question addresses', () => {
    const steps = buildIntakeSteps(
      [question({ id: 'q1', gapKeys: ['defendant_carrier'] })],
      [gap({ key: 'defendant_carrier', factPaths: ['insurance.defendant_carrier', 'insurance.claim_number'] })],
    )
    expect(steps).toHaveLength(1)
    expect(steps[0].paths).toEqual(['insurance.defendant_carrier', 'insurance.claim_number'])
  })

  it('prefers the spoken instruction and keeps the verbatim phrasing', () => {
    const steps = buildIntakeSteps(
      [question({ id: 'q1', askInstruction: 'Ask who insures the other driver.' })],
      [],
    )
    expect(steps[0].prompt).toBe('Ask who insures the other driver.')
    expect(steps[0].verbatim).toBe('Who insures the other driver?')
  })

  it('leaves the verbatim line off when there is no separate instruction', () => {
    const steps = buildIntakeSteps([question({ id: 'q1' })], [])
    expect(steps[0].prompt).toBe('Who insures the other driver?')
    expect(steps[0].verbatim).toBeUndefined()
  })

  // The question generator prunes its own list, so a recordable gap it dropped
  // would otherwise have a field behind it the guided flow never offered.
  it('adds a step for an answerable gap no question covers', () => {
    const steps = buildIntakeSteps(
      [question({ id: 'q1', gapKeys: ['defendant_carrier'] })],
      [
        gap({ key: 'defendant_carrier', factPaths: ['insurance.defendant_carrier'] }),
        gap({ key: 'prior_injuries', label: 'Prior injuries', factPaths: ['injuryDetails.priorInjury'] }),
      ],
    )
    expect(steps).toHaveLength(2)
    expect(steps[1].id).toBe('gap:prior_injuries')
    expect(steps[1].paths).toEqual(['injuryDetails.priorInjury'])
  })

  it('does not duplicate a gap a question already covers', () => {
    const steps = buildIntakeSteps(
      [question({ id: 'q1', gapKeys: ['defendant_carrier'] })],
      [gap({ key: 'defendant_carrier', factPaths: ['insurance.defendant_carrier'] })],
    )
    expect(steps).toHaveLength(1)
  })

  // Document gaps and structured-record gaps carry no paths. Adding them would
  // put a field under a question no answer can close.
  it('ignores gaps a recorded answer cannot close', () => {
    const steps = buildIntakeSteps(
      [],
      [
        gap({ key: 'medical_records', factPaths: [] }),
        gap({ key: 'coverage_unconfirmed' }),
      ],
    )
    expect(steps).toEqual([])
  })

  it('keeps a question with no mapped field, so it still gets asked', () => {
    const steps = buildIntakeSteps([question({ id: 'q1', gapKeys: ['imaging_mri'] })], [gap({ key: 'imaging_mri' })])
    expect(steps).toHaveLength(1)
    expect(steps[0].paths).toEqual([])
  })

  it('deduplicates paths shared by two gaps on one question', () => {
    const steps = buildIntakeSteps(
      [question({ id: 'q1', gapKeys: ['defendant_carrier', 'claim_not_opened'] })],
      [
        gap({ key: 'defendant_carrier', factPaths: ['insurance.claim_number'] }),
        gap({ key: 'claim_not_opened', factPaths: ['insurance.claim_number'] }),
      ],
    )
    expect(steps[0].paths).toEqual(['insurance.claim_number'])
  })
})

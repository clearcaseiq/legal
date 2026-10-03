import { describe, expect, it } from 'vitest'
import { derivePrepItemStatus, type PrepCaseState } from './appointment-engagement'

const empty: PrepCaseState = { hasNarrative: false, evidence: [], preparationNotes: '' }

describe('derivePrepItemStatus', () => {
  it('leaves every item pending when nothing is on the case', () => {
    for (const itemType of ['incident_summary', 'medical_records', 'injury_photos', 'wage_loss', 'consult_goal']) {
      expect(derivePrepItemStatus(itemType, empty)).toBe('pending')
    }
  })

  it('completes upload items only from matching uploads', () => {
    const state = { ...empty, evidence: [{ category: 'photos' }, { category: 'bills' }] }
    expect(derivePrepItemStatus('injury_photos', state)).toBe('completed')
    expect(derivePrepItemStatus('medical_records', state)).toBe('pending')
    expect(derivePrepItemStatus('medical_records', { ...empty, evidence: [{ category: 'medical_records' }] })).toBe('completed')
  })

  it('completes wage loss from a wage upload or a pay stub file name', () => {
    expect(derivePrepItemStatus('wage_loss', { ...empty, evidence: [{ category: 'wage_verification' }] })).toBe('completed')
    expect(derivePrepItemStatus('wage_loss', { ...empty, evidence: [{ category: 'other', originalName: 'March paystub.pdf' }] })).toBe('completed')
  })

  it('completes the questions item once notes are saved, and the summary once a narrative exists', () => {
    expect(derivePrepItemStatus('consult_goal', { ...empty, preparationNotes: '   ' })).toBe('pending')
    expect(derivePrepItemStatus('consult_goal', { ...empty, preparationNotes: 'How long will this take?' })).toBe('completed')
    expect(derivePrepItemStatus('incident_summary', { ...empty, hasNarrative: true })).toBe('completed')
  })
})

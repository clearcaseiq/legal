import { describe, expect, it } from 'vitest'
import {
  PROPOSABLE_FACT_PATHS,
  applyFactPath,
  isProposableFactPath,
  parseFactValue,
  readFactPath,
} from './case-fact-paths'

describe('the proposable path allowlist', () => {
  it('refuses paths outside it', () => {
    // The reason it is an allowlist: without one, "propose a change" means
    // "write anywhere in the case document".
    expect(isProposableFactPath('consents.hipaa')).toBe(false)
    expect(isProposableFactPath('plaintiffMedicalReview.status')).toBe(false)
    expect(isProposableFactPath('damages.med_charges_source')).toBe(false)
    expect(isProposableFactPath('__proto__')).toBe(false)
    expect(isProposableFactPath('damages.med_charges')).toBe(true)
  })

  it('excludes consent, derived and claimant-authored subtrees', () => {
    for (const path of Object.keys(PROPOSABLE_FACT_PATHS)) {
      expect(path.startsWith('consents')).toBe(false)
      expect(path.startsWith('plaintiffMedicalReview')).toBe(false)
      expect(path.startsWith('damagesLedger')).toBe(false)
    }
  })
})

describe('readFactPath', () => {
  const facts = {
    damages: { med_charges: 1200, bills_complete: false },
    incident: { narrative: 'rear-ended' },
  }

  it('renders scalars as strings so both values can be shown side by side', () => {
    expect(readFactPath(facts, 'damages.med_charges')).toBe('1200')
    expect(readFactPath(facts, 'incident.narrative')).toBe('rear-ended')
  })

  it('keeps false distinct from unset', () => {
    // "No, my bills are not complete" is an answer; nothing on file is not.
    expect(readFactPath(facts, 'damages.bills_complete')).toBe('false')
    expect(readFactPath(facts, 'damages.wage_loss')).toBeNull()
  })

  it('returns null rather than throwing when the branch is missing', () => {
    expect(readFactPath({}, 'caseAcceleration.wageLoss.employerName')).toBeNull()
    expect(readFactPath({ caseAcceleration: null }, 'caseAcceleration.wageLoss.employerName')).toBeNull()
  })
})

describe('parseFactValue', () => {
  it('puts a number back as a number', () => {
    // Proposals are stored as text. Writing "1200" where every reader does
    // arithmetic on damages would be a quiet corruption.
    expect(parseFactValue('damages.med_charges', '1200')).toEqual({ ok: true, value: 1200 })
    expect(parseFactValue('damages.med_charges', '$1,200.50')).toEqual({ ok: true, value: 1200.5 })
  })

  it('rejects a number it cannot trust', () => {
    expect(parseFactValue('damages.med_charges', 'about 3k')).toEqual({ ok: false, reason: 'not_a_number' })
    expect(parseFactValue('damages.med_charges', '-5')).toEqual({ ok: false, reason: 'negative' })
  })

  it('accepts the words people actually say for booleans', () => {
    expect(parseFactValue('damages.bills_complete', 'yes')).toEqual({ ok: true, value: true })
    expect(parseFactValue('damages.bills_complete', 'False')).toEqual({ ok: true, value: false })
    expect(parseFactValue('damages.bills_complete', 'maybe')).toEqual({ ok: false, reason: 'not_a_boolean' })
  })

  it('treats an empty value as clearing the field', () => {
    // "No, I never missed work" has to be expressible.
    expect(parseFactValue('damages.wage_loss', '')).toEqual({ ok: true, value: null })
    expect(parseFactValue('damages.wage_loss', null)).toEqual({ ok: true, value: null })
  })

  it('enforces the intake length limits', () => {
    expect(parseFactValue('incident.narrative', 'x'.repeat(5001))).toEqual({ ok: false, reason: 'too_long' })
    expect(parseFactValue('incident.narrative', 'x'.repeat(5000)).ok).toBe(true)
  })

  it('refuses a path outside the allowlist', () => {
    expect(parseFactValue('consents.hipaa', 'true')).toEqual({ ok: false, reason: 'unsupported_field' })
  })
})

describe('applyFactPath', () => {
  it('sets a nested value without disturbing its siblings', () => {
    const before = { damages: { med_charges: 100, wage_loss: 50 }, injuries: ['neck'] }
    const after = applyFactPath(before, 'damages.med_charges', 250)

    expect(after).toEqual({ damages: { med_charges: 250, wage_loss: 50 }, injuries: ['neck'] })
    // The mutator must be pure, or replaying it after a lost race would compound.
    expect(before.damages.med_charges).toBe(100)
  })

  it('creates the branch when the domain is absent', () => {
    expect(applyFactPath({}, 'caseAcceleration.wageLoss.employerName', 'Acme')).toEqual({
      caseAcceleration: { wageLoss: { employerName: 'Acme' } },
    })
  })

  it('writes the legacy duplicate keys too', () => {
    // question-facts-sync writes insurance.claim_number and insurance.claimNumber
    // together because different readers look at different ones. Writing only the
    // canonical key would show the old value wherever the duplicate is read.
    const after = applyFactPath({ insurance: { claim_number: 'OLD', claimNumber: 'OLD' } }, 'insurance.claim_number', 'NEW-1')
    expect(after.insurance).toEqual({ claim_number: 'NEW-1', claimNumber: 'NEW-1' })

    const carrier = applyFactPath({}, 'insurance.defendant_carrier', 'Statewide')
    expect(carrier.insurance).toEqual({ defendant_carrier: 'Statewide', carrier: 'Statewide' })
  })

  it('removes the key when the value is cleared, mirrors included', () => {
    // Deleted rather than set to null, so a cleared field reads as unanswered to
    // every `facts?.x?.y` reader and to the provenance diff.
    const after = applyFactPath({ insurance: { claim_number: 'X', claimNumber: 'X', carrier: 'Y' } }, 'insurance.claim_number', null)
    expect(after.insurance).toEqual({ carrier: 'Y' })
  })

  it('ignores a path outside the allowlist', () => {
    const before = { consents: { hipaa: false } }
    expect(applyFactPath(before, 'consents.hipaa', true)).toBe(before)
  })
})

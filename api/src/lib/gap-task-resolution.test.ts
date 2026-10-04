import { describe, expect, it } from 'vitest'
import { gapKeysClosedByTitles } from './gap-task-resolution'
import { applyCompletedWork, type CaseGap } from './case-intelligence'

function gap(key: string, resolved = false): CaseGap {
  return {
    key,
    label: key,
    category: 'insurance',
    severity: 4,
    valueImpact: 'high',
    rationale: 'open',
    actions: ['assign_paralegal'],
    resolved,
  }
}

describe('gapKeysClosedByTitles', () => {
  it('maps the default opening and workflow task titles to their gaps', () => {
    const closed = gapKeysClosedByTitles([
      "Confirm client's own applicable coverage (UM/UIM, MedPay, PIP)",
      'Identify defendant and insurance carrier',
      'Itemize medical specials',
    ])
    expect(closed.get('first_party_coverage')).toBe("Confirm client's own applicable coverage (UM/UIM, MedPay, PIP)")
    expect(closed.get('defendant_identity')).toBe('Identify defendant and insurance carrier')
    expect(closed.get('defendant_carrier')).toBe('Identify defendant and insurance carrier')
    expect(closed.get('medical_specials_missing')).toBe('Itemize medical specials')
    expect(closed.has('coverage_unconfirmed')).toBe(false)
  })

  it('treats first-party coverage wording as first-party, not defendant coverage', () => {
    const closed = gapKeysClosedByTitles(['Verify first-party coverage details'])
    expect(closed.has('first_party_coverage')).toBe(true)
    expect(closed.has('coverage_unconfirmed')).toBe(false)
  })

  it('does not close a gap for a task that only sends a request', () => {
    const closed = gapKeysClosedByTitles(['Send policy limits request', 'Request witness statements'])
    expect(closed.size).toBe(0)
  })
})

describe('applyCompletedWork', () => {
  it('crosses off the matched gap and moves it below open items', () => {
    const out = applyCompletedWork(
      [gap('first_party_coverage'), gap('defendant_policy_limits')],
      new Map([['first_party_coverage', 'Confirm coverage']]),
    )
    expect(out.map((g) => g.key)).toEqual(['defendant_policy_limits', 'first_party_coverage'])
    expect(out[1]).toMatchObject({ resolved: true, actions: [], rationale: 'Completed: Confirm coverage.' })
  })
})

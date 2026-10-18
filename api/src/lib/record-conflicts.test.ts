import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
vi.mock('./logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { conflictsFor, type ConflictState } from './record-conflicts'

const state: ConflictState = {
  incidentDate: '2026-03-12',
  policeReportNumber: '2026-004512',
  citationIssuedTo: 'defendant',
  defendantNames: ['John Smith'],
  policies: [
    { id: 'p1', carrierName: 'State Farm', policyNumber: '881-2290-F14', claimNumber: '05-7731-K22', policyLimit: 25000, insuredParty: 'defendant' },
  ],
}

describe('conflictsFor', () => {
  it('reports nothing when the police report agrees with the case', () => {
    expect(
      conflictsFor(
        { kind: 'incident_report', data: { date: '2026-03-12', reportNumber: '2026 004512', citationIssuedTo: 'defendant', defendantName: 'SMITH, JOHN' } },
        state,
      ),
    ).toEqual([])
  })

  it('flags a different incident date, report number, citation and other party', () => {
    const out = conflictsFor(
      { kind: 'incident_report', data: { date: '2026-03-13', reportNumber: '2026-009999', citationIssuedTo: 'plaintiff', defendantName: 'Alan Brown' } },
      state,
    )
    expect(out).toHaveLength(4)
    expect(out[0]).toContain('Mar 13, 2026')
    expect(out[0]).toContain('Mar 12, 2026')
    expect(out[2]).toContain('our client was cited')
    expect(out[3]).toContain('Alan Brown')
  })

  it('flags a policy whose numbers or limit differ from the same carrier on the Insurance tab', () => {
    const out = conflictsFor(
      { kind: 'insurance_policy', data: { carrierName: 'State Farm Mutual', policyNumber: '999-0000', claimNumber: '05-7731-K22', policyLimit: 50000 } },
      state,
    )
    expect(out).toEqual([
      expect.stringContaining('Policy number 999-0000'),
      expect.stringContaining('Limit of $50,000'),
    ])
  })

  it('flags a defendant policy that insures someone who is not a defendant', () => {
    const out = conflictsFor({ kind: 'insurance_policy', data: { carrierName: 'Geico', insuredParty: 'defendant', insuredName: 'Alan Brown' } }, state)
    expect(out).toEqual([expect.stringContaining('Alan Brown, who is not a defendant')])
  })

  it('flags treatment dated before the incident', () => {
    expect(conflictsFor({ kind: 'treatment_visit', data: { date: '2026-02-01' } }, state)[0]).toContain('before the incident')
    expect(conflictsFor({ kind: 'medical_charge', data: { date: '2026-03-12' } }, state)).toEqual([])
  })

  it('has nothing to compare when the case has no facts yet', () => {
    const empty: ConflictState = { incidentDate: null, policeReportNumber: null, citationIssuedTo: null, defendantNames: [], policies: [] }
    expect(conflictsFor({ kind: 'incident_report', data: { date: '2026-03-12', defendantName: 'John Smith' } }, empty)).toEqual([])
  })
})

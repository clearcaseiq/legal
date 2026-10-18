import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
vi.mock('./liability-record', () => ({ upsertLiabilityRecord: vi.fn() }))

import { rollupFromParties } from './liability-parties'

const def = (name: string, faultPct: number | null, insurerName: string | null = null, linkedCarrierName: string | null = null) => ({
  name,
  faultPct,
  insurerName,
  linkedCarrierName,
})

describe('rollupFromParties', () => {
  it('joins defendants, prefers the linked carrier, and totals allocated fault', () => {
    const patch = rollupFromParties(
      [def('Sam Doe', 60, 'Typed Ins'), def('Acme Trucking', 30, 'Typed Ins', 'Progressive'), def('Owner', null, 'Typed Ins')],
      [],
      { defendants: true },
    )
    expect(patch).toEqual({
      defendantName: 'Sam Doe, Acme Trucking, Owner',
      defendantInsurer: 'Typed Ins, Progressive',
      defendantFaultPct: 90,
    })
  })

  it('leaves the fault split alone when no defendant has a share', () => {
    const patch = rollupFromParties([def('Sam Doe', null)], [], { defendants: true })
    expect(patch).not.toHaveProperty('defendantFaultPct')
  })

  it('clears the defendant fields when the last defendant is removed', () => {
    expect(rollupFromParties([], [], { defendants: true })).toEqual({ defendantName: null, defendantInsurer: null })
  })

  it('rolls up only the evidence types a change touched', () => {
    const evidence = [
      { type: 'police_report', status: 'requested', referenceNumber: 'A-1' },
      { type: 'police_report', status: 'received', referenceNumber: 'B-2' },
      { type: 'photos', status: 'needed', referenceNumber: null },
      { type: 'witness_statement', status: 'needed', referenceNumber: null },
      { type: 'witness_statement', status: 'received', referenceNumber: null },
    ]
    expect(rollupFromParties([], evidence, { evidenceTypes: ['police_report'] })).toEqual({
      policeReportStatus: 'received',
      policeReportNumber: 'B-2',
    })
    expect(rollupFromParties([], evidence, { evidenceTypes: ['photos', 'witness_statement'] })).toEqual({
      hasPhotos: false,
      witnessCount: 2,
      hasWitnesses: true,
    })
    expect(rollupFromParties([], [], { evidenceTypes: ['police_report', 'video'] })).toEqual({
      policeReportStatus: 'none',
      policeReportNumber: null,
      hasVideo: false,
    })
  })
})

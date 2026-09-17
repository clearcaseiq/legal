import { describe, it, expect } from 'vitest'
import {
  buildLiabilityChecklist,
  hasUploadableGap,
  usesPoliceReportLabel,
  type LiabilityChecklistLabels,
} from './liabilityChecklist'

const labels: LiabilityChecklistLabels = {
  policeReport: 'Police report',
  incidentReport: 'Incident or police report',
  photosOfDamage: 'Photos of damage',
  photosOfScene: 'Photos of the scene or injury',
  witnessStatements: 'Witness statements',
  faultAppearsClear: 'Fault appears clear',
}

function build(claimType: string, over: Partial<Record<string, boolean>> = {}) {
  return buildLiabilityChecklist({
    claimType,
    hasReport: false,
    hasPhotos: false,
    hasWitnesses: false,
    faultClear: false,
    labels,
    ...over,
  } as any)
}

describe('usesPoliceReportLabel', () => {
  it('is true where police actually attend', () => {
    expect(usesPoliceReportLabel('auto')).toBe(true)
    expect(usesPoliceReportLabel('intentional_tort')).toBe(true)
  })

  it('matches every slug that reads as the same claim, not just the canonical one', () => {
    // 'assault' and 'intentional_tort' share a label, and only one of them is
    // canonical; both must still get the police-report wording.
    for (const slug of ['vehicle', 'motor_vehicle', 'car_accident', 'motorcycle', 'assault']) {
      expect(usesPoliceReportLabel(slug)).toBe(true)
    }
  })

  it('is false where an incident report is the document that exists', () => {
    // The reported case: a nursing-home claimant told to produce a police report.
    expect(usesPoliceReportLabel('nursing_home_abuse')).toBe(false)
    expect(usesPoliceReportLabel('slip_and_fall')).toBe(false)
    expect(usesPoliceReportLabel('workplace_injury')).toBe(false)
    expect(usesPoliceReportLabel('medmal')).toBe(false)
  })

  it('does not assume a police report when the claim type is unknown', () => {
    expect(usesPoliceReportLabel(null)).toBe(false)
    expect(usesPoliceReportLabel('')).toBe(false)
  })
})

describe('buildLiabilityChecklist', () => {
  it('asks a nursing-home claimant for the report their facility holds', () => {
    const report = build('nursing_home_abuse').find((r) => r.key === 'report')

    expect(report!.label).toBe('Incident or police report')
  })

  it('still says police report on a collision', () => {
    const report = build('auto').find((r) => r.key === 'report')

    expect(report!.label).toBe('Police report')
  })

  it('asks for scene and injury photos where damage photos make no sense', () => {
    expect(build('nursing_home_abuse').find((r) => r.key === 'photos')!.label).toBe(
      'Photos of the scene or injury',
    )
    expect(build('auto').find((r) => r.key === 'photos')!.label).toBe('Photos of damage')
  })

  it('marks fault as something the claimant cannot upload', () => {
    const rows = build('auto')

    expect(rows.find((r) => r.key === 'faultClear')!.uploadable).toBe(false)
    for (const key of ['report', 'photos', 'witnesses']) {
      expect(rows.find((r) => r.key === key)!.uploadable).toBe(true)
    }
  })

  it('keeps every row, since all three documents feed the liability score', () => {
    expect(build('nursing_home_abuse').map((r) => r.key)).toEqual([
      'report',
      'photos',
      'witnesses',
      'faultClear',
    ])
  })
})

describe('hasUploadableGap', () => {
  it('is true while a document is still missing', () => {
    expect(hasUploadableGap(build('auto'))).toBe(true)
  })

  it('is false once every document is in, even with fault still disputed', () => {
    // The stuck-CTA bug: fault can never be "added", so including it here left
    // the upload prompt on screen forever.
    const rows = build('auto', { hasReport: true, hasPhotos: true, hasWitnesses: true })

    expect(rows.find((r) => r.key === 'faultClear')!.ok).toBe(false)
    expect(hasUploadableGap(rows)).toBe(false)
  })
})

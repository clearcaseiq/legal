import { describe, expect, it } from 'vitest'
import { caseTypePreset, isValidIncidentSubtype } from './caseTaxonomy'

describe('caseTypePreset', () => {
  it.each([
    ['car', 'vehicle', 'car_accident'],
    ['pedestrian', 'vehicle', 'pedestrian_accident'],
    ['slip_fall', 'slip_fall', ''],
    ['dog_bite', 'dog_bite', ''],
    ['medmal', 'medmal', ''],
  ])('maps %s to the intake answer', (slug, injuryType, incidentSubtype) => {
    expect(caseTypePreset(slug)).toEqual({ injuryType, incidentSubtype })
  })

  it('only presets subtypes the intake accepts', () => {
    for (const slug of ['car', 'pedestrian']) {
      const preset = caseTypePreset(slug)!
      expect(isValidIncidentSubtype(preset.injuryType, preset.incidentSubtype)).toBe(true)
    }
  })

  it('ignores unknown or missing slugs', () => {
    expect(caseTypePreset('boat')).toBeNull()
    expect(caseTypePreset(null)).toBeNull()
  })
})

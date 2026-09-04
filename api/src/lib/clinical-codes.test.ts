import { describe, expect, it } from 'vitest'
import { analyzeClinicalCodes } from './clinical-codes'

const analyze = (icd: string[] = [], cpt: string[] = []) => analyzeClinicalCodes(icd, cpt)
const signal = (icd: string) => analyze([icd]).signals[0]

describe('brain injury coding', () => {
  it('separates a concussion from an intracranial haemorrhage', () => {
    // Both are S06. Reading only the three-character root scored them
    // identically, which is the difference between a headache claim and a
    // life-altering one.
    const concussion = signal('S06.0X0A')
    const haemorrhage = signal('S06.5X0A')

    expect(concussion.injuryType).toBe('TBI_MILD')
    expect(haemorrhage.injuryType).toBe('TBI_SEVERE')
    expect(haemorrhage.severityWeight).toBeGreaterThan(concussion.severityWeight)
  })

  it('treats structural brain injury as worse than concussion', () => {
    expect(signal('S06.2X0A').injuryType).toBe('TBI_MODERATE')
  })

  it('upgrades a concussion carrying prolonged loss of consciousness', () => {
    // The 6th character encodes LOC duration: 0 is none, 3 is 1-6 hours.
    expect(signal('S06.0X0A').injuryType).toBe('TBI_MILD')
    expect(signal('S06.0X3A').injuryType).toBe('TBI_MODERATE')
    expect(signal('S06.0X3A').severityWeight).toBeGreaterThan(signal('S06.0X0A').severityWeight)
  })
})

describe('spinal coding', () => {
  it('separates a cord injury from a nerve root injury', () => {
    // S14.0 is the cervical cord; S14.3 is the brachial plexus. Both used to
    // score as a cord injury, which is catastrophic and rare.
    const cord = signal('S14.0')
    const nerveRoot = signal('S14.3')

    expect(cord.injuryType).toBe('SPINAL_CORD')
    expect(nerveRoot.injuryType).toBe('RADICULOPATHY')
    expect(cord.severityWeight).toBeGreaterThan(nerveRoot.severityWeight)
  })

  it('treats cauda equina as cord-level', () => {
    expect(signal('S34.3').injuryType).toBe('SPINAL_CORD')
  })
})

describe('disc coding', () => {
  it('ranks myelopathy above radiculopathy above herniation above degeneration', () => {
    const weights = ['M51.0', 'M51.1', 'M51.2', 'M51.3'].map((c) => signal(c).severityWeight)
    expect(weights[0]).toBeGreaterThan(weights[1])
    expect(weights[1]).toBeGreaterThan(weights[2])
    expect(weights[2]).toBeGreaterThan(weights[3])
  })

  it('types a documented radiculopathy as radiculopathy, not a bulge', () => {
    expect(signal('M51.1').injuryType).toBe('RADICULOPATHY')
    expect(signal('M51.2').injuryType).toBe('DISC_HERNIATION')
    // Degeneration is the carrier's pre-existing-condition argument.
    expect(signal('M51.3').injuryType).toBe('DISC_BULGE')
  })

  it('applies the same ranking to cervical discs', () => {
    expect(signal('M50.1').injuryType).toBe('RADICULOPATHY')
  })
})

describe('fracture coding', () => {
  it('ranks a femur fracture above a finger fracture', () => {
    expect(signal('S72.001A').severityWeight).toBeGreaterThan(signal('S62.600A').severityWeight)
  })

  it('separates thoracic vertebrae from ribs, which share the S22 root', () => {
    expect(signal('S22.000A').severityWeight).toBeGreaterThan(signal('S22.3').severityWeight)
  })

  it('scores an open fracture above a closed one', () => {
    // The 7th character carries it: A is the initial encounter for a closed
    // fracture, B for an open one.
    expect(signal('S72.001B').severityWeight).toBeGreaterThan(signal('S72.001A').severityWeight)
    expect(signal('S72.001B').label).toContain('open')
  })

  it('still types every fracture as a broken bone', () => {
    expect(signal('S62.600A').injuryType).toBe('BROKEN_BONE')
  })
})

describe('analysis rollup', () => {
  it('reports the most severe injury the codes prove', () => {
    const result = analyze(['S33.5', 'M51.1', 'S06.5X0A'])
    expect(result.primaryInjuryType).toBe('TBI_SEVERE')
  })

  it('stays neutral with no codes', () => {
    const result = analyze([], [])
    expect(result.hasCodes).toBe(false)
    expect(result.primaryInjuryType).toBeNull()
    expect(result.severityBonus).toBe(0)
  })

  it('flags imaging, injections and surgery from procedure codes', () => {
    const result = analyze([], ['72148', '62323', '22558'])
    expect(result.hasAdvancedImaging).toBe(true)
    expect(result.hasInjection).toBe(true)
    expect(result.hasSurgery).toBe(true)
  })
})

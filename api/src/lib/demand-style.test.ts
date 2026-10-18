import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))

import {
  DEFAULT_STYLE_CONFIG,
  DEMAND_SECTION_KEYS,
  fillMergeTokens,
  normalizeStyleConfig,
  romanNumeral,
  toneInstruction,
} from './demand-style'

describe('normalizeStyleConfig', () => {
  it('turns nothing into the platform default', () => {
    expect(normalizeStyleConfig(undefined)).toEqual(DEFAULT_STYLE_CONFIG)
    expect(normalizeStyleConfig('not json')).toEqual(DEFAULT_STYLE_CONFIG)
  })

  it('keeps every section once, forces required ones in, and pins the enclosure index last', () => {
    const config = normalizeStyleConfig({
      sections: [
        { key: 'enclosures', heading: 'Exhibits', include: true },
        { key: 'settlement_demand', heading: 'Our Demand', include: false },
        { key: 'executive_summary', include: false },
        { key: 'settlement_demand', heading: 'Duplicate' },
        { key: 'bogus' },
      ],
    })
    expect(config.sections.map((s) => s.key)).toHaveLength(DEMAND_SECTION_KEYS.length)
    expect(config.sections[0]).toEqual({ key: 'settlement_demand', heading: 'Our Demand', include: true })
    expect(config.sections[1]).toEqual({ key: 'executive_summary', heading: 'Executive Summary', include: false })
    expect(config.sections.at(-1)).toEqual({ key: 'enclosures', heading: 'Enclosure Index', include: true })
  })

  it('keeps numbers and choices in range', () => {
    const config = normalizeStyleConfig({ responseDays: 3, tone: 'shouty', letterhead: 'firm', confidentiality: false })
    expect(config.responseDays).toBe(10)
    expect(config.tone).toBe('firm')
    expect(config.letterhead).toBe('firm')
    expect(config.confidentiality).toBe(false)
    expect(normalizeStyleConfig({ responseDays: 400 }).responseDays).toBe(90)
  })
})

describe('romanNumeral', () => {
  it('numbers up to the full package', () => {
    expect([1, 4, 9, 14, 17].map(romanNumeral)).toEqual(['I', 'IV', 'IX', 'XIV', 'XVII'])
  })
})

describe('fillMergeTokens', () => {
  it('fills known fields and leaves unknown or empty ones visible', () => {
    expect(fillMergeTokens('{{client_name}} / {{ carrier }} / {{claim_number}} / {{nope}}', { client_name: 'Maria', carrier: 'Acme' })).toBe(
      'Maria / Acme / {{claim_number}} / {{nope}}',
    )
  })
})

describe('toneInstruction', () => {
  it('differs by tone', () => {
    expect(toneInstruction('measured')).toMatch(/measured/)
    expect(toneInstruction('assertive')).toMatch(/assertively/)
    expect(toneInstruction('firm')).toMatch(/confidence/)
  })
})

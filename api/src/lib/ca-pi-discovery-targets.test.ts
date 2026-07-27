import { describe, expect, it } from 'vitest'
import {
  buildDiscoveryQueries,
  CA_DISCOVERY_CITIES,
  CA_DISCOVERY_KEYWORDS,
  EXCLUDED_DISCOVERY_DOMAINS,
  isExcludedDiscoveryDomain,
} from './ca-pi-discovery-targets'

describe('discovery target lists', () => {
  it('covers the major California markets first', () => {
    // Ordering is load-bearing: slicing the list must give the biggest markets,
    // because a budget-capped run only gets through a prefix of it.
    expect(CA_DISCOVERY_CITIES.slice(0, 5)).toEqual([
      'Los Angeles',
      'San Diego',
      'San Jose',
      'San Francisco',
      'Sacramento',
    ])
    expect(CA_DISCOVERY_CITIES.length).toBeGreaterThan(150)
  })

  it('has no duplicate cities', () => {
    expect(new Set(CA_DISCOVERY_CITIES).size).toBe(CA_DISCOVERY_CITIES.length)
  })

  it('leads with the broad keywords that most firms optimize for', () => {
    expect(CA_DISCOVERY_KEYWORDS[0]).toBe('personal injury attorney')
    expect(new Set(CA_DISCOVERY_KEYWORDS).size).toBe(CA_DISCOVERY_KEYWORDS.length)
  })

  it('lists excluded domains bare, without protocol or www', () => {
    for (const domain of EXCLUDED_DISCOVERY_DOMAINS) {
      expect(domain, domain).not.toMatch(/^https?:/)
      expect(domain, domain).not.toMatch(/^www\./)
      expect(domain, domain).toContain('.')
    }
  })
})

describe('isExcludedDiscoveryDomain', () => {
  it('excludes the major legal directories and lead marketplaces', () => {
    // These outrank real firms on exactly the queries we run.
    for (const domain of ['avvo.com', 'findlaw.com', 'justia.com', 'yelp.com', 'legalmatch.com']) {
      expect(isExcludedDiscoveryDomain(domain), domain).toBe(true)
    }
  })

  it('excludes subdomains of an excluded domain', () => {
    expect(isExcludedDiscoveryDomain('losangeles.avvo.com')).toBe(true)
    expect(isExcludedDiscoveryDomain('www.avvo.com')).toBe(true)
  })

  it('does not exclude by substring', () => {
    // A real firm could plausibly own any of these; matching loosely on
    // "lawyers.com" or "law.com" would silently discard genuine firms.
    expect(isExcludedDiscoveryDomain('mylawyers.com')).toBe(false)
    expect(isExcludedDiscoveryDomain('notyelp.com')).toBe(false)
    expect(isExcludedDiscoveryDomain('smithinjurylaw.com')).toBe(false)
  })

  it('is case and whitespace insensitive', () => {
    expect(isExcludedDiscoveryDomain('  AVVO.COM ')).toBe(true)
  })

  it('handles empty input', () => {
    expect(isExcludedDiscoveryDomain(null)).toBe(false)
    expect(isExcludedDiscoveryDomain('')).toBe(false)
  })
})

describe('buildDiscoveryQueries', () => {
  it('produces one query per city and keyword pair', () => {
    const queries = buildDiscoveryQueries({
      cities: ['Fresno', 'Modesto'],
      keywords: ['personal injury attorney'],
    })
    expect(queries).toEqual([
      'personal injury attorney in Fresno, CA',
      'personal injury attorney in Modesto, CA',
    ])
  })

  it('sweeps the broadest keyword across every city before narrowing', () => {
    // A run cut short by its budget should have covered one broad phrase
    // statewide rather than every phrase in two cities.
    const queries = buildDiscoveryQueries({
      cities: ['Fresno', 'Modesto'],
      keywords: ['personal injury attorney', 'dog bite lawyer'],
    })
    expect(queries[0]).toContain('personal injury attorney in Fresno')
    expect(queries[1]).toContain('personal injury attorney in Modesto')
    expect(queries[2]).toContain('dog bite lawyer in Fresno')
  })

  it('multiplies out to the expected request count', () => {
    const queries = buildDiscoveryQueries({
      cities: CA_DISCOVERY_CITIES.slice(0, 20),
      keywords: CA_DISCOVERY_KEYWORDS.slice(0, 3),
    })
    expect(queries).toHaveLength(60)
  })

  it('defaults to the full California matrix', () => {
    const queries = buildDiscoveryQueries()
    expect(queries).toHaveLength(CA_DISCOVERY_CITIES.length * CA_DISCOVERY_KEYWORDS.length)
  })
})

import { describe, expect, it } from 'vitest'
import {
  ORGANIZATION_EMAIL,
  ORGANIZATION_LEGAL_NAME,
  ORGANIZATION_NAME,
  ORGANIZATION_POSTAL_CODE,
  ORGANIZATION_STREET_ADDRESS,
  ORGANIZATION_TELEPHONE,
  organizationSchema,
} from './organizationSchema'

/** Every string value anywhere in the emitted node, including nested objects. */
function stringValues(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(stringValues)
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringValues)
  return []
}

describe('organization schema', () => {
  it('states the identity every page agrees on', () => {
    const schema = organizationSchema()

    expect(schema.name).toBe(ORGANIZATION_NAME)
    expect(schema.legalName).toBe(ORGANIZATION_LEGAL_NAME)
    expect(schema.email).toBe(ORGANIZATION_EMAIL)
    expect(schema.url).toBe('https://www.clearcaseiq.com')
  })

  it('never emits an empty string, which is worse than an absent field', () => {
    // A blank `telephone` or `streetAddress` is a claim that the organisation
    // has one and it is nothing. Omission is valid schema.org; an empty value
    // is a contradiction of whatever the real record says.
    for (const schema of [organizationSchema(), organizationSchema({ nested: true })]) {
      expect(stringValues(schema).filter((value) => value.trim() === '')).toEqual([])
    }
  })

  it('omits the phone and street address, which is the deliberate answer', () => {
    const schema = organizationSchema()

    // Not a gap: the company is remote with no staffed office and no public
    // phone line, so there is nothing truthful to put here. See the constants.
    if (!ORGANIZATION_TELEPHONE) expect(schema).not.toHaveProperty('telephone')
    if (!ORGANIZATION_STREET_ADDRESS) expect(schema.address).not.toHaveProperty('streetAddress')
    if (!ORGANIZATION_POSTAL_CODE) expect(schema.address).not.toHaveProperty('postalCode')
  })

  it('publishes them once they are set', () => {
    // Guards the omission logic itself, so filling the constants in is enough
    // and nobody has to remember a second step.
    if (ORGANIZATION_TELEPHONE) expect(organizationSchema().telephone).toBe(ORGANIZATION_TELEPHONE)
    if (ORGANIZATION_STREET_ADDRESS) {
      expect(organizationSchema().address).toHaveProperty('streetAddress', ORGANIZATION_STREET_ADDRESS)
    }
  })

  it('always carries the area it actually serves', () => {
    const schema = organizationSchema()

    expect(schema.address).toMatchObject({
      '@type': 'PostalAddress',
      addressLocality: 'Los Angeles',
      addressRegion: 'CA',
      addressCountry: 'US',
    })
  })

  it('keeps a nested reference lighter than the primary node', () => {
    const nested = organizationSchema({ nested: true })

    // On /about the Organization is a property of AboutPage, not the thing the
    // page describes, so the logo and description belong to the top-level node.
    expect(nested).not.toHaveProperty('logo')
    expect(nested).not.toHaveProperty('description')
    expect(organizationSchema()).toHaveProperty('logo')
  })

  it('serializes to valid JSON-LD', () => {
    const json = JSON.stringify({ '@context': 'https://schema.org', ...organizationSchema() })

    expect(JSON.parse(json)['@type']).toBe('Organization')
    expect(json).not.toContain('undefined')
  })
})

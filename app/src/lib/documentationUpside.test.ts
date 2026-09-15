import { describe, it, expect } from 'vitest'
import {
  parseDocumentationUpside,
  documentationWeight,
  impactLabel,
  type DocumentationUpside,
} from './documentationUpside'

/** A med-mal case with nothing uploaded: no police-report gap, because the engine does not score one. */
const upside: DocumentationUpside = {
  currentLow: 19000,
  ceiling: 45000,
  fullyDocumentedLow: 28000,
  items: [
    { label: 'Medical records', points: 25, projectedLow: 25000 },
    { label: 'Daily impact statement', points: 15, projectedLow: 21000 },
    { label: 'Photos', points: 10, projectedLow: 21000 },
    { label: 'Wage proof', points: 10, projectedLow: 21000 },
  ],
}

describe('documentationWeight', () => {
  it("returns the engine's weight for a gap the case has", () => {
    expect(documentationWeight(upside, 'medicalRecords')).toBe(25)
    expect(documentationWeight(upside, 'wageProof')).toBe(10)
  })

  it('returns null for a document the engine does not score for this claim', () => {
    expect(documentationWeight(upside, 'policeReport')).toBeNull()
  })

  it('returns null for a document already on file, which carries no gap', () => {
    expect(documentationWeight(upside, 'medicalBills')).toBeNull()
  })

  it('returns null when there is no prediction behind the case', () => {
    expect(documentationWeight(null, 'medicalRecords')).toBeNull()
  })
})

describe('impactLabel', () => {
  it("ranks the engine's weights rather than a hand-written order", () => {
    expect(impactLabel(25)).toBe('High') // medical records
    expect(impactLabel(20)).toBe('High') // bills, incident report
    expect(impactLabel(15)).toBe('Medium') // daily impact statement
    expect(impactLabel(10)).toBe('Low') // photos, wage proof
  })

  it('agrees with the weights the engine actually publishes', () => {
    const records = documentationWeight(upside, 'medicalRecords')!
    const wages = documentationWeight(upside, 'wageProof')!

    expect(impactLabel(records)).toBe('High')
    expect(impactLabel(wages)).toBe('Low')
  })
})

describe('parseDocumentationUpside', () => {
  it('accepts a payload from the engine', () => {
    expect(parseDocumentationUpside(upside)).toEqual(upside)
  })

  it('rejects anything that is not one, rather than half-reading it', () => {
    // Predictions stored before the engine published this field reach the page
    // as undefined, and must degrade to "say nothing" rather than throw.
    expect(parseDocumentationUpside(undefined)).toBeNull()
    expect(parseDocumentationUpside(null)).toBeNull()
    expect(parseDocumentationUpside({})).toBeNull()
    expect(parseDocumentationUpside({ ceiling: 1, currentLow: 1 })).toBeNull()
    expect(parseDocumentationUpside('nope')).toBeNull()
  })
})

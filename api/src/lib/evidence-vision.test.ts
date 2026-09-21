import { describe, it, expect } from 'vitest'
import { assessRelevance, isDocumentCategory, type DetectedLabel } from './evidence-vision'

/**
 * The upload step offers nine tiles, and the relevance checker keeps its own idea of
 * which categories exist. When the two drifted apart the failure was silent and
 * backwards: `dec_page` was absent from the checker's maps, so `isDocumentCategory`
 * said false, so a declarations page -- which is a PDF essentially every time -- was
 * judged against a photo slot and told "This is a PDF document. We expected evidence
 * relevant to your case." That is the one document that establishes the policy limit,
 * and it is the document the attorney dashboard asks for by name.
 *
 * These tests pin the categories the UI can actually produce, so the next tile added
 * without a matching entry fails here instead of in front of a claimant.
 */

const label = (name: string, confidence = 95): DetectedLabel => ({ name, confidence })

/** Categories offered by the evidence step of the intake wizard, as filed by the client. */
const DOCUMENT_UPLOAD_CATEGORIES = [
  'police_report',
  'witness_statements',
  'medical_records',
  'bills',
  'insurance_letters',
  'dec_page',
  'wage_verification',
]

describe('evidence categories the upload UI can produce', () => {
  it.each(DOCUMENT_UPLOAD_CATEGORIES)('treats %s as a document category', (category) => {
    expect(isDocumentCategory(category)).toBe(true)
  })

  it.each(['photos', 'video'])('does not treat %s as a document category', (category) => {
    expect(isDocumentCategory(category)).toBe(false)
  })

  it.each(DOCUMENT_UPLOAD_CATEGORIES)('names what it expects for %s', (category) => {
    const result = assessRelevance(category, [label('document')])
    expect(result.expected).not.toBe('evidence relevant to your case')
  })
})

describe('declarations page', () => {
  it('accepts a page of text', () => {
    const result = assessRelevance('dec_page', [label('document'), label('text')])
    expect(result.status).toBe('relevant')
  })

  it('names the Dec page rather than the generic fallback when rejecting', () => {
    const result = assessRelevance('dec_page', [label('giraffe'), label('wildlife')])
    expect(result.status).toBe('mismatch')
    expect(result.message).toContain('declarations (Dec) page')
  })
})

describe('witness statements', () => {
  it('accepts a page of text', () => {
    const result = assessRelevance('witness_statements', [label('handwriting')])
    expect(result.status).toBe('relevant')
  })

  it('names a witness statement rather than the generic fallback when rejecting', () => {
    const result = assessRelevance('witness_statements', [label('dessert'), label('food')])
    expect(result.status).toBe('mismatch')
    expect(result.message).toContain('a witness statement')
  })
})

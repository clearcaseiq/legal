import { describe, it, expect } from 'vitest'
import {
  analyzeVideoRelevance,
  assessDocumentText,
  assessRelevance,
  isDocumentCategory,
  type DetectedLabel,
} from './evidence-vision'

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

describe('a video filed under a document section', () => {
  it.each(DOCUMENT_UPLOAD_CATEGORIES)('is a mismatch for %s without looking at its frames', async (category) => {
    const result = await analyzeVideoRelevance({ category, filePath: '/nonexistent/clip.mp4' })
    expect(result.status).toBe('mismatch')
    expect(result.message).toContain('Videos belong in the Videos section')
  })
})

describe('medical bills', () => {
  const base = {
    category: 'bills',
    topLabels: [],
    expected: 'a medical bill or invoice',
    provider: 'aws_rekognition' as const,
    checkedAt: '2026-10-06T00:00:00.000Z',
  }
  const judge = (text: string) => assessDocumentText('bills', text, base)

  it('rejects a law firm retainer invoice', () => {
    const result = judge(
      'Smith & Lee LLP INVOICE. Retainer for legal services. Hourly rate $350. Amount due $5,000. ' +
        'Payment due date 10/30/2026. Deposited to client trust account.',
    )
    expect(result?.status).toBe('mismatch')
    expect(result?.message).toContain('legal or attorney fee document')
  })

  it('rejects a personal injury retainer agreement even though it mentions medical bills', () => {
    const result = judge(
      'CONTINGENCY FEE AGREEMENT. Client retains attorney for legal representation of injury claim. ' +
        'Attorney fees 33% of total recovery. Medical bills and liens are paid from the settlement balance.',
    )
    expect(result?.status).toBe('mismatch')
  })

  it('accepts a provider bill', () => {
    const result = judge(
      'Valley Orthopedic Clinic STATEMENT. Patient: Dana Reyes. Date of service 03/02/2026. ' +
        'CPT 99213 office visit $180.00. Amount due $180.00.',
    )
    expect(result?.status).toBe('relevant')
  })

  it("accepts a lien bill that names the client's attorney", () => {
    const result = judge(
      'Spine Care Medical Group INVOICE. Patient: Dana Reyes. Attorney: Smith & Lee LLP, letter of protection. ' +
        'Date of service 04/11/2026. Physical therapy. Balance due $2,400.',
    )
    expect(result?.status).toBe('relevant')
  })

  it('warns on an invoice with nothing medical on it', () => {
    const result = judge('ACME ROOFING INVOICE. Account number 4471. Amount due $3,200. Due date 11/01/2026. Total $3,200.')
    expect(result?.status).toBe('review')
    expect(result?.message).toContain('nothing on it is medical')
  })
})

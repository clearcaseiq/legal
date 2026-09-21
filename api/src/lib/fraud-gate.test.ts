import { describe, it, expect, vi } from 'vitest'
import { evaluateCaseFraud, type FraudEvidenceInput } from './fraud-gate'
import type { NormalizedCase } from './case-normalization'

// The duplicate-detection counts are the only queries in the evaluator, and
// they are skipped entirely for a case with no owning user. Every test here
// passes `userId: null` so the scorer runs as the pure function it claims to be.
vi.mock('./prisma', () => ({
  prisma: { assessment: { count: vi.fn() } },
}))

const INCIDENT = '2026-06-15'

function baseCase(overrides: Partial<NormalizedCase> = {}): NormalizedCase {
  return {
    case_id: 'case-1',
    claim_type: 'auto',
    incident_date: INCIDENT,
    jurisdiction_state: 'CA',
    injury_severity: 1,
    treatment_status: 'none',
    liability_confidence: 0.6,
    evidence_score: 0.5,
    damages_score: 0.6,
    estimated_case_value_low: 10000,
    estimated_case_value_high: 50000,
    statute_of_limitations_status: 'ok',
    medical_record_present: true,
    police_report_present: true,
    wage_loss_present: false,
    urgency_level: 'medium',
    narrative_present: true,
    plaintiff_contact_complete: true,
    required_disclosures_accepted: true,
    ...overrides,
  }
}

function evaluate(evidenceFiles: FraudEvidenceInput[], overrides: Partial<NormalizedCase> = {}) {
  return evaluateCaseFraud({
    normalizedCase: baseCase(overrides),
    assessment: { id: 'case-1', userId: null },
    evidenceFiles,
  })
}

/** A verified photo, so nothing but the tags under test can fire a signal. */
function photo(name: string, exif: Record<string, unknown>): FraudEvidenceInput {
  return {
    category: 'photos',
    originalName: name,
    mimetype: 'image/jpeg',
    isVerified: true,
    exifData: JSON.stringify(exif),
  }
}

function codes(signals: Array<{ code: string }>) {
  return signals.map((s) => s.code)
}

describe('identity signal', () => {
  // Regression: this signal read `facts.verification.status`, which nothing in
  // the codebase writes, so it could never fire. It now reads the verdict that
  // `checkDocumentIdentity` actually stores on each evidence file.
  it('fires on a stored mismatch and holds the case', async () => {
    const result = await evaluate([
      {
        category: 'medical_records',
        originalName: 'records.pdf',
        isVerified: true,
        identityCheck: JSON.stringify({
          verdict: 'mismatch',
          documentName: 'Jamie Lee',
          claimantName: 'Apple Jones',
          checkedAt: '2026-06-20T00:00:00.000Z',
        }),
      },
    ])

    expect(codes(result.signals)).toContain('identity_verification')
    expect(result.hold).toBe(true)
    expect(result.reviewReason).toBe('identity_mismatch')
    expect(result.reason).toContain('Jamie Lee')
    expect(result.reason).toContain('Apple Jones')
  })

  it('counts the additional mismatches in the note', async () => {
    const mismatch = (documentName: string) =>
      JSON.stringify({
        verdict: 'mismatch',
        documentName,
        claimantName: 'Apple Jones',
        checkedAt: '2026-06-20T00:00:00.000Z',
      })
    const result = await evaluate([
      { category: 'medical_records', isVerified: true, identityCheck: mismatch('Jamie Lee') },
      { category: 'bills', isVerified: true, identityCheck: mismatch('Chris Doe') },
    ])

    expect(result.reason).toContain('1 other document(s) also mismatch')
  })

  it('stays quiet on a match', async () => {
    const result = await evaluate([
      {
        category: 'medical_records',
        isVerified: true,
        identityCheck: JSON.stringify({
          verdict: 'match',
          documentName: 'Jane Smith',
          claimantName: 'Jane Doe',
          checkedAt: '2026-06-20T00:00:00.000Z',
        }),
      },
    ])

    expect(codes(result.signals)).not.toContain('identity_verification')
  })

  it('still honours an external verification provider if one ever reports', async () => {
    const result = await evaluate([], {
      rawFacts: { verification: { status: 'failed' } },
    })

    expect(codes(result.signals)).toContain('identity_verification')
    expect(result.hold).toBe(true)
  })
})

describe('photo metadata signals', () => {
  // Regression: the old signal matched `aiClassification` against
  // /suspicious|tamper|altered/, but that column holds a document *type* and
  // never contained any of those words.
  it('holds a case whose photo predates the incident', async () => {
    const result = await evaluate([
      photo('damage.jpg', { DateTimeOriginal: '2026-05-01T10:00:00.000Z' }),
    ])

    expect(codes(result.signals)).toContain('photo_predates_incident')
    expect(result.hold).toBe(true)
    expect(result.reviewReason).toBe('document_tampering')
    expect(result.reason).toContain('damage.jpg')
  })

  it('names an image editor without holding on that alone', async () => {
    const result = await evaluate([photo('bill.jpg', { Software: 'Adobe Photoshop 25.0' })])

    const editor = result.signals.find((s) => s.code === 'image_editor_metadata')
    expect(editor?.severity).toBe('medium')
    expect(result.score).toBeLessThan(45)
    expect(result.hold).toBe(false)
  })

  it('leaves an ordinary same-day phone photo alone', async () => {
    const result = await evaluate([
      photo('scene.jpg', {
        DateTimeOriginal: '2026-06-15T18:00:00.000Z',
        Software: '17.1.1',
        Make: 'Apple',
      }),
    ])

    expect(result.signals).toHaveLength(0)
    expect(result.hold).toBe(false)
  })
})

describe('scoring', () => {
  it('reports the heaviest signal as the hold reason', async () => {
    const result = await evaluate([
      photo('edited.jpg', {
        DateTimeOriginal: '2026-05-01T10:00:00.000Z',
        Software: 'GIMP 2.10',
      }),
    ])

    // Predating the incident (35) outweighs the editor tag (20).
    expect(result.score).toBe(55)
    expect(result.reason).toContain('before the reported incident date')
  })

  it('holds nothing on a clean case', async () => {
    const result = await evaluate([])
    expect(result.signals).toHaveLength(0)
    expect(result.score).toBe(0)
    expect(result.hold).toBe(false)
    expect(result.reviewReason).toBeUndefined()
  })
})

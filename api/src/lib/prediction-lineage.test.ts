import crypto from 'crypto'
import { describe, expect, it } from 'vitest'
import {
  buildPredictionInputSnapshot,
  purposeLimitedPredictionFacts,
  stableJson,
} from './prediction-lineage'

describe('prediction lineage snapshots', () => {
  it('hashes stable normalized JSON independent of object key order', () => {
    const first = stableJson({ z: 1, nested: { b: 2, a: 1 } })
    const second = stableJson({ nested: { a: 1, b: 2 }, z: 1 })

    expect(first).toBe(second)
  })

  it('retains valuation inputs while excluding identity, consent, and document-request data', () => {
    const facts = purposeLimitedPredictionFacts({
      incident: { date: '2026-01-01' },
      damages: { medicalExpenses: 12_000 },
      consents: { hipaa: { signedAt: '2026-01-02' } },
      suggestedDocuments: [{ name: 'ID card' }],
      origin: { vendor: 'clio', externalId: 'customer-123' },
      plaintiffContext: {
        firstName: 'Pat',
        email: 'pat@example.com',
        phone: '+15550102020',
        representationStage: 'seeking_counsel',
        litigationIntent: 'open',
        settlementOffer: 5000,
      },
      intakeData: {
        contact: { address: '1 Main Street' },
        injuryDescription: 'fracture',
      },
    })

    expect(facts.incident).toEqual({ date: '2026-01-01' })
    expect(facts.damages).toEqual({ medicalExpenses: 12_000 })
    expect(facts.consents).toBeUndefined()
    expect(facts.suggestedDocuments).toBeUndefined()
    expect(facts.origin).toBeUndefined()
    expect(facts.intakeData.contact).toBeUndefined()
    expect(facts.intakeData.injuryDescription).toBe('fracture')
    expect(facts.plaintiffContext).toEqual({
      representationStage: 'seeking_counsel',
      litigationIntent: 'open',
      settlementOffer: 5000,
    })
  })

  it('captures the exact revision and calibrated model configuration in the hashed snapshot', () => {
    const result = buildPredictionInputSnapshot({
      assessmentRevision: 17,
      heuristicFeatures: { liabilityScore: 0.72 },
      underwritingInput: {
        id: 'case-1',
        claimType: 'auto',
        venueState: 'CA',
        venueCounty: 'Los Angeles',
        facts: { damages: { medicalExpenses: 12_000 } },
        evidenceFiles: [],
      } as any,
      configuration: {
        modelVersion: 'ca-pi-underwriting-v2+cal:2026-11',
        heuristicModelVersion: 'heuristics-v4',
        inferenceSource: 'case_recalculation',
      },
    })

    const snapshot = JSON.parse(result.inputSnapshot)
    expect(snapshot.assessmentRevision).toBe(17)
    expect(snapshot.modelConfiguration).toMatchObject({
      modelVersion: 'ca-pi-underwriting-v2+cal:2026-11',
      calibrationVersion: '2026-11',
      heuristicModelVersion: 'heuristics-v4',
    })
    expect(result.inputHash).toBe(
      crypto.createHash('sha256').update(result.inputSnapshot).digest('hex'),
    )
    expect(result.inputHash).toHaveLength(64)
  })
})

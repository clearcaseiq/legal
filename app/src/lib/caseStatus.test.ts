import { describe, expect, it } from 'vitest'
import { getPlaintiffCaseStatusKey, getPlaintiffPipelineProgress, isPlaintiffRetained } from './caseStatus'

describe('isPlaintiffRetained', () => {
  it('does not treat caseStage alone as retained', () => {
    expect(
      isPlaintiffRetained({
        lifecycleState: 'attorney_review',
        leadStatus: 'submitted',
        caseStage: 'TREATMENT',
      }),
    ).toBe(false)
  })

  it('is true when lifecycle or lead status shows retention', () => {
    expect(isPlaintiffRetained({ lifecycleState: 'engaged', leadStatus: 'submitted' })).toBe(true)
    expect(isPlaintiffRetained({ lifecycleState: 'attorney_review', leadStatus: 'retained' })).toBe(true)
  })

  // Only `onRetainerSigned` writes the retained lead status, so a retainer that
  // was sent and never completed left the client's pipeline frozen at
  // Consultation while the firm was already demanding and negotiating.
  it('infers retention from stages a firm never reaches unretained', () => {
    for (const caseStage of ['DEMAND_PREPARATION', 'DEMAND_SENT', 'NEGOTIATION', 'SETTLEMENT_PENDING', 'DISBURSEMENT']) {
      expect(isPlaintiffRetained({ lifecycleState: 'consultation_scheduled', leadStatus: 'consulted', caseStage })).toBe(true)
    }
  })

  it('still refuses to infer retention from an ambiguous stage', () => {
    // An evidence upload alone can carry a merely-consulted matter to
    // TREATMENT, which is the stale-stage problem the guard exists for.
    for (const caseStage of ['OPENING', 'INVESTIGATION', 'TREATMENT', 'RECORD_COLLECTION', 'CLOSED']) {
      expect(isPlaintiffRetained({ lifecycleState: 'attorney_review', leadStatus: 'submitted', caseStage })).toBe(false)
    }
  })
})

describe('getPlaintiffCaseStatusKey', () => {
  it('stays in review when routed but not accepted, even if caseStage is TREATMENT', () => {
    expect(
      getPlaintiffCaseStatusKey({
        lifecycleState: 'attorney_review',
        leadStatus: 'submitted',
        caseStage: 'TREATMENT',
        reviewingCount: 1,
        submittedForReview: true,
      }),
    ).toBe('in_review')
  })

  it('returns consultation_scheduled only when an upcoming appointment exists', () => {
    expect(
      getPlaintiffCaseStatusKey({
        lifecycleState: 'consultation_scheduled',
        leadStatus: 'consulted',
        attorneyMatched: { id: 'a1' },
        upcomingAppointment: { scheduledAt: new Date(Date.now() + 86_400_000).toISOString() },
      }),
    ).toBe('consultation_scheduled')
  })

  it('falls back to accepted after cancel when lifecycle still says consultation_scheduled', () => {
    expect(
      getPlaintiffCaseStatusKey({
        lifecycleState: 'consultation_scheduled',
        leadStatus: 'consulted',
        attorneyMatched: { id: 'a1' },
        upcomingAppointment: null,
      }),
    ).toBe('accepted')
  })
})

describe('getPlaintiffPipelineProgress', () => {
  it('does not jump to treatment from stale caseStage before retain', () => {
    expect(
      getPlaintiffPipelineProgress({
        submittedForReview: true,
        attorneyMatched: false,
        hasScheduledConsult: false,
        retained: false,
        caseStage: 'TREATMENT',
      }),
    ).toEqual({ currentIdx: 2, completeThrough: 2 })
  })

  it('lights the demand milestone once a demand has gone out', () => {
    expect(
      getPlaintiffPipelineProgress({
        submittedForReview: true,
        attorneyMatched: true,
        hasScheduledConsult: true,
        retained: isPlaintiffRetained({ leadStatus: 'consulted', caseStage: 'DEMAND_SENT' }),
        caseStage: 'DEMAND_SENT',
      }),
    ).toEqual({ currentIdx: 7, completeThrough: 7 })
  })
})

describe('getPlaintiffCaseStatusKey with a lagging retained flag', () => {
  it('reports demand rather than consultation once the demand is out', () => {
    expect(
      getPlaintiffCaseStatusKey({
        lifecycleState: 'consultation_scheduled',
        leadStatus: 'consulted',
        caseStage: 'DEMAND_SENT',
        attorneyMatched: true,
      }),
    ).toBe('demand')
  })
})

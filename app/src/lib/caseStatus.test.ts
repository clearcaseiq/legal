import { describe, expect, it } from 'vitest'
import { getPlaintiffCaseStatusKey, isPlaintiffRetained } from './caseStatus'

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
  it('does not jump to treatment from stale caseStage before retain', async () => {
    const { getPlaintiffPipelineProgress } = await import('./caseStatus')
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
})

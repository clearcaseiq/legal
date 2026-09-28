import { describe, expect, it } from 'vitest'
import { trackAssessmentSubmitted } from './assessmentTracking'

describe('trackAssessmentSubmitted', () => {
  it('pushes the submission event with the case type', () => {
    const scope = { dataLayer: [] as unknown[] }
    trackAssessmentSubmitted({ caseType: 'auto' }, scope)
    expect(scope.dataLayer).toEqual([{ event: 'assessment_submitted', case_type: 'auto' }])
  })

  it('omits an empty case type', () => {
    const scope = { dataLayer: [] as unknown[] }
    trackAssessmentSubmitted({}, scope)
    expect(scope.dataLayer).toEqual([{ event: 'assessment_submitted' }])
  })

  it('does nothing when no container has loaded', () => {
    const scope: Record<string, unknown> = {}
    expect(() => trackAssessmentSubmitted({ caseType: 'auto' }, scope)).not.toThrow()
    expect(scope.dataLayer).toBeUndefined()
  })
})

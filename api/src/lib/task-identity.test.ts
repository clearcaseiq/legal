import { describe, expect, it } from 'vitest'
import { resolveTaskWorkKey, taskWorkAlreadyCovered, normalizeQuestionText, isSameUnitOfWork } from './task-identity'

describe('demand task identity', () => {
  it('keeps draft, approve and send as separate work', () => {
    expect(resolveTaskWorkKey({ title: 'Draft demand letter' })).toBe('demand_draft')
    expect(resolveTaskWorkKey({ title: 'Draft and finalize demand letter' })).toBe('demand_draft')
    expect(resolveTaskWorkKey({ title: 'Attorney review & approve demand' })).toBe('demand_approve')
    expect(resolveTaskWorkKey({ title: 'Attorney review and approve demand package before sending' })).toBe('demand_approve')
    expect(resolveTaskWorkKey({ title: 'Demand sent to carrier' })).toBe('demand_send')
    expect(resolveTaskWorkKey({ title: 'Move toward the demand package' })).toBe('demand_ready')
  })

  it('treats the workflow and checklist approval tasks as one unit of work', () => {
    expect(
      isSameUnitOfWork(
        { title: 'Attorney review & approve demand' },
        { title: 'Attorney review and approve demand package before sending' },
      ),
    ).toBe(true)
    expect(isSameUnitOfWork({ title: 'Attorney review & approve demand' }, { title: 'Draft demand letter' })).toBe(false)
  })

  it('does not merge records requests to different providers', () => {
    expect(
      isSameUnitOfWork(
        { title: 'Request medical records from Dr. Lin' },
        { title: 'Request medical records from City Hospital' },
      ),
    ).toBe(false)
  })
})

describe('task-identity', () => {
  it('maps coach and readiness titles for the same police-report work to one key', () => {
    expect(resolveTaskWorkKey({ title: 'Secure police / incident report', coachKey: 'gap_police_report' })).toBe(
      'police_report',
    )
    expect(resolveTaskWorkKey({ title: 'Collect Police/incident report', checkpointType: 'police_report' })).toBe(
      'police_report',
    )
    expect(
      taskWorkAlreadyCovered(
        [{ title: 'Secure police / incident report', coachKey: 'gap_police_report', checkpointType: 'police_report' }],
        { title: 'Collect Police/incident report', checkpointType: 'police_report' },
      ),
    ).toBe(true)
  })

  it('maps product preservation titles', () => {
    expect(
      resolveTaskWorkKey({
        title: 'Instruct client to preserve the product unaltered',
        coachKey: 'gap_product_preservation',
      }),
    ).toBe('product_preservation')
  })

  it('normalizes question text for dedupe', () => {
    expect(normalizeQuestionText('Do you still have the product itself (preserved, unaltered)?')).toBe(
      normalizeQuestionText('Do you still have the product itself, preserved, unaltered?'),
    )
  })
})

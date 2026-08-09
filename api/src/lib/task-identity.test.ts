import { describe, expect, it } from 'vitest'
import { resolveTaskWorkKey, taskWorkAlreadyCovered, normalizeQuestionText } from './task-identity'

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

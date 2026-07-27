import { describe, expect, it } from 'vitest'

import { CLAIM_TYPE_LABELS, formatClaimType as sharedFormatClaimType } from '../../../../shared/claim-types'
import { CLAIM_TYPE_LABELS_FOR_TEST, formatClaimType, isAcceptedCase } from './formatLead'

describe('claim type labels', () => {
  // Metro only bundles files under the app root, so the mobile map is a copy of
  // the shared one. This guards against the two drifting apart again (CP-406).
  it('matches the canonical labels shared with the web app', () => {
    expect(CLAIM_TYPE_LABELS_FOR_TEST).toEqual(CLAIM_TYPE_LABELS)
  })

  it('formats the same way as the shared helper', () => {
    const inputs = [
      'auto',
      'medmal',
      'product',
      'toxic',
      'slip_and_fall',
      'high_severity_surgery',
      'unmapped_claim_type',
      '',
      null,
      undefined,
    ]
    for (const input of inputs) {
      expect(formatClaimType(input)).toBe(sharedFormatClaimType(input))
    }
  })

  it('uses friendly names for the incident types QA compared across platforms', () => {
    expect(formatClaimType('auto')).toBe('Motor vehicle')
    expect(formatClaimType('medmal')).toBe('Medical malpractice')
    expect(formatClaimType('product')).toBe('Product liability')
  })
})

describe('isAcceptedCase', () => {
  it('is false while the offer is still awaiting a decision', () => {
    expect(isAcceptedCase({ status: 'submitted' })).toBe(false)
  })

  it('is false for declined cases', () => {
    expect(isAcceptedCase({ status: 'rejected' })).toBe(false)
    expect(isAcceptedCase({ status: 'declined' })).toBe(false)
  })

  it('is true once the attorney has taken the case', () => {
    expect(isAcceptedCase({ status: 'contacted' })).toBe(true)
    expect(isAcceptedCase({ status: 'ACCEPTED' })).toBe(true)
    expect(isAcceptedCase({ status: 'consulted' })).toBe(true)
    expect(isAcceptedCase({ status: 'retained' })).toBe(true)
  })

  it('is false when the status is missing', () => {
    expect(isAcceptedCase({})).toBe(false)
    expect(isAcceptedCase(null)).toBe(false)
  })
})

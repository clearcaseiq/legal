import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))

import { adjusterKey, buildClaimMilestones, extractPolicyFields } from './insurance-workbench'

const DAY = 24 * 60 * 60 * 1000

describe('extractPolicyFields', () => {
  it('reads policy, claim, per-person BI limit, contact, and coverage hints from a dec page', () => {
    const text = [
      'DECLARATIONS PAGE',
      'Policy Number: PA-1234567-89',
      'Claim No. CLM884421',
      'Bodily Injury Liability $100,000 each person / $300,000 each accident',
      'Uninsured Motorist  $50,000/$100,000',
      'Medical Payments $5,000',
      'Questions? jane.adjuster@carrier.com (555) 201-3344',
    ].join('\n')
    const out = extractPolicyFields(text)
    expect(out.policyNumber).toBe('PA-1234567-89')
    expect(out.claimNumber).toBe('CLM884421')
    expect(out.policyLimit).toBe(100000)
    expect(out.adjusterEmail).toBe('jane.adjuster@carrier.com')
    expect(out.adjusterPhone).toContain('201-3344')
    expect(out.coverageHints).toEqual(expect.arrayContaining(['um', 'medpay']))
  })

  it('reads split-limit shorthand as the per-person limit', () => {
    expect(extractPolicyFields('Limits 25/50/25').policyLimit).toBe(25000)
  })

  it('returns nothing for empty text', () => {
    expect(extractPolicyFields(null)).toEqual({})
  })
})

describe('buildClaimMilestones', () => {
  const now = new Date('2026-09-30T12:00:00Z')

  it('flags an unacknowledged LOR past 14 days as overdue', () => {
    const lorSentAt = new Date(now.getTime() - 20 * DAY)
    const m = buildClaimMilestones({
      insurance: { createdAt: new Date(now.getTime() - 25 * DAY), insuredParty: 'defendant' },
      lorSentAt,
      decRequestedAt: null,
      decReceivedAt: null,
      now,
    })
    expect(m.find((x) => x.key === 'lor_sent')?.status).toBe('done')
    expect(m.find((x) => x.key === 'lor_ack')?.status).toBe('overdue')
    expect(m.find((x) => x.key === 'dec_page')?.detail).toBe('Not requested yet')
  })

  it('tracks the policy-limits demand deadline', () => {
    const m = buildClaimMilestones({
      insurance: {
        createdAt: now,
        limitsDemandSentAt: now,
        limitsDemandDeadline: new Date(now.getTime() + 2 * DAY),
        limitsDemandStatus: 'sent',
      },
      lorSentAt: now,
      decRequestedAt: null,
      decReceivedAt: null,
      now,
    })
    expect(m.find((x) => x.key === 'limits_demand')?.status).toBe('due_soon')
  })
})

describe('adjusterKey', () => {
  it('prefers email, falls back to name + carrier', () => {
    expect(adjusterKey({ adjusterEmail: 'A@X.com', adjusterName: 'Ann' })).toBe('a@x.com')
    expect(adjusterKey({ adjusterName: 'Ann Lee', carrierName: 'Geico' })).toBe('ann lee|geico')
    expect(adjusterKey({})).toBeNull()
  })
})

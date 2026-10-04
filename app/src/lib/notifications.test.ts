import { describe, expect, it } from 'vitest'
import { groupNotificationsByCase, notificationDestination } from './notifications'

const n = (id: string, caseKey: string | null, createdAt: string, read = false) => ({
  id,
  caseKey,
  caseLabel: caseKey ? `Client ${caseKey}` : null,
  caseId: caseKey ? `CCIQ-${caseKey}` : null,
  read,
  createdAt,
})

describe('groupNotificationsByCase', () => {
  it('buckets by case, newest case activity first, general last when oldest', () => {
    const groups = groupNotificationsByCase([
      n('1', 'a', '2026-10-03T10:00:00Z'),
      n('2', 'b', '2026-10-03T12:00:00Z', true),
      n('3', 'a', '2026-10-03T09:00:00Z', true),
      n('4', null, '2026-10-01T09:00:00Z'),
    ])
    expect(groups.map((g) => g.key)).toEqual(['b', 'a', '__general__'])
    expect(groups[1].items.map((i) => i.id)).toEqual(['1', '3'])
    expect(groups[1].unread).toBe(1)
    expect(groups[1].label).toBe('Client a')
    expect(groups[2].label).toBeNull()
  })
})

describe('notificationDestination', () => {
  it('keeps a deep link into the same case file', () => {
    expect(
      notificationDestination({
        type: 'attorney.client_suggested_documents',
        leadId: 'L1',
        link: '/attorney-dashboard/lead/L1/documents?view=requests',
      }),
    ).toBe('/attorney-dashboard/lead/L1/documents?view=requests')
  })

  it('falls back to the case overview when the link points elsewhere', () => {
    expect(notificationDestination({ type: 'attorney.doc_uploaded', leadId: 'L1', link: '/somewhere' })).toBe(
      '/attorney-dashboard/lead/L1/overview',
    )
  })

  it('sends match-lifecycle events to the lead review', () => {
    expect(
      notificationDestination({ type: 'attorney.case_routed', leadId: 'L1', link: '/attorney-dashboard/lead/L1/documents' }),
    ).toBe('/attorney-dashboard/leadgen/matches/L1/overview')
  })
})

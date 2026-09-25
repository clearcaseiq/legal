import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))

import {
  acceptedCategoriesForRequestKey,
  computeRequestStatus,
  evidenceCategoryForRequestKey,
  isRequestedDocFulfilled,
  normalizeRequestedDocKeys,
  requestedDocLabel,
} from './document-request-status'

describe('custom request items', () => {
  it('keeps the attorney wording, collapsing whitespace', () => {
    expect(normalizeRequestedDocKeys(['custom:  Rideshare   trip receipt '])).toEqual(['custom:Rideshare trip receipt'])
  })

  it('drops an empty custom item and dedupes repeats', () => {
    expect(normalizeRequestedDocKeys(['custom:   ', 'custom:Gym log', 'custom:Gym log', 'bills'])).toEqual([
      'custom:Gym log',
      'bills',
    ])
  })

  it('caps the text length', () => {
    const [key] = normalizeRequestedDocKeys([`custom:${'x'.repeat(300)}`])
    expect(key).toHaveLength('custom:'.length + 120)
  })

  it('labels a custom item with its own text', () => {
    expect(requestedDocLabel('custom:Rideshare trip receipt')).toBe('Rideshare trip receipt')
    expect(requestedDocLabel('dec_page')).toBe('Insurance declarations (Dec) page')
    expect(requestedDocLabel('some_unknown_key')).toBe('some unknown key')
  })

  it('files and fulfils a custom item under the other category', () => {
    expect(evidenceCategoryForRequestKey('custom:Gym log')).toBe('other')
    expect(acceptedCategoriesForRequestKey('custom:Gym log')).toEqual(['other'])

    const requestedAt = new Date('2026-09-01T00:00:00Z')
    const after = new Date('2026-09-02T00:00:00Z')
    expect(computeRequestStatus(['custom:Gym log'], [], requestedAt)).toBe('pending')
    expect(computeRequestStatus(['custom:Gym log'], [{ category: 'other', createdAt: after }], requestedAt)).toBe(
      'completed',
    )
  })

  it('matches each of several custom items only to uploads tagged for it', () => {
    const requestedAt = new Date('2026-09-01T00:00:00Z')
    const after = new Date('2026-09-02T00:00:00Z')
    const keys = ['custom:Gym log', 'custom:Rideshare receipt']

    // An untagged `other` file cannot tell which item it answers.
    expect(computeRequestStatus(keys, [{ category: 'other', createdAt: after }], requestedAt)).toBe('pending')

    const oneTagged = [{ category: 'other', subcategory: 'custom:Gym log', createdAt: after }]
    expect(computeRequestStatus(keys, oneTagged, requestedAt)).toBe('partial')
    expect(isRequestedDocFulfilled({ key: 'custom:Rideshare receipt', evidenceFiles: oneTagged, requestCreatedAt: requestedAt, requestKeys: keys })).toBe(false)

    const bothTagged = [...oneTagged, { category: 'other', subcategory: 'custom:rideshare receipt', createdAt: after }]
    expect(computeRequestStatus(keys, bothTagged, requestedAt)).toBe('completed')
  })
})

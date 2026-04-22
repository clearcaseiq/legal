import { describe, expect, it } from 'vitest'

import { buildPlaintiffCaseStageSummary } from './plaintiffCaseStage'

describe('buildPlaintiffCaseStageSummary', () => {
  it('returns ready for review when nothing is outstanding', () => {
    const summary = buildPlaintiffCaseStageSummary({
      documentRequests: [],
      missingDocs: [],
    })

    expect(summary.title).toBe('Ready for attorney review')
    expect(summary.label).toBe('other')
    expect(summary.isSet).toBe(false)
  })

  it('prioritizes open requested documents over passive missing-doc hints', () => {
    const summary = buildPlaintiffCaseStageSummary({
      documentRequests: [
        {
          id: 'req-1',
          leadId: 'lead-1',
          attorney: null,
          requestedDocs: ['police_report'],
          items: [{ key: 'police_report', label: 'Police report', fulfilled: false }],
          fulfilledDocs: [],
          remainingDocs: ['police_report'],
          status: 'pending',
          rawStatus: 'PENDING',
          completionPercent: 0,
          createdAt: '2026-04-01T00:00:00.000Z',
        },
      ],
      missingDocs: [{ key: 'medical_records', label: 'Medical records' }],
    })

    expect(summary.title).toBe('Building liability picture')
    expect(summary.label).toBe('police_report')
    expect(summary.isSet).toBe(true)
  })

  it('falls back to missing documents when there are no active requests', () => {
    const summary = buildPlaintiffCaseStageSummary({
      documentRequests: [],
      missingDocs: [{ key: 'injury_photos', label: 'Injury photos' }],
    })

    expect(summary.title).toBe('Updating damages review')
    expect(summary.label).toBe('injury_photos')
    expect(summary.isSet).toBe(false)
  })

  it('maps insurance-only work to coverage review', () => {
    const summary = buildPlaintiffCaseStageSummary({
      documentRequests: [
        {
          id: 'req-2',
          leadId: 'lead-2',
          attorney: null,
          requestedDocs: ['insurance'],
          items: [{ key: 'insurance', label: 'Insurance card', fulfilled: false }],
          fulfilledDocs: [],
          remainingDocs: ['insurance'],
          status: 'pending',
          rawStatus: 'PENDING',
          completionPercent: 0,
          createdAt: '2026-04-01T00:00:00.000Z',
        },
      ],
      missingDocs: [],
    })

    expect(summary.title).toBe('Confirming coverage path')
    expect(summary.label).toBe('insurance')
    expect(summary.isSet).toBe(false)
  })
})

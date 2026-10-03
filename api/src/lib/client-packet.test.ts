import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))

import { clientPacketMessage } from './client-packet'
import { requestItemStages } from './document-request-status'
import { countSupportingEvidence, isSupportingEvidence } from './evidence-supporting'

describe('clientPacketMessage', () => {
  const base = {
    firstName: 'Ana',
    firmName: 'Lee Law',
    link: 'https://app.test/respond/documents/tok',
  }

  it('lists what to sign and what to upload, then the one link, in a text', () => {
    const body = clientPacketMessage({
      ...base,
      sign: ['Retainer agreement', 'HIPAA authorization'],
      uploads: ['Medical records'],
      channel: 'text',
    })
    expect(body).toContain('Lee Law: Hi Ana')
    expect(body).toContain('Sign these documents:\n- Retainer agreement\n- HIPAA authorization')
    expect(body).toContain('Upload these files:\n- Medical records')
    expect(body).toContain(base.link)
    expect(body).toContain('Reply STOP')
  })

  it('leaves out an empty section and the link in an email (it rides on the button)', () => {
    const body = clientPacketMessage({ ...base, sign: ['Retainer agreement'], uploads: [], channel: 'email' })
    expect(body).toContain('Sign these documents:')
    expect(body).not.toContain('Upload these files:')
    expect(body).not.toContain(base.link)
  })
})

describe('requestItemStages', () => {
  const requestedAt = '2026-10-01T00:00:00Z'

  it('moves each item Requested → Received → Reviewed', () => {
    const stages = requestItemStages(
      ['police_report', 'bills', 'injury_photos'],
      [
        { id: 'f1', category: 'police_report', createdAt: '2026-10-02T00:00:00Z', isVerified: true },
        { id: 'f2', category: 'bills', createdAt: '2026-10-02T00:00:00Z', isVerified: false },
      ],
      requestedAt,
    )
    expect(stages.map((s) => [s.key, s.stage, s.fileIds])).toEqual([
      ['police_report', 'reviewed', ['f1']],
      ['bills', 'received', ['f2']],
      ['injury_photos', 'requested', []],
    ])
  })

  it('ignores files that were on the case before the request', () => {
    const [item] = requestItemStages(
      ['bills'],
      [{ id: 'old', category: 'bills', createdAt: '2026-09-01T00:00:00Z', isVerified: true }],
      requestedAt,
    )
    expect(item.stage).toBe('requested')
  })
})

describe('supporting evidence', () => {
  it('excludes signed agreements, old and new', () => {
    expect(isSupportingEvidence({ uploadMethod: 'esign', category: 'other' })).toBe(false)
    expect(isSupportingEvidence({ uploadMethod: 'file_picker', category: 'agreements' })).toBe(false)
    expect(isSupportingEvidence({ uploadMethod: 'drag_drop', category: 'medical_records' })).toBe(true)
    expect(
      countSupportingEvidence([
        { uploadMethod: 'esign', category: 'agreements' },
        { uploadMethod: 'drag_drop', category: 'bills' },
      ]),
    ).toBe(1)
  })
})

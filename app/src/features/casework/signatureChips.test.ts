import { describe, expect, it } from 'vitest'
import type { DocumentEnvelope } from '../../lib/api-esign'
import { chipState, signatureChips } from './DocumentsSections'

let seq = 0
const env = (documentType: string, title: string, status: DocumentEnvelope['status'], createdAt: string): DocumentEnvelope => ({
  id: `e${++seq}`,
  documentType,
  title: `${title} — Rose Beach`,
  signerName: 'Rose Beach',
  signerEmail: 'rose@example.com',
  status,
  provider: 'dropbox_sign',
  createdAt,
  signedAt: status === 'signed' ? createdAt : null,
})

describe('signatureChips', () => {
  it('keeps a signed document green when a newer copy is out', () => {
    const chips = signatureChips([
      env('retainer', 'Retainer agreement', 'signed', '2026-10-02T10:00:00Z'),
      env('retainer', 'Retainer agreement', 'sent', '2026-10-03T10:00:00Z'),
      env('hipaa_authorization', 'HIPAA authorization', 'signed', '2026-10-02T10:00:00Z'),
      env('hipaa_authorization', 'HIPAA authorization', 'sent', '2026-10-03T10:00:00Z'),
    ])
    const retainer = chipState(chips.find((c) => c.key === 'retainer')!.envs)
    expect(retainer.signed?.status).toBe('signed')
    expect(retainer.newerOpen?.status).toBe('sent')
  })

  it('gives a custom-titled agreement its own chip', () => {
    const chips = signatureChips([
      env('retainer', 'Retainer agreement', 'sent', '2026-10-03T10:00:00Z'),
      env('retainer', 'Kalpana Law Firm Retainer Fee', 'signed', '2026-10-02T10:00:00Z'),
    ])
    expect(chips.map((c) => c.label)).toEqual(['Retainer agreement', 'HIPAA authorization', 'Kalpana Law Firm Retainer Fee'])
    expect(chipState(chips[2].envs).signed).not.toBeNull()
  })

  it("lets a firm's own retainer stand in for the standard one", () => {
    const chips = signatureChips([env('retainer', 'Kalpana Law Firm Retainer Fee', 'signed', '2026-10-02T10:00:00Z')])
    expect(chips.map((c) => c.label)).toEqual(['HIPAA authorization', 'Kalpana Law Firm Retainer Fee'])
  })

  it('shows required documents with no copies and hides an unsent police authorization', () => {
    expect(signatureChips([]).map((c) => c.label)).toEqual(['Retainer agreement', 'HIPAA authorization'])
  })

  it('ignores voided copies', () => {
    const chips = signatureChips([env('retainer', 'Retainer agreement', 'voided', '2026-10-03T10:00:00Z')])
    expect(chips.find((c) => c.key === 'retainer')!.envs).toHaveLength(0)
  })
})

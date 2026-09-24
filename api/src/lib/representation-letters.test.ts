import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    caseTask: { findMany: vi.fn(), update: vi.fn() },
  },
}))
vi.mock('./workflow-step-tasks', () => ({ syncWorkflowItemFromTask: vi.fn(async () => undefined) }))

import { prisma } from './prisma'
import {
  BLANK,
  UPLOAD_LINK_TOKEN,
  carrierLetterBody,
  completeLetterTasks,
  countBlanks,
  providerKey,
  providerLetterBody,
  type LetterContext,
} from './representation-letters'

const ctx: LetterContext = {
  leadId: 'lead1',
  assessmentId: 'a1',
  clientName: 'Jamie Lee',
  dateOfLoss: 'March 3, 2026',
  attorneyName: 'Mike Pence',
  attorneyEmail: 'mike@firm.com',
  attorneyPhone: null,
  firmName: 'Pence Law',
  firmAddressLines: [],
  firmPhone: null,
  today: 'September 24, 2026',
}

describe('carrierLetterBody', () => {
  it('fills the claim details it knows and leaves blanks for the rest', () => {
    const body = carrierLetterBody(ctx, { carrierName: 'State Farm', adjusterName: 'Pat Doe', claimNumber: 'CL-9' })
    expect(body).toContain('Attn: Pat Doe')
    expect(body).toContain('Claim number: CL-9')
    expect(body).toContain(`Policy number: ${BLANK}`)
    expect(body).toContain('Pence Law represents Jamie Lee')
    expect(countBlanks(body)).toBe(1)
  })

  it("asks the client's own carrier about first-party coverage", () => {
    const body = carrierLetterBody(ctx, { carrierName: 'Geico', insuredParty: 'client' })
    expect(body).toMatch(/uninsured\/underinsured motorist/)
    expect(body).toContain('Attn: Claims Department')
  })
})

describe('providerLetterBody', () => {
  it('carries the upload link placeholder and leaves lien language out by default', () => {
    const body = providerLetterBody(ctx, { providerName: 'Bay Ortho' })
    expect(body).toContain(UPLOAD_LINK_TOKEN)
    expect(body).not.toContain('LETTER OF PROTECTION')
  })

  it('adds letter-of-protection language when asked', () => {
    expect(providerLetterBody(ctx, { providerName: 'Bay Ortho', includeLop: true })).toContain('LETTER OF PROTECTION')
  })
})

describe('providerKey', () => {
  it('matches provider names regardless of case and punctuation', () => {
    expect(providerKey('Bay Ortho, Inc.')).toBe(providerKey('bay ortho inc'))
  })
})

describe('completeLetterTasks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('closes only the carrier task for a carrier letter', async () => {
    ;(prisma.caseTask.findMany as any).mockResolvedValue([
      { id: 't1', title: 'Send Letter of Representation (LOR)', notes: null },
      { id: 't2', title: 'Send letters of representation to providers', notes: null },
    ])
    ;(prisma.caseTask.update as any).mockImplementation(async ({ where }: any) => ({ id: where.id }))
    expect(await completeLetterTasks('a1', 'carrier_lor', 'sent')).toBe(1)
    expect((prisma.caseTask.update as any).mock.calls[0][0].where.id).toBe('t1')
  })

  it('closes only the provider task for provider letters', async () => {
    ;(prisma.caseTask.findMany as any).mockResolvedValue([
      { id: 't1', title: 'Send Letter of Representation (LOR)', notes: null },
      { id: 't2', title: 'Send letters of representation to providers', notes: null },
    ])
    ;(prisma.caseTask.update as any).mockImplementation(async ({ where }: any) => ({ id: where.id }))
    expect(await completeLetterTasks('a1', 'provider_lor', 'sent')).toBe(1)
    expect((prisma.caseTask.update as any).mock.calls[0][0].where.id).toBe('t2')
  })
})

/**
 * What matters here is not that a value gets written, but that it gets written
 * only when the right person said so — and that a specialist's paraphrase of a
 * claimant's account never becomes the claimant's answer without them.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./data-authority', () => ({
  recordCaseChange: vi.fn().mockResolvedValue({ revision: 6, seq: 3, lawFirmId: null }),
  recordCaseChangeAtRevision: vi.fn().mockResolvedValue({ revision: 6, seq: 3, lawFirmId: null }),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { recordCaseChange } from './data-authority'
import {
  approveExternalWriteProposal,
  createSpecialistFactProposal,
  isReconcilableField,
  rejectExternalWriteProposal,
  reviewerForSource,
} from './case-reconciliation'

const CASE = {
  id: 'a-1',
  lawFirmId: 'firm-1',
  revision: 5,
  caseName: 'Rivera v. Doe',
  status: 'DRAFT',
  venueState: 'CA',
  venueCounty: 'Los Angeles',
  facts: '{"damages":{"med_charges":1200},"insurance":{"claim_number":"OLD"}}',
}

function pendingProposal(overrides: Record<string, unknown> = {}) {
  prisma.externalWriteProposal.findUnique.mockResolvedValue({
    id: 'p-1',
    assessmentId: 'a-1',
    field: 'facts:damages.med_charges',
    currentValue: '1200',
    proposedValue: '2400',
    baseRevision: 5,
    source: 'specialist',
    status: 'pending',
    provider: 'Sam Reyes',
    ...overrides,
  })
}

/** The facts document after the approved write, via the choke point. */
function writtenFacts(): any {
  return JSON.parse(vi.mocked(prisma.assessment.updateMany).mock.calls[0][0].data.facts)
}

beforeEach(() => {
  vi.clearAllMocks()
  resetUniversalPrismaMock()
  prisma.assessment.findUnique.mockResolvedValue({ ...CASE })
  prisma.externalWriteProposal.update.mockImplementation((args: any) =>
    Promise.resolve({ id: 'p-1', ...args.data }),
  )
})

describe('the field allowlist', () => {
  it('accepts both kinds of field and nothing else', () => {
    expect(isReconcilableField('caseName')).toBe(true)
    expect(isReconcilableField('facts:damages.med_charges')).toBe(true)
    expect(isReconcilableField('facts:consents.hipaa')).toBe(false)
    expect(isReconcilableField('userId')).toBe(false)
  })
})

describe('who may review', () => {
  it('sends a specialist proposal to the claimant and everything else to the firm', () => {
    expect(reviewerForSource('specialist')).toBe('claimant')
    expect(reviewerForSource('cms_inbound')).toBe('firm')
    expect(reviewerForSource('api')).toBe('firm')
  })

  it('refuses to let a firm user confirm on the claimant\u2019s behalf', async () => {
    // The whole reason the value is held is that only the claimant can say
    // whether it is what they meant.
    pendingProposal({ source: 'specialist' })

    const result = await approveExternalWriteProposal('p-1', { userId: 'firm-user', as: 'firm' })

    expect(result).toEqual({ ok: false, reason: 'wrong_reviewer' })
    expect(prisma.assessment.updateMany).not.toHaveBeenCalled()
    // Not silently rejected either: it is still waiting for the claimant.
    expect(prisma.externalWriteProposal.update).not.toHaveBeenCalled()
  })

  it('refuses to let a claimant approve an external system\u2019s write', async () => {
    // Case status and venue are firm-side fields; the claimant has no standing.
    pendingProposal({ source: 'cms_inbound', field: 'status', proposedValue: 'CLOSED' })

    const result = await approveExternalWriteProposal('p-1', { userId: 'claimant', as: 'claimant' })

    expect(result).toEqual({ ok: false, reason: 'wrong_reviewer' })
    expect(prisma.assessment.update).not.toHaveBeenCalled()
  })

  it('applies the same boundary to rejection', async () => {
    pendingProposal({ source: 'specialist' })
    const result = await rejectExternalWriteProposal('p-1', { userId: 'firm-user', as: 'firm' })
    expect(result).toEqual({ ok: false, reason: 'wrong_reviewer' })
  })
})

describe('approving a facts proposal', () => {
  it('writes through the choke point so the value carries provenance', async () => {
    pendingProposal()

    const result = await approveExternalWriteProposal('p-1', { userId: 'claimant-1', as: 'claimant' })

    expect(result.ok).toBe(true)
    // Guarded write, not a blind update: this is what gives it a CaseFactChange
    // row and protects it against a concurrent edit.
    expect(prisma.assessment.updateMany).toHaveBeenCalled()
    expect(writtenFacts().damages.med_charges).toBe(2400)
    expect(prisma.caseFactChange.createMany).toHaveBeenCalled()
  })

  it('stores the number as a number, not the string it was proposed as', async () => {
    pendingProposal({ proposedValue: '2400' })
    await approveExternalWriteProposal('p-1', { userId: 'claimant-1', as: 'claimant' })
    expect(typeof writtenFacts().damages.med_charges).toBe('number')
  })

  it('attributes the confirmed value to the claimant, not the specialist', async () => {
    // Once the claimant confirms it, it is their answer. The proposal row stays
    // as the record of who suggested it.
    pendingProposal()
    await approveExternalWriteProposal('p-1', { userId: 'claimant-1', label: 'me@example.com', as: 'claimant' })

    const row = vi.mocked(prisma.caseFactChange.createMany).mock.calls[0][0].data[0]
    expect(row).toMatchObject({ source: 'web', actorType: 'user', actorId: 'claimant-1' })
  })

  it('writes the legacy duplicate key alongside the canonical one', async () => {
    pendingProposal({ field: 'facts:insurance.claim_number', currentValue: 'OLD', proposedValue: 'NEW-1' })
    await approveExternalWriteProposal('p-1', { userId: 'claimant-1', as: 'claimant' })

    expect(writtenFacts().insurance).toEqual({ claim_number: 'NEW-1', claimNumber: 'NEW-1' })
  })

  it('rejects rather than writes when the proposed value will not parse', async () => {
    // A value that reached the table before validation tightened, or by any
    // other route, must not land as a string in a numeric field.
    pendingProposal({ proposedValue: 'about 3k' })

    const result = await approveExternalWriteProposal('p-1', { userId: 'claimant-1', as: 'claimant' })

    expect(result).toEqual({ ok: false, reason: 'not_a_number' })
    expect(prisma.assessment.updateMany).not.toHaveBeenCalled()
    expect(vi.mocked(prisma.externalWriteProposal.update).mock.calls[0][0].data).toMatchObject({
      status: 'rejected',
      note: 'not_a_number',
    })
  })

  it('does not double-record the change', async () => {
    // updateCaseFacts already writes the feed event; calling recordCaseChange as
    // well would put one confirmation on the feed twice.
    pendingProposal()
    await approveExternalWriteProposal('p-1', { userId: 'claimant-1', as: 'claimant' })
    expect(recordCaseChange).not.toHaveBeenCalled()
  })
})

describe('approving a column proposal', () => {
  it('still goes through the original path', async () => {
    pendingProposal({ source: 'cms_inbound', field: 'caseName', currentValue: 'Old', proposedValue: 'New' })

    const result = await approveExternalWriteProposal('p-1', { userId: 'firm-user', as: 'firm' })

    expect(result.ok).toBe(true)
    expect(vi.mocked(prisma.assessment.update).mock.calls[0][0].data).toEqual({ caseName: 'New' })
    expect(recordCaseChange).toHaveBeenCalled()
    expect(prisma.assessment.updateMany).not.toHaveBeenCalled()
  })

  it('notes when it was accepted over a newer local value', async () => {
    pendingProposal({ source: 'cms_inbound', field: 'caseName', proposedValue: 'New', baseRevision: 3 })

    await approveExternalWriteProposal('p-1', { userId: 'firm-user', as: 'firm' })

    const update = vi.mocked(prisma.externalWriteProposal.update).mock.calls[0][0] as any
    expect(update.data.note).toBe('applied_over_drift')
  })
})

describe('creating a specialist proposal', () => {
  beforeEach(() => {
    prisma.$transaction.mockImplementation((fn: any) => fn(prisma))
    prisma.externalWriteProposal.create.mockResolvedValue({
      id: 'p-new',
      field: 'facts:damages.med_charges',
      currentValue: '1200',
      proposedValue: '2400',
    })
  })

  it('records the ask without touching the case', async () => {
    const result = await createSpecialistFactProposal({
      assessmentId: 'a-1',
      path: 'damages.med_charges',
      proposedValue: '2400',
      specialist: { userId: 'spec-1', label: 'Sam Reyes' },
    })

    expect(result.ok).toBe(true)
    expect(prisma.assessment.updateMany).not.toHaveBeenCalled()
    expect(prisma.assessment.update).not.toHaveBeenCalled()

    const created = vi.mocked(prisma.externalWriteProposal.create).mock.calls[0][0] as any
    expect(created.data).toMatchObject({
      field: 'facts:damages.med_charges',
      source: 'specialist',
      // Both values preserved: that is what makes the disagreement answerable.
      currentValue: '1200',
      proposedValue: '2400',
    })
  })

  it('supersedes an earlier pending ask for the same field', async () => {
    // A specialist correcting themselves mid-call should not leave the claimant
    // two versions of the same question.
    await createSpecialistFactProposal({
      assessmentId: 'a-1',
      path: 'damages.med_charges',
      proposedValue: '2400',
      specialist: { userId: 'spec-1' },
    })

    expect(vi.mocked(prisma.externalWriteProposal.updateMany).mock.calls[0][0]).toMatchObject({
      where: { assessmentId: 'a-1', field: 'facts:damages.med_charges', status: 'pending' },
      data: { status: 'superseded' },
    })
  })

  it('refuses a field outside the allowlist', async () => {
    const result = await createSpecialistFactProposal({
      assessmentId: 'a-1',
      path: 'consents.hipaa',
      proposedValue: 'true',
      specialist: { userId: 'spec-1' },
    })

    expect(result).toEqual({ ok: false, reason: 'unsupported_field' })
    expect(prisma.externalWriteProposal.create).not.toHaveBeenCalled()
  })

  it('rejects an unparseable value at the point the specialist enters it', async () => {
    // So they find out on the call, rather than the claimant hitting it days
    // later with no way to tell what was meant.
    const result = await createSpecialistFactProposal({
      assessmentId: 'a-1',
      path: 'damages.med_charges',
      proposedValue: 'about 3k',
      specialist: { userId: 'spec-1' },
    })

    expect(result).toEqual({ ok: false, reason: 'not_a_number' })
    expect(prisma.externalWriteProposal.create).not.toHaveBeenCalled()
  })
})

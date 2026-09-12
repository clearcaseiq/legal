import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { activeBindingForPhone, bindCasePhone, claimantPhoneForAssessment, revokeCasePhoneBindings } from './case-phone-binding'

function caseWith(facts: unknown, userPhone: string | null = null) {
  vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
    facts: typeof facts === 'string' ? facts : JSON.stringify(facts),
    user: { phone: userPhone },
  } as any)
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
})

describe('finding the claimant to text', () => {
  it('reads the number intake recorded for this case', async () => {
    caseWith({ plaintiffContext: { phone: '(555) 010-2456' } })

    expect(await claimantPhoneForAssessment('asm-1')).toBe('+15550102456')
  })

  it('prefers the case number over the one on the login', async () => {
    // A returning client's user row can carry a number from a previous matter.
    // The number they gave for this case is the one their attorney expects.
    caseWith({ plaintiffContext: { phone: '5550102456' } }, '5559999999')

    expect(await claimantPhoneForAssessment('asm-1')).toBe('+15550102456')
  })

  it('falls back to the login when the case has no number', async () => {
    caseWith({ plaintiffContext: {} }, '555-999-9999')

    expect(await claimantPhoneForAssessment('asm-1')).toBe('+15559999999')
  })

  it('survives a facts blob that will not parse', async () => {
    caseWith('{not json', '5550102456')

    expect(await claimantPhoneForAssessment('asm-1')).toBe('+15550102456')
  })

  it('returns nothing rather than a number that cannot be dialled', async () => {
    caseWith({ plaintiffContext: { phone: '123' } })

    expect(await claimantPhoneForAssessment('asm-1')).toBeNull()
  })
})

describe('opening the channel', () => {
  it('stores the number in the same shape the opt-out table uses', async () => {
    await bindCasePhone({ assessmentId: 'asm-1', phone: '(555) 010-2456', boundByUserId: 'user-1' })

    // Both are compared on every inbound message. A binding written in a
    // different normalisation would let documents through after a STOP.
    expect(vi.mocked(prisma.casePhoneBinding.create).mock.calls[0][0].data).toMatchObject({
      assessmentId: 'asm-1',
      phoneE164: '+15550102456',
      status: 'active',
      boundByUserId: 'user-1',
    })
  })

  it('revokes whatever that number pointed at before', async () => {
    await bindCasePhone({ assessmentId: 'asm-2', phone: '5550102456' })

    // One claimant can hold two matters. Leaving both active means guessing
    // which case a photo belongs to.
    expect(vi.mocked(prisma.casePhoneBinding.updateMany).mock.calls[0][0]).toMatchObject({
      where: { phoneE164: '+15550102456', status: 'active', assessmentId: { not: 'asm-2' } },
      data: { status: 'revoked', revokedAt: expect.any(Date) },
    })
  })

  it('reactivates rather than duplicating when the same case asks again', async () => {
    vi.mocked(prisma.casePhoneBinding.findFirst).mockResolvedValue({ id: 'bind-1' } as any)

    await bindCasePhone({ assessmentId: 'asm-1', phone: '5550102456' })

    expect(prisma.casePhoneBinding.create).not.toHaveBeenCalled()
    expect(vi.mocked(prisma.casePhoneBinding.update).mock.calls[0][0]).toMatchObject({
      where: { id: 'bind-1' },
      data: { status: 'active', revokedAt: null },
    })
  })

  it('refuses to bind a number that is not dialable', async () => {
    expect(await bindCasePhone({ assessmentId: 'asm-1', phone: 'n/a' })).toBeNull()
    expect(prisma.casePhoneBinding.create).not.toHaveBeenCalled()
  })
})

describe('resolving an inbound number', () => {
  it('only matches a binding that is still active', async () => {
    vi.mocked(prisma.casePhoneBinding.findFirst).mockResolvedValue({
      id: 'bind-1',
      assessmentId: 'asm-1',
      phoneE164: '+15550102456',
    } as any)

    const binding = await activeBindingForPhone('555-010-2456')

    expect(binding?.assessmentId).toBe('asm-1')
    expect(vi.mocked(prisma.casePhoneBinding.findFirst).mock.calls[0][0]).toMatchObject({
      where: { phoneE164: '+15550102456', status: 'active' },
    })
  })

  it('does not query at all for an unusable number', async () => {
    expect(await activeBindingForPhone('')).toBeNull()
    expect(prisma.casePhoneBinding.findFirst).not.toHaveBeenCalled()
  })
})

describe('closing the channel', () => {
  it('revokes every active binding on the case', async () => {
    vi.mocked(prisma.casePhoneBinding.updateMany).mockResolvedValue({ count: 2 } as any)

    expect(await revokeCasePhoneBindings('asm-1')).toBe(2)
    expect(vi.mocked(prisma.casePhoneBinding.updateMany).mock.calls[0][0]).toMatchObject({
      where: { assessmentId: 'asm-1', status: 'active' },
    })
  })
})

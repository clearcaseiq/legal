import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { adoptGuestCasesByEmail, assessmentContactEmails, isTransferableCaseOwner } from './guest-case-adoption'

const CLAIMANT_EMAIL = 'dana@example.com'

function assessment(overrides: Partial<any> = {}) {
  return {
    id: 'asm-1',
    userId: null,
    facts: JSON.stringify({ plaintiffContext: { email: CLAIMANT_EMAIL } }),
    user: null,
    ...overrides,
  }
}

function givenCandidates(rows: any[]) {
  vi.mocked(prisma.assessment.findMany).mockResolvedValue(rows as any)
  vi.mocked(prisma.assessment.updateMany).mockResolvedValue({ count: rows.length } as any)
  vi.mocked(prisma.evidenceFile.updateMany).mockResolvedValue({ count: 0 } as any)
}

describe('adoptGuestCasesByEmail', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  it('adopts a case that has no owner at all', async () => {
    givenCandidates([assessment()])

    const result = await adoptGuestCasesByEmail('user-1', CLAIMANT_EMAIL)

    expect(result.assessmentIds).toEqual(['asm-1'])
    expect(vi.mocked(prisma.assessment.updateMany)).toHaveBeenCalledWith({
      where: { id: { in: ['asm-1'] } },
      data: { userId: 'user-1' },
    })
  })

  it('adopts a case parked on the synthetic guest shadow user', async () => {
    givenCandidates([
      assessment({ userId: 'guest-user-1', user: { email: 'guest+asm-1@caseiq.local' } }),
    ])

    const result = await adoptGuestCasesByEmail('user-1', CLAIMANT_EMAIL)

    expect(result.assessmentIds).toEqual(['asm-1'])
  })

  // The bug this was written for: the claimant reached their account through a
  // password reset, which runs neither the localStorage association nor the
  // emailed claim link, so nothing had ever attached the case.
  it('moves the evidence files with the case, so an adopted case is not left empty', async () => {
    givenCandidates([assessment()])

    await adoptGuestCasesByEmail('user-1', CLAIMANT_EMAIL)

    expect(vi.mocked(prisma.evidenceFile.updateMany)).toHaveBeenCalledWith({
      where: { assessmentId: { in: ['asm-1'] } },
      data: { userId: 'user-1' },
    })
  })

  it('refuses a case already owned by a real account', async () => {
    givenCandidates([
      assessment({ userId: 'someone-else', user: { email: 'other@example.com' } }),
    ])

    const result = await adoptGuestCasesByEmail('user-1', CLAIMANT_EMAIL)

    expect(result.adoptedCount).toBe(0)
    expect(vi.mocked(prisma.assessment.updateMany)).not.toHaveBeenCalled()
  })

  // `contains` is only a prefilter: the address can appear anywhere in the facts
  // blob, including in fields that say nothing about who submitted the case.
  it('refuses a case that merely mentions the address somewhere in its facts', async () => {
    givenCandidates([
      assessment({
        facts: JSON.stringify({
          plaintiffContext: { email: 'someone-else@example.com' },
          incident: { narrative: `Witness can be reached at ${CLAIMANT_EMAIL}` },
        }),
      }),
    ])

    const result = await adoptGuestCasesByEmail('user-1', CLAIMANT_EMAIL)

    expect(result.adoptedCount).toBe(0)
    expect(vi.mocked(prisma.assessment.updateMany)).not.toHaveBeenCalled()
  })

  it('matches the address regardless of the case it was typed in', async () => {
    givenCandidates([
      assessment({ facts: JSON.stringify({ plaintiffContext: { email: 'Dana@Example.com' } }) }),
    ])

    const result = await adoptGuestCasesByEmail('user-1', ' DANA@example.com ')

    expect(result.assessmentIds).toEqual(['asm-1'])
  })

  it('does nothing without an email to match on', async () => {
    const result = await adoptGuestCasesByEmail('user-1', null)

    expect(result.adoptedCount).toBe(0)
    expect(vi.mocked(prisma.assessment.findMany)).not.toHaveBeenCalled()
  })

  it('survives unparseable facts rather than failing the sign-in that called it', async () => {
    givenCandidates([assessment({ facts: 'not json' })])

    const result = await adoptGuestCasesByEmail('user-1', CLAIMANT_EMAIL)

    expect(result.adoptedCount).toBe(0)
  })

  it('reports nothing adopted when the lookup throws', async () => {
    vi.mocked(prisma.assessment.findMany).mockRejectedValue(new Error('db down'))

    await expect(adoptGuestCasesByEmail('user-1', CLAIMANT_EMAIL)).resolves.toEqual({
      adoptedCount: 0,
      assessmentIds: [],
    })
  })
})

describe('isTransferableCaseOwner', () => {
  it('treats a case with no owner as transferable', () => {
    expect(isTransferableCaseOwner(null)).toBe(true)
  })

  it('treats the synthetic guest shadow user as transferable', () => {
    expect(
      isTransferableCaseOwner({ email: 'guest+asm-1@caseiq.local', passwordHash: null, provider: null })
    ).toBe(true)
  })

  // Registration upgrades this account in place rather than refusing it as a
  // duplicate, so it is not a claim by anyone. Refusing to move a case off it
  // stranded people who submitted under one address and signed up with another.
  it('treats a provisional passwordless intake account as transferable', () => {
    expect(
      isTransferableCaseOwner({ email: 'dana@example.com', passwordHash: null, provider: 'intake' })
    ).toBe(true)
  })

  it('refuses a password-backed account', () => {
    expect(
      isTransferableCaseOwner({ email: 'dana@example.com', passwordHash: 'hashed', provider: 'local' })
    ).toBe(false)
  })

  it('refuses an OAuth account, which has no password hash of its own', () => {
    expect(
      isTransferableCaseOwner({ email: 'dana@example.com', passwordHash: null, provider: 'google' })
    ).toBe(false)
  })
})

describe('assessmentContactEmails', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  it('reads the address the case recorded at submit', async () => {
    vi.mocked(prisma.intakeLead.findUnique).mockResolvedValue(null as any)

    const emails = await assessmentContactEmails(
      'asm-1',
      JSON.stringify({ plaintiffContext: { email: 'Dana@Example.com' } })
    )

    expect(emails).toEqual([CLAIMANT_EMAIL])
  })

  // A case abandoned before submit never had its facts enriched, so the lead is
  // the only place the typed-in address survives.
  it('falls back to the intake lead when the case recorded nothing', async () => {
    vi.mocked(prisma.intakeLead.findUnique).mockResolvedValue({ email: 'Dana@Example.com' } as any)

    expect(await assessmentContactEmails('asm-1', null)).toEqual([CLAIMANT_EMAIL])
  })

  it('reports both addresses when the wizard and the submission disagree', async () => {
    vi.mocked(prisma.intakeLead.findUnique).mockResolvedValue({ email: 'typo@example.com' } as any)

    const emails = await assessmentContactEmails(
      'asm-1',
      JSON.stringify({ plaintiffContext: { email: CLAIMANT_EMAIL } })
    )

    expect(emails).toEqual([CLAIMANT_EMAIL, 'typo@example.com'])
  })

  // An empty result means the case is anonymous, which callers read as "there is
  // no one this could belong to instead". A lookup failure must not be able to
  // masquerade as that.
  it('reports the recorded address even when the lead lookup fails', async () => {
    vi.mocked(prisma.intakeLead.findUnique).mockRejectedValue(new Error('db down'))

    const emails = await assessmentContactEmails(
      'asm-1',
      JSON.stringify({ plaintiffContext: { email: CLAIMANT_EMAIL } })
    )

    expect(emails).toEqual([CLAIMANT_EMAIL])
  })
})


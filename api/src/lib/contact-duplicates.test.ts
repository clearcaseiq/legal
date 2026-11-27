import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { findRecentSubmittedCaseForContact } from './contact-duplicates'

const facts = (date?: string) => JSON.stringify(date ? { incident: { date } } : {})

describe('findRecentSubmittedCaseForContact', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1' } as any)
  })

  const lookup = (incidentDate?: string) =>
    findRecentSubmittedCaseForContact({
      email: 'pat@example.com',
      claimType: 'auto',
      incidentDate,
      excludeAssessmentId: 'asm-new',
    })

  it('matches an earlier case from the same incident date', async () => {
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      { assessmentId: 'asm-old', assessment: { facts: facts('2026-03-04T00:00:00.000Z') } },
    ] as any)

    expect(await lookup('2026-03-04')).toEqual({ assessmentId: 'asm-old' })
  })

  it('treats a different incident date as a separate case', async () => {
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      { assessmentId: 'asm-old', assessment: { facts: facts('2026-02-10') } },
    ] as any)

    expect(await lookup('2026-03-04')).toBeNull()
  })

  it('still matches when either case has no incident date', async () => {
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      { assessmentId: 'asm-old', assessment: { facts: facts() } },
    ] as any)

    expect(await lookup('2026-03-04')).toEqual({ assessmentId: 'asm-old' })
    expect(await lookup(undefined)).toEqual({ assessmentId: 'asm-old' })
  })

  it('returns nothing when the contact has no account', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    expect(await lookup('2026-03-04')).toBeNull()
    expect(prisma.leadSubmission.findMany).not.toHaveBeenCalled()
  })
})

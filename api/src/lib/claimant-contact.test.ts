import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { readClaimantContact, updateClaimantContact } from './claimant-contact'

type CaseUser = {
  id?: string
  email?: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  passwordHash?: string | null
}

function caseWith(facts: unknown, user: CaseUser | null = { id: 'user-1', email: 'client@example.com' }) {
  vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
    id: 'asm-1',
    facts: typeof facts === 'string' ? facts : JSON.stringify(facts),
    userId: user?.id ?? null,
    user: user
      ? {
          id: user.id ?? 'user-1',
          email: user.email ?? 'client@example.com',
          firstName: user.firstName ?? 'Old',
          lastName: user.lastName ?? 'Name',
          phone: user.phone ?? null,
          passwordHash: user.passwordHash === undefined ? 'hashed' : user.passwordHash,
        }
      : null,
  } as any)
}

/** The facts blob written back to the assessment, parsed. */
function savedFacts(): any {
  const call = vi.mocked(prisma.assessment.update).mock.calls.at(-1)
  return JSON.parse((call?.[0] as any).data.facts)
}

function savedUserData(): any {
  return (vi.mocked(prisma.user.update).mock.calls.at(-1)?.[0] as any)?.data
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
  // The universal mock's $transaction hands back a client; run the callback
  // against the same mock so the writes inside it are observable.
  vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
    typeof fn === 'function' ? fn(prisma) : Promise.all(fn),
  )
})

describe('correcting a claimant phone number', () => {
  it('writes the case copy the SMS layer reads, not just the login', async () => {
    // The whole point of the endpoint: `claimantPhoneForAssessment` prefers
    // facts.plaintiffContext.phone, so updating only the user row would leave
    // document requests going to the number the client just corrected.
    caseWith({ plaintiffContext: { phone: '5551110000' }, incident: { type: 'mva' } })

    const result = await updateClaimantContact({ assessmentId: 'asm-1', patch: { phone: '(555) 010-2456' } })

    expect(result.ok).toBe(true)
    expect(savedFacts().plaintiffContext.phone).toBe('+15550102456')
    expect(savedUserData().phone).toBe('+15550102456')
  })

  it('leaves the rest of the facts blob intact', async () => {
    caseWith({ plaintiffContext: { phone: '5551110000' }, incident: { type: 'mva' }, painJournal: [{ day: 1 }] })

    await updateClaimantContact({ assessmentId: 'asm-1', patch: { phone: '5550102456' } })

    const facts = savedFacts()
    expect(facts.incident).toEqual({ type: 'mva' })
    expect(facts.painJournal).toEqual([{ day: 1 }])
  })

  it('refuses a number that cannot be dialled instead of storing it', async () => {
    caseWith({ plaintiffContext: {} })

    const result = await updateClaimantContact({ assessmentId: 'asm-1', patch: { phone: '123' } })

    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(prisma.assessment.update).not.toHaveBeenCalled()
  })

  it('still records the case contact when the case has no account yet', async () => {
    caseWith({ plaintiffContext: {} }, null)

    const result = await updateClaimantContact({ assessmentId: 'asm-1', patch: { phone: '5550102456' } })

    expect(result.ok).toBe(true)
    expect(savedFacts().plaintiffContext.phone).toBe('+15550102456')
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('starts a fresh context rather than failing on an unparseable blob', async () => {
    caseWith('{not json')

    const result = await updateClaimantContact({ assessmentId: 'asm-1', patch: { phone: '5550102456' } })

    expect(result.ok).toBe(true)
    expect(savedFacts().plaintiffContext.phone).toBe('+15550102456')
  })
})

describe('the sign-in address', () => {
  it('is left alone for an account with a password', async () => {
    caseWith({ plaintiffContext: {} }, { id: 'user-1', email: 'old@example.com', passwordHash: 'hashed' })

    const result = await updateClaimantContact({ assessmentId: 'asm-1', patch: { email: 'new@example.com' } })

    expect(result).toMatchObject({ ok: true, loginEmailUnchanged: true })
    expect(savedFacts().plaintiffContext.email).toBe('new@example.com')
    expect(savedUserData()?.email).toBeUndefined()
  })

  it('moves for an imported account that has never set a password', async () => {
    caseWith({ plaintiffContext: {} }, { id: 'user-1', email: 'typo@exmaple.com', passwordHash: null })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as any)

    const result = await updateClaimantContact({ assessmentId: 'asm-1', patch: { email: 'real@example.com' } })

    expect(result).toMatchObject({ ok: true, loginEmailUnchanged: false })
    expect(savedUserData().email).toBe('real@example.com')
  })

  it('refuses to collide with another account', async () => {
    caseWith({ plaintiffContext: {} }, { id: 'user-1', email: 'typo@exmaple.com', passwordHash: null })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'someone-else' } as any)

    const result = await updateClaimantContact({ assessmentId: 'asm-1', patch: { email: 'taken@example.com' } })

    expect(result).toMatchObject({ ok: false, status: 409 })
    expect(prisma.assessment.update).not.toHaveBeenCalled()
  })
})

describe('the mailing address', () => {
  it('is stored only on the user row, with no copy in the facts blob', async () => {
    // The second copy is what caused the phone number to go stale. One home.
    caseWith({ plaintiffContext: {} })

    await updateClaimantContact({
      assessmentId: 'asm-1',
      patch: { addressLine1: '123 Sample Avenue', city: 'Los Angeles', state: 'CA', postalCode: '90012' },
    })

    expect(savedUserData()).toMatchObject({
      addressLine1: '123 Sample Avenue',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90012',
    })
    expect(savedFacts().plaintiffContext.addressLine1).toBeUndefined()
  })

  it('clears a line when it is sent empty, for a claimant who moves out of a unit', async () => {
    caseWith({ plaintiffContext: {} }, { id: 'user-1', email: 'c@example.com', passwordHash: 'x' })

    await updateClaimantContact({ assessmentId: 'asm-1', patch: { addressLine2: '   ' } })

    expect(savedUserData().addressLine2).toBeNull()
  })

  it('mints the case owner when a guest case gets an address', async () => {
    // The address has nowhere else to live, so the guest owner has to exist.
    caseWith({ plaintiffContext: {} }, null)
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'guest-1' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'guest-1',
      email: 'guest+asm-1@caseiq.local',
      firstName: 'Guest',
      lastName: 'User',
      phone: null,
      passwordHash: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      postalCode: null,
    } as any)

    const result = await updateClaimantContact({ assessmentId: 'asm-1', patch: { addressLine1: '1 Main St' } })

    expect(result.ok).toBe(true)
    expect(savedUserData().addressLine1).toBe('1 Main St')
  })

  it('does not mint an owner for an edit that is not an address', async () => {
    caseWith({ plaintiffContext: {} }, null)

    await updateClaimantContact({ assessmentId: 'asm-1', patch: { phone: '5550102456' } })

    expect(prisma.user.create).not.toHaveBeenCalled()
  })
})

describe('reading the contact back', () => {
  it('reports the case copy, matching what we would text', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      facts: JSON.stringify({ plaintiffContext: { phone: '+15550102456', email: 'case@example.com' } }),
      user: { email: 'login@example.com', firstName: 'Jo', lastName: 'Smith', phone: '+15559999999' },
    } as any)

    expect(await readClaimantContact('asm-1')).toMatchObject({
      firstName: 'Jo',
      lastName: 'Smith',
      email: 'case@example.com',
      phone: '+15550102456',
    })
  })

  it('hides the synthetic guest address from the case file', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      facts: JSON.stringify({ plaintiffContext: {} }),
      user: { email: 'guest+asm-1@caseiq.local', firstName: 'Guest', lastName: 'User', phone: null },
    } as any)

    expect((await readClaimantContact('asm-1'))?.email).toBeNull()
  })
})

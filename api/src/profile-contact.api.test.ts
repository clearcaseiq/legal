/**
 * What happens when a claimant corrects their own details.
 *
 * Two things that used to be true here: the profile screen refused to change
 * the email at all, and every other edit wrote only the user row. Since the
 * firm's screens and the SMS layer both prefer the case copy in
 * `Assessment.facts`, a claimant who fixed their phone number got a success
 * message while the platform went on texting the old one (CP-848).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

const { verifyMock, noticeMock } = vi.hoisted(() => ({ verifyMock: vi.fn(), noticeMock: vi.fn() }))
vi.mock('./lib/email-verification', () => ({
  issueEmailVerification: verifyMock,
  notifyEmailAddressChanged: noticeMock,
}))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()

const CLAIMANT = {
  id: 'user-1',
  email: 'old@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  role: 'client',
  isActive: true,
}
const auth = { Authorization: `Bearer ${generateToken(CLAIMANT.id)}` }

const save = (body: Record<string, unknown>) => request(app).put('/v1/auth/me').set(auth).send(body)

/** The facts written back to the claimant's case, parsed. */
const savedFacts = () =>
  JSON.parse((vi.mocked(prisma.assessment.update).mock.calls.at(-1)?.[0] as any).data.facts)

const savedUserData = () => (vi.mocked(prisma.user.update).mock.calls.at(-1)?.[0] as any)?.data

beforeEach(() => {
  resetUniversalPrismaMock()
  verifyMock.mockReset().mockResolvedValue(true)
  noticeMock.mockReset().mockResolvedValue(true)

  // Both the session lookup and the collision check come through here.
  vi.mocked(prisma.user.findUnique).mockImplementation(async (args: any) =>
    args?.where?.email ? null : (CLAIMANT as any),
  )
  vi.mocked(prisma.user.update).mockImplementation(async (args: any) => ({
    ...CLAIMANT,
    ...args.data,
  }))
  vi.mocked(prisma.assessment.findMany).mockResolvedValue([
    { id: 'asm-1', facts: JSON.stringify({ plaintiffContext: { phone: '+15551110000' }, incident: { type: 'mva' } }) },
  ] as any)
})

describe('a claimant editing their own contact details', () => {
  it('carries a corrected phone number into the case copy the platform texts', async () => {
    const res = await save({ phone: '(555) 010-2456' })

    expect(res.status).toBe(200)
    expect(savedUserData().phone).toBe('+15550102456')
    expect(savedFacts().plaintiffContext.phone).toBe('+15550102456')
  })

  it('leaves the intake answers in the case untouched', async () => {
    await save({ phone: '(555) 010-2456' })

    expect(savedFacts().incident).toEqual({ type: 'mva' })
  })

  it('saves a mailing address, which lives only on the account', async () => {
    await save({ addressLine1: '123 Sample Avenue', city: 'Los Angeles', postalCode: '90012' })

    expect(savedUserData()).toMatchObject({
      addressLine1: '123 Sample Avenue',
      city: 'Los Angeles',
      postalCode: '90012',
    })
  })
})

describe('a claimant moving their sign-in address', () => {
  it('changes the address and asks the new inbox to confirm it', async () => {
    const res = await save({ email: 'New@Example.com' })

    expect(res.status).toBe(200)
    expect(savedUserData().email).toBe('new@example.com')
    expect(verifyMock).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com' }))
    expect(res.body.emailVerificationSent).toBe(true)
  })

  it('tells the old address, which is the only warning a hijacked account gets', async () => {
    await save({ email: 'new@example.com' })

    expect(noticeMock).toHaveBeenCalledWith(
      expect.objectContaining({ previousEmail: 'old@example.com', newEmail: 'new@example.com' }),
    )
  })

  it('marks the account unverified until the link is used', async () => {
    await save({ email: 'new@example.com' })

    expect(savedUserData().emailVerified).toBe(false)
  })

  it('updates the case copy, so the firm writes to the address that works', async () => {
    await save({ email: 'new@example.com' })

    expect(savedFacts().plaintiffContext.email).toBe('new@example.com')
  })

  it('refuses an address another account already uses, and changes nothing', async () => {
    vi.mocked(prisma.user.findUnique).mockImplementation(async (args: any) =>
      args?.where?.email ? ({ id: 'user-2' } as any) : (CLAIMANT as any),
    )

    const res = await save({ email: 'taken@example.com' })

    expect(res.status).toBe(409)
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(verifyMock).not.toHaveBeenCalled()
  })

  it('rejects an address that is not one', async () => {
    const res = await save({ email: 'not-an-address' })

    expect(res.status).toBe(400)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('sends nothing when the address was submitted unchanged', async () => {
    // Saving the form without touching the email posts it back as it stands.
    const res = await save({ email: 'old@example.com', phone: '(555) 010-2456' })

    expect(res.status).toBe(200)
    expect(verifyMock).not.toHaveBeenCalled()
    expect(noticeMock).not.toHaveBeenCalled()
    expect(savedUserData()).not.toHaveProperty('emailVerified')
  })
})

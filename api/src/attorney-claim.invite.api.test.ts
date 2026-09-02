/**
 * Invitations to claim a directory profile.
 *
 * The states an operator relies on were previously half-built: an invite left
 * no mark on the attorney, and "declined" existed only as a comment in the
 * schema. These cover the parts where getting it wrong is expensive — pestering
 * someone who said no, and letting a claim confer lead eligibility.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))
vi.mock('./lib/claims', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/claims')>()
  return { ...actual, sendClaimEmail: vi.fn().mockResolvedValue(true) }
})

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'
import { sendClaimEmail } from './lib/claims'

const app = buildApp()

const adminUser = {
  id: 'user-admin-1',
  email: 'admin@test.local',
  firstName: 'Ada',
  lastName: 'Ops',
  role: 'admin',
  isActive: true,
  adminCapabilities: JSON.stringify(['network']),
}

const adminAuth = { Authorization: `Bearer ${generateToken(adminUser.id)}` }

const attorney = (overrides: Record<string, unknown> = {}) => ({
  id: 'att-1',
  name: 'Avery Law',
  email: 'avery@firm.test',
  phone: null,
  claimStatus: 'unclaimed',
  isVerified: false,
  lawFirmId: null,
  specialties: null,
  ...overrides,
})

const claim = (overrides: Record<string, unknown> = {}) => ({
  id: 'claim-1',
  attorneyId: 'att-1',
  token: 'tok-1',
  email: 'avery@firm.test',
  phone: null,
  method: null,
  codeHash: null,
  codeExpiresAt: null,
  attempts: 0,
  status: 'sent',
  expiresAt: new Date(Date.now() + 86_400_000),
  meta: null,
  ...overrides,
})

/** The attorney record the update calls write to, so assertions can read it back. */
function updatedAttorneyData(): Record<string, unknown> | undefined {
  const calls = vi.mocked((prisma as any).attorney.update).mock.calls
  return calls.length ? (calls[calls.length - 1][0] as any).data : undefined
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked(sendClaimEmail).mockClear()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as any)
})

describe('POST /v1/attorney-claim/invite', () => {
  it('marks the attorney as pending so an invited profile is distinguishable', async () => {
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue(attorney() as any)

    const res = await request(app)
      .post('/v1/attorney-claim/invite')
      .set(adminAuth)
      .send({ attorneyId: 'att-1' })

    expect(res.status).toBe(200)
    expect(updatedAttorneyData()).toMatchObject({ claimStatus: 'pending' })
    expect(sendClaimEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'avery@firm.test',
        cta: expect.objectContaining({ label: 'Claim your profile' }),
      })
    )
  })

  it('retires any live invite so a re-send leaves exactly one working link', async () => {
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue(attorney({ claimStatus: 'pending' }) as any)

    await request(app).post('/v1/attorney-claim/invite').set(adminAuth).send({ attorneyId: 'att-1' })

    expect((prisma as any).profileClaim.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ['sent', 'verified'] } }),
        data: { status: 'expired' },
      })
    )
  })

  it('refuses to re-invite someone who declined, unless it is deliberate', async () => {
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue(attorney({ claimStatus: 'declined' }) as any)

    const blocked = await request(app)
      .post('/v1/attorney-claim/invite')
      .set(adminAuth)
      .send({ attorneyId: 'att-1' })

    expect(blocked.status).toBe(409)
    expect(blocked.body.code).toBe('PREVIOUSLY_DECLINED')
    expect(sendClaimEmail).not.toHaveBeenCalled()

    const forced = await request(app)
      .post('/v1/attorney-claim/invite')
      .set(adminAuth)
      .send({ attorneyId: 'att-1', force: true })

    expect(forced.status).toBe(200)
    expect(sendClaimEmail).toHaveBeenCalledOnce()
  })
})

describe('POST /v1/attorney-claim/decline', () => {
  it('records the refusal on the attorney, not just the invite', async () => {
    vi.mocked((prisma as any).profileClaim.findUnique).mockResolvedValue(claim() as any)
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue(attorney() as any)

    const res = await request(app).post('/v1/attorney-claim/decline').send({ token: 'tok-1' })

    expect(res.status).toBe(200)
    expect((prisma as any).profileClaim.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'rejected' } })
    )
    // Left only on the claim, the next invite pass would email them again.
    expect(updatedAttorneyData()).toMatchObject({ claimStatus: 'declined' })
  })

  it('treats a second decline as success rather than an error', async () => {
    vi.mocked((prisma as any).profileClaim.findUnique).mockResolvedValue(
      claim({ status: 'rejected' }) as any
    )
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue(
      attorney({ claimStatus: 'declined' }) as any
    )

    const res = await request(app).post('/v1/attorney-claim/decline').send({ token: 'tok-1' })

    expect(res.status).toBe(200)
    expect((prisma as any).profileClaim.update).not.toHaveBeenCalled()
  })

  it('refuses to overwrite a profile that was already claimed', async () => {
    vi.mocked((prisma as any).profileClaim.findUnique).mockResolvedValue(
      claim({ status: 'completed' }) as any
    )
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue(
      attorney({ claimStatus: 'claimed' }) as any
    )

    const res = await request(app).post('/v1/attorney-claim/decline').send({ token: 'tok-1' })

    expect(res.status).toBe(409)
  })
})

describe('POST /v1/attorney-claim/complete', () => {
  const body = {
    token: 'tok-1',
    password: 'password123',
    firstName: 'Avery',
    lastName: 'Law',
  }

  // The attorney may still hold the original email, so a refusal that only
  // blocked new invites could be undone by clicking the old link.
  it('cannot be completed once the invitation was declined', async () => {
    vi.mocked((prisma as any).profileClaim.findUnique).mockResolvedValue(
      claim({ status: 'rejected' }) as any
    )
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue(
      attorney({ claimStatus: 'declined' }) as any
    )

    const res = await request(app).post('/v1/attorney-claim/complete').send(body)

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('CLAIM_DECLINED')
  })

  // Claiming proves control of the address on file. It is not a decision that
  // this attorney should be sent cases, which is what isVerified gates.
  it('claims the profile without granting lead eligibility', async () => {
    vi.mocked((prisma as any).profileClaim.findUnique).mockResolvedValue(
      claim({ status: 'verified' }) as any
    )
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue(attorney() as any)
    vi.mocked(prisma.user.findUnique).mockImplementation((async (args: any) =>
      args?.where?.id === adminUser.id ? adminUser : null) as any)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-new-1',
      email: 'avery@firm.test',
      firstName: 'Avery',
      lastName: 'Law',
    } as any)

    const res = await request(app).post('/v1/attorney-claim/complete').send(body)

    expect(res.status).toBe(201)
    const data = updatedAttorneyData()
    expect(data).toMatchObject({ claimStatus: 'claimed' })
    expect(data).not.toHaveProperty('isVerified')
  })
})

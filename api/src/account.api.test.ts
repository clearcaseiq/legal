import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))
vi.mock('./lib/platform-notifications', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/platform-notifications')>()),
  notifyAdmins: vi.fn(async () => 1),
}))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'
import { notifyAdmins } from './lib/platform-notifications'

const app = buildApp()
const passwordHash = bcrypt.hashSync('correct-pass', 4)

const claimant = {
  id: 'user-1',
  email: 'claimant@test.local',
  firstName: 'Casey',
  lastName: 'Claimant',
  phone: '+15555550100',
  role: 'client',
  isActive: true,
  emailVerified: true,
  sessionVersion: 0,
  passwordHash,
  mfaSecret: 'enc-secret',
}
const auth = { Authorization: `Bearer ${generateToken(claimant.id)}` }

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked(notifyAdmins).mockClear()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(claimant as any)
})

describe('GET /v1/account/export', () => {
  it('returns the account and its records as a download, without credentials', async () => {
    vi.mocked((prisma as any).assessment.findMany).mockResolvedValue([
      { id: 'a1', userId: 'user-1', facts: '{"injuries":"wrist"}' },
    ])

    const res = await request(app).get('/v1/account/export').set(auth)

    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="clearcaseiq-data-/)
    expect(res.body.account.email).toBe('claimant@test.local')
    expect(res.body.account.passwordHash).toBeUndefined()
    expect(res.body.account.mfaSecret).toBeUndefined()
    expect(res.body.account.sessionVersion).toBeUndefined()
    expect(res.body.assessments[0].facts).toEqual({ injuries: 'wrist' })
  })

  it('requires sign-in', async () => {
    const res = await request(app).get('/v1/account/export')
    expect(res.status).toBe(401)
  })
})

describe('POST /v1/account/delete', () => {
  it('requires the typed confirmation', async () => {
    const res = await request(app).post('/v1/account/delete').set(auth).send({ password: 'correct-pass' })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('CONFIRMATION_REQUIRED')
  })

  it('requires the current password', async () => {
    const res = await request(app)
      .post('/v1/account/delete')
      .set(auth)
      .send({ confirm: 'DELETE', password: 'wrong' })
    expect(res.status).toBe(401)
    expect((prisma as any).assessment.deleteMany).not.toHaveBeenCalled()
  })

  it('sends attorney and staff accounts to support', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...claimant, role: 'attorney' } as any)
    const res = await request(app)
      .post('/v1/account/delete')
      .set(auth)
      .send({ confirm: 'DELETE', password: 'correct-pass' })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('DELETION_REQUIRES_SUPPORT')
  })

  it('deletes unshared cases, keeps shared ones with authorization withdrawn, and strips the account', async () => {
    const db = prisma as any
    db.assessment.findMany.mockResolvedValue([{ id: 'a-draft' }, { id: 'a-shared' }])
    db.introduction.findMany.mockResolvedValue([{ assessmentId: 'a-shared' }])
    db.leadSubmission.findMany.mockResolvedValue([])

    const res = await request(app)
      .post('/v1/account/delete')
      .set(auth)
      .send({ confirm: 'DELETE', password: 'correct-pass' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ deleted: true, deletedAssessments: 1, retainedAssessments: 1 })

    expect(db.assessment.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['a-draft'] }, userId: 'user-1' } })
    // The shared case's authorization is withdrawn, so no further firm is contacted.
    expect(db.consent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assessmentId: 'a-shared', consentType: 'attorney_share' }),
      }),
    )

    const update = db.user.update.mock.calls[0][0]
    expect(update.where).toEqual({ id: 'user-1' })
    expect(update.data).toMatchObject({
      email: 'deleted-user-1@deleted.clearcaseiq.invalid',
      phone: null,
      passwordHash: null,
      isActive: false,
      sessionVersion: { increment: 1 },
    })
    // The User row itself is never deleted: that would cascade into the shared case.
    expect(db.user.delete).not.toHaveBeenCalled()
    expect(notifyAdmins).toHaveBeenCalledOnce()
    expect(JSON.stringify(vi.mocked(notifyAdmins).mock.calls[0][0])).not.toContain('claimant@test.local')
  })

  it('lets an account created with Google delete with the confirmation alone', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...claimant, passwordHash: null } as any)
    const res = await request(app).post('/v1/account/delete').set(auth).send({ confirm: 'DELETE' })
    expect(res.status).toBe(200)
  })
})

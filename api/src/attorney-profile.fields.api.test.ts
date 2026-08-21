import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()
const attorneyUser = {
  id: 'user-att-1',
  email: 'attorney@test.local',
  firstName: 'Avery',
  lastName: 'Law',
  isActive: true,
}

const authHeader = { Authorization: `Bearer ${generateToken(attorneyUser.id)}` }

/** The fields the upsert would have written, as the route computed them. */
async function putProfile(body: Record<string, unknown>) {
  const res = await request(app).put('/v1/attorney-profile/profile').set(authHeader).send(body)
  expect(res.status).toBe(200)
  const call = vi.mocked(prisma.attorneyProfile.upsert).mock.calls.at(-1)?.[0] as any
  return call.update as Record<string, unknown>
}

/** Pretends the attorney already has this many years of practice on file. */
function storedYearsExperience(years: number) {
  vi.mocked(prisma.attorneyProfile.findUnique).mockResolvedValue({ yearsExperience: years } as any)
}

describe('PUT /v1/attorney-profile/profile — experience and language fluency', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue({
      id: 'att-1',
      email: attorneyUser.email,
      name: 'Avery Law',
    } as any)
    vi.mocked(prisma.attorneyProfile.upsert).mockResolvedValue({ id: 'prof-1' } as any)
    storedYearsExperience(0)
  })

  describe('years handling personal injury', () => {
    it('stores a value that fits inside the years of practice', async () => {
      const update = await putProfile({ yearsExperience: 15, yearsPiExperience: 12 })
      expect(update.yearsExperience).toBe(15)
      expect(update.yearsPiExperience).toBe(12)
    })

    it('caps PI years at the years of practice sent alongside it', async () => {
      // Claiming 30 years of injury work inside a 15 year career is impossible.
      const update = await putProfile({ yearsExperience: 15, yearsPiExperience: 30 })
      expect(update.yearsPiExperience).toBe(15)
    })

    it('caps PI years at the stored years of practice when only PI is sent', async () => {
      storedYearsExperience(9)
      const update = await putProfile({ yearsPiExperience: 40 })
      expect(update.yearsPiExperience).toBe(9)
    })

    it('leaves the stored value alone when PI years are omitted', async () => {
      const update = await putProfile({ bio: 'unchanged' })
      expect(update.yearsPiExperience).toBeUndefined()
    })

    it('refuses a negative value', async () => {
      storedYearsExperience(20)
      const update = await putProfile({ yearsPiExperience: -5 })
      expect(update.yearsPiExperience).toBe(0)
    })
  })

  describe('language fluency', () => {
    it('keeps known levels for languages being saved', async () => {
      const update = await putProfile({
        languages: ['English', 'Spanish'],
        languageProficiency: { English: 'native', Spanish: 'professional' },
      })
      expect(JSON.parse(update.languageProficiency as string)).toEqual({
        English: 'native',
        Spanish: 'professional',
      })
    })

    it('drops a level that is not one of the offered options', async () => {
      const update = await putProfile({
        languages: ['English', 'Klingon'],
        languageProficiency: { English: 'native', Klingon: 'fluent-ish' },
      })
      expect(JSON.parse(update.languageProficiency as string)).toEqual({ English: 'native' })
    })

    it('drops fluency for a language the attorney is not saving', async () => {
      // Otherwise removing a language would leave its level behind forever.
      const update = await putProfile({
        languages: ['English'],
        languageProficiency: { English: 'native', Spanish: 'professional' },
      })
      expect(JSON.parse(update.languageProficiency as string)).toEqual({ English: 'native' })
    })

    it('normalises the casing of a level', async () => {
      const update = await putProfile({
        languages: ['Spanish'],
        languageProficiency: { Spanish: 'Professional' },
      })
      expect(JSON.parse(update.languageProficiency as string)).toEqual({ Spanish: 'professional' })
    })

    it('ignores a payload that is not an object', async () => {
      const update = await putProfile({ languages: ['English'], languageProficiency: ['native'] })
      expect(update.languageProficiency).toBeUndefined()
    })

    it('leaves the stored map alone when fluency is omitted', async () => {
      const update = await putProfile({ languages: ['English'] })
      expect(update.languageProficiency).toBeUndefined()
    })
  })
})

/**
 * A case result carries a "Verified" badge that only an admin review grants.
 * Every attorney-facing write has to refuse a status the attorney set on their
 * own result, and editing the facts of an already-verified result has to send
 * it back for review rather than keep the badge.
 */
describe('case results — attorneys cannot verify themselves', () => {
  const STORED = {
    id: 'result-1',
    attorneyId: 'att-1',
    caseType: 'Auto Accident',
    resultType: 'settlement',
    settlementAmount: 250000,
    caseDescription: 'Rear-end collision',
    date: '2024-03-01',
    venue: 'Kern County',
    caseNumber: 'CV-1',
    status: 'verified',
    reviewNote: null,
    reviewedById: 'admin-1',
    reviewedAt: new Date('2024-04-01'),
    createdAt: new Date('2024-03-15'),
  }

  /** The data the route handed to the table for the last write. */
  const lastWrite = (op: 'create' | 'update') =>
    (vi.mocked((prisma as any).attorneyCaseResult[op]).mock.calls.at(-1)?.[0] as any).data

  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue({
      id: 'att-1',
      email: attorneyUser.email,
      name: 'Avery Law',
    } as any)
    vi.mocked(prisma.attorneyProfile.upsert).mockResolvedValue({ id: 'prof-1' } as any)
    vi.mocked(prisma.attorneyProfile.findUnique).mockResolvedValue({
      id: 'prof-1',
      yearsExperience: 20,
    } as any)
    vi.mocked((prisma as any).attorneyCaseResult.findFirst).mockResolvedValue(STORED as any)
    vi.mocked((prisma as any).attorneyCaseResult.update).mockImplementation((args: any) =>
      Promise.resolve({ ...STORED, ...args.data }),
    )
    vi.mocked((prisma as any).attorneyCaseResult.deleteMany).mockResolvedValue({ count: 1 } as any)
  })

  it('files a brand new result as pending however the client labels it', async () => {
    const res = await request(app)
      .post('/v1/attorney-profile/verified-verdicts')
      .set(authHeader)
      .send({ caseType: 'Dog Bite', settlementAmount: 90000, status: 'verified' })

    expect(res.status).toBe(200)
    expect(lastWrite('create').status).toBe('pending')
  })

  it('ties a new result to the signed-in attorney, not one named in the body', async () => {
    await request(app)
      .post('/v1/attorney-profile/verified-verdicts')
      .set(authHeader)
      .send({ caseType: 'Dog Bite', attorneyId: 'someone-else' })

    expect(lastWrite('create').attorneyId).toBe('att-1')
  })

  it('refuses a result with no case type', async () => {
    const res = await request(app)
      .post('/v1/attorney-profile/verified-verdicts')
      .set(authHeader)
      .send({ settlementAmount: 90000 })

    expect(res.status).toBe(400)
  })

  it('ignores a verified status sent to the update', async () => {
    const res = await request(app)
      .put('/v1/attorney-profile/verified-verdicts/result-1')
      .set(authHeader)
      .send({ ...STORED, status: 'verified', caseDescription: 'Corrected wording' })

    expect(res.status).toBe(200)
    expect(lastWrite('update')).not.toHaveProperty('status')
  })

  it('sends an already-verified result back for review when the amount changes', async () => {
    // Otherwise a modest result could be approved and then rewritten upward.
    await request(app)
      .put('/v1/attorney-profile/verified-verdicts/result-1')
      .set(authHeader)
      .send({ ...STORED, settlementAmount: 2500000 })

    expect(lastWrite('update')).toMatchObject({
      status: 'pending',
      reviewedById: null,
      reviewedAt: null,
      reviewNote: null,
    })
  })

  it('keeps the badge when only the description is reworded', async () => {
    await request(app)
      .put('/v1/attorney-profile/verified-verdicts/result-1')
      .set(authHeader)
      .send({ ...STORED, caseDescription: 'Rear-end collision on Highway 99' })

    expect(lastWrite('update')).not.toHaveProperty('status')
  })

  it('will not update a result belonging to another attorney', async () => {
    vi.mocked((prisma as any).attorneyCaseResult.findFirst).mockResolvedValue(null)

    const res = await request(app)
      .put('/v1/attorney-profile/verified-verdicts/someone-elses')
      .set(authHeader)
      .send({ caseType: 'Auto Accident' })

    expect(res.status).toBe(404)
  })

  it('scopes a delete to the signed-in attorney', async () => {
    await request(app)
      .delete('/v1/attorney-profile/verified-verdicts/result-1')
      .set(authHeader)

    const where = (vi.mocked((prisma as any).attorneyCaseResult.deleteMany).mock.calls.at(-1)?.[0] as any)
      .where
    expect(where).toEqual({ id: 'result-1', attorneyId: 'att-1' })
  })

  it('no longer lets the bulk profile save touch case results at all', async () => {
    const update = await putProfile({
      verifiedVerdicts: [{ id: 'result-1', caseType: 'Auto Accident', status: 'verified' }],
    })
    expect(update.verifiedVerdicts).toBeUndefined()
  })
})

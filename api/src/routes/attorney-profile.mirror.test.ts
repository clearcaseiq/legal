/**
 * Two things the profile save has to get right, both reported from QA.
 *
 * Practice areas live in two columns and only one was written, so a plaintiff
 * kept seeing whatever the attorney chose at registration. And office locations
 * were read from the attorney's own (empty) column even for an attorney whose
 * offices are owned by their firm, so the panel that says "Managed by your
 * firm" showed "No offices added".
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

vi.mock('../lib/prisma', () => ({
  prisma: {
    attorney: { findUnique: vi.fn(), update: vi.fn() },
    attorneyProfile: { findUnique: vi.fn(), upsert: vi.fn(), create: vi.fn() },
    attorneyCaseResult: { findMany: vi.fn().mockResolvedValue([]) },
    firmOffice: { findMany: vi.fn() },
  },
}))

vi.mock('../lib/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', email: 'dana@firm.test', emailVerified: true }
    next()
  },
}))

vi.mock('../lib/object-storage', () => ({ replicateUploads: vi.fn() }))

import { prisma } from '../lib/prisma'
import router from './attorney-profile'

const app = express()
app.use(express.json())
app.use('/v1/attorney-profile', router)

const ATTORNEY = {
  id: 'att-1',
  name: 'Dana Reyes',
  email: 'dana@firm.test',
  specialties: JSON.stringify(['vehicle']),
  venues: JSON.stringify(['CA']),
  lawFirm: {
    id: 'firm-1',
    name: 'Reyes Injury Law',
    address: '500 Market St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94105',
    phone: '415-555-0100',
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.attorney.findUnique).mockResolvedValue(ATTORNEY as never)
  vi.mocked(prisma.attorney.update).mockResolvedValue({} as never)
  vi.mocked(prisma.attorneyProfile.upsert).mockResolvedValue({ id: 'p1' } as never)
  vi.mocked(prisma.firmOffice.findMany).mockResolvedValue([] as never)
})

describe('practice areas reach the record routing reads', () => {
  const save = (body: Record<string, unknown>) =>
    request(app).put('/v1/attorney-profile/profile').send(body)

  it('mirrors edited specialties onto the attorney record', async () => {
    vi.mocked(prisma.attorneyProfile.findUnique).mockResolvedValue({
      id: 'p1',
      attorney: ATTORNEY,
    } as never)

    await save({ specialties: ['vehicle', 'dog_bite'] }).expect(200)

    const update = vi.mocked(prisma.attorney.update).mock.calls[0][0]
    expect(JSON.parse(String(update.data.specialties))).toEqual(['vehicle', 'dog_bite'])
  })

  it('drops the display-label fallback rather than writing it', async () => {
    // The client sends "Personal Injury" when an attorney has none set; storing
    // that would stop the attorney matching any case type at all.
    vi.mocked(prisma.attorneyProfile.findUnique).mockResolvedValue({
      id: 'p1',
      attorney: ATTORNEY,
    } as never)

    await save({ specialties: ['Personal Injury'] }).expect(200)

    expect(vi.mocked(prisma.attorney.update).mock.calls[0][0].data.specialties).toBeUndefined()
  })

  it('leaves the stored value alone when the payload omits specialties', async () => {
    vi.mocked(prisma.attorneyProfile.findUnique).mockResolvedValue({
      id: 'p1',
      attorney: ATTORNEY,
    } as never)

    await save({ bio: 'Updated bio' }).expect(200)

    expect(vi.mocked(prisma.attorney.update).mock.calls[0][0].data.specialties).toBeUndefined()
  })
})

describe('office locations come from the firm that owns them', () => {
  it('serves the firm offices, not the attorney-owned column', async () => {
    vi.mocked(prisma.firmOffice.findMany).mockResolvedValue([
      { name: 'Downtown', address: '1 Main St', city: 'Fresno', state: 'CA', phone: '559-555-0111' },
    ] as never)
    vi.mocked(prisma.attorneyProfile.findUnique).mockResolvedValue({
      id: 'p1',
      firmLocations: null,
      attorney: ATTORNEY,
    } as never)

    const res = await request(app).get('/v1/attorney-profile/profile').expect(200)

    expect(JSON.parse(res.body.firmLocations)).toEqual([
      { name: 'Downtown', address: '1 Main St', city: 'Fresno', state: 'CA', zip: '', phone: '559-555-0111' },
    ])
  })

  it('falls back to the firm address when the firm has no offices recorded', async () => {
    vi.mocked(prisma.attorneyProfile.findUnique).mockResolvedValue({
      id: 'p1',
      firmLocations: null,
      attorney: ATTORNEY,
    } as never)

    const res = await request(app).get('/v1/attorney-profile/profile').expect(200)

    expect(JSON.parse(res.body.firmLocations)).toEqual([
      {
        name: 'Reyes Injury Law',
        address: '500 Market St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
        phone: '415-555-0100',
      },
    ])
  })

  it('leaves a solo attorney reading their own column', async () => {
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue({
      ...ATTORNEY,
      lawFirm: null,
    } as never)
    const own = JSON.stringify([{ address: '9 Solo Way', city: 'Davis', state: 'CA', zip: '95616' }])
    vi.mocked(prisma.attorneyProfile.findUnique).mockResolvedValue({
      id: 'p1',
      firmLocations: own,
      attorney: { ...ATTORNEY, lawFirm: null },
    } as never)

    const res = await request(app).get('/v1/attorney-profile/profile').expect(200)

    expect(res.body.firmLocations).toBe(own)
    expect(prisma.firmOffice.findMany).not.toHaveBeenCalled()
  })
})

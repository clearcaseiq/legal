/**
 * POST /v1/intake-visits is public and fires before the visitor has given us
 * anything, so these pin down how little it accepts and that a reload of
 * Step 1 is the same visit.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

vi.mock('../lib/prisma', () => import('../test/universalPrismaMock'))

import router from './intake-visits'
import { prisma } from '../lib/prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'

const app = express()
app.use(express.json())
app.use('/v1/intake-visits', router)

const ID = '3f2b8c1e-6d4a-4f7e-9b2c-1a5d8e7f6c3b'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'

beforeEach(() => {
  resetUniversalPrismaMock()
})

const upserts = () => vi.mocked(prisma.intakeVisit.upsert).mock.calls.map((call) => call[0] as any)

describe('POST /v1/intake-visits', () => {
  it('records the entry page, campaign and device class, and nothing else', async () => {
    const res = await request(app)
      .post('/v1/intake-visits')
      .set('User-Agent', IPHONE)
      .send({
        id: ID,
        landingPath: '/',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'pi-la',
        email: 'someone@example.com',
        injury: 'whiplash',
      })

    expect(res.status).toBe(204)
    expect(upserts()[0]).toEqual({
      where: { id: ID },
      create: {
        id: ID,
        landingPath: '/',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'pi-la',
        deviceType: 'mobile',
      },
      update: {},
    })
  })

  it('is the same visit when Step 1 is reloaded: the first record is never overwritten', async () => {
    await request(app).post('/v1/intake-visits').send({ id: ID, landingPath: '/' })
    await request(app).post('/v1/intake-visits').send({ id: ID, landingPath: '/elsewhere' })

    expect(upserts()).toHaveLength(2)
    for (const call of upserts()) {
      expect(call.where).toEqual({ id: ID })
      expect(call.update).toEqual({})
    }
  })

  it('rejects an id that is not a UUID', async () => {
    const res = await request(app).post('/v1/intake-visits').send({ id: 'lead-123' })
    expect(res.status).toBe(400)
    expect(prisma.intakeVisit.upsert).not.toHaveBeenCalled()
  })

  it('rejects an oversized landing path', async () => {
    const res = await request(app)
      .post('/v1/intake-visits')
      .send({ id: ID, landingPath: `/${'a'.repeat(600)}` })
    expect(res.status).toBe(400)
  })
})

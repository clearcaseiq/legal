/**
 * The two ways an attorney's Zoom account gets connected: our Connect button
 * (Zoom returns a signed state naming the attorney) and the Zoom Marketplace
 * "Add" button (Zoom returns no state, so the web app finishes it once the
 * attorney is signed in).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

const { upsertMock } = vi.hoisted(() => ({ upsertMock: vi.fn() }))

vi.mock('../lib/prisma', () => import('../test/universalPrismaMock'))
vi.mock('../lib/zoom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/zoom')>()),
  upsertZoomConnectionFromCode: upsertMock,
  getAttorneyZoomConnection: vi.fn().mockResolvedValue({
    externalAccountEmail: 'att@firm.test',
    displayName: 'A',
    syncStatus: 'connected',
    updatedAt: new Date(),
  }),
  isZoomConfigured: vi.fn().mockReturnValue(true),
}))

import router from './attorney-zoom'
import { prisma } from '../lib/prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { generateToken } from '../lib/auth'

const app = express()
app.use(express.json())
app.use('/v1/attorney-zoom', router)

const auth = { Authorization: `Bearer ${generateToken('user-att-1')}` }

beforeEach(() => {
  resetUniversalPrismaMock()
  upsertMock.mockReset().mockResolvedValue(undefined)
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'user-att-1',
    email: 'att@firm.test',
    role: 'attorney',
    isActive: true,
  } as any)
  vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-1', email: 'att@firm.test', name: 'A' } as any)
})

describe('GET /callback', () => {
  it('sends a Marketplace install, which has no state, to the web connect page with its code', async () => {
    const res = await request(app).get('/v1/attorney-zoom/callback?code=abc123')

    expect(res.status).toBe(302)
    const location = new URL(res.headers.location)
    expect(location.pathname).toBe('/connect/zoom')
    expect(location.searchParams.get('code')).toBe('abc123')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('still reports an error when Zoom sends no code at all', async () => {
    const res = await request(app).get('/v1/attorney-zoom/callback')

    expect(new URL(res.headers.location).searchParams.get('zoom_error')).toBe('missing_callback_params')
  })

  it('rejects a forged state rather than connecting anyone', async () => {
    const res = await request(app).get('/v1/attorney-zoom/callback?code=abc&state=not-a-jwt')

    expect(new URL(res.headers.location).searchParams.get('zoom_sync')).toBe('error')
    expect(upsertMock).not.toHaveBeenCalled()
  })
})

describe('POST /install', () => {
  it('connects the signed-in attorney with the Marketplace code', async () => {
    const res = await request(app).post('/v1/attorney-zoom/install').set(auth).send({ code: 'abc123' })

    expect(res.status).toBe(200)
    expect(upsertMock).toHaveBeenCalledWith({ attorneyId: 'att-1', code: 'abc123' })
    expect(res.body.connected).toBe(true)
  })

  it('requires a signed-in user', async () => {
    const res = await request(app).post('/v1/attorney-zoom/install').send({ code: 'abc123' })
    expect(res.status).toBe(401)
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('refuses a user with no attorney profile', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue(null)
    const res = await request(app).post('/v1/attorney-zoom/install').set(auth).send({ code: 'abc123' })
    expect(res.status).toBe(403)
  })

  it('reports a code Zoom will not accept without leaking the reason', async () => {
    upsertMock.mockRejectedValue(new Error('Invalid authorization code abc123'))
    const res = await request(app).post('/v1/attorney-zoom/install').set(auth).send({ code: 'abc123' })
    expect(res.status).toBe(400)
    expect(res.body.error).not.toContain('abc123')
  })

  it('rejects a missing code', async () => {
    const res = await request(app).post('/v1/attorney-zoom/install').set(auth).send({})
    expect(res.status).toBe(400)
  })
})

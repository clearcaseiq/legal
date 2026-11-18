import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findKey: vi.fn(),
  stampKey: vi.fn().mockResolvedValue({}),
  findExport: vi.fn(),
  audit: vi.fn().mockResolvedValue({}),
}))

vi.mock('./lib/prisma', () => ({
  prisma: {
    syncApiKey: { findUnique: mocks.findKey, update: mocks.stampKey },
    dataExportRun: { findFirst: mocks.findExport },
    auditLog: { create: mocks.audit },
    caseChangeEvent: { findFirst: vi.fn() },
  },
}))

import syncRouter from './routes/sync'

function app() {
  const instance = express()
  instance.use(express.json())
  instance.use('/v1/sync', syncRouter)
  return instance
}

function activeKey(scopes = ['export:read']) {
  return {
    id: 'key-1',
    lawFirmId: 'firm-a',
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    scopes: JSON.stringify(scopes),
  }
}

describe('data export API authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findKey.mockResolvedValue(activeKey())
  })

  it('fails closed when the key lacks export:read', async () => {
    mocks.findKey.mockResolvedValue(activeKey(['cases:read']))
    const response = await request(app())
      .get('/v1/sync/exports/run-1')
      .set('x-api-key', 'secret')
    expect(response.status).toBe(403)
    expect(mocks.findExport).not.toHaveBeenCalled()
  })

  it('always includes the authenticated firm in status lookup', async () => {
    mocks.findExport.mockResolvedValue(null)
    const response = await request(app())
      .get('/v1/sync/exports/other-firm-run')
      .set('authorization', 'Bearer secret')
    expect(response.status).toBe(404)
    expect(mocks.findExport).toHaveBeenCalledWith({
      where: { id: 'other-firm-run', lawFirmId: 'firm-a' },
    })
  })

  it('refuses an expired artifact before touching storage', async () => {
    mocks.findExport.mockResolvedValue({
      id: 'run-1',
      lawFirmId: 'firm-a',
      kind: 'snapshot',
      status: 'ready',
      expiresAt: new Date(Date.now() - 1000),
    })
    const response = await request(app())
      .get('/v1/sync/exports/run-1/download')
      .set('x-api-key', 'secret')
    expect(response.status).toBe(410)
    expect(response.headers['cache-control']).toBeUndefined()
  })
})

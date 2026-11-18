import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  exportFindMany: vi.fn(),
  keyFindMany: vi.fn(),
  auditCreate: vi.fn().mockResolvedValue({}),
}))

vi.mock('./lib/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', email: 'admin@firm.test' }
    next()
  },
}))

vi.mock('./lib/firm-access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/firm-access')>()),
  resolveFirmAccess: vi.fn().mockResolvedValue({
    lawFirmId: 'firm-1',
    role: 'firm_admin',
    permissions: ['manage_users'],
    userId: 'user-1',
    attorneyId: 'attorney-1',
    memberId: 'member-1',
  }),
}))

vi.mock('./lib/prisma', () => ({
  prisma: {
    attorney: { findFirst: vi.fn().mockResolvedValue({ id: 'attorney-1' }) },
    dataExportRun: { findMany: mocks.exportFindMany },
    syncApiKey: { findMany: mocks.keyFindMany },
    auditLog: { create: mocks.auditCreate },
  },
}))

import integrationsRouter from './routes/integrations'

function app() {
  const instance = express()
  instance.use(express.json())
  instance.use('/v1/integrations', integrationsRouter)
  return instance
}

describe('attorney integration administration workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.exportFindMany.mockResolvedValue([])
    mocks.keyFindMany.mockResolvedValue([])
  })

  it('reports whether the attorney may manage firm integrations', async () => {
    const response = await request(app()).get('/v1/integrations/access')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ lawFirmId: 'firm-1', canManageIntegrations: true })
    expect(response.headers['cache-control']).toContain('no-store')
  })

  it('lists only export runs belonging to the resolved firm', async () => {
    mocks.exportFindMany.mockResolvedValue([])
    const response = await request(app()).get('/v1/integrations/data-exports')
    expect(response.status).toBe(200)
    expect(mocks.exportFindMany).toHaveBeenCalledWith({
      where: { lawFirmId: 'firm-1' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    expect(response.body.exports).toEqual([])
  })

  it('shows key scope and expiry state instead of calling expired keys active', async () => {
    mocks.keyFindMany.mockResolvedValue([{
      id: 'key-1',
      name: 'Export automation',
      prefix: 'abcd',
      scopes: '["export:read"]',
      expiresAt: new Date(Date.now() - 1000),
      lastUsedAt: null,
      revokedAt: null,
      createdAt: new Date('2026-11-01T00:00:00Z'),
    }])
    const response = await request(app()).get('/v1/integrations/sync-keys')
    expect(response.status).toBe(200)
    expect(response.body.keys[0]).toMatchObject({
      id: 'key-1',
      scopes: ['export:read'],
      expired: true,
    })
  })
})

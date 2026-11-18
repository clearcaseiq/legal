import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from './prisma'
import { parseSyncScopes, syncKeyAuth, type SyncRequest } from './sync-auth'

vi.mock('./prisma', () => ({
  prisma: {
    syncApiKey: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

const findKey = prisma.syncApiKey.findUnique as ReturnType<typeof vi.fn>

function response() {
  const res: any = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  }
  return res
}

describe('sync API key scopes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps legacy keys on their historical capabilities without granting exports', () => {
    expect(parseSyncScopes(null)).toEqual(['cases:read', 'changes:read', 'proposals:write'])
    expect(parseSyncScopes(null)).not.toContain('export:read')
  })

  it('accepts only known explicit scopes', () => {
    expect(parseSyncScopes(JSON.stringify(['export:read', 'unknown', 'cases:read']))).toEqual([
      'export:read',
      'cases:read',
    ])
  })

  it('fails closed for malformed scope data', () => {
    expect(parseSyncScopes('{bad')).toEqual([])
    expect(parseSyncScopes(JSON.stringify({ scope: 'exports:read' }))).toEqual([])
  })

  it('rejects expired keys before assigning a tenant', async () => {
    findKey.mockResolvedValue({
      id: 'key-1',
      lawFirmId: 'firm-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      scopes: '["export:read"]',
    })
    const req = { headers: { authorization: 'Bearer token' } } as SyncRequest
    const res = response()
    const next = vi.fn()
    await syncKeyAuth(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(req.syncFirmId).toBeUndefined()
    expect(next).not.toHaveBeenCalled()
  })

  it('assigns the firm and only the stored scopes for an active key', async () => {
    findKey.mockResolvedValue({
      id: 'key-1',
      lawFirmId: 'firm-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      scopes: '["export:read"]',
    })
    const req = { headers: { 'x-api-key': 'token' } } as unknown as SyncRequest
    const res = response()
    const next = vi.fn()
    await syncKeyAuth(req, res, next)
    expect(req.syncFirmId).toBe('firm-1')
    expect(req.syncKeyScopes).toEqual(['export:read'])
    expect(next).toHaveBeenCalledOnce()
  })
})

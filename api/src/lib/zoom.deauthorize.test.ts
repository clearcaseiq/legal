import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  attorneyZoomConnection: { findFirst: vi.fn(), deleteMany: vi.fn() },
}))
vi.mock('./prisma', () => ({ prisma: prismaMock }))
vi.mock('../env', () => ({ ENV: { ZOOM_CLIENT_ID: 'cid', ZOOM_CLIENT_SECRET: 'secret', JWT_SECRET: 'jwt' } }))

import { disconnectAttorneyZoom, handleZoomAppDeauthorized } from './zoom'

describe('handleZoomAppDeauthorized', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes the connection for the Zoom user who removed the app', async () => {
    prismaMock.attorneyZoomConnection.deleteMany.mockResolvedValue({ count: 1 })
    expect(await handleZoomAppDeauthorized({ user_id: 'zoom-user-1' })).toBe(1)
    expect(prismaMock.attorneyZoomConnection.deleteMany).toHaveBeenCalledWith({
      where: { externalAccountId: 'zoom-user-1' },
    })
  })

  it('does nothing without a user id', async () => {
    expect(await handleZoomAppDeauthorized({})).toBe(0)
    expect(await handleZoomAppDeauthorized(undefined)).toBe(0)
    expect(prismaMock.attorneyZoomConnection.deleteMany).not.toHaveBeenCalled()
  })
})

describe('disconnectAttorneyZoom', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    prismaMock.attorneyZoomConnection.deleteMany.mockResolvedValue({ count: 1 })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('revokes the token at Zoom, then deletes our copy', async () => {
    prismaMock.attorneyZoomConnection.findFirst.mockResolvedValue({ accessToken: 'tok' })
    fetchMock.mockResolvedValue({ ok: true })
    await disconnectAttorneyZoom('att-1')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://zoom.us/oauth/revoke?token=tok',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(prismaMock.attorneyZoomConnection.deleteMany).toHaveBeenCalledWith({ where: { attorneyId: 'att-1' } })
  })

  it('still deletes our copy when Zoom is unreachable', async () => {
    prismaMock.attorneyZoomConnection.findFirst.mockResolvedValue({ accessToken: 'tok' })
    fetchMock.mockRejectedValue(new Error('network down'))
    await expect(disconnectAttorneyZoom('att-1')).resolves.toEqual({ disconnected: true })
    expect(prismaMock.attorneyZoomConnection.deleteMany).toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../prisma', () => import('../../test/universalPrismaMock'))
vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('./crypto', () => ({
  encryptSecret: (value: string | null) => value,
  decryptSecret: (value: string | null) => value,
}))

import { prisma } from '../prisma'
import { resetUniversalPrismaMock } from '../../test/universalPrismaMock'
import { disconnectConnection } from './connections'

beforeEach(() => {
  resetUniversalPrismaMock()
})

describe('disconnectConnection', () => {
  it('turns off inbound sync while preserving other connection settings', async () => {
    vi.mocked(prisma.cmsConnection.findUnique).mockResolvedValue({
      id: 'conn-1',
      config: JSON.stringify({ inboundSyncEnabled: true, region: 'us' }),
    } as never)
    vi.mocked(prisma.cmsConnection.update).mockResolvedValue({ id: 'conn-1' } as never)

    await disconnectConnection('conn-1')

    expect(prisma.cmsConnection.update).toHaveBeenCalledWith({
      where: { id: 'conn-1' },
      data: {
        status: 'disconnected',
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        config: JSON.stringify({ inboundSyncEnabled: false, region: 'us' }),
      },
    })
  })

  it('still writes a disabled config when the existing connection has none', async () => {
    vi.mocked(prisma.cmsConnection.findUnique).mockResolvedValue({
      id: 'conn-2',
      config: null,
    } as never)
    vi.mocked(prisma.cmsConnection.update).mockResolvedValue({ id: 'conn-2' } as never)

    await disconnectConnection('conn-2')

    const data = vi.mocked(prisma.cmsConnection.update).mock.calls[0][0].data as any
    expect(JSON.parse(String(data.config))).toEqual({ inboundSyncEnabled: false })
  })
})

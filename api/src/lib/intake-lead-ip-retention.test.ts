import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { IP_RETENTION_DAYS, runIntakeLeadIpPurge } from './intake-lead-ip-retention'

beforeEach(() => {
  resetUniversalPrismaMock()
})

describe('runIntakeLeadIpPurge', () => {
  it('clears only the IP, only on leads older than 180 days', async () => {
    vi.mocked(prisma.intakeLead.updateMany).mockResolvedValue({ count: 4 } as any)
    const now = new Date('2026-10-13T00:00:00Z')

    const result = await runIntakeLeadIpPurge(now)

    expect(result).toEqual({ cleared: 4 })
    const args = vi.mocked(prisma.intakeLead.updateMany).mock.calls[0][0] as any
    expect(args.data).toEqual({ ipAddress: null })
    expect(args.where.ipAddress).toEqual({ not: null })
    expect(args.where.createdAt.lt.getTime()).toBe(now.getTime() - IP_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  })
})

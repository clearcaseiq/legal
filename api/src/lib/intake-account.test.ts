import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { findOrCreateIntakeUser } from './intake-account'

describe('findOrCreateIntakeUser', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('reuses an existing claimant account', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', email: 'pat@example.com', role: 'client', phone: null } as any)

    const user = await findOrCreateIntakeUser({ email: 'Pat@Example.com' })

    expect(user?.id).toBe('u1')
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('does not attach a case to an attorney login', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u2', email: 'lawyer@firm.com', role: 'client', phone: null } as any)
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue({ id: 'att-1' } as any)

    expect(await findOrCreateIntakeUser({ email: 'lawyer@firm.com' })).toBeNull()
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('does not attach a case to a staff or admin role', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u3', email: 'ops@clearcaseiq.com', role: 'admin', phone: null } as any)

    expect(await findOrCreateIntakeUser({ email: 'ops@clearcaseiq.com' })).toBeNull()
  })

  it('creates a provisional claimant account for a new email', async () => {
    const user = await findOrCreateIntakeUser({ email: 'new@example.com', phone: '5105550123' })

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'new@example.com', role: 'client', passwordHash: null }),
    })
    expect(user?.email).toBe('new@example.com')
  })
})

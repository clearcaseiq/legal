import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    introduction: { findMany: vi.fn(), updateMany: vi.fn() },
    attorney: { findMany: vi.fn() },
  },
}))

import { prisma } from './prisma'
import { attorneysBlockedByFirmDecline, closeFirmColleagueOffers } from './firm-decline'

const db = prisma as any

beforeEach(() => vi.clearAllMocks())

describe('attorneysBlockedByFirmDecline', () => {
  it('blocks every attorney at a firm where someone declined', async () => {
    db.introduction.findMany.mockResolvedValue([{ attorneyId: 'att-a', attorney: { lawFirmId: 'firm-1' } }])
    db.attorney.findMany.mockResolvedValue([{ id: 'att-a' }, { id: 'att-b' }, { id: 'att-c' }])

    const blocked = await attorneysBlockedByFirmDecline('asm-1')

    expect([...blocked].sort()).toEqual(['att-a', 'att-b', 'att-c'])
    expect(db.attorney.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { lawFirmId: { in: ['firm-1'] } } }),
    )
  })

  it('blocks only the attorney themselves when they have no firm', async () => {
    db.introduction.findMany.mockResolvedValue([{ attorneyId: 'solo', attorney: { lawFirmId: null } }])

    const blocked = await attorneysBlockedByFirmDecline('asm-1')

    expect([...blocked]).toEqual(['solo'])
    expect(db.attorney.findMany).not.toHaveBeenCalled()
  })

  it('blocks nobody when the case has not been declined', async () => {
    db.introduction.findMany.mockResolvedValue([])

    expect((await attorneysBlockedByFirmDecline('asm-1')).size).toBe(0)
  })
})

describe('closeFirmColleagueOffers', () => {
  it("closes colleagues' live offers on the same case, not the decliner's", async () => {
    db.introduction.updateMany.mockResolvedValue({ count: 2 })

    const closed = await closeFirmColleagueOffers('asm-1', 'firm-1', 'att-a')

    expect(closed).toBe(2)
    expect(db.introduction.updateMany).toHaveBeenCalledWith({
      where: {
        assessmentId: 'asm-1',
        attorneyId: { not: 'att-a' },
        status: { in: ['PENDING', 'REQUESTED_INFO'] },
        attorney: { lawFirmId: 'firm-1' },
      },
      data: expect.objectContaining({ status: 'EXPIRED' }),
    })
  })

  it('does nothing for an attorney without a firm', async () => {
    expect(await closeFirmColleagueOffers('asm-1', null, 'solo')).toBe(0)
    expect(db.introduction.updateMany).not.toHaveBeenCalled()
  })
})

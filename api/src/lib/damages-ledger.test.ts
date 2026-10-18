import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createMany } = vi.hoisted(() => ({ createMany: vi.fn() }))
vi.mock('./prisma', () => ({ prisma: { damageItemChange: { createMany } } }))
vi.mock('./case-facts', () => ({ tryUpdateCaseFacts: vi.fn() }))

import { chargeBreakdown, claimedChargeAmount, recordDamageItemChanges, summarizeDamageItems } from './damages-ledger'

describe('chargeBreakdown', () => {
  it('nets payments and adjustments to the balance still owed', () => {
    expect(chargeBreakdown({ amount: 4000, paidAmount: 1800, adjustedAmount: 1500 })).toEqual({
      billed: 4000,
      paid: 1800,
      adjusted: 1500,
      balance: 700,
      paidOrOwed: 2500,
    })
  })

  it('reads a status-only line as paid in full or still owed', () => {
    expect(chargeBreakdown({ amount: 500, billingStatus: 'paid' })).toMatchObject({ paid: 500, balance: 0, paidOrOwed: 500 })
    expect(chargeBreakdown({ amount: 500, billingStatus: 'billed' })).toMatchObject({ paid: 0, balance: 500, paidOrOwed: 500 })
  })

  it('never lets the balance go negative', () => {
    expect(chargeBreakdown({ amount: 100, paidAmount: 80, adjustedAmount: 60 }).balance).toBe(0)
  })
})

describe('summarizeDamageItems', () => {
  const items = [
    { category: 'medical', amount: 4000, paidAmount: 1800, adjustedAmount: 1500 },
    { category: 'medical', amount: 1000 },
    { category: 'lost_wages', amount: 2000 },
  ]

  it('claims billed charges by default', () => {
    const s = summarizeDamageItems(items)
    expect(s.medical).toMatchObject({ billed: 5000, paid: 1800, adjusted: 1500, outstanding: 1700, paidOrOwed: 3500, claimed: 5000 })
    expect(s.totals.specials).toBe(7000)
    expect(s.factsDamages.medical).toBe(5000)
  })

  it('claims paid plus still owed when the case chooses it', () => {
    const s = summarizeDamageItems(items, 'paid_or_owed')
    expect(s.medical.claimed).toBe(3500)
    expect(s.totals.specials).toBe(5500)
    expect(s.factsDamages.medical).toBe(3500)
    expect(claimedChargeAmount(items[0], 'paid_or_owed')).toBe(2500)
  })
})

describe('recordDamageItemChanges', () => {
  beforeEach(() => {
    createMany.mockReset()
    createMany.mockResolvedValue({ count: 0 })
  })

  it('records only the tracked figures that changed, with the reason', async () => {
    const n = await recordDamageItemChanges(
      { amount: 4000, paidAmount: null, adjustedAmount: null, billingStatus: 'billed', payer: null, description: 'x' },
      { amount: 4000.0, paidAmount: 1800, adjustedAmount: null, billingStatus: 'paid', payer: 'health_insurance', description: 'y' },
      { damageItemId: 'd1', assessmentId: 'a1', reason: 'EOB received', actorId: 'u1', actorName: 'Jane' },
    )
    expect(n).toBe(3)
    expect(createMany.mock.calls[0][0].data.map((r: any) => [r.field, r.fromValue, r.toValue])).toEqual([
      ['paidAmount', null, '1800'],
      ['billingStatus', 'billed', 'paid'],
      ['payer', null, 'health_insurance'],
    ])
    expect(createMany.mock.calls[0][0].data[0]).toMatchObject({ reason: 'EOB received', actorName: 'Jane' })
  })

  it('writes nothing when no tracked figure changed', async () => {
    expect(await recordDamageItemChanges({ amount: 10 }, { amount: '10' }, { damageItemId: 'd1', assessmentId: 'a1' })).toBe(0)
    expect(createMany).not.toHaveBeenCalled()
  })
})

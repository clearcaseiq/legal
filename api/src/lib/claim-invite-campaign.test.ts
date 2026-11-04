import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./claims', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./claims')>()
  return { ...actual, sendClaimEmail: vi.fn().mockResolvedValue(true) }
})

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { sendClaimEmail } from './claims'
import {
  findInviteCandidates,
  getInviteConfig,
  queueInviteBatch,
  runClaimInviteSweep,
} from './claim-invite-campaign'

const db = prisma as any

const attorneyRow = (id: string, email: string, city: string, firm = 'Firm LLP') => ({
  id,
  name: `Attorney ${id}`,
  email,
  lawFirm: { name: firm, city, state: 'CA' },
})

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked(sendClaimEmail).mockReset()
  vi.mocked(sendClaimEmail).mockResolvedValue(true)
  process.env.INVITE_POSTAL_ADDRESS = '1 Test Way, Irvine, CA 92618'
  delete process.env.INVITE_DAILY_CAP
})

describe('getInviteConfig', () => {
  it('lets admin settings override the environment', async () => {
    db.routingConfig.findUnique.mockResolvedValue({
      value: JSON.stringify({ dailyCap: 120, fromEmail: 'Invites@ClearCaseIQ.com', postalAddress: 'PO Box 1, LA, CA' }),
    })

    expect(await getInviteConfig()).toMatchObject({
      dailyCap: 120,
      fromEmail: 'invites@clearcaseiq.com',
      postalAddress: 'PO Box 1, LA, CA',
    })
  })

  it('degrades bad stored values instead of passing them to the mailer', async () => {
    db.routingConfig.findUnique.mockResolvedValue({
      value: JSON.stringify({ dailyCap: -5, replyTo: 'not an email', postalAddress: 'Line 1\r\nBcc: x@y.z' }),
    })

    const config = await getInviteConfig()

    expect(config.dailyCap).toBe(0)
    expect(config.replyTo).toBeNull()
    expect(config.postalAddress).not.toMatch(/[\r\n]/)
  })
})

describe('findInviteCandidates', () => {
  it('skips attorneys with an invite in flight or a suppressed address', async () => {
    db.attorney.findMany.mockResolvedValue([
      attorneyRow('a1', 'one@x.test', 'Los Angeles'),
      attorneyRow('a2', 'two@x.test', 'Los Angeles'),
      attorneyRow('a3', 'Three@X.test', 'Los Angeles'),
    ])
    db.profileClaim.findMany.mockResolvedValue([{ attorneyId: 'a1' }])
    db.emailSuppression.findMany.mockResolvedValue([{ email: 'three@x.test' }])

    const result = await findInviteCandidates({})

    expect(result.map((row) => row.id)).toEqual(['a2'])
  })

  it('filters by county derived from the firm city', async () => {
    db.attorney.findMany.mockResolvedValue([
      attorneyRow('la', 'la@x.test', 'Los Angeles'),
      attorneyRow('oc', 'oc@x.test', 'Irvine'),
    ])

    const result = await findInviteCandidates({ county: 'Orange County' })

    expect(result.map((row) => row.id)).toEqual(['oc'])
    expect(result[0].county).toBe('Orange')
  })

  it('returns nobody for a county name it cannot recognise, rather than everyone', async () => {
    db.attorney.findMany.mockResolvedValue([attorneyRow('la', 'la@x.test', 'Los Angeles')])
    expect(await findInviteCandidates({ county: 'Atlantis' })).toEqual([])
  })
})

describe('queueInviteBatch', () => {
  it('queues without sending anything', async () => {
    db.attorney.findMany.mockResolvedValue([
      attorneyRow('a1', 'one@x.test', 'Los Angeles'),
      attorneyRow('a2', 'two@x.test', 'Los Angeles'),
    ])

    const result = await queueInviteBatch({}, 1)

    expect(result.queued).toBe(1)
    const rows = db.profileClaim.createMany.mock.calls[0][0].data
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ attorneyId: 'a1', status: 'queued', batchId: result.batchId })
    expect(sendClaimEmail).not.toHaveBeenCalled()
  })
})

describe('runClaimInviteSweep', () => {
  const queued = (id: string, overrides: Record<string, unknown> = {}) => ({
    id,
    token: `tok-${id}`,
    email: `${id}@x.test`,
    sendAttempts: 0,
    attorney: {
      id: `att-${id}`,
      name: `Attorney ${id}`,
      email: `${id}@x.test`,
      claimStatus: 'unclaimed',
      isActive: true,
      lawFirm: { name: 'Firm LLP' },
    },
    ...overrides,
  })

  it('holds the queue while paused', async () => {
    db.routingConfig.findUnique.mockResolvedValue({ value: JSON.stringify({ paused: true }) })
    db.profileClaim.count.mockResolvedValue(5)

    const result = await runClaimInviteSweep()

    expect(result.blockedReason).toBe('paused')
    expect(sendClaimEmail).not.toHaveBeenCalled()
  })

  it('sends nothing without a postal address', async () => {
    delete process.env.INVITE_POSTAL_ADDRESS
    db.profileClaim.count.mockResolvedValue(5)

    const result = await runClaimInviteSweep()

    expect(result.blockedReason).toBe('no_postal_address')
    expect(sendClaimEmail).not.toHaveBeenCalled()
  })

  it('stops at the rolling 24-hour cap', async () => {
    process.env.INVITE_DAILY_CAP = '20'
    // First count: queued rows. Second: sent in the last 24h.
    db.profileClaim.count.mockResolvedValueOnce(5).mockResolvedValueOnce(20)

    const result = await runClaimInviteSweep()

    expect(result.blockedReason).toBe('daily_cap_reached')
    expect(db.profileClaim.findMany).not.toHaveBeenCalled()
  })

  it('only takes what is left of the cap', async () => {
    process.env.INVITE_DAILY_CAP = '20'
    db.profileClaim.count.mockResolvedValueOnce(50).mockResolvedValueOnce(17)

    await runClaimInviteSweep()

    expect(db.profileClaim.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }))
  })

  it('marks a sent invite live and the attorney pending', async () => {
    db.profileClaim.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0)
    db.profileClaim.findMany.mockResolvedValue([queued('c1')])

    const result = await runClaimInviteSweep()

    expect(result.sent).toBe(1)
    expect(db.profileClaim.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({ status: 'sent', sentAt: expect.any(Date) }),
      }),
    )
    expect(db.attorney.update).toHaveBeenCalledWith({ where: { id: 'att-c1' }, data: { claimStatus: 'pending' } })
  })

  // The queue can sit for days; whatever happened meanwhile wins.
  it('cancels rows that went stale while queued', async () => {
    db.profileClaim.count.mockResolvedValueOnce(3).mockResolvedValueOnce(0)
    db.profileClaim.findMany.mockResolvedValue([
      queued('claimed', { attorney: { ...queued('claimed').attorney, claimStatus: 'claimed' } }),
      queued('moved', { attorney: { ...queued('moved').attorney, email: 'new@x.test' } }),
      queued('optout'),
    ])
    db.emailSuppression.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'optout@x.test' ? { id: 's1' } : null,
    )

    const result = await runClaimInviteSweep()

    expect(result.skipped).toBe(3)
    expect(sendClaimEmail).not.toHaveBeenCalled()
  })

  it('gives up after three provider failures', async () => {
    vi.mocked(sendClaimEmail).mockResolvedValue(false)
    db.profileClaim.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0)
    db.profileClaim.findMany.mockResolvedValue([queued('c1', { sendAttempts: 2 })])

    const result = await runClaimInviteSweep()

    expect(result.failed).toBe(1)
    expect(db.profileClaim.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed', sendAttempts: 3 }) }),
    )
    expect(db.attorney.update).not.toHaveBeenCalled()
  })
})

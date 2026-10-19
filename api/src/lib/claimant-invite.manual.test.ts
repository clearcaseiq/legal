import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./claim-token', () => ({ createClaimToken: () => 'signed-token' }))
vi.mock('./platform-notifications', () => ({
  deliverDirectNotification: vi.fn().mockResolvedValue(undefined),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { deliverDirectNotification } from './platform-notifications'
import {
  MANUAL_INVITE_COOLDOWN_MS,
  MANUAL_INVITE_MAX,
  getClaimantPortalStatus,
  sendClaimantInviteFromCase,
} from './claimant-invite'

const NOW = new Date('2026-10-18T12:00:00Z').getTime()
const INVITE = { assessmentId: 'asm-1', email: 'dana@example.com', firstName: 'Dana', attorneyName: 'Rama Reddy' }

function shadowOwned() {
  vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
    userId: 'shadow-1',
    user: { email: 'guest+asm-1@caseiq.local', passwordHash: null, provider: 'intake' },
  } as any)
}

function invitedAgo(...msAgo: number[]) {
  vi.mocked(prisma.platformNotificationEvent.findMany).mockResolvedValue(
    msAgo.map((ms) => ({ createdAt: new Date(NOW - ms) })) as any,
  )
}

const sent = () => vi.mocked(deliverDirectNotification).mock.calls[0]?.[0] as any

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
  shadowOwned()
  invitedAgo()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
})

describe('sendClaimantInviteFromCase', () => {
  it('sends a portal activation link to a client with no account', async () => {
    expect(await sendClaimantInviteFromCase(INVITE, NOW)).toEqual({ sent: true, skipped: null })
    expect(sent().recipient).toBe('dana@example.com')
    expect(sent().cta.url).toContain('/register?claim=signed-token')
  })

  it('refuses a resend within 24 hours, and allows it after', async () => {
    invitedAgo(2 * 60 * 60 * 1000)
    expect(await sendClaimantInviteFromCase(INVITE, NOW)).toEqual({ sent: false, skipped: 'recently_invited' })
    expect(deliverDirectNotification).not.toHaveBeenCalled()

    invitedAgo(MANUAL_INVITE_COOLDOWN_MS + 1)
    expect(await sendClaimantInviteFromCase(INVITE, NOW)).toEqual({ sent: true, skipped: null })
  })

  it('stops after the invite cap', async () => {
    invitedAgo(...Array.from({ length: MANUAL_INVITE_MAX }, (_, i) => (i + 2) * MANUAL_INVITE_COOLDOWN_MS))
    expect(await sendClaimantInviteFromCase(INVITE, NOW)).toEqual({ sent: false, skipped: 'invite_limit' })
  })

  it('asks a client who already has a login to sign in', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'client' } as any)
    expect(await sendClaimantInviteFromCase(INVITE, NOW)).toEqual({ sent: true, skipped: null })
    expect(sent().cta.url).toContain('/login?claim=signed-token')
    expect(sent().message).toContain('already have a ClearCaseIQ account')
  })

  it('never links a client case to a firm or staff login', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'attorney' } as any)
    expect(await sendClaimantInviteFromCase(INVITE, NOW)).toEqual({ sent: false, skipped: 'account_exists' })
    expect(deliverDirectNotification).not.toHaveBeenCalled()
  })

  it('does nothing once a real account holds the case', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      userId: 'user-9',
      user: { email: 'dana@example.com', passwordHash: 'hash', provider: 'local' },
    } as any)
    expect(await sendClaimantInviteFromCase(INVITE, NOW)).toEqual({ sent: false, skipped: 'already_claimed' })
  })

  it('needs an email', async () => {
    expect(await sendClaimantInviteFromCase({ ...INVITE, email: ' ' }, NOW)).toEqual({ sent: false, skipped: 'no_email' })
  })
})

describe('getClaimantPortalStatus', () => {
  it('reports an invited client and when they can be re-invited', async () => {
    invitedAgo(60 * 60 * 1000)
    const status = await getClaimantPortalStatus('asm-1', 'Dana@Example.com', NOW)
    expect(status).toMatchObject({
      state: 'invited',
      email: 'dana@example.com',
      inviteCount: 1,
      limitReached: false,
      nextInviteAt: new Date(NOW - 60 * 60 * 1000 + MANUAL_INVITE_COOLDOWN_MS).toISOString(),
    })
    expect(status?.inviteLink).toContain('/register?claim=')
  })

  it('hides the link once the client is on the platform', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      userId: 'user-9',
      user: { email: 'dana@example.com', passwordHash: 'hash', provider: 'local' },
    } as any)
    expect(await getClaimantPortalStatus('asm-1', 'dana@example.com', NOW)).toMatchObject({
      state: 'active',
      inviteLink: null,
    })
  })
})

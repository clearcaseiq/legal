import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./claim-token', () => ({ createClaimToken: () => 'signed-token' }))
vi.mock('./platform-notifications', () => ({
  deliverDirectNotification: vi.fn().mockResolvedValue(undefined),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { deliverDirectNotification } from './platform-notifications'
import { PLAINTIFF_EVENTS } from './notification-events'
import { inviteClaimantToCase, inviteClaimants } from './claimant-invite'

const INVITE = {
  assessmentId: 'asm-1',
  email: 'dana@example.com',
  firstName: 'Dana',
  attorneyName: 'Rama Reddy, Esq.',
  attorneyEmail: 'rama@firm.com',
  firmName: 'Reddy Law',
}

/** The shadow owner the case factory mints: claimable, and nobody can sign in as it. */
function shadowOwned(overrides: Partial<any> = {}) {
  vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
    userId: 'shadow-1',
    user: { email: 'guest+asm-1@caseiq.local', passwordHash: null, provider: 'intake' },
    ...overrides,
  } as any)
}

function sentArg() {
  return vi.mocked(deliverDirectNotification).mock.calls[0]?.[0] as any
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
  shadowOwned()
})

describe('inviteClaimantToCase', () => {
  it('mails the claim link to the address recorded on the case', async () => {
    const result = await inviteClaimantToCase(INVITE)

    expect(result).toEqual({ sent: true, skipped: null })
    expect(sentArg().recipient).toBe('dana@example.com')
    // The whole point: a link that registers them *and* attaches this case.
    // Anything else leaves the case on the shadow owner.
    expect(sentArg().cta.url).toContain('/register?claim=signed-token')
  })

  it('brands the mail to the firm and routes replies there', async () => {
    await inviteClaimantToCase(INVITE)

    // The claimant's questions are about their case, and we are not their
    // counsel. An invite that replies to us puts us between firm and client.
    expect(sentArg().replyTo).toBe('rama@firm.com')
    expect(sentArg().fromName).toBe('Rama Reddy, Esq.')
  })

  it('records the invite against the case so it can be recognised later', async () => {
    await inviteClaimantToCase(INVITE)

    expect(sentArg().assessmentId).toBe('asm-1')
    expect(sentArg().metadata.eventType).toBe(PLAINTIFF_EVENTS.case_invite)
  })

  /**
   * The property that matters most here. This is unsolicited mail to a law
   * firm's own client, and re-uploading the same export — or a pull sync seeing
   * the matter a second time — must not mail them again.
   */
  it('never mails the same case twice', async () => {
    vi.mocked(prisma.platformNotificationEvent.findFirst).mockResolvedValue({ id: 'evt-1' } as any)

    const result = await inviteClaimantToCase(INVITE)

    expect(result).toEqual({ sent: false, skipped: 'already_invited' })
    expect(deliverDirectNotification).not.toHaveBeenCalled()
  })

  it('treats a delivery that failed as still having been sent once', async () => {
    // Deliberate: re-inviting on every subsequent import is worse than one
    // undelivered invite, so the record of the attempt is what counts.
    vi.mocked(prisma.platformNotificationEvent.findFirst).mockResolvedValue({ id: 'evt-1' } as any)

    expect(await inviteClaimantToCase(INVITE)).toMatchObject({ skipped: 'already_invited' })
  })

  it('does not offer a claim link for a case a real account already holds', async () => {
    shadowOwned({
      userId: 'user-9',
      user: { email: 'dana@example.com', passwordHash: 'hashed', provider: 'local' },
    })

    const result = await inviteClaimantToCase(INVITE)

    // There is nothing to claim, and mailing anyway would imply the case is
    // unattached — to a client who is already using it.
    expect(result).toEqual({ sent: false, skipped: 'already_claimed' })
    expect(deliverDirectNotification).not.toHaveBeenCalled()
  })

  it('reports a case with no email rather than silently passing over it', async () => {
    const result = await inviteClaimantToCase({ ...INVITE, email: null })

    // Worth surfacing: adoption matches on the same address, so a case imported
    // without one can never be claimed by anybody, by any route.
    expect(result).toEqual({ sent: false, skipped: 'no_email' })
    expect(deliverDirectNotification).not.toHaveBeenCalled()
  })

  it('does not treat whitespace as an address', async () => {
    expect(await inviteClaimantToCase({ ...INVITE, email: '   ' })).toMatchObject({
      skipped: 'no_email',
    })
  })

  it('survives a mail failure instead of failing the import behind it', async () => {
    vi.mocked(deliverDirectNotification).mockRejectedValueOnce(new Error('provider down'))

    // The import has already committed by this point. Throwing here would fail
    // a request whose cases were written successfully.
    await expect(inviteClaimantToCase(INVITE)).resolves.toEqual({ sent: false, skipped: null })
  })

  it('addresses a claimant whose name was not imported without saying "Hi null"', async () => {
    await inviteClaimantToCase({ ...INVITE, firstName: null })

    expect(sentArg().message).toContain('Hi there')
  })

  /**
   * The mail renderer appends the CTA link to both the text and HTML bodies, so
   * a body that also spelled it out printed the same long URL twice.
   */
  it('leaves the link to the button rather than repeating it in the body', async () => {
    await inviteClaimantToCase(INVITE)

    expect(sentArg().message).not.toContain('/register?claim=')
  })
})

describe('inviteClaimants', () => {
  it('tallies what happened to each case so the attorney can see who was reached', async () => {
    vi.mocked(prisma.assessment.findUnique)
      .mockResolvedValueOnce({
        userId: 'shadow-1',
        user: { email: 'guest+a@caseiq.local', passwordHash: null, provider: 'intake' },
      } as any)
      .mockResolvedValueOnce({
        userId: 'user-9',
        user: { email: 'real@example.com', passwordHash: 'hashed', provider: 'local' },
      } as any)

    const result = await inviteClaimants([
      { assessmentId: 'asm-1', email: 'a@example.com' },
      { assessmentId: 'asm-2', email: 'b@example.com' },
      { assessmentId: 'asm-3', email: null },
    ])

    expect(result).toEqual({ sent: 1, noEmail: 1, alreadyInvited: 0, alreadyClaimed: 1 })
  })

  it('keeps going after one claimant cannot be mailed', async () => {
    vi.mocked(deliverDirectNotification).mockRejectedValueOnce(new Error('provider down'))

    const result = await inviteClaimants([
      { assessmentId: 'asm-1', email: 'a@example.com' },
      { assessmentId: 'asm-2', email: 'b@example.com' },
    ])

    // One bad row must not cost the rest of a committed import their invites.
    expect(result.sent).toBe(1)
    expect(deliverDirectNotification).toHaveBeenCalledTimes(2)
  })
})

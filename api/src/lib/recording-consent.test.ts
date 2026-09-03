import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import {
  ALL_PARTY_CONSENT_STATES,
  checkRecordingConsent,
  governingStates,
  requiresAllPartyConsent,
} from './recording-consent'

const prismaMock = prisma as any

beforeEach(() => {
  resetUniversalPrismaMock()
})

describe('requiresAllPartyConsent', () => {
  it('covers California, the state the docs call out', () => {
    expect(requiresAllPartyConsent('CA')).toBe(true)
  })

  it('is case and whitespace tolerant, because state values come from several writers', () => {
    expect(requiresAllPartyConsent('ca')).toBe(true)
    expect(requiresAllPartyConsent(' Fl ')).toBe(true)
  })

  it('leaves one-party states alone', () => {
    expect(requiresAllPartyConsent('TX')).toBe(false)
    expect(requiresAllPartyConsent('NY')).toBe(false)
    expect(requiresAllPartyConsent('GA')).toBe(false)
  })

  it('treats a missing state as one-party rather than throwing', () => {
    expect(requiresAllPartyConsent(null)).toBe(false)
    expect(requiresAllPartyConsent('')).toBe(false)
  })

  it('includes the contested states', () => {
    // Included deliberately: where the rule is unsettled, the cost of asking
    // one extra person is a prompt, and the cost of guessing wrong is a
    // criminal statute plus an inadmissible recording.
    for (const state of ['NV', 'MI', 'OR', 'CT']) {
      expect(ALL_PARTY_CONSENT_STATES.has(state), state).toBe(true)
    }
  })
})

describe('governingStates', () => {
  it('applies the stricter rule when the venue and the attorney disagree', () => {
    // Nothing in the schema records where the claimant physically is, so both
    // available signals are proxies. Taking the union is the safe direction.
    expect(governingStates({ venueState: 'TX', attorneyState: 'CA' }).allParty).toBe(true)
    expect(governingStates({ venueState: 'CA', attorneyState: 'TX' }).allParty).toBe(true)
  })

  it('is one-party only when neither signal requires all parties', () => {
    expect(governingStates({ venueState: 'TX', attorneyState: 'NY' }).allParty).toBe(false)
  })
})

describe('checkRecordingConsent', () => {
  const base = {
    plaintiffUserId: 'user-1',
    attorneyId: 'att-1',
    templateVersion: '1.1',
  }

  it('refuses when the claimant has not consented at all', async () => {
    prismaMock.consent.findFirst.mockResolvedValue(null)

    const result = await checkRecordingConsent({ ...base, venueState: 'TX' })

    expect(result).toMatchObject({ ok: false, reason: 'plaintiff_consent_required' })
  })

  it('allows a one-party state on the claimant consent alone', async () => {
    prismaMock.consent.findFirst.mockResolvedValue({ version: '1.1' })

    const result = await checkRecordingConsent({ ...base, venueState: 'TX', attorneyState: 'TX' })

    expect(result).toMatchObject({ ok: true, allParty: false })
  })

  it('refuses an all-party state when only the claimant has consented', async () => {
    // This is the case the old code got wrong: it checked the calling user and
    // nobody else, so in California one person's agreement was treated as
    // everyone's.
    prismaMock.consent.findFirst.mockImplementation(({ where }: any) =>
      Promise.resolve(where.userId ? { version: '1.1' } : null),
    )

    const result = await checkRecordingConsent({ ...base, venueState: 'CA' })

    expect(result).toMatchObject({ ok: false, reason: 'attorney_consent_required', allParty: true })
  })

  it('allows an all-party state once the attorney has consented too', async () => {
    prismaMock.consent.findFirst.mockResolvedValue({ version: '1.1' })

    const result = await checkRecordingConsent({ ...base, venueState: 'CA' })

    expect(result).toMatchObject({ ok: true, allParty: true })
  })

  it('does not accept consent to a superseded version of the terms', async () => {
    // 1.0 told people the spoken notice gave notice to everyone on the line,
    // which was not true. Consent to that text is not consent to this one.
    prismaMock.consent.findFirst.mockResolvedValue({ version: '1.0' })

    const result = await checkRecordingConsent({ ...base, venueState: 'TX' })

    expect(result).toMatchObject({ ok: false, reason: 'plaintiff_consent_required' })
  })

  it('looks the attorney up by the id carried in consent metadata', async () => {
    // `Attorney` has no user account, so their consent is a Consent row tagged
    // with the attorney id — the shape `attorney_share` already uses.
    prismaMock.consent.findFirst.mockResolvedValue({ version: '1.1' })

    await checkRecordingConsent({ ...base, venueState: 'CA' })

    const attorneyLookup = prismaMock.consent.findFirst.mock.calls.find(
      ([args]: any) => args.where.metadata,
    )
    expect(attorneyLookup?.[0].where.metadata).toEqual({ contains: '"attorneyId":"att-1"' })
  })
})

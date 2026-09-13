import { describe, expect, it } from 'vitest'
import { resolveClaimantContact } from './claimantContact'

const user = {
  email: 'login@example.com',
  firstName: 'Jo',
  lastName: 'Smith',
  phone: '+15559999999',
}

const facts = {
  plaintiffContext: {
    firstName: 'Joanne',
    lastName: 'Smith-Reyes',
    email: 'case@example.com',
    phone: '+15550102456',
  },
}

describe('resolving the claimant contact', () => {
  // This ordering is the point of the module. Five screens each picked their
  // own, so an attorney could read one number off the case while the platform
  // texted another. If this test is failing, the screens have drifted from the
  // server again — fix the caller, not the expectation.
  it('prefers the case copy over the account, matching the server and the SMS layer', () => {
    expect(resolveClaimantContact({ user, facts })).toMatchObject({
      firstName: 'Joanne',
      lastName: 'Smith-Reyes',
      email: 'case@example.com',
      phone: '+15550102456',
    })
  })

  it('falls back to the account when the case copy is missing that field', () => {
    expect(resolveClaimantContact({ user, facts: { plaintiffContext: { phone: '' } } })).toMatchObject({
      firstName: 'Jo',
      email: 'login@example.com',
      phone: '+15559999999',
    })
  })

  it('accepts facts still in string form, as the lead payload delivers them', () => {
    expect(resolveClaimantContact({ user, facts: JSON.stringify(facts) }).phone).toBe('+15550102456')
  })

  it('survives a facts blob that will not parse', () => {
    expect(resolveClaimantContact({ user, facts: '{not json' }).phone).toBe('+15559999999')
  })

  it('never offers the synthetic guest address as a way to reach anyone', () => {
    const guest = { ...user, email: 'guest+asm-1@caseiq.local' }

    expect(resolveClaimantContact({ user: guest, facts: {} })).toMatchObject({
      email: null,
      hasAccount: false,
    })
  })

  it('still reports the intake email for a guest case, which is reachable', () => {
    const guest = { ...user, email: 'guest+asm-1@caseiq.local' }

    expect(resolveClaimantContact({ user: guest, facts }).email).toBe('case@example.com')
  })

  it('copes with a case that has no account at all', () => {
    expect(resolveClaimantContact({ user: null, facts })).toMatchObject({
      fullName: 'Joanne Smith-Reyes',
      phone: '+15550102456',
      hasAccount: false,
    })
  })

  it('reports no name rather than an empty string when neither side has one', () => {
    expect(resolveClaimantContact({ user: null, facts: {} }).fullName).toBeNull()
  })
})

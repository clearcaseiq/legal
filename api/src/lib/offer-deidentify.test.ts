import { describe, expect, it } from 'vitest'
import { CONTACT_REVEALED_STATUSES, deidentifyAssessmentForOffer } from './offer-deidentify'

const assessment = () => ({
  id: 'a1',
  claimType: 'auto',
  caseName: 'Canseco v. Rideshare Co',
  user: { id: 'u1', firstName: 'Jose', lastName: 'Canseco', email: 'jose@example.com', phone: '555-201-3344' },
  facts: JSON.stringify({
    plaintiffContext: { firstName: 'Jose', lastName: 'Canseco', email: 'jose@example.com', phone: '5552013344', preferredContactMethod: 'sms' },
    incident: {
      date: '2026-08-01',
      narrative: 'Jose Canseco was rear-ended. Call me at (555) 201-3344 or jose@example.com. JOSE was hurt.',
    },
    damages: { pain_suffering_narrative: 'Canseco cannot sleep.', med_charges: 4200 },
  }),
})

describe('deidentifyAssessmentForOffer', () => {
  it('drops claimant contact details and keeps only the account id', () => {
    const out = deidentifyAssessmentForOffer(assessment())
    expect(out.user).toEqual({ id: 'u1' })
    const facts = JSON.parse(out.facts)
    expect(facts.plaintiffContext).toEqual({ preferredContactMethod: 'sms' })
  })

  it('scrubs names, phone numbers and emails from free text', () => {
    const out = deidentifyAssessmentForOffer(assessment())
    const facts = JSON.parse(out.facts)
    expect(facts.incident.narrative).toBe(
      '[Client] [Client] was rear-ended. Call me at [phone] or [email]. [Client] was hurt.',
    )
    expect(facts.damages.pain_suffering_narrative).toBe('[Client] cannot sleep.')
    expect(out.caseName).toBe('[Client] v. Rideshare Co')
  })

  it('leaves case facts that are not identity untouched', () => {
    const facts = JSON.parse(deidentifyAssessmentForOffer(assessment()).facts)
    expect(facts.incident.date).toBe('2026-08-01')
    expect(facts.damages.med_charges).toBe(4200)
  })

  it('handles object facts and a missing user', () => {
    const out = deidentifyAssessmentForOffer({ facts: { plaintiffContext: { email: 'a@b.co' } }, user: null })
    expect(out.facts).toEqual({ plaintiffContext: {} })
    expect(out.user).toBeNull()
  })

  it('reveals identity only once the case is accepted', () => {
    expect(CONTACT_REVEALED_STATUSES.has('submitted')).toBe(false)
    expect(CONTACT_REVEALED_STATUSES.has('contacted')).toBe(true)
  })
})

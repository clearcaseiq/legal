/**
 * The offer text is the whole product for an attorney who only reads their
 * phone, and it is billed by the segment, so both what it says and what it
 * costs are worth pinning down.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('./app-url', () => ({ webUrl: (path: string) => `https://clearcaseiq.com${path}` }))

import { buildOfferSms, buildTierOfferSms, formatLocation, formatOfferDeadline } from './offer-sms'
import { isGsm7, smsCost, toGsm7 } from './sms-text'

const BASE = {
  claimTypeLabel: 'Motor vehicle',
  jurisdiction: 'CA, Los Angeles',
  estimatedValueLow: 17_000,
  estimatedValueHigh: 37_000,
  liabilityConfidence: 'Moderate',
  introductionId: 'cmu7y2gp90002iq5z3byptk4e',
  responseWindowMinutes: 60,
  // 10:26 PM Pacific, so the hour window lands at 11:26 PM the same day.
  now: new Date('2026-09-19T05:26:00Z'),
}

describe('buildOfferSms', () => {
  it('carries a link, because the old message told attorneys to see a case file it never linked', () => {
    expect(buildOfferSms(BASE)).toContain('Details: https://clearcaseiq.com/o/CMU7Y2')
  })

  it('states the deadline as a wall clock time in the case jurisdiction', () => {
    // "in 1 hour" is only true when it is sent. This is still true when it is read.
    expect(buildOfferSms(BASE)).toContain('by 11:26 PM PDT')
  })

  it('names the day when the window crosses midnight', () => {
    const text = buildOfferSms({ ...BASE, responseWindowMinutes: 120 })
    expect(text).toContain('by Sat 12:26 AM PDT')
  })

  it('falls back to the relative window rather than guess a timezone', () => {
    const text = buildOfferSms({ ...BASE, jurisdiction: '' })
    expect(text).toContain('within 1 hour')
    expect(text).not.toContain('PDT')
  })

  it('reads the location the way a person says it', () => {
    expect(formatLocation('CA, Los Angeles')).toBe('Los Angeles, CA')
    // Not every venue is state-then-county; those are left alone.
    expect(formatLocation('Los Angeles')).toBe('Los Angeles')
  })

  it('drops the evidence placeholder, which was the least informative line in the message', () => {
    const text = buildOfferSms({ ...BASE, evidenceSummary: 'See case file' })
    expect(text.toLowerCase()).not.toContain('see case file')
  })

  it('keeps an evidence note that actually says something', () => {
    const text = buildOfferSms({ ...BASE, evidenceSummary: 'Medical treatment documented' })
    expect(text).toContain('medical treatment documented')
  })

  it('omits the value range rather than offering $0-$0', () => {
    const text = buildOfferSms({ ...BASE, estimatedValueLow: 0, estimatedValueHigh: 0 })
    expect(text).not.toContain('$0')
    expect(text).toContain('Motor vehicle, liability moderate.')
  })

  it('offers the opt-out the inbound handler has always honoured', () => {
    expect(buildOfferSms(BASE)).toContain('Reply STOP to end texts.')
  })

  it('keeps the reply codes the inbound parser matches on', () => {
    expect(buildOfferSms(BASE)).toContain('Reply ACCEPT CMU7Y2 or DECLINE CMU7Y2')
  })

  it('fits in two segments, which is what the old message should have cost', () => {
    const cost = smsCost(toGsm7(buildOfferSms(BASE)))
    expect(cost.encoding).toBe('GSM-7')
    expect(cost.segments).toBeLessThanOrEqual(2)
  })

  it('sends nothing outside GSM-7', () => {
    // The regression that started this: an en dash in the value range put the
    // whole message into UCS-2 and doubled its segment count.
    expect(isGsm7(toGsm7(buildOfferSms(BASE)))).toBe(true)
  })
})

describe('buildTierOfferSms', () => {
  it('gives the tier routers the same link, codes and opt-out', () => {
    const text = buildTierOfferSms('cmu7y2gp90002iq5z3byptk4e', 'Tier 1 case - Fixed price offer', 5)
    expect(text).toContain('Details: https://clearcaseiq.com/o/CMU7Y2')
    expect(text).toContain('Reply ACCEPT CMU7Y2 or DECLINE CMU7Y2 within 5 min.')
    expect(text).toContain('Reply STOP to end texts.')
  })
})

describe('formatOfferDeadline', () => {
  it('uses the venue state, so a New York case reads Eastern', () => {
    const text = formatOfferDeadline(60, 'NY, Kings', new Date('2026-09-19T05:26:00Z'))
    expect(text).toBe('by 2:26 AM EDT')
  })

  it('does not invent a zone for a venue it does not recognise', () => {
    expect(formatOfferDeadline(60, 'ZZ, Nowhere', new Date('2026-09-19T05:26:00Z'))).toBe(
      'within 1 hour'
    )
  })
})

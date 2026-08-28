/**
 * An inbound reply carries a phone number and a word. Deciding which offer it
 * answers used to mean "the one routed most recently", which is wrong whenever
 * the attorney is answering the older of two messages — and it accepts a case on
 * their behalf without either side noticing.
 */
import { describe, expect, it } from 'vitest'
import {
  formatResponseWindow,
  offerReferenceCode,
  offerReplyInstruction,
  selectOfferForReply,
} from './offer-reference'

describe('offerReferenceCode', () => {
  it('is stable for an id', () => {
    expect(offerReferenceCode('clx9a8b7c6d5e4f3g2h1')).toBe(offerReferenceCode('clx9a8b7c6d5e4f3g2h1'))
  })

  it('separates different offers', () => {
    expect(offerReferenceCode('intro-aaaaaa')).not.toBe(offerReferenceCode('intro-bbbbbb'))
  })

  it('is short enough to quote back in a text', () => {
    expect(offerReferenceCode('clx9a8b7c6d5e4f3g2h1')).toHaveLength(6)
  })

  it('survives ids with punctuation, so hyphenated uuids still produce a typable code', () => {
    expect(offerReferenceCode('a1b2-c3d4-e5f6')).toMatch(/^[A-Z0-9]{6}$/)
  })
})

describe('offerReplyInstruction', () => {
  it('tells the attorney which code to quote', () => {
    const instruction = offerReplyInstruction('intro-abc123', 120)
    expect(instruction).toContain(offerReferenceCode('intro-abc123'))
    expect(instruction).toMatch(/ACCEPT/)
    expect(instruction).toMatch(/DECLINE/)
  })

  it('states the window in the message', () => {
    expect(offerReplyInstruction('intro-abc123', 45)).toContain('45 min')
    expect(offerReplyInstruction('intro-abc123', 120)).toContain('2 hours')
  })
})

/**
 * The window is configurable and defaults to a day. Printing raw minutes put
 * "(1440 min)" in front of an attorney, so these pin the readable forms.
 */
describe('formatResponseWindow', () => {
  it('keeps sub-hour windows in minutes, which is how the tier routers are sized', () => {
    expect(formatResponseWindow(45)).toBe('45 min')
    expect(formatResponseWindow(3)).toBe('3 min')
  })

  it('never rounds a real window down to zero', () => {
    expect(formatResponseWindow(0.5)).toBe('1 min')
  })

  it('switches to hours, singular where it should be', () => {
    expect(formatResponseWindow(60)).toBe('1 hour')
    expect(formatResponseWindow(120)).toBe('2 hours')
    expect(formatResponseWindow(90)).toBe('1.5 hours')
  })

  it('says a day the way a person would, not 1440 minutes', () => {
    expect(formatResponseWindow(24 * 60)).toBe('24 hours')
  })

  it('switches to days once hours stop being useful', () => {
    expect(formatResponseWindow(72 * 60)).toBe('3 days')
  })
})

describe('selectOfferForReply', () => {
  const older = { id: 'intro-older-1' }
  const newer = { id: 'intro-newer-1' }

  it('reports when there is nothing open', () => {
    expect(selectOfferForReply([], null)).toEqual({ ok: false, reason: 'none' })
  })

  it('uses the only open offer when no code is quoted', () => {
    // Keeps bare "YES" working, which is what offers sent before codes existed
    // asked for, and what most attorneys will send anyway.
    expect(selectOfferForReply([older], null)).toEqual({ ok: true, introductionId: 'intro-older-1' })
  })

  it('refuses to guess between two open offers', () => {
    expect(selectOfferForReply([newer, older], null)).toEqual({ ok: false, reason: 'ambiguous' })
  })

  it('picks the offer the code names, not the most recent one', () => {
    expect(selectOfferForReply([newer, older], offerReferenceCode(older.id))).toEqual({
      ok: true,
      introductionId: 'intro-older-1',
    })
  })

  it('accepts a lower-case code, since phones like to autocorrect', () => {
    expect(selectOfferForReply([newer, older], offerReferenceCode(older.id).toLowerCase())).toEqual({
      ok: true,
      introductionId: 'intro-older-1',
    })
  })

  it('reports a code that matches nothing rather than falling back to a guess', () => {
    expect(selectOfferForReply([newer, older], 'ZZZZZZ')).toEqual({ ok: false, reason: 'unknown_code' })
  })
})

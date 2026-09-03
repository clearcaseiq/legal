import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import {
  isSmsSuppressed,
  optOutKey,
  parseSmsKeyword,
  recordSmsOptIn,
  recordSmsOptOut,
} from './sms-opt-out'

const prismaMock = prisma as any

beforeEach(() => {
  resetUniversalPrismaMock()
})

describe('optOutKey', () => {
  it('produces the same key for every format the same number is stored in', () => {
    // The point of the function: five normalizers already exist in this repo and
    // they disagree, so an opt-out recorded from an inbound `+14155550100` has
    // to match a send to a profile holding `(415) 555-0100`.
    const expected = '+14155550100'
    for (const input of [
      '4155550100',
      '14155550100',
      '+14155550100',
      '(415) 555-0100',
      '415-555-0100',
      '1 (415) 555-0100',
      '+1 415 555 0100',
    ]) {
      expect(optOutKey(input), input).toBe(expected)
    }
  })

  it('refuses a value that cannot be a dialable number, rather than storing a key that matches nothing', () => {
    expect(optOutKey('')).toBeNull()
    expect(optOutKey(null)).toBeNull()
    expect(optOutKey('555-0100')).toBeNull()
    expect(optOutKey('not a phone')).toBeNull()
  })

  it('keeps international numbers instead of dropping the opt-out', () => {
    expect(optOutKey('+44 20 7946 0958')).toBe('+442079460958')
  })
})

describe('parseSmsKeyword', () => {
  it('recognises every keyword carriers require', () => {
    for (const word of ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT', 'OPT-OUT']) {
      expect(parseSmsKeyword(word), word).toBe('stop')
    }
    for (const word of ['START', 'UNSTOP', 'RESUME', 'OPTIN']) {
      expect(parseSmsKeyword(word), word).toBe('start')
    }
    expect(parseSmsKeyword('HELP')).toBe('help')
    expect(parseSmsKeyword('INFO')).toBe('help')
  })

  it('tolerates the casing and punctuation people actually text', () => {
    expect(parseSmsKeyword('stop')).toBe('stop')
    expect(parseSmsKeyword('Stop.')).toBe('stop')
    expect(parseSmsKeyword('  STOP!  ')).toBe('stop')
    expect(parseSmsKeyword('"stop"')).toBe('stop')
  })

  it('does not treat a sentence containing the word as an opt-out request', () => {
    // Unsubscribing someone from case updates because they wrote a sentence
    // would be its own failure, and a claimant asking a question is the most
    // common inbound message there is.
    expect(parseSmsKeyword('please stop calling me about the deposition')).toBeNull()
    expect(parseSmsKeyword('can you help me upload my records')).toBeNull()
    expect(parseSmsKeyword('I want to start my claim')).toBeNull()
  })

  it('leaves attorney decision replies alone so they still reach the decision parser', () => {
    expect(parseSmsKeyword('ACCEPT')).toBeNull()
    expect(parseSmsKeyword('DECLINE A7X2')).toBeNull()
    expect(parseSmsKeyword('YES')).toBeNull()
  })
})

describe('recordSmsOptOut', () => {
  it('stores the normalized key so a later send matches it', async () => {
    await recordSmsOptOut('(415) 555-0100', 'STOP')
    expect(prismaMock.smsOptOut.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { phone: '+14155550100' } }),
    )
  })

  it('re-arms an opt-out that a previous START had lifted', async () => {
    await recordSmsOptOut('+14155550100', 'STOP')
    const call = prismaMock.smsOptOut.upsert.mock.calls[0][0]
    expect(call.update.optedInAt).toBeNull()
  })

  it('does not write a row for an unusable number', async () => {
    const recorded = await recordSmsOptOut('555')
    expect(recorded).toBe(false)
    expect(prismaMock.smsOptOut.upsert).not.toHaveBeenCalled()
  })
})

describe('recordSmsOptIn', () => {
  it('only lifts an existing opt-out, since nobody who never opted out needs a record', async () => {
    await recordSmsOptIn('+14155550100', 'START')
    expect(prismaMock.smsOptOut.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { phone: '+14155550100', optedInAt: null } }),
    )
  })
})

describe('isSmsSuppressed', () => {
  it('suppresses a number whose opt-out still stands', async () => {
    prismaMock.smsOptOut.findUnique.mockResolvedValue({ optedInAt: null })
    expect(await isSmsSuppressed('4155550100')).toBe(true)
  })

  it('allows a number that texted START afterwards', async () => {
    prismaMock.smsOptOut.findUnique.mockResolvedValue({ optedInAt: new Date() })
    expect(await isSmsSuppressed('4155550100')).toBe(false)
  })

  it('allows a number that never opted out', async () => {
    prismaMock.smsOptOut.findUnique.mockResolvedValue(null)
    expect(await isSmsSuppressed('4155550100')).toBe(false)
  })

  it('fails closed when the lookup errors', async () => {
    // Not texting someone who might have opted out is recoverable. Texting
    // someone who did is a statutory violation per message.
    prismaMock.smsOptOut.findUnique.mockRejectedValue(new Error('connection lost'))
    expect(await isSmsSuppressed('4155550100')).toBe(true)
  })
})

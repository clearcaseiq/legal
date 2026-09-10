/**
 * User-Agent to one of three buckets.
 *
 * The overlaps are what these pin down. Android tablets say "Android" and so
 * look like phones; modern iPads say "Macintosh" and so look like desktops.
 * Both matter because the whole point of the split is to tell whether the
 * wizard is losing people on small screens, and a tablet is not a small screen.
 */
import { describe, expect, it } from 'vitest'
import { deviceTypeFromUserAgent } from './device-type'

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  androidPhone:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ipad:
    'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  ipadDesktopMode:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
}

describe('phones', () => {
  it('reads an iPhone', () => {
    expect(deviceTypeFromUserAgent(UA.iphone)).toBe('mobile')
  })

  it('reads an Android phone', () => {
    expect(deviceTypeFromUserAgent(UA.androidPhone)).toBe('mobile')
  })
})

describe('tablets', () => {
  it('reads an iPad', () => {
    expect(deviceTypeFromUserAgent(UA.ipad)).toBe('tablet')
  })

  /**
   * Chrome adds "Mobile" only on phones, so an Android tablet is identified by
   * what its string does not say. Checking phone patterns first would file
   * every one of them as a phone.
   */
  it('does not mistake an Android tablet for a phone', () => {
    expect(deviceTypeFromUserAgent(UA.androidTablet)).toBe('tablet')
  })

  /** iPadOS 13+ asks for desktop sites by default and claims to be a Mac. */
  it('sees through an iPad requesting the desktop site', () => {
    expect(deviceTypeFromUserAgent(UA.ipadDesktopMode)).toBe('tablet')
  })
})

describe('desktops', () => {
  it('reads a Mac', () => {
    expect(deviceTypeFromUserAgent(UA.mac)).toBe('desktop')
  })

  it('reads Windows', () => {
    expect(deviceTypeFromUserAgent(UA.windows)).toBe('desktop')
  })
})

describe('what is not a claimant', () => {
  /**
   * Counting crawlers as desktop would inflate desktop completion rates with
   * traffic that never intended to complete anything — and the comparison
   * between desktop and mobile is the entire point of the dimension.
   */
  it('does not count a crawler as a desktop visitor', () => {
    expect(deviceTypeFromUserAgent(UA.googlebot)).toBe('unknown')
  })

  it('handles a missing header rather than guessing', () => {
    expect(deviceTypeFromUserAgent(null)).toBe('unknown')
    expect(deviceTypeFromUserAgent('')).toBe('unknown')
    expect(deviceTypeFromUserAgent('   ')).toBe('unknown')
  })

  it('files an unrecognised agent as unknown rather than as desktop', () => {
    expect(deviceTypeFromUserAgent('CustomHttpClient/1.0')).toBe('unknown')
  })
})

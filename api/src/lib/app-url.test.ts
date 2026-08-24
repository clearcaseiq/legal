import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { checkWebBaseUrl, webBaseUrl, webUrl } from './app-url'

const VARS = ['WEB_URL', 'APP_URL', 'FRONTEND_URL', 'NODE_ENV'] as const

describe('webBaseUrl', () => {
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const name of VARS) {
      saved[name] = process.env[name]
      delete process.env[name]
    }
  })

  afterEach(() => {
    for (const name of VARS) {
      if (saved[name] === undefined) delete process.env[name]
      else process.env[name] = saved[name]
    }
  })

  it('prefers WEB_URL over the legacy aliases', () => {
    process.env.WEB_URL = 'https://www.clearcaseiq.com'
    process.env.APP_URL = 'https://app.clearcaseiq.com'
    process.env.FRONTEND_URL = 'https://other.example.com'
    expect(webBaseUrl()).toBe('https://www.clearcaseiq.com')
  })

  it('accepts the legacy aliases when WEB_URL is unset', () => {
    // Five call sites read only APP_URL/FRONTEND_URL, so deployments exist that
    // set those. Dropping support would break them.
    process.env.APP_URL = 'https://app.clearcaseiq.com'
    expect(webBaseUrl()).toBe('https://app.clearcaseiq.com')

    delete process.env.APP_URL
    process.env.FRONTEND_URL = 'https://app.clearcaseiq.com'
    expect(webBaseUrl()).toBe('https://app.clearcaseiq.com')
  })

  it('strips trailing slashes so joined paths do not double up', () => {
    process.env.WEB_URL = 'https://www.clearcaseiq.com///'
    expect(webBaseUrl()).toBe('https://www.clearcaseiq.com')
    expect(webUrl('/reset-password')).toBe('https://www.clearcaseiq.com/reset-password')
  })

  it('ignores a blank value', () => {
    process.env.WEB_URL = '   '
    process.env.APP_URL = 'https://app.clearcaseiq.com'
    expect(webBaseUrl()).toBe('https://app.clearcaseiq.com')
  })

  it('falls back to localhost outside production', () => {
    // 3100 is where the Next dev server runs; the dev CORS allowlist in
    // server.ts names the same port.
    process.env.NODE_ENV = 'development'
    expect(webBaseUrl()).toBe('http://localhost:3100')
  })

  it('refuses to guess a hostname in production', () => {
    // The old code fell back to two different hardcoded domains depending on the
    // call site. Failing is the only honest option.
    process.env.NODE_ENV = 'production'
    expect(() => webBaseUrl()).toThrow(/WEB_URL must be configured/)
  })

  it('rejects a loopback address in production', () => {
    // This is the actual reported bug: plaintiffs received localhost links in
    // document requests and booking emails.
    process.env.NODE_ENV = 'production'
    for (const value of ['http://localhost:3000', 'http://127.0.0.1:5174']) {
      process.env.WEB_URL = value
      expect(() => webBaseUrl(), value).toThrow(/unreachable/)
    }
  })

  it('allows loopback outside production', () => {
    process.env.NODE_ENV = 'test'
    process.env.WEB_URL = 'http://localhost:5174'
    expect(webBaseUrl()).toBe('http://localhost:5174')
  })
})

describe('webUrl', () => {
  const saved = process.env.WEB_URL

  beforeEach(() => {
    process.env.WEB_URL = 'https://www.clearcaseiq.com'
  })

  afterEach(() => {
    if (saved === undefined) delete process.env.WEB_URL
    else process.env.WEB_URL = saved
  })

  it('joins a root-relative path', () => {
    expect(webUrl('/claim/abc')).toBe('https://www.clearcaseiq.com/claim/abc')
  })

  it('tolerates a missing leading slash', () => {
    expect(webUrl('claim/abc')).toBe('https://www.clearcaseiq.com/claim/abc')
  })

  it('returns the bare base for an empty path', () => {
    expect(webUrl('')).toBe('https://www.clearcaseiq.com')
  })

  it('preserves query strings', () => {
    expect(webUrl('/evidence-upload/a1?token=t')).toBe(
      'https://www.clearcaseiq.com/evidence-upload/a1?token=t'
    )
  })
})

describe('checkWebBaseUrl', () => {
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const name of VARS) {
      saved[name] = process.env[name]
      delete process.env[name]
    }
  })

  afterEach(() => {
    for (const name of VARS) {
      if (saved[name] === undefined) delete process.env[name]
      else process.env[name] = saved[name]
    }
  })

  it('is quiet when only WEB_URL is set', () => {
    process.env.WEB_URL = 'https://www.clearcaseiq.com'
    expect(checkWebBaseUrl()).toEqual({ baseUrl: 'https://www.clearcaseiq.com' })
  })

  it('is quiet when the aliases agree', () => {
    process.env.WEB_URL = 'https://www.clearcaseiq.com'
    process.env.APP_URL = 'https://www.clearcaseiq.com/'
    expect(checkWebBaseUrl().warning).toBeUndefined()
  })

  it('warns when the aliases disagree', () => {
    // Silent disagreement is how links ended up split across two hosts.
    process.env.WEB_URL = 'https://www.clearcaseiq.com'
    process.env.APP_URL = 'https://app.clearcaseiq.com'

    const result = checkWebBaseUrl()
    expect(result.baseUrl).toBe('https://www.clearcaseiq.com')
    expect(result.warning).toMatch(/different values/)
  })
})

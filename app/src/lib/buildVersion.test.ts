import { describe, it, expect, afterEach } from 'vitest'
import {
  currentBuildId,
  parseBuildId,
  parseBuildTime,
  formatBuildTime,
  isNewBuild,
} from './buildVersion'

afterEach(() => {
  delete (globalThis as any).__NEXT_DATA__
})

describe('currentBuildId', () => {
  it('reads the build this tab started with', () => {
    ;(globalThis as any).__NEXT_DATA__ = { buildId: 'vWstW-JkUQLZ03MY_9IKP' }

    expect(currentBuildId()).toBe('vWstW-JkUQLZ03MY_9IKP')
  })

  it('returns empty rather than guessing when the marker is absent', () => {
    expect(currentBuildId()).toBe('')
    ;(globalThis as any).__NEXT_DATA__ = {}
    expect(currentBuildId()).toBe('')
    ;(globalThis as any).__NEXT_DATA__ = { buildId: 42 }
    expect(currentBuildId()).toBe('')
  })
})

describe('parseBuildId', () => {
  it('pulls the build id out of freshly fetched HTML', () => {
    const html = '<script>{"props":{},"buildId":"abc123XYZ","runtimeConfig":{}}</script>'

    expect(parseBuildId(html)).toBe('abc123XYZ')
  })

  it('returns empty for anything it cannot read', () => {
    expect(parseBuildId('')).toBe('')
    expect(parseBuildId(null)).toBe('')
    expect(parseBuildId('<html>an error page</html>')).toBe('')
  })
})

describe('parseBuildTime', () => {
  it('pulls the build stamp the server put in the page props', () => {
    const html = '<script>{"props":{"pageProps":{"buildTime":"2026-09-18T20:15:03Z"}},"buildId":"x"}</script>'

    expect(parseBuildTime(html)).toBe('2026-09-18T20:15:03Z')
  })

  it('returns empty when the build predates the stamp', () => {
    // Images built before BUILD_TIME reached the page props carry no stamp, and
    // the prompt still has to appear for them.
    expect(parseBuildTime('<script>{"buildId":"x"}</script>')).toBe('')
    expect(parseBuildTime(null)).toBe('')
  })
})

describe('formatBuildTime', () => {
  it('renders a stamp as a date and time', () => {
    const formatted = formatBuildTime('2026-09-18T20:15:03Z', 'en-US')

    expect(formatted).toContain('2026')
    expect(formatted).toMatch(/Sep/)
  })

  it('returns null rather than "Invalid Date" for junk', () => {
    expect(formatBuildTime('not-a-date')).toBeNull()
    expect(formatBuildTime('')).toBeNull()
    expect(formatBuildTime(null)).toBeNull()
    expect(formatBuildTime(undefined)).toBeNull()
  })

  it('still gives a date when the locale tag is unsupported', () => {
    expect(formatBuildTime('2026-09-18T20:15:03Z', 'not-a-locale')).toContain('2026')
  })
})

describe('isNewBuild', () => {
  it('is true when the deployed build has moved on', () => {
    expect(isNewBuild('old', 'new')).toBe(true)
  })

  it('is false while the tab is current', () => {
    expect(isNewBuild('same', 'same')).toBe(false)
  })

  it('is false when either side is unknown', () => {
    // A failed poll or an error page must not be read as a new deploy, or a
    // flaky network would prompt a reload on every check.
    expect(isNewBuild('', 'new')).toBe(false)
    expect(isNewBuild('old', '')).toBe(false)
    expect(isNewBuild('', '')).toBe(false)
  })
})

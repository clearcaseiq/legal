import { afterEach, describe, expect, it } from 'vitest'
import { currentBuildVersion, formatBuildDate } from './buildVersion'

function setNextData(value: unknown) {
  ;(globalThis as any).__NEXT_DATA__ = value
}

afterEach(() => {
  delete (globalThis as any).__NEXT_DATA__
})

describe('currentBuildVersion', () => {
  it('shows the commit and build date', () => {
    setNextData({ buildId: 'abc', props: { pageProps: { buildCommit: 'de4a5b8', buildTime: '2026-09-24T20:00:00Z' } } })
    expect(currentBuildVersion('en-US')).toBe('de4a5b8 · Sep 24, 2026')
  })

  it('falls back to the Next build id without a commit', () => {
    setNextData({ buildId: 'k2Jd9sLq0xYz', props: { pageProps: {} } })
    expect(currentBuildVersion('en-US')).toBe('k2Jd9sLq')
  })

  it('shows nothing in development', () => {
    setNextData({ buildId: 'development', props: { pageProps: {} } })
    expect(currentBuildVersion()).toBeNull()
    delete (globalThis as any).__NEXT_DATA__
    expect(currentBuildVersion()).toBeNull()
  })
})

describe('formatBuildDate', () => {
  it('rejects an unparseable stamp', () => {
    expect(formatBuildDate('not a date')).toBeNull()
    expect(formatBuildDate('')).toBeNull()
  })
})

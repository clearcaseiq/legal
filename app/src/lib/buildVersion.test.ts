import { describe, it, expect, afterEach } from 'vitest'
import { currentBuildId, parseBuildId, isNewBuild } from './buildVersion'

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

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CONTAINER_ID, gtmContainerId, gtmHeadSnippet, gtmNoscriptSrc } from './tagManager'

const ENV_KEYS = ['SEARCH_ENGINE_INDEXING', 'NEXT_PUBLIC_GTM_CONTAINER_ID'] as const

describe('gtmContainerId', () => {
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  /**
   * The id is deliberately not required from the environment. Requiring it
   * would make a missing variable look identical to working tracking, which is
   * how the container came to be configured but not loaded in the first place.
   */
  it('falls back to the configured container rather than loading nothing', () => {
    expect(gtmContainerId()).toBe(DEFAULT_CONTAINER_ID)
  })

  it('lets the environment point at a different container', () => {
    process.env.NEXT_PUBLIC_GTM_CONTAINER_ID = 'GTM-STAGING1'
    expect(gtmContainerId()).toBe('GTM-STAGING1')
  })

  it('ignores a variable that is only whitespace', () => {
    process.env.NEXT_PUBLIC_GTM_CONTAINER_ID = '   '
    expect(gtmContainerId()).toBe(DEFAULT_CONTAINER_ID)
  })

  /**
   * One image is promoted across tiers with the id baked in, so without this
   * QA's own traffic would report into the production container and corrupt
   * the funnel it exists to measure.
   */
  it('loads no container on a host that is not the real site', () => {
    process.env.SEARCH_ENGINE_INDEXING = 'disabled'
    expect(gtmContainerId()).toBeNull()
  })

  it('treats the indexing flag case-insensitively', () => {
    process.env.SEARCH_ENGINE_INDEXING = 'DISABLED'
    expect(gtmContainerId()).toBeNull()
  })
})

describe('gtmHeadSnippet', () => {
  it('loads the container it was given', () => {
    const snippet = gtmHeadSnippet('GTM-PBTSJLC5', false)
    expect(snippet).toContain("'dataLayer','GTM-PBTSJLC5'")
    expect(snippet).toContain('googletagmanager.com/gtm.js')
  })

  /**
   * Seeded ahead of gtm.js on purpose: pushed afterwards, there is a window in
   * which tags evaluate with no value and read a sensitive route as permitted.
   */
  it('seeds the boundary variable before loading the container', () => {
    const snippet = gtmHeadSnippet('GTM-PBTSJLC5', true)
    expect(snippet.indexOf('analytics_blocked:true')).toBeLessThan(
      snippet.indexOf('gtm.start'),
    )
  })

  it('reports an unblocked landing route as false rather than omitting it', () => {
    expect(gtmHeadSnippet('GTM-PBTSJLC5', false)).toContain('analytics_blocked:false')
  })
})

describe('gtmNoscriptSrc', () => {
  it('points at the container', () => {
    expect(gtmNoscriptSrc('GTM-PBTSJLC5')).toBe(
      'https://www.googletagmanager.com/ns.html?id=GTM-PBTSJLC5',
    )
  })
})

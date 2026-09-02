import { describe, it, expect } from 'vitest'
import { allLandingPages } from './seoLandingPages'
import { injuryValueGuidePages } from './seoInjuryValueGuides'
import { hubForPage, topicHubs } from './seoTopicHubDefs'

/**
 * `Attorney Intent` was the catch-all, and it ended up holding 544 of the 674
 * English pages: the whole city layer, every filing-deadline page, and the
 * do-I-have-a-claim pages, all under a hub titled "Working With an Injury
 * Attorney". Every one of those pages rendered a breadcrumb and a hub link to a
 * topic it was not about, and they all shared one sibling-link cycle, so a
 * Fresno scooter guide offered a Fresno theme-park guide as related reading.
 *
 * These tests guard the split rather than the counts, which will move as pages
 * are added. What must not come back is a bucket that means nothing.
 */

const english = allLandingPages.filter((page) => (page.locale ?? 'en') === 'en')

describe('landing page categories', () => {
  it('gives every category in use a topic hub', () => {
    // One category, one hub. A category without one renders a breadcrumb into
    // nothing and drops the page out of /topics entirely, and nothing else in
    // the codebase would fail first.
    const orphans = [...new Set(allLandingPages.map((page) => page.category))]
      .filter((category) => !hubForPage({ category }))
    expect(orphans, 'categories with no topic hub').toEqual([])
  })

  it('gives every hub a distinct category and slug', () => {
    expect(new Set(topicHubs.map((hub) => hub.category)).size).toBe(topicHubs.length)
    expect(new Set(topicHubs.map((hub) => hub.slug)).size).toBe(topicHubs.length)
  })

  it('keeps Attorney Intent to pages about hiring an attorney', () => {
    const offTopic = english
      .filter((page) => page.category === 'Attorney Intent')
      .filter((page) => !/lawyer|attorney|hire|fees|charge/i.test(page.slug))
      .map((page) => page.slug)
    expect(offTopic, 'pages filed under the hiring hub that are not about hiring').toEqual([])
  })

  it('files every filing-deadline page under Statute of Limitations', () => {
    const misfiled = english
      .filter((page) => /statute-of-limitations/.test(page.slug))
      .filter((page) => page.category !== 'Statute of Limitations')
      .map((page) => `${page.slug} (${page.category})`)
    expect(misfiled, 'deadline pages outside the deadline hub').toEqual([])
  })

  it('keeps statewide guides out of the city layer', () => {
    // Cities is the geo layer and nothing else. The guides below are statewide
    // and belong to the buckets that carve them out, so finding one here means
    // the split has started collapsing back.
    const strays = english
      .filter((page) => page.category === 'Cities')
      .filter((page) => /statute-of-limitations|do-i-need-a-lawyer|when-to-hire/.test(page.slug))
      .map((page) => page.slug)
    expect(strays, 'statewide guides filed as city pages').toEqual([])
  })
})

describe('injury value guides', () => {
  it('gives each guide a subject of its own', () => {
    // All eight shared `cluster: 'Claim Value'`. Cluster names the H2s and the
    // Article schema, so they published one identical outline between them and
    // competed for the same term rather than for the eight questions they
    // actually answer.
    const clusters = injuryValueGuidePages.map((page) => page.cluster)
    expect(new Set(clusters).size, `duplicate clusters in ${clusters.join(', ')}`).toBe(clusters.length)
  })
})

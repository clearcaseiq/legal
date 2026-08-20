import { describe, it, expect } from 'vitest'
import { allLandingPages } from './seoLandingPages'
import { topicContentBySlug } from './seoLandingPageTopicContent'
import nextConfig from '../../next.config.mjs'

/**
 * Guards the demand-aligned rewrite.
 *
 * These five URLs were generated from the priority-page templates at roughly
 * 460-490 words, with 0.69 median similarity to their own siblings. They were
 * rewritten rather than retired because Search Console shows real impressions
 * for each subject — knee 8, elbow 6, nerve root 6, PTSD 5, meniscus 4 — and
 * "radiculopathy settlement" holds position 21, the best on the site. Three
 * siblings asking the same question were retired into them.
 */

const GUIDES = [
  '/settlements/knee-surgery-settlement',
  '/settlements/ptsd-settlement',
  '/settlements/radiculopathy-settlement',
  '/injuries/elbow-injury-after-accident',
  '/injuries/torn-meniscus-after-accident',
]

/** Retired URL -> the page that absorbed it. */
const RETIRED: Record<string, string> = {
  '/settlements/sciatica-settlement': '/settlements/radiculopathy-settlement',
  '/settlements/nerve-damage-settlement': '/settlements/radiculopathy-settlement',
  '/settlements/spinal-fusion-settlement': '/how-much-is-a-back-surgery-case-worth',
}

const bySlug = new Map(allLandingPages.map((page) => [page.slug, page]))

function prose(slug: string): string {
  const page = bySlug.get(slug)
  if (!page) throw new Error(`no page at ${slug}`)
  return JSON.stringify({ page, topic: topicContentBySlug[slug] })
}

/**
 * The page's assertions, with questions removed.
 *
 * Both knee pages raise "will I need a replacement later?" in order to answer
 * no, and an intake step asks whether a physician has mentioned future surgery.
 * Posing the question is exactly what these pages should do, so a check for
 * overclaiming has to read what the page states rather than what it asks.
 */
function assertions(slug: string): string {
  const page = bySlug.get(slug)
  if (!page) throw new Error(`no page at ${slug}`)
  return JSON.stringify({ page, topic: topicContentBySlug[slug] }, (key, value) =>
    key === 'q' || key === 'question' ? undefined : value,
  )
}

function words(slug: string): number {
  return prose(slug)
    .replace(/[^a-zA-Z ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
}

function shingles(value: string, size = 5): Set<string> {
  const parts = value
    .replace(/[^a-zA-Z ]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const set = new Set<string>()
  for (let i = 0; i + size <= parts.length; i += 1) set.add(parts.slice(i, i + size).join(' '))
  return set
}

function similarity(a: string, b: string): number {
  const left = shingles(prose(a))
  const right = shingles(prose(b))
  let shared = 0
  for (const gram of left) if (right.has(gram)) shared += 1
  return shared / (left.size + right.size - shared)
}

describe('the demand-aligned injury guides', () => {
  it('publishes all five with topic content', () => {
    for (const slug of GUIDES) {
      expect(bySlug.has(slug), `${slug} is missing`).toBe(true)
      expect(topicContentBySlug[slug], `${slug} has no topic content`).toBeDefined()
    }
  })

  it('gives each one enough substance to rank for the query it targets', () => {
    // The generated versions ran 460-490 words. Anything near that is the
    // template coming back.
    for (const slug of GUIDES) {
      expect(words(slug), `${slug} is thin`).toBeGreaterThan(1000)
    }
  })

  it('keeps them distinct from one another', () => {
    // Knee and meniscus overlap by subject on purpose, since one is the injury
    // and the other is its value. Sharing a subject is fine; sharing a document
    // is what this catches.
    for (let i = 0; i < GUIDES.length; i += 1) {
      for (let j = i + 1; j < GUIDES.length; j += 1) {
        const score = similarity(GUIDES[i], GUIDES[j])
        expect(score, `${GUIDES[i]} vs ${GUIDES[j]}`).toBeLessThan(0.2)
      }
    }
  })

  it('says it is not legal advice on every guide', () => {
    for (const slug of GUIDES) {
      expect(prose(slug).toLowerCase(), `${slug} omits the disclaimer`).toMatch(
        /not a law firm|not legal advice/,
      )
    }
  })

  it('quotes no average or typical settlement figure', () => {
    for (const slug of GUIDES) {
      const text = prose(slug).toLowerCase()
      expect(text, `${slug} quotes an average settlement`).not.toMatch(
        /average (settlement|payout|award|recovery) (is|of|ranges|runs)/,
      )
      expect(text, `${slug} quotes a typical settlement figure`).not.toMatch(
        /typical(ly)? (settle|pay|award)[a-z]* (between|around|about)? ?\$/,
      )
    }
  })

  it('does not promise arthritis or future surgery as a certainty', () => {
    // Both knee pages discuss long-term joint risk, which is legitimate only as
    // a risk a treating physician has identified. Stating it as an outcome would
    // be a medical claim this site is not in a position to make.
    for (const slug of ['/settlements/knee-surgery-settlement', '/injuries/torn-meniscus-after-accident']) {
      const text = assertions(slug).toLowerCase()
      expect(text, `${slug} states arthritis as a certainty`).not.toMatch(
        /will (develop|get|cause) arthritis|arthritis is (certain|inevitable)/,
      )
      expect(text, `${slug} promises a replacement`).not.toMatch(/will need a (knee )?replacement/)
    }
  })

  it('no longer publishes the retired siblings', () => {
    for (const slug of Object.keys(RETIRED)) {
      expect(bySlug.has(slug), `${slug} is still published`).toBe(false)
    }
  })

  it('redirects every retired sibling to a page that exists', async () => {
    const redirects = await nextConfig.redirects!()
    const bySource = new Map(redirects.map((rule) => [rule.source, rule]))

    for (const [source, destination] of Object.entries(RETIRED)) {
      const rule = bySource.get(source)
      expect(rule, `${source} has no redirect`).toBeDefined()
      expect(rule!.destination, `${source} redirects to the wrong page`).toBe(destination)
      expect(rule!.statusCode, `${source} is not a permanent redirect`).toBe(301)
      expect(bySlug.has(destination), `${source} redirects to a missing page`).toBe(true)
    }
  })

  it('leaves no page still generated from the settlement row template', () => {
    // The template stamped an identical psychology line onto every page it made.
    const templated = allLandingPages.filter(
      (page) => page.psychology === 'I need to understand what this case may be worth.',
    )
    for (const slug of GUIDES) {
      expect(
        templated.some((page) => page.slug === slug),
        `${slug} is still using the row template`,
      ).toBe(false)
    }
  })
})

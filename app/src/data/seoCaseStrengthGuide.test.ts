import { describe, it, expect } from 'vitest'
import { allLandingPages, landingPagesBySlug } from './seoLandingPages'
import { topicContentBySlug } from './seoLandingPageTopicContent'
import { SEO_CLUSTER_PREFIXES, topicHubForClusterPrefix } from './appRoutes'
import { landingPageFaqs } from './seoLandingPageSchema'
import { derivedPriorityForPath } from './sitemapPriority'
import nextConfig from '../../next.config.mjs'

const RETIRED = [
  '/case-strength/rear-end-accident',
  '/case-strength/red-light-accident',
  '/case-strength-hit-and-run',
  '/case-strength-uninsured-driver',
  '/case-strength-commercial-truck',
  '/case-strength-rideshare-accident',
  '/case-strength-motorcycle-accident',
  '/case-strength-pedestrian-accident',
]

const GUIDE = '/case-strength'

function wordsOf(slug: string): number {
  const page = landingPagesBySlug.get(slug)
  const topic = topicContentBySlug[slug]
  if (!page || !topic) return 0
  const text = [
    page.description,
    page.sections?.whyItMatters ?? '',
    page.sections?.howClearCaseHelps ?? '',
    ...(page.sections?.whatToTrack ?? []),
    ...(page.faqs ?? []).flatMap((f) => [f.q, f.a]),
    topic.scenario,
    ...topic.timeline.flat(),
    ...topic.severityLadder.flat(),
    ...topic.treatmentProgression.flatMap((t) => [t.label, t.copy]),
    ...topic.settlementDrivers,
    ...topic.settlementValueDetails.flatMap((d) => [d.label, d.copy]),
    ...topic.insuranceProblems,
    ...topic.intakeSteps.map((s) => s.question),
  ].join(' ')
  return text.split(/\s+/).filter(Boolean).length
}

describe('case strength consolidation', () => {
  it('publishes the guide with its topic content', () => {
    expect(landingPagesBySlug.has(GUIDE)).toBe(true)
    expect(topicContentBySlug[GUIDE]).toBeDefined()
  })

  it('retires all eight generated pages', () => {
    for (const slug of RETIRED) {
      expect(landingPagesBySlug.has(slug), `${slug} is still published`).toBe(false)
    }
  })

  it('leaves no per-crash-type case strength page behind', () => {
    const strays = allLandingPages
      .map((p) => p.slug)
      .filter((slug) => slug !== GUIDE && slug.includes('case-strength'))
    expect(strays).toEqual([])
  })

  it('carries the depth the eight thin pages did not', () => {
    // Each retired page ran roughly 480 words, almost all of it shared with the
    // other seven. The replacement has to justify existing on its own.
    expect(wordsOf(GUIDE)).toBeGreaterThan(1000)
  })

  it('keeps the crash-type detail rather than dropping it', () => {
    const faqs = (landingPagesBySlug.get(GUIDE)?.faqs ?? []).map((f) => `${f.q} ${f.a}`.toLowerCase())
    const joined = faqs.join(' ')
    for (const crashType of ['rear-end', 'red light', 'hit-and-run', 'uninsured', 'truck', 'rideshare', 'motorcycle', 'pedestrian']) {
      expect(joined, `no FAQ mentions ${crashType}`).toContain(crashType)
    }
  })
})

describe('the /case-strength URL', () => {
  it('is a page now, not a bare cluster prefix', () => {
    expect(SEO_CLUSTER_PREFIXES).not.toContain(GUIDE)
    expect(topicHubForClusterPrefix(GUIDE)).toBeNull()
  })

  it('does not stack a duplicate fault question into the FAQ schema', () => {
    // The prefix supplement used to be liabilityFaqs, which opens with "What if
    // I was partly at fault?" — a question the guide already answers itself.
    // Two near-identical entries in FAQPage markup is the kind of thing that
    // gets structured data ignored.
    const page = landingPagesBySlug.get(GUIDE)!
    const questions = landingPageFaqs(page).map((f) => f.q.toLowerCase())
    expect(new Set(questions).size).toBe(questions.length)
    expect(questions.filter((q) => q.includes('at fault')).length).toBeLessThanOrEqual(1)
  })

  it('still earns landing-page sitemap priority', () => {
    // The rule that gave it 0.8 keyed off the `/case-strength/` and
    // `/case-strength-` prefixes, both of which are now gone.
    expect(derivedPriorityForPath(GUIDE)).toBe('0.8')
  })
})

describe('retired case strength URLs', () => {
  it('all redirect to the guide with a 301', async () => {
    const redirects = await nextConfig.redirects!()
    const bySource = new Map(redirects.map((r) => [r.source, r]))

    for (const slug of RETIRED) {
      const rule = bySource.get(slug)
      expect(rule, `${slug} has no redirect`).toBeDefined()
      expect(rule!.destination).toBe(GUIDE)
      expect(rule!.statusCode).toBe(301)
    }
  })

  it('does not redirect the guide itself', () => {
    expect(RETIRED).not.toContain(GUIDE)
  })
})

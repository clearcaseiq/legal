import { describe, it, expect } from 'vitest'
import { allLandingPages, landingPagesBySlug } from './seoLandingPages'
import { topicContentBySlug } from './seoLandingPageTopicContent'
import { landingPageFaqs } from './seoLandingPageSchema'
import { alternatesForPath } from './localeAlternates'
import { HIRING_SLUG, FEES_SLUG, SWITCHING_SLUG } from './seoAttorneyGuides'
import nextConfig from '../../next.config.mjs'

const GUIDES = [HIRING_SLUG, FEES_SLUG, SWITCHING_SLUG]

const RETIRED: Record<string, string> = {
  '/do-i-need-a-lawyer-after-a-car-accident': HIRING_SLUG,
  '/how-much-do-lawyers-take-from-settlement': FEES_SLUG,
}

function wordsOf(slug: string): number {
  const page = landingPagesBySlug.get(slug)
  const topic = topicContentBySlug[slug]
  if (!page || !topic) return 0
  return [
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
  ]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length
}

function shingles(slug: string): Set<string> {
  const page = landingPagesBySlug.get(slug)!
  const words = [page.description, page.sections?.whyItMatters ?? '']
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const out = new Set<string>()
  for (let i = 0; i + 4 < words.length; i += 1) out.add(words.slice(i, i + 5).join(' '))
  return out
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const overlap = [...a].filter((x) => b.has(x)).length
  return overlap / (a.size + b.size - overlap)
}

describe('attorney guide consolidation', () => {
  it('publishes all three guides with topic content', () => {
    for (const slug of GUIDES) {
      expect(landingPagesBySlug.has(slug), `${slug} missing`).toBe(true)
      expect(topicContentBySlug[slug], `${slug} has no topic content`).toBeDefined()
    }
  })

  it('retires the two duplicate phrasings', () => {
    for (const slug of Object.keys(RETIRED)) {
      expect(landingPagesBySlug.has(slug), `${slug} is still published`).toBe(false)
    }
  })

  it('carries real depth rather than one templated seed', () => {
    for (const slug of GUIDES) {
      expect(wordsOf(slug), `${slug} is thin`).toBeGreaterThan(900)
    }
  })

  it('keeps the three guides genuinely distinct from one another', () => {
    // The five pages they replace scored 0.845 against each other. Anything
    // near that here would mean the split was cosmetic.
    for (let i = 0; i < GUIDES.length; i += 1) {
      for (let j = i + 1; j < GUIDES.length; j += 1) {
        const score = jaccard(shingles(GUIDES[i]), shingles(GUIDES[j]))
        expect(score, `${GUIDES[i]} vs ${GUIDES[j]}`).toBeLessThan(0.1)
      }
    }
  })

  it('leaves exactly one page per topic', () => {
    // By cluster rather than by slug pattern: `/what-medical-records-do-lawyers-need`
    // is a genuinely different page that any keyword match on "lawyer" catches.
    const clusters = new Set(GUIDES.map((slug) => landingPagesBySlug.get(slug)!.cluster))
    const owned = allLandingPages.filter((p) => clusters.has(p.cluster)).map((p) => p.slug)
    expect(owned.sort()).toEqual([...GUIDES].sort())
  })
})

describe('the surviving hiring URL', () => {
  it('keeps its Spanish alternate', () => {
    // The reason this slug survived rather than the "do I need" phrasing.
    const alternates = alternatesForPath(HIRING_SLUG).map((a) => a.hreflang)
    expect(alternates).toContain('es')
  })

  it('does not leave the Spanish page pointing at a redirect', () => {
    const es = allLandingPages.find((p) => p.translationOf === HIRING_SLUG)
    expect(es).toBeDefined()
    expect(landingPagesBySlug.has(es!.translationOf!)).toBe(true)
  })
})

describe('the fees page FAQ supplement', () => {
  it('is about fees rather than settlement value', () => {
    // It matches `/how-much-`, which supplies valuation questions about what a
    // claim is worth — a different subject from what representation costs.
    const page = landingPagesBySlug.get(FEES_SLUG)!
    const joined = landingPageFaqs(page)
      .map((f) => `${f.q} ${f.a}`)
      .join(' ')
      .toLowerCase()
    expect(joined).not.toContain('does surgery increase settlement value')
  })

  it('stacks no duplicate questions into the markup', () => {
    for (const slug of GUIDES) {
      const questions = landingPageFaqs(landingPagesBySlug.get(slug)!).map((f) => f.q.toLowerCase())
      expect(new Set(questions).size, `${slug} repeats a question`).toBe(questions.length)
    }
  })
})

describe('retired attorney URLs', () => {
  it('301 to the guide that absorbed each one', async () => {
    const redirects = await nextConfig.redirects!()
    const bySource = new Map(redirects.map((r) => [r.source, r]))

    for (const [source, destination] of Object.entries(RETIRED)) {
      const rule = bySource.get(source)
      expect(rule, `${source} has no redirect`).toBeDefined()
      expect(rule!.destination).toBe(destination)
      expect(rule!.statusCode).toBe(301)
    }
  })

  it('never redirects a surviving guide', () => {
    for (const slug of GUIDES) {
      expect(Object.keys(RETIRED)).not.toContain(slug)
    }
  })
})

import { describe, it, expect } from 'vitest'
import { allLandingPages, landingPagesBySlug } from './seoLandingPages'
import { topicContentBySlug } from './seoLandingPageTopicContent'
import { landingPageFaqs } from './seoLandingPageSchema'
import {
  INSURANCE_REVIEW_SLUG,
  CHRONOLOGY_SLUG,
  HUB_SLUG,
  ORGANIZE_SLUG,
  LAWYERS_NEED_SLUG,
} from './seoMedicalRecordsGuides'
import nextConfig from '../../next.config.mjs'

const FAMILY = [HUB_SLUG, ORGANIZE_SLUG, CHRONOLOGY_SLUG, LAWYERS_NEED_SLUG, INSURANCE_REVIEW_SLUG]

function prose(slug: string): string {
  const page = landingPagesBySlug.get(slug)!
  const topic = topicContentBySlug[slug]
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
  ].join(' ')
}

describe('the medical records family', () => {
  it('keeps all five URLs', () => {
    // Deliberately not consolidated. It scored 0.814 like the other families,
    // but it is the only one whose URLs map to demonstrated search demand, so
    // collapsing them would throw away coverage rather than duplication.
    for (const slug of FAMILY) {
      expect(landingPagesBySlug.has(slug), `${slug} was removed`).toBe(true)
    }
  })

  it('redirects none of them', async () => {
    const redirects = await nextConfig.redirects!()
    const sources = new Set(redirects.map((r) => r.source))
    for (const slug of FAMILY) {
      expect(sources.has(slug), `${slug} is redirected`).toBe(false)
    }
  })

  it('publishes each exactly once', () => {
    const counts = new Map<string, number>()
    for (const page of allLandingPages) {
      if (FAMILY.includes(page.slug)) counts.set(page.slug, (counts.get(page.slug) ?? 0) + 1)
    }
    // Each page was removed from the generated seed as it was authored, rather
    // than layered on top of it, so none should appear twice.
    for (const slug of FAMILY) expect(counts.get(slug), `${slug} appears twice`).toBe(1)
  })
})

describe('the authored guides', () => {
  it('carry real depth', () => {
    for (const slug of FAMILY) {
      const words = prose(slug).split(/\s+/).filter(Boolean).length
      expect(words, `${slug} is thin`).toBeGreaterThan(1000)
    }
  })

  it('gives the hub the access mechanics rather than a topic overview', () => {
    const text = prose(HUB_SLUG).toLowerCase()
    for (const term of ['written request', 'five working days', 'visit summar', 'itemis', 'imaging']) {
      expect(text, `omits ${term}`).toContain(term)
    }
  })

  it('makes the organize page about auditing completeness, not filing', () => {
    const text = prose(ORGANIZE_SLUG).toLowerCase()
    for (const term of ['referenc', 'missing', 'duplicate', 'index', 'outstanding']) {
      expect(text, `omits ${term}`).toContain(term)
    }
  })

  it('splits the lawyer page by stage and covers the non-medical items', () => {
    const text = prose(LAWYERS_NEED_SLUG).toLowerCase()
    for (const term of ['intake', 'wage loss', 'lien', 'future care', 'prior']) {
      expect(text, `omits ${term}`).toContain(term)
    }
  })

  it('answer the query the insurance review page actually targets', () => {
    // "medical record review insurance companies" was the highest-impression
    // query in three months of Search Console data.
    const text = prose(INSURANCE_REVIEW_SLUG).toLowerCase()
    for (const term of ['gap', 'prior', 'degenerative', 'objective', 'authorisation', 'repric']) {
      expect(text, `omits ${term}`).toContain(term)
    }
  })

  it('give the chronology page a concrete format rather than advice to be organised', () => {
    const text = prose(CHRONOLOGY_SLUG).toLowerCase()
    for (const term of ['date of service', 'one row per encounter', 'quote', 'citation', 'reconcil']) {
      expect(text, `omits ${term}`).toContain(term)
    }
  })

  it('are distinct from each other', () => {
    // Five pages on one subject is the arrangement most likely to produce the
    // duplication this whole effort was meant to remove, so every pair is
    // checked rather than only the two that were written together.
    const words = (slug: string) =>
      new Set(prose(slug).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 4))
    const sets = new Map(FAMILY.map((s) => [s, words(s)]))
    for (const a of FAMILY) {
      for (const b of FAMILY) {
        if (a >= b) continue
        const [x, y] = [sets.get(a)!, sets.get(b)!]
        const overlap = [...x].filter((w) => y.has(w)).length
        const jaccard = overlap / (x.size + y.size - overlap)
        expect(jaccard, `${a} and ${b} overlap at ${jaccard.toFixed(3)}`).toBeLessThan(0.35)
      }
    }
  })

  it('stack no duplicate questions into the FAQ markup', () => {
    for (const slug of FAMILY) {
      const questions = landingPageFaqs(landingPagesBySlug.get(slug)!).map((f) => f.q.toLowerCase())
      expect(new Set(questions).size, `${slug} repeats a question`).toBe(questions.length)
    }
  })
})

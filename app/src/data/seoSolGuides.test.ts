import { describe, it, expect } from 'vitest'
import { allLandingPages, landingPagesBySlug } from './seoLandingPages'
import { topicContentBySlug } from './seoLandingPageTopicContent'
import { alternatesForPath } from './localeAlternates'
import { CA_SOL_CLAIM_OPTIONS, CA_GOVERNMENT_CLAIM_MONTHS } from '../lib/publicCaSol'
import { INJURY_SOL_SLUG, WRONGFUL_DEATH_SOL_SLUG, MISSED_SOL_SLUG } from './seoSolGuides'
import nextConfig from '../../next.config.mjs'

const GUIDES = [INJURY_SOL_SLUG, WRONGFUL_DEATH_SOL_SLUG, MISSED_SOL_SLUG]
const RETIRED = '/california-statute-of-limitations-car-accident'

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

describe('deadline guides', () => {
  it('publishes all three with topic content', () => {
    for (const slug of GUIDES) {
      expect(landingPagesBySlug.has(slug), `${slug} missing`).toBe(true)
      expect(topicContentBySlug[slug], `${slug} has no topic content`).toBeDefined()
    }
  })

  it('actually states a deadline', () => {
    // The four pages these replace never did. They said "different rules may
    // apply" and "seek prompt legal review" across four pages about the statute
    // of limitations without anywhere saying "two years", which is the entire
    // reason somebody runs the search.
    for (const slug of GUIDES) {
      expect(prose(slug).toLowerCase(), `${slug} states no period`).toMatch(
        /two years|three years|six months|one year/,
      )
    }
  })

  it('carries real depth', () => {
    for (const slug of GUIDES) {
      const words = prose(slug).split(/\s+/).filter(Boolean).length
      expect(words, `${slug} is thin`).toBeGreaterThan(900)
    }
  })

  it('retires the car accident duplicate', () => {
    expect(landingPagesBySlug.has(RETIRED)).toBe(false)
  })

  it('keeps car accident deadlines covered on the surviving page', () => {
    // The redirect is only defensible if the destination answers the question.
    const text = prose(INJURY_SOL_SLUG).toLowerCase()
    expect(text).toContain('car accident')
    expect(text).toMatch(/property damage|damage to (the|your) (car|vehicle)/)
    expect(text).toMatch(/uninsured|underinsured/)
  })
})

describe('agreement with the SOL checker tool', () => {
  // A guide contradicting the calculator on the same site is worse than either
  // alone, so the periods quoted here are pinned to what the tool computes.
  const yearsFor = (value: string) => CA_SOL_CLAIM_OPTIONS.find((o) => o.value === value)!.years

  it('quotes the same two-year period the tool uses for ordinary injury claims', () => {
    expect(yearsFor('auto')).toBe(2)
    expect(yearsFor('slip_and_fall')).toBe(2)
    expect(prose(INJURY_SOL_SLUG).toLowerCase()).toContain('two years')
  })

  it('quotes the same one-year malpractice period', () => {
    expect(yearsFor('medmal')).toBe(1)
    expect(prose(INJURY_SOL_SLUG).toLowerCase()).toMatch(/one year/)
  })

  it('measures wrongful death from the date of death, as the tool notes', () => {
    expect(yearsFor('wrongful_death')).toBe(2)
    const note = CA_SOL_CLAIM_OPTIONS.find((o) => o.value === 'wrongful_death')!.note ?? ''
    expect(note.toLowerCase()).toContain('date of death')
    expect(prose(WRONGFUL_DEATH_SOL_SLUG).toLowerCase()).toContain('date of death')
  })

  it('quotes the same six-month government presentation window', () => {
    expect(CA_GOVERNMENT_CLAIM_MONTHS).toBe(6)
    for (const slug of GUIDES) {
      expect(prose(slug).toLowerCase(), `${slug} omits the government clock`).toMatch(
        /six months|six-month/,
      )
    }
  })
})

describe('the surviving injury URL', () => {
  it('keeps its Spanish alternate', () => {
    expect(alternatesForPath(INJURY_SOL_SLUG).map((a) => a.hreflang)).toContain('es')
  })

  it('leaves the Spanish page pointing at a live URL', () => {
    const es = allLandingPages.find((p) => p.translationOf === INJURY_SOL_SLUG)
    expect(es).toBeDefined()
    expect(landingPagesBySlug.has(es!.translationOf!)).toBe(true)
  })
})

describe('legal-information framing', () => {
  it('says it is not legal advice on every guide', () => {
    for (const slug of GUIDES) {
      expect(prose(slug).toLowerCase(), `${slug} omits the disclaimer`).toMatch(
        /not a law firm|not legal advice/,
      )
    }
  })
})

describe('the retired car accident URL', () => {
  it('301s to the surviving guide', async () => {
    const redirects = await nextConfig.redirects!()
    const rule = redirects.find((r) => r.source === RETIRED)
    expect(rule).toBeDefined()
    expect(rule!.destination).toBe(INJURY_SOL_SLUG)
    expect(rule!.statusCode).toBe(301)
  })

  it('does not redirect a surviving guide', async () => {
    const redirects = await nextConfig.redirects!()
    const sources = new Set(redirects.map((r) => r.source))
    for (const slug of GUIDES) expect(sources.has(slug), `${slug} is redirected`).toBe(false)
  })
})

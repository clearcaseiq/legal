import { describe, it, expect } from 'vitest'
import { allLandingPages, type LandingPage } from './seoLandingPages'
import { topicContentBySlug } from './seoLandingPageTopicContent'
import { cityLocalFacts } from './seoCityLocalFacts'

/**
 * Guards the city guides.
 *
 * These were generated from one row template with the city name interpolated,
 * measuring 0.805 similarity on page data and 0.639 once the local-facts block
 * rendered alongside them was counted. Pages differing only by a place name are
 * the doorway-page pattern, so the depth and distinctness checks matter here
 * more than on any other family.
 *
 * The deadline checks matter more still. These pages tell people that a claim
 * against a public agency must be presented within six months rather than two
 * years, and a wrong number would cost someone their claim outright.
 */

const CITIES = [
  '/long-beach-car-accident',
  '/anaheim-car-accident',
  '/irvine-car-accident',
  '/riverside-car-accident',
  '/oakland-car-accident',
  '/fresno-car-accident',
  '/bakersfield-car-accident',
]

const bySlug = new Map(allLandingPages.map((page) => [page.slug, page]))

function prose(slug: string): string {
  const page = bySlug.get(slug)
  if (!page) throw new Error(`no page at ${slug}`)
  return JSON.stringify({ page, topic: topicContentBySlug[slug], facts: cityLocalFacts[slug] })
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

describe('the city guides', () => {
  it('publishes all seven with topic content and local facts', () => {
    for (const slug of CITIES) {
      expect(bySlug.has(slug), `${slug} is missing`).toBe(true)
      expect(topicContentBySlug[slug], `${slug} has no topic content`).toBeDefined()
      expect(cityLocalFacts[slug], `${slug} has no local facts`).toBeDefined()
    }
  })

  it('gives each city enough substance to stand on its own', () => {
    // The generated versions ran 511-523 words including the facts block.
    for (const slug of CITIES) {
      expect(words(slug), `${slug} is thin`).toBeGreaterThan(1200)
    }
  })

  it('keeps the cities distinct from one another', () => {
    // They share a statutory paragraph on the Government Claims Act by design,
    // since it applies everywhere. Everything around it should differ.
    for (let i = 0; i < CITIES.length; i += 1) {
      for (let j = i + 1; j < CITIES.length; j += 1) {
        const score = similarity(CITIES[i], CITIES[j])
        expect(score, `${CITIES[i]} vs ${CITIES[j]}`).toBeLessThan(0.35)
      }
    }
  })

  it('states the government claim deadline correctly wherever it appears', () => {
    // Gov. Code § 911.2 gives six months to present a personal injury claim;
    // § 912.4 gives the entity 45 days; § 945.6 then allows six months from a
    // written rejection or two years from accrual if none was given. Publishing
    // a longer presentation window than the statute allows would cost a reader
    // their claim, so the wrong numbers are named explicitly here.
    for (const slug of CITIES) {
      const text = prose(slug).toLowerCase()
      if (!text.includes('government claims act')) continue

      expect(text, `${slug} states the wrong presentation deadline`).not.toMatch(
        /(one year|twelve months|two years|90 days|ninety days) to present/,
      )
      expect(text, `${slug} misstates the response period`).not.toMatch(
        /(30|60|90) days to respond/,
      )
      expect(text, `${slug} omits the six-month presentation rule`).toMatch(/six months/)
    }
  })

  it('names a real local public agency on every city page', () => {
    // The deadline point is only local if the agencies are. A page repeating the
    // statute without naming who it applies to here is back to being a template.
    for (const slug of CITIES) {
      const facts = cityLocalFacts[slug]
      expect(facts.publicAgencies.length, `${slug} names no public agencies`).toBeGreaterThan(0)

      const text = prose(slug)
      const named = facts.publicAgencies.some((agency) => {
        const lead = agency.split(/ (buses|and|vehicles)/)[0]
        return text.includes(lead)
      })
      expect(named, `${slug} never names its own agencies in the prose`).toBe(true)
    }
  })

  it('does not present itself as a law firm or attorney directory', () => {
    // These URLs target queries with hiring intent, and ClearCaseIQ is not a law
    // firm. Every page has to say so rather than compete as one.
    for (const slug of CITIES) {
      const text = prose(slug).toLowerCase()
      expect(text, `${slug} omits the not-a-law-firm disclosure`).toMatch(/not a law firm/)
      expect(text, `${slug} claims to represent people`).not.toMatch(
        /our attorneys|we represent you|hire us|our lawyers/,
      )
    }
  })

  it('quotes no settlement figure for any city', () => {
    for (const slug of CITIES) {
      const text = prose(slug)
      expect(text, `${slug} quotes a dollar figure`).not.toMatch(/\$[\d,]{3,}/)
    }
  })

  it('leaves no city still generated from the row template', () => {
    const templated = allLandingPages.filter(
      (page: LandingPage) =>
        page.psychology === 'I need to understand my local California accident claim.',
    )
    expect(templated, 'the city row template is still producing pages').toHaveLength(0)
  })
})

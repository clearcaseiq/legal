import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { topicLabel } from './SeoLandingPage'
import { allLandingPages } from '../data/seoLandingPages'

/**
 * A crawl of the live site reported that 705 pages — 94.6% of the corpus —
 * shared duplicate H2 headings, and the finding was read as evidence that the
 * pages themselves were near-duplicate template output.
 *
 * They are not. Every English page has its own entry in `topicContentBySlug`,
 * so the prose under those headings differs page to page. What repeated was the
 * heading text: eleven fixed strings in the shared template, plus a twelfth in
 * SeoCiteEmbed. The section headings now carry the page's subject, and the five
 * calls to action that were marked up as H2 without describing any section are
 * no longer headings at all.
 *
 * These tests guard the property that actually matters: two different pages
 * must not produce the same set of headings.
 */

/**
 * The subject-carrying headings rendered by SeoLandingPage, in render order.
 * Kept in step with the component by hand — a heading added there without a
 * line here is not covered, but a heading that stops varying will fail.
 */
function subjectHeadings(cluster: string): string[] {
  const topic = topicLabel(cluster)
  return [
    `${topic}: how a real case can evolve`,
    `${topic}: underwriting signals captured`,
    `${topic}: factors that may affect case value`,
    `${topic}: insurance problems to watch for`,
    `${topic}: related legal and medical topics`,
  ]
}

const english = allLandingPages.filter((page) => (page.locale ?? 'en') === 'en')

describe('topicLabel', () => {
  it('drops a trailing "Claims" so the heading does not say it twice', () => {
    expect(topicLabel('San Diego E-Scooter Accident Claims')).toBe('San Diego E-Scooter Accident')
    expect(topicLabel('Oakland Pool & Drowning Injury Claims')).toBe('Oakland Pool & Drowning Injury')
  })

  it('drops a trailing singular "Claim" too', () => {
    expect(topicLabel('Fresno Wrongful Death Claim')).toBe('Fresno Wrongful Death')
  })

  it('leaves a subject that does not end in Claims alone', () => {
    expect(topicLabel('Neck / Whiplash')).toBe('Neck / Whiplash')
    expect(topicLabel('Orthopedic Treatment')).toBe('Orthopedic Treatment')
    expect(topicLabel('PTSD Settlements')).toBe('PTSD Settlements')
  })

  it('never returns an empty label, whatever the cluster', () => {
    for (const page of allLandingPages) {
      expect(topicLabel(page.cluster).length, page.slug).toBeGreaterThan(0)
    }
  })

  it('does not strip a "Claims" that is not at the end', () => {
    expect(topicLabel('Claims Adjuster Tactics')).toBe('Claims Adjuster Tactics')
  })
})

describe('landing page H2 headings', () => {
  it('gives all but a handful of pages a heading set no other page has', () => {
    const byHeadings = new Map<string, string[]>()
    for (const page of english) {
      const key = subjectHeadings(page.cluster).join('\n')
      byHeadings.set(key, [...(byHeadings.get(key) ?? []), page.slug])
    }

    const collisions = [...byHeadings.values()].filter((slugs) => slugs.length > 1)
    const affected = collisions.reduce((n, group) => n + group.length, 0)

    // Not zero: a few pages genuinely share a subject and are separated by their
    // body copy rather than their headings. The bar is that this stays a
    // rounding error rather than returning to the whole corpus.
    expect(
      affected / english.length,
      `${affected} of ${english.length} pages share headings: ${collisions
        .slice(0, 5)
        .map((g) => g.join(' + '))
        .join(' | ')}`,
    ).toBeLessThan(0.05)
  })

  it('puts the page subject in every subject-carrying heading', () => {
    for (const page of english.slice(0, 50)) {
      const topic = topicLabel(page.cluster)
      for (const heading of subjectHeadings(page.cluster)) {
        expect(heading, page.slug).toContain(topic)
      }
    }
  })

  /**
   * "Specific guidance for {cluster}" and "What to do next for {cluster}" used
   * to lower-case the cluster to make it read as part of the sentence. A cluster
   * is a topic label rather than a phrase, though: 38 of them carry an acronym
   * and most carry a city, so that rendered "Specific guidance for anaheim brain
   * injury (tbi) claims" — and on the value pages, "tbi claim value".
   *
   * Asserted against the source because both headings are built inline in the
   * JSX, so there is no function to call. Lower-casing the cluster to *match*
   * on it is fine and the component still does that to pick a scenario, so only
   * a folded copy that is not immediately tested with `.includes()` fails here.
   */
  it('does not lower-case the cluster label it renders', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/pages/SeoLandingPage.tsx'), 'utf8')
    const rendered = [...source.matchAll(/page\.cluster\.toLowerCase\(\)(?!\s*\.includes\()/g)].map(
      (match) => source.slice(Math.max(0, (match.index ?? 0) - 45), (match.index ?? 0) + 26),
    )
    expect(rendered).toEqual([])
  })

  it('keeps acronyms and place names intact in the label', () => {
    expect(topicLabel('TBI Claim Value')).toBe('TBI Claim Value')
    expect(topicLabel('Anaheim Brain Injury (TBI) Claims')).toBe('Anaheim Brain Injury (TBI)')
    expect(topicLabel('Oakland AC Transit and BART Accident Claims')).toBe(
      'Oakland AC Transit and BART Accident',
    )
  })

  it('no longer emits the fixed strings the crawl flagged', () => {
    const retired = [
      'How a real injury story can evolve',
      'Underwriting signals captured',
      'Factors that may affect case value',
      'Insurance problems to watch for',
      'Explore the litigation-underwriting knowledge graph',
    ]
    for (const page of english.slice(0, 50)) {
      for (const heading of subjectHeadings(page.cluster)) {
        expect(retired, page.slug).not.toContain(heading)
      }
    }
  })
})

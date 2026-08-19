import { describe, it, expect } from 'vitest'
import { sectionCopy } from './SeoLandingPage'
import { allLandingPages, type LandingPageCategory } from '../data/seoLandingPages'
import { topicContentBySlug } from '../data/seoLandingPageTopicContent'

/**
 * Three sections render `topicContent` under headings written for injury pages.
 * Applied to every category, that put insurance claim stages under "How
 * symptoms can change after an accident" and liability scene evidence under
 * "Treatment progression" — right content, wrong heading.
 */

/** Categories whose `topicContent` really is about symptoms and treatment. */
const INJURY_CATEGORIES: LandingPageCategory[] = ['Symptoms', 'Treatment', 'Educational / SEO Moat']

const SYMPTOM_WORDS = /symptom|injury severity|treatment progression/i

describe('landing page section headings', () => {
  it('does not describe non-injury pages in symptom language', () => {
    const categories = [...new Set(allLandingPages.map((p) => p.category))]
    for (const category of categories) {
      if (INJURY_CATEGORIES.includes(category)) continue
      for (const key of ['timeline', 'severity', 'progression'] as const) {
        const copy = sectionCopy(category, key)
        expect(`${copy.eyebrow} ${copy.title}`, `${category}/${key}`).not.toMatch(SYMPTOM_WORDS)
      }
    }
  })

  it('leaves the injury categories on the original wording', () => {
    for (const category of INJURY_CATEGORIES) {
      expect(sectionCopy(category, 'timeline').title).toBe(
        'How symptoms can change after an accident',
      )
      expect(sectionCopy(category, 'severity').title).toBe('Injury severity ladder')
    }
  })

  it('always returns copy for every category and section', () => {
    const categories = [...new Set(allLandingPages.map((p) => p.category))]
    for (const category of categories) {
      for (const key of ['timeline', 'severity', 'progression'] as const) {
        const copy = sectionCopy(category, key)
        expect(copy.title.length, `${category}/${key}`).toBeGreaterThan(0)
        expect(copy.intro.length, `${category}/${key}`).toBeGreaterThan(0)
      }
    }
  })

  it('gives the consolidated insurance guides claim-stage headings', () => {
    for (const slug of ['/insurance/claim-denial', '/insurance/settlement-process']) {
      const page = allLandingPages.find((p) => p.slug === slug)!
      expect(topicContentBySlug[slug]).toBeDefined()
      expect(sectionCopy(page.category, 'timeline').title).toBe(
        'How an insurance claim moves over time',
      )
    }
  })
})

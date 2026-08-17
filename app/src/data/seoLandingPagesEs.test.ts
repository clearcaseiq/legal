import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { localeFromPath } from '../i18n/routing'
import { alternatesForPath } from './localeAlternates'
import { landingPagesBySlug } from './seoLandingPages'
import { MAX_TITLE_LENGTH, clampDescription, clampTitle, landingPageFaqs } from './seoLandingPageSchema'
import { marketingPagesEs } from './marketingPagesEs'
import { CATEGORY_LABELS_ES, landingPagesEs, relatedPagesEs } from './seoLandingPagesEs'
import { LANDING_ES_SLUGS } from './seoLandingPagesEsSlugs'
import { priorityForPath } from './sitemapPriority'

describe('Spanish landing pages', () => {
  it('has every page under the /es prefix', () => {
    for (const page of landingPagesEs) {
      expect(page.slug.startsWith('/es/')).toBe(true)
      expect(localeFromPath(page.slug)).toBe('es')
      expect(page.locale).toBe('es')
    }
  })

  it('points every translation at an English page that exists', () => {
    for (const page of landingPagesEs) {
      if (!page.translationOf) continue
      expect(landingPagesBySlug.has(page.translationOf)).toBe(true)
    }
  })

  it('seeds the namespaces the shared Layout reads', () => {
    // Without these the page body is Spanish and the header and footer wrapped
    // around it are English, which is the exact failure this template exists to
    // rule out.
    for (const page of landingPagesEs) {
      expect(page.namespaces).toContain('common')
      expect(page.namespaces).toContain('footer')
    }
  })

  it('writes titles and descriptions that survive the snippet limits intact', () => {
    // Every one of these was being clipped mid-phrase, so the snippet Google
    // showed ended "...y límites de la…". A description that does not fit is a
    // description someone else finishes for you.
    for (const page of [...landingPagesEs, ...marketingPagesEs]) {
      const description = 'description' in page ? page.description : ''
      expect(clampDescription(description), page.title).toBe(description)
      expect(clampTitle(page.title).length, page.title).toBeLessThanOrEqual(MAX_TITLE_LENGTH)
    }
  })

  it('has a Spanish label for every category it uses', () => {
    for (const page of landingPagesEs) {
      expect(CATEGORY_LABELS_ES[page.category]).toBeTruthy()
    }
  })
})

describe('no field the template renders is empty', () => {
  /**
   * The template has no fallbacks by design, so an empty field renders nothing
   * rather than rendering English. That is the safe failure, but it is still a
   * gap in a published page, so it fails here instead.
   */
  it('fills every required field', () => {
    for (const page of landingPagesEs) {
      const scalars = [page.title, page.eyebrow, page.description, page.intro, page.cta, page.cluster, page.psychology]
      for (const value of scalars) {
        expect(value.trim().length, `${page.slug}`).toBeGreaterThan(0)
      }

      expect(page.body.length, `${page.slug} body`).toBeGreaterThan(2)
      expect(page.faqs.length, `${page.slug} faqs`).toBeGreaterThan(2)
      expect(page.exampleQueries.length).toBeGreaterThan(0)
      expect(page.signals.length).toBeGreaterThan(0)
      expect(page.sections.whyItMatters.trim().length).toBeGreaterThan(0)
      expect(page.sections.howClearCaseHelps.trim().length).toBeGreaterThan(0)
      expect(page.sections.whatToTrack.length).toBeGreaterThan(0)
    }
  })

  it('fills every optional block it opted into', () => {
    for (const page of landingPagesEs) {
      if (page.timeline) {
        expect(page.timeline.heading.trim()).not.toBe('')
        expect(page.timeline.rows.length).toBeGreaterThan(1)
        for (const [label, detail] of page.timeline.rows) {
          expect(label.trim()).not.toBe('')
          expect(detail.trim()).not.toBe('')
        }
      }
      if (page.checklist) {
        expect(page.checklist.heading.trim()).not.toBe('')
        expect(page.checklist.items.length).toBeGreaterThan(2)
      }
      if (page.warning) {
        expect(page.warning.heading.trim()).not.toBe('')
        expect(page.warning.body.trim()).not.toBe('')
      }
      for (const section of page.body) {
        expect(section.heading.trim()).not.toBe('')
        expect(section.body.trim()).not.toBe('')
      }
    }
  })

  it('never reuses a heading inside one page, since headings are React keys', () => {
    for (const page of landingPagesEs) {
      const headings = page.body.map((section) => section.heading)
      expect(new Set(headings).size).toBe(headings.length)

      const questions = page.faqs.map((faq) => faq.q)
      expect(new Set(questions).size).toBe(questions.length)
    }
  })
})

describe('the content is actually Spanish', () => {
  /**
   * A cheap smoke test, not a language detector. It catches the realistic
   * mistake — a block pasted from the English corpus and left untranslated —
   * which is the one failure mode a screenshot would not reveal.
   */
  const ENGLISH_GIVEAWAYS =
    /\b(the|your|and|with|settlement|insurance|accident|claim|medical|attorney|treatment)\b/i

  it('has no English prose in any rendered field', () => {
    for (const page of landingPagesEs) {
      const rendered = [
        page.title,
        page.eyebrow,
        page.description,
        page.intro,
        page.cta,
        page.sections.whyItMatters,
        page.sections.howClearCaseHelps,
        ...page.sections.whatToTrack,
        ...page.body.flatMap((section) => [section.heading, section.body, ...(section.bullets ?? [])]),
        ...page.faqs.flatMap((faq) => [faq.q, faq.a]),
        ...(page.checklist ? [page.checklist.heading, ...page.checklist.items] : []),
        ...(page.warning ? [page.warning.heading, page.warning.body] : []),
        ...(page.timeline ? [page.timeline.heading, ...page.timeline.rows.flat()] : []),
      ]

      for (const text of rendered) {
        expect(ENGLISH_GIVEAWAYS.test(text), `${page.slug}: "${text.slice(0, 70)}"`).toBe(false)
      }
    }
  })

  it('emits no English FAQ into a Spanish page', () => {
    // The shared English FAQ pools are appended to every English page. A Spanish
    // page must get only the questions written for it.
    for (const page of landingPagesEs) {
      expect(landingPageFaqCount(page.slug)).toBe(page.faqs.length)
    }
  })
})

describe('Spanish landing routes', () => {
  it('keeps the router slug list and the registry in step', () => {
    expect([...LANDING_ES_SLUGS].sort()).toEqual(landingPagesEs.map((page) => page.slug).sort())
  })

  it('declares a route in App.tsx for every page', () => {
    const source = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8')
    // The pages are routed by mapping LANDING_ES_SLUGS, so the check is that
    // App.tsx uses that list and declares the hub the pages link up to.
    expect(source).toContain('LANDING_ES_SLUGS.map')
    expect(source).toContain('path="/es/temas"')
  })

  it('links every page to enough siblings to avoid an orphan', () => {
    for (const page of landingPagesEs) {
      const related = relatedPagesEs(page.slug, 4)
      expect(related.length).toBeGreaterThan(1)
      expect(related.some((sibling) => sibling.slug === page.slug)).toBe(false)
    }
  })

  it('gives a translated page the priority of its English twin', () => {
    for (const page of landingPagesEs) {
      if (!page.translationOf) continue
      expect(priorityForPath(page.slug)).toBe(priorityForPath(page.translationOf))
    }
  })

  it('pairs translated pages with hreflang and leaves the Spanish-only page alone', () => {
    for (const page of landingPagesEs) {
      const links = alternatesForPath(page.slug)
      if (page.translationOf) {
        expect(links.some((link) => link.path === page.slug)).toBe(true)
        expect(links.some((link) => link.path === page.translationOf)).toBe(true)
      } else {
        // No twin means no annotation. A lone self-reference is the "no return
        // tag" error that makes Google discard a whole hreflang set.
        expect(links).toEqual([])
      }
    }
  })
})

/**
 * How many FAQs the shared assembly path produces for this page.
 *
 * Goes through `landingPageFaqs` rather than reading the field, because that
 * function is what appends the English pools and what feeds the FAQPage schema.
 */
function landingPageFaqCount(slug: string) {
  const page = landingPagesBySlug.get(slug)
  if (!page) throw new Error(`${slug} is not registered in allLandingPages`)
  return landingPageFaqs(page).length
}

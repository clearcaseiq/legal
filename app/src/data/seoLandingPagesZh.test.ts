import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { localeFromPath } from '../i18n/routing'
import { alternatesForPath } from './localeAlternates'
import { landingPagesBySlug } from './seoLandingPages'
import { MAX_TITLE_LENGTH, clampDescription, clampTitle, landingPageFaqs } from './seoLandingPageSchema'
import { CATEGORY_LABELS_ZH, landingPagesZh, relatedPagesZh } from './seoLandingPagesZh'
import { LANDING_ZH_SLUGS } from './seoLandingPagesZhSlugs'
import { priorityForPath } from './sitemapPriority'

describe('Chinese landing pages', () => {
  it('has every page under the /zh prefix', () => {
    for (const page of landingPagesZh) {
      expect(page.slug.startsWith('/zh/')).toBe(true)
      expect(localeFromPath(page.slug)).toBe('zh')
      expect(page.locale).toBe('zh')
    }
  })

  it('uses ASCII slugs so URLs survive logs and analytics intact', () => {
    for (const page of landingPagesZh) {
      expect(page.slug, `${page.slug} is not ASCII`).toMatch(/^[\x20-\x7E]+$/)
    }
  })

  it('points every translation at an English page that exists', () => {
    for (const page of landingPagesZh) {
      expect(page.translationOf, `${page.slug} needs a translationOf`).toBeTruthy()
      expect(landingPagesBySlug.has(page.translationOf!)).toBe(true)
    }
  })

  it('seeds the namespaces the shared Layout reads', () => {
    // Without these the page body is Chinese and the header and footer wrapped
    // around it are English, the exact failure this template exists to rule out.
    for (const page of landingPagesZh) {
      expect(page.namespaces).toContain('common')
      expect(page.namespaces).toContain('footer')
    }
  })

  it('keeps titles and descriptions inside the CJK snippet limits', () => {
    // Google cuts Chinese titles around 30 characters and descriptions around 80,
    // roughly half the Latin-script limits, because CJK glyphs are full-width.
    // `clampDescription` counts characters and is blind to that, so these are
    // authored short rather than clamped short.
    for (const page of landingPagesZh) {
      expect(page.title.length, `${page.slug} title`).toBeLessThanOrEqual(40)
      expect(page.description.length, `${page.slug} description`).toBeLessThanOrEqual(80)
      // Still inside the Latin-script clamps, so nothing is truncated downstream.
      expect(clampDescription(page.description), page.slug).toBe(page.description)
      expect(clampTitle(page.title).length, page.slug).toBeLessThanOrEqual(MAX_TITLE_LENGTH)
    }
  })

  it('has a Chinese label for every category it uses', () => {
    for (const page of landingPagesZh) {
      expect(CATEGORY_LABELS_ZH[page.category]).toBeTruthy()
    }
  })
})

describe('no field the template renders is empty', () => {
  it('fills every required field', () => {
    for (const page of landingPagesZh) {
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
    for (const page of landingPagesZh) {
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
    for (const page of landingPagesZh) {
      const headings = page.body.map((section) => section.heading)
      expect(new Set(headings).size).toBe(headings.length)

      const questions = page.faqs.map((faq) => faq.q)
      expect(new Set(questions).size).toBe(questions.length)
    }
  })
})

describe('the content is actually Chinese', () => {
  /**
   * A cheap smoke test, not a language detector. It catches the realistic
   * mistake — a block pasted from the English corpus and left untranslated —
   * which is the one failure a screenshot would not reveal. Brand and product
   * names (ClearCaseIQ, Uber, Lyft) are the only Latin words allowed, so they
   * are not in the giveaway list.
   */
  const ENGLISH_GIVEAWAYS =
    /\b(the|your|and|with|settlement|insurance|accident|claim|medical|attorney|treatment)\b/i
  const HAN = /[\u4e00-\u9fff]/

  it('has no English prose in any rendered field, and every field has Chinese', () => {
    for (const page of landingPagesZh) {
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
        expect(ENGLISH_GIVEAWAYS.test(text), `${page.slug}: "${text.slice(0, 40)}"`).toBe(false)
        expect(HAN.test(text), `${page.slug} has a non-Chinese field: "${text.slice(0, 40)}"`).toBe(true)
      }
    }
  })

  it('emits no English FAQ into a Chinese page', () => {
    // The shared English FAQ pools are appended to every English page. A Chinese
    // page must get only the questions written for it.
    for (const page of landingPagesZh) {
      expect(landingPageFaqCount(page.slug)).toBe(page.faqs.length)
    }
  })
})

describe('Chinese landing routes', () => {
  it('keeps the router slug list and the registry in step', () => {
    expect([...LANDING_ZH_SLUGS].sort()).toEqual(landingPagesZh.map((page) => page.slug).sort())
  })

  it('declares a route in App.tsx for every page', () => {
    const source = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8')
    // The pages are routed by mapping LANDING_ZH_SLUGS, so the check is that
    // App.tsx uses that list and declares the hub the pages link up to.
    expect(source).toContain('LANDING_ZH_SLUGS.map')
    expect(source).toContain('path="/zh/zhuti"')
  })

  it('links every page to enough siblings to avoid an orphan', () => {
    for (const page of landingPagesZh) {
      const related = relatedPagesZh(page.slug, 4)
      expect(related.length).toBeGreaterThan(1)
      expect(related.some((sibling) => sibling.slug === page.slug)).toBe(false)
    }
  })

  it('gives a translated page the priority of its English twin', () => {
    for (const page of landingPagesZh) {
      expect(priorityForPath(page.slug)).toBe(priorityForPath(page.translationOf!))
    }
  })

  it('pairs every page with hreflang that includes its English twin', () => {
    for (const page of landingPagesZh) {
      const links = alternatesForPath(page.slug)
      expect(links.some((link) => link.path === page.slug)).toBe(true)
      expect(links.some((link) => link.path === page.translationOf)).toBe(true)
      // Simplified Chinese is annotated by script, never a bare `zh`.
      const tags = links.map((link) => link.hreflang)
      expect(tags).toContain('zh-Hans')
      expect(tags).not.toContain('zh')
    }
  })
})

function landingPageFaqCount(slug: string) {
  const page = landingPagesBySlug.get(slug)
  if (!page) throw new Error(`${slug} is not registered in allLandingPages`)
  return landingPageFaqs(page).length
}

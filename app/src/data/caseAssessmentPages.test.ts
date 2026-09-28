import { describe, expect, it } from 'vitest'
import { caseAssessmentPages, caseAssessmentStartHref } from './caseAssessmentPages'
import { marketingPagesByPath, marketingSitemapPaths } from './marketingPages'
import { caseTypePreset } from '../lib/caseTaxonomy'

describe('case assessment landing pages', () => {
  it('are server-rendered, noindexed, and kept out of the sitemap', () => {
    for (const page of caseAssessmentPages) {
      const entry = marketingPagesByPath.get(page.path)
      expect(entry?.serverRender).toBe(true)
      expect(entry?.noindex).toBe(true)
      expect(marketingSitemapPaths).not.toContain(page.path)
    }
  })

  it('open the assessment with a case type the wizard recognises', () => {
    for (const page of caseAssessmentPages) {
      const url = new URL(caseAssessmentStartHref(page), 'https://example.test')
      expect(url.pathname).toBe('/assess')
      expect(url.searchParams.get('fresh')).toBe('1')
      if (page.presetType) expect(caseTypePreset(url.searchParams.get('type'))).not.toBeNull()
    }
  })
})

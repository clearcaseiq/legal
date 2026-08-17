import { describe, expect, it } from 'vitest'
import { marketingSitemapPaths } from './marketingPages'
import { allLandingPages } from './seoLandingPages'
import { derivedPriorityForPath, exactPriorities, priorityForPath } from './sitemapPriority'

const sitemapPaths = new Set([...marketingSitemapPaths, ...allLandingPages.map((page) => page.slug)])

describe('sitemap priority', () => {
  it('only names URLs the sitemap actually lists', () => {
    const dead = Object.keys(exactPriorities).filter((path) => !sitemapPaths.has(path))
    expect(dead).toEqual([])
  })

  it('does not restate a value the prefix rules already produce', () => {
    // A key that agrees with the derived value is dead weight, and dead weight is
    // what let four keys drift onto nonexistent slugs unnoticed.
    const redundant = Object.entries(exactPriorities).filter(
      ([path, priority]) => derivedPriorityForPath(path) === priority
    )
    expect(redundant).toEqual([])
  })

  it('emits a valid priority for every listed URL', () => {
    for (const path of sitemapPaths) {
      const priority = Number(priorityForPath(path))
      expect(priority).toBeGreaterThan(0)
      expect(priority).toBeLessThanOrEqual(1)
    }
  })

  it('gives a translation the same priority as the page it translates', () => {
    expect(priorityForPath('/es')).toBe(priorityForPath('/'))
    expect(priorityForPath('/es/como-funciona')).toBe(priorityForPath('/how-it-works'))
    expect(priorityForPath('/es/red-de-abogados')).toBe(priorityForPath('/attorney-network'))
  })

  it('ranks the calculator tools above ordinary pages', () => {
    expect(priorityForPath('/tools/settlement-calculator')).toBe('1.0')
    for (const slug of [
      '/tools/whiplash-settlement-calculator',
      '/tools/herniated-disc-calculator',
      '/tools/tbi-settlement-calculator',
      '/tools/truck-accident-calculator',
      '/tools/uber-accident-calculator',
    ]) {
      expect(sitemapPaths.has(slug)).toBe(true)
      expect(priorityForPath(slug)).toBe('0.9')
    }
  })
})

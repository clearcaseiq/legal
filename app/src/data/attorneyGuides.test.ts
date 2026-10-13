import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { attorneyGuides } from './attorneyGuides'
import { renderAttorneyGuideDocs } from './attorneyGuidesMarkdown'

const docsDir = join(__dirname, '..', '..', '..', 'docs', 'attorney-guides')

function appRoutePatterns(): RegExp[] {
  const source = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8')
  const paths = new Set<string>()
  for (const match of source.matchAll(/\bpath="([^"]+)"/g)) paths.add(match[1])
  return [...paths].map((path) => {
    const pattern = path
      .split('/')
      .map((segment) => (segment.startsWith(':') ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
      .join('/')
    return new RegExp(`^${pattern}$`)
  })
}

describe('attorneyGuides data', () => {
  it('has unique slugs', () => {
    const slugs = attorneyGuides.map((guide) => guide.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('gives every guide a title, summary and sections with content', () => {
    for (const guide of attorneyGuides) {
      expect(guide.title.trim(), guide.slug).not.toBe('')
      expect(guide.summary.trim(), guide.slug).not.toBe('')
      expect(guide.sections.length, guide.slug).toBeGreaterThan(0)
      for (const section of guide.sections) {
        const label = `${guide.slug} > ${section.heading}`
        expect(section.heading.trim(), label).not.toBe('')
        const hasContent =
          Boolean(section.body?.trim()) || (section.steps?.length ?? 0) > 0 || (section.tips?.length ?? 0) > 0
        expect(hasContent, label).toBe(true)
      }
    }
  })

  it('links every appLink to a route declared in App.tsx', () => {
    const patterns = appRoutePatterns()
    const links = attorneyGuides.flatMap((guide) =>
      guide.sections.flatMap((section) => (section.appLink ? [{ slug: guide.slug, to: section.appLink.to }] : [])),
    )
    expect(links.length).toBeGreaterThan(0)
    const unmatched = links.filter(({ to }) => {
      const path = to.split(/[?#]/)[0]
      return !patterns.some((pattern) => pattern.test(path))
    })
    expect(unmatched).toEqual([])
  })
})

describe('docs/attorney-guides', () => {
  it('matches the export output exactly (run `pnpm --dir app guides:export`)', () => {
    const expected = renderAttorneyGuideDocs()
    const committed = readdirSync(docsDir).filter((name) => name.endsWith('.md')).sort()
    expect(committed).toEqual(Object.keys(expected).sort())
    for (const name of committed) {
      const content = readFileSync(join(docsDir, name), 'utf8').replace(/\r\n/g, '\n')
      expect(content, name).toBe(expected[name])
    }
  })
})

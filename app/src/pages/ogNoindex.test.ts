import { describe, expect, it } from 'vitest'
import handler from '../../pages/api/og'

/**
 * The social card endpoint must answer with X-Robots-Tag: noindex.
 *
 * robots.txt cannot solve this. `Allow: /api/og` has to stay or link previews
 * stop rendering, and that same rule is what let Google crawl several hundred
 * card URLs - one per page title, across all three locales - and file them
 * under "crawled, currently not indexed".
 *
 * The header is load-bearing rather than cosmetic: preview scrapers ignore it
 * and still get their image, Google reads it and drops the URL. Deleting it
 * would quietly refill that report.
 */
function call(url: string): Response {
  // The handler reads only `req.url`, so a bare object stands in for NextRequest.
  return handler({ url } as never) as unknown as Response
}

describe('/api/og', () => {
  it('tells crawlers not to index the card', () => {
    const res = call('https://www.clearcaseiq.com/api/og?title=Test')
    expect(res.headers.get('x-robots-tag')).toBe('noindex')
  })

  it('sends the header for translated cards too', () => {
    for (const title of ['Abogado de lesiones', '人身伤害律师']) {
      const res = call(`https://www.clearcaseiq.com/api/og?title=${encodeURIComponent(title)}`)
      expect(res.headers.get('x-robots-tag')).toBe('noindex')
    }
  })

  it('still caches hard, so the card is not redrawn on every scrape', () => {
    const res = call('https://www.clearcaseiq.com/api/og?title=Test')
    expect(res.headers.get('cache-control')).toContain('immutable')
  })
})

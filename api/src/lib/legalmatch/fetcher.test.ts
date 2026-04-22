import { describe, expect, it } from 'vitest'
import {
  buildBingSearchUrl,
  buildSearchDiscoveryQueries,
  extractAttorneyProfileUrlsFromSearchResultsHtml,
  sliceDiscoveredUrls,
} from './fetcher'

describe('buildBingSearchUrl', () => {
  it('builds deterministic paginated Bing search URLs', () => {
    expect(buildBingSearchUrl('site:legalmatch.com test', 0)).toBe(
      'https://www.bing.com/search?q=site%3Alegalmatch.com%20test&first=1'
    )
    expect(buildBingSearchUrl('site:legalmatch.com test', 2)).toBe(
      'https://www.bing.com/search?q=site%3Alegalmatch.com%20test&first=21'
    )
  })
})

describe('buildSearchDiscoveryQueries', () => {
  it('returns explicit queries unchanged when provided', () => {
    expect(buildSearchDiscoveryQueries(['alpha', 'beta'])).toEqual(['alpha', 'beta'])
  })

  it('builds a broader default query matrix', () => {
    const queries = buildSearchDiscoveryQueries()

    expect(queries).toContain('site:legalmatch.com/law-library/attorney-profile "personal injury"')
    expect(queries).toContain(
      'site:legalmatch.com/law-library/attorney-profile "personal injury" "California"'
    )
    expect(queries).toContain(
      'site:legalmatch.com/law-library/attorney-profile "family law" "New York"'
    )
    expect(new Set(queries).size).toBe(queries.length)
  })
})

describe('sliceDiscoveredUrls', () => {
  it('applies offset before max profile slicing', () => {
    const urls = ['a', 'b', 'c', 'd', 'e']
    expect(sliceDiscoveredUrls(urls, 2, 2)).toEqual(['c', 'd'])
    expect(sliceDiscoveredUrls(urls, 10, 2)).toEqual([])
  })
})

describe('extractAttorneyProfileUrlsFromSearchResultsHtml', () => {
  it('extracts and normalizes inline and anchor-based profile URLs', () => {
    const html = `
<html>
  <body>
    <a href="https://legalmatch.com/law-library/attorney-profile/william-roth.html">William Roth</a>
    <a href="//duckduckgo.com/l/?uddg=https%3A%2F%2Flegalmatch.com%2Flaw-library%2Fattorney-profile%2Fjohn-olczak.html">John Olczak</a>
    <div data-profile="https://legalmatch.com/law-library/attorney-profile/david-robinson.html"></div>
  </body>
</html>
`

    expect(extractAttorneyProfileUrlsFromSearchResultsHtml(html)).toEqual([
      'https://www.legalmatch.com/law-library/attorney-profile/william-roth.html',
      'https://www.legalmatch.com/law-library/attorney-profile/david-robinson.html',
      'https://www.legalmatch.com/law-library/attorney-profile/john-olczak.html',
    ])
  })
})

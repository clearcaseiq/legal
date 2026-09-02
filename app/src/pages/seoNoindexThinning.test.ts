import { afterEach, describe, expect, it } from 'vitest'
import type { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { getServerSideProps as catchAll } from '../../pages/[[...slug]]'
import { getServerSideProps as sitemapXml } from '../../pages/sitemap.xml'
import { allLandingPages, indexableLandingPages, landingPagesBySlug } from '../data/seoLandingPages'

/**
 * The per-page `noindex` switch used to thin the library.
 *
 * The failure this guards against is a half-applied one: a page that serves
 * `noindex` while the sitemap still nominates it, which tells a crawler two
 * opposite things about the same URL and looks like a broken site rather than a
 * deliberate removal. So both ends are asserted against the same page.
 */

// Any real page will do; this one is among the thinnest in the duplication
// audit, so it is also the kind of page the switch exists for.
const SUBJECT = '/injuries/whiplash-after-rear-end'

function renderText(handler: GetServerSideProps): string {
  let body = ''
  const res = {
    setHeader: () => {},
    write: (chunk: string) => {
      body += chunk
    },
    end: () => {},
  }
  void handler({ res } as never)
  return body
}

async function seoFor(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const result = await catchAll({
    params: { slug: segments },
    query: { slug: segments },
    res: { statusCode: 200, setHeader: () => {} },
  } as unknown as GetServerSidePropsContext)

  if (!('props' in result)) return null
  return (await result.props).seo
}

/** Flips the flag on the live object, since that is what both ends read. */
function withNoindex(slug: string, run: () => Promise<void> | void) {
  const page = landingPagesBySlug.get(slug)
  if (!page) throw new Error(`${slug} is not a landing page`)

  page.noindex = true
  return Promise.resolve(run()).finally(() => {
    delete page.noindex
  })
}

afterEach(() => {
  for (const page of allLandingPages) delete page.noindex
})

describe('landing pages are indexable unless deliberately thinned', () => {
  it('marks nothing noindex today', () => {
    // The audit finds no page under 40% unique and no duplicate bodies, so the
    // switch ships unused. If this fails, someone thinned the library — which is
    // allowed, but should be a visible decision rather than a silent diff.
    expect(allLandingPages.filter((page) => page.noindex)).toEqual([])
  })

  it('serves a canonical and no robots tag in the normal case', async () => {
    const seo = await seoFor(SUBJECT)

    expect(seo?.noindex).toBeFalsy()
    expect(seo?.canonical).toContain(SUBJECT)
  })

  it('lists every page in the sitemap while none are thinned', () => {
    expect(indexableLandingPages()).toHaveLength(allLandingPages.length)
    expect(renderText(sitemapXml)).toContain(SUBJECT)
  })
})

describe('thinning a page', () => {
  it('flags the page noindex', async () => {
    await withNoindex(SUBJECT, async () => {
      const seo = await seoFor(SUBJECT)

      // The catch-all component turns this into `<meta name="robots"
      // content="noindex, follow">` and suppresses the canonical link, since a
      // canonical would nominate the page as the preferred version of itself
      // right beside the tag asking for it to be dropped.
      expect(seo?.noindex).toBe(true)
    })
  })

  it('withholds the URL from the sitemap', async () => {
    await withNoindex(SUBJECT, () => {
      expect(renderText(sitemapXml)).not.toContain(`<loc>https://www.clearcaseiq.com${SUBJECT}</loc>`)
    })
  })

  it('keeps the page routable, so the tag can actually be read', async () => {
    await withNoindex(SUBJECT, async () => {
      const seo = await seoFor(SUBJECT)

      // Not a 404 and not a redirect: a crawler has to fetch the page to see
      // `noindex`, and removing the route instead would 404 every existing link.
      expect(seo?.title).toBeTruthy()
    })
  })

  it('leaves every other page untouched', async () => {
    await withNoindex(SUBJECT, async () => {
      const other = await seoFor('/settlements/knee-surgery-settlement')

      expect(other?.noindex).toBeFalsy()
      expect(indexableLandingPages()).toHaveLength(allLandingPages.length - 1)
    })
  })

  it('restores cleanly, so the flag is not sticky', async () => {
    await withNoindex(SUBJECT, () => {})

    expect((await seoFor(SUBJECT))?.noindex).toBeFalsy()
    expect(renderText(sitemapXml)).toContain(SUBJECT)
  })
})

import { describe, expect, it } from 'vitest'
import type { GetServerSidePropsContext } from 'next'
import { getServerSideProps } from '../../pages/[[...slug]]'

/**
 * /assessment/start is the CTA in the header and the footer, so it is the most
 * linked URL on the site after the home page, and it has never been a page. It
 * used to resolve only once React mounted and ran a <Navigate>, which cost
 * every cold visitor a bundle download before the wizard began loading and cost
 * every crawler a full render to discover the URL was an alias.
 *
 * These cover the server-side answer. The client-side route in App.tsx stays
 * and is what handles in-app CTA clicks, which never reach the server.
 */

async function run(pathname: string, query: Record<string, string | string[]> = {}) {
  const segments = pathname.split('/').filter(Boolean)
  // The page signals 404 by assigning to res.statusCode rather than returning
  // `notFound`, so the mock has to be inspectable afterwards.
  const res = { statusCode: 200, setHeader: () => {} }
  const result = await getServerSideProps({
    params: { slug: segments },
    query: { slug: segments, ...query },
    res,
  } as unknown as GetServerSidePropsContext)

  return { result, statusCode: res.statusCode }
}

function redirectOf({ result }: Awaited<ReturnType<typeof run>>) {
  return 'redirect' in result ? result.redirect : null
}

describe('/assessment/start server redirect', () => {
  it('answers with a permanent redirect instead of booting the app', async () => {
    const redirect = redirectOf(await run('/assessment/start'))

    expect(redirect).toEqual({ destination: '/assess?fresh=1', permanent: true })
  })

  it('lands somewhere that is not itself a redirect', async () => {
    // A hop into another hop would spend the crawl budget this change is meant
    // to save, and would show users two navigations.
    const destination = redirectOf(await run('/assessment/start'))?.destination ?? ''
    const [path] = destination.split('?')

    expect(redirectOf(await run(path))).toBeNull()
  })

  it('carries campaign tags across the hop', async () => {
    // The CTA is the landing point for paid traffic, so dropping the query
    // string here would silently break attribution.
    const redirect = redirectOf(
      await run('/assessment/start', { utm_source: 'google', utm_campaign: 'brand' })
    )

    expect(redirect?.destination).toBe('/assess?utm_source=google&utm_campaign=brand&fresh=1')
  })

  it('starts a fresh assessment even if the request said otherwise', async () => {
    // The whole point of this URL is "begin a new assessment", so `fresh` is
    // set rather than merged, matching what the client-side redirect passed.
    const redirect = redirectOf(await run('/assessment/start', { fresh: '0' }))

    expect(redirect?.destination).toBe('/assess?fresh=1')
  })

  it('does not swallow the slug segments into the query string', async () => {
    const redirect = redirectOf(await run('/assessment/start'))

    expect(redirect?.destination).not.toContain('slug')
  })

  it('leaves the wizard itself alone', async () => {
    expect(redirectOf(await run('/assess'))).toBeNull()
  })

  it('only matches the exact path', async () => {
    // /assessment is not a page and /assessment/start/extra is not a route;
    // both should fall through to the normal unknown-route handling rather
    // than being redirected into the wizard.
    for (const path of ['/assessment', '/assessment/start/extra']) {
      const outcome = await run(path)

      expect(redirectOf(outcome)).toBeNull()
      expect(outcome.statusCode).toBe(404)
    }
  })
})

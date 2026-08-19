import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GetServerSidePropsContext } from 'next'
import { DEFAULT_SITE_URL } from '../data/seoLandingPageSchema'
import { indexingEnabled, serverSiteUrl } from './siteConfig'
import { getServerSideProps } from '../../pages/[[...slug]]'

/**
 * These two values are what let one web image serve both QA and production.
 * They are read per request rather than inlined at build time, so the tests
 * mutate process.env directly — if either ever goes back to being captured at
 * module load, these fail.
 */

const ORIGINAL = { ...process.env }

beforeEach(() => {
  delete process.env.SITE_URL
  delete process.env.NEXT_PUBLIC_SITE_URL
  delete process.env.SEARCH_ENGINE_INDEXING
})

afterEach(() => {
  process.env = { ...ORIGINAL }
})

describe('serverSiteUrl', () => {
  it('prefers the runtime SITE_URL', () => {
    process.env.SITE_URL = 'https://qa.clearcaseiq.com'

    expect(serverSiteUrl()).toBe('https://qa.clearcaseiq.com')
  })

  it('is not captured at module load', () => {
    process.env.SITE_URL = 'https://first.example.com'
    expect(serverSiteUrl()).toBe('https://first.example.com')

    process.env.SITE_URL = 'https://second.example.com'
    expect(serverSiteUrl()).toBe('https://second.example.com')
  })

  it('strips trailing slashes so callers can concatenate paths', () => {
    // Every caller builds `${siteUrl}${path}`, so a trailing slash here would
    // emit https://host//how-it-works as a canonical.
    process.env.SITE_URL = 'https://qa.clearcaseiq.com/'

    expect(serverSiteUrl()).toBe('https://qa.clearcaseiq.com')
  })

  it('falls back to the build-time variable so older images still work', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.clearcaseiq.com'

    expect(serverSiteUrl()).toBe('https://www.clearcaseiq.com')
  })

  it('falls back to production when nothing is set', () => {
    expect(serverSiteUrl()).toBe(DEFAULT_SITE_URL)
  })

  it('ignores a blank value rather than emitting bare paths', () => {
    process.env.SITE_URL = '   '

    expect(serverSiteUrl()).toBe(DEFAULT_SITE_URL)
  })
})

describe('indexingEnabled', () => {
  it('defaults to enabled when unset', () => {
    // Forgetting the variable on QA is recoverable; having it silently disable
    // indexing on production would delist the live site.
    expect(indexingEnabled()).toBe(true)
  })

  it('is disabled only by the explicit value', () => {
    process.env.SEARCH_ENGINE_INDEXING = 'disabled'
    expect(indexingEnabled()).toBe(false)

    process.env.SEARCH_ENGINE_INDEXING = 'DISABLED'
    expect(indexingEnabled()).toBe(false)

    process.env.SEARCH_ENGINE_INDEXING = 'enabled'
    expect(indexingEnabled()).toBe(true)

    // Not a boolean flag: anything unrecognised leaves production indexable.
    process.env.SEARCH_ENGINE_INDEXING = 'false'
    expect(indexingEnabled()).toBe(true)
  })
})

async function propsFor(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const result = await getServerSideProps({
    params: { slug: segments },
    query: { slug: segments },
    res: { statusCode: 200, setHeader: () => {} },
  } as unknown as GetServerSidePropsContext)

  if (!('props' in result)) return null
  return await result.props
}

async function seoFor(pathname: string) {
  return (await propsFor(pathname))?.seo
}

describe('non-production deployments are not indexable', () => {
  it('marks an ordinarily indexable page noindex', async () => {
    expect((await seoFor('/how-it-works'))?.noindex).toBeFalsy()

    process.env.SEARCH_ENGINE_INDEXING = 'disabled'

    expect((await seoFor('/how-it-works'))?.noindex).toBe(true)
  })

  it('covers landing pages too, not just marketing routes', async () => {
    // The five return branches in the catch-all are the reason this is applied
    // by wrapping the resolver rather than per branch.
    process.env.SEARCH_ENGINE_INDEXING = 'disabled'

    expect((await seoFor('/injuries/whiplash-after-rear-end'))?.noindex).toBe(true)
  })

  it('leaves pages indexable in production', async () => {
    expect((await seoFor('/injuries/whiplash-after-rear-end'))?.noindex).toBeFalsy()
  })

  it('stops non-production traffic reaching the analytics property', async () => {
    // The GA measurement id is inlined at build time, so one promotable image
    // carries production's id everywhere it runs. publicPage is what gates
    // SiteAnalytics, so clearing it is what keeps QA's test traffic out of the
    // numbers the live site is measured on.
    expect((await propsFor('/how-it-works'))?.publicPage).toBe(true)

    process.env.SEARCH_ENGINE_INDEXING = 'disabled'

    expect((await propsFor('/how-it-works'))?.publicPage).toBe(false)
  })
})

/**
 * The tests above cover the default in `indexingEnabled()`, which is correct and
 * always was. They passed while production served `Disallow: /` and a sitewide
 * `noindex`, because the container never reached that default: compose set
 * `SEARCH_ENGINE_INDEXING` explicitly, with `:-disabled` as its own fallback,
 * and production's env file had no reason to name a variable describing
 * production. A safe default in the code is worth nothing if the orchestration
 * overrides it with an unsafe one, and nothing in the suite could see that.
 */
describe('deployment defaults leave the public site crawlable', () => {
  const repoRoot = join(__dirname, '..', '..', '..')
  const read = (name: string) => readFileSync(join(repoRoot, name), 'utf8')

  it('does not let compose default production into a noindex deployment', () => {
    const compose = read('docker-compose.deploy.yml')
    const assignment = compose.match(/SEARCH_ENGINE_INDEXING:\s*\$\{SEARCH_ENGINE_INDEXING:?-([^}]*)\}/)

    expect(assignment, 'compose should pass SEARCH_ENGINE_INDEXING through with a default').not.toBeNull()
    expect(assignment?.[1].trim().toLowerCase()).not.toBe('disabled')
  })

  it('has production state its indexability rather than inherit it', () => {
    expect(read('.env.prod.example')).toMatch(/^SEARCH_ENGINE_INDEXING=enabled$/m)
  })

  it('still keeps QA out of the index', () => {
    expect(read('.env.qa.example')).toMatch(/^SEARCH_ENGINE_INDEXING=disabled$/m)
  })
})

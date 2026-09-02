import { describe, expect, it, afterEach } from 'vitest'
import type { GetServerSideProps } from 'next'
import { getServerSideProps as llmsTxt } from '../../pages/llms.txt'
import { getServerSideProps as robotsTxt } from '../../pages/robots.txt'

/**
 * The two plain-text routes crawlers read before anything else.
 *
 * They are exercised by calling `getServerSideProps` against a fake response
 * rather than through a dev server, because both pull in the whole landing-page
 * corpus and compiling that route is a minutes-long job that has run the local
 * webpack cache out of memory.
 */

function render(handler: GetServerSideProps): { body: string; headers: Record<string, string> } {
  const headers: Record<string, string> = {}
  let body = ''
  const res = {
    setHeader: (k: string, v: string) => {
      headers[k.toLowerCase()] = v
    },
    write: (chunk: string) => {
      body += chunk
    },
    end: () => {},
  }
  // The handlers only ever touch `res`, so the rest of the context is unused.
  void handler({ res } as never)
  return { body, headers }
}

const withEnv = (vars: Record<string, string | undefined>, run: () => void) => {
  const prior = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]))
  Object.entries(vars).forEach(([k, v]) => {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  })
  try {
    run()
  } finally {
    Object.entries(prior).forEach(([k, v]) => {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    })
  }
}

afterEach(() => {
  delete process.env.SEARCH_ENGINE_INDEXING
})

describe('llms.txt', () => {
  it('states the fact AI answers get wrong most often', () => {
    const { body } = render(llmsTxt)
    expect(body).toContain('# ClearCaseIQ')
    expect(body).toMatch(/not a law firm/i)
    expect(body).toMatch(/does not provide legal advice/i)
  })

  it('links the free tools, which are the pages worth citing', () => {
    const { body } = render(llmsTxt)
    expect(body).toContain('/tools/california-sol-checker')
    expect(body).toContain('/tools/medical-records-checklist')
  })

  it('links only topic hubs that hold pages', () => {
    const { body } = render(llmsTxt)
    expect(body).toContain('/topics/settlement-value')
    // A hub with no pages would send a crawler to an empty list.
    expect(body).not.toMatch(/\(\s*\):/)
  })

  it('uses absolute URLs built from the runtime origin', () => {
    withEnv({ SITE_URL: 'https://example.test' }, () => {
      const { body } = render(llmsTxt)
      expect(body).toContain('https://example.test/tools/california-sol-checker')
      expect(body).toContain('Sitemap: https://example.test/sitemap.xml')
    })
  })

  it('withholds the real map on a deployment that is not the public site', () => {
    withEnv({ SEARCH_ENGINE_INDEXING: 'disabled' }, () => {
      const { body, headers } = render(llmsTxt)
      expect(body).toMatch(/Non-production deployment/)
      expect(body).not.toContain('/tools/california-sol-checker')
      expect(headers['cache-control']).toBe('no-store')
    })
  })
})

describe('robots.txt', () => {
  it('keeps the admin disallows and the sitemap', () => {
    const { body } = render(robotsTxt)
    expect(body).toContain('Disallow: /admin')
    expect(body).toContain('Disallow: /attorney-dashboard')
    expect(body).toMatch(/^Sitemap: https?:\/\/\S+\/sitemap\.xml$/m)
  })

  it('keeps the one Allow that does something and drops the ones that did not', () => {
    const { body } = render(robotsTxt)
    const allows = body.split('\n').filter((l) => l.startsWith('Allow:'))
    // /api/og is the only real rule: it carves link previews out of the /api
    // disallow above. Every other Allow was a no-op against paths nothing
    // blocked, and three were bare prefixes rather than paths.
    expect(allows).toEqual(['Allow: /api/og'])
    expect(body).not.toContain('Allow: /how-much-is-')
    expect(body).not.toContain('Allow: /average-')
  })

  it('does not block /assess, which is removed by noindex instead', () => {
    const { body } = render(robotsTxt)
    // A site audit asked for this rule. Blocking the funnel would stop Google
    // fetching it and therefore stop it ever reading the `noindex, follow` the
    // page already serves, stranding the URL in the index permanently.
    expect(body).not.toMatch(/^Disallow: \/assess/m)
  })

  it('closes a non-production deployment to crawlers entirely', () => {
    withEnv({ SEARCH_ENGINE_INDEXING: 'disabled' }, () => {
      const { body } = render(robotsTxt)
      expect(body).toContain('Disallow: /')
      expect(body).not.toContain('Sitemap:')
    })
  })
})

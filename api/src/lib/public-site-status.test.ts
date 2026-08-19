import { EventEmitter } from 'node:events'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  blocksAllCrawlers,
  getPublicSiteStatus,
  resetPublicSiteStatusCache,
} from './public-site-status'

/**
 * The certificate probe opens a real TLS connection, so it is stubbed here.
 * Left unstubbed these tests reach the public internet: they get slower, they
 * fail on a plane, and the expiry thresholds — the only part with any logic in
 * it — could not be exercised at all, because a live certificate is never a
 * week from lapsing when you need it to be.
 */
const tls = vi.hoisted(() => ({
  outcome: null as null | { cert?: Record<string, any>; error?: Error },
}))

vi.mock('node:tls', () => ({
  connect: (_options: unknown, onSecure: () => void) => {
    const socket = new EventEmitter() as EventEmitter & Record<string, any>
    socket.getPeerCertificate = () => tls.outcome?.cert
    socket.end = () => {}
    socket.destroy = () => {}
    socket.setTimeout = () => {}
    queueMicrotask(() => {
      if (tls.outcome?.error) socket.emit('error', tls.outcome.error)
      else onSecure()
    })
    return socket
  },
}))

/** An OpenSSL-style `valid_to`, the shape `getPeerCertificate` returns. */
function certExpiringIn(days: number) {
  return {
    valid_to: new Date(Date.now() + days * 86_400_000).toUTCString(),
    issuer: { O: "Let's Encrypt" },
  }
}

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  resetPublicSiteStatusCache()
  tls.outcome = { cert: certExpiringIn(60) }
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('User-agent: *\nAllow: /\n', { status: 200 })),
  )
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  tls.outcome = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('blocksAllCrawlers', () => {
  // The production file disallows a dozen specific paths. An earlier instinct
  // to test for `Disallow: /` as a substring would report every one of these as
  // a sitewide block, which is the false alarm that gets a check muted.
  it('does not treat path-specific rules as a sitewide block', () => {
    const realistic = [
      'User-agent: *',
      '# Admin areas',
      'Disallow: /admin',
      'Disallow: /dashboard',
      'Disallow: /results',
      'Allow: /',
      '',
      'Sitemap: https://www.clearcaseiq.com/sitemap.xml',
    ].join('\n')

    expect(blocksAllCrawlers(realistic)).toBe(false)
  })

  it('detects the bare sitewide disallow that shipped to production', () => {
    expect(blocksAllCrawlers('User-agent: *\nDisallow: /\n')).toBe(true)
  })

  it('ignores case and trailing whitespace, per the robots spec', () => {
    expect(blocksAllCrawlers('User-agent: *\n  disallow:   /   \n')).toBe(true)
    expect(blocksAllCrawlers('User-agent: *\nDISALLOW:/\n')).toBe(true)
  })
})

describe('certificate expiry', () => {
  beforeEach(() => {
    process.env.WEB_URL = 'https://www.example.com'
  })

  it('passes a certificate with plenty of life left', async () => {
    tls.outcome = { cert: certExpiringIn(60) }

    const { certificate } = await getPublicSiteStatus()

    expect(certificate.state).toBe('ok')
    expect(certificate.daysRemaining).toBe(59)
    expect(certificate.issuer).toBe("Let's Encrypt")
  })

  // Let's Encrypt renews at 30 days. Still holding a certificate at 10 means
  // renewal has already failed silently, which is the window that was missed —
  // by expiry it is a customer-visible outage, not a warning.
  it('warns while there is still time to fix renewal', async () => {
    tls.outcome = { cert: certExpiringIn(10) }

    const { certificate } = await getPublicSiteStatus()

    expect(certificate.state).toBe('warn')
    expect(certificate.detail).toContain('certbot')
  })

  it('treats the boundary as still worth warning about', async () => {
    tls.outcome = { cert: certExpiringIn(21.5) }
    expect((await getPublicSiteStatus()).certificate.state).toBe('warn')

    resetPublicSiteStatusCache()
    tls.outcome = { cert: certExpiringIn(22.5) }
    expect((await getPublicSiteStatus()).certificate.state).toBe('ok')
  })

  it('reports an expired certificate and how long it has been dead', async () => {
    tls.outcome = { cert: certExpiringIn(-3) }

    const { certificate } = await getPublicSiteStatus()

    expect(certificate.state).toBe('fail')
    expect(certificate.daysRemaining).toBeLessThan(0)
    expect(certificate.detail).toContain('Expired')
  })

  // Distinguishable from expiry by daysRemaining staying null, which is what
  // stops a probe failure from being announced as a site outage.
  it('reports an unreachable host without claiming the certificate is bad', async () => {
    tls.outcome = { error: new Error('ETIMEDOUT') }

    const { certificate } = await getPublicSiteStatus()

    expect(certificate.state).toBe('fail')
    expect(certificate.daysRemaining).toBeNull()
    expect(certificate.detail).toContain('ETIMEDOUT')
  })

  it('handles a server that presents no certificate', async () => {
    tls.outcome = { cert: {} }

    const { certificate } = await getPublicSiteStatus()

    expect(certificate.state).toBe('fail')
    expect(certificate.daysRemaining).toBeNull()
  })
})

describe('robots.txt', () => {
  it('reports a sitewide disallow on a deployment meant to be indexed', async () => {
    process.env.WEB_URL = 'https://www.example.com'
    delete process.env.SEARCH_ENGINE_INDEXING
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('User-agent: *\nDisallow: /\n', { status: 200 })),
    )

    const { robots } = await getPublicSiteStatus()

    expect(robots.state).toBe('fail')
    expect(robots.crawlable).toBe(false)
    expect(robots.expectedCrawlable).toBe(true)
  })

  // QA is supposed to serve a blanket disallow. Flagging it would train whoever
  // reads this page to expect a red row on QA and stop reading the section.
  it('accepts a sitewide disallow where indexing is deliberately off', async () => {
    process.env.WEB_URL = 'https://qa.example.com'
    process.env.SEARCH_ENGINE_INDEXING = 'disabled'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('User-agent: *\nDisallow: /\n', { status: 200 })),
    )

    const { robots } = await getPublicSiteStatus()

    expect(robots.state).toBe('ok')
    expect(robots.crawlable).toBe(false)
  })

  it('warns when a non-indexable deployment is open to crawlers', async () => {
    process.env.WEB_URL = 'https://qa.example.com'
    process.env.SEARCH_ENGINE_INDEXING = 'disabled'

    const { robots } = await getPublicSiteStatus()

    expect(robots.state).toBe('warn')
    expect(robots.crawlable).toBe(true)
  })

  it('reports an unreachable robots.txt without throwing', async () => {
    process.env.WEB_URL = 'https://www.example.com'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED')
      }),
    )

    const { robots } = await getPublicSiteStatus()

    expect(robots.state).toBe('fail')
    expect(robots.crawlable).toBeNull()
    expect(robots.detail).toContain('ECONNREFUSED')
  })

  it('reports a non-200 robots.txt as a failure', async () => {
    process.env.WEB_URL = 'https://www.example.com'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 502 })))

    const { robots } = await getPublicSiteStatus()

    expect(robots.state).toBe('fail')
    expect(robots.detail).toContain('502')
  })
})

describe('when there is nothing public to probe', () => {
  it('skips rather than fails on a local origin', async () => {
    process.env.WEB_URL = 'http://localhost:3000'

    const status = await getPublicSiteStatus()

    expect(status.origin).toBeNull()
    expect(status.certificate.state).toBe('skipped')
    expect(status.robots.state).toBe('skipped')
  })

  it('skips when WEB_URL is unset', async () => {
    delete process.env.WEB_URL
    expect((await getPublicSiteStatus()).certificate.state).toBe('skipped')
  })

  it('skips an unparseable WEB_URL instead of throwing', async () => {
    process.env.WEB_URL = 'not a url'
    expect((await getPublicSiteStatus()).certificate.state).toBe('skipped')
  })
})

it('memoises so the page auto-refresh does not reprobe every minute', async () => {
  process.env.WEB_URL = 'https://www.example.com'
  const fetchSpy = vi.fn(async () => new Response('User-agent: *\nAllow: /\n', { status: 200 }))
  vi.stubGlobal('fetch', fetchSpy)

  const first = await getPublicSiteStatus()
  const second = await getPublicSiteStatus()

  expect(second).toBe(first)
  expect(fetchSpy).toHaveBeenCalledTimes(1)
})

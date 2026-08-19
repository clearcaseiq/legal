import { connect as tlsConnect } from 'node:tls'

/**
 * The public site as the outside world sees it: is its certificate still valid,
 * and is it telling crawlers what we think it is.
 *
 * Both of these failed in production within a day of each other, and neither
 * announced itself. The certificate lapsed because renewal had been failing
 * since July against a port the nginx container owns, and Let's Encrypt stopped
 * sending expiry mail in 2025 — the first report was a browser marking a login
 * form "Not secure". robots.txt served `Disallow: /` for a day because a compose
 * default written for QA reached production, and the first report was a
 * third-party SEO audit.
 *
 * Neither is observable from inside the process. The API answered every request
 * correctly throughout both. So both are measured from here against the public
 * origin, over the network, the way a visitor or a crawler arrives.
 */

export type PublicSiteCheck = 'ok' | 'warn' | 'fail' | 'skipped'

export interface CertificateStatus {
  state: PublicSiteCheck
  expiresAt: string | null
  daysRemaining: number | null
  issuer: string | null
  detail: string
}

export interface RobotsStatus {
  state: PublicSiteCheck
  /** Whether the served file lets crawlers reach the site at all. */
  crawlable: boolean | null
  /** Whether this deployment is meant to be crawlable. QA is not. */
  expectedCrawlable: boolean
  detail: string
}

export interface PublicSiteStatus {
  /** Origin actually probed, or null when there was nothing public to probe. */
  origin: string | null
  checkedAt: string
  certificate: CertificateStatus
  robots: RobotsStatus
}

/**
 * Let's Encrypt renews with 30 days left. Anything below this means at least
 * one automated attempt has already failed, which is the state that went
 * unnoticed for a month — not the expiry itself, which is far too late to be
 * the first warning.
 */
const RENEWAL_OVERDUE_DAYS = 21

const NETWORK_TIMEOUT_MS = 5_000

/**
 * Long enough that the admin page's 60-second auto-refresh does not reopen a
 * TLS connection and refetch robots.txt on every poll. Neither value changes on
 * a timescale where a fresher answer would tell anyone anything.
 */
const CACHE_TTL_MS = 5 * 60_000

let cached: { at: number; value: PublicSiteStatus } | null = null

/** Drops the memoised result. For tests. */
export function resetPublicSiteStatusCache(): void {
  cached = null
}

/**
 * Whether this deployment is supposed to be reachable by crawlers.
 *
 * Deliberately the same expression as `indexingEnabled()` in the web app,
 * including its default. The API reads the same env file, so both see the same
 * value; if they ever disagree, the page is the thing telling you.
 */
function expectsCrawlers(): boolean {
  return process.env.SEARCH_ENGINE_INDEXING?.trim().toLowerCase() !== 'disabled'
}

/**
 * The public web origin, or null if there isn't one worth probing.
 *
 * Local and test runs point WEB_URL at localhost over plain HTTP, where there
 * is no certificate to read and no crawler to mislead. Those report `skipped`
 * rather than a failure nobody can act on.
 */
function publicOrigin(): URL | null {
  const raw = process.env.WEB_URL?.trim()
  if (!raw) return null

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  if (url.protocol !== 'https:') return null
  if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url.hostname)) return null
  return url
}

function skipped(detail: string): PublicSiteStatus {
  return {
    origin: null,
    checkedAt: new Date().toISOString(),
    certificate: { state: 'skipped', expiresAt: null, daysRemaining: null, issuer: null, detail },
    robots: { state: 'skipped', crawlable: null, expectedCrawlable: expectsCrawlers(), detail },
  }
}

interface PeerCertificate {
  validTo: Date
  issuer: string | null
}

function readCertificate(hostname: string, port: number): Promise<PeerCertificate> {
  return new Promise((resolve, reject) => {
    // `rejectUnauthorized: false` is the point rather than an oversight. An
    // expired certificate fails validation, and refusing the handshake would
    // throw away the one field being reported — how long ago it expired. This
    // connection reads the certificate; it never trusts it or sends anything.
    const socket = tlsConnect(
      { host: hostname, port, servername: hostname, rejectUnauthorized: false },
      () => {
        const cert = socket.getPeerCertificate()
        socket.end()

        if (!cert || !cert.valid_to) {
          reject(new Error('Server presented no certificate'))
          return
        }
        const validTo = new Date(cert.valid_to)
        if (Number.isNaN(validTo.getTime())) {
          reject(new Error(`Unreadable expiry: ${cert.valid_to}`))
          return
        }
        resolve({ validTo, issuer: cert.issuer?.O ?? cert.issuer?.CN ?? null })
      },
    )

    socket.setTimeout(NETWORK_TIMEOUT_MS, () => {
      socket.destroy()
      reject(new Error('Timed out reading certificate'))
    })
    socket.once('error', (error) => {
      socket.destroy()
      reject(error)
    })
  })
}

async function checkCertificate(origin: URL): Promise<CertificateStatus> {
  const port = origin.port ? Number(origin.port) : 443

  try {
    const { validTo, issuer } = await readCertificate(origin.hostname, port)
    const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / 86_400_000)
    const expiresAt = validTo.toISOString()

    if (daysRemaining < 0) {
      return {
        state: 'fail',
        expiresAt,
        daysRemaining,
        issuer,
        detail: `Expired ${Math.abs(daysRemaining)} day(s) ago. Browsers are refusing the site.`,
      }
    }
    if (daysRemaining <= RENEWAL_OVERDUE_DAYS) {
      return {
        state: 'warn',
        expiresAt,
        daysRemaining,
        issuer,
        detail: `${daysRemaining} day(s) left. Renewal should already have run — check \`certbot renew --dry-run\`.`,
      }
    }
    return { state: 'ok', expiresAt, daysRemaining, issuer, detail: `${daysRemaining} day(s) left` }
  } catch (error: any) {
    return {
      state: 'fail',
      expiresAt: null,
      daysRemaining: null,
      issuer: null,
      detail: `Could not read certificate: ${error?.message ?? 'unknown error'}`,
    }
  }
}

/**
 * Whether the file blocks crawlers outright.
 *
 * Only a bare `Disallow: /` counts. The real file disallows a dozen specific
 * paths (`/admin`, `/dashboard`, `/results`), so a substring test would report
 * a correct file as a sitewide block. Directives are case-insensitive per the
 * robots spec.
 */
export function blocksAllCrawlers(body: string): boolean {
  return body.split('\n').some((line) => /^disallow:\s*\/\s*$/i.test(line.trim()))
}

async function checkRobots(origin: URL): Promise<RobotsStatus> {
  const expectedCrawlable = expectsCrawlers()

  try {
    const response = await fetch(new URL('/robots.txt', origin), {
      signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    })

    if (!response.ok) {
      return {
        state: 'fail',
        crawlable: null,
        expectedCrawlable,
        detail: `robots.txt returned ${response.status}`,
      }
    }

    const crawlable = !blocksAllCrawlers(await response.text())

    if (crawlable === expectedCrawlable) {
      return {
        state: 'ok',
        crawlable,
        expectedCrawlable,
        detail: crawlable ? 'Crawlable' : 'Closed to crawlers, as intended for this environment',
      }
    }

    return {
      state: expectedCrawlable ? 'fail' : 'warn',
      crawlable,
      expectedCrawlable,
      detail: expectedCrawlable
        ? 'Serving a sitewide Disallow. Search engines are being told to drop every page.'
        : 'Crawlable, but this deployment is not the public site and will compete with it.',
    }
  } catch (error: any) {
    return {
      state: 'fail',
      crawlable: null,
      expectedCrawlable,
      detail: `Could not fetch robots.txt: ${error?.message ?? 'unknown error'}`,
    }
  }
}

/**
 * Probe the public origin. Never throws: a failed probe is itself the finding,
 * and this is one section of a status payload that has to render regardless.
 */
export async function getPublicSiteStatus(): Promise<PublicSiteStatus> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value

  const origin = publicOrigin()
  if (!origin) {
    return skipped('No public HTTPS origin configured (WEB_URL)')
  }

  const [certificate, robots] = await Promise.all([checkCertificate(origin), checkRobots(origin)])
  const value: PublicSiteStatus = {
    origin: origin.origin,
    checkedAt: new Date().toISOString(),
    certificate,
    robots,
  }

  cached = { at: Date.now(), value }
  return value
}

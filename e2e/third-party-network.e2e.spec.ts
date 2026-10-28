import { readFileSync } from 'node:fs'
import { expect, test, type Page, type Request } from '@playwright/test'

/**
 * What third parties actually receive, measured in a real browser.
 *
 * The unit tests for metaPixelGuard prove what the app asks of the Pixel, not
 * what Meta's script does once it is running, and they cannot see the tags the
 * GTM container adds. This loads the live container and the vendors' own
 * scripts, then records every collection request they make: URL, body and
 * headers. Collection requests are aborted after they are recorded, so running
 * this sends nothing to Meta, Google or Clarity; library downloads are allowed
 * through so the scripts behave as they do for a visitor.
 *
 * Tracker behaviour can only be observed where the container loads, which is
 * production (and local, unless SEARCH_ENGINE_INDEXING=disabled). On QA those
 * tests skip; the direct-entry tests still apply.
 *
 *   E2E_BASE_URL=https://www.clearcaseiq.com pnpm test:e2e e2e/third-party-network.e2e.spec.ts
 *
 * Optional:
 *   E2E_SESSIONS=<file>     signed-in plaintiff/attorney/admin and a real upload
 *                           link, from api/scripts/e2e-tracker-sessions.ts
 *   E2E_DRIVE_ASSESSMENT=1  answer every screen of the assessment on a remote
 *                           host. Off by default there: the first screen saves
 *                           a lead. Always on against localhost.
 *   E2E_SUBMIT_ASSESSMENT=1 also press "Generate My Free Report", which creates
 *                           a case.
 */

const SECRET_TOKEN = 'e2eSecretToken9f3c2a7b'
const FAKE_ASSESSMENT_ID = 'cm9e2etestassessment000001'
// A domain with MX records: the wizard refuses one it cannot deliver to.
const TEST_EMAIL = 'e2e-tracker-test@clearcaseiq.com'
const TEST_PHONE = '8185550123'

type Session = {
  token: string
  role: string
  user: { id: string; email: string; firstName?: string; lastName?: string }
  extra?: Record<string, string>
}
type Sessions = {
  plaintiff?: Session | null
  attorney?: Session | null
  admin?: Session | null
  evidenceUploadPath?: string | null
}

const sessions: Sessions = process.env.E2E_SESSIONS
  ? JSON.parse(readFileSync(process.env.E2E_SESSIONS, 'utf8'))
  : {}

type Vendor = 'meta' | 'google' | 'clarity' | 'other'

type Beacon = {
  vendor: Vendor
  url: string
  body: string
  headers: Record<string, string>
  pagePath: string
}

const VENDOR_HOSTS: Array<[RegExp, Vendor]> = [
  [/(^|\.)facebook\.(com|net)$/, 'meta'],
  [/(^|\.)(google-analytics|googletagmanager|googleadservices|doubleclick|googlesyndication)\.(com|net)$/, 'google'],
  [/(^|\.)google\.com$/, 'google'],
  [/(^|\.)clarity\.ms$/, 'clarity'],
  [/(^|\.)(bing|tiktok|linkedin|licdn|hotjar|fullstory|segment|mixpanel|posthog|reddit|twitter|ads-twitter|snapchat|pinterest|taboola|outbrain)\.(com|net|io|ms)$/, 'other'],
]

/** Paths that report data, even when they are requested as a script. */
const COLLECTION_PATH = /\/(tr|collect|g\/collect|j\/collect|pagead|ccm|action|rmkt|conversion)(\/|$|\?)/

/**
 * Parameters that carry user data: Meta advanced matching (`ud[em]`, `udff[..]`)
 * and Google enhanced conversions / user-provided data (`em`, `ph`, ...). Hashed
 * or not, none of these may leave the site.
 */
const USER_DATA_PARAM = /^(em|ph|fn|ln|ct|st|zp|db|ge|country|external_id|_em|ud\[.*\]|udff\[.*\]|ecid|upd)$/i

function vendorOf(url: URL): Vendor | null {
  for (const [pattern, vendor] of VENDOR_HOSTS) if (pattern.test(url.hostname)) return vendor
  return null
}

const ROUTE_MARKERS = ['/assess', '/evidence-upload', '/dashboard', '/attorney-dashboard', '/admin', '/intake', '/results', 'claim=', 'lead=']

/** Identifiers and case facts this run typed or was given, in addition to route names. */
const runMarkers = new Set<string>([SECRET_TOKEN, FAKE_ASSESSMENT_ID, TEST_EMAIL, TEST_PHONE, 'Whiplash', 'Emergency room'])
for (const s of [sessions.plaintiff, sessions.attorney, sessions.admin]) {
  if (!s) continue
  runMarkers.add(s.user.id)
  runMarkers.add(s.user.email)
  runMarkers.add(s.token)
}
const uploadToken = sessions.evidenceUploadPath ? new URL(sessions.evidenceUploadPath, 'http://x').searchParams.get('token') : null
if (uploadToken) runMarkers.add(uploadToken)

/** Picks up record ids the app put in the URL, e.g. `?lead=` after the first wizard screen saves. */
function learnIdsFrom(url: string) {
  const parsed = new URL(url)
  for (const value of parsed.searchParams.values()) if (/^c[a-z0-9]{20,}$/i.test(value)) runMarkers.add(value)
  for (const segment of parsed.pathname.split('/')) if (/^c[a-z0-9]{20,}$/i.test(segment)) runMarkers.add(segment)
}

function decode(text: string): string {
  try {
    return `${text}\n${decodeURIComponent(text.replace(/\+/g, ' '))}`
  } catch {
    return text
  }
}

function beaconText(beacon: Beacon): string {
  return decode(`${beacon.url}\n${beacon.body}\n${JSON.stringify(beacon.headers)}`)
}

/** Identifiers and case facts, anywhere in the request. */
function identifierHits(beacon: Beacon): string[] {
  const text = beaconText(beacon)
  return [...runMarkers].filter((marker) => text.includes(marker))
}

/**
 * Route names, in the URL and headers only: that is where a page address or
 * referrer travels. Not the body, because Clarity's recording of a marketing
 * page includes that page's own links to /assess and /dashboard.
 */
function routeHits(beacon: Beacon): string[] {
  const text = decode(`${beacon.url}\n${JSON.stringify(beacon.headers)}`)
  return ROUTE_MARKERS.filter((marker) => text.includes(marker))
}

function sensitiveHits(beacon: Beacon): string[] {
  return [...routeHits(beacon), ...identifierHits(beacon)]
}

/**
 * Google's `em` is also where enhanced conversions reports its own status:
 * `tv.1~ec.e3` means it looked for user data and found none. It carries data
 * only when a segment other than `ec.*` is present (`~em.<hash>`, `~pn.<hash>`).
 */
function carriesUserData(key: string, value: string): boolean {
  if (!USER_DATA_PARAM.test(key)) return false
  if (key === 'em' && value.startsWith('tv.')) return value.split('~').slice(1).some((part) => !part.startsWith('ec.'))
  return value !== ''
}

function userDataParams(beacon: Beacon): string[] {
  const keys: string[] = []
  const collect = (params: URLSearchParams) => {
    for (const [key, value] of params) if (carriesUserData(key, value)) keys.push(key)
  }
  collect(new URL(beacon.url).searchParams)
  if (beacon.body && !beacon.body.startsWith('{') && beacon.body.includes('=')) {
    for (const line of beacon.body.split(/\r?\n/)) collect(new URLSearchParams(line))
  }
  return keys
}

async function recordThirdParties(page: Page) {
  const beacons: Beacon[] = []
  const loads: string[] = []

  await page.route(
    (url) => vendorOf(url) !== null,
    async (route) => {
      const request: Request = route.request()
      const url = new URL(request.url())
      const isLibrary = request.resourceType() === 'script' && !COLLECTION_PATH.test(url.pathname)
      if (isLibrary) {
        loads.push(request.url())
        await route.continue()
        return
      }
      let pagePath = ''
      try {
        pagePath = new URL(page.url()).pathname
      } catch {
        /* page not committed yet */
      }
      beacons.push({
        vendor: vendorOf(url) as Vendor,
        url: request.url(),
        body: request.postData() ?? '',
        headers: await request.allHeaders(),
        pagePath,
      })
      await route.abort()
    },
  )

  return {
    beacons,
    loads,
    mark: () => beacons.length,
    since: (mark: number) => beacons.slice(mark),
  }
}

/** Long enough for Clarity's first upload and Meta's batched events. */
const SETTLE_MS = 6000

async function settle(page: Page) {
  await page.waitForLoadState('load')
  await page.waitForTimeout(SETTLE_MS)
}

const REPORTED_PARAMS = ['ev', 'en', 'dl', 'rl', 'dr', 'dp', 'url', 'ref', 'dt', 'tid', 'id', 'label']

function summarise(beacons: Beacon[]) {
  return beacons.map((b) => {
    const url = new URL(b.url)
    const params: Record<string, string> = {}
    for (const key of REPORTED_PARAMS) {
      const value = url.searchParams.get(key)
      if (value) params[key] = value
    }
    return {
      vendor: b.vendor,
      on: b.pagePath,
      endpoint: `${url.hostname}${url.pathname}`,
      params,
      referer: b.headers.referer ?? null,
      sensitive: sensitiveHits(b),
      userData: userDataParams(b),
    }
  })
}

function violations(beacons: Beacon[]) {
  return beacons
    .map((b) => ({ vendor: b.vendor, on: b.pagePath, hits: sensitiveHits(b), userData: userDataParams(b) }))
    .filter((v) => v.hits.length || v.userData.length)
}

/** Client-side navigation, as a click on an in-app link would do. */
async function navigateInApp(page: Page, path: string) {
  await page.evaluate((to) => {
    window.history.pushState({}, '', to)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForTimeout(2500)
}

async function seedSession(page: Page, session: Session) {
  await page.addInitScript((s) => {
    localStorage.setItem('auth_token', s.token)
    localStorage.setItem('user', JSON.stringify(s.user))
    localStorage.setItem('auth_role', s.role)
    for (const [key, value] of Object.entries(s.extra ?? {})) localStorage.setItem(key, value)
  }, session)
}

/**
 * The whole intake: every required question on all three screens and the
 * optional "Improve your estimate" sections that used to be separate steps
 * (incident details, injuries, treatment, work and bills), then the review.
 */
async function driveAssessment(page: Page, { submit, beyondFirstScreen }: { submit: boolean; beyondFirstScreen: boolean }) {
  const visited: string[] = []
  const note = () => {
    visited.push(page.url())
    learnIdsFrom(page.url())
  }
  const click = async (name: string | RegExp, exact = false) => {
    await page.getByRole('button', { name, exact }).first().click({ timeout: 5000 })
  }

  await page.waitForURL(/step=injury_type/, { timeout: 30_000 })
  note()
  const tagsResident = await page.evaluate(
    () => Boolean(document.getElementById('gtm-init')) || 'fbq' in window || 'google_tag_manager' in window,
  )
  expect(tagsResident, 'the assessment runs in a new document with no container in it').toBe(false)
  await click('Vehicle accident')
  if (!beyondFirstScreen) return visited
  await click('Car', true)
  await click('Last Week')
  await click('Use this location').catch(() => {})
  await page.locator('#intake-zip').fill('91203')
  await page.locator('#contact-email').fill(TEST_EMAIL)
  await page.locator('#contact-phone').fill(TEST_PHONE)
  await click(/^Next$/)

  await page.waitForURL(/step=injury_severity/, { timeout: 30_000 })
  note()
  await click(/^Moderate/)
  await click('Emergency room')
  await click('$2,500 - $10,000')
  await click('Other driver')
  await click('No', true)
  await click(/^Improve your estimate/)
  for (const name of ['Rear-end collision', 'Neck', 'Whiplash', 'Pain', 'Physical therapy', 'A few days']) {
    await click(name, true).catch(() => {})
  }
  await click(/^Continue to Review/)

  await page.waitForURL(/step=consent/, { timeout: 30_000 })
  note()
  for (const box of await page.getByRole('checkbox').all()) await box.check().catch(() => {})

  if (submit) {
    await click(/Generate My Free Report/)
    await page.waitForURL((url) => !url.searchParams.has('step'), { timeout: 90_000 }).catch(() => {})
    await page.waitForTimeout(5000)
    note()
  }
  return visited
}

let containerOnHost = false
/** Past the first wizard screen the app saves a lead; on a shared host that is real data. */
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(process.env.E2E_BASE_URL || 'http://localhost:3000')

test.describe.configure({ timeout: 180_000 })

test.describe('third-party network isolation', () => {
  test.beforeAll(async ({ request }) => {
    const html = await (await request.get('/')).text()
    containerOnHost = html.includes('id="gtm-init"')
  })

  test('the guard is the first script in the head of a marketing page', async ({ page }) => {
    test.skip(!containerOnHost, 'No GTM container on this host (indexing disabled), so nothing to order')
    // The served HTML rather than the live DOM: gtm.js and fbevents.js insert
    // themselves above the first script once they run.
    const html = await (await page.request.get('/')).text()
    const head = html.slice(0, html.indexOf('</head>'))
    const firstScript = head.match(/<script\b[^>]*>/)?.[0] ?? ''
    expect(firstScript).toContain('id="gtm-init"')
    const guard = head.indexOf('disablePushState')
    expect(guard).toBeGreaterThan(-1)
    expect(guard).toBeLessThan(head.indexOf('gtm.js'))

    await page.goto('/')
    const fbq = await page.evaluate(() => {
      const f = (window as unknown as { fbq?: { disablePushState?: boolean } }).fbq
      return f ? { disablePushState: f.disablePushState === true } : null
    })
    expect(fbq).toEqual({ disablePushState: true })
  })

  const directEntry = [
    '/assess',
    '/es/assess',
    `/evidence-upload/${FAKE_ASSESSMENT_ID}?token=${SECRET_TOKEN}`,
    `/register?claim=${SECRET_TOKEN}`,
    `/login?claim=${SECRET_TOKEN}`,
    `/reset-password?token=${SECRET_TOKEN}`,
    `/claim/${SECRET_TOKEN}`,
    `/respond/documents/${SECRET_TOKEN}`,
    '/o/E2E123',
    '/dashboard',
    '/attorney-dashboard',
    '/admin',
    '/a-route-nobody-classified-e2e',
  ]
  if (sessions.evidenceUploadPath) directEntry.push(sessions.evidenceUploadPath)

  for (const path of directEntry) {
    test(`direct entry on ${path.replace(SECRET_TOKEN, '…').replace(/token=[^&]+|claim=[^&]+/, '…')} loads no third-party tag at all`, async ({ page }) => {
      const session = sessions.plaintiff
      if (path === sessions.evidenceUploadPath && session) await seedSession(page, session)
      const tp = await recordThirdParties(page)
      await page.goto(path)
      await settle(page)
      const containerPresent = await page.evaluate(() => Boolean(document.getElementById('gtm-init')))
      expect(containerPresent).toBe(false)
      expect(tp.loads).toEqual([])
      expect(summarise(tp.beacons)).toEqual([])
    })
  }

  test('marketing page, then client-side through the whole assessment', async ({ page }) => {
    test.skip(!containerOnHost, 'No GTM container on this host; tracker behaviour cannot be observed')
    const tp = await recordThirdParties(page)
    const visitCalls: Array<{ origin: string; body: Record<string, unknown> }> = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (url.pathname === '/v1/intake-visits') {
        visitCalls.push({ origin: url.origin, body: JSON.parse(request.postData() || '{}') })
      }
    })
    await page.goto('/')
    await settle(page)
    const landing = tp.mark()

    await page.locator('a[href^="/assess"], a[href^="/assessment/start"]').first().click()
    const beyondFirstScreen = isLocal || process.env.E2E_DRIVE_ASSESSMENT === '1'
    const visited = await driveAssessment(page, {
      beyondFirstScreen,
      submit: beyondFirstScreen && process.env.E2E_SUBMIT_ASSESSMENT === '1',
    })
    await settle(page)

    const after = tp.since(landing)
    console.log(JSON.stringify({ visited, landing: summarise(tp.beacons.slice(0, landing)), afterLeaving: summarise(after) }, null, 2))

    if (beyondFirstScreen) expect(visited.some((url) => url.includes('step=consent')), 'reached the review screen').toBe(true)

    // The funnel's "started" stage: one call, to our own API, carrying only the
    // entry page and campaign tags.
    const ownOrigin = new URL(page.url()).origin
    expect(visitCalls.length, 'one intake visit recorded').toBe(1)
    expect(visitCalls[0].origin).toBe(ownOrigin)
    for (const key of Object.keys(visitCalls[0].body)) {
      expect(['id', 'landingPath', 'utmSource', 'utmMedium', 'utmCampaign']).toContain(key)
    }
    expect(visitCalls[0].body.landingPath).toBe('/')
    expect(after.filter((b) => b.vendor === 'meta').map((b) => b.url), 'Meta requests after leaving the landing page').toEqual([])
    expect(after.filter((b) => b.vendor === 'clarity').length, 'Clarity uploads after leaving the landing page').toBe(0)
    expect(violations(after), 'a vendor receiving a sensitive URL, identifier, case fact or user data').toEqual([])
    expect(tp.beacons.filter((b) => identifierHits(b).length).map((b) => b.vendor)).toEqual([])
  })

  test('the click conversion carries only the landing page, with no user data in URL, body or headers', async ({ page }) => {
    test.skip(!containerOnHost, 'No GTM container on this host; tracker behaviour cannot be observed')
    const tp = await recordThirdParties(page)
    await page.goto('/')
    await settle(page)
    const landing = tp.mark()
    await page.locator('a[href^="/assess"], a[href^="/assessment/start"]').first().click()
    await page.waitForURL(/\/assess/)
    await page.waitForTimeout(4000)

    const conversions = tp.since(landing).filter((b) => /conversion/.test(new URL(b.url).pathname) || /conversion|Free_Case/i.test(new URL(b.url).searchParams.get('en') ?? ''))
    console.log(
      JSON.stringify(
        conversions.map((b) => ({
          url: b.url,
          body: b.body.slice(0, 2000),
          headers: Object.fromEntries(Object.entries(b.headers).filter(([k]) => k !== 'cookie')),
        })),
        null,
        2,
      ),
    )
    expect(conversions.length, 'the CTA click is still recorded as a conversion').toBeGreaterThan(0)
    // Automatic enhanced conversions scrapes the page for an email or phone when
    // a conversion fires and sends it hashed. It found nothing here, but it is a
    // setting in the Google Ads account, not something this site controls.
    if (conversions.some((b) => new URL(b.url).searchParams.get('ec_mode') === 'a')) {
      test.info().annotations.push({
        type: 'warning',
        description: 'Google Ads automatic enhanced conversions is on (ec_mode=a); turn it off in the Ads account',
      })
    }
    for (const b of conversions) {
      const page = new URL(b.url).searchParams.get('url') ?? new URL(b.url).searchParams.get('dl') ?? ''
      expect(new URL(page || 'http://x/').pathname).toBe('/')
      expect(b.headers.referer ?? '').not.toMatch(/\/(assess|evidence-upload|dashboard)/)
      expect(sensitiveHits(b)).toEqual([])
      expect(userDataParams(b)).toEqual([])
    }
  })

  test('assessment, then back out to a marketing page client-side', async ({ page }) => {
    test.skip(!containerOnHost, 'No GTM container on this host; tracker behaviour cannot be observed')
    const tp = await recordThirdParties(page)
    await page.goto('/')
    await settle(page)
    const landing = tp.mark()

    await page.locator('a[href^="/assess"], a[href^="/assessment/start"]').first().click()
    await page.waitForURL(/\/assess/)
    await page.waitForTimeout(1500)
    await page.goBack()
    await page.waitForTimeout(500)
    await navigateInApp(page, '/about')
    await settle(page)

    // Back on a marketing page is a new document with its own landing page, so
    // its tags report again. What must not reach them is anything from the
    // assessment in between, including as a referrer.
    const after = tp.since(landing)
    console.log(JSON.stringify({ afterLeaving: summarise(after) }, null, 2))
    expect(violations(after)).toEqual([])
    for (const b of after.filter((x) => x.vendor === 'meta')) {
      const url = new URL(b.url)
      expect(`${url.searchParams.get('dl')} ${url.searchParams.get('rl')}`).not.toMatch(/assess|lead=/)
    }
  })

  const signedIn: Array<[keyof Sessions, string[]]> = [
    ['plaintiff', ['/dashboard', '/case-tracker', '/documents', '/messaging', '/profile']],
    ['attorney', ['/attorney-dashboard', '/attorney-dashboard/cases/active', '/attorney-dashboard/leadgen/matches', '/attorney-dashboard/cases/messages']],
    ['admin', ['/admin', '/admin/users']],
  ]
  for (const [role, paths] of signedIn) {
    test(`signed-in ${role}: marketing page, then client-side through the dashboards`, async ({ page }) => {
      const session = sessions[role] as Session | null | undefined
      test.skip(!session, `No ${role} session; set E2E_SESSIONS (api/scripts/e2e-tracker-sessions.ts)`)
      test.skip(!containerOnHost, 'No GTM container on this host; tracker behaviour cannot be observed')
      await seedSession(page, session as Session)
      const tp = await recordThirdParties(page)
      await page.goto('/')
      await settle(page)
      const landing = tp.mark()

      const reached: string[] = []
      for (const path of paths) {
        await navigateInApp(page, path)
        reached.push(new URL(page.url()).pathname)
        learnIdsFrom(page.url())
      }
      if (role === 'plaintiff' && sessions.evidenceUploadPath) await navigateInApp(page, sessions.evidenceUploadPath)
      await settle(page)

      const after = tp.since(landing)
      console.log(JSON.stringify({ role, reached, afterLeaving: summarise(after) }, null, 2))
      expect(reached.some((p) => p !== '/' && !p.startsWith('/login')), `${role} reached a signed-in screen`).toBe(true)
      expect(after.filter((b) => b.vendor === 'meta').map((b) => b.url)).toEqual([])
      expect(after.filter((b) => b.vendor === 'clarity').length).toBe(0)
      expect(violations(after)).toEqual([])
      expect(tp.beacons.filter((b) => identifierHits(b).length).map((b) => ({ vendor: b.vendor, hits: identifierHits(b) }))).toEqual([])
    })
  }

  test('a full page load from a tokenised upload link to a marketing page does not leak the URL as referrer', async ({
    page,
  }) => {
    const tp = await recordThirdParties(page)
    await page.goto(sessions.evidenceUploadPath ?? `/evidence-upload/${FAKE_ASSESSMENT_ID}?token=${SECRET_TOKEN}`)
    await page.waitForLoadState('load')
    await page.evaluate(() => window.location.assign('/'))
    await page.waitForURL((url) => url.pathname === '/')
    await settle(page)

    const referrer = await page.evaluate(() => document.referrer)
    expect(referrer).not.toMatch(/evidence-upload|token=/)
    expect(tp.beacons.filter((b) => identifierHits(b).length || routeHits(b).includes('/evidence-upload')).map((b) => b.vendor)).toEqual([])
  })
})

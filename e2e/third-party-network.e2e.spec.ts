import { expect, test, type Page, type Request } from '@playwright/test'

/**
 * What third parties actually receive, measured in a real browser.
 *
 * The unit tests for metaPixelGuard prove what the app asks of the Pixel, not
 * what Meta's script does once it is running, and they cannot see the tags the
 * GTM container adds. This loads the live container and the vendors' own
 * scripts, then records every collection request they make. Collection
 * requests are aborted after they are recorded, so running this sends nothing
 * to Meta, Google or Clarity; library downloads are allowed through so the
 * scripts behave as they do for a visitor.
 *
 * Needs a server where the container loads (SEARCH_ENGINE_INDEXING not
 * `disabled`). The API is not needed.
 */

const SECRET_TOKEN = 'e2eSecretToken9f3c2a7b'
const FAKE_ASSESSMENT_ID = 'cm9e2etestassessment000001'

type Vendor = 'meta' | 'google' | 'clarity' | 'other'

type Beacon = { vendor: Vendor; url: string; body: string; pagePath: string; at: number }

const VENDOR_HOSTS: Array<[RegExp, Vendor]> = [
  [/(^|\.)facebook\.(com|net)$/, 'meta'],
  [/(^|\.)(google-analytics|googletagmanager|googleadservices|doubleclick|googlesyndication)\.(com|net)$/, 'google'],
  [/(^|\.)google\.com$/, 'google'],
  [/(^|\.)clarity\.ms$/, 'clarity'],
  [/(^|\.)(bing|tiktok|linkedin|licdn|hotjar|fullstory|segment|mixpanel|posthog|reddit|twitter|ads-twitter|snapchat|pinterest|taboola|outbrain)\.(com|net|io|ms)$/, 'other'],
]

/** Paths that report data, even when they are requested as a script. */
const COLLECTION_PATH = /\/(tr|collect|g\/collect|j\/collect|pagead|ccm|action|rmkt|conversion)(\/|$|\?)/

function vendorOf(url: URL): Vendor | null {
  for (const [pattern, vendor] of VENDOR_HOSTS) if (pattern.test(url.hostname)) return vendor
  return null
}

/** Sensitive markers: app routes, the test assessment id, the claim token. */
const SENSITIVE = [
  SECRET_TOKEN,
  FAKE_ASSESSMENT_ID,
  '/assess',
  '/evidence-upload',
  '/dashboard',
  '/attorney-dashboard',
  '/intake',
]

function sensitiveHits(beacon: Beacon): string[] {
  let text = `${beacon.url}\n${beacon.body}`
  try {
    text += `\n${decodeURIComponent(text)}`
  } catch {
    /* a malformed escape is still searched raw */
  }
  return SENSITIVE.filter((marker) => text.includes(marker))
}

async function recordThirdParties(page: Page) {
  const beacons: Beacon[] = []
  const loads: string[] = []
  const started = Date.now()

  await page.route(
    (url) => vendorOf(url) !== null,
    async (route) => {
      const request: Request = route.request()
      const url = new URL(request.url())
      const vendor = vendorOf(url) as Vendor
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
        vendor,
        url: request.url(),
        body: request.postData() ?? '',
        pagePath,
        at: Date.now() - started,
      })
      await route.abort()
    },
  )

  return {
    beacons,
    loads,
    since(mark: number) {
      return beacons.slice(mark)
    },
    mark() {
      return beacons.length
    },
  }
}

/** Long enough for Clarity's first upload and Meta's batched events. */
const SETTLE_MS = 6000

async function settle(page: Page) {
  await page.waitForLoadState('load')
  await page.waitForTimeout(SETTLE_MS)
}

/** The parameters vendors use for event name, page URL, referrer and title. */
const REPORTED_PARAMS = ['ev', 'en', 'dl', 'rl', 'dr', 'dp', 'url', 'ref', 'dt', 'tid', 'id']

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
      sensitive: sensitiveHits(b),
    }
  })
}

/** Clicks through whatever the wizard shows, the way a claimant would. */
async function workThroughWizard(page: Page, screens = 12) {
  for (let i = 0; i < screens; i++) {
    const textInputs = page.locator('input[type="text"]:visible, input:not([type]):visible, textarea:visible')
    for (const input of await textInputs.all()) {
      await input.fill('Rear-ended at a light, neck and back pain, MRI scheduled').catch(() => {})
    }
    const option = page.locator('[role="radio"]:visible, input[type="radio"]:visible, [role="option"]:visible').first()
    await option.click({ timeout: 1000 }).catch(() => {})
    const choice = page.locator('main button:visible').filter({ hasNotText: /back|sign in|log in/i }).first()
    await choice.click({ timeout: 1000 }).catch(() => {})
    const next = page.getByRole('button', { name: /^(next|continue|see my results|review)/i }).first()
    await next.click({ timeout: 1500 }).catch(() => {})
    await page.waitForTimeout(600)
  }
}

test.describe.configure({ timeout: 120_000 })

test.describe('third-party network isolation', () => {
  test('the guard is the first script in the head of a marketing page', async ({ page }) => {
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

  for (const path of [
    '/assess',
    `/evidence-upload/${FAKE_ASSESSMENT_ID}?token=${SECRET_TOKEN}`,
    '/dashboard',
    '/attorney-dashboard',
    '/es/assess',
    '/a-route-nobody-classified-e2e',
  ]) {
    test(`direct entry on ${path.split('?')[0]} loads no third-party tag at all`, async ({ page }) => {
      const tp = await recordThirdParties(page)
      await page.goto(path)
      await settle(page)
      const containerPresent = await page.evaluate(() => Boolean(document.getElementById('gtm-init')))
      console.log(JSON.stringify({ path, loads: tp.loads, beacons: summarise(tp.beacons) }, null, 2))
      expect(containerPresent).toBe(false)
      expect(tp.loads).toEqual([])
      expect(tp.beacons).toEqual([])
    })
  }

  test('marketing page, then client-side into the assessment and through the wizard', async ({ page }) => {
    const tp = await recordThirdParties(page)
    await page.goto('/')
    await settle(page)
    const landing = tp.mark()

    await page.locator('a[href^="/assess"], a[href^="/assessment/start"]').first().click()
    await page.waitForURL(/\/assess/)
    await workThroughWizard(page)
    await settle(page)

    const after = tp.since(landing)
    console.log(JSON.stringify({ landing: summarise(tp.beacons.slice(0, landing)), afterLeaving: summarise(after) }, null, 2))

    expect(after.filter((b) => b.vendor === 'meta'), 'Meta requests after leaving the landing page').toEqual([])
    expect(after.filter((b) => b.vendor === 'clarity'), 'Clarity uploads after leaving the landing page').toEqual([])
    expect(
      after.filter((b) => sensitiveHits(b).length > 0).map((b) => ({ vendor: b.vendor, hits: sensitiveHits(b) })),
      'any vendor receiving a sensitive URL or identifier',
    ).toEqual([])
  })

  test('assessment, then back out to a marketing page client-side', async ({ page }) => {
    const tp = await recordThirdParties(page)
    await page.goto('/')
    await settle(page)
    const landing = tp.mark()

    await page.locator('a[href^="/assess"], a[href^="/assessment/start"]').first().click()
    await page.waitForURL(/\/assess/)
    await page.waitForTimeout(1500)
    await page.goBack()
    await page.waitForTimeout(500)
    await page.evaluate(() => window.history.pushState({}, '', '/about'))
    await page.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')))
    await settle(page)

    const after = tp.since(landing)
    console.log(JSON.stringify({ afterLeaving: summarise(after) }, null, 2))
    expect(after.filter((b) => b.vendor === 'meta')).toEqual([])
    expect(after.filter((b) => b.vendor === 'clarity')).toEqual([])
  })

  test('a full page load from a tokenised upload link to a marketing page does not leak the URL as referrer', async ({
    page,
  }) => {
    const tp = await recordThirdParties(page)
    await page.goto(`/evidence-upload/${FAKE_ASSESSMENT_ID}?token=${SECRET_TOKEN}`)
    await page.waitForLoadState('load')
    await page.evaluate(() => window.location.assign('/'))
    await page.waitForURL((url) => url.pathname === '/')
    await settle(page)

    const referrer = await page.evaluate(() => document.referrer)
    console.log(JSON.stringify({ referrer, beacons: summarise(tp.beacons) }, null, 2))
    expect(referrer).not.toContain(SECRET_TOKEN)
    expect(referrer).not.toContain('/evidence-upload')
    // Route names alone are not checked here: the home page's own links to
    // /assess and /dashboard appear in Clarity's capture of that page.
    const leaked = tp.beacons.filter((b) =>
      sensitiveHits(b).some((hit) => hit === SECRET_TOKEN || hit === FAKE_ASSESSMENT_ID || hit === '/evidence-upload'),
    )
    expect(leaked.map((b) => b.vendor)).toEqual([])
  })
})

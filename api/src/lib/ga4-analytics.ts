/**
 * Google Analytics 4 traffic reporting for the admin section.
 *
 * Read-only. This pulls session and acquisition numbers from the GA4 property
 * that `SiteAnalytics` reports into, so an admin can see traffic next to the
 * case funnel without leaving the product.
 *
 * Know what these numbers do and do not cover. The tag only runs on public
 * marketing and SEO pages — the intake wizard, dashboards and every signed-in
 * screen are excluded by the HIPAA boundary in `app/src/lib/analyticsBoundary.ts`
 * — so this is a top-of-funnel measurement and will never reconcile against
 * case counts. GA4 sees the visit; only our own database sees what became of it.
 *
 * Uses the REST Data API through `google-auth-library`, which is already a
 * dependency, rather than `@google-analytics/data`. That package pulls in a gRPC
 * stack for the same two HTTP calls.
 */
import { GoogleAuth } from 'google-auth-library'
import { logger } from './logger'

const DATA_API = 'https://analyticsdata.googleapis.com/v1beta'
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'

/**
 * The GA4 Data API is quota-limited per property, per day, and the admin
 * dashboard is re-fetched on every visit and every window change. Fifteen
 * minutes is far fresher than anyone reads traffic numbers and keeps a busy
 * ops team from exhausting the property's daily token budget by lunchtime.
 */
const CACHE_TTL_MS = 15 * 60 * 1000

/** A batchRunReports call accepts at most five reports. */
const MAX_REPORTS_PER_BATCH = 5

/** Rows kept for the "top N" breakdowns, which have long tails. */
const TOP_ROWS = 25

export type TrafficTotals = {
  sessions: number
  totalUsers: number
  newUsers: number
  pageViews: number
  engagementRate: number
  averageSessionDuration: number
  bounceRate: number
}

export type TrafficPoint = { date: string; sessions: number; newUsers: number }
export type TrafficBreakdown = { label: string; sessions: number; newUsers?: number }

/**
 * One page, with how long it held people.
 *
 * `averageEngagementSeconds` is GA4's own definition — engagement duration over
 * active users — and it is not "time on page" in the old Universal Analytics
 * sense. GA4 only counts time the tab was actually in the foreground, so a page
 * left open in a background tab contributes nothing. That makes it a reasonable
 * attention measure and a poor stopwatch, which is worth saying wherever it is
 * displayed.
 */
export type TrafficPage = {
  path: string
  pageViews: number
  activeUsers: number
  averageEngagementSeconds: number
}

export type TrafficReport = {
  configured: true
  periodDays: number
  totals: TrafficTotals
  byDay: TrafficPoint[]
  byChannel: TrafficBreakdown[]
  bySourceMedium: TrafficBreakdown[]
  byCampaign: TrafficBreakdown[]
  byLandingPage: TrafficBreakdown[]
  byDevice: TrafficBreakdown[]
  byRegion: TrafficBreakdown[]
  byPage: TrafficPage[]
  /**
   * Ad spend keyed the same way `channelLabel` names a channel, so the two can
   * be joined. Empty when Google Ads is not linked to the GA4 property, which
   * is not an error — it just means nothing here can be priced.
   */
  adCostBySourceMedium: Array<{ label: string; cost: number; sessions: number }>
}

/**
 * Why the panel has nothing to show.
 *
 * `unset` is the ordinary state — every local checkout and every non-production
 * deployment. The other two are mistakes, and both used to surface as a bare
 * "Could not reach Google Analytics": the request was attempted and Google
 * rejected it, and the route hides the upstream detail outside development. The
 * two errors below are the ones worth naming, because both are easy to make and
 * neither is guessable from a 400.
 */
export type TrafficUnconfiguredReason = 'unset' | 'property_id_not_numeric' | 'credentials_unparseable'

export type TrafficResult = TrafficReport | { configured: false; reason: TrafficUnconfiguredReason }

type ReportRequest = Record<string, unknown>

type Ga4Row = {
  dimensionValues?: { value?: string }[]
  metricValues?: { value?: string }[]
}

type Ga4Report = { rows?: Ga4Row[] }

export function isGa4Configured(): boolean {
  return Boolean(propertyId() && rawCredentials())
}

function propertyId(): string {
  // Tolerates "properties/123456" as well as the bare numeric id, because the
  // GA4 admin screen shows it both ways depending on where you copy it from.
  return (process.env.GA4_PROPERTY_ID || '').trim().replace(/^properties\//, '')
}

function rawCredentials(): string {
  return (process.env.GA4_SERVICE_ACCOUNT_JSON || '').trim()
}

/**
 * Service account JSON, accepted raw or base64-encoded.
 *
 * The key contains literal newlines, which several secret stores and shells
 * mangle on the way into an environment variable. Base64 survives all of them,
 * so both forms are supported rather than leaving a corrupted key to fail as an
 * opaque signature error at request time.
 */
function credentials(): Record<string, unknown> {
  const raw = rawCredentials()
  const text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
  return JSON.parse(text)
}

function metric(row: Ga4Row, index: number): number {
  const value = Number(row.metricValues?.[index]?.value)
  return Number.isFinite(value) ? value : 0
}

function dimension(row: Ga4Row, index: number): string {
  return row.dimensionValues?.[index]?.value || '(not set)'
}

function breakdown(report: Ga4Report | undefined, withNewUsers = false): TrafficBreakdown[] {
  return (report?.rows || []).map((row) => ({
    label: dimension(row, 0),
    sessions: metric(row, 0),
    ...(withNewUsers ? { newUsers: metric(row, 1) } : {}),
  }))
}

const SESSIONS_DESC = [{ metric: { metricName: 'sessions' }, desc: true }]

function reportDefinitions(days: number): ReportRequest[] {
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: 'today' }]

  return [
    // 0 — topline totals, no dimensions.
    {
      dateRanges,
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
    },
    // 1 — daily series, ascending so the line chart reads left to right.
    {
      dateRanges,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'newUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 400,
    },
    // 2 — acquisition channel: organic, paid, direct, referral, social.
    {
      dateRanges,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'newUsers' }],
      orderBys: SESSIONS_DESC,
      limit: TOP_ROWS,
    },
    // 3 — source / medium.
    {
      dateRanges,
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [{ name: 'sessions' }],
      orderBys: SESSIONS_DESC,
      limit: TOP_ROWS,
    },
    // 4 — campaign, which is where Google Ads spend shows up.
    {
      dateRanges,
      dimensions: [{ name: 'sessionCampaignName' }],
      metrics: [{ name: 'sessions' }],
      orderBys: SESSIONS_DESC,
      limit: TOP_ROWS,
    },
    // 5 — landing pages.
    {
      dateRanges,
      dimensions: [{ name: 'landingPagePlusQueryString' }],
      metrics: [{ name: 'sessions' }],
      orderBys: SESSIONS_DESC,
      limit: TOP_ROWS,
    },
    // 6 — device category.
    {
      dateRanges,
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'sessions' }],
      orderBys: SESSIONS_DESC,
      limit: TOP_ROWS,
    },
    // 7 — region, which lines up with the venue-state breakdown alongside it.
    {
      dateRanges,
      dimensions: [{ name: 'region' }],
      metrics: [{ name: 'sessions' }],
      orderBys: SESSIONS_DESC,
      limit: TOP_ROWS,
    },
    // 8 — pages, and how long each one holds people. Ordered by views rather
    // than by engagement: the longest-held page is otherwise always some page
    // three people found, and the question being asked is which of the pages
    // that matter are holding attention.
    //
    // `pagePath`, not `pagePathPlusQueryString` — query strings split one page
    // across dozens of rows, and every UTM-tagged ad landing would appear
    // separately from its own organic traffic.
    {
      dateRanges,
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'userEngagementDuration' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: TOP_ROWS,
    },
    // 9 — ad cost by source/medium, the join key for cost per retained case.
    // Deliberately source/medium rather than the channel group: it is the same
    // shape `channelLabel` builds from our own utm columns ("google / cpc"), so
    // the two sides line up without a translation table in between.
    //
    // `advertiserAdCost` is only populated when Google Ads is linked to the GA4
    // property. Without that link GA4 returns zeros rather than an error, so
    // this degrades to an unpriced report instead of breaking the panel.
    {
      dateRanges,
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [{ name: 'advertiserAdCost' }, { name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'advertiserAdCost' }, desc: true }],
      limit: TOP_ROWS,
    },
  ]
}

/** `20260909` from the GA4 date dimension becomes `2026-09-09`. */
function isoDate(compact: string): string {
  if (!/^\d{8}$/.test(compact)) return compact
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
}

let cached: { key: number; at: number; value: TrafficReport } | null = null

/** Exported for tests, which must not inherit a previous run's report. */
export function clearGa4Cache(): void {
  cached = null
}

let authClient: GoogleAuth | null = null

function auth(): GoogleAuth {
  if (!authClient) {
    authClient = new GoogleAuth({ credentials: credentials(), scopes: [SCOPE] })
  }
  return authClient
}

async function runBatch(batch: ReportRequest[], property: string): Promise<Ga4Report[]> {
  const client = await auth().getClient()
  const response = await client.request<{ reports?: Ga4Report[] }>({
    url: `${DATA_API}/properties/${property}:batchRunReports`,
    method: 'POST',
    data: { requests: batch },
  })
  return response.data.reports || []
}

/**
 * Traffic for the last `days` days, or `{ configured: false }` when no GA4
 * property is wired up.
 *
 * Not configured is a normal state, not an error: it is every local checkout and
 * every non-production deployment. The caller renders an explanation rather than
 * a wall of zeros, which would otherwise be indistinguishable from a site nobody
 * visited.
 */
export async function fetchTrafficReport(days: number): Promise<TrafficResult> {
  if (!isGa4Configured()) return { configured: false, reason: 'unset' }

  const property = propertyId()

  // The Data API addresses properties by their numeric id. `G-8F3T9DFK8Q` is
  // the measurement id — the one the browser snippet uses, the one printed all
  // over the GA4 UI, and the one people reach for. Sending it produces a 400
  // that says nothing about which of the two ids was wanted.
  if (!/^\d+$/.test(property)) {
    logger.warn('GA4_PROPERTY_ID is not numeric; refusing to call the Data API', { property })
    return { configured: false, reason: 'property_id_not_numeric' }
  }

  // Parsed here rather than at request time so a mangled key is reported as a
  // configuration problem instead of an opaque signature failure from Google.
  try {
    credentials()
  } catch {
    logger.warn('GA4_SERVICE_ACCOUNT_JSON could not be parsed as JSON or base64-encoded JSON')
    return { configured: false, reason: 'credentials_unparseable' }
  }

  if (cached && cached.key === days && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value
  }

  const definitions = reportDefinitions(days)
  const batches: ReportRequest[][] = []
  for (let i = 0; i < definitions.length; i += MAX_REPORTS_PER_BATCH) {
    batches.push(definitions.slice(i, i + MAX_REPORTS_PER_BATCH))
  }

  const results = await Promise.all(batches.map((batch) => runBatch(batch, property)))
  const reports = results.flat()

  const totalsRow = reports[0]?.rows?.[0]
  const value: TrafficReport = {
    configured: true,
    periodDays: days,
    totals: {
      sessions: totalsRow ? metric(totalsRow, 0) : 0,
      totalUsers: totalsRow ? metric(totalsRow, 1) : 0,
      newUsers: totalsRow ? metric(totalsRow, 2) : 0,
      pageViews: totalsRow ? metric(totalsRow, 3) : 0,
      engagementRate: totalsRow ? metric(totalsRow, 4) : 0,
      averageSessionDuration: totalsRow ? metric(totalsRow, 5) : 0,
      bounceRate: totalsRow ? metric(totalsRow, 6) : 0,
    },
    byDay: (reports[1]?.rows || []).map((row) => ({
      date: isoDate(dimension(row, 0)),
      sessions: metric(row, 0),
      newUsers: metric(row, 1),
    })),
    byChannel: breakdown(reports[2], true),
    bySourceMedium: (reports[3]?.rows || []).map((row) => ({
      label: `${dimension(row, 0)} / ${dimension(row, 1)}`,
      sessions: metric(row, 0),
    })),
    byCampaign: breakdown(reports[4]),
    byLandingPage: breakdown(reports[5]),
    byDevice: breakdown(reports[6]),
    byRegion: breakdown(reports[7]),
    byPage: (reports[8]?.rows || []).map((row) => {
      const activeUsers = metric(row, 1)
      return {
        path: dimension(row, 0),
        pageViews: metric(row, 0),
        activeUsers,
        // GA4 reports the total engaged duration; the per-user average is what
        // its own Pages report shows, and dividing here keeps that arithmetic
        // out of the component.
        averageEngagementSeconds: activeUsers > 0 ? Math.round(metric(row, 2) / activeUsers) : 0,
      }
    }),
    adCostBySourceMedium: (reports[9]?.rows || [])
      .map((row) => ({
        label: `${dimension(row, 0)} / ${dimension(row, 1)}`,
        cost: metric(row, 0),
        sessions: metric(row, 1),
      }))
      // Unlinked properties report every row at zero cost, which would fill the
      // table with organic and direct traffic priced at nothing.
      .filter((entry) => entry.cost > 0),
  }

  cached = { key: days, at: Date.now(), value }
  logger.info('GA4 traffic report fetched', { days, sessions: value.totals.sessions })
  return value
}

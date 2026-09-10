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
}

export type TrafficResult = TrafficReport | { configured: false }

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
  if (!isGa4Configured()) return { configured: false }

  if (cached && cached.key === days && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value
  }

  const property = propertyId()
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
  }

  cached = { key: days, at: Date.now(), value }
  logger.info('GA4 traffic report fetched', { days, sessions: value.totals.sessions })
  return value
}

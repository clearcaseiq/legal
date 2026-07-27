/**
 * Google Places API (New) Text Search client.
 *
 * Used to discover law-firm office locations. Places gives us business name,
 * address, phone, website, rating and hours; it does not give attorney names or
 * emails, so it is a discovery source rather than a source of record.
 *
 * ## Billing is decided by the field mask, and it is easy to get wrong
 *
 * Every request is billed at the highest SKU tier of any field requested. One
 * stray `rating` in a field mask moves a whole run from Pro to Enterprise. The
 * tier tables below are transcribed from Google's field documentation so the
 * choice is explicit and reviewable rather than a string literal someone edits
 * without realising it repriced the run.
 *
 * The trap worth naming: `websiteUri` is an **Enterprise** field. That defeats the
 * obvious cost-saving plan of doing a cheap Pro-tier discovery pass and filtering
 * on "has a website", because you cannot see the website at Pro tier at all.
 *
 * ## Why this client does single-pass Enterprise by default
 *
 * The tempting alternative is a two-stage approach: cheap Pro search, then
 * Place Details for the survivors. For this workload that costs more, because
 * Text Search returns up to 20 places per billed request while Place Details bills
 * per place:
 *
 *   Text Search Enterprise   $35 / 1,000 requests  ~20 places each  ~$0.0018/place
 *   Place Details Enterprise $20 / 1,000 places                      $0.0200/place
 *
 * Two-stage only wins if the first pass discards so much that fewer than ~0.15
 * places per request survive — over 99% waste. Targeted "personal injury attorney
 * in <city>" queries are nowhere near that wasteful, so a single Enterprise pass
 * is both cheaper and simpler.
 *
 * That means the real cost lever is the **number of requests**, not the fields.
 * Cost is `cities x keywords x pages`, which is why the query matrix is ordered by
 * yield and why this client enforces a hard request budget.
 */

/**
 * Text Search SKU tiers, cheapest first.
 *
 * `essentials` returns identifiers only — no name, no address — so it is not
 * useful for discovery on its own and exists here for completeness.
 */
export type PlacesSkuTier = 'essentials' | 'pro' | 'enterprise'

/** Fields billed at Text Search Essentials. */
export const ESSENTIALS_FIELDS = ['places.id', 'places.name', 'places.attributions'] as const

/**
 * Fields billed at Text Search Pro. Enough to know who and where a business is,
 * but deliberately not enough to reach it — no phone, no website.
 */
export const PRO_FIELDS = [
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.addressComponents',
  'places.postalAddress',
  'places.location',
  'places.viewport',
  'places.businessStatus',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.types',
  'places.googleMapsUri',
  'places.plusCode',
  'places.utcOffsetMinutes',
  'places.timeZone',
] as const

/**
 * Fields billed at Text Search Enterprise.
 *
 * `websiteUri` living here is the important detail: the website is the field that
 * makes a discovered listing actionable, since it is the bridge to attorney names
 * that Places does not provide.
 */
export const ENTERPRISE_FIELDS = [
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.regularOpeningHours',
  'places.currentOpeningHours',
  'places.priceLevel',
] as const

/** Published price per 1,000 requests, and the monthly free allowance per SKU. */
export const SKU_PRICING: Record<PlacesSkuTier, { perThousandUsd: number; freePerMonth: number }> = {
  essentials: { perThousandUsd: 0, freePerMonth: 10_000 },
  pro: { perThousandUsd: 32, freePerMonth: 5_000 },
  enterprise: { perThousandUsd: 35, freePerMonth: 1_000 },
}

const TIER_ORDER: PlacesSkuTier[] = ['essentials', 'pro', 'enterprise']

const FIELD_TIER: Map<string, PlacesSkuTier> = new Map([
  ...ESSENTIALS_FIELDS.map((field) => [field, 'essentials'] as const),
  ...PRO_FIELDS.map((field) => [field, 'pro'] as const),
  ...ENTERPRISE_FIELDS.map((field) => [field, 'enterprise'] as const),
])

/**
 * The tier a field mask will actually be billed at.
 *
 * Unknown fields are treated as Enterprise. Guessing high is the safe direction:
 * an over-estimate shows up as a budget that runs out early, whereas an
 * under-estimate shows up as a surprise invoice.
 */
export function tierForFields(fields: readonly string[]): PlacesSkuTier {
  let highest: PlacesSkuTier = 'essentials'
  for (const field of fields) {
    if (field === 'nextPageToken') continue
    const tier = FIELD_TIER.get(field) ?? 'enterprise'
    if (TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(highest)) highest = tier
  }
  return highest
}

/**
 * The field mask used for firm discovery.
 *
 * Enterprise by the reasoning in the module header: the website and phone are
 * what make a listing usable, and getting them here is an order of magnitude
 * cheaper per place than a follow-up Place Details call.
 */
export const DISCOVERY_FIELD_MASK: readonly string[] = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.addressComponents',
  'places.location',
  'places.businessStatus',
  'places.primaryType',
  'places.types',
  'places.googleMapsUri',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.regularOpeningHours',
  'nextPageToken',
]

export type PlacesAddressComponent = {
  longText?: string
  shortText?: string
  types?: string[]
}

export type PlaceResult = {
  id: string
  displayName?: { text?: string; languageCode?: string }
  formattedAddress?: string
  addressComponents?: PlacesAddressComponent[]
  location?: { latitude?: number; longitude?: number }
  businessStatus?: string
  primaryType?: string
  types?: string[]
  googleMapsUri?: string
  nationalPhoneNumber?: string
  websiteUri?: string
  rating?: number
  userRatingCount?: number
  regularOpeningHours?: { weekdayDescriptions?: string[]; openNow?: boolean }
}

type SearchTextResponse = {
  places?: PlaceResult[]
  nextPageToken?: string
}

/** Running tally of what a run has spent, in requests and dollars. */
export type UsageLedger = {
  requestsByTier: Record<PlacesSkuTier, number>
  totalRequests: number
  retries: number
  placesReturned: number
}

export function emptyLedger(): UsageLedger {
  return {
    requestsByTier: { essentials: 0, pro: 0, enterprise: 0 },
    totalRequests: 0,
    retries: 0,
    placesReturned: 0,
  }
}

/**
 * Estimate spend, accounting for each SKU's monthly free allowance.
 *
 * `alreadyUsedThisMonth` lets a run that follows earlier runs price itself
 * correctly rather than assuming the free allowance is still untouched.
 */
export function estimateCost(
  ledger: UsageLedger,
  alreadyUsedThisMonth: Partial<Record<PlacesSkuTier, number>> = {}
): { billableByTier: Record<PlacesSkuTier, number>; totalUsd: number } {
  const billableByTier: Record<PlacesSkuTier, number> = { essentials: 0, pro: 0, enterprise: 0 }
  let totalUsd = 0

  for (const tier of TIER_ORDER) {
    const requests = ledger.requestsByTier[tier]
    if (requests === 0) continue

    const { perThousandUsd, freePerMonth } = SKU_PRICING[tier]
    const priorUse = alreadyUsedThisMonth[tier] ?? 0
    const freeRemaining = Math.max(0, freePerMonth - priorUse)
    const billable = Math.max(0, requests - freeRemaining)

    billableByTier[tier] = billable
    totalUsd += (billable / 1000) * perThousandUsd
  }

  return { billableByTier, totalUsd: Math.round(totalUsd * 100) / 100 }
}

export class PlacesBudgetExceededError extends Error {
  constructor(readonly limit: number) {
    super(`Google Places request budget of ${limit} exhausted`)
    this.name = 'PlacesBudgetExceededError'
  }
}

export type PlacesClientOptions = {
  apiKey: string
  /**
   * Hard cap on billed requests. The client refuses to exceed it, so a runaway
   * loop or an over-large query matrix fails loudly instead of quietly spending
   * money. There is no default: callers must state a number.
   */
  maxRequests: number
  /** Milliseconds between requests. Google's published rate ceilings are high, but pacing keeps a long run well clear of them. */
  delayMs?: number
  /** Attempts per request, including the first. */
  maxAttempts?: number
  fieldMask?: readonly string[]
  /** Injectable for tests. */
  fetchImpl?: typeof fetch
  /** Injectable for tests, so backoff does not make them slow. */
  sleepImpl?: (ms: number) => Promise<void>
  onRequest?: (info: { query: string; page: number; tier: PlacesSkuTier }) => void
}

const DEFAULT_DELAY_MS = 200
const DEFAULT_MAX_ATTEMPTS = 4
/** Google returns at most 20 per page and stops paging after 3 pages. */
export const MAX_PAGES_PER_QUERY = 3

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Whether a failed response is worth retrying.
 *
 * 429 and 5xx are transient. A 400 means the request itself is wrong — usually a
 * malformed field mask — and retrying it just burns budget on the same error.
 * 403 usually means the key is unrestricted-wrong or the API is not enabled, which
 * also will not fix itself.
 */
function isRetryable(status: number): boolean {
  return status === 429 || status >= 500
}

export class GooglePlacesClient {
  private readonly apiKey: string
  private readonly maxRequests: number
  private readonly delayMs: number
  private readonly maxAttempts: number
  private readonly fieldMask: readonly string[]
  private readonly tier: PlacesSkuTier
  private readonly fetchImpl: typeof fetch
  private readonly sleepImpl: (ms: number) => Promise<void>
  private readonly onRequest?: PlacesClientOptions['onRequest']

  readonly ledger: UsageLedger = emptyLedger()

  constructor(options: PlacesClientOptions) {
    if (!options.apiKey) throw new Error('GooglePlacesClient requires an API key')
    if (!Number.isFinite(options.maxRequests) || options.maxRequests <= 0) {
      throw new Error('GooglePlacesClient requires a positive maxRequests budget')
    }

    this.apiKey = options.apiKey
    this.maxRequests = Math.floor(options.maxRequests)
    this.delayMs = options.delayMs ?? DEFAULT_DELAY_MS
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
    this.fieldMask = options.fieldMask ?? DISCOVERY_FIELD_MASK
    this.tier = tierForFields(this.fieldMask)
    this.fetchImpl = options.fetchImpl ?? fetch
    this.sleepImpl = options.sleepImpl ?? sleep
    this.onRequest = options.onRequest
  }

  /** Requests still available under the budget. */
  get remainingBudget(): number {
    return Math.max(0, this.maxRequests - this.ledger.totalRequests)
  }

  get skuTier(): PlacesSkuTier {
    return this.tier
  }

  /**
   * Run one text query, following pagination up to `maxPages`.
   *
   * Pages are billed individually, so paging a query costs the same per page as
   * the first request. Stops early and returns what it has when the budget runs
   * out, so partial results are still usable.
   */
  async searchText(
    query: string,
    options: { maxPages?: number } = {}
  ): Promise<{ places: PlaceResult[]; pagesFetched: number; budgetExhausted: boolean }> {
    const maxPages = Math.min(options.maxPages ?? MAX_PAGES_PER_QUERY, MAX_PAGES_PER_QUERY)
    const places: PlaceResult[] = []
    let pageToken: string | undefined
    let pagesFetched = 0

    for (let page = 0; page < maxPages; page += 1) {
      if (this.remainingBudget <= 0) {
        return { places, pagesFetched, budgetExhausted: true }
      }

      const response = await this.request(query, pageToken, page)
      pagesFetched += 1

      if (response.places?.length) {
        places.push(...response.places)
        this.ledger.placesReturned += response.places.length
      }

      if (!response.nextPageToken) break
      pageToken = response.nextPageToken
    }

    return { places, pagesFetched, budgetExhausted: false }
  }

  private async request(
    query: string,
    pageToken: string | undefined,
    page: number
  ): Promise<SearchTextResponse> {
    if (this.remainingBudget <= 0) throw new PlacesBudgetExceededError(this.maxRequests)

    const body: Record<string, unknown> = {
      textQuery: query,
      pageSize: 20,
      languageCode: 'en',
      regionCode: 'US',
    }
    if (pageToken) body.pageToken = pageToken

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      if (this.delayMs > 0 && (this.ledger.totalRequests > 0 || attempt > 1)) {
        await this.sleepImpl(this.delayMs)
      }

      // Counted before the call, not after: a request that reaches Google and
      // fails may still be billable, and an uncounted request is one the budget
      // cannot protect against.
      this.ledger.totalRequests += 1
      this.ledger.requestsByTier[this.tier] += 1
      this.onRequest?.({ query, page, tier: this.tier })

      let response: Response
      try {
        response = await this.fetchImpl('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': this.fieldMask.join(','),
          },
          body: JSON.stringify(body),
        })
      } catch (error) {
        // Network-level failure. Nothing reached Google, so this is retryable.
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt < this.maxAttempts) {
          this.ledger.retries += 1
          await this.sleepImpl(this.backoffMs(attempt))
          continue
        }
        throw lastError
      }

      if (response.ok) {
        return (await response.json()) as SearchTextResponse
      }

      const detail = await response.text().catch(() => '')
      lastError = new Error(`Google Places ${response.status}: ${detail.slice(0, 500)}`)

      if (!isRetryable(response.status) || attempt >= this.maxAttempts) throw lastError

      this.ledger.retries += 1
      await this.sleepImpl(this.retryAfterMs(response, attempt))
    }

    throw lastError ?? new Error('Google Places request failed')
  }

  /** Exponential backoff with jitter, so parallel runs do not retry in lockstep. */
  private backoffMs(attempt: number): number {
    const base = Math.min(30_000, 500 * 2 ** (attempt - 1))
    return base + Math.floor(Math.random() * 250)
  }

  /** Honour a server-supplied Retry-After when present; it knows better than our backoff. */
  private retryAfterMs(response: Response, attempt: number): number {
    const header = response.headers?.get?.('retry-after')
    if (header) {
      const seconds = Number(header)
      if (Number.isFinite(seconds) && seconds >= 0) return Math.min(60_000, seconds * 1000)
    }
    return this.backoffMs(attempt)
  }
}

/**
 * Plan a run's cost before spending anything.
 *
 * Meant to be printed by a dry run: the point is that nobody starts a
 * five-thousand-request job without having seen the number first.
 */
export function planRun(options: {
  queries: number
  pagesPerQuery?: number
  tier: PlacesSkuTier
  alreadyUsedThisMonth?: number
}): { requests: number; billable: number; estimatedUsd: number; freeRemaining: number } {
  const pagesPerQuery = Math.min(options.pagesPerQuery ?? 1, MAX_PAGES_PER_QUERY)
  // Worst case: every query pages to the limit. Real runs cost less because most
  // queries return a single page, but a budget built on the optimistic number is
  // not a budget.
  const requests = options.queries * pagesPerQuery

  const { perThousandUsd, freePerMonth } = SKU_PRICING[options.tier]
  const freeRemaining = Math.max(0, freePerMonth - (options.alreadyUsedThisMonth ?? 0))
  const billable = Math.max(0, requests - freeRemaining)

  return {
    requests,
    billable,
    estimatedUsd: Math.round((billable / 1000) * perThousandUsd * 100) / 100,
    freeRemaining,
  }
}

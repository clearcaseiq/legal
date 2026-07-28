/**
 * Discover California personal-injury law firms through Google Places.
 *
 * Runs a `city x keyword` query matrix against Places Text Search, filters the
 * results down to things that are actually law offices, and stages them in
 * `discovered_firm_locations`. It also records a `gbp` segmentation signal per
 * firm, since appearing under a personal-injury search is weak evidence of PI
 * practice.
 *
 * Places supplies no attorney names or emails. What it does supply is a firm's own
 * website plus, valuably, the county — the field routing needs and the hardest one
 * to infer from a city name. Attorney names are sourced afterwards from the firm's
 * site and verified against the State Bar.
 *
 * ## This script spends money
 *
 * Every request is billed. `--max-requests` is mandatory and enforced inside the
 * client, so a bad query matrix or a loop bug fails loudly rather than running up
 * an invoice. `--dry-run` prints the plan and cost estimate without calling Google
 * at all, and is the intended first step every time.
 *
 * Cost is driven by request count, not by fields: `cities x keywords x pages`. The
 * city and keyword lists are ordered by yield, so `--cities`/`--keywords` trim the
 * least useful entries first. The free allowance is 1,000 Enterprise requests per
 * month, which is roughly the top 6 keywords across the 165 largest cities.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/discover-firms-google-places.ts --dry-run
 *   node ../node_modules/tsx/dist/cli.mjs scripts/discover-firms-google-places.ts \
 *     --max-requests 200 --cities 20 --keywords 3
 *
 * Flags:
 *   --dry-run            Print the plan and estimated cost; make no API calls.
 *   --max-requests <n>   Hard cap on billed requests. Required unless --dry-run.
 *   --cities <n>         Use the n largest cities (default 20).
 *   --keywords <n>       Use the n highest-yield keywords (default 3).
 *   --pages <n>          Pages per query, 1-3 (default 1). Each page is billed.
 *   --city <name>        Search one named city instead of the ranked list. Repeatable.
 *   --used-this-month <n> Enterprise requests already spent, for accurate pricing.
 *   --cache-days <n>     How long cached Google content stays valid (default 30).
 *   --no-signals         Skip writing gbp segmentation signals.
 */

import {
  buildDiscoveryQueries,
  CA_DISCOVERY_CITIES,
  CA_DISCOVERY_KEYWORDS,
} from '../src/lib/ca-pi-discovery-targets'
import {
  DISCOVERY_FIELD_MASK,
  estimateCost,
  GooglePlacesClient,
  MAX_PAGES_PER_QUERY,
  PlacesQuotaExhaustedError,
  planRun,
  tierForFields,
} from '../src/lib/google-places'
import {
  filterPlaces,
  groupByFirmDomain,
  type AcceptedFirmLocation,
  type RejectionReason,
} from '../src/lib/places-firm-filter'

type Db = typeof import('../src/lib/prisma')['prisma']

/**
 * Load environment and the database client on demand.
 *
 * Deliberately not imported at module load. A dry run is pure arithmetic over two
 * hard-coded lists, and requiring a reachable database and a fully populated env
 * just to print a cost estimate would mean nobody could check the bill without
 * being inside the container.
 */
async function loadDb(): Promise<Db> {
  await import('../src/env')
  const { prisma } = await import('../src/lib/prisma')
  return prisma
}

/** Only set once a live run has connected, so a dry run needs no teardown. */
let dbToDisconnect: Db | null = null

type Args = {
  dryRun: boolean
  maxRequests: number | null
  cities: number
  keywords: number
  pages: number
  namedCities: string[]
  usedThisMonth: number
  cacheDays: number
  writeSignals: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    maxRequests: null,
    cities: 20,
    keywords: 3,
    pages: 1,
    namedCities: [],
    usedThisMonth: 0,
    cacheDays: 30,
    writeSignals: true,
  }

  const positiveInt = (raw: string | undefined, flag: string): number => {
    const value = Number(raw)
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${flag} expects a positive number`)
    return Math.floor(value)
  }

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = () => argv[++i]
    if (flag === '--dry-run') args.dryRun = true
    else if (flag === '--no-signals') args.writeSignals = false
    else if (flag === '--max-requests') args.maxRequests = positiveInt(next(), flag)
    else if (flag === '--cities') args.cities = positiveInt(next(), flag)
    else if (flag === '--keywords') args.keywords = positiveInt(next(), flag)
    else if (flag === '--pages') {
      args.pages = Math.min(positiveInt(next(), flag), MAX_PAGES_PER_QUERY)
    } else if (flag === '--city') {
      const value = (next() ?? '').trim()
      if (!value) throw new Error('--city expects a city name')
      args.namedCities.push(value)
    } else if (flag === '--used-this-month') {
      const value = Number(next())
      if (!Number.isFinite(value) || value < 0) throw new Error('--used-this-month expects a number')
      args.usedThisMonth = Math.floor(value)
    } else if (flag === '--cache-days') args.cacheDays = positiveInt(next(), flag)
    else if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
  }

  return args
}

function emptyRejections(): Record<RejectionReason, number> {
  return {
    not_operational: 0,
    outside_california: 0,
    no_website: 0,
    directory_or_aggregator: 0,
    not_a_law_office: 0,
    missing_name: 0,
  }
}

/**
 * Upsert one office location.
 *
 * Keyed on Place ID, so re-running discovery refreshes a listing rather than
 * duplicating it. `status` and `promotedLawFirmId` are deliberately left alone on
 * update: a human's review decision must survive a re-scrape.
 */
async function stageLocation(
  prisma: Db,
  location: AcceptedFirmLocation,
  context: { query: string; city: string; cacheExpiresAt: Date }
): Promise<'created' | 'updated'> {
  const cached = {
    discoveryQuery: context.query,
    discoveryCity: context.city,
    websiteDomain: location.websiteDomain,
    cachedName: location.name,
    cachedFormattedAddress: location.formattedAddress,
    cachedCity: location.city,
    cachedCounty: location.county,
    cachedState: location.state,
    cachedPostalCode: location.postalCode,
    cachedPhone: location.phone,
    cachedWebsiteUri: location.website,
    cachedRating: location.rating,
    cachedReviewCount: location.reviewCount,
    cachedOpeningHours: location.openingHours ? JSON.stringify(location.openingHours) : null,
    cachedLatitude: location.latitude,
    cachedLongitude: location.longitude,
    cachedPrimaryType: location.primaryType,
    cachedTypes: JSON.stringify(location.types),
    cachedGoogleMapsUri: location.googleMapsUri,
    cachedAt: new Date(),
    cacheExpiresAt: context.cacheExpiresAt,
    lastSeenAt: new Date(),
  }

  const existing = await prisma.discoveredFirmLocation.findUnique({
    where: { placeId: location.placeId },
    select: { id: true },
  })

  if (existing) {
    await prisma.discoveredFirmLocation.update({
      where: { placeId: location.placeId },
      data: cached,
    })
    return 'updated'
  }

  await prisma.discoveredFirmLocation.create({
    data: { placeId: location.placeId, ...cached },
  })
  return 'created'
}

/**
 * Record a `gbp` PI signal for a firm we already hold.
 *
 * A Google Business Profile surfacing under "personal injury attorney" is genuine
 * but modest evidence: Google's categorisation is semi-curated, so it beats a
 * self-written website blurb while falling well short of a filing history. It also
 * carries no side information — plaintiff and defense firms are categorised
 * identically — so `side` is deliberately left null rather than guessed.
 */
async function recordGbpSignal(
  prisma: Db,
  lawFirmId: string,
  location: AcceptedFirmLocation,
  observedAt: Date
): Promise<void> {
  const data = {
    lawFirmId,
    source: 'gbp',
    kind: 'pi_search_listing',
    side: null,
    count: 1,
    value: `${location.primaryType ?? 'unknown'}: ${location.name}`,
    sourceRef: location.googleMapsUri,
    observedAt,
  }

  await prisma.segmentSignal.upsert({
    where: { lawFirmId_source_kind: { lawFirmId, source: 'gbp', kind: 'pi_search_listing' } },
    create: data,
    update: data,
  })
}

function pct(part: number, whole: number): string {
  if (whole === 0) return '  n/a'
  return `${((part / whole) * 100).toFixed(1).padStart(5)}%`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const cities =
    args.namedCities.length > 0 ? args.namedCities : CA_DISCOVERY_CITIES.slice(0, args.cities)
  const keywords = CA_DISCOVERY_KEYWORDS.slice(0, args.keywords)
  const queries = buildDiscoveryQueries({ cities, keywords })

  const tier = tierForFields(DISCOVERY_FIELD_MASK)
  const plan = planRun({
    queries: queries.length,
    pagesPerQuery: args.pages,
    tier,
    alreadyUsedThisMonth: args.usedThisMonth,
  })

  console.log('\nGoogle Places firm discovery')
  console.log(`  cities:            ${cities.length}`)
  console.log(`  keywords:          ${keywords.length}`)
  console.log(`  queries:           ${queries.length}`)
  console.log(`  pages per query:   ${args.pages}`)
  console.log(`  billed SKU:        Text Search ${tier}`)
  console.log(`  worst-case requests: ${plan.requests}`)
  console.log(`  free remaining:    ${plan.freeRemaining}`)
  console.log(`  billable:          ${plan.billable}`)
  console.log(`  estimated cost:    $${plan.estimatedUsd.toFixed(2)}`)

  if (args.dryRun) {
    console.log('\n  DRY RUN — no API calls made, nothing written.')
    console.log('\n  Sample queries:')
    for (const query of queries.slice(0, 8)) console.log(`    ${query}`)
    if (queries.length > 8) console.log(`    ... and ${queries.length - 8} more`)
    console.log(
      '\n  Re-run with --max-requests <n> to execute. Keep n at or below the free' +
        '\n  remaining figure above to spend nothing.\n'
    )
    return
  }

  // Past this point the run is live: load env and the database.
  const prisma = await loadDb()
  dbToDisconnect = prisma

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    throw new Error(
      'GOOGLE_PLACES_API_KEY is not set. Add it to api/.env — see api/.env.example. ' +
        'Enable "Places API (New)" in Google Cloud and restrict the key to this server IP.'
    )
  }
  if (!args.maxRequests) {
    throw new Error(
      '--max-requests is required for a live run, because every request is billed. ' +
        `This matrix would issue up to ${plan.requests}.`
    )
  }
  if (args.maxRequests < plan.requests) {
    console.log(
      `\n  NOTE: budget of ${args.maxRequests} is below the worst case of ${plan.requests}.` +
        '\n  The run will stop cleanly when the budget is reached.'
    )
  }

  const client = new GooglePlacesClient({
    apiKey,
    maxRequests: args.maxRequests,
    fieldMask: DISCOVERY_FIELD_MASK,
  })

  const cacheExpiresAt = new Date(Date.now() + args.cacheDays * 24 * 60 * 60 * 1000)
  // Results are filtered and written query by query rather than collected and
  // written at the end. A long run gets interrupted — quota, a dropped session,
  // an impatient operator — and buffering means every billed request in that run
  // is thrown away. Staging as we go makes an interrupted run keep its work.
  const seenPlaceIds = new Set<string>()
  const keptLocations: AcceptedFirmLocation[] = []
  const rejections = emptyRejections()
  const rejectedExamples: Partial<Record<RejectionReason, string[]>> = {}
  const errors: string[] = []
  let queriesRun = 0
  let totalPlacesReturned = 0
  let duplicatePlaceIds = 0
  let created = 0
  let updated = 0
  let quotaExhausted = false
  // Google caps a page at 20. A query that comes back full almost certainly had
  // more to give, so the run is seeing a top slice rather than the whole city.
  const PAGE_SIZE = 20
  let truncatedQueries = 0

  console.log('')
  for (const query of queries) {
    if (client.remainingBudget <= 0) {
      console.log(`  budget reached after ${queriesRun} queries; stopping`)
      break
    }

    // Recover the city from the query for provenance; queries read
    // "<keyword> in <City>, CA".
    const city = query.split(' in ').pop()?.replace(/,\s*[A-Z]{2}$/, '') ?? ''

    try {
      const result = await client.searchText(query, { maxPages: args.pages })
      queriesRun += 1
      totalPlacesReturned += result.places.length
      if (result.places.length >= PAGE_SIZE * args.pages) truncatedQueries += 1

      // `seenPlaceIds` carries across queries, so a firm already staged under an
      // earlier keyword is counted as a duplicate rather than re-evaluated.
      const batch = filterPlaces(result.places, { seen: seenPlaceIds })
      duplicatePlaceIds += batch.duplicatePlaceIds
      for (const [reason, count] of Object.entries(batch.rejectedByReason)) {
        rejections[reason as RejectionReason] += count
      }
      for (const [reason, examples] of Object.entries(batch.rejectedExamples)) {
        const held = rejectedExamples[reason as RejectionReason] ?? []
        for (const example of examples ?? []) {
          if (held.length < 5 && !held.includes(example)) held.push(example)
        }
        rejectedExamples[reason as RejectionReason] = held
      }

      for (const location of batch.kept) {
        keptLocations.push(location)
        const outcome = await stageLocation(prisma, location, {
          query,
          city,
          cacheExpiresAt,
        })
        if (outcome === 'created') created += 1
        else updated += 1
      }

      console.log(
        `  ${String(queriesRun).padStart(4)}/${queries.length}  ${result.places.length
          .toString()
          .padStart(3)} places  ${String(batch.kept.length).padStart(3)} kept  ${query}`
      )
    } catch (error) {
      if (error instanceof PlacesQuotaExhaustedError) {
        console.log(
          `\n  Daily Google quota exhausted after ${queriesRun} queries. Everything found` +
            '\n  so far is already staged. The quota resets at midnight Pacific.'
        )
        quotaExhausted = true
        break
      }

      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${query}: ${message}`)
      console.log(`  ERROR  ${query}: ${message}`)
      // A rejected key or bad field mask will fail identically on every query, so
      // stop rather than burning the budget proving it.
      if (/40[13]/.test(message)) {
        console.log('\n  Aborting: this looks like a key or field-mask problem, not a transient error.')
        break
      }
    }
  }

  // Attach gbp signals to firms we already hold, matched on the domain that the
  // rest of the import pipeline also keys on.
  let signalsWritten = 0
  if (args.writeSignals && keptLocations.length > 0) {
    const byDomain = groupByFirmDomain(keptLocations)
    const knownFirms = await prisma.lawFirm.findMany({
      where: { firmDomain: { in: Array.from(byDomain.keys()) } },
      select: { id: true, firmDomain: true },
    })

    for (const firm of knownFirms) {
      const locations = firm.firmDomain ? byDomain.get(firm.firmDomain) : undefined
      if (!locations?.length) continue
      await recordGbpSignal(prisma, firm.id, locations[0], new Date())
      signalsWritten += 1
    }
  }

  const cost = estimateCost(client.ledger, { enterprise: args.usedThisMonth })
  // Retention is only meaningful against distinct businesses. Measuring it against
  // the raw count makes an accurate filter look brutal, because the same firm
  // surfacing under three keywords is one decision, not three.
  const uniqueSeen = totalPlacesReturned - duplicatePlaceIds

  console.log('\n  Results')
  console.log(`    queries run           ${String(queriesRun).padStart(8)} of ${queries.length}`)
  console.log(`    requests billed       ${String(client.ledger.totalRequests).padStart(8)}`)
  console.log(`    retries               ${String(client.ledger.retries).padStart(8)}`)
  console.log(`    places returned       ${String(totalPlacesReturned).padStart(8)}`)
  console.log(`    duplicate place ids   ${String(duplicatePlaceIds).padStart(8)}`)
  console.log(`    distinct businesses   ${String(uniqueSeen).padStart(8)}`)
  console.log(
    `    kept as law firms     ${String(keptLocations.length).padStart(8)}  ${pct(keptLocations.length, uniqueSeen)}`
  )
  console.log(`    staged (new)          ${String(created).padStart(8)}`)
  console.log(`    staged (refreshed)    ${String(updated).padStart(8)}`)
  console.log(`    gbp signals written   ${String(signalsWritten).padStart(8)}`)
  console.log(`    actual cost           $${cost.totalUsd.toFixed(2)}`)

  console.log('\n  Rejected')
  for (const [reason, count] of Object.entries(rejections)) {
    if (count === 0) continue
    console.log(`    ${reason.padEnd(24)}${String(count).padStart(6)}  ${pct(count, uniqueSeen)}`)
    const examples = rejectedExamples[reason as RejectionReason]
    if (examples?.length) console.log(`      e.g. ${examples.slice(0, 3).join(', ')}`)
  }

  if (truncatedQueries > 0) {
    console.log(
      `\n  ${truncatedQueries} of ${queriesRun} queries filled every page, so those cities hold` +
        '\n  more firms than this run retrieved. Raise --pages to reach them.'
    )
  }

  const distinctFirms = groupByFirmDomain(keptLocations).size
  console.log(
    `\n  ${keptLocations.length} offices across ${distinctFirms} distinct firm domains.` +
      '\n  Places gives no attorney names; the next step is reading each firm website' +
      '\n  and verifying the attorneys found against the State Bar.'
  )

  if (quotaExhausted) {
    const remaining = queries.length - queriesRun
    console.log(
      `\n  Stopped early on the daily quota with ${remaining} queries left. Re-run the same` +
        '\n  command tomorrow: staged places are matched on Place ID, so the queries already' +
        '\n  covered will refresh rather than duplicate.'
    )
  }

  if (errors.length > 0) {
    console.log(`\n  ${errors.length} query error(s):`)
    for (const error of errors.slice(0, 10)) console.log(`    ${error}`)
  }

  console.log('')
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await dbToDisconnect?.$disconnect()
  })

/**
 * Clear expired Google Places content from `discovered_firm_locations`.
 *
 * Google's terms do not permit building a permanent standalone database out of
 * Maps content. Place IDs are explicitly exempt and may be kept indefinitely;
 * other Places content may only be cached temporarily. The schema separates the
 * two, and this script is what makes that separation real rather than decorative.
 *
 * What survives a purge: the Place ID, the firm's website domain, and our pipeline
 * state. That is enough to re-fetch a listing later, or to go and read the firm's
 * own website — which is where permanent firm and attorney records are supposed to
 * come from anyway.
 *
 * A row whose cache has been purged but which was never independently sourced is
 * reported, because it represents a discovery we found and then failed to follow
 * up before we had to forget the details.
 *
 * Intended to run on a schedule (daily is ample for a 30-day cache).
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/purge-places-cache.ts --dry-run
 *   node ../node_modules/tsx/dist/cli.mjs scripts/purge-places-cache.ts
 *
 * Flags:
 *   --dry-run   Report what would be cleared without clearing it.
 *   --before <iso>  Treat this instant as "now", for backfills.
 */

import '../src/env'
import { prisma } from '../src/lib/prisma'

type Args = { dryRun: boolean; before: Date }

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, before: new Date() }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (flag === '--dry-run') args.dryRun = true
    else if (flag === '--before') {
      const raw = argv[++i]
      const parsed = new Date(raw ?? '')
      if (Number.isNaN(parsed.getTime())) throw new Error('--before expects an ISO date')
      args.before = parsed
    } else if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const expired = { cacheExpiresAt: { not: null, lte: args.before } }

  const total = await prisma.discoveredFirmLocation.count({ where: expired })
  const neverFollowedUp = await prisma.discoveredFirmLocation.count({
    where: { ...expired, independentlySourcedAt: null },
  })

  console.log('\nPurging expired Google Places cache')
  console.log(`  cutoff:                    ${args.before.toISOString()}`)
  console.log(`  rows with expired cache:   ${total}`)
  console.log(`  of those, never sourced:   ${neverFollowedUp}`)

  if (total === 0) {
    console.log('\n  Nothing to purge.\n')
    return
  }

  if (args.dryRun) {
    console.log('\n  DRY RUN — nothing cleared.\n')
    return
  }

  // Place ID, website domain and pipeline state are deliberately untouched: they
  // are what let us come back to this firm later.
  const result = await prisma.discoveredFirmLocation.updateMany({
    where: expired,
    data: {
      cachedName: null,
      cachedFormattedAddress: null,
      cachedCity: null,
      cachedCounty: null,
      cachedState: null,
      cachedPostalCode: null,
      cachedPhone: null,
      cachedWebsiteUri: null,
      cachedRating: null,
      cachedReviewCount: null,
      cachedOpeningHours: null,
      cachedLatitude: null,
      cachedLongitude: null,
      cachedPrimaryType: null,
      cachedTypes: null,
      cachedGoogleMapsUri: null,
      cachedAt: null,
      cacheExpiresAt: null,
    },
  })

  console.log(`\n  Cleared cached content on ${result.count} row(s).`)
  console.log('  Retained: place id, website domain, pipeline state.')

  if (neverFollowedUp > 0) {
    console.log(
      `\n  ${neverFollowedUp} of these were never independently sourced, so we now hold` +
        '\n  only a place id and a domain for them. Re-discover or crawl those sites' +
        '\n  to recover usable records.'
    )
  }

  console.log('')
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

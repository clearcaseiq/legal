/**
 * Clean up false-positive PI flags in `ProductionAttorney`.
 *
 * The discovery pass errs toward inclusion, so the `piRelevant=true` pool picks
 * up rows that should not be routable:
 *
 *   1. Non-active licences — attorneys whose State Bar status is Inactive,
 *      Suspended, Disbarred, Resigned, Deceased or Not Eligible. Populated by
 *      the CalBar directory pass (`enrich-from-directories.ts --calbar-only`).
 *   2. Defense firms — websites classified as insurance/defense practice by the
 *      website pass. Persisted as `status='rejected'` from that pass.
 *   3. Out-of-California — attorneys practising abroad or out of state (e.g.
 *      London/Melbourne offices of global firms). Behind `--drop-foreign`
 *      because the address data is noisier.
 *
 * Down-flagged rows get `piRelevant=false` and `status='rejected'` so they drop
 * out of the routable pool without being deleted (the raw record is kept).
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/cleanup-pi-flags.ts --dry-run
 *   node ../node_modules/tsx/dist/cli.mjs scripts/cleanup-pi-flags.ts
 *   node ../node_modules/tsx/dist/cli.mjs scripts/cleanup-pi-flags.ts --drop-foreign
 *
 * Flags:
 *   --dry-run       Report without writing.
 *   --source <s>    Filter by source (default: cpra-ca-bar-2026).
 *   --drop-foreign  Also down-flag attorneys with a non-California address.
 *   --limit <n>     Process at most n rows (for testing).
 */

import '../src/env'
import { prisma } from '../src/lib/prisma'

type Args = { dryRun: boolean; source: string; dropForeign: boolean; limit: number | null }

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, source: 'cpra-ca-bar-2026', dropForeign: false, limit: null }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const next = () => argv[++i]
    switch (flag) {
      case '--dry-run': args.dryRun = true; break
      case '--source': args.source = next() ?? args.source; break
      case '--drop-foreign': args.dropForeign = true; break
      case '--limit': { const v = Number(next()); args.limit = Number.isFinite(v) ? Math.floor(v) : null; break }
      default: if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
    }
  }
  return args
}

/**
 * A licence counts as routable unless it is *explicitly* a non-active state.
 * Stored values are either the CPRA code ("A" = active) or the CalBar word
 * ("Active"/"Inactive"/…). Unknown/other codes are left alone rather than
 * assumed inactive, so we never drop someone on ambiguous data.
 */
function isActiveLicense(status: string | null | undefined): boolean {
  if (!status) return true
  const s = status.trim().toLowerCase()
  if (s === 'a' || s === 'active') return true
  if (/(inactive|suspend|disbar|resign|deceas|not eligible|ineligible)/.test(s)) return false
  return true
}

const US_STATE_ABBRS = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
])

/**
 * Conservative "not California" detector from the free-text city field. Flags
 * obvious foreign postal patterns and other US-state markers, but leaves blank
 * or plain-California values alone.
 */
function looksNonCalifornia(city: string | null | undefined, state: string | null | undefined): boolean {
  if (state && state.trim() && !/^(ca|california)$/i.test(state.trim())) {
    if (US_STATE_ABBRS.has(state.trim().toUpperCase()) || state.trim().length > 2) return true
  }
  if (!city) return false
  const c = city.toLowerCase()
  // UK/EU/AU postal or region markers seen in the global-firm rows.
  if (/\b[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}\b/i.test(city)) return true // UK postcode e.g. EC4A 1BW
  if (/(london|melbourne|sydney|singapore|hong kong|tokyo|paris|dubai|toronto|frankfurt|shanghai|beijing)/.test(c)) return true
  // "City, ST" where ST is a non-CA US state.
  const m = /,\s*([A-Z]{2})\b/.exec(city)
  if (m && US_STATE_ABBRS.has(m[1]) && m[1] !== 'CA') return true
  return false
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  console.log('\n═══════════════════════════════════════════')
  console.log('  PI-flag cleanup sweep')
  console.log('═══════════════════════════════════════════')
  console.log(`  Source:       ${args.source}`)
  console.log(`  Drop foreign: ${args.dropForeign}`)
  console.log(`  Dry run:      ${args.dryRun}`)
  if (args.limit) console.log(`  Limit:        ${args.limit}`)
  console.log()

  const stats = { scanned: 0, inactive: 0, defense: 0, foreign: 0, downFlagged: 0 }

  const PAGE = 500
  let cursor: string | undefined
  for (;;) {
    const batch = await prisma.productionAttorney.findMany({
      take: PAGE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      where: { source: args.source, piRelevant: true },
      select: { id: true, name: true, firmName: true, city: true, state: true, licenseStatus: true, status: true },
    })
    if (batch.length === 0) break
    cursor = batch[batch.length - 1].id

    for (const a of batch) {
      stats.scanned += 1

      const reasons: string[] = []
      if (!isActiveLicense(a.licenseStatus)) { reasons.push(`license=${a.licenseStatus}`); stats.inactive += 1 }
      if (a.status === 'rejected') { reasons.push('defense/rejected'); stats.defense += 1 }
      if (args.dropForeign && looksNonCalifornia(a.city, a.state)) { reasons.push(`non-CA=${a.city ?? a.state}`); stats.foreign += 1 }

      if (reasons.length === 0) continue

      stats.downFlagged += 1
      if (stats.downFlagged <= 40) {
        console.log(`  DROP  ${a.name}${a.firmName ? ` (${a.firmName})` : ''} — ${reasons.join(', ')}`)
      }

      if (!args.dryRun) {
        await prisma.productionAttorney.update({
          where: { id: a.id },
          data: { piRelevant: false, status: 'rejected' },
        })
      }

      if (args.limit && stats.scanned >= args.limit) break
    }
    if (args.limit && stats.scanned >= args.limit) break
  }

  console.log(`\n${'─'.repeat(43)}`)
  console.log(`  Scanned PI rows:     ${stats.scanned.toLocaleString()}`)
  console.log(`  Non-active licence:  ${stats.inactive.toLocaleString()}`)
  console.log(`  Defense/rejected:    ${stats.defense.toLocaleString()}`)
  if (args.dropForeign) console.log(`  Non-California:      ${stats.foreign.toLocaleString()}`)
  console.log(`  ${args.dryRun ? 'Would down-flag' : 'Down-flagged'}:  ${stats.downFlagged.toLocaleString()}`)
  console.log()

  await prisma.$disconnect()
}

main()
  .then(() => process.exit(0))
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })

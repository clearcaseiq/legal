/**
 * Link Google-Places-discovered PI firms to bar-roll attorneys.
 *
 * `discover-firms-google-places.ts` stages firm locations with a website and a
 * county but no attorney names. The CA bar roll already holds every attorney in
 * `production_attorneys`. This script is the missing bridge between the two: for
 * each discovered PI firm it finds the bar-roll attorneys at that firm (matched
 * by normalized firm name or a shared website domain) and:
 *
 *   - fills in the firm website when the attorney has none,
 *   - flags them `piRelevant` (the firm was found under a PI search), and
 *   - fills the routing `county` from Google when the attorney's is unresolved.
 *
 * The payoff is a bigger "PI attorney with a website" set, which is exactly what
 * the website-enrichment pass (enrich-staged-pi-websites.ts) mines for bio,
 * headshot, languages and case results.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/link-discovered-firms.ts --dry-run
 *   node ../node_modules/tsx/dist/cli.mjs scripts/link-discovered-firms.ts
 *
 * Flags:
 *   --dry-run     Report without writing.
 *   --source <s>  Bar-roll source to link into (default: cpra-ca-bar-2026).
 *   --limit <n>   Process at most n attorneys (for testing).
 */

import '../src/env'
import { prisma } from '../src/lib/prisma'

type Args = { dryRun: boolean; source: string; limit: number | null }

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, source: 'cpra-ca-bar-2026', limit: null }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const next = () => argv[++i]
    switch (flag) {
      case '--dry-run': args.dryRun = true; break
      case '--source': args.source = next() ?? args.source; break
      case '--limit': { const v = Number(next()); args.limit = Number.isFinite(v) ? Math.floor(v) : null; break }
      default: if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
    }
  }
  return args
}

/** Collapse a firm name to a comparable slug (drop entity suffixes + punctuation). */
function normFirm(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\b(law\s+offices?\s+of|the|a\s+professional\s+(corporation|law\s+corporation)|llp|l\.l\.p\.|llc|l\.l\.c\.|lp|pc|p\.c\.|inc|pllc|apc|a\.p\.c\.|attorneys?\s+at\s+law|and|&)\b/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, '')
    .trim()
}

function domainOf(url: string | null | undefined): string {
  if (!url) return ''
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url)
    return u.hostname.replace(/^www\./i, '').toLowerCase()
  } catch { return '' }
}

type FirmInfo = { website: string | null; domain: string; county: string | null; city: string | null; name: string }

const PAGE = 1000

async function main() {
  const args = parseArgs(process.argv.slice(2))

  console.log('\n═══════════════════════════════════════════')
  console.log('  Link discovered firms → bar-roll attorneys')
  console.log('═══════════════════════════════════════════')
  console.log(`  Source:  ${args.source}`)
  console.log(`  Dry run: ${args.dryRun}`)
  if (args.limit) console.log(`  Limit:   ${args.limit}`)

  // 1) Load discovered firms into name + domain lookup maps.
  const firms = await (prisma as any).discoveredFirmLocation.findMany({
    where: { websiteDomain: { not: null } },
    select: { cachedName: true, cachedWebsiteUri: true, websiteDomain: true, cachedCounty: true, cachedCity: true },
  })
  const byName = new Map<string, FirmInfo>()
  const byDomain = new Map<string, FirmInfo>()
  for (const f of firms) {
    const domain = (f.websiteDomain ?? '').toLowerCase()
    const info: FirmInfo = {
      website: f.cachedWebsiteUri ?? (domain ? `https://${domain}` : null),
      domain,
      county: f.cachedCounty ?? null,
      city: f.cachedCity ?? null,
      name: f.cachedName ?? '',
    }
    const nn = normFirm(f.cachedName)
    if (nn.length >= 5 && !byName.has(nn)) byName.set(nn, info)
    if (domain) byDomain.set(domain, info)
  }
  console.log(`\n  Loaded ${firms.length.toLocaleString()} discovered firms — ${byName.size} by name, ${byDomain.size} by domain\n`)

  const stats = { scanned: 0, matched: 0, websiteFilled: 0, piFlagged: 0, countyFilled: 0 }

  let cursor: string | undefined
  for (;;) {
    const batch = await prisma.productionAttorney.findMany({
      take: PAGE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      where: { source: args.source },
      select: { id: true, name: true, firmName: true, website: true, piRelevant: true, county: true, countySource: true },
    })
    if (batch.length === 0) break
    cursor = batch[batch.length - 1].id

    for (const a of batch) {
      stats.scanned += 1

      const nn = normFirm(a.firmName)
      const attorneyDomain = domainOf(a.website)
      const match =
        (attorneyDomain && byDomain.get(attorneyDomain)) ||
        (nn.length >= 5 ? byName.get(nn) : undefined)
      if (!match) continue

      const updateData: Record<string, unknown> = {}
      if (!a.website && match.website) { updateData.website = match.website; stats.websiteFilled += 1 }
      if (!a.piRelevant) { updateData.piRelevant = true; stats.piFlagged += 1 }
      if ((!a.county || a.countySource === 'none') && match.county) {
        updateData.county = match.county
        updateData.countySource = 'firm-gbp'
        stats.countyFilled += 1
      }

      if (Object.keys(updateData).length === 0) continue
      stats.matched += 1
      if (stats.matched <= 40) {
        console.log(`  LINK  ${a.name} (${a.firmName}) → ${match.name}${updateData.website ? ' +website' : ''}${updateData.piRelevant ? ' +PI' : ''}${updateData.county ? ` +county(${match.county})` : ''}`)
      }
      if (!args.dryRun) {
        await prisma.productionAttorney.update({ where: { id: a.id }, data: updateData })
      }

      if (args.limit && stats.scanned >= args.limit) break
    }
    if (args.limit && stats.scanned >= args.limit) break
  }

  console.log(`\n${'─'.repeat(43)}`)
  console.log(`  Scanned attorneys:   ${stats.scanned.toLocaleString()}`)
  console.log(`  ${args.dryRun ? 'Would link' : 'Linked'}:            ${stats.matched.toLocaleString()}`)
  console.log(`    website filled:    ${stats.websiteFilled.toLocaleString()}`)
  console.log(`    PI flagged:        ${stats.piFlagged.toLocaleString()}`)
  console.log(`    county filled:     ${stats.countyFilled.toLocaleString()}`)
  console.log()

  await prisma.$disconnect()
}

main()
  .then(() => process.exit(0))
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })

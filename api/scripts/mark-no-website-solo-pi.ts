/**
 * Stage solo personal-injury attorneys who have no website.
 *
 * The website pipeline can only confirm attorneys whose firm has a site, so a
 * sole practitioner with a phone and a bar listing never makes it through. This
 * pass picks them out of the State Bar roll on the bar evidence alone and stages
 * them as `reviewed_low_confidence`, which promotion carries onto the live
 * attorney so they can be told apart from website-confirmed ones.
 *
 * A row qualifies when it is:
 *   - active, with no discipline on record, a phone number and a known county;
 *   - reporting "Personal Injury" to the Bar among at most --max-areas practice
 *     areas, none of them insurance (which may be carrier-side work);
 *   - a solo practice: no firm, or a firm named for the attorney themselves with
 *     no partners in the name.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/mark-no-website-solo-pi.ts
 *   node ../node_modules/tsx/dist/cli.mjs scripts/mark-no-website-solo-pi.ts --apply
 *
 * Flags:
 *   --max-areas <n>   Most practice areas a qualifying attorney may list (default 8).
 *   --apply           Write the status. Without it, report only.
 */

import '../src/env'
import { prisma } from '../src/lib/prisma'

const SOURCE = 'cpra-ca-bar-2026'
const PARTNERSHIP = /\s&\s|\band\b|\bllp\b|partners|associates|\bgroup\b/

function parseArgs(argv: string[]) {
  const args = { maxAreas: 8, apply: false }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (flag === '--apply') args.apply = true
    else if (flag === '--max-areas') {
      const n = Number(argv[++i])
      if (!Number.isFinite(n) || n <= 0) throw new Error('--max-areas expects a positive number')
      args.maxAreas = Math.floor(n)
    } else throw new Error(`Unknown flag: ${flag}`)
  }
  return args
}

function parseList(raw: string | null): string[] {
  try {
    const value = JSON.parse(raw ?? '[]')
    return Array.isArray(value) ? value.map(String) : []
  } catch {
    return []
  }
}

/** No firm, or a firm carrying the attorney's own surname and nobody else's. */
function isSoloPractice(name: string, firmName: string | null): boolean {
  const firm = (firmName ?? '').toLowerCase().trim()
  if (!firm) return true
  const surname = name.toLowerCase().replace(/[^a-z\s-]/g, ' ').trim().split(/\s+/)
    .filter((part) => !/^(jr|sr|ii|iii|iv|esq)$/.test(part)).pop() ?? ''
  return surname.length > 1 && firm.includes(surname) && !PARTNERSHIP.test(firm)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const rows = await prisma.productionAttorney.findMany({
    where: {
      source: SOURCE,
      status: 'scraped',
      website: null,
      phone: { not: null },
      county: { not: null },
      // The CPRA file codes active members as "A"; other sources spell it out.
      OR: [{ licenseStatus: 'A' }, { licenseStatus: { startsWith: 'Active', mode: 'insensitive' } }],
      practiceAreas: { contains: 'Personal Injury', mode: 'insensitive' },
    },
    select: { id: true, name: true, firmName: true, county: true, practiceAreas: true, discipline: true },
  })

  const qualifying = rows.filter((row) => {
    const areas = parseList(row.practiceAreas)
    return parseList(row.discipline).length === 0
      && areas.length <= args.maxAreas
      && !areas.some((area) => /insurance/i.test(area))
      && isSoloPractice(row.name, row.firmName)
  })

  if (args.apply) {
    const ids = qualifying.map((row) => row.id)
    for (let i = 0; i < ids.length; i += 500) {
      await prisma.productionAttorney.updateMany({
        where: { id: { in: ids.slice(i, i + 500) }, status: 'scraped' },
        data: { status: 'reviewed_low_confidence' },
      })
    }
  }

  const byCounty = new Map<string, number>()
  for (const row of qualifying) byCounty.set(row.county!, (byCounty.get(row.county!) ?? 0) + 1)
  console.log(`  Candidates (active, phone, county, PI on bar record, no website): ${rows.length}`)
  console.log(`  Qualifying solo practitioners: ${qualifying.length}`)
  console.log(`  By county: ${[...byCounty].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(', ')}`)
  console.log(`  ${args.apply ? 'Staged' : 'Would stage'} as reviewed_low_confidence: ${qualifying.length}`)
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})

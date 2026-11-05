/**
 * Quarterly refresh of the California personal-injury attorney pipeline.
 *
 * Runs the staging steps in order against the local staging database, so new
 * firms are found, changed sites are re-read, and the attorneys ready for
 * production are counted. Promotion itself stays manual: it needs AWS access and
 * a dry run a person reads first.
 *
 *   1. purge-places-cache           Drop Google content past its cache window.
 *   2. discover-firms-google-places Re-run the city x keyword search, capped at
 *                                   --max-requests (default 990, inside the free
 *                                   monthly allowance).
 *   3. link-discovered-firms        Join new firms to bar-roll attorneys.
 *   4. match-firm-site-attorneys    Read firm attorney pages for the rest.
 *   5. enrich-staged-pi-websites    Strict plaintiff check on rows changed in this run.
 *   6. review-unconfirmed-pi        Second pass, rendering script-only sites.
 *   7. mark-no-website-solo-pi      Stage solo practitioners with no site.
 *
 * The bar roll itself is a CPRA snapshot; licence status and discipline only
 * change here when a new file is requested from the State Bar and re-imported.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/refresh-ca-pi-attorneys.ts --dry-run
 *   node ../node_modules/tsx/dist/cli.mjs scripts/refresh-ca-pi-attorneys.ts
 *
 * Flags:
 *   --dry-run            Every step in report-only mode; discovery prints its plan only.
 *   --max-requests <n>   Billed Places requests for step 2 (default 990). 0 skips discovery.
 *   --skip <step>        Skip a step by script name. Repeatable.
 */

import '../src/env'
import { spawnSync } from 'child_process'
import path from 'path'
import { prisma } from '../src/lib/prisma'

const SOURCE = 'cpra-ca-bar-2026'
const TSX = path.resolve(__dirname, '../../node_modules/tsx/dist/cli.mjs')

function parseArgs(argv: string[]) {
  const args = { dryRun: false, maxRequests: 990, skip: new Set<string>() }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (flag === '--dry-run') args.dryRun = true
    else if (flag === '--max-requests') {
      const n = Number(argv[++i])
      if (!Number.isFinite(n) || n < 0) throw new Error('--max-requests expects a number >= 0')
      args.maxRequests = Math.floor(n)
    } else if (flag === '--skip') args.skip.add(argv[++i] ?? '')
    else throw new Error(`Unknown flag: ${flag}`)
  }
  return args
}

function run(script: string, scriptArgs: string[]): void {
  const started = Date.now()
  console.log(`\n▶ ${script} ${scriptArgs.join(' ')}`)
  const result = spawnSync(process.execPath, [TSX, path.join('scripts', `${script}.ts`), ...scriptArgs], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  })
  const minutes = ((Date.now() - started) / 60000).toFixed(1)
  if (result.status !== 0) throw new Error(`${script} exited with ${result.status} after ${minutes} min`)
  console.log(`✔ ${script} (${minutes} min)`)
}

async function readyToPromote() {
  const [reviewed, lowConfidence] = await Promise.all([
    prisma.productionAttorney.count({ where: { source: SOURCE, status: 'reviewed', promotedAttorneyId: null } }),
    prisma.productionAttorney.count({ where: { source: SOURCE, status: 'reviewed_low_confidence', promotedAttorneyId: null } }),
  ])
  return { reviewed, lowConfidence }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const startedAt = new Date()
  const step = (script: string, scriptArgs: string[]) => {
    if (args.skip.has(script)) console.log(`\n⏭ ${script} skipped`)
    else run(script, scriptArgs)
  }
  const dry = args.dryRun ? ['--dry-run'] : []
  const apply = args.dryRun ? [] : ['--apply']
  const before = await readyToPromote()

  step('purge-places-cache', dry)

  if (args.maxRequests > 0) {
    step('discover-firms-google-places', args.dryRun
      ? ['--dry-run', '--cities', '165', '--keywords', '6']
      : ['--max-requests', String(args.maxRequests), '--cities', '165', '--keywords', '6'])
  }

  step('link-discovered-firms', dry)

  const counties = (await prisma.discoveredFirmLocation.findMany({
    where: { cachedCounty: { not: null } },
    distinct: ['cachedCounty'],
    select: { cachedCounty: true },
  })).map((row) => row.cachedCounty!.replace(/\s+County$/i, ''))
  if (counties.length > 0) {
    step('match-firm-site-attorneys', [
      ...counties.flatMap((county) => ['--county', county]),
      ...apply,
      '--out', path.join(process.env.TEMP ?? '.', 'refresh-site-matches.csv'),
    ])
  }

  step('enrich-staged-pi-websites', [
    '--with-website', '--include-known', '--mark-reviewed', '--concurrency', '15',
    '--updated-since', startedAt.toISOString(), ...dry,
  ])
  step('review-unconfirmed-pi', [
    '--headless', '--concurrency', '20', ...apply,
    '--out', path.join(process.env.TEMP ?? '.', 'refresh-review.csv'),
  ])
  step('mark-no-website-solo-pi', apply)

  const after = await readyToPromote()
  console.log('\n════════════════════════════════════════════════════════')
  // Promotion runs against production's copy of these rows, so the local totals
  // still include attorneys already live; the per-run increase is what is new.
  console.log(`  Newly reviewed this run:                ${after.reviewed - before.reviewed}  (local total ${after.reviewed})`)
  console.log(`  Newly reviewed_low_confidence this run: ${after.lowConfidence - before.lowConfidence}  (local total ${after.lowConfidence})`)
  console.log('  Next: verify websites, stage to production (existing rows are skipped by dedupe hash),')
  console.log('        then promote-production-attorneys.ts with PROMOTE_STATUS=reviewed and reviewed_low_confidence.')
  console.log('════════════════════════════════════════════════════════')
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})

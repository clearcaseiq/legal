/**
 * Derive PI segmentation signals from data already in the database.
 *
 * Phase 2 needs evidence to score, and the good sources (court filings,
 * association rosters) are external and not yet licensed. This script extracts
 * what is already here — staged practice areas from imports, live attorney
 * specialties, firm practice-area lists and firm names — so the scoring pipeline
 * has real input to run against today.
 *
 * The most useful thing it finds is defense practices. A firm whose practice
 * areas read "Insurance Defense" is identifiable from text alone, and marking it
 * is what stops a claimant being routed to their opponent's lawyer. That check
 * costs nothing and does not need a data vendor.
 *
 * Signals are upserted on (entity, source, kind), so re-running updates rows in
 * place rather than accumulating duplicates. Nothing else is mutated: scores are
 * written by recompute-pi-segments.ts, and no attorney becomes more or less
 * routable as a result of running this.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/derive-pi-signals.ts --dry-run
 *   node ../node_modules/tsx/dist/cli.mjs scripts/derive-pi-signals.ts
 *
 * Flags:
 *   --dry-run   Report what would be written without writing.
 *   --limit <n> Stop after n entities of each kind (for a quick look).
 *   --only <k>  One of: attorneys, firms, staged. Repeatable.
 */

import '../src/env'
import { prisma } from '../src/lib/prisma'
import { derivePiSignals, sourceForStagedRow } from '../src/lib/pi-signal-derive'
import type { SegmentSignal } from '../src/lib/pi-segmentation'
import { parsePracticeAreaText } from '../src/lib/practice-area-normalize'

type Args = { dryRun: boolean; limit: number | null; only: Set<string> }

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, limit: null, only: new Set() }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = () => argv[++i]
    if (flag === '--dry-run') args.dryRun = true
    else if (flag === '--limit') {
      const value = Number(next())
      if (Number.isFinite(value) && value > 0) args.limit = Math.floor(value)
    } else if (flag === '--only') {
      const value = (next() ?? '').trim()
      if (!['attorneys', 'firms', 'staged'].includes(value)) {
        throw new Error(`--only expects attorneys | firms | staged, got "${value}"`)
      }
      args.only.add(value)
    } else if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
  }
  if (args.only.size === 0) {
    args.only = new Set(['attorneys', 'firms', 'staged'])
  }
  return args
}

const PAGE_SIZE = 500

type Stats = {
  scanned: number
  withSignals: number
  written: number
  plaintiff: number
  defense: number
  noSide: number
}

function emptyStats(): Stats {
  return { scanned: 0, withSignals: 0, written: 0, plaintiff: 0, defense: 0, noSide: 0 }
}

function tallySides(signals: SegmentSignal[], stats: Stats): void {
  const sides = new Set(signals.map((signal) => signal.side ?? 'none'))
  if (sides.has('defense')) stats.defense += 1
  else if (sides.has('plaintiff')) stats.plaintiff += 1
  else stats.noSide += 1
}

/**
 * Write one entity's signals. Upserting per (entity, source, kind) keeps the
 * table stable across re-runs, which matters because these derivations will be
 * re-run whenever the text lexicons are tuned.
 */
async function persist(
  target: { attorneyId: string } | { lawFirmId: string },
  signals: SegmentSignal[],
  dryRun: boolean
): Promise<number> {
  if (dryRun || signals.length === 0) return signals.length

  for (const signal of signals) {
    const data = {
      ...target,
      source: signal.source,
      kind: signal.kind,
      side: signal.side ?? null,
      subtype: signal.subtype ?? null,
      count: signal.count ?? 1,
      weight: signal.weight ?? null,
      value: signal.value ?? null,
      sourceRef: signal.sourceRef ?? null,
      observedAt: signal.observedAt ? new Date(signal.observedAt) : null,
    }

    const where =
      'attorneyId' in target
        ? {
            attorneyId_source_kind: {
              attorneyId: target.attorneyId,
              source: signal.source,
              kind: signal.kind,
            },
          }
        : {
            lawFirmId_source_kind: {
              lawFirmId: target.lawFirmId,
              source: signal.source,
              kind: signal.kind,
            },
          }

    await prisma.segmentSignal.upsert({
      where,
      create: data,
      update: data,
    })
  }
  return signals.length
}

/**
 * Live attorneys. `Attorney.specialties` already holds normalized incident types
 * and `AttorneyProfile` carries free-text specialties and a bio, all of which the
 * attorney (or an importer acting on their behalf) supplied — hence `directory`
 * weight rather than anything stronger.
 */
async function deriveFromAttorneys(args: Args): Promise<Stats> {
  const stats = emptyStats()
  let cursor: string | undefined

  for (;;) {
    const batch = await prisma.attorney.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        specialties: true,
        updatedAt: true,
        attorneyProfile: { select: { specialties: true, bio: true, firmName: true } },
        lawFirm: { select: { name: true } },
      },
    })
    if (batch.length === 0) break
    cursor = batch[batch.length - 1].id

    for (const attorney of batch) {
      stats.scanned += 1

      const practiceAreas = [
        ...parsePracticeAreaText(attorney.specialties),
        ...parsePracticeAreaText(attorney.attorneyProfile?.specialties ?? null),
      ]

      const { signals } = derivePiSignals({
        practiceAreas,
        sideText: [
          attorney.attorneyProfile?.bio,
          attorney.attorneyProfile?.firmName,
          attorney.lawFirm?.name,
        ],
        source: 'directory',
        observedAt: attorney.updatedAt,
      })

      if (signals.length > 0) {
        stats.withSignals += 1
        tallySides(signals, stats)
        stats.written += await persist({ attorneyId: attorney.id }, signals, args.dryRun)
      }

      if (args.limit && stats.scanned >= args.limit) return stats
    }
  }
  return stats
}

/**
 * Law firms. PI practice is usually a firm-level property — the firm is the
 * practice — so these signals do the most work, and scoring inherits them down to
 * attorneys who have no evidence of their own.
 */
async function deriveFromFirms(args: Args): Promise<Stats> {
  const stats = emptyStats()
  let cursor: string | undefined

  for (;;) {
    const batch = await prisma.lawFirm.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        tagline: true,
        description: true,
        practiceAreas: true,
        website: true,
        updatedAt: true,
      },
    })
    if (batch.length === 0) break
    cursor = batch[batch.length - 1].id

    for (const firm of batch) {
      stats.scanned += 1

      const { signals } = derivePiSignals({
        practiceAreas: firm.practiceAreas,
        sideText: [firm.name, firm.tagline, firm.description],
        source: 'website',
        observedAt: firm.updatedAt,
        sourceRef: firm.website,
      })

      if (signals.length > 0) {
        stats.withSignals += 1
        tallySides(signals, stats)
        stats.written += await persist({ lawFirmId: firm.id }, signals, args.dryRun)
      }

      if (args.limit && stats.scanned >= args.limit) return stats
    }
  }
  return stats
}

/**
 * Staged import rows. Only rows already promoted to a live attorney can carry a
 * signal, since a signal needs something to attach to. Bar-roll rows earn heavier
 * `bar_record` weight than directory scrapes: a practice area reported to the
 * regulator is more accountable than one a marketing team wrote.
 */
async function deriveFromStaged(args: Args): Promise<Stats> {
  const stats = emptyStats()
  let cursor: string | undefined

  for (;;) {
    const batch = await prisma.productionAttorney.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      where: { promotedAttorneyId: { not: null } },
      select: {
        id: true,
        source: true,
        practiceAreas: true,
        firmName: true,
        profileUrl: true,
        promotedAttorneyId: true,
        scrapedAt: true,
      },
    })
    if (batch.length === 0) break
    cursor = batch[batch.length - 1].id

    for (const staged of batch) {
      stats.scanned += 1
      const attorneyId = staged.promotedAttorneyId
      if (!attorneyId) continue

      const { signals } = derivePiSignals({
        practiceAreas: staged.practiceAreas,
        sideText: [staged.firmName],
        source: sourceForStagedRow(staged.source),
        observedAt: staged.scrapedAt,
        sourceRef: staged.profileUrl,
      })

      if (signals.length > 0) {
        stats.withSignals += 1
        tallySides(signals, stats)
        stats.written += await persist({ attorneyId }, signals, args.dryRun)
      }

      if (args.limit && stats.scanned >= args.limit) return stats
    }
  }
  return stats
}

function report(label: string, stats: Stats): void {
  console.log(`\n  ${label}`)
  console.log(`    scanned                 ${String(stats.scanned).padStart(8)}`)
  console.log(`    produced signals        ${String(stats.withSignals).padStart(8)}`)
  console.log(`    signal rows             ${String(stats.written).padStart(8)}`)
  console.log(`    plaintiff-side          ${String(stats.plaintiff).padStart(8)}`)
  console.log(`    defense-side            ${String(stats.defense).padStart(8)}`)
  console.log(`    side undetermined       ${String(stats.noSide).padStart(8)}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  console.log('\nDeriving PI segmentation signals from existing data')
  if (args.dryRun) console.log('  DRY RUN — nothing will be written')
  if (args.limit) console.log(`  limit: ${args.limit} per kind`)

  const totals: Stats = emptyStats()
  const merge = (stats: Stats) => {
    totals.scanned += stats.scanned
    totals.withSignals += stats.withSignals
    totals.written += stats.written
    totals.plaintiff += stats.plaintiff
    totals.defense += stats.defense
    totals.noSide += stats.noSide
  }

  if (args.only.has('firms')) {
    const stats = await deriveFromFirms(args)
    report('Law firms (website / profile text)', stats)
    merge(stats)
  }
  if (args.only.has('attorneys')) {
    const stats = await deriveFromAttorneys(args)
    report('Live attorneys (specialties / profile)', stats)
    merge(stats)
  }
  if (args.only.has('staged')) {
    const stats = await deriveFromStaged(args)
    report('Promoted staged rows (bar roll / directory)', stats)
    merge(stats)
  }

  report('TOTAL', totals)

  if (totals.defense > 0) {
    console.log(
      `\n  ${totals.defense} entities show defense-side markers. These are the ones that must` +
        '\n  never receive claimant leads, and they were identifiable from text alone.'
    )
  }

  console.log('\n  Next: node ../node_modules/tsx/dist/cli.mjs scripts/recompute-pi-segments.ts\n')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

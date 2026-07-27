/**
 * Score stored PI signals into `attorney_segments`.
 *
 * Reads every SegmentSignal, runs the scoring engine, and writes one segment row
 * per attorney and firm. Because signals are stored separately from scores, this
 * can be re-run any time the weights change without re-gathering any data — which
 * is the point of splitting them.
 *
 * Firms are scored first, then attorneys, so an attorney with no evidence of
 * their own can inherit their firm's score at a discount. Most individual
 * attorneys will never have their own court filings; the firm is the practice.
 *
 * The output attorneys actually care about is `claimantEligible`. It is derived
 * here rather than in routing so the reason is recorded alongside the decision and
 * a firm asking "why am I not getting leads" gets a straight answer.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/recompute-pi-segments.ts --dry-run
 *   node ../node_modules/tsx/dist/cli.mjs scripts/recompute-pi-segments.ts
 *
 * Flags:
 *   --dry-run       Score and report without writing.
 *   --stale-only    Only rescore entities whose stored scoreVersion is outdated.
 *   --min-score <n> Claimant-eligibility threshold (default 0.5).
 *   --allow-mixed   Treat mixed plaintiff/defense practices as eligible.
 *   --top <n>       How many examples to print per category (default 10).
 */

import '../src/env'
import { prisma } from '../src/lib/prisma'
import {
  inheritFirmSegment,
  isEligibleForClaimantLeads,
  PI_SCORE_VERSION,
  scoreSegment,
  type SegmentScore,
  type SegmentSignal,
  type SignalSource,
} from '../src/lib/pi-segmentation'
import type { IncidentType } from '../src/lib/practice-area-normalize'

type Args = {
  dryRun: boolean
  staleOnly: boolean
  minScore: number
  allowMixed: boolean
  top: number
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    staleOnly: false,
    minScore: 0.5,
    allowMixed: false,
    top: 10,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = () => argv[++i]
    if (flag === '--dry-run') args.dryRun = true
    else if (flag === '--stale-only') args.staleOnly = true
    else if (flag === '--allow-mixed') args.allowMixed = true
    else if (flag === '--min-score') {
      const value = Number(next())
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        throw new Error('--min-score expects a number between 0 and 1')
      }
      args.minScore = value
    } else if (flag === '--top') {
      const value = Number(next())
      if (Number.isFinite(value) && value > 0) args.top = Math.floor(value)
    } else if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
  }
  return args
}

type SignalRow = {
  source: string
  kind: string
  side: string | null
  subtype: string | null
  count: number
  weight: number | null
  observedAt: Date | null
  sourceRef: string | null
}

function toSignal(row: SignalRow): SegmentSignal {
  return {
    source: row.source as SignalSource,
    kind: row.kind,
    side: row.side === 'plaintiff' || row.side === 'defense' ? row.side : null,
    subtype: (row.subtype as IncidentType | null) ?? null,
    count: row.count,
    weight: row.weight,
    observedAt: row.observedAt,
    sourceRef: row.sourceRef,
  }
}

type Tally = {
  scored: number
  written: number
  eligible: number
  bySide: Map<string, number>
  byConfidence: Map<string, number>
}

function emptyTally(): Tally {
  return {
    scored: 0,
    written: 0,
    eligible: 0,
    bySide: new Map(),
    byConfidence: new Map(),
  }
}

function bump(counter: Map<string, number>, key: string): void {
  counter.set(key, (counter.get(key) ?? 0) + 1)
}

async function writeSegment(
  target: { attorneyId: string } | { lawFirmId: string },
  score: SegmentScore,
  args: Args,
  inheritedFromFirm: boolean
): Promise<void> {
  const eligibility = isEligibleForClaimantLeads(score, {
    minScore: args.minScore,
    allowMixed: args.allowMixed,
  })

  const data = {
    ...target,
    piScore: score.piScore,
    piSide: score.side,
    sideConfidence: score.sideConfidence,
    piSubtypes: JSON.stringify(score.subtypes),
    confidence: score.confidence,
    claimantEligible: eligibility.eligible,
    eligibilityReason: eligibility.reason,
    rationale: JSON.stringify(score.rationale),
    breakdown: JSON.stringify(score.breakdown),
    signalCount: score.breakdown.signalCount,
    inheritedFromFirm,
    scoreVersion: score.scoreVersion,
    scoredAt: new Date(),
  }

  await prisma.attorneySegment.upsert({
    where: target as { attorneyId: string } & { lawFirmId: string },
    create: data,
    update: data,
  })
}

function tally(
  counters: Tally,
  score: SegmentScore,
  args: Args
): { eligible: boolean; reason: string } {
  const eligibility = isEligibleForClaimantLeads(score, {
    minScore: args.minScore,
    allowMixed: args.allowMixed,
  })
  counters.scored += 1
  bump(counters.bySide, score.side)
  bump(counters.byConfidence, score.confidence)
  if (eligibility.eligible) counters.eligible += 1
  return eligibility
}

/** Firms first: their scores feed attorney inheritance. */
async function scoreFirms(args: Args): Promise<{ tally: Tally; scores: Map<string, SegmentScore> }> {
  const counters = emptyTally()
  const scores = new Map<string, SegmentScore>()

  const grouped = await prisma.segmentSignal.findMany({
    where: { lawFirmId: { not: null } },
    orderBy: { lawFirmId: 'asc' },
    select: {
      lawFirmId: true,
      source: true,
      kind: true,
      side: true,
      subtype: true,
      count: true,
      weight: true,
      observedAt: true,
      sourceRef: true,
    },
  })

  const byFirm = new Map<string, SignalRow[]>()
  for (const row of grouped) {
    if (!row.lawFirmId) continue
    const list = byFirm.get(row.lawFirmId) ?? []
    list.push(row)
    byFirm.set(row.lawFirmId, list)
  }

  const stale = args.staleOnly ? await staleFirmIds() : null

  for (const [lawFirmId, rows] of byFirm) {
    const score = scoreSegment(rows.map(toSignal))
    scores.set(lawFirmId, score)
    tally(counters, score, args)

    if (stale && !stale.has(lawFirmId)) continue
    if (!args.dryRun) {
      await writeSegment({ lawFirmId }, score, args, false)
      counters.written += 1
    }
  }

  return { tally: counters, scores }
}

async function staleFirmIds(): Promise<Set<string>> {
  const rows = await prisma.attorneySegment.findMany({
    where: { lawFirmId: { not: null }, scoreVersion: PI_SCORE_VERSION },
    select: { lawFirmId: true },
  })
  const current = new Set(rows.map((row) => row.lawFirmId).filter((id): id is string => !!id))
  const all = await prisma.lawFirm.findMany({ select: { id: true } })
  return new Set(all.map((firm) => firm.id).filter((id) => !current.has(id)))
}

async function staleAttorneyIds(): Promise<Set<string>> {
  const rows = await prisma.attorneySegment.findMany({
    where: { attorneyId: { not: null }, scoreVersion: PI_SCORE_VERSION },
    select: { attorneyId: true },
  })
  const current = new Set(rows.map((row) => row.attorneyId).filter((id): id is string => !!id))
  const all = await prisma.attorney.findMany({ select: { id: true } })
  return new Set(all.map((attorney) => attorney.id).filter((id) => !current.has(id)))
}

/**
 * Attorneys, including those with no direct signals: an associate at a
 * well-evidenced PI firm should still be classified, just less confidently than
 * one with their own filing history.
 */
async function scoreAttorneys(
  args: Args,
  firmScores: Map<string, SegmentScore>
): Promise<{ tally: Tally; inherited: number; examples: string[] }> {
  const counters = emptyTally()
  let inherited = 0
  const examples: string[] = []

  const signalRows = await prisma.segmentSignal.findMany({
    where: { attorneyId: { not: null } },
    select: {
      attorneyId: true,
      source: true,
      kind: true,
      side: true,
      subtype: true,
      count: true,
      weight: true,
      observedAt: true,
      sourceRef: true,
    },
  })

  const byAttorney = new Map<string, SignalRow[]>()
  for (const row of signalRows) {
    if (!row.attorneyId) continue
    const list = byAttorney.get(row.attorneyId) ?? []
    list.push(row)
    byAttorney.set(row.attorneyId, list)
  }

  const stale = args.staleOnly ? await staleAttorneyIds() : null
  const PAGE_SIZE = 500
  let cursor: string | undefined

  for (;;) {
    const batch = await prisma.attorney.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: { id: true, name: true, lawFirmId: true },
    })
    if (batch.length === 0) break
    cursor = batch[batch.length - 1].id

    for (const attorney of batch) {
      const rows = byAttorney.get(attorney.id) ?? []
      const firmScore = attorney.lawFirmId ? firmScores.get(attorney.lawFirmId) : undefined

      // Skip attorneys with nothing at all to say about them, rather than
      // writing a row full of zeroes for every attorney in the table.
      if (rows.length === 0 && !firmScore) continue

      let score = scoreSegment(rows.map(toSignal))
      let fromFirm = false

      if (firmScore) {
        const blended = inheritFirmSegment(score, firmScore)
        if (blended !== score) {
          score = blended
          fromFirm = true
          inherited += 1
        }
      }

      const eligibility = tally(counters, score, args)

      if (examples.length < args.top && score.side === 'defense') {
        examples.push(`${attorney.name} — ${eligibility.reason}`)
      }

      if (stale && !stale.has(attorney.id)) continue
      if (!args.dryRun) {
        await writeSegment({ attorneyId: attorney.id }, score, args, fromFirm)
        counters.written += 1
      }
    }
  }

  return { tally: counters, inherited, examples }
}

function pct(part: number, whole: number): string {
  if (whole === 0) return '  n/a'
  return `${((part / whole) * 100).toFixed(1).padStart(5)}%`
}

function report(label: string, counters: Tally): void {
  console.log(`\n  ${label}`)
  console.log(`    scored                  ${String(counters.scored).padStart(8)}`)
  console.log(`    written                 ${String(counters.written).padStart(8)}`)
  console.log(
    `    claimant-eligible       ${String(counters.eligible).padStart(8)}  ${pct(counters.eligible, counters.scored)}`
  )

  const order = ['plaintiff', 'both', 'defense', 'unknown']
  console.log('    by side:')
  for (const side of order) {
    const count = counters.bySide.get(side) ?? 0
    if (count === 0) continue
    console.log(`      ${side.padEnd(22)}${String(count).padStart(8)}  ${pct(count, counters.scored)}`)
  }

  console.log('    by confidence:')
  for (const level of ['high', 'medium', 'low', 'none']) {
    const count = counters.byConfidence.get(level) ?? 0
    if (count === 0) continue
    console.log(`      ${level.padEnd(22)}${String(count).padStart(8)}  ${pct(count, counters.scored)}`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  console.log(`\nRecomputing PI segments (${PI_SCORE_VERSION})`)
  if (args.dryRun) console.log('  DRY RUN — nothing will be written')
  if (args.staleOnly) console.log('  stale only — skipping entities already at this score version')
  console.log(`  claimant threshold: score >= ${args.minScore}, mixed ${args.allowMixed ? 'allowed' : 'held for review'}`)

  const signalCount = await prisma.segmentSignal.count()
  if (signalCount === 0) {
    console.log(
      '\n  No signals on file. Run scripts/derive-pi-signals.ts first, or import' +
        '\n  court-filing / association data.\n'
    )
    return
  }
  console.log(`  signals on file: ${signalCount}`)

  const firms = await scoreFirms(args)
  report('Law firms', firms.tally)

  const attorneys = await scoreAttorneys(args, firms.scores)
  report('Attorneys', attorneys.tally)
  console.log(`    inherited from firm     ${String(attorneys.inherited).padStart(8)}`)

  if (attorneys.examples.length > 0) {
    console.log('\n  Defense-side attorneys held back from claimant leads:')
    for (const example of attorneys.examples) {
      console.log(`    ${example}`)
    }
  }

  const undetermined = attorneys.tally.bySide.get('unknown') ?? 0
  if (undetermined > 0) {
    console.log(
      `\n  ${undetermined} attorneys have PI evidence but no plaintiff/defense signal. Court-filing` +
        '\n  or association data is what resolves these; text alone cannot.'
    )
  }

  console.log('')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

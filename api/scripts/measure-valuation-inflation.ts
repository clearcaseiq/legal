/**
 * Measure how much of the book's stored valuation came from three extraction bugs.
 *
 * All three were fixed going forward, but none of them touched data already in the
 * database, so cases carry inflated figures that attorneys are quoting to clients
 * and adjusters. This reports the exposure. It writes nothing.
 *
 *   codes    Any five-digit number could be read as a CPT code, so ZIP codes and
 *            invoice numbers landed in the surgery range and added severity points.
 *   gate     Evidence credit was granted from file names whenever nothing had been
 *            verified yet, then withdrawn once any one document verified.
 *   wage     A pay stub whose pay rate would not parse contributed its summed total
 *            -- gross + net + YTD + deductions -- as though it were a wage loss.
 *
 * Each is measured on its own by running the underwriting engine twice over the same
 * case, changing only that one input, so the deltas do not confound each other. A
 * combined figure at the end applies all three corrections at once, which is the
 * number that matters for "how wrong is this case today".
 *
 * Usage (prod, inside the api container):
 *   docker exec -w /app clearcaseiq-api \
 *     node ../node_modules/tsx/dist/cli.mjs scripts/measure-valuation-inflation.ts
 *
 * Config (env vars, all optional):
 *   LIMIT=<n>       stop after n cases (default: no limit)
 *   TOP=<n>         list the n most-affected cases (default: 20)
 *   CSV=<path>      also write per-case rows for spreadsheet review
 */
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import { extractClinicalCodes } from '../src/lib/evidence-processing'
import { mergeEvidenceIntoFacts } from '../src/lib/case-recalculation'
import { buildUnderwritingSnapshot } from '../src/lib/case-outcomes'
import { underwriteCase, type UnderwritingInput } from '../src/lib/underwriting-engine'

const prisma = new PrismaClient()

const LIMIT = Number(process.env.LIMIT || 0)
const TOP = Number(process.env.TOP || 20)
const CSV = process.env.CSV || ''

type EvidenceRow = {
  id: string
  originalName: string | null
  category: string
  aiClassification: string | null
  aiSummary: string | null
  aiHighlights: string | null
  ocrText: string | null
  createdAt: Date
  extractedData: Array<{
    totalAmount: number | null
    dollarAmounts: string | null
    icdCodes: string | null
    cptCodes: string | null
    dates: string | null
    entities: string | null
  }>
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
  } catch {
    return []
  }
}

function parseFacts(value: unknown): Record<string, unknown> {
  if (!value) return {}
  try {
    return typeof value === 'string' ? JSON.parse(value) : (value as Record<string, unknown>)
  } catch {
    return {}
  }
}

/**
 * Re-read each file's codes from its stored OCR text using the corrected extractor.
 *
 * A stored code only counts as phantom when it literally appears in the OCR text and
 * the corrected extractor still rejects it -- that is the signature of the old regex
 * grabbing a bare number, which is the bug being measured. Codes that do not appear in
 * the text at all came from somewhere else entirely (LLM extraction, an import, manual
 * entry), so this has no jurisdiction over them and leaves them in place. Blaming those
 * too would attribute other systems' codes to this bug and badly overstate it.
 */
function correctFileCodes(files: EvidenceRow[]) {
  let phantomCpt = 0
  let phantomIcd = 0
  const corrected = files.map((file) => {
    const ext = file.extractedData[0]
    if (!ext || !file.ocrText) return file
    const text = file.ocrText
    const appearsInText = (code: string) => text.toUpperCase().includes(code.toUpperCase())

    const storedCpt = parseJsonArray(ext.cptCodes)
    const storedIcd = parseJsonArray(ext.icdCodes).map((code) => code.toUpperCase())
    const rescanned = extractClinicalCodes(text)
    const keptIcd = rescanned.icdCodes.map((code) => code.toUpperCase())

    const droppedCpt = storedCpt.filter((code) => appearsInText(code) && !rescanned.cptCodes.includes(code))
    const droppedIcd = storedIcd.filter((code) => appearsInText(code) && !keptIcd.includes(code))
    phantomCpt += droppedCpt.length
    phantomIcd += droppedIcd.length

    // Keep out-of-jurisdiction codes; drop only the ones this bug produced.
    const nextCpt = [...new Set([...rescanned.cptCodes, ...storedCpt.filter((code) => !appearsInText(code))])]
    const nextIcd = [...new Set([...keptIcd, ...storedIcd.filter((code) => !appearsInText(code))])]
    return {
      ...file,
      extractedData: [{ ...ext, cptCodes: JSON.stringify(nextCpt), icdCodes: JSON.stringify(nextIcd) }],
    }
  })
  return { corrected, phantomCpt, phantomIcd }
}

/**
 * Reproduce the old evidence gate. It credited file names whenever the verified set
 * was empty; the fixed gate credits them only when recalculation has never run, which
 * is exactly the case where the key is absent. So dropping an empty `evidence` array
 * reproduces the old behaviour through the current code, with no dead branch to keep.
 */
function withOldEvidenceGate(input: UnderwritingInput): UnderwritingInput {
  const evidence = (input.facts as any)?.evidence
  if (!Array.isArray(evidence) || evidence.length > 0) return input
  const facts = { ...(input.facts as Record<string, unknown>) }
  delete facts.evidence
  return { ...input, facts }
}

function expectedOf(input: UnderwritingInput): number {
  try {
    return underwriteCase(input).settlement.expected
  } catch {
    return NaN
  }
}

async function main() {
  const assessments = await prisma.assessment.findMany({
    where: { evidenceFiles: { some: {} } },
    select: {
      id: true,
      claimType: true,
      venueState: true,
      venueCounty: true,
      facts: true,
      createdAt: true,
      insuranceDetails: {
        select: { insuredParty: true, coverageType: true, policyLimit: true, coverageConfirmed: true },
      },
      evidenceFiles: {
        select: {
          id: true,
          originalName: true,
          category: true,
          aiClassification: true,
          aiSummary: true,
          aiHighlights: true,
          ocrText: true,
          createdAt: true,
          extractedData: {
            select: {
              totalAmount: true,
              dollarAmounts: true,
              icdCodes: true,
              cptCodes: true,
              dates: true,
              entities: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    ...(LIMIT > 0 ? { take: LIMIT } : {}),
  })

  console.log(`Scanning ${assessments.length} case${assessments.length === 1 ? '' : 's'} with evidence.\n`)

  const rows: Array<{
    id: string
    claimType: string
    stored: number
    baseline: number
    corrected: number
    codesDelta: number
    gateDelta: number
    wageDelta: number
    phantomCpt: number
    phantomIcd: number
    wageStored: number
    wageCorrected: number
  }> = []

  for (const assessment of assessments) {
    const files = assessment.evidenceFiles as EvidenceRow[]
    const storedFacts = parseFacts(assessment.facts)
    const snapshot = buildUnderwritingSnapshot({ ...assessment, facts: storedFacts })
    const stored = expectedOf(snapshot)
    if (!Number.isFinite(stored)) continue

    const { corrected: correctedFiles, phantomCpt, phantomIcd } = correctFileCodes(files)

    // Both sides of every comparison run through recalculation, differing only in the
    // input being corrected. Comparing a recalculated figure against the raw stored one
    // would fold in every case whose facts were written directly and never recalculated
    // at all -- a real gap, reported separately below as `stale`, but not this bug.
    const baselineFacts = mergeEvidenceIntoFacts(storedFacts, files)
    const correctedFacts = mergeEvidenceIntoFacts(storedFacts, correctedFiles)
    const baseline = expectedOf({ ...snapshot, facts: baselineFacts })
    const corrected = expectedOf({ ...snapshot, facts: correctedFacts })
    if (!Number.isFinite(baseline) || !Number.isFinite(corrected)) continue

    // Each correction applied alone, so the three deltas do not confound each other.
    const codesOnly = { ...snapshot, facts: { ...baselineFacts, clinical: (correctedFacts as any).clinical } }
    const codesDelta = baseline - expectedOf(codesOnly)

    const gateDelta = expectedOf(withOldEvidenceGate({ ...snapshot, facts: baselineFacts })) - baseline

    const wageStored = Number((baselineFacts as any)?.damages?.wage_loss || 0)
    const wageCorrected = Number((correctedFacts as any)?.damages?.wage_loss || 0)
    const wageOnly = {
      ...snapshot,
      facts: { ...baselineFacts, damages: { ...(baselineFacts as any).damages, wage_loss: wageCorrected } },
    }
    const wageDelta = baseline - expectedOf(wageOnly)

    rows.push({
      id: assessment.id,
      claimType: assessment.claimType || 'unknown',
      stored,
      baseline,
      corrected,
      codesDelta: Number.isFinite(codesDelta) ? codesDelta : 0,
      gateDelta: Number.isFinite(gateDelta) ? gateDelta : 0,
      wageDelta: Number.isFinite(wageDelta) ? wageDelta : 0,
      phantomCpt,
      phantomIcd,
      wageStored,
      wageCorrected,
    })
  }

  const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
  const affected = rows.filter((row) => Math.abs(row.baseline - row.corrected) >= 1)
  const overstated = affected.filter((row) => row.corrected < row.baseline)
  const understated = affected.filter((row) => row.corrected > row.baseline)

  const sum = (list: typeof rows, pick: (row: (typeof rows)[number]) => number) =>
    list.reduce((total, row) => total + pick(row), 0)

  console.log('=== Attributable to the three bugs ===')
  console.log(`Cases scored:            ${rows.length}`)
  console.log(`Cases whose value moves: ${affected.length}`)
  console.log(`  overstated:            ${overstated.length}  (${money(sum(overstated, (r) => r.baseline - r.corrected))} too high in total)`)
  console.log(`  understated:           ${understated.length}  (${money(sum(understated, (r) => r.corrected - r.baseline))} too low in total)`)
  console.log(`Book value as scored:    ${money(sum(rows, (r) => r.baseline))}`)
  console.log(`Book value corrected:    ${money(sum(rows, (r) => r.corrected))}`)

  // Separate concern, surfaced because it dwarfs the above and is easy to mistake for it:
  // cases whose stored facts predate recalculation entirely, so their displayed figure is
  // stale for reasons that have nothing to do with these bugs.
  const stale = rows.filter((row) => Math.abs(row.stored - row.baseline) >= 1)
  console.log('\n=== Separately: cases never recalculated ===')
  console.log(`Cases whose stored figure is stale: ${stale.length}`)
  console.log(`  displayed today:  ${money(sum(stale, (r) => r.stored))}`)
  console.log(`  if recalculated:  ${money(sum(stale, (r) => r.baseline))}`)

  const codesCases = rows.filter((row) => row.phantomCpt > 0 || row.phantomIcd > 0)
  console.log('\n=== Phantom clinical codes ===')
  console.log(`Cases with codes the corrected extractor cannot find: ${codesCases.length}`)
  console.log(`  phantom CPT codes: ${sum(codesCases, (r) => r.phantomCpt)}`)
  console.log(`  phantom ICD codes: ${sum(codesCases, (r) => r.phantomIcd)}`)
  console.log(`  valuation attributable to them: ${money(sum(rows, (r) => r.codesDelta))}`)

  const gateCases = rows.filter((row) => Math.abs(row.gateDelta) >= 1)
  console.log('\n=== Evidence gate ===')
  console.log(`Cases that were being credited for unreadable uploads: ${gateCases.length}`)
  console.log(`  valuation attributable to them: ${money(sum(rows, (r) => r.gateDelta))}`)

  const wageCases = rows.filter((row) => Math.abs(row.wageStored - row.wageCorrected) >= 1)
  console.log('\n=== Pay-stub wage figures ===')
  console.log(`Cases whose wage loss came from a summed document total: ${wageCases.length}`)
  console.log(`  wage loss claimed:   ${money(sum(wageCases, (r) => r.wageStored))}`)
  console.log(`  wage loss supported: ${money(sum(wageCases, (r) => r.wageCorrected))}`)
  console.log(`  valuation attributable to it: ${money(sum(rows, (r) => r.wageDelta))}`)

  const worst = [...affected].sort((a, b) => Math.abs(b.baseline - b.corrected) - Math.abs(a.baseline - a.corrected))
  if (worst.length > 0) {
    console.log(`\n=== ${Math.min(TOP, worst.length)} cases most affected by the bugs ===`)
    for (const row of worst.slice(0, TOP)) {
      const direction = row.corrected < row.baseline ? 'over' : 'under'
      console.log(
        `${row.id}  ${row.claimType.padEnd(18)} ${money(row.baseline).padStart(12)} -> ${money(row.corrected).padStart(12)}  (${direction} by ${money(Math.abs(row.baseline - row.corrected))})`,
      )
    }
  }

  if (CSV) {
    const header =
      'assessmentId,claimType,storedExpected,baselineExpected,correctedExpected,codesDelta,gateDelta,wageDelta,phantomCpt,phantomIcd,wageStored,wageCorrected\n'
    const body = rows
      .map((row) =>
        [
          row.id,
          row.claimType,
          Math.round(row.stored),
          Math.round(row.baseline),
          Math.round(row.corrected),
          Math.round(row.codesDelta),
          Math.round(row.gateDelta),
          Math.round(row.wageDelta),
          row.phantomCpt,
          row.phantomIcd,
          Math.round(row.wageStored),
          Math.round(row.wageCorrected),
        ].join(','),
      )
      .join('\n')
    fs.writeFileSync(CSV, header + body + '\n')
    console.log(`\nPer-case rows written to ${CSV}`)
  }

  console.log('\nNothing was written to the database.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

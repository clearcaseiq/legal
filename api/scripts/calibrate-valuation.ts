/**
 * Valuation calibration CLI.
 *
 * Backtests the heuristic valuation engine against historical settlement/verdict outcomes
 * and recommends calibration coefficients (see lib/valuation-calibration.ts).
 *
 * Usage:
 *   # From a JSON dataset of labeled samples ([{ features, actualAmount, outcomeType }])
 *   ts-node scripts/calibrate-valuation.ts --input=./data/outcomes.json
 *
 *   # From recorded CaseOutcome rows in the database
 *   ts-node scripts/calibrate-valuation.ts --from-db
 *
 *   # Persist the recommendation to data/valuation-calibration.json (picked up at runtime)
 *   ts-node scripts/calibrate-valuation.ts --from-db --write
 *
 * Without --write nothing is changed; the report is printed for review.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { config } from 'dotenv'
import { backtest, calibrate, type OutcomeSample } from '../src/lib/valuation-calibration'

config({ path: resolve(__dirname, '../.env'), override: true })

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`
  const match = process.argv.find((a) => a.startsWith(prefix))
  if (match) return match.slice(prefix.length)
  return process.argv.includes(`--${name}`) ? '' : undefined
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

function printMetrics(label: string, m: ReturnType<typeof backtest>) {
  console.log(`\n${label}`)
  console.log(`  samples:            ${m.n}`)
  console.log(`  median abs error:   ${pct(m.medianAbsPctError)}`)
  console.log(`  mean abs error:     ${pct(m.meanAbsPctError)}`)
  console.log(`  bias (median):      ${pct(m.bias)} ${m.bias > 0 ? '(over-predicts)' : m.bias < 0 ? '(under-predicts)' : ''}`)
  console.log(`  band coverage:      ${pct(m.bandCoverage)} (target ~50%)`)
  const sevs = Object.keys(m.bySeverity).map(Number).sort((a, b) => a - b)
  for (const sev of sevs) {
    const b = m.bySeverity[sev]
    console.log(`    severity ${sev}: n=${b.n}, mdAPE=${pct(b.medianAbsPctError)}, bias=${pct(b.bias)}, coverage=${pct(b.bandCoverage)}`)
  }
}

async function loadSamples(): Promise<OutcomeSample[]> {
  const inputPath = getArg('input')
  if (inputPath) {
    const raw = JSON.parse(readFileSync(resolve(process.cwd(), inputPath), 'utf8'))
    if (!Array.isArray(raw)) throw new Error('Input JSON must be an array of samples')
    return raw as OutcomeSample[]
  }
  if (getArg('from-db') !== undefined) {
    // Imported lazily so a JSON-only run needs no DB connection.
    const { exportOutcomeSamples } = await import('../src/lib/case-outcomes')
    return exportOutcomeSamples()
  }
  throw new Error('Provide --input=<file.json> or --from-db')
}

async function main() {
  const samples = await loadSamples()
  if (samples.length === 0) {
    console.log('No scorable outcomes found. Record CaseOutcome rows or supply a dataset first.')
    return
  }
  console.log(`Loaded ${samples.length} labeled outcome sample(s).`)

  const baseline = backtest(samples)
  printMetrics('=== Baseline (identity calibration) ===', baseline)

  const result = calibrate(samples)
  printMetrics(`=== Calibrated (${result.evaluated} candidates evaluated) ===`, result.after)

  console.log('\n=== Recommended calibration coefficients ===')
  console.log(JSON.stringify(result.recommended, null, 2))

  if (getArg('write') !== undefined) {
    const dataDir = resolve(__dirname, '../data')
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
    const outPath = resolve(dataDir, 'valuation-calibration.json')
    writeFileSync(outPath, JSON.stringify(result.recommended, null, 2))
    console.log(`\nWrote ${outPath} — it will be applied at runtime (overridable via VALUATION_CALIBRATION env).`)
  } else {
    console.log('\n(Dry run — re-run with --write to persist these coefficients.)')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

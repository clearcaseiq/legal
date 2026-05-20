/**
 * CLI: print PDF extraction diagnostics (embedded text, Textract on PDF bytes, Textract on rendered page 1).
 *
 * Usage (from repo root or api/):
 *   node ../node_modules/tsx/dist/cli.mjs scripts/diagnose-pdf-extraction.ts <local-path.pdf>
 *   node ../node_modules/tsx/dist/cli.mjs scripts/diagnose-pdf-extraction.ts https://bitcoin.org/bitcoin.pdf
 */
import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { diagnosePdfExtraction } from '../src/lib/evidence-processing'

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: tsx scripts/diagnose-pdf-extraction.ts <path-or-https-url.pdf>')
    process.exit(1)
  }

  let filePath = arg
  if (/^https?:\/\//i.test(arg)) {
    const res = await fetch(arg)
    if (!res.ok) throw new Error(`Fetch failed ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const dir = path.join(tmpdir(), 'caseiq-pdf-diag')
    mkdirSync(dir, { recursive: true })
    filePath = path.join(dir, `diag-${Date.now()}.pdf`)
    writeFileSync(filePath, buf)
    console.error(`Downloaded ${buf.length} bytes -> ${filePath}\n`)
  }

  const out = await diagnosePdfExtraction(filePath)
  console.log(JSON.stringify(out, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

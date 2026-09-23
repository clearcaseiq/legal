/**
 * Generate the ZIP-to-county lookup from Census data.
 *
 * Intake asks for a ZIP code instead of a county, because claimants know their
 * ZIP and often cannot name their county. Routing still matches on county, so
 * the ZIP has to be turned into one.
 *
 * The source is the Census Bureau's 2020 ZCTA-to-county relationship file
 * (public domain). A ZCTA is the Census approximation of a ZIP code; the two
 * agree for almost every residential ZIP. Many ZCTAs cross a county line, so
 * each ZIP maps to every county holding a meaningful share of its land area,
 * largest first. Slivers under MIN_SHARE are boundary noise and are dropped.
 *
 * County names are normalized to the bare form the rest of the system stores
 * ("Los Angeles", not "Los Angeles County"), matching `normalizeCountyName()`
 * in app/src/lib/usLocationData.ts. Independent cities keep a "City" suffix so
 * Bedford County and the City of Bedford stay distinct.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/generate-zip-county.ts
 *
 * Flags:
 *   --file <path>  Read a previously downloaded copy instead of fetching.
 *   --url <url>    Override the source URL.
 *   --out <path>   Output module (default src/lib/zip-county.generated.ts).
 *   --check        Exit non-zero if the output would change. For CI.
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const DEFAULT_URL =
  'https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt'
const DEFAULT_OUT = 'src/lib/zip-county.generated.ts'
const MIN_SHARE = 0.05

const STATE_BY_FIPS: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE',
  '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA',
  '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM',
  '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY', '72': 'PR',
}

type Args = { file?: string; url: string; out: string; check: boolean }

function parseArgs(argv: string[]): Args {
  const args: Args = { url: DEFAULT_URL, out: DEFAULT_OUT, check: false }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = () => argv[++i]
    if (flag === '--file') args.file = next()
    else if (flag === '--url') args.url = next() ?? args.url
    else if (flag === '--out') args.out = next() ?? args.out
    else if (flag === '--check') args.check = true
    else if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
  }
  return args
}

/** "Los Angeles County" -> "Los Angeles", "Richmond city" -> "Richmond City". */
function normalizeCountyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+City and Borough$/i, '')
    .replace(/\s+(County|Parish|Borough|Census Area|Municipality|Municipio)$/i, '')
    .replace(/\s+city$/, ' City')
    .trim()
}

async function loadSource(args: Args): Promise<string> {
  if (args.file) return readFileSync(args.file, 'utf8')
  const response = await fetch(args.url)
  if (!response.ok) throw new Error(`Failed to fetch ${args.url}: HTTP ${response.status}`)
  return response.text()
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const raw = (await loadSource(args)).replace(/^\uFEFF/, '')

  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length < 2) throw new Error('Source file has no data rows')

  const header = lines[0].split('|')
  const zipIndex = header.indexOf('GEOID_ZCTA5_20')
  const countyFipsIndex = header.indexOf('GEOID_COUNTY_20')
  const countyNameIndex = header.indexOf('NAMELSAD_COUNTY_20')
  const landIndex = header.indexOf('AREALAND_PART')
  if ([zipIndex, countyFipsIndex, countyNameIndex, landIndex].includes(-1)) {
    throw new Error(`Unexpected header: ${lines[0]}`)
  }

  const partsByZip = new Map<string, Map<string, number>>()
  let dataRows = 0

  for (const line of lines.slice(1)) {
    const columns = line.split('|')
    const zip = columns[zipIndex]
    const fips = columns[countyFipsIndex]
    if (!zip || !fips) continue
    const state = STATE_BY_FIPS[fips.slice(0, 2)]
    if (!state) continue
    dataRows += 1
    const key = `${state}|${normalizeCountyName(columns[countyNameIndex])}`
    const land = Number(columns[landIndex]) || 0
    if (!partsByZip.has(zip)) partsByZip.set(zip, new Map())
    const parts = partsByZip.get(zip)!
    parts.set(key, (parts.get(key) ?? 0) + land)
  }

  const entries: Array<[string, string]> = []
  let multiCounty = 0
  for (const [zip, parts] of Array.from(partsByZip.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const total = Array.from(parts.values()).reduce((sum, land) => sum + land, 0)
    const ranked = Array.from(parts.entries())
      .map(([key, land]) => ({ key, share: total > 0 ? land / total : 1 / parts.size }))
      .sort((a, b) => b.share - a.share)
    const kept = ranked.filter((part, index) => index === 0 || part.share >= MIN_SHARE)
    if (kept.length > 1) multiCounty += 1
    entries.push([zip, kept.map((part) => part.key).join(';')])
  }

  const body = renderModule({ sourceUrl: args.url, dataRows, entries, multiCounty })
  const outPath = resolve(process.cwd(), args.out)

  if (args.check) {
    let existing = ''
    try {
      existing = readFileSync(outPath, 'utf8')
    } catch {
      existing = ''
    }
    if (existing !== body) {
      console.error(`${args.out} is out of date. Re-run without --check to regenerate.`)
      process.exit(1)
    }
    console.log(`${args.out} is up to date.`)
    return
  }

  writeFileSync(outPath, body, 'utf8')
  console.log(`Wrote ${args.out}`)
  console.log(`  source rows      ${dataRows}`)
  console.log(`  ZIP codes        ${entries.length}`)
  console.log(`  multi-county     ${multiCounty}`)
}

function renderModule(input: {
  sourceUrl: string
  dataRows: number
  entries: Array<[string, string]>
  multiCounty: number
}): string {
  const rows = input.entries.map(([zip, value]) => `  "${zip}": ${JSON.stringify(value)},`).join('\n')
  return `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Regenerate with:
 *   cd api && node ../node_modules/tsx/dist/cli.mjs scripts/generate-zip-county.ts
 *
 * Source: U.S. Census Bureau 2020 ZCTA-to-county relationship file (public domain)
 *   ${input.sourceUrl}
 *
 * ${input.entries.length} ZIP codes from ${input.dataRows} source rows; ${input.multiCounty} span more than one county.
 *
 * Each value is one or more "STATE|County" pairs separated by ";", ordered by
 * the share of the ZIP's land area in that county, largest first.
 */
export const ZIP_TO_COUNTIES: Record<string, string> = {
${rows}
}
`
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : error}`)
  process.exit(1)
})

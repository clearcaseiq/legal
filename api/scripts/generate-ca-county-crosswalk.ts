/**
 * Generate the California place-to-county crosswalk from Census data.
 *
 * Routing matches on county, so how many imported attorneys are routable at
 * county precision depends entirely on how many mailing-address cities we can
 * resolve. Hand-authoring that map does not scale past the big metros and is
 * easy to get quietly wrong, so it is generated from the Census Bureau's
 * place-by-county reference file instead.
 *
 * The source is public domain and covers every incorporated place and census
 * designated place in California, which is far wider than the incorporated-city
 * list most crosswalks stop at.
 *
 * Some place names appear in more than one county. Where exactly one of them is
 * an incorporated city and the rest are census designated places, the city wins:
 * Burbank is a city in Los Angeles County and also a small unincorporated
 * community in Santa Clara County, and a law office writing "Burbank" means the
 * former essentially always. Business addresses reference municipalities.
 *
 * Where that tie-break does not apply — two unrelated communities sharing a
 * name, like Bayview in both Contra Costa and Humboldt — the name is excluded
 * from the lookup and recorded as ambiguous. Guessing would file an attorney
 * under a county at the wrong end of the state and route them the wrong cases.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/generate-ca-county-crosswalk.ts
 *
 * Flags:
 *   --file <path>  Read a previously downloaded copy instead of fetching.
 *   --url <url>    Override the source URL.
 *   --out <path>   Output module (default src/lib/ca-county-crosswalk.generated.ts).
 *   --check        Exit non-zero if the output would change. For CI.
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const DEFAULT_URL =
  'https://www2.census.gov/geo/docs/reference/codes2020/place_by_cou/st06_ca_place_by_county2020.txt'
const DEFAULT_OUT = 'src/lib/ca-county-crosswalk.generated.ts'

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

/**
 * Must match `normalizeKey()` in ca-counties.ts, since the generated keys are
 * looked up with it. Kept as a copy rather than an import so this script has no
 * dependency on the module it generates.
 */
function normalizeKey(value: string): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** "Alameda city" -> "Alameda", "Ashland CDP" -> "Ashland", "Yuba City city" -> "Yuba City". */
function stripPlaceType(placeName: string): string {
  return placeName.replace(/\s+(city|town|village|CDP)$/i, '').trim()
}

/** "Alameda County" -> "Alameda". */
function stripCountySuffix(countyName: string): string {
  return countyName.replace(/\s+County$/i, '').trim()
}

async function loadSource(args: Args): Promise<string> {
  if (args.file) return readFileSync(args.file, 'utf8')

  const response = await fetch(args.url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${args.url}: HTTP ${response.status}`)
  }
  return response.text()
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const raw = await loadSource(args)

  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length < 2) throw new Error('Source file has no data rows')

  const header = lines[0].split('|')
  const placeIndex = header.indexOf('PLACENAME')
  const countyIndex = header.indexOf('COUNTYNAME')
  const typeIndex = header.indexOf('TYPE')
  if (placeIndex === -1 || countyIndex === -1 || typeIndex === -1) {
    throw new Error(`Unexpected header, need PLACENAME, COUNTYNAME and TYPE: ${lines[0]}`)
  }

  type Entry = { county: string; incorporated: boolean }

  const entriesByKey = new Map<string, Entry[]>()
  const displayByKey = new Map<string, string>()
  const allCounties = new Set<string>()
  let dataRows = 0

  for (const line of lines.slice(1)) {
    const columns = line.split('|')
    const placeName = columns[placeIndex]
    const countyName = columns[countyIndex]
    if (!placeName || !countyName) continue

    dataRows += 1
    const place = stripPlaceType(placeName)
    const county = stripCountySuffix(countyName)
    allCounties.add(county)

    const key = normalizeKey(place)
    if (!key) continue

    const incorporated = /INCORPORATED PLACE/i.test(columns[typeIndex] ?? '')
    if (!entriesByKey.has(key)) entriesByKey.set(key, [])
    entriesByKey.get(key)!.push({ county, incorporated })
    // Prefer an incorporated place's spelling for the display name.
    if (!displayByKey.has(key) || incorporated) displayByKey.set(key, place)
  }

  const unambiguous: Array<[string, string]> = []
  const ambiguous: Array<[string, string[]]> = []
  const tieBroken: Array<[string, string, string[]]> = []

  for (const [key, entries] of Array.from(entriesByKey.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const counties = Array.from(new Set(entries.map((entry) => entry.county))).sort()

    if (counties.length === 1) {
      unambiguous.push([key, counties[0]])
      continue
    }

    // A single incorporated city beats any number of same-named CDPs.
    const incorporatedCounties = Array.from(
      new Set(entries.filter((entry) => entry.incorporated).map((entry) => entry.county))
    )
    if (incorporatedCounties.length === 1) {
      unambiguous.push([key, incorporatedCounties[0]])
      tieBroken.push([key, incorporatedCounties[0], counties])
      continue
    }

    ambiguous.push([key, counties])
  }

  const body = renderModule({
    sourceUrl: args.url,
    dataRows,
    placeCount: entriesByKey.size,
    countyCount: allCounties.size,
    unambiguous,
    ambiguous,
  })

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
  console.log(`  source rows        ${dataRows}`)
  console.log(`  distinct places    ${entriesByKey.size}`)
  console.log(`  counties covered   ${allCounties.size} of 58`)
  console.log(`  usable mappings    ${unambiguous.length}`)
  console.log(`    of which tie-broken to an incorporated city ${tieBroken.length}`)
  console.log(`  ambiguous names    ${ambiguous.length} (excluded from the lookup)`)

  if (tieBroken.length > 0) {
    console.log('\n  Resolved to the incorporated city over a same-named CDP:')
    for (const [key, chosen, all] of tieBroken) {
      const others = all.filter((county) => county !== chosen)
      console.log(`    ${displayByKey.get(key) ?? key} -> ${chosen} (not ${others.join(', ')})`)
    }
  }

  if (allCounties.size !== 58) {
    console.warn(
      `\n  WARNING: expected all 58 California counties, saw ${allCounties.size}. ` +
        'The source format may have changed.'
    )
  }

  if (ambiguous.length > 0) {
    console.log('\n  Ambiguous place names (resolved as "ambiguous", never guessed):')
    for (const [key, counties] of ambiguous) {
      console.log(`    ${displayByKey.get(key) ?? key} -> ${counties.join(', ')}`)
    }
  }
}

function renderModule(input: {
  sourceUrl: string
  dataRows: number
  placeCount: number
  countyCount: number
  unambiguous: Array<[string, string]>
  ambiguous: Array<[string, string[]]>
}): string {
  const entries = input.unambiguous
    .map(([key, county]) => `  ${JSON.stringify(key)}: ${JSON.stringify(county)},`)
    .join('\n')

  const ambiguousEntries = input.ambiguous
    .map(([key, counties]) => `  ${JSON.stringify(key)}: ${JSON.stringify(counties)},`)
    .join('\n')

  return `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Regenerate with:
 *   cd api && node ../node_modules/tsx/dist/cli.mjs scripts/generate-ca-county-crosswalk.ts
 *
 * Source: U.S. Census Bureau place-by-county reference file (public domain)
 *   ${input.sourceUrl}
 *
 * Covers ${input.placeCount} distinct California place names across
 * ${input.countyCount} counties, built from ${input.dataRows} source rows.
 * Includes both incorporated places and census designated places, so
 * unincorporated communities resolve too.
 *
 * Keys are normalized by \`normalizeKey()\` in ca-counties.ts: lowercased,
 * diacritics and punctuation stripped, whitespace collapsed.
 */

/** Place names that map to exactly one county. */
export const CENSUS_PLACE_TO_COUNTY: Record<string, string> = {
${entries}
}

/**
 * Place names that occur in more than one county — generally two unrelated
 * communities sharing a name. Callers must treat these as unresolved rather
 * than picking one, since a wrong county routes cases from the wrong region.
 */
export const CENSUS_AMBIGUOUS_PLACES: Record<string, string[]> = {
${ambiguousEntries}
}
`
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : error}`)
  process.exit(1)
})

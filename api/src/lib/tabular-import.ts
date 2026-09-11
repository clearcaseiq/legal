/**
 * Reading a caseload export as a table of rows.
 *
 * There used to be two of these — one here and a second, weaker one in the
 * browser that drew the column-mapping screen — and they disagreed about what
 * a file even was. The preview refused Excel outright, neither stripped a byte
 * order mark, and both decided the format from the file extension, so a Clio
 * export saved as `.txt` was read as a single-column CSV whose header was `{`.
 * The import then skipped every row for having no date of loss, which is a
 * true statement about a file nobody had managed to read.
 *
 * This is now the only parser; the preview endpoint calls it too. The rules it
 * follows:
 *
 *   - The *content* decides the format, not the extension. A CMS that writes
 *     JSON into a `.txt` is more common than one that gets the suffix right.
 *   - Quotes win over line endings. A description field with a newline inside
 *     it is one cell, not the end of the row — the previous splitters cut the
 *     file into lines first, so a single multi-line note silently shifted
 *     every column after it, for every remaining row in the file.
 *   - A failure is a sentence, not an absence. "No columns detected" sent
 *     attorneys to check a mapping when the real problem was a BOM.
 *
 * Pure text in, rows out: no filesystem, no request, no database, so the
 * behaviour against a real export can be pinned down in tests. Workbooks are
 * handled by the caller, which has `xlsx`; everything textual lands here.
 */

/** A parse that failed in a way worth repeating to the attorney verbatim. */
export class TabularParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TabularParseError'
  }
}

export type TabularFormat = 'json' | 'ndjson' | 'delimited'

export interface ParsedTable {
  /** Column names in file order, de-duplicated. */
  headers: string[]
  rows: Record<string, string>[]
  format: TabularFormat
  /** Which delimiter was used, when the file was delimited. */
  delimiter?: string
}

/** Delimiters we will detect, in tie-break order. */
const DELIMITERS = [',', '\t', ';', '|'] as const

type Delimiter = (typeof DELIMITERS)[number]

/**
 * Arrays under any of these keys are the rows; anything else is one row.
 *
 * A single-case export — one object with `case`, `client` and `incident`
 * branches — is deliberately *not* unwrapped to one of its branches. Taking
 * `case` alone would throw away the client's email and the incident date,
 * which are the two fields that matter most. The whole document flattens into
 * one row instead, and the header matcher reads the leaf names.
 */
const ROW_ENVELOPE_KEYS = ['cases', 'matters', 'projects', 'records', 'results', 'rows', 'items', 'data']

/**
 * A leading byte order mark, removed.
 *
 * Windows text editors write one by default. `JSON.parse` throws on it with a
 * message about an unexpected token that names no character anyone can see,
 * which is how a perfectly good export came back as "could not parse".
 */
export function stripBom(content: string): string {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content
}

/**
 * Whether the content is JSON, a JSON object per line, or delimited text.
 *
 * Decided by looking at it. `{` or `[` is JSON — nothing else starts a CSV
 * that way, and a delimited file whose first cell genuinely begins with a
 * brace would have to be quoted anyway.
 */
export function sniffFormat(content: string): TabularFormat {
  const text = stripBom(content).trimStart()
  if (!text.startsWith('{') && !text.startsWith('[')) return 'delimited'
  // Several objects, one per line, is a shape CMS API dumps use and valid JSON
  // rejects. Told apart by trying the whole thing first, below.
  return looksLikeJson(text) ? 'json' : 'ndjson'
}

function looksLikeJson(text: string): boolean {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

/**
 * The delimiter the header row uses.
 *
 * Counted outside quotes, because a single quoted description containing
 * commas would otherwise outvote the real delimiter in a semicolon-separated
 * European export. Comma wins ties, being both the most common and the
 * previous unconditional default.
 */
export function detectDelimiter(content: string): Delimiter {
  const header = firstRecord(stripBom(content))
  let best: Delimiter = ','
  let bestCount = 0
  for (const candidate of DELIMITERS) {
    const count = countOutsideQuotes(header, candidate)
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

/** The first line, respecting quotes so a multi-line cell does not truncate it. */
function firstRecord(content: string): string {
  let inQuotes = false
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    if (char === '"') {
      if (inQuotes && content[index + 1] === '"') index += 1
      else inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && (char === '\n' || char === '\r')) return content.slice(0, index)
  }
  return content
}

function countOutsideQuotes(line: string, delimiter: string): number {
  let count = 0
  let inQuotes = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') index += 1
      else inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && char === delimiter) count += 1
  }
  return count
}

/**
 * Cells, row by row, in one pass over the whole file.
 *
 * One pass rather than split-then-split is the entire point: a quoted cell may
 * contain the delimiter *and* a line break, and a description field spanning
 * two lines is normal in a Clio or Filevine export. Splitting on newlines
 * first turned one such cell into two malformed rows and pushed every
 * subsequent column one place left, for the rest of the file, without
 * complaint.
 */
function tokenize(content: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  const endCell = () => {
    row.push(cell.trim())
    cell = ''
  }
  const endRow = () => {
    endCell()
    rows.push(row)
    row = []
  }

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    if (inQuotes) {
      if (char === '"') {
        // A doubled quote is an escaped one; a lone quote closes the cell.
        if (content[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
      continue
    }
    if (char === delimiter) {
      endCell()
      continue
    }
    if (char === '\r') {
      if (content[index + 1] === '\n') index += 1
      endRow()
      continue
    }
    if (char === '\n') {
      endRow()
      continue
    }
    cell += char
  }
  endRow()

  return rows.filter((cells) => cells.some((value) => value.length > 0))
}

/**
 * Header names, made usable as object keys.
 *
 * A blank header becomes a positional name rather than an empty key, so an
 * export with a trailing delimiter does not collapse several columns onto `''`.
 * A repeated header gets a suffix for the same reason.
 */
function normalizeHeaders(cells: string[]): string[] {
  const seen = new Map<string, number>()
  return cells.map((cell, index) => {
    const base = cell.trim() || `Column ${index + 1}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base} (${count + 1})`
  })
}

/** Delimited text as rows keyed by header. */
export function parseDelimitedText(content: string, delimiter?: string): ParsedTable {
  const text = stripBom(content)
  const used = delimiter ?? detectDelimiter(text)
  const records = tokenize(text, used)
  if (records.length === 0) {
    throw new TabularParseError('This file is empty.')
  }
  const headers = normalizeHeaders(records[0])
  const rows = records.slice(1).map((cells) =>
    headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = cells[index] ?? ''
      return row
    }, {}),
  )
  return { headers, rows, format: 'delimited', delimiter: used }
}

/**
 * A JSON document as rows.
 *
 * Accepts an array of objects, an object wrapping one under a known key, a
 * single object, and one-object-per-line. Anything else — a bare number, an
 * array of strings — is a file we would only be guessing at.
 */
export function parseJsonText(content: string): ParsedTable {
  const text = stripBom(content).trim()
  if (!text) throw new TabularParseError('This file is empty.')

  const { value, format } = parseJsonDocument(text)
  const records = rowsFromJson(value)
  if (records.length === 0) {
    throw new TabularParseError('This file is valid JSON but contains no cases.')
  }

  const rows = records.map((record) => flattenRow(record))
  // Union of every row's keys, in first-seen order: a sparse export omits keys
  // rather than nulling them, so the first row alone is not the column list.
  const headers: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        headers.push(key)
      }
    }
  }
  if (headers.length === 0) {
    throw new TabularParseError('This file is valid JSON but has no fields on its cases.')
  }
  return { headers, rows, format }
}

function parseJsonDocument(text: string): { value: unknown; format: TabularFormat } {
  try {
    return { value: JSON.parse(text), format: 'json' }
  } catch (error) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
    if (lines.length > 1) {
      try {
        return { value: lines.map((line) => JSON.parse(line)), format: 'ndjson' }
      } catch {
        // Fall through to the whole-document message, which is the more
        // likely complaint of the two.
      }
    }
    const detail = error instanceof Error ? error.message : String(error)
    throw new TabularParseError(`This file looks like JSON but could not be read: ${detail}`)
  }
}

function rowsFromJson(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') {
    throw new TabularParseError('This file is valid JSON but is not a case or a list of cases.')
  }
  const record = value as Record<string, unknown>
  for (const key of ROW_ENVELOPE_KEYS) {
    const nested = record[key]
    if (Array.isArray(nested)) return nested
  }
  return [record]
}

/**
 * A nested object as one flat row, keyed by dotted path.
 *
 * `{ client: { email: 'a@b.c' } }` becomes `{ 'client.email': 'a@b.c' }`. The
 * header matcher in `import-mapping.ts` also compares the last segment of each
 * path, which is what lets a nested single-case export map at all — the full
 * path `case.incident_date` matches no rule anyone would write, while its leaf
 * `incident_date` matches the one that already exists.
 *
 * Arrays are joined rather than indexed. A list of diagnoses is one cell the
 * injury splitter can read; `injuries.0`, `injuries.1` would be several columns
 * matching nothing.
 */
export function flattenRow(value: unknown, prefix = ''): Record<string, string> {
  if (value === null || value === undefined) return {}
  if (typeof value !== 'object') {
    return prefix ? { [prefix]: String(value) } : {}
  }
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (row, [key, nested]) => {
      const path = prefix ? `${prefix}.${key}` : key
      if (Array.isArray(nested)) {
        row[path] = nested
          .map((item) => (item && typeof item === 'object' ? JSON.stringify(item) : String(item ?? '')))
          .filter(Boolean)
          .join('; ')
      } else if (nested && typeof nested === 'object') {
        Object.assign(row, flattenRow(nested, path))
      } else {
        row[path] = nested === null || nested === undefined ? '' : String(nested)
      }
      return row
    },
    {},
  )
}

/**
 * Rows from any textual export, format decided by looking at the content.
 *
 * Throws `TabularParseError` with something worth showing the attorney. The
 * caller turns that into the file's `unsupportedReason`; nothing here should
 * reach a 500, because an unreadable upload is a normal Tuesday, not a fault.
 */
export function parseTabularText(content: string): ParsedTable {
  const format = sniffFormat(content)
  if (format === 'json' || format === 'ndjson') return parseJsonText(content)

  const table = parseDelimitedText(content)
  // A single column almost always means the delimiter was wrong rather than
  // that the export really has one field, and saying so beats handing back a
  // mapping screen with one unusable column on it.
  if (table.headers.length === 1 && table.rows.length > 0) {
    throw new TabularParseError(
      `Only one column was found, using "${table.delimiter === '\t' ? 'tab' : table.delimiter}" as the separator. Check the file is a CSV and not a report or a PDF printout.`,
    )
  }
  return table
}

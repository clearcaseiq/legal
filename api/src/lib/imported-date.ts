/**
 * Reading an incident date out of somebody else's spreadsheet.
 *
 * This was one line — `new Date(value)` — and that is not good enough for a
 * date the statute of limitations is calculated from. The JS parser accepts
 * far more than it should and silently guesses at the rest:
 *
 *   - `new Date('45000')` is a valid date in the year 45000, so an Excel cell
 *     that arrived as a raw serial number imported a case with an SOL deadline
 *     forty thousand years out instead of being rejected.
 *   - `new Date('03/04/2026')` is always March 4th, so a firm exporting in
 *     day-first format had every ambiguous date in its caseload silently
 *     transposed.
 *   - `new Date('2026-03-04')` is UTC midnight but `new Date('3/4/2026')` is
 *     *local* midnight, so on a server west of Greenwich the two spellings of
 *     the same day landed a day apart.
 *
 * So: an explicit list of the spellings real exports use, every field range
 * checked, and a named reason for anything we will not guess at. The rule from
 * `import-mapping.ts` still holds — a column we cannot read produces no field,
 * never a plausible default — this module just explains itself when it fails,
 * because "no incident date" on a row that plainly has one in it is a
 * bug report waiting to happen.
 */

export type IncidentDateParse =
  | {
      ok: true
      /** Calendar date as `YYYY-MM-DD`, no time and no zone. */
      date: string
      /**
       * True when the value could equally have been read the other way round,
       * e.g. `03/04/2026`. Read as month-first, but the attorney is told, since
       * we cannot know their export's locale and they can.
       */
      ambiguous: boolean
    }
  | IncidentDateRejection

/** The failure half of a parse, on its own so `interpret` can return only it. */
type IncidentDateRejection = { ok: false; reason: string }

/** A date pulled apart but not yet checked against the calendar. */
type DateParts = { year: number; month: number; day: number; ambiguous: boolean }

/** Dates before this are data entry accidents, not incidents. */
const EARLIEST_YEAR = 1900

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
}

/** `YYYY-MM-DD`, optionally with a time we discard. */
const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/
/** Three numbers and a separator: the ambiguous family. */
const NUMERIC = /^(\d{1,4})[/.-](\d{1,2})[/.-](\d{2,4})$/
/** `Jan 5, 2026`, `January 5th 2026`. */
const MONTH_FIRST = /^([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i
/** `5 Jan 2026`, `5th January, 2026`. */
const DAY_FIRST = /^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]{3,9})\.?,?\s+(\d{4})$/i
/** A bare number, which is either an Excel serial or a mistake. */
const BARE_NUMBER = /^\d+(?:\.0+)?$/

/**
 * Excel counts days from 1899-12-30.
 *
 * Not 1900-01-01, because Excel believes 1900 was a leap year; starting two
 * days earlier cancels that out for every date after February 1900, which is
 * every date anyone will import.
 */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30)

/**
 * The serial range we will convert rather than reject.
 *
 * 20000 is 1954 and 60000 is 2064 — wide enough for any real date of loss, and
 * narrow enough that a case number or a dollar amount in the wrong column
 * falls outside it and gets rejected instead of quietly becoming a date. The
 * five-digit floor also keeps a bare year like `2026` out: that is a mistake we
 * can name, not a serial.
 */
const EXCEL_SERIAL_MIN = 20000
const EXCEL_SERIAL_MAX = 60000

/**
 * A real calendar date as `YYYY-MM-DD`, or null if those numbers are not one.
 *
 * The round-trip through `Date.UTC` is what rejects February 30th: JS rolls it
 * forward to March 2nd, so a date that comes back changed was never a date.
 * Built in UTC throughout so the result never depends on the server's zone.
 */
function calendarDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const stamp = new Date(Date.UTC(year, month - 1, day))
  if (
    stamp.getUTCFullYear() !== year ||
    stamp.getUTCMonth() !== month - 1 ||
    stamp.getUTCDate() !== day
  ) {
    return null
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Two-digit years, resolved by the fact that an incident already happened.
 *
 * `98` is 1998 and `24` is 2024; the cut is next year, so a date one year out
 * still reads as this century and gets rejected below as future-dated — which
 * is a more useful message than silently calling it 1926.
 */
function fullYear(value: number, today: Date): number {
  if (value >= 100) return value
  const century = Math.floor(today.getUTCFullYear() / 100) * 100
  const candidate = century + value
  return candidate > today.getUTCFullYear() + 1 ? candidate - 100 : candidate
}

function monthNumber(name: string): number | null {
  return MONTH_NAMES[name.toLowerCase().replace(/\./g, '')] ?? null
}

/** The unreadable-value message, with the value in it so the row is findable. */
function unreadable(raw: string): IncidentDateRejection {
  return {
    ok: false,
    reason: `"${truncate(raw)}" is not a date we can read. Use YYYY-MM-DD, or format that column as a date.`,
  }
}

/** Keeps a pasted paragraph in a date column from filling the error list. */
function truncate(value: string): string {
  return value.length > 40 ? `${value.slice(0, 40)}…` : value
}

/**
 * Split a numeric date into year, month and day.
 *
 * Returns the ambiguity alongside, because month-first is a guess here and the
 * attorney is the only one who knows their export's locale. Order is decided
 * by whichever field cannot be a month:
 *
 *   `25/12/2026` — 25 cannot be a month, so day-first.
 *   `12/25/2026` — 25 cannot be a month, so month-first.
 *   `03/04/2026` — either. Read as month-first and flagged.
 */
function splitNumeric(first: number, second: number, third: string, today: Date): DateParts | null {
  // A four-digit leading field is a year, which makes the rest unambiguous.
  if (first >= 1000) {
    return { year: first, month: second, day: Number(third), ambiguous: false }
  }
  const year = fullYear(Number(third), today)
  if (first > 12 && second <= 12) return { year, month: second, day: first, ambiguous: false }
  if (second > 12 && first <= 12) return { year, month: first, day: second, ambiguous: false }
  if (first > 12 && second > 12) return null
  return { year, month: first, day: second, ambiguous: true }
}

/**
 * An incident date from a spreadsheet cell, or the reason we would not guess.
 *
 * `today` is injectable so the future-date rule is testable without freezing
 * the clock.
 */
export function parseIncidentDate(raw: string, today: Date = new Date()): IncidentDateParse {
  const value = (raw ?? '').trim()
  if (!value) {
    return { ok: false, reason: 'No incident date. Map a date column, or add one to the row.' }
  }

  const parsed = interpret(value, today)
  if (!parsed) return unreadable(value)
  if ('reason' in parsed) return parsed

  const date = calendarDate(parsed.year, parsed.month, parsed.day)
  if (!date) {
    return {
      ok: false,
      reason: `"${truncate(value)}" is not a real calendar date. Check the day and month are the right way round.`,
    }
  }
  if (parsed.year < EARLIEST_YEAR) {
    return {
      ok: false,
      reason: `Incident date ${date} is before ${EARLIEST_YEAR}, which is almost certainly a typo in the year.`,
    }
  }
  // A date of loss in the future is always wrong, and wrong in a way that
  // matters: every SOL deadline, treatment gap and demand window on the case
  // would be measured from it. Usually a mistyped year.
  if (date > isoToday(today)) {
    return {
      ok: false,
      reason: `Incident date ${date} is in the future. Check the year on that row.`,
    }
  }
  return { ok: true, date, ambiguous: parsed.ambiguous }
}

function isoToday(today: Date): string {
  return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`
}

/** Match the value against each spelling we accept; null if none of them fit. */
function interpret(value: string, today: Date): DateParts | IncidentDateRejection | null {
  const iso = ISO.exec(value)
  if (iso) {
    return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]), ambiguous: false }
  }

  const numeric = NUMERIC.exec(value)
  if (numeric) {
    const split = splitNumeric(Number(numeric[1]), Number(numeric[2]), numeric[3], today)
    return split ?? { ok: false, reason: `"${truncate(value)}" is not a real calendar date. Check the day and month are the right way round.` }
  }

  const monthFirst = MONTH_FIRST.exec(value)
  if (monthFirst) {
    const month = monthNumber(monthFirst[1])
    if (month) {
      return { year: Number(monthFirst[3]), month, day: Number(monthFirst[2]), ambiguous: false }
    }
  }

  const dayFirst = DAY_FIRST.exec(value)
  if (dayFirst) {
    const month = monthNumber(dayFirst[2])
    if (month) {
      return { year: Number(dayFirst[3]), month, day: Number(dayFirst[1]), ambiguous: false }
    }
  }

  if (BARE_NUMBER.test(value)) return excelSerial(value)

  return null
}

/**
 * A bare number in a date column.
 *
 * Converted when it is plausibly an Excel serial, and named as the specific
 * mistake it is otherwise. This is the case the old parser got most wrong:
 * `new Date('45000')` is valid, so these rows imported rather than failing, and
 * the attorney had no way to know their date column had not been read.
 */
function excelSerial(value: string): DateParts | IncidentDateRejection {
  const serial = Math.trunc(Number(value))
  if (serial >= EXCEL_SERIAL_MIN && serial <= EXCEL_SERIAL_MAX) {
    const stamp = new Date(EXCEL_EPOCH_MS + serial * 86_400_000)
    return {
      year: stamp.getUTCFullYear(),
      month: stamp.getUTCMonth() + 1,
      day: stamp.getUTCDate(),
      ambiguous: false,
    }
  }
  if (serial >= EARLIEST_YEAR && serial <= 2200) {
    return {
      ok: false,
      reason: `"${value}" is a year, not a date. Give the full date of loss as YYYY-MM-DD.`,
    }
  }
  return {
    ok: false,
    reason: `"${truncate(value)}" is a number, not a date. If that column holds Excel dates, format it as a date before exporting.`,
  }
}

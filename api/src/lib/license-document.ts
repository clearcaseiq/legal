/**
 * Reading a bar number off an uploaded licence document.
 *
 * Uploading a document used to verify nothing: the file was stored and no
 * process ever read it, so an attorney who supplied a perfectly good bar card
 * sat unverified waiting on a review that did not exist. Extracting the number
 * turns the document into something the automatic State Bar lookup can act on.
 *
 * The extraction refuses to guess, which matters more here than coverage. A
 * licence card, a State Bar printout and a certificate are covered in numbers —
 * dates, ZIP codes, phone numbers, certificate ids, fee amounts — and picking
 * the wrong one does not fail visibly. It resolves to *somebody's* licence, and
 * with the name comparison in `bar-license-identity` that surfaces as "this
 * licence belongs to someone else", sending an attorney to look for a typo they
 * never made. So only a number that is explicitly labelled as a bar number
 * counts, and an ambiguous document yields nothing.
 */
import { normalizeBarNumber } from './attorney-identity'

/**
 * Labels that precede a bar number on the documents attorneys actually upload.
 *
 * `SBN` is included because it is how California pleadings write it. Bare "No."
 * and "Number" are not: they appear against certificate ids and member numbers
 * that are not bar numbers.
 */
const BAR_NUMBER_LABELS = [
  'state bar (?:license |licence |member |licensee )?(?:number|no\\.?|#)',
  'bar (?:license |licence |member |licensee )?(?:number|no\\.?|#)',
  'license(?:e)? (?:number|no\\.?|#)',
  'licence(?:e)? (?:number|no\\.?|#)',
  'attorney (?:number|no\\.?|#)',
  'sbn',
]

/**
 * A label, optional punctuation, then the digits.
 *
 * Capped at 12 digits before normalisation so a run of digits longer than any
 * bar number is rejected outright rather than being truncated into a plausible
 * one — `normalizeBarNumber` would otherwise never see how long it really was.
 */
const BAR_NUMBER_PATTERN = new RegExp(
  `(?:${BAR_NUMBER_LABELS.join('|')})\\s*[:.#-]?\\s*(\\d{1,12})`,
  'gi',
)

/** Documents that name a state bar other than California cannot be checked. */
const CALIFORNIA_HINTS = [/state bar of california/i, /california state bar/i, /\bcalifornia\b/i]

export interface LicenseDocumentReading {
  /** Digits only, or null when nothing was labelled clearly enough to trust. */
  barNumber: string | null
  /** 'CA' when the document names California, otherwise null. */
  state: string | null
  /**
   * Why no number came back, for logging and for telling the attorney something
   * more useful than "we could not read it".
   */
  reason?: 'no_text' | 'no_labelled_number' | 'ambiguous' | 'implausible'
}

/**
 * Pull a bar number out of document text.
 *
 * Two distinct labelled numbers means the document is not telling us one thing,
 * so nothing is returned. That is deliberately stricter than taking the first
 * match: a State Bar printout listing several licensees would otherwise verify
 * the attorney against whichever one the regex reached first.
 */
export function readLicenseDocument(text: string | null | undefined): LicenseDocumentReading {
  const source = String(text ?? '')
  if (!source.trim()) return { barNumber: null, state: null, reason: 'no_text' }

  const state = CALIFORNIA_HINTS.some((pattern) => pattern.test(source)) ? 'CA' : null

  const raw = Array.from(source.matchAll(BAR_NUMBER_PATTERN)).map((match) => match[1])
  if (raw.length === 0) return { barNumber: null, state, reason: 'no_labelled_number' }

  const normalized = raw.map((value) => normalizeBarNumber(value)).filter((v): v is string => v !== null)
  if (normalized.length === 0) return { barNumber: null, state, reason: 'implausible' }

  const distinct = Array.from(new Set(normalized))
  if (distinct.length > 1) return { barNumber: null, state, reason: 'ambiguous' }

  return { barNumber: distinct[0], state }
}

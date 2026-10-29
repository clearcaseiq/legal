/**
 * Reversible de-identification of LLM prompts.
 *
 * Until a BAA with the model vendor is signed (LLM_ALLOW_PHI=false), medical
 * content may go to the model only with the claimant's identifiers removed,
 * following the HIPAA Safe Harbor list: names, dates finer than the year,
 * geography below the state, contact details, and record/claim/policy/account
 * numbers. Each identifier becomes a placeholder such as `[NAME#1]` or
 * `[DATE#2 2026 +45d]`, and `restore` puts the originals back into the model's
 * answer, so a caller gets real names and dates in its output while the vendor
 * only ever saw placeholders.
 *
 * Dates keep their year and their distance in days from the earliest date in
 * the same request, so the model can still reason about treatment gaps and
 * timelines. Ages over 89 collapse to "90+" and are not restored.
 *
 * Free text can name people we have no way to recognise. Names we do know (the
 * claimant's, passed as `subject.names`) are always caught; other names are
 * caught when they follow a title, a greeting or a label like "Patient:".
 */

export type LlmSubject = {
  /** People to remove wherever they appear: the claimant, a relative, the attorney. */
  names?: Array<string | null | undefined>
  /** Known places finer than a state: the incident location, the claimant's city or county. */
  places?: Array<string | null | undefined>
  /** False when the answer is fed onward rather than shown to a person (e.g. an image prompt). */
  restore?: boolean
}

type Kind = 'NAME' | 'DATE' | 'PLACE' | 'ZIP' | 'ID' | 'EMAIL' | 'PHONE' | 'SSN' | 'ADDRESS' | 'URL' | 'IP' | 'VIN'

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}
const MONTH = '(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
const NAME_WORD = "[A-Z][A-Za-z'\\-]+"

const ISO_DATE_RE = /\b(\d{4})-(\d{1,2})-(\d{1,2})(?:T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?\b/g
const US_DATE_RE = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4}|\d{2})\b/g
const MONTH_DAY_RE = new RegExp(`\\b${MONTH}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'gi')
const DAY_MONTH_RE = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH}\\.?,?(?:\\s+(\\d{4}))?\\b`, 'gi')
const MONTH_YEAR_RE = new RegExp(`\\b${MONTH}\\.?,?\\s+(\\d{4})\\b`, 'gi')

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/gi
const IP_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
const SSN_RE = /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g
const PHONE_RE = /(?:\+?1[-.\s]?)?(?:\(\d{3}\)\s?|\b\d{3}[-.\s])\d{3}[-.\s]\d{4}\b/g
const STREET_RE =
  /\b\d{1,6}\s+(?:[A-Za-z0-9.#]+\s+){0,5}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Circle|Cir|Highway|Hwy|Parkway|Pkwy)\b\.?(?:,?\s+(?:Apt|Unit|Suite|Ste|#)\.?\s*[A-Za-z0-9-]+)?/g
const STREET_NAME_RE =
  /\b(?:[A-Z][a-z]+\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Court|Ct|Highway|Hwy|Parkway|Pkwy)\b/g
const LABELED_ID_RE =
  /\b(MRN|medical\s+record(?:\s+(?:no|number))?|patient\s+(?:id|no|number|acct)|account(?:\s+(?:no|number))?|acct|claim(?:\s+(?:no|number))?|policy(?:\s+(?:no|number))?|member\s+(?:id|no|number)|group\s+(?:no|number)|subscriber\s+id|license(?:\s+(?:no|number))?|DL|plate(?:\s+(?:no|number))?|case\s+(?:no|number)|invoice(?:\s+(?:no|number))?|encounter(?:\s+(?:id|no))?|visit\s+(?:id|no)|NPI|DEA)\.?[\s#:-]*([A-Z0-9][A-Z0-9-]{3,})\b/gi
const VIN_RE = /\b[A-HJ-NPR-Z0-9]{17}\b/g
const ZIP_AFTER_STATE_RE = /\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/g
const ZIP_LABELED_RE = /\b(zip(?:\s*code)?|postal\s+code)\s*[:#]?\s*(\d{5}(?:-\d{4})?)\b/gi
const ZIP4_RE = /\b\d{5}-\d{4}\b/g
const COUNTY_RE = /\b((?:[A-Z][a-z]+\s+){0,2}[A-Z][a-z]+)\s+(County|Parish)\b/g
const TITLED_NAME_RE = new RegExp(`\\b(Mr|Mrs|Ms|Miss|Mx)\\.?\\s+(${NAME_WORD}(?:\\s+${NAME_WORD})?)`, 'g')
const GREETING_NAME_RE = new RegExp(`\\b(Hi|Hello|Dear|Hey|Thanks|Thank you)(,?\\s+)(${NAME_WORD})(?=[\\s,.!:]|$)`, 'g')
const BIRTH_CUE_RE = /(?:DOB|D\.O\.B\.?|date\s+of\s+birth|birth\s*date|born)\W{0,6}$/i
const LABELED_NAME_RE = new RegExp(
  `\\b(Patient|Name|Client|Claimant|Plaintiff|Insured|Guarantor|Policyholder|Subscriber|Employee|Injured\\s+party)(\\s+name)?\\s*[:\\-]\\s*(${NAME_WORD}(?:,?\\s+(?:[A-Z]\\.|${NAME_WORD})){0,3})`,
  'gi',
)
const OLD_AGE_RES = [
  /\b(?:9\d|1[01]\d)(?=[-\s]?(?:years?|yrs?)(?:[-\s]old)?\b|\s?y\/?o\b)/gi,
  /\b(age[d]?\s*:?\s*)(?:9\d|1[01]\d)\b/gi,
]
const TOKEN_RE = /\[(NAME|DATE|PLACE|ZIP|ID|EMAIL|PHONE|SSN|ADDRESS|URL|IP|VIN)#(\d+)[^\]\n]{0,32}\]/g

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function twoDigitYear(y: string): number {
  const n = Number(y)
  if (y.length === 4) return n
  const thisYear = new Date().getUTCFullYear() % 100
  return n <= thisYear + 1 ? 2000 + n : 1900 + n
}

function validDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

type ParsedDate = { y: number | null; m: number; d: number | null }

function parseDateMatch(re: RegExp, match: RegExpExecArray): ParsedDate | null {
  if (re === ISO_DATE_RE) {
    const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
    return validDate(y, m, d) ? { y, m, d } : null
  }
  if (re === US_DATE_RE) {
    const [m, d, y] = [Number(match[1]), Number(match[2]), twoDigitYear(match[3])]
    return validDate(y, m, d) ? { y, m, d } : null
  }
  if (re === MONTH_DAY_RE) {
    const m = MONTHS[match[1].slice(0, 3).toLowerCase()]
    const d = Number(match[2])
    const y = match[3] ? Number(match[3]) : null
    return validDate(y ?? 2000, m, d) ? { y, m, d } : null
  }
  if (re === DAY_MONTH_RE) {
    const d = Number(match[1])
    const m = MONTHS[match[2].slice(0, 3).toLowerCase()]
    const y = match[3] ? Number(match[3]) : null
    return validDate(y ?? 2000, m, d) ? { y, m, d } : null
  }
  if (re === MONTH_YEAR_RE) {
    const m = MONTHS[match[1].slice(0, 3).toLowerCase()]
    const y = Number(match[2])
    return y >= 1900 && y <= 2100 ? { y, m, d: null } : null
  }
  return null
}

const DATE_RES = [ISO_DATE_RE, US_DATE_RE, MONTH_DAY_RE, DAY_MONTH_RE, MONTH_YEAR_RE]

function isBirthDate(text: string, index: number): boolean {
  return BIRTH_CUE_RE.test(text.slice(Math.max(0, index - 30), index))
}

function dayNumber(p: ParsedDate): number | null {
  if (p.y == null || p.d == null) return null
  return Math.round(Date.UTC(p.y, p.m - 1, p.d) / 86_400_000)
}

export type LlmDeidentifier = {
  mask(text: string): string
  restore(text: string): string
  /** Number of identifiers replaced so far, for logging. */
  count(): number
}

/**
 * One instance per request: the same identifier gets the same placeholder in
 * every message, and `restore` only knows this request's placeholders.
 */
export function createLlmDeidentifier(subject: LlmSubject = {}, corpus: string[] = []): LlmDeidentifier {
  const byKey = new Map<string, string>()
  const originals = new Map<string, string>()
  const counters: Partial<Record<Kind, number>> = {}

  // The anchor for "+Nd" offsets: the earliest full date in the request that is
  // not a birth date. Offsets from a birth date would spell out the exact age.
  let anchor: number | null = null
  for (const text of corpus) {
    for (const re of DATE_RES) {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(text))) {
        if (isBirthDate(text, m.index)) continue
        const parsed = parseDateMatch(re, m)
        const day = parsed ? dayNumber(parsed) : null
        if (day != null && (anchor == null || day < anchor)) anchor = day
      }
    }
  }

  function token(kind: Kind, key: string, original: string, suffix = ''): string {
    const mapKey = `${kind}|${key}|${suffix}`
    let tok = byKey.get(mapKey)
    if (!tok) {
      const sameIdentity = [...byKey.entries()].find(([k]) => k.startsWith(`${kind}|${key}|`))
      const n = sameIdentity ? sameIdentity[1].match(/#(\d+)/)![1] : String((counters[kind] = (counters[kind] ?? 0) + 1))
      tok = `[${kind}#${n}${suffix ? ` ${suffix}` : ''}]`
      byKey.set(mapKey, tok)
    }
    if (!originals.has(tok)) originals.set(tok, original)
    return tok
  }

  const people = (subject.names || [])
    .map((n) => String(n || '').trim())
    .filter((n) => n.length >= 2)
  const places = (subject.places || [])
    .map((p) => String(p || '').trim())
    .filter((p) => p.length >= 3)
    .sort((a, b) => b.length - a.length)

  function maskNames(text: string): string {
    // Full names before their parts, so "Maria Lopez" becomes one placeholder.
    const fullNames = [...new Set(people.filter((n) => /\s/.test(n)))].sort((a, b) => b.length - a.length)
    fullNames.forEach((full) => {
      const id = full.toLowerCase()
      text = text.replace(new RegExp(`\\b${escapeRegExp(full)}\\b`, 'gi'), (m) => token('NAME', id, m))
      const parts = full.split(/\s+/)
      if (parts.length >= 2) {
        const reversed = `${parts[parts.length - 1]},\\s*${parts.slice(0, -1).map(escapeRegExp).join('\\s+')}`
        text = text.replace(new RegExp(`\\b${reversed}\\b`, 'gi'), (m) => token('NAME', id, m))
      }
    })
    const parts = new Map<string, { id: string; suffix: string }>()
    for (const full of people) {
      const words = full.split(/\s+/).filter((w) => w.length >= 2)
      const id = full.toLowerCase()
      if (words.length === 1) parts.set(words[0], { id, suffix: '' })
      else {
        parts.set(words[0], { id, suffix: 'first' })
        parts.set(words[words.length - 1], { id, suffix: 'last' })
      }
    }
    for (const [word, { id, suffix }] of parts) {
      // Case-sensitive on the capitalised form: "Will" the name, not "will" the verb.
      const cap = word.charAt(0).toUpperCase() + word.slice(1)
      const forms = [...new Set([cap, word.toUpperCase()])].map(escapeRegExp).join('|')
      text = text.replace(new RegExp(`\\b(?:${forms})\\b`, 'g'), (m) => token('NAME', id, m, suffix))
    }
    return text
  }

  function maskDates(text: string): string {
    for (const re of DATE_RES) {
      text = text.replace(re, (...args) => {
        const m = args.slice(0, -2) as unknown as RegExpExecArray
        const offset = args[args.length - 2] as number
        const whole = args[args.length - 1] as string
        const parsed = parseDateMatch(re, m)
        if (!parsed) return args[0]
        const key = `${parsed.y ?? '?'}-${parsed.m}-${parsed.d ?? '?'}`
        const day = dayNumber(parsed)
        const birth = isBirthDate(whole, offset)
        // Safe Harbor: a year that puts someone over 89 is itself an identifier.
        const showYear = parsed.y != null && parsed.y > new Date().getUTCFullYear() - 90
        const parts: string[] = []
        if (showYear) parts.push(String(parsed.y))
        if (showYear && !birth && day != null && anchor != null) parts.push(`${day - anchor >= 0 ? '+' : ''}${day - anchor}d`)
        return token('DATE', key, args[0], parts.join(' '))
      })
    }
    return text
  }

  function mask(input: string): string {
    if (!input) return input
    let text = String(input)
    text = text.replace(EMAIL_RE, (m) => token('EMAIL', m.toLowerCase(), m))
    text = text.replace(URL_RE, (m) => token('URL', m, m))
    text = text.replace(IP_RE, (m) => (m.split('.').every((o) => Number(o) <= 255) ? token('IP', m, m) : m))
    text = text.replace(SSN_RE, (m) => token('SSN', m.replace(/\D/g, ''), m))
    text = text.replace(LABELED_ID_RE, (_m, label: string, value: string) =>
      /\d/.test(value) ? `${label} ${token('ID', value.toUpperCase(), value)}` : _m,
    )
    text = text.replace(VIN_RE, (m) => (/\d/.test(m) && /[A-Z]/.test(m) ? token('VIN', m, m) : m))
    text = text.replace(PHONE_RE, (m) => token('PHONE', m.replace(/\D/g, '').slice(-10), m))
    text = text.replace(STREET_RE, (m) => token('ADDRESS', m.toLowerCase(), m))
    text = text.replace(STREET_NAME_RE, (m) => token('PLACE', m.toLowerCase(), m, 'street'))
    text = text.replace(ZIP_LABELED_RE, (_m, label: string, zip: string) => `${label} ${token('ZIP', zip, zip)}`)
    text = text.replace(ZIP_AFTER_STATE_RE, (_m, state: string, zip: string) => `${state} ${token('ZIP', zip, zip)}`)
    text = text.replace(ZIP4_RE, (m) => token('ZIP', m, m))
    text = maskDates(text)
    for (const re of OLD_AGE_RES) {
      text = text.replace(re, (m, prefix?: string) => (typeof prefix === 'string' ? `${prefix}90+` : '90+'))
    }
    for (const place of places) {
      text = text.replace(new RegExp(`\\b${escapeRegExp(place)}\\b`, 'gi'), (m) => token('PLACE', place.toLowerCase(), m))
    }
    text = text.replace(COUNTY_RE, (m) => token('PLACE', m.toLowerCase(), m, 'county'))
    text = maskNames(text)
    text = text.replace(TITLED_NAME_RE, (_m, title: string, name: string) => `${title}. ${token('NAME', name.toLowerCase(), name)}`)
    text = text.replace(LABELED_NAME_RE, (_m, label: string, nameWord: string | undefined, name: string) =>
      name.startsWith('[') ? _m : `${label}${nameWord || ''}: ${token('NAME', name.toLowerCase().replace(/[,\s]+/g, ' '), name)}`,
    )
    text = text.replace(GREETING_NAME_RE, (_m, greeting: string, sep: string, name: string) => `${greeting}${sep}${token('NAME', name.toLowerCase(), name)}`)
    return text
  }

  function restore(text: string): string {
    if (!text || originals.size === 0) return text
    const byNumber = new Map<string, string>()
    for (const [tok, original] of originals) {
      const m = tok.match(/^\[([A-Z]+)#(\d+)/)
      if (m && !byNumber.has(`${m[1]}#${m[2]}`)) byNumber.set(`${m[1]}#${m[2]}`, original)
    }
    return text.replace(TOKEN_RE, (tok, kind: string, n: string) => originals.get(tok) ?? byNumber.get(`${kind}#${n}`) ?? tok)
  }

  return { mask, restore, count: () => originals.size }
}

/**
 * Put originals back into a model answer. JSON answers are restored value by
 * value so an original containing a quote cannot break the document.
 */
export function restoreLlmAnswer(deid: LlmDeidentifier, content: string): string {
  try {
    const parsed = JSON.parse(content)
    const walk = (v: unknown): unknown =>
      typeof v === 'string'
        ? deid.restore(v)
        : Array.isArray(v)
          ? v.map(walk)
          : v && typeof v === 'object'
            ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
            : v
    return JSON.stringify(walk(parsed))
  } catch {
    return deid.restore(content)
  }
}

/** One-shot, irreversible: for text that leaves the process and never comes back. */
export function deidentifyForLlm(text: string, subject: LlmSubject = {}): string {
  return createLlmDeidentifier(subject, [text]).mask(text)
}

/** Attach to a chat.completions body; the client wrapper reads it and strips it before sending. */
export const LLM_SUBJECT = Symbol.for('clearcaseiq.llmSubject')

export function withLlmSubject<T extends object>(body: T, subject: LlmSubject): T {
  Object.defineProperty(body, LLM_SUBJECT, { value: subject, enumerable: false })
  return body
}

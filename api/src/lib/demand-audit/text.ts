/** Text helpers shared by the deterministic rules and claim verification. */

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?'

const DATE_PATTERNS: Array<{ re: RegExp; parse: (m: RegExpExecArray) => [number, number, number] | null }> = [
  {
    re: new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'gi'),
    parse: (m) => [Number(m[3]), monthIndex(m[1]), Number(m[2])],
  },
  {
    re: new RegExp(`\\b(\\d{1,2})\\s+${MONTH_RE}\\s+(\\d{4})\\b`, 'gi'),
    parse: (m) => [Number(m[3]), monthIndex(m[2]), Number(m[1])],
  },
  { re: /\b(\d{4})-(\d{2})-(\d{2})\b/g, parse: (m) => [Number(m[1]), Number(m[2]), Number(m[3])] },
  {
    re: /\b(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/g,
    parse: (m) => [m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]), Number(m[1]), Number(m[2])],
  },
]

function monthIndex(name: string): number {
  const key = name.toLowerCase().replace('.', '').slice(0, 3)
  return MONTHS.findIndex((m) => m.startsWith(key)) + 1
}

export interface DateMention {
  iso: string
  raw: string
  index: number
}

/** Every calendar date printed in `text`, as YYYY-MM-DD. */
export function datesIn(text: string): DateMention[] {
  const out: DateMention[] = []
  const taken: Array<[number, number]> = []
  for (const { re, parse } of DATE_PATTERNS) {
    re.lastIndex = 0
    for (let m = re.exec(text); m; m = re.exec(text)) {
      const start = m.index
      const end = start + m[0].length
      if (taken.some(([a, b]) => start < b && end > a)) continue
      const parts = parse(m)
      if (!parts) continue
      const [y, mo, d] = parts
      if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) continue
      const date = new Date(Date.UTC(y, mo - 1, d))
      if (date.getUTCMonth() !== mo - 1) continue
      taken.push([start, end])
      out.push({ iso: date.toISOString().slice(0, 10), raw: m[0], index: start })
    }
  }
  return out.sort((a, b) => a.index - b.index)
}

export function isoDay(d: Date | string | null | undefined): string | null {
  if (!d) return null
  const date = typeof d === 'string' ? new Date(d) : d
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

export function longDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

/** The letter as sentences, each with its offset, never crossing a line break. */
export function sentencesOf(content: string): Array<{ text: string; index: number }> {
  const out: Array<{ text: string; index: number }> = []
  let offset = 0
  for (const line of content.split('\n')) {
    const parts = line.split(/(?<=[.!?])\s+(?=[A-Z("\u201c])/)
    let within = 0
    for (const part of parts) {
      const at = line.indexOf(part, within)
      const text = part.trim()
      if (text) out.push({ text, index: offset + Math.max(0, at) })
      within = Math.max(0, at) + part.length
    }
    offset += line.length + 1
  }
  return out
}

export function sentenceAt(content: string, index: number): string {
  const all = sentencesOf(content)
  let hit = all[0]?.text ?? ''
  for (const s of all) {
    if (s.index <= index) hit = s.text
    else break
  }
  return hit
}

export function norm(text: string | null | undefined): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Whether every word of `phrase` (normalized) appears in `haystackNorm` as a whole word sequence. */
export function hasPhrase(haystackNorm: string, phrase: string): boolean {
  const p = norm(phrase)
  if (!p) return false
  return ` ${haystackNorm} `.includes(` ${p} `)
}

export const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

/** Dollar amounts printed in `text`, rounded to whole dollars. */
export function dollarsIn(text: string): Array<{ value: number; raw: string; index: number }> {
  const out: Array<{ value: number; raw: string; index: number }> = []
  for (const m of text.matchAll(/\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g)) {
    out.push({ value: Number(`${m[1].replace(/,/g, '')}.${m[2] || '0'}`), raw: m[0], index: m.index ?? 0 })
  }
  return out
}

/** A short window of `text` around `index`, for quoting a record. */
export function snippet(text: string, index: number, length = 160): string {
  const start = Math.max(0, index - Math.floor(length / 3))
  return text.slice(start, start + length).replace(/\s+/g, ' ').trim()
}

export const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

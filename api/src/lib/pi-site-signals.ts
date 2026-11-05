/**
 * Keyword evidence read from a law firm's website: whether it practises
 * personal injury, and on which side.
 *
 * Shared by the staging scan (`scripts/enrich-staged-pi-websites.ts`) and the
 * second-pass review (`scripts/review-unconfirmed-pi.ts`) so both apply the
 * same rules to the same text.
 */

export const PI_KEYWORDS = [
  'personal injury', 'car accident', 'auto accident', 'truck accident',
  'motorcycle accident', 'pedestrian accident', 'bicycle accident',
  'slip and fall', 'premises liability', 'dog bite', 'animal attack',
  'wrongful death', 'medical malpractice', 'birth injury',
  'product liability', 'defective product', 'brain injury',
  'spinal cord injury', 'catastrophic injury', 'nursing home abuse',
  'elder abuse', 'construction accident', 'workplace injury',
  'workers compensation', 'insurance claim', 'uninsured motorist',
  'underinsured', 'bodily injury', 'pain and suffering',
  'no win no fee', 'no recovery no fee', 'free consultation',
  'injury attorney', 'injury lawyer', 'accident attorney', 'accident lawyer',
  'tort', 'negligence', 'settlement', 'compensation',
  'rideshare accident', 'uber accident', 'lyft accident',
  'hit and run', 'drunk driving accident', 'dui accident',
  'mass tort', 'class action injury',
]

// Only phrases a defense firm uses about itself. Plaintiff sites routinely say
// "defending victims' rights" or mention "defense counsel" on the other side.
export const DEFENSE_KEYWORDS = [
  'insurance defense', 'defense litigation', 'defend insurers', 'represent insurers',
  'representing insurers', 'defense of insurance', 'civil defense', 'defense of claims',
  'defending businesses', 'self-insured', 'third-party administrators', 'we represent employers',
  'claims professionals', 'risk managers', 'on behalf of insurers', 'defense of employers',
  'defense firm',
]

/**
 * Business-side phrasing that is not defense vocabulary as such but means the
 * firm's clients are carriers or companies. Used only where there is no
 * plaintiff fee language to outweigh it.
 */
export const BUSINESS_SIDE_KEYWORDS = [
  'insurance carriers', 'our insurance clients', 'coverage counsel', 'coverage litigation',
  'coverage opinions', 'subrogation', 'we defend', 'defend companies', 'defending companies',
  'defense of personal injury', 'defending personal injury', 'bad faith defense',
  'employers and insurers', 'carriers and their insureds', 'fortune 500',
]

/** Bios often say "began her career at an insurance defense firm"; that is history, not the firm's side. */
const CAREER_CONTEXT = /(former|formerly|previously|prior to|worked|working as|began|career|years (at|with|as|of)|followed by|before (joining|founding|starting|opening)|started (at|as|with)|spent)/

export function hasCurrentPhrase(text: string, phrase: string): boolean {
  let from = 0
  for (;;) {
    const i = text.indexOf(phrase, from)
    if (i < 0) return false
    if (!CAREER_CONTEXT.test(text.slice(Math.max(0, i - 90), i))) return true
    from = i + phrase.length
  }
}

/**
 * Fee and intake language only a plaintiff-side firm uses. Defense firms' sites
 * describe injury work too ("product liability", "wrongful death") but never
 * offer a free consultation or a contingency fee. CAALA admits only attorneys
 * who primarily represent plaintiffs, so membership counts too.
 */
export const PLAINTIFF_KEYWORDS = [
  'free consultation', 'free consult', 'free case evaluation', 'free case review', 'free case assessment',
  'free evaluation', 'no fee unless', 'no fees unless', 'no win no fee', 'no win, no fee',
  'no recovery no fee', 'no recovery, no fee', 'contingency', 'you pay nothing', 'no upfront',
  'no up-front', "don't pay unless", 'do not pay unless', "you don't pay", 'we only get paid',
  "we don't get paid unless", 'injury victims', 'accident victims', 'have you been injured',
  'were you injured', "if you've been injured", 'if you have been injured', 'injured in an accident',
  'compensation you deserve', 'fight the insurance compan', 'fight insurance compan',
  'take on the insurance compan', 'recovered for our clients', 'million recovered',
  'millions recovered', 'billion recovered', 'consumer attorneys association of los angeles',
  'caala member', 'member of caala', 'consumer attorneys of california',
]

export const STRONG_PI_KEYWORDS = [
  'personal injury', 'car accident', 'auto accident', 'truck accident',
  'motorcycle accident', 'pedestrian accident', 'bicycle accident',
  'slip and fall', 'premises liability', 'dog bite', 'wrongful death',
  'medical malpractice', 'birth injury', 'product liability', 'brain injury',
  'spinal cord injury', 'catastrophic injury', 'nursing home abuse',
  'construction accident', 'workplace injury', 'workers compensation',
  'injury attorney', 'injury lawyer', 'accident attorney', 'accident lawyer',
  'bodily injury', 'rideshare accident', 'uber accident', 'mass tort',
]

export type PiSiteSignals = {
  isPi: boolean
  isDefense: boolean
  isPlaintiff: boolean
  isBusinessSide: boolean
  matchedKeywords: string[]
  strongKeywords: string[]
  plaintiffKeywords: string[]
  defenseKeywords: string[]
  businessKeywords: string[]
}

export function detectPiFromText(text: string): PiSiteSignals {
  const lower = text.toLowerCase()
  const matched = PI_KEYWORDS.filter((kw) => lower.includes(kw))
  const strongMatched = STRONG_PI_KEYWORDS.filter((kw) => lower.includes(kw))
  const defenseMatched = DEFENSE_KEYWORDS.filter((kw) => hasCurrentPhrase(lower, kw))
  const businessMatched = BUSINESS_SIDE_KEYWORDS.filter((kw) => hasCurrentPhrase(lower, kw))
  const plaintiffMatched = PLAINTIFF_KEYWORDS.filter((kw) => lower.includes(kw))
  return {
    isPi: strongMatched.length >= 1 && matched.length >= 2,
    isDefense: defenseMatched.length > 0,
    isPlaintiff: plaintiffMatched.length > 0,
    isBusinessSide: businessMatched.length > 0,
    matchedKeywords: matched,
    strongKeywords: strongMatched,
    plaintiffKeywords: plaintiffMatched,
    defenseKeywords: defenseMatched,
    businessKeywords: businessMatched,
  }
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 120000)
}

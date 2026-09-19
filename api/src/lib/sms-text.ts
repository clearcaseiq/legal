/**
 * Keep outbound SMS inside the GSM-7 alphabet.
 *
 * A single character outside GSM 03.38 switches the whole message to UCS-2,
 * which cuts a concatenated segment from 153 characters to 67. The case offer
 * was 213 characters and billed as four segments where two would do, entirely
 * because the value range was written with an en dash: `$17k–$37k`.
 *
 * That is the failure worth designing against. It is invisible in review — an
 * en dash and a hyphen look alike in most editors, and the message renders
 * correctly on every handset — so it survives indefinitely and is reintroduced
 * by the next person who types a nicely punctuated string. Sanitizing at
 * `sendSms` rather than in the templates means a template cannot get it wrong.
 *
 * Transliteration only. Nothing here drops a character a reader would miss;
 * anything unmapped is left alone and correctly forces UCS-2, because a message
 * that arrives mangled is worse than a message that costs twice as much.
 */

/**
 * GSM 03.38, basic set plus the extension table.
 *
 * Extension characters (`^{}\[~]|€`) each occupy two septets rather than one,
 * so they cost double. They are rare enough in our templates not to be worth
 * modelling separately, and counting them as one only understates a segment
 * count that is already conservative elsewhere.
 */
const GSM7_ALPHABET = new Set(
  '@£$¥èéùìòÇ\nØø\rÅå\u0394_\u03a6\u0393\u039b\u03a9\u03a0\u03a8\u03a3\u0398\u039eÆæßÉ' +
    ' !"#¤%&\'()*+,-./0123456789:;<=>?¡' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿' +
    'abcdefghijklmnopqrstuvwxyzäöñüà' +
    '^{}\\[~]|€'
)

/**
 * The characters that actually turn up in our copy, and their plain-ASCII
 * equivalents.
 *
 * Every one of these arrives the same way: pasted from a document, or produced
 * by an editor's smart punctuation. They are all cosmetic, so replacing them
 * changes nothing a recipient would notice.
 */
const TRANSLITERATIONS: Array<[RegExp, string]> = [
  [/[\u2010-\u2015\u2212]/g, '-'], // hyphens, en/em dashes, minus sign
  [/[\u2018\u2019\u201a\u201b\u2032]/g, "'"], // curly single quotes, prime
  [/[\u201c\u201d\u201e\u201f\u2033]/g, '"'], // curly double quotes
  [/\u2026/g, '...'],
  [/[\u00b7\u2022]/g, '-'], // middle dot, bullet
  [/[\u00a0\u2007\u2009\u202f]/g, ' '], // non-breaking and thin spaces
  [/\u2122/g, 'TM'],
  [/\u00ae/g, '(R)'],
  [/\u00a9/g, '(C)'],
  [/[\u2044\u2215]/g, '/'],
  [/\u00bd/g, '1/2'],
  [/\u00bc/g, '1/4'],
  [/\u00be/g, '3/4'],
  [/[\u2192\u21d2]/g, '->'],
  [/\u00d7/g, 'x'],
  [/\u2013/g, '-'],
]

/** Replace the punctuation that would force UCS-2 with GSM-7 equivalents. */
export function toGsm7(text: string): string {
  let out = text
  for (const [pattern, replacement] of TRANSLITERATIONS) {
    out = out.replace(pattern, replacement)
  }
  return out
}

/** True when every character can be sent as GSM-7. */
export function isGsm7(text: string): boolean {
  for (const char of text) {
    if (!GSM7_ALPHABET.has(char)) return false
  }
  return true
}

export interface SmsCost {
  encoding: 'GSM-7' | 'UCS-2'
  characters: number
  segments: number
}

/**
 * What a message will cost to send.
 *
 * Single-segment limits are 160 and 70; past that every segment gives up space
 * to a concatenation header and the limits become 153 and 67. Reported so the
 * logs show when a template has quietly grown a segment.
 */
export function smsCost(text: string): SmsCost {
  const gsm7 = isGsm7(text)
  const characters = [...text].length
  const single = gsm7 ? 160 : 70
  const multi = gsm7 ? 153 : 67
  return {
    encoding: gsm7 ? 'GSM-7' : 'UCS-2',
    characters,
    segments: characters <= single ? 1 : Math.ceil(characters / multi),
  }
}

/**
 * Nothing above ASCII may reach the PDF content stream.
 *
 * The stream is written as UTF-8 while the fonts are WinAnsi Helvetica, so a
 * single stray codepoint renders as mojibake in a document sent to claimants.
 * The regression that prompted these tests shipped a bullet separator: the
 * severity row read "3 injured areas â€¢ MRI / imaging" in production.
 */
import { describe, expect, it } from 'vitest'
import { __testing } from './reportPdfExports'

const { toPdfAscii } = __testing

/** The guarantee the PDF writer depends on, asserted directly. */
function isPureAscii(value: string): boolean {
  return /^[\x20-\x7E\n]*$/.test(value)
}

describe('toPdfAscii', () => {
  it('replaces the bullet separator that shipped corrupted', () => {
    expect(toPdfAscii('3 injured areas \u2022 MRI / imaging')).toBe('3 injured areas - MRI / imaging')
  })

  it('still handles the dashes, quotes and ellipsis it always did', () => {
    expect(toPdfAscii('a \u2014 b')).toBe('a - b')
    expect(toPdfAscii('\u201Cquoted\u201D')).toBe('"quoted"')
    expect(toPdfAscii("it\u2019s")).toBe("it's")
    expect(toPdfAscii('more\u2026')).toBe('more...')
    expect(toPdfAscii('a\u00A0b')).toBe('a b')
  })

  it('spells out symbols the copy uses rather than dropping them', () => {
    expect(toPdfAscii('Bobby \u2192 Serry')).toBe('Bobby -> Serry')
    expect(toPdfAscii('\u00B130%')).toBe('+/-30%')
    expect(toPdfAscii('\u2265 $50,000')).toBe('>= $50,000')
  })

  it('reduces accented names to their base letters, not to question marks', () => {
    expect(toPdfAscii('Jos\u00E9 N\u00FA\u00F1ez')).toBe('Jose Nunez')
    expect(toPdfAscii('Ren\u00E9e Beaulieu')).toBe('Renee Beaulieu')
  })

  it('leaves plain ASCII exactly as it was', () => {
    const plain = 'Wet floor/spill - property owner may be liable. $12,500 (60%)'
    expect(toPdfAscii(plain)).toBe(plain)
  })

  it('guarantees ASCII output for characters nobody listed', () => {
    // The point of the catch-all: these were never enumerated anywhere.
    for (const exotic of ['\u4F60\u597D', '\uD83D\uDE00', '\u20AC500', '\u0416']) {
      expect(isPureAscii(toPdfAscii(exotic))).toBe(true)
    }
  })

  it('keeps a currency figure visible rather than silently deleting the symbol', () => {
    // "500" alone would read as a correct number in the wrong currency.
    expect(toPdfAscii('\u00A5500')).toBe('?500')
  })

  it('drops zero-width characters instead of turning them into noise', () => {
    expect(toPdfAscii('Smith\u200BLaw')).toBe('SmithLaw')
  })

  it('holds for every non-ASCII character in the real copy', () => {
    const sampled = [
      '\u2014', '\u2013', '\u2022', '\u2192', '\u2026',
      '\u00B7', '\u2715', '\u2019', '\u25CB', '\u00A7',
      '\u201C', '\u201D', '\u00A0',
    ]
    for (const char of sampled) {
      expect(isPureAscii(toPdfAscii(`before ${char} after`))).toBe(true)
    }
  })
})

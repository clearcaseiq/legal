import { describe, it, expect } from 'vitest'
import en from '../i18n/locales/en.json'
import es from '../i18n/locales/es.json'
import zh from '../i18n/locales/zh.json'

/**
 * Guards the attorney pricing claims against what the platform actually sells.
 *
 * The network page previously said "There is nothing else to buy and no add-on
 * tier" while the billing page sold monthly subscriptions, lead credits and
 * five levels of featured placement, the top of which is called Champion Boost.
 * That is the kind of claim that reads as puffery internally and as a
 * misrepresentation to an attorney deciding whether to join.
 *
 * The rest of the pricing copy is accurate and deliberately left alone: review
 * really is free, the fee really is charged only on accept, and it really does
 * not vary with the value of the case.
 */

const LOCALES: Array<[string, Record<string, unknown>]> = [
  ['en', en as Record<string, unknown>],
  ['es', es as Record<string, unknown>],
  ['zh', zh as Record<string, unknown>],
]

function attorneyCopy(bundle: Record<string, unknown>): string {
  const section = bundle.attorneyNet
  if (!section) throw new Error('attorneyNet section missing')
  return JSON.stringify(section).toLowerCase()
}

describe('attorney pricing copy', () => {
  it('never claims there is nothing else to buy', () => {
    // Subscriptions, lead credits and featured placement are all purchasable.
    const ABSOLUTE_CLAIMS = [
      /nothing else to buy/,
      /no add-on tier/,
      /nada m[aá]s que comprar/,
      /niveles adicionales/,
      /没有其他需要购买/,
      /没有附加套餐/,
    ]
    for (const [name, bundle] of LOCALES) {
      const copy = attorneyCopy(bundle)
      for (const claim of ABSOLUTE_CLAIMS) {
        expect(copy, `${name} claims nothing else is for sale`).not.toMatch(claim)
      }
    }
  })

  it('still discloses that a fee is charged on accept', () => {
    // "No pay-per-lead" is only honest while it sits next to this.
    for (const [name, bundle] of LOCALES) {
      const section = bundle.attorneyNet as Record<string, string>
      expect(section.feeNote, `${name} has no fee disclosure`).toBeTruthy()
      expect(section.onlyFee, `${name} has no fee heading`).toBeTruthy()
    }
    expect((en.attorneyNet as Record<string, string>).feeNote.toLowerCase()).toMatch(
      /charged only when you accept/,
    )
  })

  it('does not claim the fee is a percentage or varies with case value', () => {
    // The flat-fee promise is load-bearing: it is what distinguishes this from
    // fee splitting, which attorneys cannot do.
    const copy = attorneyCopy(en as Record<string, unknown>)
    expect(copy).toMatch(/never a percentage/)
  })
})

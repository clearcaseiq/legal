import { describe, expect, it } from 'vitest'
import { splitFactSegments } from './FactList'

/**
 * The real thing, copied from a case in the queue: intake's `buildNarrative`
 * joined a dozen separate answers with ". " and the specialist got a wall.
 */
const COMPOSED_NARRATIVE = [
  'Vehicle accident — Car accident',
  'Incident date: 2026-08-09',
  'Location: Los Angeles, CA',
  'Last month, I was involved in a serious car accident that caused significant disruption to my daily life. The accident occurred when another vehicle collided with my car, resulting in substantial damage and physical injuries.',
  'Moderate (doctor visit)',
  'Other',
  'Body parts: Upper back, Head / concussion, Neck',
  'Medical bills: $10,000 - $50,000',
  'crashType: not_sure',
  'faultParty: not_sure',
].join('. ')

describe('splitFactSegments', () => {
  it('gives each labelled answer its own row', () => {
    const rows = splitFactSegments(COMPOSED_NARRATIVE)

    expect(rows).toContain('Incident date: 2026-08-09.')
    expect(rows).toContain('Location: Los Angeles, CA.')
    expect(rows).toContain('Body parts: Upper back, Head / concussion, Neck.')
    expect(rows).toContain('Medical bills: $10,000 - $50,000.')
    expect(rows).toContain('crashType: not_sure.')
    expect(rows).toContain('faultParty: not_sure')
  })

  it("keeps the claimant's own prose as one paragraph", () => {
    const rows = splitFactSegments(COMPOSED_NARRATIVE)
    const prose = rows.find((row) => row.startsWith('Last month'))

    // Both sentences of the account, together — the sentence breaks there are
    // the writing, not a separator between facts.
    expect(prose).toContain('caused significant disruption to my daily life.')
    expect(prose).toContain('resulting in substantial damage and physical injuries.')
  })

  it('leaves a value that is a single fact alone', () => {
    expect(splitFactSegments('Los Angeles, CA')).toEqual(['Los Angeles, CA'])
    expect(splitFactSegments('Medical bills: $10,000 - $50,000')).toEqual([
      'Medical bills: $10,000 - $50,000',
    ])
  })

  it('does not split money or decimals', () => {
    expect(splitFactSegments('Policy limit: $10,000.50 per person')).toEqual([
      'Policy limit: $10,000.50 per person',
    ])
  })

  it('honours newlines an author put in', () => {
    expect(splitFactSegments('First line\nSecond line')).toEqual(['First line Second line'])
    expect(splitFactSegments('Date: 2026-01-01\nVenue: Los Angeles')).toEqual([
      'Date: 2026-01-01',
      'Venue: Los Angeles',
    ])
  })

  it('does not treat a sentence that merely contains a colon as a label', () => {
    const text =
      'I told the officer the following: that the other driver ran the light and never braked at all. He wrote it down.'
    const rows = splitFactSegments(text)

    // Six words before the colon is a clause, not a field label.
    expect(rows).toHaveLength(1)
  })

  it('still splits the longest label intake emits', () => {
    const rows = splitFactSegments(
      'Body parts: Neck. Other injuries (in their words): my left hand goes numb at night. Medical bills: $10,000 - $50,000',
    )

    expect(rows).toEqual([
      'Body parts: Neck.',
      'Other injuries (in their words): my left hand goes numb at night.',
      'Medical bills: $10,000 - $50,000',
    ])
  })

  it('returns nothing for an empty value', () => {
    expect(splitFactSegments('')).toEqual([])
    expect(splitFactSegments('   ')).toEqual([])
  })
})

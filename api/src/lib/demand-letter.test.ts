import { describe, expect, it, vi, beforeEach } from 'vitest'

const { createCompletion } = vi.hoisted(() => ({ createCompletion: vi.fn() }))

// LLM_ALLOW_PHI must be true to exercise the AI narration path; demand narration
// is clinical and is gated behind the BAA flag (see narrateDemandLetter).
vi.mock('../env', () => ({
  ENV: { OPENAI_API_KEY: 'test-openai-key', OPENAI_ANALYSIS_MODEL: 'gpt-4o-mini', LLM_ALLOW_PHI: true },
}))

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: createCompletion } }
  },
}))

import {
  acceptNarratedSection,
  buildDemandLetterSections,
  generateDemandLetter,
  moneyMentions,
  narrateDemandLetter,
  renderDemandLetter,
} from './demand-letter'

const assessment = { venueState: 'CA', venueCounty: 'Los Angeles', claimType: 'Motor Vehicle' }
const facts = {
  incident: { date: 'March 3, 2026', narrative: 'Rear-ended at a red light on Vine.' },
  injuries: ['cervical strain', 'lumbar strain'],
  damages: { med_charges: 12400, wage_loss: 3200 },
}
const baseInput = {
  assessment,
  facts,
  targetAmount: 60000,
  recipient: { name: 'Adjuster Smith', address: '1 Carrier Way' },
}

describe('buildDemandLetterSections', () => {
  it('puts every figure in the letter from case data', () => {
    const letter = generateDemandLetter(baseInput)
    expect(letter).toContain('$12,400')
    expect(letter).toContain('$3,200')
    expect(letter).toContain('$60,000')
    expect(letter).toContain('Re: Personal Injury Claim — Date of Incident March 3, 2026')
  })

  it('emits every required section', () => {
    const letter = generateDemandLetter(baseInput)
    for (const heading of [
      'ACCIDENT SUMMARY',
      'LIABILITY',
      'MEDICAL TREATMENT TIMELINE AND RECORDS',
      'TOTAL MEDICAL BILLS',
      'LOST WAGES',
      'PAIN AND SUFFERING',
      'SUMMARY OF DAMAGES',
      'DEMAND',
    ]) {
      expect(letter).toContain(heading)
    }
  })

  it('writes a self-help letter in the first person', () => {
    const letter = generateDemandLetter({ ...baseInput, mode: 'pro_se' })
    expect(letter).toContain('SETTLEMENT DEMAND')
    expect(letter).toContain('I am writing on my own behalf')
    expect(letter).not.toContain('We represent')
  })

  it('derives general damages as the demand less specials', () => {
    const sections = buildDemandLetterSections(baseInput)
    // 60000 - (12400 + 3200) = 44400
    expect(sections.damagesSummary.join('\n')).toContain('$44,400')
  })
})

describe('moneyMentions', () => {
  it('finds and normalises dollar figures', () => {
    expect(moneyMentions('We demand $60,000 against $12,400 in bills')).toEqual([
      '$60000',
      '$12400',
      '$60000',
      '$12400',
    ])
  })

  it('catches a bare figure with no dollar sign', () => {
    expect(moneyMentions('bills exceeding 40,000 to date')).toContain('$40000')
    expect(moneyMentions('bills exceeding 40000 to date')).toContain('$40000')
  })

  it('catches an amount written as words', () => {
    expect(moneyMentions('a loss of roughly forty thousand dollars')).toEqual(['thousand', 'dollars'])
    expect(moneyMentions('a six-figure wage loss')).toEqual(['figure'])
  })

  it('ignores small numbers that are not amounts', () => {
    expect(moneyMentions('respond within thirty (30) days after 3 visits')).toEqual([])
  })

  it('returns nothing for prose with no figures', () => {
    expect(moneyMentions('Liability is clear.')).toEqual([])
  })
})

describe('acceptNarratedSection', () => {
  const allowed = new Set(['$60000', '$12400'])
  const original = 'Your insured rear-ended our client at a red light and liability is not in dispute here.'

  it('accepts a clean rewrite', () => {
    const rewrite = 'Your insured struck our client from behind at a controlled intersection. Liability is not seriously in dispute.'
    expect(acceptNarratedSection(original, rewrite, allowed)).toBe(rewrite)
  })

  it('rejects a rewrite that invents a dollar figure', () => {
    const rewrite =
      'Your insured rear-ended our client, who has incurred medical bills exceeding $85,000 to date and continues to treat.'
    expect(acceptNarratedSection(original, rewrite, allowed)).toBe(original)
  })

  it('accepts a rewrite that restates a figure already in the letter', () => {
    const rewrite =
      'Your insured rear-ended our client at a red light, causing $12,400 in documented medical charges and ongoing pain.'
    expect(acceptNarratedSection(original, rewrite, allowed)).toBe(rewrite)
  })

  it('rejects a figure smuggled in without a dollar sign', () => {
    const rewrite =
      'Your insured rear-ended our client, whose medical bills have now climbed past 85,000 and continue to accrue.'
    expect(acceptNarratedSection(original, rewrite, allowed)).toBe(original)
  })

  it('rejects an amount written out as words', () => {
    const rewrite =
      'Your insured rear-ended our client, causing a loss well into the tens of thousands of dollars and ongoing pain.'
    expect(acceptNarratedSection(original, rewrite, allowed)).toBe(original)
  })

  it('rejects an empty or truncated rewrite', () => {
    expect(acceptNarratedSection(original, '', allowed)).toBe(original)
    expect(acceptNarratedSection(original, 'Liability clear.', allowed)).toBe(original)
    expect(acceptNarratedSection(original, null, allowed)).toBe(original)
  })
})

describe('narrateDemandLetter', () => {
  beforeEach(() => {
    createCompletion.mockReset()
  })

  const context = { assessmentId: 'a1', claimType: 'Motor Vehicle', venue: 'Los Angeles, CA', injuries: ['neck'] }

  it('applies rewritten prose and reports an AI source', async () => {
    createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              intro: 'We represent the claimant in this matter and write to demand settlement of the claim in full.',
              accidentSummary: 'Your insured struck our client from behind while she was stopped at a red light.',
              liability:
                'Your insured owed a duty of care, breached it by failing to stop, and caused every injury described below.',
              painAndSuffering:
                'Our client endured months of pain that disrupted her work, her sleep, and her time with her family.',
            }),
          },
        },
      ],
    })

    const sections = buildDemandLetterSections(baseInput)
    const result = await narrateDemandLetter(sections, context)

    expect(result.source).toBe('ai')
    expect(result.sections.liability).toContain('breached it by failing to stop')
    // Numeric sections are never sent for rewriting, so they must be untouched.
    expect(result.sections.medicalBills).toBe(sections.medicalBills)
    expect(result.sections.damagesSummary).toEqual(sections.damagesSummary)
    expect(result.sections.demandParagraph).toBe(sections.demandParagraph)
  })

  it('discards a section that invents a figure but keeps the clean ones', async () => {
    createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              liability: 'Our client has incurred $250,000 in damages and your insured is plainly at fault for all of it.',
              painAndSuffering:
                'Our client endured months of pain that disrupted her work, her sleep, and her time with her family.',
            }),
          },
        },
      ],
    })

    const sections = buildDemandLetterSections(baseInput)
    const result = await narrateDemandLetter(sections, context)

    expect(result.sections.liability).toBe(sections.liability)
    expect(result.sections.painAndSuffering).toContain('disrupted her work')
    expect(renderDemandLetter(result.sections)).not.toContain('$250,000')
  })

  it('falls back to the deterministic letter when the model fails', async () => {
    createCompletion.mockRejectedValue(new Error('upstream down'))

    const sections = buildDemandLetterSections(baseInput)
    const result = await narrateDemandLetter(sections, context)

    expect(result.source).toBe('deterministic')
    expect(result.sections).toEqual(sections)
  })

  it('falls back when the response is not valid JSON', async () => {
    createCompletion.mockResolvedValue({ choices: [{ message: { content: 'not-json' } }] })

    const sections = buildDemandLetterSections(baseInput)
    const result = await narrateDemandLetter(sections, context)

    expect(result.source).toBe('deterministic')
  })

  it('falls back when every rewritten section is rejected', async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ liability: 'Pay $999,999 now.' }) } }],
    })

    const sections = buildDemandLetterSections(baseInput)
    const result = await narrateDemandLetter(sections, context)

    expect(result.source).toBe('deterministic')
    expect(result.sections).toEqual(sections)
  })
})

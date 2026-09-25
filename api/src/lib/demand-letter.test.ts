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
  type DemandCaseRecord,
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

  it('renders no case-tab blocks when there is no case record', () => {
    const letter = generateDemandLetter(baseInput)
    expect(letter).not.toContain('ENCLOSURES')
    expect(letter).not.toContain('See Exhibit')
    expect(letter).not.toContain('FUTURE MEDICAL CARE')
    expect(letter).not.toContain('OTHER ECONOMIC DAMAGES')
  })
})

describe('buildDemandLetterSections with the case tabs', () => {
  const caseRecord: DemandCaseRecord = {
    clientName: 'Jane Test',
    attorney: { name: 'Mike Pence', firmName: 'Pence Law', phone: '555-0100', email: 'mike@pence.law' },
    claim: { carrierName: 'State Farm', claimNumber: 'SF-123', policyNumber: 'POL-9', adjusterName: 'Ann Adjuster' },
    liability: {
      faultTheory: 'Defendant ran the red light and struck our client broadside.',
      faultPosture: 'admitted',
      comparativeNegPct: 0,
      defendantName: 'Bob Driver',
      policeReportStatus: 'received',
      policeReportNumber: 'LA-778',
      citationIssuedTo: 'defendant',
      witnessCount: 2,
      hasPhotos: true,
      hasVideo: false,
    },
    medical: {
      entries: [
        { provider: 'City ER', visitType: 'er', startDate: '2026-03-03T00:00:00Z', endDate: null, diagnosis: 'Neck strain', billedAmount: 2100 },
        { provider: 'Bay Ortho', specialty: 'Orthopedics', visitType: 'follow_up', startDate: '2026-03-20T00:00:00Z', endDate: '2026-05-01T00:00:00Z' },
        { provider: 'Spine Center', visitType: 'surgery', startDate: null, endDate: null, isFuture: true, billedAmount: 45000 },
      ],
      status: { treatmentStatus: 'mmi', mmi: true, mmiDate: '2026-06-01T00:00:00Z', symptoms: ['neck pain'], futureTreatment: 'Cervical fusion recommended.' },
    },
    damageItems: [
      { category: 'medical', description: 'ER visit', amount: 2100, provider: 'City ER', incurredAt: '2026-03-03T00:00:00Z' },
      { category: 'medical', description: 'Orthopedic care', amount: 5400, provider: 'Bay Ortho' },
      { category: 'lost_wages', description: 'Six weeks missed', amount: 4800, provider: 'Acme Co' },
      { category: 'future_medical', description: 'Cervical fusion', amount: 45000 },
      { category: 'property_damage', description: 'Vehicle repair', amount: 6200, provider: 'Joe Auto' },
    ],
    exhibits: [
      { number: 1, section: 'liability', label: 'Police / incident report (report.pdf)' },
      { number: 2, section: 'treatment', label: 'Medical records (er.pdf)' },
      { number: 3, section: 'bills', label: 'Medical bill (er-bill.pdf)' },
      { number: 4, section: 'bills', label: 'Medical bill (ortho-bill.pdf)' },
    ],
  }
  const letter = generateDemandLetter({ ...baseInput, targetAmount: 150000, caseRecord })

  it('puts the client, insured, and claim details in the Re line', () => {
    expect(letter).toContain('Our Client: Jane Test')
    expect(letter).toContain('Your Insured: Bob Driver')
    expect(letter).toContain('Claim No.: SF-123')
    expect(letter).toContain('Policy No.: POL-9')
  })

  it('uses the Liability tab theory and its evidence', () => {
    expect(letter).toContain('Defendant ran the red light')
    expect(letter).toContain('Bob Driver admitted fault.')
    expect(letter).toContain('Report No. LA-778')
    expect(letter).toContain('2 independent witnesses corroborate')
  })

  it('builds the timeline from the Medical tab with MMI and complaints', () => {
    expect(letter).toContain('City ER: Er — Dx: Neck strain — $2,100')
    expect(letter).toContain('Bay Ortho (Orthopedics)')
    expect(letter).toContain('reached maximum medical improvement on June 1, 2026')
    expect(letter).toContain('Ongoing complaints: neck pain.')
  })

  it('itemizes bills, wages, future care, and other damages from the Damages tab', () => {
    expect(letter).toContain('- City ER — ER visit (Mar 3, 2026): $2,100')
    expect(letter).toContain('Total medical charges to date: $7,500.')
    expect(letter).toContain('- Acme Co — Six weeks missed: $4,800')
    expect(letter).toContain('FUTURE MEDICAL CARE')
    expect(letter).toContain('Cervical fusion recommended.')
    expect(letter).toContain('OTHER ECONOMIC DAMAGES')
    expect(letter).toContain('- Joe Auto — Vehicle repair: $6,200')
    expect(letter).toContain('- Property damage: $6,200')
  })

  it('derives general damages from the itemized specials', () => {
    // 150000 - (7500 + 4800 + 45000 + 6200) = 86500
    expect(letter).toContain('- Pain and suffering (general damages): $86,500')
  })

  it('cites exhibits in their sections and lists them as enclosures', () => {
    const liabilityAt = letter.indexOf('LIABILITY')
    const billsAt = letter.indexOf('TOTAL MEDICAL BILLS')
    expect(letter.indexOf('See Exhibit 1.')).toBeGreaterThan(liabilityAt)
    expect(letter.indexOf('See Exhibits 3–4.')).toBeGreaterThan(billsAt)
    expect(letter).toContain('ENCLOSURES')
    expect(letter).toContain('Exhibit 4 — Medical bill (ortho-bill.pdf)')
  })

  it('signs with the assigned attorney', () => {
    expect(letter).toContain('Mike Pence\nPence Law')
    expect(letter).not.toContain('[Attorney Name]')
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

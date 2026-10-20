import { describe, expect, it } from 'vitest'
import { quoteOnPage, retrievePages, settleStatus, verifyDemandClaims, type Complete, type SourcePage } from './claims'
import { CLEAN_LETTER } from './fixtures'

const PAGES: SourcePage[] = [
  {
    fileId: 'f-police',
    fileName: '01_Police_Report.pdf',
    exhibit: 1,
    page: 1,
    text: 'Traffic Collision Report. Party 2 rear-ended Party 1 at low speed. Citations: None. No witnesses were identified.',
  },
  { fileId: 'f-med', fileName: '02_Medical_Records.pdf', exhibit: 2, page: 1, text: 'Bay Area Urgent Care. Assessment: cervical strain. X-ray of the cervical spine: normal.' },
  { fileId: 'f-med', fileName: '02_Medical_Records.pdf', exhibit: 2, page: 2, text: 'Pacific Physical Therapy. Assessment: thoracic strain.' },
  { fileId: 'f-photo', fileName: 'Hinton.jpg', exhibit: 4, page: 1, text: 'HINTON LAW GROUP - Injured? Call 1-800-555-0100 - No fee unless we win' },
]

/** A model that answers each prompt from a script, by what the prompt asks. */
function scripted(answers: { decompose: unknown; verify?: (prompt: string) => unknown; relevance?: unknown }): Complete {
  return async (_system, user) => {
    if (user.includes('Split the demand letter')) return JSON.stringify(answers.decompose)
    if (user.includes('Check each claim')) return JSON.stringify(answers.verify?.(user) ?? { results: [] })
    if (user.includes('exhibits enclosed')) return JSON.stringify(answers.relevance ?? { irrelevant: [] })
    return null
  }
}

const citeSentence =
  'The other driver was cited for following too closely, and a witness confirmed the account.'
const dxSentence = 'Stephen Hawking was seen at Bay Area Urgent Care on October 13, 2026 and diagnosed with a cervical strain (Ex. 2, p. 1).'

describe('claim verification', () => {
  it('accepts a quote only when it is printed on the page', () => {
    expect(quoteOnPage('Assessment: cervical strain', PAGES[1])).toBe('Assessment: cervical strain')
    expect(quoteOnPage('Assessment: herniated disc', PAGES[1])).toBeNull()
    expect(quoteOnPage('strain', PAGES[1])).toBeNull()
  })

  it('AT-020: a verdict without a validated passage is unverifiable, never supported', () => {
    expect(settleStatus('supported', [])).toBe('unverifiable')
    expect(settleStatus('contradicted', [])).toBe('unverifiable')
    expect(settleStatus('garbage', [])).toBe('unverifiable')
    expect(settleStatus('unsupported', [])).toBe('unsupported')
  })

  it('retrieves the page a claim cites and the pages that share its terms', () => {
    const idx = retrievePages(
      { id: 'C1', sentence: dxSentence, claim: 'Diagnosed with cervical strain', type: 'diagnosis', material: true, cites: [{ exhibit: 2, page: 2 }] },
      PAGES,
    )
    expect(idx[0]).toBe(2)
    expect(idx).toContain(1)
  })

  it('AT-003/AT-004: contradicted citation and witness claims become critical findings with the conflicting passage', async () => {
    const run = await verifyDemandClaims({
      letter: CLEAN_LETTER,
      pages: PAGES,
      exhibits: [],
      today: '2026-10-20',
      budgetMs: 5000,
      complete: scripted({
        decompose: {
          claims: [
            { sentence: citeSentence, claim: 'The other driver was cited', type: 'police_citation', material: true, cites: [{ exhibit: 1, page: null }] },
            { sentence: citeSentence, claim: 'A witness confirmed the account', type: 'witness', material: true, cites: [] },
          ],
        },
        verify: (prompt) => {
          const s = /\[(S\d+)\] 01_Police_Report\.pdf/.exec(prompt)?.[1]
          return {
            results: [
              { id: 'C1', status: 'contradicted', conflict: [{ source: s, quote: 'Citations: None.' }], explanation: 'The report records no citation.' },
              { id: 'C2', status: 'contradicted', conflict: [{ source: s, quote: 'No witnesses were identified.' }] },
            ],
          }
        },
      }),
    })
    expect(run.status).toBe('ok')
    const rules = run.findings.map((f) => f.ruleId).sort()
    expect(rules).toEqual(['DQA-101', 'DQA-102'])
    expect(run.findings.find((f) => f.ruleId === 'DQA-101')?.evidence?.[0]).toMatchObject({ role: 'conflict', exhibit: 1, page: 1, quote: 'Citations: None.' })
  })

  it('drops an invented quote and a sentence the letter does not contain', async () => {
    const run = await verifyDemandClaims({
      letter: CLEAN_LETTER,
      pages: PAGES,
      exhibits: [],
      today: '2026-10-20',
      budgetMs: 5000,
      complete: scripted({
        decompose: {
          claims: [
            { sentence: dxSentence, claim: 'MRI showed a herniated disc', type: 'imaging', material: true, cites: [] },
            { sentence: 'The client will never walk again.', claim: 'Permanent paralysis', type: 'permanence_future_care', material: true, cites: [] },
          ],
        },
        verify: (prompt) => {
          const s = /\[(S\d+)\] 02_Medical_Records\.pdf/.exec(prompt)?.[1]
          return { results: [{ id: 'C1', status: 'supported', support: [{ source: s, quote: 'MRI: herniated disc at C5-6' }] }] }
        },
      }),
    })
    expect(run.claims).toHaveLength(1)
    expect(run.claims[0].status).toBe('unverifiable')
    expect(run.findings.map((f) => f.ruleId)).toEqual(['DQA-204'])
  })

  it('AT-019: conflicting diagnoses keep both passages until a reviewer decides', async () => {
    const run = await verifyDemandClaims({
      letter: CLEAN_LETTER,
      pages: PAGES,
      exhibits: [],
      today: '2026-10-20',
      budgetMs: 5000,
      complete: scripted({
        decompose: { claims: [{ sentence: dxSentence, claim: 'Diagnosed with a cervical strain', type: 'diagnosis', material: true, cites: [] }] },
        verify: (prompt) => {
          const p1 = /\[(S\d+)\] 02_Medical_Records\.pdf \(Exhibit 2\), page 1/.exec(prompt)?.[1]
          const p2 = /\[(S\d+)\] 02_Medical_Records\.pdf \(Exhibit 2\), page 2/.exec(prompt)?.[1]
          return {
            results: [
              {
                id: 'C1',
                status: 'contradicted',
                support: [{ source: p1, quote: 'Assessment: cervical strain.' }],
                conflict: [{ source: p2, quote: 'Assessment: thoracic strain.' }],
              },
            ],
          }
        },
      }),
    })
    const f = run.findings[0]
    expect(f.ruleId).toBe('DQA-201')
    expect(f.evidence?.map((e) => e.role).sort()).toEqual(['conflict', 'support'])
  })

  it('AT-011: a promotional photo enclosed as an exhibit is DQA-401', async () => {
    const run = await verifyDemandClaims({
      letter: CLEAN_LETTER,
      pages: PAGES,
      exhibits: [
        { number: 1, label: 'Police report', category: 'police_report', text: PAGES[0].text },
        { number: 4, label: 'Accident photo (Hinton.jpg)', category: 'photos', text: PAGES[3].text },
      ],
      today: '2026-10-20',
      budgetMs: 5000,
      complete: scripted({
        decompose: { claims: [] },
        relevance: { irrelevant: [{ exhibit: 4, reason: 'A law-firm advertisement, not a photo of the accident.' }, { exhibit: 9, reason: 'not enclosed' }] },
      }),
    })
    expect(run.findings).toHaveLength(1)
    expect(run.findings[0]).toMatchObject({ ruleId: 'DQA-401', title: 'Exhibit 4 does not belong in the demand' })
  })

  it('AT-024: a model that does not answer in time fails closed', async () => {
    const run = await verifyDemandClaims({
      letter: CLEAN_LETTER,
      pages: PAGES,
      exhibits: [],
      today: '2026-10-20',
      budgetMs: 30,
      complete: () => new Promise(() => undefined),
    })
    expect(run.status).toBe('timeout')
    expect(run.findings).toEqual([])
  })
})

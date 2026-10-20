import { describe, expect, it } from 'vitest'
import { buildDemandSources, diagnosesOf } from '../super-demand'
import { legalAuthoritiesIn, runDeterministicRules } from './deterministic'
import { CLEAN_LETTER, baseContext, baseFiles, baseInput } from './fixtures'
import { resolutionRefusal, severityOf } from './rules'

const rulesOf = (input = baseInput()) => runDeterministicRules(input)
const ids = (input = baseInput()) => rulesOf(input).map((f) => f.ruleId)

describe('Demand Quality Audit: clean regression case', () => {
  it('raises nothing on a letter that matches its record', () => {
    expect(rulesOf()).toEqual([])
  })
})

describe('Demand Quality Audit: seeded regression defects (CCIQ-BPX79C)', () => {
  it('AT-001: treatment on March 15, 1988 for an October 12, 2026 accident is a critical DQA-004', () => {
    const ctx = baseContext()
    ctx.caseRecord.medical!.entries.push({ provider: 'Bay Area Urgent Care', visitType: 'urgent_care', startDate: '1988-03-15', endDate: null })
    const hit = rulesOf(baseInput({ ctx })).find((f) => f.ruleId === 'DQA-004')
    expect(hit?.title).toContain('March 15, 1988')
    expect(severityOf('DQA-004')).toBe('critical')
  })

  it('AT-002: a record dating the accident October 15 against the case October 12 is a critical DQA-003', () => {
    const files = baseFiles()
    files[0].ocrText = files[0].ocrText!.replace('Date of Collision: 10/12/2026', 'Date of Collision: 10/15/2026')
    const hit = rulesOf(baseInput({ files })).find((f) => f.ruleId === 'DQA-003')
    expect(hit?.title).toContain('October 15, 2026')
    expect(hit?.detail).toContain('October 12, 2026')
    expect(hit?.evidence?.[0]).toMatchObject({ role: 'conflict', fileId: 'f-police', exhibit: 1 })

    const letter = CLEAN_LETTER.replace('On October 12, 2026, Stephen', 'On October 15, 2026, Stephen')
    expect(rulesOf(baseInput({ content: letter })).some((f) => f.ruleId === 'DQA-003' && f.key === 'letter-date:2026-10-15')).toBe(true)
    expect(severityOf('DQA-003')).toBe('critical')
  })

  it('AT-003: a citation the police report says was never issued is a critical DQA-101', () => {
    const ctx = baseContext()
    ctx.caseRecord.liability!.citationIssuedTo = null
    const files = baseFiles()
    files[0].ocrText = 'Traffic Collision Report. Date of Collision: 10/12/2026. Citations: None. Witness name: Jane Roe.'
    const hit = rulesOf(baseInput({ ctx, files })).find((f) => f.ruleId === 'DQA-101')
    expect(hit).toMatchObject({ support: 'contradicted', key: 'citation-contradicted' })
    expect(hit?.evidence?.[0].quote).toContain('Citations: None')
  })

  it('AT-004: a witness with no source is a critical DQA-102', () => {
    const ctx = baseContext()
    ctx.caseRecord.liability!.witnessCount = 0
    const files = baseFiles()
    files[0].ocrText = files[0].ocrText!.replace(' Witness name: Jane Roe.', '')
    expect(ids(baseInput({ ctx, files }))).toContain('DQA-102')
    expect(severityOf('DQA-102')).toBe('critical')
  })

  it('AT-005: "serious injuries" in place of the documented diagnoses raises DQA-210', () => {
    const letter = CLEAN_LETTER.replace(' and diagnosed with a cervical strain', '').replace(' for a thoracic strain', ' for his serious injuries')
    expect(ids(baseInput({ content: letter })).filter((id) => id === 'DQA-210')).toHaveLength(2)
  })

  it('AT-006: cervical and thoracic strains are both carried, each with its page', () => {
    const ctx = baseContext()
    expect(diagnosesOf(ctx)).toEqual(['Cervical strain', 'Thoracic strain'])
    const visits = buildDemandSources(ctx.caseRecord).filter((s) => s.kind === 'visit')
    expect(visits.map((v) => [v.ref, v.quote])).toEqual([
      ['Ex. 2, p. 1', 'Assessment: cervical strain.'],
      ['Ex. 2, p. 2', 'Assessment: thoracic strain.'],
    ])
  })

  it('AT-007: $4,175 billed is not presumed paid or recoverable', () => {
    expect(ids()).not.toContain('DQA-303')
    const letter = CLEAN_LETTER.replace('Medical specials (billed charges):', 'Mr. Hawking has paid $4,175 for his care.')
    const hit = rulesOf(baseInput({ content: letter })).find((f) => f.ruleId === 'DQA-303')
    expect(hit?.title).toContain('$4,175')
  })

  it('AT-008: $100,000 wage loss with no payroll evidence is a critical DQA-304', () => {
    const ctx = baseContext()
    ctx.sections.totals = { ...ctx.sections.totals!, lostWages: 100000, specials: 104175 }
    const hit = rulesOf(baseInput({ ctx })).find((f) => f.ruleId === 'DQA-304')
    expect(hit?.title).toContain('$100,000')
    expect(severityOf('DQA-304')).toBe('critical')
  })

  it('AT-009: $100k + $20k categories against a $100k total is a critical DQA-305', () => {
    const letter = CLEAN_LETTER.replace(
      'Economic damages: $4,175\nGeneral damages: $20,825\nTotal damages: $25,000',
      'Economic damages: $100,000\nNon-economic damages: $20,000\nTotal damages: $100,000',
    )
    const hit = rulesOf(baseInput({ content: letter })).find((f) => f.ruleId === 'DQA-305')
    expect(hit?.detail).toContain('$120,000')
  })

  it('AT-010: a $25,000 demand without attorney approval is a critical DQA-306 that cannot be dismissed', () => {
    const hit = rulesOf(baseInput({ approvedDemandAmount: null })).find((f) => f.ruleId === 'DQA-306')
    expect(hit?.key).toBe('demand-unapproved')
    expect(resolutionRefusal('DQA-306', 'attorney_judgment', 'x'.repeat(40), { isAttorney: true })).toContain('Approve the demand amount')
  })

  it('AT-012: November encounters treated as complete on October 20 are a critical DQA-005', () => {
    const ctx = baseContext()
    ctx.caseRecord.medical!.entries.push({ provider: 'Pacific Physical Therapy', visitType: 'physical_therapy', startDate: '2026-11-05', endDate: null })
    const letter = CLEAN_LETTER.replace('See Exhibit 2.', 'He attended physical therapy on November 5, 2026. See Exhibit 2.')
    const hits = rulesOf(baseInput({ ctx, content: letter })).filter((f) => f.ruleId === 'DQA-005')
    expect(hits.map((h) => h.key).sort()).toEqual(['future-entry:pacific physical therapy:2026-11-05', 'future-text:2026-11-05'])
  })

  it('AT-012: scheduled care described as scheduled is not flagged', () => {
    const letter = CLEAN_LETTER.replace('See Exhibit 2.', 'A follow-up is scheduled for November 5, 2026. See Exhibit 2.')
    expect(ids(baseInput({ content: letter }))).not.toContain('DQA-005')
  })

  it('AT-013: a medical file printed with another case ID is a critical DQA-002', () => {
    const files = baseFiles()
    files[1].ocrText = `Case ID: CCIQ-ZZ12QX. ${files[1].ocrText}`
    const hit = rulesOf(baseInput({ files })).find((f) => f.ruleId === 'DQA-002')
    expect(hit?.title).toContain('CCIQ-ZZ12QX')
  })

  it('AT-014: nonsense text in the damages section raises DQA-407', () => {
    const letter = CLEAN_LETTER.replace('Economic damages: $4,175', 'Economic damages: $4,175\nxkcd qzvbn wrtpl damages brrrr')
    expect(ids(baseInput({ content: letter }))).toContain('DQA-407')
  })

  it('AT-016: a citation to a page the exhibit does not have is a critical DQA-403', () => {
    const letter = CLEAN_LETTER.replace('(Ex. 2, p. 2)', '(Ex. 2, p. 7)')
    const hit = rulesOf(baseInput({ content: letter })).find((f) => f.ruleId === 'DQA-403')
    expect(hit?.detail).toContain('2 pages')
  })
})

describe('Demand Quality Audit: general acceptance', () => {
  it('AT-018: a duplicate bill upload and duplicate ledger lines are counted once', () => {
    const files = [...baseFiles(), { ...baseFiles()[2], id: 'f-bills-2', originalName: '05_Itemized_Medical_Bills_Stephen_Hawking (1).pdf' }]
    const ctx = baseContext()
    ctx.caseRecord.exhibits!.push({ number: 4, section: 'bills', label: 'Medical bill (copy)', fileId: 'f-bills-2' })
    ctx.caseRecord.damageItems!.push({ ...ctx.caseRecord.damageItems![0] })
    const found = ids(baseInput({ ctx, files, content: CLEAN_LETTER.replace('See Exhibit 3.', 'See Exhibits 3, 4.') }))
    expect(found).toContain('DQA-010')
    expect(found).toContain('DQA-308')
  })

  it('AT-021: a case citation must be verified by an attorney before release', () => {
    const letter = CLEAN_LETTER.replace(
      'Please respond within 30 days.',
      'A rear driver is presumed negligent. Smith v. Jones, 123 Cal. App. 4th 456 (2004). Please respond within 30 days.',
    )
    expect(legalAuthoritiesIn(letter).map((a) => a.text)[0]).toContain('Smith v. Jones, 123 Cal. App. 4th 456')
    const hit = rulesOf(baseInput({ content: letter })).find((f) => f.ruleId === 'DQA-405')
    expect(severityOf('DQA-405')).toBe('critical')
    expect(hit?.support).toBe('unverifiable')
  })

  it('finds statutes and reporter citations', () => {
    const found = legalAuthoritiesIn('Under Cal. Vehicle Code § 21703, and see 45 Cal. 3d 100, the duty is clear.').map((a) => a.text)
    expect(found).toEqual(['Cal. Vehicle Code § 21703', '45 Cal. 3d 100'])
  })

  it('flags reliance on another state\u2019s law', () => {
    const letter = CLEAN_LETTER.replace('Please respond', 'Under Texas law the driver is liable. Please respond')
    expect(rulesOf(baseInput({ content: letter })).find((f) => f.ruleId === 'DQA-008')?.key).toBe('foreign-law:TX')
  })

  it('flags an amount that traces to nothing on the case', () => {
    const letter = CLEAN_LETTER.replace('See Exhibit 3.', 'He also lost $3,333 in personal property. See Exhibit 3.')
    expect(rulesOf(baseInput({ content: letter })).find((f) => f.ruleId === 'DQA-309')?.key).toBe('amount:3333')
  })

  it('flags a demand that differs from the approved amount', () => {
    expect(rulesOf(baseInput({ approvedDemandAmount: 30000 })).find((f) => f.ruleId === 'DQA-306')?.key).toBe('demand-mismatch:30000:25000')
  })

  it('requires a limitations deadline and a response deadline', () => {
    const found = ids(baseInput({ sol: { status: 'unknown' }, content: CLEAN_LETTER.replace(' Please respond within 30 days.', '') }))
    expect(found).toContain('DQA-009')
    expect(found).toContain('DQA-406')
  })
})

describe('Demand Quality Audit: resolution policy', () => {
  it('AT-028: a non-attorney cannot resolve an attorney-only finding', () => {
    expect(resolutionRefusal('DQA-405', 'verified_authority', 'Checked on Westlaw, good law as cited.', { isAttorney: false })).toBe(
      'Only an attorney can resolve this finding.',
    )
    expect(resolutionRefusal('DQA-405', 'verified_authority', 'Checked on Westlaw, good law as cited.', { isAttorney: true })).toBeNull()
  })

  it('never lets a critical factual contradiction be dismissed', () => {
    for (const id of ['DQA-001', 'DQA-002', 'DQA-005', 'DQA-101', 'DQA-102', 'DQA-201', 'DQA-304', 'DQA-305']) {
      expect(resolutionRefusal(id, 'attorney_judgment', 'x'.repeat(50), { isAttorney: true })).toMatch(/cannot be dismissed/)
    }
  })

  it('needs documented reasoning, except for low-severity acknowledgements', () => {
    expect(resolutionRefusal('DQA-404', 'attorney_judgment', 'ok', { isAttorney: false })).toMatch(/at least/)
    expect(resolutionRefusal('DQA-404', 'acknowledged', '', { isAttorney: false })).toMatch(/documented reasoning/)
    expect(resolutionRefusal('DQA-404', 'not_applicable', 'The photo is cited in the damages section.', { isAttorney: false })).toBeNull()
  })
})

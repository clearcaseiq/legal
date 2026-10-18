import { describe, expect, it } from 'vitest'
import { buildDemandLetterSections, EMPTY_TREATMENT_LEDGER, type DemandCaseRecord } from './demand-letter'
import {
  SUPER_DEMAND_SECTION_HEADINGS,
  SUPER_DEMAND_TITLE,
  analyzeDemandIntelligence,
  renderSuperDemand,
  summarizeApprovalGate,
  updateApprovalGate,
  APPROVAL_GATE_ITEMS,
  type SuperDemandContext,
} from './super-demand'

const assessment = { venueState: 'CA', venueCounty: 'Los Angeles', claimType: 'auto' }
const facts = {
  incident: { date: '2026-03-03', narrative: 'Rear-ended at a red light on Vine.' },
  injuries: ['cervical strain'],
}

const caseRecord: DemandCaseRecord = {
  clientName: 'Maria Lopez',
  attorney: { name: 'Jane Counsel', firmName: 'Counsel LLP' },
  claim: { carrierName: 'Acme Mutual', claimNumber: 'CLM-1', adjusterName: 'Sam Adjuster' },
  liability: { faultTheory: 'The insured ran the red light.', defendantName: 'John Driver', policeReportStatus: 'received', comparativeNegPct: 0 },
  medical: {
    entries: [
      {
        provider: 'City ER',
        visitType: 'emergency',
        startDate: '2026-03-03',
        endDate: null,
        diagnosis: 'Cervical strain',
        diagnosisCodes: ['S13.4XXA'],
        sourceFileId: 'f-er',
        sourcePage: 1,
        sourceQuote: 'Assessment: cervical strain S13.4XXA',
      },
      { provider: 'Rehab PT', visitType: 'physical_therapy', startDate: '2026-06-20', endDate: null },
    ],
    status: { treatmentStatus: 'completed', mmi: true },
  },
  damageItems: [
    { category: 'medical', description: 'ER visit', amount: 4000, provider: 'City ER', incurredAt: '2026-03-03', sourceFileId: 'f-bill', sourcePage: 2 },
    { category: 'medical', description: 'ER visit', amount: 4000, provider: 'City ER', incurredAt: '2026-03-03', sourceFileId: 'f-bill', sourcePage: 3 },
    { category: 'lost_wages', description: 'Two weeks off', amount: 2000 },
  ],
  exhibits: [
    { number: 1, section: 'liability', label: 'Police / incident report (report.pdf)' },
    { number: 2, section: 'treatment', label: 'Medical records (er.pdf)', fileId: 'f-er', fileUrl: '/uploads/er.pdf' },
    { number: 3, section: 'bills', label: 'Medical bill (bill.pdf)', fileId: 'f-bill' },
  ],
}

function context(overrides: Partial<SuperDemandContext> = {}): SuperDemandContext {
  const sections = buildDemandLetterSections({
    assessment,
    facts,
    targetAmount: 50000,
    recipient: { name: 'Sam Adjuster', address: 'Acme Mutual' },
    caseRecord,
  })
  return {
    sections,
    caseRecord,
    facts,
    assessment,
    ledger: EMPTY_TREATMENT_LEDGER,
    valuation: { p25: 20000, expected: 35000, p75: 55000, source: 'model' },
    currentOffer: 15000,
    ...overrides,
  }
}

describe('renderSuperDemand', () => {
  it('renders the package with all 17 sections in order', () => {
    const letter = renderSuperDemand(context())
    expect(letter.startsWith(SUPER_DEMAND_TITLE)).toBe(true)
    expect(letter).toContain('CONFIDENTIAL SETTLEMENT COMMUNICATION')
    let at = -1
    for (const heading of SUPER_DEMAND_SECTION_HEADINGS) {
      const next = letter.indexOf(`\n${heading}\n`)
      expect(next, heading).toBeGreaterThan(at)
      at = next
    }
  })

  it('groups the enclosure index by category and keeps exhibit numbering', () => {
    const letter = renderSuperDemand(context())
    const index = letter.slice(letter.indexOf('XVII. ENCLOSURE INDEX'))
    expect(index).toMatch(/Liability\nExhibit 1 \u2014 Police/)
    expect(index).toMatch(/Medical Records\nExhibit 2 \u2014 Medical records/)
    expect(index).toMatch(/Damages\nExhibit 3 \u2014 Medical bill/)
  })

  it('never leaks Demand Intelligence into the carrier letter', () => {
    const letter = renderSuperDemand(context())
    expect(letter).not.toMatch(/readiness|weakness|confidence|valuation|\$15,000/i)
  })
})

describe('analyzeDemandIntelligence', () => {
  const letterFor = (ctx: SuperDemandContext) => ({ content: renderSuperDemand(ctx), currentVersion: 1, approvalChecklist: null })

  it('flags the treatment gap and the duplicate charge', () => {
    const ctx = context()
    const intel = analyzeDemandIntelligence(ctx, letterFor(ctx))
    expect(intel.weaknesses.some((w) => w.title.includes('gap in treatment'))).toBe(true)
    expect(intel.qualityCheck.find((c) => c.key === 'gaps')?.status).toBe('warn')
    expect(intel.qualityCheck.find((c) => c.key === 'duplicates')?.status).toBe('warn')
    expect(intel.qualityCheck.find((c) => c.key === 'completeness')?.status).not.toBe('fail')
  })

  it('reports valuation against the model range and the current offer', () => {
    const ctx = context()
    const intel = analyzeDemandIntelligence(ctx, letterFor(ctx))
    expect(intel.valuation.expected).toBe(35000)
    expect(intel.valuation.demand).toBe(50000)
    expect(intel.valuation.offerToDemand).toBe(0.3)
    expect(intel.valuation.position).toBe('in_range')
  })

  it('grades documented statements green and catches amounts not in the record', () => {
    const ctx = context()
    const intel = analyzeDemandIntelligence(ctx, {
      ...letterFor(ctx),
      content: `${letterFor(ctx).content}\nThe client also lost $99,999 in business income.`,
    })
    expect(intel.statementConfidence.find((s) => s.key === 'specials')?.level).toBe('green')
    const unsupported = intel.qualityCheck.find((c) => c.key === 'unsupported_assertions')
    expect(unsupported?.status).toBe('warn')
    expect(unsupported?.items?.join(' ')).toContain('$99999')
  })

  it('grades entered charges yellow until each cites a record page', () => {
    const unsourced: DemandCaseRecord = {
      ...caseRecord,
      damageItems: [
        caseRecord.damageItems![0],
        { category: 'medical', description: 'PT', amount: 900, provider: 'Rehab PT', incurredAt: '2026-06-20' },
      ],
    }
    const ctx = context({ caseRecord: unsourced })
    const specials = analyzeDemandIntelligence(ctx, letterFor(ctx)).statementConfidence.find((s) => s.key === 'specials')
    expect(specials?.level).toBe('yellow')
    expect(specials?.basis).toContain('1 of 2 charges cite a record page')
  })

  it('cites the exhibit and page on charges read from a document', () => {
    expect(renderSuperDemand(context())).toContain('(Ex. 3, p. 2)')
  })

  it('cites the record page behind each diagnosis', () => {
    expect(renderSuperDemand(context())).toContain('- Cervical strain (S13.4XXA) (Ex. 2, p. 1)')
  })

  it('lists each page-cited line with its passage as a source', () => {
    const ctx = context()
    const sources = analyzeDemandIntelligence(ctx, letterFor(ctx)).sources
    expect(sources.find((s) => s.ref === 'Ex. 2, p. 1')).toMatchObject({
      kind: 'visit',
      fileUrl: '/uploads/er.pdf',
      quote: 'Assessment: cervical strain S13.4XXA',
    })
    expect(sources.filter((s) => s.kind === 'exhibit').map((s) => s.ref)).toEqual(['Exhibit 1', 'Exhibit 2', 'Exhibit 3'])
  })

  it('flags page citations no reviewed record line backs', () => {
    const ctx = context()
    const pass = analyzeDemandIntelligence(ctx, letterFor(ctx)).qualityCheck.find((c) => c.key === 'pinpoint_citations')
    expect(pass?.status).toBe('pass')
    const typed = analyzeDemandIntelligence(ctx, {
      ...letterFor(ctx),
      content: `${letterFor(ctx).content}\nThe MRI confirmed a herniation (Ex. 2, p. 9). See also (Ex. 7, p. 1).`,
    }).qualityCheck.find((c) => c.key === 'pinpoint_citations')
    expect(typed?.status).toBe('fail')
    expect(typed?.items).toEqual([
      'Ex. 7, p. 1 cites an exhibit that is not enclosed',
      'Ex. 2, p. 9 is not the page any reviewed record line was read from',
    ])
  })

  it('scores a thin record as not ready', () => {
    const thin: DemandCaseRecord = { exhibits: [] }
    const sections = buildDemandLetterSections({ assessment, facts: {}, targetAmount: 10000, recipient: { name: 'A', address: 'B' }, caseRecord: thin })
    const ctx = context({ sections, caseRecord: thin, facts: {}, valuation: null, currentOffer: null })
    const intel = analyzeDemandIntelligence(ctx, letterFor(ctx))
    expect(intel.readiness.band).toBe('not_ready')
    expect(intel.statementConfidence.find((s) => s.key === 'liability')?.level).toBe('red')
  })
})

describe('approval gate', () => {
  it('is complete only when every item is signed on the current version', () => {
    const all = Object.fromEntries(APPROVAL_GATE_ITEMS.map((i) => [i.key, true]))
    const signed = JSON.stringify(updateApprovalGate(null, 3, all, 'Jane Counsel'))
    expect(summarizeApprovalGate(signed, 3).complete).toBe(true)
    expect(summarizeApprovalGate(signed, 3).items[0].checkedByName).toBe('Jane Counsel')

    const afterEdit = summarizeApprovalGate(signed, 4)
    expect(afterEdit.stale).toBe(true)
    expect(afterEdit.complete).toBe(false)
  })

  it('keeps earlier ticks on the same version', () => {
    const one = updateApprovalGate(null, 1, { facts_reviewed: true }, 'A')
    const two = updateApprovalGate(JSON.stringify(one), 1, { medical_reviewed: true }, 'B')
    const gate = summarizeApprovalGate(JSON.stringify(two), 1)
    expect(gate.items.filter((i) => i.checked).map((i) => i.key)).toEqual(['facts_reviewed', 'medical_reviewed'])
  })
})

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
      { provider: 'City ER', visitType: 'emergency', startDate: '2026-03-03', endDate: null, diagnosis: 'Cervical strain' },
      { provider: 'Rehab PT', visitType: 'physical_therapy', startDate: '2026-06-20', endDate: null },
    ],
    status: { treatmentStatus: 'completed', mmi: true },
  },
  damageItems: [
    { category: 'medical', description: 'ER visit', amount: 4000, provider: 'City ER', incurredAt: '2026-03-03' },
    { category: 'medical', description: 'ER visit', amount: 4000, provider: 'City ER', incurredAt: '2026-03-03' },
    { category: 'lost_wages', description: 'Two weeks off', amount: 2000 },
  ],
  exhibits: [
    { number: 1, section: 'liability', label: 'Police / incident report (report.pdf)' },
    { number: 2, section: 'treatment', label: 'Medical records (er.pdf)' },
    { number: 3, section: 'bills', label: 'Medical bill (bill.pdf)' },
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

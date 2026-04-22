import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runPreRoutingGate } from './pre-routing-gate'
import type { NormalizedCase } from './case-normalization'
import { prisma } from './prisma'

vi.mock('./prisma', () => ({
  prisma: {
    assessment: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    introduction: {
      findFirst: vi.fn(),
    },
    evidenceFile: {
      findMany: vi.fn(),
    },
    complianceSetting: {
      findUnique: vi.fn(),
    },
  },
}))

function baseCase(overrides: Partial<NormalizedCase> = {}): NormalizedCase {
  return {
    case_id: 'case-1',
    claim_type: 'auto',
    jurisdiction_state: 'CA',
    injury_severity: 1,
    treatment_status: 'none',
    liability_confidence: 0.6,
    evidence_score: 0.5,
    damages_score: 0.6,
    estimated_case_value_low: 10000,
    estimated_case_value_high: 50000,
    statute_of_limitations_status: 'ok',
    medical_record_present: false,
    police_report_present: false,
    wage_loss_present: false,
    urgency_level: 'medium',
    narrative_present: true,
    plaintiff_contact_complete: true,
    required_disclosures_accepted: true,
    ...overrides,
  }
}

describe('runPreRoutingGate', () => {
  beforeEach(() => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.assessment.count).mockResolvedValue(0)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.evidenceFile.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.complianceSetting.findUnique).mockResolvedValue(null as any)
  })

  it('passes when all thresholds met and no recent duplicate route', async () => {
    const r = await runPreRoutingGate(baseCase())
    expect(r.pass).toBe(true)
  })

  it('fails when case score below minimum', async () => {
    const r = await runPreRoutingGate(
      baseCase({ liability_confidence: 0.1, damages_score: 0.1 }),
      { minCaseScore: 0.25 }
    )
    expect(r.pass).toBe(false)
    if (!r.pass) expect(r.status).toBe('not_routable_yet')
  })

  it('fails when evidence score too low', async () => {
    const r = await runPreRoutingGate(baseCase({ evidence_score: 0.05 }))
    expect(r.pass).toBe(false)
    if (!r.pass) expect(r.status).toBe('needs_more_info')
  })

  it('fails for unsupported jurisdiction', async () => {
    const r = await runPreRoutingGate(baseCase({ jurisdiction_state: 'ZZ' }))
    expect(r.pass).toBe(false)
    if (!r.pass) expect(r.reason).toMatch(/not supported/i)
  })

  it('fails for unsupported claim type', async () => {
    const r = await runPreRoutingGate(baseCase({ claim_type: 'tax_lien_foreclosure' }))
    expect(r.pass).toBe(false)
  })

  it('normalizes claim aliases (auto_accident → auto)', async () => {
    const r = await runPreRoutingGate(baseCase({ claim_type: 'auto_accident' }))
    expect(r.pass).toBe(true)
  })

  it('fails when SOL expired', async () => {
    const r = await runPreRoutingGate(baseCase({ statute_of_limitations_status: 'expired' }))
    expect(r.pass).toBe(false)
    if (!r.pass) expect(r.reason).toMatch(/Statute/)
  })

  it('fails when disclosures not accepted', async () => {
    const r = await runPreRoutingGate(baseCase({ required_disclosures_accepted: false }))
    expect(r.pass).toBe(false)
    if (!r.pass) expect(r.status).toBe('needs_more_info')
  })

  it('fails when plaintiff contact required but incomplete', async () => {
    const r = await runPreRoutingGate(
      baseCase({ plaintiff_contact_complete: false }),
      { requirePlaintiffContact: true }
    )
    expect(r.pass).toBe(false)
  })

  it('fails when narrative required but missing', async () => {
    const r = await runPreRoutingGate(
      baseCase({ narrative_present: false }),
      { requireNarrative: true }
    )
    expect(r.pass).toBe(false)
  })

  it('fails when duplicate route within 24h', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      requestedAt: new Date(),
    } as any)

    const r = await runPreRoutingGate(baseCase())
    expect(r.pass).toBe(false)
    if (!r.pass) expect(r.status).toBe('manual_review')
  })

  it('fails when already queued for manual review', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'case-1',
      userId: 'user-1',
      manualReviewStatus: 'pending',
    } as any)

    const r = await runPreRoutingGate(baseCase())
    expect(r.pass).toBe(false)
    if (!r.pass) expect(r.status).toBe('manual_review')
  })

  it('fails when high-value case has thin evidence', async () => {
    const r = await runPreRoutingGate(baseCase({
      estimated_case_value_high: 250000,
      medical_record_present: false,
      police_report_present: false,
      wage_loss_present: false,
    }))

    expect(r.pass).toBe(false)
    if (!r.pass) expect(r.status).toBe('manual_review')
  })

  it('passes when prior intro older than 24h', async () => {
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      requestedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    } as any)

    const r = await runPreRoutingGate(baseCase())
    expect(r.pass).toBe(true)
  })

  it('fails when evidence processing failed', async () => {
    vi.mocked(prisma.evidenceFile.findMany).mockResolvedValue([
      { processingStatus: 'failed', category: 'medical_records', isVerified: false, isHIPAA: true, aiClassification: null, ocrText: null }
    ] as any)

    const r = await runPreRoutingGate(baseCase())
    expect(r.pass).toBe(false)
    if (!r.pass) expect(r.reason).toMatch(/failed evidence processing/i)
  })

  it('fails when HIPAA-aligned compliance is enabled and medical docs are not marked HIPAA', async () => {
    vi.mocked(prisma.complianceSetting.findUnique).mockResolvedValue({ key: 'global', hipaaAligned: true } as any)
    vi.mocked(prisma.evidenceFile.findMany).mockResolvedValue([
      { processingStatus: 'completed', category: 'medical_records', isVerified: true, isHIPAA: false, aiClassification: null, ocrText: 'ok' }
    ] as any)

    const r = await runPreRoutingGate(baseCase())
    expect(r.pass).toBe(false)
    if (!r.pass) expect(r.reason).toMatch(/hipaa/i)
  })
})

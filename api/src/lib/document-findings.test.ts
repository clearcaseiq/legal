import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, completionMock, createMedicalEntryMock, writeThroughMock, partiesMock, liabilityMock } = vi.hoisted(() => ({
  partiesMock: {
    listLiabilityParties: vi.fn(),
    createEvidenceItem: vi.fn(),
    updateEvidenceItem: vi.fn(),
    createDefendant: vi.fn(),
  },
  liabilityMock: { getLiabilityRecord: vi.fn(), upsertLiabilityRecord: vi.fn() },
  prismaMock: {
    evidenceFile: { findUnique: vi.fn() },
    liabilityEvidenceItem: { findMany: vi.fn(), findFirst: vi.fn() },
    insuranceDetail: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    documentFinding: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    medicalTreatmentEntry: { findMany: vi.fn(), findFirst: vi.fn() },
    damageItem: { findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
  completionMock: vi.fn(),
  createMedicalEntryMock: vi.fn(),
  writeThroughMock: vi.fn(),
}))

vi.mock('./prisma', () => ({ prisma: prismaMock }))
vi.mock('./logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('./ai-run', () => ({ recordAiRun: vi.fn() }))
vi.mock('./llm-client', () => ({
  getLlmChatClient: () => ({ chat: { completions: { create: completionMock } } }),
  LLM_CHAT_MODEL: 'gpt-test',
}))
vi.mock('./llm-prompt-sanitize', () => ({ llmAllowPhi: () => true }))
vi.mock('./medical-record', () => ({
  VISIT_TYPES: ['initial_eval', 'follow_up', 'procedure', 'surgery', 'imaging', 'therapy', 'er', 'other'],
  createMedicalEntry: createMedicalEntryMock,
}))
vi.mock('./damages-ledger', () => ({
  MEDICAL_BILLING_STATUSES: ['billed', 'paid', 'outstanding', 'reduced', 'written_off'],
  writeThroughDamages: writeThroughMock,
  recordDamageItemChanges: vi.fn(),
}))
vi.mock('./liability-parties', () => partiesMock)
vi.mock('./liability-record', () => liabilityMock)

import {
  acceptDocumentFinding,
  chunkPages,
  dateSpellings,
  extractChargeLines,
  categoriesForKinds,
  findingFingerprint,
  generateDocumentFindings,
  namesMatch,
  verifyCandidate,
} from './document-findings'

const pages = [
  { page: 1, text: 'Bay Area Orthopedics\nPatient: Maria Lopez\nDate of service: 03/14/2026\nDx: M54.2 cervicalgia\nCPT 99204 New patient visit' },
  { page: 2, text: 'STATEMENT\n03/14/2026 99204 Office visit, new patient $425.00\nPayment received $100.00\nBalance due $325.00' },
]

describe('verifyCandidate', () => {
  it('keeps a finding whose quote, date, amount and codes are on the page', () => {
    const f = verifyCandidate(
      {
        kind: 'medical_charge',
        page: 2,
        quote: '03/14/2026 99204 Office visit, new patient $425.00',
        date: '2026-03-14',
        amount: 425,
        cptCodes: ['99204'],
        provider: 'Bay Area Orthopedics',
        confidence: 0.9,
      },
      pages,
    )
    expect(f).not.toBeNull()
    expect(f!.page).toBe(2)
    expect(f!.data.amount).toBe(425)
    expect(f!.data.date).toBe('2026-03-14')
    expect(f!.data.cptCodes).toEqual(['99204'])
    expect(f!.data.checks).toEqual({ date: true, amount: true })
  })

  it('drops a finding whose quote is not in the document', () => {
    expect(
      verifyCandidate({ kind: 'treatment_visit', page: 1, quote: 'MRI of the lumbar spine showed a herniation', date: '2026-03-14' }, pages),
    ).toBeNull()
  })

  it('drops a charge whose amount is not printed on its page', () => {
    expect(
      verifyCandidate({ kind: 'medical_charge', page: 2, quote: '03/14/2026 99204 Office visit, new patient $425.00', amount: 4250 }, pages),
    ).toBeNull()
  })

  it('corrects the page when the quote is on a different one', () => {
    const f = verifyCandidate({ kind: 'treatment_visit', page: 2, quote: 'Date of service: 03/14/2026', provider: 'Bay Area Orthopedics' }, pages)
    expect(f!.page).toBe(1)
  })

  it('clears a date and codes the page does not show, and lowers confidence', () => {
    const f = verifyCandidate(
      {
        kind: 'treatment_visit',
        page: 1,
        quote: 'Bay Area Orthopedics Patient: Maria Lopez',
        date: '2026-04-01',
        icdCodes: ['M54.2', 'S13.4XXA'],
        confidence: 0.95,
      },
      pages,
    )
    expect(f!.data.date).toBeNull()
    expect(f!.data.icdCodes).toEqual(['M54.2'])
    expect(f!.confidence).toBeLessThanOrEqual(0.4)
  })

  it('maps an unknown visit type to other', () => {
    const f = verifyCandidate({ kind: 'treatment_visit', page: 1, quote: 'CPT 99204 New patient visit', visitType: 'consult' }, pages)
    expect(f!.data.visitType).toBe('other')
  })
})

describe('dateSpellings', () => {
  it('covers numeric and written forms', () => {
    const forms = dateSpellings('2026-03-04')
    expect(forms).toContain('03 04 2026')
    expect(forms).toContain('3 4 26')
    expect(forms).toContain('march 4 2026')
    expect(forms).toContain('mar 4 2026')
  })
})

describe('findingFingerprint', () => {
  it('matches the same charge read twice and separates different ones', () => {
    const a = { kind: 'medical_charge' as const, data: { date: '2026-03-14', provider: 'Bay Area Orthopedics Inc', amount: 425 } }
    const b = { kind: 'medical_charge' as const, data: { date: '2026-03-14', provider: 'bay area orthopedics', amount: 425 } }
    const c = { kind: 'medical_charge' as const, data: { date: '2026-03-14', provider: 'Bay Area Orthopedics', amount: 99 } }
    expect(findingFingerprint(a)).toBe(findingFingerprint(b))
    expect(findingFingerprint(a)).not.toBe(findingFingerprint(c))
  })
})

describe('extractChargeLines', () => {
  it('reads dated charge lines and skips payments and balances', () => {
    const found = extractChargeLines(pages) as any[]
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ kind: 'medical_charge', page: 2, date: '2026-03-14', amount: 425 })
  })
})

describe('chunkPages', () => {
  it('never splits a page across chunks', () => {
    const chunks = chunkPages(
      [
        { page: 1, text: 'a'.repeat(60) },
        { page: 2, text: 'b'.repeat(60) },
        { page: 3, text: 'c'.repeat(30) },
      ],
      100,
    )
    expect(chunks.map((c) => c.map((p) => p.page))).toEqual([[1], [2, 3]])
  })
})

describe('generateDocumentFindings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.evidenceFile.findUnique.mockResolvedValue({
      id: 'f1',
      assessmentId: 'a1',
      category: 'bills',
      originalName: 'statement.pdf',
      identityCheck: null,
    })
    prismaMock.documentFinding.findMany.mockResolvedValue([])
    prismaMock.medicalTreatmentEntry.findMany.mockResolvedValue([])
    prismaMock.damageItem.findMany.mockResolvedValue([])
    prismaMock.liabilityEvidenceItem.findMany.mockResolvedValue([])
    prismaMock.insuranceDetail.findMany.mockResolvedValue([])
    prismaMock.documentFinding.deleteMany.mockReturnValue('delete-op')
    prismaMock.documentFinding.createMany.mockReturnValue('create-op')
    prismaMock.$transaction.mockResolvedValue([])
  })

  it('stores only verified findings and replaces the file\'s open proposals', async () => {
    completionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              findings: [
                { kind: 'medical_charge', page: 2, quote: '03/14/2026 99204 Office visit, new patient $425.00', date: '2026-03-14', amount: 425 },
                { kind: 'medical_charge', page: 2, quote: 'Surgery $48,000.00 on 03/20/2026', amount: 48000 },
              ],
            }),
          },
        },
      ],
    })
    const result = await generateDocumentFindings('f1', pages)
    expect(result).toEqual({ status: 'ok', proposed: 1, extractor: 'ai' })
    const rows = prismaMock.documentFinding.createMany.mock.calls[0][0].data
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ assessmentId: 'a1', evidenceFileId: 'f1', kind: 'medical_charge', pageNumber: 2 })
    expect(prismaMock.documentFinding.deleteMany).toHaveBeenCalledWith({ where: { evidenceFileId: 'f1', status: 'proposed' } })
  })

  it('does not propose a charge already accepted or rejected on the case', async () => {
    completionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              findings: [{ kind: 'medical_charge', page: 2, quote: '03/14/2026 99204 Office visit, new patient $425.00', date: '2026-03-14', amount: 425 }],
            }),
          },
        },
      ],
    })
    const verified = verifyCandidate(
      { kind: 'medical_charge', page: 2, quote: '03/14/2026 99204 Office visit, new patient $425.00', date: '2026-03-14', amount: 425 },
      pages,
    )!
    prismaMock.documentFinding.findMany.mockResolvedValue([{ fingerprint: findingFingerprint(verified) }])
    const result = await generateDocumentFindings('f1', pages)
    expect(result.proposed).toBe(0)
    expect(prismaMock.documentFinding.createMany).not.toHaveBeenCalled()
  })

  it('skips documents outside the record categories', async () => {
    prismaMock.evidenceFile.findUnique.mockResolvedValue({ id: 'f1', assessmentId: 'a1', category: 'photos', originalName: 'x.jpg' })
    expect((await generateDocumentFindings('f1', pages)).status).toBe('skipped')
    expect(completionMock).not.toHaveBeenCalled()
  })
})

describe('acceptDocumentFinding', () => {
  beforeEach(() => vi.clearAllMocks())

  it('adds a charge to Damages with its source and keeps the printed amount', async () => {
    prismaMock.documentFinding.findFirst.mockResolvedValue({
      id: 'df1',
      kind: 'medical_charge',
      status: 'proposed',
      evidenceFileId: 'f1',
      pageNumber: 2,
      sourceQuote: '03/14/2026 99204 Office visit $425.00',
      data: JSON.stringify({ date: '2026-03-14', amount: 425, provider: 'Bay Area Orthopedics', billingStatus: 'billed' }),
    })
    prismaMock.damageItem.create.mockResolvedValue({ id: 'd1', amount: 300, billingStatus: 'billed' })
    prismaMock.documentFinding.update.mockResolvedValue({
      id: 'df1',
      kind: 'medical_charge',
      status: 'accepted',
      data: '{}',
      sourceQuote: 'q',
      confidence: 0.9,
      extractor: 'ai',
      evidenceFileId: 'f1',
      createdAt: new Date(),
    })
    const result = await acceptDocumentFinding('a1', 'df1', { amount: 300 }, { actorId: 'u1', actorName: 'Jane' })
    expect(result).toMatchObject({ entityType: 'damage_item', entityId: 'd1' })
    expect(prismaMock.damageItem.create.mock.calls[0][0].data).toMatchObject({
      category: 'medical',
      amount: 300,
      documentedAmount: 425,
      source: 'evidence',
      sourceFileId: 'f1',
      sourcePage: 2,
      findingId: 'df1',
    })
    expect(writeThroughMock).toHaveBeenCalled()
  })

  it('refuses a finding that was already reviewed', async () => {
    prismaMock.documentFinding.findFirst.mockResolvedValue({ id: 'df1', status: 'accepted', data: '{}' })
    await expect(acceptDocumentFinding('a1', 'df1', {}, { actorId: null, actorName: null })).rejects.toMatchObject({ status: 409 })
  })
})

const reportPages = [
  {
    page: 1,
    text:
      'TRAFFIC COLLISION REPORT\nReport No. 2026-004512\nDate of collision: 03/12/2026 Time: 17:40\nOakland Police Department, Officer R. Diaz\n' +
      'Party 1: SMITH, JOHN — Insurance: Geico Policy 4410-22-981\nParty 2: Maria Lopez\nCitation issued to Party 1 for CVC 22350.',
  },
]

const insurancePages = [
  {
    page: 1,
    text:
      'State Farm Mutual Automobile Insurance Company\nClaim Number: 05-7731-K22\nPolicy Number: 881 2290-F14\n' +
      'Bodily Injury Limits: $25,000 each person / $50,000 each accident\nAdjuster: Karen Wu, karen.wu@statefarm.com, (510) 555-0199',
  },
]

describe('verifyCandidate — police reports and insurance documents', () => {
  it('keeps the report number, parties and citation the report prints', () => {
    const f = verifyCandidate(
      {
        kind: 'incident_report',
        page: 1,
        quote: 'Report No. 2026-004512',
        date: '2026-03-12',
        reportNumber: '2026-004512',
        defendantName: 'John Smith',
        defendantInsurer: 'Geico',
        defendantPolicyNumber: '4410-22-981',
        citationIssuedTo: 'defendant',
        officer: 'R. Diaz',
      },
      reportPages,
    )
    expect(f!.data).toMatchObject({
      date: '2026-03-12',
      reportNumber: '2026-004512',
      defendantName: 'John Smith',
      defendantInsurer: 'Geico',
      defendantPolicyNumber: '4410-22-981',
      citationIssuedTo: 'defendant',
    })
  })

  it('clears a report number and party the page does not print', () => {
    const f = verifyCandidate(
      { kind: 'incident_report', page: 1, quote: 'Report No. 2026-004512', date: '2026-03-12', reportNumber: '2026-009999', defendantName: 'Alan Brown' },
      reportPages,
    )
    expect(f!.data.reportNumber).toBeNull()
    expect(f!.data.defendantName).toBeNull()
    expect(f!.data.date).toBe('2026-03-12')
  })

  it('drops a report with no date, number or party on the page', () => {
    expect(
      verifyCandidate({ kind: 'incident_report', page: 1, quote: 'TRAFFIC COLLISION REPORT Report No', reportNumber: '1234' }, reportPages),
    ).toBeNull()
  })

  it('keeps a policy with its numbers, limits and adjuster as printed', () => {
    const f = verifyCandidate(
      {
        kind: 'insurance_policy',
        page: 1,
        quote: 'Claim Number: 05-7731-K22',
        carrierName: 'State Farm',
        claimNumber: '05-7731-K22',
        policyNumber: '881 2290-F14',
        policyLimit: 25000,
        perAccidentLimit: 50000,
        adjusterName: 'Karen Wu',
        adjusterEmail: 'Karen.Wu@statefarm.com',
        adjusterPhone: '510-555-0199',
        insuredParty: 'defendant',
        coverageType: 'liability',
      },
      insurancePages,
    )
    expect(f!.data).toMatchObject({
      carrierName: 'State Farm',
      claimNumber: '05-7731-K22',
      policyNumber: '881 2290-F14',
      policyLimit: 25000,
      perAccidentLimit: 50000,
      adjusterEmail: 'karen.wu@statefarm.com',
      adjusterPhone: '510-555-0199',
    })
  })

  it('drops a policy whose carrier is not on the page and clears an unprinted limit', () => {
    expect(verifyCandidate({ kind: 'insurance_policy', page: 1, quote: 'Claim Number: 05-7731-K22', carrierName: 'Allstate' }, insurancePages)).toBeNull()
    const f = verifyCandidate(
      { kind: 'insurance_policy', page: 1, quote: 'Claim Number: 05-7731-K22', carrierName: 'State Farm', policyLimit: 100000 },
      insurancePages,
    )
    expect(f!.data.policyLimit).toBeNull()
  })
})

describe('namesMatch and categoriesForKinds', () => {
  it('matches names written in a different order and ignores carrier filler words', () => {
    expect(namesMatch('SMITH, JOHN', 'John Smith')).toBe(true)
    expect(namesMatch('State Farm Mutual', 'State Farm Insurance Company')).toBe(true)
    expect(namesMatch('Geico', 'Progressive Insurance')).toBe(false)
  })

  it('reads police and insurance categories only for their own kinds', () => {
    expect(categoriesForKinds(['incident_report'])).toEqual(['police_report', 'police'])
    expect(categoriesForKinds(['insurance_policy'])).toContain('dec_page')
    expect(categoriesForKinds(['medical_charge'])).not.toContain('police_report')
  })
})

describe('generateDocumentFindings — police reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.evidenceFile.findUnique.mockResolvedValue({
      id: 'f2',
      assessmentId: 'a1',
      category: 'police_report',
      originalName: 'report.pdf',
      identityCheck: null,
    })
    prismaMock.documentFinding.findMany.mockResolvedValue([])
    prismaMock.medicalTreatmentEntry.findMany.mockResolvedValue([])
    prismaMock.damageItem.findMany.mockResolvedValue([])
    prismaMock.liabilityEvidenceItem.findMany.mockResolvedValue([])
    prismaMock.insuranceDetail.findMany.mockResolvedValue([])
    prismaMock.$transaction.mockResolvedValue([])
  })

  it('keeps only incident findings from a police report', async () => {
    completionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              findings: [
                { kind: 'incident_report', page: 1, quote: 'Report No. 2026-004512', reportNumber: '2026-004512', date: '2026-03-12' },
                { kind: 'treatment_visit', page: 1, quote: 'Date of collision: 03/12/2026', date: '2026-03-12', provider: 'Oakland PD' },
              ],
            }),
          },
        },
      ],
    })
    const result = await generateDocumentFindings('f2', reportPages)
    expect(result.proposed).toBe(1)
    expect(completionMock.mock.calls[0][0].messages[1].content).toContain('police or incident report')
    expect(prismaMock.documentFinding.createMany.mock.calls[0][0].data[0].kind).toBe('incident_report')
  })
})

describe('acceptDocumentFinding — police reports and policies', () => {
  const actor = { actorId: 'u1', actorName: 'Jane' }
  const accepted = { id: 'df2', status: 'accepted', data: '{}', sourceQuote: 'q', confidence: 0.9, extractor: 'ai', evidenceFileId: 'f2', createdAt: new Date() }

  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.documentFinding.update.mockResolvedValue(accepted)
    liabilityMock.getLiabilityRecord.mockResolvedValue({ citationIssuedTo: null, witnessCount: 0 })
  })

  it('adds a received police report, the defendant and the citation when the Liability tab has none', async () => {
    prismaMock.documentFinding.findFirst.mockResolvedValue({
      id: 'df2',
      kind: 'incident_report',
      status: 'proposed',
      evidenceFileId: 'f2',
      pageNumber: 1,
      sourceQuote: 'Report No. 2026-004512',
      data: JSON.stringify({ date: '2026-03-12', reportNumber: '2026-004512', defendantName: 'John Smith', defendantInsurer: 'Geico', citationIssuedTo: 'defendant', witnessCount: 2 }),
    })
    partiesMock.listLiabilityParties.mockResolvedValue({ defendants: [], evidence: [] })
    prismaMock.liabilityEvidenceItem.findFirst.mockResolvedValue({ id: 'ev1' })

    const result = await acceptDocumentFinding('a1', 'df2', {}, actor)
    expect(result).toMatchObject({ entityType: 'liability_evidence', entityId: 'ev1' })
    expect(partiesMock.createEvidenceItem.mock.calls[0][1]).toMatchObject({
      type: 'police_report',
      status: 'received',
      referenceNumber: '2026-004512',
      evidenceFileId: 'f2',
    })
    expect(partiesMock.createDefendant.mock.calls[0][1]).toMatchObject({ name: 'John Smith', insurerName: 'Geico' })
    expect(liabilityMock.upsertLiabilityRecord.mock.calls[0][1]).toEqual({ citationIssuedTo: 'defendant', witnessCount: 2, hasWitnesses: true })
  })

  it('keeps what the attorney entered and only marks the report received', async () => {
    prismaMock.documentFinding.findFirst.mockResolvedValue({
      id: 'df2',
      kind: 'incident_report',
      status: 'proposed',
      evidenceFileId: 'f2',
      pageNumber: 1,
      sourceQuote: 'q',
      data: JSON.stringify({ reportNumber: '2026-004512', defendantName: 'SMITH, JOHN', citationIssuedTo: 'plaintiff' }),
    })
    partiesMock.listLiabilityParties.mockResolvedValue({
      defendants: [{ name: 'John Smith' }],
      evidence: [{ id: 'ev9', type: 'police_report', referenceNumber: null, date: '2026-03-12', evidenceFileId: null, description: 'OPD' }],
    })
    liabilityMock.getLiabilityRecord.mockResolvedValue({ citationIssuedTo: 'defendant', witnessCount: 3 })

    await acceptDocumentFinding('a1', 'df2', {}, actor)
    expect(partiesMock.updateEvidenceItem.mock.calls[0][2]).toEqual({ status: 'received', referenceNumber: '2026-004512', evidenceFileId: 'f2' })
    expect(partiesMock.createDefendant).not.toHaveBeenCalled()
    expect(liabilityMock.upsertLiabilityRecord).not.toHaveBeenCalled()
  })

  it('fills the blanks of the matching policy without overwriting its numbers', async () => {
    prismaMock.documentFinding.findFirst.mockResolvedValue({
      id: 'df3',
      kind: 'insurance_policy',
      status: 'proposed',
      evidenceFileId: 'f3',
      pageNumber: 1,
      sourceQuote: 'q',
      data: JSON.stringify({ carrierName: 'State Farm', policyNumber: '881 2290-F14', claimNumber: '05-7731-K22', policyLimit: 25000 }),
    })
    prismaMock.insuranceDetail.findMany.mockResolvedValue([
      { id: 'p1', carrierName: 'State Farm Insurance', policyNumber: 'OLD-1', claimNumber: null, policyLimit: null, sourceEvidenceFileId: null },
    ])

    const result = await acceptDocumentFinding('a1', 'df3', {}, actor)
    expect(result).toMatchObject({ entityType: 'insurance_detail', entityId: 'p1' })
    const data = prismaMock.insuranceDetail.update.mock.calls[0][0].data
    expect(data).toMatchObject({ claimNumber: '05-7731-K22', policyLimit: 25000, sourceEvidenceFileId: 'f3' })
    expect(data.policyNumber).toBeUndefined()
    expect(prismaMock.insuranceDetail.create).not.toHaveBeenCalled()
  })

  it('creates a policy when none on the case matches', async () => {
    prismaMock.documentFinding.findFirst.mockResolvedValue({
      id: 'df3',
      kind: 'insurance_policy',
      status: 'proposed',
      evidenceFileId: 'f3',
      pageNumber: 1,
      sourceQuote: 'q',
      data: JSON.stringify({ carrierName: 'State Farm', claimNumber: '05-7731-K22', insuredParty: 'defendant' }),
    })
    prismaMock.insuranceDetail.findMany.mockResolvedValue([])
    prismaMock.insuranceDetail.create.mockResolvedValue({ id: 'p2' })

    await acceptDocumentFinding('a1', 'df3', {}, actor)
    expect(prismaMock.insuranceDetail.create.mock.calls[0][0].data).toMatchObject({
      assessmentId: 'a1',
      carrierName: 'State Farm',
      claimNumber: '05-7731-K22',
      insuredParty: 'defendant',
      sourceEvidenceFileId: 'f3',
    })
  })
})

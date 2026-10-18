import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, completionMock, createMedicalEntryMock, writeThroughMock } = vi.hoisted(() => ({
  prismaMock: {
    evidenceFile: { findUnique: vi.fn() },
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
}))

import {
  acceptDocumentFinding,
  chunkPages,
  dateSpellings,
  extractChargeLines,
  findingFingerprint,
  generateDocumentFindings,
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
    prismaMock.damageItem.create.mockResolvedValue({ id: 'd1' })
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

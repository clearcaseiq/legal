import { describe, expect, it, vi } from 'vitest'

const findMany = vi.fn()
vi.mock('./prisma', () => ({ prisma: { evidenceFile: { findMany: (...args: unknown[]) => findMany(...args) } } }))
vi.mock('./logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('./object-storage', () => ({ ensureLocalCopy: vi.fn() }))
vi.mock('./pdf-parse-client', () => ({ loadPDFParse: vi.fn() }))

import JSZip from 'jszip'
import { EXHIBIT_NOT_ON_CASE, buildDemandLetterDocx, enclosedFileName, enclosuresIn, planDemandExhibitCandidates } from './demand-docx'

async function documentText(buffer: Buffer) {
  return (await JSZip.loadAsync(buffer)).file('word/document.xml')!.async('string')
}

describe('buildDemandLetterDocx watermark', () => {
  const WATERMARK = 'NOT YET ATTORNEY APPROVED'

  it('AT-029: stamps every attorney working draft, not only a Super Demand', async () => {
    findMany.mockResolvedValue([])
    const draft = await buildDemandLetterDocx({ assessmentId: 'a1', content: 'Dear Adjuster,\nWe demand $25,000.', status: 'DRAFT', origin: 'attorney' })
    expect(await documentText(draft)).toContain(WATERMARK)
  })

  it('leaves the finalized letter and a claimant\u2019s own letter unstamped', async () => {
    findMany.mockResolvedValue([])
    const final = await buildDemandLetterDocx({ assessmentId: 'a1', content: 'Dear Adjuster,', status: 'FINAL', origin: 'attorney' })
    const proSe = await buildDemandLetterDocx({ assessmentId: 'a1', content: 'Dear Adjuster,', status: 'DRAFT', origin: 'pro_se' })
    expect(await documentText(final)).not.toContain(WATERMARK)
    expect(await documentText(proSe)).not.toContain(WATERMARK)
  })
})

const file = (id: string, originalName: string, category: string, identityCheck: string | null = null) => ({
  id,
  originalName,
  category,
  subcategory: null,
  createdAt: new Date('2026-01-01'),
  identityCheck,
  mimetype: 'application/pdf',
  filePath: `uploads/${id}.pdf`,
  fileUrl: `/uploads/${id}.pdf`,
  ocrText: null,
})

describe('planDemandExhibitCandidates', () => {
  it('finds an enclosed file by name after it was recategorized', async () => {
    findMany.mockResolvedValueOnce([file('f1', '05_Itemized_Medical_Bills.pdf', 'medical_records')])
    const { planned, extras } = await planDemandExhibitCandidates(
      'a1',
      'ENCLOSURES\nExhibit 8 \u2014 Medical bill (05_Itemized_Medical_Bills.pdf)',
    )
    expect(planned[0]).toMatchObject({ number: '8', file: { id: 'f1' }, section: 'treatment' })
    expect(extras).toEqual([])
  })

  it('says why an enclosed file is gone', async () => {
    findMany.mockResolvedValueOnce([])
    const { planned } = await planDemandExhibitCandidates('a1', 'ENCLOSURES\nExhibit 1 \u2014 Medical bill (gone.pdf)')
    expect(planned[0]).toMatchObject({ file: null, missing: EXHIBIT_NOT_ON_CASE })
  })

  it('reads a filename that itself has parentheses', () => {
    expect(enclosedFileName('Medical bill (bill (1).pdf)')).toBe('bill (1).pdf')
    expect(enclosedFileName('Medical bill')).toBeNull()
  })
})

describe('enclosuresIn', () => {
  it('reads the exhibit list under a renumbered Super Demand index', () => {
    const content = [
      'XV. ENCLOSURE INDEX',
      'Liability',
      'Exhibit 1 \u2014 Police / incident report (report.pdf)',
      '',
      'Medical Records',
      'Exhibit 2 \u2014 Medical records (er.pdf)',
      '',
      'This letter is confidential.',
    ].join('\n')
    expect(enclosuresIn(content)).toEqual([
      { number: '1', label: 'Police / incident report (report.pdf)' },
      { number: '2', label: 'Medical records (er.pdf)' },
    ])
  })

  it('still reads a standard letter\u2019s ENCLOSURES block', () => {
    expect(enclosuresIn('ENCLOSURES\nExhibit A \u2014 Bill (bill.pdf)')).toEqual([{ number: 'A', label: 'Bill (bill.pdf)' }])
  })
})

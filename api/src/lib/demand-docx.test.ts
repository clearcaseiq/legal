import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
vi.mock('./logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('./object-storage', () => ({ ensureLocalCopy: vi.fn() }))
vi.mock('./pdf-parse-client', () => ({ loadPDFParse: vi.fn() }))

import { enclosuresIn } from './demand-docx'

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

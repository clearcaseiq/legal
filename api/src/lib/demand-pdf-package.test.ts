import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, StandardFonts } from 'pdf-lib'

vi.mock('./prisma', () => ({ prisma: {} }))

import {
  applyExhibitSelection,
  assembleDemandPackage,
  citedExhibitNumbers,
  defaultBatesPrefix,
  formatBates,
  indexRows,
  normalizeBates,
  wrapText,
  INDEX_ROWS_PER_PAGE,
  type PackageExhibit,
} from './demand-pdf-package'
import { normalizePackageConfig } from './demand-package-jobs'

async function sourcePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let i = 0; i < pages; i++) doc.addPage([612, 792]).drawText(`Record page ${i + 1}`, { x: 72, y: 700, font, size: 12 })
  return doc.save()
}

function outlineTitles(doc: PDFDocument): string[] {
  const titles: string[] = []
  const walk = (dict: PDFDict | undefined, depth: number) => {
    let node = dict
    while (node) {
      const title = node.lookup(PDFName.of('Title'), PDFHexString).decodeText()
      titles.push(`${'  '.repeat(depth)}${title}`)
      walk(node.lookupMaybe(PDFName.of('First'), PDFDict), depth + 1)
      node = node.lookupMaybe(PDFName.of('Next'), PDFDict)
    }
  }
  const root = doc.catalog.lookup(PDFName.of('Outlines'), PDFDict)
  walk(root.lookupMaybe(PDFName.of('First'), PDFDict), 0)
  return titles
}

const LETTER = [
  'CLEARCASEIQ SUPER DEMAND\u2122',
  'Attorney-Reviewed Settlement Demand Package',
  '',
  'I. INTRODUCTION',
  'This firm represents Jane Doe \u2014 a pedestrian struck on 3/4/2026. See Exhibit 1. Ex. 2, p. 3 shows the MRI. ',
  'Client name in Chinese: \u5f20\u4e09 \ud83d\ude00',
  '',
  'XVII. ENCLOSURE INDEX',
  'Liability',
  'Exhibit 1 \u2014 Police report',
].join('\n')

describe('wrapText', () => {
  it('wraps at word boundaries and splits over-long tokens', () => {
    const measure = (s: string) => s.length
    expect(wrapText('aaa bbb ccc', measure, 7)).toEqual(['aaa bbb', 'ccc'])
    expect(wrapText('abcdefghij', measure, 4)).toEqual(['abcd', 'efgh', 'ij'])
  })
})

describe('indexRows', () => {
  it('groups exhibits in enclosure order', () => {
    const ex = (number: string, group: PackageExhibit['group']): PackageExhibit => ({
      number,
      label: `L${number}`,
      group,
      source: { kind: 'missing', note: 'x' },
    })
    const rows = indexRows([ex('1', 'Damages'), ex('2', 'Liability'), ex('3', 'Damages')])
    expect(rows.map((r) => r.text)).toEqual(['Liability', 'Exhibit 2 \u2014 L2', 'Damages', 'Exhibit 1 \u2014 L1', 'Exhibit 3 \u2014 L3'])
  })
})

describe('assembleDemandPackage', () => {
  it('binds the letter, an index, slip sheets, and original exhibit pages with bookmarks', async () => {
    const image = await sharp({ create: { width: 400, height: 300, channels: 3, background: '#cc3333' } }).png().toBuffer()
    const exhibits: PackageExhibit[] = [
      { number: '1', label: 'Police report', group: 'Liability', source: { kind: 'pdf', bytes: await sourcePdf(1) } },
      { number: '2', label: 'MRI report', group: 'Medical Records', source: { kind: 'pdf', bytes: await sourcePdf(3) } },
      { number: '3', label: 'Scene photo', group: 'Liability', source: { kind: 'image', bytes: image } },
      { number: '4', label: 'Wage letter', group: 'Damages', source: { kind: 'text', text: 'Employer confirms 12 missed shifts.' } },
      { number: '5', label: 'Gone', group: 'Damages', source: { kind: 'missing', note: 'This exhibit is no longer on the case.' } },
    ]

    const { bytes, pageCount, batesEnd } = await assembleDemandPackage(
      { content: LETTER, template: 'super', status: 'DRAFT', title: 'Doe demand' },
      exhibits,
      { bates: { prefix: 'DOE', start: 120 } },
    )
    const doc = await PDFDocument.load(bytes)
    expect(pageCount).toBe(13)
    expect(batesEnd).toBe(132)

    // 1 letter + 1 index + 5 slip sheets + (1 + 3 + 1 + 1 + 0) exhibit pages
    expect(doc.getPageCount()).toBe(13)
    expect(doc.getTitle()).toBe('Doe demand')
    expect(doc.catalog.lookup(PDFName.of('PageMode'))).toEqual(PDFName.of('UseOutlines'))

    expect(outlineTitles(doc)).toEqual([
      'Demand letter',
      'Exhibit index',
      'Liability',
      '  Exhibit 1 \u2014 Police report',
      '  Exhibit 3 \u2014 Scene photo',
      'Medical Records',
      '  Exhibit 2 \u2014 MRI report',
      'Damages',
      '  Exhibit 4 \u2014 Wage letter',
      '  Exhibit 5 \u2014 Gone',
    ])
    const root = doc.catalog.lookup(PDFName.of('Outlines'), PDFDict)
    expect(root.lookup(PDFName.of('Count'), PDFNumber).asNumber()).toBe(10)

    // Every exhibit row on the index links to its slip sheet.
    const annots = doc.getPages()[1].node.Annots()
    expect(annots?.size()).toBe(5)
  })

  it('omits the index when there are no exhibits', async () => {
    const { bytes, batesEnd } = await assembleDemandPackage({ content: 'Plain letter.\nSecond line.' }, [])
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
    expect(batesEnd).toBeNull()
    expect(outlineTitles(doc)).toEqual(['Demand letter'])
  })

  it('spreads a long exhibit list over several index pages', async () => {
    const many: PackageExhibit[] = Array.from({ length: INDEX_ROWS_PER_PAGE + 5 }, (_, i) => ({
      number: String(i + 1),
      label: `Record ${i + 1}`,
      group: 'Medical Records',
      source: { kind: 'missing', note: 'x' },
    }))
    const { bytes } = await assembleDemandPackage({ content: 'Letter.' }, many)
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1 + 2 + many.length)
  })
})

describe('Bates numbering', () => {
  it('formats a zero-padded number after the prefix', () => {
    expect(formatBates('DOE', 123)).toBe('DOE-000123')
    expect(formatBates('DOE_', 7)).toBe('DOE_000007')
  })

  it('defaults the prefix to the client surname', () => {
    expect(defaultBatesPrefix('Jane Q. Doe')).toBe('DOE')
    expect(defaultBatesPrefix("Mary O'Brien-Smith")).toBe('OBRIENSMITH'.slice(0, 10))
    expect(defaultBatesPrefix('')).toBe('DEMAND')
  })

  it('normalizes settings and treats a disabled or blank prefix as off', () => {
    expect(normalizeBates({ prefix: 'doe<>', start: '45' })).toEqual({ prefix: 'doe', start: 45 })
    expect(normalizeBates({ prefix: 'DOE', start: -3 })).toEqual({ prefix: 'DOE', start: 1 })
    expect(normalizeBates({ prefix: 'DOE', enabled: false })).toBeNull()
    expect(normalizeBates({ prefix: '  ' })).toBeNull()
  })
})

describe('citedExhibitNumbers', () => {
  it('reads See Exhibit ranges and pinpoint cites', () => {
    const cited = citedExhibitNumbers('See Exhibits 1, 3\u20135. The MRI (Ex. 7, p. 2) and See Exhibit 9.')
    expect([...cited].sort((a, b) => Number(a) - Number(b))).toEqual(['1', '3', '4', '5', '7', '9'])
  })
})

describe('applyExhibitSelection', () => {
  const c = (key: string, number: string | null, enclosed: boolean) => ({ key, number, enclosed })
  const candidates = [c('ex:1', '1', true), c('ex:2', '2', true), c('ex:3', '3', true), c('file:a', null, false), c('file:b', null, false)]

  it('binds the letter enclosures in order when there is no selection', () => {
    expect(applyExhibitSelection(candidates).map((e) => e.key)).toEqual(['ex:1', 'ex:2', 'ex:3'])
  })

  it('reorders, drops, and adds files while enclosures keep their cited numbers', () => {
    const out = applyExhibitSelection(candidates, [
      { key: 'ex:3', include: true },
      { key: 'file:b', include: true },
      { key: 'ex:1', include: true },
      { key: 'ex:2', include: false },
      { key: 'file:a', include: false },
    ])
    expect(out.map((e) => `${e.key}=${e.number}`)).toEqual(['ex:3=3', 'file:b=4', 'ex:1=1'])
  })

  it('keeps an enclosure the selection never mentioned, at the end', () => {
    const out = applyExhibitSelection(candidates, [{ key: 'ex:2', include: true }])
    expect(out.map((e) => e.key)).toEqual(['ex:2', 'ex:1', 'ex:3'])
  })
})

describe('normalizePackageConfig', () => {
  it('keeps valid exhibit choices and Bates settings', () => {
    expect(
      normalizePackageConfig({ exhibits: [{ key: 'ex:1' }, { key: 'file:x', include: false }, { nope: 1 }], bates: { prefix: 'DOE', start: 10 } }),
    ).toEqual({ exhibits: [{ key: 'ex:1', include: true }, { key: 'file:x', include: false }], bates: { prefix: 'DOE', start: 10 } })
    expect(normalizePackageConfig({})).toEqual({ exhibits: null, bates: null })
  })
})

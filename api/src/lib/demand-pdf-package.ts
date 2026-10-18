/**
 * The demand package as one PDF: the letter, an exhibit index, then each
 * exhibit behind a slip sheet, with a bookmark per exhibit and every exhibit
 * page stamped "Ex. N, p. K" so the letter's pinpoint citations land on the
 * page they name.
 *
 * Exhibit numbering follows the Word export (planDemandExhibits): the letter's
 * enclosure index is the authority. Unlike Word, PDF exhibits are bound in as
 * the original pages rather than screenshots, so text stays selectable and the
 * page count matches the source file.
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import mammoth from 'mammoth'
import {
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type PDFRef,
} from 'pdf-lib'
import { logger } from './logger'
import { localPathFor, planDemandExhibitCandidates, type PlannedExhibit } from './demand-docx'
import {
  ENCLOSURE_GROUP_ORDER,
  GROUP_FOR_SECTION,
  SUPER_DEMAND_CONFIDENTIAL,
  SUPER_DEMAND_SUBTITLE,
  SUPER_DEMAND_TEMPLATE,
  type EnclosureGroup,
} from './super-demand'

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 72
/** Bottom band kept clear of letter text for the page number and exhibit stamp. */
const FOOTER = 54

/** Past this the remaining exhibit pages are noted on the slip sheet instead. */
export const MAX_PACKAGE_PAGES = 1500

const SUPER_HEADING = /^[IVXL]+\. [^a-z]+$/
const ENCLOSURE_GROUPS = new Set<string>(ENCLOSURE_GROUP_ORDER)

export const DRAFT_STAMP = 'DRAFT \u2014 NOT YET ATTORNEY APPROVED \u2014 DO NOT SEND'

export type ExhibitSource =
  | { kind: 'pdf'; bytes: Uint8Array; fallbackText?: string | null }
  | { kind: 'image'; bytes: Buffer }
  | { kind: 'text'; text: string; note?: string }
  | { kind: 'missing'; note: string }

export interface PackageExhibit {
  number: string
  label: string
  group: EnclosureGroup
  source: ExhibitSource
}

export interface PackageLetter {
  content: string
  template?: string | null
  status?: string | null
  title?: string | null
}

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont }
type Style = { font: PDFFont; size: number; align?: 'left' | 'center'; color?: ReturnType<typeof rgb> }

const GREY = rgb(0.4, 0.4, 0.4)
const RED = rgb(0.75, 0, 0)

// The standard PDF fonts only cover WinAnsi; anything outside it (CJK names,
// emoji, odd OCR glyphs) would make pdf-lib throw mid-document.
const SUBSTITUTES: Record<string, string> = { '\u2212': '-', '\u2192': '->', '\u2190': '<-', '\u2264': '<=', '\u2265': '>=', '\u2713': 'v' }
const encodable = new Map<string, string>()
function safeText(font: PDFFont, text: string): string {
  let out = ''
  for (const ch of text.replace(/\t/g, '    ').replace(/[\u0000-\u0008\u000b-\u001f]/g, '')) {
    let mapped = encodable.get(ch)
    if (mapped === undefined) {
      try {
        font.encodeText(ch)
        mapped = ch
      } catch {
        mapped = SUBSTITUTES[ch] ?? '?'
      }
      encodable.set(ch, mapped)
    }
    out += mapped
  }
  return out
}

export function wrapText(text: string, measure: (s: string) => number, maxWidth: number): string[] {
  const words = text.split(/ +/)
  const lines: string[] = []
  let current = ''
  const push = (word: string) => {
    // A single token wider than the line (a URL, a long claim number) is split by character.
    let rest = word
    while (measure(rest) > maxWidth && rest.length > 1) {
      let cut = rest.length - 1
      while (cut > 1 && measure(rest.slice(0, cut)) > maxWidth) cut--
      lines.push(rest.slice(0, cut))
      rest = rest.slice(cut)
    }
    current = rest
  }
  for (const word of words) {
    if (!current) {
      push(word)
      continue
    }
    const candidate = `${current} ${word}`
    if (measure(candidate) <= maxWidth) current = candidate
    else {
      lines.push(current)
      push(word)
    }
  }
  lines.push(current)
  return lines
}

/** Flows lines of text onto as many Letter pages as they need. */
class TextFlow {
  page: PDFPage | null = null
  y = 0
  readonly pages: PDFPage[] = []

  constructor(private doc: PDFDocument) {}

  newPage(): PDFPage {
    this.page = this.doc.addPage([PAGE_W, PAGE_H])
    this.pages.push(this.page)
    this.y = PAGE_H - MARGIN
    return this.page
  }

  gap(points: number) {
    if (!this.page) this.newPage()
    this.y -= points
  }

  paragraph(text: string, style: Style, leading = style.size * 1.35) {
    const clean = safeText(style.font, text)
    const width = PAGE_W - MARGIN * 2
    const lines = clean.trim() ? wrapText(clean, (s) => style.font.widthOfTextAtSize(s, style.size), width) : ['']
    for (const line of lines) {
      if (!this.page || this.y - leading < FOOTER) this.newPage()
      this.y -= leading
      if (!line) continue
      const x = style.align === 'center' ? (PAGE_W - style.font.widthOfTextAtSize(line, style.size)) / 2 : MARGIN
      this.page!.drawText(line, { x, y: this.y, size: style.size, font: style.font, color: style.color })
    }
  }
}

function drawLetter(doc: PDFDocument, fonts: Fonts, letter: PackageLetter): PDFPage[] {
  const flow = new TextFlow(doc)
  flow.newPage()
  const isSuper = letter.template === SUPER_DEMAND_TEMPLATE
  const lines = (letter.content || '').split(/\r?\n/)
  const titleEnd = lines.findIndex((l) => !l.trim())
  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line) {
      flow.gap(7)
      return
    }
    if (isSuper && titleEnd > 0 && i < titleEnd) {
      if (i === 0) flow.paragraph(line, { font: fonts.bold, size: 16, align: 'center' }, 22)
      else if (line === SUPER_DEMAND_CONFIDENTIAL) flow.paragraph(line, { font: fonts.italic, size: 8.5, align: 'center' })
      else flow.paragraph(line, { font: line === SUPER_DEMAND_SUBTITLE ? fonts.bold : fonts.regular, size: 10, align: 'center' })
      return
    }
    if (isSuper && SUPER_HEADING.test(line)) {
      flow.gap(8)
      flow.paragraph(line, { font: fonts.bold, size: 12 })
      flow.gap(3)
      return
    }
    if (isSuper && ENCLOSURE_GROUPS.has(line)) {
      flow.gap(4)
      flow.paragraph(line, { font: fonts.bold, size: 11 })
      return
    }
    flow.paragraph(raw.trimEnd(), { font: fonts.regular, size: 11 })
  })
  return flow.pages
}

type IndexRow = { kind: 'group'; text: string } | { kind: 'exhibit'; text: string; exhibit: number }

const INDEX_ROW_H = 18
const INDEX_TOP = PAGE_H - MARGIN - 50
export const INDEX_ROWS_PER_PAGE = Math.floor((INDEX_TOP - FOOTER) / INDEX_ROW_H)

export function indexRows(exhibits: PackageExhibit[]): IndexRow[] {
  const rows: IndexRow[] = []
  for (const group of ENCLOSURE_GROUP_ORDER) {
    const members = exhibits.map((e, i) => ({ e, i })).filter(({ e }) => e.group === group)
    if (!members.length) continue
    rows.push({ kind: 'group', text: group })
    for (const { e, i } of members) rows.push({ kind: 'exhibit', text: `Exhibit ${e.number} \u2014 ${e.label}`, exhibit: i })
  }
  return rows
}

function truncateTo(font: PDFFont, size: number, text: string, width: number): string {
  if (font.widthOfTextAtSize(text, size) <= width) return text
  let t = text
  while (t.length > 1 && font.widthOfTextAtSize(`${t}\u2026`, size) > width) t = t.slice(0, -1)
  return `${t}\u2026`
}

function link(doc: PDFDocument, page: PDFPage, rect: [number, number, number, number], target: PDFRef) {
  const annot = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: rect,
    Border: [0, 0, 0],
    Dest: [target, 'Fit'],
  })
  page.node.addAnnot(doc.context.register(annot))
}

function drawIndex(doc: PDFDocument, fonts: Fonts, pages: PDFPage[], rows: IndexRow[], slipPages: PDFPage[]) {
  const allPages = doc.getPages()
  const width = PAGE_W - MARGIN * 2
  pages.forEach((page, p) => {
    const heading = p === 0 ? 'EXHIBIT INDEX' : 'EXHIBIT INDEX (continued)'
    page.drawText(heading, {
      x: (PAGE_W - fonts.bold.widthOfTextAtSize(heading, 14)) / 2,
      y: PAGE_H - MARGIN - 14,
      size: 14,
      font: fonts.bold,
    })
    const hint = 'Select an exhibit to jump to it. Page numbers refer to this package.'
    page.drawText(hint, { x: (PAGE_W - fonts.italic.widthOfTextAtSize(hint, 9)) / 2, y: PAGE_H - MARGIN - 32, size: 9, font: fonts.italic, color: GREY })

    rows.slice(p * INDEX_ROWS_PER_PAGE, (p + 1) * INDEX_ROWS_PER_PAGE).forEach((row, r) => {
      const y = INDEX_TOP - r * INDEX_ROW_H
      if (row.kind === 'group') {
        page.drawText(safeText(fonts.bold, row.text), { x: MARGIN, y, size: 11, font: fonts.bold })
        return
      }
      const slip = slipPages[row.exhibit]
      const pageNo = String(allPages.indexOf(slip) + 1)
      const numW = fonts.regular.widthOfTextAtSize(pageNo, 10)
      const label = truncateTo(fonts.regular, 10, safeText(fonts.regular, row.text), width - 16 - numW - 24)
      const labelW = fonts.regular.widthOfTextAtSize(label, 10)
      page.drawText(label, { x: MARGIN + 16, y, size: 10, font: fonts.regular, color: rgb(0.1, 0.2, 0.55) })
      const dotsStart = MARGIN + 16 + labelW + 6
      const dotsEnd = PAGE_W - MARGIN - numW - 6
      if (dotsEnd > dotsStart) {
        page.drawLine({ start: { x: dotsStart, y: y + 2 }, end: { x: dotsEnd, y: y + 2 }, thickness: 0.5, color: GREY, dashArray: [1, 2] })
      }
      page.drawText(pageNo, { x: PAGE_W - MARGIN - numW, y, size: 10, font: fonts.regular })
      link(doc, page, [MARGIN, y - 4, PAGE_W - MARGIN, y + 12], slip.ref)
    })
  })
}

function slipSheet(doc: PDFDocument, fonts: Fonts, exhibit: PackageExhibit): PDFPage {
  const page = doc.addPage([PAGE_W, PAGE_H])
  const title = `EXHIBIT ${exhibit.number}`
  page.drawText(title, { x: (PAGE_W - fonts.bold.widthOfTextAtSize(title, 32)) / 2, y: PAGE_H / 2 + 40, size: 32, font: fonts.bold })
  const lines = wrapText(safeText(fonts.regular, exhibit.label), (s) => fonts.regular.widthOfTextAtSize(s, 13), PAGE_W - MARGIN * 2)
  lines.forEach((line, i) => {
    page.drawText(line, { x: (PAGE_W - fonts.regular.widthOfTextAtSize(line, 13)) / 2, y: PAGE_H / 2 - i * 18, size: 13, font: fonts.regular })
  })
  const group = exhibit.group.toUpperCase()
  page.drawText(group, { x: (PAGE_W - fonts.regular.widthOfTextAtSize(group, 9)) / 2, y: PAGE_H / 2 + 90, size: 9, font: fonts.regular, color: GREY })
  return page
}

function slipNote(fonts: Fonts, page: PDFPage, text: string, line: number) {
  const wrapped = wrapText(safeText(fonts.italic, text), (s) => fonts.italic.widthOfTextAtSize(s, 10), PAGE_W - MARGIN * 2 - 40)
  wrapped.forEach((l, i) => {
    page.drawText(l, {
      x: (PAGE_W - fonts.italic.widthOfTextAtSize(l, 10)) / 2,
      y: PAGE_H / 2 - 80 - (line + i) * 14,
      size: 10,
      font: fonts.italic,
      color: GREY,
    })
  })
  return line + wrapped.length
}

type Stamp = { page: PDFPage; text: string }

async function bindExhibit(
  doc: PDFDocument,
  fonts: Fonts,
  exhibit: PackageExhibit,
  slip: PDFPage,
  budget: { remaining: number },
): Promise<Stamp[]> {
  const stamps: Stamp[] = []
  let noteLine = 0
  const note = (text: string) => {
    noteLine = slipNote(fonts, slip, text, noteLine)
  }
  const textPages = (text: string, label: string) => {
    const flow = new TextFlow(doc)
    for (const para of text.replace(/\u0000/g, '').split(/\r?\n/)) {
      if (budget.remaining - flow.pages.length <= 0) break
      flow.paragraph(para, { font: fonts.regular, size: 10 })
    }
    flow.pages.forEach((page, i) => stamps.push({ page, text: `${label}, p. ${i + 1}` }))
    budget.remaining -= flow.pages.length
  }

  const source = exhibit.source
  if (budget.remaining <= 0 && source.kind !== 'missing') {
    note('Not bound in: this package reached its page limit. Attach the original file separately.')
    return stamps
  }

  if (source.kind === 'missing') {
    note(source.note)
    return stamps
  }

  if (source.kind === 'pdf') {
    try {
      const src = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false })
      const total = src.getPageCount()
      const take = Math.min(total, budget.remaining)
      const copied = await doc.copyPages(src, Array.from({ length: take }, (_, i) => i))
      copied.forEach((page, i) => {
        doc.addPage(page)
        stamps.push({ page, text: `Ex. ${exhibit.number}, p. ${i + 1}` })
      })
      budget.remaining -= take
      if (take < total) note(`Pages 1\u2013${take} of ${total} are bound in. Attach the original file for the complete exhibit.`)
      return stamps
    } catch (error: any) {
      logger.warn('Demand package could not bind PDF exhibit', { exhibit: exhibit.number, error: error?.message })
      if (source.fallbackText?.trim()) {
        note('The original PDF could not be bound in. Its extracted text follows.')
        textPages(source.fallbackText, `Ex. ${exhibit.number} (text)`)
      } else {
        note('The original PDF could not be bound in. Attach it separately.')
      }
      return stamps
    }
  }

  if (source.kind === 'image') {
    try {
      const { data, info } = await sharp(source.bytes)
        .rotate()
        .resize({ width: 2000, height: 2600, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 80 })
        .toBuffer({ resolveWithObject: true })
      const img = await doc.embedJpg(data)
      const page = doc.addPage([PAGE_W, PAGE_H])
      const maxW = PAGE_W - MARGIN
      const maxH = PAGE_H - MARGIN - FOOTER
      const scale = Math.min(maxW / info.width, maxH / info.height, 1)
      const w = info.width * scale
      const h = info.height * scale
      page.drawImage(img, { x: (PAGE_W - w) / 2, y: FOOTER + (maxH - h) / 2, width: w, height: h })
      stamps.push({ page, text: `Ex. ${exhibit.number}, p. 1` })
      budget.remaining -= 1
    } catch (error: any) {
      logger.warn('Demand package could not bind image exhibit', { exhibit: exhibit.number, error: error?.message })
      note('This image could not be bound in. Attach it separately.')
    }
    return stamps
  }

  if (source.note) note(source.note)
  textPages(source.text, `Ex. ${exhibit.number} (text)`)
  return stamps
}

export interface BatesOptions {
  prefix: string
  start: number
}

export const BATES_DIGITS = 6

export function formatBates(prefix: string, n: number): string {
  const p = prefix.trim()
  const joiner = !p || /[-_ ]$/.test(p) ? '' : '-'
  return `${p}${joiner}${String(n).padStart(BATES_DIGITS, '0')}`
}

/** "DOE" from "Jane Q. Doe": letters of the surname, upper-cased, for the default Bates prefix. */
export function defaultBatesPrefix(clientName: string | null | undefined): string {
  const words = String(clientName || '').trim().split(/\s+/).filter(Boolean)
  const surname = (words[words.length - 1] || '').replace(/[^A-Za-z]/g, '').toUpperCase()
  return surname.slice(0, 10) || 'DEMAND'
}

export function normalizeBates(raw: any): BatesOptions | null {
  if (!raw || raw.enabled === false) return null
  const prefix = String(raw.prefix ?? '').replace(/[^A-Za-z0-9_\- ]/g, '').trim().slice(0, 16)
  const start = Math.floor(Number(raw.start))
  if (!prefix) return null
  return { prefix, start: Number.isFinite(start) && start > 0 ? Math.min(start, 10 ** BATES_DIGITS - 1) : 1 }
}

function stampFooter(
  fonts: Fonts,
  page: PDFPage,
  index: number,
  total: number,
  stamp: string | undefined,
  draft: boolean,
  bates: string | null,
) {
  const box = page.getCropBox()
  if (bates) {
    const bw = fonts.bold.widthOfTextAtSize(bates, 9)
    page.drawRectangle({ x: box.x + 20, y: box.y + 13, width: bw + 8, height: 14, color: rgb(1, 1, 1) })
    page.drawText(bates, { x: box.x + 24, y: box.y + 17, size: 9, font: fonts.bold })
  }
  const pageText = `Page ${index + 1} of ${total}`
  const size = 8
  const pw = fonts.regular.widthOfTextAtSize(pageText, size)
  page.drawRectangle({ x: box.x + box.width / 2 - pw / 2 - 4, y: box.y + 14, width: pw + 8, height: 12, color: rgb(1, 1, 1) })
  page.drawText(pageText, { x: box.x + box.width / 2 - pw / 2, y: box.y + 17, size, font: fonts.regular, color: GREY })
  if (stamp) {
    const text = safeText(fonts.bold, stamp)
    const sw = fonts.bold.widthOfTextAtSize(text, 9)
    const x = box.x + box.width - sw - 24
    page.drawRectangle({ x: x - 4, y: box.y + 13, width: sw + 8, height: 14, color: rgb(1, 1, 1), borderColor: GREY, borderWidth: 0.5 })
    page.drawText(text, { x, y: box.y + 17, size: 9, font: fonts.bold })
  }
  if (draft) {
    const dw = fonts.bold.widthOfTextAtSize(DRAFT_STAMP, 9)
    page.drawText(DRAFT_STAMP, { x: box.x + (box.width - dw) / 2, y: box.y + box.height - 24, size: 9, font: fonts.bold, color: RED })
  }
}

type OutlineItem = { title: string; page: PDFPage; children?: OutlineItem[] }

/** pdf-lib has no bookmark API, so the outline tree is written as raw PDF objects. */
function writeOutline(doc: PDFDocument, items: OutlineItem[]) {
  const ctx = doc.context
  const rootRef = ctx.nextRef()
  const build = (list: OutlineItem[], parent: PDFRef): { first: PDFRef; last: PDFRef; count: number } => {
    const refs = list.map(() => ctx.nextRef())
    let count = list.length
    list.forEach((item, i) => {
      const entries: Record<string, any> = {
        Title: PDFHexString.fromText(item.title),
        Parent: parent,
        Dest: [item.page.ref, 'Fit'],
      }
      if (i > 0) entries.Prev = refs[i - 1]
      if (i < refs.length - 1) entries.Next = refs[i + 1]
      if (item.children?.length) {
        const sub = build(item.children, refs[i])
        entries.First = sub.first
        entries.Last = sub.last
        entries.Count = PDFNumber.of(sub.count)
        count += sub.count
      }
      ctx.assign(refs[i], ctx.obj(entries))
    })
    return { first: refs[0], last: refs[refs.length - 1], count }
  }
  const top = build(items, rootRef)
  ctx.assign(rootRef, ctx.obj({ Type: 'Outlines', First: top.first, Last: top.last, Count: PDFNumber.of(top.count) }))
  doc.catalog.set(PDFName.of('Outlines'), rootRef)
  doc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'))
}

export interface AssembledPackage {
  bytes: Uint8Array
  pageCount: number
  batesEnd: number | null
}

export async function assembleDemandPackage(
  letter: PackageLetter,
  exhibits: PackageExhibit[],
  options: { bates?: BatesOptions | null } = {},
): Promise<AssembledPackage> {
  const doc = await PDFDocument.create()
  doc.setTitle(letter.title?.trim() || 'Demand package')
  doc.setProducer('ClearCaseIQ')
  doc.setCreator('ClearCaseIQ')
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
  }

  const letterPages = drawLetter(doc, fonts, letter)
  const rows = indexRows(exhibits)
  const indexPages = exhibits.length
    ? Array.from({ length: Math.max(1, Math.ceil(rows.length / INDEX_ROWS_PER_PAGE)) }, () => doc.addPage([PAGE_W, PAGE_H]))
    : []

  const budget = { remaining: MAX_PACKAGE_PAGES - doc.getPageCount() }
  const slipPages: PDFPage[] = []
  const stamps = new Map<PDFPage, string>()
  for (const exhibit of exhibits) {
    const slip = slipSheet(doc, fonts, exhibit)
    slipPages.push(slip)
    budget.remaining -= 1
    for (const s of await bindExhibit(doc, fonts, exhibit, slip, budget)) stamps.set(s.page, s.text)
  }

  if (indexPages.length) drawIndex(doc, fonts, indexPages, rows, slipPages)

  const draft = letter.template === SUPER_DEMAND_TEMPLATE && letter.status === 'DRAFT'
  const pages = doc.getPages()
  const bates = options.bates ?? null
  pages.forEach((page, i) =>
    stampFooter(fonts, page, i, pages.length, stamps.get(page), draft, bates ? formatBates(bates.prefix, bates.start + i) : null),
  )

  const outline: OutlineItem[] = [{ title: 'Demand letter', page: letterPages[0] }]
  if (indexPages.length) {
    outline.push({ title: 'Exhibit index', page: indexPages[0] })
    for (const group of ENCLOSURE_GROUP_ORDER) {
      const children = exhibits
        .map((e, i) => ({ e, slip: slipPages[i] }))
        .filter(({ e }) => e.group === group)
        .map(({ e, slip }) => ({ title: `Exhibit ${e.number} \u2014 ${e.label}`, page: slip }))
      if (children.length) outline.push({ title: group, page: children[0].page, children })
    }
  }
  writeOutline(doc, outline)

  return {
    bytes: await doc.save(),
    pageCount: pages.length,
    batesEnd: bates ? bates.start + pages.length - 1 : null,
  }
}

/** Exhibit numbers the letter points at: "See Exhibit(s) 1, 3–5" and pinpoints like "Ex. 2, p. 4". */
export function citedExhibitNumbers(content: string): Set<string> {
  const cited = new Set<string>()
  for (const m of content.matchAll(/See Exhibits? ([\d,\s\u2013-]+)/g)) {
    for (const part of m[1].split(',')) {
      const [a, b] = part.trim().split(/[\u2013-]/).map((x) => Number(x))
      if (!Number.isFinite(a)) continue
      for (let n = a; n <= (Number.isFinite(b) ? b : a) && n - a < 500; n += 1) cited.add(String(n))
    }
  }
  for (const m of content.matchAll(/\bEx\. (\d+)/g)) cited.add(m[1])
  return cited
}

export interface ExhibitCandidate {
  /** `ex:<number>` for an exhibit the letter encloses, `file:<id>` for another case file. */
  key: string
  number: string | null
  label: string
  group: EnclosureGroup
  enclosed: boolean
  cited: boolean
  fileId: string | null
  fileName: string | null
  available: boolean
}

export type ExhibitChoice = { key: string; include: boolean }

/**
 * The exhibits to bind, in order. Enclosed exhibits keep the numbers the letter
 * cites them by, wherever they are moved; added files are numbered after the
 * highest enclosed number so they never collide with a citation. Without a
 * selection, the letter's own enclosures are bound in their order. An enclosure
 * the selection doesn't mention (added to the letter since) is kept, at the end.
 */
export function applyExhibitSelection<T extends { key: string; number: string | null; enclosed: boolean }>(
  candidates: T[],
  selection?: ExhibitChoice[] | null,
): Array<T & { number: string }> {
  const byKey = new Map(candidates.map((c) => [c.key, c]))
  const mentioned = new Set((selection ?? []).map((s) => s.key))
  const chosen: T[] = []
  const seen = new Set<string>()
  if (selection) {
    for (const s of selection) {
      const c = byKey.get(s.key)
      if (!c || !s.include || seen.has(c.key)) continue
      seen.add(c.key)
      chosen.push(c)
    }
  }
  for (const c of candidates) {
    if (c.enclosed && !mentioned.has(c.key) && !seen.has(c.key)) chosen.push(c)
  }
  const numbered = candidates.filter((c) => c.enclosed).map((c) => Number(c.number))
  let next = Math.max(0, ...numbered.filter((n) => Number.isFinite(n))) + 1
  return chosen.map((c) => ({ ...c, number: c.number ?? String(next++) }))
}

function groupOf(section: PlannedExhibit['section']): EnclosureGroup {
  return section ? GROUP_FOR_SECTION[section] : 'Additional Evidence'
}

export async function demandExhibitCandidates(
  assessmentId: string,
  content: string,
): Promise<Array<ExhibitCandidate & { planned: PlannedExhibit }>> {
  const { planned, extras } = await planDemandExhibitCandidates(assessmentId, content)
  const cited = citedExhibitNumbers(content)
  return [
    ...planned.map((e) => ({
      key: `ex:${e.number}`,
      number: e.number,
      label: e.label,
      group: groupOf(e.section),
      enclosed: true,
      cited: cited.has(e.number),
      fileId: e.file?.id ?? null,
      fileName: e.file?.originalName ?? null,
      available: Boolean(e.file),
      planned: e,
    })),
    ...extras.map((e) => ({
      key: `file:${e.file?.id ?? e.label}`,
      number: null,
      label: e.label,
      group: groupOf(e.section),
      enclosed: false,
      cited: false,
      fileId: e.file?.id ?? null,
      fileName: e.file?.originalName ?? null,
      available: Boolean(e.file),
      planned: e,
    })),
  ]
}

async function sourceFor(exhibit: PlannedExhibit): Promise<ExhibitSource> {
  const file = exhibit.file
  if (!file) return { kind: 'missing', note: 'This exhibit is no longer on the case. Attach it separately.' }
  const abs = await localPathFor(file)
  if (!abs) return { kind: 'missing', note: 'The file for this exhibit could not be found on the case. Attach it separately.' }

  const mime = (file.mimetype || '').toLowerCase()
  const ext = path.extname(file.originalName || abs).toLowerCase()
  try {
    if (mime === 'application/pdf' || ext === '.pdf') {
      return { kind: 'pdf', bytes: fs.readFileSync(abs), fallbackText: file.ocrText }
    }
    if (mime.startsWith('image/')) return { kind: 'image', bytes: fs.readFileSync(abs) }
    if (ext === '.docx') {
      const { value } = await mammoth.extractRawText({ path: abs })
      if (value.trim()) return { kind: 'text', text: value, note: 'Text of the original Word document follows.' }
    }
    if (mime.startsWith('text/') || ext === '.txt') return { kind: 'text', text: fs.readFileSync(abs, 'utf8') }
  } catch (error: any) {
    logger.warn('Demand package could not read exhibit', { fileId: file.id, mime, error: error?.message })
  }
  if (file.ocrText?.trim()) {
    return { kind: 'text', text: file.ocrText, note: 'This file type cannot be bound into a PDF. Its extracted text follows.' }
  }
  return { kind: 'missing', note: 'This file type cannot be bound into a PDF. Attach the original file separately.' }
}

export async function buildDemandPackagePdf(
  demand: {
    assessmentId: string
    content: string | null
    template?: string | null
    status?: string | null
    title?: string | null
  },
  options: { selection?: ExhibitChoice[] | null; bates?: BatesOptions | null } = {},
): Promise<AssembledPackage & { exhibitCount: number }> {
  const content = demand.content || ''
  const candidates = await demandExhibitCandidates(demand.assessmentId, content)
  const chosen = applyExhibitSelection(candidates, options.selection)
  const exhibits: PackageExhibit[] = []
  for (const e of chosen) {
    exhibits.push({ number: e.number, label: e.label, group: e.group, source: await sourceFor(e.planned) })
  }
  const assembled = await assembleDemandPackage(
    { content, template: demand.template, status: demand.status, title: demand.title },
    exhibits,
    { bates: options.bates },
  )
  return { ...assembled, exhibitCount: exhibits.length }
}

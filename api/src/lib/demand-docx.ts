/**
 * Word export of a demand letter with its exhibits bound in behind it.
 *
 * The letter's ENCLOSURES block is the authority on numbering: the text an
 * adjuster reads says "See Exhibit 3", so Exhibit 3 in the appendix has to be
 * the file that was enclosed as Exhibit 3 when the letter was written, even if
 * files were added to the case since. Letters with no ENCLOSURES block (pasted,
 * imported, or written before exhibits existed) get the case's current exhibit
 * set instead.
 *
 * Word cannot show a PDF inline, so PDF pages are rasterized; images are
 * embedded; .docx and text files contribute their text.
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import mammoth from 'mammoth'
import { AlignmentType, Document, ImageRun, Packer, Paragraph, TextRun } from 'docx'
import { prisma } from './prisma'
import { logger } from './logger'
import { ensureLocalCopy } from './object-storage'
import { loadPDFParse, type PDFParseInstance } from './pdf-parse-client'
import { buildDemandExhibits } from './demand-drafting'
import {
  SUPER_DEMAND_CONFIDENTIAL,
  SUPER_DEMAND_SECTION_HEADINGS,
  SUPER_DEMAND_SUBTITLE,
  SUPER_DEMAND_TEMPLATE,
  SUPER_DEMAND_TITLE,
} from './super-demand'

/** Letter page, 1" margins, at the 96 dpi docx uses for image transforms. */
const CONTENT_WIDTH_PX = 624
const CONTENT_HEIGHT_PX = 800

/**
 * A single medical-records PDF can run to hundreds of pages. Past these limits
 * the remaining pages are noted rather than embedded, which keeps the download
 * small enough to open and to email.
 */
const MAX_PAGES_PER_EXHIBIT = 40
const MAX_PAGES_TOTAL = 200

const ENCLOSURE_LINE = /^Exhibit (\d+|[A-Z]{1,2}) \u2014 (.+)$/
const ENCLOSURE_HEADINGS = new Set(['ENCLOSURES', 'XVII. ENCLOSURE INDEX'])
/** Category subheadings inside the Super Demand enclosure index. */
const ENCLOSURE_GROUPS = new Set(['Liability', 'Medical Records', 'Damages', 'Additional Evidence'])

type ExhibitFile = {
  id: string
  originalName: string
  mimetype: string
  filePath: string
  fileUrl: string
  ocrText: string | null
}

type PlannedExhibit = { number: string; label: string; file: ExhibitFile | null }

export function enclosuresIn(content: string): Array<{ number: string; label: string }> {
  const lines = content.split(/\r?\n/)
  const start = lines.findIndex((l) => ENCLOSURE_HEADINGS.has(l.trim()))
  if (start < 0) return []
  const out: Array<{ number: string; label: string }> = []
  for (const raw of lines.slice(start + 1)) {
    const line = raw.trim()
    const m = ENCLOSURE_LINE.exec(line)
    if (m) {
      out.push({ number: m[1], label: m[2].trim() })
      continue
    }
    if (!line || ENCLOSURE_GROUPS.has(line)) continue
    break
  }
  return out
}

export async function planDemandExhibits(assessmentId: string, content: string): Promise<PlannedExhibit[]> {
  const files = await prisma.evidenceFile.findMany({
    where: { assessmentId },
    select: {
      id: true,
      category: true,
      subcategory: true,
      originalName: true,
      createdAt: true,
      identityCheck: true,
      mimetype: true,
      filePath: true,
      fileUrl: true,
      ocrText: true,
    },
  })
  const byId = new Map(files.map((f) => [f.id, f]))
  const current = buildDemandExhibits(files).map((e) => ({
    number: String(e.number),
    label: e.label,
    file: (e.fileId && byId.get(e.fileId)) || null,
  }))

  const listed = enclosuresIn(content)
  if (!listed.length) return current

  const byLabel = new Map(current.map((e) => [e.label, e.file]))
  return listed.map((e) => ({ ...e, file: byLabel.get(e.label) ?? null }))
}

async function localPathFor(file: ExhibitFile): Promise<string | null> {
  const candidates = [
    file.fileUrl?.startsWith('/uploads/') ? path.join(process.cwd(), file.fileUrl) : null,
    file.filePath ? path.resolve(process.cwd(), file.filePath) : null,
  ].filter((p): p is string => Boolean(p))
  for (const p of candidates) {
    if (await ensureLocalCopy(p).catch(() => false)) return p
  }
  return null
}

function fitted(width: number, height: number, maxHeight = CONTENT_HEIGHT_PX) {
  const scale = Math.min(1, CONTENT_WIDTH_PX / width, maxHeight / height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

async function imageParagraph(input: Buffer, altName: string, pageBreakBefore: boolean): Promise<Paragraph> {
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 2100, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 72 })
    .toBuffer({ resolveWithObject: true })
  return new Paragraph({
    pageBreakBefore,
    alignment: AlignmentType.CENTER,
    children: [
      new ImageRun({
        type: 'jpg',
        data,
        transformation: fitted(info.width, info.height, pageBreakBefore ? CONTENT_HEIGHT_PX + 60 : CONTENT_HEIGHT_PX),
        altText: { name: altName, title: altName, description: altName },
      }),
    ],
  })
}

function note(text: string): Paragraph {
  return new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text, italics: true, color: '666666' })] })
}

function textParagraphs(text: string): Paragraph[] {
  return text
    .replace(/\u0000/g, '')
    .split(/\r?\n/)
    .map((line) => new Paragraph(line))
}

async function pdfPages(
  abs: string,
  label: string,
  budget: { remaining: number },
): Promise<{ paragraphs: Paragraph[]; total: number; embedded: number }> {
  let parser: PDFParseInstance | null = null
  try {
    const PDFParse = await loadPDFParse()
    parser = new PDFParse({ data: fs.readFileSync(abs) })
    const info = await parser.getInfo()
    const total = Number(info?.total) || 0
    const take = Math.min(total || MAX_PAGES_PER_EXHIBIT, MAX_PAGES_PER_EXHIBIT, budget.remaining)
    if (take <= 0) return { paragraphs: [], total, embedded: 0 }

    const shot = await parser.getScreenshot({ scale: 1.5, first: 1, last: take, imageBuffer: true, imageDataUrl: false })
    const paragraphs: Paragraph[] = []
    for (const [i, page] of (shot.pages || []).entries()) {
      if (!page?.data) continue
      paragraphs.push(await imageParagraph(Buffer.from(page.data), `${label}, page ${page.pageNumber}`, i > 0))
    }
    budget.remaining -= paragraphs.length
    return { paragraphs, total: total || paragraphs.length, embedded: paragraphs.length }
  } finally {
    await parser?.destroy?.().catch(() => undefined)
  }
}

async function exhibitBody(file: ExhibitFile, label: string, budget: { remaining: number }): Promise<Paragraph[]> {
  const abs = await localPathFor(file)
  if (!abs) return [note('The file for this exhibit could not be found on the case. Attach it separately.')]

  const mime = (file.mimetype || '').toLowerCase()
  const ext = path.extname(file.originalName || abs).toLowerCase()

  try {
    if (mime === 'application/pdf' || ext === '.pdf') {
      if (budget.remaining <= 0) {
        return [note('Not embedded: this export reached its page limit. Attach the original file separately.')]
      }
      const { paragraphs, total, embedded } = await pdfPages(abs, label, budget)
      if (!embedded) throw new Error('No pages rendered')
      return total > embedded
        ? [...paragraphs, note(`Pages 1\u2013${embedded} of ${total} shown. Attach the original file for the complete exhibit.`)]
        : paragraphs
    }

    if (mime.startsWith('image/')) {
      return [await imageParagraph(fs.readFileSync(abs), label, false)]
    }

    if (ext === '.docx') {
      const { value } = await mammoth.extractRawText({ path: abs })
      if (value.trim()) return textParagraphs(value)
    }

    if (mime.startsWith('text/') || ext === '.txt') {
      return textParagraphs(fs.readFileSync(abs, 'utf8'))
    }
  } catch (error: any) {
    logger.warn('Demand export could not embed exhibit', { fileId: file.id, mime, error: error?.message })
  }

  if (file.ocrText?.trim()) {
    return [note('Extracted text of the original file:'), ...textParagraphs(file.ocrText)]
  }
  return [note('This file type cannot be shown inside a Word document. Attach the original file separately.')]
}

const SUPER_HEADINGS = new Set<string>(SUPER_DEMAND_SECTION_HEADINGS)
const SUPER_TITLE_LINES = new Set([SUPER_DEMAND_TITLE, SUPER_DEMAND_SUBTITLE, SUPER_DEMAND_CONFIDENTIAL])

function superDemandParagraph(line: string): Paragraph {
  const trimmed = line.trim()
  if (trimmed === SUPER_DEMAND_TITLE) {
    return new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: trimmed, bold: true, size: 32 })] })
  }
  if (SUPER_TITLE_LINES.has(trimmed)) {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: trimmed, bold: trimmed === SUPER_DEMAND_SUBTITLE, italics: trimmed === SUPER_DEMAND_CONFIDENTIAL, size: 20 })],
    })
  }
  if (SUPER_HEADINGS.has(trimmed)) {
    return new Paragraph({ spacing: { before: 240, after: 80 }, children: [new TextRun({ text: trimmed, bold: true, size: 24 })] })
  }
  if (ENCLOSURE_GROUPS.has(trimmed)) {
    return new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: trimmed, bold: true, underline: {} })] })
  }
  return new Paragraph(line)
}

export async function buildDemandLetterDocx(demand: {
  assessmentId: string
  content: string | null
  template?: string | null
  status?: string | null
}): Promise<Buffer> {
  const content = demand.content || ''
  const isSuper = demand.template === SUPER_DEMAND_TEMPLATE
  const draftBanner =
    isSuper && demand.status === 'DRAFT'
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: 'DRAFT \u2014 NOT YET ATTORNEY APPROVED \u2014 DO NOT SEND', bold: true, color: 'C00000' })],
          }),
        ]
      : []
  const letter = {
    children: [
      ...draftBanner,
      ...content.split(/\r?\n/).map((line) => (isSuper ? superDemandParagraph(line) : new Paragraph(line))),
    ],
  }

  const planned = await planDemandExhibits(demand.assessmentId, content).catch((error: any) => {
    logger.warn('Demand export could not load exhibits', { assessmentId: demand.assessmentId, error: error?.message })
    return [] as PlannedExhibit[]
  })

  const budget = { remaining: MAX_PAGES_TOTAL }
  const exhibitSections = []
  for (const exhibit of planned) {
    const heading = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `EXHIBIT ${exhibit.number}`, bold: true, size: 32 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: exhibit.label, size: 22 })],
      }),
    ]
    const body = exhibit.file
      ? await exhibitBody(exhibit.file, `Exhibit ${exhibit.number}`, budget)
      : [note('This exhibit is no longer on the case. Attach it separately.')]
    exhibitSections.push({ children: [...heading, ...body] })
  }

  const doc = new Document({ sections: [letter, ...exhibitSections] })
  return Packer.toBuffer(doc)
}

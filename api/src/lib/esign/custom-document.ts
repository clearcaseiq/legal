/**
 * Builds the signable PDF for a firm's own retainer / HIPAA template with the
 * essential fields filled in, keeping every clause the firm wrote.
 *
 *  - PDF with fillable form fields: matching fields are filled and flattened.
 *  - PDF without matching fields: a filled "Key terms" page goes in front of
 *    the firm's pages, which are copied unchanged.
 *  - Word (.docx) or text body: {{tokens}} are replaced in place; a template
 *    with no tokens gets the Key terms page in front instead.
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import { PDFDocument as LibPdf, PDFTextField, PDFCheckBox } from 'pdf-lib'
import mammoth from 'mammoth'
import { logger } from '../logger'
import { persistUpload, ensureLocalCopy } from '../object-storage'
import { renderMarkdown, resolveTemplateTokens } from './firm-template-doc'
import {
  essentialFieldsFor,
  normalizeFieldName,
  valueLookup,
  type EssentialDocType,
  type EssentialValues,
} from './essential-fields'

const OUTPUT_DIR = path.join(process.cwd(), 'uploads', 'signable-documents')
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

export type CustomDocumentSource =
  | { kind: 'file'; filePath: string; mime: string; fileName?: string | null }
  | { kind: 'body'; body: string }

export type FillMode = 'form_fields' | 'key_terms_page' | 'tokens'

export type BuiltCustomDocument = {
  filePath: string
  sha256: string
  mode: FillMode
  /** Form fields / tokens that were filled, for the attorney's confirmation. */
  filledNames: string[]
}

export class CustomDocumentError extends Error {
  status = 400
}

export function isDocx(mime?: string | null, fileName?: string | null): boolean {
  return mime === DOCX_MIME || /\.docx$/i.test(String(fileName || ''))
}

export function isSupportedTemplateFile(mime?: string | null, fileName?: string | null): boolean {
  return mime === 'application/pdf' || /\.pdf$/i.test(String(fileName || '')) || isDocx(mime, fileName)
}

const DOC_TITLES: Record<EssentialDocType, string> = {
  retainer: 'Retainer agreement',
  hipaa_authorization: 'HIPAA authorization',
}

function pdfkitToBuffer(draw: (doc: InstanceType<typeof PDFDocument>) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 54 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    draw(doc)
    doc.end()
  })
}

function drawSignatureBlock(doc: InstanceType<typeof PDFDocument>, docType: EssentialDocType) {
  doc.moveDown(1.5).font('Helvetica').fontSize(10).fillColor('#111827')
  const label = docType === 'hipaa_authorization' ? 'Patient signature' : 'Client signature'
  doc.text(`${label}: ______________________________`, { continued: true }).text('        Date: ____________________')
  if (docType === 'retainer') {
    doc.moveDown(0.8)
    doc.text('Attorney signature: ____________________________', { continued: true }).text('        Date: ____________________')
  }
  doc
    .moveDown(0.3)
    .font('Helvetica-Oblique')
    .fontSize(8)
    .fillColor('#6b7280')
    .text('Executed electronically; signer identity, timestamp, and integrity are recorded in the provider audit trail.')
}

/** The filled essential fields as a cover page, grouped as on the send form. */
function renderKeyTermsPage(docType: EssentialDocType, title: string, values: EssentialValues): Promise<Buffer> {
  return pdfkitToBuffer((doc) => {
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0b1220').text(title)
    doc
      .moveDown(0.2)
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#6b7280')
      .text(`Key terms of this ${DOC_TITLES[docType].toLowerCase()}. The full terms follow on the next pages.`)
    let group = ''
    for (const field of essentialFieldsFor(docType)) {
      if (field.group === 'Signatures' || field.group === 'Signature') continue
      if (field.group !== group) {
        group = field.group
        doc.moveDown(0.7).font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(group)
      }
      const value = String(values[field.key] || '').trim() || '__________'
      doc
        .moveDown(0.15)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor('#374151')
        .text(`${field.label}: `, { continued: true })
        .font('Helvetica')
        .fillColor('#111827')
        .text(value)
    }
    drawSignatureBlock(doc, docType)
  })
}

/** Tokens: essential fields (and aliases) first, then the generic case tokens. */
async function tokenLookup(leadId: string, docType: EssentialDocType, values: EssentialValues) {
  const generic = await resolveTemplateTokens(leadId).catch(() => ({}) as Record<string, string>)
  const lookup = new Map<string, string>()
  for (const [k, v] of Object.entries(generic)) lookup.set(normalizeFieldName(k), v)
  for (const [k, v] of valueLookup(docType, values)) if (v || !lookup.has(k)) lookup.set(k, v)
  return lookup
}

function fillTokens(text: string, lookup: Map<string, string>, filled: Set<string>): string {
  return text.replace(TOKEN_RE, (_m, raw: string) => {
    const key = normalizeFieldName(raw)
    const v = lookup.get(key)
    filled.add(key)
    return v && v.trim() ? v : '__________'
  })
}

/** Word HTML from mammoth → the markdown subset our pdfkit renderer draws. */
function htmlToMarkdown(html: string): string {
  const decode = (s: string) =>
    s
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  return decode(
    html
      .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
      .replace(/<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/gi, '\n### $1\n')
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|tr|table|ul|ol)>/gi, '\n\n')
      .replace(/<\/t[dh]>/gi, '  ')
      .replace(/<[^>]+>/g, ''),
  )
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function renderBodyPdf(title: string, body: string, docType: EssentialDocType): Promise<Buffer> {
  return pdfkitToBuffer((doc) => {
    if (!body.trimStart().startsWith('# ')) {
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#0b1220').text(title)
      doc.moveDown(0.5)
    }
    renderMarkdown(doc, body)
    drawSignatureBlock(doc, docType)
  })
}

async function prependPage(cover: Buffer, original: Buffer): Promise<Buffer> {
  const out = await LibPdf.create()
  const [coverDoc, origDoc] = await Promise.all([LibPdf.load(cover), LibPdf.load(original, { ignoreEncryption: true })])
  for (const p of await out.copyPages(coverDoc, coverDoc.getPageIndices())) out.addPage(p)
  for (const p of await out.copyPages(origDoc, origDoc.getPageIndices())) out.addPage(p)
  return Buffer.from(await out.save())
}

async function fillPdf(params: {
  source: Buffer
  docType: EssentialDocType
  title: string
  values: EssentialValues
}): Promise<{ bytes: Buffer; mode: FillMode; filledNames: string[] }> {
  let pdf: LibPdf
  try {
    pdf = await LibPdf.load(params.source, { ignoreEncryption: true })
  } catch {
    throw new CustomDocumentError('This PDF could not be read. Re-save it as a standard PDF and upload it again.')
  }
  const lookup = valueLookup(params.docType, params.values)
  const filledNames: string[] = []
  try {
    const form = pdf.getForm()
    for (const field of form.getFields()) {
      const name = field.getName()
      const value = lookup.get(normalizeFieldName(name.split('.').pop() || name))
      if (value === undefined) continue
      if (field instanceof PDFTextField) {
        field.setText(value)
        filledNames.push(name)
      } else if (field instanceof PDFCheckBox && /^(yes|true|x)$/i.test(value)) {
        field.check()
        filledNames.push(name)
      }
    }
    if (filledNames.length) form.flatten()
  } catch (err) {
    logger.warn('PDF form fill failed; using key terms page', { error: err instanceof Error ? err.message : String(err) })
    filledNames.length = 0
  }
  if (filledNames.length) return { bytes: Buffer.from(await pdf.save()), mode: 'form_fields', filledNames }

  const cover = await renderKeyTermsPage(params.docType, params.title, params.values)
  return { bytes: await prependPage(cover, params.source), mode: 'key_terms_page', filledNames: [] }
}

/** Build the filled PDF, write it under uploads/, and return its path + hash. */
export async function buildCustomDocument(params: {
  leadId: string
  docType: EssentialDocType
  title: string
  values: EssentialValues
  source: CustomDocumentSource
}): Promise<BuiltCustomDocument> {
  let bytes: Buffer
  let mode: FillMode
  let filledNames: string[] = []

  const fromText = async (text: string) => {
    const lookup = await tokenLookup(params.leadId, params.docType, params.values)
    const filled = new Set<string>()
    const body = fillTokens(text, lookup, filled)
    filledNames = [...filled]
    const rendered = await renderBodyPdf(params.title, body, params.docType)
    if (filled.size) return { bytes: rendered, mode: 'tokens' as FillMode }
    const cover = await renderKeyTermsPage(params.docType, params.title, params.values)
    return { bytes: await prependPage(cover, rendered), mode: 'key_terms_page' as FillMode }
  }

  if (params.source.kind === 'body') {
    ;({ bytes, mode } = await fromText(params.source.body))
  } else {
    const local = params.source.filePath
    const present = await ensureLocalCopy(local).catch(() => false)
    if (!present && !fs.existsSync(local)) throw new CustomDocumentError('The template file is missing. Upload it again.')
    if (isDocx(params.source.mime, params.source.fileName || local)) {
      const { value: html } = await mammoth.convertToHtml({ path: local })
      ;({ bytes, mode } = await fromText(htmlToMarkdown(html)))
    } else if (params.source.mime === 'application/pdf' || /\.pdf$/i.test(local)) {
      ;({ bytes, mode, filledNames } = await fillPdf({
        source: fs.readFileSync(local),
        docType: params.docType,
        title: params.title,
        values: params.values,
      }))
    } else {
      throw new CustomDocumentError('Only PDF and Word (.docx) templates can be filled. Save older .doc files as .docx.')
    }
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const filePath = path.join(OUTPUT_DIR, `custom-${params.docType}-${params.leadId}-${Date.now()}.pdf`)
  fs.writeFileSync(filePath, bytes)
  await persistUpload(filePath)
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')
  logger.info('Built custom signable document', { leadId: params.leadId, docType: params.docType, mode, filePath })
  return { filePath, sha256, mode, filledNames }
}

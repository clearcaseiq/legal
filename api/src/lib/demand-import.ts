/**
 * Importing a demand letter authored outside ClearCaseIQ.
 *
 * Attorneys frequently draft demands in Word or Google Docs. Rather than force
 * them to paste plain text (and lose all formatting), we keep the ORIGINAL file
 * as the canonical, downloadable artifact and extract plain text from it only so
 * the case record, search, the change feed, and AI context still "see" the
 * letter. This module owns that extraction; the route owns persistence.
 */
import path from 'path'
import { logger } from './logger'
import { loadPDFParse } from './pdf-parse-client'

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const DOC_MIME = 'application/msword'

/** Human-facing list of what import accepts, for error copy and the file picker. */
export const IMPORT_ACCEPT = '.pdf,.docx,.txt'

function extFor(filename: string): string {
  return path.extname(filename || '').toLowerCase()
}

/** Whether a buffer/filename is a format we can pull text out of. */
export function isSupportedDemandFile(mimetype: string, filename: string): boolean {
  const ext = extFor(filename)
  if (mimetype === 'application/pdf' || ext === '.pdf') return true
  if (mimetype === DOCX_MIME || ext === '.docx') return true
  if (mimetype?.startsWith('text/') || ext === '.txt') return true
  return false
}

function normalize(text: string): string {
  // Strip NULs (Postgres text columns reject them) and collapse the runaway
  // whitespace PDF/DOCX extraction tends to emit, while keeping paragraph breaks.
  return text
    .replace(/\u0000/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const PDFParse = await loadPDFParse()
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return typeof result?.text === 'string' ? result.text : ''
  } finally {
    // pdf-parse holds worker resources; release them so a burst of imports
    // doesn't leak. Best-effort — some versions expose no destroy().
    await (parser as any)?.destroy?.().catch?.(() => {})
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  // Lazy import: mammoth pulls in a heavy dependency tree we don't want on the
  // hot path of every request that touches this module.
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result?.value || ''
}

/**
 * Pull plain text out of an uploaded demand letter. Throws a caller-friendly
 * Error for unsupported formats (legacy .doc, images) so the route can return a
 * 400 with a clear message rather than a 500.
 */
export async function extractDemandText(
  buffer: Buffer,
  mimetype: string,
  filename: string,
): Promise<string> {
  const ext = extFor(filename)

  try {
    if (mimetype === 'application/pdf' || ext === '.pdf') {
      return normalize(await extractPdf(buffer))
    }
    if (mimetype === DOCX_MIME || ext === '.docx') {
      return normalize(await extractDocx(buffer))
    }
    if (mimetype?.startsWith('text/') || ext === '.txt') {
      return normalize(buffer.toString('utf8'))
    }
  } catch (error: any) {
    logger.warn('Demand import text extraction failed', { filename, mimetype, error: error?.message })
    throw new Error('Could not read text from that file. Try a PDF, .docx, or paste the text directly.')
  }

  if (mimetype === DOC_MIME || ext === '.doc') {
    throw new Error('Legacy .doc files are not supported. Re-save as .docx or PDF, or paste the text.')
  }
  throw new Error('Unsupported file type. Upload a PDF, .docx, or .txt — or paste the text directly.')
}

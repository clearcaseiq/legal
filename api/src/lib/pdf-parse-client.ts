import './node-dom-polyfills'
import path from 'path'

type PDFParseClass = typeof import('pdf-parse').PDFParse

let PDFParseCtor: PDFParseClass | null = null

/**
 * pdf.js draws non-embedded fonts (Helvetica, Times, Courier, common in
 * generated bills and records) from this folder. Without it a Linux server
 * with no system fonts renders those pages with every word missing.
 */
export function standardFontDataUrl(): string | undefined {
  try {
    const fromPdfParse = path.dirname(require.resolve('pdf-parse'))
    const pkg = require.resolve('pdfjs-dist/package.json', { paths: [fromPdfParse] })
    return path.join(path.dirname(pkg), 'standard_fonts').replace(/\\/g, '/') + '/'
  } catch {
    return undefined
  }
}

export async function loadPDFParse(): Promise<PDFParseClass> {
  if (!PDFParseCtor) {
    const mod = await import('pdf-parse')
    const fonts = standardFontDataUrl()
    PDFParseCtor = fonts
      ? (class extends mod.PDFParse {
          constructor(options: ConstructorParameters<PDFParseClass>[0]) {
            super({ standardFontDataUrl: fonts, ...options })
          }
        } as PDFParseClass)
      : mod.PDFParse
  }
  return PDFParseCtor
}

export type PDFParseInstance = InstanceType<PDFParseClass>

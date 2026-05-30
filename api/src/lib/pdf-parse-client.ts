import './node-dom-polyfills'

type PDFParseClass = typeof import('pdf-parse').PDFParse

let PDFParseCtor: PDFParseClass | null = null

export async function loadPDFParse(): Promise<PDFParseClass> {
  if (!PDFParseCtor) {
    const mod = await import('pdf-parse')
    PDFParseCtor = mod.PDFParse
  }
  return PDFParseCtor
}

export type PDFParseInstance = InstanceType<PDFParseClass>

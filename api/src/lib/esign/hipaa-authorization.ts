/**
 * Renders a provider-directed HIPAA authorization PDF (layer 2) from the same
 * canonical text used for platform consent (consent-templates.ts `hipaa`), so
 * the two never drift. The rendered PDF becomes the source document for a
 * DocumentEnvelope of documentType 'hipaa_authorization'.
 *
 * The e-signature provider adds the binding signature + tamper-evident audit
 * trail; this file only produces the unsigned, filled-in authorization.
 */
import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import { logger } from '../logger'
import { CONSENT_TEMPLATES } from '../consent-templates'

const OUTPUT_DIR = path.join(process.cwd(), 'uploads', 'signable-documents')

export interface HipaaAuthorizationContext {
  leadId: string
  /** The person authorizing disclosure (the client/plaintiff). */
  clientName: string
  clientDob?: string
  /** The provider/records custodian this authorization is directed to. */
  recordsCustodian?: string
  /** Date range of records covered (defaults to all dates relevant to claim). */
  recordsDateRange?: string
  /** Optional case/matter reference printed on the form. */
  caseRef?: string
}

function ensureDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

type PdfDoc = InstanceType<typeof PDFDocument>

/** Minimal markdown -> pdfkit renderer covering the subset used by the template. */
function renderMarkdown(doc: PdfDoc, markdown: string) {
  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trimEnd()
    if (line === '') {
      doc.moveDown(0.5)
      continue
    }
    if (line.startsWith('### ')) {
      doc.moveDown(0.3).font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(line.slice(4))
      doc.font('Helvetica').fontSize(10).fillColor('#1f2937')
    } else if (line.startsWith('## ')) {
      doc.moveDown(0.4).font('Helvetica-Bold').fontSize(13).fillColor('#0b1220').text(line.slice(3))
      doc.font('Helvetica').fontSize(10).fillColor('#1f2937')
    } else if (line.startsWith('# ')) {
      doc.font('Helvetica-Bold').fontSize(17).fillColor('#0b1220').text(line.slice(2))
      doc.font('Helvetica').fontSize(10).fillColor('#1f2937')
    } else if (line.startsWith('- ')) {
      doc.font('Helvetica').fontSize(10).fillColor('#1f2937').text(`•  ${line.slice(2)}`, { indent: 12 })
    } else {
      doc.font('Helvetica').fontSize(10).fillColor('#1f2937').text(line)
    }
  }
}

/**
 * Render the filled HIPAA authorization to disk and return its absolute path
 * plus a title suitable for the envelope.
 */
export async function renderHipaaAuthorizationPdf(
  ctx: HipaaAuthorizationContext
): Promise<{ filePath: string; title: string }> {
  ensureDir()
  const tpl = CONSENT_TEMPLATES.hipaa
  const title = `HIPAA authorization — ${ctx.clientName}`
  const filePath = path.join(OUTPUT_DIR, `hipaa-${ctx.leadId}-${Date.now()}.pdf`)

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 54 })
    const stream = fs.createWriteStream(filePath)
    stream.on('finish', resolve)
    stream.on('error', reject)
    doc.on('error', reject)
    doc.pipe(stream)

    // Filled-in header (the case-specific facts).
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280').text('AUTHORIZATION FOR RELEASE OF PROTECTED HEALTH INFORMATION')
    doc.moveDown(0.5)
    const facts: [string, string][] = [
      ['Patient / authorizing party', ctx.clientName],
      ['Date of birth', ctx.clientDob || '—'],
      ['Records custodian / provider', ctx.recordsCustodian || 'As directed by counsel'],
      ['Records date range', ctx.recordsDateRange || 'All dates relevant to the claim'],
      ['Authorization version', `${tpl.version} (effective ${tpl.effectiveDate})`],
      ['Case reference', ctx.caseRef || ctx.leadId],
    ]
    for (const [label, value] of facts) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(`${label}: `, { continued: true })
      doc.font('Helvetica').fillColor('#1f2937').text(value)
    }
    doc.moveDown(0.5)

    // Canonical authorization text.
    renderMarkdown(doc, tpl.content)

    // Signature area (the provider overlays the actual e-signature + timestamp).
    doc.moveDown(1)
    doc.font('Helvetica').fontSize(10).fillColor('#111827')
    doc.text('Signature: ______________________________', { continued: true })
    doc.text('        Date: ____________________')
    doc.moveDown(0.3)
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#6b7280')
      .text('Executed electronically; signer identity, timestamp, and integrity are recorded in the provider audit trail.')

    doc.end()
  })

  logger.info('Rendered HIPAA authorization PDF', { leadId: ctx.leadId, filePath })
  return { filePath, title }
}

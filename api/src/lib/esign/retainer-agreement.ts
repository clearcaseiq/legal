/**
 * Renders a filled contingency-fee retainer / representation agreement PDF that
 * becomes the source document for a DocumentEnvelope of documentType 'retainer'.
 *
 * Mirrors hipaa-authorization.ts: this file only produces the unsigned, filled
 * agreement; the e-signature provider adds the binding signature + tamper-evident
 * audit trail. The body text is a reasonable contingency-fee template with the
 * case-specific fee terms filled into a facts header. Firms should review the
 * template against their jurisdiction's rules of professional conduct.
 */
import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import { logger } from '../logger'

const OUTPUT_DIR = path.join(process.cwd(), 'uploads', 'signable-documents')

export const RETAINER_TEMPLATE_VERSION = '1.0'
export const RETAINER_TEMPLATE_EFFECTIVE_DATE = '2026-03-01'

export interface RetainerAgreementContext {
  leadId: string
  /** The client/plaintiff who signs the agreement. */
  clientName: string
  /** Firm engaged (defaults to the attorney's firm/name). */
  firmName?: string
  /** Responsible attorney. */
  attorneyName?: string
  /** Contingency fee percentage (e.g. 33.33). */
  contingencyPercent?: number
  /** Who fronts / bears case costs and expenses. */
  costsResponsibility?: string
  /** Scope of the representation (matter description). */
  scope?: string
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

function buildBody(ctx: RetainerAgreementContext, feeText: string, costsText: string, scopeText: string) {
  const firm = ctx.firmName || ctx.attorneyName || 'the Firm'
  return `
# Contingency Fee Representation Agreement

This Representation Agreement ("Agreement") is entered into between ${ctx.clientName} ("Client") and ${firm} ("Firm") for legal representation in the matter described below.

## 1. Scope of Representation
${scopeText}
The Firm will provide legal services reasonably necessary to pursue the Client's claim. Any appeal, separate claim, or unrelated matter is not included unless agreed in writing.

## 2. Attorney's Fees
The Firm's fee is contingent on recovery. If there is no recovery, the Client owes no attorney's fee. If there is a recovery, the Firm's fee will be ${feeText} of the gross recovery, whether by settlement, judgment, or award.

## 3. Costs and Expenses
${costsText}
Costs and expenses may include filing fees, records charges, expert and investigator fees, deposition costs, and similar case expenses. Costs are separate from, and in addition to, attorney's fees and are ordinarily reimbursed from the Client's share of any recovery.

## 4. No Guarantee of Outcome
The Firm has made no promise or guarantee regarding the outcome of the matter. Any statements about the case are opinions only.

## 5. Client Responsibilities
- Provide accurate and complete information and documents.
- Keep the Firm informed of changes in contact information.
- Cooperate in the investigation and prosecution of the claim.
- Not settle or discuss settlement with an adverse party without the Firm.

## 6. Termination
Either party may terminate this Agreement in writing. On termination, the Firm may assert a lien for fees and costs to the extent permitted by law and applicable rules of professional conduct.

## 7. Electronic Signature
The Client agrees this Agreement may be signed electronically and that an electronic signature has the same effect as a handwritten signature. Signer identity, timestamp, and document integrity are recorded in the e-signature provider's audit trail.

## 8. Acknowledgment
The Client has read this Agreement, has had the opportunity to ask questions, and agrees to its terms.
`.trim()
}

/**
 * Render the filled retainer agreement to disk and return its absolute path
 * plus a title suitable for the envelope.
 */
export async function renderRetainerAgreementPdf(
  ctx: RetainerAgreementContext
): Promise<{ filePath: string; title: string }> {
  ensureDir()
  const title = `Retainer agreement — ${ctx.clientName}`
  const filePath = path.join(OUTPUT_DIR, `retainer-${ctx.leadId}-${Date.now()}.pdf`)

  const feeText =
    typeof ctx.contingencyPercent === 'number' && ctx.contingencyPercent > 0
      ? `${ctx.contingencyPercent}%`
      : 'the agreed contingency percentage stated below'
  const costsText =
    ctx.costsResponsibility ||
    'The Firm will advance case costs and expenses, to be reimbursed from any recovery.'
  const scopeText = ctx.scope || 'Representation for the personal injury claim referenced below.'

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 54 })
    const stream = fs.createWriteStream(filePath)
    stream.on('finish', resolve)
    stream.on('error', reject)
    doc.on('error', reject)
    doc.pipe(stream)

    // Filled-in header (the case-specific facts).
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280').text('CONTINGENCY FEE REPRESENTATION AGREEMENT')
    doc.moveDown(0.5)
    const facts: [string, string][] = [
      ['Client', ctx.clientName],
      ['Law firm', ctx.firmName || ctx.attorneyName || '—'],
      ['Responsible attorney', ctx.attorneyName || '—'],
      [
        'Contingency fee',
        typeof ctx.contingencyPercent === 'number' && ctx.contingencyPercent > 0
          ? `${ctx.contingencyPercent}% of gross recovery`
          : 'As stated in Section 2',
      ],
      ['Costs & expenses', ctx.costsResponsibility || 'Advanced by the Firm, reimbursed from recovery'],
      ['Matter / scope', ctx.scope || 'Personal injury claim'],
      ['Agreement version', `${RETAINER_TEMPLATE_VERSION} (effective ${RETAINER_TEMPLATE_EFFECTIVE_DATE})`],
      ['Case reference', ctx.caseRef || ctx.leadId],
    ]
    for (const [label, value] of facts) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(`${label}: `, { continued: true })
      doc.font('Helvetica').fillColor('#1f2937').text(value)
    }
    doc.moveDown(0.5)

    // Agreement body with the fee terms woven in.
    renderMarkdown(doc, buildBody(ctx, feeText, costsText, scopeText))

    // Signature area (the provider overlays the actual e-signature + timestamp).
    doc.moveDown(1)
    doc.font('Helvetica').fontSize(10).fillColor('#111827')
    doc.text('Client signature: ______________________________', { continued: true })
    doc.text('        Date: ____________________')
    doc.moveDown(0.3)
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#6b7280')
      .text('Executed electronically; signer identity, timestamp, and integrity are recorded in the provider audit trail.')

    doc.end()
  })

  logger.info('Rendered retainer agreement PDF', { leadId: ctx.leadId, filePath })
  return { filePath, title }
}

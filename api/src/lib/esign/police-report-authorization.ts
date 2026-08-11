/**
 * Renders a California-oriented client authorization for counsel to obtain a
 * police / traffic collision / incident report on the client's behalf.
 *
 * This is not a substitute for each agency's request form (e.g. CHP 190) or the
 * attorney's declaration under Vehicle Code § 20012 — it is the client's
 * written permission that the firm can attach when the agency asks for it.
 */
import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import { logger } from '../logger'

const OUTPUT_DIR = path.join(process.cwd(), 'uploads', 'signable-documents')

export interface PoliceReportAuthorizationContext {
  leadId: string
  clientName: string
  clientDob?: string
  /** Law firm / attorney of record requesting the report. */
  firmName?: string
  attorneyName?: string
  /** Agency that holds the report (CHP Area, city PD, sheriff, etc.). */
  agencyName?: string
  /** Report / case / DR number if known. */
  reportNumber?: string
  /** Incident / collision date if known. */
  incidentDate?: string
  /** County or city of incident. */
  incidentVenue?: string
  caseRef?: string
}

function ensureDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

type PdfDoc = InstanceType<typeof PDFDocument>

function fact(doc: PdfDoc, label: string, value: string) {
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(`${label}: `, { continued: true })
  doc.font('Helvetica').fillColor('#1f2937').text(value)
}

/**
 * Render the filled authorization to disk and return its absolute path + title.
 */
export async function renderPoliceReportAuthorizationPdf(
  ctx: PoliceReportAuthorizationContext,
): Promise<{ filePath: string; title: string }> {
  ensureDir()
  const title = `Police / incident report authorization — ${ctx.clientName}`
  const filePath = path.join(OUTPUT_DIR, `police-auth-${ctx.leadId}-${Date.now()}.pdf`)

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 54 })
    const stream = fs.createWriteStream(filePath)
    stream.on('finish', resolve)
    stream.on('error', reject)
    doc.on('error', reject)
    doc.pipe(stream)

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#6b7280')
      .text('AUTHORIZATION TO OBTAIN POLICE / INCIDENT / TRAFFIC COLLISION REPORT')
    doc.moveDown(0.3)
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#0b1220')
      .text('California client authorization for counsel')
    doc.moveDown(0.6)

    fact(doc, 'Authorizing party (client)', ctx.clientName)
    fact(doc, 'Date of birth', ctx.clientDob || '—')
    fact(doc, 'Law firm', ctx.firmName || '—')
    fact(doc, 'Attorney of record', ctx.attorneyName || '—')
    fact(doc, 'Agency / records holder', ctx.agencyName || 'As identified by counsel (CHP, city police, or sheriff)')
    fact(doc, 'Report / case / DR number', ctx.reportNumber || 'To be completed by counsel if unknown at signing')
    fact(doc, 'Incident / collision date', ctx.incidentDate || '—')
    fact(doc, 'Venue (city / county)', ctx.incidentVenue || '—')
    fact(doc, 'Case reference', ctx.caseRef || ctx.leadId)
    doc.moveDown(0.7)

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b1220').text('1. Authorization')
    doc.moveDown(0.25)
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#1f2937')
      .text(
        `I, ${ctx.clientName}, authorize my attorney and law firm named above (and their staff, agents, and copy services) to request, obtain, inspect, and receive copies of any police report, traffic collision report, incident report, CAD/dispatch log excerpt, citation abstract, or related photographs that concern the incident described above, or any related incident involving me.`,
      )
    doc.moveDown(0.45)

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b1220').text('2. California release context')
    doc.moveDown(0.25)
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#1f2937')
      .text(
        'I understand that California traffic collision reports are generally released under Vehicle Code section 20012 to persons with a proper interest and to attorneys who represent such persons. I confirm that I am (or may be) a person with a proper interest in the report (for example, an involved driver, injured party, passenger, or property owner), and that the attorneys named above represent me in connection with that incident.',
      )
    doc.moveDown(0.35)
    doc.text(
      'I further authorize counsel to submit any agency-specific application (including CHP Form 190 or a local police/sheriff records request form), attorney declaration under penalty of perjury, fee payment, and supporting identification needed to obtain the report on my behalf.',
      )
    doc.moveDown(0.45)

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b1220').text('3. Use of the report')
    doc.moveDown(0.25)
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#1f2937')
      .text(
        'Counsel may use the report and related materials to evaluate, prosecute, settle, or defend my claim or matter, and may share them with experts, insurance carriers, opposing counsel, courts, and other persons as reasonably necessary for representation, subject to applicable confidentiality and court orders.',
      )
    doc.moveDown(0.45)

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b1220').text('4. Duration and revocation')
    doc.moveDown(0.25)
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#1f2937')
      .text(
        'This authorization remains valid until the earlier of (a) final conclusion of my matter with the firm, or (b) my written revocation delivered to the firm. Revocation does not affect disclosures already made in reliance on this authorization.',
      )
    doc.moveDown(0.45)

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b1220').text('5. Acknowledgment')
    doc.moveDown(0.25)
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#1f2937')
      .text(
        'I understand some agencies may still require their own forms, fees, or redactions, and that counsel cannot guarantee release of every page. I have had an opportunity to ask questions about this authorization before signing.',
      )
    doc.moveDown(1)

    doc.font('Helvetica').fontSize(10).fillColor('#111827')
    doc.text('Client signature: ______________________________', { continued: true })
    doc.text('        Date: ____________________')
    doc.moveDown(0.35)
    doc
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor('#6b7280')
      .text(
        'Executed electronically; signer identity, timestamp, and integrity are recorded in the e-signature provider audit trail. This form is a client authorization for counsel and does not replace any agency-required request form or attorney declaration.',
      )

    doc.end()
  })

  logger.info('Rendered police report authorization PDF', { leadId: ctx.leadId, filePath })
  return { filePath, title }
}

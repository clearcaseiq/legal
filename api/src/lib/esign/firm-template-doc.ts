/**
 * Turns a firm template's editable body into a filled, signable PDF.
 *
 * Firm templates carry a text/markdown body with {{merge_tokens}} (e.g.
 * {{client_name}}). When such a template is sent for signature against a case,
 * we resolve the tokens from the lead/client/firm/attorney, fill the body, and
 * render it to a PDF via the same pdfkit approach used by the retainer/HIPAA
 * renderers. The e-signature provider then overlays the binding signature.
 */
import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import { prisma } from '../prisma'
import { logger } from '../logger'

const OUTPUT_DIR = path.join(process.cwd(), 'uploads', 'signable-documents')

export type TemplateTokens = Record<string, string>

function fullName(first?: string | null, last?: string | null): string {
  return [first, last].filter(Boolean).join(' ').trim()
}

/**
 * Resolve merge-token values for a template rendered against a specific case.
 * Unknown/blank values are left empty here and turned into fill-in blanks by
 * fillTemplateTokens.
 */
export async function resolveTemplateTokens(leadId: string): Promise<TemplateTokens> {
  const lead = await prisma.leadSubmission.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      assignedAttorney: {
        select: { name: true, lawFirm: { select: { name: true } } },
      },
      assessment: {
        select: {
          claimType: true,
          venueState: true,
          venueCounty: true,
          user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        },
      },
    },
  })

  const u = lead?.assessment?.user
  const claim = lead?.assessment?.claimType || ''
  const venueCounty = lead?.assessment?.venueCounty || ''
  const venueState = lead?.assessment?.venueState || ''
  const venue = [venueCounty, venueState].filter(Boolean).join(', ')
  const attorneyName = lead?.assignedAttorney?.name || ''
  const firmName = lead?.assignedAttorney?.lawFirm?.name || ''

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return {
    client_name: fullName(u?.firstName, u?.lastName),
    client_first_name: u?.firstName || '',
    client_last_name: u?.lastName || '',
    client_email: u?.email || '',
    client_phone: u?.phone || '',
    firm_name: firmName,
    attorney_name: attorneyName,
    date: today,
    case_ref: lead?.id || leadId,
    claim_type: claim,
    matter_description: claim ? `${claim} claim` : '',
    venue,
    venue_state: venueState,
    venue_county: venueCounty,
  }
}

/**
 * Replace {{ token }} occurrences with resolved values. Tokens are matched
 * case-insensitively and tolerate surrounding whitespace. Any token we can't
 * resolve (or that resolves to empty) becomes a fill-in blank so the document
 * still reads as something to complete/sign.
 */
export function fillTemplateTokens(text: string, tokens: TemplateTokens): string {
  const lookup: TemplateTokens = {}
  for (const [k, v] of Object.entries(tokens)) lookup[k.toLowerCase()] = v
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, rawKey: string) => {
    const val = lookup[rawKey.toLowerCase()]
    return val && val.trim() ? val : '__________'
  })
}

type PdfDoc = InstanceType<typeof PDFDocument>

/** Minimal markdown -> pdfkit renderer (headings, bullets, paragraphs). */
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
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      doc.font('Helvetica').fontSize(10).fillColor('#1f2937').text(`•  ${line.slice(2)}`, { indent: 12 })
    } else {
      doc.font('Helvetica').fontSize(10).fillColor('#1f2937').text(line)
    }
  }
}

/**
 * Render a filled template body to a PDF on disk. Returns the absolute path.
 */
export async function renderTemplateBodyPdf(params: {
  leadId: string
  title: string
  body: string
}): Promise<{ filePath: string; title: string }> {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const filePath = path.join(OUTPUT_DIR, `firm-template-${params.leadId}-${Date.now()}.pdf`)

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 54 })
    const stream = fs.createWriteStream(filePath)
    stream.on('finish', resolve)
    stream.on('error', reject)
    doc.on('error', reject)
    doc.pipe(stream)

    // Title header (unless the body already opens with an H1).
    if (!params.body.trimStart().startsWith('# ')) {
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#0b1220').text(params.title)
      doc.moveDown(0.5)
    }

    renderMarkdown(doc, params.body)

    // Signature area (the provider overlays the actual e-signature + timestamp).
    doc.moveDown(1.5)
    doc.font('Helvetica').fontSize(10).fillColor('#111827')
    doc.text('Signature: ______________________________', { continued: true })
    doc.text('        Date: ____________________')
    doc.moveDown(0.3)
    doc
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor('#6b7280')
      .text(
        'Executed electronically; signer identity, timestamp, and integrity are recorded in the provider audit trail.'
      )

    doc.end()
  })

  logger.info('Rendered firm template PDF', { leadId: params.leadId, filePath })
  return { filePath, title: params.title }
}

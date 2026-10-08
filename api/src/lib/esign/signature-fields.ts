/**
 * Where signers sign, initial, date and fill in — instead of Dropbox Sign
 * appending its own signature page after the document.
 *
 * Two ways in, one per kind of source document:
 *
 *  - Documents we render with pdfkit draw invisible Dropbox Sign text tags
 *    (white on white) on their own signature lines. The tags travel with the
 *    PDF, so the field always lands where the line was drawn, however long the
 *    body text ran.
 *  - PDFs a firm uploads carry fields an attorney placed in the field editor,
 *    stored as fractions of the page and sent as `form_fields_per_document`.
 *
 * Signer numbering is fixed across both: the client is the first signer and
 * the attorney, when countersigning, the second. Dropbox Sign rejects a request
 * where a signer has no field, or a field names a signer the request lacks, so
 * attorney fields exist exactly when there is a countersigner.
 *
 * Coordinates were calibrated against Dropbox Sign's own detect_fields
 * endpoint: PDF points, origin top-left, matching pdfkit.
 */
import { z } from 'zod'
import type PDFDocument from 'pdfkit'

export type SignerRole = 'client' | 'attorney'
export type SignatureFieldType = 'signature' | 'date_signed' | 'initials' | 'text' | 'checkbox'

export const SIGNATURE_FIELD_TYPES: readonly SignatureFieldType[] = [
  'signature',
  'date_signed',
  'initials',
  'text',
  'checkbox',
]

/** Index of each role in the provider's signer list. */
export const SIGNER_INDEX: Record<SignerRole, 0 | 1> = { client: 0, attorney: 1 }

const TAG_TYPE: Record<SignatureFieldType, string> = {
  signature: 'sig',
  date_signed: 'date',
  initials: 'initial',
  text: 'text',
  checkbox: 'check',
}

/** Dropbox Sign only accepts letters, digits and underscores in tag labels and ids. */
function tagSafe(value: string): string {
  return value.replace(/[^A-Za-z0-9_ ]/g, '').trim()
}

/** `[sig|req|signer1|Label|id]`, before any width padding. */
export function textTag(
  type: SignatureFieldType,
  role: SignerRole,
  opts: { required?: boolean; label?: string; id?: string } = {},
): string {
  const parts = [TAG_TYPE[type], opts.required === false ? 'noreq' : 'req', `signer${SIGNER_INDEX[role] + 1}`]
  if (opts.label || opts.id) parts.push(tagSafe(opts.label || ''))
  if (opts.id) parts.push(tagSafe(opts.id))
  return `[${parts.join('|')}]`
}

type PdfDoc = InstanceType<typeof PDFDocument>

/** Tags are read at 12pt; padding with spaces inside the bracket widens the field. */
const TAG_FONT_SIZE = 12

function paddedTag(doc: PdfDoc, tag: string, width: number): string {
  doc.font('Helvetica').fontSize(TAG_FONT_SIZE)
  let body = tag.slice(0, -1)
  while (doc.widthOfString(`${body} ]`) < width) body += ' '
  return `${body}]`
}

/**
 * One line of a signature block. `signature` rows get a signature line and a
 * date-signed line; `text` rows get a single fill-in line (e.g. date of birth).
 */
export type SignatureRow = {
  label: string
  role: SignerRole
  kind?: 'signature' | 'text'
  /** Printed under the line, e.g. the signer's name. */
  printedName?: string
  /** Stable id so the completed value can be read back (text rows). */
  id?: string
}

const ROW_HEIGHT = 46

/**
 * Draw the signature block with Dropbox Sign text tags hidden on each line.
 * Returns the tags drawn, for tests and for callers that need to know whether
 * the attorney appears.
 */
export function drawSignatureBlock(doc: PdfDoc, rows: SignatureRow[], opts: { note?: string } = {}): string[] {
  const left = doc.page.margins.left
  const needed = rows.length * ROW_HEIGHT + 40
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage()
  doc.moveDown(1)

  const tags: string[] = []
  for (const row of rows) {
    const top = doc.y + 16
    const lineY = top + 12
    const kind = row.kind || 'signature'

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(row.label, left, top, { lineBreak: false })

    const fieldX = left + 140
    const fieldWidth = kind === 'signature' ? 200 : 180
    doc.moveTo(fieldX, lineY).lineTo(fieldX + fieldWidth, lineY).lineWidth(0.6).strokeColor('#111827').stroke()

    const roleId = row.id || `${row.role}_${kind === 'signature' ? 'sig' : 'text'}`
    // A signature field is taller than its tag and grows upward from it, so its
    // tag sits higher than a text or date tag to end on the same line.
    const fieldTag = paddedTag(
      doc,
      textTag(kind === 'signature' ? 'signature' : 'text', row.role, {
        label: kind === 'text' ? row.label : undefined,
        id: roleId,
      }),
      fieldWidth - 4,
    )
    doc.font('Helvetica').fontSize(TAG_FONT_SIZE).fillColor('#ffffff')
      .text(fieldTag, fieldX + 2, lineY - (kind === 'signature' ? 15 : 13), { lineBreak: false })
    tags.push(fieldTag)

    if (kind === 'signature') {
      const dateX = fieldX + fieldWidth + 52
      const dateWidth = 110
      doc.font('Helvetica').fontSize(10).fillColor('#111827').text('Date', dateX - 34, top, { lineBreak: false })
      doc.moveTo(dateX, lineY).lineTo(dateX + dateWidth, lineY).lineWidth(0.6).strokeColor('#111827').stroke()
      const dateTag = paddedTag(doc, textTag('date_signed', row.role, { id: `${row.role}_date` }), dateWidth - 4)
      doc.font('Helvetica').fontSize(TAG_FONT_SIZE).fillColor('#ffffff')
        .text(dateTag, dateX + 2, lineY - 13, { lineBreak: false })
      tags.push(dateTag)
    }

    if (row.printedName) {
      doc.font('Helvetica').fontSize(8).fillColor('#6b7280').text(row.printedName, fieldX, lineY + 3, { lineBreak: false })
    }
    doc.x = left
    doc.y = top + ROW_HEIGHT - 16
  }

  doc.x = left
  doc.moveDown(0.6)
  doc.font('Helvetica-Oblique').fontSize(8).fillColor('#6b7280').text(
    opts.note ||
      'Executed electronically; signer identity, timestamp, and integrity are recorded in the provider audit trail.',
    left,
  )
  doc.font('Helvetica').fontSize(10).fillColor('#1f2937')
  return tags
}

/* ------------------------------------------------------------------------ */
/* Fields placed on an uploaded PDF in the field editor.                     */
/* ------------------------------------------------------------------------ */

/**
 * A field as the editor stores it: page index from 0, position and size as
 * fractions of the page, so the layout is independent of the zoom it was drawn at.
 */
export const placedFieldSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
  page: z.number().int().min(0).max(499),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0.005).max(1),
  height: z.number().min(0.005).max(1),
  type: z.enum(['signature', 'date_signed', 'initials', 'text', 'checkbox']),
  signer: z.enum(['client', 'attorney']),
  required: z.boolean().default(true),
  label: z.string().max(80).optional(),
})

export type PlacedField = z.infer<typeof placedFieldSchema>

export const MAX_PLACED_FIELDS = 150

/** Document types whose sends always carry an attorney countersigner. */
export const COUNTERSIGNED_DOC_TYPES = new Set(['retainer', 'fee_agreement'])

export function requiresCountersign(documentType: string | null | undefined): boolean {
  return COUNTERSIGNED_DOC_TYPES.has(String(documentType || ''))
}

/**
 * Check a layout before it is saved. Returns the cleaned fields or the first
 * problem in words an attorney can act on.
 */
export function validatePlacedFields(
  raw: unknown,
  ctx: { pageCount: number; documentType: string | null | undefined },
): { fields: PlacedField[] } | { error: string } {
  const parsed = z.array(placedFieldSchema).max(MAX_PLACED_FIELDS).safeParse(raw)
  if (!parsed.success) return { error: 'Some fields are not valid. Reload the editor and try again.' }
  const fields = parsed.data

  if (fields.length === 0) return { fields }
  const ids = new Set<string>()
  for (const field of fields) {
    if (ids.has(field.id)) return { error: 'Two fields share an id. Reload the editor and try again.' }
    ids.add(field.id)
    if (field.page >= ctx.pageCount) return { error: `A field is on page ${field.page + 1}, but the document has ${ctx.pageCount}.` }
    if (field.x + field.width > 1.001 || field.y + field.height > 1.001) {
      return { error: `A field on page ${field.page + 1} runs off the edge of the page.` }
    }
  }

  const countersigned = requiresCountersign(ctx.documentType)
  if (!countersigned && fields.some((f) => f.signer === 'attorney')) {
    return { error: 'Only retainers and fee agreements are countersigned, so attorney fields can only go on those.' }
  }
  if (!fields.some((f) => f.signer === 'client' && f.type === 'signature')) {
    return { error: 'Place at least one client signature field.' }
  }
  if (countersigned && !fields.some((f) => f.signer === 'attorney' && f.type === 'signature')) {
    return { error: 'Retainers and fee agreements need an attorney signature field as well.' }
  }
  return { fields }
}

export function parseStoredFields(raw: string | null | undefined): PlacedField[] {
  if (!raw) return []
  try {
    const parsed = z.array(placedFieldSchema).safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

/** Provider-neutral field in absolute coordinates: points, origin top-left, page from 1. */
export type AbsoluteField = {
  id: string
  type: SignatureFieldType
  signer: 0 | 1
  required: boolean
  label?: string
  page: number
  x: number
  y: number
  width: number
  height: number
}

/**
 * Convert stored fractions to points on the PDF actually being sent.
 * `pageOffset` accounts for pages put in front of the firm's own, such as a
 * key-terms cover.
 */
export function toAbsoluteFields(
  fields: PlacedField[],
  pageSizes: Array<{ width: number; height: number }>,
  pageOffset = 0,
): AbsoluteField[] {
  return fields.flatMap((field) => {
    const size = pageSizes[field.page + pageOffset]
    if (!size) return []
    return [
      {
        id: field.id,
        type: field.type,
        signer: SIGNER_INDEX[field.signer],
        required: field.type === 'checkbox' ? field.required : field.required !== false,
        label: field.label,
        page: field.page + pageOffset + 1,
        x: Math.round(field.x * size.width),
        y: Math.round(field.y * size.height),
        width: Math.max(8, Math.round(field.width * size.width)),
        height: Math.max(8, Math.round(field.height * size.height)),
      },
    ]
  })
}

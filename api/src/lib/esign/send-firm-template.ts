/**
 * Send a firm library template for signature against a case.
 * Shared by Firm Dashboard and case Signatures.
 */
import fs from 'fs'
import { prisma } from '../prisma'
import { createEnvelopeForLead } from './esign-service'
import { fillTemplateTokens, renderTemplateBodyPdf, resolveTemplateTokens } from './firm-template-doc'
import type { SignableDocumentType } from './types'
import { buildCustomDocument, isDocx, pdfPageSizes } from './custom-document'
import { parseStoredFields, requiresCountersign, toAbsoluteFields, type AbsoluteField } from './signature-fields'
import { buildEssentialPrefill, isEssentialDocType, sanitizeEssentialValues } from './essential-fields'
import {
  completeWelcomePacketForLead,
  isRetainerTemplateName,
  isWelcomeTemplateName,
  markSendRetainerTaskDone,
} from '../intake-acquire'

export type FirmTemplateListItem = {
  id: string
  name: string
  category: string
  description: string | null
  hasFile: boolean
  fileName: string | null
  fileMime: string | null
  isPdf: boolean
  isDocx: boolean
  hasBody: boolean
  isActive: boolean
  /** What the firm marked the template as, or null for a generic one. */
  documentType: string | null
  suggestedDocumentType: SignableDocumentType
  /** Fields placed on the uploaded PDF in the field editor. */
  signatureFieldCount: number
}

function suggestDocumentType(name: string, stored?: string | null): SignableDocumentType {
  if (stored === 'retainer' || stored === 'hipaa_authorization') return stored
  if (isRetainerTemplateName(name)) return 'retainer'
  if (/hipaa/i.test(name)) return 'hipaa_authorization'
  if (/fee\s*agreement/i.test(name)) return 'fee_agreement'
  return 'other'
}

export function serializeFirmTemplateForSend(t: any): FirmTemplateListItem {
  return {
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description || null,
    hasFile: Boolean(t.filePath),
    fileName: t.fileName || null,
    fileMime: t.fileMime || null,
    isPdf: t.fileMime === 'application/pdf',
    isDocx: isDocx(t.fileMime, t.fileName),
    hasBody: typeof t.body === 'string' && t.body.trim().length > 0,
    isActive: Boolean(t.isActive),
    documentType: t.documentType || null,
    suggestedDocumentType: suggestDocumentType(t.name, t.documentType),
    signatureFieldCount: parseStoredFields(t.signatureFields).length,
  }
}

export async function listActiveFirmTemplates(lawFirmId: string): Promise<FirmTemplateListItem[]> {
  const templates = await (prisma as any).firmTemplate.findMany({
    where: { lawFirmId, isActive: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return templates
    .map(serializeFirmTemplateForSend)
    .filter(
      (t: FirmTemplateListItem) =>
        t.isPdf ||
        t.hasBody ||
        (t.isDocx && (t.suggestedDocumentType === 'retainer' || t.suggestedDocumentType === 'hipaa_authorization')),
    )
}

function statusError(message: string, status: number) {
  const err = new Error(message)
  ;(err as any).status = status
  return err
}

/**
 * The PDF a firm template is sent as on this case. Retainer and HIPAA
 * templates get the essential fields filled (the attorney's edits, else the
 * intake prefill); other templates get the generic merge tokens.
 */
export async function renderFirmTemplateForLead(params: {
  templateId: string
  lawFirmId: string
  leadId: string
  attorneyId: string
  title?: string
  documentType?: SignableDocumentType
  fieldValues?: Record<string, unknown> | null
}) {
  const template = await (prisma as any).firmTemplate.findFirst({
    where: { id: params.templateId, lawFirmId: params.lawFirmId, isActive: true },
  })
  if (!template) throw statusError('Template not found', 404)

  const hasPdf =
    Boolean(template.filePath) && template.fileMime === 'application/pdf' && fs.existsSync(template.filePath)
  const hasDocx = Boolean(template.filePath) && isDocx(template.fileMime, template.fileName)
  const hasBody = typeof template.body === 'string' && template.body.trim().length > 0

  let documentType: SignableDocumentType = params.documentType || suggestDocumentType(template.name, template.documentType)
  if (!['retainer', 'fee_agreement', 'hipaa_authorization', 'police_report_authorization', 'other'].includes(documentType)) {
    documentType = 'other'
  }
  const title = String(params.title || '').trim() || template.name
  const placed = hasPdf ? placedFieldsForSend(parseStoredFields(template.signatureFields), documentType) : []

  if (isEssentialDocType(documentType)) {
    if (!hasPdf && !hasDocx && !hasBody) {
      throw statusError('Attach a PDF or Word file, or add body text, before sending for signature', 400)
    }
    const fieldValues = params.fieldValues
      ? sanitizeEssentialValues(documentType, params.fieldValues)
      : await buildEssentialPrefill({ leadId: params.leadId, attorneyId: params.attorneyId, docType: documentType })
    const built = await buildCustomDocument({
      leadId: params.leadId,
      docType: documentType,
      title,
      values: fieldValues,
      source:
        hasPdf || hasDocx
          ? { kind: 'file', filePath: template.filePath, mime: template.fileMime, fileName: template.fileName }
          : { kind: 'body', body: template.body },
      placedFields: hasPdf ? placed : undefined,
    })
    return {
      template,
      title,
      documentType,
      filePath: built.filePath,
      fieldValues,
      mode: built.mode,
      fieldMode: built.fieldMode,
      placedFields: built.placedFields,
    }
  }

  if (!hasPdf && !hasBody) throw statusError('Attach a PDF or add body text before sending for signature', 400)
  if (!hasPdf && hasBody) {
    const tokens = await resolveTemplateTokens(params.leadId)
    const filled = fillTemplateTokens(template.body, tokens)
    const rendered = await renderTemplateBodyPdf({
      leadId: params.leadId,
      title,
      body: filled,
      attorneySigns: requiresCountersign(documentType),
    })
    return { template, title, documentType, filePath: rendered.filePath, fieldValues: null, mode: null, fieldMode: rendered.fieldMode, placedFields: [] as AbsoluteField[] }
  }

  const filePath: string = template.filePath
  return { template, title, documentType, filePath, fieldValues: null, mode: null, ...(await unchangedPdfFields(template, documentType)) }
}

/**
 * Fields for a firm PDF that goes out unchanged: only fields placed in the
 * editor locate the signers. Without any, the provider appends its own
 * signature page.
 */
export async function unchangedPdfFields(
  template: { filePath: string; signatureFields?: string | null },
  documentType: SignableDocumentType,
): Promise<{ fieldMode: 'placed' | null; placedFields: AbsoluteField[] }> {
  const placed = placedFieldsForSend(parseStoredFields(template.signatureFields), documentType)
  if (!placed.length) return { fieldMode: null, placedFields: [] }
  return { fieldMode: 'placed', placedFields: toAbsoluteFields(placed, await pdfPageSizes(fs.readFileSync(template.filePath))) }
}

/**
 * The stored layout, reconciled with what this send actually is. A template
 * can be sent as a different document type than it was laid out for, and the
 * provider rejects any request where a signer has no field or a field names a
 * signer the request lacks.
 */
function placedFieldsForSend(fields: ReturnType<typeof parseStoredFields>, documentType: SignableDocumentType) {
  if (!fields.length) return fields
  if (!requiresCountersign(documentType)) return fields.filter((f) => f.signer === 'client')
  if (!fields.some((f) => f.signer === 'attorney' && f.type === 'signature')) {
    throw statusError(
      'This template has no attorney signature field. Open "Place signature fields" and add one before sending it as a retainer or fee agreement.',
      400,
    )
  }
  return fields
}

export async function sendFirmTemplateForLead(params: {
  templateId: string
  lawFirmId: string
  leadId: string
  attorneyId: string
  signerName: string
  signerEmail: string
  title?: string
  providerId?: string
  documentType?: SignableDocumentType
  fieldValues?: Record<string, unknown> | null
  countersigner?: { name: string; email: string } | null
  packetRequestId?: string | null
}) {
  const { template, title, documentType, filePath, fieldValues, fieldMode, placedFields } =
    await renderFirmTemplateForLead(params)

  const envelope = await createEnvelopeForLead({
    leadId: params.leadId,
    attorneyId: params.attorneyId,
    providerId: params.providerId,
    documentType,
    title,
    signerName: params.signerName,
    signerEmail: params.signerEmail,
    filePath,
    fieldMode,
    placedFields,
    templateId: template.id,
    fieldValues,
    countersigner: requiresCountersign(documentType) ? params.countersigner || null : null,
    packetRequestId: params.packetRequestId,
  })

  if (documentType === 'retainer' || documentType === 'fee_agreement') {
    const lead = await prisma.leadSubmission.findUnique({
      where: { id: params.leadId },
      select: { assessmentId: true },
    })
    if (lead?.assessmentId) {
      await markSendRetainerTaskDone(
        lead.assessmentId,
        'Sent for signature from firm template (Signatures).',
      ).catch(() => undefined)
    }
  }

  if (isWelcomeTemplateName(template.name) || isWelcomeTemplateName(title)) {
    await completeWelcomePacketForLead(
      params.leadId,
      `Completed via firm template → ${template.name}.`,
    ).catch(() => undefined)
  }

  return envelope
}

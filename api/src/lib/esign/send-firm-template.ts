/**
 * Send a firm library template for signature against a case.
 * Shared by Firm Dashboard and case Signatures.
 */
import fs from 'fs'
import { prisma } from '../prisma'
import { createEnvelopeForLead } from './esign-service'
import { fillTemplateTokens, renderTemplateBodyPdf, resolveTemplateTokens } from './firm-template-doc'
import type { SignableDocumentType } from './types'
import { buildCustomDocument, isDocx } from './custom-document'
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
    })
    return { template, title, documentType, filePath: built.filePath, fieldValues, mode: built.mode }
  }

  if (!hasPdf && !hasBody) throw statusError('Attach a PDF or add body text before sending for signature', 400)
  let filePath: string = template.filePath
  if (!hasPdf && hasBody) {
    const tokens = await resolveTemplateTokens(params.leadId)
    const filled = fillTemplateTokens(template.body, tokens)
    const rendered = await renderTemplateBodyPdf({ leadId: params.leadId, title, body: filled })
    filePath = rendered.filePath
  }
  return { template, title, documentType, filePath, fieldValues: null, mode: null }
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
}) {
  const { template, title, documentType, filePath, fieldValues } = await renderFirmTemplateForLead(params)

  const envelope = await createEnvelopeForLead({
    leadId: params.leadId,
    attorneyId: params.attorneyId,
    providerId: params.providerId,
    documentType,
    title,
    signerName: params.signerName,
    signerEmail: params.signerEmail,
    filePath,
    templateId: template.id,
    fieldValues,
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

/**
 * Send a firm library template for signature against a case.
 * Shared by Firm Dashboard and case Signatures.
 */
import fs from 'fs'
import { prisma } from '../prisma'
import { createEnvelopeForLead } from './esign-service'
import { fillTemplateTokens, renderTemplateBodyPdf, resolveTemplateTokens } from './firm-template-doc'
import type { SignableDocumentType } from './types'
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
  hasBody: boolean
  isActive: boolean
  suggestedDocumentType: SignableDocumentType
}

function suggestDocumentType(name: string): SignableDocumentType {
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
    hasBody: typeof t.body === 'string' && t.body.trim().length > 0,
    isActive: Boolean(t.isActive),
    suggestedDocumentType: suggestDocumentType(t.name),
  }
}

export async function listActiveFirmTemplates(lawFirmId: string): Promise<FirmTemplateListItem[]> {
  const templates = await (prisma as any).firmTemplate.findMany({
    where: { lawFirmId, isActive: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return templates
    .map(serializeFirmTemplateForSend)
    .filter((t: FirmTemplateListItem) => t.isPdf || t.hasBody)
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
}) {
  const template = await (prisma as any).firmTemplate.findFirst({
    where: { id: params.templateId, lawFirmId: params.lawFirmId, isActive: true },
  })
  if (!template) {
    const err = new Error('Template not found')
    ;(err as any).status = 404
    throw err
  }

  const hasPdf =
    Boolean(template.filePath) &&
    template.fileMime === 'application/pdf' &&
    fs.existsSync(template.filePath)
  const hasBody = typeof template.body === 'string' && template.body.trim().length > 0
  if (!hasPdf && !hasBody) {
    const err = new Error('Attach a PDF or add body text before sending for signature')
    ;(err as any).status = 400
    throw err
  }

  const title = String(params.title || '').trim() || template.name
  let filePath: string = template.filePath
  if (!hasPdf && hasBody) {
    const tokens = await resolveTemplateTokens(params.leadId)
    const filled = fillTemplateTokens(template.body, tokens)
    const rendered = await renderTemplateBodyPdf({ leadId: params.leadId, title, body: filled })
    filePath = rendered.filePath
  }

  let documentType: SignableDocumentType = params.documentType || suggestDocumentType(template.name)
  if (
    documentType !== 'retainer' &&
    documentType !== 'fee_agreement' &&
    documentType !== 'hipaa_authorization' &&
    documentType !== 'police_report_authorization' &&
    documentType !== 'other'
  ) {
    documentType = 'other'
  }

  const envelope = await createEnvelopeForLead({
    leadId: params.leadId,
    attorneyId: params.attorneyId,
    providerId: params.providerId,
    documentType,
    title,
    signerName: params.signerName,
    signerEmail: params.signerEmail,
    filePath,
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

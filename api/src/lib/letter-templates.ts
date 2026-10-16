/**
 * Firm templates as starting points for letters of representation. A firm tags
 * a text template "Letter to a medical provider" or "Letter to an insurance
 * carrier" (optionally as the default); the letter window offers it beside the
 * built-in letter and fills its {{tokens}} from the case and the recipient.
 */
import { prisma } from './prisma'
import { fillTemplateTokens, resolveTemplateTokens, type TemplateTokens } from './esign/firm-template-doc'
import { lopParagraph, UPLOAD_LINK_TOKEN, type LetterContext, type LetterKind } from './representation-letters'

export const LETTER_USES: LetterKind[] = ['provider_lor', 'carrier_lor']

export function parseLetterUse(value: unknown): LetterKind | null {
  return LETTER_USES.includes(value as LetterKind) ? (value as LetterKind) : null
}

export async function lawFirmIdForLead(lead: { assignedAttorneyId?: string | null }): Promise<string | null> {
  if (!lead.assignedAttorneyId) return null
  const attorney = await prisma.attorney.findUnique({
    where: { id: lead.assignedAttorneyId },
    select: { lawFirmId: true },
  })
  return attorney?.lawFirmId || null
}

export async function listLetterTemplates(lawFirmId: string, use: LetterKind) {
  const rows = await (prisma as any).firmTemplate.findMany({
    where: { lawFirmId, letterUse: use, isActive: true, body: { not: null } },
    select: { id: true, name: true, description: true, body: true, letterDefault: true },
    orderBy: [{ letterDefault: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  })
  return rows
    .filter((t: any) => typeof t.body === 'string' && t.body.trim())
    .map((t: any) => ({ id: t.id, name: t.name, description: t.description || null, isDefault: Boolean(t.letterDefault) }))
}

export interface LetterRecipient {
  recipientName: string
  providerName?: string | null
  fax?: string | null
  carrierName?: string | null
  adjusterName?: string | null
  claimNumber?: string | null
  policyNumber?: string | null
}

async function letterTokens(ctx: LetterContext, r: LetterRecipient): Promise<TemplateTokens> {
  const base = await resolveTemplateTokens(ctx.leadId)
  return {
    ...base,
    client_name: ctx.clientName || base.client_name,
    firm_name: ctx.firmName || base.firm_name,
    attorney_name: ctx.attorneyName || base.attorney_name,
    attorney_email: ctx.attorneyEmail || '',
    attorney_phone: ctx.attorneyPhone || '',
    firm_phone: ctx.firmPhone || '',
    firm_address: ctx.firmAddressLines.join(', '),
    date: ctx.today,
    date_of_loss: ctx.dateOfLoss,
    recipient_name: r.recipientName,
    provider_name: r.providerName || '',
    provider_fax: r.fax || '',
    carrier_name: r.carrierName || '',
    adjuster_name: r.adjusterName || '',
    claim_number: r.claimNumber || '',
    policy_number: r.policyNumber || '',
    // Swapped for the real link when the letter is sent.
    records_upload_link: UPLOAD_LINK_TOKEN,
  }
}

/** Insert the LOP paragraph before the sign-off, or at the end if there is none. */
function withLop(body: string, ctx: LetterContext): string {
  const lines = body.split('\n')
  const signOff = lines.findIndex((l) => /^\s*(sincerely|very truly yours|regards|respectfully)/i.test(l))
  const lop = lopParagraph(ctx)
  if (signOff < 0) return `${body.trimEnd()}\n\n${lop}`
  lines.splice(signOff, 0, lop, '')
  return lines.join('\n')
}

/** The template body filled for this case and recipient, or null if it isn't offered for this letter. */
export async function renderLetterTemplate(params: {
  lawFirmId: string
  templateId: string
  use: LetterKind
  ctx: LetterContext
  recipient: LetterRecipient
  includeLop?: boolean
}): Promise<string | null> {
  const template = await (prisma as any).firmTemplate.findFirst({
    where: { id: params.templateId, lawFirmId: params.lawFirmId, letterUse: params.use, isActive: true },
    select: { body: true },
  })
  if (!template?.body || !String(template.body).trim()) return null
  const filled = fillTemplateTokens(template.body, await letterTokens(params.ctx, params.recipient))
  return params.includeLop ? withLop(filled, params.ctx) : filled
}

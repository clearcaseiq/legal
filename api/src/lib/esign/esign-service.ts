/**
 * E-signature service — the one place routes call to create signature
 * envelopes and apply provider webhook updates. Keeps provider selection,
 * DocumentEnvelope persistence, and status mapping in a single unit so the
 * "Documents & E-sign" surface can just read DocumentEnvelope.status.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { prisma } from '../prisma'
import { logger } from '../logger'
import { getESignatureProvider } from './index'
import { renderHipaaAuthorizationPdf } from './hipaa-authorization'
import { renderRetainerAgreementPdf } from './retainer-agreement'
import type { EnvelopeStatus, SignableDocumentType } from './types'

const SIGNED_DIR = path.join(process.cwd(), 'uploads', 'signed-documents')

export interface CreateEnvelopeParams {
  leadId: string
  attorneyId: string
  documentType: SignableDocumentType
  title: string
  signerName: string
  signerEmail: string
  /** Absolute path to the source PDF to be signed. */
  filePath: string
  /** Override the active provider (defaults to ESIGN_PROVIDER). */
  providerId?: string
}

/** Which timestamp column a given status transition should stamp. */
function timestampsFor(status: EnvelopeStatus, at?: string | null): Record<string, Date> {
  const when = at ? new Date(at) : new Date()
  switch (status) {
    case 'sent':
      return { sentAt: when }
    case 'viewed':
      return { viewedAt: when }
    case 'signed':
      return { signedAt: when }
    case 'declined':
      return { declinedAt: when }
    default:
      return {}
  }
}

/**
 * Create + send a signature envelope for a lead. Persists a draft
 * DocumentEnvelope first (so an in-flight envelope is never lost if the
 * provider call fails), then hands off to the provider and records the
 * returned envelope id + signing URL.
 */
export async function createEnvelopeForLead(params: CreateEnvelopeParams) {
  const provider = getESignatureProvider(params.providerId)

  // HIPAA authorizations are PHI that flows through the provider, so only allow
  // tools that carry a BAA (or are self-hosted). This mirrors the UI filtering
  // on meta().hipaaCapable and enforces it server-side.
  if (params.documentType === 'hipaa_authorization' && !provider.meta().hipaaCapable) {
    throw new Error(
      `Provider "${provider.id}" is not HIPAA-capable; a signed BAA or self-hosted deployment is required for HIPAA authorizations`
    )
  }

  const envelope = await prisma.documentEnvelope.create({
    data: {
      leadId: params.leadId,
      attorneyId: params.attorneyId,
      documentType: params.documentType,
      title: params.title,
      signerName: params.signerName,
      signerEmail: params.signerEmail,
      provider: provider.id,
      status: 'draft',
    },
  })

  try {
    const result = await provider.createEnvelope({
      documentType: params.documentType,
      title: params.title,
      signerName: params.signerName,
      signerEmail: params.signerEmail,
      filePath: params.filePath,
      reference: envelope.id,
      metadata: {
        leadId: params.leadId,
        attorneyId: params.attorneyId,
        envelopeId: envelope.id,
      },
    })

    const nextStatus: EnvelopeStatus = result.status === 'draft' ? 'sent' : result.status
    return await prisma.documentEnvelope.update({
      where: { id: envelope.id },
      data: {
        externalEnvelopeId: result.externalEnvelopeId,
        signingUrl: result.signingUrl,
        status: nextStatus,
        ...timestampsFor(nextStatus),
      },
    })
  } catch (err) {
    // Leave the row as a draft so it can be retried or cleaned up; surface the
    // error to the caller (an unconfigured/stubbed provider lands here).
    logger.error('Failed to create e-signature envelope; leaving as draft', {
      envelopeId: envelope.id,
      provider: provider.id,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}

export interface CreateHipaaAuthorizationParams {
  leadId: string
  attorneyId: string
  /** The client/plaintiff who signs the authorization. */
  signerName: string
  signerEmail: string
  clientDob?: string
  recordsCustodian?: string
  recordsDateRange?: string
  caseRef?: string
  providerId?: string
}

/**
 * End-to-end HIPAA authorization: render the filled PDF from the canonical
 * template, then create + send a HIPAA envelope through a HIPAA-capable
 * provider. The signer is the client.
 */
export async function createHipaaAuthorizationEnvelope(params: CreateHipaaAuthorizationParams) {
  const { filePath, title } = await renderHipaaAuthorizationPdf({
    leadId: params.leadId,
    clientName: params.signerName,
    clientDob: params.clientDob,
    recordsCustodian: params.recordsCustodian,
    recordsDateRange: params.recordsDateRange,
    caseRef: params.caseRef,
  })

  return createEnvelopeForLead({
    leadId: params.leadId,
    attorneyId: params.attorneyId,
    documentType: 'hipaa_authorization',
    title,
    signerName: params.signerName,
    signerEmail: params.signerEmail,
    filePath,
    providerId: params.providerId,
  })
}

export interface CreateRetainerAgreementParams {
  leadId: string
  attorneyId: string
  /** The client/plaintiff who signs the agreement. */
  signerName: string
  signerEmail: string
  firmName?: string
  attorneyName?: string
  contingencyPercent?: number
  costsResponsibility?: string
  scope?: string
  caseRef?: string
  providerId?: string
}

/**
 * End-to-end retainer agreement: render the filled contingency-fee agreement
 * PDF, then create + send an envelope of documentType 'retainer'. Unlike HIPAA,
 * there is no BAA/HIPAA-capable provider requirement (retainers aren't PHI).
 */
export async function createRetainerAgreementEnvelope(params: CreateRetainerAgreementParams) {
  const { filePath, title } = await renderRetainerAgreementPdf({
    leadId: params.leadId,
    clientName: params.signerName,
    firmName: params.firmName,
    attorneyName: params.attorneyName,
    contingencyPercent: params.contingencyPercent,
    costsResponsibility: params.costsResponsibility,
    scope: params.scope,
    caseRef: params.caseRef,
  })

  return createEnvelopeForLead({
    leadId: params.leadId,
    attorneyId: params.attorneyId,
    documentType: 'retainer',
    title,
    signerName: params.signerName,
    signerEmail: params.signerEmail,
    filePath,
    providerId: params.providerId,
  })
}

export function listEnvelopesForLead(leadId: string) {
  return prisma.documentEnvelope.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Apply an inbound provider webhook: verify + normalize via the provider, then
 * move the matching DocumentEnvelope to the new status. Returns the updated
 * row, or null when the event is unrecognized / the envelope is unknown.
 */
export async function applyEsignWebhook(
  providerId: string,
  rawBody: string,
  headers: Record<string, string>
) {
  const provider = getESignatureProvider(providerId)
  const event = provider.parseWebhook(rawBody, headers)
  if (!event) return null

  const envelope = await prisma.documentEnvelope.findFirst({
    where: { provider: provider.id, externalEnvelopeId: event.externalEnvelopeId },
  })
  if (!envelope) {
    logger.warn('E-sign webhook for unknown envelope', {
      provider: provider.id,
      externalEnvelopeId: event.externalEnvelopeId,
    })
    return null
  }

  // On completion, pull the fully-executed PDF (with audit trail) and store it
  // so downstream consumers (e.g. the custodian portal) can serve it. Best
  // effort: a download failure must not block the status transition.
  let signedFilePath = envelope.signedFilePath
  if (event.status === 'signed' && !signedFilePath) {
    try {
      const buf = await provider.downloadSigned(event.externalEnvelopeId)
      if (!fs.existsSync(SIGNED_DIR)) fs.mkdirSync(SIGNED_DIR, { recursive: true })
      const dest = path.join(SIGNED_DIR, `${envelope.id}.pdf`)
      fs.writeFileSync(dest, buf)
      signedFilePath = dest
    } catch (err) {
      logger.warn('Failed to download executed document; status still updated', {
        envelopeId: envelope.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const updated = await prisma.documentEnvelope.update({
    where: { id: envelope.id },
    data: {
      status: event.status,
      signedFilePath,
      ...timestampsFor(event.status, event.signedAt),
    },
  })

  // Once signed, file the executed agreement into the case's Documents list.
  if (event.status === 'signed') {
    try {
      await fileSignedAgreementIntoCase(updated.id)
    } catch (err) {
      logger.warn('Failed to file signed agreement into case documents', {
        envelopeId: updated.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return updated
}

/** Document types that should be filed into the case's Documents list when signed. */
const CASE_FILED_DOC_TYPES = new Set<SignableDocumentType>(['retainer', 'fee_agreement'])

/**
 * File the executed PDF of a signed agreement (retainer / fee agreement) into the
 * case's Documents list (EvidenceFile), so the signed record lives with the rest
 * of the case file. Idempotent + best-effort: safe to call from the webhook or a
 * backfill. HIPAA authorizations are intentionally excluded (served separately via
 * the custodian portal).
 */
export async function fileSignedAgreementIntoCase(envelopeId: string) {
  const env = await prisma.documentEnvelope.findUnique({
    where: { id: envelopeId },
    select: {
      id: true,
      leadId: true,
      documentType: true,
      title: true,
      status: true,
      signedFilePath: true,
      signerName: true,
      signerEmail: true,
    },
  })
  if (!env || env.status !== 'signed' || !env.signedFilePath) return
  if (!CASE_FILED_DOC_TYPES.has(env.documentType as SignableDocumentType)) return
  if (!fs.existsSync(env.signedFilePath)) return

  const fileUrl = `/uploads/signed-documents/${env.id}.pdf`
  const existing = await prisma.evidenceFile.findFirst({ where: { fileUrl }, select: { id: true } })
  if (existing) return // already filed

  const lead = await prisma.leadSubmission.findUnique({
    where: { id: env.leadId },
    select: { assessmentId: true },
  })
  if (!lead?.assessmentId) return
  const assessment = await prisma.assessment.findUnique({
    where: { id: lead.assessmentId },
    select: { userId: true },
  })
  if (!assessment?.userId) return

  const size = fs.statSync(env.signedFilePath).size
  await prisma.evidenceFile.create({
    data: {
      userId: assessment.userId,
      assessmentId: lead.assessmentId,
      originalName: `${env.title}.pdf`,
      filename: `${env.id}.pdf`,
      mimetype: 'application/pdf',
      size,
      filePath: env.signedFilePath,
      fileUrl,
      category: 'other',
      subcategory: 'signed_agreement',
      description: `Executed ${env.documentType === 'fee_agreement' ? 'fee agreement' : 'retainer'} — signed by ${env.signerName}`,
      dataType: 'unstructured',
      tags: JSON.stringify(['esign', env.documentType, 'signed']),
      uploadMethod: 'esign',
      processingStatus: 'completed',
      isVerified: true,
      accessLevel: 'private',
      provenanceSource: 'esign',
      provenanceActor: env.signerEmail,
      provenanceDate: new Date(),
    },
  })
  logger.info('Filed signed agreement into case documents', { envelopeId: env.id, assessmentId: lead.assessmentId })
}

export interface CreateMedicalRecordsRequestParams {
  leadId: string
  attorneyId: string
  /** The signed HIPAA authorization that permits this disclosure. */
  documentEnvelopeId: string
  /** The records custodian (hospital/clinic/provider records dept). */
  recipientName: string
  recipientEmail?: string
  customMessage?: string
  recordsDateRange?: string
}

/** Thrown when a records request is attempted without a signed authorization. */
export class HipaaAuthorizationRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HipaaAuthorizationRequiredError'
  }
}

/**
 * Create a provider-directed medical-records request, gated on a signed HIPAA
 * authorization. Reuses the existing opposing-party external upload portal for
 * delivery + status tracking; the custodian can view the executed authorization
 * through that portal.
 */
export async function createMedicalRecordsRequest(params: CreateMedicalRecordsRequestParams) {
  const envelope = await prisma.documentEnvelope.findUnique({
    where: { id: params.documentEnvelopeId },
  })
  if (!envelope || envelope.leadId !== params.leadId) {
    throw new HipaaAuthorizationRequiredError('HIPAA authorization not found for this case')
  }
  if (envelope.documentType !== 'hipaa_authorization') {
    throw new HipaaAuthorizationRequiredError('Linked document is not a HIPAA authorization')
  }
  if (envelope.status !== 'signed') {
    throw new HipaaAuthorizationRequiredError(
      'The HIPAA authorization must be signed by the client before records can be requested from the provider'
    )
  }

  const secureToken = crypto.randomUUID()
  const baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000'
  const uploadLink = `${baseUrl}/respond/documents/${secureToken}`
  const message =
    params.customMessage ||
    `Please provide the patient's medical records${
      params.recordsDateRange ? ` for ${params.recordsDateRange}` : ''
    }. A signed HIPAA authorization is on file and viewable through the secure link.`

  return prisma.documentRequest.create({
    data: {
      leadId: params.leadId,
      attorneyId: params.attorneyId,
      requestedDocs: JSON.stringify(['medical_records']),
      customMessage: message,
      secureToken,
      uploadLink,
      status: 'pending',
      targetType: 'opposing_party',
      recipientName: params.recipientName,
      recipientEmail: params.recipientEmail || null,
      recipientRole: 'provider',
      origin: 'attorney',
      documentEnvelopeId: envelope.id,
    },
  })
}

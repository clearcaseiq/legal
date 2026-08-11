/**
 * Signable-document (e-signature) routes for attorneys.
 *
 *   POST /v1/documents/leads/:leadId/envelopes  → create + send an envelope
 *   GET  /v1/documents/leads/:leadId/envelopes  → list envelopes for a lead
 *
 * The public provider webhook lives in ./esign-webhook (raw-body route).
 */
import fs from 'fs'
import path from 'path'
import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import {
  createEnvelopeForLead,
  createHipaaAuthorizationEnvelope,
  createPoliceReportAuthorizationEnvelope,
  createRetainerAgreementEnvelope,
  createMedicalRecordsRequest,
  createOnboardingPacket,
  correctSignerEmail,
  refreshLeadEnvelopes,
  remindEnvelope,
  voidEnvelope,
  HipaaAuthorizationRequiredError,
  listEnvelopesForLead,
} from '../lib/esign/esign-service'
import { renderHipaaAuthorizationPdf } from '../lib/esign/hipaa-authorization'
import { renderPoliceReportAuthorizationPdf } from '../lib/esign/police-report-authorization'
import { renderRetainerAgreementPdf } from '../lib/esign/retainer-agreement'
import { listESignatureProviders } from '../lib/esign'
import { respondESignError } from '../lib/esign/http'
import {
  checkConfirmRetainerSigned,
  completeWelcomePacketForLead,
  markSendRetainerTaskDone,
} from '../lib/intake-acquire'
import { checkCollectPoliceReport } from '../lib/police-report-collect'
import { listActiveFirmTemplates, sendFirmTemplateForLead } from '../lib/esign/send-firm-template'
import type { SignableDocumentType } from '../lib/esign/types'

async function afterRetainerEnvelopeSent(leadId: string, note: string) {
  const lead = await prisma.leadSubmission.findUnique({
    where: { id: leadId },
    select: { assessmentId: true },
  })
  if (!lead?.assessmentId) return
  await markSendRetainerTaskDone(lead.assessmentId, note).catch(() => undefined)
}

const router = Router()

// Uploaded source PDFs for fee agreements the firm authored themselves.
const feeAgreementUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(process.cwd(), 'uploads', 'signable-documents')
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: (_req, file, cb) => cb(null, `fee-agreement-${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDF files can be sent for signature'))
  },
})

async function resolveAttorney(req: AuthRequest) {
  if (!req.user?.email) return null
  return prisma.attorney.findFirst({
    where: { email: req.user.email },
    select: { id: true, name: true, email: true, lawFirmId: true },
  })
}

/** Load a lead and assert the caller attorney may act on it (or it's unassigned). */
async function resolveLeadForAttorney(leadId: string, attorneyId: string) {
  const lead = await prisma.leadSubmission.findUnique({
    where: { id: leadId },
    select: { id: true, assignedAttorneyId: true },
  })
  if (!lead) return { error: 404 as const }
  if (lead.assignedAttorneyId && lead.assignedAttorneyId !== attorneyId) {
    return { error: 403 as const }
  }
  return { lead }
}

// Lets the UI render a provider picker of only the tools configured on this
// server, so the attorney/firm chooses which e-signature tool to use.
router.get('/providers', authMiddleware, async (_req: AuthRequest, res) => {
  res.json({ providers: listESignatureProviders() })
})

/** Active firm templates the attorney can pull into Signatures for this case. */
router.get('/leads/:leadId/firm-templates', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })
    const resolved = await resolveLeadForAttorney(req.params.leadId, attorney.id)
    if (resolved.error === 404) return res.status(404).json({ error: 'Lead not found' })
    if (resolved.error === 403) return res.status(403).json({ error: 'Lead is assigned to another attorney' })
    if (!attorney.lawFirmId) {
      return res.json({ templates: [], lawFirmId: null })
    }
    const templates = await listActiveFirmTemplates(attorney.lawFirmId)
    res.json({ templates, lawFirmId: attorney.lawFirmId })
  } catch (error) {
    logger.error('List firm templates for lead failed', {
      message: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({ error: 'Failed to load firm templates' })
  }
})

const firmTemplateSendSchema = z.object({
  signerName: z.string().min(1),
  signerEmail: z.string().email(),
  title: z.string().optional(),
  provider: z.string().optional(),
  documentType: z
    .enum(['retainer', 'hipaa_authorization', 'police_report_authorization', 'fee_agreement', 'other'])
    .optional(),
})

/** Send a firm library template for signature on this case. */
router.post(
  '/leads/:leadId/firm-templates/:templateId/send',
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const attorney = await resolveAttorney(req)
      if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })
      if (!attorney.lawFirmId) {
        return res.status(400).json({ error: 'No law firm is linked to this attorney account' })
      }
      const resolved = await resolveLeadForAttorney(req.params.leadId, attorney.id)
      if (resolved.error === 404) return res.status(404).json({ error: 'Lead not found' })
      if (resolved.error === 403) {
        return res.status(403).json({ error: 'Lead is assigned to another attorney' })
      }

      const parsed = firmTemplateSendSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
      }

      const envelope = await sendFirmTemplateForLead({
        templateId: req.params.templateId,
        lawFirmId: attorney.lawFirmId,
        leadId: req.params.leadId,
        attorneyId: attorney.id,
        signerName: parsed.data.signerName,
        signerEmail: parsed.data.signerEmail,
        title: parsed.data.title,
        providerId: parsed.data.provider,
        documentType: parsed.data.documentType as SignableDocumentType | undefined,
      })
      res.status(201).json({ envelope })
    } catch (error: any) {
      const status = Number(error?.status) || 0
      if (status === 400 || status === 404) {
        return res.status(status).json({ error: error.message || 'Request failed' })
      }
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Send firm template from Signatures failed', { message })
      respondESignError(res, error)
    }
  },
)

const createSchema = z.object({
  documentType: z.enum([
    'retainer',
    'hipaa_authorization',
    'police_report_authorization',
    'fee_agreement',
    'other',
  ]),
  title: z.string().min(1),
  signerName: z.string().min(1),
  signerEmail: z.string().email(),
  filePath: z.string().min(1),
  provider: z.string().optional(),
})

// Stream the executed (signed) PDF for an envelope to its owning attorney
// or to the plaintiff who owns the linked assessment.
router.get('/envelopes/:envelopeId/signed', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const env = await prisma.documentEnvelope.findUnique({
      where: { id: req.params.envelopeId },
      select: {
        attorneyId: true,
        status: true,
        signedFilePath: true,
        title: true,
        lead: { select: { assessment: { select: { userId: true } } } },
      },
    })
    if (!env) return res.status(404).json({ error: 'Envelope not found' })

    const attorney = await resolveAttorney(req)
    const isAttorneyOwner = Boolean(attorney && env.attorneyId === attorney.id)
    const isPlaintiffOwner = Boolean(req.user?.id && env.lead?.assessment?.userId === req.user.id)
    if (!isAttorneyOwner && !isPlaintiffOwner) {
      return res.status(403).json({ error: 'Not authorized to download this document' })
    }
    if (env.status !== 'signed' || !env.signedFilePath || !fs.existsSync(env.signedFilePath)) {
      return res.status(404).json({ error: 'No signed document is available for this envelope yet' })
    }

    const safeName = `${(env.title || 'signed-document').replace(/[^\w.-]+/g, '_')}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`)
    fs.createReadStream(env.signedFilePath).pipe(res)
  } catch (error) {
    logger.error('Signed document download failed', {
      message: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({ error: 'Failed to download signed document' })
  }
})

router.get('/leads/:leadId/envelopes', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })

    const envelopes = await listEnvelopesForLead(req.params.leadId)
    res.json({ envelopes })
  } catch (error) {
    logger.error('List envelopes failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({ error: 'Failed to list envelopes' })
  }
})

router.post('/leads/:leadId/envelopes', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })

    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    }

    const lead = await prisma.leadSubmission.findUnique({
      where: { id: req.params.leadId },
      select: { id: true, assignedAttorneyId: true },
    })
    if (!lead) return res.status(404).json({ error: 'Lead not found' })
    if (lead.assignedAttorneyId && lead.assignedAttorneyId !== attorney.id) {
      return res.status(403).json({ error: 'Lead is assigned to another attorney' })
    }

    const { provider, ...rest } = parsed.data
    const envelope = await createEnvelopeForLead({
      leadId: lead.id,
      attorneyId: attorney.id,
      providerId: provider,
      ...rest,
    })
    res.status(201).json({ envelope })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Create envelope failed', { message })
    respondESignError(res, error)
  }
})

const hipaaSchema = z.object({
  signerName: z.string().min(1),
  signerEmail: z.string().email(),
  clientDob: z.string().optional(),
  recordsCustodian: z.string().optional(),
  recordsDateRange: z.string().optional(),
  provider: z.string().optional(),
})

// End-to-end HIPAA authorization: render the PDF from the canonical template
// and send it for signature via a HIPAA-capable provider (enforced server-side).
router.post('/leads/:leadId/hipaa-authorization', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })

    const parsed = hipaaSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    }

    const lead = await prisma.leadSubmission.findUnique({
      where: { id: req.params.leadId },
      select: { id: true, assignedAttorneyId: true },
    })
    if (!lead) return res.status(404).json({ error: 'Lead not found' })
    if (lead.assignedAttorneyId && lead.assignedAttorneyId !== attorney.id) {
      return res.status(403).json({ error: 'Lead is assigned to another attorney' })
    }

    const { provider, ...rest } = parsed.data
    const envelope = await createHipaaAuthorizationEnvelope({
      leadId: lead.id,
      attorneyId: attorney.id,
      providerId: provider,
      caseRef: lead.id,
      ...rest,
    })
    res.status(201).json({ envelope })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Create HIPAA authorization failed', { message })
    respondESignError(res, error)
  }
})

const policeReportAuthSchema = z.object({
  signerName: z.string().min(1),
  signerEmail: z.string().email(),
  clientDob: z.string().optional(),
  firmName: z.string().optional(),
  attorneyName: z.string().optional(),
  agencyName: z.string().optional(),
  reportNumber: z.string().optional(),
  incidentDate: z.string().optional(),
  incidentVenue: z.string().optional(),
  provider: z.string().optional(),
})

/** Client authorization for counsel to obtain a CA police/incident report. */
router.post('/leads/:leadId/police-report-authorization', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })

    const parsed = policeReportAuthSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    }

    const lead = await prisma.leadSubmission.findUnique({
      where: { id: req.params.leadId },
      select: { id: true, assignedAttorneyId: true },
    })
    if (!lead) return res.status(404).json({ error: 'Lead not found' })
    if (lead.assignedAttorneyId && lead.assignedAttorneyId !== attorney.id) {
      return res.status(403).json({ error: 'Lead is assigned to another attorney' })
    }

    const { provider, attorneyName, firmName, ...rest } = parsed.data
    const envelope = await createPoliceReportAuthorizationEnvelope({
      leadId: lead.id,
      attorneyId: attorney.id,
      providerId: provider,
      caseRef: lead.id,
      attorneyName: attorneyName || attorney.name || undefined,
      firmName: firmName || undefined,
      ...rest,
    })
    res.status(201).json({ envelope })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Create police report authorization failed', { message })
    respondESignError(res, error)
  }
})

const retainerSchema = z.object({
  signerName: z.string().min(1),
  signerEmail: z.string().email(),
  firmName: z.string().optional(),
  attorneyName: z.string().optional(),
  contingencyPercent: z.number().min(0).max(100).optional(),
  costsResponsibility: z.string().max(2000).optional(),
  scope: z.string().max(2000).optional(),
  provider: z.string().optional(),
})

// End-to-end retainer agreement: render the contingency-fee agreement PDF and
// send it for signature via any configured provider (no HIPAA/BAA requirement).
router.post('/leads/:leadId/retainer', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })

    const parsed = retainerSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    }

    const lead = await prisma.leadSubmission.findUnique({
      where: { id: req.params.leadId },
      select: { id: true, assignedAttorneyId: true },
    })
    if (!lead) return res.status(404).json({ error: 'Lead not found' })
    if (lead.assignedAttorneyId && lead.assignedAttorneyId !== attorney.id) {
      return res.status(403).json({ error: 'Lead is assigned to another attorney' })
    }

    const { provider, attorneyName, firmName, ...rest } = parsed.data
    const envelope = await createRetainerAgreementEnvelope({
      leadId: lead.id,
      attorneyId: attorney.id,
      providerId: provider,
      caseRef: lead.id,
      // Default the firm/attorney names from the attorney's own profile.
      attorneyName: attorneyName || attorney.name || undefined,
      firmName: firmName || attorney.name || undefined,
      ...rest,
    })
    await afterRetainerEnvelopeSent(lead.id, 'Sent for signature from Signatures tab.')
    res.status(201).json({ envelope })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Create retainer agreement failed', { message })
    respondESignError(res, error)
  }
})

const recordsRequestSchema = z.object({
  documentEnvelopeId: z.string().min(1),
  recipientName: z.string().min(1),
  recipientEmail: z.string().email().optional().or(z.literal('')),
  customMessage: z.string().max(4000).optional(),
  recordsDateRange: z.string().optional(),
})

// Provider-directed medical-records request. Gated on a signed HIPAA
// authorization; reuses the external upload portal for delivery + status.
router.post('/leads/:leadId/medical-records-request', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })

    const parsed = recordsRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    }

    const lead = await prisma.leadSubmission.findUnique({
      where: { id: req.params.leadId },
      select: { id: true, assignedAttorneyId: true },
    })
    if (!lead) return res.status(404).json({ error: 'Lead not found' })
    if (lead.assignedAttorneyId && lead.assignedAttorneyId !== attorney.id) {
      return res.status(403).json({ error: 'Lead is assigned to another attorney' })
    }

    const request = await createMedicalRecordsRequest({
      leadId: lead.id,
      attorneyId: attorney.id,
      documentEnvelopeId: parsed.data.documentEnvelopeId,
      recipientName: parsed.data.recipientName,
      recipientEmail: parsed.data.recipientEmail || undefined,
      customMessage: parsed.data.customMessage,
      recordsDateRange: parsed.data.recordsDateRange,
    })
    res.status(201).json({ request })
  } catch (error) {
    if (error instanceof HipaaAuthorizationRequiredError) {
      // 409 Conflict: the pre-condition (signed authorization) is not met.
      return res.status(409).json({ error: error.message, code: 'HIPAA_AUTHORIZATION_REQUIRED' })
    }
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Create medical-records request failed', { message })
    res.status(500).json({ error: 'Failed to create records request', detail: message })
  }
})

// Sensible signing defaults for the send form: firm/attorney names + a default
// contingency, pulled from the attorney's profile + firm. Lets the panel
// prefill instead of asking the attorney to retype the same terms each time.
router.get('/leads/:leadId/defaults', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })

    const withFirm = await prisma.attorney.findUnique({
      where: { id: attorney.id },
      select: { name: true, lawFirm: { select: { name: true } } },
    })
    const firmName = withFirm?.lawFirm?.name || withFirm?.name || undefined

    // A firm-wide default contingency can live in an env var; fall back to the
    // common 33.33% one-third fee.
    const envPct = Number(process.env.DEFAULT_CONTINGENCY_PERCENT)
    const contingencyPercent = Number.isFinite(envPct) && envPct > 0 ? envPct : 33.33

    res.json({
      defaults: {
        firmName,
        attorneyName: withFirm?.name || undefined,
        contingencyPercent,
      },
    })
  } catch (error) {
    logger.error('Load signing defaults failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({ error: 'Failed to load signing defaults' })
  }
})

// Poll open envelopes against the provider and return the refreshed list. This
// is the webhook-less live-status path the panel calls on an interval.
router.post('/leads/:leadId/envelopes/refresh', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })

    const envelopes = await refreshLeadEnvelopes(req.params.leadId)
    res.json({ envelopes })
  } catch (error) {
    logger.error('Refresh envelopes failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({ error: 'Failed to refresh envelopes' })
  }
})

/**
 * Confirm-signed task "Check": poll e-sign for a signed retainer and mark the
 * confirm/send retainer tasks done when one exists.
 */
router.post('/leads/:leadId/confirm-retainer-signed', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })
    const resolved = await resolveLeadForAttorney(req.params.leadId, attorney.id)
    if (resolved.error === 404) return res.status(404).json({ error: 'Lead not found' })
    if (resolved.error === 403) {
      return res.status(403).json({ error: 'Lead is assigned to another attorney' })
    }

    const result = await checkConfirmRetainerSigned(req.params.leadId)
    res.json(result)
  } catch (error) {
    logger.error('Confirm retainer signed check failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({ error: 'Failed to check retainer signature status' })
  }
})

/**
 * Collect Police/incident report "Check": complete the task when a report is on
 * file; otherwise report whether client authorization is signed/sent.
 */
router.post('/leads/:leadId/check-police-report', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })
    const resolved = await resolveLeadForAttorney(req.params.leadId, attorney.id)
    if (resolved.error === 404) return res.status(404).json({ error: 'Lead not found' })
    if (resolved.error === 403) {
      return res.status(403).json({ error: 'Lead is assigned to another attorney' })
    }

    const result = await checkCollectPoliceReport(req.params.leadId)
    res.json(result)
  } catch (error) {
    logger.error('Check police report collect failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({ error: 'Failed to check police report status' })
  }
})

// Nudge the current signer (re-send the signing email).
router.post('/leads/:leadId/envelopes/:envelopeId/remind', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })

    await remindEnvelope(req.params.envelopeId, req.params.leadId, attorney.id)
    res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Send reminder failed', { message })
    res.status(400).json({ error: message })
  }
})

// Cancel/void an outstanding envelope so it can no longer be signed.
router.post('/leads/:leadId/envelopes/:envelopeId/void', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })

    const envelope = await voidEnvelope(req.params.envelopeId, req.params.leadId, attorney.id)
    res.json({ envelope })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Void envelope failed', { message })
    res.status(400).json({ error: message })
  }
})

const correctEmailSchema = z.object({
  signerEmail: z.string().email(),
  signerName: z.string().min(1).optional(),
})

// Correct the signer's email on an in-flight envelope and re-send.
router.post('/leads/:leadId/envelopes/:envelopeId/correct-email', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })

    const parsed = correctEmailSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    }

    const envelope = await correctSignerEmail(
      req.params.envelopeId,
      req.params.leadId,
      attorney.id,
      parsed.data.signerEmail,
      parsed.data.signerName
    )
    res.json({ envelope })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Correct signer email failed', { message })
    res.status(400).json({ error: message })
  }
})

const previewSchema = z.object({
  documentType: z.enum(['retainer', 'hipaa_authorization', 'police_report_authorization']),
  signerName: z.string().min(1),
  // Retainer terms
  firmName: z.string().optional(),
  attorneyName: z.string().optional(),
  contingencyPercent: z.number().min(0).max(100).optional(),
  costsResponsibility: z.string().max(2000).optional(),
  scope: z.string().max(2000).optional(),
  // HIPAA terms
  clientDob: z.string().optional(),
  recordsCustodian: z.string().optional(),
  recordsDateRange: z.string().optional(),
  // Police report authorization terms
  agencyName: z.string().optional(),
  reportNumber: z.string().optional(),
  incidentDate: z.string().optional(),
  incidentVenue: z.string().optional(),
})

// Render (but do NOT send) the retainer/HIPAA/police-auth PDF so the attorney
// can review the exact document before it goes out for signature.
router.post('/leads/:leadId/preview', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })

    const parsed = previewSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    }
    const p = parsed.data

    const rendered =
      p.documentType === 'retainer'
        ? await renderRetainerAgreementPdf({
            leadId: req.params.leadId,
            clientName: p.signerName,
            firmName: p.firmName || attorney.name || undefined,
            attorneyName: p.attorneyName || attorney.name || undefined,
            contingencyPercent: p.contingencyPercent,
            costsResponsibility: p.costsResponsibility,
            scope: p.scope,
            caseRef: req.params.leadId,
          })
        : p.documentType === 'police_report_authorization'
          ? await renderPoliceReportAuthorizationPdf({
              leadId: req.params.leadId,
              clientName: p.signerName,
              clientDob: p.clientDob,
              firmName: p.firmName,
              attorneyName: p.attorneyName || attorney.name || undefined,
              agencyName: p.agencyName,
              reportNumber: p.reportNumber,
              incidentDate: p.incidentDate,
              incidentVenue: p.incidentVenue,
              caseRef: req.params.leadId,
            })
          : await renderHipaaAuthorizationPdf({
              leadId: req.params.leadId,
              clientName: p.signerName,
              clientDob: p.clientDob,
              recordsCustodian: p.recordsCustodian,
              recordsDateRange: p.recordsDateRange,
              caseRef: req.params.leadId,
            })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"')
    const stream = fs.createReadStream(rendered.filePath)
    stream.pipe(res)
    // Clean up the throwaway preview file once streamed.
    stream.on('close', () => fs.promises.unlink(rendered.filePath).catch(() => {}))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Preview document failed', { message })
    res.status(500).json({ error: 'Failed to render preview', detail: message })
  }
})

const packetSchema = z.object({
  signerName: z.string().min(1),
  signerEmail: z.string().email(),
  provider: z.string().optional(),
  firmName: z.string().optional(),
  attorneyName: z.string().optional(),
  contingencyPercent: z.number().min(0).max(100).optional(),
  costsResponsibility: z.string().max(2000).optional(),
  scope: z.string().max(2000).optional(),
  clientDob: z.string().optional(),
  recordsCustodian: z.string().optional(),
  recordsDateRange: z.string().optional(),
})

// One-click onboarding packet: retainer + HIPAA authorization to the same client.
router.post('/leads/:leadId/onboarding-packet', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })

    const parsed = packetSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    }

    const resolved = await resolveLeadForAttorney(req.params.leadId, attorney.id)
    if (resolved.error === 404) return res.status(404).json({ error: 'Lead not found' })
    if (resolved.error === 403) return res.status(403).json({ error: 'Lead is assigned to another attorney' })

    const { provider, attorneyName, firmName, ...rest } = parsed.data
    const result = await createOnboardingPacket({
      leadId: req.params.leadId,
      attorneyId: attorney.id,
      providerId: provider,
      caseRef: req.params.leadId,
      attorneyName: attorneyName || attorney.name || undefined,
      firmName: firmName || attorney.name || undefined,
      ...rest,
    })
    await afterRetainerEnvelopeSent(req.params.leadId, 'Sent via onboarding packet.')
    await completeWelcomePacketForLead(
      req.params.leadId,
      'Completed via Signatures → Send onboarding packet.',
    ).catch(() => undefined)
    res.status(201).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Create onboarding packet failed', { message })
    respondESignError(res, error)
  }
})

// Upload a firm-authored PDF (custom retainer or fee agreement) and send it for
// signature. Unlike the templated retainer/HIPAA flows, the source document is
// the uploaded file. Pass documentType=retainer to file it as a retainer.
router.post(
  '/leads/:leadId/fee-agreement',
  authMiddleware,
  feeAgreementUpload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      const attorney = await resolveAttorney(req)
      if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })

      const file = (req as AuthRequest & { file?: Express.Multer.File }).file
      if (!file) return res.status(400).json({ error: 'A PDF file is required' })

      const signerName = String(req.body.signerName || '').trim()
      const signerEmail = String(req.body.signerEmail || '').trim()
      const rawType = String(req.body.documentType || 'fee_agreement').trim()
      const documentType = rawType === 'retainer' ? 'retainer' : 'fee_agreement'
      const title =
        String(req.body.title || '').trim() ||
        `${documentType === 'retainer' ? 'Retainer agreement' : 'Fee agreement'} — ${signerName}`
      const provider = req.body.provider ? String(req.body.provider) : undefined
      if (!signerName || !signerEmail) {
        return res.status(400).json({ error: 'signerName and signerEmail are required' })
      }

      const resolved = await resolveLeadForAttorney(req.params.leadId, attorney.id)
      if (resolved.error === 404) return res.status(404).json({ error: 'Lead not found' })
      if (resolved.error === 403) return res.status(403).json({ error: 'Lead is assigned to another attorney' })

      const envelope = await createEnvelopeForLead({
        leadId: req.params.leadId,
        attorneyId: attorney.id,
        providerId: provider,
        documentType,
        title,
        signerName,
        signerEmail,
        filePath: file.path,
      })
      if (documentType === 'retainer' || documentType === 'fee_agreement') {
        await afterRetainerEnvelopeSent(
          req.params.leadId,
          `Sent ${documentType === 'retainer' ? 'retainer' : 'fee agreement'} upload for signature.`,
        )
      }
      res.status(201).json({ envelope })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Fee agreement upload failed', { message })
      respondESignError(res, error)
    }
  }
)

/** Alias for uploading a custom retainer PDF (same handler as fee-agreement with documentType=retainer). */
router.post(
  '/leads/:leadId/retainer/upload',
  authMiddleware,
  feeAgreementUpload.single('file'),
  async (req: AuthRequest, res) => {
    req.body = { ...(req.body || {}), documentType: 'retainer' }
    // Reuse fee-agreement route logic by forwarding — call same shape inline.
    try {
      const attorney = await resolveAttorney(req)
      if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })
      const file = (req as AuthRequest & { file?: Express.Multer.File }).file
      if (!file) return res.status(400).json({ error: 'A PDF file is required' })
      const signerName = String(req.body.signerName || '').trim()
      const signerEmail = String(req.body.signerEmail || '').trim()
      const title = String(req.body.title || '').trim() || `Retainer agreement — ${signerName}`
      const provider = req.body.provider ? String(req.body.provider) : undefined
      if (!signerName || !signerEmail) {
        return res.status(400).json({ error: 'signerName and signerEmail are required' })
      }
      const resolved = await resolveLeadForAttorney(req.params.leadId, attorney.id)
      if (resolved.error === 404) return res.status(404).json({ error: 'Lead not found' })
      if (resolved.error === 403) return res.status(403).json({ error: 'Lead is assigned to another attorney' })
      const envelope = await createEnvelopeForLead({
        leadId: req.params.leadId,
        attorneyId: attorney.id,
        providerId: provider,
        documentType: 'retainer',
        title,
        signerName,
        signerEmail,
        filePath: file.path,
      })
      await afterRetainerEnvelopeSent(req.params.leadId, 'Sent retainer upload for signature.')
      res.status(201).json({ envelope })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Retainer upload failed', { message })
      respondESignError(res, error)
    }
  },
)

export default router

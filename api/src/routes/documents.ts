/**
 * Signable-document (e-signature) routes for attorneys.
 *
 *   POST /v1/documents/leads/:leadId/envelopes  → create + send an envelope
 *   GET  /v1/documents/leads/:leadId/envelopes  → list envelopes for a lead
 *
 * The public provider webhook lives in ./esign-webhook (raw-body route).
 */
import fs from 'fs'
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import {
  createEnvelopeForLead,
  createHipaaAuthorizationEnvelope,
  createRetainerAgreementEnvelope,
  createMedicalRecordsRequest,
  HipaaAuthorizationRequiredError,
  listEnvelopesForLead,
} from '../lib/esign/esign-service'
import { listESignatureProviders } from '../lib/esign'

const router = Router()

async function resolveAttorney(req: AuthRequest) {
  if (!req.user?.email) return null
  return prisma.attorney.findFirst({ where: { email: req.user.email } })
}

// Lets the UI render a provider picker of only the tools configured on this
// server, so the attorney/firm chooses which e-signature tool to use.
router.get('/providers', authMiddleware, async (_req: AuthRequest, res) => {
  res.json({ providers: listESignatureProviders() })
})

const createSchema = z.object({
  documentType: z.enum(['retainer', 'hipaa_authorization', 'fee_agreement', 'other']),
  title: z.string().min(1),
  signerName: z.string().min(1),
  signerEmail: z.string().email(),
  filePath: z.string().min(1),
  provider: z.string().optional(),
})

// Stream the executed (signed) PDF for an envelope to its owning attorney.
router.get('/envelopes/:envelopeId/signed', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await resolveAttorney(req)
    if (!attorney) return res.status(403).json({ error: 'Not an attorney account' })

    const env = await prisma.documentEnvelope.findUnique({
      where: { id: req.params.envelopeId },
      select: { attorneyId: true, status: true, signedFilePath: true, title: true },
    })
    if (!env) return res.status(404).json({ error: 'Envelope not found' })
    if (env.attorneyId !== attorney.id) return res.status(403).json({ error: 'Envelope belongs to another attorney' })
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
    // An unconfigured / not-yet-implemented provider surfaces here.
    res.status(502).json({ error: 'E-signature provider error', detail: message })
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
    res.status(502).json({ error: 'E-signature provider error', detail: message })
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
    res.status(201).json({ envelope })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Create retainer agreement failed', { message })
    res.status(502).json({ error: 'E-signature provider error', detail: message })
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

export default router

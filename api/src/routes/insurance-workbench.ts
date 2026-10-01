/**
 * Insurance workbench endpoints for the attorney case workspace (Insurance tab):
 * claim milestones, the per-policy correspondence thread, document slots, the
 * secure adjuster upload request, coverage stacking, the policy-limits demand,
 * and the firm-wide adjuster directory. Mounted under /v1/attorney-dashboard.
 */
import { Router } from 'express'
import crypto from 'crypto'
import fs from 'fs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware } from '../lib/auth'
import { webUrl } from '../lib/app-url'
import { ensureLocalCopy } from '../lib/object-storage'
import { sendTransactionalEmail } from '../lib/claims'
import { loadLetterContext, countBlanks } from '../lib/representation-letters'
import {
  buildAdjusterDirectory,
  adjusterKey,
  CARRIER_REQUEST_DOCS,
  computeCoverageStack,
  extractPolicyFields,
  limitsDemandBody,
  loadPolicyMilestones,
  parseIdList,
  POLICY_DOC_LABELS,
  POLICY_DOC_SLOTS,
  isPolicyDocType,
  runInsuranceFollowUps,
  sendLimitsDemand,
} from '../lib/insurance-workbench'
import {
  checkLeadIsAccepted,
  createNotification,
  firmGate,
  getAuthorizedLead,
  resolveActingAttorney,
} from './attorney-dashboard'

const router = Router()

function actorName(req: any): string | null {
  if (!req.user) return null
  return `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email || null
}

async function loadPolicy(assessmentId: string, id: string) {
  return prisma.insuranceDetail.findFirst({ where: { id, assessmentId } })
}

async function sanitizeEvidenceIds(assessmentId: string, ids: unknown): Promise<string[]> {
  const wanted = parseIdList(Array.isArray(ids) ? JSON.stringify(ids) : ids).slice(0, 20)
  if (!wanted.length) return []
  const owned = await prisma.evidenceFile.findMany({
    where: { id: { in: wanted }, assessmentId },
    select: { id: true },
  })
  const ok = new Set(owned.map((f) => f.id))
  return wanted.filter((id) => ok.has(id))
}

// Case-level overview: coverage stack vs damages. Also brings this case's
// follow-up cadences current so the tasks appear without waiting on the sweep.
router.get('/leads/:leadId/insurance/overview', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAuthorizedLead(req, req.params.leadId, { allowFirmMember: true })
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    await runInsuranceFollowUps({ assessmentId: auth.lead.assessmentId }).catch((error: any) =>
      logger.warn('Insurance follow-ups failed on overview', { error: error?.message }),
    )
    res.json({ coverage: await computeCoverageStack(auth.lead.assessmentId), slots: POLICY_DOC_SLOTS })
  } catch (error: any) {
    logger.error('Failed to build insurance overview', { error: error.message })
    res.status(500).json({ error: 'Failed to load the coverage overview' })
  }
})

/** The cases this user's firm handles (or just their own / this one), keyed by assessment. */
async function firmCaseScope(auth: any) {
  const firmId = auth.attorney?.lawFirmId ?? auth.firmMember?.lawFirmId ?? null
  const leads = await prisma.leadSubmission.findMany({
    where: firmId
      ? { assignedAttorney: { lawFirmId: firmId } }
      : auth.attorney?.id
        ? { assignedAttorneyId: auth.attorney.id }
        : { id: auth.lead.id },
    select: { id: true, assessmentId: true, assessment: { select: { user: { select: { firstName: true, lastName: true } } } } },
    take: 5000,
  })
  const byAssessment = new Map<string, { leadId: string; clientName: string }>()
  for (const l of leads) {
    if (!l.assessmentId) continue
    const u = l.assessment?.user
    byAssessment.set(l.assessmentId, {
      leadId: l.id,
      clientName: [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || 'Client',
    })
  }
  if (auth.lead?.assessmentId && !byAssessment.has(auth.lead.assessmentId)) {
    byAssessment.set(auth.lead.assessmentId, { leadId: auth.lead.id, clientName: 'This case' })
  }
  return byAssessment
}

// Firm-wide adjuster directory, built from every case the firm handles.
router.get('/leads/:leadId/insurance/adjusters', authMiddleware, async (req: any, res) => {
  try {
    const auth: any = await getAuthorizedLead(req, req.params.leadId, { allowFirmMember: true })
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const scope = await firmCaseScope(auth)
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : undefined
    const adjusters = await buildAdjusterDirectory([...scope.keys()], q)
    res.json({
      adjusters: adjusters.map((a) => ({
        ...a,
        cases: a.policies.map((p) => ({
          policyId: p.id,
          carrierName: p.carrierName,
          leadId: scope.get(p.assessmentId)?.leadId ?? null,
          clientName: scope.get(p.assessmentId)?.clientName ?? 'Client',
        })),
      })),
    })
  } catch (error: any) {
    logger.error('Failed to build adjuster directory', { error: error.message })
    res.status(500).json({ error: 'Failed to load adjusters' })
  }
})

// Correct an adjuster's contact details on every policy they handle at this firm.
const adjusterEditSchema = z.object({
  key: z.string().min(1).max(400),
  name: z.string().trim().max(200).optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
})

router.patch('/leads/:leadId/insurance/adjusters', authMiddleware, async (req: any, res) => {
  try {
    const auth: any = await getAuthorizedLead(req, req.params.leadId, { staffCan: 'manage' })
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const parsed = adjusterEditSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Check the adjuster details: the email address is invalid.' })
    const { key, name, email, phone } = parsed.data
    if (!name && !email) return res.status(400).json({ error: 'An adjuster needs a name or an email.' })

    const scope = await firmCaseScope(auth)
    const policies = await prisma.insuranceDetail.findMany({
      where: { assessmentId: { in: [...scope.keys()] } },
      select: { id: true, adjusterName: true, adjusterEmail: true, carrierName: true },
    })
    const ids = policies.filter((p) => adjusterKey(p) === key).map((p) => p.id)
    if (!ids.length) return res.status(404).json({ error: 'Adjuster not found' })
    const result = await prisma.insuranceDetail.updateMany({
      where: { id: { in: ids } },
      data: { adjusterName: name || null, adjusterEmail: email || null, adjusterPhone: phone || null },
    })
    res.json({ updated: result.count })
  } catch (error: any) {
    logger.error('Failed to update adjuster', { error: error.message })
    res.status(500).json({ error: 'Failed to update the adjuster' })
  }
})

// Everything the expanded policy card shows.
router.get('/leads/:leadId/insurance/:id/workbench', authMiddleware, async (req: any, res) => {
  try {
    const auth: any = await getAuthorizedLead(req, req.params.leadId, { allowFirmMember: true })
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const insurance = await loadPolicy(auth.lead.assessmentId, req.params.id)
    if (!insurance) return res.status(404).json({ error: 'Insurance record not found' })

    const [milestones, thread, letters, requests, documents] = await Promise.all([
      loadPolicyMilestones(insurance),
      prisma.insuranceCorrespondence.findMany({
        where: { insuranceDetailId: insurance.id },
        orderBy: { occurredAt: 'desc' },
        take: 200,
      }),
      prisma.caseLetter.findMany({
        where: { insuranceDetailId: insurance.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, kind: true, recipientEmail: true, deliveredVia: true, subject: true, createdAt: true },
      }),
      prisma.documentRequest.findMany({
        where: {
          leadId: auth.lead.id,
          OR: [{ insuranceDetailId: insurance.id }, ...(insurance.decPageRequestId ? [{ id: insurance.decPageRequestId }] : [])],
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, requestedDocs: true, status: true, recipientEmail: true, uploadLink: true, createdAt: true, targetType: true },
      }),
      prisma.insuranceDocument.findMany({ where: { insuranceDetailId: insurance.id }, orderBy: { createdAt: 'desc' } }),
    ])

    const evidenceIds = documents.map((d) => d.evidenceFileId).filter((x): x is string => Boolean(x))
    const uploadIds = documents.map((d) => d.externalUploadId).filter((x): x is string => Boolean(x))
    const [files, uploads] = await Promise.all([
      evidenceIds.length
        ? prisma.evidenceFile.findMany({
            where: { id: { in: evidenceIds }, assessmentId: auth.lead.assessmentId },
            select: { id: true, originalName: true, ocrText: true, processingStatus: true },
          })
        : [],
      uploadIds.length
        ? prisma.externalDocumentUpload.findMany({
            where: { id: { in: uploadIds } },
            select: { id: true, originalName: true, uploadedByName: true },
          })
        : [],
    ])
    const fileById = new Map(files.map((f) => [f.id, f]))
    const uploadById = new Map(uploads.map((u) => [u.id, u]))

    // Auto-fill: fields found in OCR text that the policy doesn't have yet.
    const autofill: Record<string, unknown> = {}
    for (const d of documents) {
      const f = d.evidenceFileId ? fileById.get(d.evidenceFileId) : null
      if (!f?.ocrText) continue
      const found = extractPolicyFields(f.ocrText)
      if (found.policyNumber && !insurance.policyNumber && !autofill.policyNumber) autofill.policyNumber = found.policyNumber
      if (found.claimNumber && !insurance.claimNumber && !autofill.claimNumber) autofill.claimNumber = found.claimNumber
      if (found.policyLimit && !insurance.policyLimit && !autofill.policyLimit) autofill.policyLimit = found.policyLimit
      if (found.adjusterEmail && !insurance.adjusterEmail && !autofill.adjusterEmail) autofill.adjusterEmail = found.adjusterEmail
      if (found.adjusterPhone && !insurance.adjusterPhone && !autofill.adjusterPhone) autofill.adjusterPhone = found.adjusterPhone
      if (found.coverageHints?.length && !autofill.coverageHints) autofill.coverageHints = found.coverageHints
      if (Object.keys(autofill).length && !autofill.sourceName) autofill.sourceName = f.originalName
    }

    // Combined thread: logged correspondence plus letters and portal requests.
    const items = [
      ...thread.map((c) => ({
        id: c.id,
        kind: 'entry' as const,
        direction: c.direction,
        channel: c.channel,
        subject: c.subject,
        body: c.body,
        contactName: c.contactName,
        occurredAt: c.occurredAt,
        emailed: c.emailed,
        createdByName: c.createdByName,
        evidenceFileIds: parseIdList(c.evidenceFileIds),
      })),
      ...letters.map((l) => ({
        id: `letter:${l.id}`,
        kind: 'letter' as const,
        direction: 'outbound',
        channel: l.deliveredVia === 'email' ? 'email' : 'letter',
        subject: l.kind === 'limits_demand' ? 'Policy-limits demand' : 'Letter of representation',
        body: l.deliveredVia === 'email' ? `Emailed to ${l.recipientEmail}` : 'Downloaded for fax or mail',
        contactName: null,
        occurredAt: l.createdAt,
        emailed: l.deliveredVia === 'email',
        createdByName: null,
        letterId: l.id,
        evidenceFileIds: [] as string[],
      })),
      ...requests.map((r) => ({
        id: `request:${r.id}`,
        kind: 'request' as const,
        direction: 'outbound',
        channel: 'portal',
        subject: `Secure upload link sent${r.targetType === 'plaintiff' ? ' to client' : ''}`,
        body: parseIdList(r.requestedDocs).map((k) => POLICY_DOC_LABELS[k] || k).join(', '),
        contactName: r.recipientEmail,
        occurredAt: r.createdAt,
        emailed: Boolean(r.recipientEmail),
        createdByName: null,
        status: r.status,
        evidenceFileIds: [] as string[],
      })),
    ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())

    // This policy's adjuster in the firm directory.
    let adjuster = null
    const key = adjusterKey(insurance)
    if (key) {
      const scope = await firmCaseScope(auth)
      adjuster = (await buildAdjusterDirectory([...scope.keys()])).find((a) => a.key === key) || null
    }

    res.json({
      milestones,
      thread: items,
      requests: requests.map((r) => ({ ...r, requestedDocs: parseIdList(r.requestedDocs) })),
      documents: documents.map((d) => {
        const f = d.evidenceFileId ? fileById.get(d.evidenceFileId) : null
        const u = d.externalUploadId ? uploadById.get(d.externalUploadId) : null
        return {
          id: d.id,
          docType: d.docType,
          label: POLICY_DOC_LABELS[d.docType] || d.docType,
          originalName: f?.originalName || u?.originalName || 'Document',
          source: u ? 'adjuster' : 'case',
          uploadedByName: u?.uploadedByName || null,
          evidenceFileId: d.evidenceFileId,
          processing: f ? f.processingStatus !== 'completed' && f.processingStatus !== 'failed' : false,
          createdAt: d.createdAt,
        }
      }),
      slots: POLICY_DOC_SLOTS,
      requestableDocs: CARRIER_REQUEST_DOCS.map((k) => ({ key: k, label: POLICY_DOC_LABELS[k] })),
      autofill: Object.keys(autofill).length ? autofill : null,
      adjuster,
    })
  } catch (error: any) {
    logger.error('Failed to load insurance workbench', { error: error.message })
    res.status(500).json({ error: 'Failed to load policy details' })
  }
})

// Milestone stamps the firm records by hand (carrier acknowledged, liability decision).
const milestoneSchema = z.object({
  lorAcknowledged: z.boolean().optional(),
  liabilityDecision: z.enum(['accepted', 'denied', 'partial']).nullable().optional(),
})

router.patch('/leads/:leadId/insurance/:id/milestones', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAuthorizedLead(req, req.params.leadId, { staffCan: 'manage' })
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const parsed = milestoneSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid milestone update' })
    const insurance = await loadPolicy(auth.lead.assessmentId, req.params.id)
    if (!insurance) return res.status(404).json({ error: 'Insurance record not found' })
    const { lorAcknowledged, liabilityDecision } = parsed.data
    const updated = await prisma.insuranceDetail.update({
      where: { id: insurance.id },
      data: {
        ...(lorAcknowledged !== undefined ? { lorAcknowledgedAt: lorAcknowledged ? insurance.lorAcknowledgedAt || new Date() : null } : {}),
        ...(liabilityDecision !== undefined
          ? {
              liabilityDecision,
              liabilityDecisionAt: liabilityDecision ? new Date() : null,
              ...(liabilityDecision === 'accepted' ? { claimStatus: 'accepted' } : liabilityDecision === 'denied' ? { claimStatus: 'denied' } : {}),
            }
          : {}),
      },
    })
    res.json(updated)
  } catch (error: any) {
    logger.error('Failed to update insurance milestones', { error: error.message })
    res.status(500).json({ error: 'Failed to update the claim milestone' })
  }
})

// Correspondence thread
const correspondenceSchema = z.object({
  direction: z.enum(['outbound', 'inbound']),
  channel: z.enum(['email', 'call', 'letter', 'fax', 'portal', 'note']),
  subject: z.string().trim().max(300).optional().or(z.literal('')),
  body: z.string().trim().max(20000).optional().or(z.literal('')),
  contactName: z.string().trim().max(200).optional().or(z.literal('')),
  occurredAt: z.string().optional(),
  evidenceFileIds: z.array(z.string()).max(20).optional(),
  sendEmail: z.boolean().optional(),
  recipientEmail: z.string().trim().email().optional().or(z.literal('')),
})

router.post('/leads/:leadId/insurance/:id/correspondence', authMiddleware, async (req: any, res) => {
  try {
    const auth: any = await getAuthorizedLead(req, req.params.leadId, { staffCan: 'manage' })
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const parsed = correspondenceSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Check the entry: an email address or field is invalid.' })
    const insurance = await loadPolicy(auth.lead.assessmentId, req.params.id)
    if (!insurance) return res.status(404).json({ error: 'Insurance record not found' })
    const d = parsed.data

    let emailed = false
    if (d.sendEmail) {
      const to = (d.recipientEmail || insurance.adjusterEmail || '').trim()
      if (!to) return res.status(400).json({ error: "Add the adjuster's email to send from here." })
      if (!d.subject || !d.body) return res.status(400).json({ error: 'Add a subject and message to send the email.' })
      const notAccepted = checkLeadIsAccepted(auth.lead, 'emailing the carrier')
      if (notAccepted) return res.status(notAccepted.status).json({ error: notAccepted.message })
      const ctx = await loadLetterContext(auth.lead.id)
      emailed = await sendTransactionalEmail({
        to,
        subject: d.subject,
        body: d.body,
        replyTo: ctx?.attorneyEmail || req.user?.email || undefined,
        fromName: [ctx?.attorneyName, ctx?.firmName].filter(Boolean).join(', ') || undefined,
      })
      if (!emailed) return res.status(502).json({ error: 'The email could not be sent. Try again in a moment.' })
    }

    const occurredAt = d.occurredAt && !Number.isNaN(Date.parse(d.occurredAt)) ? new Date(d.occurredAt) : new Date()
    const evidenceFileIds = await sanitizeEvidenceIds(auth.lead.assessmentId, d.evidenceFileIds)
    const entry = await prisma.insuranceCorrespondence.create({
      data: {
        insuranceDetailId: insurance.id,
        assessmentId: auth.lead.assessmentId,
        direction: d.sendEmail ? 'outbound' : d.direction,
        channel: d.sendEmail ? 'email' : d.channel,
        subject: d.subject || null,
        body: d.body || null,
        contactName: d.contactName || (d.sendEmail ? d.recipientEmail || insurance.adjusterEmail : null) || null,
        occurredAt,
        evidenceFileIds: evidenceFileIds.length ? JSON.stringify(evidenceFileIds) : null,
        emailed,
        createdById: req.user?.id || null,
        createdByName: actorName(req),
      },
    })
    // Hearing back after the LOR counts as acknowledgment for the cadence.
    if (entry.direction === 'inbound' && !insurance.lorAcknowledgedAt) {
      const lor = await prisma.caseLetter.findFirst({
        where: { insuranceDetailId: insurance.id, kind: 'carrier_lor', createdAt: { lt: occurredAt } },
        select: { id: true },
      })
      if (lor) await prisma.insuranceDetail.update({ where: { id: insurance.id }, data: { lorAcknowledgedAt: occurredAt } })
    }
    res.json({ entry, emailed })
  } catch (error: any) {
    logger.error('Failed to log insurance correspondence', { error: error.message })
    res.status(500).json({ error: 'Failed to save the entry' })
  }
})

router.delete('/leads/:leadId/insurance/:id/correspondence/:entryId', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAuthorizedLead(req, req.params.leadId, { staffCan: 'manage' })
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const removed = await prisma.insuranceCorrespondence.deleteMany({
      where: { id: req.params.entryId, insuranceDetailId: req.params.id, assessmentId: auth.lead.assessmentId },
    })
    if (!removed.count) return res.status(404).json({ error: 'Entry not found' })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to delete insurance correspondence', { error: error.message })
    res.status(500).json({ error: 'Failed to delete the entry' })
  }
})

// Document slots
const attachSchema = z.object({ docType: z.string(), evidenceFileId: z.string() })

router.post('/leads/:leadId/insurance/:id/documents', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAuthorizedLead(req, req.params.leadId, { staffCan: 'manage' })
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const parsed = attachSchema.safeParse(req.body)
    if (!parsed.success || !isPolicyDocType(parsed.data.docType)) return res.status(400).json({ error: 'Pick a document slot and a file.' })
    const insurance = await loadPolicy(auth.lead.assessmentId, req.params.id)
    if (!insurance) return res.status(404).json({ error: 'Insurance record not found' })
    const file = await prisma.evidenceFile.findFirst({
      where: { id: parsed.data.evidenceFileId, assessmentId: auth.lead.assessmentId },
      select: { id: true },
    })
    if (!file) return res.status(404).json({ error: 'File not found on this case' })

    const doc = await prisma.insuranceDocument.upsert({
      where: { insuranceDetailId_evidenceFileId: { insuranceDetailId: insurance.id, evidenceFileId: file.id } },
      update: { docType: parsed.data.docType },
      create: {
        insuranceDetailId: insurance.id,
        assessmentId: auth.lead.assessmentId,
        docType: parsed.data.docType,
        evidenceFileId: file.id,
      },
    })
    if (parsed.data.docType === 'lor_ack' && !insurance.lorAcknowledgedAt) {
      await prisma.insuranceDetail.update({ where: { id: insurance.id }, data: { lorAcknowledgedAt: new Date() } })
    }
    if (parsed.data.docType === 'denial_letter' && !insurance.liabilityDecision) {
      await prisma.insuranceDetail.update({
        where: { id: insurance.id },
        data: { liabilityDecision: 'denied', liabilityDecisionAt: new Date(), claimStatus: 'denied' },
      })
    }
    res.json(doc)
  } catch (error: any) {
    logger.error('Failed to attach insurance document', { error: error.message })
    res.status(500).json({ error: 'Failed to file the document' })
  }
})

router.delete('/leads/:leadId/insurance/:id/documents/:docId', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAuthorizedLead(req, req.params.leadId, { staffCan: 'manage' })
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const removed = await prisma.insuranceDocument.deleteMany({
      where: { id: req.params.docId, insuranceDetailId: req.params.id, assessmentId: auth.lead.assessmentId },
    })
    if (!removed.count) return res.status(404).json({ error: 'Document not found' })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to remove insurance document', { error: error.message })
    res.status(500).json({ error: 'Failed to remove the document' })
  }
})

router.get('/leads/:leadId/insurance/:id/documents/:docId/download', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAuthorizedLead(req, req.params.leadId, { allowFirmMember: true })
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const doc = await prisma.insuranceDocument.findFirst({
      where: { id: req.params.docId, insuranceDetailId: req.params.id, assessmentId: auth.lead.assessmentId },
    })
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    const file = doc.evidenceFileId
      ? await prisma.evidenceFile.findFirst({
          where: { id: doc.evidenceFileId, assessmentId: auth.lead.assessmentId },
          select: { filePath: true, originalName: true },
        })
      : null
    const upload = !file && doc.externalUploadId
      ? await prisma.externalDocumentUpload.findUnique({ where: { id: doc.externalUploadId }, select: { filePath: true, originalName: true } })
      : null
    const target = file || upload
    if (!target || !(await ensureLocalCopy(target.filePath)) || !fs.existsSync(target.filePath)) {
      return res.status(404).json({ error: 'File not found' })
    }
    res.download(target.filePath, target.originalName)
  } catch (error: any) {
    logger.error('Failed to download insurance document', { error: error.message })
    res.status(500).json({ error: 'Failed to download the document' })
  }
})

// Secure carrier upload link for any set of policy documents.
const requestDocsSchema = z.object({
  docs: z.array(z.string()).min(1).max(10),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
  recipientEmail: z.string().trim().email().optional().or(z.literal('')),
})

router.post('/leads/:leadId/insurance/:id/request-documents', authMiddleware, firmGate('request'), async (req: any, res) => {
  try {
    const auth: any = await getAuthorizedLead(req, req.params.leadId, { staffCan: 'request' })
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const parsed = requestDocsSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Pick at least one document and check the email address.' })
    const docs = parsed.data.docs.filter((d) => CARRIER_REQUEST_DOCS.includes(d))
    if (!docs.length) return res.status(400).json({ error: 'Pick at least one document to request.' })
    const attorney = await resolveActingAttorney(auth)
    if (!attorney) return res.status(409).json({ error: 'Assign a lead attorney to this case first.' })
    const insurance = await loadPolicy(auth.lead.assessmentId, req.params.id)
    if (!insurance) return res.status(404).json({ error: 'Insurance record not found' })
    const recipientEmail = (parsed.data.recipientEmail || insurance.adjusterEmail || '').trim()
    if (!recipientEmail) return res.status(400).json({ error: "Add the adjuster's email to this policy first." })

    const secureToken = crypto.randomUUID()
    const uploadLink = webUrl(`/respond/documents/${secureToken}`)
    const customMessage = parsed.data.message || null
    const docRequest = await prisma.documentRequest.create({
      data: {
        leadId: auth.lead.id,
        attorneyId: attorney.id,
        requestedDocs: JSON.stringify(docs),
        customMessage,
        secureToken,
        uploadLink,
        status: 'pending',
        targetType: 'opposing_party',
        recipientName: insurance.adjusterName || insurance.carrierName,
        recipientEmail,
        recipientRole: 'insurer',
        origin: 'attorney',
        insuranceDetailId: insurance.id,
      },
    })
    if (docs.includes('dec_page') && !insurance.decPageRequestId) {
      await prisma.insuranceDetail.update({ where: { id: insurance.id }, data: { decPageRequestId: docRequest.id } })
    }

    const attorneyName = attorney.name || 'the attorney'
    const list = docs.map((d) => `- ${POLICY_DOC_LABELS[d] || d}`).join('\n')
    const ref = insurance.claimNumber ? ` (claim ${insurance.claimNumber})` : ''
    const subject = `Document request${ref} — ${attorneyName}`
    const message = `Hello ${insurance.adjusterName || insurance.carrierName},\n\n${attorneyName} requests the following for this claim${ref}:\n${list}\n\n${customMessage ? `${customMessage}\n\n` : ''}Please upload them securely here:\n${uploadLink}\n\nThis is a secure, single-purpose link. If you believe you received this in error, please disregard it.\n\nRegards,\nClearCaseIQ on behalf of ${attorneyName}`
    await createNotification(recipientEmail, subject, message, {
      leadId: auth.lead.id,
      assessmentId: auth.lead.assessmentId,
      documentRequestId: docRequest.id,
      targetType: 'opposing_party',
      uploadLink,
    }, { replyTo: attorney.email || null, fromName: attorneyName })
    res.json({ documentRequest: { ...docRequest, requestedDocs: docs } })
  } catch (error: any) {
    logger.error('Failed to request carrier documents', { error: error.message })
    res.status(500).json({ error: 'Failed to send the document request' })
  }
})

// Policy-limits demand
function demandDeadline(days: unknown): Date {
  const n = Math.min(90, Math.max(10, Math.round(Number(days) || 30)))
  const d = new Date(Date.now() + n * 24 * 60 * 60 * 1000)
  d.setHours(17, 0, 0, 0)
  return d
}

router.get('/leads/:leadId/insurance/:id/limits-demand/preview', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAuthorizedLead(req, req.params.leadId, { allowFirmMember: true })
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const insurance = await loadPolicy(auth.lead.assessmentId, req.params.id)
    if (!insurance) return res.status(404).json({ error: 'Insurance record not found' })
    const ctx = await loadLetterContext(auth.lead.id)
    if (!ctx) return res.status(404).json({ error: 'Case not found' })
    const coverage = await computeCoverageStack(auth.lead.assessmentId)
    const deadline = demandDeadline(req.query.days)
    const body = limitsDemandBody(ctx, insurance, { deadline, specials: coverage.specials })
    res.json({ body, blanks: countBlanks(body), deadline, recipientName: insurance.carrierName, recipientEmail: insurance.adjusterEmail })
  } catch (error: any) {
    logger.error('Failed to build limits demand preview', { error: error.message })
    res.status(500).json({ error: 'Failed to build the demand' })
  }
})

const limitsDemandSchema = z.object({
  body: z.string().trim().min(50).max(30000),
  delivery: z.enum(['email', 'download']),
  recipientEmail: z.string().trim().email().optional().or(z.literal('')),
  deadlineDays: z.number().int().min(10).max(90),
})

router.post('/leads/:leadId/insurance/:id/limits-demand', authMiddleware, firmGate('request'), async (req: any, res) => {
  try {
    const auth = await getAuthorizedLead(req, req.params.leadId, { allowFirmMember: true, firmMemberWrite: true })
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const notAccepted = checkLeadIsAccepted(auth.lead, 'sending a policy-limits demand')
    if (notAccepted) return res.status(notAccepted.status).json({ error: notAccepted.message })
    const parsed = limitsDemandSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'The demand is empty, the deadline is out of range, or the email is invalid.' })
    const insurance = await loadPolicy(auth.lead.assessmentId, req.params.id)
    if (!insurance) return res.status(404).json({ error: 'Insurance record not found' })
    const recipientEmail = (parsed.data.recipientEmail || insurance.adjusterEmail || '').trim() || null
    if (parsed.data.delivery === 'email' && !recipientEmail) {
      return res.status(400).json({ error: "Add the adjuster's email, or download the demand to send it by certified mail." })
    }
    const ctx = await loadLetterContext(auth.lead.id)
    if (!ctx) return res.status(404).json({ error: 'Case not found' })
    const result = await sendLimitsDemand({
      ctx,
      insurance,
      body: parsed.data.body,
      delivery: parsed.data.delivery,
      recipientEmail,
      deadline: demandDeadline(parsed.data.deadlineDays),
      sentByEmail: req.user?.email || null,
      createdById: req.user?.id || null,
      createdByName: actorName(req),
    })
    res.json({ letterId: result.letter.id, emailed: result.emailed, insurance: result.insurance })
  } catch (error: any) {
    logger.error('Failed to send limits demand', { error: error.message })
    res.status(500).json({ error: error.message || 'Failed to send the demand' })
  }
})

router.patch('/leads/:leadId/insurance/:id/limits-demand', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAuthorizedLead(req, req.params.leadId, { staffCan: 'manage' })
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const status = req.body?.status
    if (!['accepted', 'rejected', 'sent'].includes(status)) return res.status(400).json({ error: 'Invalid status' })
    const insurance = await loadPolicy(auth.lead.assessmentId, req.params.id)
    if (!insurance?.limitsDemandSentAt) return res.status(404).json({ error: 'No policy-limits demand on this policy' })
    const updated = await prisma.insuranceDetail.update({ where: { id: insurance.id }, data: { limitsDemandStatus: status } })
    await prisma.insuranceCorrespondence.create({
      data: {
        insuranceDetailId: insurance.id,
        assessmentId: auth.lead.assessmentId,
        direction: 'inbound',
        channel: 'note',
        subject: `Policy-limits demand ${status}`,
        createdById: req.user?.id || null,
        createdByName: actorName(req),
      },
    })
    res.json(updated)
  } catch (error: any) {
    logger.error('Failed to update limits demand', { error: error.message })
    res.status(500).json({ error: 'Failed to update the demand' })
  }
})

export default router

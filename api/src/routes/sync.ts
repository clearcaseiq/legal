/**
 * External sync API — how other systems treat ClearCaseIQ as their source of
 * truth. All routes are firm-scoped by a SyncApiKey (see lib/sync-auth):
 *
 *   GET  /v1/sync/cases/:ref     canonical case record (+ ETag / If-None-Match)
 *   GET  /v1/sync/changes        cursor-pageable change feed (?since=&limit=)
 *   POST /v1/sync/proposals      submit a field write for human reconciliation
 *
 * Reads are authoritative; writes are proposals only ("ours wins").
 */
import crypto from 'crypto'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireSyncScope, syncKeyAuth, type SyncRequest } from '../lib/sync-auth'
import { buildCanonicalCase, caseEtag, resolveAssessmentIdByReference } from '../lib/canonical-case'
import { createExternalWriteProposal, isReconcilableField, RECONCILABLE_FIELDS } from '../lib/case-reconciliation'
import {
  dataExportFile,
  dataExportView,
  enqueueDataExport,
  validatePublicWebhookUrl,
} from '../lib/data-export-jobs'

const router = Router()

router.use(syncKeyAuth)

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 100

function auditSync(req: SyncRequest, action: string, entityType: string, entityId?: string, metadata?: object) {
  void prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId: entityId ?? null,
      metadata: JSON.stringify({ lawFirmId: req.syncFirmId, syncKeyId: req.syncKeyId, ...(metadata ?? {}) }),
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    },
  }).catch(() => undefined)
}

// --- Canonical case read ----------------------------------------------------
router.get('/cases/:ref', requireSyncScope('cases:read'), async (req: SyncRequest, res) => {
  const assessmentId = await resolveAssessmentIdByReference(req.params.ref)
  if (!assessmentId) return res.status(404).json({ error: 'Case not found' })

  const canonical = await buildCanonicalCase(assessmentId)
  if (!canonical) return res.status(404).json({ error: 'Case not found' })
  // Firm isolation: a key only ever sees its own firm's cases.
  if (canonical.law_firm_id !== req.syncFirmId) return res.status(404).json({ error: 'Case not found' })

  const etag = caseEtag(canonical.assessment_id, canonical.revision)
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end()
    return
  }
  res.setHeader('ETag', etag)
  res.setHeader('Cache-Control', 'no-cache')
  auditSync(req, 'sync.case.read', 'assessment', canonical.assessment_id)
  res.json({ case: canonical })
})

// --- Change feed ------------------------------------------------------------
const ChangesQuery = z.object({
  since: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
})

router.get('/changes', requireSyncScope('changes:read'), async (req: SyncRequest, res) => {
  const parsed = ChangesQuery.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid query', details: parsed.error.flatten() })
  const since = parsed.data.since ?? 0
  const limit = parsed.data.limit ?? DEFAULT_LIMIT

  const rows = await prisma.caseChangeEvent.findMany({
    where: { lawFirmId: req.syncFirmId, seq: { gt: since } },
    orderBy: { seq: 'asc' },
    take: limit + 1,
    select: {
      seq: true,
      assessmentId: true,
      revision: true,
      source: true,
      action: true,
      entityType: true,
      entityId: true,
      summary: true,
      createdAt: true,
    },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = page.length > 0 ? page[page.length - 1].seq : since

  auditSync(req, 'sync.changes.read', 'case_change_feed', undefined, {
    since,
    returned: page.length,
    nextCursor,
  })
  res.json({
    changes: page.map((r) => ({
      cursor: r.seq,
      assessment_id: r.assessmentId,
      revision: r.revision,
      source: r.source,
      action: r.action,
      entity_type: r.entityType,
      entity_id: r.entityId,
      summary: r.summary,
      changed_at: r.createdAt.toISOString(),
    })),
    next_cursor: nextCursor,
    has_more: hasMore,
  })
})

// --- Durable firm exports ---------------------------------------------------
const ExportRequest = z.object({
  type: z.enum(['snapshot', 'incremental']).default('snapshot'),
  since_cursor: z.number().int().nonnegative().optional(),
  webhook_url: z.string().url().max(2048).optional(),
  webhook_secret: z.string().min(32).max(512).optional(),
}).superRefine((value, context) => {
  if (value.type === 'incremental' && value.since_cursor === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['since_cursor'], message: 'since_cursor is required' })
  }
  if (value.webhook_secret && !value.webhook_url) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['webhook_url'], message: 'webhook_url is required' })
  }
})

router.post('/exports', requireSyncScope('export:read'), async (req: SyncRequest, res) => {
  const parsed = ExportRequest.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  if (parsed.data.webhook_url && !(await validatePublicWebhookUrl(parsed.data.webhook_url))) {
    return res.status(400).json({ error: 'Webhook must be a public HTTPS URL' })
  }
  const generatedSecret = parsed.data.webhook_url && !parsed.data.webhook_secret
    ? crypto.randomBytes(32).toString('base64url')
    : null
  const run = await enqueueDataExport({
    lawFirmId: req.syncFirmId!,
    kind: parsed.data.type,
    sinceCursor: parsed.data.since_cursor,
    requestedBySyncKeyId: req.syncKeyId,
    webhookUrl: parsed.data.webhook_url,
    webhookSecret: parsed.data.webhook_secret ?? generatedSecret,
  })
  auditSync(req, 'data_export.created', 'data_export_run', run.id, { kind: run.kind })
  res.status(202).json({
    export: dataExportView(run),
    ...(generatedSecret ? { webhook_secret: generatedSecret } : {}),
  })
})

router.get('/exports/cursor', requireSyncScope('export:read'), async (req: SyncRequest, res) => {
  const latest = await prisma.caseChangeEvent.findFirst({
    where: { lawFirmId: req.syncFirmId },
    orderBy: { seq: 'desc' },
    select: { seq: true },
  })
  auditSync(req, 'data_export.cursor.read', 'case_change_feed')
  res.setHeader('Cache-Control', 'no-store')
  res.json({ cursor: latest?.seq ?? 0 })
})

router.get('/exports/:id', requireSyncScope('export:read'), async (req: SyncRequest, res) => {
  const run = await prisma.dataExportRun.findFirst({
    where: { id: req.params.id, lawFirmId: req.syncFirmId },
  })
  if (!run) return res.status(404).json({ error: 'Export not found' })
  auditSync(req, 'data_export.status.read', 'data_export_run', run.id)
  res.setHeader('Cache-Control', 'no-store')
  res.json({ export: dataExportView(run) })
})

router.get('/exports/:id/download', requireSyncScope('export:read'), async (req: SyncRequest, res) => {
  const run = await prisma.dataExportRun.findFirst({
    where: { id: req.params.id, lawFirmId: req.syncFirmId },
  })
  if (!run) return res.status(404).json({ error: 'Export not found' })
  if (run.status === 'expired' || !run.expiresAt || run.expiresAt <= new Date()) {
    return res.status(410).json({ error: 'Export artifact has expired' })
  }
  if (run.status !== 'ready') return res.status(409).json({ error: 'Export is not ready', status: run.status })
  const file = await dataExportFile(run)
  if (!file) return res.status(503).json({ error: 'Export artifact is temporarily unavailable' })
  auditSync(req, 'data_export.downloaded', 'data_export_run', run.id, { sha256: run.contentHash })
  res.setHeader('Cache-Control', 'no-store, private')
  res.setHeader('Pragma', 'no-cache')
  res.download(file, `clearcaseiq-${run.kind}-${run.id}.zip`)
})

// --- Inbound write proposal (reconciliation) --------------------------------
const ProposalBody = z.object({
  reference: z.string().min(1),
  field: z.string().min(1),
  proposed_value: z.string().nullable().optional(),
  base_revision: z.number().int().nonnegative().optional(),
})

router.post('/proposals', requireSyncScope('proposals:write'), async (req: SyncRequest, res) => {
  const parsed = ProposalBody.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const { reference, field, proposed_value, base_revision } = parsed.data

  if (!isReconcilableField(field)) {
    return res.status(422).json({
      error: 'Unsupported field',
      supported_fields: Object.keys(RECONCILABLE_FIELDS),
    })
  }

  const assessmentId = await resolveAssessmentIdByReference(reference)
  if (!assessmentId) return res.status(404).json({ error: 'Case not found' })

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { lawFirmId: true },
  })
  if (!assessment || assessment.lawFirmId !== req.syncFirmId) {
    return res.status(404).json({ error: 'Case not found' })
  }

  const proposal = await createExternalWriteProposal({
    assessmentId,
    field,
    proposedValue: proposed_value ?? null,
    baseRevision: base_revision ?? null,
    source: 'api',
  })
  if (!proposal) return res.status(404).json({ error: 'Case not found' })

  auditSync(req, 'sync.proposal.created', 'external_write_proposal', proposal.id, { assessmentId })
  res.status(202).json({
    proposal_id: proposal.id,
    status: proposal.status,
    message: 'Change queued for firm review. ClearCaseIQ remains the source of truth until approved.',
  })
})

export default router

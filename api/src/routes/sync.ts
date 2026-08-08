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
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { syncKeyAuth, type SyncRequest } from '../lib/sync-auth'
import { buildCanonicalCase, caseEtag, resolveAssessmentIdByReference } from '../lib/canonical-case'
import { createExternalWriteProposal, isReconcilableField, RECONCILABLE_FIELDS } from '../lib/case-reconciliation'

const router = Router()

router.use(syncKeyAuth)

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 100

// --- Canonical case read ----------------------------------------------------
router.get('/cases/:ref', async (req: SyncRequest, res) => {
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
  res.json({ case: canonical })
})

// --- Change feed ------------------------------------------------------------
const ChangesQuery = z.object({
  since: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
})

router.get('/changes', async (req: SyncRequest, res) => {
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

// --- Inbound write proposal (reconciliation) --------------------------------
const ProposalBody = z.object({
  reference: z.string().min(1),
  field: z.string().min(1),
  proposed_value: z.string().nullable().optional(),
  base_revision: z.number().int().nonnegative().optional(),
})

router.post('/proposals', async (req: SyncRequest, res) => {
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

  res.status(202).json({
    proposal_id: proposal.id,
    status: proposal.status,
    message: 'Change queued for firm review. ClearCaseIQ remains the source of truth until approved.',
  })
})

export default router

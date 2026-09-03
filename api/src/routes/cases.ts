/**
 * Internal canonical-case + reconciliation routes (firm users).
 *
 *   GET  /v1/cases/proposals            firm-wide reconciliation inbox
 *   POST /v1/cases/proposals/:id/approve
 *   POST /v1/cases/proposals/:id/reject
 *   GET  /v1/cases/:ref                 canonical record (+ ETag)
 *   GET  /v1/cases/:ref/changes         recent change-feed events for the case
 *   GET  /v1/cases/:ref/proposals       pending external write proposals
 *
 * The `/proposals*` literal routes are declared before `/:ref` so the param
 * route does not shadow them. These power the reconciliation inbox where a
 * human approves external writes.
 */
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { getActorFirmContext } from '../lib/firm-context'
import { buildCanonicalCase, caseEtag, resolveAssessmentIdByReference } from '../lib/canonical-case'
import { approveExternalWriteProposal, rejectExternalWriteProposal } from '../lib/case-reconciliation'

const router = Router()

/** Firm/attorney scope check for a canonical case the actor is trying to read. */
function actorCanAccess(
  canonical: { law_firm_id: string | null; assigned_attorney_id: string | null },
  ctx: { lawFirmId: string | null; attorneyId: string | null },
): boolean {
  if (ctx.lawFirmId && canonical.law_firm_id === ctx.lawFirmId) return true
  if (ctx.attorneyId && canonical.assigned_attorney_id === ctx.attorneyId) return true
  return false
}

async function assertProposalInFirm(proposalId: string, lawFirmId: string | null): Promise<boolean> {
  if (!lawFirmId) return false
  const proposal = await prisma.externalWriteProposal.findUnique({
    where: { id: proposalId },
    select: { lawFirmId: true },
  })
  return Boolean(proposal && proposal.lawFirmId === lawFirmId)
}

// --- Firm-wide reconciliation inbox ----------------------------------------
router.get('/proposals', authMiddleware, async (req: AuthRequest, res) => {
  const ctx = await getActorFirmContext(req)
  if (!ctx.lawFirmId) return res.json({ proposals: [] })
  const proposals = await prisma.externalWriteProposal.findMany({
    // Specialist proposals are excluded: they are awaiting the claimant's
    // confirmation, and listing them here invites a firm user to answer a
    // question about the claimant's own account that only the claimant can.
    where: { lawFirmId: ctx.lawFirmId, status: 'pending', source: { not: 'specialist' } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  res.json({ proposals })
})

router.post('/proposals/:id/approve', authMiddleware, async (req: AuthRequest, res) => {
  const ctx = await getActorFirmContext(req)
  if (!(await assertProposalInFirm(req.params.id, ctx.lawFirmId))) {
    return res.status(404).json({ error: 'Proposal not found' })
  }
  const result = await approveExternalWriteProposal(req.params.id, {
    userId: req.user?.id ?? null,
    label: req.user?.email ?? null,
    as: 'firm',
  })
  if (!result.ok) return res.status(409).json({ error: result.reason })
  res.json({ ok: true, proposal: result.proposal })
})

const RejectBody = z.object({ note: z.string().max(500).optional() })

router.post('/proposals/:id/reject', authMiddleware, async (req: AuthRequest, res) => {
  const ctx = await getActorFirmContext(req)
  if (!(await assertProposalInFirm(req.params.id, ctx.lawFirmId))) {
    return res.status(404).json({ error: 'Proposal not found' })
  }
  const parsed = RejectBody.safeParse(req.body ?? {})
  const result = await rejectExternalWriteProposal(
    req.params.id,
    { userId: req.user?.id ?? null, label: req.user?.email ?? null, as: 'firm' },
    parsed.success ? parsed.data.note : undefined,
  )
  if (!result.ok) return res.status(409).json({ error: result.reason })
  res.json({ ok: true, proposal: result.proposal })
})

// --- Canonical read ---------------------------------------------------------
router.get('/:ref', authMiddleware, async (req: AuthRequest, res) => {
  const ctx = await getActorFirmContext(req)
  const assessmentId = await resolveAssessmentIdByReference(req.params.ref)
  if (!assessmentId) return res.status(404).json({ error: 'Case not found' })
  const canonical = await buildCanonicalCase(assessmentId)
  if (!canonical) return res.status(404).json({ error: 'Case not found' })
  if (!actorCanAccess(canonical, ctx)) return res.status(404).json({ error: 'Case not found' })

  const etag = caseEtag(canonical.assessment_id, canonical.revision)
  if (req.headers['if-none-match'] === etag) return res.status(304).end()
  res.setHeader('ETag', etag)
  res.json({ case: canonical })
})

// --- Per-case change feed ---------------------------------------------------
router.get('/:ref/changes', authMiddleware, async (req: AuthRequest, res) => {
  const ctx = await getActorFirmContext(req)
  const assessmentId = await resolveAssessmentIdByReference(req.params.ref)
  if (!assessmentId) return res.status(404).json({ error: 'Case not found' })
  const canonical = await buildCanonicalCase(assessmentId)
  if (!canonical || !actorCanAccess(canonical, ctx)) return res.status(404).json({ error: 'Case not found' })

  const events = await prisma.caseChangeEvent.findMany({
    where: { assessmentId },
    orderBy: { seq: 'desc' },
    take: 100,
    select: {
      seq: true,
      revision: true,
      source: true,
      actorLabel: true,
      action: true,
      entityType: true,
      entityId: true,
      summary: true,
      createdAt: true,
    },
  })
  res.json({ events })
})

// --- Per-case pending proposals --------------------------------------------
router.get('/:ref/proposals', authMiddleware, async (req: AuthRequest, res) => {
  const ctx = await getActorFirmContext(req)
  const assessmentId = await resolveAssessmentIdByReference(req.params.ref)
  if (!assessmentId) return res.status(404).json({ error: 'Case not found' })
  const canonical = await buildCanonicalCase(assessmentId)
  if (!canonical || !actorCanAccess(canonical, ctx)) return res.status(404).json({ error: 'Case not found' })

  const proposals = await prisma.externalWriteProposal.findMany({
    where: { assessmentId, status: 'pending', source: { not: 'specialist' } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ proposals })
})

export default router

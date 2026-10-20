/**
 * Demand Quality Audit endpoints for the attorney Demand workspace: run an
 * audit, read its findings, resolve them, approve the demand amount, approve
 * the letter against a passing audit, and download the audit report.
 * Mounted under /v1/attorney-dashboard.
 */
import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware } from '../lib/auth'
import {
  auditView,
  fileUrlsFor,
  latestAudit,
  releaseDecision,
  resolveFinding,
  runningAudit,
  serializeFinding,
  startDemandAudit,
} from '../lib/demand-audit/service'
import { buildAuditReportPdf } from '../lib/demand-audit/report'
import { firmGate, getAuthorizedLead, requestActorName, writeAutomationAudit } from './attorney-dashboard'

const router = Router()

/** Authorize the case, logging refusals: a request for another firm's case is an access event. */
async function authorize(req: any, res: any, write: boolean) {
  const auth = await getAuthorizedLead(req, req.params.leadId, { allowFirmMember: true, firmMemberWrite: write })
  if (auth.error) {
    if (auth.error.status === 403 || auth.error.status === 404) {
      void writeAutomationAudit({
        userId: req.user?.id,
        action: 'demand_audit_access_denied',
        entityType: 'lead',
        entityId: String(req.params.leadId),
        metadata: { path: req.path, status: auth.error.status },
      })
    }
    res.status(auth.error.status).json({ error: auth.error.message })
    return null
  }
  return auth
}

async function letterOnCase(res: any, demandId: string, assessmentId: string) {
  const letter = await prisma.demandLetter.findFirst({
    where: { id: demandId, assessmentId },
    select: { id: true, status: true, targetAmount: true, title: true, currentVersion: true, origin: true },
  })
  if (!letter) res.status(404).json({ error: 'Demand letter not found' })
  return letter
}

async function auditOnCase(req: any, res: any, assessmentId: string) {
  const audit = await prisma.demandAudit.findUnique({ where: { id: req.params.auditId } })
  if (!audit || audit.assessmentId !== assessmentId) {
    void writeAutomationAudit({
      userId: req.user?.id,
      action: 'demand_audit_access_denied',
      entityType: 'demand_audit',
      entityId: String(req.params.auditId),
      metadata: { leadId: req.params.leadId, reason: audit ? 'other_case' : 'not_found' },
    })
    res.status(404).json({ error: 'Audit not found' })
    return null
  }
  return audit
}

function filtersOf(query: any) {
  const pick = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
  return { severity: pick(query.severity), status: pick(query.status), ruleId: pick(query.rule) }
}

router.post('/leads/:leadId/demand-letters/:demandId/audits', authMiddleware, firmGate('demand'), async (req: any, res) => {
  try {
    const auth = await authorize(req, res, true)
    if (!auth) return
    const letter = await letterOnCase(res, req.params.demandId, auth.lead.assessmentId)
    if (!letter) return
    const running = await runningAudit(letter.id)
    if (running) return res.status(409).json({ error: 'An audit of this letter is already running.', auditId: running.id })

    const audit = await startDemandAudit(letter.id, { id: req.user?.id, name: requestActorName(req.user) })
    if (!audit) return res.status(404).json({ error: 'Case not found' })
    void writeAutomationAudit({
      userId: req.user?.id,
      attorneyId: auth.attorney?.id ?? null,
      action: 'demand_audit_started',
      entityType: 'demand_letter',
      entityId: letter.id,
      metadata: { leadId: auth.lead.id, auditId: audit.id, version: audit.letterVersion },
    })
    res.status(202).json(await auditView(audit))
  } catch (error: any) {
    logger.error('Failed to start demand audit', { error: error.message, demandId: req.params.demandId })
    res.status(500).json({ error: 'Failed to start the audit' })
  }
})

router.get('/leads/:leadId/demand-letters/:demandId/audits/latest', authMiddleware, async (req: any, res) => {
  try {
    const auth = await authorize(req, res, false)
    if (!auth) return
    const letter = await letterOnCase(res, req.params.demandId, auth.lead.assessmentId)
    if (!letter) return
    const audit = await latestAudit(letter.id)
    if (!audit) return res.json({ audit: null, findings: [], release: await releaseDecision(letter.id) })
    res.json(await auditView(audit, filtersOf(req.query)))
  } catch (error: any) {
    logger.error('Failed to load demand audit', { error: error.message, demandId: req.params.demandId })
    res.status(500).json({ error: 'Failed to load the audit' })
  }
})

router.get('/leads/:leadId/demand-audits/:auditId', authMiddleware, async (req: any, res) => {
  try {
    const auth = await authorize(req, res, false)
    if (!auth) return
    const audit = await auditOnCase(req, res, auth.lead.assessmentId)
    if (!audit) return
    res.json(await auditView(audit, filtersOf(req.query)))
  } catch (error: any) {
    logger.error('Failed to load demand audit', { error: error.message, auditId: req.params.auditId })
    res.status(500).json({ error: 'Failed to load the audit' })
  }
})

router.get('/leads/:leadId/demand-audits/:auditId/findings', authMiddleware, async (req: any, res) => {
  try {
    const auth = await authorize(req, res, false)
    if (!auth) return
    const audit = await auditOnCase(req, res, auth.lead.assessmentId)
    if (!audit) return
    const view = await auditView(audit, filtersOf(req.query))
    res.json({ findings: view.findings })
  } catch (error: any) {
    logger.error('Failed to list demand audit findings', { error: error.message, auditId: req.params.auditId })
    res.status(500).json({ error: 'Failed to list findings' })
  }
})

router.get('/leads/:leadId/demand-audits/:auditId/findings/:findingId', authMiddleware, async (req: any, res) => {
  try {
    const auth = await authorize(req, res, false)
    if (!auth) return
    const audit = await auditOnCase(req, res, auth.lead.assessmentId)
    if (!audit) return
    const finding = await prisma.demandAuditFinding.findFirst({ where: { id: req.params.findingId, auditId: audit.id } })
    if (!finding) return res.status(404).json({ error: 'Finding not found' })
    const history = await prisma.demandAuditResolution.findMany({
      where: { demandLetterId: audit.demandLetterId, fingerprint: finding.fingerprint },
      orderBy: { createdAt: 'desc' },
    })
    const current = history.find((r) => r.id === finding.resolutionId)
    res.json({
      finding: serializeFinding(finding, current, await fileUrlsFor([finding])),
      history: history.map((r) => ({
        id: r.id,
        disposition: r.disposition,
        reason: r.reason,
        actorName: r.actorName,
        actorIsAttorney: r.actorIsAttorney,
        letterVersion: r.letterVersion,
        createdAt: r.createdAt,
      })),
    })
  } catch (error: any) {
    logger.error('Failed to load demand audit finding', { error: error.message, findingId: req.params.findingId })
    res.status(500).json({ error: 'Failed to load the finding' })
  }
})

router.post('/leads/:leadId/demand-audits/:auditId/findings/:findingId/resolutions', authMiddleware, firmGate('demand'), async (req: any, res) => {
  try {
    const auth = await authorize(req, res, true)
    if (!auth) return
    const audit = await auditOnCase(req, res, auth.lead.assessmentId)
    if (!audit) return
    const disposition = String(req.body?.disposition || '')
    const reason = String(req.body?.reason || '')
    const result = await resolveFinding({
      auditId: audit.id,
      findingId: req.params.findingId,
      disposition,
      reason,
      actor: { id: req.user?.id, name: requestActorName(req.user), isAttorney: Boolean(auth.attorney) },
    })
    if ('error' in result) return res.status(result.status).json({ error: result.error })
    void writeAutomationAudit({
      userId: req.user?.id,
      attorneyId: auth.attorney?.id ?? null,
      action: 'demand_audit_finding_resolved',
      entityType: 'demand_audit',
      entityId: audit.id,
      metadata: { leadId: auth.lead.id, findingId: req.params.findingId, resolutionId: result.resolutionId, disposition, reason },
    })
    res.json(await auditView(audit))
  } catch (error: any) {
    logger.error('Failed to resolve demand audit finding', { error: error.message, findingId: req.params.findingId })
    res.status(500).json({ error: 'Failed to resolve the finding' })
  }
})

/** The attorney's demand figure. Never taken from a modeled range. */
router.post('/leads/:leadId/demand-letters/:demandId/demand-amount-approval', authMiddleware, firmGate('demand'), async (req: any, res) => {
  try {
    const auth = await authorize(req, res, true)
    if (!auth) return
    if (!auth.attorney) return res.status(403).json({ error: 'Only an attorney can approve the demand amount.' })
    const letter = await letterOnCase(res, req.params.demandId, auth.lead.assessmentId)
    if (!letter) return
    if (letter.status !== 'DRAFT') return res.status(400).json({ error: 'This letter is finalized.' })
    const amount = Math.round(Number(req.body?.amount) * 100) / 100
    const rationale = String(req.body?.rationale || '').trim()
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Enter the demand amount.' })
    if (rationale.length < 10) return res.status(400).json({ error: 'Record why this is the right demand.' })

    await prisma.demandLetter.update({
      where: { id: letter.id },
      data: {
        approvedDemandAmount: amount,
        targetAmount: amount,
        demandAmountApprovedById: req.user?.id ?? null,
        demandAmountApprovedByName: requestActorName(req.user),
        demandAmountApprovedAt: new Date(),
        demandAmountRationale: rationale.slice(0, 4000),
      },
    })
    void writeAutomationAudit({
      userId: req.user?.id,
      attorneyId: auth.attorney.id,
      action: 'demand_amount_approved',
      entityType: 'demand_letter',
      entityId: letter.id,
      metadata: { leadId: auth.lead.id, amount, previousTarget: letter.targetAmount, rationale },
    })
    res.json({
      approvedDemandAmount: amount,
      demandAmountApprovedByName: requestActorName(req.user),
      demandAmountApprovedAt: new Date().toISOString(),
      demandAmountRationale: rationale,
      changedFromLetter: Math.round(amount) !== Math.round(letter.targetAmount),
    })
  } catch (error: any) {
    logger.error('Failed to approve demand amount', { error: error.message, demandId: req.params.demandId })
    res.status(500).json({ error: 'Failed to approve the demand amount' })
  }
})

/**
 * Re-approve a finalized letter against a new passing audit, after evidence
 * arrived post-approval. A draft is approved by finalizing it.
 */
router.post('/leads/:leadId/demand-letters/:demandId/approvals', authMiddleware, firmGate('demand'), async (req: any, res) => {
  try {
    const auth = await authorize(req, res, true)
    if (!auth) return
    if (!auth.attorney) return res.status(403).json({ error: 'Only an attorney can approve a demand.' })
    const letter = await letterOnCase(res, req.params.demandId, auth.lead.assessmentId)
    if (!letter) return
    if (letter.status === 'DRAFT') return res.status(400).json({ error: 'Finalize the draft to approve it.' })
    if (letter.status === 'SENT') return res.status(400).json({ error: 'This demand has already been sent.' })
    const decision = await releaseDecision(letter.id, 'finalize')
    if (!decision.ok) return res.status(409).json({ error: decision.reasons[0], reasons: decision.reasons })
    await prisma.demandLetter.update({
      where: { id: letter.id },
      data: {
        approvedAuditId: decision.auditId,
        approvedDraftHash: decision.draftHash,
        approvedSourceHash: decision.sourceHash,
        approvedById: req.user?.id ?? null,
      },
    })
    void writeAutomationAudit({
      userId: req.user?.id,
      attorneyId: auth.attorney.id,
      action: 'demand_letter_reapproved',
      entityType: 'demand_letter',
      entityId: letter.id,
      metadata: { leadId: auth.lead.id, auditId: decision.auditId, draftHash: decision.draftHash, sourceHash: decision.sourceHash },
    })
    res.json({ release: await releaseDecision(letter.id, 'send') })
  } catch (error: any) {
    logger.error('Failed to approve demand letter', { error: error.message, demandId: req.params.demandId })
    res.status(500).json({ error: 'Failed to approve the letter' })
  }
})

router.get('/leads/:leadId/demand-letters/:demandId/release', authMiddleware, async (req: any, res) => {
  try {
    const auth = await authorize(req, res, false)
    if (!auth) return
    const letter = await letterOnCase(res, req.params.demandId, auth.lead.assessmentId)
    if (!letter) return
    res.json(await releaseDecision(letter.id, letter.status === 'DRAFT' ? 'finalize' : 'send'))
  } catch (error: any) {
    logger.error('Failed to check demand release', { error: error.message, demandId: req.params.demandId })
    res.status(500).json({ error: 'Failed to check release' })
  }
})

router.get('/leads/:leadId/demand-audits/:auditId/report', authMiddleware, async (req: any, res) => {
  try {
    const auth = await authorize(req, res, false)
    if (!auth) return
    const audit = await auditOnCase(req, res, auth.lead.assessmentId)
    if (!audit) return
    const letter = await prisma.demandLetter.findUnique({ where: { id: audit.demandLetterId }, select: { title: true, template: true } })
    const assessment = await prisma.assessment.findUnique({ where: { id: audit.assessmentId }, select: { referenceCode: true, caseName: true } })
    const view = await auditView(audit)
    const pdf = await buildAuditReportPdf(view, {
      caseLabel: [assessment?.caseName, assessment?.referenceCode].filter(Boolean).join(' - ') || 'Case',
      letterTitle: letter?.title || (letter?.template === 'super' ? 'Super Demand' : 'Demand letter'),
    })
    const stamp = new Date(audit.startedAt).toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Demand Quality Audit - ${assessment?.referenceCode || 'case'} - ${stamp}.pdf"`)
    res.send(Buffer.from(pdf))
  } catch (error: any) {
    logger.error('Failed to build demand audit report', { error: error.message, auditId: req.params.auditId })
    res.status(500).json({ error: 'Failed to build the audit report' })
  }
})

export default router

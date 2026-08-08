/**
 * Inbound reconciliation — "ours wins, with a human in the loop".
 *
 * ClearCaseIQ is the source of truth, so an external system never silently
 * overwrites a case field. Instead it submits an ExternalWriteProposal, which a
 * firm user reviews and approves or rejects. Approval is the only path that
 * mutates the canonical record, and it always flows through recordCaseChange so
 * the change appears on the feed with `source: 'reconcile'`.
 *
 * Only fields in RECONCILABLE_FIELDS can be applied; a proposal for any other
 * field is stored (for the audit trail) but rejected on approval as unsupported.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { recordCaseChange } from './data-authority'

type AssessmentForReconcile = {
  id: string
  lawFirmId: string | null
  revision: number
  caseName: string | null
  status: string
  venueState: string
  venueCounty: string | null
}

type FieldSpec = {
  read: (a: AssessmentForReconcile) => string | null
  apply: (assessmentId: string, value: string | null) => Promise<void>
  label: string
}

/** The allowlist of case fields an external system may propose changes to. */
export const RECONCILABLE_FIELDS: Record<string, FieldSpec> = {
  caseName: {
    read: (a) => a.caseName,
    apply: (id, value) => prisma.assessment.update({ where: { id }, data: { caseName: value } }).then(() => undefined),
    label: 'Case name',
  },
  status: {
    read: (a) => a.status,
    apply: (id, value) =>
      prisma.assessment.update({ where: { id }, data: { status: value ?? 'DRAFT' } }).then(() => undefined),
    label: 'Case status',
  },
  venueCounty: {
    read: (a) => a.venueCounty,
    apply: (id, value) => prisma.assessment.update({ where: { id }, data: { venueCounty: value } }).then(() => undefined),
    label: 'Venue county',
  },
}

export function isReconcilableField(field: string): boolean {
  return Object.prototype.hasOwnProperty.call(RECONCILABLE_FIELDS, field)
}

async function loadAssessment(assessmentId: string): Promise<AssessmentForReconcile | null> {
  return prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      lawFirmId: true,
      revision: true,
      caseName: true,
      status: true,
      venueState: true,
      venueCounty: true,
    },
  })
}

export type CreateProposalInput = {
  assessmentId: string
  field: string
  proposedValue: string | null
  source?: string
  connectionId?: string | null
  provider?: string | null
  baseRevision?: number | null
}

/**
 * Record an external system's requested field change as a pending proposal.
 * Never mutates the case — approval does. Supersedes any earlier pending
 * proposal for the same field so a reviewer only sees the latest ask.
 */
export async function createExternalWriteProposal(input: CreateProposalInput) {
  const assessment = await loadAssessment(input.assessmentId)
  if (!assessment) return null

  const spec = RECONCILABLE_FIELDS[input.field]
  const currentValue = spec ? spec.read(assessment) : null

  return prisma.$transaction(async (tx) => {
    await tx.externalWriteProposal.updateMany({
      where: { assessmentId: input.assessmentId, field: input.field, status: 'pending' },
      data: { status: 'superseded', updatedAt: new Date() },
    })
    return tx.externalWriteProposal.create({
      data: {
        assessmentId: input.assessmentId,
        lawFirmId: assessment.lawFirmId,
        connectionId: input.connectionId ?? null,
        provider: input.provider ?? null,
        field: input.field,
        currentValue,
        proposedValue: input.proposedValue,
        baseRevision: input.baseRevision ?? assessment.revision,
        source: input.source ?? 'cms_inbound',
        status: 'pending',
      },
    })
  })
}

export type ReviewActor = { userId?: string | null; label?: string | null }

/**
 * Approve a proposal: apply the value to the canonical record (allowlisted
 * fields only) and record the change on the feed. "Ours wins" holds even if the
 * case moved since the proposal was raised — a human is explicitly choosing to
 * accept the external value, and the revision drift is noted.
 */
export async function approveExternalWriteProposal(id: string, actor: ReviewActor) {
  const proposal = await prisma.externalWriteProposal.findUnique({ where: { id } })
  if (!proposal || proposal.status !== 'pending') return { ok: false as const, reason: 'not_pending' }

  if (!isReconcilableField(proposal.field)) {
    await prisma.externalWriteProposal.update({
      where: { id },
      data: {
        status: 'rejected',
        note: 'unsupported_field',
        reviewedByUserId: actor.userId ?? null,
        reviewedAt: new Date(),
      },
    })
    return { ok: false as const, reason: 'unsupported_field' }
  }

  const assessment = await loadAssessment(proposal.assessmentId)
  if (!assessment) return { ok: false as const, reason: 'case_gone' }

  const drifted = proposal.baseRevision != null && proposal.baseRevision !== assessment.revision

  await RECONCILABLE_FIELDS[proposal.field].apply(proposal.assessmentId, proposal.proposedValue)

  await recordCaseChange({
    assessmentId: proposal.assessmentId,
    source: 'reconcile',
    action: 'reconciled',
    entityType: 'assessment',
    entityId: proposal.assessmentId,
    summary: `${RECONCILABLE_FIELDS[proposal.field].label} set to "${proposal.proposedValue ?? ''}" from ${
      proposal.provider ?? proposal.source
    }${drifted ? ' (accepted over newer local value)' : ''}`,
    actor: { type: 'external', id: actor.userId ?? null, label: actor.label ?? null },
  })

  const updated = await prisma.externalWriteProposal.update({
    where: { id },
    data: {
      status: 'approved',
      reviewedByUserId: actor.userId ?? null,
      reviewedAt: new Date(),
      note: drifted ? 'applied_over_drift' : null,
    },
  })
  logger.info('External write proposal approved', { id, field: proposal.field, drifted })
  return { ok: true as const, proposal: updated }
}

export async function rejectExternalWriteProposal(id: string, actor: ReviewActor, note?: string) {
  const proposal = await prisma.externalWriteProposal.findUnique({ where: { id } })
  if (!proposal || proposal.status !== 'pending') return { ok: false as const, reason: 'not_pending' }
  const updated = await prisma.externalWriteProposal.update({
    where: { id },
    data: {
      status: 'rejected',
      note: note ?? null,
      reviewedByUserId: actor.userId ?? null,
      reviewedAt: new Date(),
    },
  })
  return { ok: true as const, proposal: updated }
}

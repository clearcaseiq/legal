/**
 * Proposed writes — "the record only changes when the right human says so".
 *
 * Two situations share one mechanism, because they are the same problem:
 *
 * 1. **An external system wants to change a case.** ClearCaseIQ is the source of
 *    truth, so it never silently overwrites. The system submits an
 *    `ExternalWriteProposal` and a firm user approves or rejects it.
 * 2. **A specialist enters an answer for a claimant on the phone.** The
 *    specialist is not the author of the claimant's account of their own
 *    injury, so their value is held as a proposal and the *claimant* confirms
 *    it. Only then does it count as theirs.
 *
 * In both cases both values are preserved until a human chooses, which is the
 * whole point: "the claimant said three weeks, the specialist entered three
 * months" has to be answerable, not resolved by whoever wrote last.
 *
 * Who may review depends on which situation it is — see `reviewerForSource`. A
 * firm user confirming a specialist's proposal on the claimant's behalf would
 * defeat the reason it is a proposal at all.
 *
 * Two allowlists bound what can be proposed: `RECONCILABLE_FIELDS` for scalar
 * `Assessment` columns, and `PROPOSABLE_FACT_PATHS` for paths inside the facts
 * document (prefixed `facts:` in the `field` column). A proposal for anything
 * else is stored for the audit trail but rejected on approval as unsupported.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { recordCaseChange } from './data-authority'
import { parseCaseFacts, updateCaseFacts } from './case-facts'
import {
  PROPOSABLE_FACT_PATHS,
  applyFactPath,
  factPathLabel,
  isProposableFactPath,
  parseFactValue,
  readFactPath,
} from './case-fact-paths'

/** Marks a `field` as a path inside the facts document rather than a column. */
export const FACT_FIELD_PREFIX = 'facts:'

export function factField(path: string): string {
  return `${FACT_FIELD_PREFIX}${path}`
}

export function factPathOf(field: string): string | null {
  return field.startsWith(FACT_FIELD_PREFIX) ? field.slice(FACT_FIELD_PREFIX.length) : null
}

type AssessmentForReconcile = {
  id: string
  lawFirmId: string | null
  revision: number
  caseName: string | null
  status: string
  venueState: string
  venueCounty: string | null
  facts: string
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
  const path = factPathOf(field)
  if (path !== null) return isProposableFactPath(path)
  return Object.prototype.hasOwnProperty.call(RECONCILABLE_FIELDS, field)
}

/** Human-readable name for either kind of field. */
export function proposalFieldLabel(field: string): string {
  const path = factPathOf(field)
  if (path !== null) return factPathLabel(path)
  return RECONCILABLE_FIELDS[field]?.label ?? field
}

/**
 * Who has standing to approve a proposal from this source.
 *
 * `specialist` is the one that must not fall through to the firm: the value is
 * being held precisely because nobody but the claimant can say whether it is
 * what they meant.
 */
export function reviewerForSource(source: string): 'firm' | 'claimant' {
  return source === 'specialist' ? 'claimant' : 'firm'
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
      facts: true,
    },
  })
}

/** The value a proposal is asking to replace, for either kind of field. */
function readCurrentValue(assessment: AssessmentForReconcile, field: string): string | null {
  const path = factPathOf(field)
  if (path !== null) {
    // Tolerant on purpose: a corrupt document should still let a reviewer see
    // what is being proposed. The write path parses strictly.
    return readFactPath(parseCaseFacts(assessment.facts), path)
  }
  return RECONCILABLE_FIELDS[field]?.read(assessment) ?? null
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

  const currentValue = readCurrentValue(assessment, input.field)

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

export type ReviewActor = {
  userId?: string | null
  label?: string | null
  /**
   * Which standing the caller is acting with. Approval fails if it does not
   * match what the proposal's source requires.
   */
  as?: 'firm' | 'claimant'
}

/**
 * Approve a proposal: apply the value to the canonical record (allowlisted
 * fields only) and record the change on the feed. "Ours wins" holds even if the
 * case moved since the proposal was raised — a human is explicitly choosing to
 * accept the proposed value, and the revision drift is noted.
 */
export async function approveExternalWriteProposal(id: string, actor: ReviewActor) {
  const proposal = await prisma.externalWriteProposal.findUnique({ where: { id } })
  if (!proposal || proposal.status !== 'pending') return { ok: false as const, reason: 'not_pending' }

  // Checked before anything is applied: approving with the wrong standing is a
  // worse failure than approving an unsupported field, because it produces a
  // real write that the person entitled to refuse it never saw.
  const required = reviewerForSource(proposal.source)
  if (actor.as && actor.as !== required) return { ok: false as const, reason: 'wrong_reviewer' }

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
  const label = proposalFieldLabel(proposal.field)
  const origin = proposal.provider ?? proposal.source
  const summary = `${label} set to "${proposal.proposedValue ?? ''}" from ${origin}${
    drifted ? ' (accepted over newer local value)' : ''
  }`

  const path = factPathOf(proposal.field)
  if (path !== null) {
    const parsed = parseFactValue(path, proposal.proposedValue)
    if (!parsed.ok) {
      await prisma.externalWriteProposal.update({
        where: { id },
        data: {
          status: 'rejected',
          note: parsed.reason,
          reviewedByUserId: actor.userId ?? null,
          reviewedAt: new Date(),
        },
      })
      return { ok: false as const, reason: parsed.reason }
    }

    // Through the choke point, so the write is guarded on the revision it read
    // and leaves a CaseFactChange row. The actor is the approver rather than the
    // proposer by design: once the claimant confirms a value, it is their
    // answer. The proposal row remains the record of who suggested it.
    const written = await updateCaseFacts({
      assessmentId: proposal.assessmentId,
      source: required === 'claimant' ? 'web' : 'reconcile',
      action: 'proposal_approved',
      entityType: 'assessment',
      entityId: proposal.assessmentId,
      summary,
      actor: {
        type: required === 'claimant' ? 'user' : 'external',
        id: actor.userId ?? null,
        label: actor.label ?? null,
      },
      mutate: (facts) => applyFactPath(facts, path, parsed.value),
    })
    if (!written) return { ok: false as const, reason: 'case_gone' }
  } else {
    await RECONCILABLE_FIELDS[proposal.field].apply(proposal.assessmentId, proposal.proposedValue)

    await recordCaseChange({
      assessmentId: proposal.assessmentId,
      source: 'reconcile',
      action: 'reconciled',
      entityType: 'assessment',
      entityId: proposal.assessmentId,
      summary,
      actor: { type: 'external', id: actor.userId ?? null, label: actor.label ?? null },
    })
  }

  const updated = await prisma.externalWriteProposal.update({
    where: { id },
    data: {
      status: 'approved',
      reviewedByUserId: actor.userId ?? null,
      reviewedAt: new Date(),
      note: drifted ? 'applied_over_drift' : null,
    },
  })
  logger.info('Write proposal approved', { id, field: proposal.field, source: proposal.source, drifted })
  return { ok: true as const, proposal: updated }
}

export type SpecialistProposalInput = {
  assessmentId: string
  /** A key of PROPOSABLE_FACT_PATHS, without the `facts:` prefix. */
  path: string
  proposedValue: string | null
  specialist: { userId: string; label?: string | null }
}

export type SpecialistProposalResult =
  | { ok: true; proposal: { id: string; field: string; currentValue: string | null; proposedValue: string | null } }
  | { ok: false; reason: string }

/**
 * Record what a specialist entered on the claimant's behalf, pending the
 * claimant's confirmation. Never writes to the case.
 */
export async function createSpecialistFactProposal(
  input: SpecialistProposalInput,
): Promise<SpecialistProposalResult> {
  if (!isProposableFactPath(input.path)) return { ok: false, reason: 'unsupported_field' }

  // Validated at proposal time as well as approval time, so a specialist finds
  // out on the call that "about 3k" is not a number, rather than the claimant
  // hitting it days later with no way to tell what was meant.
  const parsed = parseFactValue(input.path, input.proposedValue)
  if (!parsed.ok) return { ok: false, reason: parsed.reason }

  const proposal = await createExternalWriteProposal({
    assessmentId: input.assessmentId,
    field: factField(input.path),
    proposedValue: parsed.value === null ? null : String(parsed.value),
    source: 'specialist',
    provider: input.specialist.label ?? null,
  })
  if (!proposal) return { ok: false, reason: 'case_gone' }

  return {
    ok: true,
    proposal: {
      id: proposal.id,
      field: proposal.field,
      currentValue: proposal.currentValue,
      proposedValue: proposal.proposedValue,
    },
  }
}

/** Pending proposals a claimant is being asked to confirm on their own case. */
export async function listClaimantFactProposals(assessmentId: string) {
  const proposals = await prisma.externalWriteProposal.findMany({
    where: { assessmentId, status: 'pending', source: 'specialist' },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })

  return proposals.map((proposal: (typeof proposals)[number]) => ({
    id: proposal.id,
    path: factPathOf(proposal.field),
    label: proposalFieldLabel(proposal.field),
    type: PROPOSABLE_FACT_PATHS[factPathOf(proposal.field) ?? '']?.type ?? 'string',
    /** What the claimant has on file now — null when they never answered. */
    currentValue: proposal.currentValue,
    /** What the specialist heard on the call. */
    proposedValue: proposal.proposedValue,
    proposedBy: proposal.provider,
    proposedAt: proposal.createdAt,
  }))
}

export async function rejectExternalWriteProposal(id: string, actor: ReviewActor, note?: string) {
  const proposal = await prisma.externalWriteProposal.findUnique({ where: { id } })
  if (!proposal || proposal.status !== 'pending') return { ok: false as const, reason: 'not_pending' }
  if (actor.as && actor.as !== reviewerForSource(proposal.source)) {
    return { ok: false as const, reason: 'wrong_reviewer' }
  }
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

import crypto from 'crypto'
import type { UnderwritingInput } from './underwriting-engine'
import { prisma } from './prisma'

export const PREDICTION_INPUT_SNAPSHOT_VERSION = 1

type PredictionConfiguration = {
  modelVersion: string
  heuristicModelVersion?: string | null
  inferenceSource: string
  calibrationVersion?: string | null
}

export type PredictionLineage = {
  assessmentRevision: number
  triggerEventId: string
  inputHash: string
  inputSnapshot: string
}

/** Stable key ordering makes the same normalized input produce the same hash. */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, inner) => {
    if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return inner
    return Object.fromEntries(
      Object.keys(inner as Record<string, unknown>)
        .sort()
        .map((key) => [key, (inner as Record<string, unknown>)[key]]),
    )
  })
}

/**
 * Facts that cannot affect either prediction engine are deliberately excluded.
 * This keeps identity, consent, import provenance, and document-request content
 * out of a long-lived prediction snapshot while retaining every valuation input.
 */
export function purposeLimitedPredictionFacts(raw: Record<string, any>): Record<string, any> {
  const facts = structuredClone(raw || {})
  delete facts.consents
  delete facts.suggestedDocuments
  delete facts.origin
  delete facts.importSource
  delete facts.plaintiffAttorneyPreferences

  if (facts.plaintiffContext && typeof facts.plaintiffContext === 'object') {
    const context = facts.plaintiffContext
    facts.plaintiffContext = {
      ...(context.representationStage ? { representationStage: context.representationStage } : {}),
      ...(context.litigationIntent ? { litigationIntent: context.litigationIntent } : {}),
      ...(context.settlementOffer ? { settlementOffer: context.settlementOffer } : {}),
    }
  }
  if (facts.intakeData?.contact) {
    facts.intakeData = { ...facts.intakeData }
    delete facts.intakeData.contact
  }
  return facts
}

export function buildPredictionInputSnapshot(args: {
  assessmentRevision: number
  heuristicFeatures?: unknown
  underwritingInput: UnderwritingInput | null
  configuration: PredictionConfiguration
}): { inputHash: string; inputSnapshot: string } {
  const calibrationVersion = args.configuration.modelVersion.includes('+cal:')
    ? args.configuration.modelVersion.split('+cal:')[1] || null
    : args.configuration.calibrationVersion ?? null
  const underwritingInput = args.underwritingInput
    ? {
        ...args.underwritingInput,
        facts: purposeLimitedPredictionFacts(args.underwritingInput.facts),
      }
    : null
  const snapshot = {
    schemaVersion: PREDICTION_INPUT_SNAPSHOT_VERSION,
    assessmentRevision: args.assessmentRevision,
    heuristicFeatures: args.heuristicFeatures ?? null,
    underwritingInput,
    modelConfiguration: {
      ...args.configuration,
      calibrationVersion,
    },
  }
  const inputSnapshot = stableJson(snapshot)
  return {
    inputSnapshot,
    inputHash: crypto.createHash('sha256').update(inputSnapshot).digest('hex'),
  }
}

/**
 * Find the canonical event for the exact revision being valued. Legacy and
 * initial cases can have revision 0 with no event, so create a non-mutating
 * lineage event at that revision rather than incrementing the case merely
 * because a prediction was requested.
 */
export async function resolvePredictionTriggerEvent(args: {
  assessmentId: string
  assessmentRevision: number
  preferredEventId?: string | null
  action: 'prediction_initial' | 'prediction_recalculated' | 'prediction_materialized'
}): Promise<string> {
  if (args.preferredEventId) {
    const preferred = await prisma.caseChangeEvent.findFirst({
      where: {
        id: args.preferredEventId,
        assessmentId: args.assessmentId,
        revision: args.assessmentRevision,
      },
      select: { id: true },
    })
    if (preferred) return preferred.id
  }

  const existing = await prisma.caseChangeEvent.findFirst({
    where: { assessmentId: args.assessmentId, revision: args.assessmentRevision },
    orderBy: { seq: 'desc' },
    select: { id: true },
  })
  if (existing) return existing.id

  const assessment = await prisma.assessment.findUnique({
    where: { id: args.assessmentId },
    select: { lawFirmId: true },
  })
  if (!assessment) throw new Error('Assessment disappeared before prediction lineage was recorded')

  const created = await prisma.caseChangeEvent.create({
    data: {
      assessmentId: args.assessmentId,
      lawFirmId: assessment.lawFirmId,
      revision: args.assessmentRevision,
      source: 'system',
      actorType: 'system',
      action: args.action,
      entityType: 'prediction',
      summary: `Prediction generated from case revision ${args.assessmentRevision}`,
    },
    select: { id: true },
  })
  return created.id
}

export async function buildPredictionLineage(args: {
  assessmentId: string
  assessmentRevision: number
  preferredEventId?: string | null
  action: 'prediction_initial' | 'prediction_recalculated' | 'prediction_materialized'
  heuristicFeatures?: unknown
  underwritingInput: UnderwritingInput | null
  configuration: PredictionConfiguration
}): Promise<PredictionLineage> {
  const triggerEventId = await resolvePredictionTriggerEvent(args)
  const snapshot = buildPredictionInputSnapshot(args)
  return {
    assessmentRevision: args.assessmentRevision,
    triggerEventId,
    ...snapshot,
  }
}

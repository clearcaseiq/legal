/**
 * Materialize a missing valuation for a case.
 *
 * Every attorney-facing money figure — the workspace value story, pipeline
 * value, projected fee revenue, "top case today", the analytics bands — is read
 * from the `Prediction` table. Nothing computes value at read time. A case that
 * never went through `POST /v1/predict` or a case recalculation therefore shows
 * a blank or zero value on roughly ten different surfaces at once, which reads
 * as "the app is broken" rather than "this record is incomplete".
 *
 * That is not hypothetical: the demo seed script writes assessments straight to
 * the database and skips both paths, so every seeded case has been valueless
 * since it was created. The same hole swallows any real case whose predict call
 * failed.
 *
 * Rather than teach each read site to fall back — ten changes, and the eleventh
 * surface inherits the bug — this fills in the missing row from the same
 * deterministic underwriting engine the real path uses, via the same
 * `reconcileValueBandsWithUnderwriting` helper. The stored record is therefore
 * shaped identically to one written by `/v1/predict`, and every existing reader
 * works unchanged.
 *
 * It is a write on a read path, so it is built to be harmless: idempotent, and
 * every failure is swallowed and logged rather than surfaced. A case with no
 * value is a bad experience; a case workspace that will not load because the
 * valuation backfill threw is a worse one.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { underwriteCase, reconcileValueBandsWithUnderwriting } from './underwriting-engine'

/** Marks rows written here rather than by the intake prediction path. */
export const MATERIALIZED_PREDICTION_SOURCE = 'materialized_underwriting'

type AssessmentForValuation = {
  id: string
  claimType: string
  venueState?: string | null
  venueCounty?: string | null
  facts?: unknown
  evidenceFiles?: Array<{ category?: string | null; originalName?: string | null; aiClassification?: string | null }>
}

function parseFacts(raw: unknown): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, any>
  try {
    const parsed = JSON.parse(String(raw))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * Run the underwriting engine and shape the result exactly as `/v1/predict`
 * stores it. Exported for tests and for the seed script, which uses it to write
 * a valuation at creation time instead of leaving one to be backfilled later.
 */
export function buildPredictionRecord(assessment: AssessmentForValuation): {
  modelVersion: string
  viability: string
  bands: string
  explain: string
} | null {
  const underwriting = underwriteCase({
    id: assessment.id,
    claimType: assessment.claimType,
    venueState: assessment.venueState ?? null,
    venueCounty: assessment.venueCounty ?? null,
    facts: parseFacts(assessment.facts),
    evidenceFiles: assessment.evidenceFiles ?? [],
  })

  const bands = reconcileValueBandsWithUnderwriting(null, underwriting.settlement)
  // A zero band is not a valuation, it is a failure to value. Writing one would
  // mark the case as "already valued" and permanently suppress a later retry.
  if (!bands || !Number(bands.median)) return null

  return {
    modelVersion: underwriting.modelVersion,
    viability: JSON.stringify({
      overall: underwriting.scores.caseStrength / 100,
      liability: underwriting.scores.liability / 100,
      damages: underwriting.scores.severity / 100,
      attorneyAcceptance: underwriting.attorneyAcceptance.probability / 100,
    }),
    bands: JSON.stringify(bands),
    explain: JSON.stringify({ underwriting, source: MATERIALIZED_PREDICTION_SOURCE }),
  }
}

/**
 * Ensure this case has a valuation, creating one if it does not.
 *
 * Returns true only when a row was written. Never throws: callers sit on read
 * paths and must not fail because a backfill did.
 */
export async function ensureAssessmentPrediction(assessmentId: string): Promise<boolean> {
  if (!assessmentId) return false

  try {
    const existing = await prisma.prediction.count({ where: { assessmentId } })
    if (existing > 0) return false

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        facts: true,
        evidenceFiles: { select: { category: true, originalName: true, aiClassification: true } },
      },
    })
    if (!assessment) return false

    const record = buildPredictionRecord(assessment as AssessmentForValuation)
    if (!record) {
      logger.warn('Valuation backfill produced no value', { assessmentId })
      return false
    }

    // Re-check inside the write. Two concurrent page loads on the same case would
    // otherwise both pass the count above and write duplicate valuations, which
    // readers would then see flip between rows depending on ordering.
    const created = await prisma.$transaction(async (tx) => {
      const stillMissing = await tx.prediction.count({ where: { assessmentId } })
      if (stillMissing > 0) return false
      await tx.prediction.create({ data: { assessmentId, ...record } })
      return true
    })

    if (created) {
      logger.info('Backfilled a missing case valuation', { assessmentId })
    }
    return created
  } catch (error: any) {
    logger.warn('Valuation backfill failed', { assessmentId, error: error?.message })
    return false
  }
}

/**
 * Ensure a whole caseload has valuations. Used where a list is rendered, so the
 * values appear without every case having to be opened first.
 *
 * Bounded on purpose: a firm opening a 500-case dashboard for the first time
 * should not pay 500 writes on one request. Whatever is left heals on the next
 * load or when the case is opened.
 */
export async function ensurePredictionsForAssessments(
  assessmentIds: string[],
  options: { limit?: number } = {},
): Promise<number> {
  const limit = options.limit ?? 25
  const ids = Array.from(new Set(assessmentIds.filter(Boolean)))
  if (ids.length === 0) return 0

  try {
    const valued = await prisma.prediction.findMany({
      where: { assessmentId: { in: ids } },
      select: { assessmentId: true },
      distinct: ['assessmentId'],
    })
    const valuedIds = new Set(valued.map((row) => row.assessmentId))
    const missing = ids.filter((id) => !valuedIds.has(id)).slice(0, limit)
    if (missing.length === 0) return 0

    let created = 0
    for (const id of missing) {
      if (await ensureAssessmentPrediction(id)) created += 1
    }
    return created
  } catch (error: any) {
    logger.warn('Batch valuation backfill failed', { count: ids.length, error: error?.message })
    return 0
  }
}

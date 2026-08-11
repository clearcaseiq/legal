/**
 * Living liability record — a single evolving analysis per case.
 *
 * Captures the fault theory, defendant/comparative fault split, and the
 * presence/status of the core liability evidence (police report, citation,
 * witnesses, photos, video). Rollups WRITE THROUGH to `facts.liability` so the
 * underwriting engine's liability modifier and the demand narrative reflect
 * what's entered here — without rewiring those engines (they already read
 * `facts.liability.{comparativeNegligence,comparativeFault}`).
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { recordCaseChange } from './data-authority'

export const FAULT_POSTURES = ['clear', 'admitted', 'disputed', 'shared', 'denied'] as const
export type FaultPosture = (typeof FAULT_POSTURES)[number]

export const POLICE_REPORT_STATUSES = ['none', 'requested', 'received', 'n/a'] as const
export const CITATION_TARGETS = ['none', 'defendant', 'plaintiff', 'both'] as const

export interface LiabilityView {
  id: string | null
  faultTheory: string | null
  faultPosture: FaultPosture
  defendantFaultPct: number
  comparativeNegPct: number
  policeReportStatus: string
  policeReportNumber: string | null
  citationIssuedTo: string | null
  hasWitnesses: boolean
  witnessCount: number
  hasPhotos: boolean
  hasVideo: boolean
  defendantName: string | null
  defendantInsurer: string | null
  strengthOverride: number | null
  notes: string | null
  // Derived, read-only:
  strength: number
  strengthBasis: string[]
  updatedAt: string | null
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)))
}

/**
 * Derive a 0-100 liability strength from the structured record. This is a
 * transparent, deterministic heuristic — the attorney can override it.
 */
export function deriveLiabilityStrength(r: {
  faultPosture?: string | null
  defendantFaultPct?: number | null
  comparativeNegPct?: number | null
  policeReportStatus?: string | null
  citationIssuedTo?: string | null
  hasWitnesses?: boolean | null
  hasPhotos?: boolean | null
  hasVideo?: boolean | null
}): { score: number; basis: string[] } {
  const basis: string[] = []
  let score = 55

  switch (String(r.faultPosture || 'clear')) {
    case 'admitted':
      score += 25
      basis.push('Fault admitted')
      break
    case 'clear':
      score += 12
      basis.push('Clear liability')
      break
    case 'shared':
      score -= 8
      basis.push('Shared fault')
      break
    case 'disputed':
      score -= 15
      basis.push('Fault disputed')
      break
    case 'denied':
      score -= 22
      basis.push('Fault denied')
      break
  }

  // Defendant's share of fault directly moves the number.
  const defPct = Number(r.defendantFaultPct ?? 100)
  if (Number.isFinite(defPct)) {
    score = score * (0.5 + (defPct / 100) * 0.5)
    if (defPct < 100) basis.push(`Defendant ${defPct}% at fault`)
  }

  // Comparative negligence against the plaintiff is a haircut.
  const compPct = Number(r.comparativeNegPct ?? 0)
  if (compPct > 0) {
    score -= Math.min(25, compPct * 0.5)
    basis.push(`${compPct}% comparative negligence`)
  }

  if (String(r.policeReportStatus) === 'received') {
    score += 8
    basis.push('Police report on file')
  }
  if (r.citationIssuedTo === 'defendant' || r.citationIssuedTo === 'both') {
    score += 8
    basis.push('Defendant cited')
  }
  if (r.citationIssuedTo === 'plaintiff') {
    score -= 8
    basis.push('Plaintiff cited')
  }
  if (r.hasWitnesses) {
    score += 5
    basis.push('Independent witnesses')
  }
  if (r.hasPhotos) {
    score += 3
    basis.push('Scene/damage photos')
  }
  if (r.hasVideo) {
    score += 6
    basis.push('Video evidence')
  }

  return { score: clamp(score), basis }
}

function toView(record: any | null): LiabilityView {
  const base = record ?? {
    faultPosture: 'clear',
    defendantFaultPct: 100,
    comparativeNegPct: 0,
    policeReportStatus: 'none',
    citationIssuedTo: null,
    hasWitnesses: false,
    witnessCount: 0,
    hasPhotos: false,
    hasVideo: false,
  }
  const derived = deriveLiabilityStrength(base)
  const strength =
    record?.strengthOverride != null ? clamp(Number(record.strengthOverride)) : derived.score
  return {
    id: record?.id ?? null,
    faultTheory: record?.faultTheory ?? null,
    faultPosture: (record?.faultPosture ?? 'clear') as FaultPosture,
    defendantFaultPct: Number(record?.defendantFaultPct ?? 100),
    comparativeNegPct: Number(record?.comparativeNegPct ?? 0),
    policeReportStatus: record?.policeReportStatus ?? 'none',
    policeReportNumber: record?.policeReportNumber ?? null,
    citationIssuedTo: record?.citationIssuedTo ?? null,
    hasWitnesses: Boolean(record?.hasWitnesses),
    witnessCount: Number(record?.witnessCount ?? 0),
    hasPhotos: Boolean(record?.hasPhotos),
    hasVideo: Boolean(record?.hasVideo),
    defendantName: record?.defendantName ?? null,
    defendantInsurer: record?.defendantInsurer ?? null,
    strengthOverride: record?.strengthOverride ?? null,
    notes: record?.notes ?? null,
    strength,
    strengthBasis: derived.basis,
    updatedAt: record?.updatedAt ? new Date(record.updatedAt).toISOString() : null,
  }
}

/** Read the case's liability record (defaults when none exists yet). */
export async function getLiabilityRecord(assessmentId: string): Promise<LiabilityView> {
  const record = await (prisma as any).liabilityRecord
    .findUnique({ where: { assessmentId } })
    .catch(() => null)
  return toView(record)
}

/**
 * Upsert the liability record and write the rollups through to facts.liability.
 * Records a change-feed event. Returns the updated view. Never throws on the
 * write-through leg.
 */
export async function upsertLiabilityRecord(
  assessmentId: string,
  patch: Record<string, any>,
  opts?: { source?: 'attorney' | 'rose_ai' | 'system'; actorId?: string | null; actorName?: string | null },
): Promise<LiabilityView> {
  const data: any = {}
  if (patch.faultTheory !== undefined) data.faultTheory = patch.faultTheory || null
  if (patch.faultPosture !== undefined)
    data.faultPosture = (FAULT_POSTURES as readonly string[]).includes(patch.faultPosture)
      ? patch.faultPosture
      : 'clear'
  if (patch.defendantFaultPct !== undefined) data.defendantFaultPct = clamp(Number(patch.defendantFaultPct))
  if (patch.comparativeNegPct !== undefined) data.comparativeNegPct = clamp(Number(patch.comparativeNegPct))
  if (patch.policeReportStatus !== undefined)
    data.policeReportStatus = (POLICE_REPORT_STATUSES as readonly string[]).includes(patch.policeReportStatus)
      ? patch.policeReportStatus
      : 'none'
  if (patch.policeReportNumber !== undefined) data.policeReportNumber = patch.policeReportNumber || null
  if (patch.citationIssuedTo !== undefined)
    data.citationIssuedTo = (CITATION_TARGETS as readonly string[]).includes(patch.citationIssuedTo)
      ? patch.citationIssuedTo
      : null
  if (patch.hasWitnesses !== undefined) data.hasWitnesses = Boolean(patch.hasWitnesses)
  if (patch.witnessCount !== undefined) data.witnessCount = Math.max(0, Math.round(Number(patch.witnessCount) || 0))
  if (patch.hasPhotos !== undefined) data.hasPhotos = Boolean(patch.hasPhotos)
  if (patch.hasVideo !== undefined) data.hasVideo = Boolean(patch.hasVideo)
  if (patch.defendantName !== undefined) data.defendantName = patch.defendantName || null
  if (patch.defendantInsurer !== undefined) data.defendantInsurer = patch.defendantInsurer || null
  if (patch.strengthOverride !== undefined)
    data.strengthOverride =
      patch.strengthOverride === null || patch.strengthOverride === '' ? null : clamp(Number(patch.strengthOverride))
  if (patch.notes !== undefined) data.notes = patch.notes || null

  const record = await (prisma as any).liabilityRecord.upsert({
    where: { assessmentId },
    create: { assessmentId, ...data, createdById: opts?.actorId ?? null, updatedById: opts?.actorId ?? null, updatedByName: opts?.actorName ?? null },
    update: { ...data, updatedById: opts?.actorId ?? null, updatedByName: opts?.actorName ?? null },
  })

  await writeThroughLiability(assessmentId, record, opts)
  return toView(record)
}

/**
 * Map the structured liability record onto the legacy `facts.liability` shape
 * the underwriting engine reads. Never clobbers unrelated liability facts.
 */
async function writeThroughLiability(
  assessmentId: string,
  record: any,
  opts?: { source?: 'attorney' | 'rose_ai' | 'system'; actorId?: string | null; actorName?: string | null },
): Promise<void> {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { facts: true },
    })
    let facts: any = {}
    try {
      facts = assessment?.facts ? JSON.parse(assessment.facts) : {}
    } catch {
      facts = {}
    }
    const existing = facts.liability && typeof facts.liability === 'object' ? facts.liability : {}
    const compPct = Number(record.comparativeNegPct ?? 0)
    const comparativeFault = compPct >= 30 ? 'yes' : compPct > 0 ? 'possibly' : 'no'
    facts.liability = {
      ...existing,
      // The engine multiplies expected value by (score/100); it derives its own
      // score but reads comparative fault + posture/citation signals to adjust.
      comparativeNegligence: compPct / 100,
      comparativeFault,
      faultPosture: record.faultPosture,
      defendantFaultPct: record.defendantFaultPct,
      citationIssuedTo: record.citationIssuedTo || null,
      policeReport: record.policeReportStatus === 'received',
      hasWitnesses: Boolean(record.hasWitnesses),
      hasPhotos: Boolean(record.hasPhotos),
      hasVideo: Boolean(record.hasVideo),
    }
    facts.liabilityRecord = toView(record)

    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { facts: JSON.stringify(facts) },
    })

    void recordCaseChange({
      assessmentId,
      source: opts?.source ?? 'attorney',
      action: 'liability_updated',
      entityType: 'liability',
      summary: `Liability updated (${record.faultPosture}, defendant ${record.defendantFaultPct}% at fault${
        compPct ? `, ${compPct}% comparative` : ''
      })`,
      actor: { type: opts?.source === 'rose_ai' ? 'ai' : 'user', id: opts?.actorId ?? null },
    })
  } catch (error: any) {
    logger.warn('writeThroughLiability failed', { assessmentId, error: error?.message })
  }
}

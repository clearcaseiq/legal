/**
 * The one way to assemble what the underwriting engine values a case on.
 *
 * Every valuation — the stored prediction the plaintiff dashboard reads, and the
 * live figure in the attorney case header — has to be computed from the same
 * inputs, or the two sides of the same case show different settlement ranges.
 * They used to be assembled separately at each call site, and drifted: the
 * attorney header left out the files' AI summaries (where injury keywords live),
 * the stored prediction left out the attorney's Liability-tab record, and only
 * one caller passed the insurance records that carry confirmed policy limits.
 */
import { prisma } from './prisma'
import { getLiabilityRecord } from './liability-record'
import type { UnderwritingInput } from './underwriting-engine'

function parseFacts(raw: unknown): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === 'object') return { ...(raw as Record<string, any>) }
  try {
    const parsed = JSON.parse(String(raw))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * Overlay a saved Liability-tab record onto facts. A default view (no saved row)
 * must not override the engine's own liability heuristics.
 */
export function applyLiabilityRecordToFacts(facts: Record<string, any>, record: any): void {
  if (!record?.id) return
  const compPct = Number(record.comparativeNegPct || 0)
  facts.liabilityRecord = record
  facts.liability = {
    ...(facts.liability && typeof facts.liability === 'object' ? facts.liability : {}),
    faultPosture: record.faultPosture,
    defendantFaultPct: record.defendantFaultPct,
    comparativeNegligence: compPct / 100,
    comparativeFault: compPct >= 30 ? 'yes' : compPct > 0 ? 'possibly' : 'no',
    citationIssuedTo: record.citationIssuedTo,
    hasWitnesses: record.hasWitnesses,
    hasPhotos: record.hasPhotos,
    hasVideo: record.hasVideo,
    policeReport: record.policeReportStatus === 'received',
  }
}

export async function loadUnderwritingInput(assessmentId: string): Promise<UnderwritingInput | null> {
  const [assessment, liabilityRecord] = await Promise.all([
    prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        facts: true,
        evidenceFiles: {
          select: { category: true, originalName: true, aiClassification: true, aiSummary: true },
        },
        insuranceDetails: {
          select: { insuredParty: true, coverageType: true, policyLimit: true, coverageConfirmed: true },
        },
      },
    }),
    getLiabilityRecord(assessmentId).catch(() => null),
  ])
  if (!assessment) return null

  const facts = parseFacts(assessment.facts)
  applyLiabilityRecordToFacts(facts, liabilityRecord)

  return {
    id: assessment.id,
    claimType: assessment.claimType,
    venueState: assessment.venueState,
    venueCounty: assessment.venueCounty,
    facts,
    evidenceFiles: assessment.evidenceFiles || [],
    insuranceDetails: assessment.insuranceDetails || [],
  }
}

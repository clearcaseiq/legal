/**
 * Turning case data into a stored, versioned demand letter.
 *
 * `demand-letter.ts` owns the words; this owns the record — reading the
 * treatment ledger and saved analysis, asking for the draft, and writing a
 * version snapshot every time the text changes so a letter has a real history
 * of who wrote what.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { AI_AUTHOR_NAME } from './ai-author'
import {
  EMPTY_TREATMENT_LEDGER,
  buildDemandLetterSections,
  describeInjuries,
  narrateDemandLetter,
  renderDemandLetter,
  type DemandMode,
  type TreatmentLedger,
  type TreatmentLedgerEntry,
} from './demand-letter'

export type { TreatmentLedger, TreatmentLedgerEntry }

export function parseAssessmentFacts(rawFacts: unknown) {
  if (typeof rawFacts === 'string') {
    try {
      return JSON.parse(rawFacts)
    } catch {
      return {}
    }
  }
  return rawFacts && typeof rawFacts === 'object' ? rawFacts : {}
}

/** Pull the saved LLM analysis payload off an assessment, if present. */
export function extractAnalysisPayload(assessment: any): any | null {
  if (!assessment?.chatgptAnalysis) return null
  try {
    const parsed = JSON.parse(assessment.chatgptAnalysis)
    return parsed.analysis || parsed
  } catch {
    return null
  }
}

/**
 * Treatment, diagnoses, and bills logged against this assessment's referrals,
 * so the letter can show a real visit-by-visit timeline and an itemized total
 * instead of a single self-reported number.
 */
export async function loadTreatmentLedger(assessmentId: string): Promise<TreatmentLedger> {
  const leads = await prisma.leadSubmission.findMany({
    where: { assessmentId },
    select: { id: true },
  })
  const leadIds = leads.map((l) => l.id)
  if (leadIds.length === 0) return EMPTY_TREATMENT_LEDGER

  const records = await prisma.treatmentRecord.findMany({
    where: { leadId: { in: leadIds }, status: { notIn: ['cancelled', 'no_show'] } },
    orderBy: { visitDate: 'asc' },
  })
  if (records.length === 0) return EMPTY_TREATMENT_LEDGER

  const providerIds = [...new Set(records.map((r) => r.providerId))]
  const providers = await prisma.medicalProvider.findMany({
    where: { id: { in: providerIds } },
    select: { id: true, name: true, specialty: true },
  })
  const providerById = new Map(providers.map((p) => [p.id, p]))

  const entries: TreatmentLedgerEntry[] = records.map((r) => {
    const provider = providerById.get(r.providerId)
    return {
      visitDate: r.visitDate,
      providerName: provider ? `${provider.name}${provider.specialty ? ` (${provider.specialty})` : ''}` : 'Provider',
      visitType: r.visitType,
      diagnosis: r.diagnosis,
      diagnosisCode: r.diagnosisCode,
      billedAmount: r.billedAmount,
      status: r.status,
    }
  })

  const totalBilled = entries.reduce((sum, e) => sum + (e.billedAmount || 0), 0)
  const visitDates = entries.map((e) => e.visitDate)

  return {
    entries,
    totalBilled,
    firstVisit: visitDates[0] ?? null,
    lastVisit: visitDates[visitDates.length - 1] ?? null,
    providerCount: providerIds.length,
  }
}

export const DEFAULT_DEMAND_RECIPIENT = {
  name: 'Insurance Adjuster',
  address: 'To Whom It May Concern',
  email: '',
}

export interface DraftedDemand {
  content: string
  targetAmount: number
  recipient: { name: string; address: string; email?: string }
  source: 'ai' | 'deterministic'
}

/**
 * Compose a demand letter for a case.
 *
 * `useAi` is what separates this from the legacy template path: when false (or
 * when no provider is configured) the caller gets exactly the deterministic
 * letter the platform has always produced.
 */
export async function draftDemandForAssessment(options: {
  assessmentId: string
  useAi?: boolean
  targetAmount?: number
  recipient?: { name: string; address: string; email?: string }
  mode?: DemandMode
  /** Free-text steer, e.g. "emphasise the delayed MRI and the missed work". */
  guidance?: string | null
}): Promise<DraftedDemand | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: options.assessmentId },
    include: { evidenceFiles: true },
  })
  if (!assessment) return null

  const analysis = extractAnalysisPayload(assessment)
  const facts = parseAssessmentFacts(assessment.facts)
  const treatmentLedger = await loadTreatmentLedger(options.assessmentId)

  const targetAmount =
    options.targetAmount ?? analysis?.expectedSettlementRange?.mid ?? analysis?.estimatedValue?.medium ?? 0
  const recipient = options.recipient ?? DEFAULT_DEMAND_RECIPIENT

  const sections = buildDemandLetterSections({
    assessment,
    facts,
    targetAmount,
    recipient,
    message: analysis?.demandPackage?.liabilityOutline,
    mode: options.mode ?? 'represented',
    treatmentLedger,
    analysis,
  })

  if (!options.useAi) {
    return { content: renderDemandLetter(sections), targetAmount, recipient, source: 'deterministic' }
  }

  const narrated = await narrateDemandLetter(sections, {
    assessmentId: options.assessmentId,
    claimType: assessment.claimType,
    venue: [assessment.venueCounty, assessment.venueState].filter(Boolean).join(', ') || null,
    injuries: describeInjuries(facts),
    extraGuidance: options.guidance ?? null,
  })

  return {
    content: renderDemandLetter(narrated.sections),
    targetAmount,
    recipient,
    source: narrated.source,
  }
}

export interface DemandAuthor {
  id?: string | null
  name?: string | null
}

/** The author to record: Rose for AI drafts, otherwise the person who acted. */
export function demandAuthorName(source: 'ai' | 'deterministic' | 'human', actor?: DemandAuthor): string | null {
  if (source === 'human') return actor?.name || null
  return AI_AUTHOR_NAME
}

const VERSION_CLAIM_ATTEMPTS = 5

/**
 * Save new text onto a letter as the next version.
 *
 * Creating the version row comes first and acts as the claim on the version
 * number: the unique index on (letter, version) means two concurrent saves —
 * two editors, or a save racing a redraft — cannot take the same number, and
 * the loser retries against the new count instead of having its snapshot
 * silently dropped. Losing a snapshot would be the worst outcome here, since
 * the history is the entire point of the feature.
 */
export async function saveDemandVersion(options: {
  demandLetterId: string
  content: string
  source: 'ai' | 'deterministic' | 'human'
  actor?: DemandAuthor
}): Promise<number> {
  const authorName = demandAuthorName(options.source, options.actor)

  for (let attempt = 0; attempt < VERSION_CLAIM_ATTEMPTS; attempt += 1) {
    const letter = await prisma.demandLetter.findUnique({
      where: { id: options.demandLetterId },
      select: { currentVersion: true },
    })
    const nextVersion = (letter?.currentVersion ?? 0) + 1

    try {
      await prisma.demandLetterVersion.create({
        data: {
          demandLetterId: options.demandLetterId,
          version: nextVersion,
          content: options.content,
          source: options.source,
          authorId: options.source === 'human' ? options.actor?.id || null : null,
          authorName,
        },
      })
    } catch (error: any) {
      if (error?.code === 'P2002') {
        logger.info('Demand version number taken; retrying', {
          demandLetterId: options.demandLetterId,
          version: nextVersion,
        })
        continue
      }
      throw error
    }

    await prisma.demandLetter.update({
      where: { id: options.demandLetterId },
      data: {
        content: options.content,
        currentVersion: nextVersion,
        contentSource: options.source === 'human' ? null : options.source,
        updatedById: options.source === 'human' ? options.actor?.id || null : null,
        updatedByName: authorName,
      },
    })

    return nextVersion
  }

  throw new Error('Could not claim a demand letter version number')
}

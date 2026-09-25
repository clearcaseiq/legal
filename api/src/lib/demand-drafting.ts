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
  type DemandCaseRecord,
  type DemandExhibit,
  type DemandMode,
  type ExhibitSection,
  type TreatmentLedger,
  type TreatmentLedgerEntry,
} from './demand-letter'
import { getLiabilityRecord } from './liability-record'
import { getMedicalTimeline } from './medical-record'
import { parseIdentityCheck } from './claimant-identity-check'
import { plaintiffNameOf } from './case-name'
import { isCustomRequestKey, requestedDocLabel } from './document-request-status'

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

const EXHIBIT_CATEGORY_LABELS: Record<string, string> = {
  police_report: 'Police / incident report',
  witness_statements: 'Witness statement',
  video: 'Video',
  photos: 'Photograph',
  medical_records: 'Medical records',
  bills: 'Medical bill',
  wage_verification: 'Wage-loss documentation',
}

/**
 * Which letter section cites a file, or null when the file is not something
 * that goes to an adjuster (insurance correspondence, the Dec page, anything
 * uncategorised). Only files uploaded against an attorney's custom request are
 * taken from `other`, because that bucket also holds whatever nobody sorted.
 */
export function exhibitSectionForFile(file: { category?: string | null; subcategory?: string | null }): ExhibitSection | null {
  const category = String(file.category || '').trim()
  const sub = String(file.subcategory || '').toLowerCase()
  switch (category) {
    case 'police_report':
    case 'witness_statements':
    case 'video':
      return 'liability'
    case 'photos':
      if (/injur/.test(sub)) return 'injuries'
      if (/property|vehicle|damage/.test(sub)) return 'damages'
      return 'liability'
    case 'medical_records':
      return 'treatment'
    case 'bills':
      return 'bills'
    case 'wage_verification':
      return 'wages'
    case 'other':
      return isCustomRequestKey(sub) ? 'other' : null
    default:
      return null
  }
}

const SECTION_ORDER: ExhibitSection[] = ['liability', 'treatment', 'bills', 'wages', 'damages', 'injuries', 'other']

/** Number the case's files in the order their sections appear in the letter. */
export function buildDemandExhibits(
  files: Array<{
    category?: string | null
    subcategory?: string | null
    originalName: string
    createdAt?: Date | string | null
    identityCheck?: string | null
  }>,
): DemandExhibit[] {
  const eligible = files
    .map((file) => ({ file, section: exhibitSectionForFile(file) }))
    // A document naming someone other than the client must not go to an adjuster.
    .filter((row): row is { file: (typeof files)[number]; section: ExhibitSection } =>
      row.section !== null && parseIdentityCheck(row.file.identityCheck ?? null)?.verdict !== 'mismatch',
    )
    .sort((a, b) => {
      const bySection = SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section)
      if (bySection !== 0) return bySection
      return new Date(a.file.createdAt || 0).getTime() - new Date(b.file.createdAt || 0).getTime()
    })
  return eligible.map(({ file, section }, index) => {
    const kind = isCustomRequestKey(String(file.subcategory || ''))
      ? requestedDocLabel(String(file.subcategory))
      : EXHIBIT_CATEGORY_LABELS[String(file.category)] || 'Document'
    return { number: index + 1, section, label: `${kind} (${file.originalName})` }
  })
}

/** The at-fault carrier's claim, which is who a demand is addressed to. */
function pickDemandClaim(policies: any[]): any | null {
  if (!policies.length) return null
  return (
    policies.find((p) => p.insuredParty === 'defendant' && (p.coverageType || 'liability') === 'liability') ||
    policies.find((p) => p.insuredParty === 'defendant') ||
    policies.find((p) => p.coverageType === 'liability' && p.insuredParty !== 'client') ||
    policies.find((p) => p.insuredParty !== 'client') ||
    null
  )
}

/**
 * Everything the attorney entered on the case tabs, gathered for the letter:
 * client and attorney, the carrier claim, liability, the medical timeline, the
 * itemized damages, and the case files numbered as exhibits.
 */
export async function loadDemandCaseRecord(assessment: any): Promise<DemandCaseRecord> {
  const assessmentId = String(assessment.id)
  const [liability, medical, damageItems, policies, lead] = await Promise.all([
    getLiabilityRecord(assessmentId).catch(() => null),
    getMedicalTimeline(assessmentId).catch(() => null),
    (prisma as any).damageItem
      .findMany({ where: { assessmentId }, orderBy: [{ incurredAt: 'asc' }, { createdAt: 'asc' }] })
      .catch(() => [] as any[]),
    prisma.insuranceDetail.findMany({ where: { assessmentId }, orderBy: { createdAt: 'asc' } }).catch(() => [] as any[]),
    prisma.leadSubmission
      .findUnique({
        where: { assessmentId },
        select: {
          assignedAttorney: {
            select: {
              name: true,
              email: true,
              phone: true,
              lawFirm: { select: { name: true, address: true, city: true, state: true, zip: true, phone: true } },
            },
          },
        },
      })
      .catch(() => null),
  ])

  const claim = pickDemandClaim(policies as any[])
  const attorney = lead?.assignedAttorney
  const firm = attorney?.lawFirm
  const firmAddress = firm
    ? [firm.address, [firm.city, [firm.state, firm.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')]
        .filter(Boolean)
        .join(', ') || null
    : null

  return {
    clientName: plaintiffNameOf({ user: assessment.user }),
    attorney: attorney
      ? {
          name: attorney.name,
          firmName: firm?.name ?? null,
          phone: attorney.phone || firm?.phone || null,
          email: attorney.email ?? null,
          address: firmAddress,
        }
      : null,
    claim: claim
      ? {
          carrierName: claim.carrierName,
          claimNumber: claim.claimNumber,
          policyNumber: claim.policyNumber,
          adjusterName: claim.adjusterName,
          adjusterEmail: claim.adjusterEmail,
        }
      : null,
    liability: liability?.id ? liability : null,
    medical: medical && (medical.entries.length > 0 || medical.status.id) ? medical : null,
    damageItems: (damageItems as any[]).map((i) => ({
      category: i.category,
      description: i.description,
      amount: Number(i.amount) || 0,
      provider: i.provider,
      incurredAt: i.incurredAt,
      billingStatus: i.billingStatus,
    })),
    exhibits: buildDemandExhibits(assessment.evidenceFiles || []),
  }
}

/** Address a letter to the claim's adjuster unless the caller chose someone. */
export function demandRecipientFor(
  requested: { name: string; address: string; email?: string } | undefined,
  claim: { carrierName: string; adjusterName?: string | null; adjusterEmail?: string | null } | null | undefined,
): { name: string; address: string; email?: string } {
  const isDefault =
    !requested ||
    (requested.name === DEFAULT_DEMAND_RECIPIENT.name && requested.address === DEFAULT_DEMAND_RECIPIENT.address)
  if (!isDefault || !claim?.carrierName) return requested ?? DEFAULT_DEMAND_RECIPIENT
  return {
    name: claim.adjusterName?.trim() || `${claim.carrierName} Claims Department`,
    address: claim.carrierName,
    email: claim.adjusterEmail || requested?.email || '',
  }
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
    include: { evidenceFiles: true, user: { select: { firstName: true, lastName: true } } },
  })
  if (!assessment) return null

  const analysis = extractAnalysisPayload(assessment)
  const facts = parseAssessmentFacts(assessment.facts)
  const [treatmentLedger, caseRecord] = await Promise.all([
    loadTreatmentLedger(options.assessmentId),
    loadDemandCaseRecord(assessment),
  ])

  const targetAmount =
    options.targetAmount ?? analysis?.expectedSettlementRange?.mid ?? analysis?.estimatedValue?.medium ?? 0
  const recipient = demandRecipientFor(options.recipient, caseRecord.claim)

  const sections = buildDemandLetterSections({
    assessment,
    facts,
    targetAmount,
    recipient,
    message: analysis?.demandPackage?.liabilityOutline,
    mode: options.mode ?? 'represented',
    treatmentLedger,
    analysis,
    caseRecord,
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

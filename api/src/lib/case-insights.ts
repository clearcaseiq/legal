/**
 * Case Insights - Medical Chronology, Case Preparation, Settlement Benchmarks
 * EvenUp-style features for case valuation and readiness
 */

import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'
import { analyzeClinicalCodes } from './clinical-codes'
import {
  deriveTreatmentPosture,
  isPlausibleTreatmentDate,
  OPEN_TREATMENT_GAP_DAYS,
} from './demand-readiness'

export interface MedicalChronologyEvent {
  id: string
  date: string | null
  label: string
  source: 'incident' | 'treatment' | 'evidence' | 'medical_record'
  details?: string
  provider?: string
  amount?: number
  sourceFileId?: string
  sourceFileName?: string
  extractionConfidence?: 'documented' | 'estimated' | 'needs_review'
  /** Intake treatment type slug (e.g. surgery_status) for client-side i18n. */
  type?: string
  /** Intake status slug/text for client-side i18n when present. */
  status?: string
}

export interface MedicalChronologySummary {
  providers: string[]
  visitCount: number
  diagnoses: { code: string; label: string }[]
  icd10Codes: string[]
  procedures: { code: string; label: string }[]
  cptCodes: string[]
  medications: string[]
  imaging: string[]
  surgeries: string[]
  billedTotal: number
  treatmentGaps: { startDate: string; endDate: string; gapDays: number }[]
  firstTreatmentDate: string | null
  lastTreatmentDate: string | null
  eventCount: number
  timeline: MedicalChronologyEvent[]
}

export interface ReadinessFactor {
  key: string
  label: string
  points: number
  max: number
  /** Short guidance shown when the factor isn't fully earned. */
  hint?: string
}

export interface CasePreparationResult {
  missingDocs: { key: string; label: string; priority: 'high' | 'medium' | 'low' }[]
  treatmentGaps: { startDate: string; endDate: string; gapDays: number }[]
  strengths: string[]
  weaknesses: string[]
  readinessScore: number // 0-100
  /** Per-factor contribution to readinessScore, for surfacing "what's holding it down". */
  readinessFactors: ReadinessFactor[]
}

export interface SettlementBenchmark {
  claimType: string
  venueState: string
  injurySeverity: number | null
  p25: number
  p50: number
  p75: number
  p90: number
  count: number
  yourCaseContext?: { medCharges?: number; predictedRange?: [number, number] }
}

export type PlaintiffMedicalReviewStatus = 'pending' | 'confirmed' | 'skipped'

export interface PlaintiffMedicalReviewEdit {
  eventId: string
  correctedDate?: string
  correctedProvider?: string
  correctedLabel?: string
  correctedDetails?: string
  hideEvent?: boolean
  plaintiffNote?: string
}

export interface PlaintiffMedicalReviewSummary {
  status: PlaintiffMedicalReviewStatus
  confirmedAt?: string
  skippedAt?: string
  skipReason?: string
  edits: PlaintiffMedicalReviewEdit[]
}

export interface PlaintiffMedicalReviewMissingItem {
  key: string
  label: string
  priority: 'high' | 'medium' | 'low'
  guidance: string
}

export interface PlaintiffMedicalReviewEvent extends MedicalChronologyEvent {
  confidence: 'documented' | 'estimated' | 'needs_review'
  uncertaintyNote?: string
  plaintiffNote?: string
}

export interface PlaintiffMedicalReviewPayload {
  chronology: PlaintiffMedicalReviewEvent[]
  missingItems: {
    important: PlaintiffMedicalReviewMissingItem[]
    helpful: PlaintiffMedicalReviewMissingItem[]
  }
  review: PlaintiffMedicalReviewSummary
}

type ExtractedMedicalData = {
  dates?: string[] | string | null
  timeline?: string | null
  entities?: string | null
  totalAmount?: number | null
  confidence?: number | null
}

type StructuredMedicalTimelineEvent = {
  date?: string | null
  provider?: string
  visitType?: string
  details?: string
  amount?: number
  confidence?: 'documented' | 'estimated' | 'needs_review'
}

function parseExtractedMedicalData(input: unknown): ExtractedMedicalData {
  return (input ?? {}) as ExtractedMedicalData
}

function toStringArray(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0) : []
  } catch {
    return []
  }
}

function parseStructuredTimeline(value: string | null | undefined): StructuredMedicalTimelineEvent[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => item as StructuredMedicalTimelineEvent)
      .filter((item) => item && typeof item === 'object')
  } catch {
    return []
  }
}

function sortChronologyEvents(a: MedicalChronologyEvent, b: MedicalChronologyEvent) {
  if (!a.date) return 1
  if (!b.date) return -1
  const aTime = Date.parse(a.date)
  const bTime = Date.parse(b.date)
  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return a.date.localeCompare(b.date)
  if (Number.isNaN(aTime)) return 1
  if (Number.isNaN(bTime)) return -1
  return aTime - bTime
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNonTreatmentFinancialSummary(file: { originalName?: string | null; aiSummary?: string | null }) {
  const text = `${file.originalName || ''} ${file.aiSummary || ''}`.toLowerCase()
  return (
    text.includes('lost wage') ||
    text.includes('wage loss') ||
    text.includes('damages summary') ||
    text.includes('economic damages')
  )
}

function parseFactsJson(value: string | null | undefined): Record<string, any> {
  if (!value) return {}
  try {
    return JSON.parse(value) as Record<string, any>
  } catch {
    return {}
  }
}

function normalizeStoredMedicalReview(input: unknown): PlaintiffMedicalReviewSummary {
  const raw = (input || {}) as Record<string, any>
  const edits = Array.isArray(raw.edits)
    ? raw.edits
        .map((item) => item as PlaintiffMedicalReviewEdit)
        .filter((item) => typeof item?.eventId === 'string' && item.eventId.trim().length > 0)
    : []

  return {
    status:
      raw.status === 'confirmed' || raw.status === 'skipped' || raw.status === 'pending'
        ? raw.status
        : 'pending',
    confirmedAt: typeof raw.confirmedAt === 'string' ? raw.confirmedAt : undefined,
    skippedAt: typeof raw.skippedAt === 'string' ? raw.skippedAt : undefined,
    skipReason: typeof raw.skipReason === 'string' ? raw.skipReason : undefined,
    edits,
  }
}

function buildMissingItemGuidance(
  item: CasePreparationResult['missingDocs'][number],
): PlaintiffMedicalReviewMissingItem {
  const guidanceByKey: Record<string, string> = {
    medical_records: 'These records help show what care you received and how your injuries were treated over time.',
    bills: 'Bills or receipts help show the financial impact of your treatment and fill in the medical story.',
    police_report: 'This report can help confirm what happened and make early attorney review easier.',
    photos: 'Photos can make the injury and damage story easier to understand at a glance.',
    hipaa: 'This authorization makes it easier for attorneys to request records directly if anything is still missing.',
  }

  return {
    key: item.key,
    label: item.label,
    priority: item.priority,
    guidance:
      guidanceByKey[item.key] || 'This would help complete your medical story and reduce follow-up questions later.',
  }
}

function buildTreatmentGapGuidance(gap: CasePreparationResult['treatmentGaps'][number]): PlaintiffMedicalReviewMissingItem {
  return {
    key: `treatment_gap_${gap.startDate}_${gap.endDate}`,
    label: `Treatment gap between ${gap.startDate} and ${gap.endDate}`,
    priority: gap.gapDays >= 45 ? 'high' : 'medium',
    guidance:
      gap.gapDays >= 45
        ? 'We noticed a likely gap in treatment here. If there was follow-up care, records from that period would help.'
        : 'If you had additional treatment during this period, adding it would make your medical story more complete.',
  }
}

function applyMedicalReviewEdits(
  chronology: MedicalChronologyEvent[],
  review: PlaintiffMedicalReviewSummary,
): PlaintiffMedicalReviewEvent[] {
  const editMap = new Map(review.edits.map((edit) => [edit.eventId, edit]))

  const reviewedChronology: PlaintiffMedicalReviewEvent[] = chronology
    .filter((event) => !editMap.get(event.id)?.hideEvent)
    .map((event) => {
      const edit = editMap.get(event.id)
      const baseConfidence: PlaintiffMedicalReviewEvent['confidence'] =
        event.source === 'medical_record' || event.source === 'treatment' ? 'documented' : 'estimated'
      const uncertaintyNote =
        event.extractionConfidence === 'needs_review'
          ? 'We found this from a document, but the details need your review.'
          : event.source === 'evidence'
          ? 'Date estimated from the upload because no treatment date was extracted yet.'
          : event.source === 'incident' && !event.date
            ? 'This event still needs a date estimate.'
            : undefined
      const confidence = event.extractionConfidence || baseConfidence

      return {
        ...event,
        date: edit?.correctedDate || event.date,
        provider: edit?.correctedProvider || event.provider,
        label: edit?.correctedLabel || event.label,
        details: edit?.correctedDetails || event.details,
        confidence,
        uncertaintyNote,
        plaintiffNote: edit?.plaintiffNote,
      }
    })

  const addedEvents: PlaintiffMedicalReviewEvent[] = review.edits
    .filter((edit) => edit.eventId.startsWith('added-') && !edit.hideEvent)
    .map((edit) => ({
      id: edit.eventId,
      date: edit.correctedDate || null,
      label: edit.correctedLabel || 'Additional treatment visit',
      source: 'treatment',
      details: edit.correctedDetails,
      provider: edit.correctedProvider,
      confidence: 'documented',
      plaintiffNote: edit.plaintiffNote,
    }))

  return [...reviewedChronology, ...addedEvents]
}

export async function buildMedicalChronology(assessmentId: string): Promise<MedicalChronologyEvent[]> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      facts: true,
      evidenceFiles: {
        select: {
          id: true,
          category: true,
          originalName: true,
          createdAt: true,
          aiSummary: true,
          extractedData: {
            take: 1,
            select: {
              dates: true,
              timeline: true,
              entities: true,
              totalAmount: true,
              confidence: true,
            },
          },
        },
      },
    },
  })

  if (!assessment) return []

  const events: MedicalChronologyEvent[] = []
  const facts = JSON.parse(assessment.facts) as Record<string, any>
  const incidentDateRaw = facts?.incident?.date
  const incidentDate =
    incidentDateRaw && !Number.isNaN(new Date(String(incidentDateRaw)).getTime())
      ? new Date(String(incidentDateRaw))
      : null

  const chronologyDateOrNull = (value: string | null | undefined): string | null => {
    if (!value) return null
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return null
    // Drop DOB / prior-history noise that OCR often pulls into the timeline.
    if (!isPlausibleTreatmentDate(d, incidentDate)) return null
    return value
  }

  // 1. Incident timeline from facts
  const incidentTimeline = facts?.incident?.timeline as Array<{ label: string; order: number; approxDate?: string }> | undefined
  if (Array.isArray(incidentTimeline)) {
    incidentTimeline
      .filter((t) => t?.label?.trim())
      .forEach((t, i) => {
        events.push({
          id: `incident-${i}`,
          date: t.approxDate || facts?.incident?.date || null,
          label: t.label,
          source: 'incident',
          details: undefined
        })
      })
  }

  const evidenceFiles = assessment.evidenceFiles || []
  const hasExtractedMedicalEvidence = evidenceFiles.some((file) => {
    if (file.category !== 'medical_records' && file.category !== 'bills') return false
    if (isNonTreatmentFinancialSummary(file)) return false
    const extracted = parseExtractedMedicalData(file.extractedData?.[0])
    return parseStructuredTimeline(extracted.timeline).length > 0 || toStringArray(extracted.dates).length > 0
  })

  // 2. Treatment from facts
  const treatment = facts?.treatment as Array<{
    provider?: string
    type?: string
    date?: string
    notes?: string
    treatment?: string
    status?: string
    imaging?: string
    procedure?: string
    recommendation?: string
    finding?: string
  }> | undefined
  if (Array.isArray(treatment)) {
    treatment.forEach((t, i) => {
      const provider = hasText(t.provider) ? t.provider.trim() : undefined
      const status = hasText(t.status) ? t.status.trim() : undefined
      const notes = hasText(t.notes)
        ? t.notes.trim()
        : hasText(t.treatment)
          ? t.treatment.trim()
          : hasText(t.imaging)
            ? t.imaging.trim()
            : hasText(t.procedure)
              ? t.procedure.trim()
              : hasText(t.recommendation)
                ? t.recommendation.trim()
                : hasText(t.finding)
                  ? t.finding.trim()
                  : undefined
      // Prefer free-text notes, but fall back to structured status so intake
      // surgery_status rows (status-only) still appear in the plaintiff summary.
      const details = notes || status
      const hasMeaningfulTreatmentDetail = hasText(t.date) || Boolean(provider) || Boolean(details)
      if (!hasMeaningfulTreatmentDetail) return
      if (hasExtractedMedicalEvidence && provider?.toLowerCase() === 'from uploaded records') return

      const label = t.type || 'Treatment'
      events.push({
        id: `treatment-${i}`,
        date: chronologyDateOrNull(t.date || null),
        label,
        source: 'treatment',
        details,
        provider,
        // Pass through so the plaintiff UI can localize type/status instead of
        // showing raw slugs like "surgery_status".
        ...(t.type ? { type: t.type } : {}),
        ...(status ? { status } : {}),
      })
    })
  }

  // 3. Evidence files - medical records with extracted data
  for (const file of evidenceFiles) {
    if (file.category !== 'medical_records' && file.category !== 'bills') continue
    if (isNonTreatmentFinancialSummary(file)) continue

    const extracted = parseExtractedMedicalData(file.extractedData?.[0])
    const structuredTimeline = parseStructuredTimeline(extracted.timeline)
    const dates = toStringArray(extracted.dates)
    const amount = typeof extracted?.totalAmount === 'number' ? extracted.totalAmount : undefined

    if (structuredTimeline.length > 0) {
      const repeatsDocumentAmount =
        typeof amount === 'number' &&
        structuredTimeline.length > 1 &&
        structuredTimeline.every((event) => event.amount === amount)
      structuredTimeline.forEach((event, i) => {
        const label = event.visitType || file.originalName || 'Medical record'
        const eventAmount = repeatsDocumentAmount
          ? i === 0 ? amount : undefined
          : typeof event.amount === 'number'
            ? event.amount
            : i === 0 ? amount : undefined
        const eventDate = chronologyDateOrNull(event.date || null)
        // Skip OCR rows whose only date was a DOB / pre-incident history stamp.
        if (event.date && !eventDate) return
        events.push({
          id: `evidence-${file.id}-timeline-${i}`,
          date: eventDate,
          label,
          source: 'medical_record',
          details: event.details || file.aiSummary || undefined,
          provider: event.provider,
          amount: eventAmount,
          sourceFileId: file.id,
          sourceFileName: file.originalName || undefined,
          extractionConfidence: event.confidence || (extracted.confidence && extracted.confidence >= 0.7 ? 'documented' : 'needs_review'),
        })
      })
    } else if (Array.isArray(dates) && dates.length > 0) {
      dates.forEach((d, i) => {
        const eventDate = typeof d === 'string' ? chronologyDateOrNull(d) : null
        if (typeof d === 'string' && !eventDate) return
        events.push({
          id: `evidence-${file.id}-${i}`,
          date: eventDate,
          label: file.originalName || 'Medical record',
          source: 'medical_record',
          details: file.aiSummary || undefined,
          amount: i === 0 ? amount ?? undefined : undefined,
          sourceFileId: file.id,
          sourceFileName: file.originalName || undefined,
          extractionConfidence: 'documented',
        })
      })
    } else if (file.createdAt) {
      events.push({
        id: `evidence-${file.id}`,
        date: null,
        label: file.originalName || 'Medical record',
        source: 'evidence',
        details: file.aiSummary || undefined,
        amount: undefined,
        sourceFileId: file.id,
        sourceFileName: file.originalName || undefined,
        extractionConfidence: 'estimated',
      })
    }
  }

  // Sort by date
  events.sort(sortChronologyEvents)

  return events
}

type EntitiesBlob = { provider?: string; visitType?: string; medications?: unknown }

function parseEntities(value: string | null | undefined): EntitiesBlob {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as EntitiesBlob) : {}
  } catch {
    return {}
  }
}

/**
 * Consolidated, attorney-ready medical chronology summary. Aggregates the raw
 * extracted data (from uploaded records/bills) and intake facts into the discrete
 * categories an attorney needs at a glance: providers, visits, diagnoses (ICD-10),
 * procedures (CPT), medications, imaging, surgeries, bills, and treatment gaps —
 * plus the ordered timeline. Every value is derived deterministically from stored
 * extractions so it is explainable and stable.
 */
export async function buildMedicalChronologySummary(
  assessmentId: string,
): Promise<MedicalChronologySummary> {
  const [assessment, timeline, preparation] = await Promise.all([
    prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        facts: true,
        evidenceFiles: {
          select: {
            category: true,
            originalName: true,
            aiSummary: true,
            extractedData: {
              take: 1,
              select: {
                icdCodes: true,
                cptCodes: true,
                entities: true,
                totalAmount: true,
              },
            },
          },
        },
      },
    }),
    buildMedicalChronology(assessmentId),
    computeCasePreparation(assessmentId),
  ])

  const empty: MedicalChronologySummary = {
    providers: [],
    visitCount: 0,
    diagnoses: [],
    icd10Codes: [],
    procedures: [],
    cptCodes: [],
    medications: [],
    imaging: [],
    surgeries: [],
    billedTotal: 0,
    treatmentGaps: [],
    firstTreatmentDate: null,
    lastTreatmentDate: null,
    eventCount: 0,
    timeline: [],
  }
  if (!assessment) return empty

  const facts = parseFactsJson(assessment.facts)
  const evidenceFiles = assessment.evidenceFiles || []

  const icdSet = new Set<string>()
  const cptSet = new Set<string>()
  const medications = new Set<string>()
  const imaging = new Set<string>()
  const providers = new Set<string>()
  let billedTotal = 0

  for (const file of evidenceFiles) {
    const ex = file.extractedData?.[0]
    toStringArray(ex?.icdCodes as any).forEach((c) => icdSet.add(c.trim().toUpperCase()))
    toStringArray(ex?.cptCodes as any).forEach((c) => cptSet.add(c.trim()))
    const entities = parseEntities(ex?.entities as any)
    if (Array.isArray(entities.medications)) {
      entities.medications
        .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
        .forEach((m) => medications.add(m.trim()))
    }
    if (hasText(entities.provider)) providers.add(entities.provider.trim())
    // Imaging documents surfaced by their inferred visit type or filename.
    const label = `${entities.visitType || ''} ${file.originalName || ''}`.toLowerCase()
    if (/imaging|mri|ct scan|x-ray|xray|radiolog|ultrasound/.test(label)) {
      imaging.add(file.originalName || entities.visitType || 'Imaging study')
    }
    if (file.category === 'bills' && typeof ex?.totalAmount === 'number') {
      billedTotal += ex.totalAmount
    }
  }

  // Providers from the timeline and intake facts.
  timeline.forEach((event) => {
    if (hasText(event.provider)) providers.add(event.provider.trim())
    if (/imaging|mri|ct|x-ray|xray|radiolog|ultrasound/i.test(event.label || '')) {
      imaging.add(event.label)
    }
  })
  const factTreatment = facts?.treatment as Array<{ provider?: string }> | undefined
  if (Array.isArray(factTreatment)) {
    factTreatment.forEach((t) => {
      if (hasText(t.provider) && t.provider.toLowerCase() !== 'from uploaded records') {
        providers.add(t.provider.trim())
      }
    })
  }

  // Classify codes into human-readable diagnoses / procedures and derive
  // surgeries + imaging signals from CPT categories.
  const analysis = analyzeClinicalCodes([...icdSet], [...cptSet])
  const diagnoses = analysis.signals
    .filter((s) => s.system === 'ICD10')
    .map((s) => ({ code: s.code, label: s.label }))
  const procedures = analysis.signals
    .filter((s) => s.system === 'CPT')
    .map((s) => ({ code: s.code, label: s.label }))
  const surgeries = new Set<string>()
  analysis.signals
    .filter((s) => s.category === 'surgery' || s.category === 'spinal_surgery')
    .forEach((s) => surgeries.add(`${s.label} [${s.code}]`))
  analysis.signals
    .filter((s) => s.category === 'advanced_imaging')
    .forEach((s) => imaging.add(`${s.label} [${s.code}]`))

  // Narrative-mentioned surgery (e.g. facts describe a procedure without a code).
  const narrative = `${facts?.incident?.narrative || ''} ${facts?.injuries ? JSON.stringify(facts.injuries) : ''}`.toLowerCase()
  if (/surg|arthroscop|fusion|laminectomy|discectomy|orif\b|operat/.test(narrative)) {
    if (surgeries.size === 0) surgeries.add('Surgery indicated in intake narrative')
  }

  // Bills fallback: sum timeline event amounts when no bill totals were extracted.
  if (billedTotal === 0) {
    billedTotal = timeline.reduce((sum, e) => sum + (typeof e.amount === 'number' ? e.amount : 0), 0)
  }
  const factMedCharges = Number(facts?.damages?.med_charges) || 0
  if (billedTotal === 0 && factMedCharges > 0) billedTotal = factMedCharges

  const treatmentDates = timeline
    .filter((e) => (e.source === 'treatment' || e.source === 'medical_record') && e.date)
    .map((e) => e.date as string)
    .sort()

  const visitCount = timeline.filter(
    (e) => e.source === 'treatment' || e.source === 'medical_record',
  ).length

  return {
    providers: [...providers],
    visitCount,
    diagnoses,
    icd10Codes: [...icdSet],
    procedures,
    cptCodes: [...cptSet],
    medications: [...medications],
    imaging: [...imaging],
    surgeries: [...surgeries],
    billedTotal: Math.round(billedTotal),
    treatmentGaps: preparation.treatmentGaps,
    firstTreatmentDate: treatmentDates[0] || null,
    lastTreatmentDate: treatmentDates[treatmentDates.length - 1] || null,
    eventCount: timeline.length,
    timeline,
  }
}

export async function computeCasePreparation(assessmentId: string): Promise<CasePreparationResult> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      facts: true,
      claimType: true,
      evidenceFiles: {
        select: {
          category: true,
        },
      },
      predictions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          viability: true,
        },
      },
    },
  })

  if (!assessment) {
    return {
      missingDocs: [],
      treatmentGaps: [],
      strengths: [],
      weaknesses: [],
      readinessScore: 0,
      readinessFactors: [],
    }
  }

  const facts = JSON.parse(assessment.facts) as Record<string, any>
  const missingDocs: CasePreparationResult['missingDocs'] = []
  const treatmentGaps: CasePreparationResult['treatmentGaps'] = []
  const strengths: string[] = []
  const weaknesses: string[] = []

  // Evidence categories we expect
  const evidenceCategories = new Set(
    (assessment.evidenceFiles || []).map((f) => f.category)
  )
  const claimKey = String(assessment.claimType || '').toLowerCase().replace(/[\s-]+/g, '_')
  const isProduct = claimKey === 'product' || claimKey === 'product_liability'
  const evidenceCount = (assessment.evidenceFiles || []).length

  // Missing docs checklist — claim-type aware (no police report on product cases).
  if (!evidenceCategories.has('medical_records')) {
    missingDocs.push({ key: 'medical_records', label: 'Medical records', priority: 'high' })
  }
  if (!evidenceCategories.has('bills') && !evidenceCategories.has('medical_bills')) {
    missingDocs.push({ key: 'bills', label: 'Medical bills', priority: 'high' })
  }
  if (
    !evidenceCategories.has('police_report') &&
    ['auto', 'auto_accident', 'slip_and_fall', 'premises', 'dog_bite'].includes(claimKey)
  ) {
    missingDocs.push({ key: 'police_report', label: 'Police/incident report', priority: 'high' })
  }
  if (isProduct) {
    const preserved =
      facts?.product?.preserved === true ||
      facts?.product?.stillHaveProduct === true ||
      String(facts?.product?.preservationStatus || '').toLowerCase() === 'preserved'
    if (!preserved && !evidenceCategories.has('product') && !evidenceCategories.has('product_evidence')) {
      missingDocs.push({ key: 'product_preservation', label: 'Product preservation confirmation', priority: 'high' })
    }
  }
  if (!evidenceCategories.has('photos')) {
    missingDocs.push({
      key: 'photos',
      label: isProduct ? 'Product / injury photos' : 'Injury/damage photos',
      priority: 'medium',
    })
  }
  const hasHipaa = facts?.consents?.hipaa === true
  if (!hasHipaa) {
    missingDocs.push({ key: 'hipaa', label: 'HIPAA authorization', priority: 'high' })
  }

  // Treatment gaps — single source: deriveTreatmentPosture (same days as Defense Risks / Coach).
  const treatmentPosture = deriveTreatmentPosture({ facts })
  const treatment = facts?.treatment as Array<{ date?: string }> | undefined
  if (Array.isArray(treatment) && treatment.length >= 2) {
    const sortedDates = treatment
      .map((t) => t.date)
      .filter((date): date is string => Boolean(date))
      .sort()
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1])
      const curr = new Date(sortedDates[i])
      const gapDays = Math.floor((curr.getTime() - prev.getTime()) / 86400000)
      if (gapDays >= OPEN_TREATMENT_GAP_DAYS) {
        treatmentGaps.push({
          startDate: sortedDates[i - 1],
          endDate: sortedDates[i],
          gapDays,
        })
      }
    }
  }
  // Days-since-last also surfaces when posture is gap and we have a last date.
  if (
    treatmentGaps.length === 0 &&
    treatmentPosture.posture === 'gap' &&
    treatmentPosture.daysSinceLastTreatment != null &&
    treatmentPosture.entryCount >= 2
  ) {
    const last = Array.isArray(treatment)
      ? treatment.map((t) => t.date).filter((d): d is string => Boolean(d)).sort().slice(-1)[0]
      : null
    if (last) {
      treatmentGaps.push({
        startDate: last,
        endDate: new Date().toISOString().slice(0, 10),
        gapDays: treatmentPosture.daysSinceLastTreatment,
      })
    }
  }

  // Strengths/weaknesses — liability wording must agree with prediction/underwriting,
  // not a missing facts.liability.confidence field that contradicts "Very Strong".
  const pred = assessment.predictions?.[0]
  const viability = (() => {
    const raw = (pred as any)?.viability
    if (!raw) return {} as Record<string, number>
    try {
      return (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, number>
    } catch {
      return {} as Record<string, number>
    }
  })()
  const liabilityConfidence01 = (() => {
    const explicit = facts?.liability?.confidence
    if (typeof explicit === 'number' && explicit > 0) return Math.min(1, explicit / 10)
    if (typeof viability?.liability === 'number' && viability.liability > 0) return Math.min(1, viability.liability)
    return null
  })()

  if (pred) {
    if (liabilityConfidence01 != null && liabilityConfidence01 >= 0.7) {
      strengths.push('Strong liability evidence')
    }
    if (facts?.damages?.med_charges && facts.damages.med_charges > 0) {
      strengths.push('Documented medical expenses')
    }
    if (Array.isArray(facts?.injuries) && facts.injuries.length > 0) {
      strengths.push('Injuries documented')
    }
    if (missingDocs.length > 0) {
      weaknesses.push(`${missingDocs.length} missing document(s)`)
    }
    if (treatmentGaps.length > 0) {
      weaknesses.push(`${treatmentGaps.length} treatment gap(s) - may weaken causation`)
    }
    // Only call liability "low" when we have an affirmative weak signal — never when
    // confidence was simply omitted while the model scores liability as strong.
    if (liabilityConfidence01 != null && liabilityConfidence01 < 0.45) {
      weaknesses.push('Liability confidence is low')
    } else if (liabilityConfidence01 == null && evidenceCount === 0) {
      weaknesses.push('Liability still needs corroborating evidence on file')
    }
  }

  // Readiness score — evidence-driven. An empty file must score low; the old
  // unconditional base of 40 + neutral liability made zero-doc files look ~54–67% ready.
  const largestGapDays = Math.max(
    treatmentGaps.reduce((max, gap) => Math.max(max, gap.gapDays), 0),
    treatmentPosture.largestGapDays || 0,
    treatmentPosture.daysSinceLastTreatment || 0,
  )
  const hasMedicalRecords = evidenceCategories.has('medical_records')
  const hasBills = evidenceCategories.has('bills') || evidenceCategories.has('medical_bills')
  const treatmentPoints =
    evidenceCount === 0 || treatmentPosture.entryCount === 0
      ? 0
      : treatmentPosture.posture === 'gap' || largestGapDays >= 90
        ? 0
        : largestGapDays >= OPEN_TREATMENT_GAP_DAYS
          ? 4
          : 12
  const liabilityPoints =
    liabilityConfidence01 == null
      ? 0
      : Math.max(0, Math.min(16, Math.round(liabilityConfidence01 * 16)))

  const readinessFactors: ReadinessFactor[] = [
    {
      key: 'medical_records',
      label: 'Medical records on file',
      points: hasMedicalRecords ? 28 : 0,
      max: 28,
      hint: hasMedicalRecords ? undefined : 'Upload medical records to Evidence',
    },
    {
      key: 'bills',
      label: 'Medical bills on file',
      points: hasBills ? 22 : 0,
      max: 22,
      hint: hasBills ? undefined : 'Add itemized medical bills',
    },
    {
      key: 'hipaa',
      label: 'HIPAA authorization',
      points: hasHipaa ? 10 : 0,
      max: 10,
      hint: hasHipaa ? undefined : 'Get the signed HIPAA authorization',
    },
    {
      key: 'liability',
      label: 'Liability strength',
      points: evidenceCount === 0 ? 0 : liabilityPoints,
      max: 16,
      hint: liabilityPoints >= 16 ? undefined : 'Strengthen fault evidence (statements, reports)',
    },
    {
      key: 'treatment',
      label: 'Treatment continuity',
      points: treatmentPoints,
      max: 12,
      hint:
        treatmentPoints >= 12
          ? undefined
          : evidenceCount === 0 || treatmentPosture.entryCount === 0
            ? 'Confirm treatment status once records are on file'
            : largestGapDays >= OPEN_TREATMENT_GAP_DAYS
              ? `${largestGapDays}-day treatment gap weakens causation`
              : 'Document ongoing care',
    },
    {
      key: 'checklist',
      label: 'Document checklist complete',
      points: missingDocs.length === 0 && evidenceCount > 0 ? 12 : 0,
      max: 12,
      hint: missingDocs.length === 0 ? undefined : `${missingDocs.length} item(s) still missing`,
    },
  ]

  // Hard ceiling: with nothing uploaded, never look "review ready".
  let readinessScore = Math.min(100, readinessFactors.reduce((sum, f) => sum + f.points, 0))
  if (evidenceCount === 0) {
    readinessScore = Math.min(readinessScore, 18)
  }

  return {
    missingDocs,
    treatmentGaps,
    strengths,
    weaknesses,
    readinessScore,
    readinessFactors,
  }
}

export async function buildPlaintiffMedicalReview(
  assessmentId: string,
): Promise<PlaintiffMedicalReviewPayload> {
  const [assessment, chronology, preparation] = await Promise.all([
    prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { facts: true },
    }),
    buildMedicalChronology(assessmentId),
    computeCasePreparation(assessmentId),
  ])

  const facts = parseFactsJson(assessment?.facts ?? null)
  const review = normalizeStoredMedicalReview(facts.plaintiffMedicalReview)
  const important = preparation.missingDocs
    .filter((item) => item.priority === 'high')
    .map(buildMissingItemGuidance)
  const helpful = preparation.missingDocs
    .filter((item) => item.priority !== 'high')
    .map(buildMissingItemGuidance)

  for (const gap of preparation.treatmentGaps) {
    const guidance = buildTreatmentGapGuidance(gap)
    if (guidance.priority === 'high') important.push(guidance)
    else helpful.push(guidance)
  }

  return {
    chronology: applyMedicalReviewEdits(chronology, review),
    missingItems: {
      important,
      helpful,
    },
    review,
  }
}

export async function getSettlementBenchmarks(
  assessmentId: string
): Promise<SettlementBenchmark | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      facts: true,
      claimType: true,
      venueState: true,
      predictions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          explain: true,
          bands: true,
        },
      },
    },
  })

  if (!assessment) return null

  const facts = JSON.parse(assessment.facts) as Record<string, any>
  const claimType = assessment.claimType
  const venueState = assessment.venueState
  const medCharges = facts?.damages?.med_charges as number | undefined

  // Injury severity from prediction or facts (0-4)
  let injurySeverity: number | null = null
  const pred = assessment.predictions?.[0]
  if (pred) {
    const explain = JSON.parse(pred.explain) as Record<string, any>
    const sev = explain?.injury_severity
    if (typeof sev === 'number') injurySeverity = Math.round(sev)
    else if (typeof sev === 'string') injurySeverity = parseInt(sev, 10)
  }

  const where: Prisma.SettlementRecordWhereInput = {
    claimType,
    venueState
  }
  if (injurySeverity != null) {
    where.injurySeverity = injurySeverity
  }

  const records = await prisma.settlementRecord.findMany({
    where,
    orderBy: { settlementAmount: 'asc' },
    select: { settlementAmount: true },
  })

  let sourceRecords = records
  if (records.length === 0) {
    sourceRecords = await prisma.settlementRecord.findMany({
      where: { claimType },
      orderBy: { settlementAmount: 'asc' },
      select: { settlementAmount: true },
    })
  }
  if (sourceRecords.length === 0) return null

  const amounts = sourceRecords.map((r) => r.settlementAmount)

  if (amounts.length === 0) return null

  const sorted = [...amounts].sort((a, b) => a - b)
  const p25 = sorted[Math.floor(sorted.length * 0.25)] ?? sorted[0]
  const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? sorted[0]
  const p75 = sorted[Math.floor(sorted.length * 0.75)] ?? sorted[sorted.length - 1]
  const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? sorted[sorted.length - 1]

  let predictedRange: [number, number] | undefined
  if (pred) {
    const bands = JSON.parse(pred.bands) as Record<string, [number, number]>
    const band = bands?.low || bands?.mid || bands?.high
    if (Array.isArray(band) && band.length >= 2) {
      predictedRange = [band[0], band[1]]
    }
  }

  return {
    claimType,
    venueState,
    injurySeverity,
    p25,
    p50,
    p75,
    p90,
    count: amounts.length,
    yourCaseContext: {
      medCharges,
      predictedRange
    }
  }
}

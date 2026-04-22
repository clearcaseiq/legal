/**
 * Case Insights - Medical Chronology, Case Preparation, Settlement Benchmarks
 * EvenUp-style features for case valuation and readiness
 */

import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'

export interface MedicalChronologyEvent {
  id: string
  date: string | null
  label: string
  source: 'incident' | 'treatment' | 'evidence' | 'medical_record'
  details?: string
  provider?: string
  amount?: number
}

export interface CasePreparationResult {
  missingDocs: { key: string; label: string; priority: 'high' | 'medium' | 'low' }[]
  treatmentGaps: { startDate: string; endDate: string; gapDays: number }[]
  strengths: string[]
  weaknesses: string[]
  readinessScore: number // 0-100
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
  confidence: 'documented' | 'estimated'
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
  totalAmount?: number | null
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

  return chronology
    .filter((event) => !editMap.get(event.id)?.hideEvent)
    .map((event) => {
      const edit = editMap.get(event.id)
      const confidence =
        event.source === 'medical_record' || event.source === 'treatment' ? 'documented' : 'estimated'
      const uncertaintyNote =
        event.source === 'evidence'
          ? 'Date estimated from the upload because no treatment date was extracted yet.'
          : event.source === 'incident' && !event.date
            ? 'This event still needs a date estimate.'
            : undefined

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
              totalAmount: true,
            },
          },
        },
      },
    },
  })

  if (!assessment) return []

  const events: MedicalChronologyEvent[] = []
  const facts = JSON.parse(assessment.facts) as Record<string, any>

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

  // 2. Treatment from facts
  const treatment = facts?.treatment as Array<{ provider?: string; type?: string; date?: string; notes?: string }> | undefined
  if (Array.isArray(treatment)) {
    treatment.forEach((t, i) => {
      const label = t.type || 'Treatment'
      events.push({
        id: `treatment-${i}`,
        date: t.date || null,
        label,
        source: 'treatment',
        details: t.notes,
        provider: t.provider
      })
    })
  }

  // 3. Evidence files - medical records with extracted data
  const evidenceFiles = assessment.evidenceFiles || []
  for (const file of evidenceFiles) {
    if (file.category !== 'medical_records' && file.category !== 'bills') continue

    const extracted = parseExtractedMedicalData(file.extractedData?.[0])
    const dates = toStringArray(extracted.dates)
    const timelineStr = extracted?.timeline
    const amount = typeof extracted?.totalAmount === 'number' ? extracted.totalAmount : undefined

    if (Array.isArray(dates) && dates.length > 0) {
      dates.forEach((d, i) => {
        events.push({
          id: `evidence-${file.id}-${i}`,
          date: typeof d === 'string' ? d : null,
          label: file.originalName || 'Medical record',
          source: 'medical_record',
          details: timelineStr ? String(timelineStr).slice(0, 200) : undefined,
          amount: amount ?? undefined
        })
      })
    } else if (file.createdAt) {
      events.push({
        id: `evidence-${file.id}`,
        date: new Date(file.createdAt).toISOString().slice(0, 10),
        label: file.originalName || 'Medical record',
        source: 'evidence',
        details: file.aiSummary || undefined,
        amount: undefined
      })
    }
  }

  // Sort by date
  events.sort((a, b) => {
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date)
  })

  return events
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
      readinessScore: 0
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

  // Missing docs checklist
  if (!evidenceCategories.has('medical_records')) {
    missingDocs.push({ key: 'medical_records', label: 'Medical records', priority: 'high' })
  }
  if (!evidenceCategories.has('bills')) {
    missingDocs.push({ key: 'bills', label: 'Medical bills', priority: 'high' })
  }
  if (!evidenceCategories.has('police_report') && ['auto', 'slip_and_fall'].includes(assessment.claimType)) {
    missingDocs.push({ key: 'police_report', label: 'Police/incident report', priority: 'high' })
  }
  if (!evidenceCategories.has('photos')) {
    missingDocs.push({ key: 'photos', label: 'Injury/damage photos', priority: 'medium' })
  }
  const hasHipaa = facts?.consents?.hipaa === true
  if (!hasHipaa) {
    missingDocs.push({ key: 'hipaa', label: 'HIPAA authorization', priority: 'high' })
  }

  // Treatment gaps - from treatment array dates
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
      if (gapDays > 30) {
        treatmentGaps.push({
          startDate: sortedDates[i - 1],
          endDate: sortedDates[i],
          gapDays
        })
      }
    }
  }

  // Strengths/weaknesses from prediction and facts
  const pred = assessment.predictions?.[0]
  if (pred) {
    const liability = facts?.liability?.confidence
    if (liability && liability >= 7) {
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
    if (!liability || liability < 5) {
      weaknesses.push('Liability confidence is low')
    }
  }

  // Readiness score
  const maxScore = 100
  let score = 50
  if (evidenceCategories.has('medical_records')) score += 15
  if (evidenceCategories.has('bills')) score += 15
  if (hasHipaa) score += 10
  if (missingDocs.length === 0) score += 5
  if (treatmentGaps.length === 0) score += 5
  const readinessScore = Math.min(100, score)

  return {
    missingDocs,
    treatmentGaps,
    strengths,
    weaknesses,
    readinessScore
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

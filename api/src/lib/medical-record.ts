/**
 * Case-level medical timeline — treatment episodes + evolving medical status.
 *
 * The `MedicalTreatmentEntry` list is the case's structured treatment
 * chronology; the 1:1 `MedicalCaseRecord` captures MMI / treatment status /
 * symptoms / future-treatment plan. Rollups WRITE THROUGH to the loose fact
 * fields the readiness, treatment-gap coach, and valuation engines already read
 * (`facts.treatment[]`, `facts.medical.{mmi,mmiDate,dischargeDate,
 * treatmentStatus,stillTreating,lastTreatmentDate}`) — so no engine rewiring.
 *
 * Future-medical DOLLARS intentionally stay in the DamageItem ledger
 * (category future_medical) so there is a single source of truth for value;
 * this record only holds the narrative plan + a planning estimate.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { recordCaseChange } from './data-authority'

export const VISIT_TYPES = [
  'initial_eval',
  'follow_up',
  'procedure',
  'surgery',
  'imaging',
  'therapy',
  'er',
  'other',
] as const

export const ENTRY_STATUSES = ['ongoing', 'completed', 'discharged', 'referred_out', 'no_show'] as const
export const TREATMENT_STATUSES = ['treating', 'completed', 'mmi', 'discharged', 'unknown'] as const

export interface MedicalTimelineView {
  entries: Array<{
    id: string
    provider: string
    specialty: string | null
    visitType: string
    startDate: string | null
    endDate: string | null
    status: string
    diagnosis: string | null
    billedAmount: number | null
    isFuture: boolean
    notes: string | null
  }>
  status: {
    id: string | null
    treatmentStatus: string
    mmi: boolean
    mmiDate: string | null
    stillTreating: boolean
    symptoms: string[]
    futureTreatment: string | null
    futureCostEstimate: number | null
    notes: string | null
  }
  // Derived, read-only:
  providerCount: number
  visitCount: number
  firstTreatmentDate: string | null
  lastTreatmentDate: string | null
  gaps: Array<{ afterDate: string; beforeDate: string; gapDays: number }>
  billedTotal: number
  updatedAt: string | null
}

const GAP_THRESHOLD_DAYS = 45

function toISO(d: any): string | null {
  if (!d) return null
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString()
}

function parseSymptoms(raw: any): string[] {
  if (Array.isArray(raw)) return raw.map((s) => String(s)).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map((s) => String(s)).filter(Boolean)
    } catch {
      // Comma/newline separated fallback.
      return raw
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return []
}

function computeTimeline(entries: any[]): {
  firstTreatmentDate: string | null
  lastTreatmentDate: string | null
  gaps: MedicalTimelineView['gaps']
  billedTotal: number
} {
  const dated = entries
    .filter((e) => !e.isFuture)
    .map((e) => ({
      start: e.startDate ? new Date(e.startDate) : null,
      end: e.endDate ? new Date(e.endDate) : e.startDate ? new Date(e.startDate) : null,
    }))
    .filter((e) => e.start && !Number.isNaN(e.start.getTime()))
    .sort((a, b) => (a.start!.getTime() - b.start!.getTime()))

  let first: Date | null = null
  let last: Date | null = null
  const gaps: MedicalTimelineView['gaps'] = []
  let prevEnd: Date | null = null
  for (const d of dated) {
    if (!first) first = d.start
    const endpoint = d.end && !Number.isNaN(d.end.getTime()) ? d.end : d.start!
    if (prevEnd) {
      const gapDays = Math.round((d.start!.getTime() - prevEnd.getTime()) / (24 * 3600 * 1000))
      if (gapDays >= GAP_THRESHOLD_DAYS) {
        gaps.push({ afterDate: prevEnd.toISOString(), beforeDate: d.start!.toISOString(), gapDays })
      }
    }
    if (!last || endpoint.getTime() > last.getTime()) last = endpoint
    if (!prevEnd || endpoint.getTime() > prevEnd.getTime()) prevEnd = endpoint
  }

  const billedTotal = entries.reduce((s, e) => s + (Number(e.billedAmount) || 0), 0)
  return {
    firstTreatmentDate: first ? first.toISOString() : null,
    lastTreatmentDate: last ? last.toISOString() : null,
    gaps,
    billedTotal,
  }
}

async function buildView(assessmentId: string): Promise<MedicalTimelineView> {
  const [rawEntries, record] = await Promise.all([
    (prisma as any).medicalTreatmentEntry
      .findMany({ where: { assessmentId }, orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }] })
      .catch(() => [] as any[]),
    (prisma as any).medicalCaseRecord.findUnique({ where: { assessmentId } }).catch(() => null),
  ])

  const entries = (rawEntries as any[]).map((e) => ({
    id: e.id,
    provider: e.provider,
    specialty: e.specialty ?? null,
    visitType: e.visitType,
    startDate: toISO(e.startDate),
    endDate: toISO(e.endDate),
    status: e.status,
    diagnosis: e.diagnosis ?? null,
    billedAmount: e.billedAmount ?? null,
    isFuture: Boolean(e.isFuture),
    notes: e.notes ?? null,
  }))

  const providers = new Set(entries.filter((e) => !e.isFuture).map((e) => e.provider.toLowerCase()))
  const { firstTreatmentDate, lastTreatmentDate, gaps, billedTotal } = computeTimeline(rawEntries)

  return {
    entries,
    status: {
      id: record?.id ?? null,
      treatmentStatus: record?.treatmentStatus ?? 'treating',
      mmi: Boolean(record?.mmi),
      mmiDate: toISO(record?.mmiDate),
      stillTreating: record?.stillTreating ?? true,
      symptoms: parseSymptoms(record?.symptoms),
      futureTreatment: record?.futureTreatment ?? null,
      futureCostEstimate: record?.futureCostEstimate ?? null,
      notes: record?.notes ?? null,
    },
    providerCount: providers.size,
    visitCount: entries.filter((e) => !e.isFuture).length,
    firstTreatmentDate,
    lastTreatmentDate,
    gaps,
    billedTotal,
    updatedAt: record?.updatedAt ? new Date(record.updatedAt).toISOString() : null,
  }
}

export async function getMedicalTimeline(assessmentId: string): Promise<MedicalTimelineView> {
  return buildView(assessmentId)
}

/**
 * Map the structured medical timeline onto the loose fact fields the engines
 * read. Never clobbers unrelated medical facts. Never throws.
 */
async function writeThroughMedical(
  assessmentId: string,
  view: MedicalTimelineView,
  opts?: { source?: 'attorney' | 'rose_ai' | 'system'; actorId?: string | null; summary?: string },
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

    // Rebuild facts.treatment[] from the (non-future) entries so demand-readiness
    // and the underwriting engine see the structured chronology.
    const treatment = view.entries
      .filter((e) => !e.isFuture)
      .map((e) => ({
        provider: e.provider,
        type: e.visitType,
        startDate: e.startDate,
        endDate: e.endDate,
        date: e.endDate || e.startDate,
        status: e.status,
        diagnosis: e.diagnosis,
      }))
    if (treatment.length > 0) facts.treatment = treatment

    const existingMedical = facts.medical && typeof facts.medical === 'object' ? facts.medical : {}
    const s = view.status
    facts.medical = {
      ...existingMedical,
      treatmentStatus: s.treatmentStatus,
      mmi: s.mmi,
      mmiDate: s.mmiDate || existingMedical.mmiDate || null,
      dischargeDate:
        s.treatmentStatus === 'discharged' || s.mmi ? s.mmiDate || existingMedical.dischargeDate || null : existingMedical.dischargeDate || null,
      stillTreating: s.stillTreating && !s.mmi,
      lastTreatmentDate: view.lastTreatmentDate || existingMedical.lastTreatmentDate || null,
      symptoms: s.symptoms,
      futureTreatment: s.futureTreatment || null,
    }
    facts.medicalTimeline = {
      providerCount: view.providerCount,
      visitCount: view.visitCount,
      firstTreatmentDate: view.firstTreatmentDate,
      lastTreatmentDate: view.lastTreatmentDate,
      gaps: view.gaps,
      billedTotal: view.billedTotal,
    }

    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { facts: JSON.stringify(facts) },
    })

    void recordCaseChange({
      assessmentId,
      source: opts?.source ?? 'attorney',
      action: 'medical_updated',
      entityType: 'medical',
      summary: opts?.summary || `Medical timeline updated (${view.visitCount} visits, ${s.treatmentStatus})`,
      actor: { type: opts?.source === 'rose_ai' ? 'ai' : 'user', id: opts?.actorId ?? null },
    })
  } catch (error: any) {
    logger.warn('writeThroughMedical failed', { assessmentId, error: error?.message })
  }
}

export async function createMedicalEntry(
  assessmentId: string,
  payload: Record<string, any>,
  opts?: { actorId?: string | null; actorName?: string | null },
): Promise<MedicalTimelineView> {
  const visitType = (VISIT_TYPES as readonly string[]).includes(payload.visitType) ? payload.visitType : 'follow_up'
  const status = (ENTRY_STATUSES as readonly string[]).includes(payload.status) ? payload.status : 'ongoing'
  await (prisma as any).medicalTreatmentEntry.create({
    data: {
      assessmentId,
      provider: String(payload.provider || '').trim() || 'Unknown provider',
      specialty: payload.specialty || null,
      visitType,
      startDate: payload.startDate ? new Date(payload.startDate) : null,
      endDate: payload.endDate ? new Date(payload.endDate) : null,
      status,
      diagnosis: payload.diagnosis || null,
      billedAmount: payload.billedAmount != null && payload.billedAmount !== '' ? Number(payload.billedAmount) : null,
      isFuture: Boolean(payload.isFuture),
      notes: payload.notes || null,
      source: 'manual',
      createdById: opts?.actorId ?? null,
      createdByName: opts?.actorName ?? null,
    },
  })
  const view = await buildView(assessmentId)
  await writeThroughMedical(assessmentId, view, { source: 'attorney', actorId: opts?.actorId ?? null })
  return view
}

export async function updateMedicalEntry(
  assessmentId: string,
  entryId: string,
  payload: Record<string, any>,
  opts?: { actorId?: string | null },
): Promise<MedicalTimelineView> {
  const data: any = {}
  if (payload.provider !== undefined) data.provider = String(payload.provider || '').trim() || 'Unknown provider'
  if (payload.specialty !== undefined) data.specialty = payload.specialty || null
  if (payload.visitType !== undefined)
    data.visitType = (VISIT_TYPES as readonly string[]).includes(payload.visitType) ? payload.visitType : 'follow_up'
  if (payload.startDate !== undefined) data.startDate = payload.startDate ? new Date(payload.startDate) : null
  if (payload.endDate !== undefined) data.endDate = payload.endDate ? new Date(payload.endDate) : null
  if (payload.status !== undefined)
    data.status = (ENTRY_STATUSES as readonly string[]).includes(payload.status) ? payload.status : 'ongoing'
  if (payload.diagnosis !== undefined) data.diagnosis = payload.diagnosis || null
  if (payload.billedAmount !== undefined)
    data.billedAmount = payload.billedAmount === '' || payload.billedAmount == null ? null : Number(payload.billedAmount)
  if (payload.isFuture !== undefined) data.isFuture = Boolean(payload.isFuture)
  if (payload.notes !== undefined) data.notes = payload.notes || null

  await (prisma as any).medicalTreatmentEntry.update({ where: { id: entryId }, data })
  const view = await buildView(assessmentId)
  await writeThroughMedical(assessmentId, view, { source: 'attorney', actorId: opts?.actorId ?? null })
  return view
}

export async function deleteMedicalEntry(
  assessmentId: string,
  entryId: string,
  opts?: { actorId?: string | null },
): Promise<MedicalTimelineView> {
  await (prisma as any).medicalTreatmentEntry.delete({ where: { id: entryId } }).catch(() => null)
  const view = await buildView(assessmentId)
  await writeThroughMedical(assessmentId, view, { source: 'attorney', actorId: opts?.actorId ?? null })
  return view
}

export async function upsertMedicalStatus(
  assessmentId: string,
  patch: Record<string, any>,
  opts?: { actorId?: string | null; actorName?: string | null },
): Promise<MedicalTimelineView> {
  const data: any = {}
  if (patch.treatmentStatus !== undefined)
    data.treatmentStatus = (TREATMENT_STATUSES as readonly string[]).includes(patch.treatmentStatus)
      ? patch.treatmentStatus
      : 'treating'
  if (patch.mmi !== undefined) data.mmi = Boolean(patch.mmi)
  if (patch.mmiDate !== undefined) data.mmiDate = patch.mmiDate ? new Date(patch.mmiDate) : null
  if (patch.stillTreating !== undefined) data.stillTreating = Boolean(patch.stillTreating)
  if (patch.symptoms !== undefined)
    data.symptoms = Array.isArray(patch.symptoms) ? JSON.stringify(patch.symptoms) : patch.symptoms || null
  if (patch.futureTreatment !== undefined) data.futureTreatment = patch.futureTreatment || null
  if (patch.futureCostEstimate !== undefined)
    data.futureCostEstimate =
      patch.futureCostEstimate === '' || patch.futureCostEstimate == null ? null : Number(patch.futureCostEstimate)
  if (patch.notes !== undefined) data.notes = patch.notes || null

  // Deriving MMI implies not still treating.
  if (data.mmi === true && patch.stillTreating === undefined) data.stillTreating = false

  await (prisma as any).medicalCaseRecord.upsert({
    where: { assessmentId },
    create: { assessmentId, ...data, updatedById: opts?.actorId ?? null, updatedByName: opts?.actorName ?? null },
    update: { ...data, updatedById: opts?.actorId ?? null, updatedByName: opts?.actorName ?? null },
  })
  const view = await buildView(assessmentId)
  await writeThroughMedical(assessmentId, view, { source: 'attorney', actorId: opts?.actorId ?? null })
  return view
}

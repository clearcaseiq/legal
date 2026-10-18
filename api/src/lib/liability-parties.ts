/**
 * The defendants and the pieces of liability evidence on a case.
 *
 * The LiabilityRecord keeps single-value columns (defendant name/insurer/fault,
 * police report, photos, video, witnesses) that the strength score, underwriting
 * and demand read. After every change to these lists we roll them back up into
 * those columns through upsertLiabilityRecord, so those readers stay unchanged.
 */
import { prisma } from './prisma'
import { upsertLiabilityRecord, type LiabilityView } from './liability-record'

export const DEFENDANT_ROLES = ['driver', 'vehicle_owner', 'employer', 'property_owner', 'other'] as const
export const EVIDENCE_TYPES = ['police_report', 'photos', 'video', 'witness_statement', 'expert_report', 'other'] as const
export const EVIDENCE_STATUSES = ['needed', 'requested', 'received'] as const

type Actor = { actorId?: string | null; actorName?: string | null }

export interface DefendantView {
  id: string
  name: string
  role: string
  faultPct: number | null
  insurerName: string | null
  insuranceDetailId: string | null
  /** Carrier of the linked policy, when one is linked. */
  linkedCarrierName: string | null
  address: string | null
  phone: string | null
  email: string | null
  counselName: string | null
  counselFirm: string | null
  counselPhone: string | null
  counselEmail: string | null
}

export interface EvidenceItemView {
  id: string
  type: string
  status: string
  referenceNumber: string | null
  date: string | null
  description: string | null
  evidenceFileId: string | null
  evidenceFileName: string | null
}

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const pct = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null
}
const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T =>
  list.includes(v as T) ? (v as T) : fallback

export class LiabilityInputError extends Error {}

async function checkInsuranceLink(assessmentId: string, id: unknown): Promise<string | null> {
  const value = text(id)
  if (!value) return null
  const found = await prisma.insuranceDetail.findFirst({ where: { id: value, assessmentId }, select: { id: true } })
  if (!found) throw new LiabilityInputError('That policy is not on this case.')
  return value
}

async function checkFileLink(assessmentId: string, id: unknown): Promise<string | null> {
  const value = text(id)
  if (!value) return null
  const found = await prisma.evidenceFile.findFirst({ where: { id: value, assessmentId }, select: { id: true } })
  if (!found) throw new LiabilityInputError('That document is not on this case.')
  return value
}

async function defendantData(assessmentId: string, body: any, partial: boolean) {
  const data: Record<string, unknown> = {}
  const has = (k: string) => !partial || body?.[k] !== undefined
  if (has('name')) {
    const name = text(body?.name)
    if (!name) throw new LiabilityInputError('A defendant needs a name.')
    data.name = name
  }
  if (has('role')) data.role = oneOf(DEFENDANT_ROLES, body?.role, 'other')
  if (has('faultPct')) data.faultPct = pct(body?.faultPct)
  if (has('insurerName')) data.insurerName = text(body?.insurerName)
  if (has('insuranceDetailId')) data.insuranceDetailId = await checkInsuranceLink(assessmentId, body?.insuranceDetailId)
  for (const k of ['address', 'phone', 'email', 'counselName', 'counselFirm', 'counselPhone', 'counselEmail']) {
    if (has(k)) data[k] = text(body?.[k])
  }
  return data
}

async function evidenceData(assessmentId: string, body: any, partial: boolean) {
  const data: Record<string, unknown> = {}
  const has = (k: string) => !partial || body?.[k] !== undefined
  if (has('type')) data.type = oneOf(EVIDENCE_TYPES, body?.type, 'other')
  if (has('status')) data.status = oneOf(EVIDENCE_STATUSES, body?.status, 'needed')
  if (has('referenceNumber')) data.referenceNumber = text(body?.referenceNumber)
  if (has('description')) data.description = text(body?.description)
  if (has('date')) {
    const raw = text(body?.date)
    const d = raw ? new Date(raw) : null
    data.date = d && !Number.isNaN(d.getTime()) ? d : null
  }
  if (has('evidenceFileId')) data.evidenceFileId = await checkFileLink(assessmentId, body?.evidenceFileId)
  return data
}

export async function listLiabilityParties(assessmentId: string): Promise<{
  defendants: DefendantView[]
  evidence: EvidenceItemView[]
}> {
  const [defendants, evidence] = await Promise.all([
    (prisma as any).liabilityDefendant.findMany({ where: { assessmentId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    (prisma as any).liabilityEvidenceItem.findMany({ where: { assessmentId }, orderBy: [{ createdAt: 'asc' }] }),
  ])
  const policyIds = defendants.map((d: any) => d.insuranceDetailId).filter(Boolean)
  const fileIds = evidence.map((e: any) => e.evidenceFileId).filter(Boolean)
  const [policies, files] = await Promise.all([
    policyIds.length
      ? prisma.insuranceDetail.findMany({ where: { id: { in: policyIds }, assessmentId }, select: { id: true, carrierName: true } })
      : Promise.resolve([]),
    fileIds.length
      ? prisma.evidenceFile.findMany({ where: { id: { in: fileIds }, assessmentId }, select: { id: true, originalName: true } })
      : Promise.resolve([]),
  ])
  const carrier = new Map(policies.map((p: any) => [p.id, p.carrierName as string]))
  const fileName = new Map(files.map((f: any) => [f.id, f.originalName as string]))

  return {
    defendants: defendants.map((d: any) => ({
      id: d.id,
      name: d.name,
      role: d.role,
      faultPct: d.faultPct ?? null,
      insurerName: d.insurerName ?? null,
      insuranceDetailId: carrier.has(d.insuranceDetailId) ? d.insuranceDetailId : null,
      linkedCarrierName: carrier.get(d.insuranceDetailId) ?? null,
      address: d.address ?? null,
      phone: d.phone ?? null,
      email: d.email ?? null,
      counselName: d.counselName ?? null,
      counselFirm: d.counselFirm ?? null,
      counselPhone: d.counselPhone ?? null,
      counselEmail: d.counselEmail ?? null,
    })),
    evidence: evidence.map((e: any) => ({
      id: e.id,
      type: e.type,
      status: e.status,
      referenceNumber: e.referenceNumber ?? null,
      date: e.date ? new Date(e.date).toISOString().slice(0, 10) : null,
      description: e.description ?? null,
      evidenceFileId: fileName.has(e.evidenceFileId) ? e.evidenceFileId : null,
      evidenceFileName: fileName.get(e.evidenceFileId) ?? null,
    })),
  }
}

/** What a change touched: the defendant list, and/or these evidence types. */
export type RollupScope = { defendants?: boolean; evidenceTypes?: string[] }

/**
 * The LiabilityRecord columns these lists stand behind, limited to the scope a
 * change touched. Question answers also write some of these columns (witnesses,
 * fault split); rolling up only what changed keeps those until the attorney
 * edits the matching part of the list.
 */
export function rollupFromParties(
  defendants: Pick<DefendantView, 'name' | 'faultPct' | 'insurerName' | 'linkedCarrierName'>[],
  evidence: Pick<EvidenceItemView, 'type' | 'status' | 'referenceNumber'>[],
  scope: RollupScope,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  const types = new Set(scope.evidenceTypes || [])

  if (scope.defendants) {
    const insurers = [...new Set(defendants.map((d) => d.linkedCarrierName || d.insurerName).filter(Boolean) as string[])]
    const allocated = defendants.filter((d) => d.faultPct != null)
    patch.defendantName = defendants.map((d) => d.name).join(', ') || null
    patch.defendantInsurer = insurers.join(', ') || null
    if (allocated.length) {
      patch.defendantFaultPct = Math.min(100, allocated.reduce((sum, d) => sum + Number(d.faultPct), 0))
    }
  }
  if (types.has('police_report')) {
    const reports = evidence.filter((e) => e.type === 'police_report')
    const best = reports.find((r) => r.status === 'received') || reports.find((r) => r.status === 'requested') || null
    patch.policeReportStatus = best ? best.status : 'none'
    patch.policeReportNumber = (best || reports[0])?.referenceNumber || null
  }
  if (types.has('photos')) patch.hasPhotos = evidence.some((e) => e.type === 'photos' && e.status === 'received')
  if (types.has('video')) patch.hasVideo = evidence.some((e) => e.type === 'video' && e.status === 'received')
  if (types.has('witness_statement')) {
    const witnesses = evidence.filter((e) => e.type === 'witness_statement').length
    patch.witnessCount = witnesses
    patch.hasWitnesses = witnesses > 0
  }
  return patch
}

async function syncRollup(assessmentId: string, actor: Actor, scope: RollupScope): Promise<LiabilityView> {
  const { defendants, evidence } = await listLiabilityParties(assessmentId)
  return upsertLiabilityRecord(assessmentId, rollupFromParties(defendants, evidence, scope), { source: 'attorney', ...actor })
}

export async function createDefendant(assessmentId: string, body: any, actor: Actor) {
  const data = await defendantData(assessmentId, body, false)
  const count = await (prisma as any).liabilityDefendant.count({ where: { assessmentId } })
  await (prisma as any).liabilityDefendant.create({ data: { ...data, assessmentId, sortOrder: count } })
  return syncRollup(assessmentId, actor, { defendants: true })
}

export async function updateDefendant(assessmentId: string, id: string, body: any, actor: Actor) {
  const existing = await (prisma as any).liabilityDefendant.findFirst({ where: { id, assessmentId }, select: { id: true } })
  if (!existing) return null
  await (prisma as any).liabilityDefendant.update({ where: { id }, data: await defendantData(assessmentId, body, true) })
  return syncRollup(assessmentId, actor, { defendants: true })
}

export async function deleteDefendant(assessmentId: string, id: string, actor: Actor) {
  const { count } = await (prisma as any).liabilityDefendant.deleteMany({ where: { id, assessmentId } })
  if (!count) return null
  return syncRollup(assessmentId, actor, { defendants: true })
}

export async function createEvidenceItem(assessmentId: string, body: any, actor: Actor) {
  const data = await evidenceData(assessmentId, body, false)
  await (prisma as any).liabilityEvidenceItem.create({ data: { ...data, assessmentId } })
  return syncRollup(assessmentId, actor, { evidenceTypes: [String(data.type)] })
}

export async function updateEvidenceItem(assessmentId: string, id: string, body: any, actor: Actor) {
  const existing = await (prisma as any).liabilityEvidenceItem.findFirst({ where: { id, assessmentId }, select: { id: true, type: true } })
  if (!existing) return null
  const data = await evidenceData(assessmentId, body, true)
  await (prisma as any).liabilityEvidenceItem.update({ where: { id }, data })
  return syncRollup(assessmentId, actor, { evidenceTypes: [existing.type, String(data.type ?? existing.type)] })
}

export async function deleteEvidenceItem(assessmentId: string, id: string, actor: Actor) {
  const existing = await (prisma as any).liabilityEvidenceItem.findFirst({ where: { id, assessmentId }, select: { type: true } })
  if (!existing) return null
  await (prisma as any).liabilityEvidenceItem.delete({ where: { id } })
  return syncRollup(assessmentId, actor, { evidenceTypes: [existing.type] })
}

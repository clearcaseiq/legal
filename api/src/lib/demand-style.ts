/**
 * Firm demand templates ("styles"): how a firm's demand packages look.
 *
 * A style decides the letterhead, which sections appear and in what order,
 * what they are called, the tone the narration is asked for, the response
 * window, and the firm's own opening and closing paragraphs. It never decides
 * a figure or a fact: those still come from the case record, and the
 * narration guard still applies.
 *
 * With no style the package renders exactly as the platform default, so a firm
 * that never opens the editor sees no change.
 */
import { prisma } from './prisma'

export const DEMAND_SECTION_KEYS = [
  'intro',
  'claim_info',
  'executive_summary',
  'facts',
  'liability',
  'liability_evidence',
  'injuries',
  'chronology',
  'specials',
  'future_medical',
  'wages',
  'other_economic',
  'non_economic',
  'damages_summary',
  'settlement_demand',
  'reservation',
  'enclosures',
] as const
export type DemandSectionKey = (typeof DEMAND_SECTION_KEYS)[number]

export const DEFAULT_SECTION_TITLES: Record<DemandSectionKey, string> = {
  intro: 'Introduction',
  claim_info: 'Claim Information',
  executive_summary: 'Executive Summary',
  facts: 'Statement of Facts',
  liability: 'Liability Analysis',
  liability_evidence: 'Evidence Supporting Liability',
  injuries: 'Injuries and Diagnoses',
  chronology: 'Medical Treatment Chronology',
  specials: 'Medical Specials',
  future_medical: 'Future Medical Care',
  wages: 'Lost Wages and Earning Capacity',
  other_economic: 'Other Economic Damages',
  non_economic: 'Non-Economic Damages',
  damages_summary: 'Summary of Damages',
  settlement_demand: 'Settlement Demand',
  reservation: 'Time-Limited Response and Reservation of Rights',
  enclosures: 'Enclosure Index',
}

/** Sections a firm may leave out. The rest carry the demand, the deadline, the signature or the exhibit list. */
export const OPTIONAL_SECTIONS: DemandSectionKey[] = [
  'executive_summary',
  'liability_evidence',
  'future_medical',
  'wages',
  'other_economic',
]

/** Optional sections that come back on their own when the case claims those damages. */
export const SHOWN_WHEN_CLAIMED: DemandSectionKey[] = ['future_medical', 'wages', 'other_economic']

export const DEMAND_TONES = ['measured', 'firm', 'assertive'] as const
export type DemandTone = (typeof DEMAND_TONES)[number]

export const MERGE_TOKENS = [
  'client_name',
  'carrier',
  'claim_number',
  'date_of_loss',
  'firm_name',
  'attorney_name',
  'response_days',
] as const

export interface DemandStyleSection {
  key: DemandSectionKey
  /** Title-case heading; rendered upper-case and numbered in the letter. */
  heading: string
  include: boolean
}

export interface DemandStyleConfig {
  /** 'firm' puts the firm's name, address and phone at the top instead of the ClearCaseIQ title. */
  letterhead: 'clearcaseiq' | 'firm'
  subtitle: string | null
  confidentiality: boolean
  tone: DemandTone
  responseDays: number
  sections: DemandStyleSection[]
  openingText: string | null
  closingText: string | null
  /** House-style instructions passed to the narration, e.g. "never use the word 'catastrophic'". */
  houseStyle: string | null
}

export const DEFAULT_STYLE_CONFIG: DemandStyleConfig = {
  letterhead: 'clearcaseiq',
  subtitle: null,
  confidentiality: true,
  tone: 'firm',
  responseDays: 30,
  sections: DEMAND_SECTION_KEYS.map((key) => ({ key, heading: DEFAULT_SECTION_TITLES[key], include: true })),
  openingText: null,
  closingText: null,
  houseStyle: null,
}

const text = (v: unknown, max: number) => {
  const s = typeof v === 'string' ? v.replace(/\r\n/g, '\n').trim() : ''
  return s ? s.slice(0, max) : null
}

/**
 * Make any stored or submitted config safe to render: every section present
 * once, required sections included, the enclosure index last under its own
 * heading (the Word export finds the exhibit list by it), numbers in range.
 */
export function normalizeStyleConfig(raw: unknown): DemandStyleConfig {
  const input: any = typeof raw === 'string' ? safeJson(raw) : raw && typeof raw === 'object' ? raw : {}
  const seen = new Set<DemandSectionKey>()
  const sections: DemandStyleSection[] = []
  for (const s of Array.isArray(input?.sections) ? input.sections : []) {
    const key = s?.key as DemandSectionKey
    if (!DEMAND_SECTION_KEYS.includes(key) || seen.has(key) || key === 'enclosures') continue
    seen.add(key)
    sections.push({
      key,
      heading: text(s?.heading, 80)?.replace(/\n/g, ' ') || DEFAULT_SECTION_TITLES[key],
      include: OPTIONAL_SECTIONS.includes(key) ? s?.include !== false : true,
    })
  }
  for (const key of DEMAND_SECTION_KEYS) {
    if (key === 'enclosures' || seen.has(key)) continue
    sections.push({ key, heading: DEFAULT_SECTION_TITLES[key], include: true })
  }
  sections.push({ key: 'enclosures', heading: DEFAULT_SECTION_TITLES.enclosures, include: true })

  const days = Math.round(Number(input?.responseDays))
  return {
    letterhead: input?.letterhead === 'firm' ? 'firm' : 'clearcaseiq',
    subtitle: text(input?.subtitle, 120)?.replace(/\n/g, ' ') ?? null,
    confidentiality: input?.confidentiality !== false,
    tone: (DEMAND_TONES as readonly string[]).includes(input?.tone) ? input.tone : 'firm',
    responseDays: Number.isFinite(days) ? Math.max(10, Math.min(90, days)) : 30,
    sections,
    openingText: text(input?.openingText, 2000),
    closingText: text(input?.closingText, 2000),
    houseStyle: text(input?.houseStyle, 1000),
  }
}

function safeJson(raw: string): any {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

const ROMAN: Array<[number, string]> = [
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

export function romanNumeral(n: number): string {
  let out = ''
  let rest = n
  for (const [value, numeral] of ROMAN) {
    while (rest >= value) {
      out += numeral
      rest -= value
    }
  }
  return out
}

/** Fill {{client_name}}-style fields. Unknown fields are left as typed so the attorney sees them. */
export function fillMergeTokens(template: string, values: Partial<Record<(typeof MERGE_TOKENS)[number], string | null | undefined>>): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (whole, key: string) => {
    if (!(MERGE_TOKENS as readonly string[]).includes(key)) return whole
    const v = values[key as (typeof MERGE_TOKENS)[number]]
    return v ? String(v) : whole
  })
}

/** The steer the narration gets for a tone. */
export function toneInstruction(tone: DemandTone): string {
  if (tone === 'measured') {
    return 'Write in a measured, understated, professional voice. No rhetoric or adjectives of outrage; let the facts carry the letter.'
  }
  if (tone === 'assertive') {
    return 'Write assertively and persuasively. Press liability and the human cost hard, in plain and forceful language, without exaggerating or adding anything.'
  }
  return 'Write with the confidence of an experienced plaintiff\u2019s attorney: direct, professional and persuasive.'
}

export interface FirmLetterhead {
  name: string
  address: string | null
  phone: string | null
}

/** What the renderer needs from a style, with the firm's letterhead looked up. */
export interface ResolvedDemandStyle {
  id: string | null
  name: string
  config: DemandStyleConfig
  letterhead: FirmLetterhead | null
}

export const DEFAULT_RESOLVED_STYLE: ResolvedDemandStyle = {
  id: null,
  name: 'ClearCaseIQ default',
  config: DEFAULT_STYLE_CONFIG,
  letterhead: null,
}

function letterheadOf(firm: any): FirmLetterhead | null {
  if (!firm?.name) return null
  const cityLine = [firm.city, [firm.state, firm.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return {
    name: firm.name,
    address: [firm.address, cityLine].filter(Boolean).join(', ') || null,
    phone: firm.phone || null,
  }
}

/** The firm a case belongs to: the case's own firm, else its assigned attorney's. */
export async function firmIdForAssessment(assessmentId: string): Promise<string | null> {
  const assessment = await prisma.assessment
    .findUnique({ where: { id: assessmentId }, select: { lawFirmId: true } })
    .catch(() => null)
  if (assessment?.lawFirmId) return assessment.lawFirmId
  const lead = await prisma.leadSubmission
    .findUnique({ where: { assessmentId }, select: { assignedAttorney: { select: { lawFirmId: true } } } })
    .catch(() => null)
  return lead?.assignedAttorney?.lawFirmId ?? null
}

/**
 * The style a case's demand is drafted with: the one asked for if it belongs
 * to the case's firm, else the firm's default, else the platform default.
 * Pass `null` to ask for the platform default explicitly.
 */
export async function resolveDemandStyle(assessmentId: string, styleId?: string | null): Promise<ResolvedDemandStyle> {
  if (styleId === null) return DEFAULT_RESOLVED_STYLE
  const lawFirmId = await firmIdForAssessment(assessmentId)
  if (!lawFirmId) return DEFAULT_RESOLVED_STYLE
  const [style, firm] = await Promise.all([
    (prisma as any).demandStyle
      .findFirst({
        where: { lawFirmId, ...(styleId ? { id: styleId } : { isDefault: true }) },
      })
      .catch(() => null),
    prisma.lawFirm
      .findUnique({ where: { id: lawFirmId }, select: { name: true, address: true, city: true, state: true, zip: true, phone: true } })
      .catch(() => null),
  ])
  if (!style) return DEFAULT_RESOLVED_STYLE
  return { id: style.id, name: style.name, config: normalizeStyleConfig(style.config), letterhead: letterheadOf(firm) }
}

export interface DemandStyleView {
  id: string
  name: string
  isDefault: boolean
  config: DemandStyleConfig
  updatedByName: string | null
  updatedAt: string
}

export function toStyleView(row: any): DemandStyleView {
  return {
    id: row.id,
    name: row.name,
    isDefault: Boolean(row.isDefault),
    config: normalizeStyleConfig(row.config),
    updatedByName: row.updatedByName ?? null,
    updatedAt: new Date(row.updatedAt).toISOString(),
  }
}

export async function listDemandStyles(lawFirmId: string): Promise<DemandStyleView[]> {
  const rows = await (prisma as any).demandStyle.findMany({
    where: { lawFirmId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })
  return (rows as any[]).map(toStyleView)
}

export class DemandStyleError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

async function clearOtherDefaults(lawFirmId: string, keepId: string) {
  await (prisma as any).demandStyle.updateMany({
    where: { lawFirmId, id: { not: keepId }, isDefault: true },
    data: { isDefault: false },
  })
}

export async function saveDemandStyle(
  lawFirmId: string,
  id: string | null,
  body: any,
  actor: { id?: string | null; name?: string | null },
): Promise<DemandStyleView> {
  const name = text(body?.name, 80)?.replace(/\n/g, ' ')
  if (!id && !name) throw new DemandStyleError('Give the template a name.')
  const data: Record<string, unknown> = { updatedByName: actor.name || null }
  if (name) data.name = name
  if (body?.config !== undefined) data.config = JSON.stringify(normalizeStyleConfig(body.config))
  if (body?.isDefault !== undefined) data.isDefault = Boolean(body.isDefault)

  let row: any
  if (id) {
    const existing = await (prisma as any).demandStyle.findFirst({ where: { id, lawFirmId }, select: { id: true } })
    if (!existing) throw new DemandStyleError('Template not found', 404)
    row = await (prisma as any).demandStyle.update({ where: { id }, data })
  } else {
    const count = await (prisma as any).demandStyle.count({ where: { lawFirmId } })
    row = await (prisma as any).demandStyle.create({
      data: {
        lawFirmId,
        name,
        config: (data.config as string) ?? JSON.stringify(DEFAULT_STYLE_CONFIG),
        // A firm's first template is the one its demands use.
        isDefault: body?.isDefault !== undefined ? Boolean(body.isDefault) : count === 0,
        createdById: actor.id || null,
        updatedByName: actor.name || null,
      },
    })
  }
  if (row.isDefault) await clearOtherDefaults(lawFirmId, row.id)
  return toStyleView(row)
}

export async function deleteDemandStyle(lawFirmId: string, id: string): Promise<void> {
  const { count } = await (prisma as any).demandStyle.deleteMany({ where: { id, lawFirmId } })
  if (!count) throw new DemandStyleError('Template not found', 404)
}

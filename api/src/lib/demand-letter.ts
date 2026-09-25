/**
 * Demand letter drafting.
 *
 * The letter is assembled deterministically from case data so that every
 * required section is present and every figure — medical specials, wage loss,
 * the demand amount — comes from the record. An optional LLM pass then rewrites
 * only the persuasive prose.
 *
 * The split matters: a demand letter is a legal document sent to an adjuster,
 * and a model that invents a treatment date or a dollar amount does real harm.
 * So the narration layer may touch four narrative sections and nothing else,
 * the numeric sections are never sent for rewriting, and any rewritten section
 * that introduces a dollar figure the deterministic draft did not contain is
 * discarded. With no API key, or on any failure, the deterministic text stands.
 */
import { logger } from './logger'
import { getLlmChatClient, LLM_CHAT_MODEL } from './llm-client'
import { llmAllowPhi } from './llm-prompt-sanitize'

const openai = getLlmChatClient()

export type DemandMode = 'represented' | 'pro_se'

export interface TreatmentLedgerEntry {
  visitDate: Date
  providerName: string
  visitType: string
  diagnosis: string | null
  diagnosisCode: string | null
  billedAmount: number | null
  status: string
}

export interface TreatmentLedger {
  entries: TreatmentLedgerEntry[]
  totalBilled: number
  firstVisit: Date | null
  lastVisit: Date | null
  providerCount: number
}

export const EMPTY_TREATMENT_LEDGER: TreatmentLedger = {
  entries: [],
  totalBilled: 0,
  firstVisit: null,
  lastVisit: null,
  providerCount: 0,
}

/** Where in the letter a supporting file is cited. */
export type ExhibitSection = 'liability' | 'treatment' | 'bills' | 'wages' | 'damages' | 'injuries' | 'other'

export interface DemandExhibit {
  number: number
  section: ExhibitSection
  label: string
}

/**
 * What the attorney entered on the case tabs. Every field is optional: the
 * self-help builder has none of it, and each tab can still be empty.
 */
export interface DemandCaseRecord {
  clientName?: string | null
  attorney?: {
    name: string
    firmName?: string | null
    phone?: string | null
    email?: string | null
    address?: string | null
  } | null
  claim?: {
    carrierName: string
    claimNumber?: string | null
    policyNumber?: string | null
    adjusterName?: string | null
    adjusterEmail?: string | null
  } | null
  liability?: {
    faultTheory?: string | null
    faultPosture?: string | null
    comparativeNegPct?: number | null
    defendantName?: string | null
    policeReportStatus?: string | null
    policeReportNumber?: string | null
    citationIssuedTo?: string | null
    witnessCount?: number | null
    hasWitnesses?: boolean | null
    hasPhotos?: boolean | null
    hasVideo?: boolean | null
  } | null
  medical?: {
    entries: Array<{
      provider: string
      specialty?: string | null
      visitType: string
      startDate: string | null
      endDate: string | null
      status?: string | null
      diagnosis?: string | null
      billedAmount?: number | null
      isFuture?: boolean
    }>
    status?: {
      treatmentStatus?: string | null
      mmi?: boolean
      mmiDate?: string | null
      symptoms?: string[]
      futureTreatment?: string | null
    } | null
  } | null
  damageItems?: Array<{
    category: string
    description: string
    amount: number
    provider?: string | null
    incurredAt?: Date | string | null
    billingStatus?: string | null
  }>
  exhibits?: DemandExhibit[]
}

/**
 * The letter broken into named parts.
 *
 * `NARRATIVE_SECTIONS` below marks the only ones the LLM is allowed to touch.
 */
export interface DemandLetterSections {
  header: string
  recipientBlock: string[]
  reLine: string
  salutation: string
  intro: string
  accidentSummary: string
  liability: string
  /** Built from the treatment ledger. Dates and charges — never narrated. */
  treatmentTimeline: string
  /** Numeric. Never narrated. */
  medicalBills: string
  /** Numeric. Never narrated. */
  lostWages: string
  painAndSuffering: string
  /** Numeric. Never narrated. */
  damagesSummary: string[]
  /** Contains the demand amount. Never narrated. */
  demandParagraph: string
  goodFaithParagraph: string
  closing: string
  disclaimer: string
  /** Facts from the liability record (report, citation, witnesses). Never narrated. */
  liabilityEvidence?: string
  /** Future treatment plan and projected costs. Never narrated. */
  futureMedicalCare?: string
  /** Property damage, out-of-pocket, and other itemized losses. Never narrated. */
  otherDamages?: string
  /** "See Exhibits 1–3" lines, printed after the section they support. */
  exhibitRefs?: Partial<Record<ExhibitSection, string>>
  /** The numbered exhibit list printed after the signature. */
  enclosures?: string[]
}

/** The sections a model may rewrite. Everything else is data. */
export const NARRATIVE_SECTIONS = ['intro', 'accidentSummary', 'liability', 'painAndSuffering'] as const
export type NarrativeSection = (typeof NARRATIVE_SECTIONS)[number]

const money = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`

const longDate = (d: Date | string | null | undefined) => {
  if (!d) return null
  const date = typeof d === 'string' ? new Date(d) : d
  return isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

const labelizeVisitType = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

/** Render injuries (which may be strings or objects) as a readable list. */
export function describeInjuries(facts: any): string[] {
  const raw = facts?.injuries ?? facts?.injury ?? []
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  return list
    .map((item: any) => {
      if (!item) return null
      if (typeof item === 'string') return item
      return item.name || item.bodyPart || item.description || item.type || null
    })
    .filter(Boolean)
    .map((s: string) => String(s).trim())
}

/**
 * Build a treatment timeline from the structured Phase-B medical ledger written
 * into facts.treatment[] (provider/type/startDate/endDate/status/diagnosis).
 * Returns null when there is nothing usable so callers fall back.
 */
function buildTimelineFromFacts(facts: any): string | null {
  const entries = Array.isArray(facts?.treatment) ? facts.treatment : []
  const dated = entries
    .map((e: any) => ({
      date: e?.startDate || e?.date || e?.endDate || null,
      end: e?.endDate || null,
      provider: e?.provider || 'Provider',
      type: e?.type || e?.visitType || 'visit',
      diagnosis: e?.diagnosis || null,
    }))
    .filter((e: any) => e.date)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
  if (dated.length === 0) return null

  const first = longDate(dated[0].date)
  const last = longDate(dated[dated.length - 1].end || dated[dated.length - 1].date)
  const providers = new Set(dated.map((e: any) => String(e.provider).toLowerCase()))
  const span =
    first && last
      ? `Treatment spanned ${first} through ${last} across ${providers.size} provider${providers.size === 1 ? '' : 's'}.`
      : ''
  const lines = dated.map((e: any) => {
    const parts = [`- ${longDate(e.date)} — ${e.provider}: ${labelizeVisitType(e.type)}`]
    if (e.diagnosis) parts.push(` — Dx: ${e.diagnosis}`)
    return parts.join('')
  })
  return ['MEDICAL TREATMENT TIMELINE AND RECORDS', span, '', ...lines].filter((l) => l !== undefined).join('\n')
}

/**
 * Treatment timeline. Prefers the logged referral ledger, then the structured
 * Phase-B medical timeline (facts.treatment[]), then the LLM medical chronology,
 * and finally a records-on-request sentence.
 */
export function buildTreatmentTimelineSection(ledger: TreatmentLedger, analysis: any, facts?: any): string {
  if (ledger.entries.length > 0) {
    const span =
      ledger.firstVisit && ledger.lastVisit
        ? `Treatment spanned ${longDate(ledger.firstVisit)} through ${longDate(ledger.lastVisit)} across ${ledger.providerCount} provider${ledger.providerCount === 1 ? '' : 's'}.`
        : ''
    const lines = ledger.entries.map((e) => {
      const parts = [`- ${longDate(e.visitDate)} — ${e.providerName}: ${labelizeVisitType(e.visitType)}`]
      if (e.diagnosis) {
        parts.push(` — Dx: ${e.diagnosis}${e.diagnosisCode ? ` (${e.diagnosisCode})` : ''}`)
      }
      if (e.billedAmount != null) {
        parts.push(` — ${money(e.billedAmount)}`)
      }
      return parts.join('')
    })
    return ['MEDICAL TREATMENT TIMELINE AND RECORDS', span, '', ...lines].filter((l) => l !== undefined).join('\n')
  }

  const fromFacts = buildTimelineFromFacts(facts)
  if (fromFacts) return fromFacts

  const chronology = analysis?.medicalChronology
  if (chronology?.timeline?.length) {
    const lines = chronology.timeline.map((t: string) => `- ${t}`)
    return ['MEDICAL TREATMENT TIMELINE AND RECORDS', chronology.summary || '', '', ...lines].filter(Boolean).join('\n')
  }

  return [
    'MEDICAL TREATMENT TIMELINE AND RECORDS',
    'Our client received medical treatment for injuries sustained in this incident. A complete set of treatment records and itemized bills is available upon request and incorporated herein by reference.',
  ].join('\n')
}

/** "1–3, 5" for a sorted list of exhibit numbers. */
function formatExhibitNumbers(nums: number[]): string {
  const sorted = [...nums].sort((a, b) => a - b)
  const parts: string[] = []
  let start = sorted[0]
  let prev = sorted[0]
  for (const n of sorted.slice(1).concat(Number.NaN)) {
    if (n === prev + 1) {
      prev = n
      continue
    }
    parts.push(start === prev ? String(start) : `${start}\u2013${prev}`)
    start = n
    prev = n
  }
  return parts.join(', ')
}

export function exhibitReference(exhibits: DemandExhibit[], section: ExhibitSection): string | undefined {
  const nums = exhibits.filter((e) => e.section === section).map((e) => e.number)
  if (nums.length === 0) return undefined
  return `${nums.length === 1 ? 'See Exhibit' : 'See Exhibits'} ${formatExhibitNumbers(nums)}.`
}

const itemDate = (d: Date | string | null | undefined) => {
  if (!d) return null
  const date = typeof d === 'string' ? new Date(d) : d
  return isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

type DamageItemInput = NonNullable<DemandCaseRecord['damageItems']>[number]

function itemLine(item: DamageItemInput): string {
  const who = item.provider && item.provider.trim() ? `${item.provider.trim()} \u2014 ` : ''
  const when = itemDate(item.incurredAt)
  return `- ${who}${item.description}${when ? ` (${when})` : ''}: ${money(Number(item.amount) || 0)}`
}

const sumItems = (items: DamageItemInput[]) => items.reduce((s, i) => s + (Number(i.amount) || 0), 0)

/** Treatment timeline from the Medical tab's visits, with the current medical status. */
function buildTimelineFromMedicalTab(
  medical: NonNullable<DemandCaseRecord['medical']>,
  clientSubject: string,
): string | null {
  const past = medical.entries
    .filter((e) => !e.isFuture)
    .sort((a, b) => {
      const ta = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER
      const tb = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER
      return ta - tb
    })
  if (past.length === 0) return null

  const dated = past.filter((e) => e.startDate)
  const providers = new Set(past.map((e) => e.provider.toLowerCase()))
  const first = dated.length ? longDate(dated[0].startDate) : null
  const lastEntry = dated[dated.length - 1]
  const last = lastEntry ? longDate(lastEntry.endDate || lastEntry.startDate) : null
  const span =
    first && last
      ? `Treatment spanned ${first} through ${last} across ${providers.size} provider${providers.size === 1 ? '' : 's'}.`
      : ''

  const lines = past.map((e) => {
    const start = longDate(e.startDate)
    const end = e.endDate && e.endDate !== e.startDate ? longDate(e.endDate) : null
    const when = start ? `${start}${end ? ` \u2013 ${end}` : ''} \u2014 ` : ''
    const parts = [`- ${when}${e.provider}${e.specialty ? ` (${e.specialty})` : ''}: ${labelizeVisitType(e.visitType)}`]
    if (e.diagnosis) parts.push(` \u2014 Dx: ${e.diagnosis}`)
    if (e.billedAmount != null && Number(e.billedAmount) > 0) parts.push(` \u2014 ${money(Number(e.billedAmount))}`)
    return parts.join('')
  })

  const status = medical.status
  const statusLines: string[] = []
  const subject = clientSubject.charAt(0).toUpperCase() + clientSubject.slice(1)
  if (status?.mmi && status.mmiDate) {
    statusLines.push(`${subject} reached maximum medical improvement on ${longDate(status.mmiDate)}.`)
  } else if (status?.mmi || status?.treatmentStatus === 'mmi') {
    statusLines.push(`${subject} has reached maximum medical improvement.`)
  } else if (status?.treatmentStatus === 'completed' || status?.treatmentStatus === 'discharged') {
    statusLines.push(`${subject} has completed the prescribed course of treatment.`)
  } else if (status?.treatmentStatus === 'treating') {
    statusLines.push(`${subject} continues to treat for these injuries.`)
  }
  const symptoms = (status?.symptoms || []).filter(Boolean)
  if (symptoms.length) statusLines.push(`Ongoing complaints: ${symptoms.join(', ')}.`)

  return ['MEDICAL TREATMENT TIMELINE AND RECORDS', span, '', ...lines, ...(statusLines.length ? ['', ...statusLines] : [])]
    .filter((l) => l !== undefined)
    .join('\n')
}

function buildLiabilityEvidence(
  liability: NonNullable<DemandCaseRecord['liability']>,
  defendant: string,
  ourAccount: string,
): string | undefined {
  const lines: string[] = []
  if (liability.faultPosture === 'admitted') lines.push(`${defendant} admitted fault.`)
  if (liability.policeReportStatus === 'received') {
    lines.push(
      `The police report${liability.policeReportNumber ? ` (Report No. ${liability.policeReportNumber})` : ''} documents the incident.`,
    )
  }
  if (liability.citationIssuedTo === 'defendant' || liability.citationIssuedTo === 'both') {
    lines.push(`${defendant} was cited by the investigating officer.`)
  }
  const witnesses = Number(liability.witnessCount || 0)
  if (witnesses > 0) {
    lines.push(`${witnesses} independent witness${witnesses === 1 ? '' : 'es'} corroborate${witnesses === 1 ? 's' : ''} ${ourAccount}.`)
  } else if (liability.hasWitnesses) {
    lines.push(`Independent witnesses corroborate ${ourAccount}.`)
  }
  if (liability.hasPhotos) lines.push('Photographs document the scene and the resulting damage.')
  if (liability.hasVideo) lines.push('Video footage captures the incident.')
  if (lines.length === 0) return undefined
  return ['Liability is further supported by the following:', ...lines.map((l) => `- ${l}`)].join('\n')
}

const OTHER_DAMAGE_LABELS: Record<string, string> = {
  property_damage: 'Property damage',
  out_of_pocket: 'Out-of-pocket expenses',
  future_cost: 'Future non-medical costs',
  other: 'Other economic losses',
}

export interface BuildDemandLetterInput {
  assessment: any
  facts: any
  targetAmount: number
  recipient: any
  message?: string
  mode?: DemandMode
  treatmentLedger?: TreatmentLedger
  analysis?: any
  /** Everything entered on the case tabs, plus the files cited as exhibits. */
  caseRecord?: DemandCaseRecord
}

export function buildDemandLetterSections({
  assessment,
  facts,
  targetAmount,
  recipient,
  message,
  mode = 'represented',
  treatmentLedger,
  analysis,
  caseRecord,
}: BuildDemandLetterInput): DemandLetterSections {
  const ledger: TreatmentLedger = treatmentLedger ?? EMPTY_TREATMENT_LEDGER
  const record: DemandCaseRecord = caseRecord ?? {}
  const exhibits = record.exhibits ?? []
  const items = record.damageItems ?? []
  const itemsIn = (...cats: string[]) => items.filter((i) => cats.includes(i.category))
  const medicalItems = itemsIn('medical')
  const wageItems = itemsIn('lost_wages')
  const capacityItems = itemsIn('lost_earning_capacity')
  const futureMedicalItems = itemsIn('future_medical')
  const otherItems = itemsIn('property_damage', 'out_of_pocket', 'future_cost', 'other').concat(
    items.filter((i) => !['medical', 'lost_wages', 'lost_earning_capacity', 'future_medical', 'property_damage', 'out_of_pocket', 'future_cost', 'other'].includes(i.category)),
  )

  const incidentDate = facts.incident?.date || 'the date of the incident'
  const narrative = facts.incident?.narrative || 'the incident described in our client\u2019s claim'
  const venue =
    `${assessment.venueState || ''}${assessment.venueCounty ? `, ${assessment.venueCounty}` : ''}`.trim() ||
    'the applicable jurisdiction'

  const d = facts.damages || {}
  // Medical specials: prefer the structured damages ledger (written into
  // facts.damages.medical/med_charges), then the referral ledger total, then
  // self-reported. Once the Phase-B ledger has items, it is authoritative.
  // When the Damages tab has items they are the figures, item by item, so the
  // itemized lines and the totals can never disagree.
  const hasItems = items.length > 0
  const ledgerMedical = Number(d.medical ?? d.med_charges ?? 0)
  const medicalTotal = hasItems
    ? sumItems(medicalItems)
    : ledgerMedical > 0 ? ledgerMedical : ledger.totalBilled > 0 ? ledger.totalBilled : Number(d.med_charges || 0)
  const lostWages = hasItems ? sumItems(wageItems) : Number(d.lostWages ?? d.wage_loss ?? d.estimated_wage_loss ?? 0)
  const futureMedical = hasItems
    ? sumItems(futureMedicalItems)
    : Number(d.futureMedical ?? d.future_medical ?? d.estimated_future_med_charges ?? 0)
  // Other economic damages the structured ledger tracks (property, out-of-pocket,
  // future non-medical costs, lost earning capacity), rolled into facts.damages.other.
  const earningCapacity = sumItems(capacityItems)
  const otherEconomic = hasItems ? sumItems(otherItems) + earningCapacity : Number(d.other ?? 0)

  // General (pain & suffering) damages: derive from the demand less specials,
  // or fall back to the analysis's pain/suffering valuation split.
  const specials = medicalTotal + lostWages + futureMedical + otherEconomic
  const painSufferingSplit = Number(analysis?.valuationBreakdown?.damageSplits?.painSuffering || 0)
  const generalDamages =
    targetAmount > specials ? targetAmount - specials : painSufferingSplit > 0 ? painSufferingSplit : 0

  // Liability narrative: prefer an explicit message, then the structured
  // liability record's fault theory (Phase B), then the saved analysis, then a
  // clear-liability default.
  const liabilityRecord =
    record.liability ?? (facts.liabilityRecord && typeof facts.liabilityRecord === 'object' ? facts.liabilityRecord : null)
  const comparativePct =
    record.liability?.comparativeNegPct != null
      ? Math.round(Number(record.liability.comparativeNegPct))
      : Math.round(Number(facts.liability?.comparativeNegligence || 0) * 100)
  const defendantName = liabilityRecord?.defendantName ? String(liabilityRecord.defendantName) : 'your insured'
  const baseLiabilityText =
    (record.liability?.faultTheory && String(record.liability.faultTheory).trim()) ||
    (message && message.trim()) ||
    (liabilityRecord?.faultTheory && String(liabilityRecord.faultTheory).trim()) ||
    (analysis?.liabilityOutline && String(analysis.liabilityOutline).trim()) ||
    (analysis?.liabilityModel?.reasoning && String(analysis.liabilityModel.reasoning).trim()) ||
    `The incident and resulting injuries were directly and proximately caused by the negligence of ${defendantName}. ${defendantName === 'your insured' ? 'Your insured' : defendantName} owed our client a duty of care, breached that duty, and that breach was the direct cause of the injuries and damages described below. Liability is clear.`
  // If comparative fault is on the record, address it head-on rather than letting
  // the adjuster raise it first — but never volunteer it when it is zero.
  const liabilityText =
    comparativePct > 0
      ? `${baseLiabilityText} We anticipate an argument that our client bears some comparative responsibility; the facts do not support a meaningful apportionment, and any such allocation would be modest and does not diminish the substantial value of this claim.`
      : baseLiabilityText

  const injuries = describeInjuries(facts)
  const injuryClause = injuries.length
    ? `As a result of this incident, our client sustained ${injuries.join(', ')}.`
    : `As a result of this incident, our client sustained painful injuries requiring medical care.`
  const tabVisits = (record.medical?.entries ?? [])
    .filter((e) => !e.isFuture && e.startDate)
    .sort((a, b) => new Date(a.startDate as string).getTime() - new Date(b.startDate as string).getTime())
  const treatmentSpanClause =
    tabVisits.length > 0
      ? ` Our client underwent ${tabVisits.length} documented treatment encounter${tabVisits.length === 1 ? '' : 's'} between ${longDate(tabVisits[0].startDate)} and ${longDate(tabVisits[tabVisits.length - 1].endDate || tabVisits[tabVisits.length - 1].startDate)}.`
      : ledger.firstVisit && ledger.lastVisit
        ? ` Our client underwent ${ledger.entries.length} documented treatment encounter${ledger.entries.length === 1 ? '' : 's'} between ${longDate(ledger.firstVisit)} and ${longDate(ledger.lastVisit)}.`
        : ''
  const painSufferingNarrative =
    (analysis?.demandPackage?.damageSummary && String(analysis.demandPackage.damageSummary).trim()) || ''

  const medicalLine =
    ledger.totalBilled > 0
      ? `- Medical bills (itemized from ${ledger.entries.length} encounter${ledger.entries.length === 1 ? '' : 's'}): ${money(medicalTotal)}`
      : `- Medical expenses: ${medicalTotal > 0 ? money(medicalTotal) : 'To be documented'}`
  const otherByCategory = (cat: string) => sumItems(otherItems.filter((i) => (OTHER_DAMAGE_LABELS[i.category] ? i.category : 'other') === cat))
  const damagesLines = (hasItems
    ? [
        `- Medical bills${medicalItems.length ? ` (${medicalItems.length} itemized charge${medicalItems.length === 1 ? '' : 's'})` : ''}: ${medicalTotal > 0 ? money(medicalTotal) : 'To be documented'}`,
        futureMedical > 0 ? `- Future medical expenses: ${money(futureMedical)}` : null,
        `- Lost wages: ${lostWages > 0 ? money(lostWages) : 'To be documented'}`,
        earningCapacity > 0 ? `- Loss of earning capacity: ${money(earningCapacity)}` : null,
        ...Object.keys(OTHER_DAMAGE_LABELS).map((cat) => {
          const total = otherByCategory(cat)
          return total > 0 ? `- ${OTHER_DAMAGE_LABELS[cat]}: ${money(total)}` : null
        }),
        `- Pain and suffering (general damages): ${generalDamages > 0 ? money(generalDamages) : 'See above'}`,
      ]
    : [
        medicalLine,
        `- Lost wages: ${lostWages > 0 ? money(lostWages) : 'To be documented'}`,
        futureMedical > 0 ? `- Future medical expenses: ${money(futureMedical)}` : null,
        otherEconomic > 0 ? `- Other economic damages (property, out-of-pocket, future costs): ${money(otherEconomic)}` : null,
        `- Pain and suffering (general damages): ${generalDamages > 0 ? money(generalDamages) : 'See above'}`,
      ]
  ).filter(Boolean) as string[]

  const isPro = mode === 'pro_se'
  const voice = {
    weI: isPro ? 'I' : 'we',
    ourMy: isPro ? 'my' : 'our client\u2019s',
    clientSubject: isPro ? 'I' : 'our client',
  }

  const medicalTabTimeline = record.medical ? buildTimelineFromMedicalTab(record.medical, voice.clientSubject) : null
  const defendantSubject = defendantName === 'your insured' ? 'Your insured' : defendantName
  const liabilityEvidence = record.liability
    ? buildLiabilityEvidence(record.liability, defendantSubject, isPro ? 'my account' : 'our client\u2019s account')
    : undefined

  const medicalBills = medicalItems.length
    ? [
        'TOTAL MEDICAL BILLS',
        `${isPro ? 'I have' : 'Our client has'} incurred the following medical charges as a result of this incident:`,
        ...medicalItems.map(itemLine),
        `Total medical charges to date: ${money(medicalTotal)}. Itemized billing statements are enclosed.`,
      ].join('\n')
    : [
        'TOTAL MEDICAL BILLS',
        ledger.totalBilled > 0
          ? `The itemized treatment records above reflect total medical charges of ${money(ledger.totalBilled)} to date. Complete billing statements and records are enclosed or available upon request.`
          : `Total medical charges to date are ${medicalTotal > 0 ? money(medicalTotal) : 'being compiled'}. Itemized billing statements and records are available upon request.`,
      ].join('\n')

  const lostWagesSection = [
    'LOST WAGES',
    lostWages > 0
      ? `${voice.clientSubject} incurred ${money(lostWages)} in lost earnings as a result of this incident and the resulting treatment and recovery. Wage-loss documentation (employer verification and/or pay records) is available upon request and incorporated herein by reference.`
      : `${voice.clientSubject} experienced lost time from work as a result of this incident. Supporting wage-loss documentation will be provided.`,
    ...(wageItems.length > 1 || (wageItems.length === 1 && wageItems[0].provider) ? wageItems.map(itemLine) : []),
    ...(capacityItems.length
      ? [`${isPro ? 'My' : 'Our client\u2019s'} future earning capacity has also been diminished by ${money(earningCapacity)}:`, ...capacityItems.map(itemLine)]
      : []),
  ].join('\n')

  const futurePlan = record.medical?.status?.futureTreatment?.trim()
  const futureVisits = (record.medical?.entries ?? []).filter((e) => e.isFuture)
  const futureMedicalCare =
    futurePlan || futureMedicalItems.length || futureVisits.length
      ? [
          'FUTURE MEDICAL CARE',
          futurePlan ? `${isPro ? 'My' : 'Our client\u2019s'} treating providers recommend the following future care: ${futurePlan}` : null,
          ...futureVisits.map(
            (e) =>
              `- ${e.provider}${e.specialty ? ` (${e.specialty})` : ''}: ${labelizeVisitType(e.visitType)}${e.diagnosis ? ` \u2014 ${e.diagnosis}` : ''}${e.billedAmount ? ` \u2014 ${money(Number(e.billedAmount))}` : ''}`,
          ),
          ...futureMedicalItems.map(itemLine),
          futureMedical > 0 ? `Projected future medical expenses: ${money(futureMedical)}.` : null,
        ]
          .filter(Boolean)
          .join('\n')
      : undefined

  const otherDamages = otherItems.length
    ? [
        'OTHER ECONOMIC DAMAGES',
        ...Object.keys(OTHER_DAMAGE_LABELS).flatMap((cat) => {
          const inCat = otherItems.filter((i) => (OTHER_DAMAGE_LABELS[i.category] ? i.category : 'other') === cat)
          return inCat.length ? [`${OTHER_DAMAGE_LABELS[cat]}:`, ...inCat.map(itemLine)] : []
        }),
      ].join('\n')
    : undefined

  // Property-damage photos with no Other Economic Damages section to sit under
  // still prove the impact, so they are cited with the liability evidence.
  const citedExhibits = otherItems.length
    ? exhibits
    : exhibits.map((e) => (e.section === 'damages' ? { ...e, section: 'liability' as ExhibitSection } : e))
  const exhibitRefs: Partial<Record<ExhibitSection, string>> = {}
  for (const section of ['liability', 'treatment', 'bills', 'wages', 'damages', 'injuries'] as ExhibitSection[]) {
    const ref = exhibitReference(citedExhibits, section)
    if (ref) exhibitRefs[section] = ref
  }
  const enclosures = exhibits
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((e) => `Exhibit ${e.number} \u2014 ${e.label}`)

  const reLine = (() => {
    const defendantKnown = defendantName !== 'your insured'
    if (!record.clientName && !record.claim && !defendantKnown) {
      return `Re: Personal Injury Claim \u2014 Date of Incident ${incidentDate}`
    }
    return [
      'Re: Personal Injury Claim',
      record.clientName ? `${isPro ? 'Claimant' : 'Our Client'}: ${record.clientName}` : null,
      defendantKnown ? `Your Insured: ${defendantName}` : null,
      record.claim?.claimNumber ? `Claim No.: ${record.claim.claimNumber}` : null,
      record.claim?.policyNumber ? `Policy No.: ${record.claim.policyNumber}` : null,
      `Date of Loss: ${incidentDate}`,
    ]
      .filter(Boolean)
      .join('\n')
  })()

  const attorney = record.attorney
  const closing = isPro
    ? `Sincerely,\n\n${record.clientName || '[Your Name]'}\n[Your Contact Information]`
    : attorney?.name
      ? [
          'Very truly yours,',
          '',
          attorney.name,
          attorney.firmName || null,
          attorney.address || null,
          [attorney.phone, attorney.email].filter(Boolean).join(' \u00b7 ') || null,
        ]
          .filter((l) => l !== null)
          .join('\n')
      : `Very truly yours,\n\n[Attorney Name]\n[Law Firm Name]\n[Contact Information]`

  return {
    header: isPro ? 'SETTLEMENT DEMAND' : 'DEMAND LETTER',
    recipientBlock: [`${recipient.name}`, `${recipient.address}`],
    reLine,
    salutation: `Dear ${recipient.name},`,
    intro: isPro
      ? `I am writing on my own behalf regarding my personal injury claim arising from an incident that occurred on or about ${incidentDate} in ${venue}.`
      : `We represent the above-referenced client in connection with a personal injury claim arising from an incident that occurred on or about ${incidentDate} in ${venue}. This letter constitutes our formal demand for settlement.`,
    accidentSummary: narrative,
    liability: liabilityText,
    treatmentTimeline: medicalTabTimeline ?? buildTreatmentTimelineSection(ledger, analysis, facts),
    medicalBills,
    lostWages: lostWagesSection,
    painAndSuffering: [
      `${injuryClause}${treatmentSpanClause} These injuries caused our client substantial physical pain, emotional distress, and disruption to daily activities, work, and quality of life. The course of treatment, the nature of the injuries, and their ongoing effects fully justify a meaningful award for non-economic damages.`,
      painSufferingNarrative,
    ]
      .filter((s) => s && s.trim())
      .join('\n\n'),
    damagesSummary: damagesLines,
    demandParagraph: `Based on the liability of your insured and the nature and extent of ${voice.ourMy} injuries and damages, ${voice.weI} demand the sum of ${money(targetAmount)} to resolve this matter in full.`,
    goodFaithParagraph: `This demand is made in good faith and represents a reasonable assessment of the damages. Please respond within thirty (30) days of receipt of this letter. If this matter cannot be resolved through negotiation, ${voice.weI} ${isPro ? 'reserve' : 'are prepared to pursue'} all available legal remedies.`,
    closing,
    disclaimer: isPro
      ? `This letter is for settlement purposes only. I understand I should consider attorney review before signing any release or resolving claims involving serious injury, minors, disputed liability, government entities, liens, permanent disability, or approaching legal deadlines.`
      : `This letter is for settlement purposes only and is not admissible in any subsequent litigation.`,
    liabilityEvidence,
    futureMedicalCare,
    otherDamages,
    exhibitRefs,
    enclosures,
  }
}

/** Join the sections into the plain-text letter that gets stored and exported. */
export function renderDemandLetter(s: DemandLetterSections): string {
  const refs = s.exhibitRefs ?? {}
  // Optional blocks are omitted entirely when empty, so a letter with no tab
  // data renders exactly as it always has.
  const block = (...lines: Array<string | undefined>) => {
    const kept = lines.filter((l): l is string => typeof l === 'string' && l.length > 0)
    return kept.length ? ['', ...kept] : []
  }
  return [
    s.header,
    '',
    ...s.recipientBlock,
    '',
    s.reLine,
    '',
    s.salutation,
    '',
    s.intro,
    '',
    'ACCIDENT SUMMARY',
    s.accidentSummary,
    '',
    'LIABILITY',
    s.liability,
    ...block(s.liabilityEvidence),
    ...block(refs.liability),
    '',
    s.treatmentTimeline,
    ...block(refs.treatment),
    '',
    s.medicalBills,
    ...block(refs.bills),
    '',
    s.lostWages,
    ...block(refs.wages),
    ...block(s.futureMedicalCare),
    ...block(s.otherDamages, refs.damages),
    '',
    'PAIN AND SUFFERING',
    s.painAndSuffering,
    ...block(refs.injuries),
    '',
    'SUMMARY OF DAMAGES',
    ...s.damagesSummary,
    '',
    'DEMAND',
    s.demandParagraph,
    '',
    s.goodFaithParagraph,
    '',
    s.closing,
    ...(s.enclosures && s.enclosures.length ? ['', 'ENCLOSURES', ...s.enclosures] : []),
    '',
    s.disclaimer,
  ]
    .join('\n')
    .trim()
}

/** Deterministic letter, unchanged from the original template. */
export function generateDemandLetter(input: BuildDemandLetterInput): string {
  return renderDemandLetter(buildDemandLetterSections(input))
}

/**
 * Every way a string refers to an amount of money, normalised for comparison.
 *
 * Deliberately broad, because a demand letter goes to an adjuster and a model
 * asked to write more persuasively will reach for a figure. It catches three
 * shapes:
 *
 *   - "$40,000"                      → an explicit amount
 *   - "40,000" or "12400"            → a bare figure; four digits or comma
 *                                      grouping, so "30 days" and "3 visits"
 *                                      are not swept up
 *   - "thousand", "dollars", "figure" → an amount written as words, which no
 *                                      deterministic section ever produces, so
 *                                      any of these is by definition new
 */
export function moneyMentions(text: string): string[] {
  const found: string[] = []
  for (const m of text.match(/\$[\d,]+(?:\.\d+)?/g) || []) {
    found.push(m.replace(/[,\s]/g, ''))
  }
  for (const m of text.match(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d{4,}(?:\.\d+)?\b/g) || []) {
    found.push(`$${m.replace(/[,\s]/g, '')}`)
  }
  for (const m of text.match(/\b(?:dollars?|thousand|million|billion|figures?)\b/gi) || []) {
    found.push(m.toLowerCase())
  }
  return found
}

/**
 * Accept a rewritten section only if it is substantive and refers to no amount
 * of money the deterministic draft did not already contain.
 *
 * This is the guard that matters. A model asked to make prose more persuasive
 * will happily write "medical bills exceeding $40,000" into a paragraph that
 * never mentioned a number, and that letter goes to an adjuster.
 */
export function acceptNarratedSection(original: string, rewritten: unknown, allowedAmounts: Set<string>): string {
  const text = typeof rewritten === 'string' ? rewritten.trim() : ''
  if (!text) return original
  // A rewrite that collapses a paragraph to a fragment has lost content.
  if (text.length < Math.min(40, original.length / 2)) return original
  for (const amount of moneyMentions(text)) {
    if (!allowedAmounts.has(amount)) return original
  }
  return text
}

export interface NarratedDemandLetter {
  sections: DemandLetterSections
  source: 'ai' | 'deterministic'
}

function buildNarrationPrompt(sections: DemandLetterSections, context: DemandNarrationContext): string {
  return `You are a senior personal-injury attorney finalising a settlement demand letter to an insurance adjuster.

CASE TYPE: ${context.claimType || 'Personal injury'}
JURISDICTION: ${context.venue || 'Not stated'}
INJURIES: ${context.injuries.length ? context.injuries.join(', ') : 'Not stated'}
${context.extraGuidance ? `\nADDITIONAL INSTRUCTIONS FROM THE ATTORNEY:\n${context.extraGuidance}\n` : ''}
Here are four sections of the draft. Rewrite each one so it reads like a confident,
professional demand written by an experienced plaintiff's attorney.

[intro]
${sections.intro}

[accidentSummary]
${sections.accidentSummary}

[liability]
${sections.liability}

[painAndSuffering]
${sections.painAndSuffering}

Rules, all mandatory:
- Do NOT introduce any dollar amount, date, diagnosis, provider name, or fact that is not already in the text you were given. If a figure is not shown to you, it does not exist.
- Do NOT state or imply a settlement figure. The demand amount appears elsewhere in the letter.
- Do NOT add headings, labels, bullet points, or a signature block.
- Keep each section roughly its current length; write in prose paragraphs.
- Refer to the claimant the same way the draft does (either "our client" or the first person). Do not switch.

Respond with STRICT JSON only:
{
  "intro": "...",
  "accidentSummary": "...",
  "liability": "...",
  "painAndSuffering": "..."
}`
}

export interface DemandNarrationContext {
  assessmentId: string
  claimType?: string | null
  venue?: string | null
  injuries: string[]
  /** Free-text steer from the person asking for the draft. */
  extraGuidance?: string | null
}

/**
 * Rewrite the four narrative sections in a stronger voice.
 *
 * Fails safe in every direction: no configured provider, an empty or unparseable
 * response, or a rewrite that invents a dollar figure all leave the deterministic
 * text in place, section by section.
 */
export async function narrateDemandLetter(
  sections: DemandLetterSections,
  context: DemandNarrationContext,
): Promise<NarratedDemandLetter> {
  if (!openai) return { sections, source: 'deterministic' }
  // Demand narration is inherently clinical — require LLM_ALLOW_PHI=true (BAA).
  if (!llmAllowPhi()) return { sections, source: 'deterministic' }

  // Figures anywhere in the deterministic draft are fair game to restate; any
  // other amount is fabricated.
  const allowedAmounts = new Set(moneyMentions(renderDemandLetter(sections)))

  try {
    const completion = await openai.chat.completions.create({
      model: LLM_CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior personal-injury attorney. Always respond with valid JSON as specified. Never fabricate facts, dates, or figures.',
        },
        { role: 'user', content: buildNarrationPrompt(sections, context) },
      ],
      temperature: 0.4,
      max_tokens: 1600,
      response_format: { type: 'json_object' },
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) throw new Error('Empty response')

    const parsed = JSON.parse(responseText) as Partial<Record<NarrativeSection, unknown>>
    const narrated = { ...sections }
    let rewritten = 0
    for (const key of NARRATIVE_SECTIONS) {
      const next = acceptNarratedSection(sections[key], parsed[key], allowedAmounts)
      if (next !== sections[key]) rewritten += 1
      narrated[key] = next
    }

    if (rewritten === 0) {
      logger.warn('Demand narration produced nothing usable; keeping deterministic copy', {
        assessmentId: context.assessmentId,
      })
      return { sections, source: 'deterministic' }
    }

    logger.info('Narrated demand letter', { assessmentId: context.assessmentId, rewritten })
    return { sections: narrated, source: 'ai' }
  } catch (error: any) {
    logger.warn('Demand narration failed; using deterministic copy', {
      assessmentId: context.assessmentId,
      error: error?.message,
    })
    return { sections, source: 'deterministic' }
  }
}

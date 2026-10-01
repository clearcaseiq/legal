/**
 * ClearCaseIQ Super Demand™: the 17-section settlement demand package, plus the
 * attorney-only Demand Intelligence that sits beside it.
 *
 * Two outputs from one record, deliberately kept apart:
 *
 *   - The letter goes to the carrier. It is rendered from the same
 *     `DemandLetterSections` as the standard demand, so every figure still
 *     comes from the case record and the narration guard still applies; this
 *     module only decides the order, headings and framing.
 *   - The intelligence never leaves the firm. It scores readiness, lays out the
 *     valuation, names the weaknesses an adjuster will press on, grades how
 *     well each statement in the letter is supported, and checks the package
 *     for the mistakes that get a demand discounted. The approval gate on top
 *     of it is what an attorney signs before the letter can be finalized.
 */
import {
  describeInjuries,
  moneyMentions,
  type DemandCaseRecord,
  type DemandExhibit,
  type DemandLetterSections,
  type DemandTotals,
  type ExhibitSection,
  type TreatmentLedger,
} from './demand-letter'

export const SUPER_DEMAND_TEMPLATE = 'super'

export const SUPER_DEMAND_TITLE = 'CLEARCASEIQ SUPER DEMAND\u2122'
export const SUPER_DEMAND_SUBTITLE = 'Attorney-Reviewed Settlement Demand Package'
export const SUPER_DEMAND_CONFIDENTIAL =
  'CONFIDENTIAL SETTLEMENT COMMUNICATION \u2014 FOR SETTLEMENT PURPOSES ONLY (Fed. R. Evid. 408; Cal. Evid. Code \u00a7\u00a7 1152, 1154 and state equivalents)'

export const SUPER_DEMAND_SECTION_HEADINGS = [
  'I. INTRODUCTION',
  'II. CLAIM INFORMATION',
  'III. EXECUTIVE SUMMARY',
  'IV. STATEMENT OF FACTS',
  'V. LIABILITY ANALYSIS',
  'VI. EVIDENCE SUPPORTING LIABILITY',
  'VII. INJURIES AND DIAGNOSES',
  'VIII. MEDICAL TREATMENT CHRONOLOGY',
  'IX. MEDICAL SPECIALS',
  'X. FUTURE MEDICAL CARE',
  'XI. LOST WAGES AND EARNING CAPACITY',
  'XII. OTHER ECONOMIC DAMAGES',
  'XIII. NON-ECONOMIC DAMAGES',
  'XIV. SUMMARY OF DAMAGES',
  'XV. SETTLEMENT DEMAND',
  'XVI. TIME-LIMITED RESPONSE AND RESERVATION OF RIGHTS',
  'XVII. ENCLOSURE INDEX',
] as const

export const ENCLOSURE_GROUP_ORDER = ['Liability', 'Medical Records', 'Damages', 'Additional Evidence'] as const
type EnclosureGroup = (typeof ENCLOSURE_GROUP_ORDER)[number]

const GROUP_FOR_SECTION: Record<ExhibitSection, EnclosureGroup> = {
  liability: 'Liability',
  treatment: 'Medical Records',
  bills: 'Damages',
  wages: 'Damages',
  damages: 'Damages',
  injuries: 'Additional Evidence',
  other: 'Additional Evidence',
}

/** Text that means a section is still waiting on the record. */
const PLACEHOLDER_PATTERNS = [
  /to be documented/i,
  /being compiled/i,
  /\[attorney name\]/i,
  /\[law firm name\]/i,
  /\[contact information\]/i,
  /\[your name\]/i,
  /will be provided/i,
]

const money = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`

const longDate = (d: Date | string | null | undefined) => {
  if (!d) return null
  const date = typeof d === 'string' ? new Date(d) : d
  return isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

/** Drop the legacy all-caps heading the standard sections start with. */
function sectionBody(text: string | undefined | null): string {
  if (!text) return ''
  const lines = text.split('\n')
  if (lines[0] && lines[0] === lines[0].toUpperCase() && /[A-Z]/.test(lines[0]) && lines[0].length < 60) {
    return lines.slice(1).join('\n').trim()
  }
  return text.trim()
}

export interface SuperDemandValuation {
  p25: number | null
  expected: number | null
  p75: number | null
  source: 'model' | 'analysis' | null
}

export interface SuperDemandContext {
  sections: DemandLetterSections
  caseRecord: DemandCaseRecord
  facts: any
  assessment: { claimType?: string | null; venueState?: string | null; venueCounty?: string | null; referenceCode?: string | null }
  ledger: TreatmentLedger
  valuation?: SuperDemandValuation | null
  viability?: { overall?: number; liability?: number; causation?: number; damages?: number } | null
  currentOffer?: number | null
  /** Days the carrier has to respond. */
  responseDays?: number
}

function totalsOf(ctx: SuperDemandContext): DemandTotals {
  return (
    ctx.sections.totals ?? {
      medical: 0,
      futureMedical: 0,
      lostWages: 0,
      earningCapacity: 0,
      otherEconomic: 0,
      specials: 0,
      general: 0,
      demand: 0,
    }
  )
}

function venueOf(ctx: SuperDemandContext): string | null {
  return [ctx.assessment.venueCounty, ctx.assessment.venueState].filter(Boolean).join(', ') || null
}

function treatmentVisits(ctx: SuperDemandContext): Array<{ date: Date; provider: string }> {
  const fromTab = (ctx.caseRecord.medical?.entries ?? [])
    .filter((e) => !e.isFuture && e.startDate)
    .map((e) => ({ date: new Date(e.startDate as string), provider: e.provider }))
  const fromLedger = ctx.ledger.entries.map((e) => ({ date: new Date(e.visitDate), provider: e.providerName }))
  return (fromTab.length ? fromTab : fromLedger)
    .filter((v) => !isNaN(v.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

function diagnosesOf(ctx: SuperDemandContext): string[] {
  const seen = new Map<string, string>()
  for (const e of ctx.caseRecord.medical?.entries ?? []) {
    if (e.diagnosis?.trim()) seen.set(e.diagnosis.trim().toLowerCase(), e.diagnosis.trim())
  }
  for (const e of ctx.ledger.entries) {
    if (e.diagnosis?.trim()) {
      const label = `${e.diagnosis.trim()}${e.diagnosisCode ? ` (${e.diagnosisCode})` : ''}`
      seen.set(e.diagnosis.trim().toLowerCase(), label)
    }
  }
  return [...seen.values()]
}

export function groupedEnclosures(exhibits: DemandExhibit[]): Array<{ group: EnclosureGroup; lines: string[] }> {
  const sorted = exhibits.slice().sort((a, b) => a.number - b.number)
  return ENCLOSURE_GROUP_ORDER.map((group) => ({
    group,
    lines: sorted.filter((e) => GROUP_FOR_SECTION[e.section] === group).map((e) => `Exhibit ${e.number} \u2014 ${e.label}`),
  })).filter((g) => g.lines.length > 0)
}

/** The carrier-facing letter, as the plain text that is stored and exported. */
export function renderSuperDemand(ctx: SuperDemandContext): string {
  const s = ctx.sections
  const refs = s.exhibitRefs ?? {}
  const record = ctx.caseRecord
  const totals = totalsOf(ctx)
  const incidentDate = longDate(ctx.facts?.incident?.date) || ctx.facts?.incident?.date || 'the date of loss'
  const venue = venueOf(ctx)
  const injuries = describeInjuries(ctx.facts)
  const diagnoses = diagnosesOf(ctx)
  const visits = treatmentVisits(ctx)
  const liability = record.liability
  const comparative = liability?.comparativeNegPct != null ? Math.round(Number(liability.comparativeNegPct)) : 0
  const responseDays = ctx.responseDays ?? 30
  const withRef = (body: string, ref?: string) => [body, ref].filter((p) => p && p.trim()).join('\n\n')

  const claimLines = [
    record.clientName ? `Claimant: ${record.clientName}` : null,
    liability?.defendantName ? `Your Insured: ${liability.defendantName}` : null,
    record.claim?.carrierName ? `Carrier: ${record.claim.carrierName}` : null,
    record.claim?.claimNumber ? `Claim No.: ${record.claim.claimNumber}` : null,
    record.claim?.policyNumber ? `Policy No.: ${record.claim.policyNumber}` : null,
    record.claim?.adjusterName ? `Adjuster: ${record.claim.adjusterName}` : null,
    `Date of Loss: ${incidentDate}`,
    venue ? `Venue: ${venue}` : null,
    ctx.assessment.claimType ? `Claim Type: ${String(ctx.assessment.claimType).replace(/_/g, ' ')}` : null,
    ctx.assessment.referenceCode ? `ClearCaseIQ Reference: ${ctx.assessment.referenceCode}` : null,
  ].filter(Boolean) as string[]

  const executive = [
    `- Date of loss: ${incidentDate}${venue ? `, ${venue}` : ''}.`,
    liability?.faultPosture === 'admitted'
      ? '- Liability: fault has been admitted.'
      : comparative > 0
        ? `- Liability: your insured is primarily at fault; any comparative allocation is disputed and modest.`
        : '- Liability: clear; your insured\u2019s negligence caused this loss.',
    injuries.length || diagnoses.length ? `- Injuries: ${(diagnoses.length ? diagnoses : injuries).join('; ')}.` : null,
    visits.length
      ? `- Treatment: ${visits.length} documented encounter${visits.length === 1 ? '' : 's'} from ${longDate(visits[0].date)} through ${longDate(visits[visits.length - 1].date)}.`
      : null,
    totals.specials > 0 ? `- Economic damages to date: ${money(totals.specials)}.` : null,
    `- Settlement demand: ${money(totals.demand)}.`,
  ].filter(Boolean) as string[]

  const injuryLines = [
    ...(injuries.length ? ['Injuries sustained:', ...injuries.map((i) => `- ${i}`)] : []),
    ...(diagnoses.length ? ['', 'Diagnoses documented by treating providers:', ...diagnoses.map((d) => `- ${d}`)] : []),
    ...((record.medical?.status?.symptoms ?? []).filter(Boolean).length
      ? ['', `Ongoing complaints: ${(record.medical?.status?.symptoms ?? []).filter(Boolean).join(', ')}.`]
      : []),
  ]

  const groups = groupedEnclosures(record.exhibits ?? [])
  const enclosureLines = groups.length
    ? groups.flatMap((g, i) => [...(i > 0 ? [''] : []), g.group, ...g.lines])
    : ['No exhibits are enclosed with this demand. Records are available upon request.']

  const sectionsText: Array<[string, string]> = [
    [SUPER_DEMAND_SECTION_HEADINGS[0], s.intro],
    [SUPER_DEMAND_SECTION_HEADINGS[1], claimLines.join('\n')],
    [SUPER_DEMAND_SECTION_HEADINGS[2], executive.join('\n')],
    [SUPER_DEMAND_SECTION_HEADINGS[3], s.accidentSummary],
    [SUPER_DEMAND_SECTION_HEADINGS[4], s.liability],
    [
      SUPER_DEMAND_SECTION_HEADINGS[5],
      withRef(s.liabilityEvidence || 'The liability evidence is summarized in the Statement of Facts above.', refs.liability),
    ],
    [
      SUPER_DEMAND_SECTION_HEADINGS[6],
      withRef(injuryLines.length ? injuryLines.join('\n') : 'Our client sustained injuries requiring medical care, as documented in the enclosed records.', refs.injuries),
    ],
    [SUPER_DEMAND_SECTION_HEADINGS[7], withRef(sectionBody(s.treatmentTimeline), refs.treatment)],
    [SUPER_DEMAND_SECTION_HEADINGS[8], withRef(sectionBody(s.medicalBills), refs.bills)],
    [
      SUPER_DEMAND_SECTION_HEADINGS[9],
      sectionBody(s.futureMedicalCare) || 'No future medical care is claimed at this time. Our client reserves the right to supplement this demand should further treatment be recommended.',
    ],
    [
      SUPER_DEMAND_SECTION_HEADINGS[10],
      totals.lostWages > 0 || totals.earningCapacity > 0
        ? withRef(sectionBody(s.lostWages), refs.wages)
        : 'No lost wages or loss of earning capacity are claimed in this demand at this time.',
    ],
    [
      SUPER_DEMAND_SECTION_HEADINGS[11],
      withRef(sectionBody(s.otherDamages) || 'No other economic damages are claimed in this demand.', refs.damages),
    ],
    [SUPER_DEMAND_SECTION_HEADINGS[12], s.painAndSuffering],
    [
      SUPER_DEMAND_SECTION_HEADINGS[13],
      [
        ...s.damagesSummary.filter((l) => !(totals.lostWages === 0 && /^- Lost wages: To be documented$/.test(l))),
        '',
        `Total damages: ${money(Math.max(totals.demand, totals.specials))}`,
      ].join('\n'),
    ],
    [SUPER_DEMAND_SECTION_HEADINGS[14], s.demandParagraph],
    [
      SUPER_DEMAND_SECTION_HEADINGS[15],
      [
        s.goodFaithParagraph.replace('thirty (30) days', `${responseDays === 30 ? 'thirty (30)' : responseDays} days`),
        'Please include with your response a copy of the declarations page for every policy that may apply to this loss.',
        'Nothing in this letter waives any claim, right, or remedy, all of which are expressly reserved. Any lien or reimbursement claim will be resolved from the settlement proceeds as required by law.',
        '',
        s.closing,
      ].join('\n\n'),
    ],
    [SUPER_DEMAND_SECTION_HEADINGS[16], enclosureLines.join('\n')],
  ]

  return [
    SUPER_DEMAND_TITLE,
    SUPER_DEMAND_SUBTITLE,
    SUPER_DEMAND_CONFIDENTIAL,
    '',
    ...s.recipientBlock,
    '',
    s.reLine,
    '',
    s.salutation,
    ...sectionsText.flatMap(([heading, body]) => ['', heading, (body || '').trim()]),
    '',
    s.disclaimer,
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---------------------------------------------------------------------------
// Demand Intelligence (attorney only)
// ---------------------------------------------------------------------------

export type ConfidenceLevel = 'green' | 'yellow' | 'orange' | 'red'
export type CheckStatus = 'pass' | 'warn' | 'fail'

export interface ReadinessFactor {
  key: string
  label: string
  score: number
  max: number
  note: string
}

export interface DemandWeakness {
  key: string
  severity: 'high' | 'medium' | 'low'
  title: string
  detail: string
  mitigation: string
}

export interface StatementConfidence {
  key: string
  section: string
  statement: string
  level: ConfidenceLevel
  basis: string
}

export interface QualityCheck {
  key: string
  label: string
  status: CheckStatus
  detail: string
  items?: string[]
}

export interface ApprovalGateItem {
  key: string
  label: string
  checked: boolean
  checkedByName: string | null
  checkedAt: string | null
}

export interface DemandIntelligence {
  readiness: { score: number; band: 'ready' | 'nearly_ready' | 'needs_work' | 'not_ready'; factors: ReadinessFactor[] }
  valuation: {
    p25: number | null
    expected: number | null
    p75: number | null
    source: SuperDemandValuation['source']
    specials: number
    general: number
    demand: number
    currentOffer: number | null
    demandToExpected: number | null
    offerToDemand: number | null
    demandMultipleOfSpecials: number | null
    position: 'below_range' | 'in_range' | 'above_range' | 'unknown'
  }
  weaknesses: DemandWeakness[]
  statementConfidence: StatementConfidence[]
  qualityCheck: QualityCheck[]
  approvalGate: { items: ApprovalGateItem[]; complete: boolean; signedVersion: number | null; stale: boolean }
}

export const APPROVAL_GATE_ITEMS: Array<{ key: string; label: string }> = [
  { key: 'facts_reviewed', label: 'I reviewed the statement of facts and liability analysis for accuracy.' },
  { key: 'medical_reviewed', label: 'The injuries, diagnoses and treatment chronology match the medical records.' },
  { key: 'damages_reconciled', label: 'Every damages figure reconciles to the bills, wage records and other proof.' },
  { key: 'exhibits_verified', label: 'The exhibits are complete, correctly numbered, and belong to this client.' },
  { key: 'confidence_reviewed', label: 'Every Orange and Red statement was supported, softened, or removed.' },
  { key: 'demand_authorized', label: 'The client authorized this demand amount, and I approve sending it.' },
]

export type StoredApprovalGate = {
  version: number | null
  items: Record<string, { checked: boolean; byName: string | null; at: string | null }>
}

export function parseApprovalGate(raw: string | null | undefined): StoredApprovalGate {
  if (!raw) return { version: null, items: {} }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.items && typeof parsed.items === 'object') {
      return { version: typeof parsed.version === 'number' ? parsed.version : null, items: parsed.items }
    }
  } catch {
    /* fall through */
  }
  return { version: null, items: {} }
}

/**
 * The gate signs one version of the letter. Any later edit or redraft makes it
 * stale, because the attorney approved words that are no longer the letter.
 */
export function summarizeApprovalGate(raw: string | null | undefined, currentVersion: number) {
  const stored = parseApprovalGate(raw)
  const stale = stored.version !== null && stored.version !== currentVersion
  const items: ApprovalGateItem[] = APPROVAL_GATE_ITEMS.map((item) => {
    const entry = stale ? undefined : stored.items[item.key]
    return {
      key: item.key,
      label: item.label,
      checked: Boolean(entry?.checked),
      checkedByName: entry?.checked ? entry.byName ?? null : null,
      checkedAt: entry?.checked ? entry.at ?? null : null,
    }
  })
  return { items, complete: items.every((i) => i.checked), signedVersion: stored.version, stale }
}

export function updateApprovalGate(
  raw: string | null | undefined,
  currentVersion: number,
  changes: Record<string, boolean>,
  actorName: string | null,
): StoredApprovalGate {
  const stored = parseApprovalGate(raw)
  const base = stored.version === currentVersion ? stored.items : {}
  const next: StoredApprovalGate = { version: currentVersion, items: { ...base } }
  const now = new Date().toISOString()
  for (const item of APPROVAL_GATE_ITEMS) {
    if (!(item.key in changes)) continue
    next.items[item.key] = changes[item.key]
      ? { checked: true, byName: actorName, at: now }
      : { checked: false, byName: null, at: null }
  }
  return next
}

const DAY = 24 * 60 * 60 * 1000

function exhibitsIn(ctx: SuperDemandContext, ...sections: ExhibitSection[]): number {
  return (ctx.caseRecord.exhibits ?? []).filter((e) => sections.includes(e.section)).length
}

function treatmentGaps(visits: Array<{ date: Date; provider: string }>, thresholdDays = 30) {
  const gaps: Array<{ from: Date; to: Date; days: number }> = []
  for (let i = 1; i < visits.length; i += 1) {
    const days = Math.round((visits[i].date.getTime() - visits[i - 1].date.getTime()) / DAY)
    if (days > thresholdDays) gaps.push({ from: visits[i - 1].date, to: visits[i].date, days })
  }
  return gaps
}

function incidentDateOf(ctx: SuperDemandContext): Date | null {
  const raw = ctx.facts?.incident?.date
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

function readinessBand(score: number): DemandIntelligence['readiness']['band'] {
  if (score >= 85) return 'ready'
  if (score >= 70) return 'nearly_ready'
  if (score >= 50) return 'needs_work'
  return 'not_ready'
}

function buildReadiness(ctx: SuperDemandContext): DemandIntelligence['readiness'] {
  const record = ctx.caseRecord
  const liability = record.liability
  const totals = totalsOf(ctx)
  const visits = treatmentVisits(ctx)
  const factors: ReadinessFactor[] = []

  {
    let score = 0
    const notes: string[] = []
    if (liability?.faultTheory?.trim()) { score += 6; notes.push('fault theory written') }
    if (liability?.policeReportStatus === 'received') { score += 5; notes.push('police report received') }
    if (liability?.faultPosture === 'admitted') { score += 4; notes.push('fault admitted') }
    if (exhibitsIn(ctx, 'liability') > 0) { score += 5; notes.push(`${exhibitsIn(ctx, 'liability')} liability exhibit(s)`) }
    factors.push({ key: 'liability', label: 'Liability documentation', score: Math.min(score, 20), max: 20, note: notes.join(', ') || 'No liability record or exhibits yet' })
  }
  {
    let score = 0
    if (visits.length > 0) score += 10
    if (exhibitsIn(ctx, 'treatment') > 0) score += 10
    factors.push({
      key: 'medical_records',
      label: 'Medical records',
      score,
      max: 20,
      note: `${visits.length} dated visit(s), ${exhibitsIn(ctx, 'treatment')} medical record exhibit(s)`,
    })
  }
  {
    const itemized = (record.damageItems ?? []).filter((i) => i.category === 'medical').length > 0 || ctx.ledger.totalBilled > 0
    let score = 0
    if (totals.medical > 0) score += 5
    if (itemized) score += 5
    if (exhibitsIn(ctx, 'bills') > 0) score += 5
    factors.push({
      key: 'bills',
      label: 'Itemized medical specials',
      score,
      max: 15,
      note: totals.medical > 0 ? `${money(totals.medical)} in medical charges${exhibitsIn(ctx, 'bills') ? '' : ', no bill exhibits'}` : 'No medical charges recorded',
    })
  }
  {
    const status = record.medical?.status
    const done = status?.mmi || ['completed', 'discharged', 'mmi'].includes(String(status?.treatmentStatus || ''))
    const score = done ? 10 : status?.treatmentStatus === 'treating' ? 4 : 6
    factors.push({
      key: 'treatment_status',
      label: 'Treatment complete / MMI',
      score,
      max: 10,
      note: done ? 'Treatment complete or at MMI' : status?.treatmentStatus === 'treating' ? 'Client is still treating' : 'Treatment status not recorded',
    })
  }
  {
    const claimed = totals.lostWages > 0
    const documented = exhibitsIn(ctx, 'wages') > 0
    factors.push({
      key: 'wages',
      label: 'Wage-loss documentation',
      score: !claimed ? 10 : documented ? 10 : 3,
      max: 10,
      note: !claimed ? 'No wage loss claimed' : documented ? 'Wage loss documented' : 'Wage loss claimed without documentation',
    })
  }
  {
    let score = 0
    if (record.claim?.carrierName) score += 4
    if (record.claim?.claimNumber) score += 3
    if (record.claim?.adjusterName) score += 3
    factors.push({
      key: 'claim_info',
      label: 'Carrier and claim details',
      score,
      max: 10,
      note: [record.claim?.carrierName, record.claim?.claimNumber, record.claim?.adjusterName].filter(Boolean).join(' / ') || 'No carrier claim on file',
    })
  }
  {
    const v = ctx.valuation
    let score = 0
    let note = 'No model valuation for this case'
    if (v?.expected && v.expected > 0) {
      score = 5
      const ratio = totals.demand / v.expected
      if (ratio >= 0.9 && ratio <= 2.5) score = 10
      note = `Demand is ${ratio.toFixed(1)}x the expected value`
    }
    factors.push({ key: 'valuation', label: 'Valuation support', score, max: 10, note })
  }
  {
    const signed = Boolean(record.attorney?.name)
    const named = Boolean(record.clientName)
    factors.push({
      key: 'identity',
      label: 'Client and signing attorney',
      score: (signed ? 3 : 0) + (named ? 2 : 0),
      max: 5,
      note: [named ? 'client named' : 'client name missing', signed ? 'attorney signature block' : 'no assigned attorney'].join(', '),
    })
  }

  const score = Math.round(factors.reduce((s, f) => s + f.score, 0))
  return { score, band: readinessBand(score), factors }
}

function buildValuation(ctx: SuperDemandContext): DemandIntelligence['valuation'] {
  const totals = totalsOf(ctx)
  const v = ctx.valuation
  const expected = v?.expected && v.expected > 0 ? v.expected : null
  const p25 = v?.p25 && v.p25 > 0 ? v.p25 : null
  const p75 = v?.p75 && v.p75 > 0 ? v.p75 : null
  const offer = ctx.currentOffer && ctx.currentOffer > 0 ? ctx.currentOffer : null
  let position: DemandIntelligence['valuation']['position'] = 'unknown'
  if (p25 && p75) position = totals.demand < p25 ? 'below_range' : totals.demand > p75 * 1.5 ? 'above_range' : 'in_range'
  return {
    p25,
    expected,
    p75,
    source: v?.source ?? null,
    specials: totals.specials,
    general: totals.general,
    demand: totals.demand,
    currentOffer: offer,
    demandToExpected: expected ? Number((totals.demand / expected).toFixed(2)) : null,
    offerToDemand: offer && totals.demand > 0 ? Number((offer / totals.demand).toFixed(2)) : null,
    demandMultipleOfSpecials: totals.specials > 0 ? Number((totals.demand / totals.specials).toFixed(2)) : null,
    position,
  }
}

function buildWeaknesses(ctx: SuperDemandContext): DemandWeakness[] {
  const out: DemandWeakness[] = []
  const record = ctx.caseRecord
  const liability = record.liability
  const totals = totalsOf(ctx)
  const visits = treatmentVisits(ctx)
  const comparative = liability?.comparativeNegPct != null ? Number(liability.comparativeNegPct) : 0

  if (comparative > 0) {
    out.push({
      key: 'comparative_fault',
      severity: comparative >= 25 ? 'high' : 'medium',
      title: `Comparative fault of ${Math.round(comparative)}% is on the record`,
      detail: 'The adjuster will reduce the offer by at least this share and may argue for more.',
      mitigation: 'Address it directly in the liability analysis with the evidence that limits the allocation.',
    })
  }
  if (liability && liability.policeReportStatus !== 'received' && exhibitsIn(ctx, 'liability') === 0) {
    out.push({
      key: 'no_liability_proof',
      severity: 'high',
      title: 'No police report or liability exhibits',
      detail: 'Liability rests on the narrative alone.',
      mitigation: 'Obtain the police report, scene photos, or witness statements before sending.',
    })
  }
  const incident = incidentDateOf(ctx)
  if (incident && visits.length) {
    const delay = Math.round((visits[0].date.getTime() - incident.getTime()) / DAY)
    if (delay > 7) {
      out.push({
        key: 'delayed_treatment',
        severity: delay > 30 ? 'high' : 'medium',
        title: `First treatment ${delay} days after the incident`,
        detail: 'Carriers argue a delay means the injury was minor or caused by something else.',
        mitigation: 'Explain the delay (symptom onset, access to care) and cite records documenting early complaints.',
      })
    }
  }
  for (const gap of treatmentGaps(visits)) {
    out.push({
      key: `gap_${gap.from.toISOString().slice(0, 10)}`,
      severity: gap.days > 90 ? 'high' : 'medium',
      title: `${gap.days}-day gap in treatment`,
      detail: `No treatment between ${longDate(gap.from)} and ${longDate(gap.to)}.`,
      mitigation: 'Document the reason for the gap (home exercise program, scheduling, insurance) in the chronology.',
    })
  }
  const status = record.medical?.status
  if (status?.treatmentStatus === 'treating' && !status?.mmi) {
    out.push({
      key: 'still_treating',
      severity: 'medium',
      title: 'Client is still treating',
      detail: 'Damages are not final; a demand now may undervalue the claim.',
      mitigation: 'Include a supported future-care projection, or hold the demand until MMI.',
    })
  }
  if (totals.lostWages > 0 && exhibitsIn(ctx, 'wages') === 0) {
    out.push({
      key: 'undocumented_wages',
      severity: 'medium',
      title: 'Wage loss claimed without documentation',
      detail: `${money(totals.lostWages)} in lost wages has no employer letter or pay records attached.`,
      mitigation: 'Attach an employer wage-verification letter or pay stubs.',
    })
  }
  if (totals.specials > 0 && totals.demand / totals.specials > 10) {
    out.push({
      key: 'high_multiple',
      severity: 'low',
      title: `Demand is ${(totals.demand / totals.specials).toFixed(1)}x the economic damages`,
      detail: 'A high multiple invites a low first offer unless the injury severity is well documented.',
      mitigation: 'Support the non-economic damages with specifics: duration, limitations, and lasting effects.',
    })
  }
  if (totals.medical === 0) {
    out.push({
      key: 'no_specials',
      severity: 'high',
      title: 'No medical charges recorded',
      detail: 'Without specials there is no anchor for the demand.',
      mitigation: 'Enter the itemized medical bills on the Damages tab.',
    })
  }
  const order = { high: 0, medium: 1, low: 2 }
  return out.sort((a, b) => order[a.severity] - order[b.severity])
}

function buildStatementConfidence(ctx: SuperDemandContext): StatementConfidence[] {
  const record = ctx.caseRecord
  const liability = record.liability
  const totals = totalsOf(ctx)
  const out: StatementConfidence[] = []
  const add = (key: string, section: string, statement: string, level: ConfidenceLevel, basis: string) =>
    out.push({ key, section, statement, level, basis })

  // Green: a document backs it. Yellow: the attorney entered it on the case.
  // Orange: only the claimant said it. Red: nothing in the record supports it.
  const narrative = String(ctx.facts?.incident?.narrative || '').trim()
  add(
    'facts',
    'IV. Statement of Facts',
    'How the incident happened',
    exhibitsIn(ctx, 'liability') > 0 ? 'green' : liability?.faultTheory ? 'yellow' : narrative ? 'orange' : 'red',
    exhibitsIn(ctx, 'liability') > 0
      ? 'Corroborated by liability exhibits'
      : liability?.faultTheory
        ? 'Attorney-entered liability record'
        : narrative
          ? 'Claimant intake narrative only'
          : 'No narrative on the case; default text used',
  )
  add(
    'liability',
    'V. Liability Analysis',
    'Your insured was at fault',
    liability?.faultPosture === 'admitted' || liability?.policeReportStatus === 'received'
      ? 'green'
      : liability?.faultTheory
        ? 'yellow'
        : narrative
          ? 'orange'
          : 'red',
    liability?.faultPosture === 'admitted'
      ? 'Fault admitted'
      : liability?.policeReportStatus === 'received'
        ? 'Police report received'
        : liability?.faultTheory
          ? 'Attorney fault theory, no report'
          : 'Boilerplate liability paragraph',
  )
  if (liability?.policeReportStatus) {
    add(
      'police_report',
      'VI. Evidence Supporting Liability',
      'The police report documents the incident',
      liability.policeReportStatus === 'received' ? (exhibitsIn(ctx, 'liability') > 0 ? 'green' : 'yellow') : 'red',
      liability.policeReportStatus === 'received' ? 'Report status: received' : `Report status: ${liability.policeReportStatus}`,
    )
  }
  if (liability?.witnessCount || liability?.hasWitnesses) {
    add('witnesses', 'VI. Evidence Supporting Liability', 'Independent witnesses corroborate the account', exhibitsIn(ctx, 'liability') > 0 ? 'green' : 'yellow', 'Witnesses recorded on the liability tab')
  }
  const diagnoses = diagnosesOf(ctx)
  const injuries = describeInjuries(ctx.facts)
  add(
    'injuries',
    'VII. Injuries and Diagnoses',
    'The injuries and diagnoses listed',
    diagnoses.length && exhibitsIn(ctx, 'treatment') > 0 ? 'green' : diagnoses.length ? 'yellow' : injuries.length ? 'orange' : 'red',
    diagnoses.length ? `${diagnoses.length} provider diagnosis(es)${exhibitsIn(ctx, 'treatment') ? ' with records' : ', no record exhibits'}` : injuries.length ? 'Claimant-reported injuries only' : 'No injuries recorded',
  )
  const visits = treatmentVisits(ctx)
  add(
    'chronology',
    'VIII. Medical Treatment Chronology',
    'The treatment dates and providers',
    visits.length && exhibitsIn(ctx, 'treatment') > 0 ? 'green' : visits.length ? 'yellow' : 'red',
    visits.length ? `${visits.length} dated visit(s)` : 'No dated visits; records-on-request language used',
  )
  add(
    'specials',
    'IX. Medical Specials',
    `Medical charges of ${money(totals.medical)}`,
    totals.medical > 0 && exhibitsIn(ctx, 'bills') > 0 ? 'green' : totals.medical > 0 ? 'yellow' : 'red',
    totals.medical > 0 ? (exhibitsIn(ctx, 'bills') > 0 ? 'Itemized and backed by bill exhibits' : 'Entered amounts, no bill exhibits') : 'No charges recorded',
  )
  if (totals.futureMedical > 0 || record.medical?.status?.futureTreatment) {
    add(
      'future_medical',
      'X. Future Medical Care',
      totals.futureMedical > 0 ? `Future care of ${money(totals.futureMedical)}` : 'Recommended future care',
      record.medical?.status?.futureTreatment && totals.futureMedical > 0 ? 'yellow' : 'orange',
      record.medical?.status?.futureTreatment ? 'Provider recommendation recorded' : 'Projection without a recorded recommendation',
    )
  }
  if (totals.lostWages > 0) {
    add(
      'wages',
      'XI. Lost Wages',
      `Lost wages of ${money(totals.lostWages)}`,
      exhibitsIn(ctx, 'wages') > 0 ? 'green' : (record.damageItems ?? []).some((i) => i.category === 'lost_wages') ? 'yellow' : 'orange',
      exhibitsIn(ctx, 'wages') > 0 ? 'Wage documentation enclosed' : 'No wage documentation enclosed',
    )
  }
  if (totals.otherEconomic > 0) {
    add('other_damages', 'XII. Other Economic Damages', `Other economic losses of ${money(totals.otherEconomic)}`, exhibitsIn(ctx, 'damages') > 0 ? 'green' : 'yellow', exhibitsIn(ctx, 'damages') > 0 ? 'Supporting exhibits enclosed' : 'Entered amounts only')
  }
  const status = record.medical?.status
  add(
    'non_economic',
    'XIII. Non-Economic Damages',
    'Pain, suffering and loss of enjoyment',
    (status?.symptoms ?? []).length && visits.length ? 'yellow' : visits.length ? 'orange' : 'red',
    (status?.symptoms ?? []).length ? 'Ongoing symptoms recorded' : 'General description; add specifics from the client',
  )
  const expected = ctx.valuation?.expected
  add(
    'demand',
    'XV. Settlement Demand',
    `Demand of ${money(totals.demand)}`,
    !expected ? 'orange' : totals.demand <= (ctx.valuation?.p75 ?? expected) * 2.5 ? 'green' : 'yellow',
    expected ? `Model expected value ${money(expected)}` : 'No model valuation to compare against',
  )
  return out
}

function buildQualityCheck(ctx: SuperDemandContext, content: string): QualityCheck[] {
  const checks: QualityCheck[] = []
  const record = ctx.caseRecord
  const totals = totalsOf(ctx)
  const exhibits = record.exhibits ?? []

  {
    const lines = content.split(/\r?\n/).map((l) => l.trim())
    const missing = SUPER_DEMAND_SECTION_HEADINGS.filter((h) => !lines.includes(h))
    const placeholders = PLACEHOLDER_PATTERNS.filter((p) => p.test(content)).map((p) => p.source.replace(/\\/g, ''))
    checks.push({
      key: 'completeness',
      label: 'Section completeness',
      status: missing.length ? 'fail' : placeholders.length ? 'warn' : 'pass',
      detail: missing.length
        ? `${missing.length} of 17 sections are missing from the letter.`
        : placeholders.length
          ? 'All 17 sections are present, but some still contain placeholder text.'
          : 'All 17 sections are present and filled in.',
      items: [...missing, ...placeholders.map((p) => `Placeholder: "${p}"`)],
    })
  }
  {
    const issues: string[] = []
    const items = record.damageItems ?? []
    if (items.length) {
      const sum = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
      const accounted = totals.medical + totals.futureMedical + totals.lostWages + totals.otherEconomic
      if (Math.round(sum) !== Math.round(accounted)) issues.push(`Itemized damages total ${money(sum)} but the letter accounts for ${money(accounted)}.`)
    }
    if (totals.specials > totals.demand) issues.push(`Economic damages (${money(totals.specials)}) exceed the demand (${money(totals.demand)}).`)
    if (totals.demand <= 0) issues.push('No demand amount is set.')
    checks.push({
      key: 'reconciliation',
      label: 'Damages reconciliation',
      status: issues.length ? 'fail' : 'pass',
      detail: issues.length ? 'The damages figures do not reconcile.' : `Specials ${money(totals.specials)} + general ${money(totals.general)} = demand ${money(totals.demand)}.`,
      items: issues,
    })
  }
  {
    const issues: string[] = []
    const incident = incidentDateOf(ctx)
    const now = Date.now()
    for (const e of record.medical?.entries ?? []) {
      if (e.isFuture) continue
      if (!e.startDate) { issues.push(`${e.provider}: visit has no date.`); continue }
      const d = new Date(e.startDate).getTime()
      if (incident && d < incident.getTime() - DAY) issues.push(`${e.provider}: ${longDate(e.startDate)} is before the date of loss.`)
      if (d > now + DAY) issues.push(`${e.provider}: ${longDate(e.startDate)} is in the future but not marked as future care.`)
    }
    checks.push({
      key: 'chronology',
      label: 'Chronology',
      status: issues.length ? 'fail' : 'pass',
      detail: issues.length ? 'Some treatment dates are missing or impossible.' : 'Treatment dates are complete and consistent with the date of loss.',
      items: issues,
    })
  }
  {
    const gaps = treatmentGaps(treatmentVisits(ctx))
    checks.push({
      key: 'gaps',
      label: 'Treatment gaps',
      status: gaps.length ? 'warn' : 'pass',
      detail: gaps.length ? `${gaps.length} gap(s) longer than 30 days.` : 'No gaps longer than 30 days.',
      items: gaps.map((g) => `${g.days} days: ${longDate(g.from)} to ${longDate(g.to)}`),
    })
  }
  {
    const seen = new Map<string, number>()
    for (const i of record.damageItems ?? []) {
      const when = i.incurredAt ? new Date(i.incurredAt as any).toISOString().slice(0, 10) : ''
      const key = `${i.category}|${(i.provider || '').toLowerCase()}|${when}|${Math.round(Number(i.amount) || 0)}`
      seen.set(key, (seen.get(key) || 0) + 1)
    }
    const dups = [...seen.entries()].filter(([, n]) => n > 1).map(([k, n]) => {
      const [cat, provider, when, amount] = k.split('|')
      return `${n}\u00d7 ${provider || cat} ${when ? `on ${when} ` : ''}for ${money(Number(amount))}`
    })
    checks.push({
      key: 'duplicates',
      label: 'Duplicate charges',
      status: dups.length ? 'warn' : 'pass',
      detail: dups.length ? 'Possible duplicate charges would overstate the specials.' : 'No duplicate charges found.',
      items: dups,
    })
  }
  {
    const issues: string[] = []
    const visits = treatmentVisits(ctx)
    if (visits.length && exhibitsIn(ctx, 'treatment') === 0) issues.push('Treatment is described but no medical records are enclosed.')
    if (totals.medical > 0 && exhibitsIn(ctx, 'bills') === 0) issues.push('Medical charges are claimed but no bills are enclosed.')
    if (totals.lostWages > 0 && exhibitsIn(ctx, 'wages') === 0) issues.push('Lost wages are claimed but no wage documentation is enclosed.')
    if (record.liability?.policeReportStatus === 'received' && exhibitsIn(ctx, 'liability') === 0) issues.push('The police report is cited but not enclosed.')
    checks.push({
      key: 'missing_records',
      label: 'Missing records',
      status: issues.length ? (visits.length && exhibitsIn(ctx, 'treatment') === 0 ? 'fail' : 'warn') : 'pass',
      detail: issues.length ? 'Claims in the letter are not backed by enclosed records.' : 'Every claimed category has supporting records enclosed.',
      items: issues,
    })
  }
  {
    const allowed = new Set<string>(['$0'])
    for (const n of [
      totals.medical, totals.futureMedical, totals.lostWages, totals.earningCapacity, totals.otherEconomic,
      totals.specials, totals.general, totals.demand, Math.max(totals.demand, totals.specials), ctx.ledger.totalBilled,
      ...(record.damageItems ?? []).map((i) => Number(i.amount) || 0),
      ...(record.medical?.entries ?? []).map((e) => Number(e.billedAmount) || 0),
      ...ctx.ledger.entries.map((e) => Number(e.billedAmount) || 0),
    ]) {
      if (n > 0) for (const m of moneyMentions(money(n))) allowed.add(m)
    }
    // Explicit dollar amounts only: bare figures in a letter are mostly years,
    // claim numbers and report numbers.
    const unknown = [
      ...new Set((content.match(/\$[\d,]+(?:\.\d+)?/g) || []).map((m) => `$${Math.round(Number(m.replace(/[$,]/g, '')))}`)),
    ].filter((m) => !allowed.has(m))
    checks.push({
      key: 'unsupported_assertions',
      label: 'Unsupported assertions',
      status: unknown.length ? 'warn' : 'pass',
      detail: unknown.length ? 'The letter mentions amounts that are not in the case record.' : 'Every dollar amount in the letter traces to the case record.',
      items: unknown.map((m) => `${m} is not in the case record`),
    })
  }
  {
    const enclosed = new Set(exhibits.map((e) => String(e.number)))
    const cited = new Set<string>()
    for (const m of content.matchAll(/See Exhibits? ([\d,\s\u2013-]+)/g)) {
      for (const part of m[1].split(',')) {
        const [a, b] = part.trim().split(/[\u2013-]/).map((x) => Number(x))
        if (!Number.isFinite(a)) continue
        for (let n = a; n <= (Number.isFinite(b) ? b : a); n += 1) cited.add(String(n))
      }
    }
    const missing = [...cited].filter((n) => !enclosed.has(n)).map((n) => `Exhibit ${n} is cited but not enclosed`)
    const uncited = [...enclosed].filter((n) => !cited.has(n)).map((n) => `Exhibit ${n} is enclosed but never cited`)
    checks.push({
      key: 'exhibits',
      label: 'Exhibit references',
      status: missing.length ? 'fail' : uncited.length ? 'warn' : exhibits.length ? 'pass' : 'warn',
      detail: missing.length
        ? 'The letter cites exhibits that are not enclosed.'
        : uncited.length
          ? 'Some exhibits are enclosed without being cited in the letter.'
          : exhibits.length
            ? `${exhibits.length} exhibit(s) enclosed and cited.`
            : 'No exhibits are enclosed.',
      items: [...missing, ...uncited],
    })
  }
  return checks
}

export function analyzeDemandIntelligence(
  ctx: SuperDemandContext,
  letter: { content: string; currentVersion: number; approvalChecklist?: string | null },
): DemandIntelligence {
  return {
    readiness: buildReadiness(ctx),
    valuation: buildValuation(ctx),
    weaknesses: buildWeaknesses(ctx),
    statementConfidence: buildStatementConfidence(ctx),
    qualityCheck: buildQualityCheck(ctx, letter.content),
    approvalGate: summarizeApprovalGate(letter.approvalChecklist, letter.currentVersion),
  }
}

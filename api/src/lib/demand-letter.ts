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
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
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

export interface BuildDemandLetterInput {
  assessment: any
  facts: any
  targetAmount: number
  recipient: any
  message?: string
  mode?: DemandMode
  treatmentLedger?: TreatmentLedger
  analysis?: any
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
}: BuildDemandLetterInput): DemandLetterSections {
  const ledger: TreatmentLedger = treatmentLedger ?? EMPTY_TREATMENT_LEDGER

  const incidentDate = facts.incident?.date || 'the date of the incident'
  const narrative = facts.incident?.narrative || 'the incident described in our client\u2019s claim'
  const venue =
    `${assessment.venueState || ''}${assessment.venueCounty ? `, ${assessment.venueCounty}` : ''}`.trim() ||
    'the applicable jurisdiction'

  const d = facts.damages || {}
  // Medical specials: prefer the structured damages ledger (written into
  // facts.damages.medical/med_charges), then the referral ledger total, then
  // self-reported. Once the Phase-B ledger has items, it is authoritative.
  const ledgerMedical = Number(d.medical ?? d.med_charges ?? 0)
  const medicalTotal = ledgerMedical > 0 ? ledgerMedical : ledger.totalBilled > 0 ? ledger.totalBilled : Number(d.med_charges || 0)
  const lostWages = Number(d.lostWages ?? d.wage_loss ?? d.estimated_wage_loss ?? 0)
  const futureMedical = Number(d.futureMedical ?? d.future_medical ?? d.estimated_future_med_charges ?? 0)
  // Other economic damages the structured ledger tracks (property, out-of-pocket,
  // future non-medical costs, lost earning capacity), rolled into facts.damages.other.
  const otherEconomic = Number(d.other ?? 0)

  // General (pain & suffering) damages: derive from the demand less specials,
  // or fall back to the analysis's pain/suffering valuation split.
  const specials = medicalTotal + lostWages + futureMedical + otherEconomic
  const painSufferingSplit = Number(analysis?.valuationBreakdown?.damageSplits?.painSuffering || 0)
  const generalDamages =
    targetAmount > specials ? targetAmount - specials : painSufferingSplit > 0 ? painSufferingSplit : 0

  // Liability narrative: prefer an explicit message, then the structured
  // liability record's fault theory (Phase B), then the saved analysis, then a
  // clear-liability default.
  const liabilityRecord = facts.liabilityRecord && typeof facts.liabilityRecord === 'object' ? facts.liabilityRecord : null
  const comparativePct = Math.round(Number(facts.liability?.comparativeNegligence || 0) * 100)
  const defendantName = liabilityRecord?.defendantName ? String(liabilityRecord.defendantName) : 'your insured'
  const baseLiabilityText =
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
  const treatmentSpanClause =
    ledger.firstVisit && ledger.lastVisit
      ? ` Our client underwent ${ledger.entries.length} documented treatment encounter${ledger.entries.length === 1 ? '' : 's'} between ${longDate(ledger.firstVisit)} and ${longDate(ledger.lastVisit)}.`
      : ''
  const painSufferingNarrative =
    (analysis?.demandPackage?.damageSummary && String(analysis.demandPackage.damageSummary).trim()) || ''

  const medicalLine =
    ledger.totalBilled > 0
      ? `- Medical bills (itemized from ${ledger.entries.length} encounter${ledger.entries.length === 1 ? '' : 's'}): ${money(medicalTotal)}`
      : `- Medical expenses: ${medicalTotal > 0 ? money(medicalTotal) : 'To be documented'}`
  const damagesLines = [
    medicalLine,
    `- Lost wages: ${lostWages > 0 ? money(lostWages) : 'To be documented'}`,
    futureMedical > 0 ? `- Future medical expenses: ${money(futureMedical)}` : null,
    otherEconomic > 0 ? `- Other economic damages (property, out-of-pocket, future costs): ${money(otherEconomic)}` : null,
    `- Pain and suffering (general damages): ${generalDamages > 0 ? money(generalDamages) : 'See above'}`,
  ].filter(Boolean) as string[]

  const isPro = mode === 'pro_se'
  const voice = {
    weI: isPro ? 'I' : 'we',
    ourMy: isPro ? 'my' : 'our client\u2019s',
    clientSubject: isPro ? 'I' : 'our client',
  }

  return {
    header: isPro ? 'SETTLEMENT DEMAND' : 'DEMAND LETTER',
    recipientBlock: [`${recipient.name}`, `${recipient.address}`],
    reLine: `Re: Personal Injury Claim — Date of Incident ${incidentDate}`,
    salutation: `Dear ${recipient.name},`,
    intro: isPro
      ? `I am writing on my own behalf regarding my personal injury claim arising from an incident that occurred on or about ${incidentDate} in ${venue}.`
      : `We represent the above-referenced client in connection with a personal injury claim arising from an incident that occurred on or about ${incidentDate} in ${venue}. This letter constitutes our formal demand for settlement.`,
    accidentSummary: narrative,
    liability: liabilityText,
    treatmentTimeline: buildTreatmentTimelineSection(ledger, analysis, facts),
    medicalBills: [
      'TOTAL MEDICAL BILLS',
      ledger.totalBilled > 0
        ? `The itemized treatment records above reflect total medical charges of ${money(ledger.totalBilled)} to date. Complete billing statements and records are enclosed or available upon request.`
        : `Total medical charges to date are ${medicalTotal > 0 ? money(medicalTotal) : 'being compiled'}. Itemized billing statements and records are available upon request.`,
    ].join('\n'),
    lostWages: [
      'LOST WAGES',
      lostWages > 0
        ? `${voice.clientSubject} incurred ${money(lostWages)} in lost earnings as a result of this incident and the resulting treatment and recovery. Wage-loss documentation (employer verification and/or pay records) is available upon request and incorporated herein by reference.`
        : `${voice.clientSubject} experienced lost time from work as a result of this incident. Supporting wage-loss documentation will be provided.`,
    ].join('\n'),
    painAndSuffering: [
      `${injuryClause}${treatmentSpanClause} These injuries caused our client substantial physical pain, emotional distress, and disruption to daily activities, work, and quality of life. The course of treatment, the nature of the injuries, and their ongoing effects fully justify a meaningful award for non-economic damages.`,
      painSufferingNarrative,
    ]
      .filter((s) => s && s.trim())
      .join('\n\n'),
    damagesSummary: damagesLines,
    demandParagraph: `Based on the liability of your insured and the nature and extent of ${voice.ourMy} injuries and damages, ${voice.weI} demand the sum of ${money(targetAmount)} to resolve this matter in full.`,
    goodFaithParagraph: `This demand is made in good faith and represents a reasonable assessment of the damages. Please respond within thirty (30) days of receipt of this letter. If this matter cannot be resolved through negotiation, ${voice.weI} ${isPro ? 'reserve' : 'are prepared to pursue'} all available legal remedies.`,
    closing: isPro
      ? `Sincerely,\n\n[Your Name]\n[Your Contact Information]`
      : `Very truly yours,\n\n[Attorney Name]\n[Law Firm Name]\n[Contact Information]`,
    disclaimer: isPro
      ? `This letter is for settlement purposes only. I understand I should consider attorney review before signing any release or resolving claims involving serious injury, minors, disputed liability, government entities, liens, permanent disability, or approaching legal deadlines.`
      : `This letter is for settlement purposes only and is not admissible in any subsequent litigation.`,
  }
}

/** Join the sections into the plain-text letter that gets stored and exported. */
export function renderDemandLetter(s: DemandLetterSections): string {
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
    '',
    s.treatmentTimeline,
    '',
    s.medicalBills,
    '',
    s.lostWages,
    '',
    'PAIN AND SUFFERING',
    s.painAndSuffering,
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

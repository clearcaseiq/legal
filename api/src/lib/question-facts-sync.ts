/**
 * Fold Intelligent Question answers (baseline damages/insurance + AI free-text)
 * into assessment facts so AI Case Summary underwriting / known chips move.
 *
 * Liability and medical keep their dedicated sync modules; this layer owns
 * damages, insurance, treatment-gap notes, AI classification, and orchestration.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { updateCaseFacts } from './case-facts'
import {
  parseAffirmative,
  applyQuestionAnswerToLiability,
  syncLiabilityFromSavedQuestionAnswers,
  liabilityPatchFromQuestionAnswer,
} from './question-liability-sync'
import {
  applyQuestionAnswerToMedical,
  syncMedicalFromSavedQuestionAnswers,
  parseSurgeryStatus,
  parseNeuroSymptoms,
} from './question-medical-sync'
import { upsertLiabilityRecord } from './liability-record'

function questionIdOf(questionKey: string): string {
  return questionKey.startsWith('base:') ? questionKey.slice('base:'.length) : questionKey
}

export function parseMoneyAmount(text: string): number | null {
  const t = String(text || '')
  // Prefer explicit currency / k-suffix so we don't match commas in "Yes, …".
  const currency = t.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(k\b)?/i)
  if (currency) {
    const n = Number(String(currency[1]).replace(/,/g, ''))
    if (!Number.isFinite(n) || n <= 0) return null
    return Math.round(currency[2] ? n * 1000 : n)
  }
  const withK = t.match(/\b([\d,]+(?:\.\d+)?)\s*k\b/i)
  if (withK) {
    const n = Number(String(withK[1]).replace(/,/g, ''))
    if (!Number.isFinite(n) || n <= 0) return null
    return Math.round(n * 1000)
  }
  const plain = t.match(/\b(\d{3,}(?:,\d{3})+(?:\.\d+)?|\d{4,}(?:\.\d+)?)\b/)
  if (!plain) return null
  const n = Number(String(plain[1]).replace(/,/g, ''))
  if (!Number.isFinite(n) || n < 100) return null
  return Math.round(n)
}

export function parsePolicyLimit(text: string): string | null {
  const t = String(text || '')
  const split = t.match(/\b(\d{2,3})\s*\/\s*(\d{2,3})\b/)
  if (split) return `${split[1]}/${split[2]}`
  const money = parseMoneyAmount(t)
  if (money && money >= 5000) return String(money)
  return null
}

export function parseCarrierName(text: string): string | null {
  const t = String(text || '').trim()
  if (!t) return null
  const known =
    t.match(
      /\b(state farm|geico|allstate|progressive|farmers|usaa|liberty mutual|nationwide|travelers|aaa|mercury|american family|hartford|csaa)\b/i,
    )?.[0] || null
  if (known) return known.replace(/\b\w/g, (c) => c.toUpperCase())
  const labeled = t.match(/(?:carrier|insurer|company)\s*(?:is|:)?\s*([A-Za-z][A-Za-z0-9 &.'-]{1,40})/i)
  if (labeled?.[1] && !/^(yes|no|unknown|not sure)\b/i.test(labeled[1])) return labeled[1].trim()
  if (parseAffirmative(t) != null) return null
  if (t.length <= 48 && !/\b(yes|no|claim|limit|policy)\b/i.test(t) && /^[A-Za-z]/.test(t)) return t
  return null
}

export function parseClaimNumber(text: string): string | null {
  const m = String(text || '').match(/\b(?:claim\s*(?:#|no\.?|number)?\s*|clm\s*)([A-Z0-9-]{5,})\b/i)
  return m?.[1] || null
}

type FactDomain =
  | 'damages_work'
  | 'damages_household'
  | 'damages_scar'
  | 'insurance'
  | 'medical'
  | 'liability'
  | 'treatment_gap'
  | null

export function classifyQuestionDomain(opts: {
  questionKey: string
  questionText?: string | null
  section?: string | null
  answer?: string | null
}): FactDomain {
  const id = questionIdOf(opts.questionKey)
  if (['auto_dmg_work', 'def_work', 'wk_duty', 'wd_dependents'].includes(id)) return 'damages_work'
  if (id === 'auto_dmg_household') return 'damages_household'
  if (id === 'dog_scarring') return 'damages_scar'
  if (id.startsWith('ins_') || id === 'wk_wc') return 'insurance'
  if (id === 'auto_med_gap') return 'treatment_gap'
  if (['auto_med_worse', 'auto_med_mri', 'def_worse'].includes(id)) return 'medical'
  if (
    id.startsWith('auto_liab_') ||
    id === 'def_fault' ||
    id === 'def_witness' ||
    ['dog_leashed', 'dog_prior', 'sf_warning', 'sf_witness'].includes(id)
  ) {
    return 'liability'
  }

  const blob = `${opts.section || ''} ${opts.questionText || ''} ${opts.answer || ''}`.toLowerCase()
  if (/missed work|lost (income|wages)|wage|time off|sick day|vacation|bonus|modified duty|off work/.test(blob)) {
    return 'damages_work'
  }
  if (/household|chores|hobbies|daily (impact|activ)|loss of enjoyment|activities you can no longer/.test(blob)) {
    return 'damages_household'
  }
  if (/scar|disfigure/.test(blob)) return 'damages_scar'
  if (/carrier|claim number|policy limit|um\/?uim|medpay|\bpip\b|declarations|adjuster|insurance/.test(blob)) {
    return 'insurance'
  }
  if (/treatment gap|gaps in treatment|stopped treating/.test(blob)) return 'treatment_gap'
  if (/surgery|mri|imaging|numb|tingl|headache|dizz|pain gotten worse|symptoms/.test(blob)) return 'medical'
  if (/cited|ticket|admit fault|apolog|witness|at[-\s]?fault|who was at fault/.test(blob)) return 'liability'

  const section = String(opts.section || '').toLowerCase()
  if (section.includes('damage')) return 'damages_work'
  if (section.includes('insurance')) return 'insurance'
  if (section.includes('medical')) return 'medical'
  if (section.includes('liability')) return 'liability'
  return null
}

interface DamagesInsurancePatch {
  missedWork?: boolean | null
  estimatedWageLoss?: number | null
  householdImpact?: boolean | null
  scarring?: boolean | null
  treatmentGap?: boolean | null
  treatmentGapNote?: string | null
  defendantCarrier?: string | null
  claimNumber?: string | null
  policyLimit?: string | null
  umUim?: boolean | null
  medPay?: boolean | null
  adjusterContacted?: boolean | null
  recordedStatement?: boolean | null
  declarationsRequested?: boolean | null
  insuranceNote?: string | null
}

function patchFromDomain(
  domain: FactDomain,
  questionKey: string,
  answer: string | null | undefined,
): DamagesInsurancePatch | null {
  if (!domain || domain === 'medical' || domain === 'liability') return null
  const text = String(answer || '').trim()
  const cleared = !text
  const yes = cleared ? null : parseAffirmative(text)

  if (domain === 'damages_work') {
    if (cleared || yes === false) return { missedWork: false, estimatedWageLoss: null }
    const money = parseMoneyAmount(text)
    return {
      missedWork: yes === true || money != null || /\b(missed|lost|off work|modified)\b/i.test(text),
      estimatedWageLoss: money,
    }
  }
  if (domain === 'damages_household') {
    if (cleared || yes === false) return { householdImpact: false }
    return { householdImpact: yes === true || yes === null }
  }
  if (domain === 'damages_scar') {
    if (cleared || yes === false) return { scarring: false }
    return { scarring: yes === true || /\bscar|disfigure/i.test(text) }
  }
  if (domain === 'treatment_gap') {
    if (cleared || yes === false) return { treatmentGap: false, treatmentGapNote: null }
    if (yes === true || /\bgap\b/i.test(text)) return { treatmentGap: true, treatmentGapNote: text }
    return { treatmentGapNote: text }
  }
  if (domain === 'insurance') {
    const id = questionIdOf(questionKey)
    if (cleared) {
      return {
        defendantCarrier: id === 'ins_carrier' ? null : undefined,
        claimNumber: id === 'ins_carrier' ? null : undefined,
        policyLimit: id === 'ins_limits' ? null : undefined,
        umUim: id === 'ins_um' ? null : undefined,
        medPay: id === 'ins_medpay' ? null : undefined,
        adjusterContacted: id === 'ins_adjuster' ? null : undefined,
        recordedStatement: id === 'ins_adjuster' ? null : undefined,
        declarationsRequested: id === 'ins_own_declarations' ? null : undefined,
      }
    }
    const patch: DamagesInsurancePatch = { insuranceNote: text }
    if (id === 'ins_um' || /\bum\b|uim|uninsured|underinsured/.test(text.toLowerCase())) {
      if (yes === false) patch.umUim = false
      else if (yes === true || /\b(have|carry|yes)\b/i.test(text)) patch.umUim = true
    }
    if (id === 'ins_medpay' || /\bmedpay|med pay|\bpip\b/.test(text.toLowerCase())) {
      if (yes === false) patch.medPay = false
      else if (yes === true || /\b(have|yes)\b/i.test(text)) patch.medPay = true
    }
    if (id === 'ins_adjuster' || /\badjuster|recorded statement/.test(text.toLowerCase())) {
      if (yes === false) {
        patch.adjusterContacted = false
        patch.recordedStatement = false
      } else {
        patch.adjusterContacted = true
        if (/\brecorded statement\b/i.test(text) && !/\b(no|did not|didn't)\b.*recorded/i.test(text)) {
          patch.recordedStatement = true
        }
      }
    }
    if (id === 'ins_own_declarations' || /declarations/.test(text.toLowerCase())) {
      patch.declarationsRequested = yes !== false
    }
    if (id === 'ins_limits' || /limit|policy/.test(text.toLowerCase())) {
      const lim = parsePolicyLimit(text)
      if (lim) patch.policyLimit = lim
      if (yes === false) patch.policyLimit = null
    }
    if (id === 'ins_carrier' || /carrier|claim|insur/.test(text.toLowerCase())) {
      const carrier = parseCarrierName(text)
      const claim = parseClaimNumber(text)
      if (carrier) patch.defendantCarrier = carrier
      if (claim) patch.claimNumber = claim
      if (yes === false) {
        patch.defendantCarrier = null
        patch.claimNumber = null
      }
    }
    // Generic AI insurance answers — only parse limits when the text is about limits.
    const carrier = parseCarrierName(text)
    const claim = parseClaimNumber(text)
    if (carrier) patch.defendantCarrier = carrier
    if (claim) patch.claimNumber = claim
    if (id === 'ins_limits' || /\b(limit|limits|policy limit)\b/i.test(text)) {
      const lim = parsePolicyLimit(text)
      if (lim) patch.policyLimit = lim
    }
    return patch
  }
  return null
}

/**
 * Apply the patch onto a facts document and return it.
 *
 * Pure, so the choke point owns reading, parsing and provenance — and so this
 * logic stays testable without a database.
 */
function applyDamagesInsurancePatch(facts: any, patch: DamagesInsurancePatch): any {
  const damages = { ...(facts.damages && typeof facts.damages === 'object' ? facts.damages : {}) }
  const insurance = { ...(facts.insurance && typeof facts.insurance === 'object' ? facts.insurance : {}) }

  if (patch.missedWork === false) {
    damages.missed_work = false
    if (damages.estimated_wage_loss_source === 'intelligent_question') {
      delete damages.estimated_wage_loss
      delete damages.estimated_wage_loss_source
    }
  } else if (patch.missedWork === true) {
    damages.missed_work = true
    const money = patch.estimatedWageLoss
    const current = Number(damages.wage_loss || damages.estimated_wage_loss || 0)
    if (money && money > current) {
      damages.estimated_wage_loss = money
      damages.estimated_wage_loss_source = 'intelligent_question'
    } else if (!current) {
      damages.estimated_wage_loss = 5000
      damages.estimated_wage_loss_source = 'intelligent_question'
    }
  } else if (patch.estimatedWageLoss && patch.estimatedWageLoss > 0) {
    const current = Number(damages.wage_loss || damages.estimated_wage_loss || 0)
    if (patch.estimatedWageLoss > current) {
      damages.estimated_wage_loss = patch.estimatedWageLoss
      damages.estimated_wage_loss_source = 'intelligent_question'
      damages.missed_work = true
    }
  }

  if (patch.householdImpact !== undefined) damages.household_impact = patch.householdImpact
  if (patch.scarring !== undefined) damages.scarring = patch.scarring
  if (patch.treatmentGap === false) {
    damages.treatment_gap = false
    delete damages.treatment_gap_note
  } else if (patch.treatmentGap === true) {
    damages.treatment_gap = true
    if (patch.treatmentGapNote) damages.treatment_gap_note = patch.treatmentGapNote
  }

  if (patch.defendantCarrier !== undefined) {
    insurance.defendant_carrier = patch.defendantCarrier
    insurance.carrier = patch.defendantCarrier
  }
  if (patch.claimNumber !== undefined) {
    insurance.claim_number = patch.claimNumber
    insurance.claimNumber = patch.claimNumber
  }
  if (patch.policyLimit !== undefined) {
    insurance.defendant_coverage_limits = patch.policyLimit
    insurance.policy_limit = patch.policyLimit
  }
  if (patch.umUim !== undefined) insurance.um_uim = patch.umUim
  if (patch.medPay !== undefined) insurance.medpay = patch.medPay
  if (patch.adjusterContacted !== undefined) insurance.adjuster_contacted = patch.adjusterContacted
  if (patch.recordedStatement !== undefined) insurance.recorded_statement = patch.recordedStatement
  if (patch.declarationsRequested !== undefined) insurance.declarations_requested = patch.declarationsRequested
  if (patch.insuranceNote) insurance.intelligent_question_note = patch.insuranceNote

  facts.damages = damages
  facts.insurance = insurance

  if (patch.treatmentGap === true && patch.treatmentGapNote) {
    const marker = '[Intelligent Question — treatment gap]'
    const narrative = String(facts?.incident?.narrative || '')
    const injection = `${marker} ${patch.treatmentGapNote}`
    if (!narrative.includes(marker)) {
      facts.incident = {
        ...(facts.incident && typeof facts.incident === 'object' ? facts.incident : {}),
        narrative: narrative ? `${narrative}\n\n${injection}` : injection,
      }
    } else {
      facts.incident = {
        ...(facts.incident && typeof facts.incident === 'object' ? facts.incident : {}),
        narrative: narrative.replace(/\[Intelligent Question — treatment gap\][\s\S]*?(?=\n\n\[|$)/, injection),
      }
    }
  } else if (patch.treatmentGap === false) {
    const narrative = String(facts?.incident?.narrative || '')
    if (narrative.includes('[Intelligent Question — treatment gap]')) {
      facts.incident = {
        ...(facts.incident && typeof facts.incident === 'object' ? facts.incident : {}),
        narrative:
          narrative
            .replace(/\n*\s*\[Intelligent Question — treatment gap\][\s\S]*?(?=\n\n\[|$)/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim() || null,
      }
    }
  }

  return facts
}

async function writeDamagesInsurancePatch(assessmentId: string, patch: DamagesInsurancePatch): Promise<void> {
  await updateCaseFacts({
    assessmentId,
    // Derived from an already-saved answer rather than typed straight in, so the
    // change feed attributes it to the sync rather than to a person.
    source: 'system',
    action: 'question_answer_applied',
    entityType: 'facts',
    summary: `Intelligent-question answer applied (${Object.keys(patch).join(', ')})`,
    mutate: (facts) => applyDamagesInsurancePatch(facts, patch),
  })
}

async function applyAiRoutedSignals(
  assessmentId: string,
  questionKey: string,
  answer: string | null | undefined,
  opts?: { questionText?: string | null; section?: string | null; actorId?: string | null; actorName?: string | null },
  domain?: FactDomain,
): Promise<void> {
  if (!questionKey.startsWith('ai:') || !domain) return
  if (domain === 'medical') {
    const surgery = answer ? parseSurgeryStatus(answer) : null
    const symptoms = answer ? parseNeuroSymptoms(answer) : []
    if (surgery || symptoms.length || parseAffirmative(String(answer || '')) != null) {
      await applyQuestionAnswerToMedical(assessmentId, 'base:auto_med_worse', answer)
    }
  }
  if (domain === 'liability') {
    const blob = `${opts?.questionText || ''} ${answer || ''}`.toLowerCase()
    const synthKey = /\bcited|ticket/.test(blob)
      ? 'base:auto_liab_cited'
      : /\bwitness/.test(blob)
        ? 'base:auto_liab_passengers'
        : 'base:def_fault'
    const patch = liabilityPatchFromQuestionAnswer(synthKey, answer)
    if (patch) {
      await upsertLiabilityRecord(assessmentId, patch, {
        source: 'system',
        actorId: opts?.actorId ?? null,
        actorName: opts?.actorName ?? null,
      }).catch(() => null)
    }
  }
}

/** Apply one answer across liability / medical / damages / insurance domains. */
export async function applyQuestionAnswerToCaseFacts(
  assessmentId: string,
  questionKey: string,
  answer: string | null | undefined,
  opts?: {
    questionText?: string | null
    section?: string | null
    source?: string | null
    actorId?: string | null
    actorName?: string | null
  },
): Promise<void> {
  const domain = classifyQuestionDomain({
    questionKey,
    questionText: opts?.questionText,
    section: opts?.section,
    answer,
  })

  await Promise.all([
    applyQuestionAnswerToLiability(assessmentId, questionKey, answer, {
      actorId: opts?.actorId,
      actorName: opts?.actorName,
    }),
    applyQuestionAnswerToMedical(assessmentId, questionKey, answer),
  ])

  await applyAiRoutedSignals(assessmentId, questionKey, answer, opts, domain)

  const patch = patchFromDomain(domain, questionKey, answer)
  if (!patch) return
  try {
    await writeDamagesInsurancePatch(assessmentId, patch)
    logger.info('Applied question answer to damages/insurance facts', {
      assessmentId,
      questionKey,
      domain,
      patchKeys: Object.keys(patch),
    })
  } catch (error: any) {
    logger.warn('Failed to apply damages/insurance question patch', {
      assessmentId,
      questionKey,
      error: error?.message,
    })
  }
}

/** Full re-sync before Overview underwriting. */
export async function syncAllQuestionAnswersToCaseFacts(assessmentId: string): Promise<void> {
  await syncLiabilityFromSavedQuestionAnswers(assessmentId).catch(() => 0)
  await syncMedicalFromSavedQuestionAnswers(assessmentId).catch(() => 0)

  const rows = await prisma.caseQuestionAnswer
    .findMany({
      where: { assessmentId },
      select: { questionKey: true, answer: true, questionText: true, section: true, source: true },
    })
    .catch(
      () =>
        [] as Array<{
          questionKey: string
          answer: string
          questionText: string | null
          section: string | null
          source: string | null
        }>,
    )

  for (const row of rows) {
    const domain = classifyQuestionDomain({
      questionKey: row.questionKey,
      questionText: row.questionText,
      section: row.section,
      answer: row.answer,
    })

    if (row.questionKey.startsWith('ai:')) {
      await applyAiRoutedSignals(
        assessmentId,
        row.questionKey,
        row.answer,
        { questionText: row.questionText, section: row.section },
        domain,
      )
    }

    if (!domain || domain === 'medical' || domain === 'liability') continue
    const patch = patchFromDomain(domain, row.questionKey, row.answer)
    if (patch) {
      await writeDamagesInsurancePatch(assessmentId, patch).catch((e: any) =>
        logger.warn('Damages/insurance sync row failed', {
          assessmentId,
          questionKey: row.questionKey,
          error: e?.message,
        }),
      )
    }
  }

  logger.info('Synced all question answers into case facts', { assessmentId, count: rows.length })
}

/**
 * Intelligent intake question banks (Phase 1, deterministic baseline).
 *
 * Instead of one static 100-question intake form, we generate a short,
 * case-specific set of questions. This file is the curated, deterministic
 * baseline per claim type; the LLM layer (intelligent-questions.ts) prunes and
 * personalizes on top of it and always falls back to this baseline.
 *
 * Questions can be GATED on the case's gap registry so we only ask what is still
 * unknown (e.g. only ask about the defendant's carrier if that is a live gap).
 */
import type { CaseIntelligence, ValueImpact } from './case-intelligence'

export type QuestionSection = 'Liability' | 'Medical' | 'Damages' | 'Insurance' | 'Case Strategy'

export interface IntelligentQuestion {
  id: string
  section: QuestionSection
  text: string
  whyAsked: string
  valueImpact: ValueImpact
  confidence?: number
  source: 'baseline' | 'ai'
  /** Gap registry keys this question addresses; answering it resolves those gaps. */
  gapKeys?: string[]
}

interface BankQuestion {
  id: string
  section: QuestionSection
  text: string
  whyAsked: string
  valueImpact: ValueImpact
  /** Only include when this returns true. Receives the set of live gap keys. */
  gate?: (gapKeys: Set<string>) => boolean
  /** Gap keys this question addresses (used both for gating and answer→gap resolution). */
  gapKeys?: string[]
}

const onlyIfGap = (key: string) => (gapKeys: Set<string>) => gapKeys.has(key)

// Asked on essentially every PI matter — the ethics/defense-exposure questions.
const COMMON: BankQuestion[] = [
  { id: 'strat_prior_attorney', section: 'Case Strategy', text: 'Have you spoken with or hired any other attorney about this incident?', whyAsked: 'Prior representation affects conflicts and fee disputes.', valueImpact: 'medium' },
  { id: 'strat_social_media', section: 'Case Strategy', text: 'Have you posted anything about the incident or your injuries on social media?', whyAsked: 'Defense routinely mines social media to contradict damages.', valueImpact: 'medium' },
  { id: 'strat_prior_accidents', section: 'Case Strategy', text: 'Have you been in any prior accidents or made prior injury claims?', whyAsked: 'Prior claims are a common causation defense.', valueImpact: 'medium', gate: onlyIfGap('prior_injuries'), gapKeys: ['prior_injuries'] },
  { id: 'strat_bankruptcy', section: 'Case Strategy', text: 'Have you filed for bankruptcy, or are you considering it?', whyAsked: 'A pending bankruptcy can make the claim an asset of the estate.', valueImpact: 'low' },
  { id: 'strat_prior_injury', section: 'Case Strategy', text: 'Any prior injuries or treatment to the same body part(s)?', whyAsked: 'Pre-existing conditions are the leading damages defense — get ahead of it.', valueImpact: 'medium', gate: onlyIfGap('prior_injuries'), gapKeys: ['prior_injuries'] },
]

const INSURANCE_COMMON: BankQuestion[] = [
  { id: 'ins_carrier', section: 'Insurance', text: "Do you know the at-fault party's insurance carrier and claim number?", whyAsked: 'Needed to open the claim and route the demand to the right adjuster.', valueImpact: 'high', gate: (g) => g.has('defendant_carrier') || g.has('defendant_policy_limits'), gapKeys: ['defendant_carrier'] },
  { id: 'ins_limits', section: 'Insurance', text: 'Do you know (or can we request) the defendant’s policy limits?', whyAsked: 'Policy limits cap realistic recovery and shape demand strategy.', valueImpact: 'high', gate: onlyIfGap('defendant_policy_limits'), gapKeys: ['defendant_policy_limits'] },
  { id: 'ins_adjuster', section: 'Insurance', text: 'Has an insurance adjuster contacted you, and did you give a recorded statement?', whyAsked: 'Recorded statements can be used against the plaintiff and change strategy.', valueImpact: 'medium' },
  { id: 'ins_um', section: 'Insurance', text: 'Do you carry uninsured/underinsured motorist (UM/UIM) coverage?', whyAsked: 'UM/UIM can be a recovery source when the defendant is underinsured.', valueImpact: 'medium', gate: (g) => g.has('defendant_policy_limits') },
]

const BANKS: Record<string, BankQuestion[]> = {
  auto: [
    { id: 'auto_liab_fault', section: 'Liability', text: 'Did the other driver admit fault or apologize at the scene?', whyAsked: 'Admissions are powerful liability evidence.', valueImpact: 'high' },
    { id: 'auto_liab_cited', section: 'Liability', text: 'Was anyone cited or ticketed by police?', whyAsked: 'A citation strongly supports fault.', valueImpact: 'high' },
    { id: 'auto_liab_passengers', section: 'Liability', text: 'Were there passengers or independent witnesses?', whyAsked: 'Neutral witnesses corroborate the account.', valueImpact: 'medium' },
    { id: 'auto_med_mri', section: 'Medical', text: 'Has any doctor recommended or ordered an MRI?', whyAsked: 'Objective imaging can materially increase case value.', valueImpact: 'high', gate: onlyIfGap('imaging_mri'), gapKeys: ['imaging_mri'] },
    { id: 'auto_med_worse', section: 'Medical', text: 'Has your pain gotten worse, or do you have numbness, tingling, headaches, or dizziness?', whyAsked: 'Radicular/neuro symptoms elevate severity and value.', valueImpact: 'high' },
    { id: 'auto_med_gap', section: 'Medical', text: 'Have you had any gaps in treatment, and if so, why?', whyAsked: 'Treatment gaps are a favorite defense argument.', valueImpact: 'medium' },
    { id: 'auto_dmg_work', section: 'Damages', text: 'Have you missed work, promotions, bonuses, or used vacation/sick days?', whyAsked: 'Captures the full wage-loss and lost-earning-capacity claim.', valueImpact: 'high' },
    { id: 'auto_dmg_household', section: 'Damages', text: 'Are there activities you can no longer do (lifting children, chores, hobbies)?', whyAsked: 'Supports non-economic damages and loss of enjoyment.', valueImpact: 'medium' },
  ],
  dog_bite: [
    { id: 'dog_leashed', section: 'Liability', text: 'Was the dog leashed or restrained at the time?', whyAsked: 'Leash-law violations support liability.', valueImpact: 'high' },
    { id: 'dog_prior', section: 'Liability', text: 'Do you know if the dog had bitten or attacked anyone before?', whyAsked: 'Prior attacks establish the owner’s knowledge of danger.', valueImpact: 'high' },
    { id: 'dog_animal_control', section: 'Liability', text: 'Was Animal Control or police notified, and is there a report?', whyAsked: 'Official reports document the incident and the animal.', valueImpact: 'medium' },
    { id: 'dog_owner', section: 'Liability', text: 'Is the dog owner identified, and were you lawfully present (not trespassing)?', whyAsked: 'Owner identity and your lawful presence are elements of the claim.', valueImpact: 'high' },
    { id: 'dog_vax', section: 'Medical', text: 'Are the dog’s vaccination records known, and did you need rabies treatment?', whyAsked: 'Affects medical treatment and damages.', valueImpact: 'medium' },
    { id: 'dog_scarring', section: 'Damages', text: 'Is there visible scarring or disfigurement, especially on the face/hands?', whyAsked: 'Permanent scarring significantly increases value.', valueImpact: 'high' },
  ],
  slip_and_fall: [
    { id: 'sf_warning', section: 'Liability', text: 'Were there any warning signs (wet floor, caution cones) present?', whyAsked: 'Absence of warnings supports a hazard/notice claim.', valueImpact: 'high' },
    { id: 'sf_condition', section: 'Liability', text: 'What was the condition (spill, ice, uneven surface), and how long had it been there?', whyAsked: 'Notice/time is central to premises liability.', valueImpact: 'high' },
    { id: 'sf_footwear', section: 'Liability', text: 'What footwear were you wearing, and what were you doing at the time?', whyAsked: 'Anticipates comparative-fault defenses.', valueImpact: 'medium' },
    { id: 'sf_video', section: 'Liability', text: 'Is there surveillance video or an incident report from the property?', whyAsked: 'Video/reports are the strongest liability evidence — request before it’s overwritten.', valueImpact: 'high', gate: onlyIfGap('police_report'), gapKeys: ['police_report'] },
    { id: 'sf_witness', section: 'Liability', text: 'Did any employees or witnesses see the fall or the hazard?', whyAsked: 'Witnesses corroborate the hazard and notice.', valueImpact: 'medium', gate: onlyIfGap('witness_statements'), gapKeys: ['witness_statements'] },
    { id: 'sf_report', section: 'Damages', text: 'Did the store/property create an incident report, and did you get a copy?', whyAsked: 'Documents the fall and the property’s response.', valueImpact: 'medium' },
  ],
  medmal: [
    { id: 'mm_provider', section: 'Liability', text: 'Who performed the procedure/treatment, and at which facility?', whyAsked: 'Identifies the defendant provider(s) and hospital.', valueImpact: 'high' },
    { id: 'mm_consent', section: 'Liability', text: 'Were the risks explained and did you sign an informed-consent form?', whyAsked: 'Informed-consent issues can be an independent theory.', valueImpact: 'medium' },
    { id: 'mm_second', section: 'Medical', text: 'Have you gotten a second opinion about what went wrong?', whyAsked: 'A corroborating provider supports the standard-of-care breach.', valueImpact: 'high' },
    { id: 'mm_complications', section: 'Medical', text: 'What complications or additional treatment did you need afterward?', whyAsked: 'Quantifies the harm caused by the alleged negligence.', valueImpact: 'high' },
  ],
  workers: [
    { id: 'wk_supervisor', section: 'Liability', text: 'Did you notify your supervisor, and when?', whyAsked: 'Timely notice is required to preserve the claim.', valueImpact: 'high' },
    { id: 'wk_wc', section: 'Insurance', text: 'Has a workers’ compensation claim been filed?', whyAsked: 'WC interacts with (and may limit) a third-party claim.', valueImpact: 'high' },
    { id: 'wk_thirdparty', section: 'Liability', text: 'Was anyone other than your employer involved (equipment maker, contractor)?', whyAsked: 'A third party can support a claim beyond WC limits.', valueImpact: 'high' },
    { id: 'wk_safety', section: 'Liability', text: 'Was required safety equipment provided and functioning?', whyAsked: 'Safety failures support liability against third parties.', valueImpact: 'medium' },
    { id: 'wk_duty', section: 'Damages', text: 'Have you been placed on modified duty or taken off work?', whyAsked: 'Drives the wage-loss and disability claim.', valueImpact: 'medium' },
  ],
  product: [
    { id: 'pr_maker', section: 'Liability', text: 'Do you know the manufacturer, brand, and model of the product?', whyAsked: 'Identifies the defendant(s) in the chain of distribution.', valueImpact: 'high' },
    { id: 'pr_preserved', section: 'Liability', text: 'Do you still have the product itself (preserved, unaltered)?', whyAsked: 'The product is the key evidence — spoliation can sink the case.', valueImpact: 'high' },
    { id: 'pr_recall', section: 'Liability', text: 'Are you aware of any recalls or similar incidents with this product?', whyAsked: 'Recalls/prior incidents support a known defect.', valueImpact: 'high' },
    { id: 'pr_instructions', section: 'Liability', text: 'Were you using the product as instructed, and do you have the manual/packaging?', whyAsked: 'Anticipates misuse defenses and supports warning claims.', valueImpact: 'medium' },
    { id: 'pr_receipt', section: 'Damages', text: 'Do you have the purchase receipt or proof of purchase?', whyAsked: 'Establishes ownership and the purchase timeline.', valueImpact: 'low' },
  ],
  wrongful_death: [
    { id: 'wd_relationship', section: 'Damages', text: 'What was your relationship to the deceased, and who are the surviving heirs?', whyAsked: 'Determines standing and the scope of recoverable damages.', valueImpact: 'high' },
    { id: 'wd_dependents', section: 'Damages', text: 'Did the deceased provide financial support to dependents?', whyAsked: 'Drives the economic-loss component of a wrongful-death claim.', valueImpact: 'high' },
    { id: 'wd_final', section: 'Medical', text: 'What medical care did the deceased receive before passing, and are records available?', whyAsked: 'Supports both survival and wrongful-death damages.', valueImpact: 'high' },
  ],
  default: [
    { id: 'def_fault', section: 'Liability', text: 'In your words, who was at fault and why?', whyAsked: 'Establishes the liability theory.', valueImpact: 'high' },
    { id: 'def_witness', section: 'Liability', text: 'Were there any witnesses, and do you have their contact information?', whyAsked: 'Witnesses corroborate the account.', valueImpact: 'medium', gate: onlyIfGap('witness_statements'), gapKeys: ['witness_statements'] },
    { id: 'def_worse', section: 'Medical', text: 'Have your symptoms improved, stayed the same, or gotten worse?', whyAsked: 'Trajectory affects severity and future-care value.', valueImpact: 'high' },
    { id: 'def_work', section: 'Damages', text: 'Have you missed work or lost income because of the injury?', whyAsked: 'Captures the wage-loss claim.', valueImpact: 'high' },
  ],
}

/**
 * Build the deterministic baseline question set for a case: claim-type bank +
 * shared insurance/strategy questions, filtered by the live gap registry.
 */
export function buildBaselineQuestions(intel: CaseIntelligence): IntelligentQuestion[] {
  const gapKeys = new Set(intel.gaps.map((g) => g.key))
  const bank = BANKS[intel.claimTypeKey] || BANKS.default
  const merged = [...bank, ...INSURANCE_COMMON, ...COMMON]

  const seen = new Set<string>()
  const out: IntelligentQuestion[] = []
  for (const q of merged) {
    if (seen.has(q.id)) continue
    if (q.gate && !q.gate(gapKeys)) continue
    seen.add(q.id)
    out.push({
      id: q.id,
      section: q.section,
      text: q.text,
      whyAsked: q.whyAsked,
      valueImpact: q.valueImpact,
      confidence: 0.9,
      source: 'baseline',
      gapKeys: q.gapKeys,
    })
  }
  return out
}

/**
 * Map of baseline question id → the gap keys it addresses. Lets the server
 * resolve Missing-Information gaps once the matching question is answered,
 * without re-deriving the gate logic. Built once from every bank.
 */
export const BASELINE_QUESTION_GAP_KEYS: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {}
  const all: BankQuestion[] = [...COMMON, ...INSURANCE_COMMON, ...Object.values(BANKS).flat()]
  for (const q of all) {
    if (q.gapKeys && q.gapKeys.length > 0) map[q.id] = q.gapKeys
  }
  return map
})()

/**
 * ICD-10 / CPT code analysis for valuation.
 *
 * Diagnosis (ICD-10) and procedure (CPT) codes extracted from uploaded medical
 * records/bills are an objective, auditable basis for injury severity and treatment
 * intensity — far stronger than a self-reported severity bucket or narrative keywords.
 *
 * This module maps codes to deterministic severity/damages signals. It is fully
 * explainable: every signal carries the code and a human-readable label. When no codes
 * are present (intake-only assessments) it returns a neutral, no-op result so existing
 * behavior is unchanged.
 */

import type { InjuryType } from './underwriting-engine'

export interface CodeSignal {
  code: string
  system: 'ICD10' | 'CPT'
  category:
    | 'tbi'
    | 'spinal_cord'
    | 'nerve_root'
    | 'fracture'
    | 'disc'
    | 'internal_injury'
    | 'sprain_strain'
    | 'other_injury'
    | 'surgery'
    | 'spinal_surgery'
    | 'injection'
    | 'advanced_imaging'
    | 'therapy'
  severityWeight: number
  /** The injury this code proves, in the valuation engine's vocabulary. */
  injuryType?: InjuryType
  label: string
}

/**
 * Injury types ordered by what they are worth, so a documented code can be
 * compared against an injury inferred from narrative text.
 */
export const INJURY_TYPE_RANK: Record<InjuryType, number> = {
  SOFT_TISSUE: 0,
  DISC_BULGE: 1,
  DISC_HERNIATION: 2,
  RADICULOPATHY: 3,
  BROKEN_BONE: 4,
  TBI_MILD: 5,
  TBI_MODERATE: 6,
  TBI_SEVERE: 7,
  WRONGFUL_DEATH: 8,
  SPINAL_CORD: 9,
}

export interface ClinicalCodeAnalysis {
  /** Any usable codes were found. When false, all signals below are neutral. */
  hasCodes: boolean
  signals: CodeSignal[]
  /** Capped severity points contributed by documented diagnoses/procedures. */
  severityBonus: number
  /** A documented, objective injury diagnosis exists (not just self-reported). */
  documentedInjury: boolean
  hasSurgery: boolean
  hasInjection: boolean
  hasAdvancedImaging: boolean
  /**
   * The most severe injury the codes prove, for comparison against the injury
   * inferred from narrative text. Null when no code maps to an injury type.
   */
  primaryInjuryType: InjuryType | null
  factors: string[]
}

const NEUTRAL: ClinicalCodeAnalysis = {
  hasCodes: false,
  signals: [],
  severityBonus: 0,
  documentedInjury: false,
  hasSurgery: false,
  hasInjection: false,
  hasAdvancedImaging: false,
  primaryInjuryType: null,
  factors: [],
}

function normalizeCode(raw: unknown): string {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '')
}

/**
 * Split an ICD-10 code into the parts that carry severity.
 *
 * The category root ("S06") says what was injured; the subcategory digit says
 * how badly. S06.0 is a concussion and S06.5 is a subdural hemorrhage — the
 * same three-character root, an order of magnitude apart in value. Reading only
 * the root, as this module used to, throws that away.
 */
function icdParts(code: string): { flat: string; root: string; sub: number | null; extension: string | null } {
  const flat = code.replace(/\./g, '')
  const subChar = flat.charAt(3)
  const last = flat.charAt(flat.length - 1)
  return {
    flat,
    root: flat.slice(0, 3),
    sub: /\d/.test(subChar) ? Number(subChar) : null,
    // The 7th character encodes encounter type and, on fractures, whether the
    // break was open. Only meaningful once the code is fully specified.
    extension: flat.length >= 5 && /[A-Z]/.test(last) ? last : null,
  }
}

// Seventh-character extensions that denote an open fracture. An open fracture
// carries infection risk, longer recovery and higher value than a closed one.
const OPEN_FRACTURE_EXTENSIONS = new Set(['B', 'C', 'E', 'F', 'H', 'J', 'M', 'N', 'P', 'Q', 'R'])

// Fracture roots grouped by what the break does to case value. Skull, spine,
// pelvis and femur are life-altering; fingers and toes rarely move a case.
const MAJOR_FRACTURE_ROOTS = new Set(['S02', 'S12', 'S32', 'S72'])
const MODERATE_FRACTURE_ROOTS = new Set(['S42', 'S52', 'S82'])
const MINOR_FRACTURE_ROOTS = new Set(['S62', 'S92'])

/**
 * Loss-of-consciousness duration, encoded as the 6th character of an S06 code
 * (S06.0X**3**A = 1-6 hours). Prolonged LOC is the single strongest objective
 * marker of a serious brain injury.
 */
function locSeverity(flat: string): number {
  if (flat.charAt(4) !== 'X') return 0
  const digit = Number(flat.charAt(5))
  return Number.isFinite(digit) ? digit : 0
}

function classifyTbi(code: string, parts: ReturnType<typeof icdParts>): CodeSignal {
  const { sub, flat } = parts
  const loc = locSeverity(flat)
  // 1-2 is under an hour, 3+ crosses into hours or days without regaining
  // consciousness, 6 is no return to pre-injury level at all.
  const prolongedLoc = loc >= 3
  const noReturnToBaseline = loc === 6

  // S06.4-.6 are intracranial haemorrhages: epidural, subdural, subarachnoid.
  if (sub !== null && sub >= 4 && sub <= 6) {
    return { code, system: 'ICD10', category: 'tbi', severityWeight: 2.4, injuryType: 'TBI_SEVERE', label: 'Intracranial haemorrhage (S06.4-.6)' }
  }
  // S06.1-.3 are cerebral oedema and diffuse or focal brain injury: structural
  // damage on imaging rather than a clinical concussion diagnosis.
  if (sub !== null && sub >= 1 && sub <= 3) {
    return {
      code,
      system: 'ICD10',
      category: 'tbi',
      severityWeight: prolongedLoc ? 2.2 : 1.9,
      injuryType: noReturnToBaseline || prolongedLoc ? 'TBI_SEVERE' : 'TBI_MODERATE',
      label: 'Structural brain injury (S06.1-.3)',
    }
  }
  if (sub === 0) {
    return {
      code,
      system: 'ICD10',
      category: 'tbi',
      severityWeight: prolongedLoc ? 1.8 : 1.2,
      injuryType: prolongedLoc ? 'TBI_MODERATE' : 'TBI_MILD',
      label: prolongedLoc ? 'Concussion with prolonged loss of consciousness (S06.0)' : 'Concussion (S06.0)',
    }
  }
  return { code, system: 'ICD10', category: 'tbi', severityWeight: 1.3, injuryType: 'TBI_MILD', label: 'Intracranial injury (S06)' }
}

/**
 * Separate true cord injuries from nerve-root and plexus injuries.
 *
 * These share the S14/S24/S34 roots and were previously scored identically at
 * cord level. A cord injury is catastrophic; a nerve-root injury is a
 * radiculopathy, valuable but not in the same bracket.
 */
function classifySpinalNerve(code: string, parts: ReturnType<typeof icdParts>): CodeSignal {
  const { root, sub } = parts
  // .0 and .1 are the cord itself at every level.
  if (sub === 0 || sub === 1) {
    return { code, system: 'ICD10', category: 'spinal_cord', severityWeight: 2.6, injuryType: 'SPINAL_CORD', label: 'Spinal cord injury' }
  }
  // S34.3 is cauda equina — a surgical emergency that behaves like a cord injury.
  if (root === 'S34' && sub === 3) {
    return { code, system: 'ICD10', category: 'spinal_cord', severityWeight: 2.4, injuryType: 'SPINAL_CORD', label: 'Cauda equina injury (S34.3)' }
  }
  return { code, system: 'ICD10', category: 'nerve_root', severityWeight: 1.4, injuryType: 'RADICULOPATHY', label: 'Nerve root or plexus injury' }
}

/**
 * Disc disorders, which is where most soft-tissue-adjacent value lives.
 *
 * The subcategory separates the defence's best argument from the plaintiff's:
 * .3 is degeneration, which the carrier will call pre-existing, while .1 is a
 * documented radiculopathy and .0 is cord compression.
 */
function classifyDisc(code: string, parts: ReturnType<typeof icdParts>): CodeSignal {
  switch (parts.sub) {
    case 0:
      // Myelopathy is cord compression. It sits above radiculopathy and below a
      // frank cord injury, and the engine's vocabulary has no term for it, so
      // it is typed as radiculopathy and carries a heavier weight instead.
      return { code, system: 'ICD10', category: 'disc', severityWeight: 1.8, injuryType: 'RADICULOPATHY', label: 'Disc disorder with myelopathy' }
    case 1:
      return { code, system: 'ICD10', category: 'disc', severityWeight: 1.4, injuryType: 'RADICULOPATHY', label: 'Disc disorder with radiculopathy' }
    case 2:
      return { code, system: 'ICD10', category: 'disc', severityWeight: 1.1, injuryType: 'DISC_HERNIATION', label: 'Disc displacement / herniation' }
    case 3:
      return { code, system: 'ICD10', category: 'disc', severityWeight: 0.7, injuryType: 'DISC_BULGE', label: 'Disc degeneration (defence will argue pre-existing)' }
    default:
      return { code, system: 'ICD10', category: 'disc', severityWeight: 0.8, injuryType: 'DISC_BULGE', label: 'Intervertebral disc disorder' }
  }
}

function classifyFracture(code: string, parts: ReturnType<typeof icdParts>): CodeSignal {
  const { root, sub, extension } = parts
  const isOpen = extension !== null && OPEN_FRACTURE_EXTENSIONS.has(extension)

  let severityWeight: number
  let region: string
  if (MAJOR_FRACTURE_ROOTS.has(root)) {
    severityWeight = 1.9
    region = 'Major fracture (skull, spine, pelvis or femur)'
  } else if (root === 'S22') {
    // S22.0-.1 are thoracic vertebrae; the rest are ribs and sternum.
    const vertebral = sub !== null && sub <= 1
    severityWeight = vertebral ? 1.9 : 1.3
    region = vertebral ? 'Thoracic vertebral fracture' : 'Rib or sternum fracture'
  } else if (MODERATE_FRACTURE_ROOTS.has(root)) {
    severityWeight = 1.5
    region = 'Long bone fracture'
  } else if (MINOR_FRACTURE_ROOTS.has(root)) {
    severityWeight = 1.0
    region = 'Hand or foot fracture'
  } else {
    severityWeight = 1.4
    region = 'Fracture'
  }

  return {
    code,
    system: 'ICD10',
    category: 'fracture',
    severityWeight: isOpen ? severityWeight + 0.4 : severityWeight,
    injuryType: 'BROKEN_BONE',
    label: isOpen ? `${region}, open` : region,
  }
}

/** Classify a single ICD-10 diagnosis code. Returns null if not valuation-relevant. */
function classifyIcd(code: string): CodeSignal | null {
  const parts = icdParts(code)
  const { root } = parts

  if (root === 'S06') return classifyTbi(code, parts)
  if (/^F07\.?81/.test(code)) return { code, system: 'ICD10', category: 'tbi', severityWeight: 1.0, injuryType: 'TBI_MILD', label: 'Post-concussional syndrome (F07.81)' }
  if (['S14', 'S24', 'S34'].includes(root)) return classifySpinalNerve(code, parts)
  // Intracranial / internal organ injury
  if (/^S(2[5-9]|3[5-9])/.test(code)) return { code, system: 'ICD10', category: 'internal_injury', severityWeight: 1.4, label: 'Internal / organ injury' }
  if (root === 'M50' || root === 'M51') return classifyDisc(code, parts)
  // Fractures (S_2 pattern) and other fracture chapters
  if (/^S\d2/.test(code)) return classifyFracture(code, parts)
  // Sprains / strains (S_3 pattern) and dorsopathies (M54 e.g. low back pain)
  if (/^S\d3/.test(code) || /^M54/.test(code)) return { code, system: 'ICD10', category: 'sprain_strain', severityWeight: 0.4, injuryType: 'SOFT_TISSUE', label: 'Sprain / strain / dorsalgia' }
  // Any remaining S/T injury code
  if (/^[ST]\d/.test(code)) return { code, system: 'ICD10', category: 'other_injury', severityWeight: 0.5, label: 'Documented injury (S/T code)' }
  return null
}

function cptNum(code: string): number | null {
  const m = code.match(/^(\d{5})/)
  return m ? Number(m[1]) : null
}

/** Classify a single CPT procedure code. Returns null if not valuation-relevant. */
function classifyCpt(code: string): CodeSignal | null {
  const n = cptNum(code)
  if (n === null) return null
  // Spinal surgery (arthrodesis 22xxx, laminectomy/discectomy 63xxx)
  if ((n >= 22010 && n <= 22899) || (n >= 63001 && n <= 63746)) {
    return { code, system: 'CPT', category: 'spinal_surgery', severityWeight: 2.0, label: 'Spinal surgery (CPT)' }
  }
  // Epidural / transforaminal injections
  if (n >= 62320 && n <= 62327) return { code, system: 'CPT', category: 'injection', severityWeight: 0.9, label: 'Epidural injection (CPT)' }
  // Nerve blocks / facet injections
  if (n >= 64400 && n <= 64530) return { code, system: 'CPT', category: 'injection', severityWeight: 0.7, label: 'Nerve block (CPT)' }
  // Radiofrequency ablation
  if (n >= 64633 && n <= 64636) return { code, system: 'CPT', category: 'injection', severityWeight: 0.9, label: 'Radiofrequency ablation (CPT)' }
  // Advanced imaging: MRI / CT (radiology 70000s; common spine/brain MRI & CT ranges)
  if ((n >= 70336 && n <= 73725) || (n >= 72141 && n <= 72159)) {
    return { code, system: 'CPT', category: 'advanced_imaging', severityWeight: 0.55, label: 'Advanced imaging MRI/CT (CPT)' }
  }
  // Physical/occupational therapy
  if (n >= 97010 && n <= 97799) return { code, system: 'CPT', category: 'therapy', severityWeight: 0.2, label: 'Physical therapy (CPT)' }
  // General surgery range (excludes the radiology/medicine ranges handled above)
  if (n >= 10021 && n <= 69990) return { code, system: 'CPT', category: 'surgery', severityWeight: 1.4, label: 'Surgical procedure (CPT)' }
  return null
}

/**
 * Analyze diagnosis + procedure codes into a severity/damages signal bundle.
 * Accepts arrays that may contain raw strings or already-parsed codes.
 */
export function analyzeClinicalCodes(
  icdCodes: unknown[] | undefined | null,
  cptCodes: unknown[] | undefined | null,
): ClinicalCodeAnalysis {
  const icd = Array.isArray(icdCodes) ? icdCodes : []
  const cpt = Array.isArray(cptCodes) ? cptCodes : []
  if (icd.length === 0 && cpt.length === 0) return NEUTRAL

  const signals: CodeSignal[] = []
  const seen = new Set<string>()

  for (const raw of icd) {
    const code = normalizeCode(raw)
    if (!code || seen.has(`I:${code}`)) continue
    seen.add(`I:${code}`)
    const sig = classifyIcd(code)
    if (sig) signals.push(sig)
  }
  for (const raw of cpt) {
    const code = normalizeCode(raw)
    if (!code || seen.has(`C:${code}`)) continue
    seen.add(`C:${code}`)
    const sig = classifyCpt(code)
    if (sig) signals.push(sig)
  }

  if (signals.length === 0) return { ...NEUTRAL, hasCodes: true }

  // Severity bonus: dominated by the single most severe documented signal, with a small
  // additive credit for additional distinct findings. Capped so codes inform — not
  // dominate — the severity score.
  const sorted = [...signals].sort((a, b) => b.severityWeight - a.severityWeight)
  const top = sorted[0].severityWeight
  const additional = sorted.slice(1).reduce((sum, s) => sum + s.severityWeight * 0.25, 0)
  const severityBonus = Math.min(2.5, top + additional)

  const hasSurgery = signals.some((s) => s.category === 'surgery' || s.category === 'spinal_surgery')
  const hasInjection = signals.some((s) => s.category === 'injection')
  const hasAdvancedImaging = signals.some((s) => s.category === 'advanced_imaging')
  const documentedInjury = signals.some((s) =>
    ['tbi', 'spinal_cord', 'nerve_root', 'fracture', 'disc', 'internal_injury', 'sprain_strain', 'other_injury'].includes(s.category),
  )

  const primaryInjuryType = signals.reduce<InjuryType | null>((worst, signal) => {
    if (!signal.injuryType) return worst
    if (!worst) return signal.injuryType
    return INJURY_TYPE_RANK[signal.injuryType] > INJURY_TYPE_RANK[worst] ? signal.injuryType : worst
  }, null)

  const factors = signals.slice(0, 6).map((s) => `${s.label} [${s.code}]`)

  return {
    hasCodes: true,
    signals,
    severityBonus,
    documentedInjury,
    hasSurgery,
    hasInjection,
    hasAdvancedImaging,
    primaryInjuryType,
    factors,
  }
}

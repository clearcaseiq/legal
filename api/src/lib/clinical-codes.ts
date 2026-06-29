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

export interface CodeSignal {
  code: string
  system: 'ICD10' | 'CPT'
  category:
    | 'tbi'
    | 'spinal_cord'
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
  label: string
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
  factors: [],
}

function normalizeCode(raw: unknown): string {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '')
}

/** Classify a single ICD-10 diagnosis code. Returns null if not valuation-relevant. */
function classifyIcd(code: string): CodeSignal | null {
  // Post-concussion / traumatic brain injury
  if (/^S06/.test(code)) return { code, system: 'ICD10', category: 'tbi', severityWeight: 1.6, label: 'Traumatic brain injury (S06)' }
  if (/^F07\.?81/.test(code)) return { code, system: 'ICD10', category: 'tbi', severityWeight: 1.0, label: 'Post-concussional syndrome (F07.81)' }
  // Spinal cord injury
  if (/^S(14|24|34)/.test(code)) return { code, system: 'ICD10', category: 'spinal_cord', severityWeight: 2.2, label: 'Spinal cord / nerve root injury' }
  // Intracranial / internal organ injury
  if (/^S(2[5-9]|3[5-9])/.test(code)) return { code, system: 'ICD10', category: 'internal_injury', severityWeight: 1.4, label: 'Internal / organ injury' }
  // Disc disorders (herniation, radiculopathy)
  if (/^M5[01]/.test(code)) return { code, system: 'ICD10', category: 'disc', severityWeight: 1.1, label: 'Intervertebral disc disorder (M50/M51)' }
  // Fractures (S_2 pattern) and other fracture chapters
  if (/^S\d2/.test(code) || /^S[0-9]2/.test(code)) return { code, system: 'ICD10', category: 'fracture', severityWeight: 1.5, label: 'Fracture' }
  // Sprains / strains (S_3 pattern) and dorsopathies (M54 e.g. low back pain)
  if (/^S\d3/.test(code) || /^M54/.test(code)) return { code, system: 'ICD10', category: 'sprain_strain', severityWeight: 0.4, label: 'Sprain / strain / dorsalgia' }
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
    ['tbi', 'spinal_cord', 'fracture', 'disc', 'internal_injury', 'sprain_strain', 'other_injury'].includes(s.category),
  )

  const factors = signals.slice(0, 6).map((s) => `${s.label} [${s.code}]`)

  return {
    hasCodes: true,
    signals,
    severityBonus,
    documentedInjury,
    hasSurgery,
    hasInjection,
    hasAdvancedImaging,
    factors,
  }
}

/**
 * Cross-engine task identity — coach, readiness automation, and gap actions
 * historically invented different titles for the same work ("Secure police…" vs
 * "Collect Police…"). Exact-title dedupe therefore failed and attorneys saw
 * duplicate tasks with different due dates.
 *
 * Resolve every auto-generated task to a stable key before create, and skip
 * when that key (or a close title match) already exists in any status.
 */

export type TaskIdentitySource = {
  title?: string | null
  checkpointType?: string | null
  coachKey?: string | null
  notes?: string | null
}

/** Canonical work keys shared by Case Coach insights and readiness checkpoints. */
const COACH_TO_CHECKPOINT: Record<string, string> = {
  gap_police_report: 'police_report',
  gap_medical_records: 'medical_records',
  gap_medical_bills: 'bills',
  gap_photos: 'photos',
  gap_wage_proof: 'wage_loss',
  gap_hipaa: 'hipaa',
  gap_defendant_policy_limits: 'defendant_policy_limits',
  gap_defendant_carrier: 'defendant_carrier',
  gap_defendant_identity: 'defendant_identity',
  gap_product_preservation: 'product_preservation',
  gap_product_manufacturer: 'product_manufacturer',
  gap_first_party_coverage: 'first_party_coverage',
  gap_prior_injuries: 'prior_injuries',
  gap_employer_info: 'employer_info',
  gap_imaging_mri: 'imaging_mri',
  gap_witness_statements: 'witness_statements',
  gap_daily_impact: 'daily_impact',
  first_party_coverage: 'first_party_coverage',
  treatment_gap: 'treatment_gap',
  confirm_treatment_status: 'treatment_status',
  treatment_status: 'treatment_status',
  lien_investigation: 'lien_investigation',
  future_care: 'future_care',
  demand_ready: 'demand_ready',
  sol_urgency: 'sol',
  sol_expired: 'sol',
}

const TITLE_HINTS: Array<{ re: RegExp; key: string }> = [
  // More specific workflow / intake titles first so send vs confirm don't collapse.
  { re: /^send retainer|send retainer for signature/i, key: 'send_retainer' },
  { re: /confirm signed (retainer|representation)/i, key: 'confirm_retainer' },
  { re: /conflict check|open matter.*conflict/i, key: 'conflict_check' },
  { re: /welcome packet|welcome letter/i, key: 'welcome_packet' },
  { re: /letter of representation|letters of representation|\blors?\b/i, key: 'lor' },
  { re: /open insurance claim/i, key: 'open_insurance_claim' },
  { re: /special damages|compile.*damages|itemize.*damages/i, key: 'special_damages' },
  { re: /monitor ongoing treatment/i, key: 'monitor_treatment' },
  { re: /police|incident report/i, key: 'police_report' },
  { re: /medical records?/i, key: 'medical_records' },
  { re: /medical bills?|billing ledger/i, key: 'bills' },
  { re: /\bhipaa\b/i, key: 'hipaa' },
  { re: /photos?|injury\/damage/i, key: 'photos' },
  { re: /wage|pay stubs?|employer/i, key: 'employer_info' },
  { re: /treatment (continuity )?gap|treatment gap/i, key: 'treatment_gap' },
  { re: /confirm (current )?treatment status|treatment is complete|discharge\s*\/\s*mmi/i, key: 'treatment_status' },
  { re: /preserve the product|product preservation|spoliation/i, key: 'product_preservation' },
  { re: /manufacturer|brand,? and model/i, key: 'product_manufacturer' },
  { re: /policy limits?/i, key: 'defendant_policy_limits' },
  { re: /defendant (insurance )?carrier|claim number/i, key: 'defendant_carrier' },
  { re: /identify (the )?defendant|defendant('s)? (name|identity)/i, key: 'defendant_identity' },
  { re: /um\/uim|own coverage|medpay|pip/i, key: 'first_party_coverage' },
  { re: /prior injur/i, key: 'prior_injuries' },
  { re: /\bdemand\b/i, key: 'demand_ready' },
  { re: /\blien\b|subrogation/i, key: 'lien_investigation' },
  { re: /future (treatment|care|medical)/i, key: 'future_care' },
  { re: /filing deadline|statute of limitations|\bsol\b/i, key: 'sol' },
  { re: /questions for the plaintiff/i, key: 'plaintiff_questions' },
]

export function resolveTaskWorkKey(source: TaskIdentitySource): string | null {
  const coachKey = String(source.coachKey || '').trim()
  if (coachKey) {
    if (COACH_TO_CHECKPOINT[coachKey]) return COACH_TO_CHECKPOINT[coachKey]
    if (coachKey.startsWith('gap_')) return coachKey.slice(4)
    return coachKey
  }

  const checkpoint = String(source.checkpointType || '').trim()
  if (checkpoint) {
    if (checkpoint === 'medical_checkpoint') return 'treatment_status'
    return checkpoint
  }

  // Coach audits store coachKey in metadata; notes sometimes echo the why-line.
  const notes = String(source.notes || '')
  const coachFromNotes = notes.match(/coachKey[=:]\s*([a-z0-9_]+)/i)
  if (coachFromNotes?.[1]) return resolveTaskWorkKey({ coachKey: coachFromNotes[1] })

  const title = String(source.title || '').trim()
  if (!title) return null
  for (const hint of TITLE_HINTS) {
    if (hint.re.test(title)) return hint.key
  }
  return null
}

export function normalizeTaskTitle(title: string): string {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** True when an existing task already covers the same unit of work. */
export function taskWorkAlreadyCovered(
  existing: TaskIdentitySource[],
  candidate: TaskIdentitySource,
): boolean {
  const candidateKey = resolveTaskWorkKey(candidate)
  const candidateTitle = normalizeTaskTitle(candidate.title || '')

  for (const row of existing) {
    const key = resolveTaskWorkKey(row)
    if (candidateKey && key && candidateKey === key) return true
    const title = normalizeTaskTitle(row.title || '')
    if (candidateTitle && title && (title === candidateTitle || title.includes(candidateTitle) || candidateTitle.includes(title))) {
      // Avoid collapsing unrelated short titles ("Photos" vs "Photos of scene").
      if (candidateTitle.length >= 12 || title.length >= 12 || title === candidateTitle) return true
    }
  }
  return false
}

/** Normalize question text for de-duplication across baseline + AI layers. */
export function normalizeQuestionText(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

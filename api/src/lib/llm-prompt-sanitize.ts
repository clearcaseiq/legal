/**
 * Hard privacy filter for outbound LLM prompts.
 *
 * NEVER send to any LLM / GPT:
 * - SSN / social-security numbers
 * - Raw email addresses
 * - Phone numbers (contact PII)
 * - Street-style mailing addresses
 * - DOB lines when explicitly labeled
 *
 * PHI gate (LLM_ALLOW_PHI):
 * - false (default): Case Intelligence packs are reduced to gap keys + non-clinical
 *   flags — no narrative, injuries, treatment, or medical free text.
 * - true: medical case detail may be included (still contact-PII redacted). Enable
 *   only after a vendor BAA and legal approval.
 *
 * Applied both at the Case Intelligence → prompt boundary and as a last-line
 * defense on every chat.completions call (see llm-client.ts).
 */
import { ENV } from '../env'

/** Known-fact keys that are contact/identity PII even if values look benign. */
const BLOCKED_KNOWN_KEYS = new Set([
  'email',
  'client_email',
  'plaintiff_email',
  'contact_email',
  'phone',
  'mobile',
  'cell',
  'telephone',
  'ssn',
  'social_security',
  'social_security_number',
  'address',
  'home_address',
  'mailing_address',
  'street_address',
  'dob',
  'date_of_birth',
  'birthdate',
  'dateofbirth',
])

const BLOCKED_KNOWN_LABEL_RE =
  /\b(email|e-mail|phone|mobile|cell|telephone|ssn|social\s*security|date\s*of\s*birth|\bdob\b|home\s*address|mailing\s*address|street\s*address)\b/i

/** SSN: 123-45-6789 or 123 45 6789 (not bare 9 digits — too many false positives). */
const SSN_RE = /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g

/** Email addresses. */
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi

/** US-ish phone numbers (with optional country code / separators). */
const PHONE_RE =
  /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g

/** Street address heuristic: "123 Main St", "456 Oak Avenue", etc. */
const STREET_ADDRESS_RE =
  /\b\d{1,6}\s+(?:[A-Za-z0-9.#]+\s+){0,6}(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Lane|Ln\.?|Drive|Dr\.?|Court|Ct\.?|Way|Place|Pl\.?|Circle|Cir\.?|Highway|Hwy\.?|Parkway|Pkwy\.?)\b\.?/gi

/** Labeled DOB / SSN lines in free text. */
const LABELED_DOB_RE =
  /\b(?:dob|date\s*of\s*birth|birth\s*date)\s*[:#-]?\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/gi
const LABELED_SSN_RE =
  /\b(?:ssn|social\s*security(?:\s*number)?)\s*[:#-]?\s*[\d\-*xX]{3,}/gi

export type LlmSanitizeStats = {
  emails: number
  phones: number
  ssns: number
  addresses: number
  labeledDob: number
  labeledSsn: number
}

function countMatches(text: string, re: RegExp): number {
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`
  const clone = new RegExp(re.source, flags)
  return (text.match(clone) || []).length
}

/** Redact contact / identity PII from a single string. Safe on empty/null. */
export function redactLlmPii(input: string | null | undefined): string {
  if (!input) return ''
  let text = String(input)

  text = text.replace(LABELED_SSN_RE, '[REDACTED_SSN]')
  text = text.replace(LABELED_DOB_RE, '[REDACTED_DOB]')
  text = text.replace(SSN_RE, '[REDACTED_SSN]')
  text = text.replace(EMAIL_RE, '[REDACTED_EMAIL]')
  // Phones after emails so we don't mangle nothing useful; addresses next.
  text = text.replace(PHONE_RE, '[REDACTED_PHONE]')
  text = text.replace(STREET_ADDRESS_RE, '[REDACTED_ADDRESS]')

  return text
}

export function measureLlmPii(input: string | null | undefined): LlmSanitizeStats {
  const text = String(input || '')
  return {
    emails: countMatches(text, EMAIL_RE),
    phones: countMatches(text, PHONE_RE),
    ssns: countMatches(text, SSN_RE) + countMatches(text, LABELED_SSN_RE),
    addresses: countMatches(text, STREET_ADDRESS_RE),
    labeledDob: countMatches(text, LABELED_DOB_RE),
    labeledSsn: countMatches(text, LABELED_SSN_RE),
  }
}

export function isBlockedKnownFact(key: string, label?: string): boolean {
  const k = String(key || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (BLOCKED_KNOWN_KEYS.has(k)) return true
  if (label && BLOCKED_KNOWN_LABEL_RE.test(label)) return true
  return false
}

type KnownLike = { key: string; label: string; value: string; detail?: string }
type GapLike = {
  key?: string
  label: string
  category: string
  valueImpact: string
  severity?: number
  rationale?: string
  resolved?: boolean
  [k: string]: unknown
}
type IntelLike = {
  claimType: string
  narrative?: string
  known: KnownLike[]
  gaps: GapLike[]
  [k: string]: unknown
}

/** True only when explicitly enabled after BAA / legal approval. */
export function llmAllowPhi(): boolean {
  return Boolean(ENV.LLM_ALLOW_PHI)
}

export type LlmPhiMode = 'keys_only' | 'phi_allowed'

export function llmPhiMode(): LlmPhiMode {
  return llmAllowPhi() ? 'phi_allowed' : 'keys_only'
}

/** Non-clinical known-fact keys safe to keep when LLM_ALLOW_PHI=false. */
const KEYS_ONLY_KNOWN_ALLOW = new Set([
  'claim_type',
  'venue',
  'evidence',
  'sol',
  'um_uim',
])

/**
 * Strip contact-PII known facts and redact remaining free text before any
 * Case Intelligence pack is embedded in an LLM prompt.
 */
export function sanitizeCaseIntelligenceForLlm<T extends IntelLike>(intel: T): T {
  const known = (intel.known || [])
    .filter((k) => !isBlockedKnownFact(k.key, k.label))
    .map((k) => ({
      ...k,
      value: redactLlmPii(k.value),
      detail: k.detail != null ? redactLlmPii(k.detail) : k.detail,
    }))

  const gaps = (intel.gaps || []).map((g) => ({
    ...g,
    label: redactLlmPii(g.label),
    rationale: g.rationale != null ? redactLlmPii(String(g.rationale)) : g.rationale,
  }))

  return {
    ...intel,
    claimType: redactLlmPii(intel.claimType),
    narrative: intel.narrative != null ? redactLlmPii(intel.narrative) : intel.narrative,
    known,
    gaps,
  }
}

/**
 * Gap-keys-only pack: no narrative, no medical free text, no clinical known facts.
 * Gaps are reduced to key + category + impact (no rationale / long labels).
 */
export function toGapKeysOnlyCaseIntelligence<T extends IntelLike>(intel: T): T {
  const claimType = String(intel.claimType || 'unknown')
    .replace(/_/g, ' ')
    .trim()

  const known = (intel.known || [])
    .filter((k) => KEYS_ONLY_KNOWN_ALLOW.has(String(k.key || '').toLowerCase()))
    .filter((k) => !isBlockedKnownFact(k.key, k.label))
    .map((k) => ({
      key: k.key,
      label: k.label,
      // Evidence is already category labels ("Police report + Photos"); still redact.
      value: redactLlmPii(k.value),
      detail: undefined,
    }))

  // Always include claim type even if missing from known[].
  if (!known.some((k) => k.key === 'claim_type')) {
    known.unshift({ key: 'claim_type', label: 'Case type', value: claimType, detail: undefined })
  }

  const openGaps = (intel.gaps || []).filter((g) => !g.resolved)
  const gapKeys = openGaps
    .map((g) => String(g.key || '').trim())
    .filter(Boolean)
  const flags = [
    `open_gap_count=${openGaps.length}`,
    gapKeys.length ? `open_gap_keys=${gapKeys.join(',')}` : 'open_gap_keys=(none)',
  ]

  const gaps = openGaps.map((g) => {
    const key = String(g.key || 'gap').trim() || 'gap'
    return {
      ...g,
      key,
      label: key,
      category: String(g.category || 'case_strategy'),
      valueImpact: g.valueImpact || 'medium',
      severity: typeof g.severity === 'number' ? g.severity : undefined,
      rationale: undefined,
      resolved: false,
    }
  })

  return {
    ...intel,
    claimType,
    narrative: undefined,
    known: [
      ...known,
      { key: 'phi_mode', label: 'PHI mode', value: 'keys_only', detail: undefined },
      { key: 'flags', label: 'Flags', value: flags.join('; '), detail: undefined },
    ],
    gaps,
  }
}

/**
 * Prepare Case Intelligence for any LLM prompt: contact redaction always;
 * medical detail only when LLM_ALLOW_PHI=true.
 */
export function prepareCaseIntelligenceForLlm<T extends IntelLike>(intel: T): {
  intel: T
  phiMode: LlmPhiMode
} {
  if (!llmAllowPhi()) {
    return { intel: toGapKeysOnlyCaseIntelligence(intel), phiMode: 'keys_only' }
  }
  return { intel: sanitizeCaseIntelligenceForLlm(intel), phiMode: 'phi_allowed' }
}

/** Deep-redact string fields on OpenAI-style chat messages. */
export function sanitizeLlmMessages<T extends { role: string; content?: unknown }>(messages: T[]): T[] {
  return messages.map((m) => {
    if (typeof m.content === 'string') {
      return { ...m, content: redactLlmPii(m.content) }
    }
    if (Array.isArray(m.content)) {
      return {
        ...m,
        content: m.content.map((part: any) => {
          if (part && typeof part === 'object' && typeof part.text === 'string') {
            return { ...part, text: redactLlmPii(part.text) }
          }
          return part
        }),
      }
    }
    return m
  })
}

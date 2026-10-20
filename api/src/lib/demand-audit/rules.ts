/**
 * The Demand Quality Audit rule catalog (spec v1.0, section 4).
 *
 * `resolve` is what a reviewer may do about an open finding:
 *  - 'fix': nothing. The letter or the record has to change and the audit rerun.
 *    Critical factual contradictions are never dismissible.
 *  - 'attorney': an attorney may close it with documented reasoning.
 *  - 'reviewer': any case-team member may close it with documented reasoning.
 *  - 'acknowledge': any case-team member may acknowledge it.
 */
export const DQA_RULE_VERSION = 'dqa-1.0.0'

export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type ResolvePolicy = 'fix' | 'attorney' | 'reviewer' | 'acknowledge'
export type SupportStatus =
  | 'supported'
  | 'partially_supported'
  | 'contradicted'
  | 'unsupported'
  | 'unverifiable'
  | 'not_applicable'

export interface DqaRule {
  id: string
  title: string
  severity: Severity
  group: 'identity' | 'liability' | 'medical' | 'damages' | 'exhibits' | 'process'
  resolve: ResolvePolicy
}

const rule = (id: string, title: string, severity: Severity, group: DqaRule['group'], resolve?: ResolvePolicy): DqaRule => ({
  id,
  title,
  severity,
  group,
  resolve: resolve ?? (severity === 'critical' ? 'fix' : severity === 'high' ? 'attorney' : severity === 'medium' ? 'reviewer' : 'acknowledge'),
})

export const DQA_RULES: Record<string, DqaRule> = Object.fromEntries(
  [
    rule('DQA-001', 'Claimant mismatch', 'critical', 'identity'),
    rule('DQA-002', 'Document from another case', 'critical', 'identity'),
    // The record may be the thing that is wrong; an attorney can say which date governs and why.
    rule('DQA-003', 'Unresolved accident-date conflict', 'critical', 'identity', 'attorney'),
    // "Without explanation": a documented explanation (prior treatment, a typo in the record) resolves it.
    rule('DQA-004', 'Treatment predates the accident', 'critical', 'identity', 'attorney'),
    rule('DQA-005', 'Future encounter represented as completed', 'critical', 'identity'),
    rule('DQA-006', 'Incorrect driver, passenger or defendant role', 'critical', 'identity'),
    rule('DQA-007', 'Unverified policy or claim number', 'high', 'identity'),
    rule('DQA-008', 'Unverified jurisdiction', 'high', 'identity'),
    rule('DQA-009', 'Unverified limitations deadline', 'high', 'identity'),
    rule('DQA-010', 'Duplicate encounter or bill', 'critical', 'identity'),

    rule('DQA-101', 'Unsupported police citation', 'critical', 'liability'),
    rule('DQA-102', 'Unsupported witness corroboration', 'critical', 'liability'),
    rule('DQA-103', 'Unsupported collision mechanism', 'critical', 'liability'),
    rule('DQA-104', 'Categorical liability without analysis', 'high', 'liability'),
    rule('DQA-105', 'Material comparative fault omitted', 'high', 'liability'),
    rule('DQA-106', 'Mischaracterized incident severity', 'critical', 'liability'),
    rule('DQA-107', 'Material claim without provenance', 'high', 'liability'),
    rule('DQA-108', 'Unresolved contradictory evidence', 'critical', 'liability'),

    rule('DQA-201', 'Diagnosis inconsistent with records', 'critical', 'medical'),
    rule('DQA-202', 'Material encounters missing', 'high', 'medical'),
    rule('DQA-203', 'Wrong treatment provider', 'high', 'medical'),
    rule('DQA-204', 'Invented imaging finding', 'critical', 'medical'),
    rule('DQA-205', 'Unsupported permanence or future care', 'critical', 'medical'),
    rule('DQA-206', 'Unsubstantiated medical causation', 'high', 'medical'),
    rule('DQA-207', 'Scheduled versus completed confusion', 'critical', 'medical'),
    rule('DQA-209', 'Material treatment gap omitted', 'medium', 'medical'),
    rule('DQA-210', 'Material symptoms or diagnoses omitted', 'high', 'medical'),

    rule('DQA-301', 'Incorrect line-item sums', 'critical', 'damages'),
    rule('DQA-302', 'Material medical charges omitted', 'high', 'damages'),
    rule('DQA-303', 'Billed, paid and recoverable amounts conflated', 'critical', 'damages'),
    rule('DQA-304', 'Unsupported wage loss', 'critical', 'damages'),
    rule('DQA-305', 'Damages categories do not reconcile', 'critical', 'damages'),
    rule('DQA-306', 'Demand amount not approved', 'critical', 'damages'),
    rule('DQA-307', 'Unsupported future loss', 'critical', 'damages'),
    rule('DQA-308', 'Duplicate charges', 'critical', 'damages'),
    rule('DQA-309', 'Untraceable monetary amount', 'high', 'damages'),

    rule('DQA-401', 'Irrelevant exhibit', 'high', 'exhibits'),
    rule('DQA-402', 'Missing cited exhibit', 'high', 'exhibits'),
    rule('DQA-403', 'Incorrect document or page citation', 'critical', 'exhibits'),
    rule('DQA-404', 'Exhibit index mismatch', 'medium', 'exhibits'),
    // A citation an attorney has checked against the reporter or code is not invented.
    rule('DQA-405', 'Invented or misstated legal authority', 'critical', 'exhibits', 'attorney'),
    rule('DQA-406', 'Unresolved settlement terms', 'high', 'exhibits'),
    rule('DQA-407', 'Placeholder or corrupt text', 'high', 'exhibits'),
    rule('DQA-408', 'Missing or stale attorney approval', 'critical', 'process'),

    // Fail closed: claim verification that did not finish never counts as a pass.
    rule('DQA-900', 'Claim verification incomplete', 'high', 'process', 'attorney'),
  ].map((r) => [r.id, r]),
)

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low']

export const DISPOSITIONS = ['attorney_judgment', 'verified_authority', 'manual_verification', 'not_applicable', 'acknowledged'] as const
export type Disposition = (typeof DISPOSITIONS)[number]

/** Shortest reasoning accepted where the rule asks for documented reasoning. */
export const MIN_REASON_CHARS = 20

export interface AuditEvidence {
  role: 'support' | 'conflict'
  fileId: string | null
  fileName: string | null
  exhibit: number | null
  page: number | null
  quote: string
}

export interface DraftFinding {
  ruleId: string
  title: string
  detail: string
  claim?: string | null
  support?: SupportStatus | null
  evidence?: AuditEvidence[]
  recommendation?: string | null
  /** What makes this finding the same finding on the next run. */
  key: string
  source: 'deterministic' | 'ai'
}

export function severityOf(ruleId: string): Severity {
  return DQA_RULES[ruleId]?.severity ?? 'high'
}

/**
 * Whether `actor` may close a finding of `ruleId` with `disposition`. Returns
 * the reason it may not, or null.
 */
export function resolutionRefusal(
  ruleId: string,
  disposition: string,
  reason: string,
  actor: { isAttorney: boolean },
): string | null {
  const r = DQA_RULES[ruleId]
  if (!r) return 'Unknown rule.'
  if (!(DISPOSITIONS as readonly string[]).includes(disposition)) return 'Choose how this finding was resolved.'
  if (r.resolve === 'fix') {
    return r.id === 'DQA-306'
      ? 'Approve the demand amount instead. It cannot be dismissed.'
      : 'This finding cannot be dismissed. Correct the letter or the record, then rerun the audit.'
  }
  if (r.resolve === 'attorney' && !actor.isAttorney) return 'Only an attorney can resolve this finding.'
  if (r.resolve === 'acknowledge') return null
  if (disposition === 'acknowledged') return 'This finding needs documented reasoning, not just an acknowledgement.'
  if (disposition === 'verified_authority' && r.id !== 'DQA-405') return 'That disposition only applies to legal authority.'
  if (disposition === 'manual_verification' && r.id !== 'DQA-900') return 'That disposition only applies to incomplete claim verification.'
  if (reason.trim().length < MIN_REASON_CHARS) return `Explain the resolution in at least ${MIN_REASON_CHARS} characters.`
  return null
}

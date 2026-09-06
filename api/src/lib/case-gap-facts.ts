/**
 * Which gaps a recorded answer can actually close.
 *
 * Gaps and proposable fact paths were two disconnected vocabularies: a gap knew
 * it was called `defendant_carrier` and the allowlist knew about
 * `insurance.defendant_carrier`, and nothing joined them. So the workbench could
 * tell a specialist what was missing but not open the field to record it.
 *
 * The mapping is written against what each gap's *detector* reads, not against
 * what its key is called. That distinction is the whole point: `employer_info`
 * checks `facts.employment.employer`, so proposing
 * `caseAcceleration.wageLoss.employerName` — the only employer field that was
 * proposable — recorded the answer somewhere the gap never looked, and the gap
 * stayed open no matter how many times a specialist asked. Mirrors on that spec
 * now cover the paths the detector reads.
 *
 * Deliberately partial. Three kinds of gap are absent, and a caller must treat
 * an absent gap as "not answerable" rather than falling back to a free-text
 * write:
 *
 *  - Document gaps (`medical_records`, `police_report`, `photos`, ...). These
 *    close when a file lands. They already carry `requestedDoc`.
 *  - Structured-record gaps (`first_party_coverage`, `coverage_unconfirmed`,
 *    `comparative_negligence_theory`). Their detectors read the InsuranceDetail
 *    and liability records, not `facts`, so no proposal against the facts
 *    document can close them however the answer is phrased.
 *  - Derived gaps (`damages_ledger_empty`, `daily_impact`). These follow from
 *    the ledger and the documentation engine.
 */
import { isProposableFactPath } from './case-fact-paths'

/**
 * Gap key to the fact paths that close it, best target first.
 *
 * Several detectors accept any of a set of paths; only the canonical one is
 * listed, and its spec mirrors the rest.
 */
export const GAP_FACT_PATHS: Record<string, string[]> = {
  // insurance.defendant_carrier, with insurance.carrier as a mirror.
  defendant_carrier: ['insurance.defendant_carrier', 'insurance.claim_number'],
  // Reads defendant_coverage_limits || policy_limit || policyLimit.
  defendant_policy_limits: ['insurance.defendant_coverage_limits'],
  // Reads facts.insurance.claim_number || claimNumber.
  claim_not_opened: ['insurance.claim_number'],
  // Reads facts.damages.med_charges || medical_bills.
  medical_specials_missing: ['damages.med_charges'],
  // Reads defendant.name and several aliases; defendant.name is canonical.
  defendant_identity: ['defendant.name'],
  // Reads injuryDetails.priorInjury || priorInjury.
  prior_injuries: ['injuryDetails.priorInjury'],
  // Reads product.manufacturer || product.brand.
  product_manufacturer: ['product.manufacturer'],
  // Reads employment.employer || damages.employer || employer.name || employerName.
  employer_info: ['caseAcceleration.wageLoss.employerName', 'caseAcceleration.wageLoss.datesMissed'],
  // Reads liability.hasWitnesses.
  witness_statements: ['liability.hasWitnesses'],
}

/** The fact paths a specialist can record to close this gap. Empty when none. */
export function factPathsForGap(gapKey: string): string[] {
  return GAP_FACT_PATHS[gapKey] ?? []
}

/**
 * Whether asking the claimant can close this gap.
 *
 * False does not mean the gap is unimportant — it means the remedy is a document
 * or a change to a structured record, so offering "record an answer" would
 * invite a specialist to type something that changes nothing.
 */
export function isAnswerableGap(gapKey: string): boolean {
  return factPathsForGap(gapKey).length > 0
}

/**
 * Every mapped path, for the test that keeps this file honest against the
 * allowlist. A path removed from `PROPOSABLE_FACT_PATHS` would otherwise leave a
 * gap pointing at a field the proposal endpoint rejects.
 */
export function unproposableMappedPaths(): string[] {
  return Object.values(GAP_FACT_PATHS)
    .flat()
    .filter((path) => !isProposableFactPath(path))
}

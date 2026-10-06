/**
 * Does this document name the person whose case it was filed on?
 *
 * Until now nothing asked. A document became "this claimant's medical record"
 * because the upload request carried their `assessmentId` — an id that, for an
 * anonymous intake or a texted portal link, is effectively the only credential
 * involved. The name printed on the page was read (`extractPatientName`), stored
 * in `ExtractedData.entities`, and never compared to anything. The intake wizard
 * did compare names, but only to *each other*: the first document uploaded
 * became the reference, so a wrong first file made every correct one look wrong.
 *
 * That matters more than a misfiled PDF, because extraction is not inert. Bills,
 * ICD/CPT codes and treatment dates off this document flow into
 * `runCaseRecalculation` and move the case's damages and severity. A stranger's
 * surgery becomes this claimant's valuation.
 *
 * So the comparison happens here, once, on the one path every ingress shares.
 * It does not block: OCR on a faxed, scanned, skewed medical record is not
 * reliable enough to refuse a claimant their own file over, and the cost of a
 * false rejection (a real client told their real records are not theirs) is far
 * worse than the cost of a flag an attorney dismisses.
 *
 * ## Why a shared token is enough to pass
 *
 * The rule is: any significant token in common means match. That is deliberately
 * lax, and the asymmetry is the point.
 *
 *   "Jane Doe" vs "Jane Smith"    -> match. Maiden and married names are the
 *                                   single most common legitimate difference on
 *                                   a woman's medical records, and flagging them
 *                                   would put a warning on a large share of
 *                                   perfectly ordinary files.
 *   "Bob Jones" vs "Robert Jones" -> match. Nicknames are not worth a dictionary.
 *   "John Smith" vs "Mary Smith"  -> match, and wrong. Two members of a household
 *                                   share a surname, so this check misses them.
 *
 * That last one is a real miss, accepted on purpose. A flag nobody trusts is
 * worth less than no flag: the attorney who dismisses ten maiden-name warnings
 * will dismiss the eleventh without reading it. Catching the unambiguous case —
 * a document belonging to an entirely different person — is the whole ambition.
 */
import { prisma } from './prisma'

/**
 * `unverified` means the comparison could not be made: no name was read off the
 * document, or the case has no claimant name. It is shown to the attorney so a
 * document that passed is distinguishable from one that was never compared, but
 * it is not a flag — it does not send the file to manual review or the fraud gate.
 */
export type IdentityVerdict = 'match' | 'mismatch' | 'unverified'

export type UnverifiedReason = 'no_document_name' | 'no_claimant_name'

/** Set on a `mismatch` from a whole-text check: the claimant appears nowhere in it. */
export type MismatchReason = 'claimant_not_named'

export interface IdentityCheck {
  verdict: IdentityVerdict
  /** The person the document names, as OCR read them. Empty when unreadable. */
  documentName: string
  /** The claimant the case belongs to. Empty when the case has none. */
  claimantName: string
  reason?: UnverifiedReason | MismatchReason
  checkedAt: string
}

/**
 * Categories where a document names one person, and that person should be the
 * claimant. Mirrors the intake wizard's list.
 *
 * Police reports and correspondence are excluded because they legitimately name
 * several people — the other driver, a witness, an adjuster — and
 * `extractPatientName` has no way to tell which capture is the subject. Checking
 * them would produce mismatches that are not errors. Police reports and witness
 * statements get the whole-text check in `NAME_PRESENCE_CATEGORIES` instead.
 */
export const IDENTITY_CHECKED_CATEGORIES = new Set([
  'medical_records',
  'bills',
  'wage_verification',
  'insurance_letters',
  'dec_page',
])

/**
 * Checked categories where a mismatch is expected and benign: a household
 * policy names whoever holds it, often a spouse or parent. These get the
 * warning but never count toward a fraud hold.
 */
export const FAMILY_POLICY_CATEGORIES = new Set(['insurance_letters', 'dec_page'])

/**
 * Categories that name several people, so no single extracted name is the
 * subject. Instead the whole text is searched: a report about this claimant
 * names them somewhere, and one that never does is probably someone else's.
 */
export const NAME_PRESENCE_CATEGORIES = new Set(['police_report', 'witness_statements'])

/**
 * A mismatch the claimant should hear about but that is not evidence of a
 * wrong person: a household policy, or a report OCR may simply have misread.
 * These never hold the case or drop the file from a demand.
 */
export function isAdvisoryMismatchCategory(category: string | null | undefined): boolean {
  const c = String(category || '')
  return FAMILY_POLICY_CATEGORIES.has(c) || NAME_PRESENCE_CATEGORIES.has(c)
}

/**
 * Honorifics, credentials and generational suffixes, which are shared by
 * unrelated people and would otherwise match everyone against everyone.
 */
const NAME_NOISE = new Set([
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof',
  'jr', 'sr', 'ii', 'iii', 'iv', 'v',
  'md', 'do', 'rn', 'lpn', 'np', 'pa', 'dds', 'phd', 'esq',
])

/**
 * The comparable parts of a name: lowercased, punctuation removed, credentials
 * dropped.
 *
 * Single letters go too, so a middle initial cannot be the only thing two names
 * have in common — "John A Doe" and "Mary A Smith" share nothing that matters.
 */
export function nameTokens(name: string | null | undefined): string[] {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !NAME_NOISE.has(token))
}

/**
 * Compare a document's name to the claimant's.
 *
 * Returns null — not a verdict — whenever either side is unreadable. A document
 * OCR could not get a name off is not evidence of anything, and recording it as
 * an outcome would bury the real flags among thousands of blanks.
 */
export function compareToClaimant(
  documentName: string | null | undefined,
  claimantName: string | null | undefined,
): IdentityVerdict | null {
  const docTokens = nameTokens(documentName)
  const claimantTokens = nameTokens(claimantName)
  if (docTokens.length === 0 || claimantTokens.length === 0) return null

  const shared = docTokens.some((token) => claimantTokens.includes(token))
  return shared ? 'match' : 'mismatch'
}

/** `plaintiffContext.firstName/lastName` out of the facts blob. */
function nameFromFacts(raw: string | null | undefined): string {
  if (!raw) return ''
  try {
    const facts = JSON.parse(raw) as {
      plaintiffContext?: { firstName?: unknown; lastName?: unknown }
    }
    const first = typeof facts?.plaintiffContext?.firstName === 'string' ? facts.plaintiffContext.firstName : ''
    const last = typeof facts?.plaintiffContext?.lastName === 'string' ? facts.plaintiffContext.lastName : ''
    return [first, last].filter(Boolean).join(' ').trim()
  } catch {
    // A case whose facts will not parse simply has no name to compare against,
    // which costs a check rather than failing an upload.
    return ''
  }
}

/**
 * Who this case belongs to.
 *
 * Facts first, then the owning user, matching how `import-claimant-match` reads
 * the same claimant: on an imported or anonymous case the `User` row is a
 * synthetic `guest+…` shadow with no real name on it, while a claimant who
 * registered themselves has one.
 */
export async function claimantNameForAssessment(assessmentId: string): Promise<string | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      facts: true,
      user: { select: { firstName: true, lastName: true } },
    },
  })
  if (!assessment) return null

  const fromFacts = nameFromFacts(assessment.facts)
  if (fromFacts) return fromFacts

  const fromUser = [assessment.user?.firstName, assessment.user?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
  return fromUser || null
}

/**
 * The verdict to store against one processed document, or null to store nothing.
 *
 * Null is reserved for documents the check does not apply to: no case, or a
 * category that names more than one person. A checked category always gets a
 * row, with `unverified` when either name is missing, so an attorney can tell
 * "names this client" from "nobody could read a name".
 */
export async function checkDocumentIdentity(params: {
  assessmentId: string | null
  category: string
  documentName: string | null | undefined
  /** Full OCR text; required for the whole-text categories. */
  documentText?: string | null
}): Promise<IdentityCheck | null> {
  const { assessmentId, category, documentName, documentText } = params
  if (!assessmentId) return null
  if (NAME_PRESENCE_CATEGORIES.has(category)) {
    return checkClaimantNamedInText(assessmentId, documentText, documentName)
  }
  if (!IDENTITY_CHECKED_CATEGORIES.has(category)) return null

  const checkedAt = new Date().toISOString()
  const claimantName = await claimantNameForAssessment(assessmentId)
  const readName = nameTokens(documentName).length > 0 ? String(documentName).trim() : ''
  if (!claimantName) {
    return { verdict: 'unverified', documentName: readName, claimantName: '', reason: 'no_claimant_name', checkedAt }
  }

  // Extraction misses many layouts. The whole text still answers the question,
  // so no extracted name falls back to it, and an extracted name that disagrees
  // is overruled when the claimant is named elsewhere on the page (a misread
  // label such as "Visit Type" is not a different person).
  const inText = claimantNamedInText(documentText, claimantName)
  if (!readName) {
    if (inText === 'mismatch') {
      return { verdict: 'mismatch', documentName: '', claimantName, reason: 'claimant_not_named', checkedAt }
    }
    if (inText === 'match') return { verdict: 'match', documentName: '', claimantName, checkedAt }
    return { verdict: 'unverified', documentName: '', claimantName, reason: 'no_document_name', checkedAt }
  }

  const verdict = compareToClaimant(readName, claimantName)
  if (!verdict) return null
  if (verdict === 'mismatch' && inText === 'match') {
    return { verdict: 'match', documentName: readName, claimantName, checkedAt }
  }
  return { verdict, documentName: readName, claimantName, checkedAt }
}

/**
 * True for a mismatch strong enough to hold a case or keep a file out of a
 * demand: a document that names someone else, in a category where that is not
 * expected. "Claimant not found in the text" is too dependent on OCR for that.
 */
export function isHardIdentityMismatch(
  category: string | null | undefined,
  check: IdentityCheck | null | undefined,
): boolean {
  return check?.verdict === 'mismatch' && check.reason !== 'claimant_not_named' && !isAdvisoryMismatchCategory(category)
}

/** Below this many letters OCR read too little to say who is or is not named. */
const MIN_PRESENCE_TEXT_CHARS = 25

/**
 * Pure core of the whole-text check. Same lax rule as `compareToClaimant`: one
 * shared name token anywhere in the text counts as named.
 */
export function claimantNamedInText(
  text: string | null | undefined,
  claimantName: string | null | undefined,
): IdentityVerdict | null {
  const claimantTokens = nameTokens(claimantName)
  if (claimantTokens.length === 0) return null
  if (String(text ?? '').replace(/[^a-z]/gi, '').length < MIN_PRESENCE_TEXT_CHARS) return null
  const textTokens = new Set(nameTokens(text))
  return claimantTokens.some((token) => textTokens.has(token)) ? 'match' : 'mismatch'
}

async function checkClaimantNamedInText(
  assessmentId: string,
  documentText: string | null | undefined,
  documentName: string | null | undefined,
): Promise<IdentityCheck> {
  const checkedAt = new Date().toISOString()
  const claimantName = await claimantNameForAssessment(assessmentId)
  const readName = nameTokens(documentName).length > 0 ? String(documentName).trim() : ''
  if (!claimantName) {
    return { verdict: 'unverified', documentName: readName, claimantName: '', reason: 'no_claimant_name', checkedAt }
  }
  const verdict = claimantNamedInText(documentText, claimantName)
  if (!verdict) {
    return { verdict: 'unverified', documentName: readName, claimantName, reason: 'no_document_name', checkedAt }
  }
  return verdict === 'mismatch'
    ? { verdict, documentName: readName, claimantName, reason: 'claimant_not_named', checkedAt }
    : { verdict, documentName: readName, claimantName, checkedAt }
}

/** Reads the column back, tolerating the null and the unparseable. */
export function parseIdentityCheck(raw: string | null | undefined): IdentityCheck | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as IdentityCheck
    return parsed?.verdict === 'match' || parsed?.verdict === 'mismatch' || parsed?.verdict === 'unverified'
      ? parsed
      : null
  } catch {
    return null
  }
}

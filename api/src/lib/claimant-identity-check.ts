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

export type IdentityVerdict = 'match' | 'mismatch'

export interface IdentityCheck {
  verdict: IdentityVerdict
  /** The person the document names, as OCR read them. */
  documentName: string
  /** The claimant the case belongs to. */
  claimantName: string
  checkedAt: string
}

/**
 * Categories where a document names one person, and that person should be the
 * claimant. Mirrors the intake wizard's list.
 *
 * Police reports and correspondence are excluded because they legitimately name
 * several people — the other driver, a witness, an adjuster — and
 * `extractPatientName` has no way to tell which capture is the subject. Checking
 * them would produce mismatches that are not errors.
 */
export const IDENTITY_CHECKED_CATEGORIES = new Set([
  'medical_records',
  'bills',
  'wage_verification',
  'insurance_letters',
])

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
 * Null covers every "we cannot say": a category that names more than one person,
 * a case with no claimant name recorded, a document OCR read no name off. Only a
 * real comparison produces a row.
 */
export async function checkDocumentIdentity(params: {
  assessmentId: string | null
  category: string
  documentName: string | null | undefined
}): Promise<IdentityCheck | null> {
  const { assessmentId, category, documentName } = params
  if (!assessmentId) return null
  if (!IDENTITY_CHECKED_CATEGORIES.has(category)) return null
  if (nameTokens(documentName).length === 0) return null

  const claimantName = await claimantNameForAssessment(assessmentId)
  const verdict = compareToClaimant(documentName, claimantName)
  if (!verdict || !claimantName) return null

  return {
    verdict,
    documentName: String(documentName).trim(),
    claimantName,
    checkedAt: new Date().toISOString(),
  }
}

/** Reads the column back, tolerating the null and the unparseable. */
export function parseIdentityCheck(raw: string | null | undefined): IdentityCheck | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as IdentityCheck
    return parsed?.verdict === 'match' || parsed?.verdict === 'mismatch' ? parsed : null
  } catch {
    return null
  }
}

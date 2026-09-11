/**
 * Catching a re-import of a client the firm already has.
 *
 * The existing dedupe keys on the export's own matter id, which is exact and
 * cheap but only works when the file carries one. A spreadsheet assembled by
 * hand usually does not, so re-uploading it created the whole caseload a
 * second time — every case duplicated, with no sign anything had gone wrong.
 *
 * The email address is the next best key, and the only other thing about a
 * claimant we can match on with any confidence. But it is a *person*, not a
 * matter: the same client can be back with a second accident, and refusing
 * that import would be its own bug. So the rule here is deliberately narrower
 * than "this email exists":
 *
 *   same email + same date of loss  -> the same matter. Skipped as a duplicate.
 *   same email + a different date   -> a second matter for a returning client.
 *                                      Imported, and pointed out.
 *
 * That keeps the guarantee `findExistingImportedCase` makes — we never
 * silently merge two different matters — while still stopping the accident
 * that actually happens.
 *
 * Email is not a queryable column anywhere: for an imported case it lives in
 * the `facts` JSON, and the `User` row holds a synthetic `guest+…` address. So
 * this reads the firm's active caseload once per import and indexes it in
 * memory, rather than issuing a query per row. One import is one query.
 */

import { prisma } from './prisma'
import { CLOSED_STATUSES } from './case-stage'
import { ENGAGED_LEAD_STATUSES } from './lead-status'
import { isGuestCaseUserEmail } from './client-consent-guard'

/** Whose caseload to search. Mirrors the import's own owner triple. */
export interface ClaimantMatchScope {
  attorneyId: string
  lawFirmId: string | null
}

/** A case the firm already has, described well enough to be recognised. */
export interface ExistingClaimantCase {
  assessmentId: string
  email: string
  /** Date of loss as `YYYY-MM-DD`, or null if the case has none recorded. */
  incidentDate: string | null
  /** For the message. Falls back to the email when the case has no name. */
  clientName: string
}

/** Active cases keyed by lowercased claimant email. */
export type ClaimantEmailIndex = Map<string, ExistingClaimantCase[]>

export type ClaimantMatch =
  | { kind: 'new' }
  /** The same client and the same date of loss. Almost certainly a re-upload. */
  | { kind: 'duplicate'; existing: ExistingClaimantCase }
  /** The same client, a different incident. A second matter, imported anyway. */
  | { kind: 'second_matter'; existing: ExistingClaimantCase }

/** Addresses are matched case-insensitively and trimmed; anything else is no key. */
export function normalizeClaimantEmail(value: string | null | undefined): string | null {
  const email = String(value ?? '').trim().toLowerCase()
  // Not a validity check — a row whose email column holds a phone number
  // should simply not participate in matching, rather than be rejected.
  if (!email || !email.includes('@')) return null
  return isGuestCaseUserEmail(email) ? null : email
}

/** `plaintiffContext.email` and `incident.date`, out of the facts blob. */
function readFacts(raw: string | null | undefined): {
  email: string | null
  incidentDate: string | null
  firstName: string
  lastName: string
} {
  const empty = { email: null, incidentDate: null, firstName: '', lastName: '' }
  if (!raw) return empty
  try {
    const facts = JSON.parse(raw) as {
      plaintiffContext?: { email?: unknown; firstName?: unknown; lastName?: unknown }
      incident?: { date?: unknown }
    }
    const date = facts?.incident?.date
    return {
      email: normalizeClaimantEmail(
        typeof facts?.plaintiffContext?.email === 'string' ? facts.plaintiffContext.email : null,
      ),
      // Sliced rather than parsed: these are written as `YYYY-MM-DD` but a
      // legacy row may carry a full timestamp, and only the day matters.
      incidentDate: typeof date === 'string' && date ? date.slice(0, 10) : null,
      firstName: typeof facts?.plaintiffContext?.firstName === 'string' ? facts.plaintiffContext.firstName : '',
      lastName: typeof facts?.plaintiffContext?.lastName === 'string' ? facts.plaintiffContext.lastName : '',
    }
  } catch {
    // A case whose facts will not parse cannot be matched against, which is the
    // safe direction: the import proceeds rather than being blocked by a row
    // nobody can read.
    return empty
  }
}

/**
 * Index the firm's active caseload by claimant email.
 *
 * Scoped to this attorney and, where there is one, their firm — the same
 * ownership the import stamps. Deliberately not platform-wide: whether some
 * other firm has this client is not something we would tell them, and a
 * claimant who also came through the marketplace is not a reason to refuse an
 * attorney their own client's file.
 *
 * "Active" is both status vocabularies at once, because they disagree: a lead
 * can be engaged while its assessment has been closed out. A closed case is not
 * a duplicate — re-importing a client whose last matter is finished is exactly
 * what a returning client looks like.
 */
export async function indexActiveCasesByEmail(
  owner: ClaimantMatchScope,
): Promise<ClaimantEmailIndex> {
  const or: any[] = [{ assignedAttorneyId: owner.attorneyId }]
  if (owner.lawFirmId) {
    or.push(
      { assignedAttorney: { lawFirmId: owner.lawFirmId } },
      { assessment: { lawFirmId: owner.lawFirmId } },
    )
  }

  const leads = await prisma.leadSubmission.findMany({
    where: { status: { in: [...ENGAGED_LEAD_STATUSES] }, OR: or },
    select: {
      assessment: {
        select: {
          id: true,
          status: true,
          facts: true,
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
  })

  const index: ClaimantEmailIndex = new Map()
  for (const { assessment } of leads) {
    if (!assessment) continue
    if (CLOSED_STATUSES.has(String(assessment.status || '').toLowerCase())) continue

    const facts = readFacts(assessment.facts)
    // Facts first, then the owning user. For an imported case the user row is
    // a `guest+…` shadow, which `normalizeClaimantEmail` discards; for a case
    // the claimant registered for themselves, the user row is the real one.
    const email = facts.email ?? normalizeClaimantEmail(assessment.user?.email)
    if (!email) continue

    const name =
      [facts.firstName, facts.lastName].filter(Boolean).join(' ').trim() ||
      [assessment.user?.firstName, assessment.user?.lastName].filter(Boolean).join(' ').trim() ||
      email

    const existing = index.get(email) ?? []
    existing.push({
      assessmentId: assessment.id,
      email,
      incidentDate: facts.incidentDate,
      clientName: name,
    })
    index.set(email, existing)
  }
  return index
}

/**
 * What the firm already has for this email and date of loss.
 *
 * Pure, so the two-tier rule can be tested without a caseload behind it. A row
 * with no email is always `new`: an address we do not have is not evidence of
 * anything, and the preview warns about those rows separately.
 */
export function matchExistingClaimant(
  index: ClaimantEmailIndex,
  email: string | null | undefined,
  incidentDate: string,
): ClaimantMatch {
  const key = normalizeClaimantEmail(email)
  if (!key) return { kind: 'new' }

  const cases = index.get(key)
  if (!cases || cases.length === 0) return { kind: 'new' }

  const sameIncident = cases.find((item) => item.incidentDate === incidentDate)
  if (sameIncident) return { kind: 'duplicate', existing: sameIncident }

  // A case on file for this person but a different incident. Reported against
  // the oldest, which is the one they are most likely to mistake this for.
  return { kind: 'second_matter', existing: cases[0] }
}

/** The duplicate message, naming the client and why the row was not created. */
export function duplicateReason(existing: ExistingClaimantCase, incidentDate: string): string {
  return `${existing.clientName} (${existing.email}) already has an active case with this date of loss (${incidentDate}). Skipped so the caseload does not gain a second copy.`
}

/** The heads-up for a returning client, which is imported rather than skipped. */
export function secondMatterNotice(existing: ExistingClaimantCase, incidentDate: string): string {
  const other = existing.incidentDate ? ` dated ${existing.incidentDate}` : ''
  return `${existing.clientName} (${existing.email}) already has an active case${other}. This row has a different date of loss (${incidentDate}), so it was imported as a separate matter.`
}

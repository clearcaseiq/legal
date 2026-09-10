/**
 * Building a case an attorney owns from the outset.
 *
 * Every attorney-facing query in the product is rooted at `LeadSubmission` —
 * the caseload list, the workspace, the pipeline, the metrics. An `Assessment`
 * on its own is not a case any attorney can see. The previous helper here wrote
 * exactly that and nothing else, so a case an attorney created by hand or
 * imported from their own CMS was invisible in their own dashboard the moment
 * it was created.
 *
 * This writes the whole set, in one transaction:
 *
 *   Assessment  → the case of record, COMPLETED rather than DRAFT so the ops
 *                 queue and the analytics filters can see it
 *   User        → a shadow owner, because `EvidenceFile.userId` is non-nullable
 *                 and documents need somebody to belong to
 *   LeadSubmission → the row that makes it a case, claimed by this attorney
 *
 * The valuation and the reference code are deliberately outside the
 * transaction; see `createAttorneyOwnedCase` for why.
 */
import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { logger } from './logger'
import { serializeCaseFacts } from './case-facts'
import { assignReferenceCode } from './case-reference'
import { ensureAssessmentPrediction } from './prediction-materializer'

/**
 * `LeadSubmission.sourceType` for a case the attorney brought themselves.
 *
 * A plain string column, not an enum, so this needs no migration — and it is
 * already a filter on `/leads/filtered`, so it reaches the UI for free.
 *
 * It carries more than provenance. Three separate rules read it: the routing
 * engine must never offer these cases to anyone, the routing fee must not be
 * charged for a lead we did not source, and the consent gates must not treat
 * the absence of consumer marketplace consents as a defect.
 */
export const ATTORNEY_SELF_SOURCE = 'attorney_self'

/** How the case got here. Recorded on the facts so read paths can branch. */
export type AttorneyCaseOrigin = 'manual' | 'import'

export type AttorneyCaseInput = {
  claimType: string
  venueState: string
  venueCounty?: string | null
  /** ISO date. Required — the SOL clock is meaningless without it. */
  incidentDate: string
  narrative?: string
  plaintiffFirstName?: string
  plaintiffLastName?: string
  plaintiffEmail?: string
  plaintiffPhone?: string
  /** Import provenance. Absent for a hand-created case. */
  importSource?: string
  externalId?: string | null
  rawImport?: Record<string, unknown>
}

export type AttorneyCaseOwner = {
  attorneyId: string
  lawFirmId: string | null
  /** For the audit trail on the facts blob. */
  createdByUserId?: string | null
}

export type AttorneyCaseResult = {
  assessmentId: string
  referenceCode: string | null
}

/**
 * The provenance marker every downstream gate reads.
 *
 * Written into `facts.origin` rather than added as a column because the facts
 * blob is what the valuation, readiness and consent readers already load. A
 * column would mean widening every one of those queries.
 */
export function attorneyOriginFacts(origin: AttorneyCaseOrigin, owner: AttorneyCaseOwner, input: AttorneyCaseInput) {
  return {
    kind: ATTORNEY_SELF_SOURCE,
    origin,
    attorneyId: owner.attorneyId,
    lawFirmId: owner.lawFirmId,
    createdByUserId: owner.createdByUserId ?? null,
    createdAt: new Date().toISOString(),
    ...(input.importSource
      ? { importSource: input.importSource, externalId: input.externalId ?? null }
      : {}),
  }
}

/**
 * True for a case the attorney brought with them rather than one we routed.
 *
 * The distinction matters wherever a rule exists to protect a consumer who
 * arrived through our funnel. Such a claimant has agreed to terms, a privacy
 * policy and a HIPAA authorization, and the product is right to insist on all
 * three before sharing anything. Somebody already represented by the firm
 * importing them has done none of that with us, and never will — their
 * engagement is with the firm and predates us entirely. Reading that absence
 * as missing paperwork puts a permanent defect on every imported case.
 */
export function isAttorneyOwnedCase(facts: unknown): boolean {
  if (!facts || typeof facts !== 'object') return false
  const origin = (facts as { origin?: { kind?: unknown } }).origin
  return Boolean(origin && origin.kind === ATTORNEY_SELF_SOURCE)
}

/**
 * The synthetic owner for a claimant who has never used the product.
 *
 * Same shape the evidence-upload path already mints for anonymous intake, and
 * deliberately so: `isGuestCaseUserEmail` recognises it, guest-case adoption
 * will hand the case over if the claimant later signs up under the email the
 * attorney recorded, and `isExemptFromClientConsent` already skips consent
 * checks for it.
 */
function shadowOwnerEmail(assessmentId: string): string {
  return `guest+${assessmentId}@caseiq.local`
}

/**
 * Facts for a case whose claimant never filled anything in.
 *
 * Sparse on purpose. Every absent field here is a real gap the attorney has to
 * fill, and inventing plausible values to make the case look complete would put
 * a number on a screen that nobody said.
 */
function buildFacts(input: AttorneyCaseInput, origin: AttorneyCaseOrigin, owner: AttorneyCaseOwner) {
  return {
    incident: {
      date: input.incidentDate,
      narrative: input.narrative || '',
    },
    injuries: [],
    treatment: [],
    damages: {},
    plaintiffContext: {
      firstName: input.plaintiffFirstName || '',
      lastName: input.plaintiffLastName || '',
      email: input.plaintiffEmail || '',
      phone: input.plaintiffPhone || '',
    },
    ...(input.importSource
      ? {
          importSource: {
            source: input.importSource,
            externalId: input.externalId ?? null,
            raw: input.rawImport ?? null,
          },
        }
      : {}),
    origin: attorneyOriginFacts(origin, owner, input),
    /**
     * All false, and correctly so — this claimant has consented to nothing with
     * us. `facts.origin` above is what stops readers treating that as a defect;
     * see `isAttorneyOwnedCase`. Recording it honestly matters more than making
     * the case look complete, because the one thing these flags must never do
     * is imply an authorization we do not hold.
     */
    consents: { tos: false, privacy: false, ml_use: false, hipaa: false },
  }
}

/**
 * Create a case the attorney already owns, fully formed.
 *
 * The transaction covers the three rows that must exist together. A case with
 * an `Assessment` but no `LeadSubmission` is invisible; one with a
 * `LeadSubmission` but no owner cannot hold a document. Partially writing
 * either state is worse than failing, which is what the previous helper did on
 * every single call.
 *
 * The reference code and the valuation are deliberately left outside it. Both
 * are recoverable — `ensureReferenceCode` mints lazily on read and
 * `ensureAssessmentPrediction` backfills on any list that renders the case — so
 * holding a transaction open across them would trade a real risk (a long
 * transaction during a 500-row import) for a cosmetic one.
 */
export async function createAttorneyOwnedCase(
  input: AttorneyCaseInput,
  owner: AttorneyCaseOwner,
  origin: AttorneyCaseOrigin,
  /** Supply the ambient transaction when creating many cases as one unit. */
  tx?: Prisma.TransactionClient,
): Promise<AttorneyCaseResult> {
  const run = async (client: Prisma.TransactionClient) => {
    const assessment = await client.assessment.create({
      data: {
        claimType: input.claimType,
        venueState: input.venueState,
        venueCounty: input.venueCounty || null,
        // COMPLETED, not DRAFT. The admin routing queue, the ops inbox and
        // every analytics aggregate filter on this, so a DRAFT case is invisible
        // to operations as well as to the attorney.
        status: 'COMPLETED',
        facts: serializeCaseFacts(buildFacts(input, origin, owner)),
        lawFirmId: owner.lawFirmId,
        lastWriteSource: origin === 'import' ? 'cms_inbound' : 'attorney',
      },
      select: { id: true },
    })

    // The shadow owner needs the assessment id, so it cannot be created first.
    const shadowUser = await client.user.create({
      data: {
        email: shadowOwnerEmail(assessment.id),
        firstName: input.plaintiffFirstName || 'Client',
        lastName: input.plaintiffLastName || '',
        role: 'client',
        // No password and no provider: this is a placeholder, not an account.
        // `isTransferableCaseOwner` treats it as claimable, so if the claimant
        // ever registers under the email the attorney recorded, the case moves
        // to them rather than being duplicated.
        provider: 'intake',
      },
      select: { id: true },
    })

    await client.assessment.update({
      where: { id: assessment.id },
      data: { userId: shadowUser.id },
    })

    await client.leadSubmission.create({
      data: {
        assessmentId: assessment.id,
        // Scored at 0.5 rather than 0. These are priors for a case nobody has
        // assessed yet, and a zero would read as "we evaluated this and it is
        // worthless" everywhere the number is displayed. The real valuation
        // lands via `ensureAssessmentPrediction` below.
        viabilityScore: 0.5,
        liabilityScore: 0.5,
        causationScore: 0.5,
        damagesScore: 0.5,
        evidenceChecklist: JSON.stringify({ required: [] }),
        // The ownership claim, and the whole point of this function. Without
        // these three the routing engine treats the case as an available
        // marketplace lead and may offer the attorney's own client to a rival.
        assignedAttorneyId: owner.attorneyId,
        assignmentType: 'exclusive',
        isExclusive: true,
        routingLocked: true,
        sourceType: ATTORNEY_SELF_SOURCE,
        sourceDetails: JSON.stringify({
          origin,
          attorneyId: owner.attorneyId,
          lawFirmId: owner.lawFirmId,
          ...(input.importSource ? { importSource: input.importSource } : {}),
        }),
        // Already with its attorney. It was never routed and never will be.
        status: 'accepted',
        lifecycleState: 'attorney_engaged',
        submittedAt: new Date(),
      },
    })

    return assessment.id
  }

  const assessmentId = tx ? await run(tx) : await prisma.$transaction(run)

  // Outside the transaction; both are self-healing if they fail here.
  const referenceCode = await assignReferenceCode(assessmentId)
  try {
    await ensureAssessmentPrediction(assessmentId)
  } catch (error) {
    // Never fatal. An unvalued case still appears in the caseload, and the
    // materializer retries on the next read.
    logger.warn('Could not value an attorney-created case at creation', {
      assessmentId,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  logger.info('Attorney-owned case created', {
    assessmentId,
    origin,
    attorneyId: owner.attorneyId,
    lawFirmId: owner.lawFirmId,
  })

  return { assessmentId, referenceCode }
}

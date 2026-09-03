/**
 * Two-party recording consent, checked before a call connects.
 *
 * The Amazon Connect contact flow records from its very first action, before
 * anything could intervene, and the transfer that brings the attorney onto the
 * line happens two actions later. There is no branch in the flow and no path
 * through it that does not record. So the only place a recording can be
 * prevented is here, before `startOutboundCall` is called at all.
 *
 * What was wrong before this module:
 *
 * - Consent was checked against the **calling user only**. In a state that
 *   requires every party to consent, one party's agreement is not consent.
 * - The `call_recording` template asserted that "the spoken notice at the start
 *   of the call provides notice to everyone on the line". The flow plays that
 *   notice to the customer leg only, and before the attorney is transferred in,
 *   so the attorney never hears it. The claim was not true.
 * - Nothing anywhere knew which states require all-party consent.
 */
import { prisma } from './prisma'
import { logger } from './logger'

/**
 * States whose wiretap statutes require every party to a call to consent.
 *
 * Compiled conservatively: where a state's rule is contested, unsettled, or
 * turns on whether the conversation is "confidential", it is included. The cost
 * of wrongly including a state is that we ask one more person for permission.
 * The cost of wrongly excluding one is a criminal statute and a civil claim, and
 * in several of these states a recording made without all-party consent is also
 * inadmissible — which would destroy the evidentiary value that is the entire
 * reason for recording.
 *
 * Nevada is included because its Supreme Court has read the telephone provision
 * as requiring all-party consent despite the statute's one-party language for
 * in-person conversations. Connecticut is included on its civil statute.
 * Michigan and Oregon are contested for telephone calls and are included for
 * the same reason.
 */
export const ALL_PARTY_CONSENT_STATES = new Set([
  'CA', // California - Penal Code 632
  'CT', // Connecticut - Gen. Stat. 52-570d (civil)
  'DE', // Delaware
  'FL', // Florida - 934.03
  'IL', // Illinois - 720 ILCS 5/14-2
  'MD', // Maryland - Cts. & Jud. Proc. 10-402
  'MA', // Massachusetts - ch. 272 s. 99
  'MI', // Michigan - contested for telephone
  'MT', // Montana
  'NV', // Nevada - telephone, per Lane v. Allstate
  'NH', // New Hampshire
  'OR', // Oregon - contested for telephone
  'PA', // Pennsylvania - 18 Pa.C.S. 5704
  'WA', // Washington - RCW 9.73.030
])

export function requiresAllPartyConsent(state: string | null | undefined): boolean {
  if (!state) return false
  return ALL_PARTY_CONSENT_STATES.has(state.trim().toUpperCase())
}

export const CALL_RECORDING_CONSENT = 'call_recording'

export type RecordingConsentCheck =
  | { ok: true; allParty: boolean; state: string | null }
  | { ok: false; reason: 'plaintiff_consent_required' | 'attorney_consent_required'; allParty: boolean; state: string | null }

/**
 * The state whose law governs the recording.
 *
 * This is the honest weak point and it is worth stating plainly rather than
 * hiding: nothing in the schema records where the claimant physically is.
 * `User` has no address at all, and `Assessment.venueState` is where the
 * *incident* happened — sometimes itself an IP-geolocation guess made during
 * intake. Someone injured in Nevada who lives in California is stored as `NV`.
 *
 * So this deliberately errs toward the stricter rule: if **either** the venue
 * state or the attorney's state requires all-party consent, treat the call as
 * all-party. Asking one extra person for permission is the recoverable error.
 */
export function governingStates(input: {
  venueState?: string | null
  attorneyState?: string | null
}): { states: string[]; allParty: boolean } {
  const states = [input.venueState, input.attorneyState]
    .map((state) => (state || '').trim().toUpperCase())
    .filter(Boolean)
  return { states, allParty: states.some(requiresAllPartyConsent) }
}

async function hasConsent(where: { userId?: string; attorneyId?: string }, version: string): Promise<boolean> {
  const consent = await prisma.consent.findFirst({
    where: {
      ...(where.userId ? { userId: where.userId } : {}),
      ...(where.attorneyId ? { metadata: { contains: `"attorneyId":"${where.attorneyId}"` } } : {}),
      consentType: CALL_RECORDING_CONSENT,
      granted: true,
      revokedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    select: { version: true },
  })
  if (!consent) return false
  // A stale version is not consent to the current terms.
  return consent.version === version
}

/**
 * Decide whether this call may be recorded.
 *
 * In a one-party state the caller's own consent is enough, which is what the
 * previous behaviour assumed everywhere. In an all-party state the attorney has
 * to have consented too — and because `Attorney` has no user account of its
 * own, their consent is stored as a `Consent` row carrying the attorney id in
 * `metadata`, the same shape `attorney_share` already uses to name the firms an
 * authorization covers.
 */
export async function checkRecordingConsent(input: {
  plaintiffUserId: string
  attorneyId: string
  venueState?: string | null
  attorneyState?: string | null
  templateVersion: string
}): Promise<RecordingConsentCheck> {
  const { states, allParty } = governingStates(input)
  const state = states[0] ?? null

  if (!(await hasConsent({ userId: input.plaintiffUserId }, input.templateVersion))) {
    return { ok: false, reason: 'plaintiff_consent_required', allParty, state }
  }

  if (allParty && !(await hasConsent({ attorneyId: input.attorneyId }, input.templateVersion))) {
    logger.info('Recording blocked: all-party state and no attorney consent on file', {
      attorneyId: input.attorneyId,
      states,
    })
    return { ok: false, reason: 'attorney_consent_required', allParty, state }
  }

  return { ok: true, allParty, state }
}

/** Record an attorney's standing consent to have their calls recorded. */
export async function recordAttorneyRecordingConsent(input: {
  attorneyId: string
  version: string
  documentId: string
  consentText: string
  consentHash: string
  ipAddress?: string | null
  userAgent?: string | null
}): Promise<void> {
  await prisma.consent.create({
    data: {
      consentType: CALL_RECORDING_CONSENT,
      version: input.version,
      documentId: input.documentId,
      granted: true,
      grantedAt: new Date(),
      signatureMethod: 'clicked',
      ipAddress: input.ipAddress ?? undefined,
      userAgent: input.userAgent ?? undefined,
      consentText: input.consentText,
      consentHash: input.consentHash,
      metadata: JSON.stringify({ attorneyId: input.attorneyId }),
    },
  })
}

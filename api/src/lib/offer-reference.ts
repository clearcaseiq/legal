/**
 * Short codes that tie an SMS reply back to the offer it is answering.
 *
 * The inbound webhook knows only the sender's phone number. When an attorney
 * holds two open offers it used to apply the reply to whichever was routed most
 * recently — which is the wrong case whenever they are answering the older
 * message, and the attorney has no way to tell that it went wrong.
 *
 * The code is derived from the introduction id rather than stored, so there is
 * no column to keep in sync and nothing to allocate or expire. Only the leading
 * characters are used: matching is always scoped to one attorney's pending
 * offers, so the code has to separate a handful of rows rather than be globally
 * unique.
 */

const CODE_LENGTH = 6

/** The code printed in the outbound offer message. */
export function offerReferenceCode(introductionId: string): string {
  return introductionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, CODE_LENGTH).toUpperCase()
}

/** The line asking the attorney to quote the code back. */
export function offerReplyInstruction(introductionId: string, timeoutMinutes: number): string {
  const code = offerReferenceCode(introductionId)
  return `Reply ACCEPT ${code} to accept or DECLINE ${code} to decline. (${timeoutMinutes} min)`
}

export type OfferSelection =
  | { ok: true; introductionId: string }
  | { ok: false; reason: 'none' | 'unknown_code' | 'ambiguous' }

/**
 * Pick the offer an inbound reply refers to.
 *
 * A quoted code wins outright. Without one we can only fall back to "the single
 * open offer", and where there is more than one the reply is genuinely
 * ambiguous: guessing risks accepting the wrong case on the attorney's behalf,
 * so the caller is asked to include the code instead. The fallback still covers
 * offers sent before codes existed, and the common case of one open offer.
 */
export function selectOfferForReply(
  pendingOffers: Array<{ id: string }>,
  quotedCode: string | null
): OfferSelection {
  if (pendingOffers.length === 0) return { ok: false, reason: 'none' }

  if (quotedCode) {
    const wanted = quotedCode.toUpperCase()
    const matches = pendingOffers.filter((offer) => offerReferenceCode(offer.id) === wanted)
    if (matches.length === 1) return { ok: true, introductionId: matches[0].id }
    return { ok: false, reason: matches.length === 0 ? 'unknown_code' : 'ambiguous' }
  }

  if (pendingOffers.length === 1) return { ok: true, introductionId: pendingOffers[0].id }
  return { ok: false, reason: 'ambiguous' }
}

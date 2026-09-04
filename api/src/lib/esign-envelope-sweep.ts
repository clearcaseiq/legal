/**
 * E-signature envelope reconciliation sweep.
 *
 * A signed retainer is what turns a lead into a client: `onRetainerSigned` marks
 * the lead retained, opens the case, and creates the Day-1 checklist. All of it
 * hangs off the envelope reaching `signed`, and only two things move it there —
 * a provider webhook hitting /v1/webhooks/esign/:provider, or an attorney
 * opening that one lead's signature panel, which polls it by hand.
 *
 * Both are things that can silently not happen. Webhook delivery depends on
 * configuration held at the provider, outside this repo and unverifiable from
 * it; the manual poll depends on somebody thinking to look. When neither fires,
 * the client has signed and the platform does not know: the lead stays
 * un-retained, no case opens, and the plaintiff's dashboard sits on
 * "Consultation" while everyone assumes the paperwork is done.
 *
 * So this closes the loop the way the rest of the platform does — a periodic
 * reconciliation that re-reads the truth from the provider. It is the same poll
 * the signature panel runs, applied to every open envelope rather than one
 * lead's, which means it inherits the full side-effect path (executed PDF,
 * filing into case documents, retainer completion) rather than reimplementing it.
 *
 * Exposed to the in-process scheduler (api/src/index.ts). Idempotent: an
 * envelope whose status has not moved is left untouched, and once it leaves the
 * open set it stops being selected at all.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import { isESignatureConfigured } from './esign'
import { OPEN_ENVELOPE_STATUSES, syncEnvelopeStatus } from './esign/esign-service'

export interface EsignEnvelopeSweepResult {
  /** Open envelopes examined this run. */
  scanned: number
  /** Envelopes whose status actually moved. */
  advanced: number
  /** Of those, the ones that reached `signed`. */
  signed: number
  /** True when no provider has credentials, so nothing was polled. */
  skipped: boolean
}

/** Cap per run so one sweep cannot monopolise the provider's rate limit. */
const MAX_ENVELOPES_PER_RUN = 200

/**
 * How far back to keep polling. An envelope nobody signed in three months is
 * abandoned rather than pending, and re-asking the provider about it forever
 * spends rate limit on an answer that will not change.
 */
const MAX_AGE_DAYS = 90

export async function runEsignEnvelopeSweep(): Promise<EsignEnvelopeSweepResult> {
  const result: EsignEnvelopeSweepResult = { scanned: 0, advanced: 0, signed: 0, skipped: false }

  // Nothing to poll against, and getESignatureProvider would throw per envelope.
  if (!isESignatureConfigured()) {
    result.skipped = true
    return result
  }

  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000)

  const open = await prisma.documentEnvelope.findMany({
    where: {
      status: { in: Array.from(OPEN_ENVELOPE_STATUSES) },
      externalEnvelopeId: { not: null },
      createdAt: { gte: cutoff },
    },
    // Oldest first: the ones most likely to have been signed and missed.
    orderBy: { createdAt: 'asc' },
    take: MAX_ENVELOPES_PER_RUN,
  })

  for (const env of open) {
    result.scanned += 1
    const moved = await syncEnvelopeStatus(env)
    if (!moved) continue

    result.advanced += 1

    // Re-read rather than trusting the provider's reported status, so `signed`
    // here means the transition was actually persisted.
    const after = await prisma.documentEnvelope
      .findUnique({ where: { id: env.id }, select: { status: true, documentType: true } })
      .catch(() => null)
    if (after?.status !== 'signed') continue

    result.signed += 1
    // Worth its own line: this is a signature the webhook did not deliver, and
    // a run of these means the provider callback needs looking at.
    logger.info('Envelope reached signed via reconciliation sweep rather than webhook', {
      envelopeId: env.id,
      leadId: env.leadId,
      documentType: after.documentType,
      provider: env.provider,
    })
  }

  return result
}

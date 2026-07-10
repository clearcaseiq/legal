/**
 * Provider-agnostic e-signature contract.
 *
 * Mirrors the CMS connector pattern (see ../cms/types.ts): one neutral
 * interface that Dropbox Sign, a self-hosted Documenso, or an eventual
 * in-house signer all implement. The rest of the app talks to
 * `ESignatureProvider` only, so swapping providers — or bringing signing
 * in-house later — never touches routes or UI.
 *
 * Envelope state is persisted on the `DocumentEnvelope` Prisma model; the
 * `status` column there is the source of truth for the "Documents & E-sign"
 * surface, replacing the old approach of inferring "retained" from lifecycle.
 */

export type ESignProviderId = 'dropbox_sign' | 'documenso' | 'internal'

export type EnvelopeStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'declined'
  | 'voided'
  | 'expired'

export type SignableDocumentType =
  | 'retainer'
  | 'hipaa_authorization'
  | 'fee_agreement'
  | 'other'

export interface ESignProviderMeta {
  id: ESignProviderId
  label: string
  /** Whether the server has the credentials/config needed to use it. */
  configured: boolean
  /** True when the provider will sign a BAA (required for HIPAA authorizations). */
  hipaaCapable: boolean
  /** Short note shown in the connect/settings UI. */
  notes?: string
  docsUrl?: string
}

/** Request to create + send a new signature envelope for a single signer. */
export interface CreateEnvelopeInput {
  documentType: SignableDocumentType
  title: string
  signerName: string
  signerEmail: string
  /** Absolute path to the source PDF (rendered from a template) to be signed. */
  filePath: string
  /** Where to send the signer after completion (embedded/hosted flows). */
  redirectUrl?: string
  /** Opaque reference stored with the provider for idempotency + webhook match. */
  reference?: string
  /** Extra key/values surfaced to the provider (e.g. leadId, attorneyId). */
  metadata?: Record<string, string>
}

export interface CreateEnvelopeResult {
  externalEnvelopeId: string
  /** Embedded or hosted URL the signer uses; null for pure email flows. */
  signingUrl: string | null
  status: EnvelopeStatus
}

export interface EnvelopeStatusResult {
  status: EnvelopeStatus
  signedAt?: string | null
  auditTrailUrl?: string | null
}

/** Normalized webhook event, mapped from a provider-specific payload. */
export interface ESignWebhookEvent {
  externalEnvelopeId: string
  status: EnvelopeStatus
  signedAt?: string | null
  /** The raw provider event type, for logging/debugging. */
  rawType?: string
}

export interface ESignatureProvider {
  readonly id: ESignProviderId
  readonly label: string

  meta(): ESignProviderMeta

  /** Create + send an envelope. Returns the provider id to persist. */
  createEnvelope(input: CreateEnvelopeInput): Promise<CreateEnvelopeResult>

  /** Poll current status (fallback when webhooks are unavailable). */
  getStatus(externalEnvelopeId: string): Promise<EnvelopeStatusResult>

  /** Download the fully-executed PDF once status is `signed`. */
  downloadSigned(externalEnvelopeId: string): Promise<Buffer>

  /**
   * Cancel/void an in-flight envelope so it can no longer be signed. Optional:
   * providers that don't support cancellation omit it (routes surface a clear
   * "not supported" error).
   */
  voidEnvelope?(externalEnvelopeId: string): Promise<void>

  /** Re-send the signing email to nudge a signer who hasn't completed. Optional. */
  sendReminder?(externalEnvelopeId: string): Promise<void>

  /**
   * Correct the signer's email (and optionally name) on an in-flight envelope
   * and re-send. Optional. Used when a request went to the wrong address.
   */
  updateSignerEmail?(externalEnvelopeId: string, email: string, name?: string): Promise<void>

  /**
   * Verify + normalize an inbound webhook. Returns null when the payload is
   * not a recognized/relevant event. Implementations MUST verify the provider
   * signature before trusting the body.
   */
  parseWebhook(rawBody: string, headers: Record<string, string>): ESignWebhookEvent | null

  /**
   * Optional provider-specific acknowledgement body the webhook endpoint must
   * echo back verbatim (e.g. Dropbox Sign requires "Hello API Event Received").
   * Return undefined to send the default JSON ack.
   */
  webhookAck?(): string
}

export class ESignNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`E-signature provider "${provider}" is not configured on this server`)
    this.name = 'ESignNotConfiguredError'
  }
}

export class ESignNotImplementedError extends Error {
  constructor(provider: string, method: string) {
    super(`E-signature provider "${provider}" has not implemented ${method}() yet`)
    this.name = 'ESignNotImplementedError'
  }
}

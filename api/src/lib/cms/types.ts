/**
 * Shared types for the CMS integration framework (Phase 0).
 *
 * A `CmsConnector` is the provider-agnostic contract every case-management
 * system (Clio, Filevine, SmartAdvocate, CasePeer, Zapier) implements. The
 * export service maps platform data into the neutral `Cms*Input` shapes below
 * and hands them to the connector, which translates to provider-specific calls.
 */

export type CmsProviderId =
  | 'clio'
  | 'filevine'
  | 'smartadvocate'
  | 'casepeer'
  | 'zapier'

/** How a connection authenticates — drives the connect UX. */
export type CmsAuthType = 'oauth' | 'pat' | 'partner' | 'webhook'

export interface CmsProviderMeta {
  id: CmsProviderId
  label: string
  authType: CmsAuthType
  /** Whether the server currently has the credentials needed to use it. */
  configured: boolean
  /** Short note shown in the connect UI (e.g. partner-program requirements). */
  notes?: string
  docsUrl?: string
  /** Whether the firm's existing caseload can be pulled in from this provider. */
  supportsInbound?: boolean
}

/** Neutral contact (the plaintiff/client) pushed to the CMS. */
export interface CmsContactInput {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  type?: string // client, adjuster, opposing_counsel, ...
}

/** Neutral matter/case pushed to the CMS. */
export interface CmsMatterInput {
  /** Stable external reference from our side (assessment id) for idempotency. */
  reference: string
  description: string
  practiceArea?: string // mapped from claimType
  status?: string
  /** Free-form fields surfaced as CMS custom fields / notes. */
  customFields?: Record<string, string | number | null | undefined>
  openedAt?: string
}

/** Neutral document pushed to the CMS. */
export interface CmsDocumentInput {
  fileName: string
  mimeType: string
  /** Absolute path on the API host (evidence uploads live on disk). */
  filePath: string
  category?: string
  isHIPAA?: boolean
}

export interface CmsContactResult {
  externalId: string
}
export interface CmsMatterResult {
  externalId: string
}
export interface CmsDocumentResult {
  externalId: string
}

/** Tokens/identity a connector needs to make authenticated calls. */
export interface CmsAuthContext {
  connectionId: string
  /** Always a freshly-valid access token (refreshed by the framework). */
  accessToken: string | null
  apiBaseUrl?: string | null
  externalOrgId?: string | null
  externalUserId?: string | null
  /** Decoded provider-specific config (non-secret view). */
  config: Record<string, any>
}

/** OAuth token bundle returned by code-exchange / refresh. */
export interface CmsTokenSet {
  accessToken: string
  refreshToken?: string | null
  expiresInSeconds?: number | null
  scope?: string | null
  externalAccountId?: string | null
  externalAccountEmail?: string | null
  externalOrgId?: string | null
  externalUserId?: string | null
}

/* --- Inbound (pull sync) ------------------------------------------------- */

/**
 * A matter as it exists in the firm's CMS, flattened to the fields we can act
 * on. Everything but the id is optional, because every provider lets a firm
 * leave almost any field blank and a sparse matter is still worth importing.
 *
 * `raw` is kept so a field we do not yet map is recoverable from the imported
 * case without a re-sync.
 */
export interface CmsInboundMatter {
  /** Stable id in the source system. The dedupe key; a matter without one is skipped. */
  externalId: string
  clientFirstName?: string | null
  clientLastName?: string | null
  clientEmail?: string | null
  clientPhone?: string | null
  description?: string | null
  /** Provider's own vocabulary, e.g. Clio's practice area. Mapped to claimType. */
  practiceArea?: string | null
  /** ISO date. Without one the case cannot be imported; see inbound-sync. */
  incidentDate?: string | null
  venueState?: string | null
  venueCounty?: string | null
  status?: string | null
  raw?: Record<string, unknown>
}

export interface CmsMatterPage {
  matters: CmsInboundMatter[]
  /**
   * Opaque, provider-specific. Null or absent means the last page.
   * Deliberately not a page number: Clio pages by an offset token and Filevine
   * by offset, and a caller should not have to know which.
   */
  nextCursor?: string | null
}

export interface CmsListMattersOptions {
  /** Only matters changed since this instant, for incremental syncs. */
  since?: Date | null
  cursor?: string | null
  /** Provider page size. Connectors clamp this to whatever the API allows. */
  limit?: number
}

export interface CmsConnector {
  readonly id: CmsProviderId
  readonly authType: CmsAuthType

  meta(): CmsProviderMeta

  /** OAuth providers: build the provider authorize URL for the given state. */
  buildAuthorizeUrl?(state: string): string

  /** OAuth providers: exchange an authorization code for tokens. */
  exchangeCode?(code: string): Promise<CmsTokenSet>

  /** OAuth providers: refresh an expired access token. */
  refreshToken?(refreshToken: string): Promise<CmsTokenSet>

  upsertContact(auth: CmsAuthContext, input: CmsContactInput): Promise<CmsContactResult>
  createMatter(
    auth: CmsAuthContext,
    input: CmsMatterInput,
    contactExternalId?: string
  ): Promise<CmsMatterResult>
  uploadDocument(
    auth: CmsAuthContext,
    matterExternalId: string,
    input: CmsDocumentInput
  ): Promise<CmsDocumentResult>

  /**
   * Read matters out of the CMS, one page at a time.
   *
   * Optional because the direction is not symmetric: a firm can push to a
   * Zapier webhook that has nothing to read back, and SmartAdvocate and
   * CasePeer have no usable list endpoint. `supportsInboundSync` is how a
   * caller asks rather than probing for the method.
   */
  listMatters?(auth: CmsAuthContext, options: CmsListMattersOptions): Promise<CmsMatterPage>
}

/** Whether this connector can pull, as opposed to only push. */
export function supportsInboundSync(connector: CmsConnector | null | undefined): boolean {
  return typeof connector?.listMatters === 'function'
}

export class CmsNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`CMS provider "${provider}" is not configured on this server`)
    this.name = 'CmsNotConfiguredError'
  }
}

export class CmsPartnerCredentialsRequiredError extends Error {
  constructor(provider: string) {
    super(
      `CMS provider "${provider}" requires partner credentials. Connect via the settings form once the firm provides API keys.`
    )
    this.name = 'CmsPartnerCredentialsRequiredError'
  }
}

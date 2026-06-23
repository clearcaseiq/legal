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

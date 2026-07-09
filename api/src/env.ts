import { config } from 'dotenv'
import { resolve } from 'path'

const apiEnvPath = resolve(__dirname, '../.env')
config({ path: apiEnvPath, override: true })

function req(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 4000),
  /** Bind address — use 0.0.0.0 so phones on the same Wi‑Fi can reach the API (LAN IP). */
  HOST: process.env.HOST ?? '0.0.0.0',
  DATABASE_URL: req('DATABASE_URL'),
  FILE_BUCKET: process.env.FILE_BUCKET ?? 'local',
  JWT_SECRET: req('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ML_SERVICE_URL: process.env.ML_SERVICE_URL,
  ML_PREDICTION_MODE: process.env.ML_PREDICTION_MODE ?? 'fallback',
  ML_REQUEST_TIMEOUT_MS: Number(process.env.ML_REQUEST_TIMEOUT_MS ?? 5000),
  ML_RETRIEVAL_ENABLED: process.env.ML_RETRIEVAL_ENABLED === 'true',
  ML_RETRIEVAL_TOP_K: Number(process.env.ML_RETRIEVAL_TOP_K ?? 4),
  ML_PROMPT_VERSION: process.env.ML_PROMPT_VERSION ?? 'legal-grounded-v1',
  // Optional JSON of valuation calibration coefficients (see lib/valuation-config.ts).
  // Overrides data/valuation-calibration.json; defaults to identity (no change).
  VALUATION_CALIBRATION: process.env.VALUATION_CALIBRATION,
  API_URL: process.env.API_URL ?? 'http://localhost:4000',
  WEB_URL: process.env.WEB_URL ?? 'http://localhost:5174',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PLATFORM_SUBSCRIPTION_PRICE_ID: process.env.STRIPE_PLATFORM_SUBSCRIPTION_PRICE_ID,
  STRIPE_LEAD_CREDIT_PRICE_ID: process.env.STRIPE_LEAD_CREDIT_PRICE_ID,
  // ---- E-signature (retainers, HIPAA authorizations) ----
  /** Default provider: 'dropbox_sign' | 'documenso'. Adapters in lib/esign/. */
  ESIGN_PROVIDER: process.env.ESIGN_PROVIDER,
  /** Dropbox Sign (HelloSign) API key. */
  DROPBOX_SIGN_API_KEY: process.env.DROPBOX_SIGN_API_KEY,
  /**
   * Force Dropbox Sign test_mode on/off regardless of NODE_ENV. Set to true to
   * send free non-binding test requests even from a production build (e.g. EC2
   * without a paid API plan). Leave unset to follow NODE_ENV (test in dev, live
   * in production).
   */
  DROPBOX_SIGN_TEST_MODE: process.env.DROPBOX_SIGN_TEST_MODE,
  /** Self-hosted Documenso v2 API base, e.g. https://sign.yourfirm.com/api/v2. */
  DOCUMENSO_API_URL: process.env.DOCUMENSO_API_URL,
  DOCUMENSO_API_KEY: process.env.DOCUMENSO_API_KEY,
  /** Shared secret verified against the Documenso webhook header. */
  DOCUMENSO_WEBHOOK_SECRET: process.env.DOCUMENSO_WEBHOOK_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALENDAR_CLIENT_ID: process.env.GOOGLE_CALENDAR_CLIENT_ID,
  GOOGLE_CALENDAR_CLIENT_SECRET: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  GOOGLE_CALENDAR_REDIRECT_URI: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
  GOOGLE_CALENDAR_WEBHOOK_URI: process.env.GOOGLE_CALENDAR_WEBHOOK_URI,
  MICROSOFT_CALENDAR_CLIENT_ID: process.env.MICROSOFT_CALENDAR_CLIENT_ID,
  MICROSOFT_CALENDAR_CLIENT_SECRET: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET,
  MICROSOFT_CALENDAR_REDIRECT_URI: process.env.MICROSOFT_CALENDAR_REDIRECT_URI,
  MICROSOFT_CALENDAR_WEBHOOK_URI: process.env.MICROSOFT_CALENDAR_WEBHOOK_URI,
  CALENDAR_WEBHOOK_RENEWAL_ENABLED: process.env.CALENDAR_WEBHOOK_RENEWAL_ENABLED !== 'false',
  CALENDAR_WEBHOOK_RENEWAL_INTERVAL_MS: Number(process.env.CALENDAR_WEBHOOK_RENEWAL_INTERVAL_MS ?? 15 * 60 * 1000),
  // ---- Zoom (per-attorney OAuth) ----
  /** Zoom Marketplace OAuth app credentials (User-managed app). */
  ZOOM_CLIENT_ID: process.env.ZOOM_CLIENT_ID,
  ZOOM_CLIENT_SECRET: process.env.ZOOM_CLIENT_SECRET,
  /** Defaults to `${API_URL}/v1/attorney-zoom/callback` when unset. */
  ZOOM_REDIRECT_URI: process.env.ZOOM_REDIRECT_URI,
  APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID,
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
  APPLE_KEY_ID: process.env.APPLE_KEY_ID,
  APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY,
  // ---- CMS integrations (Phase 0+) ----
  /** Key used to encrypt CMS tokens at rest; falls back to JWT_SECRET if unset. */
  CMS_TOKEN_ENCRYPTION_KEY: process.env.CMS_TOKEN_ENCRYPTION_KEY,
  /** Clio Manage API (OAuth 2.0 Authorization Code). Self-serve developer app. */
  CLIO_CLIENT_ID: process.env.CLIO_CLIENT_ID,
  CLIO_CLIENT_SECRET: process.env.CLIO_CLIENT_SECRET,
  CLIO_REDIRECT_URI: process.env.CLIO_REDIRECT_URI,
  /** Region base, e.g. https://app.clio.com (US) or https://eu.app.clio.com. */
  CLIO_API_BASE: process.env.CLIO_API_BASE ?? 'https://app.clio.com',
  /** Filevine API gateway. Client id/secret are issued by Filevine Partnerships. */
  FILEVINE_CLIENT_ID: process.env.FILEVINE_CLIENT_ID,
  FILEVINE_CLIENT_SECRET: process.env.FILEVINE_CLIENT_SECRET,
  FILEVINE_PAT: process.env.FILEVINE_PAT,
  FILEVINE_IDENTITY_BASE: process.env.FILEVINE_IDENTITY_BASE ?? 'https://identity.filevine.com',
  FILEVINE_API_BASE: process.env.FILEVINE_API_BASE ?? 'https://api.filevineapp.com',
  /** SmartAdvocate — partner program; base URL is firm-specific. */
  SMARTADVOCATE_API_BASE: process.env.SMARTADVOCATE_API_BASE,
  SMARTADVOCATE_API_KEY: process.env.SMARTADVOCATE_API_KEY,
  /** CasePeer (8am) — partner program. */
  CASEPEER_API_BASE: process.env.CASEPEER_API_BASE ?? 'https://api.casepeer.com',
  CASEPEER_API_KEY: process.env.CASEPEER_API_KEY,
  // ---- Transactional email ----
  /** AWS region for SES (and other AWS SDK clients). */
  AWS_REGION: process.env.AWS_REGION ?? 'us-east-1',
  /** Email provider: 'ses' | 'resend'. Auto-detects when unset (SES if SES_FROM_EMAIL set). */
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  /** Verified SES sender identity, e.g. "ClearCaseIQ <noreply@clearcaseiq.com>". */
  SES_FROM_EMAIL: process.env.SES_FROM_EMAIL,
  /** Optional SES configuration set for engagement/bounce tracking. */
  SES_CONFIGURATION_SET: process.env.SES_CONFIGURATION_SET,
  /** Comma-separated emails treated as admin in JWT role resolution */
  ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? 'admin@caseiq.com',
  /** When true, sensitive plaintiff routes require user.emailVerified */
  REQUIRE_EMAIL_VERIFICATION: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
}

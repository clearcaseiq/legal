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
  OPENAI_ANALYSIS_MODEL: process.env.OPENAI_ANALYSIS_MODEL ?? 'gpt-4o-mini',
  /**
   * Stronger model for case-scoped Workflow/Task planning.
   * Defaults to gpt-4o. Planning always tries OpenAI first, then Kimi backup.
   */
  OPENAI_PLANNING_MODEL: process.env.OPENAI_PLANNING_MODEL ?? 'gpt-4o',
  /**
   * Optional model for prose/writing (coach narration, intelligent questions).
   * When unset, those paths use OPENAI_ANALYSIS_MODEL, then Kimi as backup.
   */
  OPENAI_WRITING_MODEL: process.env.OPENAI_WRITING_MODEL,
  /**
   * When true (default), GPT may adapt the firm workflow snapshot to the case
   * at apply-time (and via the manual adapt endpoint). Fail-safe: blueprint
   * snapshot is kept unchanged if the call fails.
   */
  WORKFLOW_AI_ADAPT: process.env.WORKFLOW_AI_ADAPT !== 'false',
  /** Max patch ops GPT may propose per workflow adapt (default 18). */
  WORKFLOW_AI_ADAPT_MAX_OPS: Math.max(1, Number(process.env.WORKFLOW_AI_ADAPT_MAX_OPS ?? 18) || 18),
  /** Max add ops within that budget (default 8). */
  WORKFLOW_AI_ADAPT_MAX_ADDS: Math.max(0, Number(process.env.WORKFLOW_AI_ADAPT_MAX_ADDS ?? 8) || 8),
  /**
   * When true (default), coach sync re-runs workflow adapt if open gap keys
   * changed since the last successful adapt. Debounced by
   * WORKFLOW_AI_ADAPT_GAP_COOLDOWN_MS.
   */
  WORKFLOW_AI_ADAPT_ON_GAP_CHANGE: process.env.WORKFLOW_AI_ADAPT_ON_GAP_CHANGE !== 'false',
  /** Minimum ms between automatic gap-change adapts (default 15 minutes). */
  WORKFLOW_AI_ADAPT_GAP_COOLDOWN_MS: Math.max(
    0,
    Number(process.env.WORKFLOW_AI_ADAPT_GAP_COOLDOWN_MS ?? 15 * 60 * 1000) || 15 * 60 * 1000,
  ),
  /**
   * When false (default), LLM case prompts are gap-keys-only: no incident
   * narrative, injuries, treatment text, or other medical detail. Set true
   * only after a HIPAA BAA is in place with the active LLM vendor and counsel
   * has approved sending PHI in prompts. Contact PII is always redacted.
   */
  LLM_ALLOW_PHI: process.env.LLM_ALLOW_PHI === 'true',
  // Kimi / Moonshot AI (optional, OpenAI-compatible drop-in for text completions).
  KIMI_API_KEY: process.env.KIMI_API_KEY,
  KIMI_BASE_URL: process.env.KIMI_BASE_URL ?? 'https://api.moonshot.ai/v1',
  KIMI_MODEL: process.env.KIMI_MODEL ?? 'kimi-k3',
  KIMI_PLANNING_MODEL: process.env.KIMI_PLANNING_MODEL,
  // Baichuan (optional OpenAI-compatible bake-off / experiment provider).
  BAICHUAN_API_KEY: process.env.BAICHUAN_API_KEY,
  BAICHUAN_BASE_URL: process.env.BAICHUAN_BASE_URL ?? 'https://api.baichuan-ai.com/v1',
  BAICHUAN_MODEL: process.env.BAICHUAN_MODEL ?? 'Baichuan4-Air',
  // DeepSeek (optional OpenAI-compatible bake-off / experiment provider).
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1',
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
  AI_PROVIDER: process.env.AI_PROVIDER ?? 'openai',
  ROSE_LLM_MODEL: process.env.ROSE_LLM_MODEL,
  // Anthropic Claude (optional) — incident extraction + planning bake-off.
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',
  /** Peer to OPENAI_PLANNING_MODEL for workflow-adapt bake-offs (defaults to Sonnet). */
  ANTHROPIC_PLANNING_MODEL: process.env.ANTHROPIC_PLANNING_MODEL ?? 'claude-sonnet-4-5',
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com',
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
  /**
   * Public base URL of the web app.
   *
   * Read it through `lib/app-url` rather than from here. This entry keeps a
   * localhost default, which is correct for local work but became the source of
   * localhost links in production email; `webBaseUrl()` refuses that default
   * when NODE_ENV is production. Kept only for CORS, which needs the raw value.
   */
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
  /**
   * Display name and mailbox Dropbox Sign puts on signature-request emails
   * (inbox From, subject "requested by …", and the "X has requested a
   * signature" line). Defaults: ClearCaseIQ / noreply@clearcaseiq.com.
   * Blank DROPBOX_SIGN_REQUESTER_EMAIL to send the name only.
   */
  DROPBOX_SIGN_REQUESTER_NAME: process.env.DROPBOX_SIGN_REQUESTER_NAME,
  DROPBOX_SIGN_REQUESTER_EMAIL: process.env.DROPBOX_SIGN_REQUESTER_EMAIL,
  /** Self-hosted Documenso v2 API base, e.g. https://sign.yourfirm.com/api/v2. */
  DOCUMENSO_API_URL: process.env.DOCUMENSO_API_URL,
  DOCUMENSO_API_KEY: process.env.DOCUMENSO_API_KEY,
  /** Shared secret verified against the Documenso webhook header. */
  DOCUMENSO_WEBHOOK_SECRET: process.env.DOCUMENSO_WEBHOOK_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  /**
   * Server-side key for Places API (New), used by firm discovery. Must be
   * restricted to the Places API and to the server's IP — this key spends money
   * per request and must never reach the browser.
   */
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
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
  // ---- Recorded calls (Amazon Connect + Contact Lens + Transcribe) ----
  /**
   * Region the Amazon Connect instance lives in. This is often different from
   * AWS_REGION (Textract/SES): Connect + its recordings S3 bucket + Transcribe
   * for those recordings must all target the instance region. Defaults to
   * AWS_REGION when unset.
   */
  CONNECT_REGION: process.env.CONNECT_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
  /** Amazon Connect instance id (UUID) that places the outbound calls. */
  CONNECT_INSTANCE_ID: process.env.CONNECT_INSTANCE_ID,
  /**
   * Contact flow that bridges plaintiff -> attorney, plays the recording
   * disclosure, and enables recording + Contact Lens. Its ARN/id from the
   * Connect console.
   */
  CONNECT_CONTACT_FLOW_ID: process.env.CONNECT_CONTACT_FLOW_ID,
  /** Claimed Connect phone number used as the caller id (E.164). */
  CONNECT_SOURCE_PHONE_NUMBER: process.env.CONNECT_SOURCE_PHONE_NUMBER,
  /** Optional Connect queue id for outbound. */
  CONNECT_QUEUE_ID: process.env.CONNECT_QUEUE_ID,
  /** S3 bucket where Connect writes call recordings + Contact Lens output. */
  CONNECT_RECORDINGS_BUCKET: process.env.CONNECT_RECORDINGS_BUCKET,
  /** Fallback transcription language for Amazon Transcribe. */
  CALL_TRANSCRIBE_LANGUAGE: process.env.CALL_TRANSCRIBE_LANGUAGE ?? 'en-US',
  /** Master switch to enable the recorded-calls feature in the UI/API. */
  CALLS_ENABLED: process.env.CALLS_ENABLED !== 'false',
}
